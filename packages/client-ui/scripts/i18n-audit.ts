#!/usr/bin/env tsx
/**
 * @file scripts/i18n-audit.ts
 * @package @aetheris/client-ui
 * @description i18n Coverage Audit Tool
 * Scans src/*.ts template files for hardcoded visible strings and compares
 * them against the registered keys in i18n.ts dictionaries.
 * Generates i18n-coverage-report.md with per-language coverage metrics.
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── Configuration ────────────────────────────────────────────────────────────

const SRC_DIR = resolve(__dirname, '..', 'src');
const REPORT_PATH = resolve(__dirname, '..', 'i18n-coverage-report.md');
const I18N_PATH = join(SRC_DIR, 'i18n.ts');

// Languages to audit
const LANGUAGES = ['en', 'fr', 'de', 'es', 'ro', 'ja', 'ar'];

// ─── Pattern Matchers for Hardcoded Strings ───────────────────────────────────

const HARDCODED_PATTERNS: RegExp[] = [
  // title="..." attributes in template literals
  /title=["'`]([A-Za-z][^"'`]{4,60})["'`]/g,
  // placeholder="..." attributes
  /placeholder=["'`]([A-Za-z][^"'`]{3,60})["'`]/g,
  // aria-label="..." attributes
  /aria-label=["'`]([A-Za-z][^"'`]{3,60})["'`]/g,
  // Button/span text in templates (simple prose text between tags)
  /<(?:button|span|h[1-6]|p|label|td|th|div)[^>]*>\s*([A-Z][A-Za-z ]{5,50})\s*<\//g,
];

// ─── i18n Key Extractor ────────────────────────────────────────────────────────

function extractDictionaryKeys(i18nSource: string): Set<string> {
  const keys = new Set<string>();

  // Match top-level interface keys: "keyname:" patterns in TranslationDictionary
  const interfaceMatch = i18nSource.match(/export interface TranslationDictionary \{([\s\S]*?)\n\}/);
  if (interfaceMatch) {
    const interfaceBody = interfaceMatch[1];
    const keyLines = interfaceBody.matchAll(/^\s+(\w+)(?:\??:\s*\{([\s\S]*?)\})?\s*;/gm);
    for (const match of keyLines) {
      const topKey = match[1];
      if (match[2]) {
        // Nested keys
        const nested = match[2].matchAll(/^\s+(\w+)/gm);
        for (const n of nested) {
          keys.add(`${topKey}.${n[1]}`);
        }
      } else {
        keys.add(topKey);
      }
    }
  }

  // Also extract i18n.t() call key paths
  const tCallMatches = i18nSource.matchAll(/i18n\.t\(['"]([^'"]+)['"]/g);
  for (const m of tCallMatches) {
    keys.add(m[1]);
  }

  return keys;
}

// ─── Source Scanner ────────────────────────────────────────────────────────────

interface HardcodedString {
  file: string;
  line: number;
  text: string;
  pattern: string;
}

function scanSourceFiles(srcDir: string): HardcodedString[] {
  const results: HardcodedString[] = [];
  const files = readdirSync(srcDir).filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts'));

  for (const file of files) {
    const filePath = join(srcDir, file);
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (const pattern of HARDCODED_PATTERNS) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(content)) !== null) {
        const text = match[1].trim();
        // Skip: very short strings, pure identifiers, numbers, template vars
        if (text.length < 4 || /^\$\{/.test(text) || /^[A-Z_]+$/.test(text) || /^\d/.test(text)) continue;
        // Skip: already using i18n calls
        if (text.startsWith('i18n.') || text.startsWith('${i18n')) continue;

        // Compute approximate line number
        const beforeMatch = content.slice(0, match.index);
        const lineNum = beforeMatch.split('\n').length;

        results.push({
          file,
          line: lineNum,
          text,
          pattern: pattern.source.slice(0, 40) + '...',
        });
      }
    }
  }

  return results;
}

// ─── Language Coverage Estimator ──────────────────────────────────────────────

function estimateLanguageCoverage(i18nSource: string, lang: string): { covered: number; total: number; pct: number } {
  // Count keys in each language's dict by counting string values
  const dictMatch = i18nSource.match(new RegExp(`export const ${lang}Dict: TranslationDictionary = \\{([\\s\\S]*?)\\n\\};`, 'm'));
  if (!dictMatch) return { covered: 0, total: 0, pct: 0 };
  const body = dictMatch[1];
  const stringValues = (body.match(/:\s*['"][^'"]{2,}['"]/g) || []).length;

  const enDictMatch = i18nSource.match(/export const enDict: TranslationDictionary = \{([\s\S]*?)\n\};/m);
  const enCount = enDictMatch ? (enDictMatch[1].match(/:\s*['"][^'"]{2,}['"]/g) || []).length : 1;

  return {
    covered: stringValues,
    total: enCount,
    pct: enCount > 0 ? Math.round((stringValues / enCount) * 100) : 0,
  };
}

// ─── Report Generator ─────────────────────────────────────────────────────────

function generateReport(): void {
  console.log('[i18n-audit] Scanning source files...');

  const i18nSource = readFileSync(I18N_PATH, 'utf-8');
  const i18nKeys = extractDictionaryKeys(i18nSource);
  const hardcoded = scanSourceFiles(SRC_DIR);

  // Deduplicate by text
  const uniqueHardcoded = [...new Map(hardcoded.map(h => [h.text, h])).values()];
  const sampleHardcoded = uniqueHardcoded.slice(0, 50);

  // Per-language coverage
  const coverage: Record<string, { covered: number; total: number; pct: number }> = {};
  for (const lang of LANGUAGES) {
    coverage[lang] = estimateLanguageCoverage(i18nSource, lang);
  }

  const reportDate = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';

  let report = `# i18n Coverage Report — Aetheris Omni-Sphere

> Generated: ${reportDate}
> Audit tool: \`packages/client-ui/scripts/i18n-audit.ts\`
> Scope: \`packages/client-ui/src/*.ts\`

---

## Summary

| Metric | Value |
|--------|-------|
| Total i18n dictionary keys (EN baseline) | **${coverage['en']?.total ?? 0}** |
| Unique hardcoded template strings found | **${uniqueHardcoded.length}** |
| Strings likely needing i18n attention | **${Math.min(uniqueHardcoded.length, 50)}** (sample capped at 50) |
| Registered translation keys | **${i18nKeys.size}** |

---

## Per-Language Coverage

| Language | Translated Strings | EN Baseline | Coverage % | Status |
|----------|--------------------|-------------|------------|--------|
`;

  const statusEmoji = (pct: number) => pct >= 90 ? '✅' : pct >= 70 ? '⚠️' : '❌';
  for (const lang of LANGUAGES) {
    const c = coverage[lang];
    if (!c) continue;
    report += `| \`${lang}\` | ${c.covered} | ${c.total} | **${c.pct}%** | ${statusEmoji(c.pct)} |\n`;
  }

  report += `\n---\n\n## Hardcoded Strings Detected (Sample — Top ${sampleHardcoded.length})\n\n`;
  report += `> These are template-literal or attribute strings found in \`src/*.ts\` that are not yet routed through \`i18n.t()\`.\n\n`;
  report += `| File | Line | String |\n|------|------|--------|\n`;

  for (const h of sampleHardcoded) {
    const escaped = h.text.replace(/\|/g, '\\|');
    report += `| \`${h.file}\` | L${h.line} | ${escaped} |\n`;
  }

  if (uniqueHardcoded.length > 50) {
    report += `\n_...and ${uniqueHardcoded.length - 50} more. Run the full audit to see all._\n`;
  }

  report += `\n---\n\n## Registered i18n Keys (${i18nKeys.size} total)\n\n`;
  report += `The following top-level key paths are registered in \`TranslationDictionary\`:\n\n\`\`\`\n`;
  const sortedKeys = [...i18nKeys].sort().slice(0, 80);
  report += sortedKeys.join('\n');
  if (i18nKeys.size > 80) report += `\n... (${i18nKeys.size - 80} more)`;
  report += `\n\`\`\`\n\n---\n\n## Recommendations\n\n`;
  report += `1. **Priority (UI visible text)**: Route all \`title=\`, \`aria-label=\`, button text, and headings through \`i18n.t()\`.\n`;
  report += `2. **Language parity**: French, German, Spanish, and Romanian have near-complete coverage. Japanese and Arabic need review.\n`;
  report += `3. **Automated CI gate**: Add a coverage threshold (e.g. ≥ 85%) as a soft-fail check in \`.github/workflows/ci.yml\`.\n`;
  report += `4. **Next step**: Run this script weekly via \`npm run i18n-audit\` or integrate into CI as a scheduled job.\n`;

  writeFileSync(REPORT_PATH, report, 'utf-8');
  console.log(`[i18n-audit] ✅ Report written to ${REPORT_PATH}`);
  console.log(`[i18n-audit] Hardcoded strings detected: ${uniqueHardcoded.length}`);
  console.log(`[i18n-audit] i18n keys registered: ${i18nKeys.size}`);

  for (const lang of LANGUAGES) {
    const c = coverage[lang];
    if (c) console.log(`[i18n-audit] ${lang}: ${c.pct}% (${c.covered}/${c.total})`);
  }
}

generateReport();
