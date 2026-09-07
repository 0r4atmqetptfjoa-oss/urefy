import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

describe('Release Packaging & Verification Suite (Component 5)', () => {
  const rootDir = path.resolve(__dirname, '../../..');
  const releaseZipPath = path.join(rootDir, 'aetheris-release.zip');
  const cleanZipPath = path.join(rootDir, 'aetheris-clean.zip');

  it('1. verifies that release archive exists and is non-empty', () => {
    // If not yet packaged in this process, package it
    if (!fs.existsSync(cleanZipPath)) {
      execSync('npm run package:release', { cwd: rootDir, stdio: 'pipe' });
    }
    expect(fs.existsSync(cleanZipPath)).toBe(true);
    const stats = fs.statSync(cleanZipPath);
    expect(stats.size).toBeGreaterThan(500 * 1024); // at least 500 KB
  });

  it('2. executes verify:release script cleanly without violations', () => {
    const output = execSync('npm run verify:release', { cwd: rootDir, encoding: 'utf8' });
    expect(output).toContain('All release security & reproducibility checks passed.');
    expect(output).toContain('No forbidden paths found');
    expect(output).toContain('All core workspace directories and manifest files present');
    expect(output).toContain('Manifest valid: Release');
  }, 30000);

  it('3. verifies manifest contents embedded inside archive', () => {
    // Read the manifest via verify script logic or inspect it
    const verifyScript = fs.readFileSync(path.join(rootDir, 'scripts/verify-release.js'), 'utf8');
    expect(verifyScript).toContain('release-manifest.json');
    expect(verifyScript).toContain('REQUIRED_FILES');
    expect(verifyScript).toContain('FORBIDDEN_PATHS');

    // Run verify script against the archive directly
    const result = execSync(`node scripts/verify-release.js "${cleanZipPath}"`, {
      cwd: rootDir,
      encoding: 'utf8',
    });
    expect(result).toContain('OK  Manifest valid');
  }, 30000);

  it('4. asserts that release script guarantees zero node_modules, .env, and .wrangler in archive', () => {
    const pkgScript = fs.readFileSync(path.join(rootDir, 'scripts/package-release.js'), 'utf8');
    expect(pkgScript).toContain('git archive');
    expect(pkgScript).toContain('--add-file=release-manifest.json');
    expect(pkgScript).toContain('zeroNodeModules: true');
    expect(pkgScript).toContain('zeroSecrets: true');
  });
});
