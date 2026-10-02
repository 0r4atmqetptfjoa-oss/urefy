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

## Live recovery evidence

- Fix commit: `1670da8`. Cloudflare Pages production deployment: `https://832ac8e3.aetheris-omni-sphere.pages.dev`, serving `https://urefy.com`. Deployment exited successfully; existing static assets were unchanged.
- Existing operator backup command completed successfully in 4,577 ms. Full encrypted backup timestamp: `2026-10-02T04:31:43.234Z`; 48 tables, 34,260 records, two R2 media objects (47,944 bytes), two encrypted parts (2,014,176 bytes total), with R2 and S3 destinations confirmed by the endpoint result. Manifest SHA-256: `7212107ec13cc3d4e73845692fc3c7ae5c0d10e3d1ce69528a64de2b1c684b0c`.
- Existing SQS DLQ redrive to the source queue, at one message per second, completed at 100% with UI status **Successfully completed**. Task ID: `1a9029ca-e77d-4681-a0aa-143208c83c81`. The two failed backup jobs were preserved and replayed, without purge or deletion.
- CloudWatch stream `2026/10/02/[$LATEST]cff622189a3d42dcb4a0427e7df410a4` confirms two successful backup invocations: `processed:1, backupJobs:1` at 04:33:14.996 and 04:33:21.535 UTC. Durations were 6,614 and 3,565 ms; no error was observed in these invocations.
- The operator healthcheck was processed at 04:33:17.234 UTC, with `processed:1, backupJobs:0`; its emitted `BackupAgeSeconds` was 5. This proves processing, rather than just SQS acceptance.
- Refreshed SQS table: both main queue and DLQ have **zero available and zero in-flight messages**.
- Public durable status at 04:38:04 UTC confirms full backup success and timestamp `2026-10-02T04:33:18.528Z`, 48 tables, 34,260 records and two media objects. SHA-256: `c06790b1913e115e440034b13764faa564d2e8684767ac7034e25fef3ca3b1e6`.
- Alarm state snapshot after recovery: worker Errors **OK**; full-backup-stale and DLQ alarms still **ALARM** pending their metric evaluation. Freshness uses Maximum over one hour; DLQ uses a five-minute period. A new good sample and empty queues do not instantly replace older samples in those windows. Alarm thresholds, missing-data behavior and notification actions were not modified; all alarms returning to OK is not yet proven by this snapshot.

Evidence is saved under `outputs/aws/incident-2026-10-02-*`: typecheck/build/deploy logs, actual backup verification, recovery log, final public status, redrive completion and empty-queue screenshots. No restore/decryption drill was performed, so these checks confirm capture and processing, not a proven disaster recovery restore.

## Remaining bounds

16 MiB allocated D1, 12 MiB serialized database/manifest, 20,000 rows per table, 100 tables, 200 media objects, 128 MiB media and 4 MiB encrypted parts. Growth beyond these bounds needs a resumable backup design. Lambda memory stayed at the existing 128 MB; timeout stayed 30 seconds. No physical recovery drill is performed during incident triage.
