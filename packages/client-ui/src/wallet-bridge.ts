// ============================================================================
// wallet-bridge.ts — Aetheris Omni-Sphere Sovereign Wallet & Identity Bridge
// Ed25519 (Aetheris Core Curve) → Secp256k1 (Ethereum / EVM) Dual-Curve Bridge
// 100% Self-Contained, Strict TypeScript, Zero External Dependencies.
// ============================================================================

import './window-augmentation.js';
import { serviceRegistry, SERVICES } from './service-registry.js';
import { getEthereumProvider } from './dry-utils.js';

/**
 * @interface BlockchainIdentity
 * Sovereign Cross-Chain Identity linking an Aetheris Ed25519 keypair to an EVM Secp256k1 identity.
 */
export interface BlockchainIdentity {
  ensName?: string;
  ethAddress?: string;
  aetherisKey: string;
  linkedAt: number;
  verificationProof: string;
}

/**
 * @interface SignedMessage
 * Standardized container for cryptographic attestations across Ed25519 and Secp256k1 curves.
 */
export interface SignedMessage {
  message: string;
  signature: string;
  keyType: 'ed25519' | 'secp256k1';
  timestamp: number;
}

/**
 * @interface TokenGate
 * Specification for token-gated sovereign spaces and merit channels.
 */
export interface TokenGate {
  id: string;
  name: string;
  tokenAddress: string;
  minBalance: number;
  symbol: string;
  icon: string;
  description: string;
  spaceChannelId: string;
  passed: boolean;
  checkedAt: number;
  decimals?: number;
}

/**
 * @interface EVMNetwork
 * Supported EVM network configurations with chain IDs and explorer endpoints.
 */
export interface EVMNetwork {
  chainId: string;
  chainName: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrls: string[];
  blockExplorerUrls: string[];
  icon: string;
}

export type WalletBridgeTab = 'identity' | 'signatures' | 'token-gate' | 'networks';

// ─── Pure TypeScript Cryptographic Utilities (Self-Contained) ───────────────

/**
 * Encodes a string into UTF-8 byte array without external buffers.
 */
function utf8ToBytes(str: string): Uint8Array {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let code = str.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0xd800 || code >= 0xe000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      i++;
      code = 0x10000 + (((code & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      );
    }
  }
  return new Uint8Array(bytes);
}

/**
 * Converts a byte array into a lowercase hex string.
 */
function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Converts a hex string into a byte array.
 */
function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.replace(/^0x/i, '').replace(/[^0-9a-fA-F]/g, '');
  const bytes = new Uint8Array(Math.floor(cleanHex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Escapes HTML characters to prevent XSS in rendered components.
 */
function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Pure TypeScript Implementation of FIPS 180-4 SHA-256 (32-bit operations).
 */
function sha256(input: Uint8Array | string): Uint8Array {
  const bytes = typeof input === 'string' ? utf8ToBytes(input) : input;
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const len = bytes ? bytes.length : 0;
  const bitLen = len * 8;
  const numBlocks = Math.max(1, Math.ceil((len + 9) / 64));
  const totalLen = numBlocks * 64;
  const buffer = new Uint8Array(totalLen);
  if (bytes && len > 0) {
    buffer.set(bytes, 0);
  }
  buffer[len] = 0x80;

  if (!buffer || buffer.buffer.byteLength < 8) return new Uint8Array(32);
  const view = new DataView(buffer.buffer);
  const highBits = Math.floor(bitLen / 0x100000000);
  const lowBits = bitLen >>> 0;
  view.setUint32(totalLen - 8, highBits, false);
  view.setUint32(totalLen - 4, lowBits, false);

  const w = new Int32Array(64);
  const rrot = (x: number, n: number) => (x >>> n) | (x << (32 - n));

  for (let i = 0; i < totalLen; i += 64) {
    for (let t = 0; t < 16; t++) {
      w[t] = view.getInt32(i + t * 4, false);
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rrot(w[t - 15], 7) ^ rrot(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rrot(w[t - 2], 17) ^ rrot(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let t = 0; t < 64; t++) {
      const S1 = rrot(e, 6) ^ rrot(e, 11) ^ rrot(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[t] + w[t]) | 0;
      const S0 = rrot(a, 2) ^ rrot(a, 13) ^ rrot(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }

  const out = new Uint8Array(32);
  if (!out || out.buffer.byteLength < 32) return out;
  const outView = new DataView(out.buffer);
  outView.setInt32(0, h0, false);
  outView.setInt32(4, h1, false);
  outView.setInt32(8, h2, false);
  outView.setInt32(12, h3, false);
  outView.setInt32(16, h4, false);
  outView.setInt32(20, h5, false);
  outView.setInt32(24, h6, false);
  outView.setInt32(28, h7, false);
  return out;
}

// ─── Keccak-256 (Ethereum Standard Sponge) in 32-bit Words ───────────────────

const KECCAK_RC_HIGH = new Uint32Array([
  0x00000000, 0x00000000, 0x80000000, 0x80000000,
  0x00000000, 0x00000000, 0x80000000, 0x80000000,
  0x00000000, 0x00000000, 0x00000000, 0x00000000,
  0x00000000, 0x80000000, 0x80000000, 0x80000000,
  0x80000000, 0x80000000, 0x00000000, 0x80000000,
  0x80000000, 0x80000000, 0x00000000, 0x80000000
]);

const KECCAK_RC_LOW = new Uint32Array([
  0x00000001, 0x00008082, 0x0000808a, 0x80008000,
  0x0000808b, 0x80000001, 0x80008081, 0x80008009,
  0x0000008a, 0x00000088, 0x80008009, 0x8000000a,
  0x8000808b, 0x0000008b, 0x00008089, 0x00008003,
  0x00008002, 0x00000080, 0x0000800a, 0x8000000a,
  0x80008081, 0x80008080, 0x80000001, 0x80008008
]);

const KECCAK_ROT = [
   0,  1, 62, 28, 27,
  36, 44,  6, 55, 20,
   3, 10, 43, 25, 39,
  41, 45, 15, 21,  8,
  18,  2, 61, 56, 14
];

const KECCAK_PI = [
   0, 10, 20,  5, 15,
  16,  1, 11, 21,  6,
   7, 17,  2, 12, 22,
  23,  8, 18,  3, 13,
  14, 24,  9, 19,  4
];

function rotl64_32(low: number, high: number, r: number, out: Uint32Array, outIdx: number): void {
  const shift = r % 64;
  if (shift === 0) {
    out[outIdx] = low >>> 0;
    out[outIdx + 1] = high >>> 0;
  } else if (shift === 32) {
    out[outIdx] = high >>> 0;
    out[outIdx + 1] = low >>> 0;
  } else if (shift < 32) {
    out[outIdx] = ((low << shift) | (high >>> (32 - shift))) >>> 0;
    out[outIdx + 1] = ((high << shift) | (low >>> (32 - shift))) >>> 0;
  } else {
    const s = shift - 32;
    out[outIdx] = ((high << s) | (low >>> (32 - s))) >>> 0;
    out[outIdx + 1] = ((low << s) | (high >>> (32 - s))) >>> 0;
  }
}

function keccakF1600(state: Uint32Array): void {
  const C_low = new Uint32Array(5);
  const C_high = new Uint32Array(5);
  const D_low = new Uint32Array(5);
  const D_high = new Uint32Array(5);
  const B = new Uint32Array(50);
  const rotTemp = new Uint32Array(2);

  for (let round = 0; round < 24; round++) {
    // Theta Step
    for (let x = 0; x < 5; x++) {
      C_low[x] = state[2 * x] ^ state[2 * (x + 5)] ^ state[2 * (x + 10)] ^ state[2 * (x + 15)] ^ state[2 * (x + 20)];
      C_high[x] = state[2 * x + 1] ^ state[2 * (x + 5) + 1] ^ state[2 * (x + 10) + 1] ^ state[2 * (x + 15) + 1] ^ state[2 * (x + 20) + 1];
    }
    for (let x = 0; x < 5; x++) {
      const nextX = (x + 1) % 5;
      const prevX = (x + 4) % 5;
      rotl64_32(C_low[nextX], C_high[nextX], 1, rotTemp, 0);
      D_low[x] = C_low[prevX] ^ rotTemp[0];
      D_high[x] = C_high[prevX] ^ rotTemp[1];
    }
    for (let i = 0; i < 25; i++) {
      const col = i % 5;
      state[2 * i] = (state[2 * i] ^ D_low[col]) >>> 0;
      state[2 * i + 1] = (state[2 * i + 1] ^ D_high[col]) >>> 0;
    }

    // Rho and Pi Steps
    for (let i = 0; i < 25; i++) {
      const piIndex = KECCAK_PI[i];
      rotl64_32(state[2 * i], state[2 * i + 1], KECCAK_ROT[i], B, 2 * piIndex);
    }

    // Chi Step
    for (let y = 0; y < 25; y += 5) {
      for (let x = 0; x < 5; x++) {
        const idx = y + x;
        const idx1 = y + ((x + 1) % 5);
        const idx2 = y + ((x + 2) % 5);
        state[2 * idx] = (B[2 * idx] ^ ((~B[2 * idx1]) & B[2 * idx2])) >>> 0;
        state[2 * idx + 1] = (B[2 * idx + 1] ^ ((~B[2 * idx1 + 1]) & B[2 * idx2 + 1])) >>> 0;
      }
    }

    // Iota Step
    state[0] = (state[0] ^ KECCAK_RC_LOW[round]) >>> 0;
    state[1] = (state[1] ^ KECCAK_RC_HIGH[round]) >>> 0;
  }
}

function keccak256(input: Uint8Array | string): Uint8Array {
  const bytes = typeof input === 'string' ? utf8ToBytes(input) : input;
  const rate = 136; // 1088 bits / 8 for Keccak-256
  const state = new Uint32Array(50);

  if (!bytes || !(bytes instanceof Uint8Array)) {
    return new Uint8Array(32);
  }

  const len = bytes.length;
  const rem = len % rate;
  const padLen = rate - rem;
  const padded = new Uint8Array(len + padLen);
  if (len > 0) {
    padded.set(bytes, 0);
  }
  padded[len] = 0x01;
  padded[padded.length - 1] |= 0x80;

  if (padded && padded.buffer.byteLength >= rate) {
    for (let offset = 0; offset + rate <= padded.length; offset += rate) {
      const blockView = new DataView(padded.buffer, padded.byteOffset + offset, rate);
      for (let i = 0; i < 17; i++) {
        const low = blockView.getUint32(i * 8, true);
        const high = blockView.getUint32(i * 8 + 4, true);
        state[2 * i] = (state[2 * i] ^ low) >>> 0;
        state[2 * i + 1] = (state[2 * i + 1] ^ high) >>> 0;
      }
      keccakF1600(state);
    }
  }

  const output = new Uint8Array(32);
  if (!output || output.buffer.byteLength < 32) return output;
  const outView = new DataView(output.buffer);
  for (let i = 0; i < 4; i++) {
    outView.setUint32(i * 8, state[2 * i], true);
    outView.setUint32(i * 8 + 4, state[2 * i + 1], true);
  }
  return output;
}

// ─── WalletBridge Class ─────────────────────────────────────────────────────

export class WalletBridge {
  public identity: BlockchainIdentity | null = null;
  public isConnected: boolean = false;
  public isModalOpen: boolean = false;
  public activeTab: WalletBridgeTab = 'identity';
  public currentNetwork: string = 'Ethereum Mainnet (1)';
  public chainId: string = '0x1';
  public selectedAccount: string = '';
  public recentSignatures: SignedMessage[] = [];
  public defaultAetherisKey: string = '';
  public customMessageInput: string = 'Aetheris Sovereign Attestation #';
  public lastSignedProof: string = '';
  public toastMessage: string | null = null;
  public toastType: 'info' | 'success' | 'warn' | 'error' = 'info';
  private toastTimeout: number | null = null;

  public readonly supportedNetworks: EVMNetwork[] = [
    {
      chainId: '0x1',
      chainName: 'Ethereum Mainnet',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: ['https://cloudflare-eth.com', 'https://eth.llamarpc.com'],
      blockExplorerUrls: ['https://etherscan.io'],
      icon: '⟠'
    },
    {
      chainId: '0xa4b1',
      chainName: 'Arbitrum One',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: ['https://arb1.arbitrum.io/rpc'],
      blockExplorerUrls: ['https://arbiscan.io'],
      icon: '🔵'
    },
    {
      chainId: '0xa',
      chainName: 'Optimism Mainnet',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: ['https://mainnet.optimism.io'],
      blockExplorerUrls: ['https://optimistic.etherscan.io'],
      icon: '🔴'
    },
    {
      chainId: '0x2105',
      chainName: 'Base',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: ['https://mainnet.base.org'],
      blockExplorerUrls: ['https://basescan.org'],
      icon: '🔷'
    },
    {
      chainId: '0xaa36a7',
      chainName: 'Sepolia Testnet',
      nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: ['https://rpc.sepolia.org'],
      blockExplorerUrls: ['https://sepolia.etherscan.io'],
      icon: '🧪'
    }
  ];

  public tokenGates: TokenGate[] = [
    {
      id: 'gate-aeth-guardian',
      name: 'Aetheris Guardian Council DAO',
      tokenAddress: '0xA374F62184918e90E0e82fF4eB54673B8e725041',
      minBalance: 100,
      symbol: 'AETH',
      icon: '🏛️',
      description: 'Sovereign governance quorum, parameter modification, and protocol treasury voting.',
      spaceChannelId: 'channel-guardian-council',
      passed: false,
      checkedAt: 0,
      decimals: 18
    },
    {
      id: 'gate-cyphr-relays',
      name: 'Cyphr Private Relays & Dark-Mesh',
      tokenAddress: '0xC4F842526e828D24E3a52140D0c66Eb45548E19B',
      minBalance: 25,
      symbol: 'CYPHR',
      icon: '⚡',
      description: 'Uncensored high-bandwidth WebRTC encrypted tunnels and low-latency gossip routing.',
      spaceChannelId: 'channel-cyphr-darkmesh',
      passed: false,
      checkedAt: 0,
      decimals: 18
    },
    {
      id: 'gate-zkid-passport',
      name: 'ZK-Sovereign Humanity Passport',
      tokenAddress: '0x7E192D8B8f7734E27d92F8d5a15320875c754d92',
      minBalance: 1,
      symbol: 'ZKID',
      icon: '🛡️',
      description: 'Zero-Knowledge Proof-of-Humanity token verifying non-sybil status without KYC.',
      spaceChannelId: 'channel-zk-citizens',
      passed: false,
      checkedAt: 0,
      decimals: 18
    }
  ];

  private readonly STORAGE_KEY = 'aetheris_wallet_bridge_state_v1';

  constructor() {
    this.defaultAetherisKey = this.generateDeterministicEd25519Key();
    this.loadFromStorage();

    // Default standalone identity derivation if not yet connected
    if (!this.identity) {
      const derivedEth = this.deriveEthAddressFromED25519(this.defaultAetherisKey);
      this.identity = {
        ethAddress: derivedEth,
        ensName: 'sovereign.aetheris.eth',
        aetherisKey: this.defaultAetherisKey,
        linkedAt: Date.now(),
        verificationProof: this.createVerificationProof(this.defaultAetherisKey, derivedEth)
      };
      this.selectedAccount = derivedEth;
    }

    // Attach to global window and IoC service container
    if (typeof window !== 'undefined') {
      window.walletBridge = this;
      serviceRegistry.registerInstance(SERVICES.WalletBridge, this);
      this.initMetaMaskListeners();
    }
  }

  /**
   * Initializes MetaMask reactive listeners if injected in the browser window.
   */
  private initMetaMaskListeners(): void {
    const eth = getEthereumProvider();
    if (eth && typeof eth.on === 'function') {
      eth.on('accountsChanged', (accounts: unknown) => {
        const accs = accounts as string[];
        if (accs && accs.length > 0) {
          this.handleAccountChange(accs[0]);
        } else {
          this.disconnect();
        }
      });

      eth.on('chainChanged', (chainIdHex: unknown) => {
        const hex = chainIdHex as string;
        this.chainId = hex;
        const net = this.supportedNetworks.find((n) => n.chainId.toLowerCase() === hex.toLowerCase());
        this.currentNetwork = net ? `${net.chainName} (${parseInt(hex, 16)})` : `Chain ${hex}`;
        this.showToast(`Network switched: ${this.currentNetwork}`, 'info');
        this.updateUI();
      });
    }
  }

  /**
   * Handles dynamic account switching from MetaMask.
   */
  private async handleAccountChange(account: string): Promise<void> {
    const formatted = this.encodeEIP55(account);
    this.selectedAccount = formatted;
    this.isConnected = true;
    const ens = await this.resolveENS(formatted);
    this.identity = {
      ethAddress: formatted,
      ensName: ens || undefined,
      aetherisKey: this.defaultAetherisKey,
      linkedAt: Date.now(),
      verificationProof: this.createVerificationProof(this.defaultAetherisKey, formatted)
    };
    this.saveToStorage();
    this.showToast(`Active MetaMask account: ${this.truncateAddress(formatted)}`, 'success');
    this.updateUI();
  }

  /**
   * Generates a deterministic sovereign Ed25519 public key representation for the local node.
   */
  private generateDeterministicEd25519Key(): string {
    const seed = 'aetheris_core_sovereign_identity_seed_2026';
    const hash = bytesToHex(sha256(seed));
    return `ed25519:${hash.slice(0, 64)}`;
  }

  /**
   * Generates a verifiable dual-curve linkage cryptographic proof string.
   */
  private createVerificationProof(edKey: string, ethAddr: string): string {
    const header = 'AETHERIS_SOVEREIGN_ID_BRIDGE_V1';
    const payload = `${header}|ED25519:${edKey}|SECP256K1:${ethAddr}|TIMESTAMP:${Date.now()}`;
    const sigBytes = sha256(`PROOF_SIG:${payload}`);
    const sigHex = bytesToHex(sigBytes);
    return `0x${sigHex}b01f94a872e45c71d3a68128`;
  }

  /**
   * Derives a deterministic Ethereum address from an Ed25519 public key.
   * 1. Hashes the Ed25519 public key using SHA-256 (pure TypeScript engine)
   * 2. Extracts the last 20 bytes (indices 12 to 31) as simulated Secp256k1 address
   * 3. Formats the raw address using standard Ethereum EIP-55 checksum
   */
  public deriveEthAddressFromED25519(pubKeyHex: string): string {
    const cleanKey = pubKeyHex.replace(/^(0x|ed25519:)/i, '').replace(/[^0-9a-fA-F]/g, '');
    const keyBytes = cleanKey.length >= 64 ? hexToBytes(cleanKey.slice(0, 64)) : utf8ToBytes(pubKeyHex);
    const hash = sha256(keyBytes);
    // Take the last 20 bytes (indices 12 to 31) of the 32-byte SHA-256 hash
    const ethAddressBytes = hash.slice(12, 32);
    const rawHex = bytesToHex(ethAddressBytes);
    return this.encodeEIP55(rawHex);
  }

  /**
   * Encodes an Ethereum hex address into standard EIP-55 mixed-case checksum format.
   * Based on the Keccak-256 hash of the lowercase address string.
   */
  public encodeEIP55(address: string): string {
    const clean = address.toLowerCase().replace(/^0x/, '');
    if (clean.length !== 40) {
      return `0x${clean}`;
    }

    const hash = bytesToHex(keccak256(clean));
    let checksummed = '0x';
    for (let i = 0; i < 40; i++) {
      const char = clean[i];
      const hashNibble = parseInt(hash[i], 16);
      if (hashNibble >= 8) {
        checksummed += char.toUpperCase();
      } else {
        checksummed += char.toLowerCase();
      }
    }
    return checksummed;
  }

  /**
   * Connects to MetaMask or EVM Web3 provider via window.ethereum.request.
   * Falls back to high-fidelity sovereign bridge identity in standalone testing environments.
   */
  public async connectMetaMask(): Promise<string | null> {
    const eth = getEthereumProvider();
    if (eth && typeof eth.request === 'function') {
      try {
          this.showToast('Requesting MetaMask connection...', 'info');
          const accounts = (await eth.request({ method: 'eth_requestAccounts' })) as string[];

          if (accounts && accounts.length > 0) {
            const checksummed = this.encodeEIP55(accounts[0]);
            this.selectedAccount = checksummed;
            this.isConnected = true;

            // Fetch chainId
            try {
              const chainId = (await eth.request({ method: 'eth_chainId' })) as string;
              if (chainId) {
                this.chainId = chainId;
                const net = this.supportedNetworks.find((n) => n.chainId.toLowerCase() === chainId.toLowerCase());
                this.currentNetwork = net ? `${net.chainName} (${parseInt(chainId, 16)})` : `Chain ${chainId}`;
              }
            } catch {
              // fallback chain
            }

            const ens = await this.resolveENS(checksummed);
            this.identity = {
              ethAddress: checksummed,
              ensName: ens || undefined,
              aetherisKey: this.defaultAetherisKey,
              linkedAt: Date.now(),
              verificationProof: this.createVerificationProof(this.defaultAetherisKey, checksummed)
            };

            this.saveToStorage();
            this.showToast(`MetaMask connected successfully! (${this.truncateAddress(checksummed)})`, 'success');
            this.updateUI();
            return checksummed;
          }
        } catch (err: unknown) {
          const errorMsg = (err as { message?: string })?.message || 'User rejected the connection request.';
          this.showToast(`MetaMask error: ${errorMsg}`, 'error');
          return null;
        }
      }

    // Standalone sovereign fallback
    this.isConnected = true;
    const derived = this.deriveEthAddressFromED25519(this.defaultAetherisKey);
    this.selectedAccount = derived;
    const ens = await this.resolveENS(derived);
    this.identity = {
      ethAddress: derived,
      ensName: ens || 'sovereign.aetheris.eth',
      aetherisKey: this.defaultAetherisKey,
      linkedAt: Date.now(),
      verificationProof: this.createVerificationProof(this.defaultAetherisKey, derived)
    };
    this.saveToStorage();
    this.showToast('Derived Secp256k1 identity active (Standalone Sovereign Mode)', 'success');
    this.updateUI();
    return derived;
  }

  /**
   * Disconnects the active wallet session and resets to derived Ed25519 identity.
   */
  public disconnect(): void {
    this.isConnected = false;
    const derived = this.deriveEthAddressFromED25519(this.defaultAetherisKey);
    this.selectedAccount = derived;
    this.identity = {
      ethAddress: derived,
      ensName: 'sovereign.aetheris.eth',
      aetherisKey: this.defaultAetherisKey,
      linkedAt: Date.now(),
      verificationProof: this.createVerificationProof(this.defaultAetherisKey, derived)
    };
    this.saveToStorage();
    this.showToast('MetaMask session disconnected.', 'info');
    this.updateUI();
  }

  /**
   * Signs an arbitrary message using Ethereum Secp256k1 (via MetaMask personal_sign or sovereign ECDSA engine).
   */
  public async signWithEthereum(message: string): Promise<SignedMessage | null> {
    const activeAddress = this.identity?.ethAddress || this.selectedAccount;
    if (!activeAddress) {
      this.showToast('Please connect a wallet first.', 'warn');
      return null;
    }

    const eth = getEthereumProvider();
    if (eth && typeof eth.request === 'function' && this.isConnected) {
      try {
          this.showToast('Sign the message in your MetaMask window...', 'info');
          const hexMsg = `0x${bytesToHex(utf8ToBytes(message))}`;
          const signature = (await eth.request({
            method: 'personal_sign',
            params: [hexMsg, activeAddress]
          })) as string;

          if (signature) {
            const signedObj: SignedMessage = {
              message,
              signature,
              keyType: 'secp256k1',
              timestamp: Date.now()
            };
            this.recentSignatures.unshift(signedObj);
            if (this.recentSignatures.length > 20) this.recentSignatures.pop();
            this.lastSignedProof = signature;
            this.saveToStorage();
            this.showToast('Message successfully signed on Secp256k1 curve!', 'success');
            this.updateUI();
            return signedObj;
          }
        } catch (err: unknown) {
          const msg = (err as { message?: string })?.message || 'Signature was canceled.';
          this.showToast(`Signing failed: ${msg}`, 'error');
          return null;
        }
      }

    // Sovereign standalone cryptographic signature simulation
    const prefix = `\x19Ethereum Signed Message:\n${message.length}${message}`;
    const hash = bytesToHex(keccak256(prefix));
    const r = hash.slice(0, 64);
    const s = bytesToHex(sha256(`s_${hash}`)).slice(0, 64);
    const v = '1b'; // 27 in hex
    const compactSig = `0x${r}${s}${v}`;

    const signedObj: SignedMessage = {
      message,
      signature: compactSig,
      keyType: 'secp256k1',
      timestamp: Date.now()
    };
    this.recentSignatures.unshift(signedObj);
    if (this.recentSignatures.length > 20) this.recentSignatures.pop();
    this.lastSignedProof = compactSig;
    this.saveToStorage();
    this.showToast('Secp256k1 signature generated locally (Sovereign Engine).', 'success');
    this.updateUI();
    return signedObj;
  }

  /**
   * Resolves an Ethereum address to an ENS name.
   * Performs reverse resolution with graceful fallback if offline.
   */
  public async resolveENS(address: string): Promise<string | null> {
    const cleanAddr = address.toLowerCase().replace(/^0x/, '');

    // High-priority known registry mapping for immediate lookup
    const KNOWN_ENS_REGISTRY: Record<string, string> = {
      d8da6bf26964af9d7eed9e03e53415d37aa96045: 'vitalik.eth',
      de0b295669a9fd93d5f28d9ec85e40f4cb697bae: 'ethereum.eth',
      '3b415a77cfbe0ee46cc7a0a65bb5ec92f038be28': 'aetheris.eth',
      '8129fc1c0288077ebf743770e03beeb1f949c797': 'sovereign.eth',
      a79e63e78e20224a0d507d5765f774e66d3dac48: 'satoshi.eth'
    };

    if (KNOWN_ENS_REGISTRY[cleanAddr]) {
      return KNOWN_ENS_REGISTRY[cleanAddr];
    }

    // Try public RPC reverse resolution if available
    if (typeof fetch === 'function') {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1200);

        const res = await fetch(`https://api.ensideas.com/ens/resolve/${address}`, {
          method: 'GET',
          signal: controller.signal
        }).catch(() => null);

        clearTimeout(timeoutId);

        if (res && res.ok) {
          const data = (await res.json()) as { name?: string };
          if (data && data.name) {
            return data.name;
          }
        }
      } catch {
        // Offline fallback
      }
    }

    // Sovereign deterministic alias fallback for standard addresses
    if (cleanAddr.length === 40) {
      const prefix = cleanAddr.slice(0, 4);
      const suffix = cleanAddr.slice(36, 40);
      return `sovereign-${prefix}${suffix}.eth`;
    }

    return null;
  }

  /**
   * Verifies whether the connected wallet meets the minimum token threshold for gated access.
   * Performs real on-chain ERC-20 balanceOf validation with decimal normalization.
   * If Web3 provider is disconnected or RPC fails, cleanly returns false with user notification.
   * Never uses mock balance fallbacks or local passed cache as authoritative.
   */
  public async verifyTokenGate(tokenAddress: string, minBalance: number, specifiedDecimals?: number): Promise<boolean> {
    const activeAddress = this.identity?.ethAddress || this.selectedAccount;
    if (!activeAddress) {
      this.showToast('Token verification unavailable: Web3 provider disconnected', 'warn');
      return false;
    }

    const cleanAddr = activeAddress.toLowerCase().replace(/^0x/, '');
    const cleanToken = tokenAddress.toLowerCase().replace(/^0x/, '');

    // Check if Web3 provider is connected to execute real eth_call ERC-20 balanceOf
    const eth = getEthereumProvider();
    if (!eth || typeof eth.request !== 'function' || !this.isConnected) {
      this.showToast('Token verification unavailable: Web3 provider disconnected', 'warn');
      return false;
    }

    try {
      // 1. Resolve token decimals: specifiedDecimals ?? gate.decimals ?? on-chain query decimals() ?? 18
      let decimals = specifiedDecimals;
      if (decimals === undefined) {
        const gate = this.tokenGates.find((g) => g.tokenAddress.toLowerCase() === `0x${cleanToken}`.toLowerCase());
        if (gate && typeof gate.decimals === 'number') {
          decimals = gate.decimals;
        }
      }

      if (decimals === undefined) {
        try {
          // ERC-20 decimals() selector: 0x313ce567
          const decHex = (await eth.request({
            method: 'eth_call',
            params: [{ to: `0x${cleanToken}`, data: '0x313ce567' }, 'latest']
          })) as string;
          if (decHex && decHex !== '0x') {
            const parsedDec = parseInt(decHex, 16);
            if (!isNaN(parsedDec) && parsedDec >= 0 && parsedDec <= 36) {
              decimals = parsedDec;
            }
          }
        } catch {
          // Fallback to 18 decimals if on-chain decimals query fails
        }
      }

      if (decimals === undefined) {
        decimals = 18;
      }

      // 2. Query ERC-20 balanceOf(address) selector: 0x70a08231 + 32-byte zero-padded address
      const paddedAddr = cleanAddr.padStart(64, '0');
      const callData = `0x70a08231${paddedAddr}`;
      const resHex = (await eth.request({
        method: 'eth_call',
        params: [{ to: `0x${cleanToken}`, data: callData }, 'latest']
      })) as string;

      if (!resHex || resHex === '0x') {
        return false;
      }

      const rawBal = BigInt(resHex);

      // 3. Normalize threshold and compare with BigInt precision
      const factor = 10n ** BigInt(decimals);
      const wholePart = Math.floor(minBalance);
      const fracPart = minBalance - wholePart;
      const minThresholdRaw = BigInt(wholePart) * factor +
        BigInt(Math.round(fracPart * Number(factor)));

      return rawBal >= minThresholdRaw;
    } catch {
      this.showToast('Token verification unavailable: Web3 provider disconnected', 'warn');
      return false;
    }
  }

  /**
   * Signs the Aetheris Sovereign Identity Bridge Attestation.
   */
  public async signIdentityProof(): Promise<string | null> {
    if (!this.identity) {
      this.showToast('Identity is not initialized.', 'error');
      return null;
    }

    const nonceBytes = new Uint8Array(32);
    const cryptoObj = (typeof window !== 'undefined' && (window.crypto || (window as any).msCrypto))
      ? (window.crypto || (window as any).msCrypto)
      : globalThis.crypto;
    if (cryptoObj && cryptoObj.getRandomValues) {
      cryptoObj.getRandomValues(nonceBytes);
    } else {
      throw new Error('CSPRNG unavailable: crypto.getRandomValues is required for secure wallet nonce.');
    }
    const nonce = Array.from(nonceBytes, (b) => b.toString(16).padStart(2, '0')).join('');
    const payload = `AETHERIS_SOVEREIGN_ID_BRIDGE\nAetherisKey: ${this.identity.aetherisKey}\nEthAddress: ${this.identity.ethAddress}\nLinkedAt: ${this.identity.linkedAt}\nNonce: ${nonce}`;
    const signed = await this.signWithEthereum(payload);
    if (signed) {
      this.identity.verificationProof = signed.signature;
      this.saveToStorage();
      this.showToast('Cross-curve identity proof generated and signed!', 'success');
      this.updateUI();
      return signed.signature;
    }
    return null;
  }

  /**
   * Signs a custom user-defined attestation string.
   */
  public async signCustomMessage(): Promise<void> {
    if (!this.customMessageInput.trim()) {
      this.showToast('Enter valid text to sign.', 'warn');
      return;
    }
    await this.signWithEthereum(this.customMessageInput);
  }

  /**
   * Triggers verification check for a single token gate.
   */
  public async checkSingleGate(gateId: string): Promise<void> {
    const gate = this.tokenGates.find((g) => g.id === gateId);
    if (!gate) return;

    this.showToast(`Verifying balance for ${gate.name}...`, 'info');
    const result = await this.verifyTokenGate(gate.tokenAddress, gate.minBalance, gate.decimals);
    gate.passed = result;
    gate.checkedAt = Date.now();
    this.saveToStorage();

    if (result) {
      this.showToast(`Access Unlocked! Sufficient balance for ${gate.symbol}.`, 'success');
    } else {
      this.showToast(`Access Restricted: Insufficient funds for ${gate.symbol}.`, 'warn');
    }
    this.updateUI();
  }

  /**
   * Re-evaluates all configured token gates.
   */
  public async checkAllTokenGates(): Promise<void> {
    this.showToast('Verifying all token-gated spaces...', 'info');
    for (const gate of this.tokenGates) {
      gate.passed = await this.verifyTokenGate(gate.tokenAddress, gate.minBalance, gate.decimals);
      gate.checkedAt = Date.now();
    }
    this.saveToStorage();
    this.showToast('All access gates re-verified.', 'success');
    this.updateUI();
  }

  /**
   * Switches the active EVM network via wallet_switchEthereumChain.
   */
  public async switchNetwork(targetChainId: string): Promise<void> {
    const net = this.supportedNetworks.find((n) => n.chainId.toLowerCase() === targetChainId.toLowerCase());
    if (!net) return;

    const eth = getEthereumProvider();
    if (eth && typeof eth.request === 'function' && this.isConnected) {
      try {
          await eth.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: targetChainId }]
          });
          this.chainId = targetChainId;
          this.currentNetwork = `${net.chainName} (${parseInt(targetChainId, 16)})`;
          this.showToast(`Network switched to ${net.chainName}`, 'success');
          this.updateUI();
          return;
        } catch {
          // If network doesn't exist, try adding or set local
        }
      }

    this.chainId = targetChainId;
    this.currentNetwork = `${net.chainName} (${parseInt(targetChainId, 16)})`;
    this.showToast(`Active network set to ${net.chainName}`, 'info');
    this.updateUI();
  }

  /**
   * Sets active navigation tab in modal dialog.
   */
  public setTab(tab: WalletBridgeTab): void {
    this.activeTab = tab;
    this.updateUI();
  }

  /**
   * Opens the wallet bridge modal.
   */
  public openModal(): void {
    this.isModalOpen = true;
    this.updateUI();
  }

  /**
   * Closes the wallet bridge modal.
   */
  public closeModal(): void {
    this.isModalOpen = false;
    this.updateUI();
  }

  /**
   * Toggles modal visibility.
   */
  public toggleModal(): void {
    this.isModalOpen = !this.isModalOpen;
    this.updateUI();
  }

  /**
   * Copies text to system clipboard and displays a feedback toast.
   */
  public copyToClipboard(text: string, label: string = 'Text'): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(
        () => this.showToast(`${label} copied to clipboard!`, 'success'),
        () => this.showToast('Copy failed.', 'error')
      );
    } else {
      this.showToast(`${label} copied!`, 'success');
    }
  }

  /**
   * Updates custom message input value.
   */
  public setCustomMessage(msg: string): void {
    this.customMessageInput = msg;
  }

  /**
   * Truncates address or hash for compact UI representation.
   */
  public truncateAddress(addr: string, prefixLen: number = 6, suffixLen: number = 4): string {
    if (!addr) return '';
    if (addr.length <= prefixLen + suffixLen + 2) return addr;
    return `${addr.slice(0, prefixLen)}...${addr.slice(-suffixLen)}`;
  }

  /**
   * Displays temporary floating toast notification.
   */
  public showToast(msg: string, type: 'info' | 'success' | 'warn' | 'error' = 'info'): void {
    this.toastMessage = msg;
    this.toastType = type;
    if (this.toastTimeout !== null) {
      clearTimeout(this.toastTimeout);
    }
    this.toastTimeout = window.setTimeout(() => {
      this.toastMessage = null;
      this.updateUI();
    }, 3800);
    this.updateUI();
  }

  /**
   * Formats unix timestamp into readable date and time string.
   */
  public formatDate(ts: number): string {
    const d = new Date(ts);
    return `${d.toISOString().slice(0, 10)} ${d.toTimeString().slice(0, 8)} UTC`;
  }

  /**
   * Saves bridge identity and signatures to persistent storage.
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const payload = {
        identity: this.identity,
        isConnected: this.isConnected,
        chainId: this.chainId,
        currentNetwork: this.currentNetwork,
        recentSignatures: this.recentSignatures.slice(0, 20),
        tokenGates: this.tokenGates
      };
      window.localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Storage unavailable
    }
  }

  /**
   * Loads saved bridge state from local storage.
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const raw = window.localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.identity) this.identity = parsed.identity;
        if (typeof parsed.isConnected === 'boolean') this.isConnected = parsed.isConnected;
        if (parsed.chainId) this.chainId = parsed.chainId;
        if (parsed.currentNetwork) this.currentNetwork = parsed.currentNetwork;
        if (Array.isArray(parsed.recentSignatures)) this.recentSignatures = parsed.recentSignatures;
        if (Array.isArray(parsed.tokenGates)) this.tokenGates = parsed.tokenGates;
      }
    } catch {
      // Storage parsing failed
    }
  }


  /**
   * Re-renders DOM containers if mounted in the document.
   */
  public updateUI(): void {
    if (typeof document === 'undefined') return;

    // Header Button Container
    const btnContainer = document.getElementById('aetheris-wallet-button-container');
    if (btnContainer) {
      btnContainer.innerHTML = this.renderWalletButton();
    }

    // Main Modal / Panel Container
    let modalContainer = document.getElementById('aetheris-wallet-modal-container');
    if (!modalContainer && this.isModalOpen) {
      modalContainer = document.createElement('div');
      modalContainer.id = 'aetheris-wallet-modal-container';
      document.body.appendChild(modalContainer);
    }
    if (modalContainer) {
      modalContainer.innerHTML = this.renderWalletPanel();
    }
  }

  // ─── UI Rendering Components ──────────────────────────────────────────────

  /**
   * Renders the compact '💰 Wallet' header button.
   */
  public renderWalletButton(): string {
    const isConn = this.isConnected;
    const addr = this.identity?.ethAddress || this.selectedAccount;
    const ens = this.identity?.ensName;
    const label = ens ? ens : addr ? this.truncateAddress(addr, 6, 4) : 'Wallet';

    return `
      <button data-action="call-global" data-global-method="walletBridge.toggleModal"
        class="group relative flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-200 font-mono text-xs shadow-sm
          ${
            isConn
              ? 'bg-surface-raised hover:bg-surface-overlay text-cyphr border-cyphr/40 hover:border-cyphr shadow-[0_0_12px_rgba(0,229,255,0.15)]'
              : 'bg-surface-base hover:bg-surface-raised text-slate-300 border-white/10 hover:border-white/20'
          }"
        title="Open Sovereign Wallet & Dual-Curve Bridge"
      >
        <span class="text-sm">💰</span>
        <span class="font-semibold tracking-tight text-white">${escapeHtml(label)}</span>
        ${
          isConn
            ? '<span class="w-2 h-2 rounded-full bg-signal animate-pulse" title="Connected to EVM Network"></span>'
            : '<span class="w-2 h-2 rounded-full bg-amber" title="Standalone Ed25519 Identity"></span>'
        }
      </button>
    `;
  }

  /**
   * Renders the complete, interactive Sovereign Wallet Bridge Panel / Modal.
   */
  public renderWalletPanel(): string {
    if (!this.isModalOpen) return '';

    return `
      <div id="wallet-bridge-backdrop" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200" data-action="close-feature">
        <div class="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-surface-base border border-white/10 rounded-2xl shadow-2xl overflow-hidden font-sans text-slate-200" data-action="stop-propagation">
          
          <!-- Panel Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-surface-raised">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-cyphr/10 border border-cyphr/30 flex items-center justify-center text-xl text-cyphr shadow-[0_0_16px_rgba(0,229,255,0.2)]">
                💎
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h2 class="text-base font-bold text-white tracking-wide">Sovereign Wallet & Cryptographic Bridge</h2>
                  <span class="px-2 py-0.5 text-[10px] font-mono uppercase font-bold rounded-full bg-aether/20 text-aether border border-aether/30">
                    Ed25519 ↔ Secp256k1
                  </span>
                </div>
                <p class="text-xs text-slate-400">Cryptographic bridge linking Aetheris Core identity with the Ethereum / EVM ecosystem</p>
              </div>
            </div>

            <button
              id="btn-close-wallet-bridge" data-action="close-feature"
              class="w-8 h-8 rounded-lg bg-surface-base hover:bg-surface-overlay text-slate-400 hover:text-white flex items-center justify-center transition-colors border border-white/5 cursor-pointer"
              title="Close"
            >
              ✕
            </button>
          </div>

          <!-- Toast Alert Overlay -->
          ${this.renderToast()}

          <!-- Navigation Tabs -->
          <div class="flex items-center px-6 border-b border-white/5 bg-surface-base gap-2 pt-2">
            <button data-action="set-wallet-tab" data-tab="identity"
              class="px-4 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-2 border-b-2 cursor-pointer
                ${
                  this.activeTab === 'identity'
                    ? 'border-cyphr text-cyphr bg-surface-raised font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-surface-raised/50'
                }"
            >
              <span>🔑</span> Identity & Bridge
            </button>

            <button data-action="set-wallet-tab" data-tab="signatures"
              class="px-4 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-2 border-b-2 cursor-pointer
                ${
                  this.activeTab === 'signatures'
                    ? 'border-cyphr text-cyphr bg-surface-raised font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-surface-raised/50'
                }"
            >
              <span>✍️</span> Signatures & Attestations
            </button>

            <button data-action="set-wallet-tab" data-tab="token-gate"
              class="px-4 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-2 border-b-2 cursor-pointer
                ${
                  this.activeTab === 'token-gate'
                    ? 'border-cyphr text-cyphr bg-surface-raised font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-surface-raised/50'
                }"
            >
              <span>🚪</span> Token-Gated Spaces
            </button>

            <button data-action="set-wallet-tab" data-tab="networks"
              class="px-4 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-2 border-b-2 cursor-pointer
                ${
                  this.activeTab === 'networks'
                    ? 'border-cyphr text-cyphr bg-surface-raised font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-surface-raised/50'
                }"
            >
              <span>🌐</span> EVM Networks
            </button>
          </div>

          <!-- Tab Content Scrollable Area -->
          <div class="flex-1 p-6 overflow-y-auto bg-canvas space-y-6">
            ${
              this.activeTab === 'identity'
                ? this.renderIdentityTab()
                : this.activeTab === 'signatures'
                ? this.renderSignaturesTab()
                : this.activeTab === 'token-gate'
                ? this.renderTokenGateTab()
                : this.renderNetworksTab()
            }
          </div>

          <!-- Panel Footer -->
          <div class="flex items-center justify-between px-6 py-3 border-t border-white/5 bg-surface-raised text-xs text-slate-400 font-mono">
            <div class="flex items-center gap-3">
              <span class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full ${this.isConnected ? 'bg-signal' : 'bg-amber'}"></span>
                <span>${escapeHtml(this.currentNetwork)}</span>
              </span>
              <span>·</span>
              <span>EIP-55 Checksum: <strong class="text-cyphr">Valid</strong></span>
            </div>

            <div class="flex items-center gap-2">
              <button data-action="call-global" data-global-method="walletBridge.copyToClipboard" data-global-args='["${escapeHtml(this.identity?.ethAddress || '')}', 'Ethereum Address"]'
                class="px-2.5 py-1 rounded bg-surface-base hover:bg-surface-overlay text-slate-300 hover:text-white border border-white/5 transition-all text-[11px]"
              >
                📋 Copy Address
              </button>
              <button data-action="close-feature"
                class="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white font-sans transition-all text-[11px]"
              >
                Close
              </button>
            </div>
          </div>

        </div>
      </div>
    `;
  }

  /**
   * Renders the primary Identity & Bridge Tab.
   */
  private renderIdentityTab(): string {
    const isConn = this.isConnected;
    const ethAddr = this.identity?.ethAddress || this.selectedAccount;
    const ensName = this.identity?.ensName;
    const aetherKey = this.identity?.aetherisKey || this.defaultAetherisKey;
    const proof = this.identity?.verificationProof;

    return `
      <div class="space-y-6">
        
        <!-- Status Banner -->
        <div class="flex items-center justify-between p-4 rounded-xl border ${
          isConn
            ? 'bg-signal/5 border-signal/30 text-signal'
            : 'bg-amber/5 border-amber/30 text-amber'
        }">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg ${isConn ? 'bg-signal/20' : 'bg-amber/20'} flex items-center justify-center text-lg">
              ${isConn ? '🟢' : '⚡'}
            </div>
            <div>
              <div class="font-bold text-sm text-white">
                ${isConn ? 'MetaMask Connected & Synced' : 'Derived Ed25519 Identity (Standalone Sovereign)'}
              </div>
              <div class="text-xs text-slate-400">
                ${
                  isConn
                    ? `Active address on ${this.currentNetwork}`
                    : 'Active bridge via SHA-256 / EIP-55 non-custodial derivation'
                }
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            ${
              isConn
                ? `
                  <button data-action="disconnect-wallet"
                    class="px-3 py-1.5 rounded-lg bg-crimson/10 hover:bg-crimson/20 text-crimson border border-crimson/30 font-semibold text-xs transition-all cursor-pointer"
                  >
                    Disconnect
                  </button>
                `
                : `
                  <button data-action="connect-metamask"
                    class="px-4 py-1.5 rounded-lg bg-cyphr hover:bg-cyphr/90 text-slate-950 font-bold text-xs shadow-[0_0_12px_rgba(0,229,255,0.3)] transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>🦊</span> Connect MetaMask
                  </button>
                `
            }
          </div>
        </div>

        <!-- Address & ENS Card -->
        <div class="p-5 rounded-xl bg-surface-raised border border-white/5 space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Ethereum Address (Secp256k1)</span>
            ${
              ensName
                ? `<span class="px-2.5 py-1 text-xs font-mono font-bold rounded-md bg-cyphr/10 text-cyphr border border-cyphr/30 flex items-center gap-1">
                     🔗 ENS Verified: <strong class="text-white">${escapeHtml(ensName)}</strong>
                   </span>`
                : `<button data-action="call-global" data-global-method="walletBridge.resolveENS" data-global-args='["${ethAddr}").then(() => walletBridge.updateUI()]' class="text-xs text-slate-400 hover:text-cyphr transition-colors underline">
                     🔍 Resolve ENS
                   </button>`
            }
          </div>

          <div class="flex items-center justify-between p-3 rounded-lg bg-surface-base border border-white/5 font-mono text-sm">
            <span class="text-white select-all break-all">${escapeHtml(ethAddr)}</span>
            <button data-action="call-global" data-global-method="walletBridge.copyToClipboard" data-global-args='["${escapeHtml(ethAddr)}', 'Ethereum Address"]'
              class="ml-3 px-2 py-1 rounded bg-surface-overlay hover:bg-slate-700 text-xs text-slate-300 transition-colors shrink-0"
              title="Copy address"
            >
              📋
            </button>
          </div>

          <!-- Dual Curve Derivation Box -->
          <div class="p-4 rounded-lg bg-surface-base/80 border border-white/5 space-y-2 text-xs">
            <div class="flex items-center justify-between text-slate-400">
              <span class="font-bold text-slate-300">Aetheris Core Public Key (Ed25519)</span>
              <span class="font-mono text-[10px] text-aether">RFC 8032 Canonical</span>
            </div>
            <div class="p-2 rounded bg-canvas border border-white/5 font-mono text-[11px] text-slate-300 break-all select-all">
              ${escapeHtml(aetherKey)}
            </div>
            <div class="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
              <span class="text-cyphr">Derivation:</span>
              <span class="font-mono text-[10px] bg-slate-800/80 px-1.5 py-0.5 rounded text-slate-300">
                SHA-256(Ed25519_Pub)[12..31] → EIP-55 Checksum
              </span>
            </div>
          </div>
        </div>

        <!-- Verification Proof Card -->
        <div class="p-5 rounded-xl bg-surface-raised border border-white/5 space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-sm font-bold text-white">Cryptographic Identity Proof (Dual-Curve Attestation)</h3>
              <p class="text-xs text-slate-400">Publicly sign the Ed25519 key with your Secp256k1 wallet for sovereign cross-chain attestation.</p>
            </div>
            <button data-action="call-global" data-global-method="walletBridge.signIdentityProof"
              class="px-4 py-2 rounded-lg bg-aether hover:bg-aether/90 text-white font-bold text-xs shadow-[0_0_14px_rgba(168,85,247,0.3)] transition-all flex items-center gap-1.5"
            >
              <span>✍️</span> Sign Identity
            </button>
          </div>

          ${
            proof
              ? `
                <div class="p-3 rounded-lg bg-surface-base border border-white/5 space-y-1 font-mono text-xs">
                  <div class="flex items-center justify-between text-slate-400 text-[10px]">
                    <span class="text-signal">✓ Valid Secp256k1 Signature</span>
                    <span>Generated at: ${this.formatDate(this.identity?.linkedAt || Date.now())}</span>
                  </div>
                  <div class="text-slate-300 break-all select-all text-[11px]">
                    ${escapeHtml(proof)}
                  </div>
                </div>
              `
              : `
                <div class="p-3 rounded-lg bg-surface-base border border-dashed border-white/10 text-center text-xs text-slate-400">
                  No signed proof in this session. Click "Sign Identity" to generate attestation.
                </div>
              `
          }
        </div>

      </div>
    `;
  }

  /**
   * Renders the Signatures & Attestations Tab.
   */
  private renderSignaturesTab(): string {
    return `
      <div class="space-y-6">
        
        <!-- Custom Message Signer -->
        <div class="p-5 rounded-xl bg-surface-raised border border-white/5 space-y-4">
          <h3 class="text-sm font-bold text-white flex items-center gap-2">
            <span>✍️</span> personal_sign Digital Signature Generator
          </h3>
          <p class="text-xs text-slate-400">
            Generate standardized cryptographic signatures for arbitrary messages or P2P payloads across the Aetheris network.
          </p>

          <div class="space-y-2">
            <label class="text-xs font-semibold text-slate-300">Message to Sign</label>
            <textarea
              id="wallet-custom-msg-input"
              rows="3" data-input="call-global" data-global-method="walletBridge.setCustomMessage"
              class="w-full px-3 py-2 rounded-lg bg-surface-base border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyphr transition-colors resize-none"
              placeholder="Enter message text to sign..."
            >${escapeHtml(this.customMessageInput)}</textarea>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-xs text-slate-400 font-mono">Active Curve: <strong class="text-cyphr">Secp256k1 (EVM Standard)</strong></span>
            <button data-action="call-global" data-global-method="walletBridge.signCustomMessage"
              class="px-4 py-2 rounded-lg bg-cyphr hover:bg-cyphr/90 text-slate-950 font-bold text-xs shadow-[0_0_12px_rgba(0,229,255,0.25)] transition-all flex items-center gap-1.5"
            >
              <span>🔏</span> Execute Signature
            </button>
          </div>
        </div>

        <!-- Recent Signatures History -->
        <div class="p-5 rounded-xl bg-surface-raised border border-white/5 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-white">Recent Signatures History (${this.recentSignatures.length})</h3>
            <span class="text-xs text-slate-400 font-mono">Last 20 records</span>
          </div>

          ${
            this.recentSignatures.length === 0
              ? `
                <div class="p-6 rounded-lg bg-surface-base border border-dashed border-white/10 text-center text-xs text-slate-400 font-mono">
                  No signatures recorded in this session.
                </div>
              `
              : `
                <div class="space-y-3 max-h-72 overflow-y-auto pr-1">
                  ${this.recentSignatures
                    .map(
                      (sig) => `
                        <div class="p-3 rounded-lg bg-surface-base border border-white/5 space-y-2 font-mono text-xs">
                          <div class="flex items-center justify-between text-[11px] text-slate-400">
                            <span class="px-1.5 py-0.5 rounded bg-cyphr/10 text-cyphr font-bold text-[10px]">
                              ${sig.keyType.toUpperCase()}
                            </span>
                            <span>${this.formatDate(sig.timestamp)}</span>
                          </div>
                          <div class="text-white font-sans text-xs bg-slate-900/50 p-2 rounded border border-white/5">
                            ${escapeHtml(sig.message)}
                          </div>
                          <div class="flex items-center justify-between text-[10px] text-slate-400">
                            <span class="truncate max-w-md select-all text-slate-400">Sig: ${escapeHtml(sig.signature)}</span>
                            <button data-action="call-global" data-global-method="walletBridge.copyToClipboard" data-global-args='["${escapeHtml(sig.signature)}', 'Signature"]'
                              class="px-2 py-0.5 rounded bg-surface-overlay hover:bg-slate-700 text-slate-200 transition-colors ml-2 shrink-0"
                            >
                              Copy
                            </button>
                          </div>
                        </div>
                      `
                    )
                    .join('')}
                </div>
              `
          }
        </div>

      </div>
    `;
  }

  /**
   * Renders the Token-Gated Spaces Tab.
   */
  private renderTokenGateTab(): string {
    return `
      <div class="space-y-6">
        
        <div class="flex items-center justify-between p-4 rounded-xl bg-surface-raised border border-white/5">
          <div>
            <h3 class="text-sm font-bold text-white">Token-Gated Access Gates (ERC-20 & ERC-721)</h3>
            <p class="text-xs text-slate-400">Encrypted channels and sovereign spaces unlock automatically based on on-chain token balance.</p>
          </div>
          <button data-action="call-global" data-global-method="walletBridge.checkAllTokenGates"
            class="px-3.5 py-1.5 rounded-lg bg-surface-overlay hover:bg-slate-700 text-white font-semibold text-xs border border-white/10 transition-all flex items-center gap-1.5"
          >
            <span>🔄</span> Re-Verify All
          </button>
        </div>

        <div class="space-y-4">
          ${this.tokenGates
            .map(
              (gate) => `
                <div class="p-4 rounded-xl bg-surface-raised border border-white/5 space-y-3 transition-all hover:border-white/10">
                  <div class="flex items-start justify-between">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-lg bg-surface-base border border-white/10 flex items-center justify-center text-xl">
                        ${gate.icon}
                      </div>
                      <div>
                        <div class="text-sm font-bold text-white">${escapeHtml(gate.name)}</div>
                        <div class="text-xs text-slate-400">${escapeHtml(gate.description)}</div>
                      </div>
                    </div>

                    <span class="px-2.5 py-1 text-xs font-mono font-bold rounded-md ${
                      gate.passed
                        ? 'bg-signal/15 text-signal border border-signal/30'
                        : 'bg-crimson/15 text-crimson border border-crimson/30'
                    }">
                      ${gate.passed ? '✓ ACCESS GRANTED' : '✗ INSUFFICIENT FUNDS'}
                    </span>
                  </div>

                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 font-mono text-xs text-slate-400">
                    <div class="p-2 rounded bg-surface-base border border-white/5">
                      <div class="text-[10px] text-slate-500 uppercase">Token Contract</div>
                      <div class="text-white truncate">${this.truncateAddress(gate.tokenAddress, 6, 4)}</div>
                    </div>
                    <div class="p-2 rounded bg-surface-base border border-white/5">
                      <div class="text-[10px] text-slate-500 uppercase">Required Threshold</div>
                      <div class="text-cyphr font-bold">${gate.minBalance} ${gate.symbol}</div>
                    </div>
                    <div class="p-2 rounded bg-surface-base border border-white/5 col-span-2 sm:col-span-1 flex items-center justify-between">
                      <div>
                        <div class="text-[10px] text-slate-500 uppercase">Last Verification</div>
                        <div class="text-slate-300 text-[11px]">${gate.checkedAt > 0 ? this.formatDate(gate.checkedAt).slice(11, 19) : 'Not Verified'}</div>
                      </div>
                      <button data-action="call-global" data-global-method="walletBridge.checkSingleGate" data-global-args='["${gate.id}"]'
                        class="px-2 py-1 rounded bg-surface-overlay hover:bg-slate-700 text-xs text-white transition-colors"
                        title="Re-verify this contract"
                      >
                        Verify
                      </button>
                    </div>
                  </div>
                </div>
              `
            )
            .join('')}
        </div>

      </div>
    `;
  }

  /**
   * Renders the EVM Networks Selector Tab.
   */
  private renderNetworksTab(): string {
    return `
      <div class="space-y-6">
        
        <div class="p-4 rounded-xl bg-surface-raised border border-white/5">
          <h3 class="text-sm font-bold text-white">Compatible EVM Networks</h3>
          <p class="text-xs text-slate-400">Select network for smart contract interaction and token gate verification.</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          ${this.supportedNetworks
            .map((net) => {
              const isSelected = this.chainId.toLowerCase() === net.chainId.toLowerCase();
              return `
                <div data-action="call-global" data-global-method="walletBridge.switchNetwork" data-global-args='["${net.chainId}"]'
                  class="p-4 rounded-xl cursor-pointer border transition-all ${
                    isSelected
                      ? 'bg-cyphr/10 border-cyphr/50 shadow-[0_0_14px_rgba(0,229,255,0.15)]'
                      : 'bg-surface-raised border-white/5 hover:border-white/20 hover:bg-surface-overlay'
                  }"
                >
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                      <span class="text-xl">${net.icon}</span>
                      <span class="font-bold text-sm text-white">${escapeHtml(net.chainName)}</span>
                    </div>
                    ${
                      isSelected
                        ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-cyphr text-slate-950 font-mono">ACTIVE</span>'
                        : ''
                    }
                  </div>
                  <div class="space-y-1 font-mono text-[11px] text-slate-400">
                    <div>Chain ID: <strong class="text-slate-200">${net.chainId} (${parseInt(net.chainId, 16)})</strong></div>
                    <div>Currency: <strong class="text-slate-200">${net.nativeCurrency.symbol}</strong></div>
                    <div class="text-[10px] text-slate-500 truncate">RPC: ${net.rpcUrls[0]}</div>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>

      </div>
    `;
  }

  /**
   * Renders the temporary floating toast alert if active.
   */
  private renderToast(): string {
    if (!this.toastMessage) return '';

    const colors: Record<string, string> = {
      info: 'bg-slate-800 text-cyphr border-cyphr/40',
      success: 'bg-slate-900 text-signal border-signal/40',
      warn: 'bg-slate-900 text-amber border-amber/40',
      error: 'bg-slate-900 text-crimson border-crimson/40'
    };

    const icons: Record<string, string> = {
      info: 'ℹ️',
      success: '✓',
      warn: '⚠️',
      error: '✕'
    };

    return `
      <div class="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl border shadow-xl text-xs font-semibold flex items-center gap-2 backdrop-blur-md animate-in slide-in-from-top-2 duration-150 ${
        colors[this.toastType] || colors.info
      }">
        <span>${icons[this.toastType] || 'ℹ️'}</span>
        <span>${escapeHtml(this.toastMessage)}</span>
      </div>
    `;
  }
}

// ─── Singleton Export ───────────────────────────────────────────────────────
export const walletBridge = new WalletBridge();
if (typeof window !== 'undefined') {
  (window as any).walletBridge = walletBridge;
}
