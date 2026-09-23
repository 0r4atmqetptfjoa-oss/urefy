// ===========================================================================
// UREfy — UNIFIED SEARCH EDGE API (/api/search)
// Supports: Multi-category search (Posts, People, Communities, Topics),
// partial substring matching, ranking, block-list filtering, and D1 fallback.
// ===========================================================================

import {
  Env,
  getD1Database,
  isProductionEnv,
  createD1UnavailableResponse,
  globalPostsStore,
  globalProfilesStore,
  globalCommunitiesStore,
  globalBlocksStore,
  globalFacetsStore,
} from './_db.js';
import { ensureSyntheticFixturesTable } from './_synthetic.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Fingerprint, X-Facet-Id',
};

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

/**
 * GET /api/search
 * Query params:
 *   - q: search string
 *   - category: 'all' | 'posts' | 'people' | 'communities' | 'topics'
 *   - limit: max results per category (default 15, max 50)
 *   - userId: optional requester ID for social block filtering
 */
export async function onRequestGet(context: { request: Request; env?: Env }): Promise<Response> {
  try {
    const url = new URL(context.request.url);
    const query = (url.searchParams.get('q') || '').trim().slice(0, 100);
    const category = (url.searchParams.get('category') || 'all').trim().toLowerCase();
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '15', 10), 1), 50);
    const userId = (url.searchParams.get('userId') || '').trim();

    if (!query) {
      return new Response(
        JSON.stringify({
          success: true,
          query: '',
          category,
          results: { posts: [], people: [], communities: [], topics: [] },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    const db = getD1Database(context.env);
    const isProd = isProductionEnv(context.env);

    if (!db && isProd) {
      return createD1UnavailableResponse();
    }
    if (db) await ensureSyntheticFixturesTable(db).catch(() => {});

    const searchPattern = `%${query}%`;
    const searchToken = query.toLowerCase();

    // 1. Get blocked users set
    const blockedSet = new Set<string>();
    if (userId) {
      if (db) {
        const bRes = await db.prepare('SELECT blocked_id FROM user_blocks WHERE blocker_id = ?').bind(userId).all<{ blocked_id: string }>();
        (bRes.results || []).forEach(r => blockedSet.add(r.blocked_id));
      } else {
        globalBlocksStore.filter(b => b.blockerId === userId).forEach(b => blockedSet.add(b.blockedId));
      }
    }

    let posts: any[] = [];
    let people: any[] = [];
    let communities: any[] = [];
    let topics: any[] = [];

    // Search Posts
    if (['all', 'posts'].includes(category)) {
      if (db) {
        const postRes = await db
          .prepare(
            `SELECT p.id, p.channel_id, p.author_id, p.author_role, p.title, p.content, p.flair, p.merit_votes, p.reply_count, p.created_at, p.facet_id, p.audience,
                    f.is_publicly_linked as facet_is_publicly_linked, f.handle as facet_handle, f.display_name as facet_display_name, f.avatar_url as facet_avatar_url
             FROM posts p
             LEFT JOIN facets f ON p.facet_id = f.id
             WHERE (p.title LIKE ? OR p.content LIKE ? OR p.flair LIKE ?) AND p.status != 'archived'
               AND (p.audience = 'public' OR p.audience IS NULL)
               AND NOT EXISTS (SELECT 1 FROM synthetic_fixtures sf WHERE sf.resource_type = 'post' AND sf.resource_id = p.id)
             ORDER BY p.merit_votes DESC, p.created_at DESC
             LIMIT ?`
          )
          .bind(searchPattern, searchPattern, searchPattern, limit * 2)
          .all<any>();

        posts = (postRes.results || [])
          .filter(p => !blockedSet.has(p.author_id))
          .slice(0, limit)
          .map(p => {
            const isLinked = p.facet_is_publicly_linked === 1 || p.facet_is_publicly_linked === true;
            const authorFingerprint = (p.facet_id && !isLinked) ? p.facet_id : p.author_id;
            return {
              id: p.id,
              channelId: p.channel_id,
              authorFingerprint,
              authorRole: p.author_role,
              title: p.title,
              content: p.content.slice(0, 300),
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
      } else {
        posts = globalPostsStore
          .filter(p => !p.syntheticTest)
          .filter(p => !p.audience || p.audience === 'public')
          .filter(
            p =>
              !blockedSet.has(p.authorFingerprint) &&
              (p.title?.toLowerCase().includes(searchToken) ||
               p.content?.toLowerCase().includes(searchToken) ||
               p.flair?.toLowerCase().includes(searchToken))
          )
          .slice(0, limit)
          .map(p => {
            const facet = p.facetId ? globalFacetsStore.find(f => f.id === p.facetId) : undefined;
            const isLinked = facet?.isPubliclyLinked === true;
            const authorFingerprint = (p.facetId && !isLinked) ? p.facetId : p.authorFingerprint;
            return {
              id: p.id,
              channelId: p.channelId,
              authorFingerprint,
              authorRole: p.authorRole,
              title: p.title,
              content: p.content.slice(0, 300),
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
      }
    }

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
          .filter(p => !blockedSet.has(p.user_id))
          .map(p => ({
            userId: p.user_id,
            displayName: p.display_name,
            handle: p.handle,
            bio: p.bio,
            avatarUrl: p.avatar_url,
            location: p.location,
          }));

        // Search public active facets (never search by opaque facet id or root fingerprint)
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
          .filter(f => !blockedSet.has(f.owner_fingerprint))
          .map(f => {
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

        const seenHandles = new Set(dbPeople.map(p => (p.handle || '').toLowerCase()));
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
            p =>
              !blockedSet.has(p.userId) &&
              (p.displayName?.toLowerCase().includes(searchToken) ||
               p.handle?.toLowerCase().includes(searchToken))
          )
          .map(p => ({
            userId: p.userId,
            displayName: p.displayName,
            handle: p.handle,
            bio: p.bio,
            avatarUrl: p.avatarUrl,
            location: p.location,
          }));

        const memFacets = globalFacetsStore
          .filter(f => (f.visibility === 'public' || !f.visibility) && (f.status === 'active' || !f.status))
          .filter(f => !blockedSet.has(f.ownerFingerprint))
          .filter(
            f =>
              f.displayName?.toLowerCase().includes(searchToken) ||
              f.handle?.toLowerCase().includes(searchToken)
          )
          .map(f => ({
            userId: f.isPubliclyLinked ? f.ownerFingerprint : f.id,
            facetId: f.id,
            displayName: f.displayName,
            handle: f.handle,
            bio: f.bio,
            avatarUrl: f.avatarUrl,
            location: undefined as string | undefined,
            isPubliclyLinked: f.isPubliclyLinked,
          }));

        const seenHandles = new Set(memPeople.map(p => (p.handle || '').toLowerCase()));
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

        communities = (commRes.results || []).map(c => ({
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
          .filter(c => !c.syntheticTest)
          .filter(
            c =>
              c.name?.toLowerCase().includes(searchToken) ||
              c.displayName?.toLowerCase().includes(searchToken) ||
              c.description?.toLowerCase().includes(searchToken) ||
              c.category?.toLowerCase().includes(searchToken)
          )
          .slice(0, limit)
          .map(c => ({
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
        const tagRes = await db
          .prepare(
            `SELECT tag, COUNT(*) as post_count
             FROM post_tags
             WHERE tag LIKE ?
             GROUP BY tag
             ORDER BY post_count DESC
             LIMIT ?`
          )
          .bind(searchPattern, limit)
          .all<any>();

        topics = (tagRes.results || []).map(t => ({
          tag: t.tag.startsWith('#') ? t.tag : `#${t.tag}`,
          postCount: Number(t.post_count) || 1,
        }));
      } else {
        // Collect flairs & tags from memory
        const tagCounts = new Map<string, number>();
        for (const post of globalPostsStore) {
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
        query,
        category,
        total: posts.length + people.length + communities.length + topics.length,
        results: {
          posts,
          people,
          communities,
          topics,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Search execution failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }
}
