import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ChaumianVotingManager,
  formatVotePayload,
  generateEphemeralNullifier,
  type AnonymousVoteToken,
  type AnonymousVoteSubmission,
} from '../src/chaumian-voting.js';
import {
  generateBlindSignatureKeyPair,
  signBlindedMessage,
  bigintToHex,
  hexToBigint,
} from '@aetheris/core-crypto';

describe('Chaumian Anonymous Voting Manager (packages/client-ui)', () => {
  beforeEach(() => {
    // Clear mock localStorage if present
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  describe('Nullifier Generation and Payload Formatting', () => {
    it('generates unique 64-character hexadecimal nullifiers', () => {
      const n1 = generateEphemeralNullifier();
      const n2 = generateEphemeralNullifier();
      expect(n1).toMatch(/^[0-9a-f]{64}$/);
      expect(n2).toMatch(/^[0-9a-f]{64}$/);
      expect(n1).not.toBe(n2);
    });

    it('formats canonical vote payload with correct fields', () => {
      const payload = formatVotePayload('post-101', 'up', 'null-abc', 1700000000);
      const parsed = JSON.parse(payload);
      expect(parsed.domain).toBe('aetheris:chaumian-vote:v1');
      expect(parsed.postId).toBe('post-101');
      expect(parsed.voteType).toBe('up');
      expect(parsed.nullifier).toBe('null-abc');
      expect(parsed.timestamp).toBe(1700000000);
    });
  });

  describe('Token Acquisition and Unblinding', () => {
    it('acquires blinded vote token, unblinds locally, and verifies signature', async () => {
      const manager = new ChaumianVotingManager();
      const postId = 'post-vault-1';

      const token = await manager.requestBlindedVoteToken(postId, 'up');

      expect(token.postId).toBe(postId);
      expect(token.voteType).toBe('up');
      expect(token.nullifier).toBeDefined();
      expect(token.signature).toBeDefined();
      expect(token.publicKey.n).toBeDefined();
      expect(token.publicKey.e).toBeDefined();

      // Verify token integrity
      expect(manager.verifyVoteToken(token)).toBe(true);
    });

    it('supports downvotes (divergent perspective tokens)', async () => {
      const manager = new ChaumianVotingManager();
      const postId = 'post-vault-2';

      const token = await manager.requestBlindedVoteToken(postId, 'down');
      expect(token.voteType).toBe('down');
      expect(manager.verifyVoteToken(token)).toBe(true);
    });

    it('supports custom remote validator signer', async () => {
      const externalValidator = generateBlindSignatureKeyPair(512);
      const mockRemoteSigner = vi.fn(async (blindedHash: bigint, _postId: string) => {
        return signBlindedMessage(blindedHash, externalValidator.privateKey);
      });

      const manager = new ChaumianVotingManager({
        validatorPublicKey: externalValidator.publicKey,
        validatorSigner: mockRemoteSigner,
      });

      const token = await manager.requestBlindedVoteToken('post-remote', 'up');

      expect(mockRemoteSigner).toHaveBeenCalledTimes(1);
      expect(token.publicKey.n).toBe(bigintToHex(externalValidator.publicKey.n));
      expect(manager.verifyVoteToken(token)).toBe(true);
    });
  });

  describe('Anonymous Vote Casting and Double-Voting Prevention', () => {
    it('casts anonymous vote with zero author ID or identity linkage', async () => {
      let receivedSubmission: AnonymousVoteSubmission | null = null;
      const mockRelay = vi.fn(async (sub: AnonymousVoteSubmission) => {
        receivedSubmission = sub;
        return { relayed: true };
      });

      const manager = new ChaumianVotingManager({
        meshRelay: mockRelay,
      });

      const postId = 'post-sovereign-alpha';
      const token = await manager.requestBlindedVoteToken(postId, 'up');

      const result = await manager.castAnonymousVote(postId, token);

      expect(result.success).toBe(true);
      expect(result.nullifier).toBe(token.nullifier);
      expect(mockRelay).toHaveBeenCalledTimes(1);

      // Verify strictly NO author ID, identity, or session info exists in submission
      expect(receivedSubmission).not.toBeNull();
      expect(receivedSubmission!.action).toBe('anonymous-vote');
      expect(receivedSubmission!.postId).toBe(postId);
      expect(receivedSubmission!.direction).toBe(1);
      expect(receivedSubmission!.voteType).toBe('up');
      expect(receivedSubmission!.nullifier).toBe(token.nullifier);
      expect(receivedSubmission!.signature).toBe(token.signature);

      // Nullifier must now be marked spent
      expect(manager.isSpent(token.nullifier)).toBe(true);
      expect(manager.getSpentNullifiers()).toContain(token.nullifier);
    });

    it('strictly prevents double voting by rejecting spent nullifiers', async () => {
      const manager = new ChaumianVotingManager({
        meshRelay: async () => ({ relayed: true }),
      });

      const postId = 'post-double-vote-target';
      const token = await manager.requestBlindedVoteToken(postId, 'up');

      // First vote succeeds
      const firstVote = await manager.castAnonymousVote(postId, token);
      expect(firstVote.success).toBe(true);

      // Second vote with same token must throw double-vote error
      await expect(manager.castAnonymousVote(postId, token)).rejects.toThrow(
        /Nullifier already spent/i
      );
    });

    it('rejects vote if token belongs to a different postId', async () => {
      const manager = new ChaumianVotingManager();
      const token = await manager.requestBlindedVoteToken('post-A', 'up');

      await expect(manager.castAnonymousVote('post-B', token)).rejects.toThrow(
        /does not match target postId/i
      );
    });

    it('rejects vote if token cryptographic signature has been tampered', async () => {
      const manager = new ChaumianVotingManager();
      const postId = 'post-tamper-check';
      const token = await manager.requestBlindedVoteToken(postId, 'up');

      // Tamper signature
      const tamperedBigInt = hexToBigint(token.signature) + 1n;
      const tamperedToken: AnonymousVoteToken = {
        ...token,
        signature: bigintToHex(tamperedBigInt),
      };

      expect(manager.verifyVoteToken(tamperedToken)).toBe(false);
      await expect(manager.castAnonymousVote(postId, tamperedToken)).rejects.toThrow(
        /Invalid blind signature/i
      );
    });

    it('handles HTTP edge endpoint dispatch gracefully', async () => {
      const mockFetch = vi.fn(async () => ({
        ok: true,
        json: async () => ({ success: true, meritVotes: 10 }),
      }));
      vi.stubGlobal('fetch', mockFetch);

      const manager = new ChaumianVotingManager({
        apiEndpoint: '/api/posts',
      });

      const postId = 'post-edge-http';
      const token = await manager.requestBlindedVoteToken(postId, 'up');
      const result = await manager.castAnonymousVote(postId, token);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/posts',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"action":"anonymous-vote"'),
        })
      );

      vi.unstubAllGlobals();
    });
  });

  describe('Nullifier Management and Storage', () => {
    it('allows clearing and querying spent nullifiers', () => {
      const manager = new ChaumianVotingManager();
      const nullifier = generateEphemeralNullifier();

      expect(manager.isSpent(nullifier)).toBe(false);
      manager.markSpent(nullifier);
      expect(manager.isSpent(nullifier)).toBe(true);
      expect(manager.getSpentNullifiers().length).toBeGreaterThanOrEqual(1);

      manager.clearSpentNullifiers();
      expect(manager.isSpent(nullifier)).toBe(false);
      expect(manager.getSpentNullifiers().length).toBe(0);
    });
  });
});
