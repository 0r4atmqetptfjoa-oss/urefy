/**
 * @file ui/tokens.ts
 * @package @aetheris/client-ui/ui
 * @description 2027 Design System Tokens — Perceptual OKLCH Color Spaces, Spatial Obsidian Glass,
 * Sub-Pixel Specular Borders, Fluid Typography, and 120Hz Spring Physics.
 */

export const TYPOGRAPHY = {
  fontSans: "'Segoe UI Variable', 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
  fontMono: "'Cascadia Code', 'Cascadia Mono', 'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Consolas, monospace",
  fontDisplay: "'Segoe UI Variable Display', 'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif",
  h1: 'text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight',
  h2: 'text-xl sm:text-2xl font-bold tracking-tight leading-snug',
  h3: 'text-base sm:text-lg font-bold tracking-tight leading-snug',
  h4: 'text-sm font-semibold tracking-normal leading-normal',
  bodyLg: 'text-base font-normal leading-relaxed',
  body: 'text-sm font-normal leading-relaxed',
  bodySm: 'text-xs font-normal leading-normal',
  caption: 'text-[11px] font-medium tracking-wide uppercase text-slate-400',
  mono: 'font-mono text-xs tracking-tight',
  monoSm: 'font-mono text-[11px] tracking-tight',
} as const;

export const OKLCH_PALETTES = {
  obsidian2027: {
    canvas: 'oklch(0.13 0.015 265)',
    surfaceZ0: 'oklch(0.16 0.018 265 / 0.82)',
    surfaceZ1: 'oklch(0.20 0.022 265 / 0.78)',
    surfaceZ2: 'oklch(0.24 0.028 265 / 0.88)',
    borderSpecular: 'oklch(0.95 0.01 265 / 0.09)',
    borderActive: 'oklch(0.78 0.16 210 / 0.45)',
    accentCyphr: 'oklch(0.82 0.16 205)',
    accentSignal: 'oklch(0.80 0.18 160)',
    accentAether: 'oklch(0.72 0.20 295)',
    accentAmber: 'oklch(0.82 0.17 75)',
    accentCrimson: 'oklch(0.66 0.22 22)',
  },
  alabaster2027: {
    canvas: 'oklch(0.97 0.005 85)',
    surfaceZ0: 'oklch(0.99 0.003 85 / 0.88)',
    surfaceZ1: 'oklch(0.95 0.008 85 / 0.85)',
    surfaceZ2: 'oklch(1.00 0.000 0 / 0.94)',
    borderSpecular: 'oklch(0.20 0.01 265 / 0.08)',
    borderActive: 'oklch(0.55 0.18 245 / 0.40)',
    accentCyphr: 'oklch(0.52 0.18 230)',
    accentSignal: 'oklch(0.55 0.17 160)',
    accentAether: 'oklch(0.52 0.22 290)',
    accentAmber: 'oklch(0.62 0.18 65)',
    accentCrimson: 'oklch(0.56 0.22 25)',
  },
} as const;

export const COLORS = {
  canvas: 'var(--bg-canvas, #08090d)',
  surfaceBase: 'var(--bg-surface-base, #0e1117)',
  surfaceRaised: 'var(--bg-surface-raised, #161b26)',
  surfaceOverlay: 'var(--bg-surface-overlay, rgba(22, 27, 38, 0.88))',
  textPrimary: 'var(--text-primary, #f8fafc)',
  textSecondary: 'var(--text-secondary, #94a3b8)',
  textMuted: 'var(--text-muted, #64748b)',
  accentPrimary: 'var(--color-accent, #38bdf8)',
  signal: '#10b981',
  cyphr: '#00e5ff',
  aether: '#a855f7',
  amber: '#f59e0b',
  crimson: '#f43f5e',
} as const;

export const SPATIAL_GLASS = {
  panelZ1:
    'bg-surface-base/80 backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.08)]',
  panelZ2:
    'bg-surface-raised/85 backdrop-blur-2xl border border-white/[0.11] shadow-[0_16px_48px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(255,255,255,0.12)]',
  capsuleIsland:
    'bg-[#0b0e17]/90 backdrop-blur-2xl border border-cyan-500/25 shadow-[0_4px_24px_rgba(0,229,255,0.12),inset_0_1px_0_rgba(255,255,255,0.12)]',
  bentoTile:
    'bg-surface-raised/65 backdrop-blur-xl border border-white/[0.07] hover:border-cyan-400/30 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.24)]',
} as const;

export const SPACING = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.5rem',
  '2xl': '2rem',
  '3xl': '3rem',
} as const;

export const RADII = {
  sm: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  '2xl': '1.25rem',
  '3xl': '1.5rem',
  full: '9999px',
} as const;

export const SHADOWS = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
  md: '0 4px 12px -2px rgba(0, 0, 0, 0.4)',
  lg: '0 12px 32px -4px rgba(0, 0, 0, 0.5)',
  glowCyphr: '0 0 20px rgba(0, 229, 255, 0.25)',
  glowSignal: '0 0 20px rgba(16, 185, 129, 0.25)',
  glowAmber: '0 0 20px rgba(245, 158, 11, 0.25)',
} as const;

export const SPRING_PHYSICS = {
  snappy: 'cubic-bezier(0.22, 1, 0.36, 1)',
  fluid: 'cubic-bezier(0.16, 1, 0.3, 1)',
  bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  durationFast: '140ms',
  durationNormal: '240ms',
  durationSlow: '380ms',
} as const;

export const TRANSITIONS = {
  fast: 'transition-all duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]',
  normal: 'transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]',
  slow: 'transition-all duration-350 ease-[cubic-bezier(0.16,1,0.3,1)]',
  spring: 'transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
} as const;
