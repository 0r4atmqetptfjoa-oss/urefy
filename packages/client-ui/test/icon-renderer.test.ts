import { describe, expect, it } from 'vitest';
import { iconToSvg, renderIcon, ICONS } from '../src/ui/icons.js';

describe('Lucide icon renderer', () => {
  it('omits undefined SVG attributes from current Lucide definitions', () => {
    const html = iconToSvg([['path', { d: 'M1 1L2 2', fill: undefined }]]);
    expect(html).not.toContain('undefined');
    expect(html).toContain('d="M1 1L2 2"');
  });

  it('escapes labels and presentation attributes', () => {
    const html = renderIcon('smile', { ariaLabel: 'Emoji "picker"', className: 'icon" onclick="bad()' });
    expect(html).toContain('aria-label="Emoji &quot;picker&quot;"');
    expect(html).not.toContain(' onclick="');
    expect(html).toContain('focusable="false"');
  });

  it.each(['smile', 'heart', 'menu', 'rss', 'vote', 'fileKey', 'image', 'link', 'wallet'])('has a dedicated %s icon', (name) => {
    expect(ICONS[name]).toBeDefined();
    expect(renderIcon(name)).not.toBe(renderIcon('info'));
  });
});
