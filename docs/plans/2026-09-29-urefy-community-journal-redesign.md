# UREfy Community Journal Redesign Implementation Plan

> Historical record: the user rejected this live design after reviewing desktop screenshots on 2026-09-29. The active direction is documented in `DESIGN.md` as Social Workspace. The deployment identified below is the previous version, not acceptance of this plan.


## Current implementation status

- Replaced the Home discovery carousel with an editorial dispatch river and subject/place index.
- Rebuilt Explore as an atlas and Communities as a latest-activity-led directory.
- Added a reading-room grammar to public threads and flattened their contextual sidebar.
- Reworked Messages transcript styling and channel-change scroll restoration; same-channel history keeps its visible message anchor. DM conversation switching opens the newly selected conversation at its latest message.
- Made Mineral Basalt the new-user default, aligned Alabaster to warm limestone/clay, and removed forced article-card treatments from themes.
- Local `npm run typecheck`, `npm run build`, 23-gate production audit, UX audit, and startup bundle budget pass. E2E tests were not run.
- Published to Cloudflare Pages production branch `main`; deployment `3560f00f-69b1-42e8-b9b3-850238b31efa` is live at `https://urefy.com` and `https://3560f00f.aetheris-omni-sphere.pages.dev`.
- Live homepage, all referenced assets, and `/api/health` returned HTTP 200; health reported `online`.
- Full browser review with real account content across viewports and all theme variants remains outstanding. The local preview opened first-run onboarding with an empty production-safe state, so it did not provide realistic content for visual sign-off.

**Goal:** Replace UREfy's Reddit-like card-and-pill visual grammar with a recognizable, theme-coherent community journal across Home, Explore, Communities, Threads, and Messages, while making new message conversations open at their latest message.

**Architecture:** Keep the existing TypeScript/DOM/Vite application and its navigation, privacy, identity, and cryptographic contracts. Define a semantic editorial visual system in `DESIGN.md` and shared CSS tokens, then give each page a different layout grammar: Home as a dispatch river, Explore as a typographic field atlas, Communities as places with real activity, Threads as reading rooms, and Messages as a chronological dialogue. Scope initial visual work to the named customer-facing pages and make all colors respond to the existing theme selector.

**Tech Stack:** TypeScript, DOM templates, Vite, Tailwind utility classes, semantic CSS custom properties, Playwright (regression coverage).

---

### Task 1: Lock the design language and semantic tokens

**Files:**
- Modify: `DESIGN.md`
- Modify: `packages/client-ui/src/product.css`
- Modify: `packages/client-ui/src/style.css`
- Modify: `packages/client-ui/src/themes.ts`
- Modify: `packages/client-ui/src/theme-boot.ts`
- Modify: `packages/client-ui/public/theme-boot.js`

Replace the current "Sovereign Architectural Atelier" rules where they prescribe generic cards, pills, Inter, or a centered 760px social feed. Commit to a warm, literate, sovereign "community field journal"; define a distinctive display/body pairing, OKLCH semantic palette, spacing/shape rules, and the editorial margin/river as the signature device. Keep the seven theme choices but make every one map the same complete semantic token set. Do not introduce decorative card grids, glow, or hard-coded per-view palette patches.

### Task 2: Recompose Home and Explore around real signals

**Files:**
- Modify: `packages/client-ui/src/home-discovery.ts`
- Modify: `packages/client-ui/src/feed-view.ts`
- Modify: `packages/client-ui/src/explore-view.ts`
- Modify: `packages/client-ui/src/product.css`

Remove the Home carousel plus stacked generic recommendation widgets. Use a responsive editorial feed with one active dispatch, a clearly connected reply river, and compact contextual wayfinding. Rebuild Explore as a typographic atlas of actual topics, people, discussions, and places; remove the numbered faux journey and repeated "From available posts" cards. Preserve truthful empty states, links, filters, and existing actions.

### Task 3: Make Communities feel like places

**Files:**
- Modify: `packages/client-ui/src/community-view.ts`
- Modify: `packages/client-ui/src/discovery-card.ts`
- Modify: `packages/client-ui/src/product.css`

Replace the predictable three-column catalog with a featured place based on actual latest activity and a readable directory of emerging spaces. Do not present a stale post as active; do not leak internal error text (for example "Attempting to duplicate slug") into community descriptions. Retain honest counts, join/create actions, search, category, and membership filters.

### Task 4: Redesign Threads as editorial reading views

**Files:**
- Modify: `packages/client-ui/src/post-detail.ts`
- Modify: `packages/client-ui/src/product.css`

Give public discussions a reading column and quiet contextual margin, with replies continuing the river instead of nested boxes. Keep author, privacy boundary, source, and reply actions explicit. Render sparse participant/reply states without dashboard-style empty metric panels or invented activity.

### Task 5: Redesign Messages and repair channel-entry scroll semantics

**Files:**
- Modify: `packages/client-ui/src/messages-view.ts`
- Modify: `packages/client-ui/src/app.ts`
- Test: `packages/client-ui/e2e/chat-signature-visual.spec.ts`
- Test: `packages/client-ui/e2e/scroll-and-flicker.spec.ts`

Give Messages a full-height chronological dialogue surface, distinct incoming/outgoing message rhythm, visible date/context transitions, and an anchored composer. Remove excessive blank alignment, generic bubbles/cards, and raw QA-looking copy from design fixtures. On channel identity change, initialize that channel at its latest message after data/layout settles; preserve a same-channel history anchor when the reader is scrolled up; cancel pending auto-scroll after deliberate upward scrolling. Never solve with `force: true` or arbitrary sleeps.

### Task 6: Recompose global shell and responsive behavior

**Files:**
- Modify: `packages/client-ui/src/app.ts`
- Modify: `packages/client-ui/src/product.css`
- Modify: `packages/client-ui/src/premium.css`

Use desktop width intentionally across navigation, reading stage, and contextual margin; remove the large accidental empty acreage while maintaining a comfortable line length for prose. Keep mobile composition task-first and ensure every theme uses the shared semantic system without bright-theme regressions.

### Task 7: Review rendered states and acceptance evidence

Review Home, Explore, Communities, Thread detail, and Messages at desktop, tablet, and mobile sizes in all seven themes. Check empty/loading/error/active states, keyboard focus, theme switching, channel switching, and preservation of read position. Run the focused client typecheck/build and relevant browser journeys; report exact pass/fail and anything not verified. Do not deploy until the repaired build and release checks are green.
