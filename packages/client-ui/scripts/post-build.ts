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
// Fetch the application graph while the encrypted vault is opening, without
// evaluating it before secureStorage.init() completes. This removes the second
// download waterfall after the small main entry has run.
const appEntry = Object.values(manifest).find((chunk: any) => chunk.name === 'app') as { file: string } | undefined;
if (!appEntry?.file) throw new Error('Application preload entry missing');
const htmlPath = path.join(distDir, 'index.html');
const appPreload = `<link rel="modulepreload" crossorigin href="/${appEntry.file}">`;
const htmlSource = fs.readFileSync(htmlPath, 'utf8');
fs.writeFileSync(htmlPath, htmlSource.replace('</head>', `${appPreload}\n</head>`));
const startup = measureStartupBundle(manifest, (file: string) => fs.readFileSync(path.join(distDir, file)), startupEntries(manifest));
// Download delayed application styles now; Vite still applies them before
// mounting the app. These hints do not evaluate modules or change vault order.
const styleHints = startup.css.filter((asset: { file: string }) => !htmlSource.includes(`href="/${asset.file}"`))
  .map((asset: { file: string }) => `<link rel="preload" as="style" crossorigin href="/${asset.file}">`).join('\n');
if (styleHints) fs.writeFileSync(htmlPath, fs.readFileSync(htmlPath, 'utf8').replace('</head>', `${styleHints}\n</head>`));
const bootstrapAssets = [...startup.javascript, ...startup.css].map(asset => `/${asset.file}`);
const swPath = path.join(distDir, 'sw.js');
const swSource = fs.readFileSync(path.join(__dirname, '../public/sw.js'), 'utf8');
if (!swSource.includes("'BUILD_VERSION'") || !swSource.includes('const BOOTSTRAP_ASSETS = [];')) {
  throw new Error('Service worker build markers are missing');
}
const buildVersion = createHash('sha256').update(manifestText).update(swSource)
  .update(fs.readFileSync(path.join(distDir, 'theme-boot.js')))
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
  let workerSource = fs.readFileSync(workerJs, 'utf8');
  workerSource = workerSource
    .replace(/\/\/[^\n]*\.wrangler[^\n]*\n?/g, '')
    .replace(/functionsRoutes[-_0-9.]+/g, 'functionsRoutes_static')
    .replace(/pages-[a-zA-Z0-9_-]{6,}/g, 'pages-static');
  fs.writeFileSync(workerJs, workerSource);
}

fs.writeFileSync(
  routesJson,
  JSON.stringify(
    {
      version: 1,
      include: ['/*'],
      exclude: [
        '/assets-v5/*',
        '/sw.js',
        '/manifest.json',
        '/favicon.*',
        '/icon-*.png',
        '/og-image.png',
        '/screenshot-*.png',
        '/audio/*',
        '/fonts/*',
        '/images/*',
      ],
    },
    null,
    2
  )
);

console.log('[Post-Build] Generated _worker.js and _routes.json in dist.');
