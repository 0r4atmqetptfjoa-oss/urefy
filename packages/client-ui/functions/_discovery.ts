/** Shared public-discovery policy. Never include private audiences or unlinkable facets. */
export const SITE_ORIGIN = 'https://urefy.com';
export const PUBLIC_POST_SQL = "(posts.status IN ('published','pinned','locked') OR posts.status IS NULL) AND (posts.audience = 'public' OR posts.audience IS NULL) AND NOT EXISTS (SELECT 1 FROM synthetic_fixtures sf WHERE sf.resource_type = 'post' AND sf.resource_id = posts.id)";
// Discovery eligibility changes neither access controls nor stored post data.
export const INDEXABLE_POST_SQL = `${PUBLIC_POST_SQL} AND (
  length(trim(coalesce(posts.content,''))) > 0
  OR (length(trim(coalesce(posts.title,''))) > 0 AND lower(trim(posts.title)) != 'sovereign pulse')
  OR trim(coalesce(posts.images_json,'')) NOT IN ('','null','[]','{}')
  OR trim(coalesce(posts.video_json,'')) NOT IN ('','null','[]','{}')
  OR trim(coalesce(posts.attachment_json,'')) NOT IN ('','null','[]','{}')
  OR trim(coalesce(posts.quoted_post_json,'')) NOT IN ('','null','[]','{}')
  OR length(trim(coalesce(posts.poll_id,''))) > 0
)`;
export const PROFILE_POST_SQL = `${INDEXABLE_POST_SQL} AND (posts.facet_id IS NULL OR EXISTS (SELECT 1 FROM facets f WHERE f.id = posts.facet_id AND f.is_publicly_linked = 1 AND f.status != 'deleted'))`;
export const INDEXABLE_PROFILE_SQL = `(length(trim(coalesce(user_profiles.bio,''))) > 0 OR EXISTS (SELECT 1 FROM posts WHERE posts.author_id = user_profiles.user_id AND ${PROFILE_POST_SQL}))`;
export const PUBLIC_ROBOTS = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

export interface PublicPostContent {
  title?: string;
  content?: string;
  imagesJson?: string;
  videoJson?: string;
  attachmentJson?: string;
  quotedPostJson?: string;
  pollId?: string;
}
export function hasPublicPostContent(post: PublicPostContent): boolean {
  const title = post.title?.trim();
  return !!(post.content?.trim() || (title && title.toLowerCase() !== 'sovereign pulse') || post.pollId?.trim()
    || [post.imagesJson, post.videoJson, post.attachmentJson, post.quotedPostJson].some(value => value && !['', 'null', '[]', '{}'].includes(value.trim())));
}
