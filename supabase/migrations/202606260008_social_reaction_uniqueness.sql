with ranked_profile_reactions as (
  select
    id,
    row_number() over (
      partition by post_id, reactor_profile_id
      order by created_at desc, id desc
    ) as rn
  from public.social_reactions
  where reactor_profile_id is not null
),
ranked_session_reactions as (
  select
    id,
    row_number() over (
      partition by post_id, session_key
      order by created_at desc, id desc
    ) as rn
  from public.social_reactions
  where reactor_profile_id is null
    and session_key is not null
    and session_key <> ''
)
delete from public.social_reactions
where id in (
  select id from ranked_profile_reactions where rn > 1
  union all
  select id from ranked_session_reactions where rn > 1
);

create unique index if not exists social_reactions_one_per_profile_idx
  on public.social_reactions (post_id, reactor_profile_id)
  where reactor_profile_id is not null;

create unique index if not exists social_reactions_one_per_session_idx
  on public.social_reactions (post_id, session_key)
  where reactor_profile_id is null
    and session_key is not null
    and session_key <> '';
