-- Run this once in Supabase → SQL Editor.
-- Enables "anyone with the link can view" (no sign-in required).
-- Only the tree owner can still add/edit/delete people.

-- 1) Add the public flag column
alter table public.trees
add column if not exists public_access boolean not null default false;

-- 2) Allow anonymous visitors to read public trees
drop policy if exists trees_select on public.trees;
create policy trees_select on public.trees for select
  using (public_access = true or owner_id = auth.uid() or public.is_tree_member(id));

-- 3) Allow anonymous visitors to read people in public trees
drop policy if exists people_select on public.people;
create policy people_select on public.people for select
  using (
    public.is_tree_member(tree_id)
    or exists (
      select 1 from public.trees t
      where t.id = tree_id and t.public_access = true
    )
  );

-- 4) Allow anonymous visitors to read relationships in public trees
drop policy if exists relationships_select on public.relationships;
create policy relationships_select on public.relationships for select
  using (
    public.is_tree_member(tree_id)
    or exists (
      select 1 from public.trees t
      where t.id = tree_id and t.public_access = true
    )
  );

-- 5) Make your family tree public (uses the most recently created tree).
--    If you have multiple trees, replace the subquery with your tree id.
update public.trees
set public_access = true
where id = (
  select id from public.trees order by created_at desc limit 1
);

-- 6) Verify it worked
select id, name, public_access, created_at
from public.trees
order by created_at desc;
