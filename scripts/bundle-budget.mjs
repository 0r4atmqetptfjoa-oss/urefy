import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

export function startupEntries(manifest) {
  const bootstrap = manifest['index.html']?.dynamicImports ?? [];
  const required = ['app', 'brand', 'mobile-performance', 'workspace-layout'];
  for (const name of required) {
    if (!bootstrap.some(key => manifest[key]?.name === name)) {
      throw new Error(`Missing required bootstrap module: ${name}`);
    }
  }
  return ['index.html', ...bootstrap];
}

export function measureStartupBundle(manifest, readAsset, entry = 'index.html') {
  const visited = new Set();
  const scripts = new Set();
  const styles = new Set();
  function visit(key) {
    if (visited.has(key)) return;
    const chunk = manifest[key];
    if (!chunk?.file) throw new Error(`Missing build manifest entry: ${key}`);
    visited.add(key);
    scripts.add(chunk.file);
    for (const stylesheet of chunk.css ?? []) styles.add(stylesheet);
    for (const dependency of chunk.imports ?? []) visit(dependency);
  }
  for (const root of Array.isArray(entry) ? entry : [entry]) visit(root);
  const measure = (files) => [...files].map((file) => {
    const bytes = readAsset(file);
    return { file, bytes: bytes.byteLength, gzipBytes: gzipSync(bytes).byteLength };
  });
  const javascript = measure(scripts);
  const css = measure(styles);
  return {
    javascript,
    css,
    javascriptGzipBytes: javascript.reduce((total, asset) => total + asset.gzipBytes, 0),
    cssGzipBytes: css.reduce((total, asset) => total + asset.gzipBytes, 0),
  };
}

export function runStartupBudget() {
  try {
    const dist = fileURLToPath(new URL('../packages/client-ui/dist/', import.meta.url));
    const manifest = JSON.parse(readFileSync(resolve(dist, '.vite/manifest.json'), 'utf8'));
    // Ceiling updated for 2026-09-30 sovereign AWS DR, RUM performance monitor and WebRTC features
    const budgetKiB = Number(process.env.MAX_STARTUP_GZIP_KIB ?? 700);
    if (!Number.isFinite(budgetKiB) || budgetKiB <= 0) throw new Error('Invalid MAX_STARTUP_GZIP_KIB');
    const result = measureStartupBundle(manifest, (file) => readFileSync(resolve(dist, file)), startupEntries(manifest));
    const gzipKiB = result.javascriptGzipBytes / 1024;
    console.log(`Startup JavaScript: ${gzipKiB.toFixed(2)} KiB gzip across ${result.javascript.length} chunks`);
    console.log(`Startup CSS: ${(result.cssGzipBytes / 1024).toFixed(2)} KiB gzip`);
    console.log(`Regression ceiling: ${budgetKiB} KiB JavaScript gzip. Required bootstrap modules included; optional features excluded.`);
    console.log(gzipKiB <= budgetKiB ? 'PASS: startup regression budget' : 'FAIL: startup regression budget');
    process.exitCode = gzipKiB <= budgetKiB ? 0 : 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) runStartupBudget();
