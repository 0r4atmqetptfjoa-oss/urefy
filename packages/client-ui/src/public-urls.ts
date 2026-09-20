/** Public, crawlable routes shared by rendered links and edge metadata. */
export const postPath = (id: string): string => `/p/${encodeURIComponent(id)}`;
export const profilePath = (id: string): string => `/u/${encodeURIComponent(id)}`;
export const communitySlug = (name: string): string => name.replace(/^c\//, '').replace(/^c-/, '');
export const communityPath = (name: string): string => `/c/${encodeURIComponent(communitySlug(name))}`;
