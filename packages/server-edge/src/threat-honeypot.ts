/**
 * Aetheris Threat Honeypot & Decoy Security Engine
 * 
 * Traps automated exploit scanners, web vulnerability bots, and malicious actors
 * probing standard vulnerable endpoints (e.g. `/.env`, `/admin`, `/wp-login.php`, `/actuator/health`).
 * Automatically triggers immediate IP quarantine and logs threat intelligence incidents.
 */

import { WAFDefenseEngine } from './waf-defense.js';

export interface ThreatIncident {
  id: string;
  timestamp: number;
  ip: string;
  path: string;
  userAgent?: string;
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  vector: string;
  actionTaken: 'QUARANTINED' | 'BLOCKED' | 'FLAGGED';
}

export class ThreatHoneypotEngine {
  private static readonly DECOY_PATHS = new Set([
    '/.env',
    '/.git/config',
    '/admin',
    '/admin.php',
    '/administrator',
    '/wp-login.php',
    '/wp-admin',
    '/api/v1/debug',
    '/actuator/health',
    '/actuator/env',
    '/graphql_debug',
    '/phpmyadmin',
    '/server-status',
    '/config.json',
    '/secrets.yml',
  ]);

  private readonly incidents: ThreatIncident[];
  private readonly maxIncidentLogSize: number;
  private readonly wafEngine: WAFDefenseEngine;

  constructor(wafEngine: WAFDefenseEngine, maxIncidentLogSize: number = 1000) {
    this.wafEngine = wafEngine;
    this.incidents = [];
    this.maxIncidentLogSize = maxIncidentLogSize;
  }

  /**
   * Checks if an incoming HTTP path matches known honeypot/decoy routes.
   * If matched, logs the incident, triggers immediate 24h IP quarantine, and returns true.
   */
  public handleRequest(path: string, ip: string, userAgent?: string, now: number = Date.now()): boolean {
    const cleanPath = path.toLowerCase().split('?')[0];

    if (ThreatHoneypotEngine.DECOY_PATHS.has(cleanPath)) {
      const randSuffix = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID().replace(/-/g, '').substring(0, 8)
        : Date.now().toString(36);
      const incident: ThreatIncident = {
        id: `inc_${now}_${randSuffix}`,
        timestamp: now,
        ip,
        path,
        userAgent,
        threatLevel: 'CRITICAL',
        vector: `Automated vulnerability scanner probing honeypot decoy: ${cleanPath}`,
        actionTaken: 'QUARANTINED',
      };

      this.incidents.unshift(incident);
      if (this.incidents.length > this.maxIncidentLogSize) {
        this.incidents.pop();
      }

      // Quarantine IP for 24 hours (86400000 ms)
      this.wafEngine.quarantineIP(ip, 86400000, `Honeypot trap triggered on ${cleanPath}`, now);

      return true;
    }

    return false;
  }

  /**
   * Returns recent threat incidents.
   */
  public getIncidents(limit: number = 50): ThreatIncident[] {
    return this.incidents.slice(0, limit);
  }

  /**
   * Returns summary counts by threat level.
   */
  public getSummary(): { total: number; critical: number; high: number; quarantined: number } {
    return {
      total: this.incidents.length,
      critical: this.incidents.filter(i => i.threatLevel === 'CRITICAL').length,
      high: this.incidents.filter(i => i.threatLevel === 'HIGH').length,
      quarantined: this.incidents.filter(i => i.actionTaken === 'QUARANTINED').length,
    };
  }

  /**
   * Clears logged incidents for test hygiene.
   */
  public clear(): void {
    this.incidents.length = 0;
  }
}
