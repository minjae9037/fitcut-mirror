alter table public.community_posts
  add column if not exists target_gender text null;

alter table public.style_votes
  add column if not exists selected_style_id text null,
  add column if not exists voter_gender text null,
  add column if not exists status text not null default 'published';

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  anonymous_name text not null default '익명',
  body text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.community_messages (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  sender_name text null,
  contact text null,
  body text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists style_votes_post_created_at_idx
  on public.style_votes (post_id, created_at desc);

create index if not exists community_comments_post_created_at_idx
  on public.community_comments (post_id, created_at desc);

create index if not exists community_messages_post_created_at_idx
  on public.community_messages (post_id, created_at desc);

alter table public.community_comments enable row level security;
alter table public.community_messages enable row level security;

drop policy if exists "service role can manage community comments"
  on public.community_comments;
create policy "service role can manage community comments"
  on public.community_comments
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role can manage community messages"
  on public.community_messages;
create policy "service role can manage community messages"
  on public.community_messages
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
