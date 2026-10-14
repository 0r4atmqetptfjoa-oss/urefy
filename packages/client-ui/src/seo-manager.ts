import { clientStore } from './client-state.js';

const SITE_ORIGIN = 'https://urefy.com';

export interface SeoRouteMeta {
  title: string;
  description: string;
  canonicalPath: string;
  ogType: 'website' | 'article' | 'profile';
  jsonLdGraph: Record<string, unknown>[];
}

function setOrCreateMeta(attrName: 'name' | 'property', attrValue: string, content: string): void {
  if (typeof document === 'undefined') return;
  let el = document.querySelector<HTMLMetaElement>(`meta[${attrName}="${attrValue}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonicalUrl(url: string): void {
  if (typeof document === 'undefined') return;
  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

function setDynamicJsonLd(graph: Record<string, unknown>[]): void {
  if (typeof document === 'undefined') return;
  let script = document.getElementById('urefy-dynamic-seo-jsonld') as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = 'urefy-dynamic-seo-jsonld';
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': graph,
  });
}

export class SovereignSeoManager {
  public init(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    this.syncCurrentRouteSeo();
    window.addEventListener('hashchange', () => this.syncCurrentRouteSeo());
    window.addEventListener('popstate', () => this.syncCurrentRouteSeo());
  }

  public syncCurrentRouteSeo(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const hash = window.location.hash || '#feed';
    const pathname = window.location.pathname || '/';
    const meta = this.computeRouteMeta(hash, pathname);

    document.title = meta.title;
    const canonicalUrl = `${SITE_ORIGIN}${meta.canonicalPath}`;
    setCanonicalUrl(canonicalUrl);

    setOrCreateMeta('name', 'description', meta.description);
    setOrCreateMeta('property', 'og:title', meta.title);
    setOrCreateMeta('property', 'og:description', meta.description);
    setOrCreateMeta('property', 'og:url', canonicalUrl);
    setOrCreateMeta('property', 'og:type', meta.ogType);
    setOrCreateMeta('property', 'og:site_name', 'UREfy');
    setOrCreateMeta('name', 'twitter:card', 'summary_large_image');
    setOrCreateMeta('name', 'twitter:title', meta.title);
    setOrCreateMeta('name', 'twitter:description', meta.description);

    setDynamicJsonLd(meta.jsonLdGraph);
  }

  private computeRouteMeta(hash: string, pathname: string): SeoRouteMeta {
    const baseOrg = {
      '@type': 'Organization',
      '@id': `${SITE_ORIGIN}/#organization`,
      name: 'UREfy',
      url: `${SITE_ORIGIN}/`,
      logo: `${SITE_ORIGIN}/icon-512.png`,
    };

    const baseWebsite = {
      '@type': 'WebSite',
      '@id': `${SITE_ORIGIN}/#website`,
      name: 'UREfy',
      url: `${SITE_ORIGIN}/`,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${SITE_ORIGIN}/explore?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    };

    if (hash.startsWith('#explore') || pathname === '/explore') {
      return {
        title: 'Explore Communities, Proofs & Live Discussions — UREfy',
        description:
          'Discover active public communities, verified software releases, cryptography discussions, and real-time threads on UREfy.',
        canonicalPath: '/explore',
        ogType: 'website',
        jsonLdGraph: [
          baseOrg,
          baseWebsite,
          {
            '@type': 'CollectionPage',
            '@id': `${SITE_ORIGIN}/explore#page`,
            name: 'Explore UREfy Communities & Discussions',
            url: `${SITE_ORIGIN}/explore`,
            isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
          },
        ],
      };
    }

    if (hash.startsWith('#communities') || pathname === '/communities') {
      return {
        title: 'Sovereign Communities Directory — UREfy',
        description:
          'Browse and join independent topic-focused communities on UREfy with end-to-end encrypted rooms and shared knowledge vaults.',
        canonicalPath: '/communities',
        ogType: 'website',
        jsonLdGraph: [
          baseOrg,
          baseWebsite,
          {
            '@type': 'CollectionPage',
            '@id': `${SITE_ORIGIN}/communities#page`,
            name: 'Sovereign Communities Directory',
            url: `${SITE_ORIGIN}/communities`,
            isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
          },
        ],
      };
    }

    if (hash.startsWith('#c/') || pathname.startsWith('/c/')) {
      const slug = (hash.startsWith('#c/') ? hash.slice(3) : pathname.slice(3)).split(/[/?#]/)[0] || 'technology';
      return {
        title: `c/${slug} — Community Discussions on UREfy`,
        description: `Read the latest public posts, technical breakdowns, and verified discussions in c/${slug} on UREfy.`,
        canonicalPath: `/c/${slug}`,
        ogType: 'website',
        jsonLdGraph: [
          baseOrg,
          baseWebsite,
          {
            '@type': 'CollectionPage',
            '@id': `${SITE_ORIGIN}/c/${slug}#page`,
            name: `c/${slug} Community`,
            url: `${SITE_ORIGIN}/c/${slug}`,
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'UREfy', item: `${SITE_ORIGIN}/` },
              { '@type': 'ListItem', position: 2, name: 'Communities', item: `${SITE_ORIGIN}/communities` },
              { '@type': 'ListItem', position: 3, name: `c/${slug}`, item: `${SITE_ORIGIN}/c/${slug}` },
            ],
          },
        ],
      };
    }

    // Default: Home / Feed with DiscussionForumPosting items for top posts
    const topPosts = (clientStore?.posts || []).slice(0, 10).map((p: any) => ({
      '@type': 'DiscussionForumPosting',
      '@id': `${SITE_ORIGIN}/p/${encodeURIComponent(String(p.id))}`,
      headline: String(p.title || 'Community Discussion').slice(0, 110),
      articleBody: String(p.content || '').slice(0, 500),
      datePublished: new Date(Number(p.createdAt || Date.now())).toISOString(),
      author: {
        '@type': 'Person',
        name: String(p.authorDisplayName || p.authorHandle || 'UREfy Member'),
      },
      interactionStatistic: [
        {
          '@type': 'InteractionCounter',
          interactionType: 'https://schema.org/LikeAction',
          userInteractionCount: Number(p.meritVotes || 1),
        },
        {
          '@type': 'InteractionCounter',
          interactionType: 'https://schema.org/CommentAction',
          userInteractionCount: Number(p.commentCount || 2),
        },
      ],
    }));

    return {
      title: 'UREfy — Communities, Identity & Encrypted Conversations',
      description:
        'Join public community discussions, share verified knowledge, and communicate with post-quantum end-to-end encrypted direct messages on UREfy.',
      canonicalPath: '/',
      ogType: 'website',
      jsonLdGraph: [baseOrg, baseWebsite, ...topPosts],
    };
  }
}

export const seoManager = new SovereignSeoManager();
