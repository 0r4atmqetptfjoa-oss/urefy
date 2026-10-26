# UREfy — Social Workspace

## Purpose

UREfy is a place for people to publish, discuss, form communities, and exchange private messages while retaining control of their identity and data. The interface must make those actions feel immediate and human. Trust and privacy information should be clear without dominating the content.

## Visual direction

A modern social workspace with a distinctive warm signal. Use generous but purposeful space, crisp typography, subtle tonal layers, and a single amber accent for the most important action or state. Let authors, words, and media supply personality. The shell should feel steady and recognizable across every page and theme.

Avoid copying Reddit's center feed with surrounding boxes. Also avoid the earlier Field Journal treatment: narrow columns, serif text everywhere, tiny monospaced labels, decorative river lines, and broad empty black areas made the product harder to use. Avoid generic dashboard grids, endless pills, artificial gradients and glows, fake activity, and cards nested inside cards.

## Page grammar

- **Home:** a useful overview with a clear composer, one primary stream, and a compact discovery panel. A post should be readable without being framed by several redundant panels.
- **Explore:** a spacious search and discovery view. Topics are scannable; conversations can be previewed without oversized media or duplicate topic lists.
- **Communities:** a directory built for comparing spaces and entering them. Community name, purpose, latest real activity, member count, and join action should be clear at a glance.
- **Post detail:** a wide reading surface with a comfortable prose measure inside it. The page, title, media, actions, reply composer, and replies align on one rhythm. Context lives in a compact secondary rail when room permits.
- **Messages:** the active thread owns the workspace. Incoming and outgoing messages sit within one legible conversation lane. The composer stays attached to it. Opening a thread lands on the latest message; reading history does not jump with incoming updates.
- **Profile:** a personal identity and activity view. The profile header, privacy state, posts, and settings have clear hierarchy and consistent controls.
- **Vault, settings, and secondary tools:** use the same shell, type, tokens, focus styles, and responsive behavior while serving their own tasks.
- **Admin:** put database-backed activity and the next useful action first. Show recent real records inline, define what a count represents, and link edits or additions to the existing audited admin workflows. Keep unconnected telemetry clearly unavailable.

## Typography and color

- Use a system sans stack based on `Segoe UI Variable`, `Segoe UI`, and Arial, with strong headings and calm body text. No remote font request.
- Body text is at least 15–16px on desktop and mobile; long reading text uses 16–18px with roughly 1.65 line height. Technical values alone may use monospace.
- Limit prose to about 76 characters per line, but never impose that measure on the entire page or its controls.
- Colors come from the active theme's semantic variables: canvas, base and raised surfaces, primary and secondary text, subtle borders, accent, success, warning, and danger. Every theme retains the same spacing and component grammar. The Alabaster theme has its own comfortable daylight contrast.
- Accent is for primary action, selection, meaningful links, and focus. Privacy, delivery, authorship, and trust also use labels or symbols so meaning never depends on color alone.

## Layout and interaction

- Desktop uses the available workspace. Side rails may compact or disappear when they duplicate the page's primary content.
- Mobile foregrounds the active task, with 44px touch targets, one scrolling area per view, and a composer clear of system insets.
- Prefer one subtle separation rule or tonal step over stacked borders and shadows. Structural surfaces may have a restrained 12–18px radius; buttons use a smaller radius.
- Every control needs a visible hover, focus, pressed, disabled, and loading state where relevant. Keyboard focus is always visible.
- Motion should communicate navigation or state, use short opacity/transform changes, and respect reduced motion.
- Empty, offline, and error states use truthful language. No fabricated presence, activity, people, counts, or testimonials.

## Quality bar

Review Home, Explore, Communities, Post detail, Messages, Profile, Vault, and Settings at desktop and mobile widths in dark and light themes. Check readability, clipping, nested scrolling, route changes, keyboard navigation, attachment display, latest-message anchoring, and return-to-feed position. Source changes are not considered a visual verification; browser screenshots and interaction checks are required before publishing.

## Changelog

- 2026-10-21: Removed the remaining remote Google Fonts request from `index.html`; typography is now fully local/system as specified here, and the boot accent uses the amber token instead of a hardcoded sky value. Relay authentication fails closed without a configured secret.
- 2026-10-02: Added live recent-post and channel previews to the admin overview, with direct post editing and one-click routes to moderation and channel creation. Direction: technical and utilitarian admin tooling within UREfy's warm signal; visual verification remains pending.
- 2026-09-29: Replaced the Field Journal direction after real desktop screenshots showed cramped post reading, wasted space in discovery, and scattered messaging. This specification guides the full UI rework and its visual review.

## UI task audit

- 2026-10-02, Admin dashboard: uses actual records from the existing 10-second server sync; no fabricated analytics, new gradients, or decorative chart elements. Labels expose that the preview is limited to currently loaded rows. Keyboard focus styles and mobile stacking are present in the new controls. Source review only; browser screenshots, responsive interaction checks, and screen-reader verification have not been run.
