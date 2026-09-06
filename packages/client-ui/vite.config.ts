/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/.{idea,git,cache,output,temp}/**'],
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    target: 'esnext',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    cssCodeSplit: true,
    reportCompressedSize: true,
    minify: 'esbuild',
    rollupOptions: {
      treeshake: {
        preset: 'recommended',
        moduleSideEffects: 'no-external',
      },
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        manualChunks(id) {
          const normalized = id.replace(/\\/g, '/');
          if (normalized.includes('node_modules')) {
            if (normalized.includes('@noble')) {
              return 'noble-crypto';
            }
            return 'vendor';
          }
          if (normalized.includes('packages/core-crypto')) {
            return 'core-crypto';
          }
          if (normalized.includes('packages/vault-engine')) {
            return 'vault-engine';
          }
          if (normalized.includes('/src/custom-theme-builder') || normalized.includes('/src/themes')) {
            return 'theme-studio';
          }
          if (normalized.includes('/src/diagram-renderer')) {
            return 'diagram-renderer';
          }
          if (normalized.includes('/src/webtorrent-swarm')) {
            return 'webtorrent-swarm';
          }
          if (normalized.includes('/src/spatial-audio') || normalized.includes('/src/spatial-audio-mesh')) {
            return 'spatial-audio';
          }
          if (normalized.includes('/src/network-observatory') || normalized.includes('/src/network-wot-graph') || normalized.includes('/src/gossip-viz')) {
            return 'observatory-viz';
          }
          if (normalized.includes('/src/export-backup') || normalized.includes('/src/data-archive')) {
            return 'backup-archive';
          }
          if (normalized.includes('/src/i18n/locales/')) {
            return 'i18n-locales';
          }
          if (normalized.includes('/src/ai-assistant')) {
            return 'ai-assistant';
          }
          if (normalized.includes('/src/governance') || normalized.includes('/src/time-travel-consensus')) {
            return 'governance-dao';
          }
          if (normalized.includes('/src/rich-editor')) {
            return 'rich-editor';
          }
          if (normalized.includes('/src/webrtc-transfer') || normalized.includes('/src/p2p-client')) {
            return 'p2p-transfer';
          }
          if (normalized.includes('/src/wallet-bridge')) {
            return 'wallet-bridge';
          }
          if (normalized.includes('/src/cve-monitor')) {
            return 'cve-monitor';
          }
          if (normalized.includes('/src/slide-deck')) {
            return 'slide-deck';
          }
          if (normalized.includes('/src/rss-import')) {
            return 'rss-import';
          }
          if (normalized.includes('/src/transparency-mode')) {
            return 'transparency-mode';
          }
          if (normalized.includes('/src/audio-dsp') || normalized.includes('/src/acoustic-dsp') || normalized.includes('/src/sound-packs')) {
            return 'audio-dsp';
          }
          if (
            normalized.includes('/src/binary-hygiene-portal') ||
            normalized.includes('/src/steganography-modal') ||
            normalized.includes('/src/steganography-transport') ||
            normalized.includes('/src/social-recovery-modal') ||
            normalized.includes('/src/portable-trust-modal') ||
            normalized.includes('/src/archive-modal') ||
            normalized.includes('/src/paper-wallet') ||
            normalized.includes('/src/mnemonic-modal') ||
            normalized.includes('/src/microsaas-docs-modal')
          ) {
            return 'security-modals';
          }
          if (
            normalized.includes('/src/merkle-viz') ||
            normalized.includes('/src/mesh-matrix') ||
            normalized.includes('/src/zk-proof-viewer') ||
            normalized.includes('/src/global-scale')
          ) {
            return 'advanced-viz';
          }

          // Granular Performance Chunks (Faza 5)
          if (
            normalized.includes('/src/composer-hybrid') ||
            normalized.includes('/src/draft-autosave') ||
            normalized.includes('/src/autocomplete') ||
            normalized.includes('/src/crosspost') ||
            normalized.includes('/src/composer')
          ) {
            return 'composer-suite';
          }
          if (normalized.includes('/src/sovereign-dm')) return 'sovereign-dm';
          if (normalized.includes('/src/command-rail-v2') || normalized.includes('/src/command-rail')) return 'command-rail';
          if (normalized.includes('/src/post-detail') || normalized.includes('/src/thread-discussion') || normalized.includes('/src/threads')) return 'thread-detail';
          if (
            normalized.includes('/src/wot-slider') ||
            normalized.includes('/src/timeline-scrubber') ||
            normalized.includes('/src/pip-float') ||
            normalized.includes('/src/diff-viewer') ||
            normalized.includes('/src/cyber-defense-hub')
          ) {
            return 'aux-ui-tools';
          }
          if (normalized.includes('/src/collections') || normalized.includes('/src/download-manager')) return 'collections-data';
          if (normalized.includes('/src/awards') || normalized.includes('/src/sound-effects') || normalized.includes('/src/reactions')) return 'engagement-system';
          if (
            normalized.includes('/src/web-workers') ||
            normalized.includes('/src/virtual-scroll') ||
            normalized.includes('/src/pwa-service') ||
            normalized.includes('/src/view-transitions')
          ) {
            return 'pwa-runtime';
          }
          if (normalized.includes('/src/onboarding') || normalized.includes('/src/first-time-onboarding')) return 'onboarding-flow';
          if (normalized.includes('/src/settings-view') || normalized.includes('/src/profile/') || normalized.includes('/src/profile-card') || normalized.includes('/src/profile-view')) return 'user-profile-views';
          if (normalized.includes('/src/explore-view') || normalized.includes('/src/hashtag-explorer')) return 'explore-hub';
          if (normalized.includes('/src/stories') || normalized.includes('/src/media-player') || normalized.includes('/src/zen-mode')) return 'media-stories';
        },
      },
    },
  },
});
