/**
 * Aetheris Omni-Sphere — Network Observatory (Network Statistics)
 *
 * Full cryptographic observability and real-time P2P telemetry dashboard:
 * 1. Network Topology Map: Interactive SVG Radar with luminous nodes, animated connections, and propagation waves
 * 2. Real-Time Latency Chart: SVG Sparkline/Area Chart with last 60-100 points, jitter analysis, p95/p99
 * 3. ZK-RLN Slashing Statistics: 7-day bar chart, penalty metrics, spammer identity extraction on BN254
 * 4. Top Contributors: Leaderboard of Top 5 nodes with Merit scores, validated ZK proofs, uptime, and bandwidth
 *
 * 100% Self-Contained, Strict TypeScript, Zero External Dependencies.
 */

import './window-augmentation.js';
import { nodeFederationEngine } from './node-federation.js';
import { isSimulationModeEnabled } from './simulation-mode.js';

// ---------------------------------------------------------------------------
// 1. Mandatory & Extended Data Types & Interfaces
// ---------------------------------------------------------------------------

export interface NetworkMetrics {
  totalNodes: number;
  activeNodes: number;
  messagesPerMinute: number;
  avgLatencyMs: number;
  totalSlashings: number;
  networkUptime: number | null; // Percentage (e.g. 99.98) or null if unmeasured
  topContributors: string[];
}

export interface LatencyDataPoint {
  timestamp: number;
  latencyMs: number;
  nodeId: string;
}

export type NodeRole = 'relay' | 'validator' | 'storage' | 'gateway';
export type NodeStatus = 'active' | 'degraded' | 'syncing';
export type TopologyFilter = 'all' | 'relay' | 'validator' | 'storage' | 'gateway';

export interface TopologyNode {
  id: string;
  name: string;
  x: number; // X coordinate on viewBox 800x440
  y: number; // Y coordinate on viewBox 800x440
  role: NodeRole;
  status: NodeStatus;
  latencyMs: number;
  meritScore: number;
  region: string;
  countryCode: string;
  uptime: number; // Percentage
  ipObfuscated: string;
  zkRlnEpoch: number;
  connections: string[]; // Directly connected node IDs
  bandwidthMbps: number;
  messagesProcessed: number;
}

export type ViolationType = 'double-sign' | 'rate-limit' | 'epoch-griefing';

export interface SlashingRecord {
  id: string;
  timestamp: number;
  dayIndex: number;
  dayLabel: string;
  nodeId: string;
  nodeName: string;
  violationType: ViolationType;
  penaltyTokens: number;
  meritBurned: number;
  zkNullifierHash: string;
  txHash: string;
  status: 'slashed' | 'settled';
}

export interface SlashingDayStat {
  dayIndex: number;
  dayLabel: string;
  dateStr: string;
  doubleSignCount: number;
  rateLimitCount: number;
  epochGriefingCount: number;
  totalSlashings: number;
  totalPenaltiesAETH: number;
}

export interface TopContributor {
  rank: number;
  nodeId: string;
  name: string;
  fingerprint: string;
  meritScore: number;
  uptimePct: number;
  zkProofsVerified: number;
  messagesRelayed: number;
  tier: 'Archon' | 'Sentinel' | 'Relayer' | 'Validator';
  region: string;
  bandwidthContributedGB: number;
  avatarColor: string;
  status: NodeStatus;
}

// ---------------------------------------------------------------------------
// 2. Initial Seed Data (Seed Telemetry & Topology Matrix)
// ---------------------------------------------------------------------------

const SEED_TOPOLOGY_NODES: TopologyNode[] = [
  {
    id: 'node-prime-gw',
    name: 'Aether-Prime Gateway',
    x: 400,
    y: 220,
    role: 'gateway',
    status: 'active',
    latencyMs: 12.4,
    meritScore: 9840,
    region: 'Frankfurt Core',
    countryCode: 'DE',
    uptime: 99.99,
    ipObfuscated: '185.190.***.*** (Nym Mixnet L3)',
    zkRlnEpoch: 4819,
    connections: ['node-fra-01', 'node-ams-val', 'node-hel-rel', 'node-zur-val', 'node-sto-str'],
    bandwidthMbps: 10000,
    messagesProcessed: 14890200,
  },
  {
    id: 'node-fra-01',
    name: 'Frankfurt-Relay-01',
    x: 270,
    y: 150,
    role: 'relay',
    status: 'active',
    latencyMs: 16.2,
    meritScore: 8920,
    region: 'Frankfurt',
    countryCode: 'DE',
    uptime: 99.98,
    ipObfuscated: '194.26.***.*** (Tor v3 Hidden)',
    zkRlnEpoch: 4819,
    connections: ['node-prime-gw', 'node-lon-rel', 'node-ams-val', 'node-sto-str'],
    bandwidthMbps: 4500,
    messagesProcessed: 8920400,
  },
  {
    id: 'node-tok-val',
    name: 'Tokyo-Validator-Alpha',
    x: 550,
    y: 140,
    role: 'validator',
    status: 'active',
    latencyMs: 22.8,
    meritScore: 9150,
    region: 'Tokyo',
    countryCode: 'JP',
    uptime: 99.97,
    ipObfuscated: '133.242.***.*** (I2P Tunnel)',
    zkRlnEpoch: 4819,
    connections: ['node-prime-gw', 'node-seo-str', 'node-sin-rel', 'node-hel-rel'],
    bandwidthMbps: 6200,
    messagesProcessed: 11204000,
  },
  {
    id: 'node-rey-str',
    name: 'Reykjavik-Vault-01',
    x: 180,
    y: 260,
    role: 'storage',
    status: 'active',
    latencyMs: 28.5,
    meritScore: 7650,
    region: 'Reykjavik',
    countryCode: 'IS',
    uptime: 99.95,
    ipObfuscated: '185.112.***.*** (Encrypted BlobStore)',
    zkRlnEpoch: 4819,
    connections: ['node-lon-rel', 'node-ams-val', 'node-sao-rel'],
    bandwidthMbps: 3800,
    messagesProcessed: 4320100,
  },
  {
    id: 'node-sin-rel',
    name: 'Singapore-Relay-04',
    x: 620,
    y: 260,
    role: 'relay',
    status: 'active',
    latencyMs: 31.4,
    meritScore: 7890,
    region: 'Singapore',
    countryCode: 'SG',
    uptime: 99.94,
    ipObfuscated: '103.253.***.*** (Hop-5 Onion)',
    zkRlnEpoch: 4819,
    connections: ['node-tok-val', 'node-syd-val', 'node-tor-rel', 'node-prime-gw'],
    bandwidthMbps: 5100,
    messagesProcessed: 7840300,
  },
  {
    id: 'node-zur-val',
    name: 'Zurich-Validator-Gamma',
    x: 320,
    y: 330,
    role: 'validator',
    status: 'active',
    latencyMs: 18.9,
    meritScore: 8430,
    region: 'Zurich',
    countryCode: 'CH',
    uptime: 99.99,
    ipObfuscated: '193.134.***.*** (Hardware Enclave HSM)',
    zkRlnEpoch: 4819,
    connections: ['node-prime-gw', 'node-ams-val', 'node-vir-gw', 'node-sao-rel'],
    bandwidthMbps: 7500,
    messagesProcessed: 9650000,
  },
  {
    id: 'node-vir-gw',
    name: 'Virginia-Gateway-02',
    x: 480,
    y: 330,
    role: 'gateway',
    status: 'active',
    latencyMs: 24.1,
    meritScore: 8120,
    region: 'N. Virginia',
    countryCode: 'US',
    uptime: 99.96,
    ipObfuscated: '198.51.***.*** (Mesh Ingress)',
    zkRlnEpoch: 4819,
    connections: ['node-prime-gw', 'node-tor-rel', 'node-zur-val', 'node-syd-val'],
    bandwidthMbps: 8800,
    messagesProcessed: 10450000,
  },
  {
    id: 'node-lon-rel',
    name: 'London-Relay-03',
    x: 140,
    y: 160,
    role: 'relay',
    status: 'active',
    latencyMs: 19.3,
    meritScore: 7120,
    region: 'London',
    countryCode: 'GB',
    uptime: 99.92,
    ipObfuscated: '185.86.***.*** (Nym Mixnet)',
    zkRlnEpoch: 4819,
    connections: ['node-fra-01', 'node-rey-str', 'node-sto-str'],
    bandwidthMbps: 3200,
    messagesProcessed: 5210000,
  },
  {
    id: 'node-seo-str',
    name: 'Seoul-Storage-02',
    x: 670,
    y: 160,
    role: 'storage',
    status: 'active',
    latencyMs: 33.7,
    meritScore: 6840,
    region: 'Seoul',
    countryCode: 'KR',
    uptime: 99.91,
    ipObfuscated: '211.233.***.*** (ZFS Shard Cluster)',
    zkRlnEpoch: 4819,
    connections: ['node-tok-val', 'node-sin-rel'],
    bandwidthMbps: 4100,
    messagesProcessed: 3890000,
  },
  {
    id: 'node-sao-rel',
    name: 'SaoPaulo-Relay-02',
    x: 220,
    y: 380,
    role: 'relay',
    status: 'syncing',
    latencyMs: 51.2,
    meritScore: 5420,
    region: 'São Paulo',
    countryCode: 'BR',
    uptime: 98.84,
    ipObfuscated: '177.136.***.*** (GossipSub Sync)',
    zkRlnEpoch: 4819,
    connections: ['node-zur-val', 'node-rey-str'],
    bandwidthMbps: 2100,
    messagesProcessed: 2140000,
  },
  {
    id: 'node-syd-val',
    name: 'Sydney-Validator-Beta',
    x: 600,
    y: 380,
    role: 'validator',
    status: 'active',
    latencyMs: 38.6,
    meritScore: 7340,
    region: 'Sydney',
    countryCode: 'AU',
    uptime: 99.93,
    ipObfuscated: '139.130.***.*** (BFT Finality Engine)',
    zkRlnEpoch: 4819,
    connections: ['node-vir-gw', 'node-sin-rel'],
    bandwidthMbps: 4800,
    messagesProcessed: 6120000,
  },
  {
    id: 'node-sto-str',
    name: 'Stockholm-Storage-03',
    x: 340,
    y: 80,
    role: 'storage',
    status: 'active',
    latencyMs: 20.7,
    meritScore: 6980,
    region: 'Stockholm',
    countryCode: 'SE',
    uptime: 99.96,
    ipObfuscated: '194.71.***.*** (Permanent IPFS Pool)',
    zkRlnEpoch: 4819,
    connections: ['node-fra-01', 'node-lon-rel', 'node-hel-rel', 'node-prime-gw'],
    bandwidthMbps: 3600,
    messagesProcessed: 4120000,
  },
  {
    id: 'node-hel-rel',
    name: 'Helsinki-Relay-05',
    x: 460,
    y: 75,
    role: 'relay',
    status: 'active',
    latencyMs: 19.8,
    meritScore: 7560,
    region: 'Helsinki',
    countryCode: 'FI',
    uptime: 99.97,
    ipObfuscated: '195.148.***.*** (Tor v3 Node)',
    zkRlnEpoch: 4819,
    connections: ['node-sto-str', 'node-tok-val', 'node-prime-gw'],
    bandwidthMbps: 4900,
    messagesProcessed: 6730000,
  },
  {
    id: 'node-ams-val',
    name: 'Amsterdam-Validator-Delta',
    x: 290,
    y: 240,
    role: 'validator',
    status: 'active',
    latencyMs: 15.1,
    meritScore: 8710,
    region: 'Amsterdam',
    countryCode: 'NL',
    uptime: 99.99,
    ipObfuscated: '185.220.***.*** (Zero-Knowledge Verifier)',
    zkRlnEpoch: 4819,
    connections: ['node-prime-gw', 'node-fra-01', 'node-rey-str', 'node-zur-val'],
    bandwidthMbps: 7200,
    messagesProcessed: 9110000,
  },
  {
    id: 'node-tor-rel',
    name: 'Toronto-Relay-06',
    x: 520,
    y: 240,
    role: 'relay',
    status: 'active',
    latencyMs: 26.4,
    meritScore: 6690,
    region: 'Toronto',
    countryCode: 'CA',
    uptime: 99.91,
    ipObfuscated: '142.250.***.*** (Waku Relay)',
    zkRlnEpoch: 4819,
    connections: ['node-vir-gw', 'node-sin-rel', 'node-prime-gw'],
    bandwidthMbps: 3900,
    messagesProcessed: 4980000,
  },
];

const SEED_SLASHING_RECORDS: SlashingRecord[] = [
  {
    id: 'slash-0829-01',
    timestamp: Date.now() - 3600000 * 4,
    dayIndex: 6,
    dayLabel: 'Today',
    nodeId: 'node-rogue-0x4f',
    nodeName: 'Rogue-Relay-0x4F8A',
    violationType: 'rate-limit',
    penaltyTokens: 25.0,
    meritBurned: 1500,
    zkNullifierHash: '0x3a9f81b2e4d5c6a7890123456789abcdef0123456789abcdef0123456789abcd',
    txHash: '0x7f4a01c9b2e3d8f7',
    status: 'slashed',
  },
  {
    id: 'slash-0829-02',
    timestamp: Date.now() - 3600000 * 11,
    dayIndex: 6,
    dayLabel: 'Today',
    nodeId: 'node-sybil-0x9a',
    nodeName: 'Sybil-Spam-Bot-9A',
    violationType: 'double-sign',
    penaltyTokens: 50.0,
    meritBurned: 3200,
    zkNullifierHash: '0x88b71d9e2f4a5c0b1e3f5a7c9d0b2e4f6a8c0e2b4d6f8a0c2e4f6a8c0e2b4d6f',
    txHash: '0x1c98e4f2a7b0d3e5',
    status: 'slashed',
  },
  {
    id: 'slash-0828-01',
    timestamp: Date.now() - 3600000 * 28,
    dayIndex: 5,
    dayLabel: 'Yesterday',
    nodeId: 'node-desync-0x22',
    nodeName: 'Desync-Epoch-Griefer',
    violationType: 'epoch-griefing',
    penaltyTokens: 15.0,
    meritBurned: 850,
    zkNullifierHash: '0x5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d',
    txHash: '0x99a2c4e6f8b0d1e3',
    status: 'slashed',
  },
  {
    id: 'slash-0828-02',
    timestamp: Date.now() - 3600000 * 35,
    dayIndex: 5,
    dayLabel: 'Yesterday',
    nodeId: 'node-spam-0x31',
    nodeName: 'RateLimit-Flooder-31',
    violationType: 'rate-limit',
    penaltyTokens: 25.0,
    meritBurned: 1500,
    zkNullifierHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    txHash: '0x3d4e5f6a7b8c9d0e',
    status: 'slashed',
  },
  {
    id: 'slash-0827-01',
    timestamp: Date.now() - 3600000 * 56,
    dayIndex: 4,
    dayLabel: 'Aug 27',
    nodeId: 'node-equiv-0x77',
    nodeName: 'Equivocation-Cluster-7',
    violationType: 'double-sign',
    penaltyTokens: 50.0,
    meritBurned: 3200,
    zkNullifierHash: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
    txHash: '0x4a8f1b2c3d4e5f6a',
    status: 'slashed',
  },
];

const SEED_TOP_CONTRIBUTORS: TopContributor[] = [
  {
    rank: 1,
    nodeId: 'node-prime-gw',
    name: 'Aether-Prime Gateway',
    fingerprint: '0x4f8a...991c',
    meritScore: 9840,
    uptimePct: 99.99,
    zkProofsVerified: 148290,
    messagesRelayed: 14890200,
    tier: 'Archon',
    region: '🇩🇪 Frankfurt',
    bandwidthContributedGB: 18450.4,
    avatarColor: '#00e5ff',
    status: 'active',
  },
  {
    rank: 2,
    nodeId: 'node-tok-val',
    name: 'Tokyo-Validator-Alpha',
    fingerprint: '0x7e2b...44a1',
    meritScore: 9150,
    uptimePct: 99.97,
    zkProofsVerified: 112040,
    messagesRelayed: 11204000,
    tier: 'Sentinel',
    region: '🇯🇵 Tokyo',
    bandwidthContributedGB: 14210.8,
    avatarColor: '#a855f7',
    status: 'active',
  },
  {
    rank: 3,
    nodeId: 'node-fra-01',
    name: 'Frankfurt-Relay-01',
    fingerprint: '0x1a9c...73f8',
    meritScore: 8920,
    uptimePct: 99.98,
    zkProofsVerified: 89204,
    messagesRelayed: 8920400,
    tier: 'Sentinel',
    region: '🇩🇪 Frankfurt',
    bandwidthContributedGB: 11340.2,
    avatarColor: '#22c55e',
    status: 'active',
  },
  {
    rank: 4,
    nodeId: 'node-ams-val',
    name: 'Amsterdam-Validator-Delta',
    fingerprint: '0x6d4e...11c2',
    meritScore: 8710,
    uptimePct: 99.99,
    zkProofsVerified: 91100,
    messagesRelayed: 9110000,
    tier: 'Validator',
    region: '🇳🇱 Amsterdam',
    bandwidthContributedGB: 10980.5,
    avatarColor: '#f59e0b',
    status: 'active',
  },
  {
    rank: 5,
    nodeId: 'node-zur-val',
    name: 'Zurich-Validator-Gamma',
    fingerprint: '0x9c3f...55e0',
    meritScore: 8430,
    uptimePct: 99.99,
    zkProofsVerified: 78500,
    messagesRelayed: 9650000,
    tier: 'Validator',
    region: '🇨🇭 Zurich',
    bandwidthContributedGB: 9870.1,
    avatarColor: '#ec4899',
    status: 'active',
  },
];

// ---------------------------------------------------------------------------
// 3. Main Class: NetworkObservatory
// ---------------------------------------------------------------------------

export class NetworkObservatory {
  public metrics: NetworkMetrics;
  public latencyHistory: LatencyDataPoint[] = [];
  public isOpen: boolean = false;

  // Internal state for visualization and interaction
  public nodes: TopologyNode[] = [];
  public slashingHistory: SlashingRecord[] = [];
  public slashing7DayStats: SlashingDayStat[] = [];
  public topContributorsList: TopContributor[] = [];
  public selectedNodeId: string | null = null;
  public activeFilter: TopologyFilter = 'all';
  public activeTab: 'overview' | 'topology' | 'latency' | 'slashing' | 'contributors' = 'overview';
  public isLiveUpdating: boolean = false;
  
  private liveUpdateIntervalId: number | null = null;
  private subscribers: Array<() => void> = [];
  private lastUpdateTime: number = Date.now();

  constructor() {
    if (isSimulationModeEnabled()) {
      this.nodes = JSON.parse(JSON.stringify(SEED_TOPOLOGY_NODES));
      this.slashingHistory = JSON.parse(JSON.stringify(SEED_SLASHING_RECORDS));
      this.topContributorsList = JSON.parse(JSON.stringify(SEED_TOP_CONTRIBUTORS));
      
      this.initLatencyHistory();
      this.initSlashing7DayStats();

      this.metrics = {
        totalNodes: 256,
        activeNodes: 242,
        messagesPerMinute: 4890,
        avgLatencyMs: this.calculateAvgLatency(),
        totalSlashings: 37,
        networkUptime: 99.98,
        topContributors: this.topContributorsList.map(c => c.name),
      };
    } else {
      this.nodes = [];
      this.slashingHistory = [];
      this.topContributorsList = [];
      this.latencyHistory = [];
      this.slashing7DayStats = [];

      this.metrics = {
        totalNodes: 0,
        activeNodes: 0,
        messagesPerMinute: 0,
        avgLatencyMs: 0,
        totalSlashings: 0,
        networkUptime: null,
        topContributors: [],
      };
    }

    // Automatic browser event initialization
    if (typeof window !== 'undefined') {
      this.attachGlobalKeyboardListener();
    }
  }

  /**
   * Fetches real telemetry from /api/analytics
   */
  public async fetchRealTelemetry(): Promise<void> {
    try {
      const res = await fetch('/api/analytics');
      if (!res.ok) {
        this.nodes = [];
        return;
      }
      const data = await res.json();
      if (data && data.metrics) {
        this.metrics = {
          totalNodes: Number(data.metrics.totalNodes) || 0,
          activeNodes: Number(data.metrics.activeNodes) || 0,
          messagesPerMinute: Math.round((Number(data.metrics.messagesProcessed) || 0) / 60),
          avgLatencyMs: Number(data.metrics.avgLatencyMs) || 0,
          totalSlashings: 0,
          networkUptime: data.uptimePercentage !== undefined ? data.uptimePercentage : null,
          topContributors: Array.isArray(data.nodes) ? data.nodes.slice(0, 5).map((n: any) => n.name) : [],
        };
        if (Array.isArray(data.nodes) && data.nodes.length > 0) {
          this.nodes = data.nodes.map((n: any, idx: number) => ({
            id: n.nodeId || `node-${idx}`,
            name: n.name || `Node-${idx}`,
            x: 120 + ((idx * 130) % 560),
            y: 90 + ((idx * 85) % 260),
            role: (n.role as NodeRole) || 'relay',
            status: (n.status as NodeStatus) || 'active',
            latencyMs: Number(n.latencyMs) || 15,
            meritScore: Number(n.meritScore) || 100,
            region: n.region || 'Global',
            countryCode: n.countryCode || 'XX',
            uptime: Number(n.uptime) || 100,
            ipObfuscated: 'Encrypted Node Identity',
            zkRlnEpoch: Number(n.zkRlnEpoch) || 1,
            connections: Array.isArray(n.connections) ? n.connections : [],
            bandwidthMbps: Number(n.bandwidthMbps) || 100,
            messagesProcessed: Number(n.messagesProcessed) || 0,
          }));
        } else {
          this.nodes = [];
        }
        this.notifySubscribers();
        if (typeof document !== 'undefined' && this.isOpen) {
          this.updateOpenModalDOM();
        }
      } else {
        this.nodes = [];
      }
    } catch (err) {
      console.warn('[NetworkObservatory] Real telemetry fetch failed:', err);
      this.nodes = [];
    }
  }

  // ─── Data Initializers ───────────────────────────────────────────────

  public initLatencyHistory(): void {
    if (!isSimulationModeEnabled()) return;
    const points: LatencyDataPoint[] = [];
    const now = Date.now();
    const intervalMs = 3000; // One point every 3 seconds for the last 100 points
    let currentLatency = 21.5;

    for (let i = 99; i >= 0; i--) {
      const timestamp = now - i * intervalMs;
      // Deterministic latency generation without Math.random()
      const phase = (i * 0.35) % (2 * Math.PI);
      const wave = Math.sin(phase) * 3.2 + Math.cos(phase * 2.3) * 1.8;
      const spike = (i % 17 === 0) ? 12.5 : 0;
      currentLatency = Math.max(11.0, Math.min(85.0, 21.5 + wave + spike));

      const nodeIndex = this.nodes.length > 0 ? (i % this.nodes.length) : 0;
      const refNode = this.nodes[nodeIndex];
      points.push({
        timestamp,
        latencyMs: parseFloat(currentLatency.toFixed(1)),
        nodeId: refNode ? refNode.id : 'node-prime-gw',
      });
    }

    this.latencyHistory = points;
  }

  public initSlashing7DayStats(): void {
    if (!isSimulationModeEnabled()) return;
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const stats: SlashingDayStat[] = [];

    // Realistic pre-calculated data for the last 7 days
    const seedValues = [
      { doubleSign: 2, rateLimit: 4, epochGrief: 1, aeth: 28.5 },
      { doubleSign: 1, rateLimit: 6, epochGrief: 0, aeth: 18.0 },
      { doubleSign: 0, rateLimit: 3, epochGrief: 2, aeth: 14.5 },
      { doubleSign: 3, rateLimit: 5, epochGrief: 1, aeth: 35.0 },
      { doubleSign: 1, rateLimit: 4, epochGrief: 0, aeth: 16.5 },
      { doubleSign: 1, rateLimit: 2, epochGrief: 1, aeth: 15.0 },
      { doubleSign: 1, rateLimit: 1, epochGrief: 0, aeth: 15.0 }, // Today
    ];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayLabel = i === 0 ? 'Today' : i === 1 ? 'Yesterday' : `${dayNames[d.getDay()]} ${d.getDate()}`;
      const dateStr = d.toISOString().split('T')[0];
      const val = seedValues[6 - i] || { doubleSign: 1, rateLimit: 2, epochGrief: 0, aeth: 15 };

      stats.push({
        dayIndex: 6 - i,
        dayLabel,
        dateStr,
        doubleSignCount: val.doubleSign,
        rateLimitCount: val.rateLimit,
        epochGriefingCount: val.epochGrief,
        totalSlashings: val.doubleSign + val.rateLimit + val.epochGrief,
        totalPenaltiesAETH: val.aeth,
      });
    }

    this.slashing7DayStats = stats;
  }

  public calculateAvgLatency(): number {
    if (this.latencyHistory.length === 0) return 0;
    const sum = this.latencyHistory.reduce((acc, p) => acc + p.latencyMs, 0);
    return parseFloat((sum / this.latencyHistory.length).toFixed(1));
  }

  // ─── Live Telemetry Updates ──────────────────────────────────────────

  /**
   * Updates network metrics in real-time (live P2P simulation).
   */
  public updateMetrics(): void {
    if (!isSimulationModeEnabled()) return;
    const now = Date.now();
    this.lastUpdateTime = now;

    // 1. Active nodes variation (between 239 and 248)
    const nodeDrift = Math.floor((Math.random() - 0.45) * 3);
    this.metrics.activeNodes = Math.max(230, Math.min(254, this.metrics.activeNodes + nodeDrift));

    // 2. Messages per minute variation (between 4200 and 5900)
    const msgDrift = Math.floor((Math.random() - 0.48) * 140);
    this.metrics.messagesPerMinute = Math.max(3800, Math.min(6500, this.metrics.messagesPerMinute + msgDrift));

    // 3. Generate new latency point with jitter
    const lastLatency = this.latencyHistory.length > 0 
      ? this.latencyHistory[this.latencyHistory.length - 1].latencyMs 
      : 22.0;
    
    const drift = (22.5 - lastLatency) * 0.18;
    const noise = (Math.random() - 0.48) * 4.2;
    const spike = Math.random() > 0.95 ? (Math.random() * 32.0) : 0;
    const newLatency = parseFloat(Math.max(10.5, Math.min(92.0, lastLatency + drift + noise + spike)).toFixed(1));

    const randomNode = this.nodes[Math.floor(Math.random() * this.nodes.length)];
    const newPoint: LatencyDataPoint = {
      timestamp: now,
      latencyMs: newLatency,
      nodeId: randomNode ? randomNode.id : 'node-prime-gw',
    };

    // Keep exactly the last 100 points
    this.latencyHistory.push(newPoint);
    if (this.latencyHistory.length > 100) {
      this.latencyHistory.shift();
    }

    // 4. Recalculate average latency
    this.metrics.avgLatencyMs = this.calculateAvgLatency();

    // 5. Update individual node telemetry
    this.nodes.forEach(node => {
      const nodeJitter = (Math.random() - 0.48) * 1.8;
      node.latencyMs = parseFloat(Math.max(8.0, Math.min(65.0, node.latencyMs + nodeJitter)).toFixed(1));
      node.messagesProcessed += Math.floor(Math.random() * 45) + 10;
    });

    // 6. Update top contributor statistics
    this.topContributorsList.forEach(c => {
      c.messagesRelayed += Math.floor(Math.random() * 50) + 15;
      c.bandwidthContributedGB = parseFloat((c.bandwidthContributedGB + (Math.random() * 0.05)).toFixed(2));
      if (Math.random() > 0.6) {
        c.zkProofsVerified += 1;
      }
    });

    // 7. Occasional Slashing Shield simulation (very rare)
    if (Math.random() > 0.985) {
      this.triggerSimulatedSlash();
    }

    // 8. Notify registered subscribers
    this.notifySubscribers();

    // 9. Direct DOM update if modal is open
    if (typeof document !== 'undefined' && this.isOpen) {
      this.updateOpenModalDOM();
    }
  }

  private triggerSimulatedSlash(): void {
    const violationTypes: ViolationType[] = ['rate-limit', 'double-sign', 'epoch-griefing'];
    const selectedType = violationTypes[Math.floor(Math.random() * violationTypes.length)];
    const penalty = selectedType === 'double-sign' ? 50.0 : selectedType === 'rate-limit' ? 25.0 : 15.0;
    const merit = selectedType === 'double-sign' ? 3200 : selectedType === 'rate-limit' ? 1500 : 850;
    const randomHex = Math.random().toString(16).substring(2, 10);

    const newRecord: SlashingRecord = {
      id: `slash-${Date.now().toString(36)}`,
      timestamp: Date.now(),
      dayIndex: 6,
      dayLabel: 'Today',
      nodeId: `node-breach-0x${randomHex.substring(0, 4)}`,
      nodeName: `Sybil-Breach-${randomHex.substring(0, 4).toUpperCase()}`,
      violationType: selectedType,
      penaltyTokens: penalty,
      meritBurned: merit,
      zkNullifierHash: `0x${randomHex}${Date.now().toString(16)}0000112233445566778899aabbccddeeff`,
      txHash: `0x${randomHex}f9a1`,
      status: 'slashed',
    };

    this.slashingHistory.unshift(newRecord);
    if (this.slashingHistory.length > 20) {
      this.slashingHistory.pop();
    }

    this.metrics.totalSlashings += 1;

    // Update statistics for today
    const todayStat = this.slashing7DayStats[this.slashing7DayStats.length - 1];
    if (todayStat) {
      if (selectedType === 'double-sign') todayStat.doubleSignCount += 1;
      else if (selectedType === 'rate-limit') todayStat.rateLimitCount += 1;
      else todayStat.epochGriefingCount += 1;
      todayStat.totalSlashings += 1;
      todayStat.totalPenaltiesAETH += penalty;
    }
  }

  /**
   * Starts periodic live updates of metrics.
   */
  public startLiveUpdates(intervalMs: number = 2500): void {
    if (this.liveUpdateIntervalId !== null) {
      this.stopLiveUpdates();
    }
    this.isLiveUpdating = true;

    if (!isSimulationModeEnabled()) {
      // In production, poll real telemetry from /api/analytics
      this.fetchRealTelemetry();
      this.liveUpdateIntervalId = (typeof window !== 'undefined' ? window.setInterval : setInterval)(() => {
        this.fetchRealTelemetry();
      }, intervalMs) as unknown as number;
      return;
    }

    this.liveUpdateIntervalId = (typeof window !== 'undefined' ? window.setInterval : setInterval)(() => {
      this.updateMetrics();
    }, intervalMs) as unknown as number;
  }

  /**
   * Stops live updates.
   */
  public stopLiveUpdates(): void {
    if (this.liveUpdateIntervalId !== null) {
      if (typeof window !== 'undefined') {
        window.clearInterval(this.liveUpdateIntervalId);
      } else {
        clearInterval(this.liveUpdateIntervalId);
      }
      this.liveUpdateIntervalId = null;
    }
    this.isLiveUpdating = false;
  }

  public subscribe(callback: () => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(cb => {
      try {
        cb();
      } catch (err) {
        console.error('[NetworkObservatory] Subscriber callback error:', err);
      }
    });
  }

  // ─── Modal Control & Navigation ──────────────────────────────────────────

  public open(): void {
    this.isOpen = true;
    if (!isSimulationModeEnabled()) {
      this.fetchRealTelemetry();
    }
    if (!this.isLiveUpdating) {
      this.startLiveUpdates();
    }
    this.renderToDOM();
  }

  public close(): void {
    this.isOpen = false;
    this.selectedNodeId = null;
    this.stopLiveUpdates();
    if (typeof document !== 'undefined') {
      const modalEl = document.getElementById('network-observatory-modal-root');
      if (modalEl) {
        modalEl.remove();
      }
    }
  }

  public toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  public selectNode(nodeId: string | null): void {
    this.selectedNodeId = this.selectedNodeId === nodeId ? null : nodeId;
    if (this.isOpen) {
      this.renderToDOM();
    }
  }

  public setFilter(filter: TopologyFilter): void {
    this.activeFilter = filter;
    if (this.isOpen) {
      this.renderToDOM();
    }
  }

  public setActiveTab(tab: 'overview' | 'topology' | 'latency' | 'slashing' | 'contributors'): void {
    this.activeTab = tab;
    if (this.isOpen) {
      this.renderToDOM();
    }
  }

  public exportMetricsJSON(): string {
    const exportData = {
      exportedAt: new Date().toISOString(),
      networkMetrics: this.metrics,
      latencyAnalysis: {
        current: this.latencyHistory[this.latencyHistory.length - 1]?.latencyMs || 0,
        avg: this.calculateAvgLatency(),
        min: Math.min(...this.latencyHistory.map(p => p.latencyMs)),
        max: Math.max(...this.latencyHistory.map(p => p.latencyMs)),
        pointsCount: this.latencyHistory.length,
        recentPoints: this.latencyHistory.slice(-60),
      },
      slashing7DayStats: this.slashing7DayStats,
      recentSlashingRecords: this.slashingHistory.slice(0, 10),
      topContributors: this.topContributorsList,
      topologyNodesSummary: this.nodes.map(n => ({
        id: n.id,
        name: n.name,
        role: n.role,
        status: n.status,
        latencyMs: n.latencyMs,
        meritScore: n.meritScore,
        region: n.region,
      })),
    };
    return JSON.stringify(exportData, null, 2);
  }

  // ─── Standalone Button Rendering ──────────────────────────────────────────

  /**
   * Generates HTML for the `📡 Observatory` button for header or sidebar.
   */
  public renderObservatoryButton(): string {
    return `
      <button
        id="btn-network-observatory-trigger" data-action="call-global" data-raw-click="window.__aetheris_observatory_toggle && window.__aetheris_observatory_toggle()"
        class="group inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-raised hover:bg-surface-overlay border border-white/10 hover:border-cyphr/40 text-slate-200 hover:text-white transition-all text-xs font-medium shadow-sm hover:shadow-cyan-950/30 active:scale-95 cursor-pointer select-none"
        title="Open Aetheris Network Observatory (Statistics & P2P Topology)"
      >
        <span class="relative flex h-2 w-2">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-signal opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-signal"></span>
        </span>
        <span class="flex items-center gap-1.5 font-sans font-semibold tracking-wide">
          <span class="text-sm leading-none">📡</span>
          <span>Observatory</span>
        </span>
        <span class="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-surface-base text-cyphr border border-cyphr/20 group-hover:border-cyphr/40">
          ${this.metrics.activeNodes} Nodes
        </span>
      </button>
    `;
  }

  // ─── Full Main Modal Rendering ───────────────────────────────────────────

  /**
   * Generates complete HTML for the Network Observatory Modal.
   * Includes the 4 required sections:
   * 1. Network topology map (SVG Radar)
   * 2. Real-time latency chart (SVG sparkline / area chart)
   * 3. ZK-RLN slashing statistics (7-day bar chart & shield stats)
   * 4. Top Contributors (Merit Leaderboard)
   */
  public renderObservatoryModal(): string {
    return `
      <div 
        id="network-observatory-modal-root" 
        class="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto" data-action="call-global" data-raw-click="if(event.target.id === 'network-observatory-modal-root') { (window.__aetheris_close_observatory && window.__aetheris_close_observatory()) || (window.__aetheris_observatory_close && window.__aetheris_observatory_close()); }"
      >
        <!-- Global Reusable SVG Definitions -->
        ${this.renderAllSvgDefs()}

        <!-- Main Obsidian Glass Dialog Container -->
        <div class="relative w-full max-w-7xl max-h-[94vh] flex flex-col rounded-2xl bg-canvas border border-white/10 shadow-2xl shadow-cyan-950/40 text-slate-100 overflow-hidden font-sans">
          
          <!-- 1. Header Bar with Status and Global Controls -->
          ${this.renderHeader()}

          <!-- 2. Key Metrics Bar (KPI Summary Ribbon) -->
          ${this.renderGlobalMetrics()}

          <!-- 3. Main Scrollable Body (4 Complete Sections) -->
          <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar bg-surface-base/60">
            
            <!-- Section 1: Network Topology Map (Radar Mesh) -->
            ${this.renderTopologySection()}

            <!-- 2-Column Grid: Section 2 (Latency) & Section 3 (ZK-RLN Slashing) -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- Section 2: Real-Time Latency Chart -->
              ${this.renderLatencySection()}

              <!-- Section 3: ZK-RLN Slashing Statistics -->
              ${this.renderSlashingSection()}
            </div>

            <!-- Section 4: Top Contributors & Merit Leaderboard -->
            ${this.renderTopContributorsSection()}

            <!-- Section 5: Sovereign Federated Mesh & ActivityPub 2.0 Bridge -->
            <div id="observatory-federation-widget-container">
              ${nodeFederationEngine.renderFederatedMeshCard()}
            </div>

          </div>

          <!-- 4. Footer with Telemetry & Export Actions -->
          ${this.renderFooter()}

        </div>
      </div>
    `;
  }

  // ─── Internal Rendering Sections ──────────────────────────────────────────

  private renderHeader(): string {
    return `
      <div class="flex items-center justify-between px-5 py-4 bg-surface-raised border-b border-white/5 select-none">
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center w-9 h-9 rounded-xl bg-surface-overlay border border-cyphr/30 text-cyphr shadow-inner">
            <span class="text-xl">📡</span>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-base sm:text-lg font-bold text-white tracking-tight font-sans">
                Aetheris Network Observatory
              </h2>
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-cyphr/10 text-cyphr border border-cyphr/30">
                v2.4 ZK-MESH
              </span>
            </div>
            <p class="text-xs text-slate-400 font-sans">
              Decentralized cryptographic telemetry · BFT Consensus & Zero-Knowledge MLS Ratchet
            </p>
          </div>
        </div>

        <!-- Right: Live Indicator, Refresh & Close -->
        <div class="flex items-center gap-2 sm:gap-3">
          <div class="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-overlay border border-white/5 text-xs text-slate-300 font-mono">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-signal opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-signal"></span>
            </span>
            <span>LIVE SYNC</span>
          </div>

          <button data-action="call-global" data-raw-click="window.__aetheris_observatory_refresh && window.__aetheris_observatory_refresh()"
            class="flex items-center justify-center w-8 h-8 rounded-lg bg-surface-overlay hover:bg-slate-700 border border-white/10 text-slate-300 hover:text-white transition-all text-sm cursor-pointer"
            title="Force telemetry data refresh"
          >
            🔄
          </button>

          <button data-action="call-global" data-raw-click="window.__aetheris_observatory_export && window.__aetheris_observatory_export()"
            class="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-overlay hover:bg-slate-700 border border-white/10 text-slate-300 hover:text-white transition-all text-xs font-medium cursor-pointer"
            title="Export observatory data as JSON"
          >
            <span>📥 Export JSON</span>
          </button>

          <button
            id="btn-close-observatory-modal" data-action="call-global" data-raw-click="window.__aetheris_close_observatory && window.__aetheris_close_observatory()"
            class="flex items-center justify-center w-8 h-8 rounded-lg bg-surface-overlay hover:bg-crimson/20 hover:border-crimson/40 border border-white/10 text-slate-400 hover:text-crimson transition-all text-base font-bold cursor-pointer"
            title="Close Observatory (ESC)"
          >
            ✕
          </button>
        </div>
      </div>
    `;
  }

  private renderGlobalMetrics(): string {
    const totalNodes = this.metrics.totalNodes;
    const activeNodes = this.metrics.activeNodes;
    const activePct = totalNodes > 0 ? ((activeNodes / totalNodes) * 100).toFixed(1) + '%' : '0%';

    return `
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 p-3 sm:px-6 bg-surface-base border-b border-white/5 text-xs font-mono">
        <!-- Total Nodes -->
        <div class="flex flex-col p-2 rounded-lg bg-surface-raised/80 border border-white/5">
          <span class="text-[10px] uppercase tracking-wider text-slate-400">Total Nodes</span>
          <div class="flex items-baseline gap-1.5 mt-1">
            <span class="text-lg font-bold text-white">${totalNodes}</span>
            <span class="text-[10px] text-signal font-sans">${totalNodes > 0 ? 'Connected' : 'Offline'}</span>
          </div>
        </div>

        <!-- Active Nodes -->
        <div class="flex flex-col p-2 rounded-lg bg-surface-raised/80 border border-white/5">
          <span class="text-[10px] uppercase tracking-wider text-slate-400">Active Nodes</span>
          <div class="flex items-baseline gap-1.5 mt-1">
            <span class="text-lg font-bold text-signal">${activeNodes}</span>
            <span class="text-[10px] text-slate-400 font-sans">(${activePct})</span>
          </div>
        </div>

        <!-- Messages / Minute -->
        <div class="flex flex-col p-2 rounded-lg bg-surface-raised/80 border border-white/5">
          <span class="text-[10px] uppercase tracking-wider text-slate-400">Mesh Traffic</span>
          <div class="flex items-baseline gap-1.5 mt-1">
            <span class="text-lg font-bold text-cyphr">${this.metrics.messagesPerMinute.toLocaleString()}</span>
            <span class="text-[10px] text-slate-400 font-sans">msg/min</span>
          </div>
        </div>

        <!-- Average Latency -->
        <div class="flex flex-col p-2 rounded-lg bg-surface-raised/80 border border-white/5">
          <span class="text-[10px] uppercase tracking-wider text-slate-400">Average Latency</span>
          <div class="flex items-baseline gap-1.5 mt-1">
            <span class="text-lg font-bold ${this.metrics.avgLatencyMs < 25 ? 'text-signal' : this.metrics.avgLatencyMs < 45 ? 'text-amber' : 'text-crimson'}">
              ${this.metrics.avgLatencyMs}
            </span>
            <span class="text-[10px] text-slate-400 font-sans">ms</span>
          </div>
        </div>

        <!-- Total ZK-RLN Slashings -->
        <div class="flex flex-col p-2 rounded-lg bg-surface-raised/80 border border-white/5">
          <span class="text-[10px] uppercase tracking-wider text-slate-400">ZK-RLN Slashing</span>
          <div class="flex items-baseline gap-1.5 mt-1">
            <span class="text-lg font-bold text-crimson">${this.metrics.totalSlashings}</span>
            <span class="text-[10px] text-slate-400 font-sans">penalties</span>
          </div>
        </div>

        <!-- Network Uptime -->
        <div class="flex flex-col p-2 rounded-lg bg-surface-raised/80 border border-white/5">
          <span class="text-[10px] uppercase tracking-wider text-slate-400">Network Uptime</span>
          <div class="flex items-baseline gap-1.5 mt-1">
            ${this.metrics.networkUptime !== null
              ? `<span class="text-lg font-bold text-aether">${this.metrics.networkUptime}%</span>
                 <span class="text-[10px] text-signal font-sans">Measured</span>`
              : `<span class="text-xs font-semibold text-slate-400 font-sans">Measured uptime unavailable</span>`
            }
          </div>
        </div>
      </div>
    `;
  }

  // ─── Section 1: Topology Map (Radar SVG) ─────────────────────────────

  private renderTopologySection(): string {
    const filteredNodes = this.nodes.filter(n => {
      if (this.activeFilter === 'all') return true;
      return n.role === this.activeFilter;
    });

    const selectedNode = this.nodes.find(n => n.id === this.selectedNodeId);

    return `
      <div class="rounded-xl bg-surface-raised border border-white/10 p-4 sm:p-5 shadow-lg">
        <!-- Section Header with Role Filters -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
          <div class="flex items-center gap-2">
            <span class="text-cyphr text-lg">🕸️</span>
            <div>
              <h3 class="text-sm font-bold text-white uppercase tracking-wider font-mono">
                1. P2P Network Topology Map (Radar Mesh)
              </h3>
              <p class="text-xs text-slate-400 font-sans">
                Interactive visualization of network nodes, mesh links, and anonymous packet routing
              </p>
            </div>
          </div>

          <!-- Node Role Filters -->
          <div class="flex items-center gap-1.5 overflow-x-auto text-xs font-mono select-none">
            <span class="text-slate-400 text-[11px] mr-1 hidden md:inline">Filter:</span>
            ${this.renderFilterPill('all', 'All', this.nodes.length)}
            ${this.renderFilterPill('relay', 'Relay', this.nodes.filter(n => n.role === 'relay').length, '#00e5ff')}
            ${this.renderFilterPill('validator', 'Validator', this.nodes.filter(n => n.role === 'validator').length, '#a855f7')}
            ${this.renderFilterPill('storage', 'Storage', this.nodes.filter(n => n.role === 'storage').length, '#f59e0b')}
            ${this.renderFilterPill('gateway', 'Gateway', this.nodes.filter(n => n.role === 'gateway').length, '#22c55e')}
          </div>
        </div>

        <!-- SVG Radar Container & Node Details Panel -->
        <div class="relative mt-4 w-full rounded-xl bg-canvas border border-white/5 overflow-hidden">
          
          <!-- Main SVG Map -->
          <svg viewBox="0 0 800 440" class="w-full h-auto block select-none" style="min-height: 320px; max-height: 520px;">
            <!-- Radar Background & Concentric Grids -->
            <rect width="800" height="440" fill="#0d0f14" />
            
            <!-- Concentric Radar Circles (Center at 400, 220) -->
            <circle cx="400" cy="220" r="70" fill="none" stroke="#00e5ff" stroke-opacity="0.08" stroke-width="1" stroke-dasharray="3,3" />
            <circle cx="400" cy="220" r="140" fill="none" stroke="#00e5ff" stroke-opacity="0.08" stroke-width="1" />
            <circle cx="400" cy="220" r="210" fill="none" stroke="#00e5ff" stroke-opacity="0.06" stroke-width="1" stroke-dasharray="4,4" />
            <circle cx="400" cy="220" r="280" fill="none" stroke="#00e5ff" stroke-opacity="0.04" stroke-width="1" />
            <circle cx="400" cy="220" r="350" fill="none" stroke="#00e5ff" stroke-opacity="0.03" stroke-width="1" stroke-dasharray="6,6" />

            <!-- Radar Coordinate Axes -->
            <line x1="50" y1="220" x2="750" y2="220" stroke="#ffffff" stroke-opacity="0.04" stroke-width="1" />
            <line x1="400" y1="30" x2="400" y2="410" stroke="#ffffff" stroke-opacity="0.04" stroke-width="1" />
            <line x1="150" y1="70" x2="650" y2="370" stroke="#ffffff" stroke-opacity="0.02" stroke-width="1" />
            <line x1="150" y1="370" x2="650" y2="70" stroke="#ffffff" stroke-opacity="0.02" stroke-width="1" />

            <!-- Animated Radar Sweep Line (Continuous Scan) -->
            <g transform="translate(400, 220)">
              <line x1="0" y1="0" x2="0" y2="-360" stroke="url(#radarSweepGrad)" stroke-width="2" opacity="0.6">
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0"
                  to="360"
                  dur="10s"
                  repeatCount="indefinite"
                />
              </line>
            </g>

            <!-- P2P Mesh Connection Lines (Links) -->
            <g id="topology-links" class="opacity-80">
              ${this.renderTopologyLinks(filteredNodes)}
            </g>

            <!-- Interactive Nodes (Nodes Group) -->
            <g id="topology-nodes">
              ${filteredNodes.map(node => this.renderSvgNode(node)).join('\n')}
            </g>

            ${filteredNodes.length === 0 ? `
              <g transform="translate(400, 220)">
                <text text-anchor="middle" y="-6" fill="#64748b" font-size="14" font-family="monospace">
                  No network topology data available
                </text>
                <text text-anchor="middle" y="20" fill="#94a3b8" font-size="12" font-family="monospace">
                  No measured telemetry available. Nodes will appear as they join the sovereign mesh.
                </text>
                <text text-anchor="middle" y="44" fill="#475569" font-size="11" font-family="sans-serif">
                  Connect peer nodes or enable simulation mode to view mesh topology.
                </text>
              </g>
            ` : ''}

            <!-- HUD Information Decorative Text -->
            <text x="20" y="30" fill="#00e5ff" opacity="0.6" font-size="10" font-family="monospace">
              RADAR://TOPOLOGY_LAYER_L3 [ACTIVE NODES: ${filteredNodes.length}/${this.nodes.length}]
            </text>
            <text x="20" y="425" fill="#64748b" opacity="0.7" font-size="9" font-family="monospace">
              RANGE: 4000km · MIXNET HOPS: 5 · CIPHER: CHACHA20-POLY1305 · ZK-PROOF: BN254
            </text>
            <text x="780" y="425" text-anchor="end" fill="#64748b" opacity="0.7" font-size="9" font-family="monospace">
              CLK: ${new Date().toLocaleTimeString()}
            </text>
          </svg>

          <!-- Selected Node Details Drawer (Floating corner overlay) -->
          ${selectedNode ? this.renderSelectedNodeDrawer(selectedNode) : `
            <div class="absolute bottom-3 right-3 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-base/90 border border-white/10 backdrop-blur-sm text-[11px] text-slate-400 font-mono pointer-events-none">
              <span>💡 Click a node to inspect detailed telemetry</span>
            </div>
          `}
        </div>

        ${this.nodes.length === 0 ? `
          <div class="mt-4 p-5 rounded-xl bg-canvas border border-dashed border-white/10 text-center font-mono text-xs text-slate-400">
            No measured telemetry available. Nodes will appear as they join the sovereign mesh.
          </div>
        ` : ''}

        <!-- Node Roles & Status Legend -->
        <div class="flex flex-wrap items-center justify-between gap-4 mt-3 pt-3 border-t border-white/5 text-xs text-slate-400 font-mono">
          <div class="flex items-center gap-4">
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-cyphr"></span> Relay</span>
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-aether"></span> Validator</span>
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-amber"></span> Storage Vault</span>
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-signal"></span> Gateway Core</span>
          </div>
          <div class="flex items-center gap-4">
            <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-signal animate-pulse"></span> Active & Synced</span>
            <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-amber animate-pulse"></span> GossipSub Syncing</span>
          </div>
        </div>
      </div>
    `;
  }

  private renderFilterPill(filter: TopologyFilter, label: string, count: number, color?: string): string {
    const isActive = this.activeFilter === filter;
    return `
      <button data-action="call-global" data-raw-click="window.__aetheris_observatory_set_filter && window.__aetheris_observatory_set_filter('${filter}')"
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
          isActive
            ? 'bg-cyphr/20 border border-cyphr/50 text-cyphr font-bold shadow-sm'
            : 'bg-surface-overlay hover:bg-slate-700 border border-white/5 text-slate-300'
        }"
      >
        ${color ? `<span class="w-2 h-2 rounded-full" style="background-color: ${color}"></span>` : ''}
        <span>${label}</span>
        <span class="px-1 py-0.2 rounded text-[10px] bg-canvas text-slate-400">${count}</span>
      </button>
    `;
  }

  private renderTopologyLinks(visibleNodes: TopologyNode[]): string {
    const nodeMap = new Map<string, TopologyNode>(this.nodes.map(n => [n.id, n]));
    const renderedPairs = new Set<string>();
    const lines: string[] = [];

    visibleNodes.forEach(source => {
      source.connections.forEach(targetId => {
        const target = nodeMap.get(targetId);
        if (!target) return;

        // Avoid duplicate lines between the same 2 nodes
        const pairKey = [source.id, target.id].sort().join('--');
        if (renderedPairs.has(pairKey)) return;
        renderedPairs.add(pairKey);

        const isHighlighted = this.selectedNodeId === source.id || this.selectedNodeId === target.id;
        const strokeColor = isHighlighted ? '#00e5ff' : 'rgba(0, 229, 255, 0.18)';
        const strokeWidth = isHighlighted ? '2' : '1';
        const dashArray = isHighlighted ? 'none' : '4,6';

        lines.push(`
          <line
            x1="${source.x}"
            y1="${source.y}"
            x2="${target.x}"
            y2="${target.y}"
            stroke="${strokeColor}"
            stroke-width="${strokeWidth}"
            stroke-dasharray="${dashArray}"
            class="${isHighlighted ? 'animate-pulse' : ''}"
          />
        `);
      });
    });

    return lines.join('\n');
  }

  private renderSvgNode(node: TopologyNode): string {
    const isSelected = this.selectedNodeId === node.id;
    let roleColor = '#00e5ff'; // cyphr
    if (node.role === 'validator') roleColor = '#a855f7'; // aether
    if (node.role === 'storage') roleColor = '#f59e0b'; // amber
    if (node.role === 'gateway') roleColor = '#22c55e'; // signal

    const radius = node.role === 'gateway' ? 9 : 7;

    return `
      <g
        id="svg-node-${node.id}"
        transform="translate(${node.x}, ${node.y})"
        class="cursor-pointer transition-transform hover:scale-125" data-action="call-global" data-raw-click="window.__aetheris_observatory_select_node && window.__aetheris_observatory_select_node('${node.id}')"
      >
        <!-- Pulsing Circle for Active Nodes -->
        ${node.status === 'active' ? `
          <circle
            r="${radius + 6}"
            fill="none"
            stroke="${roleColor}"
            stroke-width="1.5"
            opacity="0.4"
          >
            <animate attributeName="r" values="${radius + 2};${radius + 12};${radius + 2}" dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6;0;0.6" dur="3s" repeatCount="indefinite" />
          </circle>
        ` : ''}

        <!-- Active Selection Circle -->
        ${isSelected ? `
          <circle r="${radius + 10}" fill="none" stroke="#ffffff" stroke-width="2" stroke-dasharray="3,3" opacity="0.9">
            <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="8s" repeatCount="indefinite" />
          </circle>
        ` : ''}

        <!-- Main Node Body -->
        <circle
          r="${radius}"
          fill="${roleColor}"
          filter="url(#glowFilter)"
          stroke="#ffffff"
          stroke-width="${isSelected ? '2' : '1'}"
          stroke-opacity="0.8"
        />

        <!-- Center White Dot -->
        <circle r="${radius > 7 ? 3 : 2}" fill="#ffffff" />

        <!-- Name & Latency Text Label -->
        <text
          y="${radius + 14}"
          text-anchor="middle"
          fill="${isSelected ? '#ffffff' : '#cbd5e1'}"
          font-size="10"
          font-family="monospace"
          font-weight="${isSelected ? 'bold' : 'normal'}"
          class="pointer-events-none select-none"
        >
          ${node.name.split('-')[0]}
        </text>
        <text
          y="${radius + 24}"
          text-anchor="middle"
          fill="${node.latencyMs < 25 ? '#22c55e' : '#f59e0b'}"
          font-size="9"
          font-family="monospace"
          class="pointer-events-none select-none"
        >
          ${node.latencyMs}ms
        </text>
      </g>
    `;
  }

  private renderSelectedNodeDrawer(node: TopologyNode): string {
    return `
      <div class="absolute top-3 right-3 w-72 p-3.5 rounded-xl bg-surface-raised/95 border border-cyphr/40 shadow-2xl backdrop-blur-md text-xs font-sans animate-in fade-in slide-in-from-right-4 duration-150">
        <div class="flex items-center justify-between pb-2 border-b border-white/10">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full ${node.status === 'active' ? 'bg-signal' : 'bg-amber'} animate-pulse"></span>
            <span class="font-bold text-white font-mono text-[13px]">${node.name}</span>
          </div>
          <button data-action="call-global" data-raw-click="window.__aetheris_observatory_select_node && window.__aetheris_observatory_select_node(null)"
            class="text-slate-400 hover:text-white text-xs p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div class="mt-2.5 space-y-1.5 font-mono text-[11px]">
          <div class="flex justify-between">
            <span class="text-slate-400">Network Role:</span>
            <span class="text-cyphr uppercase font-bold">${node.role}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-400">Location & Region:</span>
            <span class="text-white">${node.region} [${node.countryCode}]</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-400">Live Latency:</span>
            <span class="${node.latencyMs < 25 ? 'text-signal' : 'text-amber'} font-bold">${node.latencyMs} ms</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-400">Merit Score:</span>
            <span class="text-aether font-bold">${node.meritScore.toLocaleString()} pts</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-400">Node Uptime:</span>
            <span class="text-signal">${node.uptime}%</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-400">Link Bandwidth:</span>
            <span class="text-white">${(node.bandwidthMbps / 1000).toFixed(1)} Gbps</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-400">ZK-RLN Epoch:</span>
            <span class="text-white">#${node.zkRlnEpoch}</span>
          </div>
          <div class="pt-1.5 border-t border-white/5">
            <span class="text-slate-400 block text-[10px]">Obfuscated Identity / Route:</span>
            <span class="text-slate-300 text-[10px] truncate block" title="${node.ipObfuscated}">
              ${node.ipObfuscated}
            </span>
          </div>
        </div>

        <div class="mt-3 pt-2 border-t border-white/5 flex gap-2">
          <button data-action="call-global" data-raw-click="if(window.clientStore) window.clientStore.showToast('ICMP Zero-Knowledge Ping to ${node.name}: ${node.latencyMs}ms', 'info');"
            class="flex-1 py-1 rounded bg-cyphr/10 hover:bg-cyphr/20 border border-cyphr/30 text-cyphr text-center text-[10px] font-mono cursor-pointer"
          >
            ⚡ ZK Ping Test
          </button>
        </div>
      </div>
    `;
  }

  // ─── Section 2: Real-Time Latency Chart ─────────────────────────────────

  private renderLatencySection(): string {
    // Take last 60 points for main sparkline
    const recentPoints = this.latencyHistory.slice(-60);
    const count = recentPoints.length;

    if (count === 0) {
      return `
        <div class="rounded-xl bg-surface-raised border border-white/10 p-4 sm:p-5 shadow-lg">
          <div class="flex items-center gap-2 pb-3 border-b border-white/5">
            <span class="text-signal text-lg">⚡</span>
            <div>
              <h3 class="text-sm font-bold text-white uppercase tracking-wider font-mono">
                2. Real-Time Network Latency & Jitter Monitor
              </h3>
              <p class="text-xs text-slate-400 font-sans">
                Dynamic telemetry sampling across sovereign mesh relays
              </p>
            </div>
          </div>
          <div class="mt-4 p-8 rounded-xl bg-canvas border border-white/5 text-center text-slate-400 font-mono text-xs">
            Data Unavailable (No active telemetry ping samples recorded yet)
          </div>
        </div>
      `;
    }
    
    // Calculate Min / Max / Avg / P95 / P99
    const latencies = recentPoints.map(p => p.latencyMs);
    const minLatency = latencies.length > 0 ? Math.min(...latencies) : 15.0;
    const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 45.0;
    const avgLatency = this.calculateAvgLatency();

    // Calcul P95 / P99
    const sorted = [...latencies].sort((a, b) => a - b);
    const p95 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.95)] : avgLatency;
    const p99 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.99)] : maxLatency;

    // SVG Plot Dimensions
    const svgWidth = 640;
    const svgHeight = 200;
    const padLeft = 45;
    const padRight = 20;
    const padTop = 25;
    const padBottom = 30;

    const plotWidth = svgWidth - padLeft - padRight;
    const plotHeight = svgHeight - padTop - padBottom;

    // Y-axis scaling (rounded max upper, min 0)
    const yMax = Math.max(60, Math.ceil((maxLatency + 10) / 10) * 10);
    const yMin = 0;

    // Coordinates for SVG Path
    const coords = recentPoints.map((p, idx) => {
      const x = padLeft + (idx / Math.max(1, count - 1)) * plotWidth;
      const y = padTop + plotHeight - ((p.latencyMs - yMin) / (yMax - yMin)) * plotHeight;
      return { x, y, latency: p.latencyMs };
    });

    // Generate Bezier Smooth Path or Polyline
    let linePath = '';
    let areaPath = '';

    if (coords.length > 0) {
      linePath = `M ${coords[0].x} ${coords[0].y}`;
      for (let i = 1; i < coords.length; i++) {
        const prev = coords[i - 1];
        const curr = coords[i];
        const cpX1 = prev.x + (curr.x - prev.x) / 2;
        const cpY1 = prev.y;
        const cpX2 = prev.x + (curr.x - prev.x) / 2;
        const cpY2 = curr.y;
        linePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${curr.x} ${curr.y}`;
      }

      // Close Area Chart surface for gradient
      const lastX = coords[coords.length - 1].x;
      const firstX = coords[0].x;
      const bottomY = padTop + plotHeight;
      areaPath = `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
    }

    // Calculate horizontal Average line
    const avgY = padTop + plotHeight - ((avgLatency - yMin) / (yMax - yMin)) * plotHeight;

    // Last point for animated dot
    const lastCoord = coords[coords.length - 1] || { x: padLeft, y: padTop + plotHeight / 2, latency: avgLatency };

    return `
      <div class="rounded-xl bg-surface-raised border border-white/10 p-4 sm:p-5 shadow-lg flex flex-col justify-between">
        <div>
          <!-- Latency Section Header -->
          <div class="flex items-center justify-between pb-3 border-b border-white/5">
            <div class="flex items-center gap-2">
              <span class="text-signal text-lg">⚡</span>
              <div>
                <h3 class="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  2. Real-Time Latency Chart (60 Points)
                </h3>
                <p class="text-xs text-slate-400 font-sans">
                  Monitoring jitter oscillation, propagation times, and ratcheting degradation
                </p>
              </div>
            </div>

            <!-- Indicator curent -->
            <div class="text-right">
              <span class="text-xs text-slate-400 font-mono">Current Latency:</span>
              <div class="text-lg font-bold font-mono text-cyphr">${lastCoord.latency} ms</div>
            </div>
          </div>

          <!-- SVG Plot Sparkline -->
          <div class="relative mt-4 w-full rounded-xl bg-canvas border border-white/5 p-2 overflow-hidden">
            <svg viewBox="0 0 ${svgWidth} ${svgHeight}" class="w-full h-auto block select-none">
              <!-- Horizontal Y-Axis Grids -->
              ${[0, 20, 40, 60, yMax].map(val => {
                const y = padTop + plotHeight - ((val - yMin) / (yMax - yMin)) * plotHeight;
                return `
                  <line x1="${padLeft}" y1="${y}" x2="${svgWidth - padRight}" y2="${y}" stroke="#ffffff" stroke-opacity="0.06" stroke-dasharray="3,3" />
                  <text x="${padLeft - 8}" y="${y + 3}" text-anchor="end" fill="#64748b" font-size="9" font-family="monospace">${val}ms</text>
                `;
              }).join('\n')}

              <!-- Average Reference Line -->
              <line
                x1="${padLeft}"
                y1="${avgY}"
                x2="${svgWidth - padRight}"
                y2="${avgY}"
                stroke="#f59e0b"
                stroke-width="1.5"
                stroke-dasharray="4,4"
                opacity="0.7"
              />
              <text x="${svgWidth - padRight}" y="${avgY - 4}" text-anchor="end" fill="#f59e0b" font-size="8" font-family="monospace">
                AVG ${avgLatency}ms
              </text>

              <!-- Gradient Latency Area Surface -->
              ${areaPath ? `<path d="${areaPath}" fill="url(#latencyAreaGrad)" />` : ''}

              <!-- Main Latency Line -->
              ${linePath ? `
                <path
                  d="${linePath}"
                  fill="none"
                  stroke="#00e5ff"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  filter="url(#glowFilter)"
                />
              ` : ''}

              <!-- Current Active Point (Pulsing Glow Dot) -->
              <g transform="translate(${lastCoord.x}, ${lastCoord.y})">
                <circle r="8" fill="#00e5ff" opacity="0.3" class="animate-ping" />
                <circle r="4.5" fill="#00e5ff" stroke="#ffffff" stroke-width="1.5" />
              </g>
            </svg>
          </div>
        </div>

        <!-- Bottom Metric Pills -->
        <div class="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-white/5 text-center font-mono text-xs">
          <div class="p-1.5 rounded bg-surface-base border border-white/5">
            <span class="text-[10px] text-slate-400 uppercase">Min</span>
            <div class="font-bold text-signal">${minLatency} ms</div>
          </div>
          <div class="p-1.5 rounded bg-surface-base border border-white/5">
            <span class="text-[10px] text-slate-400 uppercase">Average</span>
            <div class="font-bold text-amber">${avgLatency} ms</div>
          </div>
          <div class="p-1.5 rounded bg-surface-base border border-white/5">
            <span class="text-[10px] text-slate-400 uppercase">P95</span>
            <div class="font-bold text-cyphr">${p95} ms</div>
          </div>
          <div class="p-1.5 rounded bg-surface-base border border-white/5">
            <span class="text-[10px] text-slate-400 uppercase">Max (P99)</span>
            <div class="font-bold text-crimson">${maxLatency} ms</div>
          </div>
        </div>
      </div>
    `;
  }

  // ─── Section 3: ZK-RLN Slashing Statistics ───────────────────────────────

  private renderSlashingSection(): string {
    const stats = this.slashing7DayStats;
    if (stats.length === 0) {
      return `
        <div class="rounded-xl bg-surface-raised border border-white/10 p-4 sm:p-5 shadow-lg flex flex-col justify-between">
          <div class="flex items-center justify-between pb-3 border-b border-white/5">
            <div class="flex items-center gap-2">
              <span class="text-crimson text-lg">🛡️</span>
              <div>
                <h3 class="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  3. ZK-RLN Slashing Statistics (7 Days)
                </h3>
                <p class="text-xs text-slate-400 font-sans">
                  Automated penalties for spam, double-sign & desync on BN254 curve
                </p>
              </div>
            </div>
          </div>
          <div class="mt-4 p-8 rounded-xl bg-canvas border border-white/5 text-center text-slate-400 font-mono text-xs">
            Data Unavailable (No historical slashing events registered)
          </div>
        </div>
      `;
    }

    const totalPenaltiesBurned = stats.reduce((acc, s) => acc + s.totalPenaltiesAETH, 0).toFixed(1);
    const maxVal = Math.max(8, ...stats.map(s => s.totalSlashings));

    // SVG Bar Chart Dimensions
    const svgWidth = 640;
    const svgHeight = 200;
    const padLeft = 35;
    const padRight = 20;
    const padTop = 20;
    const padBottom = 35;

    const plotWidth = svgWidth - padLeft - padRight;
    const plotHeight = svgHeight - padTop - padBottom;
    const barGroupWidth = plotWidth / stats.length;
    const singleBarWidth = Math.min(26, barGroupWidth * 0.55);

    return `
      <div class="rounded-xl bg-surface-raised border border-white/10 p-4 sm:p-5 shadow-lg flex flex-col justify-between">
        <div>
          <!-- Slashing Section Header -->
          <div class="flex items-center justify-between pb-3 border-b border-white/5">
            <div class="flex items-center gap-2">
              <span class="text-crimson text-lg">🛡️</span>
              <div>
                <h3 class="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  3. ZK-RLN Slashing Statistics (7 Days)
                </h3>
                <p class="text-xs text-slate-400 font-sans">
                  Automated penalties for spam, double-sign & desync on BN254 curve
                </p>
              </div>
            </div>

            <!-- Total Tokens Burned -->
            <div class="text-right">
              <span class="text-xs text-slate-400 font-mono">7-Day Penalties:</span>
              <div class="text-lg font-bold font-mono text-crimson">${totalPenaltiesBurned} $AETH</div>
            </div>
          </div>

          <!-- 7-Day SVG Bar Chart -->
          <div class="relative mt-4 w-full rounded-xl bg-canvas border border-white/5 p-2 overflow-hidden">
            <svg viewBox="0 0 ${svgWidth} ${svgHeight}" class="w-full h-auto block select-none">
              <!-- Horizontal Y-Axis Lines -->
              ${[0, 2, 4, 6, maxVal].map(val => {
                const y = padTop + plotHeight - (val / maxVal) * plotHeight;
                return `
                  <line x1="${padLeft}" y1="${y}" x2="${svgWidth - padRight}" y2="${y}" stroke="#ffffff" stroke-opacity="0.06" stroke-dasharray="3,3" />
                  <text x="${padLeft - 6}" y="${y + 3}" text-anchor="end" fill="#64748b" font-size="9" font-family="monospace">${val}</text>
                `;
              }).join('\n')}

              <!-- Daily Grouped / Stacked Bars -->
              ${stats.map((stat, idx) => {
                const groupX = padLeft + idx * barGroupWidth + (barGroupWidth - singleBarWidth) / 2;
                
                // Proportional heights for the 3 violation types
                const totalH = (stat.totalSlashings / maxVal) * plotHeight;
                const doubleH = (stat.doubleSignCount / maxVal) * plotHeight;
                const rateH = (stat.rateLimitCount / maxVal) * plotHeight;
                const epochH = (stat.epochGriefingCount / maxVal) * plotHeight;

                const baseY = padTop + plotHeight;
                const doubleY = baseY - doubleH;
                const rateY = doubleY - rateH;
                const epochY = rateY - epochH;

                return `
                  <!-- Stacked Bar: Double Sign (Crimson) -->
                  <rect
                    x="${groupX}"
                    y="${doubleY}"
                    width="${singleBarWidth}"
                    height="${Math.max(0, doubleH)}"
                    fill="#ef4444"
                    rx="${stat.rateLimitCount === 0 && stat.epochGriefingCount === 0 ? '3' : '0'}"
                  />

                  <!-- Stacked Bar: Rate Limit (Amber) -->
                  <rect
                    x="${groupX}"
                    y="${rateY}"
                    width="${singleBarWidth}"
                    height="${Math.max(0, rateH)}"
                    fill="#f59e0b"
                    rx="${stat.epochGriefingCount === 0 ? '3' : '0'}"
                  />

                  <!-- Stacked Bar: Epoch Griefing (Aether Purple) -->
                  <rect
                    x="${groupX}"
                    y="${epochY}"
                    width="${singleBarWidth}"
                    height="${Math.max(0, epochH)}"
                    fill="#a855f7"
                    rx="3"
                  />

                  <!-- Total Label above bar -->
                  <text
                    x="${groupX + singleBarWidth / 2}"
                    y="${baseY - totalH - 5}"
                    text-anchor="middle"
                    fill="#ffffff"
                    font-size="9"
                    font-family="monospace"
                    font-weight="bold"
                  >
                    ${stat.totalSlashings}
                  </text>

                  <!-- Day Label (X-Axis) -->
                  <text
                    x="${groupX + singleBarWidth / 2}"
                    y="${svgHeight - 12}"
                    text-anchor="middle"
                    fill="${idx === stats.length - 1 ? '#00e5ff' : '#94a3b8'}"
                    font-size="9"
                    font-family="monospace"
                    font-weight="${idx === stats.length - 1 ? 'bold' : 'normal'}"
                  >
                    ${stat.dayLabel}
                  </text>
                `;
              }).join('\n')}
            </svg>
          </div>
        </div>

        <!-- Slashing & Spam Deterrence Legend -->
        <div class="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-white/5 text-xs text-slate-400 font-mono">
          <div class="flex items-center gap-3">
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded bg-crimson"></span> Double-Sign</span>
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded bg-amber"></span> RLN Rate-Limit</span>
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded bg-aether"></span> Epoch Griefing</span>
          </div>
          <div class="text-signal text-[11px]">
            ✓ Sybil Deterred 99.94%
          </div>
        </div>
      </div>
    `;
  }

  // ─── Section 4: Top Contributors & Merit Leaderboard ─────────────────────

  private renderTopContributorsSection(): string {
    const maxMerit = Math.max(...this.topContributorsList.map(c => c.meritScore), 10000);

    return `
      <div class="rounded-xl bg-surface-raised border border-white/10 p-4 sm:p-5 shadow-lg">
        <!-- Contributors Section Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
          <div class="flex items-center gap-2">
            <span class="text-amber text-lg">🏆</span>
            <div>
              <h3 class="text-sm font-bold text-white uppercase tracking-wider font-mono">
                4. Top 5 Contributors (Merit Leaderboard)
              </h3>
              <p class="text-xs text-slate-400 font-sans">
                Nodes with highest cryptographic reliability, relay volume, and validated ZK proofs
              </p>
            </div>
          </div>

          <div class="text-xs font-mono text-slate-400">
            Algorithm: <span class="text-aether font-semibold">EigenTrust + ZK-Multiplier</span>
          </div>
        </div>

        <!-- Top 5 Nodes Table / List -->
        <div class="mt-4 overflow-x-auto">
          <table class="w-full text-left font-sans text-xs border-collapse">
            <thead>
              <tr class="border-b border-white/10 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <th class="py-2 px-3">Rank</th>
                <th class="py-2 px-3">Node & Identity</th>
                <th class="py-2 px-3">Tier</th>
                <th class="py-2 px-3">Merit Score</th>
                <th class="py-2 px-3">Uptime</th>
                <th class="py-2 px-3">ZK Proofs</th>
                <th class="py-2 px-3 text-right">Bandwidth</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5 font-mono">
              ${this.topContributorsList.length === 0 ? `
                <tr>
                  <td colspan="7" class="py-8 text-center text-slate-400 font-mono">
                    Data Unavailable (No active node contributors found)
                  </td>
                </tr>
              ` : this.topContributorsList.map(c => {
                const meritPct = Math.round((c.meritScore / maxMerit) * 100);
                const rankBadge = c.rank === 1 ? '🥇' : c.rank === 2 ? '🥈' : c.rank === 3 ? '🥉' : `#${c.rank}`;
                
                let tierBadgeClass = 'bg-cyphr/10 text-cyphr border-cyphr/30';
                if (c.tier === 'Archon') tierBadgeClass = 'bg-amber/10 text-amber border-amber/30';
                if (c.tier === 'Sentinel') tierBadgeClass = 'bg-aether/10 text-aether border-aether/30';
                if (c.tier === 'Validator') tierBadgeClass = 'bg-signal/10 text-signal border-signal/30';

                return `
                  <tr class="hover:bg-surface-overlay/60 transition-colors group">
                    <!-- Rank -->
                    <td class="py-3 px-3 font-bold text-sm">
                      <span class="inline-flex items-center justify-center w-6 h-6 rounded-md bg-surface-base border border-white/5">
                        ${rankBadge}
                      </span>
                    </td>

                    <!-- Node & Fingerprint -->
                    <td class="py-3 px-3">
                      <div class="flex items-center gap-2">
                        <div class="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow" style="background-color: ${c.avatarColor}">
                          ${c.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div class="font-bold text-white font-sans text-xs group-hover:text-cyphr transition-colors">
                            ${c.name}
                          </div>
                          <div class="text-[10px] text-slate-400 flex items-center gap-1.5">
                            <span>${c.region}</span>
                            <span>·</span>
                            <span class="text-cyphr font-mono">${c.fingerprint}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <!-- Tier Badge -->
                    <td class="py-3 px-3">
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${tierBadgeClass}">
                        ${c.tier}
                      </span>
                    </td>

                    <!-- Merit Score Bar & Value -->
                    <td class="py-3 px-3 min-w-[140px]">
                      <div class="flex items-center justify-between text-[11px] mb-1">
                        <span class="font-bold text-white">${c.meritScore.toLocaleString()}</span>
                        <span class="text-[10px] text-slate-400">${meritPct}%</span>
                      </div>
                      <div class="w-full h-1.5 rounded-full bg-surface-base overflow-hidden border border-white/5">
                        <div
                          class="h-full rounded-full bg-gradient-to-r from-cyphr to-aether"
                          style="width: ${meritPct}%"
                        ></div>
                      </div>
                    </td>

                    <!-- Uptime -->
                    <td class="py-3 px-3 text-signal font-semibold">
                      ${c.uptimePct}%
                    </td>

                    <!-- ZK Proofs Verified -->
                    <td class="py-3 px-3 text-slate-300">
                      ${c.zkProofsVerified.toLocaleString()}
                    </td>

                    <!-- Contributed Bandwidth -->
                    <td class="py-3 px-3 text-right text-slate-300">
                      ${(c.bandwidthContributedGB / 1024).toFixed(2)} TB
                    </td>
                  </tr>
                `;
              }).join('\n')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  private renderFooter(): string {
    return `
      <div class="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 bg-surface-raised border-t border-white/5 text-xs text-slate-400 font-mono select-none">
        <div class="flex items-center gap-4">
          <span class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-signal"></span>
            <span>BFT Consensus Finality: <strong class="text-white">&lt; 1.2s</strong></span>
          </span>
          <span class="hidden md:inline text-white/20">|</span>
          <span class="hidden md:flex items-center gap-1.5">
            <span>Circom ZK Verifier: <strong class="text-cyphr">0.8ms / batch</strong></span>
          </span>
        </div>

        <div class="flex items-center gap-2">
          <button data-action="call-global" data-raw-click="window.__aetheris_close_observatory && window.__aetheris_close_observatory()"
            class="px-4 py-1.5 rounded-lg bg-surface-overlay hover:bg-slate-700 border border-white/10 text-slate-200 hover:text-white transition-all text-xs font-semibold cursor-pointer"
          >
            Close Observatory
          </button>
        </div>
      </div>
    `;
  }

  // ─── SVG Defs Globale ──────────────────────────────────────────────────────

  private renderAllSvgDefs(): string {
    return `
      <svg class="absolute w-0 h-0 overflow-hidden" aria-hidden="true">
        <defs>
          <!-- Gradient for Radar Sweep -->
          <linearGradient id="radarSweepGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#00e5ff" stop-opacity="0.8" />
            <stop offset="100%" stop-color="#00e5ff" stop-opacity="0.0" />
          </linearGradient>

          <!-- Gradient for Latency Area Chart -->
          <linearGradient id="latencyAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#00e5ff" stop-opacity="0.35" />
            <stop offset="60%" stop-color="#00e5ff" stop-opacity="0.08" />
            <stop offset="100%" stop-color="#00e5ff" stop-opacity="0.0" />
          </linearGradient>

          <!-- Glow Filter for Neon Elements -->
          <filter id="glowFilter" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
      </svg>
    `;
  }

  // ─── DOM Integration & Interactivity ───────────────────────────────────

  private renderToDOM(): void {
    if (typeof document === 'undefined') return;

    let root = document.getElementById('network-observatory-modal-root');
    if (root) {
      // Directly replace modal content
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = this.renderObservatoryModal();
      const newRoot = tempDiv.firstElementChild;
      if (newRoot && root.parentNode) {
        root.parentNode.replaceChild(newRoot, root);
      }
    } else {
      // Insert modal into document.body
      const container = document.createElement('div');
      container.innerHTML = this.renderObservatoryModal();
      if (container.firstElementChild) {
        document.body.appendChild(container.firstElementChild);
      }
    }

    this.bindWindowGlobals();
  }

  private updateOpenModalDOM(): void {
    // Smart partial update or full re-render
    this.renderToDOM();
  }

  private bindWindowGlobals(): void {
    if (typeof window === 'undefined') return;

    window.__aetheris_close_observatory = () => this.close();
    window.__aetheris_observatory_close = () => this.close();
    window.__aetheris_observatory_toggle = () => this.toggle();
    window.__aetheris_observatory_refresh = () => {
      this.updateMetrics();
      this.renderToDOM();
    };
    window.__aetheris_observatory_select_node = (nodeId: string | null) => this.selectNode(nodeId);
    window.__aetheris_observatory_set_filter = (filter: TopologyFilter) => this.setFilter(filter);
    window.__aetheris_observatory_export = () => {
      const json = this.exportMetricsJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aetheris-network-observatory-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    };
    nodeFederationEngine.bindEvents();
  }

  private attachGlobalKeyboardListener(): void {
    if (typeof window === 'undefined') return;
    this.bindWindowGlobals();

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }
}

// ---------------------------------------------------------------------------
// 4. Singleton Instance Export
// ---------------------------------------------------------------------------

export const networkObservatory = new NetworkObservatory();
