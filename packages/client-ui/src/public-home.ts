export const HOME_DESCRIPTION = 'Explore UREfy communities, share public discussions and use encrypted direct messages. Create a key-based identity without an email or phone number.';

export function renderPublicHomeIntro(headingLevel: 1 | 2 = 1): string {
  return `<section class="public-home-intro relative" aria-labelledby="public-home-title">
    <button type="button" data-action="dismiss-home-intro" class="absolute top-3 right-3 text-slate-400 hover:text-white text-base leading-none p-1 rounded-md transition-colors cursor-pointer" title="Dismiss intro" aria-label="Dismiss intro">&times;</button>
    <h${headingLevel} id="public-home-title">UREfy — communities and encrypted conversations</h${headingLevel}>
    <p>${HOME_DESCRIPTION}</p>
    <nav aria-label="Discover UREfy"><a href="/explore" data-public-link>Explore discussions</a><a href="/discussions" data-public-link>Public discussion archive</a><a href="/communities" data-public-link>Browse communities</a><a href="/guides" data-public-link>Getting started</a><a href="/faq" data-public-link>Questions &amp; answers</a><a href="/about" data-public-link>About UREfy</a></nav>
  </section>`;
}
