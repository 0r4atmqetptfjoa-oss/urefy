import {readFile} from 'node:fs/promises';
import {createHash,createHmac,randomUUID} from 'node:crypto';
// Operator-only diagnostic. Reads narrowly selected ignored env values.
const config={};
for (const line of (await readFile(new URL('../../../.env',import.meta.url),'utf8')).split(/\r?\n/)) {
  const m=line.match(/^\s*(AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|AWS_REGION|AWS_SQS_QUEUE_URL)\s*=\s*(.*?)\s*$/);
  if(m) config[m[1]]=m[2].replace(/^(['"])(.*)\1$/,'$2');
}
const region='eu-central-1';
const queue='https://sqs.eu-central-1.amazonaws.com/579505322330/urefy-async-jobs';
if(config.AWS_REGION!==region || config.AWS_SQS_QUEUE_URL!==queue || !config.AWS_ACCESS_KEY_ID || !config.AWS_SECRET_ACCESS_KEY) throw new Error('Invalid UREfy runtime configuration');
const job={version:1,type:'infra.healthcheck',id:randomUUID()};
const body=JSON.stringify({QueueUrl:queue,MessageBody:JSON.stringify(job)});
const host=`sqs.${region}.amazonaws.com`;
const full=new Date().toISOString().replace(/[:-]|\.\d{3}/g,'');
const day=full.slice(0,8);
const hash=x=>createHash('sha256').update(x).digest('hex');
const hmac=(k,x)=>createHmac('sha256',k).update(x).digest();
const headers={'content-type':'application/x-amz-json-1.0',host,'x-amz-date':full,'x-amz-target':'AmazonSQS.SendMessage'};
const names=Object.keys(headers).sort();
const canonical=['POST','/','',names.map(x=>`${x}:${headers[x]}\n`).join(''),names.join(';'),hash(body)].join('\n');
const scope=`${day}/${region}/sqs/aws4_request`;
let key=hmac(`AWS4${config.AWS_SECRET_ACCESS_KEY}`,day);
for(const x of [region,'sqs','aws4_request'])key=hmac(key,x);
headers.authorization=`AWS4-HMAC-SHA256 Credential=${config.AWS_ACCESS_KEY_ID}/${scope}, SignedHeaders=${names.join(';')}, Signature=${hmac(key,['AWS4-HMAC-SHA256',full,scope,hash(canonical)].join('\n')).toString('hex')}`;
const response=await fetch(`https://${host}/`,{method:'POST',headers,body});
if(!response.ok) throw new Error(`SQS healthcheck send HTTP ${response.status}`);
const result=await response.json();
console.log(JSON.stringify({sent:true,jobId:job.id,messageId:result.MessageId}));
