alter table companies
  add column if not exists document_settings jsonb not null default '{}'::jsonb;

alter table pricing_rule_sets
  add column if not exists document_task_schema_version text not null default 'v1';

alter table estimates
  add column if not exists first_visit_price numeric(12, 2),
  add column if not exists recurring_visit_price numeric(12, 2),
  add column if not exists document_snapshot jsonb not null default '{}'::jsonb;

create index if not exists idx_estimates_document_snapshot_gin on estimates using gin (document_snapshot);
