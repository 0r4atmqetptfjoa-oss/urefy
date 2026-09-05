// ===========================================================================
// AETHERIS OMNI-SPHERE — NANOPUBLICATIONS & VERIFIED ARTIFACTS EDGE API
// Supports: Cloudflare D1 (SQL), Cloudflare R2 (Object Storage), Cloudflare KV
// Automatic fallback to In-Memory Edge Store when bindings are not present.
// ===========================================================================

import {
  Env,
  EdgeNanopublication,
  getD1Database,
  getKVStore,
  getR2Bucket,
  globalNanopublicationsStore,
  INITIAL_NANOPUBLICATIONS,
} from './_db.js';
import { requireAdmin, verifyIdentitySignature } from './_auth.js';

export { EdgeNanopublication };

export function parseD1NanopubRow(row: any): EdgeNanopublication {
  return {
    id: row.id,
    channelId: row.channelId ?? row.channel_id ?? 'vault-releases',
    title: row.title,
    fileName: row.fileName ?? row.file_name,
    byteSize: Number(row.byteSize !== undefined ? row.byteSize : row.byte_size) || 0,
    sha256: row.sha256,
    crc32: row.crc32 || '',
    entropy: Number(row.entropy) || 0.0,
    verdict: row.verdict || 'CLEAN',
    merkleRoot: row.merkleRoot ?? row.merkle_root ?? '00000000000000000000000000000000',
    seederCount: Number(row.seederCount !== undefined ? row.seederCount : row.seeder_count) || 1,
    r2Key: row.r2Key ?? row.r2_key ?? undefined,
    createdAt: Number(row.createdAt !== undefined ? row.createdAt : row.created_at) || Date.now(),
  };
}

export async function onRequestGet(context: { request: Request; env?: Env }): Promise<Response> {
  try {
    const url = new URL(context.request.url);
    const channelId = url.searchParams.get('channelId') || 'vault-releases';
    const sha256 = url.searchParams.get('sha256');
    const id = url.searchParams.get('id');
    const downloadKey = url.searchParams.get('download');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);

    const db = getD1Database(context.env);
    const r2 = getR2Bucket(context.env);

    // ─── R2 DIRECT OBJECT STREAMING DOWNLOAD ─────────────────────────────────
    if (downloadKey && r2) {
      try {
        const object = await r2.get(downloadKey);
        if (!object) {
          return new Response(JSON.stringify({ success: false, error: 'Object not found in R2' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const headers = new Headers();
        headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
        headers.set('Content-Length', String(object.size));
        headers.set('ETag', object.httpEtag);
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        headers.set('Content-Disposition', `attachment; filename="${downloadKey.split('/').pop() || 'artifact.bin'}"`);

        return new Response(object.body, {
          status: 200,
          headers,
        });
      } catch (r2Err: any) {
        console.warn('[R2 Download Error]', r2Err);
      }
    }

    let nanopubs: EdgeNanopublication[] = [];

    // ─── QUERY D1 DATABASE ───────────────────────────────────────────────────
    if (db) {
      try {
        let query = 'SELECT * FROM nanopublications WHERE 1=1';
        const params: any[] = [];

        if (id) {
          query += ' AND id = ?';
          params.push(id);
        } else {
          if (channelId && channelId !== 'all') {
            query += ' AND (channelId = ? OR channel_id = ?)';
            params.push(channelId, channelId);
          }
          if (sha256) {
            query += ' AND sha256 = ?';
            params.push(sha256);
          }
        }

        query += ' ORDER BY createdAt DESC, created_at DESC LIMIT ?';
        params.push(limit);

        const stmt = db.prepare(query).bind(...params);
        const { results } = await stmt.all<any>();

        if (results && results.length > 0) {
          nanopubs = results.map(parseD1NanopubRow);
        } else if (!sha256 && !id) {
          nanopubs = globalNanopublicationsStore.filter((n) =>
            channelId === 'all' ? true : n.channelId === channelId
          );
        }
      } catch (dbErr) {
        console.warn('[D1 Nanopubs Fallback]', dbErr);
        nanopubs = [...globalNanopublicationsStore];
      }
    } else {
      // ─── IN-MEMORY STORE FALLBACK ───────────────────────────────────────────
      let result = [...globalNanopublicationsStore];

      if (id) {
        result = result.filter((n) => n.id === id);
      } else {
        if (channelId && channelId !== 'all') {
          result = result.filter((n) => n.channelId === channelId);
        }
        if (sha256) {
          result = result.filter((n) => n.sha256 === sha256);
        }
      }

      result.sort((a, b) => b.createdAt - a.createdAt);
      nanopubs = result.slice(0, limit);
    }

    return new Response(
      JSON.stringify({
        success: true,
        channelId,
        count: nanopubs.length,
        nanopublications: nanopubs,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Edge-Storage': db ? 'Cloudflare-D1' : 'Edge-Isolate-Memory',
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Internal error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function onRequestPost(context: { request: Request; env?: Env }): Promise<Response> {
  try {
    const contentType = context.request.headers.get('Content-Type') || '';
    const db = getD1Database(context.env);
    const r2 = getR2Bucket(context.env);
    const kv = getKVStore(context.env);

    let body: any;

    // Support both JSON metadata and FormData / Octet-stream binary uploads
    if (contentType.includes('application/json')) {
      body = await context.request.json();
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await context.request.formData();
      const file = formData.get('file') as File | null;
      const metaStr = formData.get('metadata') as string | null;
      body = metaStr ? JSON.parse(metaStr) : {};

      if (file && r2) {
        const r2Key = `releases/${Date.now()}-${file.name}`;
        await r2.put(r2Key, await file.arrayBuffer(), {
          httpMetadata: { contentType: file.type || 'application/octet-stream' },
          customMetadata: { fileName: file.name, size: String(file.size) },
        });
        body.r2Key = r2Key;
        body.fileName = file.name;
        body.byteSize = file.size;
      }
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Unsupported Content-Type. Use application/json or multipart/form-data' }),
        { status: 415, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!body.title || !body.fileName || !body.sha256) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing mandatory fields: title, fileName, sha256' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ─── CRYPTOGRAPHIC AUTHORIZATION GUARD ───
    const adminCheck = await requireAdmin(context);
    if (!adminCheck.authorized) {
      const auth = verifyIdentitySignature(body, context.request);
      if (!auth.valid) {
        return (
          auth.response ||
          new Response(
            JSON.stringify({
              success: false,
              error: 'Cryptographic identity signature or Admin authorization required to publish nanopublications',
            }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          )
        );
      }
    }

    const newNanopub: EdgeNanopublication = {
      id: body.id || `nano-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      channelId: body.channelId || 'vault-releases',
      title: body.title.trim(),
      fileName: body.fileName.trim(),
      byteSize: Number(body.byteSize) || 0,
      sha256: body.sha256.trim(),
      crc32: (body.crc32 || '').toUpperCase(),
      entropy: typeof body.entropy === 'number' ? body.entropy : 6.0,
      verdict: body.verdict || 'CLEAN',
      merkleRoot: body.merkleRoot || '00000000000000000000000000000000',
      seederCount: Number(body.seederCount) || 1,
      r2Key: body.r2Key || undefined,
      createdAt: body.createdAt || Date.now(),
    };

    // Store in Cloudflare D1
    if (db) {
      try {
        await db
          .prepare(
            `INSERT OR REPLACE INTO nanopublications (
              id, channelId, channel_id, title, fileName, file_name, byteSize, byte_size,
              sha256, crc32, entropy, verdict, merkleRoot, merkle_root,
              seederCount, seeder_count, r2Key, r2_key, createdAt, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            newNanopub.id,
            newNanopub.channelId,
            newNanopub.channelId,
            newNanopub.title,
            newNanopub.fileName,
            newNanopub.fileName,
            newNanopub.byteSize,
            newNanopub.byteSize,
            newNanopub.sha256,
            newNanopub.crc32,
            newNanopub.entropy,
            newNanopub.verdict,
            newNanopub.merkleRoot,
            newNanopub.merkleRoot,
            newNanopub.seederCount,
            newNanopub.seederCount,
            newNanopub.r2Key || null,
            newNanopub.r2Key || null,
            newNanopub.createdAt,
            newNanopub.createdAt
          )
          .run();
      } catch (dbErr) {
        console.warn('[D1 Nanopub Insert Fallback]', dbErr);
      }
    }

    // Cache in KV
    if (kv) {
      try {
        await kv.put(`nanopub:${newNanopub.sha256}`, JSON.stringify(newNanopub), { expirationTtl: 86400 });
      } catch (_) {}
    }

    // In-memory isolate store sync
    const existingIndex = globalNanopublicationsStore.findIndex((n) => n.id === newNanopub.id || n.sha256 === newNanopub.sha256);
    if (existingIndex >= 0) {
      globalNanopublicationsStore[existingIndex] = newNanopub;
    } else {
      globalNanopublicationsStore.unshift(newNanopub);
    }

    return new Response(
      JSON.stringify({
        success: true,
        nanopublication: newNanopub,
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
      JSON.stringify({ success: false, error: err?.message || 'Invalid request payload' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
