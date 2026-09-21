import { describe, it, expect } from 'vitest';
import {
  createSovereignIdentity,
  encryptDirectMessage,
  decryptDirectMessage,
  initiateSenderDMSession,
  initiateReceiverDMSession,
  encryptRatchetedDirectMessage,
  decryptRatchetedDirectMessage,
  validateDirectMessageFrame,
  verifyStoredSignedEnvelope,
  type DirectMessageFrameV1,
  type DirectMessageFrameV2,
} from '../src/index.js';

describe('Direct Message Protocol V2 (Double Ratchet with Hybrid Post-Quantum Bootstrap)', () => {
  it('establishes a ratcheted session, exchanges messages bidirectionally, and preserves backward compatibility with V1', async () => {
    const alice = createSovereignIdentity();
    const bob = createSovereignIdentity();

    // 1. Alice sends first message to Bob with initial bootstrap
    const { session: aliceSession0, bootstrap } = initiateSenderDMSession(alice, bob.identity);
    expect(bootstrap.ephemeralPublicKey).toMatch(/^[0-9a-f]{64}$/i);
    expect(bootstrap.pqCiphertext).toMatch(/^[0-9a-f]{2176}$/i);

    const { envelope: env1, session: aliceSession1 } = await encryptRatchetedDirectMessage(
      { text: 'Hello Bob from Ratchet V2!' },
      aliceSession0,
      alice,
      bob.identity,
      bootstrap
    );

    // Verify envelope and frame validity
    expect(verifyStoredSignedEnvelope(env1)).toBe(true);
    const frame1 = env1.payload.message as DirectMessageFrameV2;
    expect(frame1.version).toBe(2);
    expect(frame1.sender).toBe(alice.identity.fingerprint);
    expect(frame1.recipient).toBe(bob.identity.fingerprint);
    expect(validateDirectMessageFrame(frame1)).toBe(true);

    // 2. Bob receives first message, initializes receiver session from bootstrap, and decrypts
    let bobSession = initiateReceiverDMSession(bob, alice.identity, frame1.bootstrap!);
    const dec1 = await decryptRatchetedDirectMessage<{ text: string }>(env1, bobSession, bob);
    bobSession = dec1.session;
    expect(dec1.body.text).toBe('Hello Bob from Ratchet V2!');

    // 3. Alice sends second message (same chain, no bootstrap needed)
    const { envelope: env2, session: aliceSession2 } = await encryptRatchetedDirectMessage(
      { text: 'Second message from Alice' },
      aliceSession1,
      alice,
      bob.identity
    );
    expect((env2.payload.message as DirectMessageFrameV2).bootstrap).toBeUndefined();
    expect(validateDirectMessageFrame(env2.payload.message)).toBe(true);

    const dec2 = await decryptRatchetedDirectMessage<{ text: string }>(env2, bobSession, bob);
    bobSession = dec2.session;
    expect(dec2.body.text).toBe('Second message from Alice');

    // 4. Bob replies to Alice (triggers DH ratchet turn!)
    const { envelope: envReply, session: bobSession2 } = await encryptRatchetedDirectMessage(
      { text: 'Hello Alice! Received and ratified.' },
      bobSession,
      bob,
      alice.identity
    );
    expect(validateDirectMessageFrame(envReply.payload.message)).toBe(true);

    // Alice decrypts Bob's reply
    const decReply = await decryptRatchetedDirectMessage<{ text: string }>(envReply, aliceSession2, alice);
    const aliceSession3 = decReply.session;
    expect(decReply.body.text).toBe('Hello Alice! Received and ratified.');

    // 5. Alice sends another message after Bob's reply (Alice's DH ratchet turn)
    const { envelope: env3, session: aliceSession4 } = await encryptRatchetedDirectMessage(
      { text: 'Third message from Alice on new DH ratchet branch' },
      aliceSession3,
      alice,
      bob.identity
    );

    const dec3 = await decryptRatchetedDirectMessage<{ text: string }>(env3, bobSession2, bob);
    expect(dec3.body.text).toBe('Third message from Alice on new DH ratchet branch');

    // 6. Test Backward Compatibility: Legacy V1 message can still be created and decrypted
    const legacyV1Envelope = await encryptDirectMessage({ text: 'Legacy V1 Message' }, alice, bob.identity);
    const legacyFrame = legacyV1Envelope.payload.message as DirectMessageFrameV1;
    expect(legacyFrame.version).toBe(1);
    expect(validateDirectMessageFrame(legacyFrame)).toBe(true);

    const decryptedLegacy = await decryptDirectMessage<{ text: string }>(legacyV1Envelope, bob);
    expect(decryptedLegacy.text).toBe('Legacy V1 Message');

    // Trying to decrypt V1 frame with ratchet function throws
    await expect(decryptRatchetedDirectMessage(legacyV1Envelope as any, bobSession, bob)).rejects.toThrow();

    // Trying to decrypt V2 frame with legacy function throws
    await expect(decryptDirectMessage(env3 as any, bob)).rejects.toThrow();
  });
});
