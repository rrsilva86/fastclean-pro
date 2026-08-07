# FastClean Pro Disaster Recovery

## Production Database

FastClean Pro runs on Railway with PostgreSQL as the production database. The current application stores tenant-scoped business records in `app_record_snapshots`, keyed by `tenant_key` and `collection_key`.

Critical collections include customers, appointments, invoices, employees, teams, services, settings, payment methods, audit events, and backup history.

## Native Provider Backups

Railway PostgreSQL should be treated as the first recovery layer. Enable and monitor Railway/PostgreSQL native backups or snapshots whenever available for the production database.

Application-level JSON/ZIP backups do not replace provider-level database recovery.

## FastClean External Backups

FastClean creates encrypted backup packages from tenant-scoped data. Each backup includes:

- `manifest.json`
- customers JSON and CSV
- appointments JSON and CSV
- invoices JSON and CSV
- employees JSON and CSV
- teams JSON and CSV
- settings JSON and CSV
- payment methods JSON and CSV
- audit log JSON and CSV

JSON is the authoritative restore format. CSV files are for human inspection.

## Frequency

Default policy:

- Daily automatic backup at 02:00 in the company timezone.
- Manual backup available from Settings > Backup & Audit.

The initial implementation provides the application endpoint and UI. In Railway, schedule the daily run with a trusted scheduled job that calls the backup endpoint using an authenticated session or an internal admin token.

## Retention

Recommended policy:

- Keep 30 daily backups.
- Keep 12 monthly backups.
- Never delete the newest valid backup.
- Run retention cleanup only after a new backup is created and verified.

## Encryption

Backups are encrypted with AES-256-GCM. Set `BACKUP_ENCRYPTION_KEY` in Railway. Keep the key separate from backup files.

Never email an unencrypted full backup.

## External Storage

Current active fallback storage is encrypted backup storage in PostgreSQL. Production should configure an external S3-compatible target such as Cloudflare R2, AWS S3, or Backblaze B2.

Required planned variables:

- `BACKUP_ENCRYPTION_KEY`
- `BACKUP_STORAGE_PROVIDER`
- `BACKUP_EXTERNAL_PUT_URL`
- `BACKUP_EXTERNAL_AUTH_TOKEN`
- `BACKUP_S3_ENDPOINT`
- `BACKUP_S3_BUCKET`
- `BACKUP_S3_REGION`
- `BACKUP_S3_ACCESS_KEY_ID`
- `BACKUP_S3_SECRET_ACCESS_KEY`

Do not hardcode storage credentials.

## Verification

A backup is valid only when:

- package exists
- manifest exists
- expected JSON files exist
- record counts match exported data
- checksums are recorded
- encrypted package can be produced
- storage write succeeds

Statuses include running, successful, verified, failed, expired, and deleted by retention.

## Download

Download backups from Settings > Backup & Audit > Backups. Downloads are authenticated and audit logged.

Store local copies only in an encrypted local or cloud-synced folder.

## Restore

Restore is high risk.

Flow:

1. Select backup.
2. Review backup details.
3. Type `RESTORE`.
4. The system creates a safety backup first.
5. The restore operation is audited.

For the first implementation, restore is full-tenant oriented. Selective restore can be added later for one customer, appointment, invoice, or employee.

## Total Railway Loss

1. Create a new Railway project.
2. Provision PostgreSQL.
3. Deploy FastClean Pro.
4. Configure environment variables.
5. Upload or access the latest encrypted backup.
6. Restore tenant data.
7. Validate customers, appointments, invoices, employees, teams, settings, and audit events.
8. Reconnect external integrations such as HighLevel.

## Responsibilities

Only trusted administrative users should have:

- `audit.view`
- `audit.export`
- `backup.view`
- `backup.create`
- `backup.download`
- `backup.configure`
- `backup.restore`

Normal employees must not download full customer database backups.

## Secrets

Never include these in backups or documentation:

- plaintext passwords
- session tokens
- HighLevel private tokens
- API secrets
- Stripe secret keys
- payment-card data
- encryption master keys
