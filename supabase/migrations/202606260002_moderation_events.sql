create table if not exists public.moderation_events (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id text not null,
  reporter_profile_id uuid null,
  reporter_contact text null,
  reason text not null,
  body text null,
  status text not null default 'new',
  action text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint moderation_events_target_type_check
    check (
      target_type in (
        'community_post',
        'community_comment',
        'community_message',
        'style_vote',
        'review',
        'share',
        'consultation'
      )
    ),
  constraint moderation_events_status_check
    check (status in ('new', 'reviewing', 'resolved', 'dismissed'))
);

create index if not exists moderation_events_status_created_at_idx
  on public.moderation_events (status, created_at desc);

create index if not exists moderation_events_target_idx
  on public.moderation_events (target_type, target_id);

alter table public.moderation_events enable row level security;

drop policy if exists "service role can manage moderation events"
  on public.moderation_events;
create policy "service role can manage moderation events"
  on public.moderation_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
