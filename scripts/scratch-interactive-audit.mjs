import { chromium } from '@playwright/test';

async function exploreLive() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  console.log('Navigating to https://urefy.com...');
  await page.goto('https://urefy.com', { waitUntil: 'networkidle' });

  // 1. Check feed tabs (Home feed)
  const homeFeedTabs = await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('.feed-tabs button, .tab-btn, [role="tab"], .feed-header button, .feed-filter button'))
      .map(b => ({ text: b.innerText.trim(), active: b.classList.contains('active') || b.getAttribute('aria-selected') === 'true' }));
    return tabs;
  });
  console.log('Home Feed Tabs:', homeFeedTabs);

  // 2. Click on "Following" tab if exists
  const followingTabClicked = await page.evaluate(() => {
    const followingBtn = Array.from(document.querySelectorAll('button, a')).find(el => el.innerText.trim().toLowerCase() === 'following');
    if (followingBtn) {
      followingBtn.click();
      return true;
    }
    return false;
  });
  console.log('Following tab found and clicked:', followingTabClicked);
  await page.waitForTimeout(1000);

  const followingState = await page.evaluate(() => {
    const emptyState = document.querySelector('.empty-state, .feed-empty, [class*="empty"]');
    const posts = document.querySelectorAll('.post-card, article, [data-post-id]');
    return {
      emptyText: emptyState ? emptyState.innerText.replace(/\s+/g, ' ') : null,
      postsCount: posts.length
    };
  });
  console.log('Following feed state for brand new user:', followingState);

  // 3. Navigate to Explore
  console.log('Navigating to Explore...');
  await page.evaluate(() => {
    const exploreLink = Array.from(document.querySelectorAll('nav a, aside a, header a, button')).find(el => el.innerText.includes('Explore'));
    if (exploreLink) exploreLink.click();
  });
  await page.waitForTimeout(1500);

  const exploreData = await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4')).map(h => h.innerText.trim()).filter(Boolean);
    const sections = Array.from(document.querySelectorAll('[class*="explore"], [class*="trending"], [class*="radar"], [class*="category"]'))
      .map(el => ({ className: el.className, text: el.innerText.slice(0, 150).replace(/\s+/g, ' ') }))
      .slice(0, 10);
    return { url: window.location.href, headings, sections };
  });
  console.log('Explore View Data:', JSON.stringify(exploreData, null, 2));

  // 4. Navigate to Communities
  console.log('Navigating to Communities...');
  await page.evaluate(() => {
    const commLink = Array.from(document.querySelectorAll('nav a, aside a, header a, button')).find(el => el.innerText.includes('Communities'));
    if (commLink) commLink.click();
  });
  await page.waitForTimeout(1500);

  const communitiesData = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.community-card, [class*="community-item"], [data-community-id]'))
      .map(el => el.innerText.replace(/\s+/g, ' ').slice(0, 120));
    const createBtn = Array.from(document.querySelectorAll('button, a')).find(b => b.innerText.toLowerCase().includes('create'));
    return {
      url: window.location.href,
      cardCount: cards.length,
      sampleCards: cards.slice(0, 6),
      hasCreateBtn: !!createBtn,
      createBtnText: createBtn ? createBtn.innerText.trim() : null
    };
  });
  console.log('Communities View Data:', JSON.stringify(communitiesData, null, 2));

  // 5. Navigate to Messages
  console.log('Navigating to Messages...');
  await page.evaluate(() => {
    const msgLink = Array.from(document.querySelectorAll('nav a, aside a, header a, button')).find(el => el.innerText.includes('Messages'));
    if (msgLink) msgLink.click();
  });
  await page.waitForTimeout(1500);

  const messagesData = await page.evaluate(() => {
    const text = document.querySelector('main, #app, .content')?.innerText.replace(/\s+/g, ' ').slice(0, 300);
    return { url: window.location.href, text };
  });
  console.log('Messages View Data:', messagesData);

  // 6. Check Settings
  console.log('Checking Settings / Simple Mode...');
  const settingsData = await page.evaluate(() => {
    const cs = window.clientStore;
    return {
      simpleMode: cs?.simpleMode,
      hasOnboardingCompleted: localStorage.getItem('urefy_onboarding_completed'),
      hasSeenIntro: localStorage.getItem('has_seen_intro'),
      userInterests: localStorage.getItem('urefy_user_interests'),
      allKeys: Object.keys(localStorage)
    };
  });
  console.log('LocalStorage & Client State:', settingsData);

  await browser.close();
}

exploreLive().catch(console.error);
