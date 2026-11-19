begin;

-- NULL keeps the account name on rankings; existing profiles stay unchanged.
alter table public."Users"
  add column if not exists leaderboard_name text
  constraint users_leaderboard_name_valid check (
    leaderboard_name is null or (
      char_length(leaderboard_name) between 3 and 24
      and leaderboard_name = btrim(leaderboard_name)
      and leaderboard_name !~ '[[:cntrl:]]'
      and leaderboard_name !~ U&'[\007F-\009F\2028\2029]'
      and lower(leaderboard_name) <> 'unknown student'
    )
  );

create or replace function public.initialize_ratings_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public."Ratings" as ratings (student_id, name, overall)
  values (new.user_id, coalesce(new.leaderboard_name, new.name), coalesce(new.rating, 0))
  on conflict (student_id) do update
    set name = excluded.name,
        overall = excluded.overall
    where (ratings.name, ratings.overall)
      is distinct from (excluded.name, excluded.overall);
  return new;
end;
$function$;

revoke all on function public.initialize_ratings_row() from public, anon, authenticated;

create or replace trigger on_student_created_ratings
after insert or update of name, rating, leaderboard_name on public."Users"
for each row execute function public.initialize_ratings_row();

commit;
