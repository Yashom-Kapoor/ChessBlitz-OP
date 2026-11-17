-- Puzzles_Mini_Records: one facts record per player move, for every puzzle in Puzzles_Mini.
--
-- Run once in the Supabase SQL editor (team lead). Safe to re-run: tables are created only if
-- missing, and the function is replaced.
--
-- What it creates:
--   "Puzzles_Mini_Records"         one row per player move (primary key puzzle_id + move_index)
--   "Puzzles_Mini_Records_Status"  one row per puzzle: ok / flagged / failed
--   replace_puzzle_records(...)    swaps one puzzle's records and status in a single transaction
--
-- Access: records are backend-only. Both tables have row-level security turned on with NO
-- policies, and the anon/authenticated roles have no grants, so the app's anon key can't read or
-- write them. Only the service-role key (which bypasses RLS) can. The batch runner and the
-- backend's get_records() use SUPABASE_SERVICE_KEY for this.

begin;

-- ---------------------------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------------------------

create table if not exists public."Puzzles_Mini_Records" (
    puzzle_id       text        not null,
    move_index      integer     not null check (move_index >= 1),   -- player moves only: 1, 2, 3...
    fen             text        not null,                           -- board before this player move
    move_san        text        not null,
    player_color    text        not null check (player_color in ('white', 'black')),
    moving_piece    text        not null,
    from_square     text        not null,                           -- "from" is reserved in SQL
    to_square       text        not null,
    is_check        boolean     not null,
    is_capture      boolean     not null,
    is_checkmate    boolean     not null,
    captured_piece  text,                                           -- null when not a capture
    solution_line   text[]      not null,
    engine          jsonb       not null default '{}'::jsonb,       -- Stockfish analysis
    outcome         jsonb       not null default '{}'::jsonb,       -- checkmate / material / promotion
    opponent_idea   jsonb       not null default '{}'::jsonb,       -- {} for now
    schema_version  integer     not null,
    generated_at    timestamptz not null default now(),
    primary key (puzzle_id, move_index)
);

create table if not exists public."Puzzles_Mini_Records_Status" (
    puzzle_id       text        primary key,
    status          text        not null check (status in ('ok', 'flagged', 'failed')),
    message         text,                                           -- error for failed, reason for flagged
    schema_version  integer     not null,
    updated_at      timestamptz not null default now()
);

-- The batch runner asks "which puzzles are done at version N?" on every start.
create index if not exists "Puzzles_Mini_Records_Status_version_idx"
    on public."Puzzles_Mini_Records_Status" (schema_version, status);

-- Link puzzle_id to Puzzles_Mini only if Puzzles_Mini."PuzzleId" has a primary key or unique
-- constraint (Postgres requires one for a foreign key). Otherwise skip it with a notice rather
-- than failing the whole script.
do $$
begin
    if exists (
        select 1
        from pg_constraint c
        join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
        where c.conrelid = 'public."Puzzles_Mini"'::regclass
          and c.contype in ('p', 'u')
          and array_length(c.conkey, 1) = 1
          and a.attname = 'PuzzleId'
    ) then
        if not exists (select 1 from pg_constraint where conname = 'Puzzles_Mini_Records_puzzle_fk') then
            alter table public."Puzzles_Mini_Records"
                add constraint "Puzzles_Mini_Records_puzzle_fk"
                foreign key (puzzle_id) references public."Puzzles_Mini" ("PuzzleId") on delete cascade;
        end if;
        if not exists (select 1 from pg_constraint where conname = 'Puzzles_Mini_Records_Status_puzzle_fk') then
            alter table public."Puzzles_Mini_Records_Status"
                add constraint "Puzzles_Mini_Records_Status_puzzle_fk"
                foreign key (puzzle_id) references public."Puzzles_Mini" ("PuzzleId") on delete cascade;
        end if;
    else
        raise notice 'Puzzles_Mini."PuzzleId" has no primary key or unique constraint; '
                     'skipping the foreign keys to Puzzles_Mini.';
    end if;
end
$$;

-- ---------------------------------------------------------------------------------------------
-- Access: backend-only
-- ---------------------------------------------------------------------------------------------

alter table public."Puzzles_Mini_Records"        enable row level security;
alter table public."Puzzles_Mini_Records_Status" enable row level security;

revoke all on public."Puzzles_Mini_Records"        from anon, authenticated;
revoke all on public."Puzzles_Mini_Records_Status" from anon, authenticated;
grant  all on public."Puzzles_Mini_Records"        to service_role;
grant  all on public."Puzzles_Mini_Records_Status" to service_role;

-- ---------------------------------------------------------------------------------------------
-- replace_puzzle_records
-- ---------------------------------------------------------------------------------------------
-- Replaces all of one puzzle's records and upserts its status row. A function body runs as one
-- transaction, so a crash can never leave a puzzle with its old rows deleted and no new ones.
--
--   p_records: JSON array of row objects (keys = column names above, minus puzzle_id).
--              Ignored when p_status is 'failed': a failed puzzle has no records.
--
-- Called from Python as:
--   supabase.rpc("replace_puzzle_records", {"p_puzzle_id": ..., "p_records": [...],
--                "p_status": ..., "p_message": ..., "p_schema_version": 3})

create or replace function public.replace_puzzle_records(
    p_puzzle_id      text,
    p_records        jsonb,
    p_status         text,
    p_message        text,
    p_schema_version integer
) returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
    if p_status not in ('ok', 'flagged', 'failed') then
        raise exception 'replace_puzzle_records: bad status %', p_status;
    end if;
    if p_status <> 'failed' and jsonb_typeof(coalesce(p_records, 'null'::jsonb)) <> 'array' then
        raise exception 'replace_puzzle_records: p_records must be a JSON array for status %', p_status;
    end if;

    delete from public."Puzzles_Mini_Records" where puzzle_id = p_puzzle_id;

    if p_status <> 'failed' then
        insert into public."Puzzles_Mini_Records" (
            puzzle_id, move_index, fen, move_san, player_color, moving_piece,
            from_square, to_square, is_check, is_capture, is_checkmate, captured_piece,
            solution_line, engine, outcome, opponent_idea, schema_version, generated_at
        )
        select
            p_puzzle_id, r.move_index, r.fen, r.move_san, r.player_color, r.moving_piece,
            r.from_square, r.to_square, r.is_check, r.is_capture, r.is_checkmate, r.captured_piece,
            r.solution_line,
            coalesce(r.engine, '{}'::jsonb),
            coalesce(r.outcome, '{}'::jsonb),
            coalesce(r.opponent_idea, '{}'::jsonb),
            p_schema_version,
            coalesce(r.generated_at, now())
        from jsonb_to_recordset(p_records) as r(
            move_index      integer,
            fen             text,
            move_san        text,
            player_color    text,
            moving_piece    text,
            from_square     text,
            to_square       text,
            is_check        boolean,
            is_capture      boolean,
            is_checkmate    boolean,
            captured_piece  text,
            solution_line   text[],
            engine          jsonb,
            outcome         jsonb,
            opponent_idea   jsonb,
            generated_at    timestamptz
        );
    end if;

    insert into public."Puzzles_Mini_Records_Status" (puzzle_id, status, message, schema_version, updated_at)
    values (p_puzzle_id, p_status, p_message, p_schema_version, now())
    on conflict (puzzle_id) do update
        set status         = excluded.status,
            message        = excluded.message,
            schema_version = excluded.schema_version,
            updated_at     = excluded.updated_at;
end;
$$;

revoke execute on function public.replace_puzzle_records(text, jsonb, text, text, integer)
    from public, anon, authenticated;
grant  execute on function public.replace_puzzle_records(text, jsonb, text, text, integer)
    to service_role;

commit;
