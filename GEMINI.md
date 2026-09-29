# Instructions for Gemini / Antigravity

Before editing AWS-related code or infrastructure, read [`docs/AWS_SERVICES.md`](docs/AWS_SERVICES.md). It is the source of truth for provisioned resources, current integration status, deployment prerequisites, privacy boundaries and cost-sensitive services.

The AWS programmatic credential is present in the developer's ignored local `.env`; its values are secret. Never print or dump `.env`, expose a credential in logs/screenshots/prompts, or add secrets to tracked files. Use only the narrowly scoped existing credential when the task requires it. Do not rotate, deactivate, broaden or transfer it to another service without the owner's explicit authorization.

Cloudflare remains the DNS, edge, Pages, D1, R2, KV and Durable Objects platform. Preserve the existing sovereign architecture and Cloudflare VAPID push. Never send E2EE keys, decrypted DM content, or private conversation data to AWS services, analytics, logs, queues or backups in plaintext.

AWS S3 integration in `packages/client-ui/functions/api/_aws-s3.ts` mirrors only the already AES-GCM-encrypted backup payload from `cron-backup.ts`. The code and encrypted runtime credentials are live in Pages deployment `ce3baca0`; the read-only status route reports `IDLE` and no S3 object has been tested. CloudWatch RUM is integrated at 10% sampling with cookies off, resource URLs excluded, only performance/errors telemetry, and a fixed aggregate page ID (`/app`) so profile handles are not recorded. The endpoint no longer trusts a spoofable `CF-Cron` HTTP header. Trigger a backup only with valid admin auth or a configured cron secret; see the runbook for verification steps.
