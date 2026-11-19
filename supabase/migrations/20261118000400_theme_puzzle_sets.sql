begin;

-- One draw supplies the nine selectable pieces. Reset excludes the previous set.
create or replace function public.get_random_puzzle_set(theme_filter text, excluded_ids text[] default '{}')
returns setof public."Puzzles"
language sql volatile security invoker set search_path = '' rows 9
as $function$
  select puzzle.*
  from public."Puzzles" as puzzle
  where theme_filter = any(pg_catalog.regexp_split_to_array(coalesce(puzzle."Themes", ''), '\s+'))
    and not (puzzle."PuzzleId" = any(coalesce(excluded_ids, '{}'::text[])))
  order by pg_catalog.random()
  limit 9;
$function$;

revoke all on function public.get_random_puzzle_set(text, text[]) from public, anon;
grant execute on function public.get_random_puzzle_set(text, text[]) to authenticated;
notify pgrst, 'reload schema';
commit;
