import { describe, it, expect } from 'vitest';
import {
  computeFileSha256,
  verifyCriticalFilesIntegrity,
  verifyWorkspaceStructure,
  scanDirectoryForSecrets,
  runVerification,
  CRITICAL_FILES,
} from './verify-release.mjs';

describe('Etapa 6: Deterministic Release Verification Gate', () => {
  it('computes valid 64-character lowercase hexadecimal SHA-256 digests for critical files', () => {
    const rootPkgSha256 = computeFileSha256('package.json');
    expect(rootPkgSha256).toMatch(/^[0-9a-f]{64}$/);

    const gitattributesSha256 = computeFileSha256('.gitattributes');
    expect(gitattributesSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('verifies all critical repository files exist and generate SHA-256 hashes', () => {
    const hashes = verifyCriticalFilesIntegrity();
    expect(Object.keys(hashes).length).toBe(CRITICAL_FILES.length);
    for (const file of CRITICAL_FILES) {
      expect(hashes[file]).toBeDefined();
      expect(hashes[file]).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('verifies monorepo workspaces and packages configuration', () => {
    const info = verifyWorkspaceStructure();
    expect(info.rootVersion).toBeDefined();
    expect(info.workspaces.length).toBeGreaterThanOrEqual(4);

    const pkgNames = info.workspaces.map((w) => w.name);
    expect(pkgNames).toContain('@aetheris/client-ui');
    expect(pkgNames).toContain('@aetheris/core-crypto');
    expect(pkgNames).toContain('@aetheris/vault-engine');
  });

  it('scans package directories and detects zero hardcoded secrets', () => {
    const result = runVerification();
    expect(result.success).toBe(true);
    expect(Object.keys(result.fileHashes).length).toBeGreaterThan(0);
  });
});
