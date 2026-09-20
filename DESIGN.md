# UREfy Design System & Guidelines (DESIGN.md)

This document establishes the official design tokens, typography rules, layout constraints, interaction patterns, and theme synthesis rules for UREfy. It serves as the single source of truth to ensure product stability, accessibility, and visual distinctiveness without falling into generic AI-generated aesthetics.

---

## 1. Design Philosophy & Core Tenets

1. **Calm, Humanist, & Durable**
   The interface exists to support private, sovereign communication and community discussion. UI chrome must step back and let user content lead. Avoid loud neon gradients, flashy particle noise, or fake diagnostic telemetry.

2. **True Neutral Theme Chrome**
   Customizer tools (Theme Studio, Settings, Modals) must maintain neutral chrome (zinc, slate, off-white, deep carbon). Chrome controls must never compete with user-selected theme palettes.

3. **Zero-Scroll-Jump Interaction Policy**
   Never steal or displace user scroll state. Programmatic focus calls must pass `{ preventScroll: true }`. Feeds and chat views must preserve scroll position during background updates and never auto-scroll to the bottom when a user has scrolled up to read history.

4. **Progressive Disclosure**
   Secondary actions (like comment reply, copy link, raw JSON, proof inspection) remain quiet or hidden until requested or hovered, maintaining a clean visual rhythm.

---

## 2. Theme Token Architecture

All themes define a strict set of CSS custom properties mapped across `:root` and `[data-theme="..."]`:

```css
:root {
  --bg-canvas: <canvas-hex>;         /* Application background */
  --bg-surface-base: <surface-hex>;  /* Navigation and major panels */
  --bg-surface-raised: <raised-hex>; /* Cards, posts, conversation bubbles */
  --bg-surface-overlay: <layer-hex>; /* Modals, popovers, dropdowns */
  --text-primary: <text-hex>;        /* High-contrast body and headings */
  --text-secondary: <text-hex>;      /* Supportive metadata, timestamps */
  --text-muted: <text-hex>;          /* Disabled, tertiary captions */
  --border-subtle: <border-hex>;     /* Dividers, card boundaries */
  --color-accent: <accent-hex>;      /* Primary brand / link / CTA accent */
  --color-accent-text: <accent-hex>; /* Accessible text contrast on light/dark */
  --color-accent-border: <accent-hex>;
}
```

---

## 3. Bundled Theme Palettes

### 3.1 Alabaster Light (Warm Daylight Mode)
Designed for fatigue-free reading in bright ambient daylight. Uses natural warm stone and off-white rather than sterile bluish-white or cold slate.
- **Canvas (`--bg-canvas`):** `#f6f5f2` (Warm Alabaster off-white)
- **Base Surface (`--bg-surface-base`):** `#ffffff` / `#efede8` (Soft limestone)
- **Raised Surface (`--bg-surface-raised`):** `#efede8`
- **Surface Overlay (`--bg-surface-overlay`):** `#e5e2da`
- **Text Primary (`--text-primary`):** `#1a1917` (Deep charcoal, WCAG AAA 14.8:1 on canvas)
- **Text Secondary (`--text-secondary`):** `#2b2824`
- **Text Muted (`--text-muted`):** `#615d56` (WCAG AA 5.8:1)
- **Borders (`--border-subtle`):** `#e5e2da` (Hover: `#d8d4ca`)
- **Accent (`--color-accent`):** `#c27803` (Keystone Warm Amber)

### 3.2 Obsidian Cyber (Default Dim Mode)
Balanced nocturnal reading with deep dark navy and electric cyan accents.
- **Canvas:** `#090a0f`
- **Base Surface:** `#12151c`
- **Raised Surface:** `#1a1f2e`
- **Surface Overlay:** `#222840`
- **Text Primary:** `#f8fafc`
- **Accent:** `#00e5ff`

### 3.3 Matrix Monolith (Pure OLED Lights-Out)
True black battery-saving theme with subtle dark zinc structure.
- **Canvas:** `#000000`
- **Base Surface:** `#08140a`
- **Raised Surface:** `#0e2212`
- **Surface Overlay:** `#16321c`
- **Text Primary:** `#ecfdf5`
- **Accent:** `#22c55e` (Terminal phosphor emerald)

### 3.4 Solar Amber (Warm Night Dim)
- **Canvas:** `#0c0906`
- **Base Surface:** `#16110b`
- **Raised Surface:** `#241b11`
- **Accent:** `#f59e0b`

### 3.5 Tokyo Neon (Cyberpunk Dim)
- **Canvas:** `#0d0714`
- **Base Surface:** `#160c22`
- **Raised Surface:** `#231236`
- **Accent:** `#f43f5e`

### 3.6 Nordic Frost (Scandinavian Minimalist)
- **Canvas:** `#080d16`
- **Base Surface:** `#0f172a`
- **Raised Surface:** `#1e293b`
- **Accent:** `#38bdf8`

---

## 4. Typography Rules

1. **Humanist Sans for Reading and Interaction**
   - System stack: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`
   - Post Titles: `font-bold text-lg sm:text-xl tracking-tight leading-snug`
   - Post Content: `text-[15px] sm:text-base leading-[1.65] font-normal font-sans break-words`
   - Comment Content: `text-base sm:text-[15px] leading-[1.65] font-normal font-sans break-words`

2. **Monospace for Cryptographic Verification**
   - System stack: `'JetBrains Mono', 'Fira Code', ui-monospace, Menlo, monospace`
   - Used exclusively for: Fingerprints, Merkle roots, ZK proof statuses, byte counts, and code diff blocks.

---

## 5. Interaction Patterns & Guardrails

- **Focus Management:** Always invoke `element.focus({ preventScroll: true })`. Uncoordinated viewport jumping is classified as a P0 user experience bug.
- **Post Detail Routing:** Opening a post pushes `#/post/:id` and records the originating feed route. Closing the post pops history or returns cleanly to the originating view without resetting feed filters or scroll offsets.
- **Auto-scroll Restraint:** In chat and DM message containers, only scroll to bottom on initial thread load or if the user was already within 60px of the bottom (`isNearBottom`). If the user is scrolled up reading backlog, new incoming messages must never force-scroll the viewport.
- **Emoji Autocomplete:** Standard shorthand emoticons (`:)`, `:-)`, `:D`, `;)`, `<3`, `:P`) convert cleanly to standard Unicode glyphs while preserving file paths (e.g. `C:\`, `/usr/bin/`), URLs, emails, and code snippets. AutocompleteEngine attaches to all text inputs.
- **Accessibility:** All color combinations in curated themes must satisfy WCAG 2.1 AA (contrast ratio >= 4.5:1 for body text, >= 3.0:1 for large text). Theme Studio features built-in relative luminance analysis.
