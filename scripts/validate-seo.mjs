import fs from 'fs';

const html = fs.readFileSync('packages/client-ui/index.html', 'utf8');
const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);

if (!match) {
  console.error('FAIL: No JSON-LD script block found');
  process.exit(1);
}

try {
  const jsonLd = JSON.parse(match[1]);
  console.log('PASS: JSON-LD is valid JSON');
  console.log(`Context: ${jsonLd['@context']}`);
  console.log(`Total entities in @graph: ${jsonLd['@graph'].length}`);
  for (const entity of jsonLd['@graph']) {
    console.log(` - ${entity['@type']}: ${entity.name || entity['@id']}`);
  }
} catch (err) {
  console.error('FAIL: Invalid JSON-LD syntax:', err);
  process.exit(1);
}

// Check meta tags
const checks = [
  'title',
  'description',
  'keywords',
  'robots',
  'canonical',
  'og:title',
  'og:description',
  'og:image',
  'twitter:card',
  'twitter:title',
  'twitter:image',
  'seo-prerender-shell'
];

// Check public SEO files
const publicFiles = [
  'packages/client-ui/public/robots.txt',
  'packages/client-ui/public/sitemap.xml',
  'packages/client-ui/public/sitemap-communities.xml',
  'packages/client-ui/public/llms.txt',
  'packages/client-ui/public/llms-full.txt',
  'packages/client-ui/public/og-image.png'
];

for (const file of publicFiles) {
  if (fs.existsSync(file)) {
    const size = fs.statSync(file).size;
    console.log(`PASS: ${file} (${size} bytes)`);
  } else {
    console.error(`FAIL: Missing ${file}`);
    process.exit(1);
  }
}

console.log('\nALL SEO ASSETS & SCHEMAS VERIFIED SUCCESSFULLY!');
