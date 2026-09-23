# Sovereign Contexts / Facets (Phase 1 MVP) Implementation Plan

> **For Claude / Antigravity:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Introduce UREfy's first flagship differentiation: One sovereign root identity with multiple contextual social identities ("Facets"), public unlinkability by default, facet-specific social graphs and community memberships, server-side audience privacy enforcement (PUBLIC, COMMUNITY, FOLLOWERS), zero private content leaks in SEO/SSR/sitemaps/federation, and encrypted local-first For You recommendations, while keeping frozen DM cryptography 100% untouched.

**Architecture:**
- **Authorization Layer vs. Presentation Layer**: The sovereign root key (Ed25519) remains the cryptographic authorization boundary for envelopes, signatures, rate limits, and abuse accountability. Facets act as presentation and social graph nodes (`facet_id`, handle, display name, avatar, bio).
- **D1 Schema & Idempotent Migration**: New `facets`, `facet_follows`, and `facet_community_memberships` tables. Existing `user_profiles`, `posts`, `comments`, `follows`, and `community_members` seamlessly migrate to the default public Facet without breaking URLs, SEO, or ActivityPub.
- **Server-Side Audience Enforcement**: Strict API policies for `PUBLIC`, `COMMUNITY`, and `FOLLOWERS` audiences on post retrieval, search, SSR OpenGraph, and sitemaps.
- **Local-First Private For You**: Refactored `feed-personalization.ts` scoped by active facet, persisted to IndexedDB using AES-GCM-256 via WebCrypto (`secureStorage.savePrivateState`). Zero plaintext behavioral interest profiles sent to D1.

**Tech Stack:** Cloudflare D1 (SQLite), Cloudflare Pages Functions, TypeScript, Vite, Tailwind CSS, Lucide icons, Vitest, WebCrypto (AES-GCM-256), Playwright.

---

## User Review Required

> [!IMPORTANT]
> **Public Unlinkability Boundary**: V1 guarantees that ordinary users and public API callers cannot link different Facets of the same owner unless the owner explicitly turns on the owner-controlled setting `"Show this Facet on my other profiles"` (`is_publicly_linked = 1`). Server-side authorization still validates that the root sovereign key owns the facet for mutation, rate limiting, and moderation accountability. Approved wording is strictly enforced: *"Your Facets are not publicly linked unless you choose to link them."*

> [!NOTE]
> **DM Cryptography Frozen Invariant**: Double Ratchet, ML-KEM, X25519, AES-GCM DM protocol, Safety Number derivation, and Device Authority remain 100% untouched. Safety Numbers remain at the sovereign root identity level.

> [!NOTE]
> **ActivityPub Federation Boundary**: Only the Default/Public Facet participates in outbound and inbound ActivityPub federation in Phase 1. Non-default Facets remain UREfy-local.

---

## Task Structure & Bite-Sized Steps

### Task 1: D1 Migration & Schema for Facets and Audiences
**Files:**
- Create: `packages/client-ui/migrations/0017_sovereign_facets_and_audience.sql`
- Modify: `packages/client-ui/functions/schema.sql`
- Modify: `packages/client-ui/functions/api/_db.ts`
- Test: `packages/client-ui/test/d1-migrations.test.ts`

**Steps:**
1. Write migration `0017_sovereign_facets_and_audience.sql` creating `facets`, `facet_follows`, `facet_community_memberships`, adding `facet_id` and `audience` to `posts`, `facet_id` to `comments`, and idempotent data migration statements.
2. Update `packages/client-ui/functions/schema.sql` to include the canonical schema.
3. Update `packages/client-ui/functions/api/_db.ts` with TypeScript interfaces and fallback stores.
4. Run `d1-migrations.test.ts` to verify migrations execute idempotently.

---

### Task 2: Facet Management Edge API (`/api/facets`)
**Files:**
- Create: `packages/client-ui/functions/api/facets.ts`
- Test: `packages/client-ui/test/facets-api.test.ts`

**Steps:**
1. Implement `onRequestGet` in `functions/api/facets.ts` supporting retrieval by id/handle, and listing by owner.
2. Implement `onRequestPost` in `functions/api/facets.ts` supporting actions: `create` (max 5 facets limit, handle validation), `update`, `toggle-public-link`, `set-default`.
3. Add unit & integration tests covering facet creation, handle unicity, 5-facet limit, public unlinkability, and owner authorization.

---

### Task 3: Audience Privacy & Server-Side Enforcement on Posts & Comments
**Files:**
- Modify: `packages/client-ui/functions/api/posts.ts`
- Modify: `packages/client-ui/functions/api/posts/[id].ts`
- Modify: `packages/client-ui/functions/api/comments.ts`
- Test: `packages/client-ui/test/facets-audience-privacy.test.ts`

**Steps:**
1. Update `onRequestPost` in `posts.ts` to accept `facetId` and `audience` (`PUBLIC`, `COMMUNITY`, `FOLLOWERS`). Verify caller owns `facetId`.
2. Update `onRequestGet` in `posts.ts` to filter posts by audience rules:
   - `public`: visible to all.
   - `community`: requires verified membership in `facet_community_memberships`.
   - `followers`: requires verified follow relationship in `facet_follows` or author match.
3. Update `posts/[id].ts` to enforce audience checks on single post fetches and crawler SSR.
4. Update `comments.ts` to attribute comments to `facetId`.
5. Add negative tests: unauthorized access to `COMMUNITY` and `FOLLOWERS` posts must fail closed (403/404).

---

### Task 4: Social Graph & Community Membership Isolation
**Files:**
- Modify: `packages/client-ui/functions/api/follows.ts`
- Modify: `packages/client-ui/functions/api/communities.ts`
- Modify: `packages/client-ui/functions/api/blocks.ts`
- Test: `packages/client-ui/test/facets-isolation.test.ts`

**Steps:**
1. Update `follows.ts` to support `followerFacetId` and `followingFacetId`, storing follows in `facet_follows`.
2. Update `communities.ts` to accept `facetId` for join/leave actions, storing memberships in `facet_community_memberships`.
3. Update `blocks.ts` to support `block-facet` and `block-person` (server-enforced across all owner facets).
4. Write test verifying: A/GameDev follows B/Science does NOT make A/Photography follow B/Science; A/GameDev joining community does NOT make A/Public a member.

---

### Task 5: SEO, SSR & Search Leak Prevention
**Files:**
- Modify: `packages/client-ui/functions/p/[id].ts`
- Modify: `packages/client-ui/functions/sitemap-posts-1.xml.ts`
- Modify: `packages/client-ui/functions/sitemap-posts.xml.ts`
- Modify: `packages/client-ui/functions/api/search.ts`
- Test: `packages/client-ui/test/facets-seo-privacy.test.ts`

**Steps:**
1. In `p/[id].ts`, deny non-public posts with HTTP 404 and zero content leakage.
2. In sitemaps, filter only `audience = 'public'`.
3. In `api/search.ts`, search only `audience = 'public'` for posts and public facets for people.
4. In `federation.ts`, federate only if `audience === 'public'` and author facet is default.
5. Add automated tests asserting that private/community/followers posts never appear in sitemaps, search, SSR OpenGraph, or federation.

---

### Task 6: Local-First Facet-Scoped Personalization ("Private For You")
**Files:**
- Modify: `packages/client-ui/src/feed-personalization.ts`
- Test: `packages/client-ui/test/facets-personalization-divergence.test.ts`

**Steps:**
1. Refactor `feed-personalization.ts` to support `setFacetContext(facetId)`.
2. Encrypt and persist facet preference models using `secureStorage.savePrivateState('facet_pref_' + facetId, state)`. Zero plaintext in localStorage and zero behavioral interest telemetry sent to D1.
3. Implement `resetFacetPreferences(facetId)` to clear local learned profile.
4. Implement "Not interested" local feedback action.
5. Update "Why am I seeing this?" with authentic local signals ("Because you joined c/...", "Because you often interact with #[topic]").
6. Write test verifying: GameDev and Photography facets trained with different topics produce diverging For You rankings with zero server database leakage.

---

### Task 7: Facet Switcher, Modal & Composer Privacy Preview UI
**Files:**
- Create: `packages/client-ui/src/facet-switcher.ts`
- Create: `packages/client-ui/src/facet-modal.ts`
- Modify: `packages/client-ui/src/composer-hybrid.ts`
- Modify: `packages/client-ui/src/client-state.ts`
- Modify: `packages/client-ui/src/app.ts`
- Test: `packages/client-ui/test/facets-ui.test.ts`

**Steps:**
1. Build `facet-switcher.ts`: "Using UREfy as: [ ActiveFacet ▾ ]" in the navigation.
2. Build `facet-modal.ts`: Lazy-loaded modal to create and manage facets (Name, @handle, avatar, bio, visibility, public linking toggle).
3. Update `composer-hybrid.ts`:
   - "Posting as: [Active Facet Name (@handle)]"
   - Audience selector: `PUBLIC`, `COMMUNITY`, `FOLLOWERS`
   - Real-time privacy receipt ("Who will see this?") deriving true policy.
4. Wire active facet changes to `client-state.ts` and `feed-personalization.ts`.
5. Keep bundle size within budget (<600 KiB startup gzip).

---

### Task 8: Full Monorepo Audit, Verification & Live Browser Evidence
**Steps:**
1. Run `npm run typecheck`.
2. Run `npm test`.
3. Run `node scripts/bundle-budget.mjs` to measure startup gzip (<600 KiB).
4. Run live smoke test / browser verification.
5. Generate comprehensive final walkthrough report.
