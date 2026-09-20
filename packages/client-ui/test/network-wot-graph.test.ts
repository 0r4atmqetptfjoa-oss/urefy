import './helpers/disable-demo.js';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  WoTGraphVisualizer,
  wotGraphViz,
  ROLE_THEMES,
  type WoTRole,
  type WoTNode,
  type WoTEdge,
  type WoTGraphStats,
} from '../src/network-wot-graph.js';
import { setSimulationMode } from '../src/simulation-mode.js';
import * as adminAuth from '../src/admin-auth.js';

describe('Web-of-Trust (WoT) Interactive Graph Visualizer Engine', () => {
  describe('0. Production Empty State (Zero-Fake-Data Invariant)', () => {
    let prodVisualizer: WoTGraphVisualizer;

    beforeEach(() => {
      vi.spyOn(adminAuth, 'isProductionBuild').mockReturnValue(false);
      setSimulationMode(false);
      prodVisualizer = new WoTGraphVisualizer();
    });

    afterEach(() => {
      prodVisualizer.stopAnimation();
      vi.restoreAllMocks();
    });

    it('initializes with strictly empty nodes and edges when fewer than 3 verified members exist', () => {
      expect(prodVisualizer.nodes).toEqual([]);
      expect(prodVisualizer.edges).toEqual([]);
      expect(prodVisualizer.isSynthetic).toBe(false);
    });

    it('renders clean empty state SVG message in production', () => {
      const svg = prodVisualizer.renderSVG();
      expect(svg).toContain('No network topology data available.');
      expect(svg).toContain('Minimum 3 verified peers required to build Web-of-Trust graph.');
      expect(svg).not.toContain('id="wot-canvas-glow"');
    });

    it('prevents synthetic graph regeneration in production mode', () => {
      prodVisualizer.regenerateGraph();
      expect(prodVisualizer.nodes).toEqual([]);
      expect(prodVisualizer.edges).toEqual([]);
    });
  });

  let visualizer: WoTGraphVisualizer;
  let mockElements: Map<string, { id: string; innerHTML: string; textContent: string; className: string }>;

  beforeEach(() => {
    vi.spyOn(adminAuth, 'isProductionBuild').mockReturnValue(false);
    setSimulationMode(true);
    mockElements = new Map();

    const docMock = {
      querySelectorAll: vi.fn((selector: string) => selector.split(',').flatMap(part => {
        const id = part.trim().slice(1);
        return mockElements.has(id) ? [{ remove: () => mockElements.delete(id) }] : [];
      })),
      getElementById: vi.fn((id: string) => {
        if (!mockElements.has(id)) {
          mockElements.set(id, { id, innerHTML: '', textContent: '', className: '' });
        }
        return mockElements.get(id);
      }),
      createElement: vi.fn((tag: string) => ({
        tagName: tag.toUpperCase(),
        id: '',
        innerHTML: '',
        textContent: '',
        appendChild: vi.fn(),
      })),
      body: {
        appendChild: vi.fn((el: { id: string }) => {
          mockElements.set(el.id || 'child', el as unknown as { id: string; innerHTML: string; textContent: string; className: string });
        }),
      },
    };

    globalThis.document = docMock as unknown as Document;
    globalThis.window = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as Window & typeof globalThis;

    globalThis.requestAnimationFrame = vi.fn((_cb: FrameRequestCallback) => 123);
    globalThis.cancelAnimationFrame = vi.fn();

    visualizer = new WoTGraphVisualizer();
  });

  afterEach(() => {
    visualizer.stopAnimation();
    setSimulationMode(false);
    vi.restoreAllMocks();
  });

  // ─── 1. TOPOLOGY INITIALIZATION & DEFAULT STATE ─────────────────────────────

  describe('1. Default Topology Initialization & Role Constants', () => {
    it('should initialize with 20 canonical sovereign nodes and 37 trust edges', () => {
      expect(visualizer.nodes.length).toBe(20);
      expect(visualizer.edges.length).toBe(37);
      expect(visualizer.width).toBe(800);
      expect(visualizer.height).toBe(500);
      expect(visualizer.trustThreshold).toBe(25);
      expect(visualizer.isSimulating).toBe(true);
      expect(visualizer.isOpen).toBe(false);
      expect(visualizer.activeRoleFilter).toBe('all');
      expect(visualizer.searchQuery).toBe('');
    });

    it('should configure canonical ROLE_THEMES palette with correct colors and glyphs', () => {
      const roles: WoTRole[] = ['archon', 'sentinel', 'validator', 'citizen'];
      for (const r of roles) {
        const theme = ROLE_THEMES[r];
        expect(theme).toBeDefined();
        expect(theme.label).toBeDefined();
        expect(theme.color.startsWith('#')).toBe(true);
        expect(theme.glowColor).toBeDefined();
        expect(theme.strokeColor).toBeDefined();
        expect(theme.icon).toBeDefined();
        expect(theme.baseRadius).toBeGreaterThan(0);
      }

      expect(ROLE_THEMES.archon.icon).toBe('👑');
      expect(ROLE_THEMES.sentinel.icon).toBe('🛡️');
      expect(ROLE_THEMES.validator.icon).toBe('⚡');
      expect(ROLE_THEMES.citizen.icon).toBe('🌐');
    });

    it('should verify role distribution in default graph (3 Archons, 5 Sentinels, 6 Validators, 6 Citizens)', () => {
      const archons = visualizer.nodes.filter((n) => n.role === 'archon');
      const sentinels = visualizer.nodes.filter((n) => n.role === 'sentinel');
      const validators = visualizer.nodes.filter((n) => n.role === 'validator');
      const citizens = visualizer.nodes.filter((n) => n.role === 'citizen');

      expect(archons.length).toBe(3);
      expect(sentinels.length).toBe(5);
      expect(validators.length).toBe(6);
      expect(citizens.length).toBe(6);
    });

    it('should export singleton instance wotGraphViz correctly', () => {
      expect(wotGraphViz).toBeInstanceOf(WoTGraphVisualizer);
      expect(Array.isArray(wotGraphViz.nodes)).toBe(true);
      expect(typeof wotGraphViz.simulateStep).toBe('function');
    });
  });

  // ─── 2. FORCE-DIRECTED PHYSICS SIMULATION ───────────────────────────────────

  describe('2. Coulomb-Hooke Force-Directed Simulation Engine', () => {
    it('should execute a discrete physics step without NaN or out-of-bound coordinates', () => {
      visualizer.simulateStep();

      for (let i = 0; i < visualizer.nodes.length; i++) {
        const node = visualizer.nodes[i];
        expect(isNaN(node.x)).toBe(false);
        expect(isNaN(node.y)).toBe(false);
        expect(isNaN(node.vx)).toBe(false);
        expect(isNaN(node.vy)).toBe(false);

        // Clamped within canvas boundaries [15, 800 - 15], [15, 500 - 15]
        expect(node.x).toBeGreaterThanOrEqual(15);
        expect(node.x).toBeLessThanOrEqual(800 - 15);
        expect(node.y).toBeGreaterThanOrEqual(15);
        expect(node.y).toBeLessThanOrEqual(500 - 15);
      }
    });

    it('should respect pinned nodes during physics simulation steps', () => {
      const pinnedNode = visualizer.nodes[0];
      pinnedNode.isPinned = true;
      const initialX = pinnedNode.x;
      const initialY = pinnedNode.y;

      visualizer.simulateStep();

      expect(pinnedNode.x).toBe(initialX);
      expect(pinnedNode.y).toBe(initialY);
      expect(pinnedNode.vx).toBe(0);
      expect(pinnedNode.vy).toBe(0);
    });

    it('should control simulation animation loop with start, stop, and toggle', () => {
      expect(visualizer.isSimulating).toBe(true);

      visualizer.stopAnimation();
      expect(visualizer.isSimulating).toBe(false);
      expect(visualizer.animationFrame).toBeNull();

      visualizer.toggleAnimation();
      expect(visualizer.isSimulating).toBe(true);

      visualizer.toggleAnimation();
      expect(visualizer.isSimulating).toBe(false);
    });
  });

  // ─── 3. TELEMETRY & NETWORK STATISTICS ──────────────────────────────────────

  describe('3. WoT Telemetry & Topology Statistics', () => {
    it('should calculate accurate network metrics for default graph', () => {
      visualizer.setTrustThreshold(25);
      const stats: WoTGraphStats = visualizer.getStats();

      expect(stats.totalNodes).toBe(20);
      expect(stats.totalEdges).toBe(37);
      expect(stats.visibleEdges).toBeGreaterThan(0);
      expect(stats.archonCount).toBe(3);
      expect(stats.sentinelCount).toBe(5);
      expect(stats.validatorCount).toBe(6);
      expect(stats.citizenCount).toBe(6);
      expect(stats.avgTrustScore).toBeGreaterThan(60);
      expect(stats.networkDensity).toBeGreaterThan(0);
      expect(stats.maxFlowCapacity).toBeGreaterThan(0);
    });

    it('should filter visible edges dynamically based on trust threshold', () => {
      visualizer.setTrustThreshold(0);
      const stats0 = visualizer.getStats();
      expect(stats0.visibleEdges).toBe(37); // All visible

      visualizer.setTrustThreshold(75);
      const stats75 = visualizer.getStats();
      expect(stats75.visibleEdges).toBeLessThan(stats0.visibleEdges);

      visualizer.setTrustThreshold(95);
      const stats95 = visualizer.getStats();
      expect(stats95.visibleEdges).toBeLessThan(stats75.visibleEdges);
      expect(stats95.visibleEdges).toBeGreaterThanOrEqual(1); // Archon ZK attestation backbone
    });
  });

  // ─── 4. GRAPH REGENERATION & INTERACTION ────────────────────────────────────

  describe('4. Dynamic Graph Generation & Node Manipulation', () => {
    it('should regenerate graph topology with 18-23 random nodes and valid edges', () => {
      visualizer.regenerateGraph();

      expect(visualizer.nodes.length).toBeGreaterThanOrEqual(18);
      expect(visualizer.nodes.length).toBeLessThanOrEqual(24);
      expect(visualizer.edges.length).toBeGreaterThan(15);
      expect(visualizer.selectedNodeId).toBeNull();
      expect(visualizer.hoveredNodeId).toBeNull();
    });

    it('should reset graph positions to circular distribution', () => {
      visualizer.resetGraphPositions();

      for (const node of visualizer.nodes) {
        expect(node.isPinned).toBe(false);
        expect(node.x).toBeGreaterThan(20);
        expect(node.x).toBeLessThan(780);
        expect(node.y).toBeGreaterThan(20);
        expect(node.y).toBeLessThan(480);
      }
    });

    it('should vouch for node and increment trust score and direct vouches', () => {
      const targetNode = visualizer.nodes[5];
      const initialTrust = targetNode.trustScore;
      const initialVouches = targetNode.directVouches;
      const initialMerit = targetNode.meritScore;

      visualizer.vouchForNode(targetNode.id);

      expect(targetNode.directVouches).toBe(initialVouches + 1);
      expect(targetNode.trustScore).toBe(Math.min(100, initialTrust + 2));
      expect(targetNode.meritScore).toBe(initialMerit + 50);
    });

    it('should center on node by applying center velocity impulse and selecting it', () => {
      const targetNode = visualizer.nodes[3];
      visualizer.centerOnNode(targetNode.id);

      expect(visualizer.selectedNodeId).toBe(targetNode.id);
    });
  });

  // ─── 5. SEARCH, FILTER & SELECTION ──────────────────────────────────────────

  describe('5. Search, Role Filtering & Selection State', () => {
    it('should filter active roles with setRoleFilter', () => {
      visualizer.setRoleFilter('archon');
      expect(visualizer.activeRoleFilter).toBe('archon');

      visualizer.setRoleFilter('sentinel');
      expect(visualizer.activeRoleFilter).toBe('sentinel');

      visualizer.setRoleFilter('all');
      expect(visualizer.activeRoleFilter).toBe('all');
    });

    it('should update search query with handleSearchInput', () => {
      visualizer.handleSearchInput('Genesis');
      expect(visualizer.searchQuery).toBe('Genesis');

      visualizer.handleSearchInput('');
      expect(visualizer.searchQuery).toBe('');
    });

    it('should toggle node selection on click', () => {
      expect(visualizer.selectedNodeId).toBeNull();

      visualizer.handleNodeClick('node-archon-1');
      expect(visualizer.selectedNodeId).toBe('node-archon-1');

      visualizer.handleNodeClick('node-archon-1');
      expect(visualizer.selectedNodeId).toBeNull();
    });

    it('should update hover states', () => {
      visualizer.handleNodeMouseEnter('node-sentinel-2');
      expect(visualizer.hoveredNodeId).toBe('node-sentinel-2');

      visualizer.handleNodeMouseLeave();
      expect(visualizer.hoveredNodeId).toBeNull();
    });

    it('should control modal open, close, and toggle lifecycle', () => {
      expect(visualizer.isOpen).toBe(false);

      visualizer.open();
      expect(visualizer.isOpen).toBe(true);

      visualizer.close();
      expect(visualizer.isOpen).toBe(false);

      visualizer.toggle();
      expect(visualizer.isOpen).toBe(true);

      visualizer.toggle();
      expect(visualizer.isOpen).toBe(false);
    });
  });

  // ─── 6. SVG & HTML COMPONENT RENDERING ──────────────────────────────────────

  describe('6. Pure SVG & Modal HTML Template Rendering', () => {
    it('should render pure 800x500 SVG graph with defs, nodes, edges and tooltips layers', () => {
      const svg = visualizer.renderSVG();

      expect(svg).toContain('viewBox="0 0 800 500"');
      expect(svg).toContain('id="wot-canvas-glow"');
      expect(svg).toContain('id="wot-grid-pattern"');
      expect(svg).toContain('id="wot-gold-glow"');
      expect(svg).toContain('id="wot-cyan-glow"');
      expect(svg).toContain('id="wot-green-glow"');
      expect(svg).toContain('id="wot-edges-layer"');
      expect(svg).toContain('id="wot-nodes-layer"');
      expect(svg).toContain('id="wot-tooltips-layer"');
      expect(svg).toContain('Genesis-Arbiter');
      expect(svg).toContain('Mesh-Guardian');
    });

    it('should render interactive tooltip when a node is hovered', () => {
      visualizer.hoveredNodeId = 'node-archon-1';
      const svg = visualizer.renderSVG();

      expect(svg).toContain('id="wot-hover-tooltip"');
      expect(svg).toContain('Genesis-Arbiter');
      expect(svg).toContain('Archon Guardian');
      expect(svg).toContain('98%');
    });

    it('should render complete WoT graph modal when opened', () => {
      visualizer.open();
      const html = visualizer.renderWoTGraphModal();

      expect(html).toContain('id="wot-graph-modal-overlay"');
      expect(html).toContain('Web-of-Trust (WoT) Topology Graph');
      expect(html).toContain('id="btn-wot-refresh-sim"');
      expect(html).toContain('id="btn-wot-toggle-anim"');
      expect(html).toContain('id="btn-close-wot-modal"');
      expect(html).toContain('id="wot-telemetry-bar"');
      expect(html).toContain('id="wot-svg-viewport"');
      expect(html).toContain('id="wot-inspector-panel"');
      expect(html).toContain('id="wot-threshold-slider"');
      expect(html).toContain('id="wot-threshold-indicator"');
    });

    it('should render compact sidebar / rail trigger button', () => {
      const btnHtml = visualizer.renderWoTGraphButton();

      expect(btnHtml).toContain('id="btn-wot-graph-trigger"');
      expect(btnHtml).toContain('Trust Graph');
      expect(btnHtml).toContain('Nodes · WoT Sybil-Proof');
      expect(btnHtml).toContain('window.wotGraphViz?.open()');
      expect(btnHtml).toContain('bg-surface-raised');
    });
  });
});
(globalThis as any).__UREFY_DEMO_MODE__ = false;
