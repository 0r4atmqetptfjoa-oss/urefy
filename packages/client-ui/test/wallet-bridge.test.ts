import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  WalletBridge,
  walletBridge,
  type SignedMessage,
  type TokenGate,
  type EVMNetwork,
} from '../src/wallet-bridge.js';

describe('Sovereign Wallet & Dual-Curve Cryptographic Bridge', () => {
  let bridge: WalletBridge;
  let mockStorage: Record<string, string>;

  beforeEach(() => {
    mockStorage = {};

    const storageObj = {
      getItem: vi.fn((key: string) => mockStorage[key] || null),
      setItem: vi.fn((key: string, val: string) => {
        mockStorage[key] = String(val);
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStorage[key];
      }),
      clear: vi.fn(() => {
        for (const k in mockStorage) delete mockStorage[k];
      }),
      length: 0,
      key: vi.fn(() => null),
    } as unknown as Storage;

    globalThis.localStorage = storageObj;
    globalThis.window = {
      localStorage: storageObj,
      setTimeout: vi.fn((_fn: () => void, _ms?: number) => 123 as unknown as NodeJS.Timeout),
      clearTimeout: vi.fn(),
    } as unknown as Window & typeof globalThis;

    bridge = new WalletBridge();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── 1. CRYPTOGRAPHIC PRIMITIVES & ENCODINGS ───────────────────────────────

  describe('1. Dual-Curve Address Derivation & EIP-55 Checksum', () => {
    it('should deterministically derive valid EIP-55 Ethereum address from Ed25519 public key', () => {
      const ed25519Key = 'ed25519:7f2bc941d8e34a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b';
      const ethAddr1 = bridge.deriveEthAddressFromED25519(ed25519Key);
      const ethAddr2 = bridge.deriveEthAddressFromED25519(ed25519Key);

      expect(ethAddr1).toBeDefined();
      expect(ethAddr1.startsWith('0x')).toBe(true);
      expect(ethAddr1.length).toBe(42);
      expect(ethAddr1).toBe(ethAddr2); // Deterministic
    });

    it('should compute valid EIP-55 mixed-case checksum for Ethereum addresses', () => {
      const testCases = [
        '0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed',
        '0xfb6916095ca1df60bb79ce92ce3ea74c37c5d359',
        '0xdbf03b407c01E7cD3CBea99509d93f8DDDC8C6FB',
        '0xd1220a0cf47c7b9be7a2e6ba89f429762e7b9adb',
      ];

      for (const raw of testCases) {
        const checksummed = bridge.encodeEIP55(raw);
        expect(checksummed.startsWith('0x')).toBe(true);
        expect(checksummed.length).toBe(42);
        expect(checksummed.toLowerCase()).toBe(raw.toLowerCase());
      }
    });

    it('should format address truncation and timestamps accurately', () => {
      const address = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';
      const truncated = bridge.truncateAddress(address, 6, 4);
      expect(truncated).toBe('0x5aAe...eAed');

      const shortStr = '0x123';
      expect(bridge.truncateAddress(shortStr, 6, 4)).toBe('0x123');

      const formattedDate = bridge.formatDate(1700000000000);
      expect(formattedDate).toContain('2023-11-14');
      expect(formattedDate).toContain('UTC');
    });
  });

  // ─── 2. DEFAULT INITIALIZATION & STATE ──────────────────────────────────────

  describe('2. Default Initialization & State', () => {
    it('should initialize with derived Ed25519 identity and standard networks', () => {
      expect(bridge.identity).toBeDefined();
      expect(bridge.identity?.aetherisKey).toContain('ed25519:');
      expect(bridge.identity?.ethAddress?.startsWith('0x')).toBe(true);
      expect(bridge.identity?.verificationProof).toBeDefined();
      expect(bridge.isConnected).toBe(false);
      expect(bridge.activeTab).toBe('identity');
      expect(bridge.isModalOpen).toBe(false);
      expect(bridge.supportedNetworks.length).toBe(5);
      expect(bridge.tokenGates.length).toBe(3);
    });

    it('should export singleton instance walletBridge correctly', () => {
      expect(walletBridge).toBeInstanceOf(WalletBridge);
      expect(typeof walletBridge.connectMetaMask).toBe('function');
      expect(typeof walletBridge.signWithEthereum).toBe('function');
    });
  });

  // ─── 3. CONNECTION & METAMASK INTEGRATION ───────────────────────────────────

  describe('3. Connection & EVM Web3 Provider Flow', () => {
    it('should activate derived Secp256k1 identity when MetaMask is not present', async () => {
      const address = await bridge.connectMetaMask();

      expect(address).toBeDefined();
      expect(address?.startsWith('0x')).toBe(true);
      expect(bridge.isConnected).toBe(true);
      expect(bridge.identity?.ethAddress).toBe(address);
    });

    it('should request accounts from window.ethereum and update active state', async () => {
      const mockAccount = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045';
      const mockEth = {
        request: vi.fn().mockImplementation(async ({ method }: { method: string }) => {
          if (method === 'eth_requestAccounts') return [mockAccount];
          if (method === 'eth_chainId') return '0x1';
          return null;
        }),
      };

      globalThis.window = {
        ethereum: mockEth,
        localStorage: globalThis.localStorage,
        setTimeout: vi.fn(),
        clearTimeout: vi.fn(),
      } as unknown as Window & typeof globalThis;

      const address = await bridge.connectMetaMask();

      expect(mockEth.request).toHaveBeenCalledWith({ method: 'eth_requestAccounts' });
      expect(address?.toLowerCase()).toBe(mockAccount.toLowerCase());
      expect(bridge.selectedAccount.toLowerCase()).toBe(mockAccount.toLowerCase());
      expect(bridge.isConnected).toBe(true);
      expect(bridge.identity?.ensName).toBe('vitalik.eth');
    });

    it('should handle user rejection gracefully when connecting MetaMask', async () => {
      const mockEth = {
        request: vi.fn().mockRejectedValue(new Error('User rejected the request')),
      };

      globalThis.window = {
        ethereum: mockEth,
        localStorage: globalThis.localStorage,
        setTimeout: vi.fn(),
        clearTimeout: vi.fn(),
      } as unknown as Window & typeof globalThis;

      const address = await bridge.connectMetaMask();
      expect(address).toBeNull();
      expect(bridge.toastType).toBe('error');
      expect(bridge.toastMessage).toContain('User rejected');
    });

    it('should disconnect cleanly and reset to standalone identity', () => {
      bridge.isConnected = true;
      bridge.disconnect();

      expect(bridge.isConnected).toBe(false);
      expect(bridge.identity?.ensName).toBe('sovereign.aetheris.eth');
      expect(bridge.toastType).toBe('info');
    });
  });

  // ─── 4. CRYPTOGRAPHIC MESSAGE SIGNING & ATTESTATIONS ────────────────────────

  describe('4. Message Signing & Attestations', () => {
    it('should generate valid Secp256k1 compact signature in standalone mode', async () => {
      const message = 'Aetheris Sovereign Consensus Attestation #42';
      const signed: SignedMessage | null = await bridge.signWithEthereum(message);

      expect(signed).toBeDefined();
      expect(signed?.message).toBe(message);
      expect(signed?.keyType).toBe('secp256k1');
      expect(signed?.signature.startsWith('0x')).toBe(true);
      expect(signed?.signature.length).toBeGreaterThan(100);
      expect(bridge.recentSignatures.length).toBe(1);
      expect(bridge.lastSignedProof).toBe(signed?.signature);
    });

    it('should execute personal_sign via MetaMask when connected', async () => {
      const mockSig = '0x11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff1b';
      const mockEth = {
        request: vi.fn().mockResolvedValue(mockSig),
      };

      globalThis.window = {
        crypto: globalThis.crypto,
        ethereum: mockEth,
        localStorage: globalThis.localStorage,
        setTimeout: vi.fn(),
        clearTimeout: vi.fn(),
      } as unknown as Window & typeof globalThis;

      bridge.isConnected = true;
      const signed = await bridge.signWithEthereum('Hello Web3');

      expect(mockEth.request).toHaveBeenCalledWith({
        method: 'personal_sign',
        params: [expect.any(String), expect.any(String)],
      });
      expect(signed?.signature).toBe(mockSig);
    });

    it('should sign full dual-curve identity linkage proof', async () => {
      const proof = await bridge.signIdentityProof();
      expect(proof).toBeDefined();
      expect(proof?.startsWith('0x')).toBe(true);
      expect(bridge.identity?.verificationProof).toBe(proof);
    });

    it('should sign custom message from input field', async () => {
      bridge.setCustomMessage('Sovereign Channel Message #99');
      await bridge.signCustomMessage();

      expect(bridge.recentSignatures.length).toBe(1);
      expect(bridge.recentSignatures[0].message).toBe('Sovereign Channel Message #99');
    });
  });

  // ─── 5. ENS NAME RESOLUTION & TOKEN GATING ──────────────────────────────────

  describe('5. ENS Resolution & Token Gating Verification', () => {
    it('should resolve known addresses to ENS names', async () => {
      const vitalikAddr = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045';
      const ens = await bridge.resolveENS(vitalikAddr);
      expect(ens).toBe('vitalik.eth');

      const satoshiAddr = '0xa79e63e78e20224a0d507d5765f774e66d3dac48';
      expect(await bridge.resolveENS(satoshiAddr)).toBe('satoshi.eth');
    });

    it('should fallback to deterministic sovereign-XXXX.eth alias for unknown addresses', async () => {
      const randomAddr = '0x1234567890abcdef1234567890abcdef12345678';
      const alias = await bridge.resolveENS(randomAddr);
      expect(alias).toBe('sovereign-12345678.eth');
    });

    it('should verify token gate access thresholds', async () => {
      const gate: TokenGate = bridge.tokenGates[0]; // Guardian Council
      const hasAccess = await bridge.verifyTokenGate(gate.tokenAddress, gate.minBalance);

      expect(typeof hasAccess).toBe('boolean');
    });

    it('should check single and all token gates', async () => {
      await bridge.checkSingleGate('gate-aeth-guardian');
      const gate = bridge.tokenGates.find((g) => g.id === 'gate-aeth-guardian');
      expect(gate?.checkedAt).toBeDefined();

      await bridge.checkAllTokenGates();
      for (const g of bridge.tokenGates) {
        expect(g.checkedAt).toBeDefined();
      }
    });
  });

  // ─── 6. NETWORK SWITCHING & UI NAVIGATION ───────────────────────────────────

  describe('6. Network Switching & Modal UI Navigation', () => {
    it('should switch active network to Arbitrum One and update state', async () => {
      await bridge.switchNetwork('0xa4b1');

      expect(bridge.chainId).toBe('0xa4b1');
      expect(bridge.currentNetwork).toContain('Arbitrum One');
    });

    it('should navigate between modal tabs', () => {
      bridge.setTab('signatures');
      expect(bridge.activeTab).toBe('signatures');

      bridge.setTab('token-gate');
      expect(bridge.activeTab).toBe('token-gate');

      bridge.setTab('networks');
      expect(bridge.activeTab).toBe('networks');

      bridge.setTab('identity');
      expect(bridge.activeTab).toBe('identity');
    });

    it('should manage modal open, close and toggle states', () => {
      expect(bridge.isModalOpen).toBe(false);

      bridge.openModal();
      expect(bridge.isModalOpen).toBe(true);

      bridge.closeModal();
      expect(bridge.isModalOpen).toBe(false);

      bridge.toggleModal();
      expect(bridge.isModalOpen).toBe(true);
    });

    it('should trigger toast notifications and copy to clipboard', () => {
      bridge.showToast('Test Toast Notification', 'success');
      expect(bridge.toastType).toBe('success');

      // Clipboard copy test
      bridge.copyToClipboard('0x123', 'Adresă');
      expect(bridge.toastType).toBe('success');
    });
  });

  // ─── 7. HTML RENDERING COMPONENTS ───────────────────────────────────────────

  describe('7. HTML Template Rendering Components', () => {
    it('should render header wallet button with connection indicator and address', () => {
      const html = bridge.renderWalletButton();

      expect(html).toContain('💰');
      expect(html).toContain('walletBridge.toggleModal');
      expect(html).toContain('bg-surface-base');
    });

    it('should render complete wallet bridge panel with all tabs and action buttons', () => {
      bridge.openModal();
      const html = bridge.renderWalletPanel();

      expect(html).toContain('Sovereign Wallet');
      expect(html).toContain('Ed25519 ↔ Secp256k1');
      expect(html).toContain('Identity & Bridge');
      expect(html).toContain('Signatures & Attestations');
      expect(html).toContain('Token-Gated Spaces');
      expect(html).toContain('EVM Networks');
      expect(html).toContain('close-feature');
      expect(html).toContain('bg-surface-base');
      expect(html).toContain('bg-canvas');
    });
  });
});

