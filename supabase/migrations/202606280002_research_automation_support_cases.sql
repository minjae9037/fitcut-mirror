create table if not exists public.support_cases (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid null,
  case_type text not null default 'general_inquiry',
  status text not null default 'new',
  priority text not null default 'normal',
  contact_email text null,
  contact_phone text null,
  subject text not null,
  body text not null,
  source_type text null,
  source_id text null,
  payment_id text null,
  request_id text null,
  refund_amount_hm integer null,
  resolution_note text null,
  metadata jsonb not null default '{}'::jsonb,
  resolved_at timestamptz null,
  refunded_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_cases_case_type_check
    check (case_type in (
      'generation_failure',
      'refund_request',
      'payment_issue',
      'account_issue',
      'general_inquiry'
    )),
  constraint support_cases_status_check
    check (status in (
      'new',
      'reviewing',
      'waiting_customer',
      'resolved',
      'dismissed',
      'refunded'
    )),
  constraint support_cases_priority_check
    check (priority in ('low', 'normal', 'high', 'urgent')),
  constraint support_cases_refund_amount_check
    check (refund_amount_hm is null or refund_amount_hm > 0)
);

create index if not exists support_cases_status_created_at_idx
  on public.support_cases (status, created_at desc);

create index if not exists support_cases_profile_created_at_idx
  on public.support_cases (profile_id, created_at desc);

create index if not exists support_cases_request_id_idx
  on public.support_cases (request_id)
  where request_id is not null;

create index if not exists support_cases_payment_id_idx
  on public.support_cases (payment_id)
  where payment_id is not null;

alter table public.support_cases enable row level security;

drop policy if exists "service role can manage support cases"
  on public.support_cases;
create policy "service role can manage support cases"
  on public.support_cases
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
