create table if not exists public.salons (
  id text primary key,
  name text not null,
  address text not null,
  latitude double precision null,
  longitude double precision null,
  phone text null,
  hours text null,
  price_range text null,
  profile_status text not null default 'pilot',
  created_at timestamptz not null default now()
);

create table if not exists public.designers (
  id text primary key,
  salon_id text not null references public.salons(id) on delete cascade,
  name text not null,
  specialties text[] not null default '{}',
  profile_image_path text null,
  booking_status text not null default 'pilot',
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  salon_id text null references public.salons(id) on delete set null,
  designer_id text null references public.designers(id) on delete set null,
  profile_id uuid null,
  rating integer null,
  body text null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  salon_id text not null,
  designer_id text null,
  name text not null,
  contact text not null,
  preferred_date text null,
  service_type text null,
  memo text null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid null,
  anonymous_name text null,
  title text null,
  post_type text not null default 'discussion',
  body text not null,
  visibility text not null default 'pilot',
  dm_policy text not null default 'deny',
  purpose text null,
  requester_gender text null,
  contact text null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.community_posts add column if not exists title text null;
alter table public.community_posts add column if not exists purpose text null;
alter table public.community_posts add column if not exists requester_gender text null;
alter table public.community_posts add column if not exists contact text null;

create table if not exists public.style_votes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  voter_profile_id uuid null,
  selected_asset_id uuid null,
  tags text[] not null default '{}',
  comment text null,
  created_at timestamptz not null default now()
);

create index if not exists booking_requests_created_at_idx
  on public.booking_requests (created_at desc);

create index if not exists community_posts_created_at_idx
  on public.community_posts (created_at desc);

alter table public.salons enable row level security;
alter table public.designers enable row level security;
alter table public.reviews enable row level security;
alter table public.booking_requests enable row level security;
alter table public.community_posts enable row level security;
alter table public.style_votes enable row level security;

drop policy if exists "service role can manage salons" on public.salons;
create policy "service role can manage salons"
  on public.salons
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role can manage designers" on public.designers;
create policy "service role can manage designers"
  on public.designers
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role can manage reviews" on public.reviews;
create policy "service role can manage reviews"
  on public.reviews
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role can manage booking requests" on public.booking_requests;
create policy "service role can manage booking requests"
  on public.booking_requests
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role can manage community posts" on public.community_posts;
create policy "service role can manage community posts"
  on public.community_posts
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role can manage style votes" on public.style_votes;
create policy "service role can manage style votes"
  on public.style_votes
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
