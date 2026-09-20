// ===========================================================================
// UREfy — SOVEREIGN COMMUNITIES EDGE API (/api/communities)
// Supports: Cloudflare D1 SQL, Community Directory, Memberships,
// Join/Leave mutations, Rule management, and In-Memory Fallback.
// ===========================================================================

import {
  Env,
  getD1Database,
  isProductionEnv,
  createD1UnavailableResponse,
  globalCommunitiesStore,
  globalCommunityMembersStore,
  EdgeCommunity,
  EdgeCommunityMember,
} from './_db.js';
import { requireSignedEnvelope } from './_auth.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Fingerprint',
};

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

/**
 * GET /api/communities
 * Query params:
 *   - id: specific community ID or name
 *   - category: filter by category
 *   - userId: optional requester ID to check isMember / role
 */
export async function onRequestGet(context: { request: Request; env?: Env }): Promise<Response> {
  try {
    const url = new URL(context.request.url);
    const id = (url.searchParams.get('id') || '').trim();
    const category = (url.searchParams.get('category') || '').trim();
    const userId = (url.searchParams.get('userId') || '').trim();

    const db = getD1Database(context.env);
    const isProd = isProductionEnv(context.env);

    if (!db && isProd) {
      return createD1UnavailableResponse();
    }

    if (id) {
      let comm: any = null;
      let membersCount = 0;
      let userRole: string | null = null;
      let moderators: string[] = [];

      if (db) {
        comm = await db
          .prepare('SELECT * FROM communities WHERE id = ? OR name = ? LIMIT 1')
          .bind(id, id)
          .first();

        if (comm) {
          const countRow = await db
            .prepare('SELECT COUNT(*) as count FROM community_members WHERE community_id = ?')
            .bind(comm.id)
            .first<{ count: number }>();
          membersCount = countRow?.count || 0;

          const modsRes = await db
            .prepare("SELECT user_id FROM community_members WHERE community_id = ? AND role IN ('moderator', 'admin')")
            .bind(comm.id)
            .all<{ user_id: string }>();
          moderators = (modsRes.results || []).map(r => r.user_id);

          if (userId) {
            const memberRow = await db
              .prepare('SELECT role FROM community_members WHERE community_id = ? AND user_id = ?')
              .bind(comm.id, userId)
              .first<{ role: string }>();
            userRole = memberRow ? memberRow.role : null;
          }
        }
      } else {
        comm = globalCommunitiesStore.find(c => c.id === id || c.name === id) || null;
        if (comm) {
          membersCount = globalCommunityMembersStore.filter(m => m.communityId === comm.id).length;
          moderators = globalCommunityMembersStore
            .filter(m => m.communityId === comm.id && ['moderator', 'admin'].includes(m.role))
            .map(m => m.userId);
          if (userId) {
            const m = globalCommunityMembersStore.find(m => m.communityId === comm.id && m.userId === userId);
            userRole = m ? m.role : null;
          }
        }
      }

      if (!comm) {
        return new Response(
          JSON.stringify({ success: false, error: 'Community not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }

      let rules = [];
      try {
        if (comm.rules_json || comm.rulesJson) {
          rules = JSON.parse(comm.rules_json || comm.rulesJson);
        }
      } catch (_) {}

      return new Response(
        JSON.stringify({
          success: true,
          community: {
            id: comm.id,
            name: comm.name,
            displayName: comm.display_name || comm.displayName,
            description: comm.description,
            category: comm.category,
            icon: comm.icon,
            banner: comm.banner,
            primaryColor: comm.primary_color || comm.primaryColor,
            channelId: comm.channel_id || comm.channelId,
            rules,
            membersCount,
            moderators,
            isMember: Boolean(userRole),
            userRole,
            createdAt: Number(comm.created_at || comm.createdAt),
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    // List communities
    let communities: any[] = [];
    if (db) {
      let query = 'SELECT communities.*, EXISTS(SELECT 1 FROM community_members WHERE community_id = communities.id AND user_id = ?) AS is_member FROM communities';
      const params: any[] = [userId];
      if (category) {
        query += ' WHERE category = ?';
        params.push(category);
      }
      query += ' ORDER BY member_count DESC, created_at ASC';

      const res = await db.prepare(query).bind(...params).all<any>();
      communities = (res.results || []).map(comm => {
        let rules = [];
        try {
          if (comm.rules_json) rules = JSON.parse(comm.rules_json);
        } catch (_) {}
        return {
          id: comm.id,
          name: comm.name,
          displayName: comm.display_name,
          description: comm.description,
          category: comm.category,
          icon: comm.icon,
          banner: comm.banner,
          primaryColor: comm.primary_color,
          channelId: comm.channel_id,
          rules,
          membersCount: Number(comm.member_count) || 0,
          isMember: Boolean(comm.is_member),
          createdAt: Number(comm.created_at),
        };
      });
    } else {
      let list = globalCommunitiesStore;
      if (category) {
        list = list.filter(c => c.category.toLowerCase() === category.toLowerCase());
      }
      communities = list.map(comm => {
        let rules = [];
        try {
          if (comm.rulesJson) rules = JSON.parse(comm.rulesJson);
        } catch (_) {}
        return {
          ...comm,
          rules,
        };
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: communities.length,
        communities,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Failed to fetch communities' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }
}

/**
 * POST /api/communities
 * Actions:
 *  - join: { action: 'join', communityId: string, userId: string }
 *  - leave: { action: 'leave', communityId: string, userId: string }
 *  - create: { action: 'create', name, displayName, description, category, icon, primaryColor, rules, userId }
 */
export async function onRequestPost(context: { request: Request; env?: Env }): Promise<Response> {
  try {
    const raw = await context.request.json().catch(() => null) as Record<string, any> | null;
    if (!raw) {
      return new Response(
        JSON.stringify({ success: false, error: 'Malformed JSON payload' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    const auth = await requireSignedEnvelope(context, raw.envelope || raw);
    if (!auth.authorized) return auth.response!;
    const body = auth.payload as Record<string, any>;
    if (body.scope !== 'urefy-community-v1') return Response.json({ success: false, error: 'Invalid community request scope' }, { status: 400 });
    const action = typeof body.action === 'string' ? body.action : '';
    const communityId = typeof body.communityId === 'string' ? body.communityId : '';
    const userId = auth.fingerprint!;

    const db = getD1Database(context.env);
    const isProd = isProductionEnv(context.env);

    if (!db && isProd) {
      return createD1UnavailableResponse();
    }

    const now = Date.now();

    if (action === 'join' || action === 'leave') {
      const exists = db ? await db.prepare('SELECT id FROM communities WHERE id = ?').bind(communityId).first() : globalCommunitiesStore.find(c => c.id === communityId);
      if (!exists) return Response.json({ success: false, error: 'Community not found' }, { status: 404 });
    }

    if (action === 'join') {
      if (!communityId || !userId) {
        return new Response(
          JSON.stringify({ success: false, error: 'communityId and userId are required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }

      if (db) {
        await db.batch([
          db.prepare(
            'INSERT OR IGNORE INTO community_members (community_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)'
          ).bind(communityId, userId, 'member', now),
          db.prepare(
            'UPDATE communities SET member_count = (SELECT COUNT(*) FROM community_members WHERE community_id = ?) WHERE id = ?'
          ).bind(communityId, communityId),
        ]);
      } else {
        const exists = globalCommunityMembersStore.some(m => m.communityId === communityId && m.userId === userId);
        if (!exists) {
          globalCommunityMembersStore.push({ communityId, userId, role: 'member', joinedAt: now });
          const comm = globalCommunitiesStore.find(c => c.id === communityId);
          if (comm) comm.memberCount++;
        }
      }

      return new Response(
        JSON.stringify({ success: true, action: 'join', communityId, userId, isMember: true }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    if (action === 'leave') {
      if (!communityId || !userId) {
        return new Response(
          JSON.stringify({ success: false, error: 'communityId and userId are required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }

      if (db) {
        await db.batch([
          db.prepare('DELETE FROM community_members WHERE community_id = ? AND user_id = ?').bind(communityId, userId),
          db.prepare(
            'UPDATE communities SET member_count = (SELECT COUNT(*) FROM community_members WHERE community_id = ?) WHERE id = ?'
          ).bind(communityId, communityId),
        ]);
      } else {
        const idx = globalCommunityMembersStore.findIndex(m => m.communityId === communityId && m.userId === userId);
        if (idx >= 0) {
          globalCommunityMembersStore.splice(idx, 1);
          const comm = globalCommunitiesStore.find(c => c.id === communityId);
          if (comm && comm.memberCount > 0) comm.memberCount--;
        }
      }

      return new Response(
        JSON.stringify({ success: true, action: 'leave', communityId, userId, isMember: false }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    if (action === 'create') {
      if (body.communityType && body.communityType !== 'public') return Response.json({ success: false, error: 'Private community access controls are not available yet. Create a public community or use encrypted direct messages.' }, { status: 422 });
      const name = (body.name || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
      const displayName = (body.displayName || '').trim();
      const description = (body.description || '').trim();
      const category = (body.category || 'General').trim();
      const icon = (body.icon || '🏛️').trim();
      const banner = (body.banner || 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)').trim();
      const primaryColor = (body.primaryColor || '#6366f1').trim();
      const rules = Array.isArray(body.rules) ? body.rules : [];

      if (!name || name.length < 3 || name.length > 30) {
        return new Response(
          JSON.stringify({ success: false, error: 'name must be between 3 and 30 alphanumeric characters' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }

      if (!displayName || displayName.length > 60) {
        return new Response(
          JSON.stringify({ success: false, error: 'displayName must be between 1 and 60 characters' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }

      const newId = `c-${name}`;
      const channelId = `c/${name}`;

      if (db) {
        const existing = await db.prepare('SELECT id FROM communities WHERE name = ? OR id = ?').bind(name, newId).first();
        if (existing) {
          return new Response(
            JSON.stringify({ success: false, error: 'Community name already exists' }),
            { status: 409, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
          );
        }

        await db.batch([
          db.prepare(
            `INSERT INTO communities (
              id, name, display_name, description, category, icon, banner, primary_color, channel_id, rules_json, member_count, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`
          ).bind(
            newId, name, displayName, description || null, category, icon, banner, primaryColor, channelId, JSON.stringify(rules), now
          ),
          db.prepare(
            'INSERT INTO community_members (community_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)'
          ).bind(newId, userId, 'admin', now),
        ]);
      } else {
        const existing = globalCommunitiesStore.find(c => c.name === name || c.id === newId);
        if (existing) {
          return new Response(
            JSON.stringify({ success: false, error: 'Community name already exists' }),
            { status: 409, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
          );
        }

        const newComm: EdgeCommunity = {
          id: newId,
          name,
          displayName,
          description,
          category,
          icon,
          banner,
          primaryColor,
          channelId,
          rulesJson: JSON.stringify(rules),
          memberCount: 1,
          createdAt: now,
        };
        globalCommunitiesStore.push(newComm);
        globalCommunityMembersStore.push({ communityId: newId, userId, role: 'admin', joinedAt: now });
      }

      return new Response(
        JSON.stringify({
          success: true,
          action: 'create',
          community: {
            id: newId,
            name,
            displayName,
            description,
            category,
            icon,
            banner,
            primaryColor,
            channelId,
            rules,
            memberCount: 1,
            userRole: 'admin',
            createdAt: now,
          },
        }),
        { status: 201, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action. Supported: join, leave, create' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Failed to process community action' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }
}
