import { readFile, writeFile } from 'node:fs/promises';
const file = new URL('../../packages/client-ui/wrangler.toml', import.meta.url);
const config = await readFile(file, 'utf8');
await writeFile(file, config.replace(/^BACKUP_RECOVERY_PUBLIC_KEY\s*=.*\r?\n/gm, ''));
console.log('Recovery public binding removed locally; deploy to disable the temporary recovery download. Local encrypted files preserved.');
