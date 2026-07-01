alter table public.social_posts
  add column if not exists image_paths text[] not null default '{}';

update public.social_posts
set image_paths = array[image_path]
where image_path is not null
  and image_path <> ''
  and coalesce(array_length(image_paths, 1), 0) = 0;
