import { SITE_ORIGIN } from './_discovery.js';
// Public domain-verification value, not an IAM credential or user secret.
export const INDEXNOW_KEY = '3603dbf25e1088a596a3c9db5136c703';
const allowed = /^\/(?:$|about$|features$|security$|privacy$|terms$|faq$|explore$|communities$|guides(?:\/(?:get-started|private-messaging))?$|(?:p|c|u)\/[^/]+$)/;
export async function submitIndexNow(urls: string[]): Promise<{ status: number; count: number }> {
  const urlList = [...new Set(urls)].filter(input => {
    try { const url = new URL(input); return url.origin === SITE_ORIGIN && !url.search && !url.hash && allowed.test(url.pathname); }
    catch { return false; }
  }).slice(0, 1000);
  if (!urlList.length) return { status: 0, count: 0 };
  const result = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: 'urefy.com', key: INDEXNOW_KEY, keyLocation: SITE_ORIGIN + '/indexnow-key.txt', urlList }),
    redirect: 'error', signal: AbortSignal.timeout(5000),
  });
  return { status: result.status, count: urlList.length };
}
export function scheduleIndexNow(context: { request: Request; waitUntil?: (task: Promise<unknown>) => void }, paths: string[]): void {
  if (new URL(context.request.url).origin !== SITE_ORIGIN || typeof context.waitUntil !== 'function') return;
  context.waitUntil(submitIndexNow(paths.map(p => SITE_ORIGIN + p)).then(result => {
    console.info(JSON.stringify({ component: 'urefy-indexnow', status: result.status, count: result.count }));
  }).catch(() => { console.warn('UREfy IndexNow notification unavailable'); }));
}
