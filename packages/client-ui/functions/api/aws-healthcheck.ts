import type { Env } from './_db.js';
import { verifyAdminAuthorization } from './admin.js';
import { enqueueInfrastructureJob } from './_aws-jobs.js';
import { sendTransactionalEmail } from './_aws-email.js';

/** Admin-only, fixed diagnostic destinations. No arbitrary enqueue/email proxy. */
export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  const auth = await verifyAdminAuthorization(context.request, context.env);
  if (!auth.authorized) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  let body: unknown;
  try { body = await context.request.json(); } catch { return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 }); }
  const service = (body as { service?: string })?.service;
  try {
    if (service === 'sqs') {
      const result = await enqueueInfrastructureJob(context.env, { version: 1, type: 'infra.healthcheck', id: crypto.randomUUID() });
      return Response.json({ success: true, service, messageId: result.MessageId, status: 'queued' });
    }
    if (service === 'ses') {
      const result = await sendTransactionalEmail(context.env, { to: 'success@simulator.amazonses.com', subject: 'UREfy infrastructure delivery check', text: 'UREfy SES transactional email integration diagnostic. No user data.', consent: true });
      return Response.json({ success: true, service, messageId: result.MessageId, destination: 'AWS mailbox simulator' });
    }
    return Response.json({ success: false, error: 'Supported diagnostics: sqs, ses' }, { status: 400 });
  } catch {
    return Response.json({ success: false, service, error: 'AWS diagnostic failed; check configuration and service permissions.' }, { status: 502 });
  }
}
