import { describe, it, expect } from 'vitest';
import {
  generateSvgAvatar,
  generateAvatarDataUri,
  getAvatarUrl,
  renderAvatar,
} from '../src/ui/avatar-generator.js';

describe('Deterministic Sovereign SVG Avatar Generator', () => {
  it('should generate deterministic SVG avatars (same input yields identical output)', () => {
    const fp = 'e098fa87b120c944';
    const svg1 = generateSvgAvatar(fp);
    const svg2 = generateSvgAvatar(fp);

    expect(svg1).toBe(svg2);
    expect(svg1).toContain('<svg');
    expect(svg1).toContain('viewBox="0 0 100 100"');
    expect(svg1).toContain('urefy-avatar');
  });

  it('should generate distinct avatars for different peer fingerprints', () => {
    const svgA = generateSvgAvatar('alice_sovereign_node_1');
    const svgB = generateSvgAvatar('bob_sovereign_node_2');

    expect(svgA).not.toBe(svgB);
  });

  it('should respect custom size, className, and rounded options', () => {
    const svg = generateSvgAvatar('charlie_node', {
      size: 64,
      className: 'custom-avatar-class',
      rounded: '2xl',
    });

    expect(svg).toContain('width="64"');
    expect(svg).toContain('height="64"');
    expect(svg).toContain('custom-avatar-class');
    expect(svg).toContain('rounded-2xl');
  });

  it('should generate valid data URI for image src attributes', () => {
    const dataUri = generateAvatarDataUri('dana_node');

    expect(dataUri.startsWith('data:image/svg+xml;utf8,')).toBe(true);
    expect(dataUri).toContain('%3Csvg');
  });

  it('should fallback to generated avatar when custom avatar is absent or empty', () => {
    const fallbackUri = getAvatarUrl('', 'eve_node');
    expect(fallbackUri.startsWith('data:image/svg+xml;utf8,')).toBe(true);

    const customUrl = 'https://custom.urefy.net/avatar.png';
    const resolvedUrl = getAvatarUrl(customUrl, 'eve_node');
    expect(resolvedUrl).toBe(customUrl);
  });

  it('should render correct HTML img or SVG element via renderAvatar', () => {
    // When custom avatar is missing, returns inline SVG
    const svgHtml = renderAvatar(null, 'frank_node');
    expect(svgHtml).toContain('<svg');
    expect(svgHtml).toContain('urefy-avatar');

    // When custom avatar is provided, returns <img> with onerror fallback to data URI
    const imgHtml = renderAvatar('https://custom.cdn/avatar.jpg', 'frank_node', { size: 48 });
    expect(imgHtml).toContain('<img');
    expect(imgHtml).toContain('src="https://custom.cdn/avatar.jpg"');
    expect(imgHtml).toContain('data:image/svg+xml;utf8,');
    expect(imgHtml).toContain('width="48"');
  });
});
