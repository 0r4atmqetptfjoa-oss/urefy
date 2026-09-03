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
  INITIAL_CHANNELS,
} from './_db.js';

export { EdgeChannel };

/**
 * Parses raw D1 channel row into typed EdgeChannel object
 */
export function parseD1ChannelRow(row: any): EdgeChannel {
  return {
    id: row.id,
    space: row.space,
    name: row.name,
    description: row.description || '',
    isEncrypted: Boolean(row.isEncrypted !== undefined ? row.isEncrypted : row.is_encrypted),
    createdAt: Number(row.createdAt !== undefined ? row.createdAt : row.created_at) || Date.now(),
  };
}

/**
 * GET /api/channels
 * Query parameters:
 *  - space: 'relays' | 'vault' | 'pulse' | 'all' (default: 'all')
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

    // 1. Check Edge KV Cache
    const cacheKey = `channels:${space}:${limit}:${offset}`;
    if (kv) {
      try {
        const cached = await kv.get<{ success: boolean; count: number; channels: EdgeChannel[] }>(cacheKey, 'json');
        if (cached && Array.isArray(cached.channels)) {
          return new Response(JSON.stringify(cached), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'X-Edge-Cache': 'HIT',
              'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
            },
          });
        }
      } catch (_) {}
    }

    let channels: EdgeChannel[] = [];

    // 2. Query Cloudflare D1 Database if binding available
    if (db) {
      try {
        let query = 'SELECT * FROM channels';
        const params: any[] = [];

        if (space && space !== 'all') {
          query += ' WHERE space = ?';
          params.push(space);
        }

        query += ' ORDER BY createdAt ASC, created_at ASC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const stmt = db.prepare(query).bind(...params);
        const { results } = await stmt.all<any>();

        if (results && results.length > 0) {
          channels = results.map(parseD1ChannelRow);
        } else {
          // If D1 is empty on initial migration, fallback to in-memory seed channels
          channels = globalChannelsStore.filter((c) => (space === 'all' ? true : c.space === space));
        }
      } catch (dbError) {
        console.warn('[D1 Channels Fallback]', dbError);
        channels = globalChannelsStore.filter((c) => (space === 'all' ? true : c.space === space));
      }
    } else {
      // 3. In-Memory Edge Store Fallback
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
    const body = (await context.request.json()) as Partial<EdgeChannel>;
    const db = getD1Database(context.env);
    const kv = getKVStore(context.env);

    if (!body.name || !body.name.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Channel name is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const space = body.space || 'relays';
    if (!['relays', 'vault', 'pulse'].includes(space)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid space. Must be relays, vault, or pulse' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
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

    // Store in Cloudflare D1 if available
    if (db) {
      try {
        await db
          .prepare(
            `INSERT OR REPLACE INTO channels (
              id, space, name, description, isEncrypted, is_encrypted, createdAt, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            newChannel.id,
            newChannel.space,
            newChannel.name,
            newChannel.description,
            newChannel.isEncrypted ? 1 : 0,
            newChannel.isEncrypted ? 1 : 0,
            newChannel.createdAt,
            newChannel.createdAt
          )
          .run();
      } catch (dbErr) {
        console.warn('[D1 Channel Insert Fallback]', dbErr);
      }
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

    // 1. Delete from D1
    if (db) {
      try {
        await db.prepare('DELETE FROM channels WHERE id = ?').bind(channelId).run();
      } catch (dbErr) {
        console.warn('[D1 Channel Delete Fallback]', dbErr);
      }
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
