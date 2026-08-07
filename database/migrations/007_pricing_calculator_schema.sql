create table if not exists pricing_rule_sets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  company_id uuid references companies(id) on delete cascade,
  version text not null,
  name text not null default 'Default pricing rules',
  rules jsonb not null,
  active boolean not null default true,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, version)
);

create table if not exists pricing_calculations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  company_id uuid references companies(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  property_id uuid references properties(id) on delete set null,
  pricing_rule_version text not null,
  status text not null default 'draft',
  property_snapshot jsonb not null default '{}'::jsonb,
  questionnaire_snapshot jsonb not null default '{}'::jsonb,
  service_snapshot jsonb not null default '{}'::jsonb,
  distance_snapshot jsonb not null default '{}'::jsonb,
  calculation_components jsonb not null default '[]'::jsonb,
  estimated_labor_hours numeric(8, 2),
  recommended_price numeric(12, 2) not null default 0,
  final_price numeric(12, 2) not null default 0,
  override_reason text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pricing_quotes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  company_id uuid references companies(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  property_id uuid references properties(id) on delete set null,
  pricing_calculation_id uuid references pricing_calculations(id) on delete set null,
  quote_number text,
  status text not null default 'draft',
  customer_name text,
  service_name text,
  frequency_code text,
  final_price numeric(12, 2) not null default 0,
  pricing_snapshot jsonb not null,
  expires_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, quote_number)
);

create index if not exists idx_pricing_rule_sets_tenant_active on pricing_rule_sets(tenant_id, active);
create index if not exists idx_pricing_calculations_tenant_created_at on pricing_calculations(tenant_id, created_at desc);
create index if not exists idx_pricing_quotes_tenant_status on pricing_quotes(tenant_id, status);
create index if not exists idx_pricing_quotes_tenant_created_at on pricing_quotes(tenant_id, created_at desc);

alter table pricing_rule_sets enable row level security;
alter table pricing_calculations enable row level security;
alter table pricing_quotes enable row level security;

drop policy if exists pricing_rule_sets_isolation on pricing_rule_sets;
drop policy if exists pricing_calculations_isolation on pricing_calculations;
drop policy if exists pricing_quotes_isolation on pricing_quotes;

create policy pricing_rule_sets_isolation on pricing_rule_sets using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());
create policy pricing_calculations_isolation on pricing_calculations using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());
create policy pricing_quotes_isolation on pricing_quotes using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());

drop trigger if exists pricing_rule_sets_set_updated_at on pricing_rule_sets;
drop trigger if exists pricing_calculations_set_updated_at on pricing_calculations;
drop trigger if exists pricing_quotes_set_updated_at on pricing_quotes;

create trigger pricing_rule_sets_set_updated_at before update on pricing_rule_sets for each row execute function set_updated_at();
create trigger pricing_calculations_set_updated_at before update on pricing_calculations for each row execute function set_updated_at();
create trigger pricing_quotes_set_updated_at before update on pricing_quotes for each row execute function set_updated_at();
