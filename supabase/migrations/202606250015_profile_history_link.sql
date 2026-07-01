do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'generation_sessions_profile_id_fkey'
  ) then
    alter table public.generation_sessions
      add constraint generation_sessions_profile_id_fkey
      foreign key (profile_id)
      references public.profiles(id)
      on delete set null;
  end if;
end $$;

create index if not exists generation_sessions_profile_created_at_idx
  on public.generation_sessions (profile_id, created_at desc);
