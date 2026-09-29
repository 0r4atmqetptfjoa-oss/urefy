# UREfy AWS: runtime and operations guide

Last checked: 2026-09-29  
AWS account: `579505322330`  
Region: `eu-central-1` (Frankfurt)

This is the working map for Antigravity and other UREfy agents. It records what exists, what the application currently uses, and what still needs an operator action. **Do not infer that a provisioned AWS resource is already connected to production.** Cloudflare remains UREfy's DNS, edge, Pages origin, D1, R2, KV and Durable Objects platform.

## Security boundary for agents

- The AWS runtime credential is stored locally in `D:\proiect site total\.env`. Git ignores `.env`; never remove that ignore rule, commit it, print it, paste it into a prompt, add it to this document, or expose it in logs, screenshots, test output or issue text.
- Read only the variable names required by the task. Do not dump the environment. If an agent needs AWS access, it must use the existing environment without echoing credentials. Do not create, rotate, deactivate, or broaden the IAM key/policy without the owner explicitly asking.
- Cloudflare Pages Production has the restricted AWS access key and secret stored as encrypted Secret variables. The current production deployment includes the S3 mirror code; no credential values are recorded here.
- This IAM key is a limited programmatic runtime credential, not a console login. It is scoped to the SES domain, the UREfy SQS queue, and `PutObject` beneath the S3 backup prefix. Do not use it for unrelated resources.
- Sovereign user keys, DM E2EE private keys, decrypted messages and recovery phrases must never be copied to AWS, `.env`, RUM, logs, SQS, Lambda, SES, or S3.

## Local runtime variables

The ignored local `.env` currently contains these populated AWS entries; this document intentionally omits values:

```dotenv
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION=eu-central-1
AWS_SQS_QUEUE_URL
AWS_S3_BUCKET
```

Do not replace the populated values with blank placeholders. Cloudflare Pages needs its own Production runtime secrets/variables; local `.env` is not automatically uploaded during deployment.

## Provisioned resources and current application status

| Service | Provisioned state | Application status / purpose |
|---|---|---|
| IAM | Programmatic user `urefy-cloudflare-runtime`; policy `UREfyCloudflareRuntimeLimited`; key currently active. No console access. | Existing restricted credential is in local ignored `.env`. Do not repeat its identifier or secret in agent output. |
| SES | Domain identity `urefy.com` verified; Easy DKIM successful/enabled, 2048-bit. | Account remains in sandbox: observed limit 200 messages/24h and 1/sec; verified recipients required until production access is approved. No application email flow is implemented; sending would violate current no-email onboarding expectations until product copy/consent is updated. |
| SQS | Standard queue `urefy-async-jobs`; DLQ `urefy-async-jobs-dlq`; SSE-SQS; both were empty at inspection. | No public enqueue endpoint. IAM permission is limited to send to the main queue. Redrive and processing path still need verification. |
| EventBridge | Custom bus `urefy-async-events`. | Exists, but no application publisher/rule wiring confirmed. IAM policy has no `events:PutEvents`. |
| Lambda | `urefy-async-worker`, Node.js 24.x. | Exists, but its source is still the 295-byte TODO placeholder. No verified SQS event-source mapping or EventBridge rule. Do not send jobs to it or assume it processes anything. |
| S3 | `urefy-dr-backups-20260929-eucentral1-7k2p` in Frankfurt; Block Public Access all enabled, Bucket owner enforced, no objects at inspection, versioning off. | Optional mirror code is deployed in production deployment `ce3baca0`; the read-only backup status endpoint reports `IDLE` and 0 snapshots. No S3 object has yet been created or verified. The request mirrors only the already AES-GCM-encrypted snapshot, uses SigV4 and explicitly requests SSE-S3 (`AES256`). IAM is write-only; restore/read-back is unavailable. Keep R2 primary. |
| CloudWatch RUM | Monitor `urefy-web-prod`; application ID `1fc5e95f-e1e6-420d-bd88-2512b2bc0a1b`; allowed domain `urefy.com`; 10% sampling. | Browser SDK integrated on canonical `urefy.com` and deployed as `ce3baca0`. Cookies, HTTP errors, custom events, Logs and X-Ray are off; resource URLs are not recorded. Automatic page views are disabled and the client reports only aggregate page ID `/app`, avoiding profile handles in paths. RUM still receives browser/OS/device metadata and coarse country/subdivision metadata inherent to the service. The SDK adds a transitive `uuid` 9.x dependency for which `npm audit` reports a moderate advisory; the advisory concerns v3/v5/v6 calls with caller-provided buffers, and no exploit was confirmed in the SDK call path. The monitor public resource policy allows only `rum:PutRumEvents`. Production page and deployment endpoints returned HTTP 200; ingestion remains unverified because no synthetic browser session has been run. |
| AWS End User Messaging Push | Not configured. | Preserve existing Cloudflare VAPID Web Push. Do not create a second push provider or move subscriptions without a migration plan. |
| KMS / Secrets Manager | No UREfy customer-managed KMS key or Secrets Manager secret confirmed. | The local IAM key remains the existing runtime credential; Cloudflare runtime secrets are an alternative for production. Do not transfer E2EE keys here. Creating dedicated KMS/Secrets Manager resources incurs recurring charges and needs owner approval after current pricing is checked. |
| GuardDuty / Security Hub | Activation not confirmed. | Costs depend on data volume and evaluated resources. Check the current account pricing and credit coverage before enabling. |

## Implemented backup mirror

`packages/client-ui/functions/api/cron-backup.ts` already serializes selected D1 tables, gzip-compresses the manifest, and encrypts it using AES-256-GCM before persisting the primary and timestamped copies to Cloudflare R2. The AWS mirror calls `functions/api/_aws-s3.ts` with only that ciphertext. The object key is timestamped under `backups/`; the request is signed for the configured region and explicitly requests SSE-S3. It does not change R2, D1, DO, DNS or DM encryption.

Runtime values required to enable this optional mirror in Cloudflare Pages Production:

- Secret: `AWS_ACCESS_KEY_ID`
- Secret: `AWS_SECRET_ACCESS_KEY`
- Text variable: `AWS_REGION` = `eu-central-1`
- Text variable: `AWS_S3_BUCKET` = `urefy-dr-backups-20260929-eucentral1-7k2p`

The four variables above are saved in Cloudflare Pages Production with the two credentials typed as Secret. Deployment `ce3baca0` is live on the production branch. The site returned HTTP 200, `GET /api/cron-backup` returned `IDLE` and 0 snapshots, and an HTTP request spoofing `CF-Cron: true` correctly returned 401. No S3 upload has been triggered or verified. A failed configured S3 upload is reported as a backup failure; inspect the R2 snapshot separately because R2 may already have persisted it. There is no S3 recovery path yet: this IAM identity cannot `GetObject` or list objects, and no recovery key workflow is established.

## Service integration contracts

### SES transactional email

Use only for explicitly consented account/security messages, invitations or support messages after the product's privacy promise and opt-in behavior are settled. Keep sending server-side. Verify recipient handling and sandbox status before a live send. Never include DM content or private conversation metadata. SES identity/DKIM does not create a mailbox or prove that replies are received.

### SQS, EventBridge and Lambda

Use versioned, allowlisted job types with minimal payloads, schema validation, idempotency, bounded retries, DLQ redrive and retention. Never expose an arbitrary public enqueue proxy. Do not publish private-message plaintext or user key material. Before wiring the queue, inspect the existing Lambda code, execution role, queue visibility timeout, redrive policy and duplicate behavior. EventBridge requires a separately scoped `events:PutEvents` permission and an intentional rule target.

### CloudWatch RUM

Integrated in `packages/client-ui/src/rum-monitor.ts`; it runs only on the canonical production hostname. Configuration uses the monitor ID above, `sessionSampleRate: 0.1`, `allowCookies: false`, `enableXRay: false`, `signing: false`, and only `performance` and `errors` telemetry. Resource timing entries and resource URLs are excluded. Do not collect message text, form values, search terms, URL query values, user handles, or custom events. Keep the monitor's allowed domain restricted to UREfy.

### CloudWatch security services

GuardDuty and Security Hub are not prerequisites for these integrations. Before activation, capture the regional estimate and projected monthly cost after credits, including the post-credit price, and get owner approval for any material recurring charge.

## DNS and current cost boundaries

- Cloudflare remains authoritative for DNS. The SES domain was verified and DKIM reported successful; no DNS nameserver move is needed. Do not replace existing Cloudflare records. If SES records must be repaired, add only the exact SES-provided TXT/CNAME records, preserve proxy/DNS-only requirements for mail records, then recheck SES identity status.
- SES, SQS, Lambda, EventBridge, S3 and RUM are usage-metered; no-users lowers expected volume but does not guarantee zero usage (public RUM ingestion can receive bots). S3 storage/requests and data transfer are usage costs.
- SES sandbox observed 200 emails/day and 1/sec. No live application emails have been sent.
- The AWS pricing page currently describes a first-time 1 million RUM web-event free trial per account, then usage pricing (shown at USD 1 per 100,000 events in its example; regional rates vary). No estimate here promises that the USD 1,124 account credit covers every service, region, tax, or usage class. Check Billing/Credits before increasing telemetry, retention, logging, or enabling GuardDuty/Security Hub.

## Still required before calling this production-integrated

1. Trigger one backup using valid administrator authentication or a configured `X-Cron-Secret`; an HTTP `CF-Cron` header is not trusted. Verify the response reports S3 mirror enabled and verify the timestamped object plus AES256 server-side encryption in S3 without exposing content. Preserve the R2 copy.
2. Establish an approved recovery procedure and a separate least-privilege read role before treating S3 as a tested disaster-recovery source.
3. Verify RUM ingestion from a synthetic page view and check that only the aggregate `/app` page ID and expected browser performance/error metadata appear.
4. Replace the Lambda TODO with a versioned, allowlisted handler; inspect queue redrive/visibility and the execution role, then attach an SQS mapping with bounded retries. Add EventBridge publishing only when a real producer is ready.
5. Implement SES sending only when the product purpose, sender address, recipient consent and sandbox/production eligibility are settled.

## Non-negotiable boundaries

- Cloudflare stays edge/origin and DNS. Do not migrate DNS, D1, R2, Durable Objects, the VAPID provider or the sovereign architecture as part of AWS work.
- Never connect Bedrock or Rekognition to private DMs. Do not send decrypted E2EE material to AWS or analytics.
- Never claim a provisioned resource is production-integrated until code, runtime configuration, deployment and a safe end-to-end verification all pass.
