import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isDemoModeEnabled,
  enableDemoMode,
  renderDemoWatermarkBanner,
  updateDemoWatermark,
  DEMO_MODE_STORAGE_KEY,
  DEMO_WATERMARK_ELEMENT_ID,
  DEMO_WATERMARK_MESSAGE,
} from '../src/demo-mode.js';
import { AetherisClientStore } from '../src/client-state.js';
import { CVEMonitor } from '../src/cve-monitor.js';
import { GovernanceDAO } from '../src/governance.js';
import { CyberDefenseHub } from '../src/cyber-defense-hub.js';
import { ThreadManager } from '../src/threads.js';
import { P2PDownloadManager } from '../src/download-manager.js';
import { SpatialAudioEngine } from '../src/spatial-audio.js';
import { WebRTCFileTransfer } from '../src/webrtc-transfer.js';

// Setup mock document/window environment if running under standard Node
const elements = new Map<string, any>();
if (typeof (globalThis as any).document === 'undefined') {
  const mockBody = {
    appendChild: (child: any) => {
      if (child.id) elements.set(child.id, child);
      return child;
    },
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  (globalThis as any).document = {
    getElementById: (id: string) => elements.get(id) || null,
    createElement: (tag: string) => {
      const el: any = {
        tagName: tag.toUpperCase(),
        innerHTML: '',
        id: '',
        textContent: '',
        remove: () => {
          if (el.id) elements.delete(el.id);
        },
        addEventListener: () => {},
        removeEventListener: () => {},
      };
      // Define setter for innerHTML that parses firstChild with id and textContent
      Object.defineProperty(el, 'innerHTML', {
        set(html: string) {
          this._html = html;
          const idMatch = html.match(/id="([^"]+)"/);
          const textMatch = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
          this.firstElementChild = {
            id: idMatch ? idMatch[1] : '',
            textContent: textMatch,
            remove: () => {
              if (idMatch) elements.delete(idMatch[1]);
            },
            addEventListener: () => {},
            removeEventListener: () => {},
          };
        },
        get() {
          return this._html || '';
        },
      });
      return el;
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    body: mockBody,
  };
}
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = globalThis;
}
if (!(globalThis as any).window.location) {
  (globalThis as any).window.location = {
    protocol: 'https:',
    host: 'localhost:3000',
    hostname: 'localhost',
    search: '',
    pathname: '/',
  };
}

describe('Etapa 4: Centralized Demo Mode & Honest Production State', () => {
  beforeEach(() => {
    // Force demo mode off
    enableDemoMode(false);
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  afterEach(() => {
    enableDemoMode(false);
  });

  describe('1. Single Source of Truth & Watermark Banner', () => {
    it('returns false for isDemoModeEnabled() when disabled', () => {
      enableDemoMode(false);
      expect(isDemoModeEnabled()).toBe(false);
      expect(renderDemoWatermarkBanner()).toBe('');
    });

    it('returns true for isDemoModeEnabled() when enabled and renders persistent watermark banner', () => {
      enableDemoMode(true);
      expect(isDemoModeEnabled()).toBe(true);

      const banner = renderDemoWatermarkBanner();
      expect(banner).toContain(`id="${DEMO_WATERMARK_ELEMENT_ID}"`);
      expect(banner).toContain(DEMO_WATERMARK_MESSAGE);
      expect(banner).toContain('Exit Demo');
    });

    it('manages DOM watermark injection and removal via updateDemoWatermark()', () => {
      enableDemoMode(true);
      updateDemoWatermark();
      const el = document.getElementById(DEMO_WATERMARK_ELEMENT_ID);
      expect(el).not.toBeNull();
      expect(el!.textContent).toContain('DEMO MODE ACTIVE');

      enableDemoMode(false);
      updateDemoWatermark();
      const elAfter = document.getElementById(DEMO_WATERMARK_ELEMENT_ID);
      expect(elAfter).toBeNull();
    });
  });

  describe('2. Honest Empty States on Fresh Production (Zero Fake State)', () => {
    it('AetherisClientStore initializes with 0 fake posts and only self in members when demo mode is off', () => {
      enableDemoMode(false);
      const store = new AetherisClientStore();

      expect(store.posts.length).toBe(0);
      expect(store.members.length).toBe(1);
      expect(store.members[0].fingerprint).toBe(store.keypair.fingerprint);
    });

    it('CVEMonitor initializes with 0 fake libraries and 0 fake vulnerabilities when demo mode is off', () => {
      enableDemoMode(false);
      const cve = new CVEMonitor();

      expect(cve.knownVulnerabilities.length).toBe(0);
      expect(cve.scannedLibraries.length).toBe(0);
      expect(cve.activeAlerts.length).toBe(0);
    });

    it('GovernanceDAO initializes with 0 fake proposals and 0 fake votes when demo mode is off', () => {
      enableDemoMode(false);
      const dao = new GovernanceDAO();

      expect(dao.proposals.length).toBe(0);
      expect(dao.allVotes.size).toBe(0);
      expect(dao.myVotes.size).toBe(0);
    });

    it('CyberDefenseHub initializes with 0 attacks and 0 logs when demo mode is off', () => {
      enableDemoMode(false);
      const hub = new CyberDefenseHub();

      const telemetry = hub.getSecurityTelemetry();
      expect(telemetry.totalAttacksMitigated).toBe(0);
      expect(telemetry.activeQuarantinedIPs).toBe(0);
      expect(telemetry.ddosPacketsDropped).toBe(0);
      expect(hub.getThreatLogs().length).toBe(0);
    });

    it('ThreadManager initializes with empty thread when demo mode is off', () => {
      enableDemoMode(false);
      const tm = new ThreadManager();
      expect(tm.getRootComments().length).toBe(0);
    });

    it('P2PDownloadManager initializes with 0 fake tasks when demo mode is off', () => {
      enableDemoMode(false);
      const dm = new P2PDownloadManager();
      expect(dm.tasks.length).toBe(0);
      expect(dm.activeDownloads).toBe(0);
    });

    it('SpatialAudioEngine initializes with 0 fake participants when demo mode is off', () => {
      enableDemoMode(false);
      const sa = new SpatialAudioEngine();
      expect(sa.participants.length).toBe(0);
    });

    it('WebRTCFileTransfer initializes with 0 fake transfers when demo mode is off', () => {
      enableDemoMode(false);
      const tm = new WebRTCFileTransfer();
      expect(tm.activeTransfers.size).toBe(0);
    });
  });

  describe('3. Populating Demo Fixtures Explicitly When Demo Mode is Enabled', () => {
    it('populates demo fixtures on demand via loadDemoData()', () => {
      enableDemoMode(true);

      const store = new AetherisClientStore();
      store.loadDemoData();
      expect(store.posts.length).toBeGreaterThan(0);
      expect(store.members.length).toBeGreaterThan(1);

      const cve = new CVEMonitor();
      cve.loadDemoData();
      expect(cve.knownVulnerabilities.length).toBeGreaterThan(0);
      expect(cve.scannedLibraries.length).toBeGreaterThan(0);

      const dao = new GovernanceDAO();
      dao.loadDemoData();
      expect(dao.proposals.length).toBeGreaterThan(0);

      const hub = new CyberDefenseHub();
      hub.loadDemoData();
      expect(hub.getThreatLogs().length).toBeGreaterThan(0);

      const tm = new ThreadManager();
      tm.loadDemoData();
      expect(tm.getRootComments().length).toBeGreaterThan(0);

      const dm = new P2PDownloadManager();
      (dm as any).seedInitialSwarmTasks();
      expect(dm.tasks.length).toBeGreaterThan(0);

      const sa = new SpatialAudioEngine();
      sa.seedInitialParticipants();
      expect(sa.participants.length).toBeGreaterThan(0);

      const transfer = new WebRTCFileTransfer();
      transfer.loadDemoData();
      expect(transfer.activeTransfers.size).toBeGreaterThan(0);
    });
  });
});
