create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null check (category in ('fashion', 'beauty', 'lifestyle', 'mixed')),
  logo_url text,
  website_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.brand_sources (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  source_type text not null check (source_type in ('official_api', 'partner_api', 'public_page', 'manual_feed')),
  source_name text not null,
  base_url text not null,
  schedule_cron text,
  poll_interval_minutes integer not null default 10 check (poll_interval_minutes between 1 and 1440),
  is_enabled boolean not null default true,
  config_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, source_name)
);

create table if not exists public.sale_events (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  source_id uuid not null references public.brand_sources(id) on delete cascade,
  external_id text not null,
  title text not null,
  summary text,
  sale_url text,
  image_url text,
  start_at timestamptz,
  end_at timestamptz,
  is_all_day boolean not null default false,
  timezone text not null default 'Asia/Seoul',
  status text not null check (status in ('upcoming', 'active', 'ended', 'unknown')),
  discount_percent numeric(5,2),
  discount_label text,
  original_price_min numeric(12,2),
  sale_price_min numeric(12,2),
  categories_json jsonb not null default '[]'::jsonb,
  tags_json jsonb not null default '[]'::jsonb,
  normalized_hash text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, external_id)
);

create table if not exists public.sale_event_snapshots (
  id uuid primary key default gen_random_uuid(),
  sale_event_id uuid not null references public.sale_events(id) on delete cascade,
  raw_payload_json jsonb not null,
  normalized_payload_json jsonb not null,
  snapshot_hash text not null,
  detected_at timestamptz not null default now(),
  unique (sale_event_id, snapshot_hash)
);

create table if not exists public.user_brand_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  is_enabled boolean not null default true,
  notify_on_new_sale boolean not null default true,
  notify_on_sale_start boolean not null default true,
  notify_before_end_hours integer not null default 24 check (notify_before_end_hours between 0 and 168),
  notify_on_discount_change boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, brand_id)
);

create table if not exists public.user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('ios', 'android', 'web', 'unknown')),
  push_token text not null,
  app_version text,
  last_seen_at timestamptz not null default now(),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, push_token)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  sale_event_id uuid references public.sale_events(id) on delete set null,
  notification_type text not null check (notification_type in ('new_sale', 'sale_started', 'ending_soon', 'discount_changed')),
  title text not null,
  body text not null,
  payload_json jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  read_at timestamptz,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'read')),
  created_at timestamptz not null default now()
);

create table if not exists public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  source_id uuid references public.brand_sources(id) on delete set null,
  run_type text not null check (run_type in ('scheduled', 'manual', 'retry')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'success', 'partial', 'failed')),
  fetched_count integer not null default 0 check (fetched_count >= 0),
  normalized_count integer not null default 0 check (normalized_count >= 0),
  changed_count integer not null default 0 check (changed_count >= 0),
  error_summary text,
  created_at timestamptz not null default now()
);

create table if not exists public.sync_errors (
  id uuid primary key default gen_random_uuid(),
  sync_run_id uuid not null references public.sync_runs(id) on delete cascade,
  brand_id uuid references public.brands(id) on delete set null,
  source_id uuid references public.brand_sources(id) on delete set null,
  error_type text not null,
  message text not null,
  detail_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_brands_is_active on public.brands (is_active);
create index if not exists idx_brand_sources_brand_enabled on public.brand_sources (brand_id, is_enabled);
create index if not exists idx_sale_events_brand_start on public.sale_events (brand_id, start_at);
create index if not exists idx_sale_events_status on public.sale_events (status);
create index if not exists idx_sale_events_end_at on public.sale_events (end_at);
create index if not exists idx_sale_events_last_changed_at on public.sale_events (last_changed_at);
create index if not exists idx_sale_event_snapshots_event_detected on public.sale_event_snapshots (sale_event_id, detected_at);
create index if not exists idx_user_brand_subscriptions_user_enabled on public.user_brand_subscriptions (user_id, is_enabled);
create index if not exists idx_user_devices_user_active on public.user_devices (user_id, is_active);
create index if not exists idx_notifications_user_created on public.notifications (user_id, created_at desc);
create index if not exists idx_notifications_status on public.notifications (status);
create index if not exists idx_sync_runs_brand_started on public.sync_runs (brand_id, started_at desc);
create index if not exists idx_sync_errors_run_created on public.sync_errors (sync_run_id, created_at desc);

drop trigger if exists set_brands_updated_at on public.brands;
create trigger set_brands_updated_at
before update on public.brands
for each row
execute function public.set_updated_at();

drop trigger if exists set_brand_sources_updated_at on public.brand_sources;
create trigger set_brand_sources_updated_at
before update on public.brand_sources
for each row
execute function public.set_updated_at();

drop trigger if exists set_sale_events_updated_at on public.sale_events;
create trigger set_sale_events_updated_at
before update on public.sale_events
for each row
execute function public.set_updated_at();

drop trigger if exists set_user_brand_subscriptions_updated_at on public.user_brand_subscriptions;
create trigger set_user_brand_subscriptions_updated_at
before update on public.user_brand_subscriptions
for each row
execute function public.set_updated_at();

drop trigger if exists set_user_devices_updated_at on public.user_devices;
create trigger set_user_devices_updated_at
before update on public.user_devices
for each row
execute function public.set_updated_at();

alter table public.brands enable row level security;
alter table public.brand_sources enable row level security;
alter table public.sale_events enable row level security;
alter table public.sale_event_snapshots enable row level security;
alter table public.user_brand_subscriptions enable row level security;
alter table public.user_devices enable row level security;
alter table public.notifications enable row level security;
alter table public.sync_runs enable row level security;
alter table public.sync_errors enable row level security;

drop policy if exists brands_read_all on public.brands;
create policy brands_read_all
on public.brands
for select
to anon, authenticated
using (true);

drop policy if exists sale_events_read_all on public.sale_events;
create policy sale_events_read_all
on public.sale_events
for select
to anon, authenticated
using (true);

drop policy if exists user_brand_subscriptions_self_access on public.user_brand_subscriptions;
create policy user_brand_subscriptions_self_access
on public.user_brand_subscriptions
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists user_devices_self_access on public.user_devices;
create policy user_devices_self_access
on public.user_devices
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists notifications_self_read on public.notifications;
create policy notifications_self_read
on public.notifications
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists notifications_self_update on public.notifications;
create policy notifications_self_update
on public.notifications
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
