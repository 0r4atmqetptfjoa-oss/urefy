import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { encryptPortable } from './portable-recovery-lib.mjs';
import { verifyPortable } from './verify-portable-recovery.mjs';
import { sha256 } from './full-recovery-lib.mjs';

const dir = new URL('../../.aws-recovery/', import.meta.url);
const nonce = randomBytes(24).toString('hex');
let port, origin;
let busy = false, completed = false;
const head = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'" };
const html = body => `<!doctype html><html lang="ro"><meta charset="utf-8"><title>UREfy — Recuperare portabilă</title><style>body{background:#131819;color:#ede6d8;font:18px system-ui;max-width:650px;margin:7vh auto;padding:24px}h1{font-size:32px}input,button{font:inherit;display:block;padding:12px;margin:12px 0;width:95%}button{background:#d8e9a7;border:0;cursor:pointer}small{color:#c4c3b8}a{color:#d8e9a7}</style><h1>Recuperare UREfy pe alt calculator</h1>${body}</html>`;
const server = createServer(async (request, response) => {
  if (request.headers.host !== `127.0.0.1:${port}` || !['127.0.0.1', '::ffff:127.0.0.1'].includes(request.socket.remoteAddress)) { response.writeHead(403); response.end(); return; }
  if (request.url === `/diagnostic/${nonce}` && request.method === 'GET') {
    response.writeHead(200, head); response.end(html(`<form method="post" action="/diagnostic/${nonce}"><button>Verifică trimiterea locală fără parolă</button></form>`)); return;
  }
  if (request.url === `/diagnostic/${nonce}` && request.method === 'POST') {
    const verified = request.headers.origin === origin;
    console.log(JSON.stringify({ localFormOriginVerified: verified }));
    response.writeHead(verified ? 200 : 403, head); response.end(html(verified ? '<p>Trimiterea locală a fost verificată.</p>' : '<p>Originea locală nu a fost verificată.</p>')); return;
  }
  if (request.method === 'GET' && request.url === `/${nonce}`) {
    response.writeHead(200, head); response.end(html(completed ? '<p>Pachetul criptat a fost creat și verificat offline. Poți închide această pagină.</p>' : `<p>Alege o parolă separată de minimum 16 caractere. Păstreaz-o în afara Google Drive, de exemplu într-un manager de parole.</p><p>Parola rămâne locală și nu este salvată. Nu o trimite în chat. Pachetul conține backupurile criptate și cheia de recuperare protejată cu această parolă.</p><form method="post" action="/${nonce}"><label>Parola de recuperare<input type="password" name="password" minlength="16" maxlength="512" autocomplete="new-password" required></label><label>Repetă parola<input type="password" name="confirm" minlength="16" maxlength="512" autocomplete="new-password" required></label><button>Creează și verifică pachetul criptat</button></form>`)); return;
  }
  if (request.method !== 'POST' || request.url !== `/${nonce}` || request.headers.origin !== origin || busy || completed || !request.headers['content-type']?.startsWith('application/x-www-form-urlencoded')) {
    console.log(JSON.stringify({ rejectedRequest: true, originMatched: request.headers.origin === origin, busy, completed }));
    response.writeHead(403, head); response.end(html(`<p>Formularul trebuie redeschis de pe adresa locală curentă. <a href="/${nonce}">Redeschide formularul</a>.</p>`)); return;
  }
  busy = true;
  let pem, stage = 'form-validation';
  try {
    let body = '';
    for await (const chunk of request) { body += chunk; if (body.length > 8192) throw new Error('Input too large'); }
    const values = new URLSearchParams(body), password = values.get('password');
    if (password !== values.get('confirm') || !password || password.length < 16 || password.length > 512) throw new Error('Invalid password');
    stage = 'separate-password-validation';
    // Avoid using an existing infrastructure token/credential as the recovery password.
    const env = await readFile(new URL('../../.env', import.meta.url), 'utf8');
    for (const line of env.split(/\r?\n/)) { const m = line.match(/^\s*(AWS_SECRET_ACCESS_KEY|CRON_SECRET)\s*=\s*(.*?)\s*$/); if (m && password === m[2].replace(/^(['"])(.*)\1$/, '$2')) throw new Error('Separate password required'); }
    stage = 'local-key-open';
    const protectedPrivate = await readFile(new URL('recovery-private-key.dpapi', dir));
    const opened = spawnSync('powershell.exe', ['-NoProfile', '-File', fileURLToPath(new URL('./recovery-key-protection.ps1', import.meta.url)), '-Mode', 'unprotect'], { input: protectedPrivate.toString('base64'), encoding: 'utf8', windowsHide: true });
    if (opened.status !== 0) throw new Error('Recovery key unavailable');
    pem = Buffer.from(opened.stdout, 'base64');
    stage = 'encrypted-snapshot-read';
    const parts = {};
    for (const name of await readdir(new URL('full-parts/', dir))) if (/^[a-f0-9]{64}\.enc$/.test(name)) parts[name.slice(0, -4)] = (await readFile(new URL(`full-parts/${name}`, dir))).toString('base64');
    const payload = { version: 1, createdAt: new Date().toISOString(), privatePemBase64: pem.toString('base64'), publicKeySpki: (await readFile(new URL('recovery-public-key.spki', dir), 'utf8')).trim(), fullSnapshot: JSON.parse(await readFile(new URL('full-snapshot-envelope.json', dir), 'utf8')), legacySnapshot: JSON.parse(await readFile(new URL('snapshot-envelope.json', dir), 'utf8')), parts };
    stage = 'portable-encryption';
    const encrypted = await encryptPortable(payload, password);
    stage = 'offline-self-verification';
    const proof = await verifyPortable(encrypted, password);
    const bytes = Buffer.from(JSON.stringify(encrypted));
    const name = `urefy-portable-recovery-${Date.now()}.json`;
    stage = 'encrypted-file-write';
    await writeFile(new URL(name, dir), bytes, { flag: 'wx' });
    completed = true; payload.privatePemBase64 = ''; body = ''; values.delete('password'); values.delete('confirm');
    console.log(JSON.stringify({ completed: true, encryptedFile: fileURLToPath(new URL(name, dir)), encryptedBytes: bytes.length, checksumSha256: sha256(bytes), ...proof }));
    response.writeHead(200, head); response.end(html('<p><strong>Pachet creat și verificat offline.</strong></p><p>Cheia privată este criptată cu parola ta. Pachetul poate fi recuperat pe alt calculator fără acest profil Windows.</p><p>Agentul poate încărca acum doar pachetul criptat în Google Drive. Păstrează parola separat. Poți închide pagina.</p>'));
    setTimeout(() => server.close(), 15000);
  } catch {
    console.log(JSON.stringify({ exportFailed: true, stage, passwordLogged: false }));
    response.writeHead(400, head); response.end(html(`<p>Exportul nu a reușit. Verifică dacă parolele coincid, au minimum 16 caractere și sunt diferite de cheile infrastructurii. <a href="/${nonce}">Încearcă din nou</a>.</p>`));
  } finally { pem?.fill(0); busy = false; }
});
server.listen(0, '127.0.0.1', () => {
  port = server.address().port; origin = `http://127.0.0.1:${port}`;
  console.log(JSON.stringify({ localForm: `${origin}/${nonce}`, passwordLogged: false, networkBinding: 'loopback only' }));
});
setTimeout(() => server.close(), 30 * 60 * 1000).unref();
