import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WalletBridge, type TokenGate } from '../src/wallet-bridge.js';

describe('Wallet Token-Gate Security & Verification (Finding 3)', () => {
  let bridge: WalletBridge;
  let mockStorage: Record<string, string>;
  let mockEth: { request: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn> };

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

    mockEth = {
      request: vi.fn(),
      on: vi.fn(),
    };

    globalThis.localStorage = storageObj;
    globalThis.window = {
      localStorage: storageObj,
      ethereum: mockEth,
      setTimeout: vi.fn((_fn: () => void, _ms?: number) => 123 as unknown as NodeJS.Timeout),
      clearTimeout: vi.fn(),
    } as unknown as Window & typeof globalThis;

    bridge = new WalletBridge();
    bridge.tokenGates = [{
      id: 'gate-aeth-guardian', name: 'Test threshold', tokenAddress: '0xA374F62184918e90E0e82fF4eB54673B8e725041',
      minBalance: 100, symbol: 'TEST', icon: '', description: '', spaceChannelId: '', passed: false, checkedAt: 0, decimals: 18,
    }];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Web3 Provider Disconnection & Unavailability', () => {
    it('returns false and displays user notification when window.ethereum is not present', async () => {
      // Remove ethereum provider
      (globalThis.window as any).ethereum = undefined;
      bridge.isConnected = false;

      const hasAccess = await bridge.verifyTokenGate('0xA374F62184918e90E0e82fF4eB54673B8e725041', 100);

      expect(hasAccess).toBe(false);
      expect(bridge.toastMessage).toBe('Token verification unavailable: Web3 provider disconnected');
      expect(bridge.toastType).toBe('warn');
    });

    it('returns false and displays user notification when wallet is not connected', async () => {
      bridge.isConnected = false;

      const hasAccess = await bridge.verifyTokenGate('0xA374F62184918e90E0e82fF4eB54673B8e725041', 100);

      expect(hasAccess).toBe(false);
      expect(bridge.toastMessage).toBe('Token verification unavailable: Web3 provider disconnected');
      expect(mockEth.request).not.toHaveBeenCalled();
    });

    it('returns false when no active account address is present', async () => {
      bridge.isConnected = true;
      bridge.identity = null;
      bridge.selectedAccount = '';

      const hasAccess = await bridge.verifyTokenGate('0xA374F62184918e90E0e82fF4eB54673B8e725041', 100);

      expect(hasAccess).toBe(false);
      expect(bridge.toastMessage).toBe('Token verification unavailable: Web3 provider disconnected');
    });
  });

  describe('2. RPC Failure & Exception Handling', () => {
    it('returns false cleanly and notifies user when eth_call fails or throws RPC error', async () => {
      bridge.isConnected = true;
      bridge.selectedAccount = '0x1234567890123456789012345678901234567890';

      mockEth.request.mockRejectedValue(new Error('Internal JSON-RPC error: timeout'));

      const hasAccess = await bridge.verifyTokenGate('0xA374F62184918e90E0e82fF4eB54673B8e725041', 100);

      expect(hasAccess).toBe(false);
      expect(bridge.toastMessage).toBe('Token verification unavailable: Web3 provider disconnected');
    });

    it('returns false when eth_call returns empty hex result', async () => {
      bridge.isConnected = true;
      bridge.selectedAccount = '0x1234567890123456789012345678901234567890';

      mockEth.request.mockResolvedValue('0x');

      const hasAccess = await bridge.verifyTokenGate('0xA374F62184918e90E0e82fF4eB54673B8e725041', 100);

      expect(hasAccess).toBe(false);
    });
  });

  describe('3. Removal of Deterministic Fake Balance & Local Cache Non-Authoritativeness', () => {
    it('never grants access using mockBalance or deterministic hash seed when offline', async () => {
      (globalThis.window as any).ethereum = undefined;
      bridge.isConnected = false;

      // An address that with the old formula would have had mockBalance >= 100
      bridge.selectedAccount = '0x9999999912345678901234567890123456789012';
      if (bridge.identity) {
        bridge.identity.ethAddress = '0x9999999912345678901234567890123456789012';
      }

      const hasAccess = await bridge.verifyTokenGate('0xA374F62184918e90E0e82fF4eB54673B8e725041', 100);
      expect(hasAccess).toBe(false);
    });

    it('never considers local tokenGates passed status as authoritative without real on-chain check', async () => {
      // Intentionally forge gate.passed = true in memory/cache
      const gate = bridge.tokenGates.find((g) => g.id === 'gate-aeth-guardian')!;
      gate.passed = true;

      // Real on-chain balance is 0
      bridge.isConnected = true;
      bridge.selectedAccount = '0x1234567890123456789012345678901234567890';
      mockEth.request.mockResolvedValue('0x0000000000000000000000000000000000000000000000000000000000000000');

      const hasAccess = await bridge.verifyTokenGate(gate.tokenAddress, gate.minBalance);

      // Must be rejected because on-chain balance is 0, regardless of gate.passed in memory
      expect(hasAccess).toBe(false);
    });
  });

  describe('4. Token Decimal Normalization', () => {
    it('normalizes 18-decimal token balance correctly (e.g. 100 tokens = 100 * 10^18)', async () => {
      bridge.isConnected = true;
      bridge.selectedAccount = '0x1234567890123456789012345678901234567890';

      const tokenAddress = '0xA374F62184918e90E0e82fF4eB54673B8e725041';
      const minBalance = 100; // 100 AETH

      // Case A: Exact threshold (100 * 10^18 = 0x56bc75e2d63100000)
      const exactly100Tokens = '0x' + (100n * 10n ** 18n).toString(16);
      mockEth.request.mockResolvedValue(exactly100Tokens);

      expect(await bridge.verifyTokenGate(tokenAddress, minBalance, 18)).toBe(true);

      // Case B: Less than threshold (99.9 * 10^18 = 99900000000000000000)
      const lessThan100 = '0x' + (999n * 10n ** 17n).toString(16);
      mockEth.request.mockResolvedValue(lessThan100);

      expect(await bridge.verifyTokenGate(tokenAddress, minBalance, 18)).toBe(false);

      // Case C: Raw 100 wei (100 raw base units is ~10^-16 tokens, NOT 100 tokens)
      mockEth.request.mockResolvedValue('0x64'); // 100 in hex

      expect(await bridge.verifyTokenGate(tokenAddress, minBalance, 18)).toBe(false);
    });

    it('normalizes 6-decimal token balance correctly (e.g. USDC style 50 tokens = 50 * 10^6)', async () => {
      bridge.isConnected = true;
      bridge.selectedAccount = '0x1234567890123456789012345678901234567890';

      const tokenAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
      const minBalance = 50;

      // 50 * 10^6 = 50000000 = 0x2faf080
      const exactly50Tokens = '0x' + (50n * 10n ** 6n).toString(16);
      mockEth.request.mockResolvedValue(exactly50Tokens);

      expect(await bridge.verifyTokenGate(tokenAddress, minBalance, 6)).toBe(true);

      // 49 * 10^6 = 49000000
      const insufficientBalance = '0x' + (49n * 10n ** 6n).toString(16);
      mockEth.request.mockResolvedValue(insufficientBalance);

      expect(await bridge.verifyTokenGate(tokenAddress, minBalance, 6)).toBe(false);
    });

    it('queries decimals() selector on-chain when not specified', async () => {
      bridge.isConnected = true;
      bridge.selectedAccount = '0x1234567890123456789012345678901234567890';

      const unconfiguredToken = '0x9999999999999999999999999999999999999999';

      mockEth.request.mockImplementation(async ({ params }) => {
        if (params[0].data === '0x313ce567') {
          return '0x06'; // 6 decimals
        }
        return '0x' + (25n * 10n ** 6n).toString(16); // 25 tokens in 6 decimals
      });

      const hasAccess = await bridge.verifyTokenGate(unconfiguredToken, 25);
      expect(hasAccess).toBe(true);
      expect(mockEth.request).toHaveBeenCalledWith({
        method: 'eth_call',
        params: [{ to: unconfiguredToken.toLowerCase(), data: '0x313ce567' }, 'latest'],
      });
    });
  });
});
