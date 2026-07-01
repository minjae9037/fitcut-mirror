create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id text not null,
  product_id text not null,
  provider text not null default 'portone',
  status text not null default 'client_returned',
  amount integer not null default 0,
  raw_payload jsonb null,
  created_at timestamptz not null default now()
);

create unique index if not exists payment_events_payment_id_idx
  on public.payment_events (payment_id);

alter table public.payment_events enable row level security;

drop policy if exists "service role can manage payment events" on public.payment_events;
create policy "service role can manage payment events"
  on public.payment_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
