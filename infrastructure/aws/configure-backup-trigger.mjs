import {readFile,appendFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
const path='D:/proiect site total/.env';
const content=await readFile(path,'utf8');
let secret=content.match(/^CRON_SECRET=(.+)$/m)?.[1].trim().replace(/^(['"])(.*)\1$/,'$2');
if(!secret){secret=randomBytes(32).toString('hex');await appendFile(path,`\nCRON_SECRET=${secret}\n`);}
if(secret.length<32)throw new Error('Existing cron secret is too short; no replacement performed');
const proc=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','pages','secret','put','CRON_SECRET','--project-name','aetheris-omni-sphere'],{stdio:['pipe','pipe','pipe']});
proc.stdin.end(secret+'\n');
let output='';proc.stdout.on('data',d=>output+=d);proc.stderr.on('data',d=>output+=d);
const code=await new Promise(r=>proc.on('close',r));
if(code!==0)throw new Error('Cloudflare cron secret configuration failed');
console.log('CRON_SECRET saved to ignored .env and Cloudflare Production; values not logged.');
