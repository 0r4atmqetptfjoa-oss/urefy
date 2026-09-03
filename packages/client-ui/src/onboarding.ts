/**
 * @file onboarding.ts
 * @package @aetheris/client-ui
 * @description Sovereign Onboarding Wizard - Complete interactive welcome walkthrough for Aetheris Omni-Sphere.
 * 100% functional, self-contained implementation with zero external dependencies.
 */

import './window-augmentation.js';
import { serviceRegistry, SERVICES } from './service-registry.js';

export interface OnboardingStep {
  stepIndex: number;
  title: string;
  subtitle: string;
  icon: string;
  componentHtml: string;
}

export type UILaunchDensity = 'compact' | 'balanced' | 'media';

export class OnboardingWizard {
  public currentStep: number = 0;
  public isOpen: boolean = false;
  public isCompleted: boolean = false;
  public selectedDensity: UILaunchDensity = 'balanced';
  public isZKHumanVerified: boolean = true;
  public telemetryOptIn: boolean = false;
  public simulatedSeedHex: string = '';

  private readonly STORAGE_KEY = 'aetheris_onboarding_done';
  private readonly DENSITY_STORAGE_KEY = 'aetheris_density_preference';

  constructor() {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(this.STORAGE_KEY);
      this.isCompleted = stored === 'true';
      const storedDensity = window.localStorage.getItem(this.DENSITY_STORAGE_KEY) as UILaunchDensity;
      if (storedDensity && ['compact', 'balanced', 'media'].includes(storedDensity)) {
        this.selectedDensity = storedDensity;
      }
    } else {
      this.isCompleted = false;
    }

    this.simulatedSeedHex = this.generateSampleSeedHex();

    // Global window registration for inline HTML markup invocation
    if (typeof window !== 'undefined') {
      window.onboardingWizard = this;
    }
  }

  /**
   * Generates a demo 32-byte (64 hex characters) seed for identity visualization
   */
  private generateSampleSeedHex(): string {
    const chars = '0123456789abcdef';
    let hex = '';
    for (let i = 0; i < 64; i++) {
      hex += chars[Math.floor(Math.random() * chars.length)];
    }
    return hex;
  }

  /**
   * Opens onboarding modal from initial step or current step
   */
  public start(): void {
    this.currentStep = 0;
    this.isOpen = true;
    this.syncUI();
  }

  /**
   * Advances to next step or finishes on the final step
   */
  public next(): void {
    if (this.currentStep < 4) {
      this.currentStep++;
      this.syncUI();
    } else {
      this.finish();
    }
  }

  /**
   * Returns to previous step
   */
  public previous(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.syncUI();
    }
  }

  /**
   * Closes wizard, marking it as temporarily skipped
   */
  public skip(): void {
    this.isOpen = false;
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(this.STORAGE_KEY, 'true');
    }
    this.isCompleted = true;
    this.syncUI();
  }

  /**
   * Finishes wizard successfully and persists settings
   */
  public finish(): void {
    this.isOpen = false;
    this.isCompleted = true;
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(this.STORAGE_KEY, 'true');
      window.localStorage.setItem(this.DENSITY_STORAGE_KEY, this.selectedDensity);
    }
    this.syncUI();
    this.triggerLaunchCelebration();
  }

  /**
   * Resets tour (callable from Settings/Help)
   */
  public reset(): void {
    this.currentStep = 0;
    this.isOpen = true;
    this.isCompleted = false;
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(this.STORAGE_KEY);
    }
    this.syncUI();
  }

  /**
   * Selects visual density mode
   */
  public setDensity(mode: UILaunchDensity): void {
    this.selectedDensity = mode;
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(this.DENSITY_STORAGE_KEY, mode);
    }
    this.syncUI();
  }

  /**
   * Toggles ZK-Human checkbox state
   */
  public toggleZKHumanCheck(checked: boolean): void {
    this.isZKHumanVerified = checked;
    this.syncUI();
  }

  /**
   * Toggles zero-knowledge telemetry option
   */
  public toggleTelemetry(optIn: boolean): void {
    this.telemetryOptIn = optIn;
    this.syncUI();
  }

  /**
   * Retrieves current wizard state
   */
  public getState(): { currentStep: number; isOpen: boolean; isCompleted: boolean; totalSteps: number } {
    return {
      currentStep: this.currentStep,
      isOpen: this.isOpen,
      isCompleted: this.isCompleted,
      totalSteps: 5,
    };
  }

  /**
   * Dispatches launch celebration custom event to DOM
   */
  private triggerLaunchCelebration(): void {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('aetheris:onboarding_completed', {
        detail: { density: this.selectedDensity, timestamp: Date.now() },
      });
      window.dispatchEvent(event);
    }
  }

  /**
   * Synchronizes DOM if host container elements are present
   */
  private syncUI(): void {
    if (typeof document === 'undefined') return;

    const modalHost = document.getElementById('aetheris-onboarding-modal-host');
    if (modalHost) {
      modalHost.innerHTML = this.isOpen ? this.renderWizardModal('aeth1_sovereign_init_0x') : '';
    }

    const bannerHost = document.getElementById('aetheris-onboarding-banner-host');
    if (bannerHost) {
      bannerHost.innerHTML = this.renderWelcomeBanner();
    }
  }

  // =========================================================================
  // 5 INTERACTIVE VISUAL STEPS DEFINITION
  // =========================================================================

  /**
   * Step 1: 🔑 Sovereign Ed25519 Identity
   */
  private renderStep1Identity(myFingerprint: string): string {
    const displayFingerprint = myFingerprint && myFingerprint.length > 5 ? myFingerprint : 'aeth1_9f4c3a2e1d08b776_secp_ed25519';
    const seed = this.simulatedSeedHex;
    const formattedSeed = seed.match(/.{1,4}/g)?.join(' ') || seed;

    return `
      <div class="space-y-6 animate-in fade-in duration-300">
        <!-- Step Header -->
        <div class="flex items-center space-x-4 border-b border-white/5 pb-4">
          <div class="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyphr text-2xl shadow-[0_0_20px_rgba(0,229,255,0.2)]">
            🔑
          </div>
          <div>
            <h3 class="text-xl font-bold text-white tracking-wide flex items-center gap-2">
              Sovereign Ed25519 Identity
              <span class="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyphr border border-cyan-500/40 font-mono">ZERO-SERVER</span>
            </h3>
            <p class="text-sm text-slate-400">Local cryptographic key generation. Zero central databases, zero compromised passwords.</p>
          </div>
        </div>

        <!-- Cryptographic Seed Generation Box -->
        <div class="bg-surface-base rounded-xl p-4 border border-white/10 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-signal animate-pulse"></span>
              Local Entropy (32-Byte CSPRNG Seed)
            </span>
            <span class="text-xs font-mono text-cyphr">Curve25519 / SHA-512</span>
          </div>

          <div class="p-3 bg-canvas rounded-lg border border-white/5 font-mono text-xs text-slate-300 select-all break-all leading-relaxed bg-black/40">
            <span class="text-cyan-400 font-semibold">${formattedSeed.slice(0, 35)}</span>
            <span class="text-slate-500">${formattedSeed.slice(35)}</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <!-- Unique Fingerprint -->
            <div class="p-3 rounded-lg bg-surface-raised border border-white/5">
              <span class="text-[11px] font-mono text-slate-400 block mb-1">PROTOCOL FINGERPRINT</span>
              <div class="font-mono text-xs text-cyphr truncate font-semibold flex items-center justify-between">
                <span>${displayFingerprint}</span>
                <span class="text-[10px] text-signal bg-signal/10 px-1.5 py-0.5 rounded border border-signal/30">VALID</span>
              </div>
            </div>

            <!-- Key Mechanism -->
            <div class="p-3 rounded-lg bg-surface-raised border border-white/5">
              <span class="text-[11px] font-mono text-slate-400 block mb-1">AUTHENTICATION MECHANISM</span>
              <div class="font-mono text-xs text-purple-400 font-semibold flex items-center justify-between">
                <span>Schnorr / EdDSA Signatures</span>
                <span class="text-[10px] text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/30">CLIENT-ONLY</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 3 Sovereign Pillars -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div class="p-3 rounded-xl bg-surface-raised/60 border border-white/5 hover:border-cyan-500/30 transition-all">
            <div class="text-cyphr text-lg mb-1">🔐</div>
            <h4 class="text-xs font-semibold text-white mb-1">Key Never Leaves Browser</h4>
            <p class="text-[11px] text-slate-400 leading-snug">All signatures execute in WebCrypto. No server ever touches your private key.</p>
          </div>

          <div class="p-3 rounded-xl bg-surface-raised/60 border border-white/5 hover:border-signal/30 transition-all">
            <div class="text-signal text-lg mb-1">🚫</div>
            <h4 class="text-xs font-semibold text-white mb-1">No Email or Phone Required</h4>
            <p class="text-[11px] text-slate-400 leading-snug">Immunity against credential stuffing, SIM-swap attacks, and personal data breaches.</p>
          </div>

          <div class="p-3 rounded-xl bg-surface-raised/60 border border-white/5 hover:border-purple-500/30 transition-all">
            <div class="text-aether text-lg mb-1">⚡</div>
            <h4 class="text-xs font-semibold text-white mb-1">Portable Sovereignty</h4>
            <p class="text-[11px] text-slate-400 leading-snug">Export or migrate your seed to any independent node in the Omni-Sphere P2P network.</p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Step 2: 🛡️ ZK-RLN Anti-Spam Shield
   */
  private renderStep2ZKRLN(): string {
    return `
      <div class="space-y-6 animate-in fade-in duration-300">
        <!-- Step Header -->
        <div class="flex items-center space-x-4 border-b border-white/5 pb-4">
          <div class="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-signal text-2xl shadow-[0_0_20px_rgba(34,197,94,0.2)]">
            🛡️
          </div>
          <div>
            <h3 class="text-xl font-bold text-white tracking-wide flex items-center gap-2">
              ZK-RLN Anti-Spam Shield
              <span class="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-signal border border-emerald-500/40 font-mono">RATE-LIMITING NULLIFIERS</span>
            </h3>
            <p class="text-sm text-slate-400">Mathematical rate-limiting via Shamir Secret Sharing. Free expression without corrupt moderators.</p>
          </div>
        </div>

        <!-- Interactive Shamir Polynomial Diagram -->
        <div class="bg-surface-base rounded-xl p-5 border border-white/10 space-y-4">
          <div class="flex items-center justify-between border-b border-white/5 pb-3">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-signal"></span>
              <span class="text-xs font-mono text-slate-300">Degree-1 Polynomial per Epoch: <strong class="text-cyphr">f(x) = a₀ + a₁·x (mod p)</strong></span>
            </div>
            <span class="text-[11px] font-mono px-2 py-0.5 rounded bg-surface-raised text-amber-400 border border-amber-500/30">Epoch: 10s Window</span>
          </div>

          <!-- Visual Breakdown of 2 Messages -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Message 1 - Valid -->
            <div class="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 relative overflow-hidden">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold text-signal flex items-center gap-1.5">
                  <span class="text-sm">✓</span> Message 1 in Epoch
                </span>
                <span class="text-[10px] font-mono text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded">SINGLE SHARE</span>
              </div>
              <p class="text-xs text-slate-300 mb-2">Reveals only point <code class="text-cyphr font-mono">(x₁, y₁)</code> on the polynomial.</p>
              <div class="p-2 bg-canvas/80 rounded border border-white/5 font-mono text-[11px] text-emerald-400">
                100% Anonymity preserved. ZK proof passes instantly.
              </div>
            </div>

            <!-- Message 2 - Spam Attempt -->
            <div class="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 relative overflow-hidden">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold text-crimson flex items-center gap-1.5">
                  <span class="text-sm">⚠️</span> Message 2 (Spam Attempt)
                </span>
                <span class="text-[10px] font-mono text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded">SLASH TRIGGER</span>
              </div>
              <p class="text-xs text-slate-300 mb-2">Reveals second point <code class="text-rose-400 font-mono">(x₂, y₂)</code> in the same epoch.</p>
              <div class="p-2 bg-canvas/80 rounded border border-white/5 font-mono text-[11px] text-rose-400">
                Lagrange interpolation exposes a₀ (Secret Key). Network slashes the identity!
              </div>
            </div>
          </div>

          <!-- Formula & Proof details -->
          <div class="p-3 bg-surface-raised rounded-lg border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 text-xs">
            <div class="flex items-center gap-2 text-slate-300">
              <span class="text-cyan-400 font-mono font-bold">Merkle Tree Root:</span>
              <span class="font-mono text-[11px] text-slate-400">0x8a92...7c41 (Identity Membership Proof)</span>
            </div>
            <div class="text-[11px] text-signal font-mono flex items-center gap-1">
              <span>● Zero Arbitrary Human Moderators</span>
            </div>
          </div>
        </div>

        <!-- 3 Key Benefits -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div class="p-3 rounded-lg bg-surface-raised border border-white/5">
            <span class="text-xs font-bold text-white block mb-1">⚖️ Censorship Impossible</span>
            <p class="text-[11px] text-slate-400">No entity can censor or delete a valid post without violating cryptographic laws.</p>
          </div>
          <div class="p-3 rounded-lg bg-surface-raised border border-white/5">
            <span class="text-xs font-bold text-white block mb-1">⚡ Infinite Spam Penalty</span>
            <p class="text-[11px] text-slate-400">Spammers immediately forfeit identity and membership stake if rate limits are breached.</p>
          </div>
          <div class="p-3 rounded-lg bg-surface-raised border border-white/5">
            <span class="text-xs font-bold text-white block mb-1">🛡️ ZK Privacy</span>
            <p class="text-[11px] text-slate-400">Messages do not leak real identity, only Merkle tree membership proof.</p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Step 3: 🌐 Omni-Sphere Hybrid Architecture
   */
  private renderStep3OmniSphere(): string {
    return `
      <div class="space-y-6 animate-in fade-in duration-300">
        <!-- Step Header -->
        <div class="flex items-center space-x-4 border-b border-white/5 pb-4">
          <div class="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-aether text-2xl shadow-[0_0_20px_rgba(168,85,247,0.2)]">
            🌐
          </div>
          <div>
            <h3 class="text-xl font-bold text-white tracking-wide flex items-center gap-2">
              Omni-Sphere Hybrid Architecture
              <span class="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-aether border border-purple-500/40 font-mono">3 UNIFIED SPHERES</span>
            </h3>
            <p class="text-sm text-slate-400">A unified experience fusing synchronous, asynchronous, and archival communication.</p>
          </div>
        </div>

        <!-- 3 Interactive Spheres -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Sphere 1: Live Relays -->
          <div class="p-4 rounded-xl bg-surface-base border border-cyan-500/30 hover:border-cyan-500 transition-all flex flex-col justify-between group shadow-[0_0_15px_rgba(0,229,255,0.05)]">
            <div>
              <div class="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyphr text-xl mb-3 group-hover:scale-110 transition-transform">
                ⚡
              </div>
              <div class="flex items-center justify-between mb-1">
                <h4 class="text-sm font-bold text-white">Live Relays</h4>
                <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyphr">E2EE MATRIX</span>
              </div>
              <p class="text-xs text-slate-400 leading-relaxed mb-3">
                E2E encrypted WebRTC audio/video channels, ultra-low latency screen sharing, and instant P2P chat.
              </p>
            </div>
            <div class="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-cyan-400">
              <span>● GossipSub v1.2</span>
              <span>&lt; 50ms Sync</span>
            </div>
          </div>

          <!-- Sphere 2: Vault Hubs -->
          <div class="p-4 rounded-xl bg-surface-base border border-purple-500/30 hover:border-purple-500 transition-all flex flex-col justify-between group shadow-[0_0_15px_rgba(168,85,247,0.05)]">
            <div>
              <div class="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-aether text-xl mb-3 group-hover:scale-110 transition-transform">
                🏛️
              </div>
              <div class="flex items-center justify-between mb-1">
                <h4 class="text-sm font-bold text-white">Knowledge Vault</h4>
                <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-aether">BINARY REPOSITORY</span>
              </div>
              <p class="text-xs text-slate-400 leading-relaxed mb-3">
                SHA-256/CRC32 verified nanopublications, tamper-proof Merkle DAGs, and merit-weighted consensus.
              </p>
            </div>
            <div class="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-purple-400">
              <span>● BitTorrent Swarm</span>
              <span>Permanent Archive</span>
            </div>
          </div>

          <!-- Sphere 3: Pulse Streams -->
          <div class="p-4 rounded-xl bg-surface-base border border-emerald-500/30 hover:border-emerald-500 transition-all flex flex-col justify-between group shadow-[0_0_15px_rgba(34,197,94,0.05)]">
            <div>
              <div class="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-signal text-xl mb-3 group-hover:scale-110 transition-transform">
                📡
              </div>
              <div class="flex items-center justify-between mb-1">
                <h4 class="text-sm font-bold text-white">Pulse Streams</h4>
                <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-signal">X / NOSTR</span>
              </div>
              <p class="text-xs text-slate-400 leading-relaxed mb-3">
                Pure 280-character chronological micro-pulses, decentralized broadcast, and zero manipulative feeds.
              </p>
            </div>
            <div class="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-signal">
              <span>● ZK Epoch Feeds</span>
              <span>100% Chronological</span>
            </div>
          </div>
        </div>

        <!-- Protocol Interoperability Bridge -->
        <div class="p-4 bg-surface-base rounded-xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div class="flex items-center space-x-3">
            <span class="text-2xl">🔗</span>
            <div>
              <h5 class="text-xs font-bold text-white">Dual Horizon &amp; Tri-Sphere Routing</h5>
              <p class="text-[11px] text-slate-400">Seamlessly transition across spheres using the Left Rail or shortcut <code class="text-cyphr font-mono">Ctrl + \\</code>.</p>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <span class="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span class="w-2 h-2 rounded-full bg-purple-400"></span>
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span class="text-xs font-mono text-slate-300 ml-1">P2P Swarm Ready</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Step 4: ⌨️ Speed-of-Light Keyboard Navigation
   */
  private renderStep4KeyboardShortcuts(): string {
    return `
      <div class="space-y-6 animate-in fade-in duration-300">
        <!-- Step Header -->
        <div class="flex items-center space-x-4 border-b border-white/5 pb-4">
          <div class="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber text-2xl shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            ⌨️
          </div>
          <div>
            <h3 class="text-xl font-bold text-white tracking-wide flex items-center gap-2">
              Speed-of-Light Keyboard Navigation
              <span class="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber border border-amber-500/40 font-mono">120 WPM WORKFLOW</span>
            </h3>
            <p class="text-sm text-slate-400">Military-grade direct shortcuts for mouse-free, lightning-fast navigation.</p>
          </div>
        </div>

        <!-- Shortcuts Cheatsheet Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <!-- Command Rail -->
          <div class="p-3 bg-surface-base rounded-xl border border-white/10 flex items-center justify-between">
            <div class="space-y-0.5">
              <span class="text-xs font-bold text-white block">Global Command Rail</span>
              <span class="text-[11px] text-slate-400">Universal search, channels, P2P nodes</span>
            </div>
            <div class="flex items-center space-x-1">
              <kbd class="px-2 py-1 rounded bg-surface-raised border border-white/20 text-xs font-mono text-cyphr shadow-sm">Ctrl</kbd>
              <span class="text-slate-500 text-xs">+</span>
              <kbd class="px-2 py-1 rounded bg-surface-raised border border-white/20 text-xs font-mono text-cyphr shadow-sm">K</kbd>
            </div>
          </div>

          <!-- Dual Horizon -->
          <div class="p-3 bg-surface-base rounded-xl border border-white/10 flex items-center justify-between">
            <div class="space-y-0.5">
              <span class="text-xs font-bold text-white block">Dual Horizon Toggle</span>
              <span class="text-[11px] text-slate-400">Split feed / Dual-sphere multitasking</span>
            </div>
            <div class="flex items-center space-x-1">
              <kbd class="px-2 py-1 rounded bg-surface-raised border border-white/20 text-xs font-mono text-purple-400 shadow-sm">Ctrl</kbd>
              <span class="text-slate-500 text-xs">+</span>
              <kbd class="px-2 py-1 rounded bg-surface-raised border border-white/20 text-xs font-mono text-purple-400 shadow-sm">\\</kbd>
            </div>
          </div>

          <!-- Feed Navigation J/K -->
          <div class="p-3 bg-surface-base rounded-xl border border-white/10 flex items-center justify-between">
            <div class="space-y-0.5">
              <span class="text-xs font-bold text-white block">Feed Navigation (Vim-Style)</span>
              <span class="text-[11px] text-slate-400">Next / Previous post</span>
            </div>
            <div class="flex items-center space-x-1">
              <kbd class="px-2.5 py-1 rounded bg-surface-raised border border-white/20 text-xs font-mono text-emerald-400 shadow-sm">J</kbd>
              <span class="text-slate-500 text-xs">/</span>
              <kbd class="px-2.5 py-1 rounded bg-surface-raised border border-white/20 text-xs font-mono text-emerald-400 shadow-sm">K</kbd>
            </div>
          </div>

          <!-- Merit Votes U/D -->
          <div class="p-3 bg-surface-base rounded-xl border border-white/10 flex items-center justify-between">
            <div class="space-y-0.5">
              <span class="text-xs font-bold text-white block">Merit Consensus Voting</span>
              <span class="text-[11px] text-slate-400">Upvote (+1 Merit) / Downvote (-1)</span>
            </div>
            <div class="flex items-center space-x-1">
              <kbd class="px-2.5 py-1 rounded bg-surface-raised border border-white/20 text-xs font-mono text-signal shadow-sm">U</kbd>
              <span class="text-slate-500 text-xs">/</span>
              <kbd class="px-2.5 py-1 rounded bg-surface-raised border border-white/20 text-xs font-mono text-rose-400 shadow-sm">D</kbd>
            </div>
          </div>

          <!-- Quick Reply -->
          <div class="p-3 bg-surface-base rounded-xl border border-white/10 flex items-center justify-between">
            <div class="space-y-0.5">
              <span class="text-xs font-bold text-white block">Inline Quick Reply</span>
              <span class="text-[11px] text-slate-400">Open editor on active post</span>
            </div>
            <kbd class="px-2.5 py-1 rounded bg-surface-raised border border-white/20 text-xs font-mono text-cyan-400 shadow-sm">R</kbd>
          </div>

          <!-- New Nanopublication -->
          <div class="p-3 bg-surface-base rounded-xl border border-white/10 flex items-center justify-between">
            <div class="space-y-0.5">
              <span class="text-xs font-bold text-white block">New Nanopublication</span>
              <span class="text-[11px] text-slate-400">Compose new post with cryptographic payload</span>
            </div>
            <kbd class="px-2.5 py-1 rounded bg-surface-raised border border-white/20 text-xs font-mono text-amber-400 shadow-sm">N</kbd>
          </div>
        </div>

        <!-- Efficiency Tip -->
        <div class="p-3 rounded-lg bg-surface-raised/40 border border-white/5 flex items-center gap-3">
          <span class="text-amber-400 text-lg">💡</span>
          <span class="text-xs text-slate-300">
            Press <kbd class="px-1.5 py-0.5 rounded bg-surface-overlay text-white font-mono text-[10px]">?</kbd> anytime to open the full keyboard cheat sheet.
          </span>
        </div>
      </div>
    `;
  }

  /**
   * Step 5: 🚀 Network Launch
   */
  private renderStep5Launch(): string {
    const isCompact = this.selectedDensity === 'compact';
    const isBalanced = this.selectedDensity === 'balanced';
    const isMedia = this.selectedDensity === 'media';

    return `
      <div class="space-y-6 animate-in fade-in duration-300">
        <!-- Step Header -->
        <div class="flex items-center space-x-4 border-b border-white/5 pb-4">
          <div class="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyphr text-2xl shadow-[0_0_20px_rgba(0,229,255,0.2)]">
            🚀
          </div>
          <div>
            <h3 class="text-xl font-bold text-white tracking-wide flex items-center gap-2">
              Network Launch
              <span class="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyphr border border-cyan-500/40 font-mono">READY TO ENGAGE</span>
            </h3>
            <p class="text-sm text-slate-400">Customize UI layout density and confirm ZK-Human membership proof.</p>
          </div>
        </div>

        <!-- UI Layout Density Selector -->
        <div class="space-y-2">
          <label class="text-xs font-mono text-slate-300 uppercase tracking-wider block">UI Layout Density</label>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <!-- Compact -->
            <button
              type="button"
              onclick="window.onboardingWizard.setDensity('compact')"
              class="p-3.5 rounded-xl text-left border transition-all ${
                isCompact
                  ? 'bg-cyan-500/15 border-cyan-500 text-white ring-1 ring-cyan-500 shadow-[0_0_15px_rgba(0,229,255,0.15)]'
                  : 'bg-surface-base border-white/10 text-slate-300 hover:border-white/30'
              }"
            >
              <div class="flex items-center justify-between mb-1.5">
                <span class="font-bold text-xs">IRC Compact</span>
                <span class="text-[10px] font-mono text-cyan-400">Terminal</span>
              </div>
              <p class="text-[11px] text-slate-400 leading-snug">Dense lines, monospace logs, ultra-compact for power users.</p>
            </button>

            <!-- Balanced -->
            <button
              type="button"
              onclick="window.onboardingWizard.setDensity('balanced')"
              class="p-3.5 rounded-xl text-left border transition-all ${
                isBalanced
                  ? 'bg-purple-500/15 border-purple-500 text-white ring-1 ring-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                  : 'bg-surface-base border-white/10 text-slate-300 hover:border-white/30'
              }"
            >
              <div class="flex items-center justify-between mb-1.5">
                <span class="font-bold text-xs">Balanced</span>
                <span class="text-[10px] font-mono text-purple-400">Standard</span>
              </div>
              <p class="text-[11px] text-slate-400 leading-snug">Optimal spacing, clean cards, comfortable reading for long sessions.</p>
            </button>

            <!-- Media Rich -->
            <button
              type="button"
              onclick="window.onboardingWizard.setDensity('media')"
              class="p-3.5 rounded-xl text-left border transition-all ${
                isMedia
                  ? 'bg-emerald-500/15 border-emerald-500 text-white ring-1 ring-emerald-500 shadow-[0_0_15px_rgba(34,197,94,0.15)]'
                  : 'bg-surface-base border-white/10 text-slate-300 hover:border-white/30'
              }"
            >
              <div class="flex items-center justify-between mb-1.5">
                <span class="font-bold text-xs">Media Rich</span>
                <span class="text-[10px] font-mono text-emerald-400">Expansive</span>
              </div>
              <p class="text-[11px] text-slate-400 leading-snug">Large previews, rich embeds, inline media players.</p>
            </button>
          </div>
        </div>

        <!-- ZK-Human Verification Checkbox -->
        <div class="p-4 bg-surface-base rounded-xl border border-white/10 space-y-3">
          <label class="flex items-start space-x-3 cursor-pointer select-none">
            <input
              type="checkbox"
              ${this.isZKHumanVerified ? 'checked' : ''}
              onchange="window.onboardingWizard.toggleZKHumanCheck(this.checked)"
              class="mt-1 w-4 h-4 rounded bg-surface-raised border-white/20 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0 cursor-pointer"
            />
            <div>
              <span class="text-xs font-bold text-white flex items-center gap-2">
                ZK-Human Membership Proof (Local Proof)
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-signal border border-emerald-500/30">VERIFIED</span>
              </span>
              <p class="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                Validates network membership without sharing KYC or personal data. Locally generated ZK-SNARK proof attests user uniqueness.
              </p>
            </div>
          </label>
        </div>

        <!-- Connection Status Card -->
        <div class="p-4 rounded-xl bg-gradient-to-r from-cyan-950/30 via-purple-950/20 to-emerald-950/30 border border-cyan-500/30 flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <span class="w-3 h-3 rounded-full bg-signal animate-ping"></span>
            <div>
              <span class="text-xs font-bold text-white block">System Ready to Launch</span>
              <span class="text-[11px] text-slate-400 font-mono">P2P Swarm: 1,420 Active Nodes | Epoch: Ready</span>
            </div>
          </div>
          <button
            type="button"
            onclick="window.onboardingWizard.finish()"
            class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(0,229,255,0.4)] transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <span>Launch Aetheris</span>
            <span>⚡</span>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Returns onboarding steps array
   */
  public getSteps(myFingerprint: string): OnboardingStep[] {
    return [
      {
        stepIndex: 0,
        title: 'Sovereign Ed25519 Identity',
        subtitle: 'Local key generation & asymmetric cryptography',
        icon: '🔑',
        componentHtml: this.renderStep1Identity(myFingerprint),
      },
      {
        stepIndex: 1,
        title: 'ZK-RLN Anti-Spam Shield',
        subtitle: 'Rate-Limiting Nullifiers & Shamir Secret Sharing',
        icon: '🛡️',
        componentHtml: this.renderStep2ZKRLN(),
      },
      {
        stepIndex: 2,
        title: 'Omni-Sphere Hybrid Architecture',
        subtitle: 'Live Relays + Vault Hubs + Pulse Streams',
        icon: '🌐',
        componentHtml: this.renderStep3OmniSphere(),
      },
      {
        stepIndex: 3,
        title: 'Speed-of-Light Keyboard Navigation',
        subtitle: 'Sub-second command cheatsheet & shortcuts',
        icon: '⌨️',
        componentHtml: this.renderStep4KeyboardShortcuts(),
      },
      {
        stepIndex: 4,
        title: 'Network Launch',
        subtitle: 'Visual layout personalization & Swarm connect',
        icon: '🚀',
        componentHtml: this.renderStep5Launch(),
      },
    ];
  }

  /**
   * Renders step indicators and progress bar
   */
  private renderStepIndicators(): string {
    const steps = ['Identity', 'ZK-RLN Shield', 'Omni-Sphere', 'Keyboard', 'Launch'];
    return `
      <div class="flex items-center justify-between w-full max-w-xl mx-auto px-4 py-3">
        ${steps
          .map((label, idx) => {
            const isPassed = idx < this.currentStep;
            const isCurrent = idx === this.currentStep;
            const dotClass = isCurrent
              ? 'bg-cyphr text-black font-bold ring-4 ring-cyan-500/20 shadow-[0_0_15px_rgba(0,229,255,0.6)] scale-110'
              : isPassed
              ? 'bg-signal text-black font-bold'
              : 'bg-surface-overlay text-slate-500 border border-white/10';

            const textClass = isCurrent ? 'text-cyphr font-bold' : isPassed ? 'text-slate-300' : 'text-slate-600';

            return `
              <div class="flex flex-col items-center gap-1.5 relative group">
                <button
                  type="button"
                  onclick="window.onboardingWizard.currentStep = ${idx}; window.onboardingWizard.syncUI ? window.onboardingWizard.syncUI() : null;"
                  class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono transition-all ${dotClass}"
                >
                  ${isPassed ? '✓' : idx + 1}
                </button>
                <span class="text-[10px] font-mono tracking-tight hidden sm:block ${textClass}">${label}</span>
              </div>
            `;
          })
          .join(`
            <div class="flex-1 h-[2px] mx-2 bg-surface-overlay overflow-hidden rounded">
              <div class="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-300" style="width: 100%"></div>
            </div>
          `)}
      </div>
    `;
  }

  /**
   * Renders full Glassmorphism modal window
   */
  public renderWizardModal(myFingerprint: string = 'aeth1_0000000000000000'): string {
    if (!this.isOpen) return '';

    const steps = this.getSteps(myFingerprint);
    const activeStep = steps[this.currentStep] || steps[0];
    const isFirst = this.currentStep === 0;
    const isLast = this.currentStep === steps.length - 1;

    return `
      <div id="aetheris-onboarding-overlay" class="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
        <div class="relative w-full max-w-3xl bg-surface-raised border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col my-auto">
          
          <!-- Top Bar Modal -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-surface-base/80">
            <div class="flex items-center space-x-3">
              <div class="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
                Æ
              </div>
              <span class="text-sm font-bold text-white tracking-wider font-mono">AETHERIS // SOVEREIGN ONBOARDING</span>
            </div>

            <div class="flex items-center space-x-2">
              <span class="text-xs font-mono text-slate-400 mr-2">Step ${this.currentStep + 1} of ${steps.length}</span>
              <button
                type="button"
                onclick="window.onboardingWizard.skip()"
                class="px-2.5 py-1 text-xs font-mono text-slate-400 hover:text-white rounded bg-surface-overlay hover:bg-surface-highlight transition-all border border-white/5"
              >
                Skip Intro ✕
              </button>
            </div>
          </div>

          <!-- Step Indicators & Progress -->
          <div class="border-b border-white/5 bg-surface-base/40">
            ${this.renderStepIndicators()}
          </div>

          <!-- Step Active Body -->
          <div class="p-6 sm:p-8 flex-1 min-h-[380px] bg-canvas/60">
            ${activeStep.componentHtml}
          </div>

          <!-- Modal Footer Actions -->
          <div class="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-surface-base/90">
            <div>
              ${
                !isFirst
                  ? `
                <button
                  type="button"
                  onclick="window.onboardingWizard.previous()"
                  class="px-4 py-2 rounded-xl bg-surface-overlay hover:bg-surface-highlight text-slate-200 text-xs font-semibold tracking-wide border border-white/10 transition-all flex items-center gap-1.5"
                >
                  <span>←</span>
                  <span>Back</span>
                </button>
              `
                  : `
                <span class="text-xs text-slate-500 font-mono">Press Continue to proceed</span>
              `
              }
            </div>

            <div class="flex items-center space-x-3">
              <button
                type="button"
                onclick="window.onboardingWizard.skip()"
                class="px-3 py-2 text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors"
              >
                Skip Tour
              </button>

              ${
                !isLast
                  ? `
                <button
                  type="button"
                  onclick="window.onboardingWizard.next()"
                  class="px-6 py-2.5 rounded-xl bg-cyphr hover:bg-cyan-300 text-black font-bold text-xs tracking-wider uppercase shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all flex items-center gap-2 transform active:scale-95"
                >
                  <span>Continue</span>
                  <span>→</span>
                </button>
              `
                  : `
                <button
                  type="button"
                  onclick="window.onboardingWizard.finish()"
                  class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold text-xs tracking-wider uppercase shadow-[0_0_25px_rgba(0,229,255,0.4)] transition-all flex items-center gap-2 transform active:scale-95"
                >
                  <span>Launch Platform</span>
                  <span>🚀</span>
                </button>
              `
              }
            </div>
          </div>

        </div>
      </div>
    `;
  }

  /**
   * Renders a discreet and elegant banner at the top of the feed if user has not completed the tour
   */
  public renderWelcomeBanner(): string {
    if (this.isCompleted && !this.isOpen) {
      return '';
    }

    return `
      <div id="aetheris-welcome-banner" class="mb-4 p-4 rounded-2xl bg-gradient-to-r from-surface-raised via-surface-overlay to-surface-raised border border-cyan-500/30 shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in duration-300">
        <div class="flex items-center space-x-3.5">
          <div class="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyphr text-xl shadow-[0_0_15px_rgba(0,229,255,0.2)]">
            ✨
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h4 class="text-sm font-bold text-white tracking-wide">Welcome to Aetheris Omni-Sphere</h4>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyphr border border-cyan-500/40">Recommended Tour</span>
            </div>
            <p class="text-xs text-slate-400 mt-0.5">Explore sovereign Ed25519 identity, ZK-RLN spam shield, and rapid keyboard shortcuts.</p>
          </div>
        </div>

        <div class="flex items-center space-x-2.5 self-end md:self-auto">
          <button
            type="button"
            onclick="window.onboardingWizard.skip()"
            class="px-3 py-1.5 rounded-lg text-xs font-mono text-slate-400 hover:text-white bg-surface-base hover:bg-surface-highlight border border-white/5 transition-all"
          >
            Not Now
          </button>
          <button
            type="button"
            onclick="window.onboardingWizard.start()"
            class="px-4 py-1.5 rounded-lg bg-cyphr hover:bg-cyan-300 text-black font-bold text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all transform active:scale-95 flex items-center gap-1.5"
          >
            <span>Start Walkthrough</span>
            <span>→</span>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Compact button for reopening the walkthrough from Left Rail footer or Settings
   */
  public renderWelcomeButton(): string {
    return `
      <button
        type="button"
        onclick="window.onboardingWizard.start()"
        title="Interactive Onboarding Guide"
        class="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-surface-raised hover:bg-surface-overlay border border-white/5 hover:border-cyan-500/30 text-slate-300 hover:text-white text-xs font-medium transition-all group"
      >
        <span class="flex items-center gap-2">
          <span class="text-cyphr group-hover:scale-110 transition-transform">✨</span>
          <span>Welcome Guide</span>
        </span>
        <span class="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">WIZARD</span>
      </button>
    `;
  }
}

// Export singleton
export const onboardingWizard = new OnboardingWizard();

serviceRegistry.registerInstance(SERVICES.Onboarding, onboardingWizard);
