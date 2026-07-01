alter table public.regional_trend_sources
  add column if not exists age_group text not null default 'all',
  add column if not exists research_month date not null default date_trunc('month', now())::date,
  add column if not exists metrics jsonb not null default '{}',
  add column if not exists target_persona text null;

alter table public.regional_style_priorities
  add column if not exists age_group text not null default 'all',
  add column if not exists research_month date not null default date_trunc('month', now())::date,
  add column if not exists recommendation_bucket text not null default 'core';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'regional_trend_sources_age_group_check'
  ) then
    alter table public.regional_trend_sources
      add constraint regional_trend_sources_age_group_check
      check (age_group in ('all', 'teen', '20s', '30s', '40s', '50s', '60s', '70plus'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'regional_style_priorities_age_group_check'
  ) then
    alter table public.regional_style_priorities
      add constraint regional_style_priorities_age_group_check
      check (age_group in ('all', 'teen', '20s', '30s', '40s', '50s', '60s', '70plus'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'regional_style_priorities_bucket_check'
  ) then
    alter table public.regional_style_priorities
      add constraint regional_style_priorities_bucket_check
      check (recommendation_bucket in ('core', 'challenge'));
  end if;
end $$;

drop index if exists regional_style_priorities_unique_style_idx;
create unique index if not exists regional_style_priorities_unique_style_age_idx
  on public.regional_style_priorities (region_id, audience, age_group, style_id);

drop index if exists regional_style_priorities_lookup_idx;
create index if not exists regional_style_priorities_demographic_lookup_idx
  on public.regional_style_priorities
  (region_id, audience, age_group, status, priority_rank asc);

drop index if exists regional_trend_sources_lookup_idx;
create index if not exists regional_trend_sources_demographic_lookup_idx
  on public.regional_trend_sources
  (region_id, audience, age_group, status, research_month desc, researched_at desc);
