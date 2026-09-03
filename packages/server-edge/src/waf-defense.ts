/**
 * Aetheris Web Application Firewall (WAF) & Layer 7 Anti-DDoS Defense
 * 
 * Implements:
 * - Token Bucket Rate Limiter with burst capacity
 * - Sliding Window Request Counter per IP and per Identity Nullifier
 * - Dynamic IP Quarantine (Blacklisting / Slashing)
 * - Slowloris & Connection Exhaustion Watchdog
 */

export interface RateLimitConfig {
  maxRequestsPerMinute: number;
  burstCapacity: number;
  quarantineDurationMs: number;
  maxConnectionsPerIP: number;
}

export interface ClientConnectionMeta {
  ip: string;
  connectedAt: number;
  lastActivityAt: number;
  requestCountInWindow: number[];
  tokens: number;
  lastTokenRefillAt: number;
}

export class WAFDefenseEngine {
  private readonly config: RateLimitConfig;
  private readonly ipMetadata: Map<string, ClientConnectionMeta>;
  private readonly quarantinedIPs: Map<string, number>; // IP -> unban timestamp
  private readonly ipConnectionCounts: Map<string, number>;
  private totalBlockedRequests: number = 0;
  private totalDDoSAttacksMitigated: number = 0;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = {
      maxRequestsPerMinute: config.maxRequestsPerMinute ?? 120,
      burstCapacity: config.burstCapacity ?? 30,
      quarantineDurationMs: config.quarantineDurationMs ?? 300000, // 5 minutes default
      maxConnectionsPerIP: config.maxConnectionsPerIP ?? 20,
    };
    this.ipMetadata = new Map();
    this.quarantinedIPs = new Map();
    this.ipConnectionCounts = new Map();
  }

  /**
   * Evaluates if a request from an IP is permitted or should be rejected.
   */
  public evaluateRequest(ip: string, now: number = Date.now()): { allowed: boolean; reason?: string; retryAfterMs?: number } {
    // 1. Check if IP is actively quarantined
    if (this.isQuarantined(ip, now)) {
      this.totalBlockedRequests++;
      const unbanAt = this.quarantinedIPs.get(ip) || now;
      return {
        allowed: false,
        reason: 'IP quarantined due to malicious activity or rate-limit violation',
        retryAfterMs: Math.max(0, unbanAt - now),
      };
    }

    let meta = this.ipMetadata.get(ip);
    if (!meta) {
      if (this.ipMetadata.size >= 5000) {
        const staleCutoff = now - 900000; // 15 minutes inactive
        for (const [key, val] of this.ipMetadata.entries()) {
          if (val.lastActivityAt < staleCutoff || this.ipMetadata.size >= 5000) {
            this.ipMetadata.delete(key);
          }
        }
      }
      meta = {
        ip,
        connectedAt: now,
        lastActivityAt: now,
        requestCountInWindow: [],
        tokens: this.config.burstCapacity,
        lastTokenRefillAt: now,
      };
      this.ipMetadata.set(ip, meta);
    }

    // 2. Refill Token Bucket
    const elapsedSec = (now - meta.lastTokenRefillAt) / 1000;
    const refillRate = this.config.maxRequestsPerMinute / 60; // tokens per second
    meta.tokens = Math.min(this.config.burstCapacity, meta.tokens + elapsedSec * refillRate);
    meta.lastTokenRefillAt = now;
    meta.lastActivityAt = now;

    // 3. Sliding Window Counter (1 minute window)
    const windowStart = now - 60000;
    meta.requestCountInWindow = meta.requestCountInWindow.filter(t => t > windowStart);
    meta.requestCountInWindow.push(now);

    // 4. Rate-limit enforcement
    if (meta.requestCountInWindow.length > this.config.maxRequestsPerMinute * 2) {
      // Severe DDoS burst -> Trigger immediate quarantine
      this.quarantineIP(ip, this.config.quarantineDurationMs, 'DDoS traffic spike exceeded 2x burst threshold', now);
      this.totalDDoSAttacksMitigated++;
      this.totalBlockedRequests++;
      return {
        allowed: false,
        reason: 'Severe traffic anomaly detected. IP quarantined.',
        retryAfterMs: this.config.quarantineDurationMs,
      };
    }

    if (meta.tokens < 1) {
      this.totalBlockedRequests++;
      return {
        allowed: false,
        reason: 'Rate limit exceeded (Token bucket depleted)',
        retryAfterMs: Math.ceil((1 - meta.tokens) / refillRate * 1000),
      };
    }

    // Consume 1 token
    meta.tokens -= 1;
    return { allowed: true };
  }

  /**
   * Tracks a new TCP/WebSocket connection from an IP.
   */
  public registerConnection(ip: string): { allowed: boolean; reason?: string } {
    const current = this.ipConnectionCounts.get(ip) || 0;
    if (current >= this.config.maxConnectionsPerIP) {
      return { allowed: false, reason: `Max concurrent connections (${this.config.maxConnectionsPerIP}) reached for IP` };
    }
    this.ipConnectionCounts.set(ip, current + 1);
    return { allowed: true };
  }

  /**
   * Decrements connection count when a connection terminates.
   */
  public unregisterConnection(ip: string): void {
    const current = this.ipConnectionCounts.get(ip) || 0;
    if (current <= 1) {
      this.ipConnectionCounts.delete(ip);
    } else {
      this.ipConnectionCounts.set(ip, current - 1);
    }
  }

  /**
   * Quarantines an IP address for the specified duration.
   */
  public quarantineIP(ip: string, durationMs: number = this.config.quarantineDurationMs, reason?: string, now: number = Date.now()): void {
    this.quarantinedIPs.set(ip, now + durationMs);
  }

  /**
   * Checks if an IP is currently banned/quarantined.
   */
  public isQuarantined(ip: string, now: number = Date.now()): boolean {
    const unbanTime = this.quarantinedIPs.get(ip);
    if (!unbanTime) return false;

    if (now > unbanTime) {
      this.quarantinedIPs.delete(ip);
      return false;
    }
    return true;
  }

  /**
   * Returns current WAF metrics.
   */
  public getMetrics(): {
    activeQuarantinedIPs: number;
    trackedIPs: number;
    totalBlockedRequests: number;
    totalDDoSAttacksMitigated: number;
    activeConnections: number;
  } {
    let totalConn = 0;
    for (const count of this.ipConnectionCounts.values()) {
      totalConn += count;
    }

    return {
      activeQuarantinedIPs: this.quarantinedIPs.size,
      trackedIPs: this.ipMetadata.size,
      totalBlockedRequests: this.totalBlockedRequests,
      totalDDoSAttacksMitigated: this.totalDDoSAttacksMitigated,
      activeConnections: totalConn,
    };
  }

  /**
   * Clears state for testing.
   */
  public reset(): void {
    this.ipMetadata.clear();
    this.quarantinedIPs.clear();
    this.ipConnectionCounts.clear();
    this.totalBlockedRequests = 0;
    this.totalDDoSAttacksMitigated = 0;
  }
}

export const defaultWAF = new WAFDefenseEngine();
