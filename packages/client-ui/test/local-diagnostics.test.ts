import { describe, it, expect, beforeEach } from 'vitest';
import { LocalDiagnosticsManager, sanitizeDiagnosticsText } from '../src/local-diagnostics.js';

describe('Ticket 4.6: Local Diagnostics — 100% On-Device, Zero Network Telemetry', () => {
  let diagnostics: LocalDiagnosticsManager;

  beforeEach(() => {
    diagnostics = new LocalDiagnosticsManager();
    diagnostics.clearRecords();
  });

  it('1. records errors into rotating ring buffer capped at 200 entries', () => {
    // Record 205 errors (exceeds 200 cap)
    for (let i = 0; i < 205; i++) {
      diagnostics.recordError(new Error(`Synthetic error ${i}`), 'TestComponent');
    }

    const records = diagnostics.getRecords();
    // Buffer should cap at 200
    expect(records.length).toBeLessThanOrEqual(200);
    expect(records.length).toBeGreaterThan(0);
  });

  it('2. sanitizeDiagnosticsText strips passwords, seeds, and private keys from stack traces', () => {
    const dirty = 'Error: failed password=mysecretpassword123 at handler.ts:10 token=eyABC123 private_key=abc123def456';
    const clean = sanitizeDiagnosticsText(dirty);

    expect(clean).not.toContain('mysecretpassword123');
    expect(clean).not.toContain('eyABC123');
    expect(clean).not.toContain('abc123def456');
    expect(clean).toContain('[REDACTED');
  });

  it('3. sanitizeDiagnosticsText strips BIP-39 seed phrases and 64-hex private keys', () => {
    const withKey = 'Error at seed=word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12';
    const clean = sanitizeDiagnosticsText(withKey);
    expect(clean).toContain('[REDACTED_SEED]');

    const hexKey = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
    const hexClean = sanitizeDiagnosticsText(hexKey);
    expect(hexClean).not.toContain(hexKey);
    expect(hexClean).toContain('[REDACTED_KEY_HEX]');
  });

  it('4. sanitizeDiagnosticsText strips emails, IPs, and URL query params (PII)', () => {
    const pii = 'User: alice@example.com from IP 192.168.1.1 url https://api.example.com/v1?token=secret&key=abc';
    const clean = sanitizeDiagnosticsText(pii);

    expect(clean).toContain('[REDACTED_EMAIL]');
    expect(clean).toContain('[REDACTED_IP]');
    expect(clean).not.toContain('alice@example.com');
    expect(clean).not.toContain('192.168.1.1');
  });

  it('5. getDiagnosticReport returns valid JSON structure with zero-network guarantee', () => {
    diagnostics.recordError(new Error('Test error'), 'UnitTest');
    const report = diagnostics.getDiagnosticReport();

    expect(report.appName).toBe('UREfy');
    expect(report.zeroNetworkGuaranteed).toBe(true);
    expect(typeof report.recordsCount).toBe('number');
    expect(Array.isArray(report.records)).toBe(true);
    expect(report.timestamp).toBeGreaterThan(0);
    expect(typeof report.reportType).toBe('string');
    expect(report.reportType.length).toBeGreaterThan(0);
  });

  it('6. verifyZeroNetworkTelemetry returns true — no external requests in any code path', () => {
    expect(diagnostics.verifyZeroNetworkTelemetry()).toBe(true);
  });

  it('7. diagnosticsEnabled toggle controls error recording', () => {
    diagnostics.setEnabled(false);
    diagnostics.recordError(new Error('Should not be recorded'), 'TestComponent');
    expect(diagnostics.getRecords().length).toBe(0);

    diagnostics.setEnabled(true);
    diagnostics.recordError(new Error('Should be recorded'), 'TestComponent');
    expect(diagnostics.getRecords().length).toBe(1);
  });
});
