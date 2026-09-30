import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
const env={};
for(const line of (await readFile(new URL('../../.env',import.meta.url),'utf8')).split(/\r?\n/)){
 const m=line.match(/^\s*(AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY)\s*=\s*(.*?)\s*$/);if(m)env[m[1]]=m[2].replace(/^(['"])(.*)\1$/,'$2');
}
if(!/^AKIA[A-Z0-9]{16}$/.test(env.AWS_ACCESS_KEY_ID)||env.AWS_SECRET_ACCESS_KEY?.length!==40)throw new Error('Invalid runtime credential shape');
for(const name of ['AWS_ACCESS_KEY_ID','AWS_SECRET_ACCESS_KEY']){
 const p=spawn(process.execPath,['../../node_modules/wrangler/bin/wrangler.js','pages','secret','put',name,'--project-name','aetheris-omni-sphere'],{cwd:'D:/proiect site total/packages/client-ui',stdio:['pipe','pipe','pipe']});
 p.stdin.end(env[name]+'\n');p.stdout.resume();p.stderr.resume();const code=await new Promise(r=>p.on('close',r));if(code!==0)throw new Error('Runtime secret save failed');
}
console.log('Both existing AWS credentials saved as Cloudflare Production encrypted Secrets; no values logged.');
