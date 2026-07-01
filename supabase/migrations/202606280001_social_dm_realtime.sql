drop policy if exists "authenticated users can read own social messages"
  on public.social_messages;

create policy "authenticated users can read own social messages"
  on public.social_messages
  for select
  to authenticated
  using (
    auth.uid() = sender_profile_id
    or auth.uid() = recipient_profile_id
  );

alter table public.social_messages replica identity full;

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'social_messages'
  ) then
    alter publication supabase_realtime add table public.social_messages;
  end if;
end $$;
