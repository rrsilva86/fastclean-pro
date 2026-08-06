create table if not exists app_record_snapshots (
  tenant_key text not null,
  collection_key text not null,
  records jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_key, collection_key)
);

create index if not exists idx_app_record_snapshots_tenant on app_record_snapshots(tenant_key);
