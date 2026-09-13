import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateMnemonic, serializeShard, splitSecretIntoShards } from '@aetheris/core-crypto';
import { clientStore } from '../src/client-state.js';
import { socialRecoveryModal } from '../src/social-recovery-modal.js';
import { SovereignSteganographyModal } from '../src/steganography-modal.js';
import { toastManager } from '../src/toast.js';

afterEach(() => {
  vi.restoreAllMocks();
  clientStore.identityPersistence = Promise.resolve();
  socialRecoveryModal.closeModal();
});

describe('Recovery persistence and secret cleanup', () => {
  it('does not report social recovery success when the vault write fails', async () => {
    const mnemonic = generateMnemonic(128);
    const shards = splitSecretIntoShards(new TextEncoder().encode(mnemonic), 3, 2);
    socialRecoveryModal.openModal('recover');
    socialRecoveryModal.shardInputs = shards.slice(0, 2).map(serializeShard);
    const success = vi.spyOn(toastManager, 'success');
    vi.spyOn(clientStore, 'restoreIdentityFromMnemonic').mockImplementation(() => {
      clientStore.identityPersistence = Promise.reject(new Error('Vault write failed'));
      return true;
    });
    expect(await socialRecoveryModal.executeRecovery()).toBe(false);
    expect(socialRecoveryModal.isOpen).toBe(true);
    expect(success).not.toHaveBeenCalled();
  });

  it('does not close or announce PNG recovery before the vault transaction commits', async () => {
    const modal = new SovereignSteganographyModal();
    modal.openModal('decode');
    modal.revealedPayload = generateMnemonic(128);
    let commit!: () => void;
    const persistence = new Promise<void>(resolve => { commit = resolve; });
    vi.spyOn(clientStore, 'restoreIdentityFromMnemonic').mockImplementation(() => {
      clientStore.identityPersistence = persistence;
      return true;
    });
    const success = vi.spyOn(toastManager, 'success');
    const restoring = modal.restoreIdentityFromRevealed();
    expect(modal.isOpen).toBe(true);
    expect(success).not.toHaveBeenCalled();
    commit();
    await restoring;
    expect(modal.isOpen).toBe(false);
    expect(modal.revealedPayload).toBeNull();
    expect(success).toHaveBeenCalledOnce();
  });

  it('clears PNG secrets and revokes every temporary image URL on close', () => {
    const modal = new SovereignSteganographyModal();
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    modal.encodePreviewUrl = 'blob:encode';
    modal.decodePreviewUrl = 'blob:decode';
    modal.encodedBlobUrl = 'blob:result';
    modal.encodePassphrase = modal.decodePassphrase = 'secret';
    modal.encodeSecretPayload = modal.revealedPayload = 'private payload';
    modal.closeModal();
    expect(revoke).toHaveBeenCalledTimes(3);
    expect(modal.encodePassphrase + modal.decodePassphrase + modal.encodeSecretPayload).toBe('');
    expect(modal.revealedPayload).toBeNull();
  });
});
