create extension if not exists "pgcrypto";

create table if not exists public.generation_sessions (
  id text primary key,
  profile_id uuid null,
  status text not null default 'completed',
  uploaded_count integer not null default 0,
  source_photo_count integer not null default 0,
  audience_name text null,
  selected_style_id text null,
  style_name text null,
  hair_color_name text null,
  style_memo text null,
  consulting_focus_names text[] not null default '{}',
  final_image_provider text null,
  created_at timestamptz not null default now(),
  completed_at timestamptz null,
  deleted_at timestamptz null
);

create table if not exists public.generation_assets (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references public.generation_sessions(id) on delete cascade,
  asset_type text not null,
  angle_label text null,
  display_order integer not null default 0,
  storage_path text null,
  original_url text null,
  provider text null,
  model text null,
  status text not null default 'stored',
  error_message text null,
  created_at timestamptz not null default now()
);

create table if not exists public.hairstyle_recommendations (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references public.generation_sessions(id) on delete cascade,
  style_id text not null,
  rank integer not null default 0,
  reason text null,
  tags text[] not null default '{}',
  suitability_score integer null,
  salon_process text null,
  caution text null,
  created_at timestamptz not null default now()
);

create index if not exists generation_sessions_created_at_idx
  on public.generation_sessions (created_at desc);

create index if not exists generation_assets_session_idx
  on public.generation_assets (session_id, display_order);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mirilook-consultations',
  'mirilook-consultations',
  false,
  10485760,
  array['image/jpeg', 'image/png']
)
on conflict (id) do nothing;

alter table public.generation_sessions enable row level security;
alter table public.generation_assets enable row level security;
alter table public.hairstyle_recommendations enable row level security;

drop policy if exists "service role can manage generation sessions" on public.generation_sessions;
create policy "service role can manage generation sessions"
  on public.generation_sessions
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role can manage generation assets" on public.generation_assets;
create policy "service role can manage generation assets"
  on public.generation_assets
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role can manage hairstyle recommendations" on public.hairstyle_recommendations;
create policy "service role can manage hairstyle recommendations"
  on public.hairstyle_recommendations
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
