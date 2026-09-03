export interface TrustEdge {
  from: string;
  to: string;
  capacity: number;
  timestamp: number;
}

/**
 * Web of Trust (WoT) Graph Engine
 * Implements Edmonds-Karp Max-Flow and Random-Walk MeritRank for decentralized Sybil resistance.
 */
export class WebOfTrustGraph {
  private adjacency: Map<string, Map<string, number>> = new Map();

  constructor() {}

  /**
   * Adds or updates a directional trust edge with a given flow capacity.
   */
  public addTrustEdge(from: string, to: string, capacity: number): void {
    if (!this.adjacency.has(from)) {
      this.adjacency.set(from, new Map());
    }
    if (!this.adjacency.has(to)) {
      this.adjacency.set(to, new Map());
    }
    this.adjacency.get(from)!.set(to, capacity);
  }

  public getCapacity(from: string, to: string): number {
    return this.adjacency.get(from)?.get(to) || 0;
  }

  /**
   * Computes Maximum Flow from a Trust Anchor (source) to an Author (sink)
   * using the Edmonds-Karp algorithm (BFS-based Ford-Fulkerson).
   *
   * Bot-farms isolated from honest trust anchors have maximum flow = 0.
   */
  public computeMaxFlow(source: string, sink: string): number {
    if (source === sink) return Infinity;
    if (!this.adjacency.has(source) || !this.adjacency.has(sink)) return 0;

    // Build residual capacity graph
    const residual: Map<string, Map<string, number>> = new Map();
    for (const [u, neighbors] of this.adjacency.entries()) {
      residual.set(u, new Map());
      for (const [v, cap] of neighbors.entries()) {
        residual.get(u)!.set(v, cap);
        if (!residual.has(v)) residual.set(v, new Map());
        if (!residual.get(v)!.has(u)) residual.get(v)!.set(u, 0);
      }
    }

    let maxFlow = 0;

    // BFS to find augmenting path
    while (true) {
      const parent = new Map<string, string>();
      const visited = new Set<string>([source]);
      const queue: string[] = [source];

      let foundPath = false;

      while (queue.length > 0) {
        const u = queue.shift()!;
        if (u === sink) {
          foundPath = true;
          break;
        }

        const neighbors = residual.get(u);
        if (neighbors) {
          for (const [v, cap] of neighbors.entries()) {
            if (!visited.has(v) && cap > 0) {
              visited.add(v);
              parent.set(v, u);
              queue.push(v);
            }
          }
        }
      }

      if (!foundPath) break;

      // Find bottleneck capacity along augmenting path
      let pathFlow = Infinity;
      let curr = sink;
      while (curr !== source) {
        const prev = parent.get(curr)!;
        const cap = residual.get(prev)!.get(curr)!;
        pathFlow = Math.min(pathFlow, cap);
        curr = prev;
      }

      // Update residual capacities
      curr = sink;
      while (curr !== source) {
        const prev = parent.get(curr)!;
        const forward = residual.get(prev)!.get(curr)!;
        const backward = residual.get(curr)!.get(prev)!;
        residual.get(prev)!.set(curr, forward - pathFlow);
        residual.get(curr)!.set(prev, backward + pathFlow);
        curr = prev;
      }

      maxFlow += pathFlow;
    }

    return maxFlow;
  }

  /**
   * Computes personalized MeritRank reputation via Random Walks with Restart.
   * Simulates trust decay across social hops.
   *
   * @param source The observer node
   * @param steps Number of simulation steps (e.g. 5000)
   * @param restartProbability Probability to teleport back to source (e.g. 0.15)
   */
  public computeMeritRank(
    source: string,
    steps: number = 5000,
    restartProbability: number = 0.15
  ): Map<string, number> {
    const visitCounts = new Map<string, number>();
    if (!this.adjacency.has(source)) return visitCounts;

    let currentNode = source;

    for (let i = 0; i < steps; i++) {
      visitCounts.set(currentNode, (visitCounts.get(currentNode) || 0) + 1);

      // Random restart or dead end
      const neighborsMap = this.adjacency.get(currentNode);
      const neighbors = neighborsMap ? Array.from(neighborsMap.keys()) : [];

      if (Math.random() < restartProbability || neighbors.length === 0) {
        currentNode = source;
      } else {
        // Sample next node weighted by capacity
        const totalWeight = neighbors.reduce((sum, n) => sum + (neighborsMap!.get(n) || 0), 0);
        if (totalWeight <= 0) {
          currentNode = source;
        } else {
          let rand = Math.random() * totalWeight;
          let chosen = neighbors[0];
          for (const n of neighbors) {
            rand -= neighborsMap!.get(n) || 0;
            if (rand <= 0) {
              chosen = n;
              break;
            }
          }
          currentNode = chosen;
        }
      }
    }

    // Normalize scores to [0, 1]
    const normalized = new Map<string, number>();
    for (const [node, count] of visitCounts.entries()) {
      normalized.set(node, Math.round((count / steps) * 10000) / 10000);
    }

    return normalized;
  }
}
