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
);

create index if not exists idx_audit_events_tenant_created_at on audit_events(tenant_id, created_at desc);
create index if not exists idx_audit_events_actor_created_at on audit_events(actor_user_id, created_at desc);
create index if not exists idx_audit_events_entity_created_at on audit_events(entity_type, entity_id, created_at desc);
create index if not exists idx_audit_events_action_created_at on audit_events(action, created_at desc);

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
);

create index if not exists idx_backup_runs_tenant_created_at on backup_runs(tenant_id, created_at desc);
create index if not exists idx_backup_runs_status_created_at on backup_runs(status, created_at desc);
