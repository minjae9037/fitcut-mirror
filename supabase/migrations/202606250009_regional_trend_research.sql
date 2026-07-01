create table if not exists public.regional_trend_sources (
  id uuid primary key default gen_random_uuid(),
  region_id text not null,
  audience text not null,
  platform text not null,
  source_url text null,
  title text null,
  summary text null,
  observed_style_ids text[] not null default '{}',
  confidence numeric(4, 3) null,
  status text not null default 'candidate',
  researched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint regional_trend_sources_audience_check
    check (audience in ('male', 'female')),
  constraint regional_trend_sources_region_check
    check (region_id in ('korea', 'china', 'japan', 'america', 'europe'))
);

create table if not exists public.regional_style_priorities (
  id uuid primary key default gen_random_uuid(),
  region_id text not null,
  audience text not null,
  style_id text not null,
  priority_rank integer not null,
  score numeric(5, 2) null,
  rationale text null,
  source_ids uuid[] not null default '{}',
  status text not null default 'active',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint regional_style_priorities_audience_check
    check (audience in ('male', 'female')),
  constraint regional_style_priorities_region_check
    check (region_id in ('korea', 'china', 'japan', 'america', 'europe')),
  constraint regional_style_priorities_rank_check
    check (priority_rank between 1 and 50)
);

create unique index if not exists regional_style_priorities_unique_style_idx
  on public.regional_style_priorities (region_id, audience, style_id);

create index if not exists regional_style_priorities_lookup_idx
  on public.regional_style_priorities (region_id, audience, status, priority_rank asc);

create index if not exists regional_trend_sources_lookup_idx
  on public.regional_trend_sources (region_id, audience, status, researched_at desc);

alter table public.regional_trend_sources enable row level security;
alter table public.regional_style_priorities enable row level security;

drop policy if exists "service role can manage regional trend sources"
  on public.regional_trend_sources;
create policy "service role can manage regional trend sources"
  on public.regional_trend_sources
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role can manage regional style priorities"
  on public.regional_style_priorities;
create policy "service role can manage regional style priorities"
  on public.regional_style_priorities
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
