-- Allow explicit sibling links (no shared parents required).
-- Run once in Supabase SQL Editor. Safe to re-run.

alter table public.relationships
  drop constraint if exists relationships_kind_check;

alter table public.relationships
  add constraint relationships_kind_check
  check (kind in ('parent', 'partner', 'sibling'));
