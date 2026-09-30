import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {enqueueInfrastructureJob} from '../../packages/client-ui/functions/api/_aws-jobs.ts';
const env:Record<string,string>={};
for(const line of (await readFile(new URL('../../.env',import.meta.url),'utf8')).split(/\r?\n/)){
 const m=line.match(/^\s*(AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|AWS_REGION|AWS_SQS_QUEUE_URL)\s*=\s*(.*?)\s*$/);if(m)env[m[1]]=m[2].replace(/^(['"])(.*)\1$/,'$2');
}
const id=process.argv[2]||randomUUID();
const result=await enqueueInfrastructureJob(env,{version:1,type:'backup.snapshot',id});
console.log(JSON.stringify({queued:true,jobId:id,messageId:result.MessageId}));
