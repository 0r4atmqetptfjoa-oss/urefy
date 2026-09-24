# Messages 2.3: Living Dialogue / Editorial Conversation Redesign Implementation Plan

> **Goal:** Transform UREfy Messages from a technical timeline / debugger-like graph into a warm, human, editorial "Living Dialogue" structured around Conversation Scenes, eliminating excessive pills and graph connectors while keeping all crypto/DM invariants frozen and bundle size under 600 KiB gzip.

**Architecture:**
- Group messages into natural conversational **Scenes** (temporal & participant dialogue units) rendered with subtle mineral graphite backgrounds (+2-4% luminance) and warm amber/mineral undertones.
- Replace continuous vertical `.weave-spine` timeline lines with organic spacing, soft squircle avatars, quiet typographic date headers, and delicate reply branches.
- Reduce metadata noise across all views (eliminate Member/You/Today/Private/Read pills; preserve only Guardian/Archivist distinctions when relevant).
- Enhance desktop composition to a generous 900–1100px reading canvas with intentional alignment.
- On mobile, automatically hide the global app header during active chat sessions for maximum screen efficiency.
- Redesign Context Capsules as editorial publication inserts, voice recording as a compact conversational toolbar, and Context Shelf as lightweight accordion sections.

**Tech Stack:** TypeScript, Tailwind CSS, Vanilla Web Components / Lit-style template strings, Cloudflare Pages/Durable Objects.

---

### Task 1: CSS Living Dialogue Architecture & Tonal Canvas Layering
**Files:**
- Modify: `packages/client-ui/src/style.css`
- Modify: `packages/client-ui/src/product.css`

**Step 1:** Define the mineral graphite palette tokens and Scene layout styles:
- `.scene-container`: Natural conversational block, generous padding (`p-4 sm:p-6 mb-6`), rounded corners (`rounded-2xl`), ultra-subtle luminance shift (`bg-white/[0.015]`), zero hard borders.
- `.scene-cluster-peer`: Neutral mineral tone (`bg-white/[0.012]`).
- `.scene-cluster-own`: Tiny warm amber undertone (`bg-amber-500/[0.025]`).
- Remove / deprecate long graph `.weave-spine` line.
- Style editorial date breaks (`.scene-date-separator` with faint rule).
- Add mobile focused chat rule (`#main-layout:has(.messages-thread-active) #app-top-header { display: none !important; }`).

**Step 2:** Verify build and bundle size with `npm run build --workspace=packages/client-ui`.

---

### Task 2: Messages View Transformation — Scenes, Rhythms & Pill Audit
**Files:**
- Modify: `packages/client-ui/src/messages-view.ts`

**Step 1:** Implement Scene partitioning:
- Segment messages into Scenes based on time breaks (> 20 min) or branch transitions.
- Render each Scene with participant identity nodes (soft squircle avatar, bold name, muted handle, quiet timestamp).
- Simplify "You" identity: `You · [Time]    ✓✓ Read` with right/indented lane alignment.
- Remove redundant pills (`Member`, `You`, `Today`, `Community conversation`, `Private`, `Read`).
- Convert date headers to `Today · 24 September` with faint divider rule.
- Convert beginning-of-thread system notices to quiet privacy intros (`🔒 Private conversation · End-to-end encrypted`).

**Step 2:** Update community chat left rail:
- Label as "Conversations in this space".
- Render General Discussion, Builds & Engineering, Questions & Support, Ideas & Casual with unread counts and recent participant activity.

**Step 3:** Add composer signature social context marker (`[avatar / dot] Write a private message...`).

---

### Task 3: Context Capsule & Voice Recorder Editorial Refinements
**Files:**
- Modify: `packages/client-ui/src/messages-capsule.ts`
- Modify: `packages/client-ui/src/messages-voice.ts`
- Modify: `packages/client-ui/src/messages-view.ts`

**Step 1:** Redesign `renderCapsuleArtifact` as an editorial insert (`◈ Title`, curated moments count, note, `🔒 Saved to Vault` badge).
**Step 2:** Redesign `renderVoiceRecorder` to be a compact inline toolbar above the input rather than a large status banner.
**Step 3:** Redesign Context Shelf into lightweight open sections (Person, Capsules, Shared, Media, Security, Collapsed Technical Specs).

---

### Task 4: Automated Testing & Verification
**Files:**
- Test: `packages/client-ui/e2e/private-messaging.spec.ts`
- Test: `scripts/capture-messages-2-1.mjs`

**Step 1:** Run `npm run typecheck`.
**Step 2:** Run `npm test`.
**Step 3:** Run Playwright E2E across all 4 browser engines (`npm run test:e2e --workspace=packages/client-ui`).
**Step 4:** Run `npm run audit:bundle` to ensure $\le 600$ KiB gzip ceiling.

---

### Task 5: Production Screenshot Iteration & Review
**Files:**
- Modify/Run: `scripts/capture-messages-2-1.mjs`

**Step 1:** Update capture script for all mandatory desktop (1920x1080) and mobile (390x844) states.
**Step 2:** Re-capture screenshots, critique against the 6 visual acceptance questions, adjust if needed, and re-capture.
**Step 3:** Update `walkthrough.md` with final visual evidence.
**Step 4:** Git commit clean state.
