import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { normalizeAuditEvent, type AuditEvent } from "@/lib/audit/audit-events";
import { queryPostgres } from "@/lib/db/postgres";

export const runtime = "nodejs";

let schemaReady = false;

async function ensureAuditSchema() {
  if (schemaReady) {
    return;
  }

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
      source text not null default 'app',
      ip_address text,
      user_agent text,
      request_id text,
      created_at timestamptz not null default now()
    )
  `);

  await queryPostgres("create index if not exists idx_audit_events_tenant_created_at on audit_events(tenant_id, created_at desc)");
  await queryPostgres("create index if not exists idx_audit_events_actor_created_at on audit_events(actor_user_id, created_at desc)");
  await queryPostgres("create index if not exists idx_audit_events_entity_created_at on audit_events(entity_type, entity_id, created_at desc)");
  await queryPostgres("create index if not exists idx_audit_events_action_created_at on audit_events(action, created_at desc)");

  schemaReady = true;
}

async function tenantId() {
  const cookieStore = await cookies();
  const session = cookieStore.get("fastclean_session")?.value;
  return session ? decodeURIComponent(session) : "";
}

async function requireTenant() {
  const tenant = await tenantId();
  if (!tenant) {
    return { response: NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 }), tenant: "" };
  }

  return { response: null, tenant };
}

function requestIp(headerStore: Headers) {
  return headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headerStore.get("x-real-ip") ?? undefined;
}

export async function GET(request: Request) {
  try {
    await ensureAuditSchema();
    const auth = await requireTenant();
    if (auth.response) {
      return auth.response;
    }
    const tenant = auth.tenant;
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || 250), 1000);
    const entityType = url.searchParams.get("entityType");
    const entityId = url.searchParams.get("entityId");
    const action = url.searchParams.get("action");
    const search = url.searchParams.get("search");
    const actor = url.searchParams.get("actor");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const values: unknown[] = [tenant];
    const clauses = ["tenant_id = $1"];

    if (entityType) {
      values.push(entityType);
      clauses.push(`entity_type = $${values.length}`);
    }

    if (entityId) {
      values.push(entityId);
      clauses.push(`entity_id = $${values.length}`);
    }

    if (action) {
      values.push(action);
      clauses.push(`action = $${values.length}`);
    }

    if (actor) {
      values.push(`%${actor}%`);
      clauses.push(`coalesce(actor_display_name_snapshot, '') ilike $${values.length}`);
    }

    if (search) {
      values.push(`%${search}%`);
      clauses.push(`(coalesce(change_summary, '') ilike $${values.length} or coalesce(entity_display_name_snapshot, '') ilike $${values.length})`);
    }

    if (from) {
      values.push(from);
      clauses.push(`created_at >= $${values.length}::timestamptz`);
    }

    if (to) {
      values.push(to);
      clauses.push(`created_at <= $${values.length}::timestamptz`);
    }

    values.push(limit);
    const result = await queryPostgres<{
      id: string;
      tenant_id: string;
      company_id: string | null;
      location_id: string | null;
      actor_user_id: string | null;
      actor_display_name_snapshot: string | null;
      actor_role_snapshot: string | null;
      action: AuditEvent["action"];
      entity_type: AuditEvent["entityType"];
      entity_id: string;
      entity_display_name_snapshot: string | null;
      field_name: string | null;
      previous_value: unknown;
      new_value: unknown;
      change_summary: string;
      metadata: Record<string, unknown>;
      source: AuditEvent["source"];
      ip_address: string | null;
      user_agent: string | null;
      request_id: string | null;
      created_at: Date;
    }>(
      `
        select *
        from audit_events
        where ${clauses.join(" and ")}
        order by created_at desc
        limit $${values.length}
      `,
      values
    );

    return NextResponse.json({
      events: result.rows.map((row) => ({
        id: row.id,
        tenantId: row.tenant_id,
        companyId: row.company_id ?? undefined,
        locationId: row.location_id ?? undefined,
        actorUserId: row.actor_user_id ?? undefined,
        actorDisplayNameSnapshot: row.actor_display_name_snapshot ?? undefined,
        actorRoleSnapshot: row.actor_role_snapshot ?? undefined,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        entityDisplayNameSnapshot: row.entity_display_name_snapshot ?? undefined,
        fieldName: row.field_name ?? undefined,
        previousValue: row.previous_value,
        newValue: row.new_value,
        changeSummary: row.change_summary,
        metadata: row.metadata,
        source: row.source,
        ipAddress: row.ip_address ?? undefined,
        userAgent: row.user_agent ?? undefined,
        requestId: row.request_id ?? undefined,
        createdAt: row.created_at.toISOString()
      }))
    });
  } catch (error) {
    return NextResponse.json({ ok: false, reason: error instanceof Error ? error.message : "audit_read_failed" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureAuditSchema();
    const auth = await requireTenant();
    if (auth.response) {
      return auth.response;
    }
    const tenant = auth.tenant;
    const headerStore = await headers();
    const payload = await request.json() as { events?: Partial<AuditEvent>[] };
    const events = Array.isArray(payload.events) ? payload.events.map((event) => normalizeAuditEvent({ ...event, tenantId: tenant } as Partial<AuditEvent> & Pick<AuditEvent, "action" | "entityType" | "entityId" | "changeSummary">)) : [];

    for (const event of events) {
      await queryPostgres(
        `
          insert into audit_events (
            id, tenant_id, company_id, location_id, actor_user_id, actor_display_name_snapshot, actor_role_snapshot,
            action, entity_type, entity_id, entity_display_name_snapshot, field_name, previous_value, new_value,
            change_summary, metadata, source, ip_address, user_agent, request_id, created_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb, $15, $16::jsonb, $17, $18, $19, $20, $21::timestamptz)
          on conflict (id) do nothing
        `,
        [
          event.id,
          event.tenantId,
          event.companyId ?? null,
          event.locationId ?? null,
          event.actorUserId ?? null,
          event.actorDisplayNameSnapshot ?? null,
          event.actorRoleSnapshot ?? null,
          event.action,
          event.entityType,
          event.entityId,
          event.entityDisplayNameSnapshot ?? null,
          event.fieldName ?? null,
          JSON.stringify(event.previousValue ?? null),
          JSON.stringify(event.newValue ?? null),
          event.changeSummary,
          JSON.stringify(event.metadata ?? {}),
          event.source,
          requestIp(headerStore),
          headerStore.get("user-agent") ?? null,
          event.requestId ?? null,
          event.createdAt
        ]
      );
    }

    return NextResponse.json({ ok: true, count: events.length });
  } catch (error) {
    return NextResponse.json({ ok: false, reason: error instanceof Error ? error.message : "audit_write_failed" }, { status: 503 });
  }
}
