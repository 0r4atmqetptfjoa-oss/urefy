import { describe, it, expect, beforeEach } from 'vitest';
import { PaperWalletEngine } from '../src/paper-wallet';
import { clientStore } from '../src/client-state.js';
import { deriveKeyPairFromMnemonic, validateMnemonic } from '@aetheris/core-crypto';

describe('PaperWalletEngine — Cold Storage Mnemonic Generator', () => {
  let engine: PaperWalletEngine;

  beforeEach(() => {
    clientStore.mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    clientStore.keypair = deriveKeyPairFromMnemonic(clientStore.mnemonic);
    engine = new PaperWalletEngine();
  });

  it('returns only the actual recovery phrase matching the current identity', () => {
    const words1 = engine.generateMnemonic(clientStore.keypair.fingerprint);
    const words2 = engine.generateMnemonic(clientStore.keypair.fingerprint);
    expect(words1.length).toBe(12);
    expect(words1).toEqual(words2);
    expect(validateMnemonic(words1.join(' '))).toBe(true);
    expect(deriveKeyPairFromMnemonic(words1.join(' ')).fingerprint).toBe(clientStore.keypair.fingerprint);
    expect(engine.generateMnemonic('another-identity')).toEqual([]);
  });

  it('keeps recovery words out of the DOM until explicitly revealed', () => {
    engine.open();
    expect(engine.renderPaperWalletModal(clientStore.keypair.fingerprint, clientStore.keypair.publicKeyHex)).not.toContain('abandon');
    engine.toggleReveal();
    expect(engine.renderPaperWalletModal(clientStore.keypair.fingerprint, clientStore.keypair.publicKeyHex)).toContain('abandon');
    engine.close();
    expect(engine.isRevealed).toBe(false);
  });

  it('should toggle paper wallet modal open/close state and render printable certificate', () => {
    expect(engine.isOpen).toBe(false);
    engine.open();
    expect(engine.isOpen).toBe(true);

    const html = engine.renderPaperWalletModal('fp-node-998877', 'abcdef0123456789');
    expect(html).toContain('Sovereign Paper Wallet Certificate');
    expect(html).toContain('@id:fp-node-998877');
    expect(html).toContain('btn-print-paper-wallet');
    expect(html).toContain('btn-close-paper-wallet');

    engine.close();
    expect(engine.isOpen).toBe(false);
  });

  it('should sanitize XSS vectors in fingerprint and public key parameters', () => {
    engine.open();
    const maliciousFp = '<script>alert("xss")</script>';
    const maliciousKey = '<img src=x onerror=alert(1)>';
    const html = engine.renderPaperWalletModal(maliciousFp, maliciousKey);

    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;');
  });

  it('should zeroize memory buffer in-place', async () => {
    const { zeroizeBuffer } = await import('../src/paper-wallet');
    const sensitiveWords = ['secret', 'mnemonic', 'phrase'];
    zeroizeBuffer(sensitiveWords);
    expect(sensitiveWords.every(w => w === '')).toBe(true);

    const sensitiveBytes = new Uint8Array([1, 2, 3, 4]);
    zeroizeBuffer(sensitiveBytes);
    expect(sensitiveBytes.every(b => b === 0)).toBe(true);
  });
});
