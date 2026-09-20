import { chromium } from '@playwright/test';

async function audit() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  console.log('Navigating to https://urefy.com with fresh profile...');
  await page.goto('https://urefy.com', { waitUntil: 'networkidle', timeout: 30000 });

  const title = await page.title();
  console.log('Page Title:', title);

  const auditData = await page.evaluate(() => {
    // 1. Visible dialogs / modals
    const dialogs = Array.from(document.querySelectorAll('.modal, [role="dialog"], .dialog-overlay, .onboarding-modal, #mnemonic-modal, [class*="modal"]'))
      .filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
      })
      .map(el => ({
        tagName: el.tagName,
        id: el.id,
        className: el.className,
        text: el.innerText ? el.innerText.slice(0, 300).replace(/\s+/g, ' ') : ''
      }));

    // 2. Navigation items
    const navItems = Array.from(document.querySelectorAll('nav a, nav button, aside a, header button, .nav-item, [role="navigation"] a'))
      .map(el => el.innerText.trim().replace(/\s+/g, ' '))
      .filter(Boolean);

    // 3. Headings
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4'))
      .map(el => el.innerText.trim())
      .filter(Boolean);

    // 4. Hero / Banner / Explanation texts
    const banners = Array.from(document.querySelectorAll('[class*="hero"], [class*="welcome"], [class*="banner"], [class*="onboarding"], [class*="empty"]'))
      .map(el => ({
        className: el.className,
        text: (el.innerText || '').slice(0, 200).replace(/\s+/g, ' ')
      }));

    // 5. Feed posts
    const postCards = Array.from(document.querySelectorAll('.post-card, article, [data-post-id], .feed-item'))
      .map(el => ({
        id: el.getAttribute('data-post-id') || el.id,
        title: el.querySelector('h2, h3, .post-title')?.innerText || '',
        preview: (el.innerText || '').slice(0, 150).replace(/\s+/g, ' ')
      }));

    // 6. Composer text & buttons
    const composer = Array.from(document.querySelectorAll('[class*="composer"], textarea, [contenteditable="true"], .composer-hybrid'))
      .map(el => ({
        placeholder: el.getAttribute('placeholder'),
        className: el.className,
        text: (el.innerText || '').slice(0, 100).replace(/\s+/g, ' ')
      }));

    // 7. Client Store state
    const cs = window.clientStore;
    const storeState = cs ? {
      hasKeypair: !!cs.keypair,
      fingerprint: cs.keypair?.fingerprint,
      userName: cs.userProfile?.name,
      userBio: cs.userProfile?.bio,
      joinedCommunities: cs.joinedCommunities || [],
      following: cs.following || [],
      simpleMode: cs.simpleMode,
      activeTab: cs.activeTab,
      feedMode: cs.feedMode,
      interests: cs.interests || cs.selectedInterests || []
    } : null;

    return {
      dialogs,
      navItems: Array.from(new Set(navItems)).slice(0, 30),
      headings: headings.slice(0, 20),
      banners,
      postCardsCount: postCards.length,
      postSamples: postCards.slice(0, 5),
      composer,
      storeState
    };
  });

  console.log('=== AUDIT RESULTS ===');
  console.log(JSON.stringify(auditData, null, 2));

  await page.screenshot({ path: 'scripts/fresh_user_landing.png', fullPage: true });
  console.log('Saved screenshot to scripts/fresh_user_landing.png');

  await browser.close();
}

audit().catch(console.error);
