# UREfy Design System & Guidelines (DESIGN.md)

This document establishes the official design tokens, typography rules, layout constraints, interaction patterns, and theme synthesis rules for UREfy. It serves as the single source of truth to ensure product stability, accessibility, and visual distinctiveness without falling into generic AI-generated aesthetics.

---

## 1. Design Philosophy & Core Tenets

1. **Sovereign, Human, & Ambient ("Sovereign Social OS")**
   UREfy is not an ad network or a generic dashboard; it is a sanctuary for personal expression, private communication, and autonomous community dialogue. UI chrome steps back to let content and conversation lead. Avoid loud neon gradients, flashy particle noise, fake telemetry, or card-in-a-box syndrome.

2. **De-Cardification & Architectural Cadence**
   Content flows in continuous architectural zones with subtle tonal depth rather than identical floating rounded cards. Layout rhythm is varied: dense micro-dispatches alternate with expansive editorial essays; chat bubbles use organic asymmetrical geometry rather than rigid bricks.

3. **True Neutral Theme Chrome**
   Customizer tools (Theme Studio, Settings, Modals) maintain neutral chrome (mineral basalt, nocturnal slate, deep carbon). Chrome controls must never compete with user content or selected palettes.

4. **Zero-Scroll-Jump Interaction Policy**
   Never steal or displace user scroll state. Programmatic focus calls must pass `{ preventScroll: true }`. Feeds and chat views must preserve scroll position during background updates and never auto-scroll to the bottom when a user has scrolled up to read history.

5. **Progressive Disclosure & Plain Language**
   Cryptographic mechanics are conveyed through approachable metaphors ("End-to-end encrypted session with Elena", "Saved to Vault") rather than intimidating raw terminal strings. Secondary actions remain quiet until focused or hovered.

---

## 2. Theme Token Architecture

All themes define a strict set of CSS custom properties mapped across `:root` and `[data-theme="..."]`:

```css
:root {
  --bg-canvas: <canvas-hex>;         /* Application base canvas */
  --bg-surface-base: <surface-hex>;  /* Navigation and major structural rails */
  --bg-surface-raised: <raised-hex>; /* Reading panes, active threads, conversation bubbles */
  --bg-surface-overlay: <layer-hex>; /* Modals, popovers, dropdowns */
  --bg-surface-highlight: <hl-hex>;  /* Hovered states, active selections */
  --text-primary: <text-hex>;        /* High-contrast body and headings (WCAG AAA) */
  --text-secondary: <text-hex>;      /* Supportive metadata, timestamps */
  --text-muted: <text-hex>;          /* Disabled, tertiary captions */
  --border-subtle: <border-hex>;     /* Dividers, architectural boundaries */
  --color-accent: <accent-hex>;      /* Primary brand / link / CTA accent */
  --color-accent-glow: <rgba-hex>;   /* Ambient focus aura */
  --color-accent-border: <rgba-hex>; /* High-contrast outline */
  --color-accent-secondary: <hex>;   /* Warm supportive tone */
  --color-sage: #3ecf8e;             /* Cryptographic trust and verified status */
  --color-iris: #818cf8;             /* Contemplative depth and vault archives */
}
```

---

## 3. Curated Theme Palettes

### 3.1 Mineral Basalt (Default Sovereign Dark Mode)
A rich, warm mineral canvas that eliminates sterile bluish-gray and flat black.
- **Canvas (`--bg-canvas`):** `#08090d` (Mineral Basalt)
- **Base Surface (`--bg-surface-base`):** `#0f1219` (Nocturnal Slate)
- **Raised Surface (`--bg-surface-raised`):** `#161a24` (Sovereign Hearth)
- **Surface Overlay (`--bg-surface-overlay`):** `#222838` (Deep Mineral Overlay)
- **Surface Highlight (`--bg-surface-highlight`):** `#2a3246`
- **Text Primary (`--text-primary`):** `#f8fafc` (Titanium Crisp, WCAG AAA 16.2:1)
- **Text Secondary (`--text-secondary`):** `#94a3b8` (Muted Slate)
- **Text Muted (`--text-muted`):** `#64748b`
- **Borders (`--border-subtle`):** `rgba(255, 255, 255, 0.07)`
- **Accent (`--color-accent`):** `#e89e38` (Solar Forge Amber)
- **Accent Glow (`--color-accent-glow`):** `rgba(232, 158, 56, 0.22)`
- **Accent Border (`--color-accent-border`):** `rgba(232, 158, 56, 0.45)`
- **Secondary Accent:** `#c27020` (Burnished Ochre)

### 3.2 Alabaster Light (Warm Daylight Mode)
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

### 3.3 Obsidian Cyber (Nocturnal Precision)
Balanced nocturnal reading with deep dark navy and electric cyan accents.
- **Canvas:** `#090a0f`
- **Base Surface:** `#12151c`
- **Raised Surface:** `#1a1f2e`
- **Surface Overlay:** `#222840`
- **Text Primary:** `#f8fafc`
- **Accent:** `#00e5ff`

### 3.4 Matrix Monolith (Pure OLED Lights-Out)
True black battery-saving theme with subtle dark zinc structure.
- **Canvas:** `#000000`
- **Base Surface:** `#08140a`
- **Raised Surface:** `#0e2212`
- **Surface Overlay:** `#16321c`
- **Text Primary:** `#ecfdf5`
- **Accent:** `#22c55e` (Terminal phosphor emerald)

### 3.5 Solar Amber (Warm Hearth Dim)
- **Canvas:** `#0c0906`
- **Base Surface:** `#16110b`
- **Raised Surface:** `#241b11`
- **Accent:** `#f59e0b`

### 3.6 Tokyo Neon (Cyberpunk Dim)
- **Canvas:** `#0d0714`
- **Base Surface:** `#160c22`
- **Raised Surface:** `#231236`
- **Accent:** `#f43f5e`

### 3.7 Nordic Frost (Scandinavian Minimalist)
- **Canvas:** `#080d16`
- **Base Surface:** `#0f172a`
- **Raised Surface:** `#1e293b`
- **Accent:** `#38bdf8`

---

## 4. Typography & Reading Rules

1. **Humanist Sans for Reading and Interaction**
   - System stack: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`
   - Editorial Headings: `font-bold text-lg sm:text-xl tracking-tight leading-snug`
   - Post Content: `text-[15px] sm:text-base leading-[1.65] font-normal font-sans break-words max-w-[68ch]`
   - Direct Messages & Chat: `text-[15px] sm:text-[15.5px] leading-[1.6] font-normal font-sans break-words`
   - Comment Content: `text-base sm:text-[15px] leading-[1.65] font-normal font-sans break-words`

2. **Monospace for Cryptographic Verification & Time Anchors**
   - System stack: `'JetBrains Mono', 'Fira Code', ui-monospace, Menlo, monospace`
   - Used strictly for: Fingerprints, Merkle roots, ZK proof statuses, byte counts, and code diff blocks.

---

## 5. Interaction Patterns & Guardrails

- **Focus Management:** Always invoke `element.focus({ preventScroll: true })`. Uncoordinated viewport jumping is classified as a P0 user experience bug.
- **Organic Message Geometry:** Chat bubbles feature smooth asymmetrical geometry (`18px` outer curve, `4px` speech tail) with warm amber tints for user dispatches and calm nocturnal slate for peers.
- **Post Detail Routing:** Opening a post pushes `#/post/:id` and records the originating feed route. Closing the post pops history or returns cleanly to the originating view without resetting feed filters or scroll offsets.
- **Auto-scroll Restraint:** In chat and DM message containers, only scroll to bottom on initial thread load or if the user was already within 60px of the bottom (`isNearBottom`). If the user is scrolled up reading backlog, new incoming messages must never force-scroll the viewport.
- **Emoji Autocomplete:** Standard shorthand emoticons (`:)`, `:-)`, `:D`, `;)`, `<3`, `:P`) convert cleanly to standard Unicode glyphs while preserving file paths (e.g. `C:\`, `/usr/bin/`), URLs, emails, and code snippets.
- **Accessibility:** All color combinations satisfy WCAG 2.1 AA (contrast ratio >= 4.5:1 for body text, >= 3.0:1 for large text).
