import { describe, it, expect } from 'vitest';
import {
  createSovereignIdentity,
  createSignedEnvelope,
  initiateSenderDMSession,
  initiateReceiverDMSession,
  encryptRatchetedDirectMessage,
  decryptRatchetedDirectMessage,
  serializeDoubleRatchetSession,
  deserializeDoubleRatchetSession,
  MAX_SKIP_MESSAGES,
} from '../src/index.js';
import { ratchetEncrypt, ratchetDecrypt } from '../src/double-ratchet.js';

describe('PASS 7.3.1 — Adversarial Edge-Case & Boundary Verification', () => {
  it('identifies the first-chain security boundary: pre-first-DH messages can be decrypted if long-term static keys are compromised', async () => {
    const aliceKeys = createSovereignIdentity();
    const bobKeys = createSovereignIdentity();

    // Alice initiates session and sends M1..M5 before Bob replies
    const init = initiateSenderDMSession(aliceKeys, bobKeys.identity);
    let aliceSession = init.session;
    const bootstrap = init.bootstrap;

    const enc1 = await encryptRatchetedDirectMessage('M1: Initial message', aliceSession, aliceKeys, bobKeys.identity, bootstrap);
    aliceSession = enc1.session;

    const enc2 = await encryptRatchetedDirectMessage('M2: Follow up', aliceSession, aliceKeys, bobKeys.identity);
    aliceSession = enc2.session;

    const enc3 = await encryptRatchetedDirectMessage('M3: Still waiting', aliceSession, aliceKeys, bobKeys.identity);
    aliceSession = enc3.session;

    const enc4 = await encryptRatchetedDirectMessage('M4: Another update', aliceSession, aliceKeys, bobKeys.identity);
    aliceSession = enc4.session;

    const enc5 = await encryptRatchetedDirectMessage('M5: Final pre-reply', aliceSession, aliceKeys, bobKeys.identity);
    aliceSession = enc5.session;

    // Attacker later compromises Bob's long-term static private keys (X25519 & ML-KEM-768)
    // and intercepted all network frames including bootstrap in enc1
    const attackerBobSession = initiateReceiverDMSession(bobKeys, aliceKeys.identity, bootstrap);

    const dec1 = await decryptRatchetedDirectMessage<string>(enc1.envelope, attackerBobSession, bobKeys);
    expect(dec1.body).toBe('M1: Initial message');

    const dec2 = await decryptRatchetedDirectMessage<string>(enc2.envelope, dec1.session, bobKeys);
    expect(dec2.body).toBe('M2: Follow up');

    const dec3 = await decryptRatchetedDirectMessage<string>(enc3.envelope, dec2.session, bobKeys);
    expect(dec3.body).toBe('M3: Still waiting');

    const dec4 = await decryptRatchetedDirectMessage<string>(enc4.envelope, dec3.session, bobKeys);
    expect(dec4.body).toBe('M4: Another update');

    const dec5 = await decryptRatchetedDirectMessage<string>(enc5.envelope, dec4.session, bobKeys);
    expect(dec5.body).toBe('M5: Final pre-reply');

    // Truth: Pre-first-DH-ratchet messages ARE decryptable if long-term static keys are compromised
    // because bootstrap was encapsulated against static recipient keys.
  });

  it('verifies post-DH-ratchet security: messages after Bob replies remain confidential even if long-term keys are compromised', async () => {
    const aliceKeys = createSovereignIdentity();
    const bobKeys = createSovereignIdentity();

    // Alice initiates and sends M1..M5
    const init = initiateSenderDMSession(aliceKeys, bobKeys.identity);
    let aliceSession = init.session;
    const bootstrap = init.bootstrap;

    const enc1 = await encryptRatchetedDirectMessage('M1', aliceSession, aliceKeys, bobKeys.identity, bootstrap);
    aliceSession = enc1.session;
    const enc2 = await encryptRatchetedDirectMessage('M2', aliceSession, aliceKeys, bobKeys.identity);
    aliceSession = enc2.session;
    const enc3 = await encryptRatchetedDirectMessage('M3', aliceSession, aliceKeys, bobKeys.identity);
    aliceSession = enc3.session;
    const enc4 = await encryptRatchetedDirectMessage('M4', aliceSession, aliceKeys, bobKeys.identity);
    aliceSession = enc4.session;
    const enc5 = await encryptRatchetedDirectMessage('M5', aliceSession, aliceKeys, bobKeys.identity);
    aliceSession = enc5.session;

    // Bob receives M1..M5 legitimately
    let bobSession = initiateReceiverDMSession(bobKeys, aliceKeys.identity, bootstrap);
    const d1 = await decryptRatchetedDirectMessage<string>(enc1.envelope, bobSession, bobKeys);
    const d2 = await decryptRatchetedDirectMessage<string>(enc2.envelope, d1.session, bobKeys);
    const d3 = await decryptRatchetedDirectMessage<string>(enc3.envelope, d2.session, bobKeys);
    const d4 = await decryptRatchetedDirectMessage<string>(enc4.envelope, d3.session, bobKeys);
    const d5 = await decryptRatchetedDirectMessage<string>(enc5.envelope, d4.session, bobKeys);
    bobSession = d5.session;

    // Bob replies: DH RATCHET TURN occurs here!
    const enc6 = await encryptRatchetedDirectMessage('M6: Bob reply', bobSession, bobKeys, aliceKeys.identity);
    bobSession = enc6.session;

    // Alice decrypts Bob's reply and turns her DH ratchet
    const d6 = await decryptRatchetedDirectMessage<string>(enc6.envelope, aliceSession, aliceKeys);
    aliceSession = d6.session;

    // Alice sends M7..M10 under the new post-DH ratchet root
    const enc7 = await encryptRatchetedDirectMessage('M7: Protected post-turn', aliceSession, aliceKeys, bobKeys.identity);
    aliceSession = enc7.session;
    const enc8 = await encryptRatchetedDirectMessage('M8: Highly confidential', aliceSession, aliceKeys, bobKeys.identity);
    aliceSession = enc8.session;
    const enc9 = await encryptRatchetedDirectMessage('M9: Still confidential', aliceSession, aliceKeys, bobKeys.identity);
    aliceSession = enc9.session;
    const enc10 = await encryptRatchetedDirectMessage('M10: Post-DH message', aliceSession, aliceKeys, bobKeys.identity);
    aliceSession = enc10.session;

    // Bob decrypts M7..M10 legitimately
    const d7 = await decryptRatchetedDirectMessage<string>(enc7.envelope, bobSession, bobKeys);
    const d8 = await decryptRatchetedDirectMessage<string>(enc8.envelope, d7.session, bobKeys);
    const d9 = await decryptRatchetedDirectMessage<string>(enc9.envelope, d8.session, bobKeys);
    const d10 = await decryptRatchetedDirectMessage<string>(enc10.envelope, d9.session, bobKeys);
    bobSession = d10.session;
    expect(d10.body).toBe('M10: Post-DH message');

    // Attacker compromise scenario:
    // Attacker only compromises Bob's long-term static keys (NOT Bob's ephemeral DH private key generated during reply).
    // Attacker reconstructs the pre-DH receiver session from bootstrap:
    const attackerPreDHSession = initiateReceiverDMSession(bobKeys, aliceKeys.identity, bootstrap);
    const attD1 = await decryptRatchetedDirectMessage<string>(enc1.envelope, attackerPreDHSession, bobKeys);
    const attD5 = await decryptRatchetedDirectMessage<string>(enc5.envelope, (await decryptRatchetedDirectMessage(enc4.envelope, (await decryptRatchetedDirectMessage(enc3.envelope, (await decryptRatchetedDirectMessage(enc2.envelope, attD1.session, bobKeys)).session, bobKeys)).session, bobKeys)).session, bobKeys);

    // Attacker attempts to decrypt M7..M10 without knowing Bob's ephemeral DH private key:
    // Bob's reply M6 used an ephemeral DH private key generated during Bob's send.
    // The attacker does NOT have Bob's ephemeral DH private key!
    await expect(decryptRatchetedDirectMessage(enc7.envelope, attD5.session, bobKeys)).rejects.toThrow();
    await expect(decryptRatchetedDirectMessage(enc10.envelope, attD5.session, bobKeys)).rejects.toThrow();
  });

  it('handles out-of-order delivery (1, 3, 5, 2, 4) with zero data loss or ratchet corruption', async () => {
    const aliceKeys = createSovereignIdentity();
    const bobKeys = createSovereignIdentity();

    const init = initiateSenderDMSession(aliceKeys, bobKeys.identity);
    let aliceSession = init.session;
    const bootstrap = init.bootstrap;

    // Send 5 messages in sequence
    const m1 = await encryptRatchetedDirectMessage('Msg 1', aliceSession, aliceKeys, bobKeys.identity, bootstrap);
    aliceSession = m1.session;
    const m2 = await encryptRatchetedDirectMessage('Msg 2', aliceSession, aliceKeys, bobKeys.identity);
    aliceSession = m2.session;
    const m3 = await encryptRatchetedDirectMessage('Msg 3', aliceSession, aliceKeys, bobKeys.identity);
    aliceSession = m3.session;
    const m4 = await encryptRatchetedDirectMessage('Msg 4', aliceSession, aliceKeys, bobKeys.identity);
    aliceSession = m4.session;
    const m5 = await encryptRatchetedDirectMessage('Msg 5', aliceSession, aliceKeys, bobKeys.identity);
    aliceSession = m5.session;

    let bobSession = initiateReceiverDMSession(bobKeys, aliceKeys.identity, bootstrap);

    // Deliver in scrambled order: 1, 3, 5, 2, 4
    const d1 = await decryptRatchetedDirectMessage<string>(m1.envelope, bobSession, bobKeys);
    expect(d1.body).toBe('Msg 1');
    bobSession = d1.session;

    // Message 3 arrives before 2 -> message 2 is skipped and stored in skipped keys
    const d3 = await decryptRatchetedDirectMessage<string>(m3.envelope, bobSession, bobKeys);
    expect(d3.body).toBe('Msg 3');
    bobSession = d3.session;

    // Message 5 arrives before 4 -> message 4 is skipped and stored in skipped keys
    const d5 = await decryptRatchetedDirectMessage<string>(m5.envelope, bobSession, bobKeys);
    expect(d5.body).toBe('Msg 5');
    bobSession = d5.session;

    // Now arrive out-of-order messages 2 and 4
    const d2 = await decryptRatchetedDirectMessage<string>(m2.envelope, bobSession, bobKeys);
    expect(d2.body).toBe('Msg 2');
    bobSession = d2.session;

    const d4 = await decryptRatchetedDirectMessage<string>(m4.envelope, bobSession, bobKeys);
    expect(d4.body).toBe('Msg 4');
    bobSession = d4.session;

    // Verify all skipped keys were consumed and cleared
    expect(bobSession.skippedMessageKeys.size).toBe(0);

    // Verify Bob can continue messaging with Alice smoothly
    const reply = await encryptRatchetedDirectMessage('Reply after scrambled receipt', bobSession, bobKeys, aliceKeys.identity);
    const aliceDecReply = await decryptRatchetedDirectMessage<string>(reply.envelope, aliceSession, aliceKeys);
    expect(aliceDecReply.body).toBe('Reply after scrambled receipt');
  });

  it('enforces skipped-message limit and prevents memory exhaustion on excessive gap', async () => {
    const aliceKeys = createSovereignIdentity();
    const bobKeys = createSovereignIdentity();

    const init = initiateSenderDMSession(aliceKeys, bobKeys.identity);
    const bootstrap = init.bootstrap;
    const bobSession = initiateReceiverDMSession(bobKeys, aliceKeys.identity, bootstrap);

    // Forge an envelope claiming messageIndex > MAX_SKIP_MESSAGES (e.g. index 1500)
    const validEnc = await encryptRatchetedDirectMessage('M', init.session, aliceKeys, bobKeys.identity, bootstrap);
    const forgedMessage = JSON.parse(JSON.stringify(validEnc.envelope.payload.message));
    forgedMessage.ratchetEnvelope.messageIndex = MAX_SKIP_MESSAGES + 500;
    const forgedEnvelope = createSignedEnvelope({ action: 'send', message: forgedMessage }, aliceKeys);

    await expect(
      decryptRatchetedDirectMessage(forgedEnvelope, bobSession, bobKeys)
    ).rejects.toThrow(/Too many skipped messages/);

    // Session remains uncorrupted and memory usage bounded
    expect(bobSession.skippedMessageKeys.size).toBe(0);
  });

  it('rejects duplicate frame replay at the client Double Ratchet engine', async () => {
    const aliceKeys = createSovereignIdentity();
    const bobKeys = createSovereignIdentity();

    const init = initiateSenderDMSession(aliceKeys, bobKeys.identity);
    const m1 = await encryptRatchetedDirectMessage('Unique message', init.session, aliceKeys, bobKeys.identity, init.bootstrap);

    let bobSession = initiateReceiverDMSession(bobKeys, aliceKeys.identity, init.bootstrap);
    const dec1 = await decryptRatchetedDirectMessage<string>(m1.envelope, bobSession, bobKeys);
    expect(dec1.body).toBe('Unique message');
    bobSession = dec1.session;

    // Attacker replays exact frame m1.envelope
    await expect(
      decryptRatchetedDirectMessage(m1.envelope, bobSession, bobKeys)
    ).rejects.toThrow(/Replayed or duplicate message index/);
  });

  it('fails closed on corrupted ratchet state without silent plaintext or v1 fallback', () => {
    expect(() => deserializeDoubleRatchetSession('{"corrupt": true}')).toThrow();
    expect(() => deserializeDoubleRatchetSession('not-even-json')).toThrow();
  });
});
