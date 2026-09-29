/**
 * @file theme-boot.ts
 * @description Early language and theme restoration to prevent FOUC without inline scripts.
 */
try {
  const savedLang = localStorage.getItem('aetheris_locale');
  if (savedLang) {
    document.documentElement.lang = savedLang;
    if (savedLang === 'ar') document.documentElement.dir = 'rtl';
  }

  const raw = localStorage.getItem('aetheris_theme_pref');
  let t = 'obsidian-cyber';
  if (raw) {
    try {
      const parsed = JSON.parse(raw) || {};
      t = parsed.themeId || parsed.activeThemeId || t;
    } catch (e) {
      t = raw;
    }
  }
  const bgMap: Record<string, string> = {
    'mineral-basalt': '#1b1a17',
    'alabaster-light': '#f6f5f2',
    'matrix-monolith': '#000000',
    'matrix-emerald': '#020d08',
    'obsidian-cyber': '#090a0f',
    'solar-amber': '#0c0906',
    'tokyo-neon': '#0d0714',
    'nordic-frost': '#080d16',
    'sovereign-midnight': '#060810',
    'aurora-glass': '#050d0b',
    'deep-ocean': '#060b14',
    'neo-graphite': '#0a0a0c',
    'royal-indigo': '#090714',
    'velvet-carbon': '#08080a',
    'urefy-default': '#090a0f',
  };
  const isLight = t === 'alabaster-light';
  const bg = bgMap[t] || '#090a0f';
  document.documentElement.style.backgroundColor = bg;
  document.documentElement.style.colorScheme = isLight ? 'light' : 'dark';
  if (isLight) {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  } else {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  }
  if (document.body) {
    document.body.style.backgroundColor = bg;
    document.body.style.colorScheme = isLight ? 'light' : 'dark';
  }
  if (t) document.documentElement.setAttribute('data-theme', t);

  const d = localStorage.getItem('aetheris_density');
  if (d) document.documentElement.setAttribute('data-density', d);
} catch (e) {}
