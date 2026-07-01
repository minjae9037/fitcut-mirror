create table if not exists public.social_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  commenter_profile_id uuid null references public.profiles(id) on delete set null,
  display_name text not null default '미리룩 방문자',
  handle text null,
  session_key text null,
  body text not null,
  status text not null default 'published',
  created_at timestamptz not null default now(),
  constraint social_comments_status_check check (status in ('published', 'hidden', 'deleted'))
);

create index if not exists social_comments_post_created_at_idx
  on public.social_comments (post_id, created_at asc);

create index if not exists social_comments_status_idx
  on public.social_comments (status, created_at desc);

alter table public.social_comments enable row level security;

drop policy if exists "service role can manage social comments"
  on public.social_comments;
create policy "service role can manage social comments"
  on public.social_comments
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

alter table public.moderation_events
  drop constraint if exists moderation_events_target_type_check;

alter table public.moderation_events
  add constraint moderation_events_target_type_check
  check (
    target_type in (
      'community_post',
      'community_comment',
      'community_message',
      'social_post',
      'social_comment',
      'style_vote',
      'review',
      'share',
      'consultation'
    )
  );
