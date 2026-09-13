import { describe, it, expect } from 'vitest';
import {
  detectImageFormat,
  validateImageBuffer,
  stripExifFromJpeg,
  computeSha256,
  processMediaFile,
  bytesToDataUrl,
  MAX_IMAGE_BYTES,
} from '../src/media-pipeline.js';

describe('Secure Client-Side Media Pipeline', () => {
  // Helper to build simulated byte arrays
  const createJpegBytes = (withExif = false): Uint8Array => {
    if (!withExif) {
      // SOI + SOS + image data + EOI
      return new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0x00, 0x08, 0x01, 0x02, 0x03, 0x04, 0xff, 0xd9]);
    }
    // SOI + APP1 (EXIF) segment + SOS + image data + EOI
    // APP1 length: 2 bytes length (including length itself, so 8 bytes = 0x00, 0x08)
    return new Uint8Array([
      0xff, 0xd8, // SOI
      0xff, 0xe1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, // APP1 marker + len 8 + "Exif"
      0xff, 0xda, 0x00, 0x08, 0x01, 0x02, 0x03, 0x04, // SOS + data
      0xff, 0xd9, // EOI
    ]);
  };

  const createPngBytes = (): Uint8Array => {
    return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
  };

  const createGifBytes = (): Uint8Array => {
    return new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00]);
  };

  const createWebpBytes = (): Uint8Array => {
    return new Uint8Array([
      0x52, 0x49, 0x46, 0x46, // "RIFF"
      0x1c, 0x00, 0x00, 0x00, // size
      0x57, 0x45, 0x42, 0x50, // "WEBP"
    ]);
  };

  it('1. should recognize magic bytes for JPEG, PNG, GIF, and WebP', () => {
    expect(detectImageFormat(createJpegBytes())).toBe('jpeg');
    expect(detectImageFormat(createPngBytes())).toBe('png');
    expect(detectImageFormat(createGifBytes())).toBe('gif');
    expect(detectImageFormat(createWebpBytes())).toBe('webp');
  });

  it('2. should reject invalid, corrupted, or spoofed buffers', () => {
    // Too short
    expect(detectImageFormat(new Uint8Array([0xff, 0xd8]))).toBeNull();

    // Plain text spoofing as image
    const textBuffer = new TextEncoder().encode('Hello world, I am not an image').buffer;
    const result = validateImageBuffer(textBuffer);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Unsupported or corrupted');

    // Executable/PE header spoofing
    const exeBuffer = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00]).buffer;
    expect(validateImageBuffer(exeBuffer).valid).toBe(false);
  });

  it('3. should enforce the 10MB size limit', () => {
    const oversizedBuffer = new ArrayBuffer(MAX_IMAGE_BYTES + 1024);
    const result = validateImageBuffer(oversizedBuffer);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds maximum allowed size');
  });

  it('4. should strip APP1 EXIF metadata from JPEG bytes in-memory', () => {
    const jpegWithExif = createJpegBytes(true);
    expect(jpegWithExif.length).toBe(20);

    const sanitized = stripExifFromJpeg(jpegWithExif);
    // Verified stripped length: 20 - (2 + 8) = 10 bytes or 12 without APP1
    expect(sanitized.length).toBeLessThan(jpegWithExif.length);

    // Verify APP1 marker 0xFF 0xE1 is no longer present
    let hasApp1 = false;
    for (let i = 0; i < sanitized.length - 1; i++) {
      if (sanitized[i] === 0xff && sanitized[i + 1] === 0xe1) {
        hasApp1 = true;
        break;
      }
    }
    expect(hasApp1).toBe(false);

    // Verify SOI (FF D8) and EOI (FF D9) remain intact
    expect(sanitized[0]).toBe(0xff);
    expect(sanitized[1]).toBe(0xd8);
    expect(sanitized[sanitized.length - 2]).toBe(0xff);
    expect(sanitized[sanitized.length - 1]).toBe(0xd9);
  });

  it('5. should compute deterministic SHA-256 hash and format data URL', async () => {
    const bytes = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05]);
    const hash = await computeSha256(bytes);
    expect(typeof hash).toBe('string');
    expect(hash.length).toBe(64);

    // Deterministic verify
    const hash2 = await computeSha256(bytes);
    expect(hash).toBe(hash2);

    const dataUrl = bytesToDataUrl(bytes, 'image/png');
    expect(dataUrl).toContain('data:image/png;base64,');
  });

  it('6. should process valid image blob through the full media pipeline', async () => {
    const jpegBytes = createJpegBytes(true);
    const blob = new Blob([jpegBytes], { type: 'image/jpeg' });

    const processed = await processMediaFile(blob, 'A cryptographic key diagram', 'diagram.jpg');
    expect(processed.id).toMatch(/^media_/);
    expect(processed.fileName).toBe('diagram.jpg');
    expect(processed.format).toBe('jpeg');
    expect(processed.mimeType).toBe('image/jpeg');
    expect(processed.altText).toBe('A cryptographic key diagram');
    expect(processed.sha256).toBeDefined();
    expect(processed.dataUrl).toContain('data:image/jpeg;base64,');
    expect(processed.byteSize).toBeLessThan(jpegBytes.length); // EXIF stripped
  });
});
