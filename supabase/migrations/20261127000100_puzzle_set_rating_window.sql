begin;

-- The Rated Puzzles board draws nine puzzles near the player's overall rating.
-- Closest first: within 100, then 200, then 400, then any rating, so the board still fills
-- when few puzzles are close. Random inside each band. A null target_rating ignores rating.
-- Replaces the two-argument version; the default keeps two-argument calls working.
drop function if exists public.get_random_puzzle_set_by_themes(text[], text[]);

create or replace function public.get_random_puzzle_set_by_themes(
  theme_filters text[], excluded_ids text[] default '{}', target_rating integer default null
)
returns setof public."Puzzles"
language sql volatile security invoker set search_path = '' rows 9
as $function$
  select puzzle.*
  from public."Puzzles" as puzzle
  where pg_catalog.regexp_split_to_array(coalesce(puzzle."Themes", ''), '\s+') operator(pg_catalog.&&) coalesce(theme_filters, '{}'::text[])
    and not (puzzle."PuzzleId" = any(coalesce(excluded_ids, '{}'::text[])))
  order by
    case
      when target_rating is null then 0
      when pg_catalog.abs(puzzle."Rating"::numeric - target_rating) <= 100 then 0
      when pg_catalog.abs(puzzle."Rating"::numeric - target_rating) <= 200 then 1
      when pg_catalog.abs(puzzle."Rating"::numeric - target_rating) <= 400 then 2
      else 3
    end,
    pg_catalog.random()
  limit 9;
$function$;

revoke all on function public.get_random_puzzle_set_by_themes(text[], text[], integer) from public, anon;
grant execute on function public.get_random_puzzle_set_by_themes(text[], text[], integer) to authenticated;
notify pgrst, 'reload schema';
commit;
