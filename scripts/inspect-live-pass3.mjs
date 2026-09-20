import { chromium } from 'playwright';

const TARGET_URL = 'https://urefy.com';

async function inspectLiveProduct() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('  PASS 3: LIVE BROWSER AUDIT OF UREFY PRODUCTION');
  console.log('  Target:', TARGET_URL);
  console.log('════════════════════════════════════════════════════════════════\n');

  const browser = await chromium.launch({ headless: true });

  // 1. DESKTOP VIEWPORT AUDIT (1440x900)
  console.log('--- AUDITING DESKTOP (1440x900) ---');
  const desktopCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const desktopPage = await desktopCtx.newPage();
  await desktopPage.goto(TARGET_URL, { waitUntil: 'networkidle' });

  // Check Feed & Post Action row
  const feedAudit = await desktopPage.evaluate(() => {
    const postCards = document.querySelectorAll('.post-card, [data-post-id]');
    const firstPost = postCards[0];
    const reactBtn = firstPost?.querySelector('[data-action="toggle-reaction-picker"], [data-action="react"], .btn-react');
    const commentBtn = firstPost?.querySelector('[data-action="comment"], [data-action="open-post"]');
    const awardBtn = firstPost?.querySelector('[data-action="award"], [data-action="open-award-picker"]');
    
    return {
      postCount: postCards.length,
      firstPostId: firstPost?.getAttribute('data-post-id'),
      reactBtnText: reactBtn?.textContent?.trim(),
      hasAwardBtn: !!awardBtn,
      awardBtnText: awardBtn?.textContent?.trim(),
    };
  });
  console.log('Desktop Feed Audit:', feedAudit);

  // Trigger Reaction Picker on Desktop
  console.log('Triggering Reaction Picker on first post...');
  const reactPickerAudit = await desktopPage.evaluate(() => {
    const reactBtn = document.querySelector('[data-action="toggle-reaction-picker"], button[data-action="open-reactions"], [data-action="react"]') ||
      Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('React') || b.textContent?.includes('❤️') || b.textContent?.includes('👍'));
    
    if (reactBtn) {
      reactBtn.click();
    }
    const picker = document.querySelector('.reaction-popover, #reaction-picker, .reactions-popover, [data-reaction-picker]');
    return {
      buttonClicked: !!reactBtn,
      buttonSelector: reactBtn?.outerHTML?.substring(0, 100),
      pickerFound: !!picker,
      pickerClass: picker?.className,
      pickerDimensions: picker ? {
        width: picker.getBoundingClientRect().width,
        height: picker.getBoundingClientRect().height,
        top: picker.getBoundingClientRect().top,
        left: picker.getBoundingClientRect().left,
      } : null,
      pickerHTML: picker?.innerHTML?.substring(0, 300),
    };
  });
  console.log('Desktop Reaction Picker Audit:', reactPickerAudit);

  // Check Award Picker
  console.log('Triggering Award Picker on first post...');
  const awardPickerAudit = await desktopPage.evaluate(() => {
    const awardBtn = document.querySelector('[data-action="open-award-picker"], [data-action="award"]') ||
      Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Award') || b.textContent?.includes('🏆') || b.textContent?.includes('🎖️'));
    
    if (awardBtn) awardBtn.click();
    const modal = document.querySelector('#award-modal, .award-modal, [data-award-modal], #unified-award-modal');
    return {
      buttonClicked: !!awardBtn,
      modalFound: !!modal,
      modalHTML: modal ? modal.innerHTML.substring(0, 400) : null,
      hasReputationBalanceText: modal?.textContent?.includes('2450') || modal?.textContent?.includes('Reputation') || modal?.textContent?.includes('pts') || modal?.textContent?.includes('Cost'),
    };
  });
  console.log('Desktop Award Picker Audit:', awardPickerAudit);

  // Check Comments in Post Detail / Inline
  console.log('Opening Post or checking comments...');
  const commentAudit = await desktopPage.evaluate(() => {
    const commentActionRow = document.querySelector('.comment-action-row, .comment-actions, [data-comment-id]');
    const comments = document.querySelectorAll('[data-comment-id], .thread-comment');
    return {
      commentsCount: comments.length,
      firstCommentHTML: comments[0]?.innerHTML?.substring(0, 300),
    };
  });
  console.log('Comment Audit:', commentAudit);

  // Navigate to Chat / Messages
  console.log('Navigating to Messages / Chat...');
  await desktopPage.evaluate(() => {
    if (window.sovereignRouter) {
      window.sovereignRouter.navigate('messages');
    } else {
      const navBtn = document.querySelector('[data-nav="messages"], a[href="#messages"]');
      if (navBtn) navBtn.click();
    }
  });
  await desktopPage.waitForTimeout(500);

  const chatAudit = await desktopPage.evaluate(() => {
    const chatContainer = document.querySelector('#messages-view, .chat-container, [data-view="messages"]');
    const composer = document.querySelector('#chat-composer, textarea, input[placeholder*="message"]');
    const emptyState = document.querySelector('.empty-chat, #empty-dm-state, .empty-state');
    return {
      chatContainerFound: !!chatContainer,
      composerFound: !!composer,
      composerPlaceholder: composer?.placeholder,
      emptyStateText: emptyState?.textContent?.replace(/\s+/g, ' ').trim()?.substring(0, 150),
    };
  });
  console.log('Chat / Messages Audit:', chatAudit);

  // Navigate to Governance
  console.log('Navigating to Governance...');
  await desktopPage.evaluate(() => {
    if (window.sovereignRouter) {
      window.sovereignRouter.navigate('governance');
    } else {
      const govBtn = document.querySelector('[data-nav="governance"], a[href="#governance"]');
      if (govBtn) govBtn.click();
    }
  });
  await desktopPage.waitForTimeout(500);

  const govAudit = await desktopPage.evaluate(() => {
    const govView = document.querySelector('#governance-view, [data-view="governance"], .governance-workspace');
    const proposals = document.querySelectorAll('.proposal-card, [data-proposal-id]');
    const headers = Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent?.trim());
    return {
      govViewFound: !!govView,
      proposalsCount: proposals.length,
      headers: headers.slice(0, 8),
      textContentSample: govView?.textContent?.replace(/\s+/g, ' ').trim()?.substring(0, 300),
    };
  });
  console.log('Governance Audit:', govAudit);

  await desktopCtx.close();

  // 2. MOBILE VIEWPORT AUDIT (390x844)
  console.log('\n--- AUDITING MOBILE (390x844) ---');
  const mobileCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileCtx.newPage();
  await mobilePage.goto(TARGET_URL, { waitUntil: 'networkidle' });

  const mobilePostAudit = await mobilePage.evaluate(() => {
    const postCards = document.querySelectorAll('.post-card, [data-post-id]');
    const firstPost = postCards[0];
    const actionsRow = firstPost?.querySelector('.post-actions-row, .actions-bar, .flex.items-center.gap-2, .post-interactions');
    return {
      postFound: !!firstPost,
      actionsRowFound: !!actionsRow,
      actionsRowWidth: actionsRow?.getBoundingClientRect().width,
      actionsRowScrollWidth: actionsRow?.scrollWidth,
      hasHorizontalOverflow: actionsRow ? actionsRow.scrollWidth > actionsRow.clientWidth : false,
      actionsChildrenCount: actionsRow?.children?.length,
    };
  });
  console.log('Mobile Post Actions Audit:', mobilePostAudit);

  await mobileCtx.close();
  await browser.close();
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('  LIVE BROWSER AUDIT COMPLETED');
  console.log('════════════════════════════════════════════════════════════════\n');
}

inspectLiveProduct().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
