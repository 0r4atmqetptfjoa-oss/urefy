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
} from './_db.js';
import { ensureSyntheticFixturesTable } from './_synthetic.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Fingerprint',
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
            `SELECT id, channel_id, author_id, author_role, title, content, flair, merit_votes, reply_count, created_at
             FROM posts
             WHERE (title LIKE ? OR content LIKE ? OR flair LIKE ?) AND status != 'archived'
               AND NOT EXISTS (SELECT 1 FROM synthetic_fixtures sf WHERE sf.resource_type = 'post' AND sf.resource_id = posts.id)
             ORDER BY merit_votes DESC, created_at DESC
             LIMIT ?`
          )
          .bind(searchPattern, searchPattern, searchPattern, limit * 2)
          .all<any>();

        posts = (postRes.results || [])
          .filter(p => !blockedSet.has(p.author_id))
          .slice(0, limit)
          .map(p => ({
            id: p.id,
            channelId: p.channel_id,
            authorFingerprint: p.author_id,
            authorRole: p.author_role,
            title: p.title,
            content: p.content.slice(0, 300),
            flair: p.flair,
            meritVotes: Number(p.merit_votes) || 0,
            replyCount: Number(p.reply_count) || 0,
            createdAt: Number(p.created_at),
          }));
      } else {
        posts = globalPostsStore
          .filter(p => !p.syntheticTest)
          .filter(
            p =>
              !blockedSet.has(p.authorFingerprint) &&
              (p.title?.toLowerCase().includes(searchToken) ||
               p.content?.toLowerCase().includes(searchToken) ||
               p.flair?.toLowerCase().includes(searchToken))
          )
          .slice(0, limit)
          .map(p => ({
            id: p.id,
            channelId: p.channelId,
            authorFingerprint: p.authorFingerprint,
            authorRole: p.authorRole,
            title: p.title,
            content: p.content.slice(0, 300),
            flair: p.flair,
            meritVotes: p.meritVotes,
            replyCount: p.replyCount,
            createdAt: p.createdAt,
          }));
      }
    }

    // Search People
    if (['all', 'people'].includes(category)) {
      if (db) {
        const peopleRes = await db
          .prepare(
            `SELECT user_id, display_name, handle, bio, avatar_url, location
             FROM user_profiles
             WHERE (display_name LIKE ? OR handle LIKE ? OR user_id LIKE ?)
             LIMIT ?`
          )
          .bind(searchPattern, searchPattern, searchPattern, limit * 2)
          .all<any>();

        people = (peopleRes.results || [])
          .filter(p => !blockedSet.has(p.user_id))
          .slice(0, limit)
          .map(p => ({
            userId: p.user_id,
            displayName: p.display_name,
            handle: p.handle,
            bio: p.bio,
            avatarUrl: p.avatar_url,
            location: p.location,
          }));
      } else {
        people = globalProfilesStore
          .filter(
            p =>
              !blockedSet.has(p.userId) &&
              (p.displayName?.toLowerCase().includes(searchToken) ||
               p.handle?.toLowerCase().includes(searchToken) ||
               p.userId?.toLowerCase().includes(searchToken))
          )
          .slice(0, limit)
          .map(p => ({
            userId: p.userId,
            displayName: p.displayName,
            handle: p.handle,
            bio: p.bio,
            avatarUrl: p.avatarUrl,
            location: p.location,
          }));
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
