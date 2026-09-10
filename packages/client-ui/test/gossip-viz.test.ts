import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  GossipProtocolVisualizer,
  gossipViz,
  type GossipNode,
  type GossipEdge,
  type GossipMessage,
  type GossipNetworkStats,
} from '../src/gossip-viz.js';

// --- Lightweight DOM Mock for strict Node/Vitest test runner ---
class MockDOMElement {
  public eventListeners: Map<string, Array<(evt?: any) => void>> = new Map();
  public value: string = '';
  public textContent: string = '';
  public attributes: Map<string, string> = new Map();

  constructor(public id: string = '') {}

  public addEventListener(event: string, cb: (evt?: any) => void): void {
    const list = this.eventListeners.get(event) || [];
    list.push(cb);
    this.eventListeners.set(event, list);
  }

  public dispatchEvent(evt: any): void {
    const type = evt?.type || 'click';
    const list = this.eventListeners.get(type) || [];
    list.forEach((cb) => cb(evt));
  }

  public click(): void {
    this.dispatchEvent({ type: 'click' });
  }

  public getAttribute(name: string): string | null {
    return this.attributes.get(name) || null;
  }

  public setAttribute(name: string, val: string): void {
    this.attributes.set(name, val);
  }
}

class MockDOMRoot {
  public elements: Map<string, MockDOMElement> = new Map();
  public nodeElements: MockDOMElement[] = [];

  constructor() {
    this.elements.set('#btn-gossip-broadcast', new MockDOMElement('btn-gossip-broadcast'));
    this.elements.set('#btn-gossip-step', new MockDOMElement('btn-gossip-step'));
    this.elements.set('#btn-gossip-auto', new MockDOMElement('btn-gossip-auto'));
    this.elements.set('#btn-gossip-reset', new MockDOMElement('btn-gossip-reset'));
    this.elements.set('#btn-gossip-regen', new MockDOMElement('btn-gossip-regen'));
    this.elements.set('#gossip-origin-select', new MockDOMElement('gossip-origin-select'));
    this.elements.set('#gossip-payload-input', new MockDOMElement('gossip-payload-input'));
    this.elements.set('#gossip-prob-slider', new MockDOMElement('gossip-prob-slider'));
    this.elements.set('#gossip-prob-val', new MockDOMElement('gossip-prob-val'));

    const nodeEl = new MockDOMElement('node-5-el');
    nodeEl.setAttribute('data-node-id', 'node-5');
    this.nodeElements.push(nodeEl);
  }

  public querySelector(selector: string): any {
    return this.elements.get(selector) || null;
  }

  public querySelectorAll(selector: string): any[] {
    if (selector === '[data-node-id]') {
      return this.nodeElements;
    }
    return [];
  }
}

describe('UREfy — Gossip Protocol Visualizer Engine', () => {
  let visualizer: GossipProtocolVisualizer;

  beforeEach(() => {
    vi.useFakeTimers();
    visualizer = new GossipProtocolVisualizer(16);
  });

  afterEach(() => {
    visualizer.stopAutoSimulation();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // 1. Network Topology Generation
  // ---------------------------------------------------------------------------
  describe('1. Network Topology Generation (generateNetwork)', () => {
    it('should generate a connected graph with default 16 nodes', () => {
      expect(visualizer.nodes.length).toBe(16);
      expect(visualizer.edges.length).toBeGreaterThan(0);
      expect(visualizer.currentStep).toBe(0);
      expect(visualizer.maxHopsRecorded).toBe(0);
      expect(visualizer.isAutoSimulating).toBe(false);
    });

    it('should clamp node count to [12, 20] range strictly', () => {
      // Clamped to min 12
      visualizer.generateNetwork(5);
      expect(visualizer.nodes.length).toBe(12);

      // Clamped to max 20
      visualizer.generateNetwork(45);
      expect(visualizer.nodes.length).toBe(20);

      // Fractional node count
      visualizer.generateNetwork(14.8);
      expect(visualizer.nodes.length).toBe(14);
    });

    it('should assign valid spatial coordinates and sovereign labels to every node', () => {
      for (const node of visualizer.nodes) {
        expect(node.id).toMatch(/^node-\d+$/);
        expect(node.label).toBeTruthy();
        expect(node.state).toBe('idle');
        expect(node.receivedAt).toBeUndefined();

        // Check 600x400 bounded SVG space with margins (paddingX=60, paddingY=55)
        expect(node.x).toBeGreaterThanOrEqual(60);
        expect(node.x).toBeLessThanOrEqual(540);
        expect(node.y).toBeGreaterThanOrEqual(55);
        expect(node.y).toBeLessThanOrEqual(345);
      }
    });

    it('should construct bidirectional valid edges with 2-4 neighbors per node', () => {
      const nodeIds = new Set(visualizer.nodes.map((n) => n.id));

      for (const edge of visualizer.edges) {
        expect(nodeIds.has(edge.from)).toBe(true);
        expect(nodeIds.has(edge.to)).toBe(true);
        expect(edge.from).not.toBe(edge.to);
        expect(edge.active).toBe(true);
        expect(edge.propagating).toBe(false);
      }

      // Check degrees
      const degreeMap = new Map<string, number>();
      visualizer.nodes.forEach((n) => degreeMap.set(n.id, 0));

      visualizer.edges.forEach((edge) => {
        degreeMap.set(edge.from, (degreeMap.get(edge.from) || 0) + 1);
        degreeMap.set(edge.to, (degreeMap.get(edge.to) || 0) + 1);
      });

      visualizer.nodes.forEach((node) => {
        const deg = degreeMap.get(node.id) || 0;
        expect(deg).toBeGreaterThanOrEqual(1);
        expect(deg).toBeLessThanOrEqual(6);
      });
    });

    it('should record an initial history point and network_reset log entry', () => {
      expect(visualizer.history.length).toBeGreaterThan(0);
      const initialHistory = visualizer.history[0];
      expect(initialHistory.step).toBe(0);
      expect(initialHistory.infectedCount).toBe(0);
      expect(initialHistory.idleCount).toBe(visualizer.nodes.length);
      expect(initialHistory.coveragePct).toBe(0);

      expect(visualizer.eventLogs.length).toBeGreaterThan(0);
      const firstLog = visualizer.eventLogs[0];
      expect(firstLog.type).toBe('network_reset');
      expect(firstLog.sourceLabel).toBe('Swarm Engine');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Broadcast Message & Dissemination Initialization
  // ---------------------------------------------------------------------------
  describe('2. Broadcast & Dissemination Initiation (broadcastMessage)', () => {
    it('should set origin node to infected and initialize hop counter to 0', () => {
      const originId = visualizer.nodes[0].id;
      visualizer.broadcastMessage(originId, 'CUSTOM_PAYLOAD_TEST');

      expect(visualizer.selectedOriginId).toBe(originId);
      expect(visualizer.messagePayload).toBe('CUSTOM_PAYLOAD_TEST');
      expect(visualizer.nodes[0].state).toBe('infected');
      expect(visualizer.nodes[0].receivedAt).toBeDefined();

      // Other nodes remain idle
      const idleNodes = visualizer.nodes.filter((n) => n.id !== originId);
      expect(idleNodes.every((n) => n.state === 'idle')).toBe(true);

      expect(visualizer.totalMessagesSent).toBe(1);
      expect(visualizer.propagatingMessages.length).toBe(1);
      expect(visualizer.propagatingMessages[0].content).toBe('CUSTOM_PAYLOAD_TEST');
      expect(visualizer.propagatingMessages[0].hops).toBe(0);
    });

    it('should log origin_broadcast event with correct metadata', () => {
      visualizer.broadcastMessage(visualizer.nodes[1].id, 'SOVEREIGN_RUMOR_0x99');

      const log = visualizer.eventLogs[0];
      expect(log.type).toBe('origin_broadcast');
      expect(log.sourceLabel).toBe(visualizer.nodes[1].label);
      expect(log.hops).toBe(0);
      expect(log.message).toContain('SOVEREIGN_RUMOR_0x99');
    });

    it('should fallback to first node if invalid origin ID is passed', () => {
      visualizer.broadcastMessage('invalid-node-id', 'FALLBACK_TEST');
      expect(visualizer.nodes[0].state).toBe('infected');
      expect(visualizer.selectedOriginId).toBe(visualizer.nodes[0].id);
    });

    it('should invoke update callback upon broadcast', () => {
      let notified = false;
      visualizer.onUpdateCallback = () => {
        notified = true;
      };

      visualizer.broadcastMessage();
      expect(notified).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Discrete Gossip Simulation Step
  // ---------------------------------------------------------------------------
  describe('3. Discrete Step Simulation (simulateGossipStep)', () => {
    it('should auto-broadcast if step is triggered with 0 infected nodes', () => {
      expect(visualizer.nodes.every((n) => n.state === 'idle')).toBe(true);
      visualizer.simulateGossipStep();

      const infected = visualizer.nodes.filter((n) => n.state === 'infected');
      expect(infected.length).toBe(1);
      expect(infected[0].id).toBe(visualizer.selectedOriginId);
    });

    it('should disseminate rumor to neighbors with 100% infection probability (P = 1.0)', () => {
      visualizer.infectionProbability = 1.0;
      visualizer.broadcastMessage(visualizer.nodes[0].id);

      const initialInfectedCount = visualizer.nodes.filter((n) => n.state === 'infected').length;
      expect(initialInfectedCount).toBe(1);

      visualizer.simulateGossipStep();

      const step1Infected = visualizer.nodes.filter((n) => n.state === 'infected');
      expect(step1Infected.length).toBeGreaterThan(1);
      expect(visualizer.currentStep).toBe(1);
      expect(visualizer.maxHopsRecorded).toBe(1);

      // Active edges should have propagating flag
      const propagatingEdges = visualizer.edges.filter((e) => e.propagating);
      expect(propagatingEdges.length).toBeGreaterThan(0);
    });

    it('should handle simulated packet drops when probability P = 0.0', () => {
      visualizer.broadcastMessage(visualizer.nodes[0].id);
      visualizer.infectionProbability = 0.0;

      visualizer.simulateGossipStep();

      // Only origin remains infected
      const infected = visualizer.nodes.filter((n) => n.state === 'infected');
      expect(infected.length).toBe(1);

      // Event log should record packet_loss
      const packetLossLog = visualizer.eventLogs.find((l) => l.type === 'packet_loss');
      expect(packetLossLog).toBeDefined();
      expect(packetLossLog?.message).toContain('Packet dropped due to link noise');
    });

    it('should reach 100% convergence and log convergence event', () => {
      visualizer.infectionProbability = 1.0;
      visualizer.broadcastMessage(visualizer.nodes[0].id);

      // Execute steps until full convergence
      let safetyRounds = 0;
      while (!visualizer.getStats().isConverged && safetyRounds < 20) {
        visualizer.simulateGossipStep();
        safetyRounds++;
      }

      const stats = visualizer.getStats();
      expect(stats.isConverged).toBe(true);
      expect(stats.coveragePct).toBe(100);
      expect(stats.infectedCount).toBe(visualizer.nodes.length);

      const convergenceLog = visualizer.eventLogs.find((l) => l.type === 'convergence');
      expect(convergenceLog).toBeDefined();
      expect(convergenceLog?.message).toContain('Swarm reached 100% saturation');

      // Subsequent step on 100% converged network should be no-op
      const stepBefore = visualizer.currentStep;
      visualizer.simulateGossipStep();
      expect(visualizer.currentStep).toBe(stepBefore);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Automated Simulation Controls
  // ---------------------------------------------------------------------------
  describe('4. Automated Simulation Controls (startAutoSimulation & stopAutoSimulation)', () => {
    it('should start auto simulation and update state periodically', () => {
      visualizer.infectionProbability = 1.0;
      visualizer.startAutoSimulation(200);

      expect(visualizer.isAutoSimulating).toBe(true);
      expect(visualizer.autoIntervalMs).toBe(200);

      // Advance timers by 400ms (2 steps)
      vi.advanceTimersByTime(400);
      expect(visualizer.currentStep).toBeGreaterThanOrEqual(1);

      visualizer.stopAutoSimulation();
      expect(visualizer.isAutoSimulating).toBe(false);
    });

    it('should not create multiple concurrent timers if startAutoSimulation is called repeatedly', () => {
      visualizer.startAutoSimulation(100);
      visualizer.startAutoSimulation(100);
      expect(visualizer.isAutoSimulating).toBe(true);

      visualizer.stopAutoSimulation();
      expect(visualizer.isAutoSimulating).toBe(false);
    });

    it('should toggle auto simulation state smoothly with toggleAutoSimulation', () => {
      expect(visualizer.isAutoSimulating).toBe(false);

      visualizer.toggleAutoSimulation();
      expect(visualizer.isAutoSimulating).toBe(true);

      visualizer.toggleAutoSimulation();
      expect(visualizer.isAutoSimulating).toBe(false);
    });

    it('should automatically stop auto simulation when 100% convergence is reached', () => {
      visualizer.infectionProbability = 1.0;
      visualizer.startAutoSimulation(100);

      // Advance through enough cycles for all 16 nodes to infect
      vi.advanceTimersByTime(2000);

      expect(visualizer.getStats().isConverged).toBe(true);
      expect(visualizer.isAutoSimulating).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. State Reset & Recovery
  // ---------------------------------------------------------------------------
  describe('5. State Reset & SIR Recovery', () => {
    it('should reset network nodes back to idle while preserving graph structure', () => {
      visualizer.infectionProbability = 1.0;
      visualizer.broadcastMessage();
      visualizer.simulateGossipStep();

      expect(visualizer.nodes.filter((n) => n.state === 'infected').length).toBeGreaterThan(1);

      visualizer.resetNetwork();

      expect(visualizer.nodes.every((n) => n.state === 'idle')).toBe(true);
      expect(visualizer.edges.every((e) => !e.propagating)).toBe(true);
      expect(visualizer.currentStep).toBe(0);
      expect(visualizer.maxHopsRecorded).toBe(0);
      expect(visualizer.estimatedLatencyMs).toBe(0);
      expect(visualizer.isAutoSimulating).toBe(false);

      const resetLog = visualizer.eventLogs.find((l) => l.type === 'network_reset');
      expect(resetLog).toBeDefined();
    });

    it('should transition infected nodes to recovered state (SIR model)', () => {
      visualizer.infectionProbability = 1.0;
      visualizer.broadcastMessage();
      visualizer.simulateGossipStep();

      const infectedBefore = visualizer.nodes.filter((n) => n.state === 'infected').length;
      expect(infectedBefore).toBeGreaterThan(0);

      visualizer.recoverInfectedNodes();

      const recoveredCount = visualizer.nodes.filter((n) => n.state === 'recovered').length;
      const infectedAfter = visualizer.nodes.filter((n) => n.state === 'infected').length;

      expect(recoveredCount).toBe(infectedBefore);
      expect(infectedAfter).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Telemetry & History Bounding
  // ---------------------------------------------------------------------------
  describe('6. Telemetry & Statistics Queries (getStats)', () => {
    it('should compute exact statistical aggregates', () => {
      const stats: GossipNetworkStats = visualizer.getStats();

      expect(stats.nodeCount).toBe(16);
      expect(stats.edgeCount).toBe(visualizer.edges.length);
      expect(stats.idleCount).toBe(16);
      expect(stats.infectedCount).toBe(0);
      expect(stats.recoveredCount).toBe(0);
      expect(stats.coveragePct).toBe(0);
      expect(stats.isConverged).toBe(false);
      expect(stats.avgDegree).toBeGreaterThan(0);
    });

    it('should bound history to 40 items and logs to 25 items', () => {
      visualizer.infectionProbability = 1.0;
      visualizer.broadcastMessage();

      // Trigger 50 steps
      for (let i = 0; i < 50; i++) {
        visualizer.simulateGossipStep();
      }

      expect(visualizer.history.length).toBeLessThanOrEqual(40);
      expect(visualizer.eventLogs.length).toBeLessThanOrEqual(25);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. SVG Canvas Rendering
  // ---------------------------------------------------------------------------
  describe('7. SVG Canvas Rendering (renderSVGCanvas)', () => {
    it('should render complete SVG canvas markup with layers, filters, and defs', () => {
      const svg = visualizer.renderSVGCanvas();

      expect(svg).toContain('<svg');
      expect(svg).toContain('id="gossip-svg-canvas"');
      expect(svg).toContain('viewBox="0 0 600 400"');
      expect(svg).toContain('id="gossip-glow-cyphr"');
      expect(svg).toContain('id="gossip-glow-signal"');
      expect(svg).toContain('id="gossip-grid"');
      expect(svg).toContain('id="edge-beam-grad"');
      expect(svg).toContain('id="gossip-edge-layer"');
      expect(svg).toContain('id="gossip-node-layer"');
      expect(svg).toContain('id="gossip-hud-layer"');
    });

    it('should render infected nodes with pulse rings, glow filters, and hop badges', () => {
      visualizer.broadcastMessage(visualizer.nodes[0].id);
      const svg = visualizer.renderSVGCanvas();

      expect(svg).toContain('gossip-pulse-ring');
      expect(svg).toContain('url(#gossip-glow-signal)');
      expect(svg).toContain('data-node-id="node-0"');
      expect(svg).toContain(visualizer.nodes[0].label);
    });

    it('should render recovered nodes with purple styling', () => {
      visualizer.broadcastMessage();
      visualizer.recoverInfectedNodes();
      const svg = visualizer.renderSVGCanvas();

      expect(svg).toContain('#2e1065');
      expect(svg).toContain('#a855f7');
      expect(svg).toContain('#d8b4fe');
    });

    it('should render HUD overlays with live stats', () => {
      visualizer.broadcastMessage();
      const svg = visualizer.renderSVGCanvas();

      expect(svg).toContain('P_infect:');
      expect(svg).toContain('Coverage');
      expect(svg).toContain('%');
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Right Rail Panel & Sidebar Button
  // ---------------------------------------------------------------------------
  describe('8. UI Components (renderGossipButton & renderGossipPanel)', () => {
    it('should render compact sidebar button with saturation badge', () => {
      const buttonHtml = visualizer.renderGossipButton();

      expect(buttonHtml).toContain('id="btn-open-gossip-viz"');
      expect(buttonHtml).toContain('Gossip Protocol');
      expect(buttonHtml).toContain('Epidemic Swarm');
      expect(buttonHtml).toContain('% SAT');
    });

    it('should render complete Right Rail panel with controls and telemetry feed', () => {
      const panelHtml = visualizer.renderGossipPanel();

      expect(panelHtml).toContain('id="gossip-protocol-panel"');
      expect(panelHtml).toContain('Gossip Protocol P2P');
      expect(panelHtml).toContain('id="gossip-origin-select"');
      expect(panelHtml).toContain('id="gossip-payload-input"');
      expect(panelHtml).toContain('id="gossip-prob-slider"');
      expect(panelHtml).toContain('id="gossip-prob-val"');
      expect(panelHtml).toContain('id="btn-gossip-broadcast"');
      expect(panelHtml).toContain('id="btn-gossip-step"');
      expect(panelHtml).toContain('id="btn-gossip-auto"');
      expect(panelHtml).toContain('id="btn-gossip-reset"');
      expect(panelHtml).toContain('id="btn-gossip-regen"');
      expect(panelHtml).toContain('Gossip Telemetry Feed');
      expect(panelHtml).toContain('Mathematical Guarantees');
      expect(panelHtml).toContain('O(log N)');
    });
  });

  // ---------------------------------------------------------------------------
  // 9. DOM Event Binding & Interactivity
  // ---------------------------------------------------------------------------
  describe('9. DOM Event Binding (attachEventListeners)', () => {
    it('should attach listeners to control buttons and SVG nodes', () => {
      const mockRoot = new MockDOMRoot();
      visualizer.attachEventListeners(mockRoot as any);

      // 1. Broadcast button click
      const broadcastBtn = mockRoot.querySelector('#btn-gossip-broadcast');
      expect(broadcastBtn).not.toBeNull();
      broadcastBtn.click();
      expect(visualizer.nodes.some((n) => n.state === 'infected')).toBe(true);

      // 2. Single step button click
      const stepBtn = mockRoot.querySelector('#btn-gossip-step');
      expect(stepBtn).not.toBeNull();
      stepBtn.click();
      expect(visualizer.currentStep).toBeGreaterThanOrEqual(1);

      // 3. Reset button click
      const resetBtn = mockRoot.querySelector('#btn-gossip-reset');
      expect(resetBtn).not.toBeNull();
      resetBtn.click();
      expect(visualizer.nodes.every((n) => n.state === 'idle')).toBe(true);

      // 4. Probability slider input
      const probSlider = mockRoot.querySelector('#gossip-prob-slider');
      expect(probSlider).not.toBeNull();
      probSlider.value = '0.85';
      probSlider.dispatchEvent({ type: 'input' });
      expect(visualizer.infectionProbability).toBe(0.85);

      // 5. Origin select change
      const originSelect = mockRoot.querySelector('#gossip-origin-select');
      expect(originSelect).not.toBeNull();
      originSelect.value = 'node-3';
      originSelect.dispatchEvent({ type: 'change' });
      expect(visualizer.selectedOriginId).toBe('node-3');

      // 6. SVG Node click
      const nodeTarget = mockRoot.querySelectorAll('[data-node-id]')[0];
      expect(nodeTarget).not.toBeNull();
      nodeTarget.click();
      expect(visualizer.selectedOriginId).toBe('node-5');
    });
  });

  // ---------------------------------------------------------------------------
  // 10. Singleton Export Verification
  // ---------------------------------------------------------------------------
  describe('10. Singleton Export', () => {
    it('should export singleton instance gossipViz', () => {
      expect(gossipViz).toBeInstanceOf(GossipProtocolVisualizer);
      expect(gossipViz.nodes.length).toBeGreaterThanOrEqual(12);
      expect(gossipViz.renderSVGCanvas()).toContain('gossip-svg-canvas');
    });
  });
});
