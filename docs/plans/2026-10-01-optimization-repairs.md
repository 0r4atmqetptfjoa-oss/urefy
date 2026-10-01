# UREfy Optimization Repairs Implementation Plan

**Goal:** Resolve the reproduced boot/settings regressions and reduce avoidable rendering and startup costs from the October 1 audit.

**Architecture:** Preserve the TypeScript/DOM/Vite client and existing private-data boundaries. Keep one dedicated settings surface, defer embedded players until activation, and retain stable UI nodes where incremental updates are safe.

**Tech Stack:** TypeScript, DOM, Vite, Vitest and existing Playwright projects.

## Steps

1. Boot visibility: inspect index.html/main.ts, explicitly release inherited boot visibility after initialization, rerun the existing WebKit scroll test and theme scenarios.
2. Settings: remove duplicate dispatcher handling and redundant modal opening on the settings route; update the profile regression to assert the canonical workspace, selected category and return position.
3. Media: render a genuine player facade without a remote iframe src; activate on keyboard/click or enabled autoplay, retaining fallbacks and observer cleanup.
4. Feed: preserve stable message input/rows on narrow reactive updates and bound the initial feed presentation without disrupting anchors or accessibility.
5. Startup: consolidate the two budget commands, inspect optional imports and move safe non-Home dependencies behind existing lazy boundaries; measure the built bootstrap graph.
6. Markdown: preserve currency when inline math is parsed, support accessible tables, retain escaping and link validation.
7. Validate relevant existing checks and document exact local results and remaining limits. No new deployment is part of this continuation unless requested.

Existing uncommitted work stays in place. Do not make broad commits containing other authors' changes. Run focused checks from the audit first, then the existing relevant regression suites. Any runtime improvement must be supported by the corresponding build/DOM measurement; do not infer device performance from gzip alone.

## Implementation status

Steps 1–7 implemented locally with focused verification. Results and remaining acceptance work are documented in [OPTIMIZATION_REPAIRS_2026-10-01.md](../OPTIMIZATION_REPAIRS_2026-10-01.md). Startup is 642.58 KiB gzip, so the audit's sub-600 target remains outstanding. Full theme/device and CPU/memory measurements remain outstanding. No user or post data was changed; no deployment was performed.
