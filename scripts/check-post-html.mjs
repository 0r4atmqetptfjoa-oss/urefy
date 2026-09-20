import { chromium } from 'playwright';

async function checkPostHTML() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('https://urefy.com', { waitUntil: 'networkidle' });

  const postHTML = await page.evaluate(() => {
    const post = document.querySelector('[data-post-id]');
    return {
      tagName: post?.tagName,
      className: post?.className,
      id: post?.id,
      html: post?.outerHTML.slice(0, 800),
      buttons: Array.from(post?.querySelectorAll('button, a') || []).map(b => ({
        tag: b.tagName,
        class: b.className,
        text: b.textContent?.trim(),
        href: b.getAttribute('href'),
        dataset: Object.assign({}, b.dataset),
      })),
    };
  });
  console.log(JSON.stringify(postHTML, null, 2));

  // Also check post detail view directly
  await page.goto('https://urefy.com/#post-p-gta-6-euphoria-physics-water-simulation-analysis', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const detailHTML = await page.evaluate(() => {
    const modal = document.getElementById('post-detail-modal');
    const reactBar = modal?.querySelector('.reactions-bar');
    const awardBadges = modal?.querySelector('.award-badges-container');
    const commentsRoot = modal?.querySelector('.thread-comments-root');
    const comments = modal?.querySelectorAll('[id^="comment-"]');
    return {
      modalExists: !!modal,
      hasReactBar: !!reactBar,
      reactBarHTML: reactBar?.outerHTML,
      hasAwardBadges: !!awardBadges,
      hasCommentsRoot: !!commentsRoot,
      commentsCount: comments?.length || 0,
    };
  });
  console.log('Post Detail Modal Evaluation:', JSON.stringify(detailHTML, null, 2));

  await browser.close();
}

checkPostHTML().catch(console.error);
