# Implementation Plan — Messages 2.4 Signature Visual Reset

## 1. Context & Objective
Messages 2.3 removed the continuous timeline connector lines, but introduced rectangular "Conversation Scene" card containers (`.dialogue-scene` / `.scene-cluster-peer` / `.scene-cluster-own`). In actual rendered browser screenshots, these cards create low information density, excessive padding (especially on mobile, where a 1-line message consumes ~180px), a "Notion / forum card" appearance, and too much dark empty space.

**Messages 2.4 completely removes the scene-card model.**
The visual principle is: **HUMAN DIALOGUE LAID DIRECTLY ONTO A SHARED EDITORIAL CANVAS.**
- NO bubbles.
- NO timeline lines.
- NO scene cards / rectangular boxes around ordinary text.
- Dual dialogue flow (peer left-weighted, own slightly right-weighted).
- Containers reserved strictly for genuine artifacts (code, capsules, voice, media).
- High information density with comfortable, human reading typography.

---

## 2. Architecture & Design Specifications

### A. Dual Dialogue Flow & Stanzas
- Messages from the same author group into a **Conversational Stanza** (`.dialogue-stanza`).
- **Peer Stanza (`.dialogue-stanza--peer`)**:
  - Aligned to the left of the canvas (`max-w-[85%] sm:max-w-[78%]`, left-aligned).
  - Speaker header: small designed identity mark (subtle mineral field with initial), display name, quiet handle, time.
  - Message items: plain text resting directly on the canvas without background card or border.
- **Own Stanza (`.dialogue-stanza--own`)**:
  - Aligned toward the right (`max-w-[85%] sm:max-w-[78%]`, `ml-auto`).
  - Speaker header: small amber identity punctuation (`●`), "You", time, single delivery/read status (`✓ Sent` or `✓✓ Read`).
  - NO duplicate avatar, NO `@me`, NO `You` badge pill.
  - Message items: plain text resting directly on the canvas.
- Spacing:
  - Inside a stanza: compact 2–4px between consecutive thoughts.
  - Between different stanzas: 12–16px conversational rhythm break.
  - Date separator: quiet editorial line (`Today · 24 September`), zero cards, zero pills.

### B. High Information Density & Mobile Optimization
- At 390x844 mobile viewport, a 1–2 sentence message must consume only ~36–48px vertical space (natural text height + minimal metadata).
- Active mobile chat view hides both `#app-top-header` and `.messages-tab-header` via `#main-layout:has(.messages-thread-active)`, showing only:
  1. Thread header (`< [avatar] Name · Private | Actions`)
  2. Dense, readable conversation flow
  3. Composer
  4. Bottom navigation

### C. Restrained Identity & Avatars
- Replace SaaS-like gradient avatars with designed UREfy identity marks:
  - Subtle mineral graphite base (`#181c26`) with fine border (`rgba(255,255,255,0.08)`) and crisp white/amber lettering.
  - Facet role badge shown only for Guardian or Archivist.

### D. Refined Artifacts
- **Code Block**: Tightly wraps code content (`max-w-xl`), compact header with language and copy button.
- **Reply Reference**: Quiet inline reference (`↳ You · "quote snippet..."` or `↳ David Chen · "quote snippet..."`) without bulky quote cards.
- **Context Capsule**: Signature UREfy publication insert (`◈ TITLE · curated by You`, quote bar, Vault badge).
- **Capsule Creator**: Conversational assembly interface showing actual clipped conversation fragments rather than a generic SaaS form.
- **Voice Bar**: Compact inline dock directly above composer.

### E. Mineral Graphite Palette
- Shell: `#0b0d11`
- Rail / Navigator: `#0e1117`
- Central Canvas: `#11141c` (warmer, rich mineral depth)
- Artifact / Surface: `#181c26`
- Amber accent: Used as punctuation (own identity marker, active state dot, selected capsule edge, subtle send button).

---

## 3. Implementation Steps

1. **Step 1: CSS Architecture (`packages/client-ui/src/style.css`)**
   - Remove `.scene-cluster`, `.scene-cluster-peer`, `.scene-cluster-own` card backgrounds, borders, and paddings.
   - Introduce `.dialogue-flow`, `.dialogue-stanza`, `.dialogue-stanza--peer`, `.dialogue-stanza--own`.
   - Implement compact typography and density rules for desktop and mobile.
   - Hide global headers when thread is active on mobile.

2. **Step 2: Message Rendering (`packages/client-ui/src/messages-view.ts`)**
   - Update `groupDirectMessagesIntoScenes` / `groupDirectMessagesIntoStanzas`.
   - Render dual dialogue flow: peer left-weighted, own slightly right-weighted.
   - Plain text renders without containers.
   - Remove persistent crypto notice from message feed.
   - Clean thread header and remove duplicate privacy notice.
   - Streamline Context Shelf into an open layout without nested cards.
   - Update community message rendering to follow the same open stanza principles.

3. **Step 3: Community Rail (`packages/client-ui/src/relays-manager.ts`)**
   - Refine "Conversations in this space" rows into clean human topic rows without card wrappers.

4. **Step 4: Context Capsule Creator (`packages/client-ui/src/messages-capsule.ts`)**
   - Rework capsule creator into a conversational assembly experience with clipped message snippets.

5. **Step 5: Visual Verification & Iteration Suite (`scripts/capture-messages-2-1.mjs`)**
   - Build a realistic dense conversation (3 short messages, 1 long paragraph, rapid exchange, reply, reaction, code, capsule, voice note, failed message, date break).
   - Capture at least 3 visual iterations.
   - Verify desktop (1920x1080) and mobile (390x844).

6. **Step 6: Automated Testing & Budget Verification**
   - Vitest unit tests: 223 / 223 passing.
   - Playwright E2E: 4 / 4 passing across all browser engines.
   - TypeScript typecheck: 0 errors.
   - Bundle budget: $\le 600$ KiB gzip.
