import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExportBackupManager } from '../src/export-backup.js';

const manager = new ExportBackupManager();
let writes: ReturnType<typeof vi.fn>;

async function fileFor(fields: Record<string, unknown>): Promise<File> {
  const payload = { manifest: { version: '1.4.0', checksum: '' }, ...fields };
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(payload)));
  payload.manifest.checksum = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
  return new File([JSON.stringify(payload)], 'backup.json');
}

beforeEach(() => {
  writes = vi.fn();
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: writes });
});
afterEach(() => vi.unstubAllGlobals());

describe('Backup import validation before writes', () => {
  it.each(['includeKeys', 'includeMessages'] as const)('rejects obsolete sensitive export option %s', async option => {
    await expect(manager.exportAccount({
      includePosts: false, includeBookmarks: false, includeDrafts: false,
      includeMessages: false, includeKeys: false, includePreferences: false,
      encryptWithPassword: false, format: 'json', [option]: true,
    })).rejects.toThrow('encrypted recovery archive');
    expect(writes).not.toHaveBeenCalled();
  });

  it.each([
    { keys: { aetheris_master_seed: 'private-seed' } },
    { messages: [{ id: 'private', plaintext: 'confidential' }] },
    { preferences: { aetheris_master_seed: 'injected' } },
    { virtualFiles: { 'vault/cryptographic_identity.json': '{"aetheris_master_seed":"injected"}' } },
    { virtualFiles: { 'config/preferences.json': '{"aetheris_admin_token":"injected"}' } },
  ])('refuses sensitive or arbitrary state: %j', async fields => {
    const file = await fileFor({ posts: [{ id: 'post' }], ...fields });
    await expect(manager.importAccount(file)).rejects.toThrow(/Legacy|unsupported/);
    expect(writes).not.toHaveBeenCalled();
  });

  it('rejects tampered content before restoring any category', async () => {
    const file = await fileFor({ posts: [{ id: 'original' }] });
    const tampered = new File([(await file.text()).replace('original', 'tampered')], 'backup.json');
    await expect(manager.importAccount(tampered)).rejects.toThrow('checksum');
    expect(writes).not.toHaveBeenCalled();
  });

  it('restores an allowed preference with a valid checksum', async () => {
    const file = await fileFor({ preferences: { aetheris_theme: 'light' } });
    await expect(manager.importAccount(file)).resolves.toEqual({ imported: 1, errors: 0 });
    expect(writes).toHaveBeenCalledWith('aetheris_theme', 'light');
  });
});
