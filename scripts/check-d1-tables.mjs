import { execSync } from 'node:child_process';

function d1(cmd) {
  const res = execSync(`npx wrangler d1 execute aetheris-db --remote --command "${cmd.replace(/"/g, '\\"')}"`, {
    cwd: 'packages/client-ui',
    encoding: 'utf8',
  });
  console.log(`\n=== SQL: ${cmd} ===`);
  console.log(res);
}

d1('PRAGMA table_info(used_nonces);');
d1('PRAGMA table_info(webauthn_credentials);');
d1('PRAGMA table_info(webauthn_challenges);');
d1('SELECT count(*) as count FROM used_nonces;');
d1('SELECT count(*) as count FROM webauthn_credentials;');
d1('SELECT count(*) as count FROM webauthn_challenges;');
