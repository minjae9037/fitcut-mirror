alter table public.payment_events
  add column if not exists event_type text null,
  add column if not exists verified boolean not null default false,
  add column if not exists expected_amount integer null,
  add column if not exists actual_amount integer null,
  add column if not exists currency text null,
  add column if not exists failure_reason text null,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists payment_events_status_idx
  on public.payment_events (status);

create index if not exists payment_events_verified_idx
  on public.payment_events (verified);
