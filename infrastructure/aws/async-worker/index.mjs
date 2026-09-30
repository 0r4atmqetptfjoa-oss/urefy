import {SecretsManagerClient,GetSecretValueCommand} from '@aws-sdk/client-secrets-manager';
import {S3Client,PutObjectCommand,GetObjectCommand} from '@aws-sdk/client-s3';
const REGION='eu-central-1';
const QUEUE_ARN='arn:aws:sqs:eu-central-1:579505322330:urefy-async-jobs';
const BUCKET='urefy-dr-backups-20260929-eucentral1-7k2p';
const SECRET='arn:aws:secretsmanager:eu-central-1:579505322330:secret:urefy/infrastructure/backup-trigger-Fgrddf';
const sm=new SecretsManagerClient({region:REGION,maxAttempts:2});
const s3=new S3Client({region:REGION,maxAttempts:2});
let cachedSecret;
function validateJob(job){
 if(!job||typeof job!=='object'||Array.isArray(job)||Object.keys(job).sort().join(',')!=='id,type,version'||job.version!==1||!['infra.healthcheck','backup.snapshot'].includes(job.type)||typeof job.id!=='string'||!/^[A-Za-z0-9_-]{8,80}$/.test(job.id))throw new Error('UNSUPPORTED_JOB');
 return job;
}
async function putState(key,state,conditions){
 return s3.send(new PutObjectCommand({Bucket:BUCKET,Key:key,Body:JSON.stringify(state),ContentType:'application/json',ServerSideEncryption:'AES256',...conditions}));
}
async function backup(job){
 const key=`job-state/${job.id}.json`;
 const pending={state:'pending',type:job.type,startedAt:Date.now()};
 let lock;
 try{lock=await putState(key,pending,{IfNoneMatch:'*'});}
 catch(error){
  if(error.$metadata?.httpStatusCode!==412)throw new Error('BACKUP_STATE_UNAVAILABLE');
  const prior=await s3.send(new GetObjectCommand({Bucket:BUCKET,Key:key}));
  const state=JSON.parse(await prior.Body.transformToString());
  if(state.state==='complete')return;
  if(state.state==='pending'&&Date.now()-state.startedAt<5*60*1000)throw new Error('BACKUP_ALREADY_RUNNING');
  try{lock=await putState(key,pending,{IfMatch:prior.ETag});}catch{throw new Error('BACKUP_LOCK_CONFLICT');}
 }
 try{
  if(!cachedSecret||Date.now()-cachedSecret.loadedAt>5*60*1000){
   const value=await sm.send(new GetSecretValueCommand({SecretId:SECRET}));
   const parsed=JSON.parse(value.SecretString);
   if(typeof parsed.CRON_SECRET!=='string'||parsed.CRON_SECRET.length<32)throw new Error('BACKUP_TRIGGER_UNAVAILABLE');
   cachedSecret={token:parsed.CRON_SECRET,loadedAt:Date.now()};
  }
  const response=await fetch('https://urefy.com/api/cron-backup',{method:'POST',headers:{'X-Cron-Secret':cachedSecret.token},signal:AbortSignal.timeout(20000)});
  const result=await response.json();
  if(!response.ok||!result.success||!result.awsS3Backup?.enabled||!result.fullBackup?.success)throw new Error('BACKUP_ENDPOINT_FAILED');
  await putState(key,{state:'complete',type:job.type,finishedAt:Date.now(),checksumSha256:result.checksumSha256,objectKey:result.awsS3Backup.key},{IfMatch:lock.ETag});
 }catch{
  await putState(key,{state:'failed',type:job.type,finishedAt:Date.now()},{IfMatch:lock.ETag}).catch(()=>{});
  throw new Error('BACKUP_JOB_FAILED');
 }
}
async function freshness(){
 const response=await fetch('https://urefy.com/api/cron-backup',{signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new Error('BACKUP_STATUS_UNAVAILABLE');
 const result=await response.json();
 const timestamp=Date.parse(result.fullBackup?.timestamp||'');
 const age=Number.isFinite(timestamp)&&result.fullBackup?.success?Math.max(0,Math.min(7*86400,Math.floor((Date.now()-timestamp)/1000))):7*86400;
 // CloudWatch Embedded Metric Format uses the existing logs permission only.
 // One metric, no dimensions, identifiers or user payloads. Direct stdout avoids Lambda console prefixes.
 process.stdout.write(JSON.stringify({_aws:{Timestamp:Date.now(),CloudWatchMetrics:[{Namespace:'UREfy/Backup',Dimensions:[[]],Metrics:[{Name:'BackupAgeSeconds',Unit:'Seconds'}]}]},BackupAgeSeconds:age})+'\n');
}
export const handler=async(event)=>{
 if(!event||!Array.isArray(event.Records)||event.Records.length<1||event.Records.length>10)throw new Error('INVALID_EVENT');
 const jobs=event.Records.map(record=>{
  if(record.eventSource!=='aws:sqs'||record.eventSourceARN!==QUEUE_ARN||typeof record.body!=='string'||Buffer.byteLength(record.body,'utf8')>16384)throw new Error('INVALID_RECORD');
  return validateJob(JSON.parse(record.body));
 });
 for(const job of jobs){if(job.type==='backup.snapshot')await backup(job);else await freshness();}
 console.info(JSON.stringify({component:'urefy-async-worker',version:1,processed:jobs.length,backupJobs:jobs.filter(j=>j.type==='backup.snapshot').length}));
 return{processed:jobs.length};
};
