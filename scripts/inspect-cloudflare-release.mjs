// Read-only deployment inspection. Never print environment/secret values.
const account = process.env.CLOUDFLARE_ACCOUNT_ID || '7eb4f177ecc77d58258e35b61c9c20ba';
const token = process.env.CLOUDFLARE_API_TOKEN;
if (!token) throw new Error('CLOUDFLARE_API_TOKEN is required');
const project = 'aetheris-omni-sphere';
const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/pages/projects/${project}`, {
  headers: { Authorization: `Bearer ${token}` },
});
const data = await response.json();
if (!response.ok || !data.success) throw new Error(`Cloudflare project inspection failed (${response.status})`);
const p = data.result;
const production = p.deployment_configs?.production || {};
console.log(JSON.stringify({
  name: p.name, domains: p.domains, productionBranch: p.production_branch,
  deployment: p.canonical_deployment?.id, deploymentUrl: p.canonical_deployment?.url,
  deploymentStatus: p.canonical_deployment?.latest_stage?.status,
  d1: production.d1_databases, r2: production.r2_buckets,
  durableObjects: production.durable_object_namespaces, kv: production.kv_namespaces,
  variables: Object.entries(production.env_vars || {}).map(([name, variable]) => ({ name, type: variable.type })),
  storageLimits: Object.fromEntries(Object.entries(production.env_vars || {})
    .filter(([name]) => ['MAX_UPLOAD_BYTES', 'MAX_ACCOUNT_STORAGE_BYTES', 'MAX_STORAGE_CAP_BYTES'].includes(name))
    .map(([name, variable]) => [name, variable.value])),
}, null, 2));
