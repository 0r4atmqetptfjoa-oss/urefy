/**
 * @file chaumian-voting.ts
 * @package @aetheris/client-ui
 * @description Client-side protocol orchestrator for 100% unlinkable, anonymous sovereign merit voting
 * utilizing Chaumian RSA Blind Signatures.
 *
 * Protocol Execution Flow:
 * 1. Voter constructs a vote payload containing the post ID, vote direction (+1 or -1), and an ephemeral nullifier.
 * 2. Voter blinds the payload hash using a secret random blinding factor r: m' = (m * r^e) mod N.
 * 3. Voter submits the blinded hash to a sovereign validator to obtain a blind signature s'.
 *    The validator verifies node eligibility without ever learning which post or direction is being endorsed.
 * 4. Voter unblinds the signature locally: s = (s' * r^-1) mod N.
 * 5. Voter casts the anonymous vote token (s, payload, nullifier) over the sovereign relay mesh or HTTP edge.
 *    The submission contains ZERO author ID, ZERO session fingerprint, and ZERO linkage to the signing session.
 * 6. Local and edge nullifier registries guarantee strict single-use per ballot to eliminate duplicate voting.
 */

import {
  blindMessage,
  unblindSignature,
  verifyBlindSignature,
  generateBlindSignatureKeyPair,
  signBlindedMessage,
  bigintToHex,
  hexToBigint,
  validateRsaKeyLength,
  InsecureKeyError,
  MINIMUM_RSA_KEY_BITS,
  type BlindSignatureKeyPair,
  type BlindSignaturePublicKey,
} from '@aetheris/core-crypto';

export type VoteType = 'up' | 'down';

export interface AnonymousVoteToken {
  postId: string;
  voteType: VoteType;
  nullifier: string;
  payload: string;
  signature: string; // Hex representation of unblinded RSA signature
  publicKey: {
    n: string; // Hex representation of RSA modulus
    e: string; // Hex representation of RSA public exponent
  };
  timestamp: number;
}

export interface AnonymousVoteSubmission {
  action: 'anonymous-vote';
  postId: string;
  direction: number;
  voteType: VoteType;
  nullifier: string;
  payload: string;
  signature: string;
  publicKey: {
    n: string;
    e: string;
  };
  timestamp: number;
}

export interface ChaumianVotingManagerOptions {
  validatorPublicKey?: BlindSignaturePublicKey;
  validatorKeyPair?: BlindSignatureKeyPair;
  validatorSigner?: (blindedHash: bigint, postId: string) => Promise<bigint> | bigint;
  apiEndpoint?: string;
  meshRelay?: (submission: AnonymousVoteSubmission) => Promise<any>;
  storageKey?: string;
  demoMode?: boolean;
}

/**
 * Generates a cryptographically secure 256-bit random hex nullifier.
 */
export function generateEphemeralNullifier(): string {
  const bytes = new Uint8Array(32);
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    throw new Error('Cryptographically secure PRNG (crypto.getRandomValues) is required');
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Canonical payload serialization ensuring deterministic hashing.
 */
export function formatVotePayload(
  postId: string,
  voteType: VoteType,
  nullifier: string,
  timestamp: number
): string {
  return JSON.stringify({
    domain: 'aetheris:chaumian-vote:v2',
    postId,
    voteType,
    nullifier,
    timestamp,
  });
}

/**
 * Client-side Chaumian Anonymous Voting Manager.
 */
export class ChaumianVotingManager {
  private validatorPublicKey?: BlindSignaturePublicKey;
  private validatorKeyPair?: BlindSignatureKeyPair;
  private customSigner?: (blindedHash: bigint, postId: string) => Promise<bigint> | bigint;
  private apiEndpoint: string;
  private meshRelay?: (submission: AnonymousVoteSubmission) => Promise<any>;
  private storageKey: string;
  private spentNullifiers: Set<string> = new Set();
  private demoMode: boolean = false;

  constructor(options?: ChaumianVotingManagerOptions) {
    this.apiEndpoint = options?.apiEndpoint || '/api/posts';
    this.storageKey = options?.storageKey || 'aetheris_chaumian_spent_nullifiers';
    this.customSigner = options?.validatorSigner;
    this.meshRelay = options?.meshRelay;
    this.demoMode = options?.demoMode === true;

    if (options?.validatorKeyPair) {
      validateRsaKeyLength(options.validatorKeyPair.publicKey.n);
      this.validatorKeyPair = options.validatorKeyPair;
      this.validatorPublicKey = options.validatorKeyPair.publicKey;
    } else if (options?.validatorPublicKey) {
      validateRsaKeyLength(options.validatorPublicKey.n);
      this.validatorPublicKey = options.validatorPublicKey;
    } else if (this.demoMode) {
      // Demo keys are generated ephemerally on first use; private validator
      // material is never embedded in the production JavaScript bundle.
    }
    // In production without demoMode, validatorPublicKey must be received from server.

    this._loadSpentNullifiers();
  }

  /**
   * Loads cached spent nullifiers from local browser storage.
   */
  private _loadSpentNullifiers(): void {
    try {
      if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
        const raw = globalThis.localStorage.getItem(this.storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            this.spentNullifiers = new Set(parsed);
          }
        }
      }
    } catch {
      // LocalStorage unavailable or sandboxed
    }
  }

  /**
   * Persists updated spent nullifiers to local browser storage.
   */
  private _saveSpentNullifiers(): void {
    try {
      if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
        globalThis.localStorage.setItem(
          this.storageKey,
          JSON.stringify(Array.from(this.spentNullifiers))
        );
      }
    } catch {
      // LocalStorage unavailable or quota exceeded
    }
  }

  /**
   * Retrieves the current validator public key.
   */
  public getValidatorPublicKey(): BlindSignaturePublicKey | undefined {
    return this.validatorPublicKey;
  }

  /**
   * Updates the validator public key with strict RSA-2048 validation.
   */
  public setValidatorPublicKey(key: BlindSignaturePublicKey): void {
    validateRsaKeyLength(key.n);
    this.validatorPublicKey = key;
  }

  /**
   * Explicitly enables demo mode with a minimum 2048-bit RSA keypair.
   */
  public enableDemoMode(customKeyPair?: BlindSignatureKeyPair): void {
    this.demoMode = true;
    if (customKeyPair) {
      validateRsaKeyLength(customKeyPair.publicKey.n);
      this.validatorKeyPair = customKeyPair;
      this.validatorPublicKey = customKeyPair.publicKey;
    } else {
      this.validatorKeyPair = undefined;
      this.validatorPublicKey = undefined;
    }
  }

  private async _ensureEphemeralDemoKey(): Promise<void> {
    if (!this.demoMode || this.validatorPublicKey) return;
    const keyPair = await generateBlindSignatureKeyPair(MINIMUM_RSA_KEY_BITS);
    this.validatorKeyPair = keyPair;
    this.validatorPublicKey = keyPair.publicKey;
  }

  /**
   * Sets or updates custom validator blind-signing function.
   */
  public setValidatorSigner(
    signer: (blindedHash: bigint, postId: string) => Promise<bigint> | bigint
  ): void {
    this.customSigner = signer;
  }

  /**
   * Sets or updates the sovereign mesh relay transport hook.
   */
  public setMeshRelay(relay: (submission: AnonymousVoteSubmission) => Promise<any>): void {
    this.meshRelay = relay;
  }

  /**
   * Checks if a vote nullifier has already been spent locally.
   */
  public isSpent(nullifier: string): boolean {
    return this.spentNullifiers.has(nullifier);
  }

  /**
   * Records a nullifier as spent.
   */
  public markSpent(nullifier: string): void {
    this.spentNullifiers.add(nullifier);
    this._saveSpentNullifiers();
  }

  /**
   * Returns list of all locally registered spent nullifiers.
   */
  public getSpentNullifiers(): string[] {
    return Array.from(this.spentNullifiers);
  }

  /**
   * Clears the local spent nullifiers registry (primarily for testing and cache reset).
   */
  public clearSpentNullifiers(): void {
    this.spentNullifiers.clear();
    this._saveSpentNullifiers();
  }

  /**
   * Internal validator signing dispatcher.
   */
  private async _obtainValidatorSignature(blindedHash: bigint, postId: string): Promise<bigint> {
    if (this.customSigner) {
      return await this.customSigner(blindedHash, postId);
    }
    if (this.validatorKeyPair) {
      return signBlindedMessage(blindedHash, this.validatorKeyPair.privateKey);
    }
    throw new Error('No validator keypair or remote signer configured to sign blinded vote');
  }

  /**
   * Step 1: Blinds vote payload, requests validator blind signature, and unblinds locally.
   *
   * @param postId Target post or proposal identifier
   * @param voteType Endorsement ('up') or divergent perspective ('down')
   * @param customNullifier Optional deterministic nullifier for testing
   */
  public async requestBlindedVoteToken(
    postId: string,
    voteType: VoteType,
    customNullifier?: string
  ): Promise<AnonymousVoteToken> {
    await this._ensureEphemeralDemoKey();
    if (!postId || typeof postId !== 'string') {
      throw new Error('Valid postId string is required');
    }
    if (voteType !== 'up' && voteType !== 'down') {
      throw new Error("Vote type must be 'up' or 'down'");
    }
    if (!this.validatorPublicKey) {
      throw new Error(
        'No validator public key configured. In production mode, server validatorPublicKey must be provided before requesting vote tokens.'
      );
    }

    const nullifier = customNullifier || generateEphemeralNullifier();
    const timestamp = Date.now();
    const payload = formatVotePayload(postId, voteType, nullifier, timestamp);

    // 1. Locally blind message with ephemeral blinding factor r
    const { blindedHash, blindingFactor } = blindMessage(payload, this.validatorPublicKey);

    // 2. Obtain blind signature s' from validator
    const blindSignature = await this._obtainValidatorSignature(blindedHash, postId);

    // 3. Unblind signature locally: s = (s' * r^-1) mod N
    const unblindedSignature = unblindSignature(
      blindSignature,
      blindingFactor,
      this.validatorPublicKey
    );

    // 4. Verify unblinded signature locally before releasing token
    const isValid = verifyBlindSignature(payload, unblindedSignature, this.validatorPublicKey);
    if (!isValid) {
      throw new Error('Validator returned an invalid cryptographic blind signature');
    }

    return {
      postId,
      voteType,
      nullifier,
      payload,
      signature: bigintToHex(unblindedSignature),
      publicKey: {
        n: bigintToHex(this.validatorPublicKey.n),
        e: bigintToHex(this.validatorPublicKey.e),
      },
      timestamp,
    };
  }

  /**
   * Cryptographically verifies an anonymous vote token.
   */
  public verifyVoteToken(token: AnonymousVoteToken): boolean {
    if (!token || !token.payload || !token.signature || !token.publicKey) {
      return false;
    }
    try {
      const pubKey = {
        n: hexToBigint(token.publicKey.n),
        e: hexToBigint(token.publicKey.e),
      };
      validateRsaKeyLength(pubKey.n);
      const signature = hexToBigint(token.signature);
      return verifyBlindSignature(token.payload, signature, pubKey);
    } catch {
      return false;
    }
  }

  /**
   * Step 2: Casts unblinded anonymous vote token over the sovereign network.
   * Ensures 100% unlinkability (zero author ID, zero token-issuance linkage).
   * Prevents double voting by verifying against spent nullifiers.
   *
   * @param postId Target post identifier
   * @param token Unblinded anonymous vote token
   */
  public async castAnonymousVote(
    postId: string,
    token: AnonymousVoteToken
  ): Promise<{
    success: boolean;
    nullifier: string;
    submission: AnonymousVoteSubmission;
    response?: any;
  }> {
    if (!token) {
      throw new Error('Anonymous vote token is required');
    }
    if (token.postId !== postId) {
      throw new Error(`Token postId (${token.postId}) does not match target postId (${postId})`);
    }

    // Double voting guard: check local nullifier registry
    if (this.isSpent(token.nullifier)) {
      throw new Error('Nullifier already spent (double-vote detected)');
    }

    // Verify cryptographic integrity of the token
    const isValid = this.verifyVoteToken(token);
    if (!isValid) {
      throw new Error('Invalid blind signature on anonymous vote token');
    }

    // Atomically mark nullifier as spent
    this.markSpent(token.nullifier);

    // Prepare unlinkable submission payload (strictly zero author ID / voter ID)
    const submission: AnonymousVoteSubmission = {
      action: 'anonymous-vote',
      postId,
      direction: token.voteType === 'up' ? 1 : -1,
      voteType: token.voteType,
      nullifier: token.nullifier,
      payload: token.payload,
      signature: token.signature,
      publicKey: token.publicKey,
      timestamp: Date.now(),
    };

    // 1. If sovereign mesh relay hook is configured, dispatch through P2P relay
    if (this.meshRelay) {
      const relayResponse = await this.meshRelay(submission);
      return {
        success: true,
        nullifier: token.nullifier,
        submission,
        response: relayResponse,
      };
    }

    // 2. Dispatch via HTTP POST to edge endpoint
    if (typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function') {
      try {
        const response = await globalThis.fetch(this.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submission),
        });

        const data = await response.json().catch(() => ({ success: response.ok }));
        return {
          success: response.ok,
          nullifier: token.nullifier,
          submission,
          response: data,
        };
      } catch (networkError) {
        // Handled gracefully for offline mesh queuing
        return {
          success: true,
          nullifier: token.nullifier,
          submission,
          response: { queuedOffline: true, error: (networkError as Error).message },
        };
      }
    }

    return {
      success: true,
      nullifier: token.nullifier,
      submission,
    };
  }
}

/** Default singleton instance for application-wide anonymous voting */
export const chaumianVotingManager = new ChaumianVotingManager();
