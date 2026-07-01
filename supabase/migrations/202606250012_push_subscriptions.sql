create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  contact text null,
  consent_context text null,
  user_agent text null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscriptions_status_check
    check (status in ('active', 'revoked', 'disabled'))
);

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid null references public.push_subscriptions(id) on delete set null,
  event_type text not null default 'manual',
  title text not null,
  body text not null,
  url text null,
  payload jsonb not null default '{}',
  status text not null default 'queued',
  error_message text null,
  created_at timestamptz not null default now(),
  sent_at timestamptz null,
  constraint notification_events_status_check
    check (status in ('queued', 'sent', 'failed', 'cancelled'))
);

create index if not exists push_subscriptions_status_idx
  on public.push_subscriptions (status, updated_at desc);

create index if not exists notification_events_status_idx
  on public.notification_events (status, created_at desc);

alter table public.push_subscriptions enable row level security;
alter table public.notification_events enable row level security;

drop policy if exists "service role can manage push subscriptions"
  on public.push_subscriptions;
create policy "service role can manage push subscriptions"
  on public.push_subscriptions
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role can manage notification events"
  on public.notification_events;
create policy "service role can manage notification events"
  on public.notification_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
