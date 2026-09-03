/**
 * @file delivery-proof.ts
 * @package @aetheris/client-ui
 * @description Client-side Zero-Metadata Delivery Proofs & Read Receipts Engine (Innovation 3).
 *
 * Provides cryptographic delivery attestation without metadata leakage:
 * - Emits unlinkable HMAC-SHA256 delivery nullifiers on message read events.
 * - Proves recipient set authorization via ZK Merkle inclusion proofs.
 * - Neutralizes double-ACK replay attacks through the client delivery proof guard.
 * - Renders the subtle double-shield icon [🛡️🛡️ ZK Verified Delivery] on messages.
 */

import {
  ZkDeliveryProof,
  deriveDeliveryNullifier,
  generateZkDeliveryProof,
  verifyZkDeliveryProof,
  DeliveryProofGuard,
  defaultDeliveryProofGuard,
} from '@aetheris/core-crypto';
import { clientStore } from './client-state.js';

export const STORAGE_KEY_ZK_DELIVERY_PROOFS = 'aetheris_zk_delivery_proofs';

export interface DeliveryAttestationRecord {
  messageId: string;
  proof: ZkDeliveryProof;
  verifiedAt: number;
  readAt: number;
  isVerified: boolean;
}

/**
 * Client-side Zero-Knowledge Delivery Proofs Manager.
 */
export class ZKDeliveryManager {
  private records: Map<string, DeliveryAttestationRecord> = new Map();
  public guard: DeliveryProofGuard = defaultDeliveryProofGuard;
  private isInitialized: boolean = false;

  constructor() {
    this.loadFromStorage();
    this.setupEventListeners();
  }

  /**
   * Load stored delivery proofs from local persistence.
   */
  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ZK_DELIVERY_PROOFS);
      if (raw) {
        const list: DeliveryAttestationRecord[] = JSON.parse(raw);
        for (const item of list) {
          if (item?.messageId && item?.proof) {
            this.records.set(item.messageId, item);
            // Pre-seed the guard to prevent replay across browser reloads
            if (item.proof.nullifier && !this.guard.isSpent(item.proof.nullifier)) {
              this.guard.verifyAndConsume(item.proof);
            }
          }
        }
      }
    } catch (_) {}
  }

  /**
   * Persist current delivery proofs to localStorage.
   */
  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const array = Array.from(this.records.values()).slice(-200); // keep last 200 records
      localStorage.setItem(STORAGE_KEY_ZK_DELIVERY_PROOFS, JSON.stringify(array));
    } catch (_) {}
  }

  /**
   * Automatically bind event listeners for sovereign DM and relay message read events.
   */
  private setupEventListeners(): void {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // Listen to DM marked-read events
    window.addEventListener('aetheris:dm:marked_read', ((e: CustomEvent) => {
      const peerFP = e.detail?.peerFP;
      if (!peerFP) return;
      // Emit delivery receipts for any unacknowledged messages
      this.acknowledgeConversation(peerFP);
    }) as EventListener);

    // Listen to direct delivery ack packets received over P2P mesh
    window.addEventListener('aetheris:delivery:incoming_ack', ((e: CustomEvent) => {
      const proof: ZkDeliveryProof = e.detail?.proof;
      if (proof) {
        this.processIncomingProof(proof);
      }
    }) as EventListener);
  }

  /**
   * Acknowledge all messages read in a sovereign peer conversation.
   */
  public acknowledgeConversation(peerFP: string): void {
    if (typeof window === 'undefined' || !(window as any).__aetherisDM) return;
    const dm = (window as any).__aetherisDM;
    const conv = dm.getConversation ? dm.getConversation(peerFP) : null;
    if (!conv?.messages) return;

    for (const msg of conv.messages) {
      if (msg.receiverFP === clientStore.keypair.fingerprint && !this.isZKVerified(msg.id)) {
        this.emitDeliveryProof(msg.id);
      }
    }
  }

  /**
   * Emits an unlinkable Zero-Knowledge Delivery Proof for a message read receipt.
   *
   * @param messageId Unique ID of the read message.
   * @param recipientPrivateKey Optional recipient private key (defaults to current active keypair).
   * @param groupLeaves Optional list of authorized group member commitments.
   * @returns Generated and verified ZkDeliveryProof.
   */
  public emitDeliveryProof(
    messageId: string,
    recipientPrivateKey?: Uint8Array | string,
    groupLeaves?: string[] | bigint[]
  ): ZkDeliveryProof {
    const privKey = recipientPrivateKey || clientStore.keypair.privateKey;
    const proof = generateZkDeliveryProof({
      messageId,
      recipientPrivateKey: privKey,
      proofType: 'snark-groth16',
      groupLeaves,
    });

    // Record in local guard
    const consumeRes = this.guard.verifyAndConsume(proof);
    const now = Date.now();

    const record: DeliveryAttestationRecord = {
      messageId,
      proof,
      verifiedAt: now,
      readAt: now,
      isVerified: consumeRes.success,
    };

    this.records.set(messageId, record);
    this.saveToStorage();

    // Broadcast delivery ack event on DOM
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('aetheris:delivery:ack_emitted', {
          detail: { messageId, proof, record },
        })
      );
    }

    return proof;
  }

  /**
   * Process and verify an incoming delivery proof from a remote peer or server relay.
   *
   * @param proof The received ZkDeliveryProof.
   * @returns True if the proof was cryptographically verified and consumed without double-ACK.
   */
  public processIncomingProof(proof: ZkDeliveryProof): boolean {
    if (!proof || !proof.messageId) return false;

    const outcome = this.guard.verifyAndConsume(proof);
    if (!outcome.success) {
      console.warn('[ZK-Delivery] Proof rejection:', outcome.error);
      return false;
    }

    const now = Date.now();
    const record: DeliveryAttestationRecord = {
      messageId: proof.messageId,
      proof,
      verifiedAt: now,
      readAt: proof.timestamp || now,
      isVerified: true,
    };

    this.records.set(proof.messageId, record);
    this.saveToStorage();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('aetheris:delivery:verified', {
          detail: { messageId: proof.messageId, proof },
        })
      );
    }

    return true;
  }

  /**
   * Check if a message has a valid Zero-Knowledge verified delivery proof.
   */
  public isZKVerified(messageId: string): boolean {
    const record = this.records.get(messageId);
    if (record?.isVerified) return true;
    return this.guard.isZKVerified(messageId);
  }

  /**
   * Retrieve the delivery attestation record for a message.
   */
  public getRecord(messageId: string): DeliveryAttestationRecord | undefined {
    return this.records.get(messageId);
  }

  /**
   * Retrieve the stored delivery proof for a message.
   */
  public getProof(messageId: string): ZkDeliveryProof | undefined {
    return this.records.get(messageId)?.proof || this.guard.getProof(messageId);
  }

  /**
   * Renders the subtle double-shield icon [🛡️🛡️ ZK Verified Delivery] next to a message.
   *
   * @param messageId The message identifier.
   * @param options Rendering configuration options.
   * @returns HTML string representation of the delivery badge.
   */
  public renderDeliveryBadge(
    messageId: string,
    options?: { compact?: boolean; verified?: boolean }
  ): string {
    const isVerified = options?.verified !== undefined ? options.verified : this.isZKVerified(messageId);
    if (!isVerified) return '';

    const proof = this.getProof(messageId);
    const nullifierShort = proof?.nullifier ? `${proof.nullifier.slice(0, 10)}...` : 'derived';
    const rootShort = proof?.merkleRoot ? `${proof.merkleRoot.slice(0, 8)}...` : 'root';
    const tooltip = `Zero-Knowledge Verified Delivery | Nullifier: ${nullifierShort} | Merkle Root: ${rootShort} | 100% Zero-Metadata Leakage`;

    if (options?.compact) {
      return `
        <span class="zk-delivery-badge inline-flex items-center gap-0.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors cursor-help select-none" title="${tooltip}">
          <span>🛡️🛡️</span>
        </span>
      `;
    }

    return `
      <span class="zk-delivery-badge inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-mono text-cyan-300 bg-cyan-950/40 border border-cyan-500/30 hover:border-cyan-400/60 transition-all shadow-sm shadow-cyan-950/20 cursor-help select-none group" title="${tooltip}">
        <span class="text-xs group-hover:scale-110 transition-transform">🛡️🛡️</span>
        <span class="font-semibold tracking-tight text-cyan-200">ZK Verified Delivery</span>
      </span>
    `;
  }
}

/**
 * Shared singleton instance of ZKDeliveryManager.
 */
export const zkDeliveryManager = new ZKDeliveryManager();

/**
 * Exported helper to render the ZK Verified Delivery double-shield badge.
 */
export function renderZKDeliveryBadge(
  messageId: string,
  options?: { compact?: boolean; verified?: boolean }
): string {
  return zkDeliveryManager.renderDeliveryBadge(messageId, options);
}
