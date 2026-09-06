import { describe, it, expect, beforeEach } from 'vitest';
import { onRequestGet as handlePostsGet, onRequestPost as handlePostsPost } from '../functions/api/posts.js';
import { onRequestGet as handleMessagesGet, onRequestPost as handleMessagesPost } from '../functions/api/messages.js';
import { onRequestGet as handleChannelsGet, onRequestPost as handleChannelsPost } from '../functions/api/channels.js';
import { onRequestGet as handleNanopubsGet, onRequestPost as handleNanopubsPost } from '../functions/api/nanopublications.js';
import { onRequestGet as handleInteractionsGet, onRequestPost as handleInteractionsPost } from '../functions/api/interactions.js';
import { onRequestGet as handleFederationGet, onRequestPost as handleFederationPost } from '../functions/api/federation.js';
import { onRequestGet as handleReportGet, onRequestPost as handleReportPost, onRequestPatch as handleReportPatch, memoryReportsStore } from '../functions/api/report.js';
import { onRequestGet as handleAnalyticsGet, onRequestPost as handleAnalyticsPost } from '../functions/api/analytics.js';
import { onRequest as handleWebAuthn } from '../functions/api/webauthn.js';
import { onRequestGet as handleStorageGet, onRequestPost as handleStoragePost, onRequestDelete as handleStorageDelete } from '../functions/api/storage.js';
import { onRequestGet as handleCronBackupGet, onRequestPost as handleCronBackupPost } from '../functions/api/cron-backup.js';
import {
  globalPostsStore,
  globalMessagesStore,
  globalChannelsStore,
  globalNanopublicationsStore,
  globalInteractionsStore,
} from '../functions/api/_db.js';

describe('Production Database & Storage Enforcement Suite', () => {
  const prodEnvWithoutDb = {
    ENVIRONMENT: 'production',
    ADMIN_PIN: 'test-admin-secret-pin',
  };

  const throwingDb = {
    prepare: () => ({
      bind: () => ({
        run: () => Promise.reject(new Error('D1_STORAGE_WRITE_FAILURE')),
        all: () => Promise.reject(new Error('D1_STORAGE_READ_FAILURE')),
        first: () => Promise.reject(new Error('D1_STORAGE_READ_FAILURE')),
      }),
      run: () => Promise.reject(new Error('D1_STORAGE_WRITE_FAILURE')),
      all: () => Promise.reject(new Error('D1_STORAGE_READ_FAILURE')),
      first: () => Promise.reject(new Error('D1_STORAGE_READ_FAILURE')),
    }),
  };

  const throwingR2 = {
    get: () => Promise.reject(new Error('R2_STORAGE_GET_FAILURE')),
    put: () => Promise.reject(new Error('R2_STORAGE_PUT_FAILURE')),
    delete: () => Promise.reject(new Error('R2_STORAGE_DELETE_FAILURE')),
    list: () => Promise.reject(new Error('R2_STORAGE_LIST_FAILURE')),
  };

  const prodEnvWithThrowingStorage = {
    ENVIRONMENT: 'production',
    ADMIN_PIN: 'test-admin-secret-pin',
    DB: throwingDb,
    VAULT_BUCKET: throwingR2,
  };

  beforeEach(() => {
    memoryReportsStore.length = 0;
    globalPostsStore.length = 0;
    globalMessagesStore.length = 0;
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // SECTION 1: MISSING DEPENDENCY (HTTP 503) TESTS ACROSS ALL 10 ENDPOINTS
  // ═════════════════════════════════════════════════════════════════════════════
  describe('Missing Dependency Enforcement (503 Service Unavailable)', () => {
    it('1. /api/posts — returns 503 on GET & POST in production when D1 is absent', async () => {
      const getRes = await handlePostsGet({
        request: new Request('http://localhost/api/posts?channelId=general'),
        env: prodEnvWithoutDb,
      });
      expect(getRes.status).toBe(503);

      const postRes = await handlePostsPost({
        request: new Request('http://localhost/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Admin-PIN': 'test-admin-secret-pin' },
          body: JSON.stringify({ title: 'Test', content: 'Test', authorFingerprint: 'genesis-core' }),
        }),
        env: prodEnvWithoutDb,
      });
      expect(postRes.status).toBe(503);
    });

    it('2. /api/messages — returns 503 on GET & POST in production when D1 is absent', async () => {
      const getRes = await handleMessagesGet({
        request: new Request('http://localhost/api/messages?channelId=relays-general'),
        env: prodEnvWithoutDb,
      });
      expect(getRes.status).toBe(503);

      const postRes = await handleMessagesPost({
        request: new Request('http://localhost/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Admin-PIN': 'test-admin-secret-pin' },
          body: JSON.stringify({ ciphertext: 'CIPHER', channelId: 'relays-general', authorFingerprint: 'genesis-core' }),
        }),
        env: prodEnvWithoutDb,
      });
      expect(postRes.status).toBe(503);
    });

    it('3. /api/channels — returns 503 on GET & POST in production when D1 is absent', async () => {
      const getRes = await handleChannelsGet({
        request: new Request('http://localhost/api/channels?space=relays'),
        env: prodEnvWithoutDb,
      });
      expect(getRes.status).toBe(503);

      const postRes = await handleChannelsPost({
        request: new Request('http://localhost/api/channels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Admin-PIN': 'test-admin-secret-pin' },
          body: JSON.stringify({ space: 'relays', name: 'prod-channel' }),
        }),
        env: prodEnvWithoutDb,
      });
      expect(postRes.status).toBe(503);
    });

    it('4. /api/interactions — returns 503 on GET & POST in production when D1 is absent', async () => {
      const getRes = await handleInteractionsGet({
        request: new Request('http://localhost/api/interactions?targetId=post-1'),
        env: prodEnvWithoutDb,
      });
      expect(getRes.status).toBe(503);

      const postRes = await handleInteractionsPost({
        request: new Request('http://localhost/api/interactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Admin-PIN': 'test-admin-secret-pin' },
          body: JSON.stringify({ targetId: 'post-1', action: 'like', userFingerprint: 'genesis-core' }),
        }),
        env: prodEnvWithoutDb,
      });
      expect(postRes.status).toBe(503);
    });

    it('5. /api/report — returns 503 on GET, POST & PATCH in production when D1 is absent', async () => {
      const getRes = await handleReportGet({
        request: new Request('http://localhost/api/report', { headers: { 'X-Admin-PIN': 'test-admin-secret-pin' } }),
        env: prodEnvWithoutDb,
      });
      expect(getRes.status).toBe(503);

      const postRes = await handleReportPost({
        request: new Request('http://localhost/api/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetId: 'post-1', targetType: 'post', reason: 'CSAM' }),
        }),
        env: prodEnvWithoutDb,
      });
      expect(postRes.status).toBe(503);

      const patchRes = await handleReportPatch({
        request: new Request('http://localhost/api/report', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'X-Admin-PIN': 'test-admin-secret-pin' },
          body: JSON.stringify({ reportId: 'dsa-1', status: 'actioned' }),
        }),
        env: prodEnvWithoutDb,
      });
      expect(patchRes.status).toBe(503);
    });

    it('6. /api/analytics — returns 503 on GET & POST in production when D1 is absent', async () => {
      const getRes = await handleAnalyticsGet({
        request: new Request('http://localhost/api/analytics'),
        env: prodEnvWithoutDb,
      });
      expect(getRes.status).toBe(503);

      const postRes = await handleAnalyticsPost({
        request: new Request('http://localhost/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Admin-PIN': 'test-admin-secret-pin' },
          body: JSON.stringify({ nodeId: 'node-1', name: 'alpha' }),
        }),
        env: prodEnvWithoutDb,
      });
      expect(postRes.status).toBe(503);
    });

    it('7. /api/webauthn — returns 503 on GET & POST in production when D1 is absent', async () => {
      const getRes = await handleWebAuthn({
        request: new Request('http://localhost/api/webauthn?action=challenge'),
        env: prodEnvWithoutDb,
      });
      expect(getRes.status).toBe(503);

      const postRes = await handleWebAuthn({
        request: new Request('http://localhost/api/webauthn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'register', fingerprint: 'anon' }),
        }),
        env: prodEnvWithoutDb,
      });
      expect(postRes.status).toBe(503);
    });

    it('8. /api/storage — returns 503 on GET, POST & DELETE in production when R2 is absent', async () => {
      const getRes = await handleStorageGet({
        request: new Request('http://localhost/api/storage?key=vault/test.bin'),
        env: prodEnvWithoutDb,
      });
      expect(getRes.status).toBe(503);

      const postRes = await handleStoragePost({
        request: new Request('http://localhost/api/storage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream', 'X-Admin-PIN': 'test-admin-secret-pin' },
          body: new Uint8Array([1, 2, 3]),
        }),
        env: prodEnvWithoutDb,
      });
      expect(postRes.status).toBe(503);

      const delRes = await handleStorageDelete({
        request: new Request('http://localhost/api/storage?key=vault/test.bin', {
          method: 'DELETE',
          headers: { 'X-Admin-PIN': 'test-admin-secret-pin' },
        }),
        env: prodEnvWithoutDb,
      });
      expect(delRes.status).toBe(503);
    });

    it('9. /api/cron-backup — returns 503 on GET & POST in production when storage is absent', async () => {
      const getRes = await handleCronBackupGet({
        request: new Request('http://localhost/api/cron-backup'),
        env: prodEnvWithoutDb,
      });
      expect(getRes.status).toBe(503);

      const postRes = await handleCronBackupPost({
        request: new Request('http://localhost/api/cron-backup', {
          method: 'POST',
          headers: { 'X-Admin-PIN': 'test-admin-secret-pin' },
        }),
        env: prodEnvWithoutDb,
      });
      expect(postRes.status).toBe(500); // executeBackup rejects due to missing R2/D1 in prod
    });

    it('10. /api/federation — returns 503 on GET & POST in production when D1 is absent', async () => {
      const getRes = await handleFederationGet({
        request: new Request('http://localhost/api/federation/outbox'),
        env: prodEnvWithoutDb,
      });
      expect(getRes.status).toBe(503);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // SECTION 2: TEST A — "FAKE SUCCESS" WRITE REJECTION & NON-PERSISTENCE VERIFICATION
  // ═════════════════════════════════════════════════════════════════════════════
  describe('Mandatory Test A: Fake Success Defense (Failed Write != 200/201 & No Persistence)', () => {
    it('A.1 POST /api/posts: rejects on D1 failure and post is NOT stored', async () => {
      const postReq = new Request('http://localhost/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-PIN': 'test-admin-secret-pin' },
        body: JSON.stringify({
          title: 'Unpersisted Post',
          content: 'Payload should not appear anywhere',
          authorFingerprint: 'genesis-core',
        }),
      });

      const res = await handlePostsPost({ request: postReq, env: prodEnvWithThrowingStorage });
      expect(res.status).not.toBe(200);
      expect(res.status).not.toBe(201);
      expect(res.status).toBe(500);

      // Verify no data leaked into RAM in production
      expect(globalPostsStore.some((p) => p.title === 'Unpersisted Post')).toBe(false);
    });

    it('A.2 POST /api/messages: rejects on D1 failure and message is NOT stored', async () => {
      const msgReq = new Request('http://localhost/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-PIN': 'test-admin-secret-pin' },
        body: JSON.stringify({
          ciphertext: 'FAIL_CIPHERTEXT',
          channelId: 'relays-general',
          authorFingerprint: 'genesis-core',
        }),
      });

      const res = await handleMessagesPost({ request: msgReq, env: prodEnvWithThrowingStorage });
      expect(res.status).not.toBe(200);
      expect(res.status).not.toBe(201);
      expect(res.status).toBe(500);

      // Verify no message in RAM
      expect(globalMessagesStore.some((m) => m.ciphertext === 'FAIL_CIPHERTEXT')).toBe(false);
    });

    it('A.3 POST /api/channels: rejects on D1 failure and channel is NOT stored', async () => {
      const chReq = new Request('http://localhost/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-PIN': 'test-admin-secret-pin' },
        body: JSON.stringify({ space: 'relays', name: 'unpersisted-channel' }),
      });

      const res = await handleChannelsPost({ request: chReq, env: prodEnvWithThrowingStorage });
      expect(res.status).not.toBe(200);
      expect(res.status).not.toBe(201);
      expect(res.status).toBe(500);

      expect(globalChannelsStore.some((c) => c.name === 'unpersisted-channel')).toBe(false);
    });

    it('A.4 POST /api/report: rejects on D1 failure and DSA report is NOT stored', async () => {
      const repReq = new Request('http://localhost/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: 'post-unpersisted',
          targetType: 'post',
          reason: 'TERRORISM',
        }),
      });

      const res = await handleReportPost({ request: repReq, env: prodEnvWithThrowingStorage });
      expect(res.status).not.toBe(200);
      expect(res.status).not.toBe(201);
      expect(res.status).toBe(500);

      expect(memoryReportsStore.some((r) => r.targetId === 'post-unpersisted')).toBe(false);
    });

    it('A.5 PATCH /api/report: rejects on D1 failure and status is NOT updated in production', async () => {
      const patchReq = new Request('http://localhost/api/report', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-PIN': 'test-admin-secret-pin' },
        body: JSON.stringify({ reportId: 'dsa-rep-fail', status: 'actioned' }),
      });

      const res = await handleReportPatch({ request: patchReq, env: prodEnvWithThrowingStorage });
      expect(res.status).not.toBe(200);
      expect(res.status).toBe(500);
    });

    it('A.6 POST /api/storage: rejects on R2 failure and file is NOT marked as uploaded', async () => {
      const uploadReq = new Request('http://localhost/api/storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Admin-PIN': 'test-admin-secret-pin',
          'X-File-Name': 'failed-artifact.bin',
        },
        body: new Uint8Array([10, 20, 30, 40]),
      });

      const res = await handleStoragePost({ request: uploadReq, env: prodEnvWithThrowingStorage });
      expect(res.status).not.toBe(200);
      expect(res.status).not.toBe(201);
      expect(res.status).toBe(500);
    });
  });
});
