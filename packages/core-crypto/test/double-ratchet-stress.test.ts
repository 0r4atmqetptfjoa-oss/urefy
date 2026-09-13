import { describe, it, expect } from 'vitest';
import {
  initSenderSession,
  initReceiverSession,
  ratchetEncrypt,
  ratchetDecrypt,
  MAX_SKIP_MESSAGES,
  MAX_TOTAL_SKIPPED_KEYS,
  RatchetEncryptedEnvelope,
} from '../src/double-ratchet.js';
import { generateHybridKemKeyPair } from '../src/post-quantum.js';
import { sha256 } from '@noble/hashes/sha256';

describe('Double Ratchet Stress, Fuzzing & Exhaustion Resistance', () => {
  function createPairSessions() {
    const aliceKeys = generateHybridKemKeyPair();
    const bobKeys = generateHybridKemKeyPair();
    const sharedSecret = sha256(new TextEncoder().encode('sovereign-stress-test-salt'));

    const aliceSession = initSenderSession(
      aliceKeys,
      { classical: bobKeys.classicalPublicKey, pq: bobKeys.pqPublicKey },
      sharedSecret
    );
    const bobSession = initReceiverSession(bobKeys, sharedSecret);
    return { aliceSession, bobSession };
  }

  it('handles message gaps within allowed window and decrypts out-of-order correctly', async () => {
    let { aliceSession, bobSession } = createPairSessions();

    const envelopes: RatchetEncryptedEnvelope[] = [];
    const plaintexts: string[] = [];

    // Alice produces 10 messages
    for (let i = 0; i < 10; i++) {
      const text = `Message ${i}`;
      plaintexts.push(text);
      const res = await ratchetEncrypt(aliceSession, text);
      aliceSession = res.session;
      envelopes.push(res.envelope);
    }

    // Bob receives message 9 first (creating a gap of 9 skipped messages)
    const dec9 = await ratchetDecrypt(bobSession, envelopes[9]);
    bobSession = dec9.session;
    expect(dec9.plaintext).toBe(plaintexts[9]);
    expect(bobSession.skippedMessageKeys.size).toBe(9);

    // Bob now receives message 0-8 in reverse order
    for (let i = 8; i >= 0; i--) {
      const dec = await ratchetDecrypt(bobSession, envelopes[i]);
      bobSession = dec.session;
      expect(dec.plaintext).toBe(plaintexts[i]);
    }

    // After all skipped messages are consumed, skippedMessageKeys is empty
    expect(bobSession.skippedMessageKeys.size).toBe(0);
  });

  it('rejects massive message gaps exceeding MAX_SKIP_MESSAGES', async () => {
    const { aliceSession, bobSession } = createPairSessions();

    const res = await ratchetEncrypt(aliceSession, 'Hello');
    const maliciousEnvelope = {
      ...res.envelope,
      messageIndex: MAX_SKIP_MESSAGES + 5,
    };

    await expect(ratchetDecrypt(bobSession, maliciousEnvelope)).rejects.toThrow(
      'Too many skipped messages'
    );
  });

  it('strictly bounds total skipped keys to MAX_TOTAL_SKIPPED_KEYS under adversarial skipping', async () => {
    let { aliceSession, bobSession } = createPairSessions();

    // Adversary produces 25 messages, each time with a gap of 50 skipped keys
    // Total simulated skips = 25 * 50 = 1,250 keys (exceeding MAX_TOTAL_SKIPPED_KEYS of 1000)
    for (let round = 0; round < 25; round++) {
      for (let i = 0; i < 50; i++) {
        const enc = await ratchetEncrypt(aliceSession, `Adversarial packet ${round}-${i}`);
        aliceSession = enc.session;
        // Only deliver the last message of the batch, leaving 49 skipped keys behind
        if (i === 49) {
          const dec = await ratchetDecrypt(bobSession, enc.envelope);
          bobSession = dec.session;
          expect(dec.plaintext).toBe(`Adversarial packet ${round}-${i}`);
        }
      }
    }

    // Storage MUST NOT exceed MAX_TOTAL_SKIPPED_KEYS (1,000)
    expect(bobSession.skippedMessageKeys.size).toBeLessThanOrEqual(MAX_TOTAL_SKIPPED_KEYS);
    expect(bobSession.skippedMessageKeys.size).toBe(MAX_TOTAL_SKIPPED_KEYS);
  });

  it('rejects malicious or malformed messageIndex values', async () => {
    const { aliceSession, bobSession } = createPairSessions();
    const { envelope } = await ratchetEncrypt(aliceSession, 'Test payload');

    // Negative index
    await expect(
      ratchetDecrypt(bobSession, { ...envelope, messageIndex: -1 })
    ).rejects.toThrow(/Invalid messageIndex/);

    // Floating point index
    await expect(
      ratchetDecrypt(bobSession, { ...envelope, messageIndex: 3.14 })
    ).rejects.toThrow(/Invalid messageIndex/);

    // NaN
    await expect(
      ratchetDecrypt(bobSession, { ...envelope, messageIndex: NaN })
    ).rejects.toThrow(/Invalid messageIndex/);

    // Exceeding safe integer
    await expect(
      ratchetDecrypt(bobSession, { ...envelope, messageIndex: Number.MAX_SAFE_INTEGER + 100 })
    ).rejects.toThrow(/Invalid messageIndex/);

    // Malicious previousChainLength
    await expect(
      ratchetDecrypt(bobSession, { ...envelope, previousChainLength: -5 })
    ).rejects.toThrow(/Invalid previousChainLength/);
  });

  it('detects and rejects replayed message numbers without corrupting ratchet state', async () => {
    let { aliceSession, bobSession } = createPairSessions();

    const enc1 = await ratchetEncrypt(aliceSession, 'First message');
    aliceSession = enc1.session;

    const enc2 = await ratchetEncrypt(aliceSession, 'Second message');
    aliceSession = enc2.session;

    // Normal in-order receipt
    const dec1 = await ratchetDecrypt(bobSession, enc1.envelope);
    bobSession = dec1.session;
    expect(dec1.plaintext).toBe('First message');

    const dec2 = await ratchetDecrypt(bobSession, enc2.envelope);
    bobSession = dec2.session;
    expect(dec2.plaintext).toBe('Second message');

    // Replay attack: resend enc1 (already received and consumed)
    await expect(ratchetDecrypt(bobSession, enc1.envelope)).rejects.toThrow(
      'Replayed or duplicate message index'
    );

    // Session remains synchronized: Alice sends 3rd message, Bob decrypts successfully
    const enc3 = await ratchetEncrypt(aliceSession, 'Third message');
    aliceSession = enc3.session;
    const dec3 = await ratchetDecrypt(bobSession, enc3.envelope);
    bobSession = dec3.session;
    expect(dec3.plaintext).toBe('Third message');
  });

  it('fuzz test: randomized arrival ordering of 30 messages', async () => {
    let { aliceSession, bobSession } = createPairSessions();

    const messagesCount = 30;
    const envelopes: RatchetEncryptedEnvelope[] = [];
    const expectedPlaintexts: string[] = [];

    for (let i = 0; i < messagesCount; i++) {
      const text = `Fuzz message #${i} with entropy ${Math.random()}`;
      expectedPlaintexts.push(text);
      const enc = await ratchetEncrypt(aliceSession, text);
      aliceSession = enc.session;
      envelopes.push(enc.envelope);
    }

    // Shuffle delivery indices using Fisher-Yates
    const indices = Array.from({ length: messagesCount }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const decryptedResults = new Map<number, string>();
    for (const idx of indices) {
      const dec = await ratchetDecrypt(bobSession, envelopes[idx]);
      bobSession = dec.session;
      decryptedResults.set(idx, dec.plaintext);
    }

    // Verify all 30 messages match expected plaintexts exactly
    for (let i = 0; i < messagesCount; i++) {
      expect(decryptedResults.get(i)).toBe(expectedPlaintexts[i]);
    }
    expect(bobSession.skippedMessageKeys.size).toBe(0);
  });
});
