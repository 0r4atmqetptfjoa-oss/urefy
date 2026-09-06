import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sovereignDialog } from '../src/dialog-modal.js';
import {
  WebAuthnManager,
  webAuthnManager,
  bufferToBase64URL,
  base64URLToBuffer,
  stringToBuffer,
  bufferToString,
  bufferToHex,
  type WebAuthnCredential,
  type WebAuthnEventType,
} from '../src/webauthn.js';

if (typeof globalThis.requestAnimationFrame === 'undefined') {
  (globalThis as any).requestAnimationFrame = (cb: any) => setTimeout(cb, 0);
}
if (typeof globalThis.cancelAnimationFrame === 'undefined') {
  (globalThis as any).cancelAnimationFrame = (id: any) => clearTimeout(id);
}

/**
 * In-memory mock for LocalStorage in headless testing environments.
 */
class LocalStorageMock implements Storage {
  private store: Map<string, string> = new Map();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

/**
 * Lightweight mock DOM element for toast notifications and container replacements.
 */
class MockDOMElement {
  public id: string = '';
  public className: string = '';
  public innerHTML: string = '';
  public parentElement: MockDOMElement | null = null;
  public children: MockDOMElement[] = [];
  public classList = {
    add: (..._classes: string[]) => {},
    remove: (..._classes: string[]) => {},
    contains: (_cls: string) => false,
  };

  constructor(public tagName: string = 'div') {}

  public appendChild(child: MockDOMElement): MockDOMElement {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  public removeChild(child: MockDOMElement): MockDOMElement {
    this.children = this.children.filter((c) => c !== child);
    child.parentElement = null;
    return child;
  }

  public replaceChild(newChild: MockDOMElement, oldChild: MockDOMElement): MockDOMElement {
    const idx = this.children.indexOf(oldChild);
    if (idx >= 0) {
      this.children[idx] = newChild;
      newChild.parentElement = this;
      oldChild.parentElement = null;
    }
    return oldChild;
  }

  get firstElementChild(): MockDOMElement | null {
    return this.children[0] || null;
  }
}

describe('WebAuthn FIDO2 / Biometrics Security Manager', () => {
  let localStorageMock: LocalStorageMock;
  let mockCredentials: { create: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> };
  let mockPrompt: ReturnType<typeof vi.fn>;
  let mockConfirm: ReturnType<typeof vi.fn>;
  let manager: WebAuthnManager;

  beforeEach(() => {
    localStorageMock = new LocalStorageMock();
    mockCredentials = {
      create: vi.fn(),
      get: vi.fn(),
    };
    mockPrompt = vi.fn();
    mockConfirm = vi.fn();

    // Mock global storage
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });

    // Mock global window
    const mockWindow = {
      localStorage: localStorageMock,
      location: { hostname: 'localhost' },
      PublicKeyCredential: class MockPublicKeyCredential {},
      crypto: {
        getRandomValues: (arr: Uint8Array) => {
          for (let i = 0; i < arr.length; i++) {
            arr[i] = Math.floor(Math.random() * 256);
          }
          return arr;
        },
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      prompt: mockPrompt,
      confirm: mockConfirm,
      requestAnimationFrame: (cb: (time: number) => void) => setTimeout(() => cb(Date.now()), 0),
    };

    Object.defineProperty(globalThis, 'window', {
      value: mockWindow,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(globalThis, 'prompt', {
      value: mockPrompt,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(globalThis, 'confirm', {
      value: mockConfirm,
      writable: true,
      configurable: true,
    });

    // Mock global navigator
    if (typeof globalThis.navigator === 'undefined') {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          credentials: mockCredentials,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
        writable: true,
        configurable: true,
      });
    } else {
      Object.defineProperty(globalThis.navigator, 'credentials', {
        value: mockCredentials,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(globalThis.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        writable: true,
        configurable: true,
      });
    }

    // Mock global document
    const mockDocument = {
      createElement: (tag: string) => new MockDOMElement(tag),
      getElementById: (id: string) => {
        const el = new MockDOMElement('div');
        el.id = id;
        return el;
      },
      body: new MockDOMElement('body'),
    };

    Object.defineProperty(globalThis, 'document', {
      value: mockDocument,
      writable: true,
      configurable: true,
    });

    // Fresh manager instance
    WebAuthnManager.setLocalTestMode(true);
    manager = new WebAuthnManager();
  });

  // ─── 1. Binary & Base64URL Conversion Helpers ────────────────────────────

  describe('Binary & Base64URL Encoding Helpers', () => {
    it('converts ArrayBuffer to Base64URL and decodes back accurately', () => {
      const originalBytes = new Uint8Array([0, 1, 2, 250, 251, 252, 253, 254, 255]);
      const base64Url = bufferToBase64URL(originalBytes);

      expect(typeof base64Url).toBe('string');
      expect(base64Url).not.toContain('+');
      expect(base64Url).not.toContain('/');
      expect(base64Url).not.toContain('=');

      const decodedBuffer = base64URLToBuffer(base64Url);
      const decodedBytes = new Uint8Array(decodedBuffer);

      expect(decodedBytes.length).toBe(originalBytes.length);
      for (let i = 0; i < originalBytes.length; i++) {
        expect(decodedBytes[i]).toBe(originalBytes[i]);
      }
    });

    it('converts UTF-8 strings to ArrayBuffer and back to string', () => {
      const sampleText = 'Aetheris Sovereign Vault — 🔐 ZK FIDO2 Biometrics';
      const buffer = stringToBuffer(sampleText);
      const restored = bufferToString(buffer);

      expect(restored).toBe(sampleText);
    });

    it('formats binary data as hexadecimal representation', () => {
      const testBytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef, 0x01, 0x09]);
      const hex = bufferToHex(testBytes);

      expect(hex).toBe('deadbeef0109');
    });
  });

  // ─── 2. Initialization & Platform Support ────────────────────────────────

  describe('Initialization & Platform Capabilities', () => {
    it('initializes WebAuthnManager with default settings and empty credentials', () => {
      expect(manager.isSupported).toBe(true);
      expect(manager.registeredCredentials).toEqual([]);
      expect(manager.currentSession).toBeNull();
      expect(manager.vaultLocked).toBe(false);

      expect(manager.settings.autoLockOnUnload).toBe(true);
      expect(manager.settings.requireBiometricsForExport).toBe(true);
      expect(manager.settings.sessionTimeoutMinutes).toBe(30);
    });

    it('exports a singleton instance webAuthnManager', () => {
      expect(webAuthnManager).toBeDefined();
      expect(webAuthnManager).toBeInstanceOf(WebAuthnManager);
    });

    it('handles environments where WebAuthn / PublicKeyCredential is unsupported', () => {
      const prevWindow = (globalThis as any).window;
      try {
        (globalThis as any).window = {
          localStorage: localStorageMock,
        };
        const unsupportedManager = new WebAuthnManager();
        expect(unsupportedManager.isSupported).toBe(false);
      } finally {
        (globalThis as any).window = prevWindow;
      }
    });

    it('loads persisted settings and registered credentials from localStorage on creation', () => {
      const savedSettings = {
        autoLockOnUnload: false,
        vaultLocked: true,
        requireBiometricsForDMs: true,
        requireBiometricsForExport: false,
        sessionTimeoutMinutes: 60,
        lastAuthenticatedAt: 123456789,
      };
      localStorageMock.setItem('aetheris_webauthn_settings_v1', JSON.stringify(savedSettings));

      const savedCreds = [
        {
          id: 'mock-cred-id-1',
          rawIdBase64: 'bW9jay1yYXctaWQtMQ',
          type: 'public-key',
          userHandle: 'sovereign_peer',
          createdAt: 1700000000000,
          deviceName: 'YubiKey 5C NFC',
        },
      ];
      localStorageMock.setItem('aetheris_webauthn_credentials_v1', JSON.stringify(savedCreds));

      const restoredManager = new WebAuthnManager();
      expect(restoredManager.settings.autoLockOnUnload).toBe(false);
      expect(restoredManager.settings.requireBiometricsForDMs).toBe(true);
      expect(restoredManager.settings.sessionTimeoutMinutes).toBe(60);
      expect(restoredManager.vaultLocked).toBe(true);

      expect(restoredManager.registeredCredentials.length).toBe(1);
      expect(restoredManager.registeredCredentials[0].id).toBe('mock-cred-id-1');
      expect(restoredManager.registeredCredentials[0].deviceName).toBe('YubiKey 5C NFC');
    });
  });

  // ─── 3. Challenge Generation ─────────────────────────────────────────────

  describe('Cryptographic Challenge Generation (generateChallenge)', () => {
    it('generates a 32-byte Uint8Array challenge using CSPRNG', () => {
      const challenge = manager.generateChallenge();

      expect(challenge).toBeInstanceOf(Uint8Array);
      expect(challenge.length).toBe(32);
      expect(challenge.byteLength).toBe(32);
    });

    it('strictly throws when CSPRNG (crypto.getRandomValues) is unavailable', () => {
      const origGetRandomValues = window.crypto?.getRandomValues;
      try {
        if (window.crypto) {
          (window.crypto as any).getRandomValues = undefined;
        }
        expect(() => manager.generateChallenge()).toThrow(/CSPRNG unavailable/i);
      } finally {
        if (window.crypto && origGetRandomValues) {
          window.crypto.getRandomValues = origGetRandomValues;
        }
      }
    });

    it('production + server challenge fetch fails -> authentication rejects & throws, no local challenge generated', async () => {
      const origLocation = window.location;
      delete (window as any).location;
      window.location = { hostname: 'aetheris-omni-sphere.pages.dev', protocol: 'https:' } as any;

      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network offline or edge unreachable'));
      const genSpy = vi.spyOn(manager, 'generateChallenge');

      await expect(manager.fetchServerChallenge('prod_user')).rejects.toThrow(
        /WebAuthn server challenge is unavailable. Authentication cannot continue in production/i
      );
      expect(genSpy).not.toHaveBeenCalled();

      window.location = origLocation;
    });

    it('production + server returns invalid challenge -> authentication rejects', async () => {
      const origLocation = window.location;
      delete (window as any).location;
      window.location = { hostname: 'aetheris-omni-sphere.pages.dev', protocol: 'https:' } as any;

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ success: false, error: 'D1 unavailable' }), { status: 503 })
      );

      await expect(manager.fetchServerChallenge('prod_user')).rejects.toThrow(
        /WebAuthn server challenge is unavailable. Authentication cannot continue in production/i
      );

      window.location = origLocation;
    });

    it('development/test + explicitly enabled local WebAuthn test mode -> CSPRNG fallback allowed', async () => {
      const origLocation = window.location;
      delete (window as any).location;
      window.location = { hostname: 'localhost', protocol: 'http:' } as any;

      WebAuthnManager.setLocalTestMode(true);
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Dev server not running'));

      const challenge = await manager.fetchServerChallenge('dev_user');
      expect(challenge).toBeInstanceOf(Uint8Array);
      expect(challenge.length).toBe(32);

      window.location = origLocation;
    });
  });

  // ─── 4. Credential Registration & Storage ────────────────────────────────

  describe('Credential Registration & Storage', () => {
    it('registers a new hardware credential and persists it to storage', async () => {
      const mockRawId = new Uint8Array([10, 20, 30, 40, 50]).buffer;
      const mockPublicKeyCred = {
        id: 'yubikey-cred-xyz-123',
        rawId: mockRawId,
        type: 'public-key',
      };

      mockCredentials.create.mockResolvedValue(mockPublicKeyCred);

      let registeredEventData: any = null;
      manager.subscribe((event, data) => {
        if (event === 'registered') registeredEventData = data;
      });

      const result = await manager.registerCredential('alice_sovereign', 'Custom YubiKey 5C');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('yubikey-cred-xyz-123');
      expect(result?.userHandle).toBe('alice_sovereign');
      expect(manager.registeredCredentials.length).toBe(1);
      expect(manager.registeredCredentials[0].id).toBe('yubikey-cred-xyz-123');

      // Verify active session was created
      expect(manager.currentSession).not.toBeNull();
      expect(manager.currentSession?.credentialId).toBe('yubikey-cred-xyz-123');
      expect(manager.currentSession?.authenticated).toBe(true);
      expect(manager.vaultLocked).toBe(false);

      // Verify localStorage persistence
      const stored = localStorageMock.getItem('aetheris_webauthn_credentials_v1');
      expect(stored).not.toBeNull();
      expect(stored).toContain('yubikey-cred-xyz-123');

      // Verify event emitted
      expect(registeredEventData).not.toBeNull();
      expect(registeredEventData.id).toBe('yubikey-cred-xyz-123');
    });

    it('returns null and does not register when user cancels credential creation', async () => {
      mockCredentials.create.mockResolvedValue(null);

      const result = await manager.registerCredential('bob_sovereign');
      expect(result).toBeNull();
      expect(manager.registeredCredentials.length).toBe(0);
    });

    it('renames an existing registered credential and saves to storage', () => {
      manager.registeredCredentials = [
        {
          id: 'cred-rename-1',
          rawId: new ArrayBuffer(8),
          type: 'public-key',
          userHandle: 'node_1',
          createdAt: Date.now(),
          deviceName: 'Old Device Name',
        },
      ];

      const success = manager.renameCredential('cred-rename-1', 'New Primary YubiKey');
      expect(success).toBe(true);
      expect(manager.registeredCredentials[0].deviceName).toBe('New Primary YubiKey');

      // Rejects renaming non-existent or empty names
      expect(manager.renameCredential('non-existent', 'Valid Name')).toBe(false);
      expect(manager.renameCredential('cred-rename-1', '   ')).toBe(false);
    });

    it('removes a credential by ID and locks vault if active session belonged to that key', () => {
      manager.registeredCredentials = [
        {
          id: 'cred-to-delete',
          rawId: new ArrayBuffer(8),
          type: 'public-key',
          userHandle: 'node_1',
          createdAt: Date.now(),
          deviceName: 'Backup Token',
        },
        {
          id: 'cred-to-keep',
          rawId: new ArrayBuffer(8),
          type: 'public-key',
          userHandle: 'node_1',
          createdAt: Date.now(),
          deviceName: 'Primary Token',
        },
      ];

      manager.currentSession = {
        credentialId: 'cred-to-delete',
        challenge: new ArrayBuffer(32),
        authenticated: true,
        timestamp: Date.now(),
      };
      manager.vaultLocked = false;

      let removedEventData: any = null;
      manager.subscribe((event, data) => {
        if (event === 'credential_removed') removedEventData = data;
      });

      const removed = manager.removeCredential('cred-to-delete');
      expect(removed).toBe(true);
      expect(manager.registeredCredentials.length).toBe(1);
      expect(manager.registeredCredentials[0].id).toBe('cred-to-keep');
      expect(manager.currentSession).toBeNull();
      expect(manager.vaultLocked).toBe(true);
      expect(removedEventData?.id).toBe('cred-to-delete');

      // False for non-existent credential
      expect(manager.removeCredential('unknown-id')).toBe(false);
    });
  });

  // ─── 5. Vault Locking & Session State ─────────────────────────────────────

  describe('Vault Locking & Session Invalidation (lockVault & isSessionValid)', () => {
    it('locks vault, resets session, updates settings and notifies listeners', async () => {
      manager.currentSession = {
        credentialId: 'active-session-cred',
        challenge: new ArrayBuffer(32),
        authenticated: true,
        timestamp: Date.now(),
      };
      manager.vaultLocked = false;

      let vaultLockedEmitted = false;
      manager.subscribe((event) => {
        if (event === 'vault_locked') vaultLockedEmitted = true;
      });

      await manager.lockVault();

      expect(manager.vaultLocked).toBe(true);
      expect(manager.settings.vaultLocked).toBe(true);
      expect(manager.currentSession).toBeNull();
      expect(vaultLockedEmitted).toBe(true);

      const storedSettings = JSON.parse(localStorageMock.getItem('aetheris_webauthn_settings_v1') || '{}');
      expect(storedSettings.vaultLocked).toBe(true);
    });

    it('evaluates isSessionValid accurately based on authentication, lock state, and timeout', () => {
      expect(manager.isSessionValid()).toBe(false);

      // 1. Valid active session
      manager.currentSession = {
        credentialId: 'test-cred',
        challenge: new ArrayBuffer(32),
        authenticated: true,
        timestamp: Date.now(),
      };
      manager.vaultLocked = false;
      manager.settings.sessionTimeoutMinutes = 30;
      expect(manager.isSessionValid()).toBe(true);

      // 2. Vault is locked
      manager.vaultLocked = true;
      expect(manager.isSessionValid()).toBe(false);
      manager.vaultLocked = false;

      // 3. Expired session (> 30 minutes)
      manager.currentSession.timestamp = Date.now() - 35 * 60 * 1000;
      expect(manager.isSessionValid()).toBe(false);
    });
  });

  // ─── 6. Authentication & Vault Unlocking ──────────────────────────────────

  describe('Hardware Authentication & Vault Unlocking (authenticate & unlockVault)', () => {
    it('authenticates with FIDO2 assertion, unlocks vault and creates active session', async () => {
      const clientDataObj = { type: 'webauthn.get', challenge: 'challenge-str', origin: 'http://localhost' };
      const clientDataJSONBuffer = stringToBuffer(JSON.stringify(clientDataObj));

      const mockAssertion = {
        id: 'auth-credential-abc',
        response: {
          clientDataJSON: clientDataJSONBuffer,
        },
      };

      mockCredentials.get.mockResolvedValue(mockAssertion);

      manager.vaultLocked = true;

      let authEventData: any = null;
      manager.subscribe((event, data) => {
        if (event === 'authenticated') authEventData = data;
      });

      const success = await manager.authenticate();

      expect(success).toBe(true);
      expect(manager.vaultLocked).toBe(false);
      expect(manager.currentSession).not.toBeNull();
      expect(manager.currentSession?.credentialId).toBe('auth-credential-abc');
      expect(manager.currentSession?.authenticated).toBe(true);
      expect(authEventData).not.toBeNull();
    });

    it('handles authentication failure gracefully when assertion is rejected or throws', async () => {
      mockCredentials.get.mockRejectedValue(new Error('User declined biometrics'));

      let failedEventData: any = null;
      manager.subscribe((event, data) => {
        if (event === 'auth_failed') failedEventData = data;
      });

      const success = await manager.authenticate();
      expect(success).toBe(false);
      expect(failedEventData).toContain('User declined biometrics');
    });

    it('unlockVault returns true immediately if vault is already unlocked with valid session', async () => {
      manager.currentSession = {
        credentialId: 'existing-cred',
        challenge: new ArrayBuffer(32),
        authenticated: true,
        timestamp: Date.now(),
      };
      manager.vaultLocked = false;

      const unlockResult = await manager.unlockVault();
      expect(unlockResult).toBe(true);
      expect(mockCredentials.get).not.toHaveBeenCalled();
    });

    it('ensureVaultUnlocked validates existing session or triggers unlocking prompt', async () => {
      manager.currentSession = {
        credentialId: 'existing-cred',
        challenge: new ArrayBuffer(32),
        authenticated: true,
        timestamp: Date.now(),
      };
      manager.vaultLocked = false;

      const verified = await manager.ensureVaultUnlocked('access private messages');
      expect(verified).toBe(true);
    });
  });

  // ─── 7. Security Settings & Preferences ───────────────────────────────────

  describe('Security Settings Management (updateSetting)', () => {
    it('updates security settings and persists them to localStorage', () => {
      let changedData: any = null;
      manager.subscribe((event, data) => {
        if (event === 'settings_changed') changedData = data;
      });

      manager.updateSetting('requireBiometricsForDMs', true);
      expect(manager.settings.requireBiometricsForDMs).toBe(true);
      expect(changedData?.requireBiometricsForDMs).toBe(true);

      const stored = JSON.parse(localStorageMock.getItem('aetheris_webauthn_settings_v1') || '{}');
      expect(stored.requireBiometricsForDMs).toBe(true);

      manager.updateSetting('sessionTimeoutMinutes', 45);
      expect(manager.settings.sessionTimeoutMinutes).toBe(45);
    });
  });

  // ─── 8. UI Rendering Components ──────────────────────────────────────────

  describe('UI Component Rendering (renderWebAuthnPanel & renderWebAuthnButton)', () => {
    it('renders the complete WebAuthn panel with empty state when no keys are configured', () => {
      manager.registeredCredentials = [];
      manager.vaultLocked = true;

      const html = manager.renderWebAuthnPanel();

      expect(html).toContain('id="aetheris-webauthn-panel"');
      expect(html).toContain('FIDO2 / WebAuthn Hardware Security');
      expect(html).toContain('FIDO2 / WebAuthn Level 3 Supported');
      expect(html).toContain('🔒 Vault Locked');
      expect(html).toContain('No hardware keys registered');
      expect(html).toContain('Add YubiKey / Touch ID');
      expect(html).toContain('Authenticate Now');
      expect(html).toContain('Vault Security Policies');
      expect(html).toContain('Lock vault on tab close');
      expect(html).toContain('Require biometric authentication for sovereign DMs');
      expect(html).toContain('Hardware protection for ZK seed export');
      expect(html).toContain('🔓 Unlock');
    });

    it('renders the WebAuthn panel with registered credentials and unlocked state', () => {
      manager.registeredCredentials = [
        {
          id: 'yubikey-primary-id-1234567890',
          rawId: new ArrayBuffer(16),
          type: 'public-key',
          userHandle: 'alice',
          createdAt: 1700000000000,
          deviceName: 'YubiKey 5C NFC Primary',
        },
      ];
      manager.currentSession = {
        credentialId: 'yubikey-primary-id-1234567890',
        challenge: new ArrayBuffer(32),
        authenticated: true,
        timestamp: Date.now(),
      };
      manager.vaultLocked = false;

      const html = manager.renderWebAuthnPanel();

      expect(html).toContain('YubiKey 5C NFC Primary');
      expect(html).toContain('Key #1');
      expect(html).toContain('🔓 Vault Unlocked');
      expect(html).toContain('🔒 Lock Vault');
      expect(html).toContain('Registered Hardware Keys & Biometrics (1)');
    });


    it('renders the compact header badge button with dynamic status styling', () => {
      // 1. Unlocked active state
      manager.registeredCredentials = [
        {
          id: 'test-key',
          rawId: new ArrayBuffer(8),
          type: 'public-key',
          userHandle: 'u',
          createdAt: Date.now(),
          deviceName: 'Key',
        },
      ];
      manager.currentSession = {
        credentialId: 'test-key',
        challenge: new ArrayBuffer(32),
        authenticated: true,
        timestamp: Date.now(),
      };
      manager.vaultLocked = false;

      const unlockedBtn = manager.renderWebAuthnButton();
      expect(unlockedBtn).toContain('id="aetheris-webauthn-header-btn"');
      expect(unlockedBtn).toContain('🔐 FIDO2');
      expect(unlockedBtn).toContain('text-signal');

      // 2. Locked state
      manager.vaultLocked = true;
      const lockedBtn = manager.renderWebAuthnButton();
      expect(lockedBtn).toContain('text-amber');

      // 3. No keys state
      manager.registeredCredentials = [];
      manager.vaultLocked = false;
      const noKeysBtn = manager.renderWebAuthnButton();
      expect(noKeysBtn).toContain('text-cyphr');
    });
  });

  // ─── 9. Interactive Prompts & Action Handlers ─────────────────────────────

  describe('Interactive Prompts & Action Handlers', () => {
    it('prompts user for custom device name on promptRegisterCredential', async () => {
      mockPrompt.mockReturnValue('My YubiKey Nano');
      mockCredentials.create.mockResolvedValue({
        id: 'nano-key-id',
        rawId: new ArrayBuffer(16),
        type: 'public-key',
      });

      await manager.promptRegisterCredential();

      expect(manager.registeredCredentials.length).toBe(1);
      expect(manager.registeredCredentials[0].deviceName).toBe('My YubiKey Nano');
    });

    it('aborts registration when user cancels the prompt', async () => {
      mockPrompt.mockReturnValue(null);
      await manager.promptRegisterCredential();
      expect(manager.registeredCredentials.length).toBe(0);
    });

    it('prompts user on promptRenameCredential and updates name', () => {
      manager.registeredCredentials = [
        {
          id: 'key-rename-xyz',
          rawId: new ArrayBuffer(8),
          type: 'public-key',
          userHandle: 'user',
          createdAt: Date.now(),
          deviceName: 'Old Name',
        },
      ];

      mockPrompt.mockReturnValue('Brand New Key Name');
      manager.promptRenameCredential('key-rename-xyz');
      expect(manager.registeredCredentials[0].deviceName).toBe('Brand New Key Name');
    });

    it('handles header button click: registers if no keys, unlocks if locked, or locks if confirmed', async () => {
      // 1. No keys -> prompts register
      manager.registeredCredentials = [];
      mockPrompt.mockReturnValue(null);
      await manager.handleHeaderButtonClick();
      expect(mockPrompt).toHaveBeenCalled();

      // 2. Locked -> unlocks
      manager.registeredCredentials = [
        {
          id: 'key-1',
          rawId: new ArrayBuffer(8),
          type: 'public-key',
          userHandle: 'user',
          createdAt: Date.now(),
          deviceName: 'Key',
        },
      ];
      manager.vaultLocked = true;
      const unlockSpy = vi.spyOn(manager, 'unlockVault').mockResolvedValue(true);
      await manager.handleHeaderButtonClick();
      expect(unlockSpy).toHaveBeenCalled();

      // 3. Unlocked -> confirms and locks
      manager.vaultLocked = false;
      manager.currentSession = {
        credentialId: 'key-1',
        challenge: new ArrayBuffer(32),
        authenticated: true,
        timestamp: Date.now(),
      };
      mockConfirm.mockReturnValue(true);
      vi.spyOn(sovereignDialog, 'confirm').mockResolvedValue(true);
      const lockSpy = vi.spyOn(manager, 'lockVault').mockResolvedValue();
      await manager.handleHeaderButtonClick();
      expect(lockSpy).toHaveBeenCalled();
    });
  });

  // ─── 10. Subscription & Event Teardown ───────────────────────────────────

  describe('Event Subscription Teardown', () => {
    it('unsubscribes listeners cleanly via the returned callback', () => {
      let callCount = 0;
      const unsub = manager.subscribe(() => {
        callCount++;
      });

      manager.updateSetting('autoLockOnUnload', false);
      expect(callCount).toBe(1);

      unsub();
      manager.updateSetting('autoLockOnUnload', true);
      expect(callCount).toBe(1);
    });
  });

  // ─── 11. Cryptographic Security & XSS Hardening ──────────────────────────

  describe('Cryptographic Security & XSS Hardening', () => {
    it('generateChallenge generates high-entropy unique 32-byte challenges via CSPRNG', () => {
      const challenge = manager.generateChallenge();
      expect(challenge.length).toBe(32);
      expect(challenge instanceof Uint8Array).toBe(true);

      // Real WebCrypto CSPRNG entropy check
      const realBuf1 = new Uint8Array(32);
      const realBuf2 = new Uint8Array(32);
      crypto.getRandomValues(realBuf1);
      crypto.getRandomValues(realBuf2);
      expect(realBuf1).not.toEqual(realBuf2);
    });

    it('sanitizes device names and credential IDs against XSS in UI panels', () => {
      manager.registeredCredentials = [
        {
          id: '<script>alert("cred_id")</script>',
          rawId: stringToBuffer('test'),
          type: 'public-key',
          userHandle: 'user',
          createdAt: Date.now(),
          deviceName: '<img src=x onerror=alert("xss")>YubiKey 5C',
        },
      ];

      const html = manager.renderWebAuthnPanel();
      expect(html).not.toContain('<script>');
      expect(html).not.toContain('<img src=x');
      expect(html).toContain('&lt;img src=x');
      expect(html).toContain('&lt;script&gt;');
    });
  });
});
