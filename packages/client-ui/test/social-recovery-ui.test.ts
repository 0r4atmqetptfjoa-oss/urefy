import { describe, it, expect, beforeEach, vi } from 'vitest';

// Provide clean Node.js test environment mocks for localStorage and document
const storageMap = new Map<string, string>();
const mockLocalStorage = {
  getItem: (k: string) => storageMap.get(k) ?? null,
  setItem: (k: string, v: string) => storageMap.set(k, String(v)),
  removeItem: (k: string) => storageMap.delete(k),
  clear: () => storageMap.clear(),
  get length() {
    return storageMap.size;
  },
  key: (i: number) => Array.from(storageMap.keys())[i] ?? null,
};
(globalThis as any).localStorage = mockLocalStorage;

if (typeof (globalThis as any).document === 'undefined' || !(globalThis as any).document.createElement) {
  (globalThis as any).document = {
    activeElement: null,
    body: { appendChild: () => {}, removeChild: () => {} },
    createElement: (tag: string) => {
      const el: any = {
        tagName: tag.toUpperCase(),
        classList: {
          classes: new Set<string>(),
          add(c: string) { this.classes.add(c); },
          remove(c: string) { this.classes.delete(c); },
          contains(c: string) { return this.classes.has(c); },
        },
        attributes: new Map<string, string>(),
        getAttribute(k: string) { return el.attributes.get(k) ?? null; },
        setAttribute(k: string, v: string) { el.attributes.set(k, v); },
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => {},
        click: () => {},
        appendChild: (child: any) => child,
        removeChild: (child: any) => child,
      };
      return el;
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    querySelectorAll: () => [],
    getElementById: () => null,
  };
}

import { clientStore } from '../src/client-state.js';
import { socialRecoveryModal, SocialRecoveryModal } from '../src/social-recovery-modal.js';
import { serviceRegistry, SERVICES } from '../src/service-registry.js';
import {
  splitSecretIntoShards,
  serializeShard,
  generateMnemonic,
  validateMnemonic,
  generateKeyPair,
} from '@aetheris/core-crypto';

describe('Social Identity Recovery UI Suite (SocialRecoveryModal)', () => {
  beforeEach(() => {
    storageMap.clear();
    socialRecoveryModal.closeModal();
    socialRecoveryModal.setTab('setup');
    socialRecoveryModal.shardInputs = ['', '', ''];
    socialRecoveryModal.generatedPackage = null;
    (socialRecoveryModal as any)._initializeDefaultGuardians();
    for (let index = 0; index < 5; index++) socialRecoveryModal.addCustomGuardian(generateKeyPair().publicKeyHex);
    vi.restoreAllMocks();
  });

  describe('1. Modal State & Tab Navigation', () => {
    it('initializes in closed state and returns empty HTML when closed', () => {
      expect(socialRecoveryModal.isOpen).toBe(false);
      expect(socialRecoveryModal.renderModalHTML()).toBe('');
    });

    it('opens modal, sets active tab, and renders modal markup', () => {
      socialRecoveryModal.openModal('setup');
      expect(socialRecoveryModal.isOpen).toBe(true);
      expect(socialRecoveryModal.activeTab).toBe('setup');

      const html = socialRecoveryModal.renderModalHTML();
      expect(html).toContain('Social Identity Recovery');
      expect(html).toContain('k-of-n Shamir');
      expect(html).toContain('Setup Social Guardians');
      expect(html).toContain('Recover Account');
    });

    it('switches between setup and recover tabs smoothly', () => {
      socialRecoveryModal.openModal('setup');
      expect(socialRecoveryModal.activeTab).toBe('setup');

      socialRecoveryModal.setTab('recover');
      expect(socialRecoveryModal.activeTab).toBe('recover');

      const html = socialRecoveryModal.renderModalHTML();
      expect(html).toContain('Quorum Progress:');
      expect(html).toContain('Paste Guardian Shard Tokens:');
    });

    it('closes modal and clears open state', () => {
      socialRecoveryModal.openModal('setup');
      expect(socialRecoveryModal.isOpen).toBe(true);

      socialRecoveryModal.closeModal();
      expect(socialRecoveryModal.isOpen).toBe(false);
      expect(socialRecoveryModal.renderModalHTML()).toBe('');
    });
  });

  describe('2. Guardian Selection & Threshold Customization', () => {
    it('does not invent guardians or derive a private key from a fingerprint', () => {
      const fresh = socialRecoveryModal;
      (fresh as any)._initializeDefaultGuardians();
      expect(fresh.guardians).toEqual([]);
      expect(fresh.addCustomGuardian('genesis-core')).toBe(false);
      expect(fresh.addCustomGuardian('c3dc28cb705e')).toBe(false);
      expect(fresh.guardians).toEqual([]);
    });

    it('toggles guardian selection and recalculates threshold', () => {
      socialRecoveryModal.openModal('setup');
      const targetFp = socialRecoveryModal.guardians[0].fingerprint;
      const initialSelected = socialRecoveryModal.guardians[0].isSelected;

      socialRecoveryModal.toggleGuardian(targetFp);
      expect(socialRecoveryModal.guardians[0].isSelected).toBe(!initialSelected);

      socialRecoveryModal.toggleGuardian(targetFp);
      expect(socialRecoveryModal.guardians[0].isSelected).toBe(initialSelected);
    });

    it('clamps threshold within valid bounds [2, selectedCount]', () => {
      const selectedCount = socialRecoveryModal.guardians.filter((g) => g.isSelected).length;

      socialRecoveryModal.setThreshold(1);
      expect(socialRecoveryModal.threshold).toBe(2);

      socialRecoveryModal.setThreshold(selectedCount + 5);
      expect(socialRecoveryModal.threshold).toBe(selectedCount);

      socialRecoveryModal.setThreshold(3);
      expect(socialRecoveryModal.threshold).toBe(3);
    });

    it('adds custom guardian by fingerprint or public key', () => {
      const initialCount = socialRecoveryModal.guardians.length;
      const keypair = generateKeyPair();
      const added = socialRecoveryModal.addCustomGuardian(keypair.publicKeyHex);

      expect(added).toBe(true);
      expect(socialRecoveryModal.guardians.length).toBe(initialCount + 1);
      const addedGuardian = socialRecoveryModal.guardians[socialRecoveryModal.guardians.length - 1];
      expect(addedGuardian.publicKeyHex).toBe(keypair.publicKeyHex);
      expect(addedGuardian.role).toBe('CUSTOM');
    });
  });

  describe('3. Guardian Shard Generation & Export Package', () => {
    it('successfully generates encrypted shards for active mnemonic seed', async () => {
      // Ensure clientStore has a valid mnemonic
      if (!clientStore.mnemonic || !validateMnemonic(clientStore.mnemonic)) {
        clientStore.restoreIdentityFromMnemonic(generateMnemonic(128));
      }

      socialRecoveryModal.openModal('setup');
      const pkg = await socialRecoveryModal.executeSetup();

      expect(pkg).not.toBeNull();
      expect(pkg!.version).toBe('1.0');
      expect(pkg!.totalShards).toBe(socialRecoveryModal.guardians.filter((g) => g.isSelected).length);
      expect(pkg!.threshold).toBe(socialRecoveryModal.threshold);
      expect(pkg!.guardianPackages.length).toBe(pkg!.totalShards);

      // Verify HTML renders generated package preview
      const html = socialRecoveryModal.renderModalHTML();
      expect(html).toContain('Encrypted Guardian Shards Ready');
      expect(html).toContain('Shard #1');
      expect(html).toContain('Download Package');
    });
  });

  describe('4. Recovery Tab: Live Validation & 1-Click Identity Restoration', () => {
    it('updates live validation status as shards are entered', () => {
      const mnemonic = generateMnemonic(128);
      const secretBytes = new TextEncoder().encode(mnemonic);
      const shards = splitSecretIntoShards(secretBytes, 5, 3);

      socialRecoveryModal.openModal('recover');

      // 0 shards
      socialRecoveryModal.setShardInput(0, '');
      expect(socialRecoveryModal.validationStatus.validCount).toBe(0);

      // 1 shard
      socialRecoveryModal.setShardInput(0, serializeShard(shards[0]));
      expect(socialRecoveryModal.validationStatus.validCount).toBe(1);

      // 2 shards
      socialRecoveryModal.setShardInput(1, serializeShard(shards[1]));
      expect(socialRecoveryModal.validationStatus.validCount).toBe(2);

      // 3 shards -> Quorum met!
      socialRecoveryModal.setShardInput(2, serializeShard(shards[2]));
      expect(socialRecoveryModal.validationStatus.validCount).toBe(3);
      expect(socialRecoveryModal.validationStatus.message).toContain('Quorum reached!');
    });

    it('adds and removes shard input slots dynamically', () => {
      socialRecoveryModal.openModal('recover');
      const initialSlots = socialRecoveryModal.shardInputs.length;

      socialRecoveryModal.addShardSlot();
      expect(socialRecoveryModal.shardInputs.length).toBe(initialSlots + 1);

      socialRecoveryModal.removeShardSlot(socialRecoveryModal.shardInputs.length - 1);
      expect(socialRecoveryModal.shardInputs.length).toBe(initialSlots);
    });

    it('executes identity reconstruction after persistence and clears recovery inputs', async () => {
      const targetMnemonic = generateMnemonic(128);
      const secretBytes = new TextEncoder().encode(targetMnemonic);
      const shards = splitSecretIntoShards(secretBytes, 5, 3);

      socialRecoveryModal.openModal('recover');
      socialRecoveryModal.setShardInput(0, serializeShard(shards[0]));
      socialRecoveryModal.setShardInput(1, serializeShard(shards[2]));
      socialRecoveryModal.setShardInput(2, serializeShard(shards[4]));

      const recovered = await socialRecoveryModal.executeRecovery();
      expect(recovered).toBe(true);

      // Verify clientStore has been rehydrated with restored mnemonic
      expect(clientStore.mnemonic).toBe(targetMnemonic);
      expect(socialRecoveryModal.isOpen).toBe(false);
      expect(socialRecoveryModal.recoveredMnemonic).toBe('');
      expect(socialRecoveryModal.shardInputs.every(value => value === '')).toBe(true);
    });
  });

  describe('5. IoC Container & Global Window Registration', () => {
    it('is registered in serviceRegistry under SocialRecoveryModal token', () => {
      const resolved = serviceRegistry.resolve<SocialRecoveryModal>(
        SERVICES.SocialRecoveryModal || 'SocialRecoveryModal'
      );
      expect(resolved).toBeDefined();
      expect(resolved).toBe(socialRecoveryModal);
    });

    it('is attached to window.socialRecoveryModal and global helpers', () => {
      if (typeof window !== 'undefined') {
        expect((window as any).socialRecoveryModal).toBe(socialRecoveryModal);
        expect(typeof (window as any).__aetheris_open_social_recovery).toBe('function');
        expect(typeof (window as any).__aetheris_close_social_recovery).toBe('function');
      }
    });
  });
});
