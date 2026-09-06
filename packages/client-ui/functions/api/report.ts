// ===========================================================================
// AETHERIS OMNI-SPHERE — DSA NOTICE & TAKEDOWN API (/api/report)
// Compliance: EU Digital Services Act (DSA) Regulation 2022/2065 Art. 16
// Handles public illegal content reporting & admin review queue.
// ===========================================================================

import { Env, getD1Database, isProductionEnv, createD1UnavailableResponse } from './_db.js';
import { verifyAdminAuthorization } from './admin.js';

export interface DSAReport {
  id: string;
  targetId: string;
  targetType: string;
  reason: string;
  details: string;
  reporterFingerprint: string;
  reporterEmail?: string;
  status: 'pending' | 'reviewed' | 'dismissed' | 'actioned';
  createdAt: number;
  reviewedAt?: number;
  resolutionNotes?: string;
}

// In-memory fallback if D1 binding is temporarily unavailable
export const memoryReportsStore: DSAReport[] = [];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-PIN, X-Admin-Fingerprint',
};

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

// ─── POST /api/report — Submit DSA Abuse / Illegal Content Report ────────────
export async function onRequestPost(context: { request: Request; env?: Env }): Promise<Response> {
  try {
    const body = await context.request.json().catch(() => null) as Record<string, any> | null;
    if (!body) {
      return new Response(
        JSON.stringify({ success: false, error: 'Malformed JSON payload' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    const targetId = typeof body.targetId === 'string' ? body.targetId.trim() : '';
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    const targetType = typeof body.targetType === 'string' && body.targetType.trim() ? body.targetType.trim() : 'post';
    const details = typeof body.details === 'string' ? body.details.trim() : '';
    const reporterFingerprint = typeof body.reporterFingerprint === 'string' ? body.reporterFingerprint.trim() : 'anonymous';
    const reporterEmail = typeof body.reporterEmail === 'string' ? body.reporterEmail.trim() : '';

    if (!targetId) {
      return new Response(
        JSON.stringify({ success: false, error: 'targetId is required (ID of post or file)' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    if (!reason) {
      return new Response(
        JSON.stringify({ success: false, error: 'reason is required (e.g. CSAM, terrorism, copyright, hate_speech, malware)' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    const randSuffix = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '').substring(0, 8)
      : Date.now().toString(36);
    const reportId = `dsa_rep_${Date.now()}_${randSuffix}`;
    const now = Date.now();

    const report: DSAReport = {
      id: reportId,
      targetId,
      targetType,
      reason,
      details,
      reporterFingerprint,
      reporterEmail: reporterEmail || undefined,
      status: 'pending',
      createdAt: now,
    };

    // 1. Try persisting to Cloudflare D1
    const db = getD1Database(context.env);
    let persistedToD1 = false;

    if (db) {
      try {
        await db
          .prepare(
            `INSERT INTO dsa_reports (
              id, target_id, target_type, reason, details, reporter_fingerprint, reporter_email, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
          )
          .bind(
            reportId,
            targetId,
            targetType,
            reason,
            details,
            reporterFingerprint,
            reporterEmail || null,
            now
          )
          .run();
        persistedToD1 = true;
      } catch (dbErr: any) {
        if (isProductionEnv(context.env)) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `Database transaction failed: ${dbErr?.message || 'D1 error'}. DSA report could not be persisted.`,
            }),
            { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
          );
        }
        console.warn('[DSA] D1 insert fallback to memory:', dbErr);
      }
    } else if (isProductionEnv(context.env)) {
      return createD1UnavailableResponse();
    }

    // 2. Memory store strictly in non-production development/test
    if (!isProductionEnv(context.env)) {
      memoryReportsStore.unshift(report);
      if (memoryReportsStore.length > 500) memoryReportsStore.pop();
    }

    return new Response(
      JSON.stringify({
        success: true,
        reportId,
        targetId,
        status: 'pending',
        persisted: persistedToD1 ? 'Cloudflare-D1' : 'Edge-Memory',
        legalNotice: 'Sesizarea a fost înregistrată cu succes conform Articolului 16 din Regulamentul (UE) 2022/2065 (Digital Services Act). Punctul de contact legal@aetheris.network a fost notificat.',
        createdAt: now,
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          ...CORS_HEADERS,
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }
}

// ─── GET /api/report — List DSA Reports (Admin Access Required) ──────────────
export async function onRequestGet(context: { request: Request; env?: Env }): Promise<Response> {
  const auth = await verifyAdminAuthorization(context.request, context.env);
  if (!auth.authorized) {
    return new Response(
      JSON.stringify({ success: false, error: auth.reason || 'Unauthorized' }),
      { status: auth.status || 401, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }

  const db = getD1Database(context.env);
  let reports: any[] = [];

  if (db) {
    try {
      const res = await db
        .prepare(`SELECT * FROM dsa_reports ORDER BY created_at DESC LIMIT 100`)
        .all();
      if (res.results) {
        reports = res.results.map((r: any) => ({
          id: r.id,
          targetId: r.target_id,
          targetType: r.target_type,
          reason: r.reason,
          details: r.details,
          reporterFingerprint: r.reporter_fingerprint,
          reporterEmail: r.reporter_email,
          status: r.status,
          createdAt: r.created_at,
          reviewedAt: r.reviewed_at,
          resolutionNotes: r.resolution_notes,
        }));
      }
    } catch (err: any) {
      if (isProductionEnv(context.env)) {
        return new Response(
          JSON.stringify({ success: false, error: `Database query failed: ${err?.message || 'D1 query error'}` }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }
      reports = memoryReportsStore;
    }
  } else if (isProductionEnv(context.env)) {
    return createD1UnavailableResponse();
  } else {
    reports = memoryReportsStore;
  }

  return new Response(
    JSON.stringify({
      success: true,
      count: reports.length,
      reports,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    }
  );
}

// ─── PATCH /api/report — Update DSA Report Status (Admin Only) ───────────────
export async function onRequestPatch(context: { request: Request; env?: Env }): Promise<Response> {
  const auth = await verifyAdminAuthorization(context.request, context.env);
  if (!auth.authorized) {
    return new Response(
      JSON.stringify({ success: false, error: auth.reason || 'Unauthorized' }),
      { status: auth.status || 401, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }

  const body = await context.request.json().catch(() => null) as Record<string, any> | null;
  const reportId = typeof body?.reportId === 'string' ? body.reportId.trim() : '';
  const status = typeof body?.status === 'string' ? body.status.trim() : '';
  const resolutionNotes = typeof body?.resolutionNotes === 'string' ? body.resolutionNotes.trim() : '';

  if (!reportId || !['pending', 'reviewed', 'dismissed', 'actioned'].includes(status)) {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid reportId or status' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }

  const now = Date.now();
  const db = getD1Database(context.env);

  if (db) {
    try {
      const runRes = await db
        .prepare(
          `UPDATE dsa_reports SET status = ?, reviewed_at = ?, resolution_notes = ? WHERE id = ?`
        )
        .bind(status, now, resolutionNotes, reportId)
        .run();
      if (isProductionEnv(context.env) && runRes && runRes.success === false) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to update report in database' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }
    } catch (err: any) {
      if (isProductionEnv(context.env)) {
        return new Response(
          JSON.stringify({ success: false, error: `Database update failed: ${err?.message || 'D1 error'}` }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }
      console.warn('[DSA] Failed to update in D1:', err);
    }
  } else if (isProductionEnv(context.env)) {
    return createD1UnavailableResponse();
  }

  if (!isProductionEnv(context.env)) {
    const mem = memoryReportsStore.find(r => r.id === reportId);
    if (mem) {
      mem.status = status as any;
      mem.reviewedAt = now;
      mem.resolutionNotes = resolutionNotes;
    }
  }

  return new Response(
    JSON.stringify({ success: true, reportId, status, reviewedAt: now }),
    { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
  );
}
