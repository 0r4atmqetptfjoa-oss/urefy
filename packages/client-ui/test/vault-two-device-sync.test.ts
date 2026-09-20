import { describe, it, expect, beforeEach } from 'vitest';
import { deriveVaultKey, createSovereignIdentity, createSignedEnvelope } from '@aetheris/core-crypto';
import { onRequestGet, onRequestPost, resetMemoryVaultSyncStore } from '../functions/api/vault-sync.js';

// Helper: Hex conversion
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}
function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

describe('Encrypted Cross-Device Vault Synchronization (Pass 5 Mandatory E2E)', () => {
  beforeEach(() => {
    resetMemoryVaultSyncStore();
  });

  it('verifies deterministic zero-knowledge synchronization between two devices sharing the same identity', async () => {
    // =========================================================================
    // 1. SETUP: Shared Sovereign Identity (Recovered on Device A and Device B)
    // =========================================================================
    const masterRecoverySeed = new Uint8Array(32).fill(0x37); // Seed from BIP-39 mnemonic
    const sovereignIdentityA = createSovereignIdentity({ seed: masterRecoverySeed });
    const sovereignIdentityB = createSovereignIdentity({ seed: masterRecoverySeed });

    // Both devices derive identical fingerprints and signing keys
    expect(sovereignIdentityA.identity.fingerprint).toBe(sovereignIdentityB.identity.fingerprint);
    const ownerFingerprint = sovereignIdentityA.identity.fingerprint;

    // Both devices derive the EXACT same 256-bit AES-GCM Vault Key via domain-separated HKDF
    const vaultKeyBytesA = deriveVaultKey(masterRecoverySeed);
    const vaultKeyBytesB = deriveVaultKey(masterRecoverySeed);
    expect(toHex(vaultKeyBytesA)).toBe(toHex(vaultKeyBytesB));

    const cryptoKeyA = await crypto.subtle.importKey(
      'raw',
      vaultKeyBytesA as unknown as ArrayBuffer,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    const cryptoKeyB = await crypto.subtle.importKey(
      'raw',
      vaultKeyBytesB as unknown as ArrayBuffer,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    // =========================================================================
    // 2. DEVICE A: Saves Post 1, Post 2, creates collection, and writes private note
    // =========================================================================
    const deviceAState = {
      version: 1,
      syncVersion: 1,
      owner: ownerFingerprint,
      items: [
        {
          id: 'post:zk-starks-intro',
          owner: ownerFingerprint,
          type: 'post',
          source: { kind: 'post', id: 'zk-starks-intro', author: '0x9999', channelId: 'relays-crypto', createdAt: Date.now() },
          title: 'STARKs and Scalable Transparent Arguments',
          content: 'Transparent setup, post-quantum collision resistance.',
          collectionId: 'col-pqc',
          tags: ['saved', 'stark'],
          createdAt: 1000,
          updatedAt: 1000,
          version: 1,
        },
        {
          id: 'post:quantum-safe-tls',
          owner: ownerFingerprint,
          type: 'post',
          source: { kind: 'post', id: 'quantum-safe-tls', author: '0x8888', channelId: 'relays-crypto', createdAt: Date.now() },
          title: 'Hybrid ML-KEM Key Encapsulation in TLS 1.3',
          content: 'Draft-ietf-tls-hybrid-design implementation overview.',
          collectionId: 'col-pqc',
          tags: ['saved', 'tls'],
          createdAt: 1100,
          updatedAt: 1100,
          version: 1,
        },
        {
          id: 'note-master-recovery',
          owner: ownerFingerprint,
          type: 'note',
          source: { kind: 'manual', id: 'note-master-recovery', author: ownerFingerprint, createdAt: Date.now() },
          title: 'Recovery Phrase Security Invariants',
          content: 'Mnemonic entropy must remain strictly offline in cold airgap storage.',
          collectionId: 'col-pqc',
          tags: ['note', 'security'],
          createdAt: 1200,
          updatedAt: 1200,
          version: 1,
        },
      ],
      collections: [
        {
          id: 'col-pqc',
          name: 'Post-Quantum Ledger',
          description: 'Lattice cryptography research and benchmarks',
          icon: '🛡️',
          createdAt: 1000,
          updatedAt: 1000,
          version: 1,
        },
      ],
      lastSyncedAt: Date.now(),
    };

    // Encrypt state on Device A
    const plainBytesA = new TextEncoder().encode(JSON.stringify(deviceAState));
    const ivA = crypto.getRandomValues(new Uint8Array(12));
    const encBufferA = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: ivA }, cryptoKeyA, plainBytesA);
    const ciphertextA = toHex(new Uint8Array(encBufferA));
    const ivHexA = toHex(ivA);

    // =========================================================================
    // 3. SERVER TRANSMISSION: Verify Server Sees CIPHERTEXT ONLY
    // =========================================================================
    // Check that ciphertext is opaque and leaks zero plaintext
    expect(ciphertextA).not.toContain('Recovery Phrase Security Invariants');
    expect(ciphertextA).not.toContain('Post-Quantum Ledger');
    expect(ciphertextA).not.toContain('Mnemonic entropy');

    // Create sovereign signed envelope from Device A
    const postPayload = {
      owner: ownerFingerprint,
      version: 1,
      itemCount: 3,
      ciphertext: ciphertextA,
      iv: ivHexA,
    };
    const signedUploadEnvelope = createSignedEnvelope(postPayload, sovereignIdentityA);

    // POST /api/vault-sync
    const postReq = new Request('https://urefy.com/api/vault-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sovereign-Envelope': JSON.stringify(signedUploadEnvelope),
      },
      body: JSON.stringify(signedUploadEnvelope),
    });

    const postResponse = await onRequestPost({ request: postReq });
    expect(postResponse.status).toBe(200);
    const postResult = await postResponse.json();
    expect(postResult.success).toBe(true);
    expect(postResult.version).toBe(1);

    // =========================================================================
    // 4. DEVICE B: Restores identity, queries /api/vault-sync, decrypts and validates
    // =========================================================================
    const signedGetEnvelopeB = createSignedEnvelope(
      { action: 'vault:read', owner: ownerFingerprint, timestamp: Date.now() },
      sovereignIdentityB
    );

    const getReqB = new Request(`https://urefy.com/api/vault-sync?owner=${ownerFingerprint}`, {
      method: 'GET',
      headers: {
        'X-Sovereign-Envelope': JSON.stringify(signedGetEnvelopeB),
      },
    });

    const getResponseB = await onRequestGet({ request: getReqB });
    expect(getResponseB.status).toBe(200);
    const getResultB = await getResponseB.json();
    expect(getResultB.success).toBe(true);
    expect(getResultB.ciphertext).toBe(ciphertextA);

    // Device B decrypts the ciphertext using its own derived Vault key
    const decryptedBufferB = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromHex(getResultB.iv) },
      cryptoKeyB,
      fromHex(getResultB.ciphertext)
    );
    const decryptedStateB = JSON.parse(new TextDecoder().decode(decryptedBufferB));

    // Verify all data matched Device A perfectly!
    expect(decryptedStateB.items).toHaveLength(3);
    expect(decryptedStateB.items.map((i: any) => i.id)).toContain('post:zk-starks-intro');
    expect(decryptedStateB.items.map((i: any) => i.id)).toContain('post:quantum-safe-tls');
    expect(decryptedStateB.items.find((i: any) => i.id === 'note-master-recovery').title).toBe(
      'Recovery Phrase Security Invariants'
    );
    expect(decryptedStateB.collections[0].name).toBe('Post-Quantum Ledger');

    // =========================================================================
    // 5. DEVICE B MUTATES STATE: Renames collection, edits note, unsaves Post 1
    // =========================================================================
    // Rename collection
    decryptedStateB.collections[0].name = 'Post-Quantum Ledger (Active)';
    decryptedStateB.collections[0].updatedAt = 2000;
    decryptedStateB.collections[0].version = 2;

    // Edit note
    const note = decryptedStateB.items.find((i: any) => i.id === 'note-master-recovery');
    note.content += ' Verified on hardware secure enclave.';
    note.updatedAt = 2100;
    note.version = 2;

    // Unsave Post 1 via tombstone
    const post1 = decryptedStateB.items.find((i: any) => i.id === 'post:zk-starks-intro');
    post1.deleted = true;
    post1.updatedAt = 2200;
    post1.version = 2;

    decryptedStateB.syncVersion = 2;

    // Encrypt updated state from Device B
    const plainBytesB = new TextEncoder().encode(JSON.stringify(decryptedStateB));
    const ivB = crypto.getRandomValues(new Uint8Array(12));
    const encBufferB = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: ivB }, cryptoKeyB, plainBytesB);
    const ciphertextB = toHex(new Uint8Array(encBufferB));

    const signedUploadEnvelopeB = createSignedEnvelope(
      {
        owner: ownerFingerprint,
        version: 2,
        itemCount: 2, // 2 active items (1 tombstoned)
        ciphertext: ciphertextB,
        iv: toHex(ivB),
      },
      sovereignIdentityB
    );

    const postReqB = new Request('https://urefy.com/api/vault-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sovereign-Envelope': JSON.stringify(signedUploadEnvelopeB),
      },
      body: JSON.stringify(signedUploadEnvelopeB),
    });

    const postResB = await onRequestPost({ request: postReqB });
    expect(postResB.status).toBe(200);

    // =========================================================================
    // 6. DEVICE A SYNCS: Converges to Device B's state without resurrection
    // =========================================================================
    const signedGetEnvelopeA2 = createSignedEnvelope(
      { action: 'vault:read', owner: ownerFingerprint, timestamp: Date.now() },
      sovereignIdentityA
    );

    const getReqA2 = new Request(`https://urefy.com/api/vault-sync?owner=${ownerFingerprint}`, {
      method: 'GET',
      headers: {
        'X-Sovereign-Envelope': JSON.stringify(signedGetEnvelopeA2),
      },
    });

    const getResA2 = await onRequestGet({ request: getReqA2 });
    const getResultA2 = await getResA2.json();

    const decryptedBufferA2 = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromHex(getResultA2.iv) },
      cryptoKeyA,
      fromHex(getResultA2.ciphertext)
    );
    const finalStateA = JSON.parse(new TextDecoder().decode(decryptedBufferA2));

    // Verify convergence on Device A:
    // 1. Post 1 remains tombstoned / unsaved (no resurrection!)
    const p1 = finalStateA.items.find((i: any) => i.id === 'post:zk-starks-intro');
    expect(p1.deleted).toBe(true);

    // 2. Collection was renamed
    expect(finalStateA.collections[0].name).toBe('Post-Quantum Ledger (Active)');

    // 3. Note contains Device B edit
    const nA = finalStateA.items.find((i: any) => i.id === 'note-master-recovery');
    expect(nA.content).toContain('Verified on hardware secure enclave.');

    // =========================================================================
    // 7. SECURITY & IDOR DEFENSE: Third Party (Device C) cannot access or decrypt
    // =========================================================================
    const adversarySeed = new Uint8Array(32).fill(0x99); // Different identity
    const adversaryIdentity = createSovereignIdentity({ seed: adversarySeed });

    // Adversary signs a request attempting to read Device A's vault
    const maliciousGetEnvelope = createSignedEnvelope(
      { action: 'vault:read', owner: ownerFingerprint, timestamp: Date.now() },
      adversaryIdentity
    );

    const maliciousGetReq = new Request(`https://urefy.com/api/vault-sync?owner=${ownerFingerprint}`, {
      method: 'GET',
      headers: {
        'X-Sovereign-Envelope': JSON.stringify(maliciousGetEnvelope),
      },
    });

    // Server strictly rejects with HTTP 403 Forbidden
    const maliciousRes = await onRequestGet({ request: maliciousGetReq });
    expect(maliciousRes.status).toBe(403);
    const maliciousBody = await maliciousRes.json();
    expect(maliciousBody.error).toContain('Unauthorized');

    // Cryptographic rejection: Even if adversary somehow obtained ciphertextB,
    // attempting decryption with adversary's derived vault key fails authenticated AES-GCM
    const adversaryVaultKeyBytes = deriveVaultKey(adversarySeed);
    const adversaryCryptoKey = await crypto.subtle.importKey(
      'raw',
      adversaryVaultKeyBytes as unknown as ArrayBuffer,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    await expect(
      crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: fromHex(getResultA2.iv) },
        adversaryCryptoKey,
        fromHex(getResultA2.ciphertext)
      )
    ).rejects.toThrow();
  });
});
