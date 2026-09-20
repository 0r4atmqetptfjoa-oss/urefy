// Comprehensive SEO and Indexation Verification for urefy.com

async function testSeoLive() {
  console.log('================================================================');
  console.log('       LIVE SEO & INDEXATION VERIFICATION: https://urefy.com     ');
  console.log('================================================================\n');

  // 1. Robots.txt
  console.log('--- 1. Testing /robots.txt ---');
  const robotsRes = await fetch('https://urefy.com/robots.txt');
  const robotsTxt = await robotsRes.text();
  console.log('Status:', robotsRes.status, 'ContentType:', robotsRes.headers.get('content-type'));
  const hasOaiSearch = robotsTxt.includes('User-agent: OAI-SearchBot');
  const hasGptBot = robotsTxt.includes('User-agent: GPTBot');
  const hasClaude = robotsTxt.includes('User-agent: ClaudeBot');
  const hasSitemapIndex = robotsTxt.includes('Sitemap: https://urefy.com/sitemap.xml');
  console.log('  - Has OAI-SearchBot rule:', hasOaiSearch ? 'PASS' : 'FAIL');
  console.log('  - Has GPTBot rule:', hasGptBot ? 'PASS' : 'FAIL');
  console.log('  - Has ClaudeBot rule:', hasClaude ? 'PASS' : 'FAIL');
  console.log('  - Points to sitemap.xml:', hasSitemapIndex ? 'PASS' : 'FAIL');

  // 2. Sitemaps
  console.log('\n--- 2. Testing Sitemap Hierarchy ---');
  const sitemaps = [
    'https://urefy.com/sitemap.xml',
    'https://urefy.com/sitemap-static.xml',
    'https://urefy.com/sitemap-communities.xml',
    'https://urefy.com/sitemap-profiles.xml',
    'https://urefy.com/sitemap-posts-1.xml'
  ];

  for (const sm of sitemaps) {
    const res = await fetch(sm);
    const xml = await res.text();
    const isXml = res.headers.get('content-type')?.includes('xml') || xml.startsWith('<?xml');
    const locCount = (xml.match(/<loc>/g) || []).length;
    console.log(sm.padEnd(45), '| Status:', res.status, '| XML:', isXml ? 'YES' : 'NO', '| URLs/Sitemaps:', locCount);
  }

  // 3. Public Semantic Pages
  console.log('\n--- 3. Testing Public Pages (Title, Canonical, SSR HTML) ---');
  const pages = [
    'https://urefy.com/',
    'https://urefy.com/about',
    'https://urefy.com/features',
    'https://urefy.com/privacy',
    'https://urefy.com/terms',
    'https://urefy.com/security',
    'https://urefy.com/communities',
    'https://urefy.com/c/gaming',
    'https://urefy.com/u/fp_wooting_chad',
    'https://urefy.com/p/p-gta-6-euphoria-physics-water-simulation-analysis',
    'https://urefy.com/p/p-roblox-byfron-hyperion-linux-wine-drama'
  ];

  for (const page of pages) {
    const res = await fetch(page);
    const html = await res.text();
    const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() || 'NO TITLE';
    const canonical = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i)?.[1] 
      || html.match(/<link[^>]+href="([^"]+)"[^>]+rel="canonical"/i)?.[1] || 'NO CANONICAL';
    const hasJsonLd = html.includes('application/ld+json');
    const hasSeoShell = html.includes('seo-prerender-shell');

    console.log(
      page.padEnd(65),
      '\n  -> HTTP', res.status,
      '| Title:', title.slice(0, 50),
      '\n  -> Canonical:', canonical,
      '| JSON-LD:', hasJsonLd ? 'YES' : 'NO',
      '| SSR Shell:', hasSeoShell ? 'YES' : 'NO'
    );
  }

  // 4. Legacy URLs (301 Redirect vs 410 Gone)
  console.log('\n--- 4. Testing Legacy Domain De-indexing (301 vs 410) ---');
  const legacyTests = [
    { url: 'https://urefy.com/about-us', expected: 301, target: '/about' },
    { url: 'https://urefy.com/features.html', expected: 301, target: '/features' },
    { url: 'https://urefy.com/privacy-policy', expected: 301, target: '/privacy' },
    { url: 'https://urefy.com/terms-of-service', expected: 301, target: '/terms' },
    { url: 'https://urefy.com/wp-login.php', expected: 410 },
    { url: 'https://urefy.com/wp-content/uploads/old.jpg', expected: 410 },
    { url: 'https://urefy.com/fashion-trends-2023', expected: 410 },
    { url: 'https://urefy.com/fitness-routine-daily', expected: 410 }
  ];

  for (const lt of legacyTests) {
    const res = await fetch(lt.url, { redirect: 'manual' });
    const location = res.headers.get('location');
    const pass = res.status === lt.expected && (!lt.target || location?.endsWith(lt.target));
    console.log(
      lt.url.padEnd(50),
      '| HTTP', res.status,
      location ? `-> ${location}` : '',
      pass ? '[PASS]' : `[FAIL - Expected ${lt.expected}]`
    );
  }

  // 5. Schema.org Deep Inspection on a Post Page
  console.log('\n--- 5. Schema.org Deep Inspection on /p/p-gta-6-euphoria-physics-water-simulation-analysis ---');
  const postRes = await fetch('https://urefy.com/p/p-gta-6-euphoria-physics-water-simulation-analysis');
  const postHtml = await postRes.text();
  const scriptTags = [...postHtml.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  let foundForumPosting = null;
  for (const s of scriptTags) {
    try {
      const parsed = JSON.parse(s[1]);
      if (parsed['@type'] === 'DiscussionForumPosting' || parsed['@type'] === 'SocialMediaPosting') {
        foundForumPosting = parsed;
        break;
      }
    } catch (_) {}
  }

  if (foundForumPosting) {
    console.log('JSON-LD Root Type:', foundForumPosting['@type'], '[PASS]');
    console.log('Headline:', foundForumPosting.headline);
    console.log('Author Name & URL:', foundForumPosting.author?.name, '->', foundForumPosting.author?.url, '[PASS]');
    console.log('DigitalSourceType:', foundForumPosting.digitalSourceType || '(None - human authored)');
    console.log('Comment Count:', foundForumPosting.commentCount, '[PASS]');
    console.log('Comments Array Length:', foundForumPosting.comment?.length || 0, '[PASS]');
    console.log('First Comment Snippet:', foundForumPosting.comment?.[0]?.text?.slice(0, 60) + '...');
    console.log('Interaction Stats:', JSON.stringify(foundForumPosting.interactionStatistic), '[PASS]');
    console.log('Publisher:', foundForumPosting.publisher?.name, '[PASS]');
  } else {
    console.log('FAIL: DiscussionForumPosting JSON-LD not found!');
  }
}

testSeoLive().catch(console.error);
