/**
 * @file ui/tokens.ts
 * @package @aetheris/client-ui
 * @description Central Design System Tokens for Spacing, Typography, and Semantic Styles.
 */

export const SPACING = {
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  2.5: '10px',
  3: '12px',
  3.5: '14px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
} as const;

export const TYPOGRAPHY = {
  headline: 'text-2xl md:text-3xl font-serif font-bold tracking-tight text-white leading-tight',
  pageTitle: 'text-xl md:text-2xl font-bold tracking-tight text-white',
  articleTitle: 'text-base md:text-lg font-semibold tracking-tight text-slate-100 leading-snug',
  sectionTitle: 'text-sm md:text-base font-semibold tracking-tight text-slate-100',
  lead: 'text-base leading-relaxed text-slate-300 font-normal',
  body: 'text-sm leading-relaxed text-slate-200',
  bodySecondary: 'text-xs text-slate-400 leading-relaxed',
  caption: 'text-[11px] text-slate-500 font-medium tracking-normal',
  label: 'text-xs font-semibold uppercase tracking-wider text-slate-400',
  mono: 'font-mono text-xs text-slate-300',
  badge: 'text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full',
} as const;

export const RADII = {
  control: 'rounded-lg',
  surface: 'rounded-xl',
  overlay: 'rounded-2xl',
  sheet: 'rounded-3xl',
  full: 'rounded-full',
} as const;

export const ELEVATION = {
  subtle: 'shadow-sm',
  card: 'shadow-md',
  overlay: 'shadow-xl shadow-black/40',
  dialog: 'shadow-2xl shadow-black/60',
} as const;

export const BREAKPOINTS = {
  mobile: 640,
  tablet: 1024,
  desktop: 1440,
  wide: 1920,
} as const;

export const TOUCH_TARGET_MIN = 'min-h-[44px] min-w-[44px]';

export const CONTENT_WIDTHS = {
  feed: 'max-w-2xl xl:max-w-3xl',
  reading: 'max-w-[720px]',
  discovery: 'max-w-5xl',
  dialog: 'max-w-lg',
} as const;
