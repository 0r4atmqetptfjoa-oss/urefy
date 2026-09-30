# UREfy AWS runtime and operations guide

Verified 2026-09-30. Account `579505322330`, region `eu-central-1` (Frankfurt).
Production Pages deployment: `94e13e14`. Cloudflare remains DNS, edge, Pages, D1, R2, KV and Durable Objects. Full D1/application-media encrypted backups are enabled. Both temporary recovery downloads are disabled after the verified drill; status reads durable R2 metadata. Concurrent client UI edits belong to the developer/other agent and were preserved; this pass edited infrastructure/backend only.

## Rules for Antigravity and other agents

- Read this guide before AWS work. Provisioning alone does not prove integration.
- The existing restricted AWS credentials are in ignored local `.env` and `urefy-cloudflare-runtime_accessKeys.csv`. The CSV was checked internally and matches the configured key and secret; no values were printed. Both files are ignored by Git. Read only selected required fields; never dump environment, paste secrets into prompts/docs/logs/screenshots or commit them.
- Cloudflare Pages Production stores AWS credentials, CRON_SECRET and BACKUP_ENCRYPTION_KEY as encrypted Secrets. Local `.env` does not automatically deploy.
- Do not rotate/deactivate the existing IAM key or broaden its policy without the owner explicitly asking.
- Never send sovereign/E2EE user keys, recovery phrases, decrypted DMs or private user payloads to AWS, analytics, logs or job queues. S3 receives already encrypted backup bytes only.
- Preserve existing Cloudflare VAPID Web Push, D1/R2/DO and DNS authority. Never connect Bedrock/Rekognition to private DMs.

## Service status

| Service | Live state and integration |
|---|---|
| IAM | User `urefy-cloudflare-runtime`, restricted policy `UREfyCloudflareRuntimeLimited`, existing active programmatic credential. Domain-scoped SES send, main-queue SQS SendMessage and S3 PutObject under backups only. No console login, S3 read/list, Secrets Manager read or KMS decrypt for runtime identity. |
| SES | Identity `urefy.com` Verified; Easy DKIM Successful/Enabled, RSA 2048. Server helper `_aws-email.ts` sends from `UREfy <notifications@urefy.com>` with explicit consent:true, text only, bounded inputs and no tracking. Owner explicitly accepted terms; production request submitted successfully on 2026-09-30. Console then showed Production access granted, 50,000 emails/24h and 14/second. Exact server helper accepted both simulator and one authorized operator inbox test. API acceptance does not prove inbox placement; no user onboarding email collection added. Account suppression Enabled for Bounce and complaints; check SES Reputation and suppression before retry, never remove a complaint without renewed consent. Custom MAIL FROM not started. VDM and dedicated IPs remain disabled. |
| SQS | Standard `urefy-async-jobs`, SSE-SQS, visibility 180 seconds, retention 4 days, long polling 20 seconds, max payload 16 KiB; redrive to `urefy-async-jobs-dlq` after 5 receives. Runtime sends only main queue. Mapping enabled and real jobs consumed. DLQ retention is 14 days and redrive allow policy permits only the main UREfy queue. Both queues have 0 available and 0 in-flight messages after live jobs. The redrive procedure is configured; no fabricated failed job was injected. |
| Lambda | `urefy-async-worker`, Node 24.x,128 MB, timeout 30 seconds. Source `infrastructure/aws/async-worker/index.mjs`. Allowlist version 1 `infra.healthcheck` and `backup.snapshot`, exact fields version/type/id. Batch 1, max concurrency 2, no provisioned polling. Scoped queue consume, one trigger secret and KMS decrypt conditioned on that secret, S3 job-state prefix only. Backup now requires fullBackup.success as well as legacy R2/S3 success. Healthcheck reads only durable backup status and emits one age metric through existing log permissions. Full SQS backup succeeded; replay verification below. |
| EventBridge Scheduler | Enabled `urefy-daily-encrypted-backup`, daily 04:15 Europe/Bucharest, cron `15 4 * * ? *`, flexible window Off. Target main SQS, payload below. Retry 3, max age 1 hour, delivery DLQ `urefy-async-jobs-dlq`. Role `urefy-daily-backup-scheduler`. First automatic execution verified 2026-09-30 04:15:24 Bucharest: processed 1, backupJobs 1, success, R2 and S3 snapshot created. Next trigger shown 2026-10-01 04:15. |
| EventBridge bus | `urefy-async-events` exists; no publisher/rule enabled. Scheduler provides the active scheduled integration. Future custom bus producers need scoped PutEvents and intentional rules. |
| S3 | Bucket `urefy-dr-backups-20260929-eucentral1-7k2p`. Block Public Access all enabled, owner enforced, versioning Off at prior inspection. Legacy encrypted snapshots and new full manifests/media parts under backups/full-dr/. Prior object server encryption SSE-S3 verified; all uploads explicitly request AES256 SSE-S3, after application AES-GCM encryption. Job-state metadata separately under job-state/. Runtime remains write-only under backups/. No lifecycle added. |
| KMS | Enabled symmetric single-region key alias `urefy-infra-secrets`, ID `c4e202e2-6203-4c63-a909-bf64f610c453`. Infrastructure keys only, no user E2EE keys. |
| Secrets Manager | Existing `urefy/infrastructure/cloudflare-runtime` stores same existing AWS credential and region. New `urefy/infrastructure/backup-trigger` stores CRON_SECRET only for Lambda to call fixed canonical backup endpoint. Both KMS-encrypted, rotation/replication Off. Runtime Cloudflare does not fetch these secrets. |
| CloudWatch RUM | `urefy-web-prod`, appID `1fc5e95f-e1e6-420d-bd88-2512b2bc0a1b`, domain urefy.com. Production SDK at 10% sampling, 50 events/session, no cookies, no HTTP/resource URLs/custom/X-Ray/logs/raw JS error telemetry. Performance only, fixed page ID /app, automatic page views Off. Browser/OS/device/coarsegeolocation remain inherent service metadata. Public policy PutRumEvents only. Ingestion verified in CloudWatch: 1 session, 1 page load, only /app page ID observed. |
| Web Push | Keep existing Cloudflare VAPID integration. AWS End User Messaging Push supports provider channels including FCM/APNs and browser delivery via FCM; no Firebase/native app credentials provided, so no duplicate AWS push application configured. |
| GuardDuty | Enabled in Frankfurt with specific owner confirmation. Detector `56d0778780ea491c65cfd5b5e6c9c29f`. Protection Plans now verified: foundational, S3, Lambda, EKS audit logs and RDS login monitoring Enabled; AI Protection and EC2/ECS/EKS runtime monitoring/infrastructure Not enabled. No optional runtime agents or S3 malware scanning configured. Usage shows 30 trial days remaining and no metrics yet; no reliable post-trial dollar estimate available. No all-region activation. High/critical finding notifications configured below. |
| Security Hub | CSPM enabled with specific owner confirmation, findings-only mode. All standards remain disabled (each offers Enable standard); GuardDuty integration is Connected. No AWS Config or Essentials bundle activated. |
| Operator monitoring | Three CloudWatch alarms Enabled and OK, targeting `urefy-operator-alerts` SNS: Lambda errors, nonempty DLQ and full backup older than 30 hours/missing freshness signal. New hourly Scheduler Enabled. Email subscription Confirmed; authorized SNS test published successfully. Default-bus GuardDuty rule Enabled; fixed notification text, no full finding payload. Runtime IAM credential remains unchanged. |

## Production configuration

Encrypted Pages Secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `CRON_SECRET`, existing `BACKUP_ENCRYPTION_KEY`. Other existing application Secrets preserved.
Public `[vars]` in `packages/client-ui/wrangler.toml`:

```toml
AWS_REGION = "eu-central-1"
AWS_S3_BUCKET = "urefy-dr-backups-20260929-eucentral1-7k2p"
AWS_SQS_QUEUE_URL = "https://sqs.eu-central-1.amazonaws.com/579505322330/urefy-async-jobs"
AWS_FULL_DR_ENABLED = "true"
```

Deploy from `packages/client-ui` so Wrangler applies the actual configuration:

```powershell
npx wrangler pages deploy dist --project-name aetheris-omni-sphere --branch main
```

Scoped configuration scripts: `infrastructure/aws/configure-runtime.mjs` saves the same localAWScredential as encrypted Pages Secrets; `configure-backup-trigger.mjs` saves the existing/generated infrastructure cron token. Do not print stdin or secret-bearing child process arguments.

## Async backup contract

```json
{"version":1,"type":"backup.snapshot","id":"<aws.scheduler.execution-id>"}
```

Scheduler expands execution ID at invocation. Application helper `_aws-jobs.ts` sends validated jobs only to the fixed main queue. No arbitrary public enqueue endpoint.
Lambda acquires conditional S3 marker `job-state/{id}.json`, fetches only the backup-trigger secret, then POSTs fixed `https://urefy.com/api/cron-backup` with X-Cron-Secret. It requires successful legacy R2/S3 plus fullBackup.success, saves only completion/hash/object key metadata, and logs only counts. No message text/credentials logged.
Completed duplicate IDs skip the side effect. Pending locks retry; stale locks can recover. Delivery is at least once: a crash after creating the encrypted backup but before saving completion can produce another additive snapshot on recovery; do not claim exactly-once semantics.
Mapping ID `59525754-a190-4bc2-a697-1dcd8518e75a`.
Role inline policies: `UREfyConsumeAsyncJobsOnly`, `UREfyBackupWorkerInfrastructure`.

## Backup coverage and recovery limits

`AWS_FULL_DR_ENABLED=true` adds `_full-backup.ts` to the existing backup operation. The legacy five-table gzip/AES-GCM snapshot remains for compatibility. New manifest 2.0.0 captures all application D1 tables, schema objects and AUTOINCREMENT sequences, plus contents/HTTP/custom metadata of objects in STORAGE_BUCKET and VAULT_BUCKET. Internal SQLite/_cf_ tables and archive prefixes backups/ and dr/ are excluded. User DM/Vault ciphertext stays encrypted with original user keys. KV cache, transient DO relay state and client-only E2EE keys are outside this snapshot.

D1 uses one read-only transactional batch; its official size_after metadata bounds the capture. R2 inventories/etags/sizes are checked before and after reading. There is no atomic shared D1/R2 snapshot. Current fail-closed limits: 12 MiB allocated database/manifest, 20,000 rows per table, 100 tables, 200 objects, 128 MiB media, 4 MiB encrypted parts. Larger datasets need paginated/resumable jobs before these limits are reached. Do not claim unlimited production scale.

Every part is AES-256-GCM encrypted before S3/R2 upload; encrypted manifest commits last. R2 full pointer is dr/full-snapshot-daily.enc; parts under dr/{snapshot-id}/. S3 has backups/full-dr/{snapshot-id}/manifest.enc and part-*.enc. Durable public status exposes counts/timestamp/hash only. Legacy R2 retention remains 7 days/space cap; new dr/ parts and S3 archives currently have no automatic expiry. Storage grows until a deliberate retention/lifecycle is implemented.

Production requires the dedicated existing backup key, absent from local .env/CSV. Its derived AES key was wrapped for the separate owner RSA-4096 recipient (RSA-OAEP-SHA256). Original RSA private material remains Windows CurrentUser DPAPI encrypted in ignored .aws-recovery/. No IAM, backup or E2EE key was replaced. Cron token cannot authorize restore; never restore over live D1 to test recovery. Runtime IAM has no S3 GetObject/list; recovery needs independent operator access.

### Verified full recovery, 2026-09-30

- Manual full snapshot 2026-09-30T06:14:45.319Z: 48 application tables, 18,396 records, 2 R2 files, 47,944 media bytes, 2 encrypted parts. D1 allocated size 9,920,512 bytes; manual backup including legacy/full finished in 4,520 ms.
- Full manifest SHA256 1c819e9d6262ed07cf73f33b13d785cede3179adfe50832bb18ac840f0ca3221. S3 key backups/full-dr/1790748886997-b815cdbc-a30a-4942-b9df-a3e9c79ee4fb/manifest.enc; encrypted manifest 1,503,634 bytes.
- Actual online ciphertext retrieval and fully offline restoration into in-memory SQLite passed: all row hashes/counts, schema/indexes/sequences, integrity_check ok, 0 foreign-key violations. Both media parts passed AES authentication/hash/size/offset verification. No plaintext records saved; live database unchanged.
- The owner entered their own separate password in a local loopback form. Portable encryption uses scrypt N=131072,r=8,p=1 (32-byte salt), AES-256-GCM (12-byte IV,16-byte tag), fixed AAD. Password never saved, logged or supplied to the agent. Package includes RSA private material, wrapped backup key, encrypted full snapshot/media and legacy package inside authenticated encryption; it does not depend on Windows DPAPI.
- Portable export and independent self-verification passed using that owner password: the same 48 tables/18,396 records/2 files restored in isolated memory without Windows profile, AWS or Cloudflare access.
- Ignored package .aws-recovery/urefy-portable-recovery-1790749455669.json, 2,847,447 bytes, SHA256 5edc1cc03a1bee8199068cf77155abf5de87e0db524c1d58afb6c634aac8e614.
- Tools .aws-recovery/urefy-recovery-tools.zip, SHA256 4abe899dd428ec743a259f12cf8aa81c665a1182662408af0bca89d4a66d7495; contains five public scripts/readme, no keys or password. Certificate RECOVERY_VERIFICATION.txt contains hashes and proof counts only.
- All three files uploaded successfully to the owner's Google Drive folder [UREfy - recuperare criptata](https://drive.google.com/drive/u/0/folders/1933b4nEgZd9anZZeHLke4I0gEu-0wc8E). UI reported three completed uploads. No sharing permissions changed. This is a point-in-time off-device copy, not automatic Drive synchronization. Keep the password separately; the encrypted key can recover future snapshots made with the same infrastructure backup key.
- Temporary POST /api/backup-recovery and /api/full-backup-recovery require exact cron token, fixed configured owner recipient and dedicated key; no arbitrary object/recipient or restore. No CORS, no-store, encrypted size limit. Public recipient binding removed in deployment 94e13e14; authenticated requests return 503 disabled, unauthenticated 401.
- New actual SQS full-backup job b72696ca-7aaf-4716-9413-d5d88a9be136 created durable snapshot 2026-09-30T06:42:41.413Z: 48 tables, 18,405 records, 2 files/47,944 bytes. Full manifest SHA256 b3906a8272f9d0f06ab9cc868e7acd85e307129b82805e8694522b15f5f5a72c; legacy snapshot count 9. The Drive kit intentionally retains the earlier independently restored snapshot.

Use infrastructure/aws/RECOVERY_README.md for portable offline verification on Node 22.17+. This verifies a full isolated restore; production recovery requires separate D1/R2 targets and an explicit cutover plan. The legacy restoreBackup endpoint does not support full manifest 2.0.0. Do not apply it to full snapshots.

For a future authorized drill, prepare-recovery.mjs reuses the existing RSA recipient/public binding; build/deploy, run verify-full-recovery.mjs, then disable-recovery.mjs and redeploy immediately. Never print recovery files, replace keys or leave download enabled.

## Email and diagnostics

`_aws-request.ts` signs fixed Frankfurt SES/SQS/EventBridge endpoints with WebCrypto and 15-second timeout; no arbitrary destination host. `_aws-email.ts` validates explicit consent and bounded subject/text/recipient; never pass DM content or keys. No email collection is added to onboarding.
Admin-only POST `/api/aws-healthcheck` supports fixed SESsimulator and minimalSQShealthcheck. UnauthenticatedPOST verified401. No arbitrary recipient/payload proxy.
`infrastructure/aws/verify-email.mts` invokes the exact server helper with selected ignored local env fields and fixed AWS simulator. Accepted MessageId `010701a0eef83cdd-796e080f-e228-4d40-83a4-82b2aa820717-000000`. This proves API acceptance, not human inbox delivery.
Owner provided the operator email and confirmed SNS subscription on 2026-09-30. One operator email accepted by the exact SES helper: MessageId `010701a0f0c6096e-dac99147-8fc9-4fc1-ad84-ddf77721ed7d-000000`. The helper's optional `--operator` mode reads one explicitly authorized recipient from stdin; default remains the fixed simulator. No permanent general send endpoint exposed.

## Operator alarms and security notifications

SNS topic ARN `arn:aws:sns:eu-central-1:579505322330:urefy-operator-alerts`, Standard, one confirmed owner email subscription. No user email addresses or DM content sent to this topic.

| Alarm | Metric / condition | Configuration |
|---|---|---|
| urefy-async-worker-errors | AWS/Lambda, FunctionName urefy-async-worker, Errors Sum > 0 | 300 seconds, 1/1, missing data notBreaching, SNS on ALARM |
| urefy-async-jobs-dlq-not-empty | AWS/SQS, QueueName urefy-async-jobs-dlq, ApproximateNumberOfMessagesVisible Maximum > 0 | 300 seconds, 1/1, missing data notBreaching, SNS on ALARM |
| urefy-full-backup-stale | UREfy/Backup, BackupAgeSeconds Maximum > 108000 | 3600 seconds, 1/1, missing data breaching, warmup 90 minutes, SNS on ALARM |

All three were OK with actions enabled at live inspection. Enabled Scheduler urefy-hourly-backup-freshness runs rate(1 hours), Europe/Bucharest, flexible window Off, target main SQS with infra.healthcheck and scheduler execution ID. Retries 3, max age 1 hour, existing DLQ; generated role urefy-hourly-backup-freshness-scheduler. Its only managed policy permits sqs:SendMessage on the exact main queue and DLQ; trust permits scheduler.amazonaws.com with SourceAccount 579505322330 (no SourceArn condition). It uses the AWS-owned scheduler encryption key. Lambda reads only /api/cron-backup fullBackup timestamp; invalid/missing success becomes seven-day age. Direct stdout Embedded Metric Format publishes one dimensionless BackupAgeSeconds metric through existing Logs access, without PutMetricData or IAM expansion. Namespace/metric ingestion observed. Missing hourly data also breaches the alarm, detecting a stopped scheduler after warmup. See https://docs.aws.amazon.com/lambda/latest/dg/nodejs-logging.html .

Default EventBridge bus rule `urefy-guardduty-high-severity-alerts` Enabled. Pattern: source aws.guardduty, detail-type GuardDuty Finding, account 579505322330, region eu-central-1, detail.severity numeric >= 7. Target topic above; **constant JSON string only**, never the matched finding payload. No target DLQ configured. Existing GuardDuty new finding/default update frequency preserved.
Generated execution role `Amazon_EventBridge_Invoke_Sns_1389240774` verified: only sns:Publish on the exact topic; trust events.amazonaws.com with exact rule SourceArn and SourceAccount 579505322330. No runtime IAM policy broadened.
SNS test published successfully, MessageId `ad067ca1-a01a-5e82-a01f-1f97004ab40f`; user confirmed subscription, but inbox receipt of the SES/SNS test messages has not yet been independently confirmed. No fabricated GuardDuty findings or failing backup jobs injected; full incident delivery/redrive drill remains untested.

## DNS records

Existing SES records were confirmed both in Cloudflare (DNS only) and public DNS; no duplicate DKIM records added this turn:

| Type | Name | Target/content |
|---|---|---|
| CNAME | c7vbpfw427vi3rb446eg3hiqu5lkb25y._domainkey.urefy.com | c7vbpfw427vi3rb446eg3hiqu5lkb25y.dkim.amazonses.com |
| CNAME | nc76drsqyblu3fpxkaq3aexgdgf276w4._domainkey.urefy.com | nc76drsqyblu3fpxkaq3aexgdgf276w4.dkim.amazonses.com |
| CNAME | ekontp3yvbpkbxb4awjaznspbncc7uar._domainkey.urefy.com | ekontp3yvbpkbxb4awjaznspbncc7uar.dkim.amazonses.com |
| TXT, new 2026-09-30 | _dmarc.urefy.com | v=DMARC1; p=none; adkim=r; aspf=r |

DMARC saved in Cloudflare, DNS only, TTL Auto. p=none avoids rejecting existing mail while authentication is established; no report receiver invented. Cloudflare public DNS-over-HTTPS resolver returned the exact new TXT record; propagation verified. No nameserver/root origin/MX/SPF existing records changed. SES identity does not create mailbox/inbound reply routing.

## Verified evidence

- Latest focused backup/recovery Vitest suites: 37/37 passed. Six Node recovery tests passed, including corruption, metadata/count/size checks, wrong passwords/KDF bounds and independent portable recovery without DPAPI/network. Production build and Lambda syntax check passed.
- Full real isolated restore and portable owner-password verification passed as above; production deployment 94e13e14 has full DR enabled and both recovery download endpoints disabled.
- Actual SQS full backup succeeded, with durable timestamp/count/hash shown above. Earlier automatic Scheduler execution at 2026-09-30 04:15 passed with the then-legacy-only implementation; next daily run uses full DR. Next trigger 2026-10-01 04:15 Europe/Bucharest.
- Replay of the new full-backup job kept durable full timestamp 06:42:41.413Z and legacy snapshot count 9 unchanged at final inspection. This verifies no extra snapshot observed; delivery remains at least once.
- Screenshots in outputs/aws/: drive-portable-recovery.png, operator-alarms-full-backup.png, hourly-backup-freshness.png, daily-backup-schedule.png, ses-production-granted.png, guardduty-alert-rule.png, sns-confirmed.png and cloudflare-dmarc.png. No credential/password values captured.

## Costs and limits

Earlier Billing/Credits inspection (not refreshed during the full-recovery pass): five active credits, total issued USD 1,160, remaining estimated USD 1,158.24, used USD 1.76. Main AWS Activate FOUNDERS credit USD 1,000 expires2028-09-30; other credits expire2027-09-07. Estimates can lag; verify service eligibility and taxes before major spend. Existing budget/anomaly monitor were present; no duplicate created.
Fixed baseline approximately USD 1.80/month: one customer KMS key USD 1/month plus two Secrets Manager secrets USD 0.40/month each, plus requests. SES,SQS,Lambda,Scheduler,S3,RUM/security are metered; no users does not prevent bot telemetry/security event costs. No provisioned compute/polling/paid SES dedicated IP/VDM or AWS Config enabled.
GuardDuty 30-day trial does not mean permanently free; inspect Usage after data accumulates. RUM 10% sampling/public write endpoint can still receive untrusted traffic. SDK has a transitive uuid 9 moderate advisory in caller-buffer UUIDvariants; no exploit confirmed in the SDK call path.
The three standard CloudWatch alarms and one custom freshness metric fit within published allowances of 10 direct standard alarm metrics and 10 custom metrics if this account is eligible; otherwise regional pricing applies. Hourly health checks add about 720 small Scheduler/SQS/Lambda jobs per month. EMF ingestion uses the existing log group; no additional KMS key/secret or provisioned compute. SNS requests/email delivery are metered, with only a few operator messages expected. The default-bus rule receives AWS service events; no paid custom-event producer was added. No extra KMS key or Secrets Manager secret was created for local recovery.
Official pricing: https://aws.amazon.com/kms/pricing/ ; https://aws.amazon.com/secrets-manager/pricing/ ; https://aws.amazon.com/eventbridge/pricing/ ; https://aws.amazon.com/guardduty/pricing/ ; https://aws.amazon.com/security-hub/cspm/pricing/ .
CloudWatch pricing/free limits: https://aws.amazon.com/cloudwatch/pricing/ . GuardDuty event integration: https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_findings_eventbridge.html .

## Remaining completion gates and deliberate limits

1. Backup coverage and portable/off-device recovery are verified for the current data. Larger datasets need resumable jobs before capacity limits; choose retention/lifecycle for new R2 dr/ and S3 archives. Operational production restore/cutover and loss of client-only E2EE keys are not covered by an isolated verification.
2. Daily backup, hourly freshness ingestion, three alarms and SNS subscription are verified. Inbox placement and a real incident notification/redrive drill remain untested; no fake production failures or GuardDuty findings were injected.
3. SES Production is granted and exact helper accepted operator email. Product-specific consent-based transactional workflows need intentional implementation; no onboarding email collection or arbitrary send proxy added.
4. Review GuardDuty post-trial usage/cost after data accumulates. Credits and free-tier eligibility must be refreshed before significant new spend.
5. Custom EventBridge bus and future email/notification/moderation handlers are foundations only. Existing Cloudflare VAPID remains; real device delivery needs a subscribed device. Native FCM/APNs channels need provider credentials if requested. Never add private DM jobs/AI processing.
