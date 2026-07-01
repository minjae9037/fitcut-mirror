alter table public.payment_events
  add column if not exists profile_id uuid null references public.profiles(id) on delete set null,
  add column if not exists buyer_email text null,
  add column if not exists buyer_name text null,
  add column if not exists entitlement text null,
  add column if not exists entitlement_expires_at timestamptz null;

create index if not exists payment_events_profile_entitlement_idx
  on public.payment_events (profile_id, entitlement, entitlement_expires_at desc)
  where verified = true;

create index if not exists payment_events_entitlement_status_idx
  on public.payment_events (entitlement, status, created_at desc);
