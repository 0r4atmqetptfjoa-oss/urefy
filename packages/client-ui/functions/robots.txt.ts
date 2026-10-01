import { headHandler } from './_head.js';
const robots = "# Public search discovery. Access control is enforced separately by the application.\nUser-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin\nDisallow: /messages\nDisallow: /vault\nDisallow: /profile\nDisallow: /settings\nDisallow: /notifications\nDisallow: /governance\nDisallow: /more\nDisallow: /wp-admin/\nDisallow: /wp-content/\nDisallow: /*.php\n\nSitemap: https://urefy.com/sitemap.xml\n";
export const onRequestGet = () => new Response(robots, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=300', 'X-Content-Type-Options': 'nosniff' } });

export const onRequestHead = headHandler(onRequestGet);
