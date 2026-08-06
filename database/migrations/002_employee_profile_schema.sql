do $$ begin
  create type employment_status as enum ('active', 'inactive', 'on_leave', 'vacation', 'terminated');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type worker_classification as enum ('employee', 'independent_contractor', 'subcontractor', 'temporary');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type work_schedule_type as enum ('full_time', 'part_time', 'on_call', 'temporary');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type employee_payment_type as enum ('hourly', 'daily', 'weekly_salary', 'monthly_salary', 'per_job', 'commission', 'custom');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type employee_payment_frequency as enum ('weekly', 'biweekly', 'semimonthly', 'monthly', 'per_job');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type employee_document_status as enum ('pending', 'valid', 'expiring_soon', 'expired', 'rejected');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type employee_skill_level as enum ('beginner', 'intermediate', 'advanced', 'expert');
exception when duplicate_object then null;
end $$;

alter table employees
  add column if not exists employee_code text,
  add column if not exists preferred_name text,
  add column if not exists secondary_phone text,
  add column if not exists date_of_birth date,
  add column if not exists preferred_language text not null default 'en',
  add column if not exists address_line_1 text,
  add column if not exists address_line_2 text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists postal_code text,
  add column if not exists country text not null default 'US',
  add column if not exists emergency_contact jsonb not null default '{}',
  add column if not exists employment_status employment_status not null default 'active',
  add column if not exists worker_classification worker_classification not null default 'employee',
  add column if not exists work_schedule_type work_schedule_type not null default 'full_time',
  add column if not exists secondary_roles text[] not null default '{}',
  add column if not exists custom_role_name text,
  add column if not exists termination_date date,
  add column if not exists termination_reason text,
  add column if not exists internal_notes text,
  add column if not exists system_access_role text not null default 'employee';

update employees
set employee_code = coalesce(employee_code, 'EMP-' || right(replace(id::text, '-', ''), 6)),
    employment_status = case when status = 'inactive' then 'inactive'::employment_status else 'active'::employment_status end
where employee_code is null;

create unique index if not exists idx_employees_tenant_employee_code on employees(tenant_id, employee_code);
create index if not exists idx_employees_tenant_employment_status on employees(tenant_id, employment_status);

create table if not exists employee_compensation_profiles (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  payment_type employee_payment_type not null default 'hourly',
  hourly_rate numeric(12, 2),
  daily_rate numeric(12, 2),
  weekly_salary numeric(12, 2),
  monthly_salary numeric(12, 2),
  per_job_rate numeric(12, 2),
  commission_percentage numeric(6, 2),
  custom_rate_label text,
  custom_rate_amount numeric(12, 2),
  overtime_enabled boolean not null default false,
  regular_hours_before_overtime numeric(6, 2),
  overtime_multiplier numeric(6, 2),
  custom_overtime_rate numeric(12, 2),
  overtime_calculation_method text,
  payment_frequency employee_payment_frequency not null default 'weekly',
  first_payment_date date,
  default_payment_day text,
  payment_notes text,
  default_payment_method text,
  payment_recipient_name text,
  masked_payment_details text,
  internal_payment_notes text,
  tax_classification text,
  tax_id_status text,
  required_tax_documents_status text,
  tax_notes text,
  mileage_reimbursement_enabled boolean not null default false,
  mileage_reimbursement_rate numeric(12, 2),
  fuel_reimbursement_enabled boolean not null default false,
  materials_reimbursement_enabled boolean not null default false,
  tool_reimbursement_enabled boolean not null default false,
  allow_expense_submissions boolean not null default false,
  expense_approval_required boolean not null default true,
  include_in_project_costing boolean not null default false,
  internal_cost_rate numeric(12, 2),
  payroll_burden_percentage numeric(6, 2),
  additional_hourly_overhead numeric(12, 2),
  customer_billing_rate numeric(12, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, employee_id)
);

create table if not exists employee_availability (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  weekday text not null,
  available boolean not null default true,
  start_time time,
  end_time time,
  second_start_time time,
  second_end_time time,
  notes text,
  effective_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, employee_id, weekday, effective_date)
);

create table if not exists employee_time_tracking_settings (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  settings jsonb not null default '{}',
  capabilities jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, employee_id)
);

create table if not exists employee_documents (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  document_name text not null,
  document_type text not null,
  document_number_masked text,
  issuing_authority text,
  issue_date date,
  expiration_date date,
  storage_key text,
  status employee_document_status not null default 'pending',
  verified_by_user_id uuid references users(id) on delete set null,
  verification_date date,
  notes text,
  superseded_by_document_id uuid references employee_documents(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists employee_skills (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  skill_name text not null,
  category text,
  level employee_skill_level not null default 'beginner',
  years_of_experience numeric(5, 2),
  certification_name text,
  certification_storage_key text,
  issue_date date,
  expiration_date date,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists employee_permission_overrides (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  permission_code text not null,
  enabled boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, employee_id, permission_code)
);

create table if not exists employee_history_events (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  actor_user_id uuid references users(id) on delete set null,
  action text not null,
  previous_value jsonb,
  new_value jsonb,
  related_entity_type text,
  related_entity_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_employee_compensation_tenant_employee on employee_compensation_profiles(tenant_id, employee_id);
create index if not exists idx_employee_availability_tenant_employee on employee_availability(tenant_id, employee_id);
create index if not exists idx_employee_documents_tenant_employee on employee_documents(tenant_id, employee_id);
create index if not exists idx_employee_documents_tenant_status on employee_documents(tenant_id, status);
create index if not exists idx_employee_documents_expiration on employee_documents(tenant_id, expiration_date);
create index if not exists idx_employee_skills_tenant_employee on employee_skills(tenant_id, employee_id);
create index if not exists idx_employee_permission_overrides_tenant_employee on employee_permission_overrides(tenant_id, employee_id);
create index if not exists idx_employee_history_events_tenant_employee_created on employee_history_events(tenant_id, employee_id, created_at desc);

alter table employee_compensation_profiles enable row level security;
alter table employee_availability enable row level security;
alter table employee_time_tracking_settings enable row level security;
alter table employee_documents enable row level security;
alter table employee_skills enable row level security;
alter table employee_permission_overrides enable row level security;
alter table employee_history_events enable row level security;

create policy employee_compensation_profiles_isolation on employee_compensation_profiles using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());
create policy employee_availability_isolation on employee_availability using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());
create policy employee_time_tracking_settings_isolation on employee_time_tracking_settings using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());
create policy employee_documents_isolation on employee_documents using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());
create policy employee_skills_isolation on employee_skills using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());
create policy employee_permission_overrides_isolation on employee_permission_overrides using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());
create policy employee_history_events_isolation on employee_history_events using (tenant_id = app_current_tenant_id()) with check (tenant_id = app_current_tenant_id());
