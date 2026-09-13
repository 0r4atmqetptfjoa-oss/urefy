import { describe, it, expect, beforeEach } from 'vitest';
import {
  getNodeInfo,
  getNodeInfoAsync,
  verifyActivityPubSignature,
  createSignedActivityPubEnvelope,
  registerTrustedActorKey,
  clearTrustedActorKeys,
  onRequestGet,
  onRequestPost,
} from '../functions/api/federation.js';
import { onRequestGet as handleAnalyticsGet } from '../functions/api/analytics.js';
import { generateKeyPair, bytesToHex } from '@aetheris/core-crypto';

describe('Federation Key Trust, Idempotency & Telemetry Hygiene (P1)', () => {
  beforeEach(() => {
    clearTrustedActorKeys();
  });

  describe('1. NodeInfo Real Metrics (Zero Fabricated Data)', () => {
    it('MUST return real/zero counts in NodeInfo and NEVER fabricated 450 or 1200', async () => {
      const synchronousNodeInfo = getNodeInfo();
      expect(synchronousNodeInfo.usage.users.total).toBe(0);
      expect(synchronousNodeInfo.usage.users.total).not.toBe(1200);
      expect(synchronousNodeInfo.usage.localPosts).not.toBe(450);

      const asyncNodeInfo = await getNodeInfoAsync();
      expect(asyncNodeInfo.usage.users.total).toBe(0);
      expect(asyncNodeInfo.usage.users.total).not.toBe(1200);
      expect(asyncNodeInfo.usage.localPosts).not.toBe(450);

      // Verify endpoint GET /.well-known/aetheris-node
      const req = new Request('https://aetheris-omni-sphere.pages.dev/.well-known/aetheris-node');
      const res = await onRequestGet({ request: req, env: {} });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.usage.users.total).toBe(0);
      expect(json.usage.users.total).not.toBe(1200);
      expect(json.usage.localPosts).not.toBe(450);
    });

    it('MUST query D1 database for real counts when bound', async () => {
      const mockD1 = {
        prepare: (sql: string) => ({
          first: async () => {
            if (sql.includes('SELECT COUNT(*) as count FROM posts')) {
              return { count: 42 };
            }
            if (sql.includes('COUNT(DISTINCT author_id)')) {
              return { count: 7 };
            }
            return { count: 0 };
          },
        }),
      };

      const realInfo = await getNodeInfoAsync({ DB: mockD1 as any });
      expect(realInfo.usage.users.total).toBe(7);
      expect(realInfo.usage.localPosts).toBe(42);
      expect(realInfo.usage.users.total).not.toBe(1200);
      expect(realInfo.usage.localPosts).not.toBe(450);
    });
  });

  describe('2. Federation Key Trust Enforcement', () => {
    it('MUST reject envelope with self-declared public key if key is not trusted or resolvable', () => {
      const rogueKey = generateKeyPair();
      const roguePubKeyHex = bytesToHex(rogueKey.publicKey);

      // Unregistered rogue actor
      const rogueActor = 'https://rogue-instance.org/actor';
      const envelope = createSignedActivityPubEnvelope(
        rogueActor,
        'rogue-note-1',
        'Malicious payload',
        rogueKey.privateKey,
        roguePubKeyHex
      );

      // Clear trusted keys so rogueActor is NOT in the trusted registry
      clearTrustedActorKeys();

      // Invariant: verifyActivityPubSignature MUST return false without trusted resolution
      const isValid = verifyActivityPubSignature(envelope);
      expect(isValid).toBe(false);
    });

    it('MUST accept envelope only when key is registered in trusted registry', () => {
      const trustedKey = generateKeyPair();
      const trustedPubKeyHex = bytesToHex(trustedKey.publicKey);
      const trustedActor = 'https://trusted-peer.eth/actor';

      const envelope = createSignedActivityPubEnvelope(
        trustedActor,
        'trusted-note-1',
        'Legitimate pulse',
        trustedKey.privateKey,
        trustedPubKeyHex
      );

      // Register key as explicitly trusted
      registerTrustedActorKey(trustedActor, trustedPubKeyHex);

      const isValid = verifyActivityPubSignature(envelope, trustedPubKeyHex);
      expect(isValid).toBe(true);
    });
  });

  describe('3. ActivityPub Duplicate Ingestion Idempotency', () => {
    it('MUST handle duplicate ActivityPub object ingestion idempotently', async () => {
      const peerKey = generateKeyPair();
      const peerPubKeyHex = bytesToHex(peerKey.publicKey);
      const peerActor = 'https://federated-peer.net/actor';
      registerTrustedActorKey(peerActor, peerPubKeyHex);

      const envelope = createSignedActivityPubEnvelope(
        peerActor,
        'idempotent-note-99',
        'This is an idempotent pulse',
        peerKey.privateKey,
        peerPubKeyHex
      );

      // First ingestion
      const req1 = new Request('https://urefy.com/api/federation/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });
      const res1 = await onRequestPost({ request: req1, env: {} });
      expect(res1.status).toBe(201);
      const json1 = await res1.json();
      expect(json1.success).toBe(true);

      // Second ingestion with exact same actor + object ID
      const req2 = new Request('https://urefy.com/api/federation/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });
      const res2 = await onRequestPost({ request: req2, env: {} });
      expect(res2.status).toBe(201);
      const json2 = await res2.json();
      // Should result in the same deterministic postId
      expect(json2.postId).toBe(json1.postId);
    });
  });

  describe('4. Telemetry Hygiene: Unmeasured Metrics Reporting', () => {
    it('MUST return null for avgLatencyMs when no latency is measured and report unavailable uptime', async () => {
      const mockD1 = {
        prepare: () => ({
          all: async () => ({ results: [] }),
          first: async () => ({ count: 0 }),
        }),
      };
      const req = new Request('https://aetheris-omni-sphere.pages.dev/api/analytics');
      const res = await handleAnalyticsGet({ request: req, env: { DB: mockD1 as any, ENVIRONMENT: 'production' } });
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.uptimeSeconds).toBeNull();
      expect(json.uptimePercentage).toBeNull();
      expect(json.uptimeFormatted).toBe('Measured service uptime unavailable');
      expect(json.metrics.avgLatencyMs).toBeNull();
    });
  });
});
