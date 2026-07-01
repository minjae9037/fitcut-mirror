create table if not exists public.consultation_email_events (
  id uuid primary key default gen_random_uuid(),
  session_id text null references public.generation_sessions(id) on delete set null,
  profile_id uuid null references public.profiles(id) on delete set null,
  recipient_email text not null,
  resend_email_id text null,
  share_token text null references public.consultation_shares(token) on delete set null,
  status text not null default 'pending',
  error_message text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint consultation_email_events_status_check
    check (status in ('pending', 'sent', 'failed'))
);

create index if not exists consultation_email_events_session_idx
  on public.consultation_email_events (session_id, created_at desc);

create index if not exists consultation_email_events_profile_idx
  on public.consultation_email_events (profile_id, created_at desc);

create index if not exists consultation_email_events_status_idx
  on public.consultation_email_events (status, created_at desc);

alter table public.consultation_email_events enable row level security;

drop policy if exists "service role can manage consultation email events"
  on public.consultation_email_events;
create policy "service role can manage consultation email events"
  on public.consultation_email_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
