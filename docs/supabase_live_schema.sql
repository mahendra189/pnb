create extension if not exists pgcrypto;

create table if not exists public.master_assets (
  id uuid primary key default gen_random_uuid(),
  asset_value text not null,
  asset_type text not null,
  organization text,
  seed_domain text,
  status text not null default 'pending',
  risk_score numeric(6,2),
  tags jsonb,
  metadata jsonb,
  first_seen timestamptz not null default timezone('utc', now()),
  last_scanned_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists uq_master_assets_asset_value_type on public.master_assets (asset_value, asset_type);
create index if not exists ix_master_assets_status on public.master_assets (status);
create index if not exists ix_master_assets_risk_score on public.master_assets (risk_score desc);
create index if not exists ix_master_assets_metadata on public.master_assets using gin (metadata);

create table if not exists public.tls_scan_results (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.master_assets(id) on delete cascade,
  scan_job_id uuid,
  host text not null,
  port integer not null default 443,
  scan_timestamp timestamptz not null default timezone('utc', now()),
  tls_version text,
  cipher text,
  key_exchange text,
  certificate_issuer text,
  certificate_expiry timestamptz,
  pqc_status text,
  vulnerabilities jsonb,
  http_headers jsonb,
  open_ports jsonb,
  raw_data jsonb,
  risk_score numeric(6,2),
  supports_pqc_kem boolean not null default false,
  scan_duration_ms integer,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists ix_tls_scan_results_asset_id on public.tls_scan_results (asset_id);
create index if not exists ix_tls_scan_results_scan_timestamp on public.tls_scan_results (scan_timestamp desc);
create index if not exists ix_tls_scan_results_raw_data on public.tls_scan_results using gin (raw_data);

create table if not exists public.asset_state_history (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.master_assets(id) on delete cascade,
  scan_id uuid references public.tls_scan_results(id) on delete set null,
  tls_version text,
  cipher text,
  certificate_issuer text,
  pqc_status text,
  risk_score numeric(6,2),
  recorded_at timestamptz not null default timezone('utc', now())
);

create index if not exists ix_asset_state_history_asset_id on public.asset_state_history (asset_id);
create index if not exists ix_asset_state_history_recorded_at on public.asset_state_history (recorded_at desc);

create table if not exists public.asset_changes (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.master_assets(id) on delete cascade,
  field_name text not null,
  old_value text,
  new_value text,
  change_type text not null,
  detected_at timestamptz not null default timezone('utc', now())
);

create index if not exists ix_asset_changes_asset_id on public.asset_changes (asset_id);
create index if not exists ix_asset_changes_detected_at on public.asset_changes (detected_at desc);

create table if not exists public.asset_scan_summary (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.master_assets(id) on delete cascade,
  scan_date date not null,
  tls_version text,
  pqc_status text,
  risk_score numeric(6,2),
  change_detected boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists ix_asset_scan_summary_asset_date on public.asset_scan_summary (asset_id, scan_date desc);

create table if not exists public.cbom_records (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.master_assets(id) on delete cascade,
  scan_id uuid references public.tls_scan_results(id) on delete set null,
  version integer not null default 1,
  algorithm_name text not null,
  algorithm_oid text,
  category text not null,
  algorithm_parameters jsonb,
  pqc_status text not null default 'unknown',
  nist_pqc_level integer,
  quantum_risk_score numeric(6,2),
  cryptographic_strength_bits integer,
  usage_context text,
  detection_sources jsonb,
  replacement_algorithm text,
  migration_complexity text,
  migration_recommendation jsonb,
  cyclonedx_component jsonb,
  first_detected timestamptz not null default timezone('utc', now()),
  last_confirmed timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists uq_cbom_asset_algorithm_context on public.cbom_records (asset_id, algorithm_oid, usage_context, version);
create index if not exists ix_cbom_records_asset_id on public.cbom_records (asset_id);

create table if not exists public.scan_tasks (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.master_assets(id) on delete cascade,
  celery_task_id text unique,
  status text not null default 'pending',
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  started_at timestamptz,
  finished_at timestamptz
);

create index if not exists ix_scan_tasks_asset_id on public.scan_tasks (asset_id);
create index if not exists ix_scan_tasks_status on public.scan_tasks (status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_master_assets_updated_at on public.master_assets;
create trigger trg_master_assets_updated_at
before update on public.master_assets
for each row
execute function public.set_updated_at();
