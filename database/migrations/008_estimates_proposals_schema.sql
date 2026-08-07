alter type estimate_status add value if not exists 'viewed';
alter type estimate_status add value if not exists 'expired';
alter type estimate_status add value if not exists 'converted';
alter type estimate_status add value if not exists 'void';

alter table estimates
  add column if not exists public_token text,
  add column if not exists revision_number integer not null default 1,
  add column if not exists previous_revision_id uuid references estimates(id) on delete set null,
  add column if not exists expiration_date date,
  add column if not exists source text not null default 'manual',
  add column if not exists service_name text,
  add column if not exists frequency text,
  add column if not exists service_address text,
  add column if not exists line_items jsonb not null default '[]'::jsonb,
  add column if not exists pricing_calculation_id uuid references pricing_calculations(id) on delete set null,
  add column if not exists pricing_rule_version text,
  add column if not exists pricing_snapshot jsonb,
  add column if not exists recommended_price numeric(12, 2),
  add column if not exists final_price numeric(12, 2),
  add column if not exists estimated_labor_hours numeric(8, 2),
  add column if not exists override_reason text,
  add column if not exists assigned_user_id uuid references users(id) on delete set null,
  add column if not exists first_viewed_at timestamptz,
  add column if not exists last_viewed_at timestamptz,
  add column if not exists view_count integer not null default 0,
  add column if not exists rejected_at timestamptz,
  add column if not exists decline_reason text,
  add column if not exists converted_appointment_id uuid references appointments(id) on delete set null,
  add column if not exists voided_at timestamptz,
  add column if not exists void_reason text,
  add column if not exists modified_after_send boolean not null default false,
  add column if not exists communications jsonb not null default '[]'::jsonb,
  add column if not exists activity jsonb not null default '[]'::jsonb;

create unique index if not exists idx_estimates_tenant_public_token on estimates(tenant_id, public_token) where public_token is not null;
create index if not exists idx_estimates_tenant_status on estimates(tenant_id, status);
create index if not exists idx_estimates_tenant_expiration on estimates(tenant_id, expiration_date);
create index if not exists idx_estimates_client_created_at on estimates(client_id, created_at desc);

create table if not exists estimate_revisions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  estimate_id uuid not null references estimates(id) on delete cascade,
  revision_number integer not null,
  snapshot jsonb not null,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (tenant_id, estimate_id, revision_number)
);

alter table estimate_revisions enable row level security;

drop policy if exists estimate_revisions_isolation on estimate_revisions;
create policy estimate_revisions_isolation on estimate_revisions using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());

create index if not exists idx_estimate_revisions_estimate on estimate_revisions(estimate_id, revision_number desc);
