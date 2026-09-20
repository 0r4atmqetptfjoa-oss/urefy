(function() {
  try {
    var savedLang = localStorage.getItem('aetheris_locale');
    if (savedLang) {
      document.documentElement.lang = savedLang;
      if (savedLang === 'ar') document.documentElement.dir = 'rtl';
    }

    var raw = localStorage.getItem('aetheris_theme_pref') || localStorage.getItem('aetheris_theme');
    var t = 'obsidian-cyber';
    if (raw) {
      try {
        var parsed = JSON.parse(raw) || {};
        t = parsed.themeId || parsed.activeThemeId || t;
      } catch (e) {
        t = raw;
      }
    }
    var bgMap = {
      'alabaster-light': '#f6f5f2',
      'light': '#f6f5f2',
      'matrix-monolith': '#000000',
      'matrix-emerald': '#020d08',
      'obsidian-cyber': '#090a0f',
      'solar-amber': '#0c0906',
      'tokyo-neon': '#0d0714',
      'sovereign-midnight': '#060810',
      'aurora-glass': '#050d0b',
      'deep-ocean': '#060b14',
      'nordic-frost': '#080d16',
      'neo-graphite': '#0a0a0c',
      'royal-indigo': '#090714',
      'velvet-carbon': '#08080a',
      'urefy-default': '#090a0f'
    };
    var isLight = (t === 'alabaster-light' || t === 'light');
    var bg = bgMap[t] || '#090a0f';
    var d = document.documentElement;
    d.setAttribute('data-theme', t);
    d.style.backgroundColor = bg;
    d.style.colorScheme = isLight ? 'light' : 'dark';
    if (isLight) {
      d.classList.remove('dark');
      d.classList.add('light');
    } else {
      d.classList.add('dark');
      d.classList.remove('light');
    }
    if (document.body) {
      document.body.style.backgroundColor = bg;
      document.body.style.colorScheme = isLight ? 'light' : 'dark';
    }
    var density = localStorage.getItem('aetheris_density');
    if (density) d.setAttribute('data-density', density);
  } catch (e) {}
})();
