create table if not exists public.payment_orders (
  payment_id text primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  product_id text not null,
  amount integer not null default 0,
  currency text not null default 'KRW',
  buyer_email text null,
  buyer_name text null,
  status text not null default 'ready',
  raw_payload jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_orders_profile_idx
  on public.payment_orders (profile_id, created_at desc);

alter table public.payment_orders enable row level security;

drop policy if exists "service role can manage payment orders" on public.payment_orders;
create policy "service role can manage payment orders"
  on public.payment_orders
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "users can read own payment orders" on public.payment_orders;
create policy "users can read own payment orders"
  on public.payment_orders
  for select
  using (auth.uid() = profile_id);

create table if not exists public.hair_money_accounts (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  total_purchased integer not null default 0 check (total_purchased >= 0),
  total_spent integer not null default 0 check (total_spent >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.hair_money_accounts enable row level security;

drop policy if exists "service role can manage hair money accounts" on public.hair_money_accounts;
create policy "service role can manage hair money accounts"
  on public.hair_money_accounts
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "users can read own hair money account" on public.hair_money_accounts;
create policy "users can read own hair money account"
  on public.hair_money_accounts
  for select
  using (auth.uid() = profile_id);

create table if not exists public.hair_money_ledger (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  direction text not null check (direction in ('credit', 'debit', 'refund', 'adjustment')),
  amount integer not null check (amount > 0),
  balance_after integer not null default 0 check (balance_after >= 0),
  source_type text not null,
  source_id text not null,
  reason text null,
  metadata jsonb null,
  created_at timestamptz not null default now(),
  unique (profile_id, source_type, source_id)
);

create index if not exists hair_money_ledger_profile_idx
  on public.hair_money_ledger (profile_id, created_at desc);

alter table public.hair_money_ledger enable row level security;

drop policy if exists "service role can manage hair money ledger" on public.hair_money_ledger;
create policy "service role can manage hair money ledger"
  on public.hair_money_ledger
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "users can read own hair money ledger" on public.hair_money_ledger;
create policy "users can read own hair money ledger"
  on public.hair_money_ledger
  for select
  using (auth.uid() = profile_id);

create or replace function public.credit_hair_money(
  p_profile_id uuid,
  p_amount integer,
  p_source_type text,
  p_source_id text,
  p_reason text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table(applied boolean, balance integer, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
  v_ledger_id uuid;
begin
  if p_amount is null or p_amount <= 0 then
    return query select false, 0, 'invalid_amount';
    return;
  end if;

  insert into public.hair_money_accounts (profile_id)
  values (p_profile_id)
  on conflict (profile_id) do nothing;

  select account.balance
    into v_balance
    from public.hair_money_accounts account
   where account.profile_id = p_profile_id
   for update;

  insert into public.hair_money_ledger (
    profile_id,
    direction,
    amount,
    balance_after,
    source_type,
    source_id,
    reason,
    metadata
  )
  values (
    p_profile_id,
    'credit',
    p_amount,
    v_balance,
    p_source_type,
    p_source_id,
    p_reason,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (profile_id, source_type, source_id) do nothing
  returning id into v_ledger_id;

  if v_ledger_id is null then
    return query select false, v_balance, 'already_applied';
    return;
  end if;

  v_balance := v_balance + p_amount;

  update public.hair_money_accounts
     set balance = v_balance,
         total_purchased = total_purchased + p_amount,
         updated_at = now()
   where profile_id = p_profile_id;

  update public.hair_money_ledger
     set balance_after = v_balance
   where id = v_ledger_id;

  return query select true, v_balance, null::text;
end;
$$;

create or replace function public.spend_hair_money(
  p_profile_id uuid,
  p_amount integer,
  p_source_type text,
  p_source_id text,
  p_reason text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table(applied boolean, balance integer, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
  v_ledger_id uuid;
begin
  if p_amount is null or p_amount <= 0 then
    return query select false, 0, 'invalid_amount';
    return;
  end if;

  insert into public.hair_money_accounts (profile_id)
  values (p_profile_id)
  on conflict (profile_id) do nothing;

  select account.balance
    into v_balance
    from public.hair_money_accounts account
   where account.profile_id = p_profile_id
   for update;

  if exists (
    select 1
      from public.hair_money_ledger ledger
     where ledger.profile_id = p_profile_id
       and ledger.source_type = p_source_type
       and ledger.source_id = p_source_id
  ) then
    return query select false, v_balance, 'already_applied';
    return;
  end if;

  if v_balance < p_amount then
    return query select false, v_balance, 'insufficient_hair_money';
    return;
  end if;

  v_balance := v_balance - p_amount;

  insert into public.hair_money_ledger (
    profile_id,
    direction,
    amount,
    balance_after,
    source_type,
    source_id,
    reason,
    metadata
  )
  values (
    p_profile_id,
    'debit',
    p_amount,
    v_balance,
    p_source_type,
    p_source_id,
    p_reason,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_ledger_id;

  update public.hair_money_accounts
     set balance = v_balance,
         total_spent = total_spent + p_amount,
         updated_at = now()
   where profile_id = p_profile_id;

  return query select true, v_balance, null::text;
end;
$$;
