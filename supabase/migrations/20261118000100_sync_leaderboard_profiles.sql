begin;

-- Users owns the display name and overall Elo. Ratings also holds per-theme
-- scores, which must survive profile changes and this backfill.
create or replace function public.initialize_ratings_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public."Ratings" as ratings (student_id, name, overall)
  values (new.user_id, new.name, coalesce(new.rating, 0))
  on conflict (student_id) do update
    set name = excluded.name,
        overall = excluded.overall
    where (ratings.name, ratings.overall)
      is distinct from (excluded.name, excluded.overall);
  return new;
end;
$function$;

-- Called only by the trigger, after Users permissions/RLS have been checked.
revoke all on function public.initialize_ratings_row() from public, anon, authenticated;

create or replace trigger on_student_created_ratings
after insert or update of name, rating on public."Users"
for each row execute function public.initialize_ratings_row();

-- Repair older accounts and create any missing rows. Preserve already populated
-- leaderboard values and all per-theme scores when replaying the migration.
insert into public."Ratings" as ratings (student_id, name, overall)
select user_id, name, coalesce(rating, 0)
from public."Users"
on conflict (student_id) do update
  set name = case
        when nullif(btrim(ratings.name), '') is null
          or lower(btrim(ratings.name)) = 'unknown student'
        then excluded.name
        else ratings.name
      end,
      overall = coalesce(ratings.overall, excluded.overall)
  where nullif(btrim(ratings.name), '') is null
    or lower(btrim(ratings.name)) = 'unknown student'
    or ratings.overall is null;

commit;
