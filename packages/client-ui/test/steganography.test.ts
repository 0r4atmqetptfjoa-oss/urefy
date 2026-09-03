import { describe, it, expect } from 'vitest';
import {
  encodeSteganography,
  decodeSteganography,
  calculateImageCapacity,
  canvasToPngBlob,
  MinimalImageDataLike,
} from '../src/steganography';

function createMockImageData(width: number, height: number): MinimalImageDataLike {
  const data = new Uint8ClampedArray(width * height * 4);
  // Fill with dummy image pattern
  for (let i = 0; i < data.length; i += 4) {
    data[i] = (i * 7) % 256;       // R
    data[i + 1] = (i * 13) % 256;  // G
    data[i + 2] = (i * 29) % 256;  // B
    data[i + 3] = 255;             // A
  }
  return { width, height, data };
}

describe('Cryptographic Pixel Canvas Steganography (LSB E2EE)', () => {
  it('should encode and decode plaintext payload into pixel buffers without passphrase', async () => {
    const imgData = createMockImageData(80, 80);
    const secret = 'Sovereign Seed Backup: alpha bravo charlie delta echo foxtrot golf hotel';

    const canvas = await encodeSteganography(imgData as unknown as ImageData, secret);
    expect(canvas).toBeDefined();

    const decoded = await decodeSteganography(canvas);
    expect(decoded.isEncrypted).toBe(false);
    expect(decoded.payload).toBe(secret);
  });

  it('should encrypt with PBKDF2/AES-256-GCM and decrypt with correct passphrase', async () => {
    const imgData = createMockImageData(100, 100);
    const secret = 'Confidential Transmission: Ed25519 recovery key #98412';
    const passphrase = 'Sovereign_Shield_Passphrase_2026!';

    const canvas = await encodeSteganography(imgData as unknown as ImageData, secret, passphrase);
    expect(canvas).toBeDefined();

    const decoded = await decodeSteganography(canvas, passphrase);
    expect(decoded.isEncrypted).toBe(true);
    expect(decoded.payload).toBe(secret);
  });

  it('should reject decryption when passphrase is incorrect or omitted for encrypted payload', async () => {
    const imgData = createMockImageData(80, 80);
    const secret = 'Airgapped vault mnemonic phrase';
    const passphrase = 'UltraSecureKey123';

    const canvas = await encodeSteganography(imgData as unknown as ImageData, secret, passphrase);

    // Wrong passphrase
    await expect(decodeSteganography(canvas, 'WrongPassword')).rejects.toThrow(
      'Invalid steganography decryption passphrase'
    );

    // Missing passphrase
    await expect(decodeSteganography(canvas)).rejects.toThrow(
      'Invalid steganography decryption passphrase'
    );
  });

  it('should reject non-steganographic images missing the magic signature', async () => {
    const normalImage = createMockImageData(50, 50);

    await expect(decodeSteganography(normalImage as unknown as ImageData)).rejects.toThrow(
      'No sovereign steganographic payload found in image'
    );
  });

  it('should throw error when image resolution is too small to hold the payload', async () => {
    const tinyImage = createMockImageData(3, 3); // 9 pixels, header alone needs 23 pixels
    const secret = 'Payload that will not fit';

    await expect(encodeSteganography(tinyImage as unknown as ImageData, secret)).rejects.toThrow(
      'Image resolution too small to hold payload'
    );
  });

  it('should preserve the Alpha channel at 255 for all encoded pixels', async () => {
    const imgData = createMockImageData(40, 40);
    // Set some pixels to transparent initially
    for (let i = 3; i < imgData.data.length; i += 4) {
      imgData.data[i] = 120;
    }

    const canvas = await encodeSteganography(imgData as unknown as ImageData, 'Sovereign Alpha Test');
    const ctx = canvas.getContext('2d');
    const modifiedData = ctx?.getImageData(0, 0, canvas.width, canvas.height) || imgData;

    // Check that encoded pixels have alpha 255
    for (let i = 3; i < modifiedData.data.length; i += 4) {
      expect(modifiedData.data[i]).toBe(255);
    }
  });

  it('should correctly calculate image capacity based on dimensions', () => {
    // 100 x 100 pixels = 10,000 pixels * 6 bits = 60,000 bits = 7,500 bytes.
    // Capacity = 7,500 - 17 header bytes = 7,483 bytes.
    const cap100x100 = calculateImageCapacity(100, 100);
    expect(cap100x100).toBe(7483);

    // Zero or tiny image
    expect(calculateImageCapacity(2, 2)).toBe(0);
  });

  it('should handle symbols, emojis, and punctuation in steganographic payload', async () => {
    const imgData = createMockImageData(70, 70);
    const complexSecret = '🛡️ SOVEREIGN ENCLAVE 🔐 — 🔑 MNEMONIC SEED BACKUP #49281 ⚡';

    const canvas = await encodeSteganography(imgData as unknown as ImageData, complexSecret, 'ShieldKey');
    const decoded = await decodeSteganography(canvas, 'ShieldKey');

    expect(decoded.payload).toBe(complexSecret);
    expect(decoded.isEncrypted).toBe(true);
  });

  it('should export canvas to PNG blob without crashing', async () => {
    const imgData = createMockImageData(20, 20);
    const canvas = await encodeSteganography(imgData as unknown as ImageData, 'blob test');
    const blob = await canvasToPngBlob(canvas);
    expect(blob).toBeDefined();
    expect(blob.type).toBe('image/png');
  });
});

describe('SovereignSteganographyModal UI Component', () => {
  it('should initialize closed and toggle open/close state', async () => {
    const { SovereignSteganographyModal } = await import('../src/steganography-modal');
    const modal = new SovereignSteganographyModal();

    expect(modal.isOpen).toBe(false);
    expect(modal.renderModalHTML()).toBe('');

    modal.openModal('encode');
    expect(modal.isOpen).toBe(true);
    expect(modal.activeTab).toBe('encode');

    const htmlEncode = modal.renderModalHTML();
    expect(htmlEncode).toContain('Pixel Canvas Steganography');
    expect(htmlEncode).toContain('tab-steg-encode');
    expect(htmlEncode).toContain('input-steg-payload');
    expect(htmlEncode).toContain('input-steg-passphrase');
    expect(htmlEncode).toContain('btn-steg-encode-execute');

    modal.openModal('decode');
    expect(modal.activeTab).toBe('decode');
    const htmlDecode = modal.renderModalHTML();
    expect(htmlDecode).toContain('tab-steg-decode');
    expect(htmlDecode).toContain('steg-decode-dropzone');
    expect(htmlDecode).toContain('btn-steg-decode-execute');

    modal.closeModal();
    expect(modal.isOpen).toBe(false);
    expect(modal.renderModalHTML()).toBe('');
  });

  it('should sanitize XSS vectors in payload and status rendering', async () => {
    const { SovereignSteganographyModal } = await import('../src/steganography-modal');
    const modal = new SovereignSteganographyModal();
    modal.openModal('decode');

    modal.revealedPayload = '<script>alert("xss")</script><img src=x onerror=alert(1)>';
    modal.decodeStatus = {
      text: '<svg onload=alert(2)> Malicious Status',
      type: 'error',
    };

    const html = modal.renderModalHTML();
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<svg onload=alert(2)>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&lt;svg onload=alert(2)&gt;');
  });

  it('should generate procedural carrier canvas with valid dimensions', async () => {
    const { SovereignSteganographyModal } = await import('../src/steganography-modal');
    const modal = new SovereignSteganographyModal();

    const origDocument = (globalThis as any).document;
    (globalThis as any).document = {
      createElement: (tag: string) => ({
        tagName: tag.toUpperCase(),
        width: 0,
        height: 0,
        className: '',
        id: '',
        innerHTML: '',
        style: {},
        setAttribute: () => {},
        getAttribute: () => null,
        appendChild: (c: any) => c,
        removeChild: (c: any) => c,
        addEventListener: () => {},
        removeEventListener: () => {},
        getContext: () => ({
          createRadialGradient: () => ({ addColorStop: () => {} }),
          fillRect: () => {},
          beginPath: () => {},
          moveTo: () => {},
          lineTo: () => {},
          stroke: () => {},
        }),
      }),
      getElementById: () => null,
      body: {
        appendChild: () => {},
        removeChild: () => {},
      },
    };

    const canvas = modal.generateProceduralCanvas(256, 256);
    expect(canvas).toBeDefined();
    expect(canvas.width).toBe(256);
    expect(canvas.height).toBe(256);

    if (origDocument) {
      (globalThis as any).document = origDocument;
    } else {
      delete (globalThis as any).document;
    }
  });

  it('should populate secret payload from clientStore active mnemonic', async () => {
    const { SovereignSteganographyModal } = await import('../src/steganography-modal');
    const { clientStore } = await import('../src/client-state');
    const modal = new SovereignSteganographyModal();

    clientStore.mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    modal.populateFromMnemonic();

    expect(modal.encodeSecretPayload).toBe(clientStore.mnemonic);
  });
});

