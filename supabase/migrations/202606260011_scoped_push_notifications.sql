alter table public.push_subscriptions
  add column if not exists profile_id uuid null references public.profiles(id) on delete set null;

create index if not exists push_subscriptions_profile_status_idx
  on public.push_subscriptions (profile_id, status, updated_at desc)
  where profile_id is not null;

alter table public.notification_events
  add column if not exists target_profile_id uuid null references public.profiles(id) on delete set null,
  add column if not exists broadcast_all boolean not null default false;

create index if not exists notification_events_target_profile_status_idx
  on public.notification_events (target_profile_id, status, created_at desc)
  where target_profile_id is not null;
