create table if not exists public.consultation_shares (
  token text primary key,
  session_id text not null references public.generation_sessions(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz null
);

create index if not exists consultation_shares_session_idx
  on public.consultation_shares (session_id, created_at desc);

create index if not exists consultation_shares_expires_at_idx
  on public.consultation_shares (expires_at);

alter table public.consultation_shares enable row level security;

drop policy if exists "service role can manage consultation shares" on public.consultation_shares;
create policy "service role can manage consultation shares"
  on public.consultation_shares
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
