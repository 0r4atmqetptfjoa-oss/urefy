import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

test.describe('Left Rail Advanced Tools - Full 13-Tool Reality & Interactivity Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.addInitScript(() => {
      localStorage.setItem('aetheris_onboarding_completed', 'true');
      localStorage.setItem('aetheris_onboarding_completed_v4', 'true');
      localStorage.setItem('aetheris_proactive_ai_enabled', 'false');
      localStorage.setItem('aetheris_ui_mode', 'sovereign');
      localStorage.setItem('urefy_home_intro_dismissed', 'true');
      sessionStorage.setItem('aetheris_push_banner_dismissed', '1');
    });
    await page.goto('/');
    await page.waitForSelector('#main-stage', { state: 'attached' });
    await expect(page.locator('#app-top-header')).toBeVisible();

    // Ensure sovereign / advanced mode is active
    const isSimple = await page.evaluate(() => (window as any).clientStore.isSimpleMode());
    if (isSimple) {
      await page.locator('#btn-rail-more').click();
      await page.locator('#btn-toggle-advanced-sidebar').click();
    }
  });

  const railTools = [
    {
      id: 'btn-open-portable-trust-menu',
      feature: 'portable-trust',
      name: 'Portable ZK Trust Score',
      modalSelector: '#portable-trust-backdrop',
    },
    {
      id: 'btn-open-wot-graph',
      feature: 'wot-graph',
      name: 'Web of Trust Graph',
      modalSelector: '#wot-graph-modal-overlay',
    },
    {
      id: 'rail-wallet',
      feature: 'wallet',
      name: 'Wallet & Connected Networks',
      modalSelector: '#wallet-bridge-backdrop',
    },
    {
      id: 'btn-open-mesh-matrix',
      feature: 'mesh-matrix',
      name: 'Mesh Matrix',
      modalSelector: '#mesh-modal-backdrop',
    },
    {
      id: 'btn-open-network-observatory',
      feature: 'observatory',
      name: 'Network Observatory',
      modalSelector: '#network-observatory-modal-root',
    },
    {
      id: 'btn-open-gossip-viz',
      feature: 'gossip',
      name: 'Gossip Visualizer',
      modalSelector: '#gossip-modal-backdrop',
    },
    {
      id: 'btn-open-cve-monitor',
      feature: 'cve',
      name: 'CVE Monitor',
      modalSelector: '#cve-modal-backdrop',
    },
    {
      id: 'btn-open-binary-hygiene-menu',
      feature: 'binary-hygiene',
      name: 'Binary Hygiene Portal',
      modalSelector: '#binary-hygiene-backdrop',
    },
    {
      id: 'btn-open-steganography',
      feature: 'steganography',
      name: 'Pixel Canvas Steganography',
      modalSelector: '#steganography-backdrop, #steganography-modal-backdrop, #steganography-container',
    },
    {
      id: 'nav-btn-dao',
      feature: 'governance',
      name: 'DAO Governance',
      modalSelector: '#governance-modal-backdrop',
    },
    {
      id: 'btn-open-microsaas-docs-menu',
      feature: 'microsaas-docs',
      name: 'Micro-SaaS & Dev APIs',
      modalSelector: '#microsaas-docs-modal',
    },
    {
      id: 'btn-open-rss-panel',
      feature: 'rss',
      name: 'RSS Importer',
      modalSelector: '#rss-modal-backdrop',
    },
    {
      id: 'btn-open-backup-export',
      feature: 'export-backup',
      name: 'Export & Backup',
      modalSelector: '#export-modal-backdrop',
    },
  ];

  for (const tool of railTools) {
    test(`verifies Left Rail tool: ${tool.name} [${tool.id}]`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));

      const btn = page.locator(`#${tool.id}`);
      await expect(btn).toBeVisible({ timeout: 5000 });
      await btn.click();

      // Verify modal becomes visible
      const modal = page.locator(tool.modalSelector).first();
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Verify active feature in modalManager
      const activeFeature = await page.evaluate(() => (window as any).modalManager?.getActiveFeature());
      expect(activeFeature).toBe(tool.feature);

      // Close modal cleanly
      await page.evaluate(() => (window as any).modalManager?.closeFeature());

      // Verify modal is closed
      await expect(modal).toBeHidden({ timeout: 5000 });
      const closedFeature = await page.evaluate(() => (window as any).modalManager?.getActiveFeature());
      expect(closedFeature).toBeNull();

      expect(errors).toEqual([]);
    });
  }
});
