alter table public.reviews
  add column if not exists visitor_name text null,
  add column if not exists contact text null;

create index if not exists reviews_created_at_idx
  on public.reviews (created_at desc);

create index if not exists reviews_salon_status_idx
  on public.reviews (salon_id, status, created_at desc);
