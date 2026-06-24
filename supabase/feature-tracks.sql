-- ============================================================================
-- Feature tracks migration — Memories, Places, full dates, editor role.
-- Additive and idempotent. Run once in Supabase: SQL Editor -> New query -> Run.
-- Nothing here is destructive; the local fallback keeps working without it.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. New person columns (all optional / nullable)
-- ---------------------------------------------------------------------------
alter table public.people add column if not exists birth_date date;
alter table public.people add column if not exists death_date date;
alter table public.people add column if not exists birth_place text;
alter table public.people add column if not exists places jsonb not null default '[]';

-- ---------------------------------------------------------------------------
-- 1b. Explicit sibling links (no shared parents required)
-- ---------------------------------------------------------------------------
alter table public.relationships
  drop constraint if exists relationships_kind_check;

alter table public.relationships
  add constraint relationships_kind_check
  check (kind in ('parent', 'partner', 'sibling'));

-- ---------------------------------------------------------------------------
-- 2. Memories — short notes any family member can leave on a person
-- ---------------------------------------------------------------------------
create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.trees (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  author text,
  body text not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);
create index if not exists memories_tree_idx on public.memories (tree_id);
create index if not exists memories_person_idx on public.memories (person_id);

alter table public.memories enable row level security;

drop policy if exists memories_select on public.memories;
create policy memories_select on public.memories for select
  using (
    public.is_tree_member(tree_id)
    or exists (
      select 1 from public.trees t
      where t.id = tree_id and t.public_access = true
    )
  );

drop policy if exists memories_insert on public.memories;
create policy memories_insert on public.memories for insert
  with check (public.is_tree_member(tree_id));

drop policy if exists memories_delete on public.memories;
create policy memories_delete on public.memories for delete
  using (public.is_tree_owner(tree_id) or created_by = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. Let editors (not just the owner) add/edit people + relationships
-- ---------------------------------------------------------------------------
drop policy if exists people_insert on public.people;
create policy people_insert on public.people for insert
  with check (public.is_tree_editor(tree_id));

drop policy if exists people_update on public.people;
create policy people_update on public.people for update
  using (public.is_tree_editor(tree_id)) with check (public.is_tree_editor(tree_id));

drop policy if exists people_delete on public.people;
create policy people_delete on public.people for delete
  using (public.is_tree_editor(tree_id));

drop policy if exists relationships_insert on public.relationships;
create policy relationships_insert on public.relationships for insert
  with check (public.is_tree_editor(tree_id));

drop policy if exists relationships_delete on public.relationships;
create policy relationships_delete on public.relationships for delete
  using (public.is_tree_editor(tree_id));

-- ---------------------------------------------------------------------------
-- 4. Editors may also upload photos (previously owner-only)
-- ---------------------------------------------------------------------------
drop policy if exists photos_write on storage.objects;
create policy photos_write on storage.objects for insert to authenticated
  with check (
    bucket_id = 'photos'
    and public.is_tree_editor((storage.foldername(name))[1]::uuid)
  );

drop policy if exists photos_update on storage.objects;
create policy photos_update on storage.objects for update to authenticated
  using (
    bucket_id = 'photos'
    and public.is_tree_editor((storage.foldername(name))[1]::uuid)
  );

-- ---------------------------------------------------------------------------
-- 5. Realtime broadcast for memories
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.memories;
