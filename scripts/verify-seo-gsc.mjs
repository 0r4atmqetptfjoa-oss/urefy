import fetch from 'node:http';

async function auditSeo() {
  console.log('=== UREfy Live SEO & Google Search Console Verification ===\n');

  // 1. Robots.txt
  console.log('1. Checking https://urefy.com/robots.txt...');
  const robotsRes = await globalThis.fetch('https://urefy.com/robots.txt');
  const robotsTxt = await robotsRes.text();
  console.log('   Status:', robotsRes.status);
  console.log('   Contains Sitemap:', robotsTxt.includes('Sitemap: https://urefy.com/sitemap.xml'));
  console.log('   Contains Googlebot allow:', robotsTxt.includes('Googlebot') || robotsTxt.includes('User-agent: *'));

  // 2. Sitemap Index & Sub-Sitemaps
  console.log('\n2. Checking Sitemap hierarchy...');
  const sitemapRes = await globalThis.fetch('https://urefy.com/sitemap.xml');
  const sitemapXml = await sitemapRes.text();
  console.log('   /sitemap.xml Status:', sitemapRes.status, 'Length:', sitemapXml.length);
  
  const subSitemaps = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  console.log('   Found', subSitemaps.length, 'sub-sitemaps:');
  for (const s of subSitemaps) {
    const subRes = await globalThis.fetch(s);
    const subXml = await subRes.text();
    const urls = [...subXml.matchAll(/<loc>([^<]+)<\/loc>/g)].length;
    console.log(`     - ${s}: HTTP ${subRes.status} (${urls} URLs)`);
  }

  // 3. Post HTML, Meta Tags, Canonical & Schema.org JSON-LD
  console.log('\n3. Checking Live Public Post SEO & Structured Data...');
  const postUrl = 'https://urefy.com/p/post-2026-shadps4-bloodborne-4k60-pc-complete-guide';
  const postRes = await globalThis.fetch(postUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }
  });
  const postHtml = await postRes.text();
  console.log('   URL:', postUrl);
  console.log('   HTTP Status:', postRes.status);
  
  const titleMatch = postHtml.match(/<title>([^<]+)<\/title>/i);
  console.log('   Page Title:', titleMatch ? titleMatch[1] : 'MISSING');
  
  const metaDesc = postHtml.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  console.log('   Meta Description:', metaDesc ? metaDesc[1].slice(0, 80) + '...' : 'MISSING');

  const canonical = postHtml.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
  console.log('   Canonical URL:', canonical ? canonical[1] : 'MISSING');
  console.log('   Canonical Matches Origin:', canonical && canonical[1] === postUrl);

  const robotsMeta = postHtml.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']+)["']/i);
  console.log('   Robots Meta Tag:', robotsMeta ? robotsMeta[1] : 'DEFAULT (index, follow)');

  // JSON-LD structured data verification
  const jsonLdBlocks = [...postHtml.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  console.log('   JSON-LD Blocks Found:', jsonLdBlocks.length);
  for (let i = 0; i < jsonLdBlocks.length; i++) {
    try {
      const parsed = JSON.parse(jsonLdBlocks[i][1].trim());
      console.log(`     [Block ${i+1}] @type: ${parsed['@type'] || parsed['@graph']?.map(g => g['@type']).join(', ')}`);
      if (parsed['@type'] === 'DiscussionForumPosting') {
        console.log(`        Headline: ${parsed.headline?.slice(0, 60)}...`);
        console.log(`        Author: ${parsed.author?.name} (${parsed.author?.['@type']})`);
        console.log(`        InteractionStatistic: ${parsed.interactionStatistic ? 'PRESENT' : 'NONE'}`);
      }
    } catch (e) {
      console.error(`     [Block ${i+1}] Invalid JSON-LD:`, e.message);
    }
  }

  // 4. IndexNow Key
  console.log('\n4. Checking IndexNow verification...');
  const inRes = await globalThis.fetch('https://urefy.com/indexnow-key.txt');
  console.log('   /indexnow-key.txt Status:', inRes.status, 'Key Length:', (await inRes.text()).trim().length);

  console.log('\n=== Verification Finished ===');
}

auditSeo().catch(console.error);
