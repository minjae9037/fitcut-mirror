create table if not exists public.salon_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_type text not null default 'salon',
  salon_name text not null,
  designer_name text null,
  contact_name text not null,
  contact text not null,
  address text null,
  specialties text[] not null default '{}',
  profile_url text null,
  memo text null,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint salon_applications_type_check
    check (applicant_type in ('salon', 'designer', 'both')),
  constraint salon_applications_status_check
    check (status in ('new', 'contacted', 'approved', 'rejected'))
);

create index if not exists salon_applications_created_at_idx
  on public.salon_applications (created_at desc);

create index if not exists salon_applications_status_idx
  on public.salon_applications (status, created_at desc);

alter table public.salon_applications enable row level security;

drop policy if exists "service role can manage salon applications"
  on public.salon_applications;
create policy "service role can manage salon applications"
  on public.salon_applications
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
