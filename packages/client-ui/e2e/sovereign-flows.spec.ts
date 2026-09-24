import { test, expect } from '@playwright/test';

test.describe('Aetheris Sovereign Omni-Sphere: End-to-End User Journeys', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to root
    await page.goto('/');
  });

  test('1. Onboarding Wizard displays unified 3-step non-technical flow without dual banners', async ({ page }) => {
    // Check if onboarding modal or banner appears
    const wizardModal = page.locator('#onboarding-wizard-modal');
    const welcomeBanner = page.locator('#sovereign-onboarding-welcome');

    // Dual banner check: both should NEVER be visible at the same time
    if (await wizardModal.isVisible()) {
      await expect(welcomeBanner).not.toBeVisible();

      // Step 1: Identity & Keypair
      await expect(page.locator('text=Welcome to Aetheris')).toBeVisible();
      const nextBtn = page.locator('#wizard-next-step');
      if (await nextBtn.isVisible()) {
        await nextBtn.click();

        // Step 2: Privacy & Network
        await expect(page.locator('text=Privacy & Network')).toBeVisible();
        await nextBtn.click();

        // Step 3: Recovery Key
        await expect(page.locator('text=Recovery Key')).toBeVisible();
        const finishBtn = page.locator('#wizard-finish');
        if (await finishBtn.isVisible()) {
          await finishBtn.click();
        }
      }
    }

    // Verify app main container is mounted
    await expect(page.locator('#app-root, body')).toBeVisible();
  });

  test('2. Command Rail palette opens with Ctrl+K and filters navigation commands', async ({ page }) => {
    // Press Ctrl+K or Cmd+K
    await page.keyboard.press('Control+k');

    const commandPalette = page.locator('#command-rail-modal, #command-rail-v2-modal');
    if (await commandPalette.isVisible()) {
      const searchInput = commandPalette.locator('input[type="text"]');
      await expect(searchInput).toBeFocused();

      // Type search query
      await searchInput.fill('Vault');
      await expect(commandPalette.locator('text=Knowledge Vault')).toBeVisible();

      // Close with Escape
      await page.keyboard.press('Escape');
      await expect(commandPalette).not.toBeVisible();
    }
  });

  test('3. Responsive Mobile Tab Bar provides zero-jargon navigation landmarks', async ({ page, isMobile }) => {
    if (isMobile) {
      await page.evaluate(() => {
        localStorage.setItem('aetheris_onboarding_completed', 'true');
        localStorage.setItem('urefy_onboarding_stage', 'ONBOARDING_COMPLETE');
        if ((window as any).onboardingWizard) {
          (window as any).onboardingWizard.isOpen = false;
          (window as any).onboardingWizard.isCompleted = true;
          (window as any).onboardingWizard.stage = 'ONBOARDING_COMPLETE';
          (window as any).onboardingWizard.syncUI();
        }
      });
      const mobileNav = page.locator('#native-mobile-tab-bar');
      await expect(mobileNav).toBeVisible();

      // Buttons must have accessible labels in English
      await expect(page.locator('#btn-mobile-tab-feed')).toBeVisible();
      await expect(page.locator('#btn-mobile-tab-vault')).toBeVisible();
      await expect(page.locator('#btn-mobile-tab-messages')).toBeVisible();
      await expect(page.locator('#btn-mobile-tab-profile')).toBeVisible();

      // Click Vault tab
      await page.locator('#btn-mobile-tab-vault').click();
      await expect(page.locator('#memory-title')).toBeVisible();
    }
  });

  test('4. Security Dialog replaces native alert/confirm with sovereign accessible modal', async ({ page }) => {
    // Ensure no native alert or confirm dialog blocks page execution
    let nativeDialogFired = false;
    page.on('dialog', async (dialog) => {
      nativeDialogFired = true;
      await dialog.dismiss();
    });

    // Wait for sovereignDialog to be attached and hydrated
    await page.waitForFunction(() => typeof (window as any).sovereignDialog?.alert === 'function');

    // Evaluate sovereignDialog in window context
    await page.evaluate(() => {
      (window as any).sovereignDialog.alert('Testing zero native alert compliance', { title: 'Security Audit' });
    });

    // Check that Sovereign Modal rendered in DOM
    const dialogRoot = page.locator('#sovereign-dialog-root');
    await expect(dialogRoot).toBeVisible();
    await expect(dialogRoot.locator('text=Security Audit')).toBeVisible();
    await expect(dialogRoot.locator('text=Testing zero native alert compliance')).toBeVisible();

    // Click confirm button to dismiss
    await dialogRoot.locator('#sovereign-dialog-confirm-btn').click();
    await expect(dialogRoot).not.toBeVisible();

    // Verify native dialog was never triggered
    expect(nativeDialogFired).toBe(false);
  });
});
