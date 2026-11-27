begin;

-- The Rated Puzzles board draws nine puzzles from every theme the player has unlocked.
-- A puzzle matches when any of its whole tags is in theme_filters. An empty list matches nothing.
create or replace function public.get_random_puzzle_set_by_themes(theme_filters text[], excluded_ids text[] default '{}')
returns setof public."Puzzles"
language sql volatile security invoker set search_path = '' rows 9
as $function$
  select puzzle.*
  from public."Puzzles" as puzzle
  where pg_catalog.regexp_split_to_array(coalesce(puzzle."Themes", ''), '\s+') operator(pg_catalog.&&) coalesce(theme_filters, '{}'::text[])
    and not (puzzle."PuzzleId" = any(coalesce(excluded_ids, '{}'::text[])))
  order by pg_catalog.random()
  limit 9;
$function$;

revoke all on function public.get_random_puzzle_set_by_themes(text[], text[]) from public, anon;
grant execute on function public.get_random_puzzle_set_by_themes(text[], text[]) to authenticated;
notify pgrst, 'reload schema';
commit;
