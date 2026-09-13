import { describe, it, expect, beforeEach } from 'vitest';
import {
  onRequestGet,
  onRequestDelete,
  onRequestPost,
  sanitizeStorageKey,
  resetEdgeStorage,
} from '../functions/api/storage.js';
import { createSovereignIdentity, createSignedEnvelope } from '@aetheris/core-crypto';

describe('Storage API Hardening & Security (Pass 2)', () => {
  beforeEach(() => {
    resetEdgeStorage();
  });

  describe('Path Traversal & Key Collision Rejection', () => {
    it('strictly rejects traversal sequences, URL-encoded traversals, repeated slashes, and control chars', () => {
      // Unsafe keys are REJECTED (return empty string) rather than silently transformed
      expect(sanitizeStorageKey('a/../b')).toBe('');
      expect(sanitizeStorageKey('../../../etc/passwd')).toBe('');
      expect(sanitizeStorageKey('foo/../../bar')).toBe('');
      expect(sanitizeStorageKey('..')).toBe('');
      expect(sanitizeStorageKey('....//secret')).toBe('');
      expect(sanitizeStorageKey('\\windows\\system32\\cmd.exe')).toBe('');
      expect(sanitizeStorageKey('/root/app/')).toBe('');
      expect(sanitizeStorageKey('a/%2e%2e/b')).toBe('');
      expect(sanitizeStorageKey('a/%252e%252e/b')).toBe('');
      expect(sanitizeStorageKey('foo//bar')).toBe('');
      expect(sanitizeStorageKey('foo\0bar')).toBe('');
      expect(sanitizeStorageKey('foo\r\nbar')).toBe('');
      expect(sanitizeStorageKey('foo\u2215bar')).toBe(''); // Unicode Division Slash
      expect(sanitizeStorageKey('foo\uFF0Fbar')).toBe(''); // Unicode Fullwidth Solidus
    });

    it('accepts valid, non-traversal canonical storage keys', () => {
      expect(sanitizeStorageKey('releases/microkernel-x86_64.bin')).toBe('releases/microkernel-x86_64.bin');
      expect(sanitizeStorageKey('user-123/avatar.png')).toBe('user-123/avatar.png');
      expect(sanitizeStorageKey('alice-file-1')).toBe('alice-file-1');
    });

    it('rejects GET requests attempting path traversal with HTTP 400', async () => {
      const req = new Request('https://urefy.com/api/storage?key=../../../etc/passwd');
      const res = await onRequestGet({ request: req, env: {} });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Invalid storage key/i);
    });

    it('rejects POST requests with unsafe custom key with HTTP 400', async () => {
      const alice = createSovereignIdentity();
      const req = new Request('https://urefy.com/api/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          createSignedEnvelope({ content: 'test', key: 'foo/../bar' }, alice)
        ),
      });
      const res = await onRequestPost({ request: req, env: {} });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Invalid custom storage key/i);
    });
  });

  describe('Download Security Headers & Header Injection Resistance', () => {
    it('serves downloads with strict CSP, nosniff, frame-options and sanitized filename', async () => {
      const alice = createSovereignIdentity();
      const uploadReq = new Request('https://urefy.com/api/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          createSignedEnvelope(
            {
              content: 'console.log("XSS attempt")',
              fileName: 'evil"file\r\nX-Injected: attack.svg',
              key: 'releases/xss-test.svg',
              contentType: 'image/svg+xml',
            },
            alice
          )
        ),
      });

      const postRes = await onRequestPost({ request: uploadReq, env: {} });
      expect(postRes.status).toBe(201);

      const downloadReq = new Request('https://urefy.com/api/storage?key=releases/xss-test.svg');
      const getRes = await onRequestGet({ request: downloadReq, env: {} });

      expect(getRes.status).toBe(200);
      expect(getRes.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(getRes.headers.get('Content-Security-Policy')).toBe("default-src 'none'; sandbox");
      expect(getRes.headers.get('X-Frame-Options')).toBe('DENY');

      const disposition = getRes.headers.get('Content-Disposition') || '';
      expect(disposition).toContain('attachment;');
      expect(disposition).not.toContain('\r');
      expect(disposition).not.toContain('\n');
      expect(disposition).not.toContain('evil"file');
      expect(disposition).toContain('evil_fileX-Injected: attack.svg');
    });
  });

  describe('Action-Binding & Key-Binding Authorization on Deletion', () => {
    it('rejects DELETE when signed envelope binds a different key', async () => {
      const alice = createSovereignIdentity();

      const upReq1 = new Request('https://urefy.com/api/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          createSignedEnvelope({ content: 'File 1 content', key: 'alice-file-1' }, alice)
        ),
      });
      await onRequestPost({ request: upReq1, env: {} });

      const upReq2 = new Request('https://urefy.com/api/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          createSignedEnvelope({ content: 'File 2 content', key: 'alice-file-2' }, alice)
        ),
      });
      await onRequestPost({ request: upReq2, env: {} });

      const delEnvelopeFile1 = createSignedEnvelope({ key: 'alice-file-1', action: 'delete' }, alice);

      const attackDelReq = new Request('https://urefy.com/api/storage?key=alice-file-2', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Sovereign-Envelope': JSON.stringify(delEnvelopeFile1),
        },
        body: JSON.stringify(delEnvelopeFile1),
      });

      const res = await onRequestDelete({ request: attackDelReq, env: {} });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/key mismatch|does not match target/i);
    });

    it('rejects DELETE when signed envelope payload specifies an unauthorized action', async () => {
      const alice = createSovereignIdentity();

      const upReq = new Request('https://urefy.com/api/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          createSignedEnvelope({ content: 'File to delete', key: 'alice-file-3' }, alice)
        ),
      });
      await onRequestPost({ request: upReq, env: {} });

      const invalidActionEnvelope = createSignedEnvelope(
        { key: 'alice-file-3', action: 'vote:cast' },
        alice
      );

      const delReq = new Request('https://urefy.com/api/storage?key=alice-file-3', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Sovereign-Envelope': JSON.stringify(invalidActionEnvelope),
        },
        body: JSON.stringify(invalidActionEnvelope),
      });

      const res = await onRequestDelete({ request: delReq, env: {} });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/not authorized for deletion/i);
    });

    it('rejects DELETE when signed envelope omits the key or action field', async () => {
      const alice = createSovereignIdentity();

      const upReq = new Request('https://urefy.com/api/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          createSignedEnvelope({ content: 'File to delete', key: 'alice-file-4' }, alice)
        ),
      });
      await onRequestPost({ request: upReq, env: {} });

      // Envelope without action field
      const noActionEnvelope = createSignedEnvelope({ key: 'alice-file-4' }, alice);
      const delReq1 = new Request('https://urefy.com/api/storage?key=alice-file-4', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Sovereign-Envelope': JSON.stringify(noActionEnvelope),
        },
        body: JSON.stringify(noActionEnvelope),
      });
      const res1 = await onRequestDelete({ request: delReq1, env: {} });
      expect(res1.status).toBe(403);

      // Envelope without key field
      const noKeyEnvelope = createSignedEnvelope({ action: 'delete' }, alice);
      const delReq2 = new Request('https://urefy.com/api/storage?key=alice-file-4', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Sovereign-Envelope': JSON.stringify(noKeyEnvelope),
        },
        body: JSON.stringify(noKeyEnvelope),
      });
      const res2 = await onRequestDelete({ request: delReq2, env: {} });
      expect(res2.status).toBe(403);
    });

    it('allows valid DELETE with matching key and storage:delete action', async () => {
      const alice = createSovereignIdentity();

      const upReq = new Request('https://urefy.com/api/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          createSignedEnvelope({ content: 'Valid delete test file', key: 'alice-file-valid' }, alice)
        ),
      });
      await onRequestPost({ request: upReq, env: {} });

      const validDelEnvelope = createSignedEnvelope(
        { key: 'alice-file-valid', action: 'storage:delete' },
        alice
      );

      const delReq = new Request('https://urefy.com/api/storage?key=alice-file-valid', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Sovereign-Envelope': JSON.stringify(validDelEnvelope),
        },
        body: JSON.stringify(validDelEnvelope),
      });

      const res = await onRequestDelete({ request: delReq, env: {} });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });
});
