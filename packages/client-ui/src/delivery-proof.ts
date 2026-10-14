/**
 * @file delivery-proof.ts
 * @package @aetheris/client-ui
 * @description 2027 Zero-Metadata Delivery Proofs & Read Receipts Engine.
 *
 * Upgrades:
 * - Non-blocking idle-scheduled persistence (eliminates main-thread JSON serialization jank)
 * - De-slopped vector SVG iconography (replaces raw emoji 🛡️🛡️ with crisp 16px geometric SVG)
 * - Tabular-numeral cryptographic inspector badge
 */

import {
  ZkDeliveryProof,
  generateZkDeliveryProof,
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

const DUAL_SHIELD_SVG = `<svg class="w-3.5 h-3.5 shrink-0 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>`;

export class ZKDeliveryManager {
  private records: Map<string, DeliveryAttestationRecord> = new Map();
  public guard: DeliveryProofGuard = defaultDeliveryProofGuard;
  private isInitialized: boolean = false;
  private saveScheduled: boolean = false;

  constructor() {
    this.loadFromStorage();
    this.setupEventListeners();
  }

  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ZK_DELIVERY_PROOFS);
      if (raw) {
        const list: DeliveryAttestationRecord[] = JSON.parse(raw);
        for (const item of list) {
          if (item?.messageId && item?.proof) {
            this.records.set(item.messageId, item);
            if (item.proof.nullifier && !this.guard.isSpent(item.proof.nullifier)) {
              this.guard.verifyAndConsume(item.proof);
            }
          }
        }
      }
    } catch (_) {}
  }

  /**
   * Coalesces storage writes onto an idle callback / microtask so batch-reading
   * 50 messages never triggers 50 synchronous localStorage serializations.
   */
  private saveToStorage(): void {
    if (typeof localStorage === 'undefined' || this.saveScheduled) return;
    this.saveScheduled = true;

    const flush = () => {
      this.saveScheduled = false;
      try {
        const array = Array.from(this.records.values()).slice(-200);
        localStorage.setItem(STORAGE_KEY_ZK_DELIVERY_PROOFS, JSON.stringify(array));
      } catch (_) {}
    };

    // Keep synchronous fallback in unit-test environments without requestIdleCallback
    if (typeof window !== 'undefined' && typeof (window as any).requestIdleCallback === 'function') {
      (window as any).requestIdleCallback(flush, { timeout: 300 });
    } else {
      flush();
    }
  }

  private setupEventListeners(): void {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    window.addEventListener('aetheris:dm:marked_read', ((e: CustomEvent) => {
      const peerFP = e.detail?.peerFP;
      if (!peerFP) return;
      this.acknowledgeConversation(peerFP);
    }) as EventListener);

    window.addEventListener('aetheris:delivery:incoming_ack', ((e: CustomEvent) => {
      const proof: ZkDeliveryProof = e.detail?.proof;
      if (proof) {
        this.processIncomingProof(proof);
      }
    }) as EventListener);
  }

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

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('aetheris:delivery:ack_emitted', {
          detail: { messageId, proof, record },
        })
      );
    }

    return proof;
  }

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

  public isZKVerified(messageId: string): boolean {
    const record = this.records.get(messageId);
    if (record?.isVerified) return true;
    return this.guard.isZKVerified(messageId);
  }

  public getRecord(messageId: string): DeliveryAttestationRecord | undefined {
    return this.records.get(messageId);
  }

  public getProof(messageId: string): ZkDeliveryProof | undefined {
    return this.records.get(messageId)?.proof || this.guard.getProof(messageId);
  }

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
        <span
          class="zk-delivery-badge inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors cursor-help select-none tabular-nums"
          title="${tooltip}"
          aria-label="Zero-Knowledge Verified Delivery"
        >
          ${DUAL_SHIELD_SVG}
          <span class="sr-only">🛡️🛡️</span>
        </span>
      `;
    }

    return `
      <span
        class="zk-delivery-badge inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[10px] font-mono tabular-nums text-cyan-300 bg-cyan-950/50 border border-cyan-500/35 hover:border-cyan-400/70 transition-colors cursor-help select-none group"
        title="${tooltip}"
        aria-label="${tooltip}"
      >
        ${DUAL_SHIELD_SVG}
        <span class="sr-only">🛡️🛡️</span>
        <span class="font-semibold tracking-tight text-cyan-200">ZK Verified Delivery</span>
      </span>
    `;
  }
}

export const zkDeliveryManager = new ZKDeliveryManager();

export function renderZKDeliveryBadge(
  messageId: string,
  options?: { compact?: boolean; verified?: boolean }
): string {
  return zkDeliveryManager.renderDeliveryBadge(messageId, options);
}
