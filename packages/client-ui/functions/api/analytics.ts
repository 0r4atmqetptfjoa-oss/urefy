// ===========================================================================
// AETHERIS OMNI-SPHERE — TELEMETRY & ANALYTICS EDGE API
// Route: /api/analytics
// Aggregates real-time mesh metrics: uptime, processed messages, active nodes, latency
// Supports: Cloudflare D1 (SQL), Cloudflare KV, In-Memory Edge Store fallback
// ===========================================================================

import {
  Env,
  EdgeNodeTelemetry,
  getD1Database,
  getKVStore,
  globalNodesTelemetryStore,
  globalMessagesStore,
  globalPostsStore,
  globalNanopublicationsStore,
  globalChannelsStore,
  EDGE_START_TIME,
  TOTAL_MESSAGES_COUNTER,
  INITIAL_NODES,
  isProductionEnv,
  createD1UnavailableResponse,
} from './_db.js';
import { requireAdmin, requireSignedEnvelope } from './_auth.js';

export interface AnalyticsSummary {
  status: 'healthy' | 'degraded' | 'syncing' | 'operational_state_unverified';
  serviceHealthVerified: boolean;
  protocol: string;
  uptimeSeconds: number;
  uptimePercentage: number | null;
  uptimeFormatted: string;
  edge: {
    colo: string;
    country: string;
    city: string;
    region: string;
    httpProtocol: string;
    asn: number;
  };
  metrics: {
    totalNodes: number;
    activeNodes: number;
    messagesProcessed: number;
    avgLatencyMs: number;
    totalBandwidthMbps: number;
    channelsCount: number;
    postsCount: number;
    nanopublicationsCount: number;
    zkRlnEpoch: number;
  };
  nodes: Array<{
    nodeId: string;
    name: string;
    role: string;
    status: string;
    latencyMs: number;
    meritScore: number;
    region: string;
    countryCode: string;
    uptime: number;
  }>;
  timestamp: number;
}

export async function onRequestGet(context: { request: Request; env?: Env }): Promise<Response> {
  try {
    const req = context.request;
    const cf = (req as any).cf || {};
    const db = getD1Database(context.env);
    const kv = getKVStore(context.env);

    const isProd = isProductionEnv(context.env);
    if (isProd && !db) {
      return createD1UnavailableResponse();
    }

    let nodes: EdgeNodeTelemetry[] = [];
    let totalMessages = isProd ? 0 : TOTAL_MESSAGES_COUNTER;
    let totalPosts = isProd ? 0 : globalPostsStore.length;
    let totalNanopubs = isProd ? 0 : globalNanopublicationsStore.length;
    let totalChannels = isProd ? 0 : globalChannelsStore.length;

    // 1. Fetch from Cloudflare D1 if available
    if (db) {
      try {
        const nodesRes = await db.prepare('SELECT * FROM nodes_telemetry ORDER BY merit_score DESC').all<any>();
        if (nodesRes.results && nodesRes.results.length > 0) {
          nodes = nodesRes.results.map((r: any) => ({
            id: r.id,
            nodeId: r.node_id,
            name: r.name,
            role: r.role,
            status: r.status,
            latencyMs: Number(r.latency_ms) || 15.0,
            meritScore: Number(r.merit_score) || 100,
            region: r.region || 'GLOBAL',
            countryCode: r.country_code || 'XX',
            uptime: Number(r.uptime) || 99.9,
            bandwidthMbps: Number(r.bandwidth_mbps) || 100.0,
            messagesProcessed: Number(r.messages_processed) || 0,
            zkRlnEpoch: Number(r.zk_rln_epoch) || 1,
            connections: r.connections_json ? JSON.parse(r.connections_json) : [],
            lastHeartbeat: Number(r.last_heartbeat) || Date.now(),
          }));
        } else if (!isProd) {
          nodes = [...globalNodesTelemetryStore];
        }

        // Aggregate counts from D1
        const [msgCount, postCount, nanoCount, chCount] = await Promise.all([
          db.prepare('SELECT COUNT(*) as count FROM messages').first<{ count: number }>(),
          db.prepare('SELECT COUNT(*) as count FROM posts').first<{ count: number }>(),
          db.prepare('SELECT COUNT(*) as count FROM nanopublications').first<{ count: number }>(),
          db.prepare('SELECT COUNT(*) as count FROM channels').first<{ count: number }>(),
        ]);

        if (msgCount && typeof msgCount.count === 'number') totalMessages = msgCount.count;
        if (postCount && typeof postCount.count === 'number') totalPosts = postCount.count;
        if (nanoCount && typeof nanoCount.count === 'number') totalNanopubs = nanoCount.count;
        if (chCount && typeof chCount.count === 'number') totalChannels = chCount.count;
      } catch (dbErr: any) {
        if (isProd) {
          return new Response(
            JSON.stringify({ success: false, error: `Database telemetry query failed: ${dbErr?.message || 'D1 query error'}` }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }
        console.warn('[D1 Analytics Fallback]', dbErr);
        nodes = [...globalNodesTelemetryStore];
      }
    } else {
      nodes = [...globalNodesTelemetryStore];
    }

    const activeNodes = nodes.filter((n) => n.status === 'active');
    const avgLatency =
      activeNodes.length > 0
        ? Math.round((activeNodes.reduce((acc, n) => acc + n.latencyMs, 0) / activeNodes.length) * 10) / 10
        : (isProd ? 0 : 14.5);
    const totalBandwidth = nodes.reduce((acc, n) => acc + (n.bandwidthMbps || 0), 0);
    const uptimeSec = Math.floor((Date.now() - EDGE_START_TIME) / 1000);
    const messagesSum = nodes.reduce((acc, n) => acc + (n.messagesProcessed || 0), totalMessages);

    const summary: AnalyticsSummary = {
      status: isProd ? (db ? 'healthy' : 'degraded') : 'healthy',
      serviceHealthVerified: Boolean(db),
      protocol: 'Aetheris-Sovereign-v1.0.0',
      uptimeSeconds: uptimeSec,
      uptimePercentage: isProd ? null : 99.98,
      uptimeFormatted: isProd ? 'Measured uptime unavailable' : `${uptimeSec}s continuous edge runtime`,
      edge: {
        colo: cf.colo || 'OTP',
        country: cf.country || 'RO',
        city: cf.city || 'Bucharest',
        region: cf.region || 'Bucuresti',
        httpProtocol: cf.httpProtocol || 'HTTP/3',
        asn: cf.asn || 13335,
      },
      metrics: {
        totalNodes: nodes.length,
        activeNodes: activeNodes.length,
        messagesProcessed: messagesSum,
        avgLatencyMs: avgLatency,
        totalBandwidthMbps: totalBandwidth,
        channelsCount: totalChannels,
        postsCount: totalPosts,
        nanopublicationsCount: totalNanopubs,
        zkRlnEpoch: 412,
      },
      nodes: nodes.map((n) => ({
        nodeId: n.nodeId,
        name: n.name,
        role: n.role,
        status: n.status,
        latencyMs: n.latencyMs,
        meritScore: n.meritScore,
        region: n.region,
        countryCode: n.countryCode,
        uptime: n.uptime,
      })),
      timestamp: Date.now(),
    };

    return new Response(JSON.stringify(summary, null, 2), {
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

export async function onRequestPost(context: { request: Request; env?: Env }): Promise<Response> {
  try {
    const rawBody = (await context.request.json()) as any;
    let body: Partial<EdgeNodeTelemetry> = rawBody;
    if (rawBody.payload && typeof rawBody.payload === 'object' && rawBody.signature && rawBody.identity) {
      body = rawBody.payload;
    }
    const db = getD1Database(context.env);

    if (!body.nodeId || !body.name) {
      return new Response(
        JSON.stringify({ success: false, error: 'nodeId and name are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ─── AUTHORIZATION GUARD ───
    const adminCheck = await requireAdmin(context);
    if (!adminCheck.authorized) {
      const auth = await requireSignedEnvelope(context, rawBody, 'node:telemetry');
      if (!auth.authorized) {
        return (
          auth.response ||
          new Response(
            JSON.stringify({
              success: false,
              error: 'Cryptographic node signature or Admin authorization required to post node telemetry',
            }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          )
        );
      }
    }

    const updatedNode: EdgeNodeTelemetry = {
      id: body.id || `node-${Date.now()}`,
      nodeId: body.nodeId,
      name: body.name,
      role: body.role || 'relay',
      status: body.status || 'active',
      latencyMs: typeof body.latencyMs === 'number' ? body.latencyMs : 15.0,
      meritScore: typeof body.meritScore === 'number' ? body.meritScore : 100,
      region: body.region || 'GLOBAL',
      countryCode: body.countryCode || 'XX',
      uptime: typeof body.uptime === 'number' ? body.uptime : 99.9,
      bandwidthMbps: typeof body.bandwidthMbps === 'number' ? body.bandwidthMbps : 100.0,
      messagesProcessed: typeof body.messagesProcessed === 'number' ? body.messagesProcessed : 0,
      zkRlnEpoch: typeof body.zkRlnEpoch === 'number' ? body.zkRlnEpoch : 1,
      connections: Array.isArray(body.connections) ? body.connections : [],
      lastHeartbeat: Date.now(),
    };

    if (db) {
      try {
        await db
          .prepare(
            `INSERT OR REPLACE INTO nodes_telemetry (
              id, node_id, name, role, status, latency_ms, merit_score,
              region, country_code, uptime, bandwidth_mbps, messages_processed,
              zk_rln_epoch, connections_json, last_heartbeat
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            updatedNode.id,
            updatedNode.nodeId,
            updatedNode.name,
            updatedNode.role,
            updatedNode.status,
            updatedNode.latencyMs,
            updatedNode.meritScore,
            updatedNode.region,
            updatedNode.countryCode,
            updatedNode.uptime,
            updatedNode.bandwidthMbps,
            updatedNode.messagesProcessed,
            updatedNode.zkRlnEpoch,
            JSON.stringify(updatedNode.connections),
            updatedNode.lastHeartbeat
          )
          .run();
      } catch (dbErr: any) {
        if (isProductionEnv(context.env)) {
          return new Response(
            JSON.stringify({ success: false, error: `Database transaction failed: ${dbErr?.message || 'D1 error'}` }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }
        console.warn('[D1 Telemetry Insert Fallback]', dbErr);
      }
    } else if (isProductionEnv(context.env)) {
      return createD1UnavailableResponse();
    }

    if (!isProductionEnv(context.env)) {
      const idx = globalNodesTelemetryStore.findIndex((n) => n.nodeId === updatedNode.nodeId);
      if (idx >= 0) {
        globalNodesTelemetryStore[idx] = updatedNode;
      } else {
        globalNodesTelemetryStore.push(updatedNode);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        telemetry: updatedNode,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
