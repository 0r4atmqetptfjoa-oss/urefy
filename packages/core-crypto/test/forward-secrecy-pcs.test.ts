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

describe('Forward Secrecy & Post-Compromise Security Verification', () => {
  it('verifies Forward Secrecy via dedicated test: Compromising state at M4 cannot decrypt past messages M1-M3', async () => {
    const aliceKp = generateHybridKemKeyPair();
    const bobKp = generateHybridKemKeyPair();
    const sharedSecret = crypto.getRandomValues(new Uint8Array(32));

    let alice = initSenderSession(
      aliceKp,
      { classical: bobKp.classicalPublicKey, pq: bobKp.pqPublicKey },
      sharedSecret
    );
    let bob = initReceiverSession(bobKp, sharedSecret);

    // M1
    const m1 = await ratchetEncrypt(alice, 'Confidential Past Message 1');
    alice = m1.session;
    const r1 = await ratchetDecrypt(bob, m1.envelope);
    bob = r1.session;

    // M2
    const m2 = await ratchetEncrypt(alice, 'Confidential Past Message 2');
    alice = m2.session;
    const r2 = await ratchetDecrypt(bob, m2.envelope);
    bob = r2.session;

    // Bob replies M3 (DH ratchet turn)
    const m3 = await ratchetEncrypt(bob, 'Confidential Past Reply 3');
    bob = m3.session;
    const r3 = await ratchetDecrypt(alice, m3.envelope);
    alice = r3.session;

    // Alice sends M4 (DH ratchet turn)
    const m4 = await ratchetEncrypt(alice, 'Message 4');
    alice = m4.session;
    const r4 = await ratchetDecrypt(bob, m4.envelope);
    bob = r4.session;

    // Attacker steals Bob's full state at M4
    const compromisedBobSerialized = serializeDoubleRatchetSession(bob);
    const attackerBob = deserializeDoubleRatchetSession(compromisedBobSerialized);

    // Attacker tries to decrypt past messages M1, M2, M3 using compromised state
    await expect(ratchetDecrypt(attackerBob, m1.envelope)).rejects.toThrow();
    await expect(ratchetDecrypt(attackerBob, m2.envelope)).rejects.toThrow();
    await expect(ratchetDecrypt(attackerBob, m3.envelope)).rejects.toThrow();

    // Attacker also steals Alice's state at M4
    const compromisedAliceSerialized = serializeDoubleRatchetSession(alice);
    const attackerAlice = deserializeDoubleRatchetSession(compromisedAliceSerialized);

    await expect(ratchetDecrypt(attackerAlice, m1.envelope)).rejects.toThrow();
    await expect(ratchetDecrypt(attackerAlice, m2.envelope)).rejects.toThrow();
  });

  it('verifies Post-Compromise Security (PCS) via dedicated test: State compromise heals after DH ratchet step', async () => {
    const aliceKp = generateHybridKemKeyPair();
    const bobKp = generateHybridKemKeyPair();
    const sharedSecret = crypto.getRandomValues(new Uint8Array(32));

    let alice = initSenderSession(
      aliceKp,
      { classical: bobKp.classicalPublicKey, pq: bobKp.pqPublicKey },
      sharedSecret
    );
    let bob = initReceiverSession(bobKp, sharedSecret);

    // Alice sends M1
    const m1 = await ratchetEncrypt(alice, 'Message 1');
    alice = m1.session;
    const r1 = await ratchetDecrypt(bob, m1.envelope);
    bob = r1.session;

    // ATTACK: Attacker clones Bob's state at M1
    const attackerSessionClone = deserializeDoubleRatchetSession(serializeDoubleRatchetSession(bob));

    // Alice sends M2 (same chain)
    const m2 = await ratchetEncrypt(alice, 'Message 2');
    alice = m2.session;

    // Bob receives M2
    const r2 = await ratchetDecrypt(bob, m2.envelope);
    bob = r2.session;

    // HEALING STEP: Bob replies to Alice (M3), triggering a DH ratchet turn with fresh ephemeral X25519
    const m3 = await ratchetEncrypt(bob, 'Healed Message 3 from Bob');
    bob = m3.session;

    // Alice decrypts M3 and turns her DH ratchet
    const r3 = await ratchetDecrypt(alice, m3.envelope);
    alice = r3.session;
    expect(r3.plaintext).toBe('Healed Message 3 from Bob');

    // Alice sends M4 to Bob using the healed session
    const m4 = await ratchetEncrypt(alice, 'Post-Compromise Secret Message 4');
    alice = m4.session;

    // Bob can decrypt M4 normally
    const r4 = await ratchetDecrypt(bob, m4.envelope);
    bob = r4.session;
    expect(r4.plaintext).toBe('Post-Compromise Secret Message 4');

    // VERIFICATION: Attacker who only has cloned state from M1 CANNOT decrypt M4!
    // Because fresh DH key agreement (DH ratchet turn) occurred in M3, generating new root & chain keys
    await expect(ratchetDecrypt(attackerSessionClone, m4.envelope)).rejects.toThrow();
  });

  it('rejects replayed messages', async () => {
    const aliceKp = generateHybridKemKeyPair();
    const bobKp = generateHybridKemKeyPair();
    const sharedSecret = crypto.getRandomValues(new Uint8Array(32));

    let alice = initSenderSession(
      aliceKp,
      { classical: bobKp.classicalPublicKey, pq: bobKp.pqPublicKey },
      sharedSecret
    );
    let bob = initReceiverSession(bobKp, sharedSecret);

    const m1 = await ratchetEncrypt(alice, 'Single-use message');
    alice = m1.session;

    // First decryption succeeds
    const r1 = await ratchetDecrypt(bob, m1.envelope);
    bob = r1.session;
    expect(r1.plaintext).toBe('Single-use message');

    // Replay same message -> Must reject!
    await expect(ratchetDecrypt(bob, m1.envelope)).rejects.toThrow();
  });
});
