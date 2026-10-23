-- SiswaPro MVP Phase 2 — 0003_member_self_insert.sql
-- Applied: 2026-10-24. Enables personal-space self-bootstrap for
-- self-serve signup (sign-off 2026-10-23): on first sync the app
-- creates its own personal space and adds the creator as sole member.
-- The subquery runs under the querying user and only sees their own
-- spaces (spaces_select), so a user cannot join spaces they don't own.
create policy members_insert on public.space_members
  for insert with check (
    member_id = auth.uid()
    and exists (
      select 1 from public.spaces s
      where s.id = space_id and s.owner_id = auth.uid()
    )
  );
