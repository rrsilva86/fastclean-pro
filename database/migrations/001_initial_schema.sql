create extension if not exists "uuid-ossp";

create type tenant_status as enum ('trial', 'active', 'past_due', 'suspended');
create type subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'paused');
create type user_status as enum ('invited', 'active', 'inactive');
create type lead_status as enum ('new', 'contacted', 'estimate_sent', 'follow_up', 'won', 'lost');
create type estimate_status as enum ('draft', 'sent', 'accepted', 'rejected');
create type appointment_status as enum ('scheduled', 'on_the_way', 'started', 'finished', 'invoice_sent', 'paid', 'canceled');
create type invoice_status as enum ('draft', 'sent', 'paid', 'overdue', 'canceled');
create type payment_method as enum ('cash', 'check', 'zelle', 'credit_card', 'ach', 'other');
create type payroll_method as enum ('fixed_per_house', 'percentage_per_house', 'hourly_rate');
create type payroll_status as enum ('pending', 'approved', 'paid');
create type message_channel as enum ('sms', 'whatsapp', 'email');
create type document_owner_type as enum ('tenant', 'company', 'location', 'client', 'employee');

create or replace function app_current_tenant_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.current_tenant_id', true), '')::uuid
$$;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table tenants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  status tenant_status not null default 'trial',
  default_locale text not null default 'en',
  timezone text not null default 'America/New_York',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table companies (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  legal_name text,
  email text,
  phone text,
  tax_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table locations (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  address_line_1 text,
  address_line_2 text,
  city text,
  state text,
  postal_code text,
  country text not null default 'US',
  timezone text not null default 'America/New_York',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, company_id, name)
);

create table feature_modules (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table subscription_plans (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  name text not null,
  max_companies integer,
  max_locations integer,
  max_users integer,
  max_active_clients integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table subscription_plan_modules (
  plan_id uuid not null references subscription_plans(id) on delete cascade,
  module_id uuid not null references feature_modules(id) on delete cascade,
  primary key (plan_id, module_id)
);

create table tenant_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  plan_id uuid not null references subscription_plans(id),
  stripe_customer_id text,
  stripe_subscription_id text,
  status subscription_status not null default 'trialing',
  current_period_starts_at timestamptz,
  current_period_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table feature_flags (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references tenants(id) on delete cascade,
  module_id uuid references feature_modules(id) on delete cascade,
  code text not null,
  enabled boolean not null default false,
  config jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create table users (
  id uuid primary key default uuid_generate_v4(),
  auth_provider_id text unique,
  name text not null,
  email text not null unique,
  preferred_locale text not null default 'en',
  status user_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table roles (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references tenants(id) on delete cascade,
  code text not null,
  name text not null,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create table permissions (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table memberships (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  company_id uuid references companies(id) on delete cascade,
  location_id uuid references locations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role_id uuid not null references roles(id),
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id, company_id, location_id)
);

create table clients (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  location_id uuid references locations(id) on delete set null,
  first_name text not null,
  last_name text not null,
  company_name text,
  mobile_phone text,
  email text,
  address_line_1 text,
  address_line_2 text,
  city text,
  state text,
  postal_code text,
  cleaning_frequency text,
  cleaning_type text,
  cleaning_price numeric(12, 2),
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table client_security_codes (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  label text not null,
  encrypted_value text not null,
  visible_to_permissions text[] not null default array['clients.security_codes.read'],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table tags (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table client_tags (
  client_id uuid not null references clients(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (client_id, tag_id)
);

create table properties (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  address_line_1 text not null,
  address_line_2 text,
  city text,
  state text,
  postal_code text,
  square_footage integer,
  bedrooms numeric(4, 1),
  bathrooms numeric(4, 1),
  living_rooms integer,
  kitchens integer,
  garages integer,
  year_built integer,
  property_type text,
  estimated_value numeric(14, 2),
  external_property_source text,
  external_property_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table leads (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  location_id uuid references locations(id) on delete set null,
  first_name text not null,
  last_name text,
  phone text,
  email text,
  source text,
  status lead_status not null default 'new',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table estimates (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  estimate_number text not null,
  status estimate_status not null default 'draft',
  subtotal numeric(12, 2) not null default 0,
  tax numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  sent_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, estimate_number)
);

create table employees (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  location_id uuid references locations(id) on delete set null,
  user_id uuid references users(id) on delete set null,
  name text not null,
  phone text,
  email text,
  role_name text not null,
  hire_date date,
  status user_status not null default 'active',
  default_payroll_method payroll_method not null default 'fixed_per_house',
  default_payroll_rate numeric(12, 2) not null default 0,
  last_raise_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table teams (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  location_id uuid references locations(id) on delete set null,
  name text not null,
  driver_employee_id uuid references employees(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, company_id, name)
);

create table team_members (
  tenant_id uuid not null references tenants(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  role_name text not null,
  primary key (team_id, employee_id)
);

create table service_types (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  description text,
  default_price numeric(12, 2),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, company_id, name)
);

create table extra_services (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  description text,
  default_price numeric(12, 2),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, company_id, name)
);

create table appointments (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  location_id uuid references locations(id) on delete set null,
  client_id uuid not null references clients(id) on delete cascade,
  property_id uuid references properties(id) on delete set null,
  team_id uuid references teams(id) on delete set null,
  service_type_id uuid references service_types(id) on delete set null,
  service_name text not null,
  recurrence_rule text not null default 'does_not_repeat',
  status appointment_status not null default 'scheduled',
  starts_at timestamptz not null,
  ends_at timestamptz,
  quoted_price numeric(12, 2),
  final_price numeric(12, 2),
  payroll_override jsonb not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table appointment_extra_services (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  appointment_id uuid not null references appointments(id) on delete cascade,
  extra_service_id uuid references extra_services(id) on delete set null,
  service_name text not null,
  quoted_price numeric(12, 2),
  final_price numeric(12, 2),
  created_at timestamptz not null default now()
);

create table appointment_status_events (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  appointment_id uuid not null references appointments(id) on delete cascade,
  status appointment_status not null,
  actor_user_id uuid references users(id) on delete set null,
  occurred_at timestamptz not null default now()
);

create table checklist_templates (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  service_type_id uuid references service_types(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table checklist_items (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  template_id uuid not null references checklist_templates(id) on delete cascade,
  title text not null,
  room text,
  sort_order integer not null default 0,
  required boolean not null default false,
  created_at timestamptz not null default now()
);

create table appointment_checklist_items (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  appointment_id uuid not null references appointments(id) on delete cascade,
  checklist_item_id uuid references checklist_items(id) on delete set null,
  title text not null,
  completed boolean not null default false,
  completed_by_employee_id uuid references employees(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table appointment_photos (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  appointment_id uuid not null references appointments(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  employee_id uuid references employees(id) on delete set null,
  photo_type text not null,
  storage_key text not null,
  caption text,
  created_at timestamptz not null default now()
);

create table invoices (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  appointment_id uuid references appointments(id) on delete set null,
  invoice_number text not null,
  status invoice_status not null default 'draft',
  subtotal numeric(12, 2) not null default 0,
  tax numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  due_date date,
  sent_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, invoice_number)
);

create table payments (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade,
  method payment_method not null,
  amount numeric(12, 2) not null,
  paid_at timestamptz not null default now(),
  reference text,
  created_at timestamptz not null default now()
);

create table payroll_runs (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  period_starts_on date not null,
  period_ends_on date not null,
  status payroll_status not null default 'pending',
  approved_by_user_id uuid references users(id) on delete set null,
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table payroll_entries (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  payroll_run_id uuid references payroll_runs(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  appointment_id uuid references appointments(id) on delete set null,
  method payroll_method not null,
  rate numeric(12, 2) not null,
  amount numeric(12, 2) not null,
  status payroll_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  appointment_id uuid references appointments(id) on delete set null,
  channel message_channel not null,
  template_code text,
  recipient text not null,
  subject text,
  body text not null,
  status text not null default 'queued',
  provider_message_id text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table documents (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  company_id uuid references companies(id) on delete cascade,
  owner_type document_owner_type not null,
  owner_id uuid,
  name text not null,
  category text not null,
  storage_key text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  actor_user_id uuid references users(id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  before_value jsonb,
  after_value jsonb,
  created_at timestamptz not null default now()
);

create table activity_events (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  company_id uuid references companies(id) on delete cascade,
  actor_user_id uuid references users(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  message text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_companies_tenant_id on companies(tenant_id);
create index idx_locations_tenant_company on locations(tenant_id, company_id);
create index idx_memberships_tenant_user on memberships(tenant_id, user_id);
create index idx_clients_tenant_company on clients(tenant_id, company_id);
create index idx_clients_tenant_location on clients(tenant_id, location_id);
create index idx_properties_tenant_client on properties(tenant_id, client_id);
create index idx_leads_tenant_status on leads(tenant_id, status);
create index idx_estimates_tenant_status on estimates(tenant_id, status);
create index idx_employees_tenant_company on employees(tenant_id, company_id);
create index idx_teams_tenant_company on teams(tenant_id, company_id);
create index idx_appointments_tenant_status on appointments(tenant_id, status);
create index idx_appointments_tenant_starts_at on appointments(tenant_id, starts_at);
create index idx_invoices_tenant_status on invoices(tenant_id, status);
create index idx_payroll_entries_tenant_status on payroll_entries(tenant_id, status);
create index idx_messages_tenant_status on messages(tenant_id, status);
create index idx_documents_tenant_owner on documents(tenant_id, owner_type, owner_id);
create index idx_audit_logs_tenant_created_at on audit_logs(tenant_id, created_at);
create index idx_activity_events_tenant_created_at on activity_events(tenant_id, created_at);

alter table tenants enable row level security;
alter table companies enable row level security;
alter table locations enable row level security;
alter table tenant_subscriptions enable row level security;
alter table feature_flags enable row level security;
alter table roles enable row level security;
alter table memberships enable row level security;
alter table clients enable row level security;
alter table client_security_codes enable row level security;
alter table tags enable row level security;
alter table properties enable row level security;
alter table leads enable row level security;
alter table estimates enable row level security;
alter table employees enable row level security;
alter table teams enable row level security;
alter table team_members enable row level security;
alter table service_types enable row level security;
alter table extra_services enable row level security;
alter table appointments enable row level security;
alter table appointment_extra_services enable row level security;
alter table appointment_status_events enable row level security;
alter table checklist_templates enable row level security;
alter table checklist_items enable row level security;
alter table appointment_checklist_items enable row level security;
alter table appointment_photos enable row level security;
alter table invoices enable row level security;
alter table payments enable row level security;
alter table payroll_runs enable row level security;
alter table payroll_entries enable row level security;
alter table messages enable row level security;
alter table documents enable row level security;
alter table audit_logs enable row level security;
alter table activity_events enable row level security;

create policy tenants_isolation on tenants using (id = app_current_tenant_id());
create policy companies_isolation on companies using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());
create policy locations_isolation on locations using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());
create policy tenant_subscriptions_isolation on tenant_subscriptions using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());
create policy feature_flags_isolation on feature_flags using (tenant_id = app_current_tenant_id() or tenant_id is null) with check (tenant_id = app_current_tenant_id() or tenant_id is null);
create policy roles_isolation on roles using (tenant_id = app_current_tenant_id() or tenant_id is null) with check (tenant_id = app_current_tenant_id() or tenant_id is null);
create policy memberships_isolation on memberships using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());
create policy clients_isolation on clients using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());
create policy client_security_codes_isolation on client_security_codes using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());
create policy tags_isolation on tags using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());
create policy properties_isolation on properties using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());
create policy leads_isolation on leads using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());
create policy estimates_isolation on estimates using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());
create policy employees_isolation on employees using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());
create policy teams_isolation on teams using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());
create policy team_members_isolation on team_members using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());
create policy service_types_isolation on service_types using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());
create policy extra_services_isolation on extra_services using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());
create policy appointments_isolation on appointments using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());
create policy appointment_extra_services_isolation on appointment_extra_services using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());
create policy appointment_status_events_isolation on appointment_status_events using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());
create policy checklist_templates_isolation on checklist_templates using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());
create policy checklist_items_isolation on checklist_items using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());
create policy appointment_checklist_items_isolation on appointment_checklist_items using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());
create policy appointment_photos_isolation on appointment_photos using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());
create policy invoices_isolation on invoices using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());
create policy payments_isolation on payments using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());
create policy payroll_runs_isolation on payroll_runs using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());
create policy payroll_entries_isolation on payroll_entries using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());
create policy messages_isolation on messages using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());
create policy documents_isolation on documents using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());
create policy audit_logs_isolation on audit_logs using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());
create policy activity_events_isolation on activity_events using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());

create trigger tenants_set_updated_at before update on tenants for each row execute function set_updated_at();
create trigger companies_set_updated_at before update on companies for each row execute function set_updated_at();
create trigger locations_set_updated_at before update on locations for each row execute function set_updated_at();
create trigger subscription_plans_set_updated_at before update on subscription_plans for each row execute function set_updated_at();
create trigger tenant_subscriptions_set_updated_at before update on tenant_subscriptions for each row execute function set_updated_at();
create trigger feature_flags_set_updated_at before update on feature_flags for each row execute function set_updated_at();
create trigger users_set_updated_at before update on users for each row execute function set_updated_at();
create trigger roles_set_updated_at before update on roles for each row execute function set_updated_at();
create trigger clients_set_updated_at before update on clients for each row execute function set_updated_at();
create trigger client_security_codes_set_updated_at before update on client_security_codes for each row execute function set_updated_at();
create trigger properties_set_updated_at before update on properties for each row execute function set_updated_at();
create trigger leads_set_updated_at before update on leads for each row execute function set_updated_at();
create trigger estimates_set_updated_at before update on estimates for each row execute function set_updated_at();
create trigger employees_set_updated_at before update on employees for each row execute function set_updated_at();
create trigger teams_set_updated_at before update on teams for each row execute function set_updated_at();
create trigger service_types_set_updated_at before update on service_types for each row execute function set_updated_at();
create trigger extra_services_set_updated_at before update on extra_services for each row execute function set_updated_at();
create trigger appointments_set_updated_at before update on appointments for each row execute function set_updated_at();
create trigger checklist_templates_set_updated_at before update on checklist_templates for each row execute function set_updated_at();
create trigger invoices_set_updated_at before update on invoices for each row execute function set_updated_at();
create trigger payroll_runs_set_updated_at before update on payroll_runs for each row execute function set_updated_at();
create trigger payroll_entries_set_updated_at before update on payroll_entries for each row execute function set_updated_at();
create trigger messages_set_updated_at before update on messages for each row execute function set_updated_at();
create trigger documents_set_updated_at before update on documents for each row execute function set_updated_at();

insert into feature_modules (code, name, status) values
  ('dashboard', 'Dashboard', 'active'),
  ('calendar', 'Calendar', 'active'),
  ('clients', 'Clients', 'active'),
  ('appointments', 'Appointments', 'active'),
  ('teams', 'Teams', 'active'),
  ('employees', 'Employees', 'active'),
  ('invoices', 'Invoices', 'active'),
  ('payroll', 'Payroll', 'active'),
  ('messages', 'Messages', 'planned'),
  ('reports', 'Reports', 'planned'),
  ('settings', 'Settings', 'planned'),
  ('crm', 'CRM', 'planned'),
  ('documents', 'Documents', 'planned');

insert into subscription_plans (code, name, max_companies, max_locations, max_users, max_active_clients) values
  ('starter', 'Starter', 1, 1, 5, 250),
  ('professional', 'Professional', 2, 3, 25, 1000),
  ('business', 'Business', 10, 25, 250, 10000),
  ('enterprise', 'Enterprise', null, null, null, null);

insert into subscription_plan_modules (plan_id, module_id)
select plans.id, modules.id
from subscription_plans plans
join feature_modules modules on modules.code = any (
  case plans.code
    when 'starter' then array['dashboard', 'calendar', 'clients', 'appointments', 'teams', 'employees', 'invoices']
    when 'professional' then array['dashboard', 'calendar', 'clients', 'appointments', 'teams', 'employees', 'invoices', 'payroll', 'messages']
    when 'business' then array['dashboard', 'calendar', 'clients', 'appointments', 'teams', 'employees', 'invoices', 'payroll', 'messages', 'reports', 'crm', 'documents']
    else array['dashboard', 'calendar', 'clients', 'appointments', 'teams', 'employees', 'invoices', 'payroll', 'messages', 'reports', 'settings', 'crm', 'documents']
  end
);

insert into permissions (code, description) values
  ('dashboard.read', 'View dashboard metrics'),
  ('calendar.read', 'View calendar'),
  ('appointments.read', 'View appointments'),
  ('appointments.create', 'Create appointments'),
  ('appointments.update', 'Update appointments'),
  ('appointments.cancel', 'Cancel appointments'),
  ('clients.read', 'View clients'),
  ('clients.create', 'Create clients'),
  ('clients.update', 'Update clients'),
  ('clients.delete', 'Delete clients'),
  ('clients.security_codes.read', 'View client security codes'),
  ('teams.read', 'View teams'),
  ('teams.manage', 'Manage teams'),
  ('employees.read', 'View employees'),
  ('employees.manage', 'Manage employees'),
  ('invoices.read', 'View invoices'),
  ('invoices.manage', 'Manage invoices'),
  ('payroll.read', 'View payroll'),
  ('payroll.manage', 'Manage payroll'),
  ('messages.read', 'View messages'),
  ('messages.manage', 'Manage messages'),
  ('reports.read', 'View reports'),
  ('documents.read', 'View documents'),
  ('documents.manage', 'Manage documents'),
  ('crm.read', 'View CRM'),
  ('crm.manage', 'Manage CRM'),
  ('settings.manage', 'Manage tenant settings'),
  ('billing.manage', 'Manage billing'),
  ('audit_logs.read', 'View audit logs');

insert into roles (tenant_id, code, name, is_system) values
  (null, 'owner', 'Owner', true),
  (null, 'manager', 'Manager', true),
  (null, 'office', 'Office', true),
  (null, 'driver', 'Driver', true),
  (null, 'helper', 'Helper', true);

insert into role_permissions (role_id, permission_id)
select roles.id, permissions.id
from roles
join permissions on (
  roles.code = 'owner'
  or (roles.code = 'manager' and permissions.code = any(array[
    'dashboard.read', 'calendar.read', 'appointments.read', 'appointments.create', 'appointments.update', 'appointments.cancel',
    'clients.read', 'clients.create', 'clients.update', 'clients.security_codes.read', 'teams.read', 'teams.manage',
    'employees.read', 'employees.manage', 'invoices.read', 'invoices.manage', 'payroll.read', 'payroll.manage',
    'messages.read', 'messages.manage', 'reports.read', 'documents.read', 'documents.manage', 'crm.read', 'crm.manage', 'audit_logs.read'
  ]))
  or (roles.code = 'office' and permissions.code = any(array[
    'dashboard.read', 'calendar.read', 'appointments.read', 'appointments.create', 'appointments.update',
    'clients.read', 'clients.create', 'clients.update', 'teams.read', 'employees.read', 'invoices.read', 'invoices.manage',
    'messages.read', 'messages.manage', 'crm.read', 'crm.manage'
  ]))
  or (roles.code = 'driver' and permissions.code = any(array[
    'calendar.read', 'appointments.read', 'appointments.update', 'clients.read', 'clients.security_codes.read', 'teams.read'
  ]))
  or (roles.code = 'helper' and permissions.code = any(array[
    'calendar.read', 'appointments.read', 'appointments.update'
  ]))
);
