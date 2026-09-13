/**
 * @file ui/avatar-generator.ts
 * @package @aetheris/client-ui
 * @description Deterministic Sovereign SVG Avatar Generator for UREfy.
 * Generates unique, high-fidelity geometric avatars based on public cryptographic fingerprints.
 * 100% offline, zero secret leakage, no external network dependencies.
 */

export interface AvatarOptions {
  size?: number;
  className?: string;
  rounded?: 'full' | 'xl' | '2xl' | '3xl' | 'none';
  showBadge?: boolean;
}

// UREfy Calibrated Palette for Generative Sovereign Avatars
const PALETTES = [
  { bg1: '#0F172A', bg2: '#312E81', fg1: '#6366F1', fg2: '#06B6D4', accent: '#38BDF8' }, // Indigo / Cyan
  { bg1: '#090D16', bg2: '#164E63', fg1: '#06B6D4', fg2: '#10B981', accent: '#22D3EE' }, // Teal / Emerald
  { bg1: '#111827', bg2: '#4C1D95', fg1: '#8B5CF6', fg2: '#EC4899', accent: '#C084FC' }, // Violet / Fuchsia
  { bg1: '#0C1322', bg2: '#1E293B', fg1: '#38BDF8', fg2: '#6366F1', accent: '#818CF8' }, // Sky / Lumina
  { bg1: '#14141E', bg2: '#3F122B', fg1: '#F43F5E', fg2: '#FB923C', accent: '#FDA4AF' }, // Rose / Amber
  { bg1: '#0B1518', bg2: '#064E3B', fg1: '#10B981', fg2: '#FBBF24', accent: '#34D399' }, // Emerald / Gold
  { bg1: '#18122B', bg2: '#280A3E', fg1: '#A855F7', fg2: '#06B6D4', accent: '#E879F9' }, // Electric Purple / Aqua
  { bg1: '#0A0F1D', bg2: '#1E1B4B', fg1: '#4F46E5', fg2: '#38BDF8', accent: '#A5B4FC' }, // Deep Sovereign
];

/**
 * Fast deterministic 32-bit FNV-1a hash function for strings.
 */
function fnv1a(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Pseudo-random number generator seeded with a 32-bit integer.
 */
function createPrng(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/**
 * Generates an inline SVG string for a given identity seed (e.g. fingerprint or username).
 */
export function generateSvgAvatar(seed: string, options: AvatarOptions = {}): string {
  const safeSeed = (seed || 'anonymous-sovereign-node').trim().toLowerCase();
  const hash = fnv1a(safeSeed);
  const prng = createPrng(hash);

  const size = options.size ?? 40;
  const className = options.className || '';
  const roundedClass = options.rounded === 'xl' ? 'rounded-xl' :
                       options.rounded === '2xl' ? 'rounded-2xl' :
                       options.rounded === '3xl' ? 'rounded-3xl' :
                       options.rounded === 'none' ? 'rounded-none' : 'rounded-full';

  // Deterministically select palette
  const paletteIndex = hash % PALETTES.length;
  const palette = PALETTES[paletteIndex];

  // Derive geometric parameters
  const angle = Math.floor(prng() * 360);
  const patternType = Math.floor(prng() * 4); // 0: Concentric Arcs, 1: Sovereign Nexus, 2: Diamond Lattice, 3: Orbital Crest
  const idPrefix = `av-${(hash % 100000).toString(16)}`;

  // Generate pattern paths based on patternType
  let fgElements = '';

  if (patternType === 0) {
    // Interlocking Arcs (Nexus Theme)
    const r1 = 18 + prng() * 6;
    const r2 = 28 + prng() * 6;
    fgElements = `
      <circle cx="50" cy="50" r="${r2}" fill="none" stroke="${palette.fg1}" stroke-width="4" stroke-dasharray="25 15" stroke-linecap="round" transform="rotate(${angle} 50 50)" opacity="0.8" />
      <circle cx="50" cy="50" r="${r1}" fill="none" stroke="${palette.fg2}" stroke-width="5" stroke-dasharray="40 20" stroke-linecap="round" transform="rotate(${-angle * 1.5} 50 50)" />
      <circle cx="50" cy="50" r="8" fill="${palette.accent}" />
    `;
  } else if (patternType === 1) {
    // Sovereign Keystone / Facets
    const offset = 8 + prng() * 8;
    fgElements = `
      <polygon points="50,${20 - offset/2} ${75 + offset/2},65 ${25 - offset/2},65" fill="none" stroke="${palette.fg1}" stroke-width="4.5" stroke-linejoin="round" transform="rotate(${angle} 50 50)" opacity="0.9" />
      <polygon points="50,${80 + offset/2} ${25 - offset/2},35 ${75 + offset/2},35" fill="none" stroke="${palette.fg2}" stroke-width="3.5" stroke-linejoin="round" transform="rotate(${-angle} 50 50)" opacity="0.85" />
      <circle cx="50" cy="50" r="7" fill="${palette.accent}" />
    `;
  } else if (patternType === 2) {
    // Harmonic Diamond Lattice
    fgElements = `
      <rect x="26" y="26" width="48" height="48" rx="10" transform="rotate(45 50 50)" fill="none" stroke="${palette.fg1}" stroke-width="4" opacity="0.9" />
      <rect x="34" y="34" width="32" height="32" rx="6" transform="rotate(${45 + angle % 90} 50 50)" fill="none" stroke="${palette.fg2}" stroke-width="3" opacity="0.75" />
      <circle cx="50" cy="50" r="9" fill="${palette.accent}" />
      <circle cx="50" cy="50" r="4" fill="${palette.bg1}" />
    `;
  } else {
    // Orbital Crest / Peer Ring
    const petals = 5;
    let petalSvg = '';
    for (let i = 0; i < petals; i++) {
      const rot = (360 / petals) * i + angle;
      petalSvg += `<circle cx="50" cy="30" r="8" fill="${i % 2 === 0 ? palette.fg1 : palette.fg2}" transform="rotate(${rot} 50 50)" opacity="0.85" />`;
    }
    fgElements = `
      ${petalSvg}
      <circle cx="50" cy="50" r="14" fill="${palette.bg1}" stroke="${palette.accent}" stroke-width="3" />
      <circle cx="50" cy="50" r="6" fill="${palette.accent}" />
    `;
  }

  // Micro Monogram / Initial (first 2 chars of seed uppercase)
  const initial = safeSeed.replace(/^(c\/|@)/, '').substring(0, 2).toUpperCase();

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}" class="urefy-avatar shrink-0 select-none ${roundedClass} ${className}" aria-label="Avatar for ${safeSeed}" role="img">
  <defs>
    <linearGradient id="${idPrefix}-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.bg2}" />
      <stop offset="100%" stop-color="${palette.bg1}" />
    </linearGradient>
    <radialGradient id="${idPrefix}-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${palette.accent}" stop-opacity="0.35" />
      <stop offset="100%" stop-color="${palette.accent}" stop-opacity="0" />
    </radialGradient>
    <clipPath id="${idPrefix}-clip">
      <rect width="100" height="100" rx="${options.rounded === 'none' ? '0' : '50'}" />
    </clipPath>
  </defs>
  <g clip-path="url(#${idPrefix}-clip)">
    <rect width="100" height="100" fill="url(#${idPrefix}-grad)" />
    <circle cx="50" cy="50" r="48" fill="url(#${idPrefix}-glow)" />
    ${fgElements}
    <text x="50" y="54" text-anchor="middle" dominant-baseline="central" fill="#FFFFFF" font-family="monospace" font-weight="800" font-size="14" letter-spacing="0.5" opacity="0.9" style="text-shadow: 0 1px 3px rgba(0,0,0,0.8);">${initial}</text>
  </g>
</svg>`.replace(/\n\s*/g, '');
}

/**
 * Generates an SVG Data URI suitable for use in `<img src="...">` or CSS `background-image`.
 */
export function generateAvatarDataUri(seed: string, options: AvatarOptions = {}): string {
  const svg = generateSvgAvatar(seed, options);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Intelligently returns an avatar URL, using custom avatar if present,
 * or dynamically generating a sovereign SVG Data URI fallback.
 */
export function getAvatarUrl(customAvatarUrl: string | undefined | null, seed: string, options: AvatarOptions = {}): string {
  if (customAvatarUrl && customAvatarUrl.trim() !== '') {
    return customAvatarUrl;
  }
  return generateAvatarDataUri(seed, options);
}

/**
 * Renders an avatar HTML element. If custom avatar exists, renders standard `<img>`
 * with automatic fallback to deterministic SVG. If none exists, directly renders the SVG!
 */
export function renderAvatar(customAvatarUrl: string | undefined | null, seed: string, options: AvatarOptions = {}): string {
  const safeSeed = seed || 'genesis';
  if (!customAvatarUrl || customAvatarUrl.trim() === '') {
    return generateSvgAvatar(safeSeed, options);
  }

  const size = options.size ?? 40;
  const roundedClass = options.rounded === 'xl' ? 'rounded-xl' :
                       options.rounded === '2xl' ? 'rounded-2xl' :
                       options.rounded === '3xl' ? 'rounded-3xl' :
                       options.rounded === 'none' ? 'rounded-none' : 'rounded-full';
  const cls = options.className || '';
  const fallbackUri = generateAvatarDataUri(safeSeed, options);

  return `<img src="${customAvatarUrl}" alt="Avatar" width="${size}" height="${size}" class="urefy-avatar shrink-0 object-cover ${roundedClass} ${cls}" onerror="this.onerror=null;this.src='${fallbackUri}';" loading="lazy" />`;
}
