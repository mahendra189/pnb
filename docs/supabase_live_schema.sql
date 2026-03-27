create extension if not exists pgcrypto;

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  asset_type text not null,
  asset_value text not null,
  organization text,
  seed_domain text,
  owner text,
  status text not null default 'pending',
  risk_score numeric(4,2),
  hndl_score numeric(4,2),
  quantum_label text,
  tls_version text,
  cipher_suite text,
  key_algorithm text,
  cert_expires_at timestamptz,
  last_scanned timestamptz,
  previous_risk_score numeric(4,2),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists assets_updated_at_idx on public.assets (updated_at desc);
create index if not exists assets_status_idx on public.assets (status);
create index if not exists assets_risk_score_idx on public.assets (risk_score desc);

create or replace function public.set_assets_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_assets_updated_at on public.assets;
create trigger trg_assets_updated_at
before update on public.assets
for each row
execute function public.set_assets_updated_at();
