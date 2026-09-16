/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    {
      name: 'api-dev-middleware',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.startsWith('/api/report') && req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => { body += chunk; });
            req.on('end', () => {
              const reportId = `dsa_rep_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                reportId,
                status: 'pending',
                message: 'Notice registered per DSA Regulation (EU) 2022/2065'
              }));
            });
            return;
          }
          next();
        });
      },
    },
  ],
  test: {
    setupFiles: ['./test/setup-explicit-demo.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/.{idea,git,cache,output,temp}/**'],
  },
  server: {
    port: 3000,
    host: true,
    watch: {
      ignored: ['**/playwright-report/**', '**/test-results/**', '**/.launch-backups/**'],
    },
  },
  build: {
    manifest: true,
    target: 'baseline-widely-available',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    cssCodeSplit: true,
    reportCompressedSize: true,
    minify: 'oxc',
    rolldownOptions: {
      treeshake: {
        moduleSideEffects: 'no-external',
      },
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        admin: resolve(import.meta.dirname, 'admin.html'),
      },
      output: {
        entryFileNames: 'assets-v1/[name]-[hash].js',
        chunkFileNames: 'assets-v1/[name]-[hash].js',
        assetFileNames: 'assets-v1/[name]-[hash][extname]',
        strictExecutionOrder: true,
        codeSplitting: {
          includeDependenciesRecursively: false,
          groups: [
            { name: 'wallet-vendor', test: /node_modules[\\/](ethers|@adraffy)[\\/]/, priority: 20 },
            { name: 'vendor', test: /node_modules/ },
            { name: 'theme-studio', test: /[\\/]src[\\/](custom-theme-builder)\.ts$/ },
            { name: 'observatory-viz', test: /[\\/]src[\\/](network-observatory|network-wot-graph|gossip-viz|merkle-viz)\.ts$/ },
            { name: 'spatial-audio-pack', test: /[\\/]src[\\/](spatial-audio|spatial-audio-mesh|acoustic-dsp|audio-dsp|sound-packs)\.ts$/ },
            { name: 'security-monitors', test: /[\\/]src[\\/](cve-monitor|cyber-defense-hub|cve-service|transparency-mode)\.ts$/ },
            { name: 'backup-archive', test: /[\\/]src[\\/](export-backup|data-archive|archive-modal)\.ts$/ },
            { name: 'client-core', test: /[\\/]src[\\/](client-state|indexed-db|secure-storage|sovereign-dm|webrtc-voice|threads|themes|i18n)(\.ts|[\\/])/ },
            { name: 'workspace-controls', test: /[\\/]src[\\/](composer(?:-hybrid)?|command-rail(?:-v2)?|settings-view|feed-controls|profile-view|explore-view)\.ts$/ },
            { name: 'workspace-views', test: /[\\/]src[\\/](messages-view|feed-view|vault-view)\.ts$/ },
          ],
        },
      },
    },
  },
});
