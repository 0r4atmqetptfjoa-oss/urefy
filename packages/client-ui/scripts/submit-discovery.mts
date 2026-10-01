import { submitIndexNow } from '../functions/_indexnow.ts';
const origin = 'https://urefy.com';
const response = await fetch(origin + '/sitemap.xml');
if (!response.ok) throw new Error('Sitemap index unavailable');
const children = [...(await response.text()).matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
if (children.length > 50) throw new Error('Use a separate paginated submission for large inventories');
const urls: string[] = [];
for (const child of children) {
  if (!child.startsWith(origin + '/') || !/^\/(?:sitemap-[a-z-]+\.xml|sitemaps\/(?:posts|profiles)\/\d+)$/.test(new URL(child).pathname)) throw new Error('Unexpected sitemap route');
  const result = await fetch(child);
  if (!result.ok) throw new Error('Child sitemap unavailable');
  urls.push(...[...(await result.text()).matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1].replace(/&amp;/g, '&')));
}
const unique = [...new Set(urls)];
if (unique.length > 10000) throw new Error('Use a separate paginated submission for more than 10000 URLs');
if (!process.argv.includes('--submit')) {
  console.log(JSON.stringify({ mode: 'preview', count: unique.length, submit: 'Pass --submit to notify IndexNow; no Google indexing guarantee.' }));
} else {
  const keyResponse = await fetch(origin + '/indexnow-key.txt');
  const { INDEXNOW_KEY } = await import('../functions/_indexnow.ts');
  if (!keyResponse.ok || (await keyResponse.text()).trim() !== INDEXNOW_KEY) throw new Error('Public IndexNow verification file does not match');
  for (let start = 0; start < unique.length; start += 1000) {
    const result = await submitIndexNow(unique.slice(start, start + 1000));
    console.log(JSON.stringify({ component: 'indexnow-submission', ...result }));
    if (![200, 202].includes(result.status)) throw new Error('IndexNow did not accept this batch; do not retry repeatedly');
  }
}
