alter table public.profiles
  add column if not exists handle text;

create unique index if not exists profiles_handle_unique_idx
  on public.profiles (lower(handle))
  where handle is not null and handle <> '';

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid null references public.profiles(id) on delete set null,
  display_name text not null default '미리룩 회원',
  handle text null,
  body text not null default '',
  image_path text null,
  hashtags text[] not null default '{}',
  dm_policy text not null default 'allow',
  visibility text not null default 'public',
  status text not null default 'published',
  recommendation_score numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.social_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  reactor_profile_id uuid null references public.profiles(id) on delete set null,
  reaction_type text not null,
  session_key text null,
  created_at timestamptz not null default now(),
  constraint social_reactions_type_check check (reaction_type in ('like', 'dislike'))
);

create table if not exists public.social_messages (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  sender_profile_id uuid null references public.profiles(id) on delete set null,
  sender_name text null,
  contact text null,
  body text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists social_posts_recommended_idx
  on public.social_posts (status, visibility, recommendation_score desc, created_at desc);

create index if not exists social_posts_hashtags_idx
  on public.social_posts using gin (hashtags);

create index if not exists social_reactions_post_idx
  on public.social_reactions (post_id, reaction_type);

create index if not exists social_messages_post_idx
  on public.social_messages (post_id, created_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mirilook-social-posts',
  'mirilook-social-posts',
  false,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

alter table public.social_posts enable row level security;
alter table public.social_reactions enable row level security;
alter table public.social_messages enable row level security;

drop policy if exists "service role can manage social posts"
  on public.social_posts;
create policy "service role can manage social posts"
  on public.social_posts
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role can manage social reactions"
  on public.social_reactions;
create policy "service role can manage social reactions"
  on public.social_reactions
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role can manage social messages"
  on public.social_messages;
create policy "service role can manage social messages"
  on public.social_messages
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
