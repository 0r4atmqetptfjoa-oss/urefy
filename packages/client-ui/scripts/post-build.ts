import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');

const indexJs = path.join(distDir, 'index.js');
const workerJs = path.join(distDir, '_worker.js');
const routesJson = path.join(distDir, '_routes.json');

if (fs.existsSync(indexJs)) {
  if (fs.existsSync(workerJs)) {
    fs.unlinkSync(workerJs);
  }
  fs.renameSync(indexJs, workerJs);
}

fs.writeFileSync(
  routesJson,
  JSON.stringify({ version: 1, include: ['/api/*', '/.well-known/*'], exclude: [] }, null, 2)
);

console.log('[Post-Build] Generated _worker.js and _routes.json in dist.');
