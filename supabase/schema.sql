-- ============================================================================
-- Cloud Family Tree -- database schema, security policies, and storage.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> Run.
-- Safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS).
-- ============================================================================

-- Needed for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.trees (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Our Family',
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- When true, the app can be viewed by anyone with the link (anonymous SELECT).
alter table public.trees
add column if not exists public_access boolean not null default false;

create table if not exists public.tree_members (
  tree_id uuid not null references public.trees (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'editor' check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (tree_id, user_id)
);

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.trees (id) on delete cascade,
  name text not null default '',
  role jsonb not null default '{"en":"","fr":"","ln":"","sw":""}',
  gender text,
  birth_year int,
  death_year int,
  photo_path text,
  story jsonb not null default '{"en":"","fr":"","ln":"","sw":""}',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table if not exists public.relationships (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.trees (id) on delete cascade,
  kind text not null check (kind in ('parent', 'partner')),
  a_id uuid not null references public.people (id) on delete cascade,
  b_id uuid not null references public.people (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes (leading tree_id for RLS performance)
-- ---------------------------------------------------------------------------
create index if not exists trees_owner_idx on public.trees (owner_id);
create index if not exists tree_members_user_idx on public.tree_members (user_id);
create index if not exists people_tree_idx on public.people (tree_id);
create index if not exists relationships_tree_idx on public.relationships (tree_id);
create index if not exists relationships_a_idx on public.relationships (a_id);
create index if not exists relationships_b_idx on public.relationships (b_id);

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER bypasses RLS to avoid recursion)
-- ---------------------------------------------------------------------------
create or replace function public.is_tree_member(tid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.tree_members m
    where m.tree_id = tid and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_tree_editor(tid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.tree_members m
    where m.tree_id = tid and m.user_id = auth.uid()
      and m.role in ('owner', 'editor')
  );
$$;

create or replace function public.is_tree_owner(tid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.trees t
    where t.id = tid and t.owner_id = auth.uid()
  ) or exists (
    select 1 from public.tree_members m
    where m.tree_id = tid and m.user_id = auth.uid() and m.role = 'owner'
  );
$$;

-- ---------------------------------------------------------------------------
-- Enable Row Level Security
-- ---------------------------------------------------------------------------
alter table public.trees enable row level security;
alter table public.tree_members enable row level security;
alter table public.people enable row level security;
alter table public.relationships enable row level security;

-- trees ----------------------------------------------------------------------
drop policy if exists trees_select on public.trees;
create policy trees_select on public.trees for select
  using (public_access = true or owner_id = auth.uid() or public.is_tree_member(id));

drop policy if exists trees_insert on public.trees;
create policy trees_insert on public.trees for insert
  with check (owner_id = auth.uid());

drop policy if exists trees_update on public.trees;
create policy trees_update on public.trees for update
  using (public.is_tree_owner(id)) with check (public.is_tree_owner(id));

drop policy if exists trees_delete on public.trees;
create policy trees_delete on public.trees for delete
  using (owner_id = auth.uid());

-- tree_members ---------------------------------------------------------------
drop policy if exists members_select on public.tree_members;
create policy members_select on public.tree_members for select
  using (public.is_tree_member(tree_id));

drop policy if exists members_insert on public.tree_members;
create policy members_insert on public.tree_members for insert
  with check (
    public.is_tree_owner(tree_id)
    or (
      user_id = auth.uid()
      and exists (select 1 from public.trees t where t.id = tree_id and t.owner_id = auth.uid())
    )
  );

drop policy if exists members_update on public.tree_members;
create policy members_update on public.tree_members for update
  using (public.is_tree_owner(tree_id)) with check (public.is_tree_owner(tree_id));

drop policy if exists members_delete on public.tree_members;
create policy members_delete on public.tree_members for delete
  using (public.is_tree_owner(tree_id) or user_id = auth.uid());

-- people ---------------------------------------------------------------------
drop policy if exists people_select on public.people;
create policy people_select on public.people for select
  using (
    public.is_tree_member(tree_id)
    or exists (
      select 1 from public.trees t
      where t.id = tree_id and t.public_access = true
    )
  );

drop policy if exists people_insert on public.people;
create policy people_insert on public.people for insert
  with check (public.is_tree_owner(tree_id));

drop policy if exists people_update on public.people;
create policy people_update on public.people for update
  using (public.is_tree_owner(tree_id)) with check (public.is_tree_owner(tree_id));

drop policy if exists people_delete on public.people;
create policy people_delete on public.people for delete
  using (public.is_tree_owner(tree_id));

-- relationships --------------------------------------------------------------
drop policy if exists relationships_select on public.relationships;
create policy relationships_select on public.relationships for select
  using (
    public.is_tree_member(tree_id)
    or exists (
      select 1 from public.trees t
      where t.id = tree_id and t.public_access = true
    )
  );

drop policy if exists relationships_insert on public.relationships;
create policy relationships_insert on public.relationships for insert
  with check (public.is_tree_owner(tree_id));

drop policy if exists relationships_delete on public.relationships;
create policy relationships_delete on public.relationships for delete
  using (public.is_tree_owner(tree_id));

-- ---------------------------------------------------------------------------
-- Storage bucket for photos (public read, member write)
-- Path convention: <tree_id>/<filename>
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

drop policy if exists photos_read on storage.objects;
create policy photos_read on storage.objects for select
  using (bucket_id = 'photos');

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

-- ---------------------------------------------------------------------------
-- Sharing: invite relatives by email, claimed on their first sign-in
-- ---------------------------------------------------------------------------
alter table public.tree_members add column if not exists email text;

create table if not exists public.tree_invites (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.trees (id) on delete cascade,
  email text not null,
  role text not null default 'editor' check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now()
);
create index if not exists tree_invites_email_idx on public.tree_invites (lower(email));

alter table public.tree_invites enable row level security;

drop policy if exists invites_select on public.tree_invites;
create policy invites_select on public.tree_invites for select
  using (public.is_tree_owner(tree_id) or lower(email) = lower(auth.email()));

drop policy if exists invites_insert on public.tree_invites;
create policy invites_insert on public.tree_invites for insert
  with check (public.is_tree_owner(tree_id));

drop policy if exists invites_delete on public.tree_invites;
create policy invites_delete on public.tree_invites for delete
  using (public.is_tree_owner(tree_id) or lower(email) = lower(auth.email()));

-- Moves any invites matching the signed-in user's email into memberships.
create or replace function public.accept_invites()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  moved int := 0;
begin
  insert into public.tree_members (tree_id, user_id, role, email)
  select i.tree_id, auth.uid(), i.role, auth.email()
  from public.tree_invites i
  where lower(i.email) = lower(auth.email())
  on conflict (tree_id, user_id) do nothing;

  get diagnostics moved = row_count;

  delete from public.tree_invites
  where lower(email) = lower(auth.email());

  return moved;
end;
$$;

-- ---------------------------------------------------------------------------
-- Realtime: broadcast row changes for live collaboration
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.people;
alter publication supabase_realtime add table public.relationships;
