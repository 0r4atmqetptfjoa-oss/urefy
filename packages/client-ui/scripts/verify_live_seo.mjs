async function verifyLive() {
  const origin = 'https://urefy.com';

  console.log('=== VERIFYING LIVE PRODUCTION: urefy.com ===\n');

  // 1. Check /about
  const aboutRes = await fetch(origin + '/about');
  const aboutHtml = await aboutRes.text();
  const hasAboutH1 = aboutHtml.includes('About UREfy');
  const hasDuplicateHomeH1 = aboutHtml.includes('UREfy — The Sovereign Social Network You Actually Own</h1>');
  const hasFaq = aboutHtml.includes('Frequently Asked Questions');
  console.log('[/about] Status:', aboutRes.status);
  console.log('[/about] Has <h1>About UREfy</h1>:', hasAboutH1);
  console.log('[/about] Has duplicate homepage <h1>:', hasDuplicateHomeH1);
  console.log('[/about] Has duplicate homepage FAQs:', hasFaq);
  const appIdx = aboutHtml.indexOf('<div id="app">');
  console.log('[/about] Inside #app:', aboutHtml.substring(appIdx, appIdx + 200).replace(/\s+/g, ' '));

  // 2. Check /features
  const featRes = await fetch(origin + '/features');
  const featHtml = await featRes.text();
  const hasFeatH1 = featHtml.includes('UREfy Platform Features');
  const featHasDup = featHtml.includes('UREfy — The Sovereign Social Network You Actually Own</h1>');
  console.log('\n[/features] Status:', featRes.status);
  console.log('[/features] Has <h1>UREfy Platform Features</h1>:', hasFeatH1);
  console.log('[/features] Has duplicate homepage <h1>:', featHasDup);

  // 3. Check /communities
  const commRes = await fetch(origin + '/communities');
  const commHtml = await commRes.text();
  const hasCommH1 = commHtml.includes('Sovereign Communities Directory');
  const commHasDup = commHtml.includes('UREfy — The Sovereign Social Network You Actually Own</h1>');
  console.log('\n[/communities] Status:', commRes.status);
  console.log('[/communities] Has <h1>Sovereign Communities Directory</h1>:', hasCommH1);
  console.log('[/communities] Has duplicate homepage <h1>:', commHasDup);

  // 4. Check /c/technology
  const techRes = await fetch(origin + '/c/technology');
  const techHtml = await techRes.text();
  const hasTechH1 = techHtml.includes('c/technology');
  const techHasDup = techHtml.includes('UREfy — The Sovereign Social Network You Actually Own</h1>');
  console.log('\n[/c/technology] Status:', techRes.status);
  console.log('[/c/technology] Has c/technology heading:', hasTechH1);
  console.log('[/c/technology] Has duplicate homepage <h1>:', techHasDup);

  // 5. Check homepage links & JSON-LD
  const homeRes = await fetch(origin + '/');
  const homeHtml = await homeRes.text();
  const hasHashCommLink = homeHtml.includes('href="https://urefy.com/#communities"');
  const hasCanonicalCommLink = homeHtml.includes('href="https://urefy.com/communities"');
  const hasHashTechLink = homeHtml.includes('href="https://urefy.com/#c/technology"');
  const hasCanonicalTechLink = homeHtml.includes('href="https://urefy.com/c/technology"');
  console.log('\n[Homepage] Has hash communities link (#communities):', hasHashCommLink);
  console.log('[Homepage] Has canonical communities link (/communities):', hasCanonicalCommLink);
  console.log('[Homepage] Has hash tech link (#c/technology):', hasHashTechLink);
  console.log('[Homepage] Has canonical tech link (/c/technology):', hasCanonicalTechLink);

  // 6. Check llms.txt
  const llmsRes = await fetch(origin + '/llms.txt');
  const llmsTxt = await llmsRes.text();
  const llmsHasHash = llmsTxt.includes('#c/');
  const llmsHasCanon = llmsTxt.includes('https://urefy.com/c/technology');
  console.log('\n[llms.txt] Has #c/ hash links:', llmsHasHash);
  console.log('[llms.txt] Has canonical c/ links:', llmsHasCanon);
}

verifyLive();
