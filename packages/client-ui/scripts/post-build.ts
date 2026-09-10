import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'node:crypto';
import { measureStartupBundle, startupEntries } from '../../../scripts/bundle-budget.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');

const indexJs = path.join(distDir, 'index.js');
const workerJs = path.join(distDir, '_worker.js');
const routesJson = path.join(distDir, '_routes.json');

const manifestText = fs.readFileSync(path.join(distDir, '.vite/manifest.json'), 'utf8');
const manifest = JSON.parse(manifestText);
const startup = measureStartupBundle(manifest, (file: string) => fs.readFileSync(path.join(distDir, file)), startupEntries(manifest));
const bootstrapAssets = [...startup.javascript, ...startup.css].map(asset => `/${asset.file}`);
const swPath = path.join(distDir, 'sw.js');
const swSource = fs.readFileSync(path.join(__dirname, '../public/sw.js'), 'utf8');
if (!swSource.includes("'BUILD_VERSION'") || !swSource.includes('const BOOTSTRAP_ASSETS = [];')) {
  throw new Error('Service worker build markers are missing');
}
const buildVersion = createHash('sha256').update(manifestText).update(swSource)
  .update(fs.readFileSync(path.join(distDir, 'index.html'))).digest('hex').slice(0, 16);
fs.writeFileSync(swPath, swSource.replace("'BUILD_VERSION'", JSON.stringify(buildVersion))
  .replace('const BOOTSTRAP_ASSETS = [];', `const BOOTSTRAP_ASSETS = ${JSON.stringify(bootstrapAssets)};`));

if (fs.existsSync(indexJs)) {
  if (fs.existsSync(workerJs)) {
    fs.unlinkSync(workerJs);
  }
  fs.renameSync(indexJs, workerJs);
}

if (fs.existsSync(workerJs)) {
  const workerSource = fs.readFileSync(workerJs, 'utf8');
  const normalizedWorker = workerSource.replace(
    /^\/\/ \.\.\/\.wrangler\/tmp\/pages-[^/]+\/functionsRoutes-[^\s]+\.mjs$/m,
    '// wrangler-generated/functionsRoutes.mjs'
  );
  fs.writeFileSync(workerJs, normalizedWorker);
}

fs.writeFileSync(
  routesJson,
  JSON.stringify({ version: 1, include: ['/api/*', '/.well-known/*'], exclude: [] }, null, 2)
);

console.log('[Post-Build] Generated _worker.js and _routes.json in dist.');
