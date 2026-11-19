begin;

-- Photos are public; uploads and changes are restricted to their owner.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Only photo paths are shared, without exposing private columns in public."Users".
create table if not exists public.user_avatars (
  user_id uuid primary key references auth.users(id) on delete cascade,
  storage_path text not null,
  constraint avatar_path_owned_by_user check (
    storage_path ~ ('^' || user_id::text || '/[a-z0-9-]+\.jpg$')
  )
);
alter table public.user_avatars enable row level security;
revoke all on public.user_avatars from anon, authenticated;
grant select, insert, update on public.user_avatars to authenticated;

drop policy if exists "Read profile photos" on public.user_avatars;
create policy "Read profile photos" on public.user_avatars
  for select to authenticated using (true);

drop policy if exists "Insert own profile photo" on public.user_avatars;
create policy "Insert own profile photo" on public.user_avatars
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "Update own profile photo" on public.user_avatars;
create policy "Update own profile photo" on public.user_avatars
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Read own avatar objects" on storage.objects;
create policy "Read own avatar objects" on storage.objects
  for select to authenticated using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Upload own avatar objects" on storage.objects;
create policy "Upload own avatar objects" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'avatars'
    and name ~ ('^' || (select auth.uid())::text || '/[a-z0-9-]+\.jpg$')
  );

drop policy if exists "Delete own avatar objects" on storage.objects;
create policy "Delete own avatar objects" on storage.objects
  for delete to authenticated using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text
  );

commit;
