import { describe, it, expect } from 'vitest';
import { DICTIONARIES, SUPPORTED_LANGUAGES, enDict } from '../src/i18n.js';

describe('Ticket 4.5: i18n Audit — Coverage & Completeness', () => {
  it('1. English (EN) baseline dictionary has at least 5 registered key groups', () => {
    const enKeys = Object.keys(enDict);
    expect(enKeys.length).toBeGreaterThanOrEqual(5);
    // Verify several known key groups are present
    expect(enDict).toHaveProperty('nav');
    expect(enDict).toHaveProperty('common');
  });

  it('2. All supported languages have non-empty dictionaries registered', () => {
    const langs = Object.keys(SUPPORTED_LANGUAGES);
    for (const lang of langs) {
      const dict = DICTIONARIES[lang as keyof typeof DICTIONARIES];
      if (dict) {
        expect(Object.keys(dict).length).toBeGreaterThan(0);
      }
    }
  });

  it('3. All supported languages provide at minimum 70% key coverage vs EN baseline', () => {
    const enKeyCount = Object.keys(enDict).length;
    const langs = Object.keys(SUPPORTED_LANGUAGES);

    for (const lang of langs) {
      const dict = DICTIONARIES[lang as keyof typeof DICTIONARIES];
      if (dict) {
        const langKeyCount = Object.keys(dict).length;
        const coverage = (langKeyCount / enKeyCount) * 100;
        // Allow some gaps but require at least 70% top-level key parity
        expect(coverage).toBeGreaterThanOrEqual(70);
      }
    }
  });

  it('4. Romanian (RO) dictionary has full parity with EN (100% expected)', () => {
    const enKeyCount = Object.keys(enDict).length;
    const roDict = DICTIONARIES['ro'];
    const roKeyCount = Object.keys(roDict).length;
    expect(roKeyCount).toBeGreaterThanOrEqual(enKeyCount);
  });

  it('5. i18n audit scripts directory exists and audit script is available', async () => {
    const { existsSync } = await import('fs');
    const { resolve, dirname } = await import('path');
    const { fileURLToPath } = await import('url');
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const scriptPath = resolve(__dirname, '..', 'scripts', 'i18n-audit.ts');
    expect(existsSync(scriptPath)).toBe(true);
  });

  it('6. i18n coverage report has been generated and contains expected sections', async () => {
    const { existsSync, readFileSync } = await import('fs');
    const { resolve, dirname } = await import('path');
    const { fileURLToPath } = await import('url');
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const reportPath = resolve(__dirname, '..', 'i18n-coverage-report.md');
    expect(existsSync(reportPath)).toBe(true);
    const content = readFileSync(reportPath, 'utf-8');
    expect(content).toContain('i18n Coverage Report');
    expect(content).toContain('Per-Language Coverage');
    expect(content).toContain('Hardcoded Strings Detected');
    expect(content).toContain('en');
    expect(content).toContain('ro');
  });
});
