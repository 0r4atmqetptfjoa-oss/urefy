// ===========================================================================
// UREfy — SOVEREIGN CONTEXTS / FACETS EDGE API (/api/facets)
// Supports: Multiple social facets per sovereign identity, public unlinkability,
// 5-facet identity limit, handle unicity, and D1 / In-Memory fallback.
// ===========================================================================

import {
  Env,
  getD1Database,
  isProductionEnv,
  createD1UnavailableResponse,
  globalFacetsStore,
  globalFacetFollowsStore,
  globalPostsStore,
  EdgeFacet,
} from './_db.js';
import { requireSignedEnvelope, requireAdmin } from './_auth.js';

export const MAX_FACETS_PER_IDENTITY = 5;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Fingerprint, X-Facet-Id',
};

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

function sanitizeUrl(raw?: string): string | undefined {
  if (!raw) return undefined;
  const clean = raw.trim();
  if (/^https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/.*)?$/i.test(clean)) {
    return clean;
  }
  return undefined;
}

/**
 * Strips sensitive owner attribution from public facet objects.
 * Never leaks owner_fingerprint or unlinked sibling facets to public callers.
 * Administrators can view owner fingerprint for abuse moderation.
 */
export function sanitizePublicFacet(facet: EdgeFacet, isOwner = false, isAdmin = false) {
  return {
    id: facet.id,
    handle: facet.handle,
    displayName: facet.displayName,
    avatarUrl: facet.avatarUrl,
    bio: facet.bio,
    visibility: facet.visibility,
    status: facet.status || 'active',
    isDefault: Boolean(facet.isDefault),
    isPubliclyLinked: Boolean(facet.isPubliclyLinked),
    createdAt: facet.createdAt,
    updatedAt: facet.updatedAt,
    ...(isOwner || isAdmin ? { ownerFingerprint: facet.ownerFingerprint } : {}),
  };
}

/**
 * GET /api/facets
 * Query params:
 *   - id: facet ID
 *   - handle: @handle
 *   - owner: list all facets owned by caller (caller verified via X-User-Fingerprint or auth)
 */
export async function onRequestGet(context: { request: Request; env?: Env }): Promise<Response> {
  try {
    const url = new URL(context.request.url);
    const facetId = (url.searchParams.get('id') || '').trim();
    let handle = (url.searchParams.get('handle') || '').trim();
    if (handle.startsWith('@')) handle = handle.slice(1);
    const ownerQuery = (url.searchParams.get('owner') || url.searchParams.get('ownerFingerprint') || '').trim();
    const callerFingerprint = (context.request.headers.get('X-User-Fingerprint') || '').trim();

    const db = getD1Database(context.env);
    const isProd = isProductionEnv(context.env);

    if (!db && isProd) {
      return createD1UnavailableResponse();
    }

    const adminCheck = await requireAdmin(context).catch(() => ({ authorized: false }));
    const isAdmin = Boolean(adminCheck?.authorized);

    // ── 1. QUERY BY OWNER: List caller's facets ──────────────────────────────
    if (ownerQuery) {
      const isOwner = Boolean(callerFingerprint && callerFingerprint === ownerQuery);

      let facets: EdgeFacet[] = [];
      if (db) {
        let query = '';
        if (isOwner || isAdmin) {
          query = 'SELECT * FROM facets WHERE owner_fingerprint = ? AND (status != "deleted" OR ? = 1) ORDER BY is_default DESC, created_at ASC';
        } else {
          query = 'SELECT * FROM facets WHERE owner_fingerprint = ? AND (visibility = "public" OR is_publicly_linked = 1) AND (status = "active" OR status IS NULL) ORDER BY is_default DESC, created_at ASC';
        }
        const rows = await db.prepare(query).bind(ownerQuery, isAdmin ? 1 : 0).all<any>();
        facets = (rows.results || []).map(r => ({
          id: r.id,
          ownerFingerprint: r.owner_fingerprint,
          handle: r.handle,
          displayName: r.display_name,
          avatarUrl: r.avatar_url || undefined,
          bio: r.bio || undefined,
          visibility: r.visibility,
          status: r.status || 'active',
          isDefault: Boolean(r.is_default),
          isPubliclyLinked: Boolean(r.is_publicly_linked),
          createdAt: Number(r.created_at),
          updatedAt: Number(r.updated_at),
        }));
      } else {
        facets = globalFacetsStore.filter(f => {
          if (f.ownerFingerprint !== ownerQuery) return false;
          if (f.status === 'deleted' && !isAdmin) return false;
          if (isOwner || isAdmin) return true;
          return (f.visibility === 'public' || f.isPubliclyLinked) && (f.status === 'active' || !f.status);
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          facets: facets.map(f => sanitizePublicFacet(f, isOwner, isAdmin)),
          count: facets.length,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    // ── 2. QUERY SINGLE FACET BY ID OR HANDLE ────────────────────────────────
    if (!facetId && !handle) {
      return new Response(
        JSON.stringify({ success: false, error: 'Either id, handle, or owner parameter is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    let facet: EdgeFacet | null = null;
    let followersCount = 0;
    let followingCount = 0;
    let postsCount = 0;

    if (db) {
      let row: any = null;
      if (facetId) {
        row = await db.prepare('SELECT * FROM facets WHERE id = ?').bind(facetId).first();
      } else if (handle) {
        row = await db.prepare('SELECT * FROM facets WHERE handle = ? COLLATE NOCASE').bind(handle).first();
      }

      if (row) {
        facet = {
          id: row.id,
          ownerFingerprint: row.owner_fingerprint,
          handle: row.handle,
          displayName: row.display_name,
          avatarUrl: row.avatar_url || undefined,
          bio: row.bio || undefined,
          visibility: row.visibility,
          status: row.status || 'active',
          isDefault: Boolean(row.is_default),
          isPubliclyLinked: Boolean(row.is_publicly_linked),
          createdAt: Number(row.created_at),
          updatedAt: Number(row.updated_at),
        };

        const fCountRow = await db.prepare('SELECT COUNT(*) as count FROM facet_follows WHERE following_facet_id = ?').bind(facet.id).first<{ count: number }>();
        followersCount = fCountRow?.count || 0;

        const fingCountRow = await db.prepare('SELECT COUNT(*) as count FROM facet_follows WHERE follower_facet_id = ?').bind(facet.id).first<{ count: number }>();
        followingCount = fingCountRow?.count || 0;

        const pCountRow = await db.prepare('SELECT COUNT(*) as count FROM posts WHERE facet_id = ? AND (status IN ("published", "pinned", "locked") OR status IS NULL)').bind(facet.id).first<{ count: number }>();
        postsCount = pCountRow?.count || 0;
      }
    } else {
      if (facetId) {
        facet = globalFacetsStore.find(f => f.id === facetId) || null;
      } else if (handle) {
        facet = globalFacetsStore.find(f => f.handle.toLowerCase() === handle.toLowerCase()) || null;
      }

      if (facet) {
        followersCount = globalFacetFollowsStore.filter(f => f.followingFacetId === facet!.id).length;
        followingCount = globalFacetFollowsStore.filter(f => f.followerFacetId === facet!.id).length;
        postsCount = globalPostsStore.filter(p => p.facetId === facet!.id).length;
      }
    }

    if (!facet) {
      return new Response(
        JSON.stringify({ success: false, error: 'Facet not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    const isOwner = Boolean(callerFingerprint && callerFingerprint === facet.ownerFingerprint);

    // If facet is deleted or unlisted and requester is neither owner nor admin, hide it
    if ((facet.status === 'deleted' || facet.visibility === 'unlisted') && !isOwner && !isAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Facet not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    // Linked facets: only return if owner, or if public linking is enabled on both sides
    let linkedFacets: any[] = [];
    if (isOwner || facet.isPubliclyLinked) {
      if (db) {
        const linkedRows = await db.prepare(
          'SELECT * FROM facets WHERE owner_fingerprint = ? AND id != ? AND (is_publicly_linked = 1 OR ? = 1) AND (status != "deleted" OR ? = 1)'
        ).bind(facet.ownerFingerprint, facet.id, isOwner ? 1 : 0, isAdmin ? 1 : 0).all<any>();
        linkedFacets = (linkedRows.results || []).map(r => sanitizePublicFacet({
          id: r.id,
          ownerFingerprint: r.owner_fingerprint,
          handle: r.handle,
          displayName: r.display_name,
          avatarUrl: r.avatar_url,
          bio: r.bio,
          visibility: r.visibility,
          status: r.status || 'active',
          isDefault: Boolean(r.is_default),
          isPubliclyLinked: Boolean(r.is_publicly_linked),
          createdAt: Number(r.created_at),
          updatedAt: Number(r.updated_at),
        }, isOwner, isAdmin));
      } else {
        linkedFacets = globalFacetsStore
          .filter(f => f.ownerFingerprint === facet!.ownerFingerprint && f.id !== facet!.id && (f.isPubliclyLinked || isOwner) && (f.status !== 'deleted' || isAdmin))
          .map(f => sanitizePublicFacet(f, isOwner, isAdmin));
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        facet: sanitizePublicFacet(facet, isOwner, isAdmin),
        linkedFacets: (facet.isPubliclyLinked || isOwner) ? linkedFacets : [],
        stats: {
          followersCount,
          followingCount,
          postsCount,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Failed to fetch facet' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }
}

/**
 * POST /api/facets
 * Actions:
 *   - create: { action: 'create', displayName, handle, bio, avatarUrl, visibility, isPubliclyLinked }
 *   - update: { action: 'update', facetId, displayName, bio, avatarUrl, visibility }
 *   - toggle-public-link: { action: 'toggle-public-link', facetId, isPubliclyLinked }
 *   - set-default: { action: 'set-default', facetId }
 *   - delete: { action: 'delete', facetId }
 * Requires signed envelope from sovereign root key.
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

    const auth = await requireSignedEnvelope(context, raw.envelope || raw, 'facet:manage');
    if (!auth.authorized) return auth.response!;
    const body = auth.payload as Record<string, any>;
    const action = String(body.action || '').trim().toLowerCase();
    const ownerFingerprint = auth.fingerprint!;

    const db = getD1Database(context.env);
    const isProd = isProductionEnv(context.env);

    if (!db && isProd) {
      return createD1UnavailableResponse();
    }

    const now = Date.now();

    // ── ACTION: CREATE ─────────────────────────────────────────────────────────
    if (action === 'create') {
      let displayName = String(body.displayName || '').trim();
      let handle = String(body.handle || '').trim();
      let bio = typeof body.bio === 'string' ? body.bio.trim().slice(0, 500) : undefined;
      let avatarUrl = typeof body.avatarUrl === 'string' ? body.avatarUrl.trim() : undefined;
      let visibility = String(body.visibility || 'public').trim().toLowerCase();
      let isPubliclyLinked = Boolean(body.isPubliclyLinked);

      if (avatarUrl && !sanitizeUrl(avatarUrl)) {
        return Response.json({ success: false, error: 'Avatar must use an http or https URL' }, { status: 400 });
      }

      if (handle.startsWith('@')) handle = handle.slice(1);

      if (!['public', 'contextual', 'unlisted'].includes(visibility)) {
        visibility = 'public';
      }

      if (!displayName || displayName.length > 60) {
        return new Response(
          JSON.stringify({ success: false, error: 'displayName must be between 1 and 60 characters' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }

      if (!handle || !/^[a-zA-Z0-9_]{3,30}$/.test(handle)) {
        return new Response(
          JSON.stringify({ success: false, error: 'handle must be 3-30 alphanumeric characters or underscores' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }

      // Check 5-facet identity limit (only active facets count)
      let count = 0;
      if (db) {
        const countRow = await db.prepare('SELECT COUNT(*) as count FROM facets WHERE owner_fingerprint = ? AND (status != "deleted" OR status IS NULL)').bind(ownerFingerprint).first<{ count: number }>();
        count = countRow?.count || 0;
      } else {
        count = globalFacetsStore.filter(f => f.ownerFingerprint === ownerFingerprint && f.status !== 'deleted').length;
      }

      if (count >= MAX_FACETS_PER_IDENTITY) {
        return new Response(
          JSON.stringify({ success: false, error: `Facet limit reached: maximum ${MAX_FACETS_PER_IDENTITY} Facets per identity` }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }

      // Check handle unicity
      if (db) {
        const existing = await db.prepare('SELECT id FROM facets WHERE handle = ? COLLATE NOCASE').bind(handle).first();
        if (existing) {
          return new Response(
            JSON.stringify({ success: false, error: 'Handle is already taken' }),
            { status: 409, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
          );
        }
      } else {
        const existing = globalFacetsStore.find(f => f.handle.toLowerCase() === handle.toLowerCase());
        if (existing) {
          return new Response(
            JSON.stringify({ success: false, error: 'Handle is already taken' }),
            { status: 409, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
          );
        }
      }

      const isDefault = count === 0;
      const randSuffix = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
        : Math.random().toString(36).slice(2, 14);
      const newFacetId = `fct-${randSuffix}`;

      const newFacet: EdgeFacet = {
        id: newFacetId,
        ownerFingerprint,
        handle,
        displayName,
        avatarUrl,
        bio,
        visibility: visibility as any,
        status: 'active',
        isDefault,
        isPubliclyLinked,
        createdAt: now,
        updatedAt: now,
      };

      if (db) {
        await db.prepare(
          `INSERT INTO facets (
            id, owner_fingerprint, handle, display_name, avatar_url, bio,
            visibility, is_default, is_publicly_linked, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          newFacet.id,
          newFacet.ownerFingerprint,
          newFacet.handle,
          newFacet.displayName,
          newFacet.avatarUrl || null,
          newFacet.bio || null,
          newFacet.visibility,
          newFacet.isDefault ? 1 : 0,
          newFacet.isPubliclyLinked ? 1 : 0,
          'active',
          now,
          now
        ).run();
      } else {
        globalFacetsStore.push(newFacet);
      }

      return new Response(
        JSON.stringify({ success: true, facet: sanitizePublicFacet(newFacet, true) }),
        { status: 201, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    // ── ACTION: UPDATE ─────────────────────────────────────────────────────────
    if (action === 'update') {
      const facetId = String(body.facetId || body.id || '').trim();
      if (!facetId) {
        return new Response(
          JSON.stringify({ success: false, error: 'facetId is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }

      let existing: EdgeFacet | null = null;
      if (db) {
        const row: any = await db.prepare('SELECT * FROM facets WHERE id = ?').bind(facetId).first();
        if (row) {
          existing = {
            id: row.id,
            ownerFingerprint: row.owner_fingerprint,
            handle: row.handle,
            displayName: row.display_name,
            avatarUrl: row.avatar_url || undefined,
            bio: row.bio || undefined,
            visibility: row.visibility,
            isDefault: Boolean(row.is_default),
            isPubliclyLinked: Boolean(row.is_publicly_linked),
            createdAt: Number(row.created_at),
            updatedAt: Number(row.updated_at),
          };
        }
      } else {
        existing = globalFacetsStore.find(f => f.id === facetId) || null;
      }

      if (!existing) {
        return new Response(
          JSON.stringify({ success: false, error: 'Facet not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }

      if (existing.ownerFingerprint !== ownerFingerprint) {
        return new Response(
          JSON.stringify({ success: false, error: 'Forbidden: you do not own this Facet' }),
          { status: 403, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }

      const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : existing.displayName;
      const bio = typeof body.bio === 'string' ? body.bio.trim().slice(0, 500) : existing.bio;
      const avatarUrl = typeof body.avatarUrl === 'string' ? (sanitizeUrl(body.avatarUrl) || existing.avatarUrl) : existing.avatarUrl;
      const visibility = ['public', 'contextual', 'unlisted'].includes(body.visibility) ? body.visibility : existing.visibility;
      const isPubliclyLinked = body.isPubliclyLinked !== undefined ? Boolean(body.isPubliclyLinked) : existing.isPubliclyLinked;

      if (!displayName || displayName.length > 60) {
        return new Response(
          JSON.stringify({ success: false, error: 'displayName must be between 1 and 60 characters' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }

      existing.displayName = displayName;
      existing.bio = bio;
      existing.avatarUrl = avatarUrl;
      existing.visibility = visibility;
      existing.isPubliclyLinked = isPubliclyLinked;
      existing.updatedAt = now;

      if (db) {
        await db.prepare(
          `UPDATE facets SET
            display_name = ?, bio = ?, avatar_url = ?, visibility = ?, is_publicly_linked = ?, updated_at = ?
          WHERE id = ? AND owner_fingerprint = ?`
        ).bind(
          displayName,
          bio || null,
          avatarUrl || null,
          visibility,
          isPubliclyLinked ? 1 : 0,
          now,
          facetId,
          ownerFingerprint
        ).run();
      }

      return new Response(
        JSON.stringify({ success: true, facet: sanitizePublicFacet(existing, true) }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    // ── ACTION: TOGGLE-PUBLIC-LINK ─────────────────────────────────────────────
    if (action === 'toggle-public-link') {
      const facetId = String(body.facetId || body.id || '').trim();
      const isPubliclyLinked = Boolean(body.isPubliclyLinked);

      if (!facetId) {
        return new Response(
          JSON.stringify({ success: false, error: 'facetId is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }

      if (db) {
        const res = await db.prepare(
          'UPDATE facets SET is_publicly_linked = ?, updated_at = ? WHERE id = ? AND owner_fingerprint = ?'
        ).bind(isPubliclyLinked ? 1 : 0, now, facetId, ownerFingerprint).run();

        if (res.meta && res.meta.changes === 0) {
          return new Response(
            JSON.stringify({ success: false, error: 'Facet not found or not owned' }),
            { status: 404, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
          );
        }
      } else {
        const facet = globalFacetsStore.find(f => f.id === facetId && f.ownerFingerprint === ownerFingerprint);
        if (!facet) {
          return new Response(
            JSON.stringify({ success: false, error: 'Facet not found or not owned' }),
            { status: 404, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
          );
        }
        facet.isPubliclyLinked = isPubliclyLinked;
        facet.updatedAt = now;
      }

      return new Response(
        JSON.stringify({ success: true, facetId, isPubliclyLinked }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    // ── ACTION: SET-DEFAULT ────────────────────────────────────────────────────
    if (action === 'set-default') {
      const facetId = String(body.facetId || body.id || '').trim();
      if (!facetId) {
        return new Response(
          JSON.stringify({ success: false, error: 'facetId is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }

      if (db) {
        await db.batch([
          db.prepare('UPDATE facets SET is_default = 0 WHERE owner_fingerprint = ?').bind(ownerFingerprint),
          db.prepare('UPDATE facets SET is_default = 1, updated_at = ? WHERE id = ? AND owner_fingerprint = ?').bind(now, facetId, ownerFingerprint),
        ]);
      } else {
        for (const f of globalFacetsStore) {
          if (f.ownerFingerprint === ownerFingerprint) {
            f.isDefault = (f.id === facetId);
            f.updatedAt = now;
          }
        }
      }

      return new Response(
        JSON.stringify({ success: true, defaultFacetId: facetId }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    // ── ACTION: DELETE ─────────────────────────────────────────────────────────
    if (action === 'delete') {
      const facetId = String(body.facetId || body.id || '').trim();
      if (!facetId) {
        return new Response(
          JSON.stringify({ success: false, error: 'facetId is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }

      let facet: EdgeFacet | null = null;
      let totalFacets = 0;
      if (db) {
        const row: any = await db.prepare('SELECT * FROM facets WHERE id = ? AND owner_fingerprint = ?').bind(facetId, ownerFingerprint).first();
        if (row) {
          facet = {
            id: row.id,
            ownerFingerprint: row.owner_fingerprint,
            handle: row.handle,
            displayName: row.display_name,
            avatarUrl: row.avatar_url,
            bio: row.bio,
            visibility: row.visibility,
            isDefault: Boolean(row.is_default),
            isPubliclyLinked: Boolean(row.is_publicly_linked),
            createdAt: Number(row.created_at),
            updatedAt: Number(row.updated_at),
          };
        }
        const countRow = await db.prepare('SELECT COUNT(*) as count FROM facets WHERE owner_fingerprint = ?').bind(ownerFingerprint).first<{ count: number }>();
        totalFacets = countRow?.count || 0;
      } else {
        facet = globalFacetsStore.find(f => f.id === facetId && f.ownerFingerprint === ownerFingerprint) || null;
        totalFacets = globalFacetsStore.filter(f => f.ownerFingerprint === ownerFingerprint).length;
      }

      if (!facet) {
        return new Response(
          JSON.stringify({ success: false, error: 'Facet not found or not owned' }),
          { status: 404, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }

      if (facet.isDefault && totalFacets > 1) {
        return new Response(
          JSON.stringify({ success: false, error: 'Cannot delete default Facet. Set another Facet as default first.' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }

      if (db) {
        await db.batch([
          db.prepare('DELETE FROM facet_follows WHERE follower_facet_id = ? OR following_facet_id = ?').bind(facetId, facetId),
          db.prepare('DELETE FROM facet_community_memberships WHERE facet_id = ?').bind(facetId),
          db.prepare(`UPDATE facets SET
            status = 'deleted',
            visibility = 'unlisted',
            display_name = '[Deleted Context]',
            handle = 'deleted-' || lower(hex(randomblob(4))),
            bio = NULL,
            avatar_url = NULL,
            is_publicly_linked = 0,
            updated_at = ?
          WHERE id = ? AND owner_fingerprint = ?`).bind(now, facetId, ownerFingerprint),
        ]);
      } else {
        const f = globalFacetsStore.find(f => f.id === facetId && f.ownerFingerprint === ownerFingerprint);
        if (f) {
          f.status = 'deleted';
          f.visibility = 'unlisted';
          f.displayName = '[Deleted Context]';
          f.handle = `deleted-${Math.random().toString(36).slice(2, 8)}`;
          f.bio = undefined;
          f.avatarUrl = undefined;
          f.isPubliclyLinked = false;
          f.updatedAt = now;
        }
        for (let i = globalFacetFollowsStore.length - 1; i >= 0; i--) {
          if (globalFacetFollowsStore[i].followerFacetId === facetId || globalFacetFollowsStore[i].followingFacetId === facetId) {
            globalFacetFollowsStore.splice(i, 1);
          }
        }
      }

      return new Response(
        JSON.stringify({ success: true, deleted: true, facetId }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action. Supported: create, update, toggle-public-link, set-default, delete' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Failed to process facet action' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }
}
