alter table clients
  add column if not exists highlevel_contact_id text,
  add column if not exists highlevel_synced_at timestamptz,
  add column if not exists highlevel_sync_status text,
  add column if not exists highlevel_sync_warning text;

create table if not exists highlevel_webhook_events (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  company_id uuid references companies(id) on delete cascade,
  location_id uuid references locations(id) on delete cascade,
  provider_webhook_id text not null,
  highlevel_location_id text,
  event_type text,
  signature_provider text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_status text not null default 'received',
  payload jsonb,
  unique (tenant_id, provider_webhook_id)
);

create index if not exists idx_clients_highlevel_contact on clients(tenant_id, company_id, highlevel_contact_id);
create index if not exists idx_highlevel_webhook_events_tenant on highlevel_webhook_events(tenant_id, provider_webhook_id);

alter table highlevel_webhook_events enable row level security;

drop policy if exists highlevel_webhook_events_isolation on highlevel_webhook_events;
create policy highlevel_webhook_events_isolation on highlevel_webhook_events using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());
