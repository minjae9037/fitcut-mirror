alter table public.profiles
  add column if not exists bio text,
  add column if not exists reference_left_photo_path text,
  add column if not exists reference_front_photo_path text,
  add column if not exists reference_right_photo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mirilook-profile-photos',
  'mirilook-profile-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;
