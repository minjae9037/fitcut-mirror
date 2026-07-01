alter table public.moderation_events
  drop constraint if exists moderation_events_target_type_check;

alter table public.moderation_events
  add constraint moderation_events_target_type_check
  check (
    target_type in (
      'community_post',
      'community_comment',
      'community_message',
      'social_post',
      'style_vote',
      'review',
      'share',
      'consultation'
    )
  );
