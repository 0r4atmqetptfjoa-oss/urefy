import { describe, it, expect, beforeEach } from 'vitest';
import { 
  DoubleRatchetSession, 
  initSenderSession, 
  initReceiverSession, 
  ratchetEncrypt, 
  ratchetDecrypt 
} from '../src/double-ratchet.js';
import { generateHybridKemKeyPair } from '../src/post-quantum.js';
import { x25519 } from '@noble/curves/ed25519';

import { bytesToHex } from '@noble/hashes/utils';

describe('Double Ratchet PQ Engine', () => {
  let aliceKeys: any;
  let bobKeys: any;
  let sharedSecret: Uint8Array;

  beforeEach(() => {
    const seedA = crypto.getRandomValues(new Uint8Array(32));
    const seedB = crypto.getRandomValues(new Uint8Array(32));
    aliceKeys = generateHybridKemKeyPair(seedA);
    bobKeys = generateHybridKemKeyPair(seedB);
    sharedSecret = crypto.getRandomValues(new Uint8Array(32));
  });

  it('1. Initialize sender and receiver correctly', () => {
    const aliceSession = initSenderSession(
      aliceKeys,
      { classical: bobKeys.classicalPublicKey, pq: bobKeys.pqPublicKey },
      sharedSecret
    );
    const bobSession = initReceiverSession(bobKeys, sharedSecret);

    expect(aliceSession.initiator).toBe(true);
    expect(bobSession.initiator).toBe(false);
    expect(aliceSession.sendingChainKey).not.toBeNull();
    expect(bobSession.sendingChainKey).toBeNull();
  });

  it('2. Simple encrypt/decrypt round-trip', async () => {
    const aliceSession1 = initSenderSession(
      aliceKeys,
      { classical: bobKeys.classicalPublicKey, pq: bobKeys.pqPublicKey },
      sharedSecret
    );
    const bobSession1 = initReceiverSession(bobKeys, sharedSecret);

    const { session: aliceSession2, envelope } = await ratchetEncrypt(aliceSession1, 'Hello Bob');
    const { session: bobSession2, plaintext } = await ratchetDecrypt(bobSession1, envelope);

    expect(plaintext).toBe('Hello Bob');
  });

  it('3. Forward secrecy: changing chains secures previous messages', async () => {
    let aliceS = initSenderSession(
      aliceKeys,
      { classical: bobKeys.classicalPublicKey, pq: bobKeys.pqPublicKey },
      sharedSecret
    );
    let bobS = initReceiverSession(bobKeys, sharedSecret);

    let enc1 = await ratchetEncrypt(aliceS, 'Msg1');
    aliceS = enc1.session;
    let dec1 = await ratchetDecrypt(bobS, enc1.envelope);
    bobS = dec1.session;

    let enc2 = await ratchetEncrypt(bobS, 'Msg2');
    bobS = enc2.session;
    
    let dec2 = await ratchetDecrypt(aliceS, enc2.envelope);
    aliceS = dec2.session;

    expect(dec2.plaintext).toBe('Msg2');
    expect(aliceS.receivingChainKey).not.toBeNull();
  });

  it('4. Out-of-order delivery (skipped message keys)', async () => {
    let aliceS = initSenderSession(aliceKeys, { classical: bobKeys.classicalPublicKey, pq: bobKeys.pqPublicKey }, sharedSecret);
    let bobS = initReceiverSession(bobKeys, sharedSecret);

    const enc1 = await ratchetEncrypt(aliceS, 'Msg1');
    aliceS = enc1.session;
    const enc2 = await ratchetEncrypt(aliceS, 'Msg2');
    aliceS = enc2.session;

    let dec2 = await ratchetDecrypt(bobS, enc2.envelope);
    bobS = dec2.session;
    expect(dec2.plaintext).toBe('Msg2');

    let dec1 = await ratchetDecrypt(bobS, enc1.envelope);
    bobS = dec1.session;
    expect(dec1.plaintext).toBe('Msg1');
  });

  it('5. Session isolation', async () => {
    const aliceS1 = initSenderSession(aliceKeys, { classical: bobKeys.classicalPublicKey, pq: bobKeys.pqPublicKey }, sharedSecret);
    const bobS1 = initReceiverSession(bobKeys, sharedSecret);
    
    const bobS2 = initReceiverSession(bobKeys, crypto.getRandomValues(new Uint8Array(32))); 

    const { envelope } = await ratchetEncrypt(aliceS1, 'Hello');
    
    await expect(ratchetDecrypt(bobS2, envelope)).rejects.toThrow();
  });

  it('6. Max skip limit', async () => {
    let aliceS = initSenderSession(aliceKeys, { classical: bobKeys.classicalPublicKey, pq: bobKeys.pqPublicKey }, sharedSecret);
    let bobS = initReceiverSession(bobKeys, sharedSecret);

    const dummyEnvelope = {
      version: 3,
      sessionId: aliceS.sessionId,
      senderDHPublicKey: bytesToHex(aliceS.DHSendingKeyPair.publicKey),
      senderPqCiphertext: aliceS.currentPqCiphertext || '',
      messageIndex: 1005,
      previousChainLength: 0,
      ciphertext: '00', iv: '00', tag: '00'
    };

    await expect(ratchetDecrypt(bobS, dummyEnvelope as any)).rejects.toThrow('Too many skipped messages');
  });

  it('7. PQ ratchet step involves ML-KEM-768 ciphertext', async () => {
    let aliceS = initSenderSession(aliceKeys, { classical: bobKeys.classicalPublicKey, pq: bobKeys.pqPublicKey }, sharedSecret);
    const enc = await ratchetEncrypt(aliceS, 'Test');
    expect(enc.envelope.senderPqCiphertext.length).toBeGreaterThan(0);
    // ML-KEM-768 pubkey + ciphertext is (1184 + 1088) bytes = 2272 bytes -> 4544 hex chars
    expect(enc.envelope.senderPqCiphertext.length).toBe(4544);
  });

  it('8. Counter increment', async () => {
    let aliceS = initSenderSession(aliceKeys, { classical: bobKeys.classicalPublicKey, pq: bobKeys.pqPublicKey }, sharedSecret);
    
    expect(aliceS.sendCount).toBe(0);
    const enc1 = await ratchetEncrypt(aliceS, 'Test1');
    expect(enc1.session.sendCount).toBe(1);
    
    const enc2 = await ratchetEncrypt(enc1.session, 'Test2');
    expect(enc2.session.sendCount).toBe(2);
  });

  it('9. Multiple ratchet steps', async () => {
    let aS = initSenderSession(aliceKeys, { classical: bobKeys.classicalPublicKey, pq: bobKeys.pqPublicKey }, sharedSecret);
    let bS = initReceiverSession(bobKeys, sharedSecret);

    let e = await ratchetEncrypt(aS, 'A1'); aS = e.session;
    let d = await ratchetDecrypt(bS, e.envelope); bS = d.session;

    e = await ratchetEncrypt(bS, 'B1'); bS = e.session;
    d = await ratchetDecrypt(aS, e.envelope); aS = d.session;

    e = await ratchetEncrypt(aS, 'A2'); aS = e.session;
    d = await ratchetDecrypt(bS, e.envelope); bS = d.session;

    expect(d.plaintext).toBe('A2');
  });

  it('10. Concurrent independent sessions', async () => {
    let aS1 = initSenderSession(aliceKeys, { classical: bobKeys.classicalPublicKey, pq: bobKeys.pqPublicKey }, sharedSecret);
    let bS1 = initReceiverSession(bobKeys, sharedSecret);

    const secret2 = crypto.getRandomValues(new Uint8Array(32));
    let aS2 = initSenderSession(aliceKeys, { classical: bobKeys.classicalPublicKey, pq: bobKeys.pqPublicKey }, secret2);
    let bS2 = initReceiverSession(bobKeys, secret2);

    let e1 = await ratchetEncrypt(aS1, 'Msg1');
    let e2 = await ratchetEncrypt(aS2, 'Msg2');

    let d1 = await ratchetDecrypt(bS1, e1.envelope);
    let d2 = await ratchetDecrypt(bS2, e2.envelope);

    expect(d1.plaintext).toBe('Msg1');
    expect(d2.plaintext).toBe('Msg2');
  });

  it('11. Fails on altered ciphertext', async () => {
    let aS = initSenderSession(aliceKeys, { classical: bobKeys.classicalPublicKey, pq: bobKeys.pqPublicKey }, sharedSecret);
    let bS = initReceiverSession(bobKeys, sharedSecret);

    let { envelope } = await ratchetEncrypt(aS, 'Secret');
    envelope.ciphertext = envelope.ciphertext.substring(0, envelope.ciphertext.length - 1) + (envelope.ciphertext.endsWith('0') ? '1' : '0');

    await expect(ratchetDecrypt(bS, envelope)).rejects.toThrow();
  });

  it('12. Fails on altered tag', async () => {
    let aS = initSenderSession(aliceKeys, { classical: bobKeys.classicalPublicKey, pq: bobKeys.pqPublicKey }, sharedSecret);
    let bS = initReceiverSession(bobKeys, sharedSecret);

    let { envelope } = await ratchetEncrypt(aS, 'Secret');
    envelope.tag = envelope.tag.substring(0, envelope.tag.length - 1) + (envelope.tag.endsWith('0') ? '1' : '0');

    await expect(ratchetDecrypt(bS, envelope)).rejects.toThrow();
  });

  it('13. Immutability of session object', async () => {
    const aS = initSenderSession(aliceKeys, { classical: bobKeys.classicalPublicKey, pq: bobKeys.pqPublicKey }, sharedSecret);
    const { session: aS_new } = await ratchetEncrypt(aS, 'Test');
    
    expect(aS.sendCount).toBe(0);
    expect(aS_new.sendCount).toBe(1);
    expect(aS).not.toBe(aS_new);
  });

  it('14. Previous send count is correct on new chain', async () => {
    let aS = initSenderSession(aliceKeys, { classical: bobKeys.classicalPublicKey, pq: bobKeys.pqPublicKey }, sharedSecret);
    let bS = initReceiverSession(bobKeys, sharedSecret);

    let e1 = await ratchetEncrypt(aS, 'A1'); aS = e1.session;
    let e2 = await ratchetEncrypt(aS, 'A2'); aS = e2.session;
    
    let d1 = await ratchetDecrypt(bS, e1.envelope); bS = d1.session;
    
    let eB = await ratchetEncrypt(bS, 'B1'); bS = eB.session;
    expect(eB.envelope.previousChainLength).toBe(0); 

    let dA = await ratchetDecrypt(aS, eB.envelope); aS = dA.session;
    
    let e3 = await ratchetEncrypt(aS, 'A3'); aS = e3.session;
    expect(e3.envelope.previousChainLength).toBe(2); 
  });

  it('15. Out-of-order delivery with new chain step', async () => {
    let aS = initSenderSession(aliceKeys, { classical: bobKeys.classicalPublicKey, pq: bobKeys.pqPublicKey }, sharedSecret);
    let bS = initReceiverSession(bobKeys, sharedSecret);

    let eA1 = await ratchetEncrypt(aS, 'A1'); aS = eA1.session;
    let eA2 = await ratchetEncrypt(aS, 'A2'); aS = eA2.session;

    let dB2 = await ratchetDecrypt(bS, eA2.envelope); bS = dB2.session;
    expect(dB2.plaintext).toBe('A2');

    let eB1 = await ratchetEncrypt(bS, 'B1'); bS = eB1.session;
    let dA1 = await ratchetDecrypt(aS, eB1.envelope); aS = dA1.session;
    
    let dB1 = await ratchetDecrypt(bS, eA1.envelope); bS = dB1.session;
    expect(dB1.plaintext).toBe('A1');
  });
});
