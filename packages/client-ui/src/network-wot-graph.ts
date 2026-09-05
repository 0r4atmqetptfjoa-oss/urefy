/**
 * Aetheris Omni-Sphere — Web-of-Trust (WoT) Interactive Graph Visualizer
 *
 * 100% Self-Contained, Strict TypeScript, Zero External Dependencies.
 * Pure SVG Force-Directed Layout Simulation Engine (Coulomb Repulsion + Hooke Attraction).
 *
 * Features:
 * 1. Force-directed physics layout with Coulomb repulsion, spring attraction, center gravity, and damping.
 * 2. Pure SVG 800x500 rendering with role-colored luminous nodes, glowing halos, trust edges, and badges.
 * 3. Interactive node dragging (mouse & pointer events with relative coordinate projection).
 * 4. Dynamic Trust Threshold slider (filters edges in real-time below threshold).
 * 5. Full glassmorphic modal with real-time WoT network metrics, node inspector card, search, and controls.
 * 6. Sidebar quick-launch button for Left Rail & Command Rail integration.
 */

import './window-augmentation.js';
import { serviceRegistry, SERVICES } from './service-registry.js';
import { safeRequestAnimationFrame, safeCancelAnimationFrame, debounce, throttle } from './dry-utils.js';

// ---------------------------------------------------------------------------
// 1. Data Structures & Interfaces
// ---------------------------------------------------------------------------

export type WoTRole = 'archon' | 'sentinel' | 'validator' | 'citizen';

export interface WoTNode {
  id: string;
  label: string;
  fingerprint: string;
  trustScore: number; // 0 - 100
  meritScore: number; // 0 - 5000+
  role: WoTRole;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isZKVerified: boolean;
  uptimePct: number;
  directVouches: number;
  isPinned?: boolean;
}

export interface WoTEdge {
  from: string;
  to: string;
  weight: number; // 0.0 - 1.0 (affinity / bandwidth)
  trustLevel: number; // 0 - 100 (threshold check)
  type: 'direct_vouch' | 'reputation_flow' | 'zk_attestation';
}

export interface WoTGraphStats {
  totalNodes: number;
  totalEdges: number;
  visibleEdges: number;
  avgTrustScore: number;
  archonCount: number;
  sentinelCount: number;
  validatorCount: number;
  citizenCount: number;
  networkDensity: number;
  maxFlowCapacity: number;
}

// ---------------------------------------------------------------------------
// 2. Constants & Role Palettes
// ---------------------------------------------------------------------------

export const ROLE_THEMES: Record<WoTRole, {
  label: string;
  color: string;
  glowColor: string;
  strokeColor: string;
  bgBadge: string;
  textBadge: string;
  borderBadge: string;
  icon: string;
  baseRadius: number;
}> = {
  archon: {
    label: 'Archon Guardian',
    color: '#f59e0b', // Amber/Gold
    glowColor: 'rgba(245, 158, 11, 0.45)',
    strokeColor: '#fbbf24',
    bgBadge: 'bg-amber-500/10',
    textBadge: 'text-amber',
    borderBadge: 'border-amber-500/30',
    icon: '👑',
    baseRadius: 18,
  },
  sentinel: {
    label: 'Mesh Sentinel',
    color: '#00e5ff', // Cyphr/Cyan
    glowColor: 'rgba(0, 229, 255, 0.45)',
    strokeColor: '#38bdf8',
    bgBadge: 'bg-cyan-500/10',
    textBadge: 'text-cyphr',
    borderBadge: 'border-cyan-500/30',
    icon: '🛡️',
    baseRadius: 15,
  },
  validator: {
    label: 'ZK Validator',
    color: '#22c55e', // Signal/Green
    glowColor: 'rgba(34, 197, 94, 0.45)',
    strokeColor: '#4ade80',
    bgBadge: 'bg-emerald-500/10',
    textBadge: 'text-signal',
    borderBadge: 'border-emerald-500/30',
    icon: '⚡',
    baseRadius: 13,
  },
  citizen: {
    label: 'Sovereign Citizen',
    color: '#94a3b8', // Gray/Slate
    glowColor: 'rgba(148, 163, 184, 0.3)',
    strokeColor: '#cbd5e1',
    bgBadge: 'bg-slate-500/10',
    textBadge: 'text-gray-300',
    borderBadge: 'border-slate-500/30',
    icon: '🌐',
    baseRadius: 11,
  },
};

// ---------------------------------------------------------------------------
// 3. Web-of-Trust Graph Visualizer Engine
// ---------------------------------------------------------------------------

export class WoTGraphVisualizer {
  public nodes: WoTNode[] = [];
  public edges: WoTEdge[] = [];
  public isOpen: boolean = false;
  public animationFrame: number | null = null;

  // Viewport & Physics Parameters
  public readonly width: number = 800;
  public readonly height: number = 500;
  public trustThreshold: number = 25; // 0 - 100 slider
  public isSimulating: boolean = true;
  public damping: number = 0.88;
  public repulsionK: number = 4600;
  public attractionK: number = 0.042;
  public centerGravity: number = 0.018;
  public maxVelocity: number = 8.0;

  // Interaction State
  public selectedNodeId: string | null = null;
  public hoveredNodeId: string | null = null;
  public draggedNodeId: string | null = null;
  public activeRoleFilter: 'all' | WoTRole = 'all';
  public searchQuery: string = '';

  private isDragging: boolean = false;
  private dragOffset: { x: number; y: number } = { x: 0, y: 0 };
  private boundMouseMoveListener: ((e: MouseEvent) => void) | null = null;
  private boundMouseUpListener: ((e: MouseEvent) => void) | null = null;
  private boundKeyDownListener: ((e: KeyboardEvent) => void) | null = null;
  private mouseMoveRafId: number | null = null;

  constructor() {
    this.initDefaultGraph();
  }

  // -------------------------------------------------------------------------
  // Topology Initialization & Generation
  // -------------------------------------------------------------------------

  public initDefaultGraph(): void {
    const rawNodes: Array<Omit<WoTNode, 'x' | 'y' | 'vx' | 'vy' | 'radius'>> = [
      // Archons (3)
      { id: 'node-archon-1', label: 'Genesis-Arbiter', fingerprint: '0x7F2B...C941', trustScore: 98, meritScore: 4950, role: 'archon', isZKVerified: true, uptimePct: 99.99, directVouches: 42 },
      { id: 'node-archon-2', label: 'Sovereign-Vault', fingerprint: '0x3E8A...D014', trustScore: 95, meritScore: 4620, role: 'archon', isZKVerified: true, uptimePct: 99.94, directVouches: 38 },
      { id: 'node-archon-3', label: 'Root-Attestor', fingerprint: '0x9B1C...EA82', trustScore: 92, meritScore: 4310, role: 'archon', isZKVerified: true, uptimePct: 99.88, directVouches: 35 },

      // Sentinels (5)
      { id: 'node-sentinel-1', label: 'Mesh-Guardian', fingerprint: '0x1A4F...B882', trustScore: 88, meritScore: 3580, role: 'sentinel', isZKVerified: true, uptimePct: 99.75, directVouches: 29 },
      { id: 'node-sentinel-2', label: 'Whisper-Router', fingerprint: '0x4D2E...77A1', trustScore: 84, meritScore: 3240, role: 'sentinel', isZKVerified: true, uptimePct: 99.60, directVouches: 26 },
      { id: 'node-sentinel-3', label: 'ZK-Gatekeeper', fingerprint: '0x88C1...33F4', trustScore: 82, meritScore: 3100, role: 'sentinel', isZKVerified: true, uptimePct: 99.52, directVouches: 24 },
      { id: 'node-sentinel-4', label: 'RLN-Nullifier', fingerprint: '0x5C90...44D8', trustScore: 79, meritScore: 2890, role: 'sentinel', isZKVerified: true, uptimePct: 99.40, directVouches: 21 },
      { id: 'node-sentinel-5', label: 'Entropy-Beacon', fingerprint: '0x2F71...EE09', trustScore: 76, meritScore: 2750, role: 'sentinel', isZKVerified: true, uptimePct: 99.30, directVouches: 19 },

      // Validators (6)
      { id: 'node-validator-1', label: 'Epoch-Finalizer', fingerprint: '0x6A33...901B', trustScore: 74, meritScore: 2380, role: 'validator', isZKVerified: true, uptimePct: 99.10, directVouches: 18 },
      { id: 'node-validator-2', label: 'Merkle-Aggregator', fingerprint: '0x99D4...112C', trustScore: 71, meritScore: 2190, role: 'validator', isZKVerified: true, uptimePct: 98.90, directVouches: 16 },
      { id: 'node-validator-3', label: 'Block-Witness', fingerprint: '0x33B7...889A', trustScore: 68, meritScore: 1980, role: 'validator', isZKVerified: true, uptimePct: 98.65, directVouches: 14 },
      { id: 'node-validator-4', label: 'State-Slasher', fingerprint: '0x7E21...440C', trustScore: 65, meritScore: 1820, role: 'validator', isZKVerified: true, uptimePct: 98.40, directVouches: 12 },
      { id: 'node-validator-5', label: 'Sybil-Inspector', fingerprint: '0x0D88...AA51', trustScore: 63, meritScore: 1690, role: 'validator', isZKVerified: true, uptimePct: 98.15, directVouches: 11 },
      { id: 'node-validator-6', label: 'Quorum-Scribe', fingerprint: '0x44A0...228E', trustScore: 60, meritScore: 1540, role: 'validator', isZKVerified: true, uptimePct: 97.90, directVouches: 10 },

      // Citizens (6)
      { id: 'node-citizen-1', label: 'Neo-Cypher', fingerprint: '0x11B3...990F', trustScore: 56, meritScore: 920, role: 'citizen', isZKVerified: true, uptimePct: 96.40, directVouches: 8 },
      { id: 'node-citizen-2', label: 'Matrix-Wanderer', fingerprint: '0x55E9...442D', trustScore: 51, meritScore: 780, role: 'citizen', isZKVerified: true, uptimePct: 95.80, directVouches: 6 },
      { id: 'node-citizen-3', label: 'Echo-Drifter', fingerprint: '0x8802...116B', trustScore: 45, meritScore: 610, role: 'citizen', isZKVerified: false, uptimePct: 94.20, directVouches: 4 },
      { id: 'node-citizen-4', label: 'Starlight-Node', fingerprint: '0x22C7...774E', trustScore: 40, meritScore: 490, role: 'citizen', isZKVerified: false, uptimePct: 93.50, directVouches: 3 },
      { id: 'node-citizen-5', label: 'Pulse-Weaver', fingerprint: '0x77F1...339A', trustScore: 34, meritScore: 350, role: 'citizen', isZKVerified: false, uptimePct: 91.80, directVouches: 2 },
      { id: 'node-citizen-6', label: 'Sovereign-Peer', fingerprint: '0x00A4...8851', trustScore: 28, meritScore: 210, role: 'citizen', isZKVerified: false, uptimePct: 89.40, directVouches: 1 },
    ];

    const centerX = this.width / 2;
    const centerY = this.height / 2;

    this.nodes = rawNodes.map((n, idx) => {
      const angle = (idx / rawNodes.length) * 2 * Math.PI + (Math.random() * 0.4 - 0.2);
      const dist = 80 + Math.random() * 140;
      const theme = ROLE_THEMES[n.role];
      const radius = theme.baseRadius + (n.trustScore / 100) * 6;

      return {
        ...n,
        x: centerX + Math.cos(angle) * dist,
        y: centerY + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        radius,
      };
    });

    this.edges = [
      // Archon inter-trust backbone (Gold standard)
      { from: 'node-archon-1', to: 'node-archon-2', weight: 0.98, trustLevel: 98, type: 'zk_attestation' },
      { from: 'node-archon-2', to: 'node-archon-3', weight: 0.95, trustLevel: 95, type: 'zk_attestation' },
      { from: 'node-archon-3', to: 'node-archon-1', weight: 0.94, trustLevel: 94, type: 'zk_attestation' },

      // Archons vouching for Sentinels
      { from: 'node-archon-1', to: 'node-sentinel-1', weight: 0.90, trustLevel: 91, type: 'direct_vouch' },
      { from: 'node-archon-1', to: 'node-sentinel-2', weight: 0.85, trustLevel: 86, type: 'direct_vouch' },
      { from: 'node-archon-2', to: 'node-sentinel-3', weight: 0.88, trustLevel: 89, type: 'direct_vouch' },
      { from: 'node-archon-2', to: 'node-sentinel-4', weight: 0.82, trustLevel: 83, type: 'direct_vouch' },
      { from: 'node-archon-3', to: 'node-sentinel-5', weight: 0.84, trustLevel: 85, type: 'direct_vouch' },
      { from: 'node-archon-3', to: 'node-sentinel-1', weight: 0.80, trustLevel: 82, type: 'direct_vouch' },

      // Sentinel mesh interconnects
      { from: 'node-sentinel-1', to: 'node-sentinel-2', weight: 0.78, trustLevel: 80, type: 'reputation_flow' },
      { from: 'node-sentinel-2', to: 'node-sentinel-3', weight: 0.75, trustLevel: 78, type: 'reputation_flow' },
      { from: 'node-sentinel-3', to: 'node-sentinel-4', weight: 0.74, trustLevel: 77, type: 'reputation_flow' },
      { from: 'node-sentinel-4', to: 'node-sentinel-5', weight: 0.72, trustLevel: 75, type: 'reputation_flow' },
      { from: 'node-sentinel-5', to: 'node-sentinel-1', weight: 0.70, trustLevel: 74, type: 'reputation_flow' },

      // Sentinel to Validator links
      { from: 'node-sentinel-1', to: 'node-validator-1', weight: 0.75, trustLevel: 76, type: 'direct_vouch' },
      { from: 'node-sentinel-2', to: 'node-validator-2', weight: 0.72, trustLevel: 73, type: 'direct_vouch' },
      { from: 'node-sentinel-3', to: 'node-validator-3', weight: 0.68, trustLevel: 70, type: 'direct_vouch' },
      { from: 'node-sentinel-4', to: 'node-validator-4', weight: 0.65, trustLevel: 67, type: 'direct_vouch' },
      { from: 'node-sentinel-5', to: 'node-validator-5', weight: 0.63, trustLevel: 65, type: 'direct_vouch' },
      { from: 'node-sentinel-1', to: 'node-validator-6', weight: 0.60, trustLevel: 62, type: 'direct_vouch' },

      // Validator internal validation ring
      { from: 'node-validator-1', to: 'node-validator-2', weight: 0.66, trustLevel: 68, type: 'reputation_flow' },
      { from: 'node-validator-2', to: 'node-validator-3', weight: 0.62, trustLevel: 64, type: 'reputation_flow' },
      { from: 'node-validator-3', to: 'node-validator-4', weight: 0.58, trustLevel: 61, type: 'reputation_flow' },
      { from: 'node-validator-4', to: 'node-validator-5', weight: 0.55, trustLevel: 58, type: 'reputation_flow' },
      { from: 'node-validator-5', to: 'node-validator-6', weight: 0.52, trustLevel: 55, type: 'reputation_flow' },

      // Validator to Citizen vouchers
      { from: 'node-validator-1', to: 'node-citizen-1', weight: 0.54, trustLevel: 56, type: 'direct_vouch' },
      { from: 'node-validator-2', to: 'node-citizen-2', weight: 0.48, trustLevel: 50, type: 'direct_vouch' },
      { from: 'node-validator-3', to: 'node-citizen-3', weight: 0.42, trustLevel: 44, type: 'direct_vouch' },
      { from: 'node-validator-4', to: 'node-citizen-4', weight: 0.38, trustLevel: 39, type: 'direct_vouch' },
      { from: 'node-validator-5', to: 'node-citizen-5', weight: 0.32, trustLevel: 33, type: 'direct_vouch' },
      { from: 'node-validator-6', to: 'node-citizen-6', weight: 0.26, trustLevel: 27, type: 'direct_vouch' },

      // Peer-to-peer citizen interactions
      { from: 'node-citizen-1', to: 'node-citizen-2', weight: 0.44, trustLevel: 46, type: 'reputation_flow' },
      { from: 'node-citizen-2', to: 'node-citizen-3', weight: 0.35, trustLevel: 38, type: 'reputation_flow' },
      { from: 'node-citizen-3', to: 'node-citizen-4', weight: 0.28, trustLevel: 30, type: 'reputation_flow' },
      { from: 'node-citizen-4', to: 'node-citizen-5', weight: 0.22, trustLevel: 24, type: 'reputation_flow' },
      { from: 'node-citizen-5', to: 'node-citizen-6', weight: 0.18, trustLevel: 19, type: 'reputation_flow' },
      { from: 'node-sentinel-2', to: 'node-citizen-1', weight: 0.50, trustLevel: 52, type: 'direct_vouch' },
    ];
  }

  public regenerateGraph(): void {
    const count = 18 + Math.floor(Math.random() * 6); // 18-23 nodes

    const generatedNodes: WoTNode[] = [];
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    for (let i = 0; i < count; i++) {
      let role: WoTRole;
      if (i < 3) role = 'archon';
      else if (i < 8) role = 'sentinel';
      else if (i < 14) role = 'validator';
      else role = 'citizen';

      const trustScore = role === 'archon' ? 90 + Math.floor(Math.random() * 10)
        : role === 'sentinel' ? 75 + Math.floor(Math.random() * 15)
        : role === 'validator' ? 58 + Math.floor(Math.random() * 17)
        : 20 + Math.floor(Math.random() * 38);

      const meritScore = Math.floor(trustScore * 48 + Math.random() * 300);
      const angle = (i / count) * 2 * Math.PI + (Math.random() * 0.4 - 0.2);
      const dist = 70 + Math.random() * 150;
      const theme = ROLE_THEMES[role];
      const radius = theme.baseRadius + (trustScore / 100) * 6;
      const hex = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0').toUpperCase();

      generatedNodes.push({
        id: `node-gen-${i + 1}`,
        label: `${role.charAt(0).toUpperCase() + role.slice(1)}-${(i + 1).toString().padStart(2, '0')}`,
        fingerprint: `0x${hex.slice(0, 4)}...${hex.slice(4)}`,
        trustScore,
        meritScore,
        role,
        x: centerX + Math.cos(angle) * dist,
        y: centerY + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        radius,
        isZKVerified: trustScore > 50,
        uptimePct: Number((90 + Math.random() * 9.99).toFixed(2)),
        directVouches: Math.floor(trustScore / 2.5),
      });
    }

    // Generate balanced random edges
    const generatedEdges: WoTEdge[] = [];
    const edgeSet = new Set<string>();

    for (let i = 0; i < generatedNodes.length; i++) {
      const source = generatedNodes[i];
      const degree = source.role === 'archon' ? 4 + Math.floor(Math.random() * 3)
        : source.role === 'sentinel' ? 3 + Math.floor(Math.random() * 3)
        : source.role === 'validator' ? 2 + Math.floor(Math.random() * 3)
        : 1 + Math.floor(Math.random() * 2);

      for (let d = 0; d < degree; d++) {
        const targetIdx = Math.floor(Math.random() * generatedNodes.length);
        if (targetIdx === i) continue;
        const target = generatedNodes[targetIdx];
        const key1 = `${source.id}->${target.id}`;
        const key2 = `${target.id}->${source.id}`;
        if (edgeSet.has(key1) || edgeSet.has(key2)) continue;

        edgeSet.add(key1);
        const avgTrust = Math.round((source.trustScore + target.trustScore) / 2);
        const weight = Number((0.2 + (avgTrust / 100) * 0.78).toFixed(2));
        const type = avgTrust > 85 ? 'zk_attestation' : avgTrust > 60 ? 'direct_vouch' : 'reputation_flow';

        generatedEdges.push({
          from: source.id,
          to: target.id,
          weight,
          trustLevel: avgTrust,
          type,
        });
      }
    }

    this.nodes = generatedNodes;
    this.edges = generatedEdges;
    this.selectedNodeId = null;
    this.hoveredNodeId = null;
    this.updateModalTelemetry();
    this.updateSVGDOM();
  }

  // -------------------------------------------------------------------------
  // Force-Directed Physics Simulation Engine
  // -------------------------------------------------------------------------

  /**
   * One discrete step of Coulomb-Hooke physics simulation.
   */
  public simulateStep(): void {
    const nodeCount = this.nodes.length;
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // 1. Coulomb Repulsion between all node pairs: force = -k / (d^2 + epsilon)
    for (let i = 0; i < nodeCount; i++) {
      const n1 = this.nodes[i];
      for (let j = i + 1; j < nodeCount; j++) {
        const n2 = this.nodes[j];
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq) || 0.1;

        if (dist < 320) {
          // Repulsive force inversely proportional to distance squared
          const force = (this.repulsionK) / (distSq + 120);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (!n1.isPinned && n1.id !== this.draggedNodeId) {
            n1.vx -= fx;
            n1.vy -= fy;
          }
          if (!n2.isPinned && n2.id !== this.draggedNodeId) {
            n2.vx += fx;
            n2.vy += fy;
          }
        }
      }
    }

    // 2. Hooke's Law Spring Attraction on active edges: force = k * (d - idealDistance)
    const nodeMap = new Map<string, WoTNode>(this.nodes.map(n => [n.id, n]));
    for (const edge of this.edges) {
      if (edge.trustLevel < this.trustThreshold) continue;

      const source = nodeMap.get(edge.from);
      const target = nodeMap.get(edge.to);
      if (!source || !target) continue;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
      const idealDist = 130 - (edge.weight * 45); // Higher weight = shorter spring
      const springForce = this.attractionK * (dist - idealDist) * edge.weight;

      const fx = (dx / dist) * springForce;
      const fy = (dy / dist) * springForce;

      if (!source.isPinned && source.id !== this.draggedNodeId) {
        source.vx += fx;
        source.vy += fy;
      }
      if (!target.isPinned && target.id !== this.draggedNodeId) {
        target.vx -= fx;
        target.vy -= fy;
      }
    }

    // 3. Center Gravity & Velocity Integration with Damping and Boundary Clamping
    for (const node of this.nodes) {
      if (node.isPinned || node.id === this.draggedNodeId) {
        node.vx = 0;
        node.vy = 0;
        continue;
      }

      // Center gravity pull
      const cdx = centerX - node.x;
      const cdy = centerY - node.y;
      node.vx += cdx * this.centerGravity;
      node.vy += cdy * this.centerGravity;

      // Apply damping / friction
      node.vx *= this.damping;
      node.vy *= this.damping;

      // Speed limit clamp
      const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
      if (speed > this.maxVelocity) {
        node.vx = (node.vx / speed) * this.maxVelocity;
        node.vy = (node.vy / speed) * this.maxVelocity;
      }

      // Update positions
      node.x += node.vx;
      node.y += node.vy;

      // Soft boundary collision confinement
      const pad = node.radius + 16;
      if (node.x < pad) {
        node.x = pad;
        node.vx = Math.abs(node.vx) * 0.4;
      } else if (node.x > this.width - pad) {
        node.x = this.width - pad;
        node.vx = -Math.abs(node.vx) * 0.4;
      }

      if (node.y < pad) {
        node.y = pad;
        node.vy = Math.abs(node.vy) * 0.4;
      } else if (node.y > this.height - pad) {
        node.y = this.height - pad;
        node.vy = -Math.abs(node.vy) * 0.4;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Animation Loop Controls
  // -------------------------------------------------------------------------

  public startAnimation(): void {
    if (this.animationFrame !== null) return;
    this.isSimulating = true;

    const loop = () => {
      if (!this.isOpen || !this.isSimulating) {
        this.animationFrame = null;
        return;
      }
      this.simulateStep();
      this.updateSVGDOM();
      this.animationFrame = requestAnimationFrame(loop);
    };

    this.animationFrame = requestAnimationFrame(loop);
  }

  public stopAnimation(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    this.isSimulating = false;
  }

  public toggleAnimation(): void {
    if (this.isSimulating) {
      this.stopAnimation();
    } else {
      this.startAnimation();
    }
    this.updateControlsUI();
  }

  // -------------------------------------------------------------------------
  // Telemetry & Statistics
  // -------------------------------------------------------------------------

  public getStats(): WoTGraphStats {
    const visibleEdges = this.edges.filter(e => e.trustLevel >= this.trustThreshold).length;
    const avgTrust = this.nodes.length > 0
      ? Number((this.nodes.reduce((acc, n) => acc + n.trustScore, 0) / this.nodes.length).toFixed(1))
      : 0;

    let archons = 0;
    let sentinels = 0;
    let validators = 0;
    let citizens = 0;

    for (const n of this.nodes) {
      if (n.role === 'archon') archons++;
      else if (n.role === 'sentinel') sentinels++;
      else if (n.role === 'validator') validators++;
      else citizens++;
    }

    const maxPossibleEdges = (this.nodes.length * (this.nodes.length - 1)) / 2;
    const networkDensity = maxPossibleEdges > 0
      ? Number(((visibleEdges / maxPossibleEdges) * 100).toFixed(1))
      : 0;

    const maxFlow = Number((avgTrust * 0.12 * (visibleEdges / (this.nodes.length || 1))).toFixed(2));

    return {
      totalNodes: this.nodes.length,
      totalEdges: this.edges.length,
      visibleEdges,
      avgTrustScore: avgTrust,
      archonCount: archons,
      sentinelCount: sentinels,
      validatorCount: validators,
      citizenCount: citizens,
      networkDensity,
      maxFlowCapacity: maxFlow,
    };
  }

  // -------------------------------------------------------------------------
  // Pure SVG Rendering Engine (800x500 Canvas)
  // -------------------------------------------------------------------------

  public renderSVG(): string {
    const nodeMap = new Map<string, WoTNode>(this.nodes.map(n => [n.id, n]));
    const visibleEdges = this.edges.filter(e => e.trustLevel >= this.trustThreshold);
    const activeFocusNodeId = this.hoveredNodeId || this.selectedNodeId;
    const hoveredNode = this.hoveredNodeId ? nodeMap.get(this.hoveredNodeId) : null;

    // Filter nodes if search query or role filter active
    const searchLower = this.searchQuery.trim().toLowerCase();

    // 1. Defs & Gradients
    const defs = `
      <defs>
        <!-- Radial Canvas Background -->
        <radialGradient id="wot-canvas-glow" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stop-color="#1e293b" stop-opacity="0.25" />
          <stop offset="100%" stop-color="#0d0f14" stop-opacity="0.95" />
        </radialGradient>

        <!-- Subtle Grid Pattern -->
        <pattern id="wot-grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.03)" stroke-width="1" />
          <circle cx="40" cy="40" r="1" fill="rgba(0, 229, 255, 0.15)" />
        </pattern>

        <!-- Luminous Halo Filters -->
        <filter id="wot-gold-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="wot-cyan-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="wot-green-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <!-- Directed Trust Flow Arrowhead Markers -->
        <marker id="wot-arrow-gold" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 1 L 9 5 L 0 9 z" fill="#f59e0b" opacity="0.8" />
        </marker>
        <marker id="wot-arrow-cyan" viewBox="0 0 10 10" refX="20" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 1 L 9 5 L 0 9 z" fill="#00e5ff" opacity="0.8" />
        </marker>
        <marker id="wot-arrow-default" viewBox="0 0 10 10" refX="18" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M 0 1 L 8 5 L 0 9 z" fill="#64748b" opacity="0.5" />
        </marker>
      </defs>
    `;

    // 2. Edges Rendering
    const edgesMarkup = visibleEdges.map(edge => {
      const source = nodeMap.get(edge.from);
      const target = nodeMap.get(edge.to);
      if (!source || !target) return '';

      const isConnectedToFocus = activeFocusNodeId ? (edge.from === activeFocusNodeId || edge.to === activeFocusNodeId) : false;
      const isDimmed = activeFocusNodeId ? !isConnectedToFocus : false;

      let strokeColor = '#475569';
      let strokeWidth = 1 + (edge.weight * 2.5);
      let opacity = 0.18 + (edge.weight * 0.55);
      let marker = 'url(#wot-arrow-default)';

      if (isConnectedToFocus) {
        strokeColor = edge.from === activeFocusNodeId ? '#00e5ff' : '#a855f7';
        strokeWidth = 2.8;
        opacity = 0.95;
        marker = 'url(#wot-arrow-cyan)';
      } else if (isDimmed) {
        opacity = 0.05;
      } else if (edge.type === 'zk_attestation') {
        strokeColor = '#f59e0b';
        opacity = 0.75;
        marker = 'url(#wot-arrow-gold)';
      } else if (edge.type === 'direct_vouch') {
        strokeColor = '#00e5ff';
        opacity = 0.45;
      }

      return `
        <line
          id="wot-edge-${edge.from}-${edge.to}"
          x1="${source.x.toFixed(2)}"
          y1="${source.y.toFixed(2)}"
          x2="${target.x.toFixed(2)}"
          y2="${target.y.toFixed(2)}"
          stroke="${strokeColor}"
          stroke-width="${strokeWidth.toFixed(2)}"
          stroke-opacity="${opacity.toFixed(2)}"
          stroke-dasharray="${edge.type === 'reputation_flow' ? '4 3' : 'none'}"
          marker-end="${marker}"
          class="transition-colors duration-150"
        />
      `;
    }).join('');

    // 3. Nodes Rendering
    const nodesMarkup = this.nodes.map(node => {
      const theme = ROLE_THEMES[node.role];
      const isSelected = this.selectedNodeId === node.id;
      const isHovered = this.hoveredNodeId === node.id;
      const matchesSearch = searchLower === '' || node.label.toLowerCase().includes(searchLower) || node.fingerprint.toLowerCase().includes(searchLower);
      const matchesRole = this.activeRoleFilter === 'all' || node.role === this.activeRoleFilter;
      const isMuted = !matchesSearch || !matchesRole;

      const filterStyle = node.role === 'archon' ? 'filter="url(#wot-gold-glow)"'
        : node.role === 'sentinel' ? 'filter="url(#wot-cyan-glow)"'
        : node.role === 'validator' ? 'filter="url(#wot-green-glow)"' : '';

      const nodeOpacity = isMuted ? 0.2 : 1.0;
      const strokeHighlight = isSelected ? '#ffffff' : isHovered ? '#00e5ff' : theme.strokeColor;
      const strokeWidth = isSelected ? 3.5 : isHovered ? 2.8 : 1.8;

      return `
        <g
          id="wot-node-${node.id}"
          transform="translate(${node.x.toFixed(2)}, ${node.y.toFixed(2)})"
          opacity="${nodeOpacity}"
          class="cursor-pointer select-none transition-opacity duration-150" data-mousedown="call-global" data-raw-mousedown="window.wotGraphViz?.handleNodeMouseDown(event, '${node.id}')"
          onmouseenter="window.wotGraphViz?.handleNodeMouseEnter('${node.id}')"
          onmouseleave="window.wotGraphViz?.handleNodeMouseLeave()" data-action="call-global" data-raw-click="window.wotGraphViz?.handleNodeClick('${node.id}')"
        >
          <!-- Pulsing Outer Halo for Archons & Sentinels -->
          ${(node.role === 'archon' || node.role === 'sentinel') && !isMuted ? `
            <circle r="${(node.radius + 6).toFixed(1)}" fill="none" stroke="${theme.color}" stroke-opacity="0.22" stroke-width="1.5">
              <animate attributeName="r" values="${node.radius + 4};${node.radius + 10};${node.radius + 4}" dur="${node.role === 'archon' ? '3s' : '4s'}" repeatCount="indefinite" />
              <animate attributeName="stroke-opacity" values="0.35;0.05;0.35" dur="${node.role === 'archon' ? '3s' : '4s'}" repeatCount="indefinite" />
            </circle>
          ` : ''}

          <!-- Base Glow Circle -->
          <circle
            r="${node.radius.toFixed(1)}"
            fill="#12151c"
            stroke="${strokeHighlight}"
            stroke-width="${strokeWidth}"
            ${filterStyle}
          />

          <!-- Inner Core Tint -->
          <circle
            r="${(node.radius * 0.75).toFixed(1)}"
            fill="${theme.color}"
            fill-opacity="${isSelected ? 0.55 : 0.28}"
          />

          <!-- Center Role Glyph or Trust Icon -->
          <text
            y="4"
            font-size="${(node.radius * 0.8).toFixed(1)}"
            text-anchor="middle"
            fill="#ffffff"
            font-weight="bold"
            class="pointer-events-none font-mono"
          >${node.role === 'archon' ? '👑' : node.role === 'sentinel' ? '🛡️' : node.role === 'validator' ? '⚡' : '🌐'}</text>

          <!-- Label / Fingerprint Text Beneath Node -->
          <text
            y="${(node.radius + 14).toFixed(1)}"
            font-size="10"
            font-family="monospace"
            text-anchor="middle"
            fill="${isSelected ? '#00e5ff' : isHovered ? '#ffffff' : '#94a3b8'}"
            font-weight="${isSelected || isHovered ? 'bold' : 'normal'}"
            class="pointer-events-none"
          >${node.label}</text>

          <!-- ZK Badge Indicator Dot -->
          ${node.isZKVerified ? `
            <circle
              cx="${(node.radius * 0.7).toFixed(1)}"
              cy="${(-node.radius * 0.7).toFixed(1)}"
              r="4.5"
              fill="#00e5ff"
              stroke="#0d0f14"
              stroke-width="1.5"
            />
          ` : ''}
        </g>
      `;
    }).join('');

    // 4. Interactive Hover Tooltip inside SVG
    let tooltipMarkup = '';
    if (hoveredNode) {
      const theme = ROLE_THEMES[hoveredNode.role];
      const tooltipW = 210;
      const tooltipH = 100;
      let ttX = hoveredNode.x + hoveredNode.radius + 14;
      let ttY = hoveredNode.y - tooltipH / 2;

      // Keep tooltip within bounds
      if (ttX + tooltipW > this.width - 15) ttX = hoveredNode.x - tooltipW - hoveredNode.radius - 14;
      if (ttY < 15) ttY = 15;
      if (ttY + tooltipH > this.height - 15) ttY = this.height - tooltipH - 15;

      tooltipMarkup = `
        <g id="wot-hover-tooltip" transform="translate(${ttX.toFixed(1)}, ${ttY.toFixed(1)})" class="pointer-events-none transition-transform duration-100">
          <rect width="${tooltipW}" height="${tooltipH}" rx="8" fill="#161b26" stroke="${theme.color}" stroke-width="1.5" stroke-opacity="0.8" fill-opacity="0.95" filter="drop-shadow(0 8px 16px rgba(0,0,0,0.6))" />
          <text x="12" y="22" fill="#ffffff" font-size="12" font-weight="bold" font-family="sans-serif">${hoveredNode.label}</text>
          <text x="12" y="38" fill="#00e5ff" font-size="10" font-family="monospace">${hoveredNode.fingerprint}</text>
          <line x1="12" y1="46" x2="${tooltipW - 12}" y2="46" stroke="rgba(255,255,255,0.1)" stroke-width="1" />
          
          <text x="12" y="62" fill="#94a3b8" font-size="10" font-family="sans-serif">Role: <tspan fill="${theme.color}" font-weight="bold">${theme.label}</tspan></text>
          <text x="12" y="77" fill="#94a3b8" font-size="10" font-family="sans-serif">Trust: <tspan fill="#ffffff" font-weight="bold">${hoveredNode.trustScore}%</tspan> · Merit: <tspan fill="#a855f7" font-weight="bold">${hoveredNode.meritScore}</tspan></text>
          <text x="12" y="91" fill="#94a3b8" font-size="9" font-family="sans-serif">Vouches: <tspan fill="#22c55e">${hoveredNode.directVouches}</tspan> · ZK: <tspan fill="${hoveredNode.isZKVerified ? '#00e5ff' : '#ef4444'}">${hoveredNode.isZKVerified ? 'Attested' : 'Unverified'}</tspan></text>
        </g>
      `;
    }

    return `
      <svg
        id="wot-graph-canvas"
        viewBox="0 0 ${this.width} ${this.height}"
        class="w-full h-full block select-none bg-canvas rounded-xl shadow-inner border border-white/5"
        xmlns="http://www.w3.org/2000/svg"
        onmousemove="window.wotGraphViz?.handleCanvasMouseMove(event)" data-mouseup="call-global" data-raw-mouseup="window.wotGraphViz?.handleCanvasMouseUp()"
        onmouseleave="window.wotGraphViz?.handleCanvasMouseUp()"
      >
        ${defs}
        <!-- Canvas Background -->
        <rect width="${this.width}" height="${this.height}" fill="url(#wot-canvas-glow)" rx="12" />
        <rect width="${this.width}" height="${this.height}" fill="url(#wot-grid-pattern)" rx="12" />

        <!-- Graph Layers -->
        <g id="wot-edges-layer">${edgesMarkup}</g>
        <g id="wot-nodes-layer">${nodesMarkup}</g>
        <g id="wot-tooltips-layer">${tooltipMarkup}</g>
      </svg>
    `;
  }

  // -------------------------------------------------------------------------
  // Modal & Inspector UI
  // -------------------------------------------------------------------------

  public renderWoTGraphModal(): string {
    if (!this.isOpen) return '';

    const stats = this.getStats();
    const selectedNode = this.selectedNodeId ? this.nodes.find(n => n.id === this.selectedNodeId) : (this.nodes[0] || null);
    const selectedTheme = selectedNode ? ROLE_THEMES[selectedNode.role] : null;

    // Find direct vouches for selected node
    const incomingVouches = selectedNode ? this.edges.filter(e => e.to === selectedNode.id && e.trustLevel >= this.trustThreshold) : [];
    const outgoingVouches = selectedNode ? this.edges.filter(e => e.from === selectedNode.id && e.trustLevel >= this.trustThreshold) : [];

    return `
      <div id="wot-graph-modal-overlay" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
        <div class="w-full max-w-6xl bg-surface-base border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] font-sans">
          
          <!-- Header Bar -->
          <div class="px-5 py-4 border-subtle-b bg-surface-raised/80 flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyphr text-lg shadow-sm">
                🕸️
              </div>
              <div>
                <div class="flex items-center space-x-2">
                  <h2 class="text-base font-bold text-white tracking-wide">Web-of-Trust (WoT) Topology Graph</h2>
                  <span class="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyphr">D3-Style Pure SVG</span>
                </div>
                <p class="text-xs text-gray-400">Decentralized topological visualizer · Coulomb-Hooke force algorithm · Sybil resistant</p>
              </div>
            </div>

            <!-- Header Actions -->
            <div class="flex items-center space-x-2">
              <button
                id="btn-wot-refresh-sim" data-action="call-global" data-raw-click="window.wotGraphViz?.regenerateGraph()"
                class="px-3 py-1.5 rounded-lg bg-surface-overlay hover:bg-surface-highlight border border-white/10 text-gray-200 hover:text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm"
                title="Regenerate graph with new parameters"
              >
                <span>🎲</span>
                <span class="hidden sm:inline">Regenerate Graph</span>
              </button>

              <button
                id="btn-wot-toggle-anim" data-action="call-global" data-raw-click="window.wotGraphViz?.toggleAnimation()"
                class="px-3 py-1.5 rounded-lg ${this.isSimulating ? 'bg-amber-500/10 border-amber-500/30 text-amber' : 'bg-surface-overlay border-white/10 text-gray-300'} border text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm"
              >
                <span>${this.isSimulating ? '⏸' : '▶'}</span>
                <span class="hidden sm:inline">${this.isSimulating ? 'Pause Physics' : 'Resume Physics'}</span>
              </button>

              <button
                id="btn-close-wot-modal" data-action="call-global" data-raw-click="window.__aetheris_close_wot_graph && window.__aetheris_close_wot_graph()"
                class="w-8 h-8 rounded-lg bg-surface-overlay hover:bg-crimson/20 border border-white/10 hover:border-crimson/40 text-gray-400 hover:text-crimson flex items-center justify-center text-sm transition-all cursor-pointer"
                title="Close modal (Esc)"
              >
                ✕
              </button>
            </div>
          </div>

          <!-- Network Telemetry Metric Chips -->
          <div id="wot-telemetry-bar" class="px-5 py-2.5 bg-surface-base border-subtle-b grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
            <div class="px-3 py-1.5 rounded-lg bg-surface-raised border border-white/5 flex flex-col">
              <span class="text-[10px] text-gray-400 uppercase font-mono">Active Nodes</span>
              <span class="text-sm font-bold text-white font-mono">${stats.totalNodes}</span>
            </div>
            <div class="px-3 py-1.5 rounded-lg bg-surface-raised border border-white/5 flex flex-col">
              <span class="text-[10px] text-gray-400 uppercase font-mono">Trust Connections</span>
              <span class="text-sm font-bold text-cyphr font-mono">${stats.visibleEdges} <span class="text-[10px] text-gray-500">/ ${stats.totalEdges}</span></span>
            </div>
            <div class="px-3 py-1.5 rounded-lg bg-surface-raised border border-white/5 flex flex-col">
              <span class="text-[10px] text-gray-400 uppercase font-mono">Average Trust</span>
              <span class="text-sm font-bold text-signal font-mono">${stats.avgTrustScore}%</span>
            </div>
            <div class="px-3 py-1.5 rounded-lg bg-surface-raised border border-white/5 flex flex-col">
              <span class="text-[10px] text-gray-400 uppercase font-mono">Network Density</span>
              <span class="text-sm font-bold text-aether font-mono">${stats.networkDensity}%</span>
            </div>
            <div class="px-3 py-1.5 rounded-lg bg-surface-raised border border-white/5 flex flex-col">
              <span class="text-[10px] text-gray-400 uppercase font-mono">Max-Flow Capacity</span>
              <span class="text-sm font-bold text-amber font-mono">${stats.maxFlowCapacity} Gb/s</span>
            </div>
            <div class="px-3 py-1.5 rounded-lg bg-surface-raised border border-white/5 flex flex-col">
              <span class="text-[10px] text-gray-400 uppercase font-mono">Filter Threshold</span>
              <span id="wot-stat-threshold-val" class="text-sm font-bold text-white font-mono">≥ ${this.trustThreshold}%</span>
            </div>
          </div>

          <!-- Main Visualizer Area (SVG + Node Inspector Sidebar) -->
          <div class="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 overflow-y-auto">
            
            <!-- Left 8/12: SVG Graph Canvas -->
            <div class="lg:col-span-8 flex flex-col space-y-3 min-h-[380px] lg:min-h-[480px]">
              
              <!-- Filter Controls Bar above SVG -->
              <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
                <!-- Role Filter Pills -->
                <div class="flex items-center space-x-1.5 bg-surface-raised p-1 rounded-xl border border-white/5">
                  <button data-action="call-global" data-raw-click="window.wotGraphViz?.setRoleFilter('all')"
                    class="px-2.5 py-1 rounded-lg font-medium transition-all ${this.activeRoleFilter === 'all' ? 'bg-cyan-500/20 text-cyphr border border-cyan-500/30' : 'text-gray-400 hover:text-white'}"
                  >All (${stats.totalNodes})</button>
                  <button data-action="call-global" data-raw-click="window.wotGraphViz?.setRoleFilter('archon')"
                    class="px-2.5 py-1 rounded-lg font-medium transition-all ${this.activeRoleFilter === 'archon' ? 'bg-amber-500/20 text-amber border border-amber-500/30' : 'text-gray-400 hover:text-white'}"
                  >👑 Archon (${stats.archonCount})</button>
                  <button data-action="call-global" data-raw-click="window.wotGraphViz?.setRoleFilter('sentinel')"
                    class="px-2.5 py-1 rounded-lg font-medium transition-all ${this.activeRoleFilter === 'sentinel' ? 'bg-cyan-500/20 text-cyphr border border-cyan-500/30' : 'text-gray-400 hover:text-white'}"
                  >🛡️ Sentinel (${stats.sentinelCount})</button>
                  <button data-action="call-global" data-raw-click="window.wotGraphViz?.setRoleFilter('validator')"
                    class="px-2.5 py-1 rounded-lg font-medium transition-all ${this.activeRoleFilter === 'validator' ? 'bg-emerald-500/20 text-signal border border-emerald-500/30' : 'text-gray-400 hover:text-white'}"
                  >⚡ Validator (${stats.validatorCount})</button>
                  <button data-action="call-global" data-raw-click="window.wotGraphViz?.setRoleFilter('citizen')"
                    class="px-2.5 py-1 rounded-lg font-medium transition-all ${this.activeRoleFilter === 'citizen' ? 'bg-slate-500/20 text-gray-200 border border-slate-500/30' : 'text-gray-400 hover:text-white'}"
                  >🌐 Citizen (${stats.citizenCount})</button>
                </div>

                <!-- Quick Search Input -->
                <div class="relative w-full sm:w-48">
                  <input
                    id="wot-search-input"
                    type="text"
                    value="${this.escapeHtml(this.searchQuery)}"
                    placeholder="Search fingerprint / alias..." data-input="call-global" data-raw-input="window.wotGraphViz?.handleSearchInput(this.value)"
                    class="w-full bg-surface-raised border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                  />
                  ${this.searchQuery ? `
                    <button data-action="call-global" data-raw-click="window.wotGraphViz?.handleSearchInput('')" class="absolute right-2.5 top-1.5 text-gray-400 hover:text-white text-xs">✕</button>
                  ` : ''}
                </div>
              </div>

              <!-- SVG Canvas Container -->
              <div id="wot-svg-viewport" class="flex-1 relative rounded-xl border border-white/10 bg-canvas overflow-hidden shadow-inner flex items-center justify-center">
                ${this.renderSVG()}

                <!-- Floating Canvas Helper Legend -->
                <div class="absolute bottom-3 left-3 bg-surface-base/90 backdrop-blur-md border border-white/10 rounded-lg px-3 py-2 text-[10px] text-gray-300 space-y-1 shadow-md pointer-events-none">
                  <div class="flex items-center space-x-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span><span class="text-amber">Archon (90-100%)</span>
                    <span class="w-2.5 h-2.5 rounded-full bg-cyan-400 ml-2"></span><span class="text-cyphr">Sentinel (75-89%)</span>
                  </div>
                  <div class="flex items-center space-x-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span><span class="text-signal">Validator (60-74%)</span>
                    <span class="w-2.5 h-2.5 rounded-full bg-slate-400 ml-2"></span><span class="text-gray-400">Citizen (&lt;60%)</span>
                  </div>
                </div>

                <!-- Simulation Status Indicator -->
                <div class="absolute top-3 left-3 bg-surface-base/85 backdrop-blur-md border border-white/10 rounded-md px-2 py-1 text-[10px] font-mono flex items-center space-x-1.5 pointer-events-none">
                  <span class="w-2 h-2 rounded-full ${this.isSimulating ? 'bg-signal animate-pulse' : 'bg-amber-500'}"></span>
                  <span class="${this.isSimulating ? 'text-signal' : 'text-amber'}">${this.isSimulating ? 'Physics: LIVE' : 'Physics: PAUSED'}</span>
                </div>
              </div>
            </div>

            <!-- Right 4/12: Node Inspector & Trust Details -->
            <div class="lg:col-span-4 flex flex-col space-y-4">
              
              <!-- Inspector Card -->
              <div id="wot-inspector-panel" class="bg-surface-raised border border-white/10 rounded-xl p-4 flex-1 flex flex-col space-y-4">
                ${selectedNode && selectedTheme ? `
                  <!-- Node Header -->
                  <div class="flex items-start justify-between border-subtle-b pb-3">
                    <div class="flex items-center space-x-3">
                      <div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl border" style="background: ${selectedTheme.glowColor}; border-color: ${selectedTheme.color};">
                        ${selectedTheme.icon}
                      </div>
                      <div>
                        <h3 class="text-sm font-bold text-white">${selectedNode.label}</h3>
                        <p class="text-xs font-mono text-cyphr">${selectedNode.fingerprint}</p>
                        <div class="mt-1 flex items-center space-x-1.5">
                          <span class="text-[10px] px-2 py-0.5 rounded-full ${selectedTheme.bgBadge} ${selectedTheme.textBadge} ${selectedTheme.borderBadge} border font-medium">
                            ${selectedTheme.label}
                          </span>
                          ${selectedNode.isZKVerified ? `
                            <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyphr border border-cyan-500/20 font-mono">
                              ZK-Attested
                            </span>
                          ` : ''}
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Scores & Gauges -->
                  <div class="grid grid-cols-2 gap-2 text-xs">
                    <div class="p-2.5 rounded-lg bg-surface-base border border-white/5">
                      <div class="text-[10px] text-gray-400 uppercase font-mono">Trust Score</div>
                      <div class="text-lg font-bold text-white font-mono mt-0.5">${selectedNode.trustScore}<span class="text-xs text-gray-500">/100</span></div>
                      <div class="w-full bg-gray-800 rounded-full h-1.5 mt-2 overflow-hidden">
                        <div class="h-full rounded-full" style="width: ${selectedNode.trustScore}%; background-color: ${selectedTheme.color};"></div>
                      </div>
                    </div>

                    <div class="p-2.5 rounded-lg bg-surface-base border border-white/5">
                      <div class="text-[10px] text-gray-400 uppercase font-mono">Merit Score</div>
                      <div class="text-lg font-bold text-aether font-mono mt-0.5">${selectedNode.meritScore}</div>
                      <div class="text-[10px] text-gray-400 mt-1">Uptime: <span class="text-signal">${selectedNode.uptimePct}%</span></div>
                    </div>
                  </div>

                  <!-- Direct Vouches & Topology Links -->
                  <div class="space-y-2 flex-1 min-h-[140px]">
                    <div class="flex items-center justify-between text-xs">
                      <span class="font-bold text-gray-200">Active Trust Vouches</span>
                      <span class="text-[10px] text-gray-400 font-mono">${incomingVouches.length} In / ${outgoingVouches.length} Out</span>
                    </div>

                    <div class="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                      ${incomingVouches.length === 0 && outgoingVouches.length === 0 ? `
                        <div class="text-xs text-gray-500 italic p-3 text-center bg-surface-base rounded-lg border border-white/5">
                          No edges visible above the ${this.trustThreshold}% threshold.
                        </div>
                      ` : ''}

                      ${incomingVouches.map(edge => {
                        const src = this.nodes.find(n => n.id === edge.from);
                        return `
                          <div class="p-2 rounded-lg bg-surface-base border border-white/5 flex items-center justify-between text-xs">
                            <div class="flex items-center space-x-2">
                              <span class="text-cyphr text-[10px]">⬅ In</span>
                              <span class="text-gray-200 font-medium">${src ? src.label : edge.from}</span>
                            </div>
                            <div class="flex items-center space-x-2 font-mono text-[11px]">
                              <span class="text-signal font-bold">${edge.trustLevel}%</span>
                              <span class="text-gray-500 text-[10px]">(${edge.type.replace('_', ' ')})</span>
                            </div>
                          </div>
                        `;
                      }).join('')}

                      ${outgoingVouches.map(edge => {
                        const tgt = this.nodes.find(n => n.id === edge.to);
                        return `
                          <div class="p-2 rounded-lg bg-surface-base border border-white/5 flex items-center justify-between text-xs">
                            <div class="flex items-center space-x-2">
                              <span class="text-aether text-[10px]">➡ Out</span>
                              <span class="text-gray-200 font-medium">${tgt ? tgt.label : edge.to}</span>
                            </div>
                            <div class="flex items-center space-x-2 font-mono text-[11px]">
                              <span class="text-signal font-bold">${edge.trustLevel}%</span>
                              <span class="text-gray-500 text-[10px]">(${edge.type.replace('_', ' ')})</span>
                            </div>
                          </div>
                        `;
                      }).join('')}
                    </div>
                  </div>

                  <!-- Quick Actions for Node -->
                  <div class="grid grid-cols-2 gap-2 pt-2 border-subtle-b">
                    <button data-action="call-global" data-raw-click="window.wotGraphViz?.vouchForNode('${selectedNode.id}')"
                      class="px-3 py-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyphr text-xs font-semibold transition-all text-center flex items-center justify-center space-x-1"
                    >
                      <span>🤝</span>
                      <span>Vouch Node</span>
                    </button>

                    <button data-action="call-global" data-raw-click="window.wotGraphViz?.centerOnNode('${selectedNode.id}')"
                      class="px-3 py-2 rounded-lg bg-surface-overlay hover:bg-surface-highlight border border-white/10 text-gray-200 hover:text-white text-xs font-semibold transition-all text-center flex items-center justify-center space-x-1"
                    >
                      <span>🎯</span>
                      <span>Center Focus</span>
                    </button>
                  </div>
                ` : `
                  <div class="flex flex-col items-center justify-center h-full text-center p-6 text-gray-500">
                    <span class="text-3xl mb-2">🔍</span>
                    <p class="text-xs">Click a node on the canvas to inspect its cryptographic trust profile.</p>
                  </div>
                `}
              </div>
            </div>
          </div>

          <!-- Bottom Footer Controls Deck (Threshold Slider) -->
          <div class="px-5 py-3.5 bg-surface-raised/90 border-subtle-b flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            
            <!-- Trust Threshold Slider Control -->
            <div class="flex items-center space-x-3 w-full sm:w-auto flex-1 max-w-lg">
              <span class="text-xs font-semibold text-gray-300 whitespace-nowrap flex items-center space-x-1.5">
                <span>🎚️</span>
                <span>Trust Threshold Filter:</span>
              </span>
              
              <input
                id="wot-threshold-slider"
                type="range"
                min="0"
                max="95"
                step="5"
                value="${this.trustThreshold}" data-input="call-global" data-raw-input="window.wotGraphViz?.setTrustThreshold(Number(this.value))"
                class="flex-1 h-2 bg-surface-overlay rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
              />
              
              <span id="wot-threshold-indicator" class="font-mono font-bold text-cyphr bg-surface-base px-2.5 py-1 rounded border border-cyan-500/20 text-xs min-w-[50px] text-center">
                ${this.trustThreshold}%
              </span>
            </div>

            <!-- Footer Meta Info -->
            <div class="flex items-center space-x-4 text-[11px] text-gray-400">
              <span>Drag nodes with mouse</span>
              <span class="text-gray-600">·</span>
              <span>Double-click to pin/unpin</span>
              <span class="text-gray-600">·</span>
              <button data-action="call-global" data-raw-click="window.wotGraphViz?.resetGraphPositions()" class="text-cyphr hover:underline">Reset Positions</button>
            </div>
          </div>

        </div>
      </div>
    `;
  }

  // -------------------------------------------------------------------------
  // Sidebar & Rail Button Component
  // -------------------------------------------------------------------------

  public renderWoTGraphButton(): string {
    const stats = this.getStats();
    return `
      <button
        id="btn-wot-graph-trigger" data-action="call-global" data-raw-click="window.wotGraphViz?.open()"
        class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-surface-raised hover:bg-surface-overlay border border-white/5 hover:border-cyan-500/30 text-gray-200 hover:text-cyphr transition-all group shadow-sm"
        title="Open Web-of-Trust Graph (D3-style force visualizer)"
      >
        <div class="flex items-center space-x-2.5">
          <div class="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyphr text-sm group-hover:scale-110 transition-transform">
            🕸️
          </div>
          <div class="text-left">
            <div class="text-xs font-bold text-white group-hover:text-cyphr transition-colors">Trust Graph</div>
            <div class="text-[10px] text-gray-400">${stats.totalNodes} Nodes · WoT Sybil-Proof</div>
          </div>
        </div>

        <div class="flex items-center space-x-1 font-mono text-[10px] px-2 py-0.5 rounded-md bg-surface-base border border-cyan-500/20 text-cyphr">
          <span>${stats.avgTrustScore}%</span>
        </div>
      </button>
    `;
  }

  // -------------------------------------------------------------------------
  // Interaction & UI Handlers
  // -------------------------------------------------------------------------

  public open(): void {
    this.isOpen = true;
    this.reRenderModal();
    this.startAnimation();
    this.setupGlobalListeners();
  }

  public close(): void {
    this.isOpen = false;
    this.stopAnimation();
    this.cleanupGlobalListeners();
    this.reRenderModal();
  }

  public toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  public setTrustThreshold(threshold: number): void {
    this.trustThreshold = Math.max(0, Math.min(100, threshold));
    
    // Update live indicator elements
    const indicator = document.getElementById('wot-threshold-indicator');
    if (indicator) indicator.textContent = `${this.trustThreshold}%`;
    const statVal = document.getElementById('wot-stat-threshold-val');
    if (statVal) statVal.textContent = `≥ ${this.trustThreshold}%`;

    this.updateModalTelemetry();
    this.updateSVGDOM();
  }

  public setRoleFilter(role: 'all' | WoTRole): void {
    this.activeRoleFilter = role;
    this.reRenderModal();
  }

  public handleSearchInput(query: string): void {
    this.searchQuery = query;
    this.updateSVGDOM();
  }

  public handleNodeClick(nodeId: string): void {
    this.selectedNodeId = this.selectedNodeId === nodeId ? null : nodeId;
    this.updateInspectorPanel();
    this.updateSVGDOM();
  }

  public handleNodeMouseEnter(nodeId: string): void {
    if (!this.isDragging) {
      this.hoveredNodeId = nodeId;
      this.updateSVGDOM();
    }
  }

  public handleNodeMouseLeave(): void {
    if (!this.isDragging && this.hoveredNodeId !== null) {
      this.hoveredNodeId = null;
      this.updateSVGDOM();
    }
  }

  public handleNodeMouseDown(event: MouseEvent, nodeId: string): void {
    event.stopPropagation();
    event.preventDefault();
    this.isDragging = true;
    this.draggedNodeId = nodeId;

    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Project mouse coordinates to SVG canvas viewBox (800x500)
    const svgEl = document.getElementById('wot-graph-canvas') as SVGSVGElement | null;
    if (svgEl) {
      const pt = this.getSVGCoordinates(event, svgEl);
      this.dragOffset = { x: pt.x - node.x, y: pt.y - node.y };
    }
  }

  public handleCanvasMouseMove(event: MouseEvent): void {
    if (!this.isDragging || !this.draggedNodeId) return;

    const node = this.nodes.find(n => n.id === this.draggedNodeId);
    const svgEl = document.getElementById('wot-graph-canvas') as SVGSVGElement | null;
    if (!node || !svgEl) return;

    const pt = this.getSVGCoordinates(event, svgEl);
    node.x = Math.max(node.radius + 15, Math.min(this.width - node.radius - 15, pt.x - this.dragOffset.x));
    node.y = Math.max(node.radius + 15, Math.min(this.height - node.radius - 15, pt.y - this.dragOffset.y));
    node.vx = 0;
    node.vy = 0;

    if (this.mouseMoveRafId === null) {
      this.mouseMoveRafId = safeRequestAnimationFrame(() => {
        this.mouseMoveRafId = null;
        if (this.isOpen) {
          this.updateSVGDOM();
        }
      });
    }
  }

  public handleCanvasMouseUp(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.draggedNodeId = null;
      if (this.mouseMoveRafId !== null) {
        safeCancelAnimationFrame(this.mouseMoveRafId);
        this.mouseMoveRafId = null;
      }
      this.updateSVGDOM();
    }
  }

  public vouchForNode(nodeId: string): void {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return;

    node.directVouches += 1;
    node.trustScore = Math.min(100, node.trustScore + 2);
    node.meritScore += 50;

    // Add vouch edge from Genesis arbiter or random peer
    const sourceId = this.nodes[0]?.id || 'node-archon-1';
    if (sourceId !== nodeId) {
      const existingEdge = this.edges.find(e => e.from === sourceId && e.to === nodeId);
      if (existingEdge) {
        existingEdge.trustLevel = Math.min(100, existingEdge.trustLevel + 5);
        existingEdge.weight = Math.min(1.0, existingEdge.weight + 0.1);
      } else {
        this.edges.push({
          from: sourceId,
          to: nodeId,
          weight: 0.75,
          trustLevel: 80,
          type: 'direct_vouch',
        });
      }
    }

    this.updateInspectorPanel();
    this.updateModalTelemetry();
    this.updateSVGDOM();
  }

  public centerOnNode(nodeId: string): void {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Gently nudge the target node toward the center
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    node.vx += (centerX - node.x) * 0.2;
    node.vy += (centerY - node.y) * 0.2;
    this.selectedNodeId = nodeId;
    this.updateInspectorPanel();
  }

  public resetGraphPositions(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    this.nodes.forEach((n, idx) => {
      const angle = (idx / this.nodes.length) * 2 * Math.PI;
      const dist = 90 + Math.random() * 120;
      n.x = centerX + Math.cos(angle) * dist;
      n.y = centerY + Math.sin(angle) * dist;
      n.vx = (Math.random() - 0.5) * 2;
      n.vy = (Math.random() - 0.5) * 2;
      n.isPinned = false;
    });

    this.updateSVGDOM();
  }

  // -------------------------------------------------------------------------
  // DOM Sync & Helpers
  // -------------------------------------------------------------------------

  public updateSVGDOM(): void {
    const container = document.getElementById('wot-svg-viewport');
    if (container && this.isOpen) {
      container.innerHTML = this.renderSVG();
    }
  }

  public updateInspectorPanel(): void {
    const panel = document.getElementById('wot-inspector-panel');
    if (!panel) return;

    const selectedNode = this.selectedNodeId ? this.nodes.find(n => n.id === this.selectedNodeId) : (this.nodes[0] || null);
    const selectedTheme = selectedNode ? ROLE_THEMES[selectedNode.role] : null;
    const incomingVouches = selectedNode ? this.edges.filter(e => e.to === selectedNode.id && e.trustLevel >= this.trustThreshold) : [];
    const outgoingVouches = selectedNode ? this.edges.filter(e => e.from === selectedNode.id && e.trustLevel >= this.trustThreshold) : [];

    if (!selectedNode || !selectedTheme) {
      panel.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full text-center p-6 text-gray-500">
          <span class="text-3xl mb-2">🔍</span>
          <p class="text-xs">Click a node on the canvas to inspect its cryptographic trust profile.</p>
        </div>
      `;
      return;
    }

    panel.innerHTML = `
      <!-- Node Header -->
      <div class="flex items-start justify-between border-subtle-b pb-3">
        <div class="flex items-center space-x-3">
          <div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl border" style="background: ${selectedTheme.glowColor}; border-color: ${selectedTheme.color};">
            ${selectedTheme.icon}
          </div>
          <div>
            <h3 class="text-sm font-bold text-white">${selectedNode.label}</h3>
            <p class="text-xs font-mono text-cyphr">${selectedNode.fingerprint}</p>
            <div class="mt-1 flex items-center space-x-1.5">
              <span class="text-[10px] px-2 py-0.5 rounded-full ${selectedTheme.bgBadge} ${selectedTheme.textBadge} ${selectedTheme.borderBadge} border font-medium">
                ${selectedTheme.label}
              </span>
              ${selectedNode.isZKVerified ? `
                <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyphr border border-cyan-500/20 font-mono">
                  ZK-Attested
                </span>
              ` : ''}
            </div>
          </div>
        </div>
      </div>

      <!-- Scores & Gauges -->
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div class="p-2.5 rounded-lg bg-surface-base border border-white/5">
          <div class="text-[10px] text-gray-400 uppercase font-mono">Trust Score</div>
          <div class="text-lg font-bold text-white font-mono mt-0.5">${selectedNode.trustScore}<span class="text-xs text-gray-500">/100</span></div>
          <div class="w-full bg-gray-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div class="h-full rounded-full" style="width: ${selectedNode.trustScore}%; background-color: ${selectedTheme.color};"></div>
          </div>
        </div>

        <div class="p-2.5 rounded-lg bg-surface-base border border-white/5">
          <div class="text-[10px] text-gray-400 uppercase font-mono">Merit Score</div>
          <div class="text-lg font-bold text-aether font-mono mt-0.5">${selectedNode.meritScore}</div>
          <div class="text-[10px] text-gray-400 mt-1">Uptime: <span class="text-signal">${selectedNode.uptimePct}%</span></div>
        </div>
      </div>

      <!-- Direct Vouches & Topology Links -->
      <div class="space-y-2 flex-1 min-h-[140px]">
        <div class="flex items-center justify-between text-xs">
          <span class="font-bold text-gray-200">Active Trust Vouches</span>
          <span class="text-[10px] text-gray-400 font-mono">${incomingVouches.length} In / ${outgoingVouches.length} Out</span>
        </div>

        <div class="max-h-36 overflow-y-auto space-y-1.5 pr-1">
          ${incomingVouches.length === 0 && outgoingVouches.length === 0 ? `
            <div class="text-xs text-gray-500 italic p-3 text-center bg-surface-base rounded-lg border border-white/5">
              No edges visible above the ${this.trustThreshold}% threshold.
            </div>
          ` : ''}

          ${incomingVouches.map(edge => {
            const src = this.nodes.find(n => n.id === edge.from);
            return `
              <div class="p-2 rounded-lg bg-surface-base border border-white/5 flex items-center justify-between text-xs">
                <div class="flex items-center space-x-2">
                  <span class="text-cyphr text-[10px]">⬅ In</span>
                  <span class="text-gray-200 font-medium">${src ? src.label : edge.from}</span>
                </div>
                <div class="flex items-center space-x-2 font-mono text-[11px]">
                  <span class="text-signal font-bold">${edge.trustLevel}%</span>
                  <span class="text-gray-500 text-[10px]">(${edge.type.replace('_', ' ')})</span>
                </div>
              </div>
            `;
          }).join('')}

          ${outgoingVouches.map(edge => {
            const tgt = this.nodes.find(n => n.id === edge.to);
            return `
              <div class="p-2 rounded-lg bg-surface-base border border-white/5 flex items-center justify-between text-xs">
                <div class="flex items-center space-x-2">
                  <span class="text-aether text-[10px]">➡ Out</span>
                  <span class="text-gray-200 font-medium">${tgt ? tgt.label : edge.to}</span>
                </div>
                <div class="flex items-center space-x-2 font-mono text-[11px]">
                  <span class="text-signal font-bold">${edge.trustLevel}%</span>
                  <span class="text-gray-500 text-[10px]">(${edge.type.replace('_', ' ')})</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Quick Actions for Node -->
      <div class="grid grid-cols-2 gap-2 pt-2 border-subtle-b">
        <button data-action="call-global" data-raw-click="window.wotGraphViz?.vouchForNode('${selectedNode.id}')"
          class="px-3 py-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyphr text-xs font-semibold transition-all text-center flex items-center justify-center space-x-1"
        >
          <span>🤝</span>
          <span>Vouch Node</span>
        </button>

        <button data-action="call-global" data-raw-click="window.wotGraphViz?.centerOnNode('${selectedNode.id}')"
          class="px-3 py-2 rounded-lg bg-surface-overlay hover:bg-surface-highlight border border-white/10 text-gray-200 hover:text-white text-xs font-semibold transition-all text-center flex items-center justify-center space-x-1"
        >
          <span>🎯</span>
          <span>Center Focus</span>
        </button>
      </div>
    `;
  }

  public updateModalTelemetry(): void {
    const stats = this.getStats();
    const bar = document.getElementById('wot-telemetry-bar');
    if (!bar) return;

    bar.innerHTML = `
      <div class="px-3 py-1.5 rounded-lg bg-surface-raised border border-white/5 flex flex-col">
        <span class="text-[10px] text-gray-400 uppercase font-mono">Active Nodes</span>
        <span class="text-sm font-bold text-white font-mono">${stats.totalNodes}</span>
      </div>
      <div class="px-3 py-1.5 rounded-lg bg-surface-raised border border-white/5 flex flex-col">
        <span class="text-[10px] text-gray-400 uppercase font-mono">Trust Connections</span>
        <span class="text-sm font-bold text-cyphr font-mono">${stats.visibleEdges} <span class="text-[10px] text-gray-500">/ ${stats.totalEdges}</span></span>
      </div>
      <div class="px-3 py-1.5 rounded-lg bg-surface-raised border border-white/5 flex flex-col">
        <span class="text-[10px] text-gray-400 uppercase font-mono">Average Trust</span>
        <span class="text-sm font-bold text-signal font-mono">${stats.avgTrustScore}%</span>
      </div>
      <div class="px-3 py-1.5 rounded-lg bg-surface-raised border border-white/5 flex flex-col">
        <span class="text-[10px] text-gray-400 uppercase font-mono">Network Density</span>
        <span class="text-sm font-bold text-aether font-mono">${stats.networkDensity}%</span>
      </div>
      <div class="px-3 py-1.5 rounded-lg bg-surface-raised border border-white/5 flex flex-col">
        <span class="text-[10px] text-gray-400 uppercase font-mono">Max-Flow Capacity</span>
        <span class="text-sm font-bold text-amber font-mono">${stats.maxFlowCapacity} Gb/s</span>
      </div>
      <div class="px-3 py-1.5 rounded-lg bg-surface-raised border border-white/5 flex flex-col">
        <span class="text-[10px] text-gray-400 uppercase font-mono">Filter Threshold</span>
        <span id="wot-stat-threshold-val" class="text-sm font-bold text-white font-mono">≥ ${this.trustThreshold}%</span>
      </div>
    `;
  }

  private updateControlsUI(): void {
    const animBtn = document.getElementById('btn-wot-toggle-anim');
    if (animBtn) {
      animBtn.innerHTML = `
        <span>${this.isSimulating ? '⏸' : '▶'}</span>
        <span class="hidden sm:inline">${this.isSimulating ? 'Pause Physics' : 'Resume Physics'}</span>
      `;
      animBtn.className = `px-3 py-1.5 rounded-lg ${this.isSimulating ? 'bg-amber-500/10 border-amber-500/30 text-amber' : 'bg-surface-overlay border-white/10 text-gray-300'} border text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm`;
    }
  }

  private reRenderModal(): void {
    let container = document.getElementById('wot-graph-modal-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'wot-graph-modal-container';
      document.body.appendChild(container);
    }
    container.innerHTML = this.renderWoTGraphModal();
  }

  private getSVGCoordinates(event: MouseEvent, svg: SVGSVGElement): { x: number; y: number } {
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const ctm = svg.getScreenCTM();
    if (ctm) {
      const transformed = pt.matrixTransform(ctm.inverse());
      return { x: transformed.x, y: transformed.y };
    }
    const rect = svg.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (this.width / rect.width),
      y: (event.clientY - rect.top) * (this.height / rect.height),
    };
  }

  private setupGlobalListeners(): void {
    this.cleanupGlobalListeners();

    this.boundMouseMoveListener = (e: MouseEvent) => {
      if (this.isDragging) {
        this.handleCanvasMouseMove(e);
      }
    };

    this.boundMouseUpListener = () => {
      if (this.isDragging) {
        this.handleCanvasMouseUp();
      }
    };

    window.addEventListener('mousemove', this.boundMouseMoveListener, { passive: true });
    window.addEventListener('mouseup', this.boundMouseUpListener, { passive: true });

    // Escape to close
    this.boundKeyDownListener = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    };
    window.addEventListener('keydown', this.boundKeyDownListener);
  }

  private cleanupGlobalListeners(): void {
    if (this.boundMouseMoveListener) {
      window.removeEventListener('mousemove', this.boundMouseMoveListener);
      this.boundMouseMoveListener = null;
    }
    if (this.boundMouseUpListener) {
      window.removeEventListener('mouseup', this.boundMouseUpListener);
      this.boundMouseUpListener = null;
    }
    if (this.boundKeyDownListener) {
      window.removeEventListener('keydown', this.boundKeyDownListener);
      this.boundKeyDownListener = null;
    }
    if (this.mouseMoveRafId !== null) {
      safeCancelAnimationFrame(this.mouseMoveRafId);
      this.mouseMoveRafId = null;
    }
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// ---------------------------------------------------------------------------
// 4. Singleton Export & Global Registration
// ---------------------------------------------------------------------------

export const wotGraphViz = new WoTGraphVisualizer();

serviceRegistry.registerInstance(SERVICES.WotGraph, wotGraphViz);

if (typeof window !== 'undefined') {
  window.wotGraphViz = wotGraphViz;
  window.__aetheris_close_wot_graph = () => wotGraphViz.close();
}
