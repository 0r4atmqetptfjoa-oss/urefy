/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig(({ command }) => ({
  resolve: {
    alias: command === 'build' ? [{
      find: './seed-profiles-data.js',
      replacement: resolve(import.meta.dirname, 'src/profile/production-profiles-data.ts'),
    }] : [],
  },
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
        entryFileNames: 'assets-v5/[name]-[hash].js',
        chunkFileNames: 'assets-v5/[name]-[hash].js',
        assetFileNames: 'assets-v5/[name]-[hash][extname]',
        strictExecutionOrder: true,
        codeSplitting: {
          includeDependenciesRecursively: false,
          groups: [
            { name: 'interaction-runtime', test: /[\\/]src[\\/](?:ui[\\/]action-dispatcher|collections|bookmarks|draft-autosave|wot-slider|relays-manager|virtual-scroll|code-splitting)\.ts$/, priority: 10 },
            { name: 'community-space', test: /[\\/]src[\\/]sovereign-circle\.ts$/, priority: 10 },
            { name: 'rich-editor', test: /[\\/]src[\\/]rich-editor\.ts$/, priority: 10 },
            { name: 'workspace-navigation', test: /[\\/]src[\\/](sidebar|breadcrumbs|onboarding|rapid-onboarding|mobile-flow|footer|context-menu|hashtag-explorer|flair-filter)\.ts$/, priority: 10 },
            { name: 'post-rendering', test: /[\\/]src[\\/](post-detail|polls|stories|trending|pulse-actions|markdown-renderer|chat-rich-embed|link-preview|media-player)\.ts$/, priority: 10 },
            { name: 'wallet-vendor', test: /node_modules[\\/](ethers|@adraffy)[\\/]/, priority: 20 },
            { name: 'rum-vendor', test: /node_modules[\\/](aws-rum-web)[\\/]/, priority: 20 },
            { name: 'vendor', test: /node_modules/ },
            { name: 'theme-studio', test: /[\\/]src[\\/](custom-theme-builder)\.ts$/ },
            { name: 'media-capture', test: /[\\/]src[\\/](webrtc-voice|screenshare)\.ts$/ },
            { name: 'observatory-viz', test: /[\\/]src[\\/](network-observatory|network-wot-graph|gossip-viz|merkle-viz)\.ts$/ },
            { name: 'spatial-audio-pack', test: /[\\/]src[\\/](spatial-audio|spatial-audio-mesh|acoustic-dsp|audio-dsp|sound-packs)\.ts$/ },
            { name: 'security-monitors', test: /[\\/]src[\\/](cve-monitor|cyber-defense-hub|cve-service|transparency-mode)\.ts$/ },
            { name: 'admin-core', test: /[\\/]src[\\/](admin-auth|admin-panel|admin-passkeys|admin)\.ts$/ },
            { name: 'backup-archive', test: /[\\/]src[\\/](export-backup|data-archive|archive-modal)\.ts$/ },
            { name: 'client-core', test: /[\\/]src[\\/](client-state|indexed-db|secure-storage|sovereign-dm|threads|themes|i18n)(\.ts|[\\/])/ },
            { name: 'workspace-controls', test: /[\\/]src[\\/](composer(?:-hybrid)?|command-rail(?:-v2)?|feed-controls|profile-view)\.ts$/ },
            { name: 'workspace-views', test: /[\\/]src[\\/](feed-view)\.ts$/ },
            { name: 'messages-vault-view', test: /[\\/]src[\\/](messages-view|vault-view)\.ts$/ },
          ],
        },
      },
    },
  },
}));
