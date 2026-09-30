import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { verifyPortable } from './verify-portable-recovery.mjs';

const bundlePath = process.argv[2];
if (!bundlePath) throw new Error('Usage: node portable-recovery-open.mjs <encrypted-bundle.json>');
const bundle = JSON.parse(await readFile(bundlePath, 'utf8'));
if (bundle.format !== 'urefy-portable-recovery') throw new Error('Encrypted UREfy bundle required');
const nonce = randomBytes(24).toString('hex');
let port, origin;
const headers = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'same-origin', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; form-action 'self'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'" };
const html = body => `<!doctype html><html lang="ro"><meta charset="utf-8"><title>UREfy — Verificare recuperare</title><style>body{font:18px system-ui;max-width:680px;margin:6vh auto;padding:24px;background:#131819;color:#ede6d8}input,button{font:inherit;padding:12px;margin:12px 0;display:block;width:95%}button{background:#d8e9a7}</style><h1>Verificare offline UREfy</h1>${body}</html>`;
const server = createServer(async (req, res) => {
  if (req.headers.host !== `127.0.0.1:${port}` || req.url !== `/${nonce}`) { res.writeHead(403); res.end(); return; }
  if (req.method === 'GET') { res.writeHead(200, headers); res.end(html(`<p>Parola rămâne pe acest calculator. Verificarea restaurează baza de date numai în memorie. Nu conectează AWS sau Cloudflare.</p><form method="post" action="/${nonce}"><label>Parola de recuperare<input type="password" name="password" autocomplete="off" maxlength="512" required></label><button>Verifică backupul portabil</button></form>`)); return; }
  if (req.method !== 'POST' || req.headers.origin !== origin) { res.writeHead(403); res.end(); return; }
  try {
    let input = '';
    for await (const chunk of req) { input += chunk; if (input.length > 4096) throw new Error('Input too large'); }
    const values = new URLSearchParams(input), password = values.get('password');
    if (!password || password.length > 512) throw new Error('Password required');
    const proof = await verifyPortable(bundle, password);
    values.delete('password'); input = '';
    console.log(JSON.stringify(proof));
    res.writeHead(200, headers); res.end(html(`<p><strong>Recuperare verificată.</strong></p><p>${proof.tableCount} tabele, ${proof.totalRecords} înregistrări, ${proof.objectCount} fișiere. Integritate SQLite: ${proof.integrity}. Relații invalide: ${proof.foreignKeyViolations}.</p><p>Nu a fost modificată baza live și nu au fost salvate date decriptate pe disc.</p>`));
  } catch { res.writeHead(400, headers); res.end(html(`<p>Parola nu deschide acest pachet sau integritatea nu poate fi verificată. <a href="/${nonce}">Încearcă din nou</a>.</p>`)); }
});
server.listen(0, '127.0.0.1', () => { port = server.address().port; origin = `http://127.0.0.1:${port}`; console.log(JSON.stringify({ localForm: `${origin}/${nonce}`, offlineRecovery: true })); });
setTimeout(() => server.close(), 30 * 60 * 1000).unref();
