import { describe, it, expect, vi } from 'vitest';
import { wrapBackupRecoveryKey } from '../functions/api/_backup-recovery.js';
import { onRequestPost, onRequestGet } from '../functions/api/backup-recovery.js';

describe('infrastructure backup recovery envelope', () => {
  it('wraps only the derived backup key for the intended local recipient', async () => {
    const pair = await crypto.subtle.generateKey({ name: 'RSA-OAEP', hash: 'SHA-256', modulusLength: 3072, publicExponent: new Uint8Array([1, 0, 1]) }, true, ['encrypt', 'decrypt']);
    const der = new Uint8Array(await crypto.subtle.exportKey('spki', pair.publicKey));
    const envelope = await wrapBackupRecoveryKey('synthetic-backup-secret', btoa(String.fromCharCode(...der)));
    const actual = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, pair.privateKey, Uint8Array.from(atob(envelope.wrappedKey), c => c.charCodeAt(0)));
    const expected = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('synthetic-backup-secret'));
    expect(new Uint8Array(actual)).toEqual(new Uint8Array(expected));
    expect(JSON.stringify(envelope)).not.toContain('synthetic-backup-secret');
    expect(envelope.recipientKeySha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('rejects invalid recipient material', async () => {
    await expect(wrapBackupRecoveryKey('synthetic-backup-secret', 'invalid')).rejects.toThrow();
  });
});

describe('fixed encrypted recovery endpoint', () => {
  const token = 'synthetic-cron-token-with-more-than-32-characters';
  const request = (suffix = '', body?: string) => new Request(`https://urefy.com/api/backup-recovery${suffix}`, {
    method: 'POST', headers: { 'X-Cron-Secret': token }, body,
  });
  it('requires authenticated POST and disables recovery without configuration', async () => {
    expect(onRequestGet().status).toBe(405);
    expect((await onRequestPost({ request: new Request('https://urefy.com/api/backup-recovery', { method: 'POST' }), env: { CRON_SECRET: token } })).status).toBe(401);
    expect((await onRequestPost({ request: request(), env: { CRON_SECRET: token } })).status).toBe(503);
  });
  it('rejects arbitrary snapshot keys, restore parameters and bodies', async () => {
    const env = { CRON_SECRET: token, BACKUP_ENCRYPTION_KEY: 'synthetic-backup-secret', BACKUP_RECOVERY_PUBLIC_KEY: 'configured' };
    for (const req of [request('?key=private-object'), request('?action=restore'), request('', 'payload')]) {
      expect((await onRequestPost({ request: req, env })).status).toBe(400);
    }
  });
  it('rejects missing dedicated key and ciphertext integrity mismatches', async () => {
    expect((await onRequestPost({ request: request(), env: { CRON_SECRET: token, BACKUP_RECOVERY_PUBLIC_KEY: 'configured', ADMIN_PIN: 'synthetic-other-secret' } })).status).toBe(503);
    const cipher = new Uint8Array(40);
    const get = vi.fn().mockResolvedValue({ size: cipher.length, customMetadata: { sha256: 'wrong' }, arrayBuffer: async () => cipher.buffer });
    const response = await onRequestPost({ request: request(), env: { CRON_SECRET: token, BACKUP_ENCRYPTION_KEY: 'synthetic-backup-secret', BACKUP_RECOVERY_PUBLIC_KEY: 'configured', STORAGE_BUCKET: { get } as any } });
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain('synthetic-backup-secret');
    expect(get).toHaveBeenCalledWith('backups/d1-snapshot-daily.enc');
  });
  it('returns only ciphertext and a key wrapped for the configured owner', async () => {
    const pair = await crypto.subtle.generateKey({ name: 'RSA-OAEP', hash: 'SHA-256', modulusLength: 3072, publicExponent: new Uint8Array([1, 0, 1]) }, true, ['encrypt', 'decrypt']);
    const der = new Uint8Array(await crypto.subtle.exportKey('spki', pair.publicKey));
    const publicKey = btoa(String.fromCharCode(...der));
    const cipher = new Uint8Array(40);
    crypto.getRandomValues(cipher);
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', cipher));
    const sha256 = Array.from(digest, b => b.toString(16).padStart(2, '0')).join('');
    const get = vi.fn().mockResolvedValue({ size: cipher.length, customMetadata: { sha256 }, arrayBuffer: async () => cipher.buffer });
    const response = await onRequestPost({ request: request(), env: { CRON_SECRET: token, BACKUP_ENCRYPTION_KEY: 'synthetic-backup-secret', BACKUP_RECOVERY_PUBLIC_KEY: publicKey, STORAGE_BUCKET: { get } as any } });
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    const payload = await response.json();
    expect(JSON.stringify(payload)).not.toContain('synthetic-backup-secret');
    expect(JSON.stringify(payload)).not.toContain(token);
    expect(Uint8Array.from(atob(payload.ciphertextBase64), c => c.charCodeAt(0))).toEqual(cipher);
    const key = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, pair.privateKey, Uint8Array.from(atob(payload.envelope.wrappedKey), c => c.charCodeAt(0)));
    expect(new Uint8Array(key)).toEqual(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('synthetic-backup-secret'))));
  });
});
