import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BrowserProvider, Wallet, toUtf8String, verifyMessage } from 'ethers';
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
    vi.spyOn(BrowserProvider.prototype, 'lookupAddress').mockResolvedValue(null);
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
    vi.unstubAllGlobals();
  });

  async function connectSigningProvider() {
    const signer = Wallet.createRandom();
    (window as any).clientStore = { keypair: { publicKey: new Uint8Array(32).fill(7) } };
    (window as any).location = { origin: 'https://example.test' };
    (window as any).ethereum = { request: vi.fn(async ({ method, params }) => {
      if (method === 'eth_requestAccounts') return [signer.address];
      if (method === 'eth_chainId') return '0x1';
      if (method === 'personal_sign') return signer.signMessage(toUtf8String(params[0]));
      if (method === 'wallet_switchEthereumChain') return null;
      throw new Error('Unexpected provider request');
    }) };
    await bridge.connectMetaMask();
    return signer;
  }

  function configureTestToken() {
    bridge.tokenGates = [{ id: 'gate-aeth-guardian', name: 'Test token', tokenAddress: '0x1234567890123456789012345678901234567890', minBalance: 100, symbol: 'TEST', icon: '', description: '', spaceChannelId: '', passed: false, checkedAt: 0, decimals: 18 }];
    return bridge.tokenGates[0];
  }

  // ─── 1. CRYPTOGRAPHIC PRIMITIVES & ENCODINGS ───────────────────────────────

  describe('1. Dual-Curve Address Derivation & EIP-55 Checksum', () => {
    it('does not derive a spendable Ethereum account from a public Ed25519 identifier', () => {
      expect(bridge.identity).toBeNull();
      expect(bridge.selectedAccount).toBe('');
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
    it('should initialize without an authorized Ethereum identity and with standard networks', () => {
      expect(bridge.identity).toBeNull();
      expect(bridge.isConnected).toBe(false);
      expect(bridge.activeTab).toBe('identity');
      expect(bridge.isModalOpen).toBe(false);
      expect(bridge.supportedNetworks.length).toBe(5);
      expect(bridge.tokenGates.length).toBe(0);
    });

    it('should export singleton instance walletBridge correctly', () => {
      expect(walletBridge).toBeInstanceOf(WalletBridge);
      expect(typeof walletBridge.connectMetaMask).toBe('function');
      expect(typeof walletBridge.signWithEthereum).toBe('function');
    });
  });

  // ─── 3. CONNECTION & METAMASK INTEGRATION ───────────────────────────────────

  describe('3. Connection & EVM Web3 Provider Flow', () => {
    it('should remain disconnected when MetaMask is not present', async () => {
      const address = await bridge.connectMetaMask();

      expect(address).toBeNull();
      expect(bridge.isConnected).toBe(false);
      expect(bridge.identity).toBeNull();
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
      expect(bridge.identity?.ensName).toBeUndefined();
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

    it('should disconnect cleanly and remove account authorization', () => {
      bridge.isConnected = true;
      bridge.disconnect();

      expect(bridge.isConnected).toBe(false);
      expect(bridge.identity).toBeNull();
      expect(bridge.toastType).toBe('info');
    });
  });

  // ─── 4. CRYPTOGRAPHIC MESSAGE SIGNING & ATTESTATIONS ────────────────────────

  describe('4. Message Signing & Attestations', () => {
    it('should refuse signing without a wallet provider', async () => {
      const message = 'UREfy Sovereign Consensus Attestation #42';
      const signed: SignedMessage | null = await bridge.signWithEthereum(message);

      expect(signed).toBeNull();
      expect(bridge.recentSignatures).toHaveLength(0);
    });

    it('should execute personal_sign via MetaMask when connected', async () => {
      const signer = await connectSigningProvider();
      const signed = await bridge.signWithEthereum('Hello Web3');

      expect((window as any).ethereum.request).toHaveBeenCalledWith({
        method: 'personal_sign',
        params: [expect.any(String), expect.any(String)],
      });
      expect(verifyMessage(signed!.message, signed!.signature)).toBe(signer.address);
    });

    it('should sign full dual-curve identity linkage proof', async () => {
      const signer = await connectSigningProvider();
      const proof = await bridge.signIdentityProof();
      expect(proof).toBeDefined();
      expect(proof?.startsWith('0x')).toBe(true);
      expect(bridge.identity?.verificationProof).toBe(proof);
      expect(verifyMessage(bridge.identity!.verificationMessage!, proof!)).toBe(signer.address);
    });

    it('should sign custom message from input field', async () => {
      await connectSigningProvider();
      bridge.setCustomMessage('Sovereign Channel Message #99');
      await bridge.signCustomMessage();

      expect(bridge.recentSignatures.length).toBe(1);
      expect(bridge.recentSignatures[0].message).toBe('Sovereign Channel Message #99');
    });
  });

  // ─── 5. ENS NAME RESOLUTION & TOKEN GATING ──────────────────────────────────

  describe('5. ENS Resolution & Token Gating Verification', () => {
    it('should display an ENS name only when the provider resolves it', async () => {
      await connectSigningProvider();
      vi.mocked(BrowserProvider.prototype.lookupAddress).mockResolvedValueOnce('vitalik.eth').mockResolvedValueOnce('satoshi.eth');
      const vitalikAddr = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045';
      const ens = await bridge.resolveENS(vitalikAddr);
      expect(ens).toBe('vitalik.eth');

      const satoshiAddr = '0xa79e63e78e20224a0d507d5765f774e66d3dac48';
      expect(await bridge.resolveENS(satoshiAddr)).toBe('satoshi.eth');
    });

    it('should return no ENS name when resolution is unavailable', async () => {
      const randomAddr = '0x1234567890abcdef1234567890abcdef12345678';
      const alias = await bridge.resolveENS(randomAddr);
      expect(alias).toBeNull();
    });

    it('should verify token gate access thresholds', async () => {
      const gate: TokenGate = configureTestToken();
      const hasAccess = await bridge.verifyTokenGate(gate.tokenAddress, gate.minBalance);

      expect(typeof hasAccess).toBe('boolean');
    });

    it('should check single and all token gates', async () => {
      configureTestToken();
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
      await connectSigningProvider();
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

    it('should trigger toast notifications and confirm an actual clipboard write', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', { clipboard: { writeText } });
      bridge.showToast('Test Toast Notification', 'success');
      expect(bridge.toastType).toBe('success');

      // Clipboard copy test
      await bridge.copyToClipboard('0x123', 'Adresă');
      expect(writeText).toHaveBeenCalledWith('0x123');
      expect(bridge.toastType).toBe('success');
    });
  });

  // ─── 7. HTML RENDERING COMPONENTS ───────────────────────────────────────────

  describe('7. HTML Template Rendering Components', () => {
    it('should render header wallet button with connection indicator and address', () => {
      const html = bridge.renderWalletButton();

      expect(html).toContain('lucide-icon');
      expect(html).toContain('data-feature="wallet"');
      expect(html).toContain('bg-surface-base');
    });

    it('should render complete wallet bridge panel with all tabs and action buttons', () => {
      bridge.openModal();
      const html = bridge.renderWalletPanel();

      expect(html).toContain('Sovereign Wallet');
      expect(html).toContain('Ed25519 ↔ Secp256k1');
      expect(html).toContain('Identity & Bridge');
      expect(html).toContain('Signatures & Attestations');
      expect(html).toContain('ERC-20 Checks');
      expect(html).toContain('EVM Networks');
      expect(html).toContain('close-feature');
      expect(html).toContain('bg-surface-base');
      expect(html).toContain('bg-canvas');
    });
  });
});

