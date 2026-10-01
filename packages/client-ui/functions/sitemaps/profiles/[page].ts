import { paginatedSitemap } from '../../_sitemaps.js';
import type { Env } from '../../api/_db.js';
export const onRequestGet = (context: { env?: Env; params: { page: string } }) => paginatedSitemap(context.env, 'profiles', context.params.page);
