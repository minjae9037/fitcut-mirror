create table if not exists public.social_shares (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  sharer_profile_id uuid null references public.profiles(id) on delete set null,
  session_key text null,
  channel text not null default 'web_share',
  created_at timestamptz not null default now()
);

create index if not exists social_shares_post_idx
  on public.social_shares (post_id, created_at desc);

alter table public.social_shares enable row level security;

drop policy if exists "service role can manage social shares"
  on public.social_shares;
create policy "service role can manage social shares"
  on public.social_shares
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
