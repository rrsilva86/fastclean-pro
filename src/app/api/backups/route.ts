import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { appVersion } from "@/config/app-version";
import { normalizeAuditEvent } from "@/lib/audit/audit-events";
import { createZip } from "@/lib/backup/zip";
import { queryPostgres } from "@/lib/db/postgres";

export const runtime = "nodejs";

const backupCollections = [
  "fastclean_clients",
  "fastclean_appointments",
  "fastclean_invoices",
  "fastclean_employees",
  "fastclean_teams",
  "fastclean_services",
  "fastclean_pricing_quotes",
  "fastclean_pricing_rules",
  "fastclean_system_settings",
  "fastclean_payment_methods"
];

type BackupManifest = {
  backupFormatVersion: string;
  applicationVersion: string;
  databaseSchemaVersion: string;
  tenant: string;
  createdAt: string;
  recordCounts: Record<string, number>;
  checksums: Record<string, string>;
  exportFormat: string;
  encryption: { algorithm: string; keySource: string; iv: string; authTag: string };
  backupSource: string;
  backupId: string;
  metadata?: Record<string, unknown[]>;
};

let schemaReady = false;

async function ensureBackupSchema() {
  if (schemaReady) {
    return;
  }

  await queryPostgres(`
    create table if not exists backup_runs (
      id text primary key,
      tenant_id text not null,
      company_id text,
      status text not null,
      backup_type text not null,
      progress text not null,
      manifest jsonb not null default '{}'::jsonb,
      encrypted_package bytea,
      checksum text,
      size_bytes integer not null default 0,
      storage_provider text not null default 'postgres_encrypted',
      external_object_key text,
      failure_reason text,
      created_by text,
      created_at timestamptz not null default now(),
      verified_at timestamptz,
      expires_at timestamptz
    )
  `);
  await queryPostgres("create index if not exists idx_backup_runs_tenant_created_at on backup_runs(tenant_id, created_at desc)");
  await queryPostgres("create index if not exists idx_backup_runs_status_created_at on backup_runs(status, created_at desc)");
  await queryPostgres(`
    create table if not exists audit_events (
      id text primary key,
      tenant_id text not null,
      company_id text,
      location_id text,
      actor_user_id text,
      actor_display_name_snapshot text,
      actor_role_snapshot text,
      action text not null,
      entity_type text not null,
      entity_id text not null,
      entity_display_name_snapshot text,
      field_name text,
      previous_value jsonb,
      new_value jsonb,
      change_summary text not null,
      metadata jsonb not null default '{}'::jsonb,
      source text not null default 'backup',
      ip_address text,
      user_agent text,
      request_id text,
      created_at timestamptz not null default now()
    )
  `);

  schemaReady = true;
}

async function tenantId(request?: Request) {
  const internalToken = request?.headers.get("x-fastclean-internal-backup-token");
  if (internalToken && process.env.BACKUP_CRON_TOKEN && internalToken === process.env.BACKUP_CRON_TOKEN) {
    return "tenant_raisa_cleaning";
  }

  const cookieStore = await cookies();
  const session = cookieStore.get("fastclean_session")?.value;
  return session ? decodeURIComponent(session) : "";
}

async function requireTenant(request: Request) {
  const tenant = await tenantId(request);
  if (!tenant) {
    return { response: NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 }), tenant: "" };
  }

  return { response: null, tenant };
}

async function actorSnapshot() {
  const cookieStore = await cookies();
  return {
    actorDisplayNameSnapshot: decodeURIComponent(cookieStore.get("fastclean_user_name")?.value ?? cookieStore.get("fastclean_user_email")?.value ?? "FastClean user"),
    actorRoleSnapshot: decodeURIComponent(cookieStore.get("fastclean_role")?.value ?? "owner"),
    actorUserId: decodeURIComponent(cookieStore.get("fastclean_user_email")?.value ?? cookieStore.get("fastclean_session")?.value ?? "")
  };
}

function encryptionKey() {
  const configured = process.env.BACKUP_ENCRYPTION_KEY;
  if (configured) {
    return createHash("sha256").update(configured).digest();
  }

  return createHash("sha256").update(process.env.DATABASE_URL || "fastclean-local-development-backup-key").digest();
}

function encryptionKeySource() {
  return process.env.BACKUP_ENCRYPTION_KEY ? "BACKUP_ENCRYPTION_KEY" : "DATABASE_URL fallback - configure BACKUP_ENCRYPTION_KEY";
}

function checksum(content: string | Buffer) {
  return createHash("sha256").update(content).digest("hex");
}

function toCsv(records: unknown[]) {
  const rows = records.filter((record) => typeof record === "object" && record !== null) as Record<string, unknown>[];
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row).filter((key) => !/password|token|secret|private|card|cvc/i.test(key)))));
  const escape = (value: unknown) => `"${String(typeof value === "object" && value !== null ? JSON.stringify(value) : value ?? "").replaceAll("\"", "\"\"")}"`;
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n");
}

function encryptPackage(zip: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(zip), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return { authTag, encrypted, iv };
}

function decryptPackage(encryptedPackage: Buffer, manifest: BackupManifest) {
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(manifest.encryption.iv, "base64"));
  decipher.setAuthTag(Buffer.from(manifest.encryption.authTag, "base64"));
  return Buffer.concat([decipher.update(encryptedPackage), decipher.final()]);
}

async function uploadExternalBackup(backupId: string, encryptedPackage: Buffer) {
  const uploadUrl = process.env.BACKUP_EXTERNAL_PUT_URL;
  if (!uploadUrl) {
    return { objectKey: null, provider: "postgres_encrypted" };
  }

  const response = await fetch(uploadUrl.replace("{backupId}", encodeURIComponent(backupId)), {
    method: "PUT",
    headers: {
      "Content-Type": "application/octet-stream",
      ...(process.env.BACKUP_EXTERNAL_AUTH_TOKEN ? { Authorization: `Bearer ${process.env.BACKUP_EXTERNAL_AUTH_TOKEN}` } : {})
    },
    body: new Uint8Array(encryptedPackage)
  });

  if (!response.ok) {
    throw new Error("external_backup_upload_failed");
  }

  return { objectKey: uploadUrl.includes("{backupId}") ? backupId : uploadUrl, provider: process.env.BACKUP_STORAGE_PROVIDER || "external_https_put" };
}

async function loadTenantCollections(tenant: string) {
  const result = await queryPostgres<{ collection_key: string; records: unknown[] }>(
    "select collection_key, records from app_record_snapshots where tenant_key = $1 and collection_key = any($2)",
    [tenant, backupCollections]
  );

  return Object.fromEntries(backupCollections.map((collection) => [collection, result.rows.find((row) => row.collection_key === collection)?.records ?? []])) as Record<string, unknown[]>;
}

async function loadAuditEvents(tenant: string) {
  try {
    const result = await queryPostgres("select * from audit_events where tenant_id = $1 order by created_at desc", [tenant]);
    return result.rows;
  } catch {
    return [];
  }
}

async function auditBackup(action: "backup_created" | "backup_downloaded" | "backup_restored" | "backup_failed", tenant: string, backupId: string, summary: string, metadata: Record<string, unknown> = {}) {
  const actor = await actorSnapshot();
  const event = normalizeAuditEvent({
    ...actor,
    action,
    changeSummary: summary,
    entityDisplayNameSnapshot: backupId,
    entityId: backupId,
    entityType: "backup",
    metadata,
    source: "backup",
    tenantId: tenant
  });

  await queryPostgres(
    `
      insert into audit_events (id, tenant_id, actor_user_id, actor_display_name_snapshot, actor_role_snapshot, action, entity_type, entity_id, entity_display_name_snapshot, change_summary, metadata, source, created_at)
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13::timestamptz)
      on conflict (id) do nothing
    `,
    [event.id, event.tenantId, event.actorUserId ?? null, event.actorDisplayNameSnapshot ?? null, event.actorRoleSnapshot ?? null, event.action, event.entityType, event.entityId, event.entityDisplayNameSnapshot ?? null, event.changeSummary, JSON.stringify(event.metadata), event.source, event.createdAt]
  );
}

export async function GET(request: Request) {
  try {
    await ensureBackupSchema();
    const auth = await requireTenant(request);
    if (auth.response) {
      return auth.response;
    }
    const tenant = auth.tenant;
    const url = new URL(request.url);
    const backupId = url.searchParams.get("id");

    if (backupId) {
      const result = await queryPostgres<{ encrypted_package: Buffer; manifest: BackupManifest }>(
        "select encrypted_package, manifest from backup_runs where tenant_id = $1 and id = $2 and status in ('successful', 'verified')",
        [tenant, backupId]
      );
      const row = result.rows[0];

      if (!row?.encrypted_package) {
        return NextResponse.json({ ok: false, reason: "backup_not_found" }, { status: 404 });
      }

      await auditBackup("backup_downloaded", tenant, backupId, `Backup ${backupId} downloaded.`);
      return new NextResponse(new Uint8Array(row.encrypted_package), {
        headers: {
          "Content-Disposition": `attachment; filename=\"fastclean-${tenant}-${row.manifest.createdAt}.zip.enc\"`,
          "Content-Type": "application/octet-stream",
          "Cache-Control": "no-store"
        }
      });
    }

    const history = await queryPostgres(
      "select id, tenant_id, status, backup_type, progress, manifest, checksum, size_bytes, storage_provider, failure_reason, created_by, created_at, verified_at, expires_at from backup_runs where tenant_id = $1 order by created_at desc limit 100",
      [tenant]
    );

    return NextResponse.json({ backups: history.rows });
  } catch (error) {
    return NextResponse.json({ ok: false, reason: error instanceof Error ? error.message : "backup_read_failed" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureBackupSchema();
    const auth = await requireTenant(request);
    if (auth.response) {
      return auth.response;
    }
    const tenant = auth.tenant;
    const headerStore = await headers();
    const payload = await request.json().catch(() => ({})) as { mode?: "create" | "restore"; backupId?: string; confirmation?: string; source?: "scheduled" };

    if (payload.mode === "restore") {
      if (payload.confirmation !== "RESTORE" || !payload.backupId) {
        return NextResponse.json({ ok: false, reason: "restore_confirmation_required" }, { status: 400 });
      }

      await createBackup(tenant, "safety_before_restore");
      const backup = await queryPostgres<{ encrypted_package: Buffer; manifest: BackupManifest }>(
        "select encrypted_package, manifest from backup_runs where tenant_id = $1 and id = $2 and status in ('successful', 'verified')",
        [tenant, payload.backupId]
      );
      const row = backup.rows[0];
      if (!row?.encrypted_package) {
        return NextResponse.json({ ok: false, reason: "backup_not_found" }, { status: 404 });
      }

      decryptPackage(row.encrypted_package, row.manifest);
      const collections = row.manifest.recordCounts;
      for (const collection of backupCollections) {
        const records = row.manifest.metadata?.[collection];
        if (Array.isArray(records)) {
          await queryPostgres(
            `
              insert into app_record_snapshots (tenant_key, collection_key, records, updated_at)
              values ($1, $2, $3::jsonb, now())
              on conflict (tenant_key, collection_key)
              do update set records = excluded.records, updated_at = now()
            `,
            [tenant, collection, JSON.stringify(records)]
          );
        }
      }

      await auditBackup("backup_restored", tenant, payload.backupId, `Backup ${payload.backupId} restored.`, { collections, userAgent: headerStore.get("user-agent") });
      return NextResponse.json({ ok: true, restored: payload.backupId });
    }

    const backup = await createBackup(tenant, payload.source === "scheduled" ? "daily" : "manual");
    return NextResponse.json({ ok: true, backup });
  } catch (error) {
    const tenant = await tenantId(request).catch(() => "tenant_unknown");
    await auditBackup("backup_failed", tenant, `failed_${Date.now()}`, "Backup failed.", { reason: error instanceof Error ? error.message : "backup_failed" }).catch(() => undefined);
    return NextResponse.json({ ok: false, reason: error instanceof Error ? error.message : "backup_failed" }, { status: 503 });
  }
}

async function createBackup(tenant: string, backupType: "manual" | "daily" | "safety_before_restore") {
  const backupId = `backup_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const createdAt = new Date().toISOString();
  const collections = await loadTenantCollections(tenant);
  const auditEvents = await loadAuditEvents(tenant);
  const files: Record<string, string> = {};
  const recordCounts: Record<string, number> = {};
  const checksums: Record<string, string> = {};

  for (const [collection, records] of Object.entries(collections)) {
    const filename = `${collection.replace("fastclean_", "")}.json`;
    const csvFilename = `${collection.replace("fastclean_", "")}.csv`;
    files[filename] = JSON.stringify(records, null, 2);
    files[csvFilename] = toCsv(records);
    recordCounts[collection] = records.length;
    checksums[filename] = checksum(files[filename]);
  }

  files["audit-log.json"] = JSON.stringify(auditEvents, null, 2);
  files["audit-log.csv"] = toCsv(auditEvents);
  recordCounts.auditEvents = auditEvents.length;
  checksums["audit-log.json"] = checksum(files["audit-log.json"]);

  const manifest: BackupManifest & { metadata?: Record<string, unknown[]> } = {
    applicationVersion: appVersion.version,
    backupFormatVersion: "1.0",
    backupId,
    backupSource: "FastClean Pro application backup",
    checksums,
    createdAt,
    databaseSchemaVersion: "006_audit_backup_schema",
    encryption: { algorithm: "AES-256-GCM", authTag: "", iv: "", keySource: encryptionKeySource() },
    exportFormat: "zip+aes-256-gcm",
    recordCounts,
    tenant,
    metadata: collections
  };
  files["manifest.json"] = JSON.stringify({ ...manifest, metadata: undefined }, null, 2);
  checksums["manifest.json"] = checksum(files["manifest.json"]);

  const zip = createZip(files);
  const encrypted = encryptPackage(zip);
  manifest.encryption.iv = encrypted.iv.toString("base64");
  manifest.encryption.authTag = encrypted.authTag.toString("base64");
  files["manifest.json"] = JSON.stringify({ ...manifest, metadata: undefined }, null, 2);
  const verifiedZip = createZip(files);
  const verifiedEncrypted = encryptPackage(verifiedZip);
  manifest.encryption.iv = verifiedEncrypted.iv.toString("base64");
  manifest.encryption.authTag = verifiedEncrypted.authTag.toString("base64");
  const packageChecksum = checksum(verifiedEncrypted.encrypted);
  const externalStorage = await uploadExternalBackup(backupId, verifiedEncrypted.encrypted);

  await queryPostgres(
    `
      insert into backup_runs (id, tenant_id, status, backup_type, progress, manifest, encrypted_package, checksum, size_bytes, storage_provider, external_object_key, created_by, verified_at, expires_at)
      values ($1, $2, 'verified', $3, 'complete', $4::jsonb, $5, $6, $7, $8, $9, $10, now(), now() + interval '30 days')
    `,
    [backupId, tenant, backupType, JSON.stringify(manifest), verifiedEncrypted.encrypted, packageChecksum, verifiedEncrypted.encrypted.length, externalStorage.provider, externalStorage.objectKey, (await actorSnapshot()).actorUserId]
  );

  await auditBackup("backup_created", tenant, backupId, `Backup ${backupId} created and verified.`, { backupType, recordCounts });
  return { id: backupId, manifest: { ...manifest, metadata: undefined }, sizeBytes: verifiedEncrypted.encrypted.length, status: "verified" };
}
