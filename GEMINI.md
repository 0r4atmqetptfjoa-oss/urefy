# Instructions for Gemini / Antigravity

Before editing AWS-related code or infrastructure, read [`docs/AWS_SERVICES.md`](docs/AWS_SERVICES.md). It is the source of truth for provisioned resources, current integration status, deployment prerequisites, privacy boundaries and cost-sensitive services.

The AWS programmatic credential is present in the developer's ignored local `.env`; its values are secret. Never print or dump `.env`, expose a credential in logs/screenshots/prompts, or add secrets to tracked files. Use only the narrowly scoped existing credential when the task requires it. Do not rotate, deactivate, broaden or transfer it to another service without the owner's explicit authorization.

Cloudflare remains the DNS, edge, Pages, D1, R2, KV and Durable Objects platform. Preserve the existing sovereign architecture and Cloudflare VAPID push. Never send E2EE keys, decrypted DM content, or private conversation data to AWS services, analytics, logs, queues or backups in plaintext.

AWS S3 integration in `packages/client-ui/functions/api/_aws-s3.ts` mirrors only the already AES-GCM-encrypted backup payload from `cron-backup.ts`. It is disabled unless all AWS runtime variables are configured; local `.env` does not configure Cloudflare Pages Production. Do not claim this is live in production until the runtime secrets are installed, code is deployed, and a backup upload has been verified. See the runbook for exact safe verification steps.
