import { describe, it, expect } from 'vitest';
import {
  generateHybridKemKeyPair,
  initSenderSession,
  initReceiverSession,
  ratchetEncrypt,
  ratchetDecrypt,
  serializeDoubleRatchetSession,
  deserializeDoubleRatchetSession,
} from '../src/index.js';

describe('Double Ratchet Session Serialization & State Recovery', () => {
  it('serializes and deserializes an active session preserving all cryptographic state', async () => {
    const aliceKp = generateHybridKemKeyPair();
    const bobKp = generateHybridKemKeyPair();
    const sharedSecret = crypto.getRandomValues(new Uint8Array(32));

    let alice = initSenderSession(
      aliceKp,
      { classical: bobKp.classicalPublicKey, pq: bobKp.pqPublicKey },
      sharedSecret
    );
    let bob = initReceiverSession(bobKp, sharedSecret);

    // Send M1
    const m1 = await ratchetEncrypt(alice, 'Message 1 from Alice');
    alice = m1.session;

    // Bob receives M1
    const r1 = await ratchetDecrypt(bob, m1.envelope);
    bob = r1.session;
    expect(r1.plaintext).toBe('Message 1 from Alice');

    // Serialize Alice and Bob
    const aliceJson = serializeDoubleRatchetSession(alice);
    const bobJson = serializeDoubleRatchetSession(bob);

    expect(typeof aliceJson).toBe('string');
    expect(typeof bobJson).toBe('string');

    // Deserialize into restored sessions
    let aliceRestored = deserializeDoubleRatchetSession(aliceJson);
    let bobRestored = deserializeDoubleRatchetSession(bobJson);

    expect(aliceRestored.sessionId).toBe(alice.sessionId);
    expect(bobRestored.sessionId).toBe(bob.sessionId);
    expect(aliceRestored.sendCount).toBe(alice.sendCount);
    expect(bobRestored.receiveCount).toBe(bob.receiveCount);

    // Bob replies to Alice using restored session
    const reply1 = await ratchetEncrypt(bobRestored, 'Reply 1 from Bob restored');
    bobRestored = reply1.session;

    // Alice decrypts reply using restored session
    const decryptedReply = await ratchetDecrypt(aliceRestored, reply1.envelope);
    aliceRestored = decryptedReply.session;
    expect(decryptedReply.plaintext).toBe('Reply 1 from Bob restored');

    // Alice sends another message M2
    const m2 = await ratchetEncrypt(aliceRestored, 'Message 2 after serialization');
    aliceRestored = m2.session;

    const decryptedM2 = await ratchetDecrypt(bobRestored, m2.envelope);
    bobRestored = decryptedM2.session;
    expect(decryptedM2.plaintext).toBe('Message 2 after serialization');
  });

  it('preserves skipped message keys across serialization and recovers out-of-order messages', async () => {
    const aliceKp = generateHybridKemKeyPair();
    const bobKp = generateHybridKemKeyPair();
    const sharedSecret = crypto.getRandomValues(new Uint8Array(32));

    let alice = initSenderSession(
      aliceKp,
      { classical: bobKp.classicalPublicKey, pq: bobKp.pqPublicKey },
      sharedSecret
    );
    let bob = initReceiverSession(bobKp, sharedSecret);

    // Alice sends M1, M2, M3
    const m1 = await ratchetEncrypt(alice, 'M1: First');
    alice = m1.session;
    const m2 = await ratchetEncrypt(alice, 'M2: Second');
    alice = m2.session;
    const m3 = await ratchetEncrypt(alice, 'M3: Third');
    alice = m3.session;

    // Bob receives M3 first (skipping M1 and M2)
    const r3 = await ratchetDecrypt(bob, m3.envelope);
    bob = r3.session;
    expect(r3.plaintext).toBe('M3: Third');
    expect(bob.skippedMessageKeys.size).toBe(2);

    // Serialize Bob with skipped keys
    const bobSerialized = serializeDoubleRatchetSession(bob);
    let bobRestored = deserializeDoubleRatchetSession(bobSerialized);
    expect(bobRestored.skippedMessageKeys.size).toBe(2);

    // Bob receives M1 using restored session
    const r1 = await ratchetDecrypt(bobRestored, m1.envelope);
    bobRestored = r1.session;
    expect(r1.plaintext).toBe('M1: First');
    expect(bobRestored.skippedMessageKeys.size).toBe(1);

    // Bob receives M2 using restored session
    const r2 = await ratchetDecrypt(bobRestored, m2.envelope);
    bobRestored = r2.session;
    expect(r2.plaintext).toBe('M2: Second');
    expect(bobRestored.skippedMessageKeys.size).toBe(0);
  });

  it('rejects tampered or malformed serialized session data', () => {
    expect(() => deserializeDoubleRatchetSession('')).toThrow();
    expect(() => deserializeDoubleRatchetSession('{}')).toThrow();
    expect(() => deserializeDoubleRatchetSession('{"version": 999}')).toThrow();

    const aliceKp = generateHybridKemKeyPair();
    const bobKp = generateHybridKemKeyPair();
    const sharedSecret = crypto.getRandomValues(new Uint8Array(32));
    const alice = initSenderSession(
      aliceKp,
      { classical: bobKp.classicalPublicKey, pq: bobKp.pqPublicKey },
      sharedSecret
    );
    const validJson = serializeDoubleRatchetSession(alice);

    // Tamper rootKey hex
    const parsed = JSON.parse(validJson);
    parsed.rootKey = 'bad_hex_not_valid';
    expect(() => deserializeDoubleRatchetSession(JSON.stringify(parsed))).toThrow();

    // Tamper negative count
    const parsed2 = JSON.parse(validJson);
    parsed2.sendCount = -5;
    expect(() => deserializeDoubleRatchetSession(JSON.stringify(parsed2))).toThrow();

    // Tamper keypair length
    const parsed3 = JSON.parse(validJson);
    parsed3.DHSendingKeyPair.publicKey = 'abcd';
    expect(() => deserializeDoubleRatchetSession(JSON.stringify(parsed3))).toThrow();
  });
});
