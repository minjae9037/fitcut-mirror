alter table public.social_messages
  alter column post_id drop not null,
  add column if not exists recipient_profile_id uuid null references public.profiles(id) on delete set null,
  add column if not exists conversation_key text,
  add column if not exists read_at timestamptz;

update public.social_messages message
set recipient_profile_id = post.profile_id
from public.social_posts post
where message.post_id = post.id
  and message.recipient_profile_id is null
  and post.profile_id is not null
  and message.sender_profile_id is distinct from post.profile_id;

update public.social_messages
set conversation_key = case
  when post_id is not null and sender_profile_id is not null and recipient_profile_id is not null
    then 'post:' || post_id || ':' || least(sender_profile_id::text, recipient_profile_id::text) || ':' || greatest(sender_profile_id::text, recipient_profile_id::text)
  when sender_profile_id is not null and recipient_profile_id is not null
    then 'direct:' || least(sender_profile_id::text, recipient_profile_id::text) || ':' || greatest(sender_profile_id::text, recipient_profile_id::text)
  else conversation_key
end
where conversation_key is null;

create index if not exists social_messages_sender_created_idx
  on public.social_messages (sender_profile_id, created_at desc)
  where sender_profile_id is not null;

create index if not exists social_messages_recipient_created_idx
  on public.social_messages (recipient_profile_id, created_at desc)
  where recipient_profile_id is not null;

create index if not exists social_messages_conversation_created_idx
  on public.social_messages (conversation_key, created_at asc)
  where conversation_key is not null;

create index if not exists profiles_display_name_search_idx
  on public.profiles (lower(display_name))
  where display_name is not null;

create index if not exists profiles_bio_search_idx
  on public.profiles (lower(bio))
  where bio is not null;
