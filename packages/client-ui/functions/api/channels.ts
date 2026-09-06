// ===========================================================================
// AETHERIS OMNI-SPHERE — SOVEREIGN CHANNELS EDGE API
// Supports: Cloudflare D1 (SQL), Cloudflare KV (Real-time edge cache)
// Automatic zero-latency fallback to In-Memory Edge Store when bindings are absent.
// ===========================================================================

import {
  Env,
  EdgeChannel,
  getD1Database,
  getKVStore,
  globalChannelsStore,
  isProductionEnv,
  createD1UnavailableResponse,
} from './_db.js';
import { requireAdmin, requireSignedEnvelope } from './_auth.js';

export { EdgeChannel };

/**
 * Parses raw D1 channel row into typed EdgeChannel object
 */
export function parseD1ChannelRow(row: any): EdgeChannel {
  return {
    id: row.id,
    space: row.space,
    name: row.name,
    description: row.description,
    isEncrypted: Boolean(row.isEncrypted !== undefined ? row.isEncrypted : row.is_encrypted),
    createdAt: Number(row.createdAt !== undefined ? row.createdAt : row.created_at) || Date.now(),
  };
}

/**
 * GET /api/channels
 * Query parameters:
 *  - space: 'relays' | 'vault' | 'pulse' | 'all' (default: 'relays')
 *  - limit: number (default: 50, max: 100)
 *  - offset: number (default: 0)
 */
export async function onRequestGet(context: { request: Request; env?: Env }): Promise<Response> {
  try {
    const url = new URL(context.request.url);
    const space = url.searchParams.get('space') || 'all';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    const db = getD1Database(context.env);
    const kv = getKVStore(context.env);

    // Check KV cache
    const cacheKey = `channels:${space}:${limit}:${offset}`;
    if (kv) {
      try {
        const cached = await kv.get<{ success: boolean; channels: EdgeChannel[] }>(cacheKey, 'json');
        if (cached && cached.channels) {
          return new Response(JSON.stringify(cached), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=15, stale-while-revalidate=30',
              'X-Edge-Storage': 'Cloudflare-KV',
            },
          });
        }
      } catch (_) {}
    }

    const isProd = isProductionEnv(context.env);
    let channels: EdgeChannel[] = [];

    // 1. Query D1
    if (db) {
      try {
        let query = 'SELECT * FROM channels WHERE 1=1';
        const params: any[] = [];

        if (space && space !== 'all') {
          query += ' AND space = ?';
          params.push(space);
        }

        query += ' ORDER BY created_at ASC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const stmt = db.prepare(query).bind(...params);
        const { results } = await stmt.all<any>();

        if (results && results.length > 0) {
          channels = results.map(parseD1ChannelRow);
        } else if (isProd) {
          channels = [];
        } else if (offset === 0) {
          channels = globalChannelsStore.filter((c) => (space === 'all' ? true : c.space === space));
        }
      } catch (dbErr: any) {
        if (isProd) {
          return new Response(
            JSON.stringify({ success: false, error: `Database query failed: ${dbErr?.message || 'D1 error'}` }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }
        console.warn('[D1 Channels Fallback]', dbErr);
        channels = globalChannelsStore.filter((c) => (space === 'all' ? true : c.space === space));
      }
    } else if (isProd) {
      return createD1UnavailableResponse();
    } else {
      // 2. Fallback to in-memory store (Dev/Test only)
      let result = [...globalChannelsStore];

      if (space && space !== 'all') {
        result = result.filter((c) => c.space === space);
      }

      result.sort((a, b) => a.createdAt - b.createdAt);
      channels = result.slice(offset, offset + limit);
    }

    const payload = {
      success: true,
      space,
      count: channels.length,
      channels,
    };

    // Store in KV cache
    if (kv) {
      try {
        await kv.put(cacheKey, JSON.stringify(payload), { expirationTtl: 60 });
      } catch (_) {}
    }

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Edge-Storage': db ? 'Cloudflare-D1' : 'Edge-Isolate-Memory',
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Internal error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * POST /api/channels
 * Payload: { id?: string, space: 'relays'|'vault'|'pulse', name: string, description?: string, isEncrypted?: boolean }
 */
export async function onRequestPost(context: { request: Request; env?: Env }): Promise<Response> {
  try {
    const rawBody = (await context.request.json()) as any;
    let body = rawBody;
    const db = getD1Database(context.env);
    const kv = getKVStore(context.env);

    const candidateBody = rawBody.payload && typeof rawBody.payload === 'object' ? rawBody.payload : rawBody;

    if (!candidateBody.name || !candidateBody.name.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Channel name is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const space = candidateBody.space || 'relays';
    if (!['relays', 'vault', 'pulse'].includes(space)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid space. Must be relays, vault, or pulse' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Protect channel creation: require admin or cryptographically signed request / envelope
    const adminCheck = await requireAdmin(context);
    if (!adminCheck.authorized) {
      const authResult = await requireSignedEnvelope(context, rawBody, 'channel:create');
      if (!authResult.authorized) {
        return authResult.response!;
      }
      if (authResult.payload) {
        body = authResult.payload;
      }
    } else if (rawBody.payload) {
      body = rawBody.payload;
    }

    const channelId = body.id || `${space}-${body.name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`;
    const newChannel: EdgeChannel = {
      id: channelId,
      space: space as 'relays' | 'vault' | 'pulse',
      name: body.name.trim().toLowerCase(),
      description: body.description?.trim() || `Sovereign ${space} channel #${body.name.trim()}`,
      isEncrypted: body.isEncrypted !== undefined ? Boolean(body.isEncrypted) : space === 'relays',
      createdAt: body.createdAt || Date.now(),
    };

    const isProd = isProductionEnv(context.env);

    // Store in Cloudflare D1 if available
    if (db) {
      try {
        const stmt = db
          .prepare(
            `INSERT OR REPLACE INTO channels (
              id, space, name, description, is_encrypted, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)`
          )
          .bind(
            newChannel.id,
            newChannel.space,
            newChannel.name,
            newChannel.description,
            newChannel.isEncrypted ? 1 : 0,
            newChannel.createdAt
          );

        const runResult = await stmt.run();
        if (isProd && runResult && runResult.success === false) {
          return new Response(
            JSON.stringify({ success: false, error: `Database channel insert rejected: ${runResult.error || 'D1 error'}` }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }
      } catch (dbErr: any) {
        if (isProd) {
          return new Response(
            JSON.stringify({ success: false, error: `Database transaction failed: ${dbErr?.message || 'D1 channel error'}` }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }
        console.warn('[D1 Channel Insert Fallback]', dbErr);
      }
    } else if (isProd) {
      return createD1UnavailableResponse();
    }

    // Cache in KV
    if (kv) {
      try {
        await kv.put(`channel:${newChannel.id}`, JSON.stringify(newChannel), { expirationTtl: 86400 });
      } catch (_) {}
    }

    // In-memory isolate store sync
    const existingIndex = globalChannelsStore.findIndex((c) => c.id === newChannel.id);
    if (existingIndex >= 0) {
      globalChannelsStore[existingIndex] = newChannel;
    } else {
      globalChannelsStore.push(newChannel);
    }

    return new Response(
      JSON.stringify({
        success: true,
        channel: newChannel,
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          'X-Edge-Storage': db ? 'Cloudflare-D1' : 'Edge-Isolate-Memory',
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * DELETE /api/channels
 * Query parameter: ?id=channel-id
 * or JSON body: { id: string }
 */
export async function onRequestDelete(context: { request: Request; env?: Env }): Promise<Response> {
  // Enforce administrative authorization for channel deletion
  const adminCheck = await requireAdmin(context);
  if (!adminCheck.authorized) {
    return adminCheck.response!;
  }

  try {
    const url = new URL(context.request.url);
    let channelId = url.searchParams.get('id');

    if (!channelId && context.request.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = await context.request.json() as { id?: string };
        channelId = body.id || null;
      } catch (_) {}
    }

    if (!channelId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Channel id is required for deletion' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const db = getD1Database(context.env);
    const kv = getKVStore(context.env);
    const isProd = isProductionEnv(context.env);

    // 1. Delete from D1
    if (db) {
      try {
        const runRes = await db.prepare('DELETE FROM channels WHERE id = ?').bind(channelId).run();
        if (isProd && runRes && runRes.success === false) {
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to delete channel from database' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }
      } catch (dbErr: any) {
        if (isProd) {
          return new Response(
            JSON.stringify({ success: false, error: `Database delete transaction failed: ${dbErr?.message || 'D1 error'}` }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }
        console.warn('[D1 Channel Delete Fallback]', dbErr);
      }
    } else if (isProd) {
      return createD1UnavailableResponse();
    }

    // 2. Delete from KV
    if (kv) {
      try {
        await kv.delete(`channel:${channelId}`);
      } catch (_) {}
    }

    // 3. Delete from in-memory global store
    const idx = globalChannelsStore.findIndex((c) => c.id === channelId);
    if (idx >= 0) {
      globalChannelsStore.splice(idx, 1);
    }

    return new Response(
      JSON.stringify({
        success: true,
        deletedId: channelId,
        remainingCount: globalChannelsStore.length,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Edge-Storage': db ? 'Cloudflare-D1' : 'Edge-Isolate-Memory',
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Delete error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
