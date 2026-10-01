import { paginatedSitemap } from './_sitemaps.js';
import type { Env } from './api/_db.js';
export const onRequestGet = (context: { env?: Env }) => paginatedSitemap(context.env, 'profiles', '1');
