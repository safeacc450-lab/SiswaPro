-- SiswaPro MVP Phase 2 — 0002_harden_sdf_revoke.sql
-- Applied: 2026-10-23. Fixes supabase linter 0028/0029 (SECURITY DEFINER
-- functions callable via /rest/v1/rpc).

-- feed_notify is trigger-only; its EXECUTE privilege was checked at
-- CREATE TRIGGER time, so revoking is safe and blocks direct RPC calls.
revoke execute on function public.feed_notify() from public, anon, authenticated;

-- is_space_member: other tables' RLS policies call it as the querying
-- role; invoker is sufficient because space_members RLS (members_select)
-- already lets a user read rows where member_id = auth.uid(). Policies
-- derive on the function, hence create or replace (no drop).
create or replace function public.is_space_member(_space uuid)
returns boolean
language sql stable security invoker
set search_path = public
as $$
  select exists (
    select 1 from public.space_members m
    where m.space_id = _space and m.member_id = auth.uid()
  );
$$;
revoke execute on function public.is_space_member(uuid) from public, anon;
