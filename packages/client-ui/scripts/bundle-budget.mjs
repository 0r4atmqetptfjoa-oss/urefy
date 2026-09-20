import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const distDir = path.resolve('dist');
const indexHtmlPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexHtmlPath)) {
  console.error('dist/index.html not found. Run `npm run build` first.');
  process.exit(1);
}

const html = fs.readFileSync(indexHtmlPath, 'utf8');

// Match all scripts and modulepreloads in index.html
const scriptRegex = /src=["']([^"']+\.js)["']/g;
const preloadRegex = /<link[^>]+rel=["']modulepreload["'][^>]+href=["']([^"']+\.js)["']/g;

const scriptUrls = new Set();
let match;
while ((match = scriptRegex.exec(html)) !== null) {
  scriptUrls.add(match[1]);
}
while ((match = preloadRegex.exec(html)) !== null) {
  scriptUrls.add(match[1]);
}

let totalRaw = 0;
let totalGzip = 0;
const chunks = [];

for (const url of scriptUrls) {
  const cleanPath = url.replace(/^\.?\//, '');
  const filePath = path.join(distDir, cleanPath);
  if (fs.existsSync(filePath)) {
    const rawBuf = fs.readFileSync(filePath);
    const gzBuf = zlib.gzipSync(rawBuf);
    const rawSize = rawBuf.length;
    const gzSize = gzBuf.length;
    totalRaw += rawSize;
    totalGzip += gzSize;
    chunks.push({
      name: path.basename(filePath),
      rawKiB: (rawSize / 1024).toFixed(2),
      gzipKiB: (gzSize / 1024).toFixed(2),
      gzipBytes: gzSize,
    });
  }
}

chunks.sort((a, b) => b.gzipBytes - a.gzipBytes);

console.log('\n======================================================');
console.log('  UREfy STARTUP JAVASCRIPT BUDGET AUDIT');
console.log('======================================================');
console.log(`Chunks in index.html startup path: ${chunks.length}`);
console.log('------------------------------------------------------');
for (const c of chunks) {
  console.log(`  ${c.name.padEnd(36)} ${c.rawKiB.padStart(8)} KiB  |  ${c.gzipKiB.padStart(7)} KiB gzip`);
}
console.log('------------------------------------------------------');
const totalGzipKiB = (totalGzip / 1024).toFixed(2);
const totalRawKiB = (totalRaw / 1024).toFixed(2);
console.log(`TOTAL STARTUP JS RAW : ${totalRawKiB} KiB`);
console.log(`TOTAL STARTUP JS GZIP: ${totalGzipKiB} KiB`);
console.log(`BUDGET CEILING       : 600.00 KiB gzip`);
console.log(`TARGET BUDGET        : <= 585 - 590.00 KiB gzip`);

if (totalGzip / 1024 < 600) {
  console.log(`\nSTATUS: PASS [${totalGzipKiB} KiB gzip < 600.00 KiB ceiling]\n`);
} else {
  console.error(`\nSTATUS: FAIL [${totalGzipKiB} KiB gzip exceeds 600.00 KiB ceiling!]\n`);
  process.exit(1);
}
