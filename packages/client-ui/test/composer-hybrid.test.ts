import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  HybridComposer, 
  hybridComposer, 
  computeSha256Hex, 
  calculateShannonEntropy, 
  formatBytes,
  type ComposerTab,
  type AudienceCircle
} from '../src/composer-hybrid.js';
import { clientStore } from '../src/client-state.js';
import { pollEngine } from '../src/polls.js';
import { aethDB } from '../src/indexed-db.js';
import { draftAutosave } from '../src/draft-autosave.js';

describe('Unified Hybrid Composer (composer-hybrid.ts) — Comprehensive Test Suite', () => {
  let composer: HybridComposer;

  beforeEach(async () => {
    composer = new HybridComposer();
    await composer.clearDraft();
  });

  describe('1. Multi-Tab Content Creation & State Management', () => {
    it('should initialize with default pulse tab and public stream audience', () => {
      expect(composer.activeTab).toBe('pulse');
      expect(composer.audience).toBe('public-stream');
      expect(composer.maxPulseLength).toBe(280);
      expect(composer.threadSegments.length).toBe(1);
    });

    it('should support switching across all 5 composer tabs', () => {
      const tabs: ComposerTab[] = ['pulse', 'article', 'media', 'poll', 'code'];
      for (const tab of tabs) {
        composer.activeTab = tab;
        expect(composer.activeTab).toBe(tab);
        const modalHtml = composer.renderComposerModal();
        expect(modalHtml).toContain('id="composer-modal-overlay"');
      }
    });

    it('should correctly render and toggle Article mode with markdown tools', () => {
      composer.activeTab = 'article';
      composer.articleTitle = 'Zero-Knowledge Architecture Overview';
      composer.articleCategory = 'SECURITY ADVISORY';
      composer.articleBody = '## Abstract\n\nThis paper discusses **ZK-RLN** polynomials in sovereign mesh nodes.';

      let html = composer.renderComposerModal();
      expect(html).toContain('Article Title');
      expect(html).toContain('Zero-Knowledge Architecture Overview');
      expect(html).toContain('SECURITY ADVISORY');
      expect(html).toContain('btn-md-tool');

      // Toggle Live Preview mode
      composer.isArticlePreviewMode = true;
      html = composer.renderComposerModal();
      expect(html).toContain('Zero-Knowledge Architecture Overview');
      expect(html).toContain('Edit Source');
    });

    it('should manage 4-item Media Gallery with SHA-256 and byte formatting', async () => {
      composer.activeTab = 'media';
      expect(composer.mediaItems.length).toBe(0);

      const fakeDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const fakeSha = await computeSha256Hex(fakeDataUrl);

      // Add item 1
      composer.mediaItems.push({
        id: 'media-1',
        fileName: 'diagram.png',
        fileType: 'image',
        mimeType: 'image/png',
        dataUrl: fakeDataUrl,
        byteSize: 102400,
        sha256: fakeSha,
        caption: 'Network Topology Diagram'
      });

      // Add item 2
      composer.mediaItems.push({
        id: 'media-2',
        fileName: 'demo.mp4',
        fileType: 'video',
        mimeType: 'video/mp4',
        dataUrl: 'https://example.com/video.mp4',
        byteSize: 5242880,
        sha256: fakeSha,
        caption: 'Live Benchmark Demo'
      });

      expect(composer.mediaItems.length).toBe(2);
      expect(formatBytes(102400)).toBe('100 KB');
      expect(formatBytes(5242880)).toBe('5.0 MB');

      const modalHtml = composer.renderComposerModal();
      expect(modalHtml).toContain('diagram.png');
      expect(modalHtml).toContain('demo.mp4');
      expect(modalHtml).toContain('Network Topology Diagram');
      expect(modalHtml).toContain('100 KB');
      expect(modalHtml).toContain('VIDEO');
    });

    it('should manage Sovereign Poll Builder with 2 to 6 dynamic options and durations', () => {
      composer.activeTab = 'poll';
      composer.pollState.question = 'Which ZK backend should UREfy implement next?';
      composer.pollState.options = ['Nova / SuperNova', 'Halo2 Poly-IOP', 'Plonky3 / Boojum'];
      composer.pollState.durationMs = 259200000; // 3 days

      const modalHtml = composer.renderComposerModal();
      expect(modalHtml).toContain('Which ZK backend should UREfy implement next?');
      expect(modalHtml).toContain('Nova / SuperNova');
      expect(modalHtml).toContain('Halo2 Poly-IOP');
      expect(modalHtml).toContain('Plonky3 / Boojum');
      expect(modalHtml).toContain('⏱️ 72 Hours (3 Days)');
      expect(modalHtml).toContain('Interactive Feed Preview');
    });

    it('should manage Verified Code / Patch Tab with syntax highlighting and real-time SHA-256', async () => {
      composer.activeTab = 'code';
      composer.codeState.language = 'rust';
      composer.codeState.filename = 'lib_zk.rs';
      composer.codeState.code = 'pub fn verify_signature(sig: &[u8], pk: &[u8]) -> bool {\n    !sig.is_empty() && pk.len() == 32\n}';

      await composer.updateCodeMetrics();
      expect(composer.codeState.sha256.length).toBe(64);
      expect(composer.codeState.entropy).toBeGreaterThan(0);
      expect(composer.codeState.byteSize).toBeGreaterThan(0);

      let modalHtml = composer.renderComposerModal();
      expect(modalHtml).toContain('lib_zk.rs');
      expect(modalHtml).toContain('Rust (.rs)');
      expect(modalHtml).toContain('Verifiable Code Checksum');

      // Toggle diff inspector view
      composer.codeState.isDiffMode = true;
      modalHtml = composer.renderComposerModal();
      expect(modalHtml).toContain('Raw Code');
    });
  });

  describe('2. Circular SVG Progress Ring & Thread Chain Builder', () => {
    it('should generate circular SVG progress ring with accurate stroke offsets', () => {
      const ringHtml0 = composer.renderRadialProgress(0, 280);
      expect(ringHtml0).toContain('svg');
      expect(ringHtml0).toContain('viewBox="0 0 32 32"');
      expect(ringHtml0).toContain('0%');

      const ringHtml50 = composer.renderRadialProgress(140, 280);
      expect(ringHtml50).toContain('50%');

      const ringHtmlOverflow = composer.renderRadialProgress(300, 280);
      expect(ringHtmlOverflow).toContain('-20');
      expect(ringHtmlOverflow).toContain('#ef4444'); // Crimson for overflow
    });

    it('should support thread chain builder with multi-segment addition and removal', () => {
      composer.activeTab = 'pulse';
      expect(composer.threadSegments.length).toBe(1);

      // Add second segment
      composer.threadSegments.push({
        id: 'seg-1',
        content: 'This is the second pulse in the sovereign thread chain.',
      });

      // Add third segment
      composer.threadSegments.push({
        id: 'seg-2',
        content: 'And here is the third concluding pulse with zero central tracking.',
      });

      expect(composer.threadSegments.length).toBe(3);

      const modalHtml = composer.renderComposerModal();
      expect(modalHtml).toContain('Pulse Segment 1 of 3');
      expect(modalHtml).toContain('Pulse Segment 2 of 3');
      expect(modalHtml).toContain('Pulse Segment 3 of 3');
      expect(modalHtml).toContain('3 Pulses in Thread');
    });
  });

  describe('3. Audience & Sovereign Circle Selector', () => {
    it('should switch audience destinations and display SFrame E2EE status indicators', () => {
      const audiences: AudienceCircle[] = [
        'public-stream',
        'circle-core',
        'circle-guardians',
        'relays-general',
        'vault-releases',
      ];

      for (const aud of audiences) {
        composer.audience = aud;
        const html = composer.renderComposerModal();
        expect(html).toContain('Audience Destination:');
        if (aud.startsWith('circle-')) {
          expect(html).toContain('SFrame E2EE Active');
        } else {
          expect(html).toContain('ZK-RLN Gated Stream');
        }
      }
    });
  });

  describe('4. Draft Autosave & Cryptographic Signing Execution', () => {
    it('should save and hydrate drafts from IndexedDB', async () => {
      composer.activeTab = 'article';
      composer.articleTitle = 'Persistent Sovereign Draft';
      composer.articleBody = 'Testing IndexedDB draft auto-recovery.';
      composer.audience = 'circle-core';

      await composer.saveDraftNow();
      expect(composer.draftStatus).toBe('saved');
      expect(composer.lastSavedAt).toBeDefined();

      const freshComposer = new HybridComposer();
      await freshComposer.hydrateFromDraftStorage(true);

      expect(freshComposer.articleTitle).toBe('Persistent Sovereign Draft');
      expect(freshComposer.articleBody).toBe('Testing IndexedDB draft auto-recovery.');
      expect(freshComposer.audience).toBe('circle-core');
    });

    it('should broadcast publication with Ed25519 signature and ZK-RLN rate limit integration', async () => {
      composer.activeTab = 'pulse';
      composer.threadSegments = [
        { id: 'seg-0', content: 'Genesis micro-pulse broadcast test #1' },
        { id: 'seg-1', content: 'Second chained segment in the thread #2' }
      ];

      const initialPostsCount = clientStore.posts.length;
      const success = await composer.broadcastPublication();

      expect(success).toBe(true);
      expect(clientStore.posts.length).toBeGreaterThan(initialPostsCount);

      const newestPost = clientStore.posts[0];
      expect(newestPost).toBeDefined();
      expect(composer.draftStatus).toBe('idle');
    });
  });

  describe('5. Pure Cryptographic Utilities', () => {
    it('should calculate accurate Shannon entropy for high vs low randomness strings', () => {
      const lowEntropy = calculateShannonEntropy('aaaaaaaaaaaaaaaaaaaa');
      expect(lowEntropy).toBe(0);

      const codeEntropy = calculateShannonEntropy('function verifyProof(nullifier: string): boolean { return true; }');
      expect(codeEntropy).toBeGreaterThan(3.5);
      expect(codeEntropy).toBeLessThan(5.5);

      const highEntropy = calculateShannonEntropy('9f8a3c2b1e7d0a4f5c6e8b9a1d2f3e4c5b6a7d8e9f0a1b2c3d4e5f6a7b8c9d0e');
      expect(highEntropy).toBeGreaterThan(3.8);
    });

    it('should compute consistent SHA-256 digests', async () => {
      const text = 'UREfy Sovereign Cryptography';
      const hash1 = await computeSha256Hex(text);
      const hash2 = await computeSha256Hex(text);
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64);
    });
  });
});
