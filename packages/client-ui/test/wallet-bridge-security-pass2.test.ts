import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BrowserProvider, Wallet, toUtf8String } from 'ethers';
import { WalletBridge } from '../src/wallet-bridge.js';

describe('Web3 Wallet Bridge Identity Proof Domain & Chain Binding (Pass 2)', () => {
  let bridge: WalletBridge;
  let signer: Wallet;

  beforeEach(async () => {
    vi.spyOn(BrowserProvider.prototype, 'lookupAddress').mockResolvedValue(null);
    signer = Wallet.createRandom();

    const mockStorage: Record<string, string> = {};
    const storageObj = {
      getItem: vi.fn((key: string) => mockStorage[key] || null),
      setItem: vi.fn((key: string, val: string) => { mockStorage[key] = String(val); }),
      removeItem: vi.fn((key: string) => { delete mockStorage[key]; }),
      clear: vi.fn(() => { for (const k in mockStorage) delete mockStorage[k]; }),
      length: 0,
      key: vi.fn(() => null),
    } as unknown as Storage;

    globalThis.localStorage = storageObj;
    globalThis.window = {
      localStorage: storageObj,
      setTimeout: vi.fn(),
      clearTimeout: vi.fn(),
      clientStore: { keypair: { publicKey: new Uint8Array(32).fill(42) } },
      location: { origin: 'https://urefy.com' },
      ethereum: {
        request: vi.fn(async ({ method, params }: { method: string; params?: any[] }) => {
          if (method === 'eth_requestAccounts') return [signer.address];
          if (method === 'eth_chainId') return '0x1';
          if (method === 'personal_sign') return signer.signMessage(toUtf8String(params![0]));
          return null;
        }),
      },
    } as unknown as Window & typeof globalThis;

    bridge = new WalletBridge();
    await bridge.connectMetaMask();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('rejects identity proofs lacking the UREFY_IDENTITY_BINDING_V1 domain separator', async () => {
    // Construct a signed message that binds key and address, but lacks domain separator
    const fakeMessage = `Random Signed Message\nAetherisKey: ${bridge.identity!.aetherisPubKey}\nEthAddress: ${bridge.identity!.address}\nChainId: 0x1`;
    const fakeProof = await signer.signMessage(fakeMessage);

    const tamperedIdentity = {
      ...bridge.identity!,
      verificationProof: fakeProof,
      verificationMessage: fakeMessage,
    };

    const res = bridge.verifyIdentityProof(tamperedIdentity);
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/lacks the required UREFY_IDENTITY_BINDING_V1 domain separator/i);
  });

  it('rejects identity proofs with mismatched chain ID when expectedChainId is enforced', async () => {
    // Generate valid proof on chain 0x1 (Ethereum Mainnet)
    await bridge.signIdentityProof();

    // Verification expecting chain 0xaa36a7 (Sepolia)
    const res = bridge.verifyIdentityProof(bridge.identity, { expectedChainId: '0xaa36a7' });
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/does not bind the expected chain ID/i);
  });

  it('accepts valid identity proof matching both domain separator and expectedChainId', async () => {
    await bridge.signIdentityProof();

    const res = bridge.verifyIdentityProof(bridge.identity, { expectedChainId: '0x1' });
    expect(res.valid).toBe(true);
    expect(res.error).toBeUndefined();
  });
});
