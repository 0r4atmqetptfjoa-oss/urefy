async function inspect() {
  const url = 'https://urefy.com/p/p-gta-6-euphoria-physics-water-simulation-analysis';
  const res = await fetch(url);
  const html = await res.text();
  
  const regex = /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
  let match;
  let count = 0;
  while ((match = regex.exec(html)) !== null) {
    count++;
    console.log(`\n--- JSON-LD Block #${count} ---`);
    try {
      const parsed = JSON.parse(match[1]);
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('Raw content:', match[1].slice(0, 300));
      console.log('Parse error:', e.message);
    }
  }
}
inspect();
