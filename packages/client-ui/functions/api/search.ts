// ===========================================================================
// UREfy — UNIFIED SEARCH EDGE API (/api/search)
// Supports: Multi-category search (Posts, People, Communities, Topics),
// FTS5 Full-Text Index (posts_fts) with automatic parameterized fallback,
// advanced search operators (channel:, flair:, author:, has:code, merit:>),
// partial substring matching, ranking, block-list filtering, and D1 fallback.
// ===========================================================================

import {
  getD1Database,
  type Env,
  isProductionEnv,
  createD1UnavailableResponse,
  globalPostsStore,
  globalProfilesStore,
  globalCommunitiesStore,
  globalBlocksStore,
  globalFacetsStore,
} from './_db.js';
import { ensureSyntheticFixturesTable } from './_synthetic.js';
import { PUBLIC_POST_SQL } from '../_discovery.js';

const searchablePostSQL = PUBLIC_POST_SQL.replace(/\bposts\./g, 'p.');
const isSearchablePost = (post: typeof globalPostsStore[number]): boolean =>
  !post.syntheticTest &&
  (!post.audience || post.audience === 'public') &&
  (!post.status || ['published', 'pinned', 'locked'].includes(post.status));

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Fingerprint, X-Facet-Id',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=15, stale-while-revalidate=30',
  'X-Content-Type-Options': 'nosniff',
};

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export interface ParsedServerSearch {
  terms: string[];
  channel?: string;
  flair?: string;
  author?: string;
  onlyCode: boolean;
  minMerit?: number;
}

export function parseServerSearchQuery(raw: string): ParsedServerSearch {
  const tokens = raw.trim().split(/\s+/).filter(Boolean);
  const terms: string[] = [];
  let channel: string | undefined;
  let flair: string | undefined;
  let author: string | undefined;
  let onlyCode = false;
  let minMerit: number | undefined;

  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (lower.startsWith('channel:') || lower.startsWith('in:')) {
      channel = token.slice(token.indexOf(':') + 1).trim().toLowerCase();
    } else if (lower.startsWith('flair:') || lower.startsWith('tag:')) {
      flair = token.slice(token.indexOf(':') + 1).trim().toLowerCase();
    } else if (lower.startsWith('author:') || lower.startsWith('from:')) {
      author = token.slice(token.indexOf(':') + 1).trim().toLowerCase();
    } else if (lower === 'has:code' || lower === 'is:code') {
      onlyCode = true;
    } else if (lower.startsWith('merit:>')) {
      const parsed = parseInt(lower.replace('merit:>', ''), 10);
      if (!Number.isNaN(parsed)) minMerit = parsed;
    } else {
      const cleaned = token.replace(/[^\p{L}\p{N}_#-]/gu, '');
      if (cleaned.length >= 2) terms.push(cleaned);
    }
  }

  return { terms, channel, flair, author, onlyCode, minMerit };
}

/**
 * GET /api/search
 * Query params:
 *   - q: search string (supports text + operators: channel:, flair:, author:, has:code, merit:>)
 *   - category: 'all' | 'posts' | 'people' | 'communities' | 'topics' (optional)
 *   - limit: max results per category (default 15/20, max 50)
 *   - userId: optional requester ID for social block filtering
 */
export async function onRequestGet(context: { request: Request; env?: Env }): Promise<Response> {
  try {
    const url = new URL(context.request.url);
    const rawQuery = (url.searchParams.get('q') || '').trim().slice(0, 160);
    const hasCategoryParam = url.searchParams.has('category') || url.searchParams.has('type');
    const category = (url.searchParams.get('category') || url.searchParams.get('type') || 'all').trim().toLowerCase();
    const requestedLimit = Number(url.searchParams.get('limit') ?? (hasCategoryParam ? '15' : '20'));
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 50) : 20;
    const userId = (url.searchParams.get('userId') || '').trim();

    if (!rawQuery) {
      if (hasCategoryParam) {
        return new Response(
          JSON.stringify({
            success: true,
            query: '',
            category,
            results: { posts: [], people: [], communities: [], topics: [] },
          }),
          { status: 200, headers: CORS_HEADERS }
        );
      }
      return new Response(
        JSON.stringify({ success: true, count: 0, results: [] }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    const db = getD1Database(context.env);
    const isProd = isProductionEnv(context.env);

    if (!db && isProd) {
      return createD1UnavailableResponse();
    }
    if (db) await ensureSyntheticFixturesTable(db).catch(() => {});

    const parsed = parseServerSearchQuery(rawQuery);
    const searchPattern = `%${rawQuery}%`;
    const searchToken = rawQuery.toLowerCase();

    // 1. Get blocked users set
    const blockedSet = new Set<string>();
    if (userId) {
      if (db) {
        const bRes = await db
          .prepare('SELECT blocked_id FROM user_blocks WHERE blocker_id = ?')
          .bind(userId)
          .all<{ blocked_id: string }>();
        (bRes.results || []).forEach((r) => blockedSet.add(r.blocked_id));
      } else {
        globalBlocksStore.filter((b) => b.blockerId === userId).forEach((b) => blockedSet.add(b.blockedId));
      }
    }

    let posts: any[] = [];
    let searchMode: 'fts5' | 'd1-indexed' | 'local-only' = db ? 'd1-indexed' : 'local-only';

    // 2. Search Posts (supports FTS5 + parameterized D1 + In-Memory Fallback)
    if (!hasCategoryParam || ['all', 'posts'].includes(category)) {
      if (db) {
        const whereClauses: string[] = [searchablePostSQL];
        const params: (string | number)[] = [];

        if (parsed.channel) {
          whereClauses.push('LOWER(p.channel_id) = ?');
          params.push(parsed.channel);
        }
        if (parsed.flair) {
          whereClauses.push('LOWER(p.flair) LIKE ?');
          params.push(`%${parsed.flair}%`);
        }
        if (parsed.author) {
          whereClauses.push('LOWER(p.author_id) LIKE ?');
          params.push(`%${parsed.author}%`);
        }
        if (parsed.onlyCode) {
          whereClauses.push("p.content LIKE '%```%'");
        }
        if (parsed.minMerit !== undefined) {
          whereClauses.push('p.merit_votes >= ?');
          params.push(parsed.minMerit);
        }

        // Try FTS5 fast query if we have text terms
        let ftsSuccess = false;
        if (parsed.terms.length > 0) {
          const ftsMatch = parsed.terms.map((t) => `"${t.replace(/"/g, '')}"*`).join(' AND ');
          try {
            const ftsSql = `
              SELECT
                p.id,
                p.channel_id,
                p.author_id,
                p.author_role,
                p.title,
                p.content,
                p.flair,
                p.merit_votes,
                p.reply_count,
                p.created_at,
                p.facet_id,
                p.audience,
                f.is_publicly_linked as facet_is_publicly_linked,
                CASE WHEN f.status = 'deleted' THEN NULL ELSE f.handle END as facet_handle,
                CASE WHEN f.status = 'deleted' THEN '[Deleted Context]' ELSE f.display_name END as facet_display_name,
                CASE WHEN f.status = 'deleted' THEN NULL ELSE f.avatar_url END as facet_avatar_url
              FROM posts_fts fts
              JOIN posts p ON p.id = fts.id
              LEFT JOIN facets f ON p.facet_id = f.id
              WHERE posts_fts MATCH ?
                AND ${whereClauses.join(' AND ')}
              ORDER BY (p.merit_votes * 2) DESC, p.created_at DESC
              LIMIT ?
            `;
            const ftsRes = await db
              .prepare(ftsSql)
              .bind(ftsMatch, ...params, limit * 2)
              .all<any>();

            if (ftsRes.results && ftsRes.results.length > 0) {
              posts = (ftsRes.results || [])
                .filter((p) => !blockedSet.has(p.author_id))
                .slice(0, limit)
                .map((p) => {
                  const isLinked = p.facet_is_publicly_linked === 1 || p.facet_is_publicly_linked === true;
                  const authorFingerprint = p.facet_id && !isLinked ? p.facet_id : p.author_id;
                  return {
                    id: p.id,
                    channelId: p.channel_id,
                    authorFingerprint,
                    authorRole: p.author_role,
                    title: p.title,
                    content: (p.content || '').slice(0, 300),
                    flair: p.flair,
                    meritVotes: Number(p.merit_votes) || 0,
                    replyCount: Number(p.reply_count) || 0,
                    createdAt: Number(p.created_at),
                    facetId: p.facet_id || undefined,
                    facetHandle: p.facet_handle || undefined,
                    facetDisplayName: p.facet_display_name || undefined,
                    facetAvatarUrl: p.facet_avatar_url || undefined,
                    audience: p.audience || 'public',
                  };
                });
              searchMode = 'fts5';
              ftsSuccess = true;
            }
          } catch (_) {
            // FTS5 index not yet ready or table missing, automatic fallback to indexed LIKE
          }
        }

        // Fallback parameterized query
        if (!ftsSuccess) {
          const fallbackWhere = [...whereClauses];
          const fallbackParams = [...params];

          if (parsed.terms.length > 0) {
            for (const term of parsed.terms) {
              fallbackWhere.push('(LOWER(p.title) LIKE ? OR LOWER(p.content) LIKE ? OR LOWER(p.flair) LIKE ?)');
              const likeTerm = `%${term.toLowerCase()}%`;
              fallbackParams.push(likeTerm, likeTerm, likeTerm);
            }
          } else if (!parsed.channel && !parsed.flair && !parsed.author && !parsed.onlyCode && parsed.minMerit === undefined) {
            fallbackWhere.push('(LOWER(p.title) LIKE ? OR LOWER(p.content) LIKE ? OR LOWER(p.flair) LIKE ?)');
            fallbackParams.push(searchPattern.toLowerCase(), searchPattern.toLowerCase(), searchPattern.toLowerCase());
          }

          const fallbackSql = `
            SELECT
              p.id,
              p.channel_id,
              p.author_id,
              p.author_role,
              p.title,
              p.content,
              p.flair,
              p.merit_votes,
              p.reply_count,
              p.created_at,
              p.facet_id,
              p.audience,
              f.is_publicly_linked as facet_is_publicly_linked,
              CASE WHEN f.status = 'deleted' THEN NULL ELSE f.handle END as facet_handle,
              CASE WHEN f.status = 'deleted' THEN '[Deleted Context]' ELSE f.display_name END as facet_display_name,
              CASE WHEN f.status = 'deleted' THEN NULL ELSE f.avatar_url END as facet_avatar_url
            FROM posts p
            LEFT JOIN facets f ON p.facet_id = f.id
            WHERE ${fallbackWhere.join(' AND ')}
            ORDER BY p.merit_votes DESC, p.created_at DESC
            LIMIT ?
          `;

          const postRes = await db
            .prepare(fallbackSql)
            .bind(...fallbackParams, limit * 2)
            .all<any>();

          posts = (postRes.results || [])
            .filter((p) => !blockedSet.has(p.author_id))
            .slice(0, limit)
            .map((p) => {
              const isLinked = p.facet_is_publicly_linked === 1 || p.facet_is_publicly_linked === true;
              const authorFingerprint = p.facet_id && !isLinked ? p.facet_id : p.author_id;
              return {
                id: p.id,
                channelId: p.channel_id,
                authorFingerprint,
                authorRole: p.author_role,
                title: p.title,
                content: (p.content || '').slice(0, 300),
                flair: p.flair,
                meritVotes: Number(p.merit_votes) || 0,
                replyCount: Number(p.reply_count) || 0,
                createdAt: Number(p.created_at),
                facetId: p.facet_id || undefined,
                facetHandle: p.facet_handle || undefined,
                facetDisplayName: p.facet_display_name || undefined,
                facetAvatarUrl: p.facet_avatar_url || undefined,
                audience: p.audience || 'public',
              };
            });
          searchMode = 'd1-indexed';
        }
      } else {
        // In-memory fallback
        posts = globalPostsStore
          .filter(isSearchablePost)
          .filter((p) => {
            if (blockedSet.has(p.authorFingerprint)) return false;
            if (parsed.channel && !p.channelId.toLowerCase().includes(parsed.channel)) return false;
            if (parsed.flair && !p.flair?.toLowerCase().includes(parsed.flair)) return false;
            if (parsed.author && !p.authorFingerprint?.toLowerCase().includes(parsed.author)) return false;
            if (parsed.onlyCode && !(p.content || '').includes('```')) return false;
            if (parsed.minMerit !== undefined && (p.meritVotes || 0) < parsed.minMerit) return false;

            if (parsed.terms.length > 0) {
              const textContent = `${p.title || ''} ${p.content || ''} ${p.flair || ''}`.toLowerCase();
              return parsed.terms.every((term) => textContent.includes(term.toLowerCase()));
            }

            return (
              p.title?.toLowerCase().includes(searchToken) ||
              p.content?.toLowerCase().includes(searchToken) ||
              p.flair?.toLowerCase().includes(searchToken)
            );
          })
          .slice(0, limit)
          .map((p) => {
            const facet = p.facetId ? globalFacetsStore.find((f) => f.id === p.facetId) : undefined;
            const isLinked = facet?.isPubliclyLinked === true;
            const authorFingerprint = p.facetId && !isLinked ? p.facetId : p.authorFingerprint;
            return {
              id: p.id,
              channelId: p.channelId,
              authorFingerprint,
              authorRole: p.authorRole,
              title: p.title,
              content: (p.content || '').slice(0, 300),
              flair: p.flair,
              meritVotes: p.meritVotes,
              replyCount: p.replyCount,
              createdAt: p.createdAt,
              facetId: p.facetId,
              facetHandle: facet?.handle,
              facetDisplayName: facet?.displayName,
              facetAvatarUrl: facet?.avatarUrl,
              audience: p.audience || 'public',
            };
          });
        searchMode = 'local-only';
      }
    }

    // If caller did not specify category or type (OmniSearch direct mode), return flat results array
    if (!hasCategoryParam) {
      return new Response(
        JSON.stringify({
          success: true,
          mode: searchMode,
          count: posts.length,
          results: posts,
        }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    let people: any[] = [];
    let communities: any[] = [];
    let topics: any[] = [];

    // Search People
    if (['all', 'people'].includes(category)) {
      if (db) {
        const peopleRes = await db
          .prepare(
            `SELECT user_id, display_name, handle, bio, avatar_url, location
             FROM user_profiles
             WHERE (display_name LIKE ? OR handle LIKE ?)
             LIMIT ?`
          )
          .bind(searchPattern, searchPattern, limit * 2)
          .all<any>();

        let dbPeople = (peopleRes.results || [])
          .filter((p) => !blockedSet.has(p.user_id))
          .map((p) => ({
            userId: p.user_id,
            displayName: p.display_name,
            handle: p.handle,
            bio: p.bio,
            avatarUrl: p.avatar_url,
            location: p.location,
          }));

        // Search public active facets
        const facetRes = await db
          .prepare(
            `SELECT id, handle, display_name, bio, avatar_url, is_publicly_linked, owner_fingerprint
             FROM facets
             WHERE (visibility = 'public' OR visibility IS NULL)
               AND (status = 'active' OR status IS NULL)
               AND (display_name LIKE ? OR handle LIKE ?)
             LIMIT ?`
          )
          .bind(searchPattern, searchPattern, limit * 2)
          .all<any>();

        const dbFacets = (facetRes.results || [])
          .filter((f) => !blockedSet.has(f.owner_fingerprint))
          .map((f) => {
            const isLinked = f.is_publicly_linked === 1 || f.is_publicly_linked === true;
            return {
              userId: isLinked ? f.owner_fingerprint : f.id,
              facetId: f.id,
              displayName: f.display_name,
              handle: f.handle,
              bio: f.bio,
              avatarUrl: f.avatar_url,
              location: undefined as string | undefined,
              isPubliclyLinked: isLinked,
            };
          });

        const seenHandles = new Set(dbPeople.map((p) => (p.handle || '').toLowerCase()));
        for (const f of dbFacets) {
          if (f.handle && !seenHandles.has(f.handle.toLowerCase())) {
            dbPeople.push(f);
            seenHandles.add(f.handle.toLowerCase());
          }
        }
        people = dbPeople.slice(0, limit);
      } else {
        let memPeople = globalProfilesStore
          .filter(
            (p) =>
              !blockedSet.has(p.userId) &&
              (p.displayName?.toLowerCase().includes(searchToken) ||
                p.handle?.toLowerCase().includes(searchToken))
          )
          .map((p) => ({
            userId: p.userId,
            displayName: p.displayName,
            handle: p.handle,
            bio: p.bio,
            avatarUrl: p.avatarUrl,
            location: p.location,
          }));

        const memFacets = globalFacetsStore
          .filter((f) => (f.visibility === 'public' || !f.visibility) && (f.status === 'active' || !f.status))
          .filter((f) => !blockedSet.has(f.ownerFingerprint))
          .filter(
            (f) =>
              f.displayName?.toLowerCase().includes(searchToken) ||
              f.handle?.toLowerCase().includes(searchToken)
          )
          .map((f) => ({
            userId: f.isPubliclyLinked ? f.ownerFingerprint : f.id,
            facetId: f.id,
            displayName: f.displayName,
            handle: f.handle,
            bio: f.bio,
            avatarUrl: f.avatarUrl,
            location: undefined as string | undefined,
            isPubliclyLinked: f.isPubliclyLinked,
          }));

        const seenHandles = new Set(memPeople.map((p) => (p.handle || '').toLowerCase()));
        for (const f of memFacets) {
          if (f.handle && !seenHandles.has(f.handle.toLowerCase())) {
            memPeople.push(f);
            seenHandles.add(f.handle.toLowerCase());
          }
        }
        people = memPeople.slice(0, limit);
      }
    }

    // Search Communities
    if (['all', 'communities'].includes(category)) {
      if (db) {
        const commRes = await db
          .prepare(
            `SELECT id, name, display_name, description, category, icon, primary_color, member_count
             FROM communities
             WHERE (name LIKE ? OR display_name LIKE ? OR description LIKE ? OR category LIKE ?)
               AND NOT EXISTS (SELECT 1 FROM synthetic_fixtures sf WHERE sf.resource_type = 'community' AND sf.resource_id = communities.id)
             ORDER BY member_count DESC
             LIMIT ?`
          )
          .bind(searchPattern, searchPattern, searchPattern, searchPattern, limit)
          .all<any>();

        communities = (commRes.results || []).map((c) => ({
          id: c.id,
          name: c.name,
          displayName: c.display_name,
          description: c.description,
          category: c.category,
          icon: c.icon,
          primaryColor: c.primary_color,
          memberCount: Number(c.member_count) || 0,
        }));
      } else {
        communities = globalCommunitiesStore
          .filter((c) => !c.syntheticTest)
          .filter(
            (c) =>
              c.name?.toLowerCase().includes(searchToken) ||
              c.displayName?.toLowerCase().includes(searchToken) ||
              c.description?.toLowerCase().includes(searchToken) ||
              c.category?.toLowerCase().includes(searchToken)
          )
          .slice(0, limit)
          .map((c) => ({
            id: c.id,
            name: c.name,
            displayName: c.displayName,
            description: c.description,
            category: c.category,
            icon: c.icon,
            primaryColor: c.primaryColor,
            memberCount: c.memberCount,
          }));
      }
    }

    // Search Topics
    if (['all', 'topics'].includes(category)) {
      if (db) {
        const blockFilter = userId
          ? ' AND NOT EXISTS (SELECT 1 FROM user_blocks ub WHERE ub.blocker_id = ? AND ub.blocked_id = p.author_id)'
          : '';
        const tagRes = await db
          .prepare(
            `SELECT pt.tag, COUNT(*) as post_count
             FROM post_tags pt
             JOIN posts p ON p.id = pt.post_id
             WHERE pt.tag LIKE ? AND ${searchablePostSQL}${blockFilter}
             GROUP BY pt.tag
             ORDER BY post_count DESC
             LIMIT ?`
          )
          .bind(searchPattern, ...(userId ? [userId] : []), limit)
          .all<any>();

        topics = (tagRes.results || []).map((t) => ({
          tag: t.tag.startsWith('#') ? t.tag : `#${t.tag}`,
          postCount: Number(t.post_count) || 1,
        }));
      } else {
        const tagCounts = new Map<string, number>();
        for (const post of globalPostsStore) {
          if (!isSearchablePost(post) || blockedSet.has(post.authorFingerprint)) continue;
          if (post.flair && post.flair.toLowerCase().includes(searchToken)) {
            const tag = `#${post.flair.replace(/\s+/g, '')}`;
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
          }
        }
        topics = Array.from(tagCounts.entries())
          .map(([tag, postCount]) => ({ tag, postCount }))
          .slice(0, limit);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        query: rawQuery,
        category,
        total: posts.length + people.length + communities.length + topics.length,
        results: {
          posts,
          people,
          communities,
          topics,
        },
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Search execution failed',
        details: err?.message || 'Unknown error',
      }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
