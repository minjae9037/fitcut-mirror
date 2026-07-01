create or replace function public.refund_hair_money(
  p_profile_id uuid,
  p_amount integer,
  p_original_source_type text,
  p_original_source_id text,
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

  if not exists (
    select 1
      from public.hair_money_ledger ledger
     where ledger.profile_id = p_profile_id
       and ledger.source_type = p_original_source_type
       and ledger.source_id = p_original_source_id
       and ledger.direction = 'debit'
  ) then
    select coalesce(account.balance, 0)
      into v_balance
      from public.hair_money_accounts account
     where account.profile_id = p_profile_id;

    return query select false, coalesce(v_balance, 0), 'original_debit_not_found';
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
    'refund',
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
         total_spent = greatest(0, total_spent - p_amount),
         updated_at = now()
   where profile_id = p_profile_id;

  update public.hair_money_ledger
     set balance_after = v_balance
   where id = v_ledger_id;

  return query select true, v_balance, null::text;
end;
$$;
