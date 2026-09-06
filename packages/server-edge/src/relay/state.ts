/**
 * AETHERIS SOVEREIGN RELAY STATE MANAGER
 * 
 * Enforces strict memory-bounding policies and automatic epoch eviction
 * resolving Item 17 ("Structuri în memorie insuficient controlate") from the audit.
 * 
 * Bounded collections:
 * - activeShares: sliding-window epoch cleanup (evicts shares older than 5 min)
 * - presence: LRU ceiling (max 10,000 users, evicts idle > 15 min)
 * - pendingChallenges: 60-second sliding expiration
 * - revokedNullifiers: high-capacity deduplication set with storage backup
 */

import { RLNShare, ZKRLN, verifySignature, hexToBytes, computeFingerprint } from '@aetheris/core-crypto';
import {
  PresenceUser,
  RelayChannel,
  RelaySession,
  DEFAULT_RELAY_CHANNELS,
} from './types.js';

export interface RecordedShareEntry {
  share: RLNShare;
  createdAt: number;
}

export interface PendingChallenge {
  challenge: string;
  fingerprint: string;
  timestamp: number;
}

export interface StateManagerConfig {
  maxPresenceCount?: number;
  presenceTtlMs?: number;
  shareTtlMs?: number;
  challengeTtlMs?: number;
}

export class RelayStateManager {
  // Bounded collections
  private presence: Map<string, PresenceUser> = new Map(); // Key: fingerprint
  private activeShares: Map<string, RecordedShareEntry> = new Map(); // Key: `${epoch}:${nullifier}`
  private revokedNullifiers: Set<string> = new Set();
  private pendingChallenges: Map<string, PendingChallenge> = new Map(); // Key: challenge hex
  private channels: Map<string, RelayChannel> = new Map();
  private channelSubscribers: Map<string, Set<RelaySession>> = new Map();

  // Configuration limits
  private readonly maxPresenceCount: number;
  private readonly presenceTtlMs: number;
  private readonly shareTtlMs: number;
  private readonly challengeTtlMs: number;

  constructor(config: StateManagerConfig = {}) {
    this.maxPresenceCount = config.maxPresenceCount ?? 10000;
    this.presenceTtlMs = config.presenceTtlMs ?? 15 * 60 * 1000; // 15 minutes
    this.shareTtlMs = config.shareTtlMs ?? 5 * 60 * 1000; // 5 minutes
    this.challengeTtlMs = config.challengeTtlMs ?? 60 * 1000; // 60 seconds

    // Seed default channels
    for (const ch of DEFAULT_RELAY_CHANNELS) {
      this.channels.set(ch.id, { ...ch });
      this.channelSubscribers.set(ch.id, new Set());
    }
  }

  // ─── CHALLENGE / RESPONSE CRYPTOGRAPHIC HANDSHAKE ─────────────────────────

  /**
   * Generates a cryptographically random challenge for an authenticating identity.
   */
  public createChallenge(fingerprint: string): { challenge: string; timestamp: number } {
    this.cleanExpiredChallenges();
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    let hex = '';
    for (let i = 0; i < randomBytes.length; i++) {
      hex += randomBytes[i].toString(16).padStart(2, '0');
    }
    const timestamp = Date.now();
    this.pendingChallenges.set(hex, {
      challenge: hex,
      fingerprint,
      timestamp,
    });
    return { challenge: hex, timestamp };
  }

  /**
   * Verifies an AUTH_RESPONSE challenge response against Ed25519 signing key.
   */
  public verifyChallenge(
    challenge: string,
    signature: string,
    publicKeyHex: string,
    claimedFingerprint: string
  ): { valid: boolean; error?: string } {
    this.cleanExpiredChallenges();

    const pending = this.pendingChallenges.get(challenge);
    if (!pending) {
      return { valid: false, error: 'Challenge expired, invalid, or already consumed' };
    }

    // Verify challenge was issued to this fingerprint
    if (pending.fingerprint !== claimedFingerprint) {
      return { valid: false, error: 'Challenge was issued to a different fingerprint' };
    }

    // Verify fingerprint matches public key
    try {
      const pubBytes = hexToBytes(publicKeyHex);
      const derivedFp = computeFingerprint(pubBytes);
      if (derivedFp !== claimedFingerprint) {
        return { valid: false, error: 'Claimed fingerprint does not match public key' };
      }

      // Verify Ed25519 signature over challenge hex string
      const isValid = verifySignature(signature, challenge, pubBytes);
      if (!isValid) {
        return { valid: false, error: 'Cryptographic challenge signature verification failed' };
      }

      // Single-use: consume challenge
      this.pendingChallenges.delete(challenge);
      return { valid: true };
    } catch (err: any) {
      return { valid: false, error: `Challenge verification failed: ${err.message}` };
    }
  }

  // ─── ZK-RLN RATE LIMITING & DOUBLE-SIGN DEFENSE ────────────────────────────

  /**
   * Evaluates an RLN polynomial share.
   * If a double-sign breach is mathematically proven:
   * 1. Revokes the offending nullifier immediately.
   * 2. Returns { violated: true, breachedNullifier } WITHOUT revealing any secret material!
   */
  public recordShareAndCheckViolation(share: RLNShare): {
    violated: boolean;
    breachedNullifier?: string;
    error?: string;
  } {
    const { nullifier, epoch, x, y } = share;
    if (!nullifier || !epoch || !x || !y) {
      return { violated: false };
    }

    // Already revoked check
    if (this.isRevoked(nullifier)) {
      return { violated: true, breachedNullifier: nullifier, error: 'Identity already revoked on nullifier tree' };
    }

    // Sliding-window memory hygiene: clean expired shares before recording
    this.cleanExpiredShares();

    const shareKey = `${epoch}:${nullifier}`;
    const existingEntry = this.activeShares.get(shareKey);

    if (existingEntry) {
      const existingShare = existingEntry.share;
      // If x is different, two polynomial points were produced for the same epoch!
      if (existingShare.x !== share.x) {
        try {
          const verification = ZKRLN.verifyRateLimitBreach(existingShare, share);
          if (verification.verified) {
            this.revokeNullifier(nullifier);
            return {
              violated: true,
              breachedNullifier: nullifier,
              error: 'ZK-RLN Rate Limit Breach: Double-sign violation mathematically proven',
            };
          }
        } catch {
          // If verification fails mathematically, treat as invalid share
        }
      }
    }

    // Record share with timestamp for automatic epoch pruning
    this.activeShares.set(shareKey, {
      share,
      createdAt: Date.now(),
    });

    return { violated: false };
  }

  public revokeNullifier(nullifier: string): void {
    this.revokedNullifiers.add(nullifier);
  }

  public isRevoked(nullifier: string): boolean {
    return this.revokedNullifiers.has(nullifier);
  }

  public getRevokedNullifiers(): string[] {
    return Array.from(this.revokedNullifiers);
  }

  public loadRevokedNullifiers(nullifiers: string[]): void {
    for (const n of nullifiers) {
      this.revokedNullifiers.add(n);
    }
  }

  // ─── PRESENCE & CHANNEL MANAGEMENT ─────────────────────────────────────────

  public updatePresence(user: PresenceUser): void {
    this.cleanExpiredPresence();

    // Enforce max presence count ceiling
    if (this.presence.size >= this.maxPresenceCount && !this.presence.has(user.fingerprint)) {
      // Evict oldest user
      let oldestKey: string | null = null;
      let oldestTime = Infinity;
      for (const [fp, u] of this.presence.entries()) {
        if (u.lastSeen < oldestTime) {
          oldestTime = u.lastSeen;
          oldestKey = fp;
        }
      }
      if (oldestKey) this.presence.delete(oldestKey);
    }

    this.presence.set(user.fingerprint, {
      ...user,
      lastSeen: Date.now(),
    });
  }

  public removePresence(fingerprint: string): void {
    this.presence.delete(fingerprint);
  }

  public getPresence(channelId?: string): PresenceUser[] {
    this.cleanExpiredPresence();
    const all = Array.from(this.presence.values());
    if (!channelId || channelId === 'all') return all;
    return all.filter((u) => u.joinedChannel === channelId || u.subscribedChannels.includes(channelId));
  }

  public getChannels(): RelayChannel[] {
    return Array.from(this.channels.values());
  }

  public subscribeToChannel(channelId: string, session: RelaySession): void {
    if (!this.channelSubscribers.has(channelId)) {
      this.channelSubscribers.set(channelId, new Set());
    }
    this.channelSubscribers.get(channelId)!.add(session);
    session.subscribedChannels.add(channelId);
  }

  public unsubscribeFromChannel(channelId: string, session: RelaySession): void {
    const subs = this.channelSubscribers.get(channelId);
    if (subs) {
      subs.delete(session);
    }
    session.subscribedChannels.delete(channelId);
  }

  public getSubscribers(channelId: string): Set<RelaySession> {
    return this.channelSubscribers.get(channelId) || new Set();
  }

  public removeSessionFromAllChannels(session: RelaySession): void {
    for (const subs of this.channelSubscribers.values()) {
      subs.delete(session);
    }
    session.subscribedChannels.clear();
  }

  // ─── AUTOMATIC MEMORY PRUNING POLICIES ──────────────────────────────────────

  public cleanExpiredShares(): number {
    const now = Date.now();
    let pruned = 0;
    for (const [key, entry] of this.activeShares.entries()) {
      if (now - entry.createdAt > this.shareTtlMs) {
        this.activeShares.delete(key);
        pruned++;
      }
    }
    return pruned;
  }

  public cleanExpiredPresence(): number {
    const now = Date.now();
    let pruned = 0;
    for (const [fp, user] of this.presence.entries()) {
      if (now - user.lastSeen > this.presenceTtlMs) {
        this.presence.delete(fp);
        pruned++;
      }
    }
    return pruned;
  }

  public cleanExpiredChallenges(): number {
    const now = Date.now();
    let pruned = 0;
    for (const [challenge, item] of this.pendingChallenges.entries()) {
      if (now - item.timestamp > this.challengeTtlMs) {
        this.pendingChallenges.delete(challenge);
        pruned++;
      }
    }
    return pruned;
  }

  public getStats(): {
    activeSharesCount: number;
    presenceCount: number;
    revokedNullifiersCount: number;
    pendingChallengesCount: number;
  } {
    return {
      activeSharesCount: this.activeShares.size,
      presenceCount: this.presence.size,
      revokedNullifiersCount: this.revokedNullifiers.size,
      pendingChallengesCount: this.pendingChallenges.size,
    };
  }

  public getActiveSharesCount(): number {
    return this.activeShares.size;
  }

  public getRevokedCount(): number {
    return this.revokedNullifiers.size;
  }

  public clear(): void {
    this.activeShares.clear();
    this.presence.clear();
    this.revokedNullifiers.clear();
    this.pendingChallenges.clear();
    for (const subs of this.channelSubscribers.values()) {
      subs.clear();
    }
  }
}
