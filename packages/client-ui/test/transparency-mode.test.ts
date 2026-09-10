import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TransparencyModeManager,
  STORAGE_KEY_TRANSPARENCY_MODE,
} from '../src/transparency-mode.js';

class LocalStorageMock implements Storage {
  private store: Map<string, string> = new Map();
  get length(): number { return this.store.size; }
  clear(): void { this.store.clear(); }
  getItem(key: string): string | null { return this.store.has(key) ? this.store.get(key)! : null; }
  key(index: number): string | null { return Array.from(this.store.keys())[index] ?? null; }
  removeItem(key: string): void { this.store.delete(key); }
  setItem(key: string, value: string): void { this.store.set(key, String(value)); }
}

describe('Unified Transparency Mode — Live Cryptographic Pipeline Inspector (Innovation 4)', () => {
  let manager: TransparencyModeManager;
  let eventTarget: EventTarget;

  beforeEach(() => {
    const storage = new LocalStorageMock();
    (globalThis as any).localStorage = storage;
    eventTarget = new EventTarget();
    (globalThis as any).window = {
      localStorage: storage,
      addEventListener: eventTarget.addEventListener.bind(eventTarget),
      removeEventListener: eventTarget.removeEventListener.bind(eventTarget),
      dispatchEvent: eventTarget.dispatchEvent.bind(eventTarget),
    };
    manager = new TransparencyModeManager();
  });

  describe('1. Pipeline Stage Recording & Cryptographic Journey', () => {
    it('records full 5-stage cryptographic lifecycle for a message', () => {
      const journey = manager.recordMessageJourney(
        'msg_test_pqc_123',
        'Sovereign test payload with hybrid post-quantum encryption',
        'alice-node-0x1',
        'bob-node-0x2',
        'outbound'
      );

      expect(journey).toBeDefined();
      expect(journey.messageId).toBe('msg_test_pqc_123');
      expect(journey.direction).toBe('outbound');
      expect(journey.stages.length).toBe(5);

      // Stage 1: E2EE QUANTUM RATCHET
      const stage1 = journey.stages[0];
      expect(stage1.stageId).toBe(1);
      expect(stage1.stageName).toBe('E2EE QUANTUM RATCHET');
      expect(stage1.status).toBe('completed');
      expect(stage1.latencyMs).toBeGreaterThanOrEqual(0);
      expect(stage1.hexPayloads.some((p) => p.label.includes('X25519'))).toBe(true);
      expect(stage1.hexPayloads.some((p) => p.label.includes('ML-KEM-768'))).toBe(true);
      expect(stage1.hexPayloads.some((p) => p.label.includes('AES-256-GCM'))).toBe(true);

      // Stage 2: ZK-RLN RATE LIMITING
      const stage2 = journey.stages[1];
      expect(stage2.stageId).toBe(2);
      expect(stage2.stageName).toBe('ZK-RLN RATE LIMITING');
      expect(stage2.status).toBe('completed');
      expect(stage2.hexPayloads.some((p) => p.label.includes('Shamir'))).toBe(true);
      expect(stage2.hexPayloads.some((p) => p.label.includes('Nullifier'))).toBe(true);

      // Stage 3: MERKLE TREE COMMITMENT
      const stage3 = journey.stages[2];
      expect(stage3.stageId).toBe(3);
      expect(stage3.stageName).toBe('MERKLE TREE COMMITMENT');
      expect(stage3.status).toBe('completed');
      expect(stage3.hexPayloads.some((p) => p.label.includes('Leaf'))).toBe(true);
      expect(stage3.hexPayloads.some((p) => p.label.includes('Root'))).toBe(true);

      // Stage 4: P2P GOSSIP PROPAGATION
      const stage4 = journey.stages[3];
      expect(stage4.stageId).toBe(4);
      expect(stage4.stageName).toBe('P2P GOSSIP PROPAGATION');
      expect(stage4.status).toBe('completed');
      expect(stage4.details.transportMesh).toContain('WebRTC');
      expect(stage4.hexPayloads.some((p) => p.label.includes('InfoHash'))).toBe(true);

      // Stage 5: ZERO-KNOWLEDGE VERIFIED DELIVERY
      const stage5 = journey.stages[4];
      expect(stage5.stageId).toBe(5);
      expect(stage5.stageName).toBe('ZERO-KNOWLEDGE VERIFIED DELIVERY');
      expect(stage5.status).toBe('completed');
      expect(stage5.hexPayloads.some((p) => p.label.includes('Delivery Nullifier'))).toBe(true);

      // Total latency is sum of stages
      expect(journey.totalLatencyMs).toBeGreaterThan(0);
      expect(manager.getActiveJourney()?.journeyId).toBe(journey.journeyId);
    });

    it('maintains a bounded history buffer of last 20 journeys', () => {
      for (let i = 0; i < 25; i++) {
        manager.recordMessageJourney(
          `msg_${i}`,
          `Payload number ${i}`,
          'nodeA',
          'nodeB'
        );
      }
      expect(manager.journeys.length).toBe(20);
      expect(manager.journeys[0].messageId).toBe('msg_24');
    });

    it('selects active journey and stage without errors', () => {
      const j1 = manager.recordMessageJourney('msg_a', 'Payload A', 'nodeA', 'nodeB');
      const j2 = manager.recordMessageJourney('msg_b', 'Payload B', 'nodeA', 'nodeB');

      manager.selectJourney(j1.journeyId);
      expect(manager.getActiveJourney()?.journeyId).toBe(j1.journeyId);

      manager.selectStage(3);
      expect(manager.selectedStage).toBe(3);
      expect(manager.selectedPayloadIndex).toBe(0);

      manager.selectPayload(1);
      expect(manager.selectedPayloadIndex).toBe(1);
    });
  });

  describe('2. Custom Event Emission', () => {
    it('emits aetheris:transparency:toggled when toggling mode', () => {
      const handler = vi.fn();
      window.addEventListener('aetheris:transparency:toggled', handler);

      const state = manager.toggleTransparencyMode();
      expect(handler).toHaveBeenCalled();
      expect(state).toBe(true);

      window.removeEventListener('aetheris:transparency:toggled', handler);
    });

    it('emits aetheris:transparency:opened and closed events', () => {
      const openHandler = vi.fn();
      const closeHandler = vi.fn();

      window.addEventListener('aetheris:transparency:opened', openHandler);
      window.addEventListener('aetheris:transparency:closed', closeHandler);

      manager.open();
      expect(manager.isOpen).toBe(true);
      expect(openHandler).toHaveBeenCalled();

      manager.close();
      expect(manager.isOpen).toBe(false);
      expect(closeHandler).toHaveBeenCalled();

      window.removeEventListener('aetheris:transparency:opened', openHandler);
      window.removeEventListener('aetheris:transparency:closed', closeHandler);
    });

    it('emits aetheris:transparency:journey_recorded when new journey is processed', () => {
      const handler = vi.fn();
      window.addEventListener('aetheris:transparency:journey_recorded', handler);

      manager.recordMessageJourney('msg_event_test', 'Event payload', 'src', 'dst');
      expect(handler).toHaveBeenCalled();

      window.removeEventListener('aetheris:transparency:journey_recorded', handler);
    });
  });

  describe('3. Hex Formatting & Live Inspector', () => {
    it('formats raw hex into 16-byte row layout with ASCII preview', () => {
      const rawHex = '48656c6c6f2c20555245667921'; // "Hello, UREfy!" in hex
      const formatted = manager.formatHexDump(rawHex, 32);

      expect(formatted).toContain('0000');
      expect(formatted).toContain('48 65 6c 6c 6f 2c 20 55 52 45 66 79 21');
      expect(formatted).toContain('Hello, UREfy!');
    });

    it('truncates large hex dumps with omission indicator', () => {
      const longHex = 'aa'.repeat(128); // 128 bytes
      const formatted = manager.formatHexDump(longHex, 32);

      expect(formatted).toContain('0000');
      expect(formatted).toContain('0010');
      expect(formatted).toContain('more bytes omitted');
    });

    it('renders hex inspector with payload tabs and parameter tables', () => {
      const journey = manager.getActiveJourney()!;
      const stageHtml = manager.renderHexInspector(journey.stages[0]);

      expect(stageHtml).toContain('E2EE QUANTUM RATCHET');
      expect(stageHtml).toContain('Ephemeral X25519 Public Key');
      expect(stageHtml).toContain('ML-KEM-768 Lattice Ciphertext');
      expect(stageHtml).toContain('Cryptographic Parameters & Invariants');
      expect(stageHtml).toContain('Copy Hex');
    });
  });

  describe('4. Timeline & SVG Visualizer Rendering', () => {
    it('renders animated glowing SVG pipeline with all 5 nodes and connectors', () => {
      const journey = manager.getActiveJourney()!;
      const svgHtml = manager.renderPipelineSVG(journey);

      expect(svgHtml).toContain('<svg viewBox="0 0 800 190"');
      expect(svgHtml).toContain('PQC Ratchet');
      expect(svgHtml).toContain('ZK-RLN');
      expect(svgHtml).toContain('Merkle Tree');
      expect(svgHtml).toContain('P2P Gossip');
      expect(svgHtml).toContain('ZK Delivery');
      expect(svgHtml).toContain('01');
      expect(svgHtml).toContain('05');
      expect(svgHtml).toContain('glow-active');
    });

    it('renders latency stopwatch with per-stage timings and total', () => {
      const journey = manager.getActiveJourney()!;
      const latencyHtml = manager.renderLatencyStopwatch(journey);

      expect(latencyHtml).toContain('Real-Time Cryptographic Pipeline Latency');
      expect(latencyHtml).toContain('S1:');
      expect(latencyHtml).toContain('S5:');
      expect(latencyHtml).toContain(`Total: ${journey.totalLatencyMs}ms`);
    });

    it('renders top navigation header toggle button', () => {
      const toggleHtml = manager.renderHeaderToggle();
      expect(toggleHtml).toContain('id="btn-toggle-transparency-mode"');
      expect(toggleHtml).toContain('Transparency');
      expect(toggleHtml).toContain('Ctrl+Shift+T');
    });

    it('renders full inspector modal when open', () => {
      expect(manager.renderInspectorModal()).toBe('');

      manager.open();
      const modalHtml = manager.renderInspectorModal();
      expect(modalHtml).toContain('Transparency Mode');
      expect(modalHtml).toContain('LIVE INSPECTOR');
      expect(modalHtml).toContain('5-Stage Pipeline');
      expect(modalHtml).toContain('ZK Proof Viewer');
      expect(modalHtml).toContain('Merkle Tree Swarm');
      expect(modalHtml).toContain('P2P Gossip Dissemination');
      expect(modalHtml).toContain('Network Telemetry');
      expect(modalHtml).toContain('Ctrl+Shift+T');
    });

    it('toggles view mode between modal and drawer', () => {
      expect(manager.viewMode).toBe('modal');
      manager.toggleViewMode();
      expect(manager.viewMode).toBe('drawer');
      manager.toggleViewMode();
      expect(manager.viewMode).toBe('modal');
    });
  });
});
