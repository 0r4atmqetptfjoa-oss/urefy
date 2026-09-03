/**
 * AETHERIS HYBRID SUITE - CRYPTOGRAPHIC PIXEL CANVAS STEGANOGRAPHY
 * Sovereign End-to-End Encrypted LSB (Least Significant Bit) Steganography.
 *
 * Conceals encrypted seed backups, key material, and confidential transmissions
 * within PNG image pixels with zero visual degradation.
 *
 * Packet Format:
 * [12 bytes Magic: "AETH_STEG_01"]
 * [1 byte: isEncrypted flag (0 or 1)]
 * [4 bytes: payload length in big-endian uint32]
 * [Payload / Ciphertext bytes]
 *
 * LSB Encoding:
 * Encodes 2 bits per color channel across Red, Green, and Blue (6 bits per pixel).
 * The Alpha channel is maintained at 255 (opaque) to eliminate browser premultiplication
 * and transparency compression distortion.
 */

export const STEG_MAGIC_STRING = 'AETH_STEG_01';
export const STEG_MAGIC_BYTES = new Uint8Array([65, 69, 84, 72, 95, 83, 84, 69, 71, 95, 48, 49]); // "AETH_STEG_01"
export const HEADER_SIZE_BYTES = 17; // 12 magic + 1 isEncrypted + 4 length
export const PBKDF2_ITERATIONS = 50000;
export const SALT_LENGTH = 16;
export const IV_LENGTH = 12;

export interface SteganographyResult {
  payload: string;
  isEncrypted: boolean;
}

export interface MinimalImageDataLike {
  width: number;
  height: number;
  data: Uint8ClampedArray | Uint8Array;
}

/**
 * Derives an AES-256-GCM CryptoKey from a passphrase and salt using PBKDF2 with SHA-256.
 */
async function deriveEncryptionKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts payload string using AES-256-GCM with a PBKDF2 derived key.
 * Prepends the 16-byte salt and 12-byte IV to the ciphertext.
 */
async function encryptPayloadWithPassphrase(payload: string, passphrase: string): Promise<Uint8Array> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const aesKey = await deriveEncryptionKey(passphrase, salt);

  const encodedPayload = new TextEncoder().encode(payload);
  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
    },
    aesKey,
    encodedPayload as unknown as BufferSource
  );

  const ciphertext = new Uint8Array(ciphertextBuffer);
  const combined = new Uint8Array(salt.length + iv.length + ciphertext.length);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(ciphertext, salt.length + iv.length);
  return combined;
}

/**
 * Decrypts AES-256-GCM ciphertext bytes using the passphrase.
 * Extracts the 16-byte salt, 12-byte IV, and decrypts the ciphertext.
 */
async function decryptPayloadWithPassphrase(encryptedBytes: Uint8Array, passphrase?: string): Promise<string> {
  if (!passphrase || passphrase.length === 0) {
    throw new Error('Invalid steganography decryption passphrase');
  }

  if (encryptedBytes.length < SALT_LENGTH + IV_LENGTH + 16) {
    throw new Error('Invalid steganography decryption passphrase');
  }

  const salt = encryptedBytes.subarray(0, SALT_LENGTH);
  const iv = encryptedBytes.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertext = encryptedBytes.subarray(SALT_LENGTH + IV_LENGTH);

  try {
    const aesKey = await deriveEncryptionKey(passphrase, salt);
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as unknown as BufferSource,
      },
      aesKey,
      ciphertext as unknown as BufferSource
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch (_err) {
    throw new Error('Invalid steganography decryption passphrase');
  }
}

/**
 * Extracts pixel data and canvas context from input.
 */
function extractImageDataFromCanvasOrData(source: HTMLCanvasElement | ImageData): {
  imageData: ImageData | MinimalImageDataLike;
  canvas: HTMLCanvasElement | null;
  ctx: CanvasRenderingContext2D | null;
} {
  if ('data' in source && typeof source.width === 'number' && typeof source.height === 'number') {
    return {
      imageData: source,
      canvas: null,
      ctx: null,
    };
  }

  const canvas = source as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get 2D context from canvas');
  }
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { imageData, canvas, ctx };
}

/**
 * Encodes secret payload data into the LSB bits of a Canvas or ImageData.
 *
 * @param canvas - Target HTMLCanvasElement or ImageData
 * @param payload - Secret text, seed backup, or serialized confidential payload
 * @param passphrase - Optional passphrase. If provided, payload is encrypted using AES-256-GCM.
 * @returns Promise resolving to the modified HTMLCanvasElement
 */
export async function encodeSteganography(
  canvas: HTMLCanvasElement | ImageData,
  payload: string,
  passphrase?: string
): Promise<HTMLCanvasElement> {
  const { imageData, canvas: existingCanvas, ctx: existingCtx } = extractImageDataFromCanvasOrData(canvas);

  let payloadBytes: Uint8Array;
  let isEncryptedFlag = 0;

  if (passphrase !== undefined && passphrase !== null && passphrase.length > 0) {
    payloadBytes = await encryptPayloadWithPassphrase(payload, passphrase);
    isEncryptedFlag = 1;
  } else {
    payloadBytes = new TextEncoder().encode(payload);
    isEncryptedFlag = 0;
  }

  const packetBytes = HEADER_SIZE_BYTES + payloadBytes.length;
  const requiredPixels = Math.ceil((packetBytes * 8) / 6);
  const totalPixels = imageData.width * imageData.height;

  if (totalPixels < requiredPixels) {
    throw new Error('Image resolution too small to hold payload');
  }

  // Construct binary packet
  // [12 bytes Magic: "AETH_STEG_01"] + [1 byte: isEncrypted flag] + [4 bytes: payload length big-endian] + [Payload]
  const packet = new Uint8Array(packetBytes);
  packet.set(STEG_MAGIC_BYTES, 0);
  packet[12] = isEncryptedFlag;

  const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
  view.setUint32(13, payloadBytes.length, false); // big-endian
  packet.set(payloadBytes, HEADER_SIZE_BYTES);

  // Encode bits sequentially into 2 LSB bits of Red, Green, Blue channels.
  // Alpha channel is locked to 255.
  const data = imageData.data;
  const totalDibits = packetBytes * 4;

  for (let i = 0; i < totalDibits; i++) {
    const pixelIndex = Math.floor(i / 3);
    const channelOffset = i % 3; // 0=R, 1=G, 2=B
    const byteIndex = Math.floor(i / 4);
    const bitShift = 6 - (i % 4) * 2;
    const dibit = (packet[byteIndex] >> bitShift) & 0x03;

    const dataIndex = pixelIndex * 4 + channelOffset;
    data[dataIndex] = (data[dataIndex] & 0xfc) | dibit;
    data[pixelIndex * 4 + 3] = 255; // Keep Alpha opaque
  }

  // Also ensure any remaining pixels in the canvas have Alpha 255 to prevent browser transparency distortion
  const totalDataLength = totalPixels * 4;
  for (let p = Math.floor(totalDibits / 3) * 4 + 3; p < totalDataLength; p += 4) {
    data[p] = 255;
  }

  // Write back to canvas
  if (existingCanvas && existingCtx) {
    existingCtx.putImageData(imageData as ImageData, 0, 0);
    return existingCanvas;
  }

  if (typeof document !== 'undefined' && document.createElement) {
    const newCanvas = document.createElement('canvas');
    newCanvas.width = imageData.width;
    newCanvas.height = imageData.height;
    const newCtx = newCanvas.getContext('2d');
    if (newCtx) {
      if (typeof ImageData !== 'undefined' && !(imageData instanceof ImageData)) {
        const domData = new ImageData(
          (imageData.data instanceof Uint8ClampedArray ? imageData.data : new Uint8ClampedArray(imageData.data)) as any,
          imageData.width,
          imageData.height
        );
        newCtx.putImageData(domData, 0, 0);
      } else {
        newCtx.putImageData(imageData as ImageData, 0, 0);
      }
    }
    return newCanvas;
  }

  // Headless test fallback wrapper
  return {
    width: imageData.width,
    height: imageData.height,
    getContext: () => ({
      getImageData: () => imageData,
      putImageData: () => {},
    }),
    toBlob: (cb: (b: Blob | null) => void) => {
      cb(new Blob([imageData.data.buffer as ArrayBuffer], { type: 'image/png' }));
    },
    toDataURL: () => '',
  } as unknown as HTMLCanvasElement;
}

/**
 * Decodes secret payload data from the LSB bits of a Canvas or ImageData.
 *
 * @param canvas - Target HTMLCanvasElement or ImageData
 * @param passphrase - Optional decryption passphrase (required if payload was encrypted)
 * @returns Object containing decoded payload text and isEncrypted flag
 */
export async function decodeSteganography(
  canvas: HTMLCanvasElement | ImageData,
  passphrase?: string
): Promise<SteganographyResult> {
  const { imageData } = extractImageDataFromCanvasOrData(canvas);
  const totalPixels = imageData.width * imageData.height;
  const headerRequiredPixels = Math.ceil((HEADER_SIZE_BYTES * 8) / 6);

  if (totalPixels < headerRequiredPixels) {
    throw new Error('No sovereign steganographic payload found in image');
  }

  const data = imageData.data;

  // Extract header bytes (17 bytes = 68 dibits)
  const header = new Uint8Array(HEADER_SIZE_BYTES);
  const headerDibits = HEADER_SIZE_BYTES * 4;

  for (let i = 0; i < headerDibits; i++) {
    const pixelIndex = Math.floor(i / 3);
    const channelOffset = i % 3;
    const byteIndex = Math.floor(i / 4);
    const bitShift = 6 - (i % 4) * 2;
    const dibit = data[pixelIndex * 4 + channelOffset] & 0x03;
    header[byteIndex] |= dibit << bitShift;
  }

  // Validate magic signature "AETH_STEG_01"
  for (let i = 0; i < STEG_MAGIC_BYTES.length; i++) {
    if (header[i] !== STEG_MAGIC_BYTES[i]) {
      throw new Error('No sovereign steganographic payload found in image');
    }
  }

  const isEncrypted = header[12] === 1;
  const headerView = new DataView(header.buffer, header.byteOffset, header.byteLength);
  const payloadLength = headerView.getUint32(13, false); // big-endian

  const totalPacketBytes = HEADER_SIZE_BYTES + payloadLength;
  const requiredPixels = Math.ceil((totalPacketBytes * 8) / 6);

  if (payloadLength < 0 || totalPixels < requiredPixels) {
    throw new Error('No sovereign steganographic payload found in image');
  }

  // Extract payload bytes
  const payloadBytes = new Uint8Array(payloadLength);
  const payloadDibits = payloadLength * 4;

  for (let i = 0; i < payloadDibits; i++) {
    const globalDibitIndex = headerDibits + i;
    const pixelIndex = Math.floor(globalDibitIndex / 3);
    const channelOffset = globalDibitIndex % 3;
    const byteIndex = Math.floor(i / 4);
    const bitShift = 6 - (i % 4) * 2;
    const dibit = data[pixelIndex * 4 + channelOffset] & 0x03;
    payloadBytes[byteIndex] |= dibit << bitShift;
  }

  if (isEncrypted) {
    const decryptedPayload = await decryptPayloadWithPassphrase(payloadBytes, passphrase);
    return {
      payload: decryptedPayload,
      isEncrypted: true,
    };
  } else {
    const plaintext = new TextDecoder().decode(payloadBytes);
    return {
      payload: plaintext,
      isEncrypted: false,
    };
  }
}

/**
 * Converts an HTMLCanvasElement into a PNG Blob suitable for download or file transfer.
 */
export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to PNG Blob'));
        }
      }, 'image/png');
    } else {
      resolve(new Blob([], { type: 'image/png' }));
    }
  });
}

/**
 * Loads an image File or Blob into an HTMLCanvasElement.
 */
export function fileToCanvas(file: Blob): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    if (typeof Image === 'undefined' || typeof document === 'undefined') {
      reject(new Error('DOM Image/Canvas is not supported in current environment'));
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get 2D rendering context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image file'));
    };
    img.src = url;
  });
}

/**
 * Calculates maximum payload storage capacity in bytes for given image dimensions.
 */
export function calculateImageCapacity(width: number, height: number): number {
  const totalPixels = width * height;
  const totalBits = totalPixels * 6; // 2 bits each for R, G, B
  const totalBytes = Math.floor(totalBits / 8);
  return Math.max(0, totalBytes - HEADER_SIZE_BYTES);
}
