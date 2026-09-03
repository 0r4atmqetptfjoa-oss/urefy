import { describe, it, expect, beforeEach } from 'vitest';
import { PaperWalletEngine } from '../src/paper-wallet';

describe('PaperWalletEngine — Cold Storage Mnemonic Generator', () => {
  let engine: PaperWalletEngine;

  beforeEach(() => {
    engine = new PaperWalletEngine();
  });

  it('should generate deterministic 12-word recovery mnemonic from fingerprint', () => {
    const words1 = engine.generateMnemonic('fingerprint-alpha-1234');
    const words2 = engine.generateMnemonic('fingerprint-alpha-1234');
    expect(words1.length).toBe(12);
    expect(words1).toEqual(words2);
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
