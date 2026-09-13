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
  let t = '';
  if (raw) {
    try {
      const parsed = JSON.parse(raw) || {};
      t = parsed.themeId || parsed.activeThemeId || '';
    } catch (e) {
      t = raw;
    }
  }
  const bgMap: Record<string, string> = {
    'alabaster-light': '#f8fafc',
    'matrix-monolith': '#000000',
    'obsidian-cyber': '#0f172a',
  };
  const bg = bgMap[t] || '#090a0f';
  document.documentElement.style.backgroundColor = bg;
  if (document.body) document.body.style.backgroundColor = bg;
  if (t) document.documentElement.setAttribute('data-theme', t);

  const d = localStorage.getItem('aetheris_density');
  if (d) document.documentElement.setAttribute('data-density', d);
} catch (e) {}
