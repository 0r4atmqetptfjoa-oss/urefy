import { describe, it, expect, beforeEach } from 'vitest';
import { onRequestGet as onSitemapGet } from '../functions/sitemap-posts-1.xml.js';
import { onRequestGet as onPostSeoGet } from '../functions/p/[id].js';
import { onRequestGet as onSearchGet } from '../functions/api/search.js';
import { globalPostsStore, globalFacetsStore, globalProfilesStore } from '../functions/api/_db.js';

describe('SEO, SSR & Search Leak Prevention for Sovereign Facets', () => {
  const aliceRootFingerprint = 'ed25519-alice-root-secret';
  const facetPublicUnlinked = {
    id: 'facet-alice-photo',
    ownerFingerprint: aliceRootFingerprint,
    handle: 'alice_photo',
    displayName: 'Alice Photography',
    visibility: 'public' as const,
    isDefault: false,
    isPubliclyLinked: false,
    createdAt: 1000,
    updatedAt: 1000,
  };
  const facetPublicLinked = {
    id: 'facet-alice-work',
    ownerFingerprint: aliceRootFingerprint,
    handle: 'alice_work',
    displayName: 'Alice Work',
    visibility: 'public' as const,
    isDefault: false,
    isPubliclyLinked: true,
    createdAt: 1001,
    updatedAt: 1001,
  };

  beforeEach(() => {
    globalPostsStore.length = 0;
    globalFacetsStore.length = 0;
    globalProfilesStore.length = 0;

    (globalThis as any).HTMLRewriter = class MockHTMLRewriter {
      private handlers: Array<{ selector: string; handler: any }> = [];
      on(selector: string, handler: any) {
        this.handlers.push({ selector, handler });
        return this;
      }
      transform(response: Response) {
        let injected = '';
        for (const h of this.handlers) {
          if (h.selector === 'head') {
            const mockEl = {
              append: (content: string) => { injected += content; },
            };
            h.handler.element?.(mockEl);
          } else if (h.selector === '#app') {
            const mockEl = {
              setInnerContent: (content: string) => { injected += content; },
            };
            h.handler.element?.(mockEl);
          }
        }
        return new Response(`<!DOCTYPE html><html><head>${injected}</head><body><div id="app">${injected}</div></body></html>`, {
          status: response.status,
          headers: response.headers,
        });
      }
    };
  });

  describe('Post Sitemap (/sitemap-posts-1.xml)', () => {
    it('indexes only public posts and strictly omits community and followers posts', async () => {
      const mockPosts = [
        { id: 'post-pub-1', created_at: 1770000000000, flair: 'Art', status: 'published', audience: 'public' },
        { id: 'post-legacy', created_at: 1770000000000, flair: 'News', status: 'published', audience: null },
        { id: 'post-comm-1', created_at: 1770000000000, flair: 'Private', status: 'published', audience: 'community' },
        { id: 'post-foll-1', created_at: 1770000000000, flair: 'Secret', status: 'published', audience: 'followers' },
      ];

      const mockDb = {
        prepare: (query: string) => {
          return {
            bind: (..._parameters: unknown[]) => ({ all: async () => {
              // Verify the query contains audience filter
              expect(query).toContain("(posts.audience = 'public' OR posts.audience IS NULL)");
              // Simulate D1 filtering
              const filtered = mockPosts.filter(
                p => p.status === 'published' && (!p.audience || p.audience === 'public')
              );
              return { results: filtered };
            } }),
          };
        },
      };

      const res = await onSitemapGet({
        request: new Request('https://urefy.com/sitemap-posts-1.xml'),
        env: { DB: mockDb as any },
      });

      expect(res.status).toBe(200);
      const xml = await res.text();
      expect(xml).toContain('/p/post-pub-1');
      expect(xml).toContain('/p/post-legacy');
      expect(xml).not.toContain('/p/post-comm-1');
      expect(xml).not.toContain('/p/post-foll-1');
    });
  });

  describe('SSR Post Detail Route (/p/:id)', () => {
    it('returns 404 for community and followers posts to prevent search engine indexing', async () => {
      const mockDb = {
        prepare: (query: string) => ({
          bind: (postId: string) => ({
            first: async () => {
              if (postId === 'comm-post') {
                return {
                  id: 'comm-post',
                  title: 'Private community post',
                  content: 'Secret content',
                  audience: 'community',
                  author_id: aliceRootFingerprint,
                  facet_id: 'facet-alice-photo',
                  is_publicly_linked: 0,
                  status: 'published',
                  created_at: 1770000000000,
                };
              }
              if (postId === 'foll-post') {
                return {
                  id: 'foll-post',
                  title: 'Followers only post',
                  content: 'Secret content',
                  audience: 'followers',
                  author_id: aliceRootFingerprint,
                  facet_id: 'facet-alice-photo',
                  is_publicly_linked: 0,
                  status: 'published',
                  created_at: 1770000000000,
                };
              }
              return null;
            },
            all: async () => ({ results: [] }),
          }),
        }),
      };

      const commRes = await onPostSeoGet({
        request: new Request('https://urefy.com/p/comm-post'),
        env: { DB: mockDb as any },
        params: { id: 'comm-post' },
      });
      expect(commRes.status).toBe(404);

      const follRes = await onPostSeoGet({
        request: new Request('https://urefy.com/p/foll-post'),
        env: { DB: mockDb as any },
        params: { id: 'foll-post' },
      });
      expect(follRes.status).toBe(404);
    });

    it('renders public post but masks owner root fingerprint when facet is unlinked', async () => {
      const mockDb = {
        prepare: (query: string) => ({
          bind: (postId: string) => ({
            first: async () => {
              return {
                id: 'pub-photo-post',
                title: 'Landscape Photography Shot',
                content: 'Shot on 35mm film',
                audience: 'public',
                author_id: aliceRootFingerprint,
                facet_id: facetPublicUnlinked.id,
                is_publicly_linked: 0,
                display_name: facetPublicUnlinked.displayName,
                handle: facetPublicUnlinked.handle,
                status: 'published',
                created_at: 1770000000000,
                merit_votes: 12,
                reply_count: 0,
              };
            },
            all: async () => ({ results: [] }),
          }),
        }),
      };

      const res = await onPostSeoGet({
        request: new Request('https://urefy.com/p/pub-photo-post'),
        env: { DB: mockDb as any },
        params: { id: 'pub-photo-post' },
      });

      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('Landscape Photography Shot');
      expect(html).toContain('Alice Photography');
      // Must NOT leak Alice's underlying root identity
      expect(html).not.toContain(aliceRootFingerprint);
      // Must contain facet id in author URL
      expect(html).toContain(encodeURIComponent(facetPublicUnlinked.id));
    });
  });

  describe('Search Edge API (/api/search)', () => {
    it('omits non-public posts from search results in in-memory fallback', async () => {
      globalPostsStore.push(
        {
          id: 'post-1',
          channelId: 'general',
          authorFingerprint: aliceRootFingerprint,
          authorRole: 'citizen',
          title: 'Quantum Computing Tutorial',
          content: 'Public explanation of qubits',
          meritVotes: 10,
          replyCount: 2,
          createdAt: Date.now(),
          audience: 'public',
        },
        {
          id: 'post-2',
          channelId: 'private-dev',
          authorFingerprint: aliceRootFingerprint,
          authorRole: 'citizen',
          title: 'Quantum Computing Internal Notes',
          content: 'Confidential draft',
          meritVotes: 1,
          replyCount: 0,
          createdAt: Date.now(),
          audience: 'followers',
        }
      );

      const res = await onSearchGet({
        request: new Request('https://urefy.com/api/search?q=Quantum&category=posts'),
      });
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.results.posts.length).toBe(1);
      expect(data.results.posts[0].id).toBe('post-1');
    });

    it('masks authorFingerprint to facetId for unlinked facet posts', async () => {
      globalFacetsStore.push(facetPublicUnlinked);
      globalPostsStore.push({
        id: 'post-photo',
        channelId: 'photography',
        authorFingerprint: aliceRootFingerprint,
        facetId: facetPublicUnlinked.id,
        authorRole: 'citizen',
        title: 'Sunset over Mountains',
        content: 'Fuji Velvia 50',
        meritVotes: 5,
        replyCount: 0,
        createdAt: Date.now(),
        audience: 'public',
      });

      const res = await onSearchGet({
        request: new Request('https://urefy.com/api/search?q=Sunset&category=posts'),
      });
      const data = await res.json();
      expect(data.results.posts.length).toBe(1);
      const post = data.results.posts[0];
      expect(post.authorFingerprint).toBe(facetPublicUnlinked.id);
      expect(post.authorFingerprint).not.toBe(aliceRootFingerprint);
      expect(post.facetId).toBe(facetPublicUnlinked.id);
    });

    it('searches public facets in people search without leaking root owner when unlinked', async () => {
      globalFacetsStore.push(facetPublicUnlinked, facetPublicLinked);

      const res = await onSearchGet({
        request: new Request('https://urefy.com/api/search?q=Alice&category=people'),
      });
      const data = await res.json();
      expect(data.success).toBe(true);
      const unlinkedResult = data.results.people.find((p: any) => p.handle === 'alice_photo');
      const linkedResult = data.results.people.find((p: any) => p.handle === 'alice_work');

      expect(unlinkedResult).toBeDefined();
      expect(unlinkedResult.userId).toBe(facetPublicUnlinked.id);
      expect(unlinkedResult.userId).not.toBe(aliceRootFingerprint);

      expect(linkedResult).toBeDefined();
      expect(linkedResult.userId).toBe(aliceRootFingerprint);
    });
  });
});
