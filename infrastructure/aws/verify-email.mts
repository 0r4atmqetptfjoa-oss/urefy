import {readFile} from 'node:fs/promises';
import {sendTransactionalEmail} from '../../packages/client-ui/functions/api/_aws-email.ts';
const env: Record<string,string>={};
for(const line of (await readFile(new URL('../../.env',import.meta.url),'utf8')).split(/\r?\n/)){
 const m=line.match(/^\s*(AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|AWS_REGION)\s*=\s*(.*?)\s*$/);
 if(m)env[m[1]]=m[2].replace(/^(['"])(.*)\1$/,'$2');
}
const operator=process.argv.includes('--operator');
let recipient='success@simulator.amazonses.com';
if(operator){
 let input='';for await(const chunk of process.stdin){input+=chunk;if(input.length>512)throw new Error('Invalid operator input');}
 recipient=input.trim();
 if(!recipient||recipient.includes('\n'))throw new Error('One explicitly authorized operator email is required on stdin');
}
const result=await sendTransactionalEmail(env,{to:recipient,subject:operator?'UREfy: verificare email infrastructura':'UREfy infrastructure delivery check',text:operator?'Acesta este testul autorizat de livrare SES pentru urefy.com. Backupul zilnic de la 04:15 a fost verificat in R2 si S3. Pentru alertele automate, confirma separat abonarea AWS SNS primita in inbox. Acest mesaj nu contine date de utilizatori sau chei.':'UREfy server-side SES integration diagnostic. No user data.',consent:true});
console.log(JSON.stringify({accepted:true,destination:operator?'authorized operator':'AWS mailbox simulator',messageId:result.MessageId}));
