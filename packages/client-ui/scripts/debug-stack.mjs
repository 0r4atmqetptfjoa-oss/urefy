import { chromium } from '@playwright/test';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto('http://localhost:3000/?demo=true#messages');
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    window.sovereignDM?.seedDemoData();
    window.sovereignDM.activePeerFP = 'c3dc28cb705e';
    document.querySelector('[data-action="switch-messages-tab"][data-tab="dm"]')?.click();
    window.clientStore?.notifySync();
  });
  await page.waitForTimeout(600);
  await page.waitForSelector('.dm-message');
  const btn = page.locator('[data-action="toggle-dm-emoji"]').first();
  await btn.click({ force: true });
  await page.waitForSelector('.emoji-picker-container');

  const res = await page.evaluate(() => {
    function getStack(el) {
      if (!el) return null;
      const arr = [];
      let cur = el;
      while (cur && cur !== document.documentElement) {
        const s = window.getComputedStyle(cur);
        arr.push({ 
          tag: cur.tagName, 
          id: cur.id, 
          cls: (cur.className || '').toString().slice(0, 40), 
          pos: s.position, 
          z: s.zIndex, 
          transform: s.transform !== 'none' ? s.transform : undefined,
          backdrop: s.backdropFilter !== 'none' ? s.backdropFilter : undefined,
        });
        cur = cur.parentElement;
      }
      return arr;
    }
    return {
      pickerStack: getStack(document.querySelector('.emoji-picker-container')),
      widgetStack: getStack(document.querySelector('#webrtc-floating-transfer-widget'))
    };
  });

  console.log(JSON.stringify(res, null, 2));
  await browser.close();
}

run();
