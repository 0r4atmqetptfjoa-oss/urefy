import { requireAdmin } from './_auth.js';
import type { Env } from './_db.js';

const GRAPHQL_URL = 'https://api.cloudflare.com/client/v4/graphql';
const EDGE_ANALYTICS_QUERY = `query AdminZoneAnalytics($zoneTag: string!, $dayStart: Time!, $fiveMinuteStart: Time!, $end: Time!) {
  viewer {
    zones(filter: { zoneTag: $zoneTag }) {
      day: httpRequestsAdaptiveGroups(limit: 1, filter: { datetime_geq: $dayStart, datetime_lt: $end, requestSource: "eyeball" }) {
        count avg { sampleInterval } sum { edgeResponseBytes visits }
      }
      recent: httpRequestsAdaptiveGroups(limit: 1, filter: { datetime_geq: $fiveMinuteStart, datetime_lt: $end, requestSource: "eyeball" }) {
        count avg { sampleInterval } sum { edgeResponseBytes visits }
      }
      security: firewallEventsAdaptiveGroups(limit: 100, filter: { datetime_geq: $dayStart, datetime_lt: $end }) {
        count avg { sampleInterval } dimensions { action }
      }
    }
  }
}`;

interface AnalyticsGroup {
  count?: number;
  avg?: { sampleInterval?: number };
  sum?: { edgeResponseBytes?: number; visits?: number };
  dimensions?: { action?: string };
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export async function onRequestGet(context: { request: Request; env?: Env }): Promise<Response> {
  const auth = await requireAdmin(context);
  if (!auth.authorized) return auth.response!;

  const env = context.env || {};
  const token = env.CLOUDFLARE_ANALYTICS_TOKEN;
  const zoneId = env.CLOUDFLARE_ANALYTICS_ZONE_ID;
  if (typeof token !== 'string' || !token || typeof zoneId !== 'string' || !zoneId) {
    return Response.json({
      success: false,
      configured: false,
      code: 'CLOUDFLARE_ANALYTICS_NOT_CONFIGURED',
      error: 'Set CLOUDFLARE_ANALYTICS_TOKEN and CLOUDFLARE_ANALYTICS_ZONE_ID to connect zone traffic and firewall analytics.',
    }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }

  const end = new Date();
  const dayStart = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  const fiveMinuteStart = new Date(end.getTime() - 5 * 60 * 1000);
  try {
    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query: EDGE_ANALYTICS_QUERY,
        variables: {
          zoneTag: zoneId,
          dayStart: dayStart.toISOString(),
          fiveMinuteStart: fiveMinuteStart.toISOString(),
          end: end.toISOString(),
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      return Response.json({ success: false, configured: true, error: `Cloudflare Analytics returned HTTP ${response.status}. Check token scope, Zone ID, and dataset availability.` }, {
        status: 502, headers: { 'Cache-Control': 'no-store' },
      });
    }

    const payload = await response.json() as any;
    if (Array.isArray(payload?.errors) && payload.errors.length) {
      return Response.json({ success: false, configured: true, error: 'Cloudflare Analytics rejected the query. Check token permissions and zone plan limits.' }, {
        status: 502, headers: { 'Cache-Control': 'no-store' },
      });
    }
    const zone = payload?.data?.viewer?.zones?.[0];
    if (!zone) {
      return Response.json({ success: false, configured: true, error: 'Cloudflare returned no analytics for this zone.' }, {
        status: 502, headers: { 'Cache-Control': 'no-store' },
      });
    }

    const sumGroups = (groups: AnalyticsGroup[] | undefined) => (groups || []).reduce((totals, group) => ({
      requests: totals.requests + (numberOrNull(group.count) || 0),
      visits: totals.visits + (numberOrNull(group.sum?.visits) || 0),
      responseBytes: totals.responseBytes + (numberOrNull(group.sum?.edgeResponseBytes) || 0),
      sampleInterval: Math.max(totals.sampleInterval, numberOrNull(group.avg?.sampleInterval) || 1),
    }), { requests: 0, visits: 0, responseBytes: 0, sampleInterval: 1 });
    const day = sumGroups(zone.day);
    const recent = sumGroups(zone.recent);
    const firewallActions = (zone.security || []).reduce((actions: Record<string, number>, group: AnalyticsGroup) => {
      const action = typeof group.dimensions?.action === 'string' ? group.dimensions.action : 'unknown';
      actions[action] = (actions[action] || 0) + (numberOrNull(group.count) || 0);
      return actions;
    }, {} as Record<string, number>);
    const blockedActions = ['block', 'challenge', 'js_challenge', 'managed_challenge'];

    return Response.json({
      success: true,
      configured: true,
      source: 'Cloudflare GraphQL Analytics API',
      observedAt: Date.now(),
      sampling: 'Adaptive sampling may be applied by Cloudflare; counts are estimates when sampleInterval exceeds 1.',
      traffic24h: { ...day, pageViews: null },
      traffic5m: { ...recent, requestsPerMinute: Math.round((recent.requests / 5) * 10) / 10 },
      security24h: {
        actions: firewallActions,
        blockedOrChallenged: blockedActions.reduce((total, action) => total + (firewallActions[action] || 0), 0),
        sampleInterval: Math.max(1, ...(zone.security || []).map((group: AnalyticsGroup) => numberOrNull(group.avg?.sampleInterval) || 1)),
      },
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    return Response.json({ success: false, configured: true, error: timedOut ? 'Cloudflare Analytics request timed out.' : 'Cloudflare Analytics could not be reached.' }, {
      status: 502, headers: { 'Cache-Control': 'no-store' },
    });
  }
}
