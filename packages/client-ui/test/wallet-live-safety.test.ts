import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WalletBridge } from '../src/wallet-bridge.js';
import { BrowserProvider, Wallet, toUtf8String, verifyMessage } from 'ethers';

beforeEach(() => {
  vi.spyOn(BrowserProvider.prototype, 'lookupAddress').mockResolvedValue(null);
  vi.stubGlobal('window', {
    setTimeout: vi.fn(), clearTimeout: vi.fn(),
    localStorage: { getItem: () => null, setItem: vi.fn() },
  });
  vi.stubGlobal('document', undefined);
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('Wallet operations require a real provider', () => {
  it('accepts a real EIP-191 signature from the connected account', async () => {
    const signer = Wallet.createRandom();
    (window as any).ethereum = { request: vi.fn(async ({ method, params }) => {
      if (method === 'eth_requestAccounts') return [signer.address];
      if (method === 'eth_chainId') return '0x1';
      if (method === 'personal_sign') return signer.signMessage(toUtf8String(params[0]));
      throw new Error('Unexpected wallet request');
    }) };
    const wallet = new WalletBridge();
    expect(await wallet.connectMetaMask()).toBe(signer.address);
    const signed = await wallet.signWithEthereum('Verified identity');
    expect(verifyMessage(signed!.message, signed!.signature)).toBe(signer.address);
  });

  it('rejects a signature returned for a different account', async () => {
    const signer = Wallet.createRandom();
    const differentSigner = Wallet.createRandom();
    (window as any).ethereum = { request: vi.fn(async ({ method, params }) => {
      if (method === 'eth_requestAccounts') return [signer.address];
      if (method === 'eth_chainId') return '0x1';
      if (method === 'personal_sign') return differentSigner.signMessage(toUtf8String(params[0]));
      return null;
    }) };
    const wallet = new WalletBridge();
    await wallet.connectMetaMask();
    expect(await wallet.signWithEthereum('Verified identity')).toBeNull();
    expect(wallet.recentSignatures).toHaveLength(0);
  });

  it('does not change the network when the wallet rejects the request', async () => {
    (window as any).ethereum = { request: vi.fn().mockRejectedValue(new Error('User rejected')) };
    const wallet = new WalletBridge();
    wallet.isConnected = true;
    const previous = wallet.chainId;
    await wallet.switchNetwork('0xa4b1');
    expect(wallet.chainId).toBe(previous);
  });

  it('does not manufacture an Ethereum account at startup', () => {
    const wallet = new WalletBridge();
    expect(wallet.identity).toBeNull();
    expect(wallet.selectedAccount).toBe('');
    expect(wallet.isConnected).toBe(false);
  });

  it('does not report a connection when no provider exists', async () => {
    const wallet = new WalletBridge();
    expect(await wallet.connectMetaMask()).toBeNull();
    expect(wallet.isConnected).toBe(false);
  });

  it('does not manufacture signatures for a disconnected provider', async () => {
    const wallet = new WalletBridge();
    wallet.selectedAccount = '0x1234567890abcdef1234567890abcdef12345678';
    wallet.isConnected = true;
    expect(await wallet.signWithEthereum('Identity binding')).toBeNull();
    expect(wallet.recentSignatures).toHaveLength(0);
  });

  it('clears account and identity on disconnect', () => {
    const wallet = new WalletBridge();
    wallet.isConnected = true;
    wallet.selectedAccount = '0x1234567890abcdef1234567890abcdef12345678';
    wallet.disconnect();
    expect(wallet.selectedAccount).toBe('');
    expect(wallet.identity).toBeNull();
  });
});
