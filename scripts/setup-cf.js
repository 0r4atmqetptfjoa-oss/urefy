const token = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '7eb4f177ecc77d58258e35b61c9c20ba';
const projectName = process.env.CLOUDFLARE_PROJECT_NAME || 'aetheris-omni-sphere';

if (!token) {
  console.error('Error: CLOUDFLARE_API_TOKEN environment variable is required.');
  process.exit(1);
}

const cfFetch = async (path, method = 'GET', body = null) => {
  const res = await fetch('https://api.cloudflare.com/client/v4' + path, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  return res.json();
};

(async () => {
  
  console.log('Adding custom domain urefy.com...');
  const res = await cfFetch('/accounts/' + accountId + '/pages/projects/' + projectName + '/domains', 'POST', { name: 'urefy.com' });
  console.log(JSON.stringify(res, null, 2));

  console.log('Adding custom domain www.urefy.com...');
  const res2 = await cfFetch('/accounts/' + accountId + '/pages/projects/' + projectName + '/domains', 'POST', { name: 'www.urefy.com' });
  console.log(JSON.stringify(res2, null, 2));
})();
