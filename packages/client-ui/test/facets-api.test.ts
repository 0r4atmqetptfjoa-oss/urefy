import { describe, it, expect, beforeEach } from 'vitest';
import { onRequestGet, onRequestPost, MAX_FACETS_PER_IDENTITY, sanitizePublicFacet } from '../functions/api/facets.js';
import { globalFacetsStore, globalFacetFollowsStore, EdgeFacet } from '../functions/api/_db.js';
import { createSovereignIdentity, createSignedEnvelope } from '@aetheris/core-crypto';
import { resetReplayNonceCache } from '../functions/api/_auth.js';

describe('Facet Management Edge API (/api/facets)', () => {
  beforeEach(() => {
    globalFacetsStore.length = 0;
    globalFacetFollowsStore.length = 0;
    resetReplayNonceCache();
  });

  function createSignedRequest(payload: any, identityKeySet: any) {
    const envelope = createSignedEnvelope(payload, identityKeySet);
    return new Request('https://urefy.com/api/facets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope),
    });
  }

  describe('1. Creation & Constraints', () => {
    it('creates initial default facet with isDefault=true', async () => {
      const identity = createSovereignIdentity({ capabilities: ['*'] });
      const req = createSignedRequest({
        action: 'create',
        displayName: 'Alice Root',
        handle: 'alice_main',
        bio: 'Primary sovereign profile',
        visibility: 'public',
      }, identity);

      const res = await onRequestPost({ request: req });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.facet.handle).toBe('alice_main');
      expect(data.facet.displayName).toBe('Alice Root');
      expect(data.facet.isDefault).toBe(true);
      expect(data.facet.isPubliclyLinked).toBe(false);
      expect(data.facet.ownerFingerprint).toBe(identity.identity.fingerprint);
      expect(globalFacetsStore.length).toBe(1);
    });

    it('creates subsequent facet with isDefault=false', async () => {
      const identity = createSovereignIdentity({ capabilities: ['*'] });

      // Facet 1 (default)
      await onRequestPost({
        request: createSignedRequest({
          action: 'create',
          displayName: 'Alice Root',
          handle: 'alice_root',
        }, identity),
      });

      // Facet 2 (secondary)
      const res2 = await onRequestPost({
        request: createSignedRequest({
          action: 'create',
          displayName: 'Alice GameDev',
          handle: 'alice_games',
          bio: 'Building web3 games',
          isPubliclyLinked: true,
        }, identity),
      });

      expect(res2.status).toBe(201);
      const data2 = await res2.json();
      expect(data2.facet.isDefault).toBe(false);
      expect(data2.facet.isPubliclyLinked).toBe(true);
      expect(globalFacetsStore.length).toBe(2);
    });

    it('enforces maximum 5 facets per identity limit', async () => {
      const identity = createSovereignIdentity({ capabilities: ['*'] });

      for (let i = 1; i <= MAX_FACETS_PER_IDENTITY; i++) {
        const res = await onRequestPost({
          request: createSignedRequest({
            action: 'create',
            displayName: `Facet ${i}`,
            handle: `facet_${i}_unique`,
          }, identity),
        });
        expect(res.status).toBe(201);
      }

      expect(globalFacetsStore.length).toBe(5);

      // 6th facet must be rejected
      const overflowRes = await onRequestPost({
        request: createSignedRequest({
          action: 'create',
          displayName: 'Sixth Facet',
          handle: 'facet_six',
        }, identity),
      });

      expect(overflowRes.status).toBe(400);
      const json = await overflowRes.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Facet limit reached');
      expect(globalFacetsStore.length).toBe(5);
    });

    it('rejects duplicate handles (case-insensitive unicity)', async () => {
      const alice = createSovereignIdentity({ capabilities: ['*'] });
      const bob = createSovereignIdentity({ capabilities: ['*'] });

      const res1 = await onRequestPost({
        request: createSignedRequest({
          action: 'create',
          displayName: 'Alice Photography',
          handle: 'photo_club',
        }, alice),
      });
      expect(res1.status).toBe(201);

      const res2 = await onRequestPost({
        request: createSignedRequest({
          action: 'create',
          displayName: 'Bob Photography',
          handle: 'PHOTO_CLUB',
        }, bob),
      });
      expect(res2.status).toBe(409);
      const json = await res2.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Handle is already taken');
    });

    it('rejects handles that do not meet length/character validation', async () => {
      const identity = createSovereignIdentity({ capabilities: ['*'] });

      const tooShort = await onRequestPost({
        request: createSignedRequest({
          action: 'create',
          displayName: 'Short',
          handle: 'ab',
        }, identity),
      });
      expect(tooShort.status).toBe(400);

      const invalidChars = await onRequestPost({
        request: createSignedRequest({
          action: 'create',
          displayName: 'Invalid',
          handle: 'bad-handle!',
        }, identity),
      });
      expect(invalidChars.status).toBe(400);
    });

    it('rejects invalid avatar URLs (e.g. javascript: protocol)', async () => {
      const identity = createSovereignIdentity({ capabilities: ['*'] });

      const res = await onRequestPost({
        request: createSignedRequest({
          action: 'create',
          displayName: 'Malicious',
          handle: 'attacker',
          avatarUrl: 'javascript:alert(1)',
        }, identity),
      });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Avatar must use an http or https URL');
    });
  });

  describe('2. Queries & Public Unlinkability', () => {
    it('strips ownerFingerprint for public queries', async () => {
      const alice = createSovereignIdentity({ capabilities: ['*'] });
      const facet: EdgeFacet = {
        id: 'facet-alice-1',
        ownerFingerprint: alice.identity.fingerprint,
        handle: 'alice_pub',
        displayName: 'Alice Public',
        visibility: 'public',
        isDefault: true,
        isPubliclyLinked: false,
        createdAt: 1000,
        updatedAt: 1000,
      };
      globalFacetsStore.push(facet);

      // Public anonymous request
      const getReq = new Request('https://urefy.com/api/facets?id=facet-alice-1');
      const res = await onRequestGet({ request: getReq });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.facet.handle).toBe('alice_pub');
      expect(data.facet.ownerFingerprint).toBeUndefined(); // MUST NOT leak owner fingerprint!

      // Authenticated owner request
      const ownerReq = new Request('https://urefy.com/api/facets?id=facet-alice-1', {
        headers: { 'X-User-Fingerprint': alice.identity.fingerprint },
      });
      const ownerRes = await onRequestGet({ request: ownerReq });
      const ownerData = await ownerRes.json();
      expect(ownerData.facet.ownerFingerprint).toBe(alice.identity.fingerprint);
    });

    it('hides unlinked sibling facets from public callers', async () => {
      const alice = createSovereignIdentity({ capabilities: ['*'] });
      const facet1: EdgeFacet = {
        id: 'facet-alice-main',
        ownerFingerprint: alice.identity.fingerprint,
        handle: 'alice_real',
        displayName: 'Alice Real',
        visibility: 'public',
        isDefault: true,
        isPubliclyLinked: false, // NOT linked
        createdAt: 1000,
        updatedAt: 1000,
      };
      const facet2: EdgeFacet = {
        id: 'facet-alice-anon',
        ownerFingerprint: alice.identity.fingerprint,
        handle: 'alice_anon_dev',
        displayName: 'Alice Anon',
        visibility: 'public',
        isDefault: false,
        isPubliclyLinked: false, // NOT linked
        createdAt: 1001,
        updatedAt: 1001,
      };
      globalFacetsStore.push(facet1, facet2);

      // Anonymous query for facet 1
      const res = await onRequestGet({
        request: new Request('https://urefy.com/api/facets?id=facet-alice-main'),
      });
      const data = await res.json();
      expect(data.linkedFacets).toEqual([]); // Zero sibling leaks!

      // When owner queries, they see their sibling facets
      const ownerRes = await onRequestGet({
        request: new Request('https://urefy.com/api/facets?id=facet-alice-main', {
          headers: { 'X-User-Fingerprint': alice.identity.fingerprint },
        }),
      });
      const ownerData = await ownerRes.json();
      expect(ownerData.linkedFacets.length).toBe(1);
      expect(ownerData.linkedFacets[0].handle).toBe('alice_anon_dev');
    });

    it('shows linked facets when isPubliclyLinked=true', async () => {
      const alice = createSovereignIdentity({ capabilities: ['*'] });
      const facet1: EdgeFacet = {
        id: 'facet-alice-main',
        ownerFingerprint: alice.identity.fingerprint,
        handle: 'alice_work',
        displayName: 'Alice Work',
        visibility: 'public',
        isDefault: true,
        isPubliclyLinked: true, // Explicitly linked by owner!
        createdAt: 1000,
        updatedAt: 1000,
      };
      const facet2: EdgeFacet = {
        id: 'facet-alice-gamedev',
        ownerFingerprint: alice.identity.fingerprint,
        handle: 'alice_games',
        displayName: 'Alice GameDev',
        visibility: 'public',
        isDefault: false,
        isPubliclyLinked: true, // Explicitly linked!
        createdAt: 1001,
        updatedAt: 1001,
      };
      globalFacetsStore.push(facet1, facet2);

      const res = await onRequestGet({
        request: new Request('https://urefy.com/api/facets?id=facet-alice-main'),
      });
      const data = await res.json();
      expect(data.linkedFacets.length).toBe(1);
      expect(data.linkedFacets[0].handle).toBe('alice_games');
      // But still does not leak owner fingerprint on public responses
      expect(data.linkedFacets[0].ownerFingerprint).toBeUndefined();
    });

    it('returns 404 for unlisted facets to non-owners', async () => {
      const alice = createSovereignIdentity({ capabilities: ['*'] });
      globalFacetsStore.push({
        id: 'facet-unlisted',
        ownerFingerprint: alice.identity.fingerprint,
        handle: 'stealth_mode',
        displayName: 'Stealth',
        visibility: 'unlisted',
        isDefault: false,
        isPubliclyLinked: false,
        createdAt: 1000,
        updatedAt: 1000,
      });

      const res = await onRequestGet({
        request: new Request('https://urefy.com/api/facets?handle=stealth_mode'),
      });
      expect(res.status).toBe(404);

      // Owner can find it
      const ownerRes = await onRequestGet({
        request: new Request('https://urefy.com/api/facets?handle=stealth_mode', {
          headers: { 'X-User-Fingerprint': alice.identity.fingerprint },
        }),
      });
      expect(ownerRes.status).toBe(200);
    });
  });

  describe('3. Updates, Toggles, Default & Deletion', () => {
    it('updates facet metadata only when signed by owner', async () => {
      const alice = createSovereignIdentity({ capabilities: ['*'] });
      const eve = createSovereignIdentity({ capabilities: ['*'] });

      globalFacetsStore.push({
        id: 'facet-alice-edit',
        ownerFingerprint: alice.identity.fingerprint,
        handle: 'alice_editor',
        displayName: 'Old Name',
        visibility: 'public',
        isDefault: true,
        isPubliclyLinked: false,
        createdAt: 1000,
        updatedAt: 1000,
      });

      // Eve attempts to edit Alice's facet
      const unauthorized = await onRequestPost({
        request: createSignedRequest({
          action: 'update',
          facetId: 'facet-alice-edit',
          displayName: 'Eve Hacked You',
        }, eve),
      });
      expect(unauthorized.status).toBe(403);

      // Alice updates her own facet
      const authorized = await onRequestPost({
        request: createSignedRequest({
          action: 'update',
          facetId: 'facet-alice-edit',
          displayName: 'Alice New Name',
          bio: 'Updated bio information',
        }, alice),
      });
      expect(authorized.status).toBe(200);
      const json = await authorized.json();
      expect(json.facet.displayName).toBe('Alice New Name');
      expect(json.facet.bio).toBe('Updated bio information');
    });

    it('toggles public link status', async () => {
      const alice = createSovereignIdentity({ capabilities: ['*'] });
      globalFacetsStore.push({
        id: 'facet-toggle',
        ownerFingerprint: alice.identity.fingerprint,
        handle: 'alice_toggle',
        displayName: 'Toggle Test',
        visibility: 'public',
        isDefault: false,
        isPubliclyLinked: false,
        createdAt: 1000,
        updatedAt: 1000,
      });

      const res = await onRequestPost({
        request: createSignedRequest({
          action: 'toggle-public-link',
          facetId: 'facet-toggle',
          isPubliclyLinked: true,
        }, alice),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.isPubliclyLinked).toBe(true);
      expect(globalFacetsStore[0].isPubliclyLinked).toBe(true);
    });

    it('sets new default facet and unsets prior default', async () => {
      const alice = createSovereignIdentity({ capabilities: ['*'] });
      globalFacetsStore.push(
        {
          id: 'facet-1',
          ownerFingerprint: alice.identity.fingerprint,
          handle: 'alice_1',
          displayName: 'Facet 1',
          visibility: 'public',
          isDefault: true,
          isPubliclyLinked: false,
          createdAt: 1000,
          updatedAt: 1000,
        },
        {
          id: 'facet-2',
          ownerFingerprint: alice.identity.fingerprint,
          handle: 'alice_2',
          displayName: 'Facet 2',
          visibility: 'public',
          isDefault: false,
          isPubliclyLinked: false,
          createdAt: 1001,
          updatedAt: 1001,
        }
      );

      const res = await onRequestPost({
        request: createSignedRequest({
          action: 'set-default',
          facetId: 'facet-2',
        }, alice),
      });
      expect(res.status).toBe(200);
      expect(globalFacetsStore.find(f => f.id === 'facet-1')?.isDefault).toBe(false);
      expect(globalFacetsStore.find(f => f.id === 'facet-2')?.isDefault).toBe(true);
    });

    it('prevents deleting the default facet when sibling facets exist', async () => {
      const alice = createSovereignIdentity({ capabilities: ['*'] });
      globalFacetsStore.push(
        {
          id: 'facet-default',
          ownerFingerprint: alice.identity.fingerprint,
          handle: 'alice_def',
          displayName: 'Default Facet',
          visibility: 'public',
          isDefault: true,
          isPubliclyLinked: false,
          createdAt: 1000,
          updatedAt: 1000,
        },
        {
          id: 'facet-sub',
          ownerFingerprint: alice.identity.fingerprint,
          handle: 'alice_sub',
          displayName: 'Sub Facet',
          visibility: 'public',
          isDefault: false,
          isPubliclyLinked: false,
          createdAt: 1001,
          updatedAt: 1001,
        }
      );

      const res = await onRequestPost({
        request: createSignedRequest({
          action: 'delete',
          facetId: 'facet-default',
        }, alice),
      });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Cannot delete default Facet');
      expect(globalFacetsStore.length).toBe(2);
    });

    it('successfully deletes non-default facet', async () => {
      const alice = createSovereignIdentity({ capabilities: ['*'] });
      globalFacetsStore.push(
        {
          id: 'facet-default',
          ownerFingerprint: alice.identity.fingerprint,
          handle: 'alice_def',
          displayName: 'Default Facet',
          visibility: 'public',
          isDefault: true,
          isPubliclyLinked: false,
          createdAt: 1000,
          updatedAt: 1000,
        },
        {
          id: 'facet-sub',
          ownerFingerprint: alice.identity.fingerprint,
          handle: 'alice_sub',
          displayName: 'Sub Facet',
          visibility: 'public',
          isDefault: false,
          isPubliclyLinked: false,
          createdAt: 1001,
          updatedAt: 1001,
        }
      );

      const res = await onRequestPost({
        request: createSignedRequest({
          action: 'delete',
          facetId: 'facet-sub',
        }, alice),
      });
      expect(res.status).toBe(200);
      expect(globalFacetsStore.filter(f => f.status !== 'deleted').length).toBe(1);
      expect(globalFacetsStore.find(f => f.id === 'facet-sub')?.status).toBe('deleted');
      expect(globalFacetsStore.filter(f => f.status !== 'deleted')[0].id).toBe('facet-default');
    });
  });
});
