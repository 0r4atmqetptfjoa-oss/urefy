/** Shared public-discovery policy. Never include private audiences or unlinkable facets. */
export const SITE_ORIGIN = 'https://urefy.com';
export const PUBLIC_POST_SQL = "(posts.status IN ('published','pinned','locked') OR posts.status IS NULL) AND (posts.audience = 'public' OR posts.audience IS NULL) AND NOT EXISTS (SELECT 1 FROM synthetic_fixtures sf WHERE sf.resource_type = 'post' AND sf.resource_id = posts.id)";
export const PROFILE_POST_SQL = `${PUBLIC_POST_SQL} AND (posts.facet_id IS NULL OR EXISTS (SELECT 1 FROM facets f WHERE f.id = posts.facet_id AND f.is_publicly_linked = 1 AND f.status != 'deleted'))`;
export const INDEXABLE_PROFILE_SQL = `(length(trim(coalesce(user_profiles.bio,''))) > 0 OR EXISTS (SELECT 1 FROM posts WHERE posts.author_id = user_profiles.user_id AND ${PROFILE_POST_SQL}))`;
export const PUBLIC_ROBOTS = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
