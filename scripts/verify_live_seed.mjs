async function verify() {
  console.log('--- 1. Testing /api/posts (default Hot sort) ---');
  const r1 = await fetch('https://urefy.com/api/posts?limit=12');
  const d1 = await r1.json();
  console.log('Success:', d1.success, 'Count:', d1.count);
  if (d1.posts && d1.posts.length > 0) {
    d1.posts.forEach((p, i) => {
      const ageHours = ((Date.now() - p.createdAt) / 3600000).toFixed(1);
      console.log(`[${i+1}] ${p.title.slice(0, 65)}... (${ageHours}h ago) | Video: ${p.video ? 'YES' : 'no'} | Votes: ${p.meritVotes} | Replies: ${p.replyCount}`);
    });
  }

  console.log('\n--- 2. Testing /api/messages?channelId=relays-general ---');
  const r2 = await fetch('https://urefy.com/api/messages?channelId=relays-general&limit=15');
  const d2 = await r2.json();
  const msgs = d2.messages || d2;
  console.log('Total general messages:', msgs.length);
  if (Array.isArray(msgs)) {
    msgs.slice(-8).forEach(m => {
      console.log(`@${m.authorFingerprint}: ${m.text?.slice(0, 75)}`);
    });
  }

  console.log('\n--- 3. Testing /api/comments for Roblox Physics post ---');
  const r3 = await fetch('https://urefy.com/api/comments?postId=p-roblox-physics-desync-corner-clip');
  const d3 = await r3.json();
  const comments = d3.comments || d3;
  console.log('Comments count:', comments.length);
  if (Array.isArray(comments)) {
    comments.forEach(c => {
      console.log(`  - @${c.authorId || c.authorFingerprint}: ${c.content?.slice(0, 80)} (Votes: ${c.meritVotes || c.merit_votes})`);
    });
  }
}
verify().catch(console.error);
