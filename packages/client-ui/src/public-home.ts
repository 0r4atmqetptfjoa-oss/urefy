export const HOME_DESCRIPTION = 'UREfy is a social workspace for community discussions, public posts, and private conversations. Explore topics, follow people, and keep useful ideas in your Vault.';

export function renderPublicHomeIntro(): string {
  return `<section class="public-home-intro relative" aria-labelledby="public-home-title">
    <button type="button" data-action="dismiss-home-intro" class="absolute top-3 right-3 text-slate-400 hover:text-white text-base leading-none p-1 rounded-md transition-colors cursor-pointer" title="Dismiss intro" aria-label="Dismiss intro">&times;</button>
    <h1 id="public-home-title">UREfy — communities and conversations</h1>
    <p>${HOME_DESCRIPTION}</p>
    <nav aria-label="Discover UREfy"><a href="/explore" data-public-link>Explore discussions</a><a href="/communities" data-public-link>Browse communities</a><a href="/about" data-public-link>About UREfy</a></nav>
  </section>`;
}
