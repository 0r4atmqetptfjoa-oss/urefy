import fs from 'node:fs';
import zlib from 'node:zlib';

const html = fs.readFileSync('packages/client-ui/dist/index.html', 'utf8');
const jsRegex = /(?:src|href)="([^"]+\.js)"/g;
const cssRegex = /(?:src|href)="([^"]+\.css)"/g;

function getFiles(regex) {
  const matches = [];
  let m;
  while ((m = regex.exec(html)) !== null) matches.push(m[1]);
  return [...new Set(matches)];
}

const jsFiles = getFiles(jsRegex);
const cssFiles = getFiles(cssRegex);

function measure(files) {
  let raw = 0;
  let gz = 0;
  files.forEach((f) => {
    const cleanPath = f.startsWith('/') ? f.slice(1) : f;
    const p = 'packages/client-ui/dist/' + cleanPath;
    if (fs.existsSync(p)) {
      const b = fs.readFileSync(p);
      raw += b.length;
      gz += zlib.gzipSync(b).length;
    }
  });
  return { rawKiB: Number((raw / 1024).toFixed(2)), gzipKiB: Number((gz / 1024).toFixed(2)), count: files.length };
}

const jsStats = measure(jsFiles);
const cssStats = measure(cssFiles);

console.log('=== STARTUP BUNDLE AUDIT ===');
console.log(`JavaScript: ${jsStats.gzipKiB} KiB gzip across ${jsStats.count} chunks (Raw: ${jsStats.rawKiB} KiB)`);
console.log(`CSS:        ${cssStats.gzipKiB} KiB gzip across ${cssStats.count} files  (Raw: ${cssStats.rawKiB} KiB)`);
console.log(`Ceiling:    600.00 KiB gzip for JavaScript`);
console.log(`Passed:     ${jsStats.gzipKiB <= 600.0 ? 'YES' : 'NO'} (Remaining: ${(600.0 - jsStats.gzipKiB).toFixed(2)} KiB)`);
