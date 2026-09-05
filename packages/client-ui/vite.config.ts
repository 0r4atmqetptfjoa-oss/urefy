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
        },
      },
    },
  },
});
