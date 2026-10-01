import { headHandler } from '../_head.js';
import { postPath } from '../../src/public-urls.js';
import { seoError } from '../_seo-response.js';
export async function onRequestGet(context: { request: Request; params: { id: string } }): Promise<Response> {
  try { return Response.redirect(new URL(postPath(decodeURIComponent(context.params.id)), context.request.url).toString(), 301); }
  catch { return seoError(404); }
}

export const onRequestHead = headHandler(onRequestGet);
