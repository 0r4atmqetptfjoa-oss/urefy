import { headHandler } from './_head.js';
import { SITE_ORIGIN } from './_discovery.js';
import { STATIC_DISCOVERY_PAGES, sitemapResponse, urlset } from './_sitemaps.js';
export const onRequestGet = () => sitemapResponse(urlset(STATIC_DISCOVERY_PAGES.map(p => ({ loc: SITE_ORIGIN + p.path, modified: p.modified }))));

export const onRequestHead = headHandler(onRequestGet);
