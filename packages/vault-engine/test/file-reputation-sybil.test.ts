import { describe, it, expect } from 'vitest';
import { generateKeyPair, signMessage, bytesToHex } from '@aetheris/core-crypto';
import {
  CollaborativeFileReputationVault,
  PeerVerdict,
  canonicalizePeerVerdict,
  FILE_REPUTATION_PROTOCOL_VERSION,
  DEFAULT_REPUTATION_NETWORK_ID,
} from '../src/index.js';

function signedVerdict(kp: ReturnType<typeof generateKeyPair>, values: Omit<PeerVerdict, 'signature' | 'nodePublicKeyHex'>): PeerVerdict {
  const verdict: PeerVerdict = {
    protocolVersion: FILE_REPUTATION_PROTOCOL_VERSION,
    networkId: DEFAULT_REPUTATION_NETWORK_ID,
    nodeId: kp.fingerprint,
    nodePublicKeyHex: kp.publicKeyHex,
    ...values,
  };
  verdict.signature = bytesToHex(signMessage(canonicalizePeerVerdict(verdict, kp.fingerprint), kp.privateKey));
  return verdict;
}

describe('Etapa 3: Sybil-Resistant File Reputation Hardening', () => {
  const testSha = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  it('rejects unsigned verdicts unconditionally', () => {
    const vault = new CollaborativeFileReputationVault();
    const result = vault.registerVerdict({
      sha256: testSha,
      verdict: 'CLEAN',
      confidence: 0.99,
      seederCount: 100,
      timestamp: Date.now(),
      // Missing signature and public key!
    });

    expect(result).toBe(false);
    expect(vault.lookupReputation(testSha)).toBeNull();
  });

  it('rejects verdicts where nodeId is spoofed or divorced from public key', () => {
    const vault = new CollaborativeFileReputationVault();
    const kp = generateKeyPair();
    const timestamp = Date.now();
    const spoofed = signedVerdict(kp, {
      sha256: testSha,
      verdict: 'CLEAN',
      confidence: 0.99,
      seederCount: 1,
      timestamp,
    });
    spoofed.nodeId = 'spoofed-attacker-node-id-1234';
    const result = vault.registerVerdict(spoofed);

    expect(result).toBe(false);
    expect(vault.lookupReputation(testSha)).toBeNull();
  });

  it('accepts valid canonical v2 signed verdict and binds nodeId to public key fingerprint', () => {
    const vault = new CollaborativeFileReputationVault();
    const kp = generateKeyPair();
    const timestamp = Date.now();

    const result = vault.registerVerdict(signedVerdict(kp, {
      sha256: testSha,
      verdict: 'CLEAN',
      confidence: 0.95,
      seederCount: 1,
      timestamp,
    }));

    expect(result).toBe(true);
    const rep = vault.lookupReputation(testSha);
    expect(rep).not.toBeNull();
    expect(rep!.verdict).toBe('CLEAN');
    expect(rep!.nodeCount).toBe(1);

    const storedVerdicts = vault.getPeerVerdicts(testSha);
    expect(storedVerdicts.length).toBe(1);
    expect(storedVerdicts[0].nodeId).toBe(kp.fingerprint);
  });

  it('prevents single-node Sybil inflation via seederCount multiplier', () => {
    const vault = new CollaborativeFileReputationVault();
    const timestamp = Date.now();

    // 2 Honest Nodes claim MALICIOUS (confidence 0.90 each, seederCount: 1)
    const honest1 = generateKeyPair();
    const honest2 = generateKeyPair();

    const reg1 = vault.registerVerdict(signedVerdict(honest1, {
      sha256: testSha,
      verdict: 'MALICIOUS',
      confidence: 0.9,
      seederCount: 1,
      timestamp,
    }));
    expect(reg1).toBe(true);

    const reg2 = vault.registerVerdict(signedVerdict(honest2, {
      sha256: testSha,
      verdict: 'MALICIOUS',
      confidence: 0.9,
      seederCount: 1,
      timestamp,
    }));
    expect(reg2).toBe(true);

    // 1 Rogue Node claims CLEAN with an astronomical seederCount (999,999) to overpower consensus
    const rogue = generateKeyPair();
    vault.registerVerdict(signedVerdict(rogue, {
      sha256: testSha,
      verdict: 'CLEAN',
      confidence: 0.99,
      seederCount: 999999, // Sybil attempt: inflated seeder count
      timestamp,
    }));

    // Consensus MUST NOT be swayed by the fake seeder count:
    // Honest: 2 votes * 0.90 weight = 1.8 weight for MALICIOUS
    // Rogue: 1 vote * 0.99 weight = 0.99 weight for CLEAN (bounded <= 1.0)
    // MALICIOUS must win consensus!
    const rep = vault.lookupReputation(testSha);
    expect(rep).not.toBeNull();
    expect(rep!.verdict).toBe('MALICIOUS');
    expect(rep!.nodeCount).toBe(3);
  });

  it('prevents multiple spam votes from the same nodeId', () => {
    const vault = new CollaborativeFileReputationVault();
    const timestamp = Date.now();
    const kp = generateKeyPair();

    // Node submits first vote for SUSPICIOUS
    vault.registerVerdict(signedVerdict(kp, {
      sha256: testSha,
      verdict: 'SUSPICIOUS',
      confidence: 0.80,
      seederCount: 1,
      timestamp,
    }));

    // Same node attempts to register again
    vault.registerVerdict(signedVerdict(kp, {
      sha256: testSha,
      verdict: 'SUSPICIOUS',
      confidence: 0.95,
      seederCount: 1,
      timestamp: timestamp + 100,
    }));

    const rep = vault.lookupReputation(testSha);
    expect(rep).not.toBeNull();
    expect(rep!.nodeCount).toBe(1); // Exactly 1 node counted, not 2
  });

  it('provides honest UNKNOWN state for files without sovereign attestations', () => {
    const vault = new CollaborativeFileReputationVault();
    const unknownSha = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

    // Standard lookup returns null by default
    expect(vault.lookupReputation(unknownSha)).toBeNull();

    // Explicit lookup with defaultToUnknown returns honest UNKNOWN
    const unknownRep = vault.lookupReputation(unknownSha, 5.2, { defaultToUnknown: true });
    expect(unknownRep).not.toBeNull();
    expect(unknownRep!.verdict).toBe('UNKNOWN');
    expect(unknownRep!.confidence).toBe(0);
    expect(unknownRep!.nodeCount).toBe(0);
    expect(unknownRep!.isMerkleVerified).toBe(false);
    expect(unknownRep!.summary).toContain('Status: UNKNOWN');

    // Helper getReputationOrUnknown
    const fallbackRep = vault.getReputationOrUnknown(unknownSha, 5.2);
    expect(fallbackRep.verdict).toBe('UNKNOWN');
    expect(fallbackRep.isMerkleVerified).toBe(false);
  });
});
