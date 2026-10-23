# SiswaPro Phase 2 — Supabase Setup Guide (run by Project Lead)

What I built in this phase: `supabase/migrations/0001_init.sql` (schema + RLS + change feed + triggers + ledger), client auth/session (`www/auth.js`), happy-path sync (`www/sync.js`), config template (`www/vendor/supabase-config.js`), login screen. What only YOU can do: create the project, create the two accounts, run the SQL, paste config. Why: your account/credentials, gated per standing rules.

## 1. Create the project
1. supabase.com → sign in (your account).
2. New project → **region: Singapore (ap-southeast-1)** — signed Q1c.
3. Free tier is enough for dev/test (signed Q1b). Set a DB password (store in YOUR password manager — it never touches this repo).
4. Wait for provisioning (~2 min).

## 2. Get the API config
- Project Settings → API → copy **Project URL** and **anon public** key.
- These are publishable-by-design; RLS guards data (Q3=OptionA signed). **Never** the service_role key.

## 3. Run the migration
- SQL Editor → open `supabase/migrations/0001_init.sql` (whole file) → Run.
- Expect success with ~20 tables/policies/functions objects. If an error names an object already — rerun once after the conflicting section (idempotent-ish; first full run on a new project is clean).

## 4. Create the two accounts + seed spaces
1. Authentication → Users → **Add user** → `LEA_EMAIL` + password (out-of-band delivery; the pairs are NOT written here).
2. Same for `VIOLET_EMAIL` (+password).
3. Copy both user **UUIDs**; then run the commented **§4 seed** block from 0001_init.sql in the SQL editor, with emails swapped for real ones (or ids).
4. Verify: Table editor → `spaces` shows 3 rows (2 personal, 1 shared Rumah both members).

## 5. Configure the app
- Edit `www/vendor/supabase-config.js` → paste URL, anon key, both account emails.
- Rebuild (`./gradlew assembleDebug` from `android/`) → install APK.

## 6. First-run smoke (Phase 2 acceptance)
Device A (Lea):
1. Onboard (name) → login overlay → Lea email+password → chip shows `Lea…` → `Lea ✓`.
2. Add one task, check it done, add one focus session.
3. Force-stop the app → reopen → your data intact (SQLite) and chip restores via session.
Isolation test (TC-SC-02 at REST level):
4. Device B (Violet): login similarly. Pull shows shared space + Violet's personal ONLY — Lea's personal rows must be absent. Both devices hitting the same task id: Violet must NOT see Lea's personal tasks (server returns only member rows; RLS does it structurally).
5. Negative probe (SQL editor, service role): `select count(*) from tasks` (service role bypasses RLS — expect ≥ all rows). As-anon REST call with no auth: expect 0 rows/401.

## 7. What Phase 2 does NOT cover (explicit)
- Conflict/field merge, synchronous editing, badge full state machine, retention GC (90 days signed but not enforced yet), shared-space UI (Phase 3 does namespace tabs), offline queue (Phase 3 outbox).
- Password reset / email flows: default Supabase SMTP works for the two team-member addresses in dev (2/hr cap); custom SMTP comes later before production.

## 8. Rollback
- `git revert` the Phase-2 commit(s); app keeps working local-only (chip 'Lokal', login screen never shows without config).
- To retire the project entirely: leave Supabase paused; delete the project from the dashboard when you want (no data of value on Free tier beyond test rows; export snapshot first if wanted).
