# UREfy backup incident — 2 October 2026

## Observed production state

- Operator email: Lambda Errors alarm entered ALARM at 2026-10-02 01:16:31 UTC (04:16:31 Europe/Bucharest).
- AWS Console account 579505322330, Frankfurt: worker Errors alarm had returned to OK at 01:39:31 UTC, but full-backup freshness and nonempty DLQ alarms remained ALARM. OK on Errors alone does not prove recovery.
- CloudWatch log stream `2026/10/02/[$LATEST]c87dbca780054e44b7ff671833e01f05`: scheduled backup failed five times, at 01:15, 01:18, 01:21, 01:24 and 01:27 UTC, with `BACKUP_JOB_FAILED`. Each attempt finished in 1.5–4.1 seconds; no Lambda timeout was observed.
- Public durable status at 04:25 UTC: legacy backup timestamp 2026-10-02T01:27:24.858Z, but full backup timestamp still 2026-09-30T06:42:41.413Z. Legacy creation precedes the full capture, so its fresh timestamp does not certify full backup completion.
- Read-only D1 metadata/query: 13,520,896 allocated bytes, 48 application tables, zero virtual tables; query reported changes=0, rows_written=0, changed_db=false.
- Full capture rejected any allocated D1 database above 12 MiB (12,582,912 bytes), before table capture. This deterministic guard rejects the current database. Worker logs collapse endpoint failures into `BACKUP_JOB_FAILED`, so they do not independently expose the endpoint error code.

## Repair

Separate the bounded allocation budget (16 MiB) from the existing serialized database/manifest budget (12 MiB). SQLite allocation includes indexes and space beyond exported rows. The JSON cap, table/row/media limits, encryption, commit-last pointer and S3 requirements remain enforced. This restores headroom for the observed database; it is not a resumable or unlimited backup implementation. The [D1 result documentation](https://developers.cloudflare.com/d1/worker-api/return-object/) defines `size_after` as database size, rather than exported JSON size.

Only backend code/operational metadata are changed. No users, posts, comments, schema migrations, live restore, key rotation, IAM expansion, alarm suppression or new AWS resources. Existing backup execution reads production data and writes encrypted archives to the already configured destinations.

## Validation

- `npm run typecheck`: passed.
- `npm run build --workspace=packages/client-ui`: passed, including Functions compilation.
- No test suites added or run.
- Production deployment, actual full backup result, queue recovery and final alarms will be recorded below after verification.

## Remaining bounds

16 MiB allocated D1, 12 MiB serialized database/manifest, 20,000 rows per table, 100 tables, 200 media objects, 128 MiB media and 4 MiB encrypted parts. Growth beyond these bounds needs a resumable backup design. Lambda memory stayed at the existing 128 MB; timeout stayed 30 seconds. No physical recovery drill is performed during incident triage.
