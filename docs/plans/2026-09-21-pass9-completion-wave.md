# PASS 9 Completion Wave Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Repair the verified PASS 9 P1 defects, deploy the fixes to urefy.com, and run an evidence-backed completion wave for every previously unverified consumer mission.

**Architecture:** Preserve the current local-first identity and frozen DM cryptography. Add a shared public-identity presentation policy, explicit synthetic-test metadata and filtering at the server boundary, a consumer profile-setup gate, strict-CSP-compatible boot/media behavior, and compact responsive interaction improvements. Validate locally first, deploy once the targeted and release suites pass, then execute the closed beta with isolated persistent browser profiles and real UI actions.

**Tech Stack:** TypeScript, Vite, Cloudflare Pages Functions/D1, Vitest, Playwright Chromium, Wrangler.

---

### Task 1: Capture production evidence and cleanup inventory

**Files:**
- Create: `artifacts/pass9-completion/baseline/csp.json`
- Create: `artifacts/pass9-completion/baseline/qa-artifact-audit.json`
- Create: `artifacts/pass9-completion/baseline/live-surface.json`

1. Reproduce the CSP failure in Chromium and record the console message, source location, blocked script hash and visible feature impact.
2. Query public community/post APIs and classify only deterministic synthetic fixtures; do not mutate production.
3. Record counts and identifiers before cleanup.
4. Save the deployed asset identifiers so post-deploy validation can prove that the tested version changed.

### Task 2: Add truthful public identity presentation and setup

**Files:**
- Create: `packages/client-ui/src/public-identity.ts`
- Modify: `packages/client-ui/src/rapid-onboarding.ts`
- Modify: `packages/client-ui/src/onboarding.ts`
- Modify: `packages/client-ui/src/profile/profile-view.ts`
- Modify: `packages/client-ui/src/feed-view.ts`
- Modify: `packages/client-ui/src/post-detail.ts`
- Modify: `packages/client-ui/src/threads.ts`
- Modify: `packages/client-ui/src/messages-view.ts`
- Modify: `packages/client-ui/src/community-view.ts`
- Modify: `packages/client-ui/src/explore-view.ts`
- Modify: `packages/client-ui/src/notifications.ts`
- Modify: `packages/client-ui/src/admin-panel.ts`
- Test: `packages/client-ui/test/public-identity.test.ts`
- Test: `packages/client-ui/e2e/pristine-onboarding.spec.ts`

1. Write failing tests for configured identity, missing-profile setup state and fingerprint disclosure.
2. Implement a single resolver that returns a display name, human handle, avatar and `needsSetup`; it must never invent a personal name.
3. Add an obvious name/handle/avatar step with the preview “This is how other people will see you.”
4. For legacy profiles, show “Finish your profile” as the primary state and keep the fingerprint inside a technical disclosure.
5. Replace fingerprint-first rendering across consumer and moderator surfaces.
6. Run the identity and onboarding tests.

### Task 3: Add synthetic fixture metadata and discovery filtering

**Files:**
- Modify: `packages/client-ui/functions/api/_db.ts`
- Modify: `packages/client-ui/functions/api/communities.ts`
- Modify: `packages/client-ui/functions/api/posts.ts`
- Modify: `packages/client-ui/functions/api/search.ts`
- Modify: `packages/client-ui/src/sovereign-circle.ts`
- Test: `packages/client-ui/test/synthetic-fixtures.test.ts`

1. Write tests proving synthetic fixtures are excluded from normal discovery and require an explicit test query to include them.
2. Add server-side `environment`, `synthetic_test` and `cleanup_run_id` fields with backward-compatible migration handling.
3. Propagate metadata on create and filter at public list/search boundaries.
4. Preserve direct access for traceability and cleanup.
5. Run the targeted tests.

### Task 4: Audit and clean current production QA artifacts

**Files:**
- Create: `scripts/pass9-cleanup-production.mjs`
- Create: `artifacts/pass9-completion/cleanup/audit-before.json`
- Create: `artifacts/pass9-completion/cleanup/result.json`
- Create: `artifacts/pass9-completion/cleanup/audit-after.json`

1. Implement dry-run classification using explicit metadata first and strict legacy-name/content rules second.
2. Require every deletion candidate to be listed with reason and resource type.
3. Run dry-run and inspect the audit list.
4. Delete only deterministic QA fixtures using authenticated owner/admin paths.
5. Re-query production and save the after-state.

### Task 5: Eliminate CSP script violations without weakening policy

**Files:**
- Modify: `packages/client-ui/index.html`
- Modify: `packages/client-ui/public/theme-boot.js`
- Modify: `packages/client-ui/functions/p/[id].ts`
- Modify: `packages/client-ui/public/_headers`
- Modify: `packages/client-ui/functions/api/_middleware.ts`
- Test: `packages/client-ui/e2e/csp-regression.spec.ts`

1. Write a Chromium test that loads Home, Explore, Communities, Messages, Vault, Profile and Settings and fails on CSP script violations.
2. Remove the duplicated inline theme boot and keep the external boot module.
3. Replace inline post redirect logic with a bundled/external route handoff.
4. Keep `script-src` free of `unsafe-inline` and `unsafe-eval`; retain only the existing WebAssembly allowance if required.
5. Run the CSP regression and production-header audit.

### Task 6: Add resilient media fallback

**Files:**
- Create: `packages/client-ui/public/media-unavailable.svg`
- Modify: `packages/client-ui/src/media-embed.ts`
- Modify: `packages/client-ui/src/feed-view.ts`
- Modify: `packages/client-ui/src/post-detail.ts`
- Test: `packages/client-ui/test/media-fallback.test.ts`

1. Write a failing test for one-shot image failure handling.
2. Replace broken remote thumbnails with a local unavailable-media state through delegated events, with no inline handler and no retry loop.
3. Verify the known YouTube thumbnail failure visually and through network request counts.

### Task 7: Improve community selection and mobile targets

**Files:**
- Modify: `packages/client-ui/src/feed-view.ts`
- Modify: `packages/client-ui/src/composer-hybrid.ts`
- Modify: `packages/client-ui/src/threads.ts`
- Modify: `packages/client-ui/src/messages-view.ts`
- Modify: `packages/client-ui/src/reactions.ts`
- Modify: `packages/client-ui/src/premium.css`
- Test: `packages/client-ui/e2e/mobile-consumer-flows.spec.ts`

1. Group joined, recent and recommended communities before a searchable remainder.
2. Avoid mounting an unbounded flat selector.
3. Give reply, reaction and message actions approximately 44×44 CSS px hit areas at 390px without enlarging desktop controls.
4. Verify keyboard visibility, scrollability and bottom navigation at 390×844.

### Task 8: Validate and deploy

**Files:**
- Create: `artifacts/pass9-completion/release/local-validation.json`
- Create: `artifacts/pass9-completion/release/live-validation.json`

1. Run targeted Vitest and Playwright suites.
2. Run typecheck, build, bundle audit and existing release verification.
3. Deploy the client UI to Cloudflare Pages main.
4. Confirm urefy.com serves the new assets and has zero CSP script violations on all required surfaces.
5. Confirm production community discovery excludes QA fixtures and public attribution is human-readable or explicitly asks for setup.

### Task 9: Run the completion-wave beta missions

**Files:**
- Create: `scripts/synthetic-beta-9.1/`
- Create: `artifacts/pass9-completion/journals/`
- Create: `artifacts/pass9-completion/evidence/`

1. Create five truly pristine profiles and record raw, unhinted onboarding/recovery/passkey answers without exposing secrets.
2. Execute visible-UI follow, save/return, notification, mute, block and report missions.
3. Build one 30-comment, eight-agent, depth-three, three-branch semantic thread.
4. Have eight agents discover and join one metadata-tagged QA community.
5. Execute four bilateral DM pairs and three message-request flows without changing or retesting DM cryptography.
6. Execute two UI-only moderator report flows and one restore.
7. Restore Agent 12 in a second storage-isolated profile and compare identity while recording history limitations.
8. Execute normal-persona Vault save/return and one disposable encrypted export/import.
9. Execute the required mobile and keyboard/accessibility smoke missions.
10. Clean metadata-tagged synthetic fixtures after evidence capture.

### Task 10: Produce the truthful final evaluation

**Files:**
- Create: `artifacts/pass9-completion/SYNTHETIC-CLOSED-BETA-EVALUATION.md`
- Create: `artifacts/pass9-completion/mission-matrix.json`
- Create: `artifacts/pass9-completion/raw-counts.json`
- Create: `artifacts/pass9-completion/SHA256SUMS.json`

1. Assign PASS, FAIL, PARTIAL or NOT TESTED to every mission.
2. Report raw counts and evidence-linked P0/P1/P2/P3 findings.
3. Exclude testimonials and inferred interview answers.
4. Return exactly one final gate: READY FOR 5 HUMAN USERS, READY FOR 20 HUMAN USERS or NEEDS UX FIXES FIRST.
5. Hash every delivered artifact and verify that all JSON parses and all evidence files are non-empty.
