/**
 * @file ui/tokens.ts
 * @package @aetheris/client-ui
 * @description Central Design System Tokens for Spacing, Typography, and Semantic Styles.
 */

export const SPACING = {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
} as const;

export const TYPOGRAPHY = {
  pageTitle: 'text-2xl md:text-3xl font-bold tracking-tight text-white',
  sectionTitle: 'text-lg font-semibold tracking-tight text-slate-100',
  body: 'text-sm leading-relaxed text-slate-200',
  bodySecondary: 'text-xs text-slate-400 leading-normal',
  caption: 'text-[11px] text-slate-500 font-medium',
  label: 'text-xs font-semibold uppercase tracking-wider text-slate-400',
  mono: 'font-mono text-xs text-cyan-300',
  badge: 'text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full',
} as const;

export const BREAKPOINTS = {
  mobile: 640,
  tablet: 1024,
  desktop: 1440,
  wide: 1920,
} as const;

export const TOUCH_TARGET_MIN = 'min-h-[44px] min-w-[44px]';
