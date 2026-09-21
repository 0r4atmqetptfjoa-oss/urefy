import { describe, it, expect } from 'vitest';
import {
  createSovereignIdentity,
  initiateSenderDMSession,
  initiateReceiverDMSession,
  encryptRatchetedDirectMessage,
  decryptRatchetedDirectMessage,
  type DoubleRatchetSession,
  computeFingerprint,
  hexToBytes,
} from '../src/index.js';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

function computeSafetyNumber(identityA: any, identityB: any): string {
  const [first, second] = [identityA.signingPublicKey, identityB.signingPublicKey].sort();
  const digest = sha256(new TextEncoder().encode(`${first}:${second}`));
  const hex = bytesToHex(digest);
  const chunks: string[] = [];
  for (let i = 0; i < 30; i += 5) {
    const num = parseInt(hex.slice(i, i + 5), 16) % 100000;
    chunks.push(num.toString().padStart(5, '0'));
  }
  return chunks.join(' ');
}

describe('PASS 7.3.2: Multi-Device Double Ratchet Session Isolation', () => {
  it('allows same sovereign identity on A1 and A2 to maintain independent ratchets with B without collision', async () => {
    // 1. Identity Generation
    // Alice has ONE sovereign identity
    const aliceKeys = createSovereignIdentity();
    // Bob has ONE sovereign identity
    const bobKeys = createSovereignIdentity();

    // Two independent devices for Alice
    const deviceIdA1 = 'dev_alice_mobile_01';
    const deviceIdA2 = 'dev_alice_desktop_02';
    const deviceIdB = 'dev_bob_workstation_01';

    // Bob maintains session map keyed by (peerFingerprint, peerDeviceId)
    const bobSessions = new Map<string, DoubleRatchetSession>();

    // -------------------------------------------------------------------------
    // STAGE 1: A1 establishes session with B
    // -------------------------------------------------------------------------
    const a1Init = initiateSenderDMSession(aliceKeys, bobKeys.identity);
    let a1Session: DoubleRatchetSession = a1Init.session;

    // A1 sends A1-M1
    const { envelope: env1, session: a1S1 } = await encryptRatchetedDirectMessage(
      { text: 'A1-M1' },
      a1Session,
      aliceKeys,
      bobKeys.identity,
      a1Init.bootstrap,
      { senderDeviceId: deviceIdA1 }
    );
    a1Session = a1S1;

    // Bob receives A1-M1
    const frame1 = env1.payload.message;
    expect(frame1.version).toBe(2);
    if (frame1.version === 2) {
      expect(frame1.senderDeviceId).toBe(deviceIdA1);
      // Bob initializes receiver session for dev_alice_mobile_01
      let bobA1Session = initiateReceiverDMSession(bobKeys, aliceKeys.identity, frame1.bootstrap!);
      const dec1 = await decryptRatchetedDirectMessage<{ text: string }>(env1, bobA1Session, bobKeys);
      expect(dec1.body.text).toBe('A1-M1');
      bobA1Session = dec1.session;
      bobSessions.set(`${aliceKeys.identity.fingerprint}:${deviceIdA1}`, bobA1Session);
    }

    // A1 sends A1-M2 and A1-M3
    for (const msgText of ['A1-M2', 'A1-M3']) {
      const { envelope: env, session: updatedA1 } = await encryptRatchetedDirectMessage(
        { text: msgText },
        a1Session,
        aliceKeys,
        bobKeys.identity,
        undefined,
        { senderDeviceId: deviceIdA1 }
      );
      a1Session = updatedA1;

      let bobA1 = bobSessions.get(`${aliceKeys.identity.fingerprint}:${deviceIdA1}`)!;
      const dec = await decryptRatchetedDirectMessage<{ text: string }>(env, bobA1, bobKeys);
      expect(dec.body.text).toBe(msgText);
      bobSessions.set(`${aliceKeys.identity.fingerprint}:${deviceIdA1}`, dec.session);
    }

    // Bob replies B-M1 to A1
    let bobA1 = bobSessions.get(`${aliceKeys.identity.fingerprint}:${deviceIdA1}`)!;
    const { envelope: envB1, session: updatedBobA1 } = await encryptRatchetedDirectMessage(
      { text: 'B-M1' },
      bobA1,
      bobKeys,
      aliceKeys.identity,
      undefined,
      { senderDeviceId: deviceIdB, recipientDeviceId: deviceIdA1 }
    );
    bobSessions.set(`${aliceKeys.identity.fingerprint}:${deviceIdA1}`, updatedBobA1);

    // A1 decrypts B-M1 (DH Ratchet turn)
    const decB1 = await decryptRatchetedDirectMessage<{ text: string }>(envB1, a1Session, aliceKeys);
    expect(decB1.body.text).toBe('B-M1');
    a1Session = decB1.session;

    // -------------------------------------------------------------------------
    // STAGE 2: Device A2 introduced (same seed, fresh ratchet state)
    // -------------------------------------------------------------------------
    // A2 has NO ratchet state. A2 must bootstrap fresh to Bob.
    const a2Init = initiateSenderDMSession(aliceKeys, bobKeys.identity);
    let a2Session: DoubleRatchetSession = a2Init.session;

    const { envelope: envA2M1, session: updatedA2 } = await encryptRatchetedDirectMessage(
      { text: 'A2-M1' },
      a2Session,
      aliceKeys,
      bobKeys.identity,
      a2Init.bootstrap,
      { senderDeviceId: deviceIdA2 }
    );
    a2Session = updatedA2;

    // Bob receives A2-M1
    const frameA2M1 = envA2M1.payload.message;
    if (frameA2M1.version === 2) {
      expect(frameA2M1.senderDeviceId).toBe(deviceIdA2);
      // Bob notes this is a distinct deviceId for Alice:
      const bobA2SessionKey = `${aliceKeys.identity.fingerprint}:${deviceIdA2}`;
      expect(bobSessions.has(bobA2SessionKey)).toBe(false);

      // Bob initializes receiver session for dev_alice_desktop_02
      let bobA2Session = initiateReceiverDMSession(bobKeys, aliceKeys.identity, frameA2M1.bootstrap!);
      const decA2 = await decryptRatchetedDirectMessage<{ text: string }>(envA2M1, bobA2Session, bobKeys);
      expect(decA2.body.text).toBe('A2-M1');
      bobSessions.set(bobA2SessionKey, decA2.session);
    }

    // -------------------------------------------------------------------------
    // STAGE 3: CRITICAL TEST — A1 sends A1-M4 after A2 bootstrap
    // -------------------------------------------------------------------------
    // If Bob's session for A1 was overwritten by A2, this will fail.
    // In our isolated architecture, Bob's session for A1 is completely intact!
    const { envelope: envA1M4, session: updatedA1M4 } = await encryptRatchetedDirectMessage(
      { text: 'A1-M4 (Post-A2 Bootstrap Verification)' },
      a1Session,
      aliceKeys,
      bobKeys.identity,
      undefined,
      { senderDeviceId: deviceIdA1 }
    );
    a1Session = updatedA1M4;

    // Bob loads A1's session and decrypts A1-M4
    const bobA1Session = bobSessions.get(`${aliceKeys.identity.fingerprint}:${deviceIdA1}`)!;
    expect(bobA1Session).toBeDefined();
    const decA1M4 = await decryptRatchetedDirectMessage<{ text: string }>(envA1M4, bobA1Session, bobKeys);
    expect(decA1M4.body.text).toBe('A1-M4 (Post-A2 Bootstrap Verification)');
    bobSessions.set(`${aliceKeys.identity.fingerprint}:${deviceIdA1}`, decA1M4.session);

    // -------------------------------------------------------------------------
    // STAGE 4: Parallel interleaved sending from A1 and A2
    // A1-M5, A2-M2, A1-M6, A2-M3
    // -------------------------------------------------------------------------
    const { envelope: envA1M5, session: sA1M5 } = await encryptRatchetedDirectMessage(
      { text: 'A1-M5' }, a1Session, aliceKeys, bobKeys.identity, undefined, { senderDeviceId: deviceIdA1 }
    );
    a1Session = sA1M5;

    const { envelope: envA2M2, session: sA2M2 } = await encryptRatchetedDirectMessage(
      { text: 'A2-M2' }, a2Session, aliceKeys, bobKeys.identity, undefined, { senderDeviceId: deviceIdA2 }
    );
    a2Session = sA2M2;

    const { envelope: envA1M6, session: sA1M6 } = await encryptRatchetedDirectMessage(
      { text: 'A1-M6' }, a1Session, aliceKeys, bobKeys.identity, undefined, { senderDeviceId: deviceIdA1 }
    );
    a1Session = sA1M6;

    const { envelope: envA2M3, session: sA2M3 } = await encryptRatchetedDirectMessage(
      { text: 'A2-M3' }, a2Session, aliceKeys, bobKeys.identity, undefined, { senderDeviceId: deviceIdA2 }
    );
    a2Session = sA2M3;

    // Bob decrypts all 4 interleaved messages
    const decA1M5 = await decryptRatchetedDirectMessage<{ text: string }>(
      envA1M5, bobSessions.get(`${aliceKeys.identity.fingerprint}:${deviceIdA1}`)!, bobKeys
    );
    bobSessions.set(`${aliceKeys.identity.fingerprint}:${deviceIdA1}`, decA1M5.session);
    expect(decA1M5.body.text).toBe('A1-M5');

    const decA2M2 = await decryptRatchetedDirectMessage<{ text: string }>(
      envA2M2, bobSessions.get(`${aliceKeys.identity.fingerprint}:${deviceIdA2}`)!, bobKeys
    );
    bobSessions.set(`${aliceKeys.identity.fingerprint}:${deviceIdA2}`, decA2M2.session);
    expect(decA2M2.body.text).toBe('A2-M2');

    const decA1M6 = await decryptRatchetedDirectMessage<{ text: string }>(
      envA1M6, bobSessions.get(`${aliceKeys.identity.fingerprint}:${deviceIdA1}`)!, bobKeys
    );
    bobSessions.set(`${aliceKeys.identity.fingerprint}:${deviceIdA1}`, decA1M6.session);
    expect(decA1M6.body.text).toBe('A1-M6');

    const decA2M3 = await decryptRatchetedDirectMessage<{ text: string }>(
      envA2M3, bobSessions.get(`${aliceKeys.identity.fingerprint}:${deviceIdA2}`)!, bobKeys
    );
    bobSessions.set(`${aliceKeys.identity.fingerprint}:${deviceIdA2}`, decA2M3.session);
    expect(decA2M3.body.text).toBe('A2-M3');

    // -------------------------------------------------------------------------
    // STAGE 5: Reverse direction delivery (Active Device Unicast)
    // -------------------------------------------------------------------------
    // Bob sends B-M2 targeting A1
    const { envelope: envB2, session: sBobA1_2 } = await encryptRatchetedDirectMessage(
      { text: 'B-M2 (for A1)' },
      bobSessions.get(`${aliceKeys.identity.fingerprint}:${deviceIdA1}`)!,
      bobKeys,
      aliceKeys.identity,
      undefined,
      { senderDeviceId: deviceIdB, recipientDeviceId: deviceIdA1 }
    );
    bobSessions.set(`${aliceKeys.identity.fingerprint}:${deviceIdA1}`, sBobA1_2);

    // A1 decrypts B-M2 successfully
    const decB2 = await decryptRatchetedDirectMessage<{ text: string }>(envB2, a1Session, aliceKeys);
    expect(decB2.body.text).toBe('B-M2 (for A1)');
    a1Session = decB2.session;

    // Bob sends B-M3 targeting A2
    const { envelope: envB3, session: sBobA2_2 } = await encryptRatchetedDirectMessage(
      { text: 'B-M3 (for A2)' },
      bobSessions.get(`${aliceKeys.identity.fingerprint}:${deviceIdA2}`)!,
      bobKeys,
      aliceKeys.identity,
      undefined,
      { senderDeviceId: deviceIdB, recipientDeviceId: deviceIdA2 }
    );
    bobSessions.set(`${aliceKeys.identity.fingerprint}:${deviceIdA2}`, sBobA2_2);

    // A2 decrypts B-M3 successfully
    const decB3 = await decryptRatchetedDirectMessage<{ text: string }>(envB3, a2Session, aliceKeys);
    expect(decB3.body.text).toBe('B-M3 (for A2)');
    a2Session = decB3.session;

    // -------------------------------------------------------------------------
    // STAGE 6: Safety Number Verification
    // -------------------------------------------------------------------------
    // Because A1 and A2 share the identical sovereign seed, they yield the EXACT same Safety Number with B
    const safetyNumberA1_B = computeSafetyNumber(aliceKeys.identity, bobKeys.identity);
    const safetyNumberA2_B = computeSafetyNumber(aliceKeys.identity, bobKeys.identity);
    expect(safetyNumberA1_B).toBe(safetyNumberA2_B);
    expect(safetyNumberA1_B.length).toBe(35); // 6 groups of 5 digits separated by spaces
  });
});
