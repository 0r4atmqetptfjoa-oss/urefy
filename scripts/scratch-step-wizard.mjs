import { chromium } from '@playwright/test';

async function inspectWizard() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.goto('https://urefy.com', { waitUntil: 'networkidle' });

  const stepsInfo = [];

  for (let s = 0; s < 5; s++) {
    const stepData = await page.evaluate((stepIndex) => {
      const overlay = document.getElementById('aetheris-onboarding-overlay');
      if (!overlay) return null;
      const title = overlay.querySelector('h3, h2')?.innerText;
      const subtitle = overlay.querySelector('p')?.innerText;
      const body = overlay.innerText.replace(/\s+/g, ' ');
      const buttons = Array.from(overlay.querySelectorAll('button')).map(b => ({
        id: b.id,
        text: b.innerText.trim(),
        action: b.getAttribute('data-global-method') || b.getAttribute('data-action')
      }));
      return { stepIndex, title, subtitle, buttons, textSnippet: body.slice(0, 300) };
    }, s);

    if (!stepData) {
      console.log(`Wizard closed or not found at step ${s}`);
      break;
    }

    stepsInfo.push(stepData);
    console.log(`=== WIZARD STEP ${s} ===`);
    console.log(JSON.stringify(stepData, null, 2));

    // Take screenshot of this step
    await page.screenshot({ path: `scripts/wizard_step_${s}.png` });

    // Click next / continue button
    const nextClicked = await page.evaluate(() => {
      const nextBtn = Array.from(document.querySelectorAll('#aetheris-onboarding-overlay button'))
        .find(b => b.innerText.toLowerCase().includes('continue') || b.innerText.toLowerCase().includes('get started') || b.getAttribute('data-global-method')?.includes('next'));
      if (nextBtn) {
        nextBtn.click();
        return true;
      }
      return false;
    });

    if (!nextClicked) {
      console.log('No next button found, stopping.');
      break;
    }
    await page.waitForTimeout(500);
  }

  await browser.close();
}

inspectWizard().catch(console.error);
