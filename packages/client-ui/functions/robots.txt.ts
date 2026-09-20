export async function onRequestGet(): Promise<Response> {
  return new Response("# Public discovery; administrative and private paths are not crawl targets.\nUser-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin\nDisallow: /messages\nDisallow: /vault\nDisallow: /profile\nDisallow: /wp-admin/\nDisallow: /wp-content/\nDisallow: /*.php\n\nSitemap: https://urefy.com/sitemap.xml\n", { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}
