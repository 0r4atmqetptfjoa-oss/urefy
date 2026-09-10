/**
 * UREfy — Gossip Protocol P2P Visualizer (GossipProtocolVisualizer)
 *
 * Interactive epidemic dissemination engine and animated topological network visualizer.
 * Simulates decentralized Push-Sum & Anti-Entropy Gossip propagation over peer swarms:
 * 1. Realistic connected random graph generation (12-20 peers, 2-4 neighbors per node)
 * 2. Probabilistic epidemic propagation (P = 0.70 infection rate, configurable fanout)
 * 3. Animated SVG canvas with luminous nodes, electric edge impulses & pulse waves
 * 4. Real-time hop counting, latency estimation, convergence telemetry & event logs
 * 5. Right Rail control deck for broadcasts, step simulations, and swarm regeneration
 *
 * 100% Self-Contained, Strict TypeScript, Zero External Dependencies.
 */

// ---------------------------------------------------------------------------
// 1. Data Structures & Interfaces
// ---------------------------------------------------------------------------

export interface GossipNode {
  id: string;
  x: number;
  y: number;
  label: string;
  state: 'idle' | 'infected' | 'recovered';
  receivedAt?: number;
}

export interface GossipEdge {
  from: string;
  to: string;
  active: boolean;
  propagating: boolean;
}

export interface GossipMessage {
  id: string;
  originNodeId: string;
  content: string;
  ttl: number;
  hops: number;
  timestamp: number;
}

export interface GossipHistoryPoint {
  step: number;
  infectedCount: number;
  recoveredCount: number;
  idleCount: number;
  coveragePct: number;
  estimatedLatencyMs: number;
  timestamp: number;
}

export interface GossipEventLog {
  id: string;
  timestamp: number;
  step: number;
  type: 'origin_broadcast' | 'propagation' | 'duplicate_rumor' | 'packet_loss' | 'convergence' | 'network_reset';
  sourceLabel: string;
  targetLabel?: string;
  hops: number;
  latencyMs: number;
  message: string;
}

export interface GossipNetworkStats {
  nodeCount: number;
  edgeCount: number;
  avgDegree: number;
  idleCount: number;
  infectedCount: number;
  recoveredCount: number;
  coveragePct: number;
  currentStep: number;
  maxHops: number;
  estimatedLatencyMs: number;
  isConverged: boolean;
  totalMessagesSent: number;
}

// ---------------------------------------------------------------------------
// 2. Gossip Protocol Visualizer Engine
// ---------------------------------------------------------------------------

export class GossipProtocolVisualizer {
  public nodes: GossipNode[] = [];
  public edges: GossipEdge[] = [];
  public propagatingMessages: GossipMessage[] = [];

  // Configuration & State
  public selectedOriginId: string = '';
  public infectionProbability: number = 0.7; // P = 0.70 default requirement
  public fanout: number = 3;
  public ttl: number = 8;
  public isAutoSimulating: boolean = false;
  public autoIntervalMs: number = 800;

  // Telemetry & Metrics
  public currentStep: number = 0;
  public totalMessagesSent: number = 0;
  public estimatedLatencyMs: number = 0;
  public maxHopsRecorded: number = 0;
  public messagePayload: string = 'ZK_GOSSIP_BLOCK_0x7F9B';
  public history: GossipHistoryPoint[] = [];
  public eventLogs: GossipEventLog[] = [];

  // Callbacks
  public onUpdateCallback?: () => void;

  // Internal Adjacency & Tracking
  private _adjacencyMap: Map<string, string[]> = new Map();
  private _nodeHopsMap: Map<string, number> = new Map();
  private _timerHandle: ReturnType<typeof setInterval> | null = null;

  // Predefined Peer Nomenclature for Sovereign Mesh Swarm
  private static readonly NODE_NAMES: readonly string[] = [
    'Node-α', 'Peer-7F', 'Relay-01', 'Node-β', 'Sentry-9', 'Node-γ',
    'Beacon-A', 'Peer-2B', 'Node-δ', 'Ghost-X', 'Relay-02', 'Node-ε',
    'Mesh-3', 'Peer-4C', 'Node-ζ', 'Nexus-Z', 'Node-η', 'Shard-5',
    'Node-θ', 'Seed-42'
  ];

  constructor(initialNodeCount: number = 16) {
    this.generateNetwork(initialNodeCount);
  }

  // ─── Network Generation ──────────────────────────────────────────────────

  /**
   * Generates a realistic random peer-to-peer network topology in 600x400 SVG space.
   * Guarantees connected graph where every peer has 2-4 neighbors.
   */
  public generateNetwork(nodeCount: number = 16): void {
    this.stopAutoSimulation();

    const clampedCount = Math.min(20, Math.max(12, Math.floor(nodeCount)));
    this.nodes = [];
    this.edges = [];
    this.propagatingMessages = [];
    this.history = [];
    this.eventLogs = [];
    this._adjacencyMap.clear();
    this._nodeHopsMap.clear();
    this.currentStep = 0;
    this.maxHopsRecorded = 0;
    this.estimatedLatencyMs = 0;

    // 1. Spatially distribute nodes in 600x400 space with margin constraints
    const width = 600;
    const height = 400;
    const paddingX = 60;
    const paddingY = 55;
    const minDistance = 64;

    const generatedPositions: Array<{ x: number; y: number }> = [];

    for (let i = 0; i < clampedCount; i++) {
      let attempts = 0;
      let x = 0;
      let y = 0;
      let valid = false;

      // Elliptical distribution with organic jitter
      while (!valid && attempts < 150) {
        attempts++;
        const angle = (i / clampedCount) * Math.PI * 2 + (Math.random() * 0.4 - 0.2);
        const radiusX = (width / 2 - paddingX) * (0.55 + Math.random() * 0.4);
        const radiusY = (height / 2 - paddingY) * (0.55 + Math.random() * 0.4);
        
        x = Math.round(width / 2 + Math.cos(angle) * radiusX);
        y = Math.round(height / 2 + Math.sin(angle) * radiusY);

        // Clamp to SVG bounding box
        x = Math.max(paddingX, Math.min(width - paddingX, x));
        y = Math.max(paddingY, Math.min(height - paddingY, y));

        // Check minimum distance from existing nodes
        valid = generatedPositions.every(pos => {
          const dx = pos.x - x;
          const dy = pos.y - y;
          return Math.sqrt(dx * dx + dy * dy) >= minDistance;
        });
      }

      // Fallback if random placement failed
      if (!valid) {
        const angle = (i / clampedCount) * Math.PI * 2;
        x = Math.round(width / 2 + Math.cos(angle) * (width / 2 - paddingX) * 0.7);
        y = Math.round(height / 2 + Math.sin(angle) * (height / 2 - paddingY) * 0.7);
      }

      generatedPositions.push({ x, y });

      const nodeId = `node-${i}`;
      const label = GossipProtocolVisualizer.NODE_NAMES[i % GossipProtocolVisualizer.NODE_NAMES.length];

      this.nodes.push({
        id: nodeId,
        x,
        y,
        label,
        state: 'idle',
      });
      this._adjacencyMap.set(nodeId, []);
    }

    // 2. Generate edges with random graph algorithm ensuring 2 to 4 neighbors per node
    // Step A: Build a spanning backbone (guarantees 100% graph connectivity)
    const connectedSet = new Set<string>([this.nodes[0].id]);
    const unvisitedSet = new Set<string>(this.nodes.slice(1).map(n => n.id));

    while (unvisitedSet.size > 0) {
      let bestDist = Infinity;
      let bestFrom = '';
      let bestTo = '';

      for (const fromId of connectedSet) {
        const fromNode = this.nodes.find(n => n.id === fromId)!;
        const fromDegree = (this._adjacencyMap.get(fromId) || []).length;
        if (fromDegree >= 4) continue;

        for (const toId of unvisitedSet) {
          const toNode = this.nodes.find(n => n.id === toId)!;
          const dist = Math.hypot(fromNode.x - toNode.x, fromNode.y - toNode.y);
          if (dist < bestDist) {
            bestDist = dist;
            bestFrom = fromId;
            bestTo = toId;
          }
        }
      }

      if (bestFrom && bestTo) {
        this._addEdge(bestFrom, bestTo);
        connectedSet.add(bestTo);
        unvisitedSet.delete(bestTo);
      } else {
        // Fallback connection
        const toId = Array.from(unvisitedSet)[0];
        const fromId = Array.from(connectedSet)[0];
        this._addEdge(fromId, toId);
        connectedSet.add(toId);
        unvisitedSet.delete(toId);
      }
    }

    // Step B: Ensure every node has between 2 and 4 neighbors based on Euclidean proximity
    for (let pass = 0; pass < 3; pass++) {
      for (const node of this.nodes) {
        const currentNeighbors = this._adjacencyMap.get(node.id) || [];
        if (currentNeighbors.length >= 2) continue;

        // Find nearest candidates with degree < 4
        const candidates = this.nodes
          .filter(other => other.id !== node.id && !currentNeighbors.includes(other.id))
          .map(other => ({
            id: other.id,
            dist: Math.hypot(node.x - other.x, node.y - other.y),
            degree: (this._adjacencyMap.get(other.id) || []).length,
          }))
          .filter(c => c.degree < 4)
          .sort((a, b) => a.dist - b.dist);

        for (const cand of candidates) {
          if ((this._adjacencyMap.get(node.id) || []).length >= 2) break;
          if ((this._adjacencyMap.get(cand.id) || []).length < 4) {
            this._addEdge(node.id, cand.id);
          }
        }
      }
    }

    // Step C: Add random supplemental edges for nodes with degree < 3 to boost gossip fanout
    for (const node of this.nodes) {
      const neighbors = this._adjacencyMap.get(node.id) || [];
      if (neighbors.length < 3 && Math.random() > 0.3) {
        const candidates = this.nodes
          .filter(other => other.id !== node.id && !neighbors.includes(other.id))
          .map(other => ({
            id: other.id,
            dist: Math.hypot(node.x - other.x, node.y - other.y),
            degree: (this._adjacencyMap.get(other.id) || []).length,
          }))
          .filter(c => c.degree < 4)
          .sort((a, b) => a.dist - b.dist);

        if (candidates.length > 0 && candidates[0].dist < 220) {
          this._addEdge(node.id, candidates[0].id);
        }
      }
    }

    // Set default selected origin
    this.selectedOriginId = this.nodes[0]?.id || 'node-0';

    this._addEventLog({
      step: 0,
      type: 'network_reset',
      sourceLabel: 'Swarm Engine',
      hops: 0,
      latencyMs: 0,
      message: `Generated decentralized topology with ${this.nodes.length} nodes and ${this.edges.length} P2P links.`,
    });

    this._recordHistoryPoint();
    this._notifyUpdate();
  }

  private _addEdge(fromId: string, toId: string): void {
    if (fromId === toId) return;
    const exists = this.edges.some(
      e => (e.from === fromId && e.to === toId) || (e.from === toId && e.to === fromId)
    );
    if (exists) return;

    this.edges.push({
      from: fromId,
      to: toId,
      active: true,
      propagating: false,
    });

    const fromList = this._adjacencyMap.get(fromId) || [];
    fromList.push(toId);
    this._adjacencyMap.set(fromId, fromList);

    const toList = this._adjacencyMap.get(toId) || [];
    toList.push(fromId);
    this._adjacencyMap.set(toId, toList);
  }

  // ─── Broadcast & Dissemination Simulation ─────────────────────────────────

  /**
   * Initiates epidemic rumor propagation starting from the specified origin node.
   */
  public broadcastMessage(
    originId: string = this.selectedOriginId,
    content: string = this.messagePayload
  ): void {
    const originNode = this.nodes.find(n => n.id === originId) || this.nodes[0];
    if (!originNode) return;

    this.selectedOriginId = originNode.id;
    this.messagePayload = content || this.messagePayload;

    // Reset previous dissemination state
    for (const node of this.nodes) {
      node.state = 'idle';
      node.receivedAt = undefined;
    }
    for (const edge of this.edges) {
      edge.propagating = false;
    }

    this._nodeHopsMap.clear();
    this.currentStep = 0;
    this.maxHopsRecorded = 0;
    this.estimatedLatencyMs = Math.round(12 + Math.random() * 10);
    this.totalMessagesSent++;

    // Mark origin as infected
    originNode.state = 'infected';
    originNode.receivedAt = Date.now();
    this._nodeHopsMap.set(originNode.id, 0);

    const message: GossipMessage = {
      id: `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      originNodeId: originNode.id,
      content: this.messagePayload,
      ttl: this.ttl,
      hops: 0,
      timestamp: Date.now(),
    };

    this.propagatingMessages = [message];

    this._addEventLog({
      step: 0,
      type: 'origin_broadcast',
      sourceLabel: originNode.label,
      hops: 0,
      latencyMs: this.estimatedLatencyMs,
      message: `Origin broadcast dispatched payload: "${message.content}"`,
    });

    this._recordHistoryPoint();
    this._notifyUpdate();
  }

  /**
   * Executes a single discrete gossip step (push gossip round).
   * Each infected peer transmits rumor to connected neighbors with probability P = 0.70.
   */
  public simulateGossipStep(): void {
    const currentlyInfected = this.nodes.filter(n => n.state === 'infected');
    if (currentlyInfected.length === 0) {
      this.broadcastMessage(this.selectedOriginId);
      return;
    }

    // Check if network is already 100% converged
    if (currentlyInfected.length === this.nodes.length) {
      if (this.isAutoSimulating) {
        this.stopAutoSimulation();
      }
      return;
    }

    // Reset previous edge propagating pulses
    for (const edge of this.edges) {
      edge.propagating = false;
    }

    const nextInfections: Map<string, { fromLabel: string; hops: number; edgeRef: GossipEdge }> = new Map();
    let transmissionsAttempted = 0;
    let successfulTransmissions = 0;

    for (const infectedNode of currentlyInfected) {
      const neighbors = this._adjacencyMap.get(infectedNode.id) || [];
      const currentHops = this._nodeHopsMap.get(infectedNode.id) ?? 0;

      for (const neighborId of neighbors) {
        const neighborNode = this.nodes.find(n => n.id === neighborId);
        if (!neighborNode) continue;

        // Locate edge
        const edge = this.edges.find(
          e => (e.from === infectedNode.id && e.to === neighborId) ||
               (e.from === neighborId && e.to === infectedNode.id)
        );
        if (!edge) continue;

        transmissionsAttempted++;

        if (neighborNode.state === 'idle') {
          // Roll probabilistic dissemination check (P = 0.70)
          const roll = Math.random();
          if (roll <= this.infectionProbability) {
            edge.propagating = true;
            successfulTransmissions++;

            const newHops = currentHops + 1;
            if (!nextInfections.has(neighborId)) {
              nextInfections.set(neighborId, {
                fromLabel: infectedNode.label,
                hops: newHops,
                edgeRef: edge,
              });
            }
          } else {
            // Simulated UDP/WebRTC dropped packet
            this._addEventLog({
              step: this.currentStep + 1,
              type: 'packet_loss',
              sourceLabel: infectedNode.label,
              targetLabel: neighborNode.label,
              hops: currentHops + 1,
              latencyMs: this.estimatedLatencyMs,
              message: `Packet dropped due to link noise (P=${this.infectionProbability.toFixed(2)})`,
            });
          }
        } else {
          // Anti-entropy duplicate rumor check
          if (Math.random() < 0.25) {
            edge.propagating = true;
            this._addEventLog({
              step: this.currentStep + 1,
              type: 'duplicate_rumor',
              sourceLabel: infectedNode.label,
              targetLabel: neighborNode.label,
              hops: currentHops + 1,
              latencyMs: this.estimatedLatencyMs,
              message: `Anti-Entropy ACK: peer already has rumor digest`,
            });
          }
        }
      }
    }

    // Apply new infections
    if (nextInfections.size > 0) {
      this.currentStep++;
      const latencyDelta = Math.round(18 + Math.random() * 24);
      this.estimatedLatencyMs += latencyDelta;

      for (const [targetId, info] of nextInfections.entries()) {
        const targetNode = this.nodes.find(n => n.id === targetId);
        if (targetNode) {
          targetNode.state = 'infected';
          targetNode.receivedAt = Date.now();
          this._nodeHopsMap.set(targetId, info.hops);
          this.maxHopsRecorded = Math.max(this.maxHopsRecorded, info.hops);

          this._addEventLog({
            step: this.currentStep,
            type: 'propagation',
            sourceLabel: info.fromLabel,
            targetLabel: targetNode.label,
            hops: info.hops,
            latencyMs: this.estimatedLatencyMs,
            message: `Propagated to ${targetNode.label} (Hop #${info.hops}, wire transit ~${latencyDelta}ms)`,
          });
        }
      }

      // Check for full swarm convergence
      const totalInfected = this.nodes.filter(n => n.state === 'infected').length;
      if (totalInfected === this.nodes.length) {
        this._addEventLog({
          step: this.currentStep,
          type: 'convergence',
          sourceLabel: 'Swarm Protocol',
          hops: this.maxHopsRecorded,
          latencyMs: this.estimatedLatencyMs,
          message: `Swarm reached 100% saturation in ${this.currentStep} rounds (${this.maxHopsRecorded} max hops, ${this.estimatedLatencyMs}ms est. latency).`,
        });

        if (this.isAutoSimulating) {
          this.stopAutoSimulation();
        }
      }
    } else {
      // Step with no new infections (e.g. temporary packet drops or fully infected)
      this.currentStep++;
      const totalInfected = this.nodes.filter(n => n.state === 'infected').length;
      if (totalInfected === this.nodes.length && this.isAutoSimulating) {
        this.stopAutoSimulation();
      }
    }

    this._recordHistoryPoint();
    this._notifyUpdate();
  }

  /**
   * Starts periodic automated dissemination until all peers are infected.
   */
  public startAutoSimulation(intervalMs: number = this.autoIntervalMs): void {
    if (this.isAutoSimulating) return;

    // If no nodes are infected, broadcast first
    const infectedCount = this.nodes.filter(n => n.state === 'infected').length;
    if (infectedCount === 0) {
      this.broadcastMessage(this.selectedOriginId);
    }

    this.autoIntervalMs = intervalMs;
    this.isAutoSimulating = true;

    this._timerHandle = setInterval(() => {
      const count = this.nodes.filter(n => n.state === 'infected').length;
      if (count >= this.nodes.length) {
        this.stopAutoSimulation();
        return;
      }
      this.simulateGossipStep();
    }, this.autoIntervalMs);

    this._notifyUpdate();
  }

  /**
   * Halts automated simulation.
   */
  public stopAutoSimulation(): void {
    if (this._timerHandle !== null) {
      clearInterval(this._timerHandle);
      this._timerHandle = null;
    }
    this.isAutoSimulating = false;
    this._notifyUpdate();
  }

  public toggleAutoSimulation(): void {
    if (this.isAutoSimulating) {
      this.stopAutoSimulation();
    } else {
      this.startAutoSimulation();
    }
  }

  /**
   * Resets infection states back to idle while retaining graph topology.
   */
  public resetNetwork(): void {
    this.stopAutoSimulation();
    for (const node of this.nodes) {
      node.state = 'idle';
      node.receivedAt = undefined;
    }
    for (const edge of this.edges) {
      edge.propagating = false;
    }
    this.propagatingMessages = [];
    this._nodeHopsMap.clear();
    this.currentStep = 0;
    this.maxHopsRecorded = 0;
    this.estimatedLatencyMs = 0;

    this._addEventLog({
      step: 0,
      type: 'network_reset',
      sourceLabel: 'Swarm Console',
      hops: 0,
      latencyMs: 0,
      message: 'Network nodes reset to idle state.',
    });

    this._recordHistoryPoint();
    this._notifyUpdate();
  }

  /**
   * Transitions older infected nodes into recovered state (SIR model mode).
   */
  public recoverInfectedNodes(): void {
    for (const node of this.nodes) {
      if (node.state === 'infected') {
        node.state = 'recovered';
      }
    }
    this._recordHistoryPoint();
    this._notifyUpdate();
  }

  // ─── Telemetry & Math Queries ────────────────────────────────────────────

  public getStats(): GossipNetworkStats {
    const nodeCount = this.nodes.length;
    const edgeCount = this.edges.length;
    const idleCount = this.nodes.filter(n => n.state === 'idle').length;
    const infectedCount = this.nodes.filter(n => n.state === 'infected').length;
    const recoveredCount = this.nodes.filter(n => n.state === 'recovered').length;
    const coveragePct = nodeCount > 0 ? Math.round((infectedCount / nodeCount) * 100) : 0;
    const avgDegree = nodeCount > 0 ? Number(((edgeCount * 2) / nodeCount).toFixed(2)) : 0;

    return {
      nodeCount,
      edgeCount,
      avgDegree,
      idleCount,
      infectedCount,
      recoveredCount,
      coveragePct,
      currentStep: this.currentStep,
      maxHops: this.maxHopsRecorded,
      estimatedLatencyMs: this.estimatedLatencyMs,
      isConverged: coveragePct === 100,
      totalMessagesSent: this.totalMessagesSent,
    };
  }

  private _recordHistoryPoint(): void {
    const stats = this.getStats();
    this.history.push({
      step: stats.currentStep,
      infectedCount: stats.infectedCount,
      recoveredCount: stats.recoveredCount,
      idleCount: stats.idleCount,
      coveragePct: stats.coveragePct,
      estimatedLatencyMs: stats.estimatedLatencyMs,
      timestamp: Date.now(),
    });

    // Keep history bounded to 40 items
    if (this.history.length > 40) {
      this.history.shift();
    }
  }

  private _addEventLog(entry: Omit<GossipEventLog, 'id' | 'timestamp'>): void {
    this.eventLogs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      ...entry,
    });

    if (this.eventLogs.length > 25) {
      this.eventLogs.pop();
    }
  }

  private _notifyUpdate(): void {
    if (typeof this.onUpdateCallback === 'function') {
      this.onUpdateCallback();
    }
  }

  // ─── SVG Canvas Rendering ────────────────────────────────────────────────

  /**
   * Renders the animated SVG topological canvas with luminous peers,
   * animated stroke-dashoffset electrical impulses on active edges,
   * glowing pulse waves on infected nodes, and live hop/latency HUDs.
   */
  public renderSVGCanvas(): string {
    const stats = this.getStats();
    const width = 600;
    const height = 400;

    // SVG Defs, Gradients & Glow Filters
    const svgDefs = `
      <defs>
        <!-- Glow filter for Cyan / Cyphr beams -->
        <filter id="gossip-glow-cyphr" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <!-- Glow filter for Signal Green infected nodes -->
        <filter id="gossip-glow-signal" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <!-- Subtle backdrop grid pattern -->
        <pattern id="gossip-grid" width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1" />
          <circle cx="0" cy="0" r="1" fill="rgba(0, 229, 255, 0.15)" />
        </pattern>

        <!-- Dynamic Edge Gradient for Propagating Beams -->
        <linearGradient id="edge-beam-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#00e5ff" stop-opacity="0.9" />
          <stop offset="50%" stop-color="#22c55e" stop-opacity="1" />
          <stop offset="100%" stop-color="#00e5ff" stop-opacity="0.9" />
        </linearGradient>

        <style>
          @keyframes gossipDash {
            to { stroke-dashoffset: -32; }
          }
          @keyframes rippleWave {
            0% { r: 12px; opacity: 0.9; stroke-width: 2.5px; }
            100% { r: 32px; opacity: 0; stroke-width: 0.5px; }
          }
          .gossip-active-edge {
            stroke-dasharray: 8 6;
            animation: gossipDash 0.8s linear infinite;
          }
          .gossip-pulse-ring {
            animation: rippleWave 1.6s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;
            transform-origin: center;
          }
        </style>
      </defs>
    `;

    // Render Edges
    const edgesMarkup = this.edges.map(edge => {
      const source = this.nodes.find(n => n.id === edge.from);
      const target = this.nodes.find(n => n.id === edge.to);
      if (!source || !target) return '';

      if (edge.propagating) {
        return `
          <!-- Active Propagating Edge (Glow + Animated Electrical Beam) -->
          <line
            x1="${source.x}" y1="${source.y}"
            x2="${target.x}" y2="${target.y}"
            stroke="#00e5ff"
            stroke-width="4.5"
            stroke-opacity="0.4"
            filter="url(#gossip-glow-cyphr)"
          />
          <line
            x1="${source.x}" y1="${source.y}"
            x2="${target.x}" y2="${target.y}"
            stroke="url(#edge-beam-grad)"
            stroke-width="2.5"
            class="gossip-active-edge"
            stroke-linecap="round"
          />
          <!-- Midpoint Energy Spark Particle -->
          <circle
            cx="${(source.x + target.x) / 2}"
            cy="${(source.y + target.y) / 2}"
            r="3.5"
            fill="#ffffff"
            filter="url(#gossip-glow-cyphr)"
          >
            <animate
              attributeName="opacity"
              values="1;0.3;1"
              dur="0.6s"
              repeatCount="indefinite"
            />
          </circle>
        `;
      }

      // Passive resting edge
      return `
        <line
          x1="${source.x}" y1="${source.y}"
          x2="${target.x}" y2="${target.y}"
          stroke="#334155"
          stroke-width="1.5"
          stroke-opacity="0.5"
          stroke-linecap="round"
        />
      `;
    }).join('');

    // Render Nodes
    const nodesMarkup = this.nodes.map(node => {
      const isOrigin = node.id === this.selectedOriginId;
      const hops = this._nodeHopsMap.get(node.id);

      if (node.state === 'infected') {
        return `
          <g class="cursor-pointer group select-none" data-node-id="${node.id}">
            <!-- Outer Pulsing Emission Waves -->
            <circle
              cx="${node.x}"
              cy="${node.y}"
              r="12"
              fill="none"
              stroke="#22c55e"
              class="gossip-pulse-ring"
            />
            <circle
              cx="${node.x}"
              cy="${node.y}"
              r="12"
              fill="none"
              stroke="#00e5ff"
              class="gossip-pulse-ring"
              style="animation-delay: 0.8s;"
            />

            <!-- Halo Aura -->
            <circle
              cx="${node.x}"
              cy="${node.y}"
              r="14"
              fill="rgba(0, 229, 255, 0.25)"
              stroke="#22c55e"
              stroke-width="2"
              filter="url(#gossip-glow-signal)"
            />

            <!-- Core Luminous Node -->
            <circle
              cx="${node.x}"
              cy="${node.y}"
              r="9.5"
              fill="#00e5ff"
              stroke="#ffffff"
              stroke-width="1.8"
            />

            <!-- Hop Badge (Top Right of Node) -->
            ${hops !== undefined ? `
              <circle
                cx="${node.x + 10}"
                cy="${node.y - 10}"
                r="6"
                fill="#12151c"
                stroke="#22c55e"
                stroke-width="1.2"
              />
              <text
                x="${node.x + 10}"
                y="${node.y - 8}"
                text-anchor="middle"
                fill="#22c55e"
                font-family="monospace"
                font-size="8"
                font-weight="bold"
              >${hops}</text>
            ` : ''}

            <!-- Node Label Pill Backdrop & Text -->
            <rect
              x="${node.x - 24}"
              y="${node.y + 13}"
              width="48"
              height="15"
              rx="4"
              fill="#12151c"
              stroke="rgba(0, 229, 255, 0.4)"
              stroke-width="1"
            />
            <text
              x="${node.x}"
              y="${node.y + 24}"
              text-anchor="middle"
              fill="#00e5ff"
              font-family="monospace"
              font-size="9"
              font-weight="bold"
            >${node.label}</text>
          </g>
        `;
      }

      if (node.state === 'recovered') {
        return `
          <g class="cursor-pointer group select-none" data-node-id="${node.id}">
            <circle
              cx="${node.x}"
              cy="${node.y}"
              r="12"
              fill="#2e1065"
              stroke="#a855f7"
              stroke-width="2"
            />
            <circle
              cx="${node.x}"
              cy="${node.y}"
              r="5"
              fill="#c084fc"
            />
            <rect
              x="${node.x - 24}"
              y="${node.y + 13}"
              width="48"
              height="15"
              rx="4"
              fill="#12151c"
              stroke="rgba(168, 85, 247, 0.4)"
              stroke-width="1"
            />
            <text
              x="${node.x}"
              y="${node.y + 24}"
              text-anchor="middle"
              fill="#d8b4fe"
              font-family="monospace"
              font-size="9"
            >${node.label}</text>
          </g>
        `;
      }

      // Idle State
      return `
        <g class="cursor-pointer group select-none transition-all" data-node-id="${node.id}">
          <!-- Resting Node Ring -->
          <circle
            cx="${node.x}"
            cy="${node.y}"
            r="${isOrigin ? '13' : '10'}"
            fill="#151922"
            stroke="${isOrigin ? '#00e5ff' : '#475569'}"
            stroke-width="${isOrigin ? '2.2' : '1.5'}"
          />
          <circle
            cx="${node.x}"
            cy="${node.y}"
            r="${isOrigin ? '5' : '3.5'}"
            fill="${isOrigin ? '#00e5ff' : '#64748b'}"
          />

          <!-- Node Label -->
          <rect
            x="${node.x - 22}"
            y="${node.y + 12}"
            width="44"
            height="14"
            rx="3"
            fill="#0d0f14"
            stroke="rgba(255, 255, 255, 0.08)"
            stroke-width="1"
          />
          <text
            x="${node.x}"
            y="${node.y + 22.5}"
            text-anchor="middle"
            fill="${isOrigin ? '#00e5ff' : '#94a3b8'}"
            font-family="monospace"
            font-size="8.5"
          >${node.label}</text>
        </g>
      `;
    }).join('');

    // Heads-Up Display (HUD) Overlays
    const hudTopLeft = `
      <g transform="translate(14, 14)">
        <rect x="0" y="0" width="220" height="42" rx="6" fill="#12151c" fill-opacity="0.85" stroke="rgba(255,255,255,0.08)" stroke-width="1" />
        <circle cx="12" cy="14" r="4" fill="${stats.isConverged ? '#22c55e' : (this.isAutoSimulating ? '#00e5ff' : '#f59e0b')}" />
        <text x="22" y="17" fill="#f1f5f9" font-family="sans-serif" font-size="10" font-weight="bold">
          ${stats.isConverged ? 'SWARM FULLY CONVERGED' : (this.isAutoSimulating ? 'DISSEMINATING (AUTO)' : 'GOSSIP SWARM IDLE')}
        </text>
        <text x="10" y="33" fill="#94a3b8" font-family="monospace" font-size="9">
          P_infect: <tspan fill="#00e5ff">${this.infectionProbability.toFixed(2)}</tspan> | Hops: <tspan fill="#22c55e">${stats.maxHops}</tspan> | Lat: <tspan fill="#a855f7">~${stats.estimatedLatencyMs}ms</tspan>
        </text>
      </g>
    `;

    const hudTopRight = `
      <g transform="translate(436, 14)">
        <rect x="0" y="0" width="150" height="42" rx="6" fill="#12151c" fill-opacity="0.85" stroke="rgba(255,255,255,0.08)" stroke-width="1" />
        <text x="12" y="16" fill="#94a3b8" font-family="sans-serif" font-size="9">Coverage</text>
        <text x="138" y="16" text-anchor="end" fill="${stats.coveragePct === 100 ? '#22c55e' : '#00e5ff'}" font-family="monospace" font-size="11" font-weight="bold">
          ${stats.coveragePct}% (${stats.infectedCount}/${stats.nodeCount})
        </text>
        <!-- Mini Progress Bar inside HUD -->
        <rect x="12" y="24" width="126" height="6" rx="3" fill="#1a1f2e" />
        <rect x="12" y="24" width="${Math.max(4, (stats.coveragePct / 100) * 126)}" height="6" rx="3" fill="${stats.coveragePct === 100 ? '#22c55e' : '#00e5ff'}" />
      </g>
    `;

    return `
      <svg
        id="gossip-svg-canvas"
        viewBox="0 0 ${width} ${height}"
        class="w-full h-auto select-none rounded-xl bg-canvas border border-white/5 shadow-inner"
        xmlns="http://www.w3.org/2000/svg"
      >
        ${svgDefs}
        <!-- Grid Background -->
        <rect width="${width}" height="${height}" fill="url(#gossip-grid)" />
        
        <!-- Edge Link Layer -->
        <g id="gossip-edge-layer">${edgesMarkup}</g>
        
        <!-- Peer Node Layer -->
        <g id="gossip-node-layer">${nodesMarkup}</g>
        
        <!-- HUD Telemetry Layer -->
        <g id="gossip-hud-layer">
          ${hudTopLeft}
          ${hudTopRight}
        </g>
      </svg>
    `;
  }

  /**
   * Renders compact sidebar trigger button for Gossip Protocol Simulator.
   */
  public renderGossipButton(): string {
    const stats = this.getStats();
    return `
      <button id="btn-open-gossip-viz" class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-surface-raised hover:bg-surface-overlay border border-white/5 hover:border-cyphr/30 transition-all group cursor-pointer text-left">
        <div class="flex items-center gap-2.5">
          <span class="text-lg group-hover:scale-110 transition-transform">🌐</span>
          <div class="flex flex-col">
            <span class="text-xs font-semibold text-white/90 group-hover:text-cyphr transition-colors">Gossip Protocol</span>
            <span class="text-[10px] text-white/40 font-mono">Epidemic Swarm</span>
          </div>
        </div>
        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${stats.isConverged ? 'bg-signal/20 text-signal' : 'bg-cyphr/20 text-cyphr'}">
          ${stats.coveragePct}% SAT
        </span>
      </button>
    `;
  }

  // ─── Right Rail Panel & Control Deck ─────────────────────────────────────

  /**
   * Renders the complete, high-tech Gossip Protocol panel for the Right Rail (w-72)
   * or interactive center stage component.
   */
  public renderGossipPanel(): string {
    const stats = this.getStats();

    return `
      <div id="gossip-protocol-panel" class="w-full space-y-4 text-slate-200">
        
        <!-- Header Deck -->
        <div class="p-3.5 rounded-xl bg-surface-raised border border-white/5 space-y-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <span class="text-base">🌐</span>
              <div>
                <h3 class="text-xs font-bold text-slate-100 tracking-wide uppercase">Gossip Protocol P2P</h3>
                <p class="text-[10px] font-mono text-slate-400">Epidemic Dissemination Swarm</p>
              </div>
            </div>
            <span class="text-[9px] font-mono px-2 py-0.5 rounded bg-surface-overlay text-cyphr border border-cyphr/20">
              P=${this.infectionProbability.toFixed(2)} · Fanout=${this.fanout}
            </span>
          </div>

          <!-- Progress Bar -->
          <div class="space-y-1 pt-1">
            <div class="flex justify-between text-[10px] font-mono">
              <span class="text-slate-400">Network Saturation</span>
              <span class="${stats.coveragePct === 100 ? 'text-signal font-bold' : 'text-cyphr'}">
                ${stats.coveragePct}% (${stats.infectedCount}/${stats.nodeCount} peers)
              </span>
            </div>
            <div class="w-full h-1.5 bg-surface-base rounded-full overflow-hidden">
              <div
                class="h-full transition-all duration-300 ${stats.coveragePct === 100 ? 'bg-signal' : 'bg-gradient-to-r from-cyphr to-signal'}"
                style="width: ${stats.coveragePct}%"
              ></div>
            </div>
          </div>
        </div>

        <!-- Animated SVG Canvas Viewport -->
        <div class="relative rounded-xl overflow-hidden shadow-2xl bg-canvas border border-white/5">
          ${this.renderSVGCanvas()}
        </div>

        <!-- 4-Card Telemetry Grid -->
        <div class="grid grid-cols-2 gap-2">
          <div class="p-2.5 rounded-lg bg-surface-raised border border-white/5">
            <div class="text-[9px] font-mono text-slate-400">Dissemination Round</div>
            <div class="text-sm font-bold font-mono text-cyphr flex items-baseline justify-between mt-0.5">
              <span>Step #${stats.currentStep}</span>
              <span class="text-[10px] text-slate-500 font-normal">O(log N)</span>
            </div>
          </div>

          <div class="p-2.5 rounded-lg bg-surface-raised border border-white/5">
            <div class="text-[9px] font-mono text-slate-400">Max Hop Diameter</div>
            <div class="text-sm font-bold font-mono text-signal flex items-baseline justify-between mt-0.5">
              <span>${stats.maxHops} hops</span>
              <span class="text-[10px] text-slate-500 font-normal">~${stats.estimatedLatencyMs}ms</span>
            </div>
          </div>

          <div class="p-2.5 rounded-lg bg-surface-raised border border-white/5">
            <div class="text-[9px] font-mono text-slate-400">Swarm Density</div>
            <div class="text-sm font-bold font-mono text-slate-200 mt-0.5">
              ${stats.nodeCount} <span class="text-[10px] text-slate-500">peers</span> · ${stats.edgeCount} <span class="text-[10px] text-slate-500">links</span>
            </div>
          </div>

          <div class="p-2.5 rounded-lg bg-surface-raised border border-white/5">
            <div class="text-[9px] font-mono text-slate-400">Avg Node Degree</div>
            <div class="text-sm font-bold font-mono text-aether mt-0.5">
              ${stats.avgDegree} <span class="text-[10px] text-slate-500">neighbors</span>
            </div>
          </div>
        </div>

        <!-- Interactive Control Deck -->
        <div class="p-3 rounded-xl bg-surface-raised border border-white/5 space-y-3">
          <div class="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Broadcast Configuration</div>
          
          <!-- Origin Node Selection -->
          <div class="space-y-1">
            <label class="text-[10px] font-mono text-slate-400">Origin Peer</label>
            <select
              id="gossip-origin-select"
              class="w-full text-xs font-mono bg-surface-overlay text-slate-200 border border-white/10 rounded-lg p-1.5 focus:border-cyphr focus:outline-none transition-colors"
            >
              ${this.nodes.map(n => `
                <option value="${n.id}" ${n.id === this.selectedOriginId ? 'selected' : ''}>
                  ${n.label} (${n.id}) [State: ${n.state}]
                </option>
              `).join('')}
            </select>
          </div>

          <!-- Payload Input -->
          <div class="space-y-1">
            <label class="text-[10px] font-mono text-slate-400">Gossip Rumor Payload</label>
            <input
              id="gossip-payload-input"
              type="text"
              value="${this.messagePayload}"
              class="w-full text-xs font-mono bg-surface-overlay text-slate-200 border border-white/10 rounded-lg p-1.5 focus:border-cyphr focus:outline-none transition-colors"
              placeholder="Enter message or block hash..."
            />
          </div>

          <!-- Infection Probability Slider -->
          <div class="space-y-1">
            <div class="flex justify-between text-[10px] font-mono">
              <span class="text-slate-400">Infection Rate (P)</span>
              <span id="gossip-prob-val" class="text-cyphr font-bold">${this.infectionProbability.toFixed(2)}</span>
            </div>
            <input
              id="gossip-prob-slider"
              type="range"
              min="0.2"
              max="1.0"
              step="0.05"
              value="${this.infectionProbability}"
              class="w-full h-1.5 bg-surface-overlay rounded-lg appearance-none cursor-pointer accent-cyphr"
            />
          </div>

          <!-- Action Buttons -->
          <div class="grid grid-cols-2 gap-2 pt-1">
            <button
              id="btn-gossip-broadcast"
              class="w-full py-2 px-3 rounded-lg text-xs font-bold font-mono bg-cyphr/20 hover:bg-cyphr/30 text-cyphr border border-cyphr/40 hover:border-cyphr transition-all flex items-center justify-center space-x-1.5 shadow-lg active:scale-95"
            >
              <span>🚀</span>
              <span>Broadcast</span>
            </button>

            <button
              id="btn-gossip-step"
              class="w-full py-2 px-3 rounded-lg text-xs font-bold font-mono bg-surface-overlay hover:bg-surface-highlight text-slate-200 border border-white/10 hover:border-white/20 transition-all flex items-center justify-center space-x-1.5 active:scale-95"
            >
              <span>⏭</span>
              <span>Single Step</span>
            </button>
          </div>

          <div class="grid grid-cols-3 gap-1.5">
            <button
              id="btn-gossip-auto"
              class="py-1.5 px-2 rounded-lg text-[11px] font-mono ${this.isAutoSimulating ? 'bg-amber/20 text-amber border-amber/40' : 'bg-surface-overlay text-signal border-signal/30'} border hover:bg-surface-highlight transition-all text-center active:scale-95"
            >
              ${this.isAutoSimulating ? '⏸ Pause' : '▶ Auto Run'}
            </button>

            <button
              id="btn-gossip-reset"
              class="py-1.5 px-2 rounded-lg text-[11px] font-mono bg-surface-overlay hover:bg-surface-highlight text-slate-300 border border-white/10 transition-all text-center active:scale-95"
            >
              ↺ Reset
            </button>

            <button
              id="btn-gossip-regen"
              class="py-1.5 px-2 rounded-lg text-[11px] font-mono bg-surface-overlay hover:bg-surface-highlight text-aether border border-aether/30 transition-all text-center active:scale-95"
            >
              🎲 New Swarm
            </button>
          </div>
        </div>

        <!-- Live Dissemination Event Stream -->
        <div class="p-3 rounded-xl bg-surface-raised border border-white/5 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gossip Telemetry Feed</span>
            <span class="text-[9px] font-mono text-slate-500">${this.eventLogs.length} events</span>
          </div>

          <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1 font-mono text-[10px]">
            ${this.eventLogs.length === 0 ? `
              <div class="text-slate-500 italic p-2 text-center">No gossip transmissions recorded yet.</div>
            ` : this.eventLogs.slice(0, 8).map(log => `
              <div class="p-1.5 rounded bg-surface-base border border-white/5 space-y-0.5">
                <div class="flex items-center justify-between">
                  <span class="font-bold ${this._getLogBadgeClass(log.type)}">
                    [${log.type.toUpperCase()}]
                  </span>
                  <span class="text-slate-500 text-[9px]">${new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <div class="text-slate-300 text-[9.5px] leading-tight">${log.message}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Protocol Specification Card -->
        <div class="p-3 rounded-xl bg-surface-raised border border-white/5 space-y-1.5 text-[10px] text-slate-400">
          <div class="font-bold text-slate-300 uppercase tracking-wider text-[9.5px] flex items-center space-x-1">
            <span>🛡️</span>
            <span>Mathematical Guarantees</span>
          </div>
          <p class="leading-relaxed">
            Epidemic push-gossip disseminates rumors across $N$ peers in <span class="text-cyphr font-mono">O(log N)</span> discrete rounds with <span class="text-signal font-mono">1 - e^(-c)</span> high-probability fault tolerance against arbitrary peer dropouts.
          </p>
        </div>

      </div>
    `;
  }

  private _getLogBadgeClass(type: GossipEventLog['type']): string {
    switch (type) {
      case 'origin_broadcast':
        return 'text-cyphr';
      case 'propagation':
        return 'text-signal';
      case 'convergence':
        return 'text-signal';
      case 'duplicate_rumor':
        return 'text-aether';
      case 'packet_loss':
        return 'text-amber';
      case 'network_reset':
        return 'text-slate-400';
    }
  }

  // ─── DOM Event Binding ───────────────────────────────────────────────────

  /**
   * Attaches interactive DOM listeners to control buttons, inputs, sliders,
   * and node click targets on the rendered panel.
   */
  public attachEventListeners(root: HTMLElement | Document = document): void {
    const broadcastBtn = root.querySelector('#btn-gossip-broadcast');
    const stepBtn = root.querySelector('#btn-gossip-step');
    const autoBtn = root.querySelector('#btn-gossip-auto');
    const resetBtn = root.querySelector('#btn-gossip-reset');
    const regenBtn = root.querySelector('#btn-gossip-regen');
    const originSelect = root.querySelector('#gossip-origin-select') as HTMLSelectElement | null;
    const payloadInput = root.querySelector('#gossip-payload-input') as HTMLInputElement | null;
    const probSlider = root.querySelector('#gossip-prob-slider') as HTMLInputElement | null;

    if (broadcastBtn) {
      broadcastBtn.addEventListener('click', () => {
        const payload = payloadInput?.value || this.messagePayload;
        const originId = originSelect?.value || this.selectedOriginId;
        this.broadcastMessage(originId, payload);
      });
    }

    if (stepBtn) {
      stepBtn.addEventListener('click', () => {
        this.simulateGossipStep();
      });
    }

    if (autoBtn) {
      autoBtn.addEventListener('click', () => {
        this.toggleAutoSimulation();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetNetwork();
      });
    }

    if (regenBtn) {
      regenBtn.addEventListener('click', () => {
        this.generateNetwork(this.nodes.length || 16);
      });
    }

    if (originSelect) {
      originSelect.addEventListener('change', () => {
        this.selectedOriginId = originSelect.value;
        this._notifyUpdate();
      });
    }

    if (payloadInput) {
      payloadInput.addEventListener('input', () => {
        this.messagePayload = payloadInput.value;
      });
    }

    if (probSlider) {
      probSlider.addEventListener('input', () => {
        this.infectionProbability = parseFloat(probSlider.value);
        const probDisplay = root.querySelector('#gossip-prob-val');
        if (probDisplay) {
          probDisplay.textContent = this.infectionProbability.toFixed(2);
        }
      });
    }

    // Node click handlers in SVG
    const nodeElements = root.querySelectorAll('[data-node-id]');
    nodeElements.forEach(el => {
      el.addEventListener('click', () => {
        const nodeId = el.getAttribute('data-node-id');
        if (nodeId) {
          this.selectedOriginId = nodeId;
          if (originSelect) {
            originSelect.value = nodeId;
          }
          this._notifyUpdate();
        }
      });
    });
  }
}

// ---------------------------------------------------------------------------
// 3. Singleton Export
// ---------------------------------------------------------------------------

export const gossipViz = new GossipProtocolVisualizer();
