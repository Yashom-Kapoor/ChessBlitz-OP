begin;

-- Themes contains space-separated Lichess tags. Match whole tags and use OR
-- when several themes are requested, then choose from the full matching pool.
create or replace function public.get_random_puzzle_by_themes(theme_filters text[])
returns setof public."Puzzles"
language sql
volatile
security invoker
set search_path = ''
rows 1
as $function$
  select puzzle.*
  from public."Puzzles" as puzzle
  where pg_catalog.regexp_split_to_array(coalesce(puzzle."Themes", ''), '\s+') && theme_filters
  order by pg_catalog.random()
  limit 1;
$function$;

revoke all on function public.get_random_puzzle_by_themes(text[]) from public, anon;
grant execute on function public.get_random_puzzle_by_themes(text[]) to authenticated;

notify pgrst, 'reload schema';
commit;
