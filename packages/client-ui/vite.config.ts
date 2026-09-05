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
        },
      },
    },
  },
});
