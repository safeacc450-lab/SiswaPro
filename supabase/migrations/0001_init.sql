-- =====================================================================
-- SiswaPro MVP Phase 2 — 0001_init.sql
-- Run ONCE in the Supabase SQL editor (docs/supabase-setup-guide.md §3).
-- Foundation: arch v0.2 (ADR-4 spaces, ADR-5 tombstones+feed, RLS-only
-- isolation Q3=OptionA, retention pending Q4 hard GC — Phase 3).
-- Deny-by-default: every content table gets RLS + member predicate.
-- =====================================================================

-- ---------- tables first (SQL-language fns validate referenced
-- relations at create time, so is_space_member must come after
-- space_members exists) ----------
create table public.spaces (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('personal','shared')),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

-- membership is the ONLY access path (ADR-4); no roles (exclusion 10)
create table public.space_members (
  space_id  uuid not null references public.spaces(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (space_id, member_id)
);

-- ---------- content (single data-layer shape; tombstones, no moving
-- between spaces — exclusion 6) ---------------------------------------
create table public.subjects (
  id         uuid primary key,
  space_id   uuid not null references public.spaces(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.schedule (
  id         uuid primary key,
  space_id   uuid not null references public.spaces(id) on delete cascade,
  subject    text not null,
  day        text not null,
  start      text not null,
  "end"      text not null,
  room       text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.tasks (
  id         uuid primary key,
  space_id   uuid not null references public.spaces(id) on delete cascade,
  title      text not null,
  subject    text not null,
  done       boolean not null default false,
  due        text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.focus_sessions (
  id         uuid primary key,
  space_id   uuid not null references public.spaces(id) on delete cascade,
  day        text not null,
  minutes    integer not null check (minutes >= 0),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.settings (
  space_id   uuid not null references public.spaces(id) on delete cascade,
  k          text not null,
  v          text not null,
  updated_at timestamptz not null default now(),
  primary key (space_id, k)
);

-- ---------- change feed (ADR-5: append-only, consumed by cursor) -----
create table public.change_feed (
  row_seq    bigint generated always as identity primary key,
  entity     text not null,          -- subjects|schedule|tasks|focus_sessions|settings
  row_id     uuid  not null,
  op         text not null,          -- 'upsert'|'delete' (hard deletes forbidden)
  space_id   uuid not null,
  actor      uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);
create index idx_feed_seq on public.change_feed (row_seq);
create index idx_feed_space on public.change_feed (space_id, row_seq);

-- append-only: authenticated clients may SELECT their spaces' rows;
-- writes happen ONLY through the SECURITY DEFINER trigger below
alter table public.change_feed enable row level security;
create policy feed_select on public.change_feed
  for select using (public.is_space_member(space_id));

create table public.sync_ledger (
  op_id      uuid primary key,
  user_id    uuid references auth.users(id) on delete cascade,
  entity     text not null,
  row_id     uuid not null,
  applied_at timestamptz not null default now()
);
alter table public.sync_ledger enable row level security;
create policy ledger_rw on public.sync_ledger
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- helper: membership predicate (security definer so it can
-- read space_members even when policies are being evaluated) ----------
create or replace function public.is_space_member(_space uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.space_members m
    where m.space_id = _space and m.member_id = auth.uid()
  );
$$;

-- append-only: authenticated clients may SELECT their spaces' rows;
-- writes happen ONLY through the SECURITY DEFINER trigger below
alter table public.change_feed enable row level security;
create policy feed_select on public.change_feed
  for select using (public.is_space_member(space_id));

-- ---------- feed trigger (SECURITY DEFINER bypasses feed RLS) ---------
create or replace function public.feed_notify()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  rid uuid; sid uuid; op text;
begin
  if tg_op = 'DELETE' then
    rid := old.id; sid := old.space_id; op := 'delete';
  else
    rid := new.id; sid := new.space_id;
    op := case when new.deleted_at is not null then 'delete' else 'upsert' end;
    if tg_table_name = 'settings' then op := 'upsert'; end if;
  end if;
  insert into public.change_feed (entity, row_id, op, space_id, actor)
  values (tg_table_name, rid, op, sid, auth.uid());
  return coalesce(new, old);
end;
$$;

create trigger trg_subjects_feed  after insert or update or delete on public.subjects
  for each row execute function public.feed_notify();
create trigger trg_schedule_feed  after insert or update or delete on public.schedule
  for each row execute function public.feed_notify();
create trigger trg_tasks_feed     after insert or update or delete on public.tasks
  for each row execute function public.feed_notify();
create trigger trg_focus_feed     after insert or update or delete on public.focus_sessions
  for each row execute function public.feed_notify();
create trigger trg_settings_feed  after insert or update or delete on public.settings
  for each row execute function public.feed_notify();

-- ---------- RLS: deny by default, membership is everything -----------
alter table public.spaces         enable row level security;
alter table public.space_members  enable row level security;
alter table public.subjects       enable row level security;
alter table public.schedule       enable row level security;
alter table public.tasks          enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.settings       enable row level security;

-- spaces: see/keep spaces you belong to; create your own; no client update/delete
create policy spaces_select on public.spaces
  for select using (public.is_space_member(id) or owner_id = auth.uid());
create policy spaces_insert on public.spaces
  for insert with check (owner_id = auth.uid());

-- members: you may see YOUR rows only (no other member leakage beyond that)
create policy members_select on public.space_members
  for select using (member_id = auth.uid());

-- content: full rw BY MEMBERSHIP ONLY; hard deletes structurally impossible
-- (no DELETE policy anywhere) — tombstones instead (ADR-5, Q4 signed)
create policy subjects_select on public.subjects
  for select using (public.is_space_member(space_id));
create policy subjects_insert on public.subjects
  for insert with check (public.is_space_member(space_id));
create policy subjects_update on public.subjects
  for update using (public.is_space_member(space_id))
      with check (public.is_space_member(space_id));

create policy schedule_select on public.schedule
  for select using (public.is_space_member(space_id));
create policy schedule_insert on public.schedule
  for insert with check (public.is_space_member(space_id));
create policy schedule_update on public.schedule
  for update using (public.is_space_member(space_id))
      with check (public.is_space_member(space_id));

create policy tasks_select on public.tasks
  for select using (public.is_space_member(space_id));
create policy tasks_insert on public.tasks
  for insert with check (public.is_space_member(space_id));
create policy tasks_update on public.tasks
  for update using (public.is_space_member(space_id))
      with check (public.is_space_member(space_id));

create policy focus_select on public.focus_sessions
  for select using (public.is_space_member(space_id));
create policy focus_insert on public.focus_sessions
  for insert with check (public.is_space_member(space_id));
create policy focus_update on public.focus_sessions
  for update using (public.is_space_member(space_id))
      with check (public.is_space_member(space_id));

create policy settings_select on public.settings
  for select using (public.is_space_member(space_id));
create policy settings_insert on public.settings
  for insert with check (public.is_space_member(space_id));
create policy settings_update on public.settings
  for update using (public.is_space_member(space_id))
      with check (public.is_space_member(space_id));

-- =====================================================================
-- §4 seed template — run AFTER creating the two auth users
-- (paste the two uuids from Authentication > Users into the
-- :lea_id / :violet_id literals, see guide §4).
-- =====================================================================
-- do $$
-- declare
--   lea_id    uuid;
--   violet_id uuid;
--   sp_personal uuid;
--   sp_shared   uuid;
-- begin
--   select id into lea_id    from auth.users where email = 'LEA_EMAIL';
--   select id into violet_id from auth.users where email = 'VIOLET_EMAIL';
--
--   -- personal: Lea
--   insert into public.spaces (kind, owner_id, name)
--     values ('personal', lea_id, 'Lea')
--     returning id into sp_personal;
--   insert into public.space_members (space_id, member_id)
--     values (sp_personal, lea_id);
--
--   -- personal: Violet
--   insert into public.spaces (kind, owner_id, name)
--     values ('personal', violet_id, 'Violet')
--     returning id into sp_personal;
--   insert into public.space_members (space_id, member_id)
--     values (sp_personal, violet_id);
--
--   -- shared: "Rumah" — exactly the two members (exclusion 10: symmetric)
--   insert into public.spaces (kind, owner_id, name)
--     values ('shared', lea_id, 'Rumah')
--     returning id into sp_shared;
--   insert into public.space_members (space_id, member_id)
--     values (sp_shared, lea_id), (sp_shared, violet_id);
-- end $$;

-- =====================================================================
-- §5 isolation smoke (run as each user via REST, guide §6):
--   login user A -> GET /rest/v1/tasks   -> must list only shared+own
--   login user B -> GET /rest/v1/tasks   -> must NOT contain A's personal
--   Either   -> GET /rest/v1/spaces      -> must list ONLY spaces they
--                                           are members of
-- Postgres RLS makes unauthorized rows structurally invisible.
-- Hard-deletion probe: DELETE /rest/v1/tasks?id=eq.<uuid> returns
-- 0 affected rows (no DELETE policy) — usage is tombstones only.
-- =====================================================================
