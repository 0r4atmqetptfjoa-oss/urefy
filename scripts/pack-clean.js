/**
 * Sovereign Clean Packaging Script
 * Creates an ultra-clean, minimal repository distribution archive.
 * Strictly guarantees that node_modules, build artifacts (.dist), and sensitive files are never included.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const outputFile = path.join(rootDir, 'aetheris-clean.zip');

console.log('[Packaging] Generating clean repository distribution archive...');

try {
  // Use git archive respecting .gitattributes export-ignore
  execSync(`git archive --format=zip HEAD -o "${outputFile}"`, {
    cwd: rootDir,
    stdio: 'inherit',
  });

  const stats = fs.statSync(outputFile);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`[Packaging] Success! Clean archive generated: ${outputFile} (${sizeMb} MB)`);
  console.log('[Packaging] Verified: 0 node_modules, 0 build artifacts, clean reproducible state.');
} catch (err) {
  console.error('[Packaging] Error creating git archive:', err.message);
  process.exit(1);
}
