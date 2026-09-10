import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, relative, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function rebrandProduct(text) {
  return text
    .replace(/\b(?:Aetheris Omni-Sphere|AETHERIS OMNI-SPHERE)\b/g, 'UREfy')
    .replace(/\b(?:Aetheris|AETHERIS)\b(?!\sNetwork)(?![\w:/-]|\.[A-Za-z0-9])/g, 'UREfy')
    .replace(/(\.download\s*=\s*['"`])aetheris/g, '$1urefy')
    .replaceAll('https://aetheris.network', 'https://urefy.com')
    .replaceAll('legal@aetheris.network', 'razvan@urefy.com')
    .replaceAll('Aetheris-Desktop', 'UREfy-Desktop')
    .replaceAll('Aetheris-Vault-CLI', 'UREfy-Vault-CLI');
}

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return filesUnder(path);
    return ['.ts', '.js', '.html', '.md', '.txt', '.svg', '.css'].includes(extname(path)) ? [path] : [];
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const directories = ['packages/client-ui/src', 'packages/client-ui/test', 'packages/client-ui/functions', 'packages/client-ui/public', 'packages/server-edge/src', 'packages/daemon-archivist/src'];
  const files = directories.flatMap(directory => filesUnder(resolve(root, directory)));
  files.push(...readdirSync(root).filter(name => name.endsWith('.md')).map(name => resolve(root, name)));
  files.push(resolve(root, 'packages/client-ui/index.html'), resolve(root, 'packages/client-ui/admin.html'));
  const changed = [];
  for (const file of files) {
    if (file === resolve(root, 'packages/client-ui/src/brand.ts')) continue;
    const before = readFileSync(file, 'utf8');
    const after = rebrandProduct(before);
    if (before === after) continue;
    changed.push(relative(root, file));
    if (process.argv.includes('--write')) writeFileSync(file, after);
  }
  console.log(`${changed.length} files ${process.argv.includes('--write') ? 'updated' : 'contain legacy product text'}.`);
  console.log(changed.join('\n'));
  if (process.argv.includes('--check') && changed.length) process.exitCode = 1;
}