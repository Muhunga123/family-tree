-- Run this in Supabase SQL Editor if you already ran schema.sql earlier.
-- Locks all writes to the tree owner (admin) only. Everyone else is view-only.

drop policy if exists people_insert on public.people;
create policy people_insert on public.people for insert
  with check (public.is_tree_owner(tree_id));

drop policy if exists people_update on public.people;
create policy people_update on public.people for update
  using (public.is_tree_owner(tree_id)) with check (public.is_tree_owner(tree_id));

drop policy if exists people_delete on public.people;
create policy people_delete on public.people for delete
  using (public.is_tree_owner(tree_id));

drop policy if exists relationships_insert on public.relationships;
create policy relationships_insert on public.relationships for insert
  with check (public.is_tree_owner(tree_id));

drop policy if exists relationships_delete on public.relationships;
create policy relationships_delete on public.relationships for delete
  using (public.is_tree_owner(tree_id));

drop policy if exists memories_insert on public.memories;
create policy memories_insert on public.memories for insert
  with check (public.is_tree_owner(tree_id));

drop policy if exists memories_delete on public.memories;
create policy memories_delete on public.memories for delete
  using (public.is_tree_owner(tree_id));

drop policy if exists photos_write on storage.objects;
create policy photos_write on storage.objects for insert to authenticated
  with check (
    bucket_id = 'photos'
    and public.is_tree_owner((storage.foldername(name))[1]::uuid)
  );

drop policy if exists photos_update on storage.objects;
create policy photos_update on storage.objects for update to authenticated
  using (
    bucket_id = 'photos'
    and public.is_tree_owner((storage.foldername(name))[1]::uuid)
  );

drop policy if exists photos_delete on storage.objects;
create policy photos_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'photos'
    and public.is_tree_owner((storage.foldername(name))[1]::uuid)
  );

-- Downgrade any existing editors to viewers (owner keeps owner role).
update public.tree_members set role = 'viewer' where role = 'editor';
