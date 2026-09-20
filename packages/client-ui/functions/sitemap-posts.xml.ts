// ===========================================================================
// UREfy — Sitemap Posts Alias (/sitemap-posts.xml -> /sitemap-posts-1.xml)
// ===========================================================================

import { onRequestGet as handlePosts1 } from './sitemap-posts-1.xml.js';

export async function onRequestGet(context: any): Promise<Response> {
  return handlePosts1(context);
}
