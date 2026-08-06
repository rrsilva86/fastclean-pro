alter table clients
  add column if not exists external_id text,
  add column if not exists customer_type text not null default 'residential',
  add column if not exists display_name text,
  add column if not exists primary_phone text,
  add column if not exists secondary_phone text,
  add column if not exists original_phone text,
  add column if not exists preferred_contact_method text default 'phone',
  add column if not exists sms_consent boolean not null default false,
  add column if not exists marketing_consent boolean not null default false,
  add column if not exists contact_notes text,
  add column if not exists customer_rating numeric(3, 2),
  add column if not exists rating_notes text,
  add column if not exists rating_updated_at date,
  add column if not exists preferred_day text,
  add column if not exists preferred_time_window text,
  add column if not exists default_service_type text,
  add column if not exists default_team_id uuid references teams(id) on delete set null,
  add column if not exists special_instructions text,
  add column if not exists company_contact_person text,
  add column if not exists company_phone text,
  add column if not exists company_email text,
  add column if not exists tax_exempt boolean not null default false,
  add column if not exists company_notes text,
  add column if not exists import_batch_id uuid,
  add column if not exists imported_at timestamptz,
  add column if not exists imported_by uuid references users(id) on delete set null,
  add column if not exists original_row_number integer,
  add column if not exists import_warnings jsonb not null default '[]'::jsonb;

create table if not exists client_service_addresses (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  label text,
  address_line_1 text,
  address_line_2 text,
  city text,
  service_area text,
  state text,
  postal_code text,
  country text not null default 'United States',
  access_instructions text,
  gate_code text,
  parking_instructions text,
  internal_property_notes text,
  formatted_address text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  is_primary boolean not null default false,
  is_active boolean not null default true,
  verified_online boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists customer_import_batches (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  original_filename text not null,
  worksheet_name text,
  imported_by uuid references users(id) on delete set null,
  imported_at timestamptz not null default now(),
  total_rows integer not null default 0,
  created_count integer not null default 0,
  updated_count integer not null default 0,
  merged_count integer not null default 0,
  skipped_count integer not null default 0,
  failed_count integer not null default 0,
  status text not null default 'pending',
  settings jsonb not null default '{}'::jsonb,
  warning_report jsonb not null default '[]'::jsonb,
  error_report jsonb not null default '[]'::jsonb
);

create table if not exists customer_import_rows (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  batch_id uuid not null references customer_import_batches(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  original_row_number integer,
  source_payload jsonb not null default '{}'::jsonb,
  normalized_payload jsonb not null default '{}'::jsonb,
  validation_status text not null,
  duplicate_decision text,
  warnings jsonb not null default '[]'::jsonb,
  errors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_clients_external_id_tenant on clients(tenant_id, company_id, external_id);
create index if not exists idx_clients_primary_phone_tenant on clients(tenant_id, company_id, primary_phone);
create index if not exists idx_client_service_addresses_tenant_client on client_service_addresses(tenant_id, client_id);
create index if not exists idx_customer_import_batches_tenant_company on customer_import_batches(tenant_id, company_id);
create index if not exists idx_customer_import_rows_batch on customer_import_rows(batch_id);

alter table client_service_addresses enable row level security;
alter table customer_import_batches enable row level security;
alter table customer_import_rows enable row level security;

drop policy if exists client_service_addresses_isolation on client_service_addresses;
create policy client_service_addresses_isolation on client_service_addresses using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());

drop policy if exists customer_import_batches_isolation on customer_import_batches;
create policy customer_import_batches_isolation on customer_import_batches using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());

drop policy if exists customer_import_rows_isolation on customer_import_rows;
create policy customer_import_rows_isolation on customer_import_rows using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());

insert into permissions (code, description) values
  ('customers.import', 'Import customers'),
  ('customers.export', 'Export customers'),
  ('customers.merge', 'Merge imported customer duplicates'),
  ('customers.manage_import_history', 'Manage customer import history')
on conflict (code) do nothing;
