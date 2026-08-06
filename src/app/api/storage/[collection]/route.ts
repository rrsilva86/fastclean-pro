import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { queryPostgres } from "@/lib/db/postgres";

export const runtime = "nodejs";

const allowedCollections = new Set([
  "fastclean_clients",
  "fastclean_appointments",
  "fastclean_employees",
  "fastclean_teams",
  "fastclean_import_history",
  "fastclean_auth_password_overrides",
  "fastclean_auth_email_overrides"
]);

let schemaReady = false;

async function ensureStorageSchema() {
  if (schemaReady) {
    return;
  }

  await queryPostgres(`
    create table if not exists app_record_snapshots (
      tenant_key text not null,
      collection_key text not null,
      records jsonb not null default '[]'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      primary key (tenant_key, collection_key)
    )
  `);

  schemaReady = true;
}

async function getTenantKey(collection: string) {
  if (collection === "fastclean_auth_password_overrides" || collection === "fastclean_auth_email_overrides") {
    return "platform_auth";
  }

  const cookieStore = await cookies();
  return decodeURIComponent(cookieStore.get("fastclean_session")?.value ?? "tenant_raisa_cleaning");
}

function validateCollection(collection: string) {
  if (!allowedCollections.has(collection)) {
    return NextResponse.json({ ok: false, reason: "unsupported_collection" }, { status: 404 });
  }

  return null;
}

export async function GET(_: Request, context: { params: Promise<{ collection: string }> }) {
  const { collection } = await context.params;
  const invalidResponse = validateCollection(collection);

  if (invalidResponse) {
    return invalidResponse;
  }

  try {
    await ensureStorageSchema();
    const tenantKey = await getTenantKey(collection);
    const result = await queryPostgres<{ records: unknown[] }>(
      "select records from app_record_snapshots where tenant_key = $1 and collection_key = $2",
      [tenantKey, collection]
    );

    return NextResponse.json({ ok: true, records: result.rows[0]?.records ?? [] });
  } catch (error) {
    return NextResponse.json({ ok: false, reason: error instanceof Error ? error.message : "storage_read_failed" }, { status: 503 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ collection: string }> }) {
  const { collection } = await context.params;
  const invalidResponse = validateCollection(collection);

  if (invalidResponse) {
    return invalidResponse;
  }

  try {
    const payload = await request.json() as { records?: unknown };
    const records = Array.isArray(payload.records) ? payload.records : [];

    await ensureStorageSchema();
    const tenantKey = await getTenantKey(collection);
    await queryPostgres(
      `
        insert into app_record_snapshots (tenant_key, collection_key, records, updated_at)
        values ($1, $2, $3::jsonb, now())
        on conflict (tenant_key, collection_key)
        do update set records = excluded.records, updated_at = now()
      `,
      [tenantKey, collection, JSON.stringify(records)]
    );

    return NextResponse.json({ ok: true, savedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ ok: false, reason: error instanceof Error ? error.message : "storage_write_failed" }, { status: 503 });
  }
}
