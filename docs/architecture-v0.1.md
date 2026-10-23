# SiswaPro — Offline-First Sync Architecture v0.2-draft (from v0.1, DRAFT for PL approval)

**Author:** Technical Architect · **Date:** 2026-10-21 · **Status:** DESIGN ONLY. No production code changed. Pending PL sign-off (§15).
**Inputs:** AUDIT.md (repo audit), docs/spec/product-spec-v0.3.0.md (CONFIRMED scope), docs/requirements.md, docs/design-spec.md, docs/test-strategy.md, docs/review-report-2026-10-21.md (review input, items C-5/C-6/C-10 + Q1–Q8 framing), current www/ + android/ + CI sources.
**Changelog (v0.1 → v0.2):** documentation revision only — cross-ref/typo fixes (C-10), ADR-10 privacy-posture paragraph closing C-5, ADR-3 identity-recovery ops note closing C-6, §15 annotated with recommendation status. No decisions changed; Q1–Q8 still open for PL.
**Resolves:** Tech-owned spec decisions D-7 (backend class) and D-6 (privacy baseline) are proposed here as ADR-2 / ADR-10 — both still require PL sign-off because of cost and data-residency consequences (§15).

## 1. Verified starting state (from Auditor + code inspection)

| Verified fact | Consequence for this architecture |
|---|---|
| Capacitor 8.5.3 shell, **zero Capacitor plugins** (`capacitor.plugins.json = []`) | SQLite / network / secure-storage plugins are all net-new; nothing may be assumed installed or Capacitor-8-compatible until verified (§11, risk R1) |
| Persistence = one `localStorage` blob `sp_state` + IndexedDB KV backup, whole-state **LWW overwrite** (`www/app.js:15-97`) | Cannot express FR-09 (field merge + explicit same-field resolution) or a durable op queue. Local store is **replaced**, not extended (ADR-1) |
| No accounts, no outbound network | Sync stack is greenfield; data-layer isolation (FR-10) can only come from the new backend |
| CI builds debug APK via GHA (Node 22 / Java 21 / SDK 36); APK also built locally in Termux | Native plugin code compiles inside the existing Gradle chain on both paths; prerequisite fix F-1 required first (defect: Termux `aapt2` path tracked in `android/gradle.properties` breaks clean-checkout CI) |
| Verified copy chain `www/ → assets/public → APK` (hash-identical) | New logic ships as ES modules into the existing copy task; no bundler needed (ADR-1, §11) |
| v1.3 replaced wholesale (D-0), its data NOT migrated (spec §10 item 9) | Fresh schema; v1.3 storage keys left as inert user data; no upgrade path to carry (§12) |

## 2. Traceable constraints

| # | Constraint | Source |
|---|---|---|
| C1 | Exactly 2 users (Lea, Violet); no stranger accounts; one profile per device, no identity switching | spec §0.1, D-3, FR-01, excl. 11 |
| C2 | Every read/write hits local storage first; fully functional offline; data survives force-kill | FR-05, FR-06, NFR-04 |
| C3 | Automatic background sync; offline/pending/synced chip always glanceable; UI never blocked by network | FR-07, FR-08, NFR-02 |
| C4 | Auto-merge non-overlapping edits; same-field conflict → explicit user resolution; **no silent discard**; deterministic convergence | D-5, FR-09 |
| C5 | Personal data never readable by the other user — **at the data layer, not the UI** | FR-10, NFR-03 |
| C6 | Zero server-administration burden for the two users | spec §0.3 |
| C7 | Sync re-run is a no-op; no duplicates; both devices converge byte-identical | NFR-05, spec §12.3 |
| C8 | No credentials in the repo, CI, or app bundle | task rule + REQ-SEC |

## 3. Architecture at a glance

```
DEVICE (Capacitor WebView, vanilla ES modules, no bundler)
  Views: Personal | Shared | Settings + SyncBadge (design-spec §4 states)
    │ emits intents            ▲ reads query()
    ▼                          │
  SpaceStores (in-memory projections, live-rebuilt on SQLite change events)
    ▼
  Repository layer — per-entity repo API (§6.3) over LocalDb (SQLite)
    │  local write = ONE SQLite transaction:
    │  [upsert row | soft-delete tombstone] + [append outbox op]
    ▼
  Outbox (durable op queue, server-idempotent)  SyncEngine (state machine §9)
    │                                            │ pull() applies delta pages
    ▼                                            ▼
  Transport (HTTPS REST)  SessionStore (secure tokens)  NetworkMonitor (events)
    ║ TLS 1.2+ (D-6 baseline)
    ▼
BACKEND (managed Postgres + Auth + row-level security — ADR-2)
  spaces · space_members · content tables (server versions + per-field editor stamp)
  append-only change feed per space · op_results idempotency ledger (op_id PK)
  RLS: personal spaces owner-only → FR-10 enforced in the database
```

One engine, one protocol for personal and shared spaces — the only difference is what each identity's membership authorizes. Nothing syncs through ad-hoc "mine vs yours" branches.

## 4. Architecture Decision Records

### ADR-1 — Local system of record = per-row SQLite (replace blob persistence)
**Decision:** device data lives in SQLite tables (one row per item, schema `user_version` ruler). The `localStorage`/IndexedDB blob stack is retired for the new shell (v1.3 replaced, D-0). Export/import (FR-14) serializes the SQLite contents.
**Options weighed:**
| Option | Verdict | Reason |
|---|---|---|
| Keep localStorage+IDB blob | Rejected | LWW overwrite silently discards edits (breaks C4); no per-row revisions; no atomic row+op commit; blob tombstone bug already observed by Auditor |
| IndexedDB per-record stores | Feasible fallback | No multi-record transactions with consistent ordering for outbox+tombstones; we would re-implement SQLite's guarantees badly. Pinned as the A/B fallback if plugin verification fails (§11 R1) |
| RxDB / PowerSync / PouchDB+CouchDB replication | Rejected | Heavy machinery for a 2-user, 3-entity app; drags a bundler regime into C9; CouchDB needs self-hosting (C6) |
| **Capacitor SQLite plugin (community)** | **Chosen** | Real transactions = kill-safety guarantee (C2/FR-06); revisions/tombstones/migrations expressible natively; Android side compiles inside the existing Gradle chain; testable with in-app backup for escape hatch |
Compliance: C2, C3, C7. Caveat: this **adds a native plugin dependency** — must be verified against Capacitor 8 before any commitment (§11 R1); not assumed working.

### ADR-2 — (D-7 proposal) Backend = managed PostgreSQL with row-level security (RLS)
**Decision:** a small managed Postgres provides Auth + an HTTPS row API with **row-level security as the single enforcement point** for C5. Candidate named: **Supabase** (managed). The architecture binds to *Postgres+RLS semantics*, not to Supabase APIs — a different provider (self-hosted Postgres, Crunchy, Neon with RLS) can be swapped without touching the device design.
**Options weighed:**
| Option | Verdict | Reason |
|---|---|---|
| **Managed Postgres + RLS (Supabase)** | **Chosen** | The one zero-ops path that simultaneously gives named accounts (C1), per-space row security (C5 at data layer), cheap 2-user scale, and an API small enough to wrap in a thin client (§6.4) |
| Firebase / Firestore | Rejected | Document-level last-write-wins conflict semantics — **silently discards user edits**, directly violating C4/D-5; per-field conflict surfacing not expressible without fighting the whole model |
| PocketBase self-host (single Go binary) | Fallback only | Solid product, but somebody must rent and run a box → violates C6 unless the PL accepts that duty (§15 Q1) |
| Self-built API + Postgres on own infra | Rejected for v1 | Maximum control, maximum admin burden; C6 forbids |
| Cloudflare D1 + Workers | Rejected | Row-security would be hand-rolled inside worker code — same guarantees, far more authoring risk |
Compliance: C1, C3, C5, C6, C7. **Open items for PL (not silently decided): billing tier incl. free-tier pausing risk; data residency/region of the managed provider; whether someone runs a fallback VPS (§15 Q1).**

### ADR-3 — Identity: two pre-provisioned accounts, one bound per device
**Decision (updated 2026-10-21 per signed Q2):** Lea and Violet each get a server account created once by a tech-lead-run bootstrap (bootstrap passwords distributed out-of-band; **never** in git, CI, or the bundle — C8; each account is tied to the user's email address). Account flavor = **email + password with self-service email recovery** (decision-table §2.2). First launch: identity screen (Lea or Violet) = FR-01; the account logs in once per device; afterwards silent session refresh. Password reset = standard provider email flow (`resetPasswordForEmail`) — the PL is **not** the permanent reset intermediary (bootstrap + email-service configuration are the only PL-touched ops).
**Options weighed:** open signup (rejected — C1 forbids stranger accounts, and UI-only filtering is not data-layer enforcement); Firebase anonymous auth (rejected — unstable across reinstalls, breaks D-3 device binding); single shared account (rejected — spec D-3 + §6 ownership table require per-user identification; also breaks attribution for FR-09 field stamps).
Compliance: C1, C5, C8, D-3.

**Identity recovery ops note (C-6):**
- **Device loss / reinstall path:** new device (or cleared app data) → identity screen (FR-01) → user selects her identity → login with her distributed password → rebind (a fresh server session for the same account; any old session token is revocable server-side by the PL/tech lead). Local shared-space content is rebuilt by feed replay from cursor 0 (§12 repair hatch); personal-space content likewise rebuilds from the server.
- **Password re-issuance (updated 2026-10-21 per signed Q2):** self-service via the provider's email reset flow — the user's mailbox is the recovery path; the PL does not handle individual resets. Bootstrap passwords are distributed once out-of-band; if the bootstrap password itself is lost before any self-reset, the PL may rotate server-side via provider admin console.
- This is an **ops responsibility; Q2 signed 2026-10-21**: email+password, self-serve recovery. PL ops remain: account creation at bootstrap and email-service configuration (default SMTP OK for dev with team-member addresses; custom SMTP required for production — decision-table §2.1).

### ADR-4 — Spaces as first-class rows; membership is the only access path
**Decision:** `spaces(kind ∈ {personal, shared})`. Each personal space has exactly one member — its owner (`spaces.owner_id`). The one shared space has exactly two members. **Every** content row carries immutable `space_id` (exclusion 6: no moving between spaces). Authorization for reads *and* writes is one predicate: "this row's space lists me in `space_members`", implemented as row-level security. There are no roles (exclusion 10 — symmetric peers).
Compliance: C5 is enforced structurally (a personal space *cannot* have second memberships; policies deny by default); the isolation test (§10.3) proves it at the data layer, not by UI hiding.

### ADR-5 — Sync protocol: durable outbox + server change feed + cursor pull + CAS push + idempotency ledger
The five mechanisms (one ADR because they work only as a set):
1. **Durable outbox** — every local mutation commits `[content write + outbox op]` in one SQLite transaction. Op = `{op_id, space_id, table, row_id, base_version, patch(fields), intent, client_ts, attempts, next_retry}`. UI commits never touch the network (NFR-02); a force-kill at any instant leaves a consistent local state with the op either fully recorded or not yet recorded (FR-06 / NFR-04).
2. **Server change feed** — Postgres triggers append one ordered change row per committed mutation to a per-space feed (`seq bigserial`). Clients pull pages `WHERE seq > cursor`, apply, then advance the stored cursor **in the same local transaction as the applied page**. Interrupted pulls resume from the old cursor and replay — replays are no-ops because apply is version-guarded (C7).
3. **CAS push + idempotency ledger** — push submits queued ops; each carries `base_version` (the device's last observed server version of that row). Server rejects with `4409 stale` when the row has moved on. Server stores `op_results(op_id, outcome)` PK-op_id: **at-least-once delivery is made safe** — replayed or duplicate ops return the recorded outcome and never double-apply (C7, NFR-05).
4. **Server versions + tombstones** — every content row has server-int `version` bumped in the same transaction as its content write; deletes are soft (`deleted_at`) and propagate as ordinary rows; local deletes are recorded tombstones locally until the delete op is acked. Nothing is ever hard-deleted locally before it was provably pushed.
5. **Per-field edit stamps** — ops and rows carry field-level "last touched by device X against base B" metadata, giving FR-09 its mechanics: on a `stale` rejection the engine mechanically classifies fields:
   - local touched, server untouched since base → keep local;
   - server touched, local untouched → take server;
   - both touched → **same-field conflict** → surface explicitly, block that row, user resolves (never auto-picked, D-5).
**Ordering determinism:** convergence is defined by **server receipt order**; devices replay the feed in exactly that order. No device clocks are trusted for conflict decisions.
Compliance: C2, C3, C4, C7; survival test targets in spec §12 (durability, convergence, no-duplicates).

### ADR-6 — Session security: OS-keyed credential store, never the WebView
**Decision:** session + refresh tokens live in native secure storage (Android Keystore-backed plugin) with `localStorage` explicitly forbidden for token material. Tokens also never enter the export blob (FR-14). Sync bookkeeping tables (outbox, cursors, op history) stay device-local forever (spec §6 row "Sync bookkeeping: never leaves device").
**Options weighed:** plain Preferences (rejected — plaintext-ish refresh token on disk), hand-rolled WebCrypto storage (rejected — WebView-scoped, evictable, no OS backing). Compliance: C8, REQ-SEC, D-6 baseline.

### ADR-7 — Deletions are tombstones; GC is explicit and later
**Decision:** deletes are soft everywhere. Local: row marked `deleted=1`, op appended. Server: `deleted_at` set. The opposing device learns of the delete through the change feed (and simultaneously learns "the thing I edited offline is deleted" → the edit-vs-delete case has its own explicit conflict class, §9). Hard deletion happens only server-side GC after **retention window (default 90 days)**, run by the provider's cron/cleanup, and only after change-feed consumers have seen the tombstone.
Why not hard delete: removal races (one user deletes while the other edits offline) silently eat edits otherwise; and pull pages need stable row identities. GC requires PL sign-off (§15 Q4).

### ADR-8 — Versioning & migration: schema versions on both sides, handshake gate
- **Server** owns canonical schema. Migrations live in the repo (`server/migrations/*.sql`), applied forward-only by the tech lead; `schema_meta.version` increments with each. The device negotiates: sync API returns `schema_version`; **device refuses to sync when it doesn't support the server version** (status: `NEEDS-UPDATE`, chip surfaces it) rather than guessing at unknown columns.
- **Client** SQLite schema governed by ordered migration scripts bumped via `PRAGMA user_version`; migrations run inside one transaction at boot. Additive-first policy: no destructive change without a migration + row back-fill plan; DB rebuilt-from-export is the emergency hatch (§13).
- **Wire contract** (§6.4) carries its own version token. Breaking change → bump `prove` → older clients stop syncing (acceptable: 2 devices, both updatable; status is explicit, never silent divergence).
Compliance keeps the whole fleet (2 devices) converging through changes instead of drifting (C7; spec §12.3).

### ADR-9 — Retry economy: bounded exponential backoff, event-driven kicks
**Triggers to attempt sync:** connectivity regained; app resume; local write committed (debounced 2 s); periodic tick (10 min idle); manual chip tap.
**Backoff on failure:** 5 s → 30 s → 2 m → 10 m → 30 m (cap). `attempts` counters live **in the outbox rows** so backoff survives force-kills. Whole-batch failures mark the batch, single-op failures single ops. Sync always self-heals when triggers fire again — no permanent "trying forever" loop that drains battery, and no user-press required (FR-07).
Network flap: push batch is chunked (default 50 ops); partial server acceptance per-op is fine (ledger per op_id) — the next cycle only resends what didn't land.

### ADR-10 — (D-6 proposal) Privacy baseline: TLS + RLS isolation now; E2EE of personal spaces is a flagged upgrade, not the baseline
**Decision:** v1 ships **TLS in transit + RLS at rest** (server operator can technically read rows but authorization forbids *users* to). **No E2EE in v1.** Personal-space E2EE is explicitly recorded as a candidate upgrade with a cost note: it would break server-side per-field conflict stamps and field merge mechanics unless the symmetric users negotiate keys between devices — significant scope increase, deferred.
Risks accepted and surfaced (never buried): the backend can read both spaces' content in v1; backups of the provider contain plaintext. If the PL decides that is unacceptable (§15 Q3) → E2EE becomes an MVP requirement and this architecture's §7 contracts get revised before any build starts (that is why it's decided **now**, at design phase).
Compliance: FR-10/NFR-3 satisfied (user-level isolation); D-6 constraint (TLS minimum) met; exclusion 8 respected (nothing beyond baseline promised).

**Privacy posture (explicit, closes review item C-5):** two levels of "private" must not be conflated.
- **User-level isolation — GUARANTEED.** Violet cannot read Lea's personal content at the data layer. This is enforced by RLS (ADR-4), test-verified per §10.3 / spec §12 success criterion 2, and traceable to FR-10/NFR-03. This is what the product's "private" promise means (spec §1. C-5): private from the **other USER**.
- **Operator-level visibility — NOT private in v1.** The infrastructure operator (the managed-Postgres provider, e.g. Supabase) can technically read content in plaintext in v1; there is no E2EE by design (exclusion 8, D-6 baseline). Provider backups likewise contain plaintext.
- User-facing language must say "private" without implying E2EE; the Settings/privacy surface may state plainly that data is stored on a hosted service (copy owned by the PL). If the PL judges operator-level visibility unacceptable, **§15 Q3 changes this architecture BEFORE build** (E2EE becomes an MVP requirement and §6 contracts are revised — see ADR-10 above).

## 5. Component boundaries

| Component | Owns | May not touch |
|---|---|---|
| **Views** (`www/views/*.js`) | Rendering, event wiring, intent emission only | Storage, network, sync logic |
| **SpaceStore** (per space) | In-memory ordered projections for current space; rebuilds on LocalDb change events | Server communication |
| **Repository layer** (`repo/*`) | The only path to LocalDb; implements per-entity create/update/complete/delete + list; commits row+outbox atomically | HTTP anything |
| **LocalDb** (`db/*`) | SQLite lifecycle, schema migrations, WAL, kill-safe transactions | Semantics of rows (no business logic) |
| **Outbox + SyncEngine** (`sync/*`) | State machine §9, retry economy, conflict classification | UI rendering; content interpretation beyond field stamps |
| **Transport** (`net/*`) | HTTPS calls, session header injection, chunking | Conflict logic |
| **SessionStore** | Token storage/refresh via secure storage | Anything else |
| **NetworkMonitor** | Connectivity events → engine kicks | Data |
| **Backend (server/)** | Postgres schema (migrations), RLS policies, change feeds, op ledger | Holds no client business logic beyond stamps/classification |

Boundary rule: **views never read storage directly, storage never knows sync state, sync never rewrites user content (it only merges classified fields).**

## 6. Data & interface contracts

### 6.1 Local SQLite schema (conceptual; final DDL is authored per-entity at build time)

```
meta(space_id TEXT, cursor BIGINT, last_sync_at, schema_ver, PRIMARY KEY(space_id))
identity(device_profile)  -- bound identity (Lea|Violet), one row (D-3); device-local

notes(id TEXT PK, space_id, title, body, deleted INT, updated_at, version, base_version, base_json)
homework(id TEXT PK, space_id, title, subject_id, done, deleted INT, updated_at, version, base_version, base_json)
subjects(id TEXT PK, space_id, name, deleted INT, updated_at, version, base_version, base_json)
profile(id TEXT PK, space_id, display_name, accent, deleted INT, updated_at, version, base_version, base_json)
shared_tasks(id TEXT PK, space_id, title, done, deleted INT, updated_at, version, base_version, base_json)
outbox(op_id TEXT PK, space_id, table, row_id, base_version, patch_json, intent, client_ts, attempts, next_retry, state)
conflicts(op_id TEXT PK, table, row_id, incoming_json, server_json, base_version, resolved INT)
```
- `base_json` (server-as-seen shadow) + per-row `version` give ADR-5's mechanical 3-way classification; every content write by the app updates `base_version` to latest known and moves the shadow.
- `outbox.state ∈ queued|sending|settled|failed`.
- Indexes: `(space_id,updated_at)` on each content table; `outbox(next_retry)` for the retry scan.

### 6.2 Server schema (conceptual)
```
spaces(id PK, kind, owner_id→auth.users, created_at)
space_members(space_id, user_id, PK(space_id,user_id))
  -- policy: personal spaces accept only the owner row; shared accepts exactly the two accounts
notes / homework / subjects / profiles / shared_tasks(  -- content tables
  id PK, space_id FK→spaces, server row fields (title, body, done, subject_id, accent, display_name...),
  version BIGINT NOT NULL, server_edits jsonb   -- field → {by_device, base_seen}
  deleted_at timestamptz NULL,  updated_at timestamptz)
change_feed(space_id, seq BIGSERIAL, table, row_id, op ('upsert'|'delete'), changed_at, PK(space_id, seq))
op_results(op_id TEXT PK, outcome jsonb, created_at)
schema_meta(version INT)
```
Row-security sketches (enforcement, not decoration):
```
personal read/write:  auth.uid() = spaces.owner_id
shared read/write:   auth.uid() IN (SELECT user_id FROM space_members m JOIN spaces s
                                     ON m.space_id=s.id WHERE s.kind='shared' AND m.space_id = row.space_id)
membership insert:   denied for personal spaces except owner's own bootstrap
default:             DENY (no policy = no access)
```

### 6.3 Repository API (device-internal)
All per entity E ∈ {notes, homework, subjects, profile, shared_tasks}:
```
E.create(fields)            → returns id immediately (local write, outbox enqueue)
E.update(id, patch)         → local write + enqueue
E.complete(id, bool)        → update done-state equivalents
E.delete(id)                → tombstone + enqueue
E.list(space, view)         → live projection from SpaceStore (Personal|Shared)
E.export()                  → full JSON for FR-14 (schema_version stamped)
E.import(json)              → validated import (see §12), homed locally, then synced
Identity.bind(profile)      → one-time FR-01 selection
Sync.status()               → chip state (§9)
Conflict.resolve(op_id, choice)  → user resolution applies + enqueue
```
Invariants: every write that enqueues an op commits both in one transaction; reads are never dependent on network state; airplane mode changes nothing about any of the above.

### 6.4 Sync API (transport contract v1, versions stamped)
```
POST /sync/push   {space_id, schema_ver, ops:[{op_id, table, row_id, base_version, patch, intent, client_ts}]}
  → 200 {results:[{op_id, status: 'applied'|'stale'|'deleted-base'|'invalid', row?:{...,version,server_edits}}]}
  (stale = CAS rejection; row field carries current server row + server_edits stamps for §7 classification)
GET  /sync/pull   {space_id, schema_ver, after: cursor, limit}
  → 200 {schema_version, changes:[{seq, table, row:{...,version,server_edits}}], next_cursor}
POST /auth (per provider)  handled by Auth SDK; tokens never logged/exported (C8, ADR-6)
```
Error classes → engine mapping: `network` (retry per ADR-9); `409/4409 stale` (recompute, conflicts); `invalid` (op poison-flag: surfaced, never silently dropped); `auth` (re-login flow); `schema` (NEEDS-UPDATE state).

## 7. Same-field conflict & device convergence (framing FR-09 end-to-end)
1. Both devices offline edit the same shared task.
2. Both push. Whichever lands second gets `stale` + the current server row + `server_edits` stamps.
3. Classification per field: local-only change → local wins; server-only change → server wins; **both changed same field** → conflict queue row.
4. UI shows one resolution surface for that row's conflicting fields; both sides' stalled text visible; choice is pushed like any other op (CAS on fresh version).
5. Both devices replay the server feed afterwards and hold **byte-identical rows** (the resolution became the server's field of record).
No auto-pick has occurred anywhere in this path (D-5 guarantee). The "identity attribution" (who wrote the last field stamp) exists to classify only — the app never exposes "who-wrote-what" scoreboard columns.

## 8. Data model sanity vs product ownership matrix (spec §6)
| Spec ownership row | This architecture |
|---|---|
| Personal notes/homework/subjects — owner only, owner's sync store | Rows space-scoped to that user's personal space; RLS permits only the owner; these spaces never even reach the other device (feed pulls are per-space) |
| Shared tasks — both read/write | One shared space, membership = both, content table `shared_tasks` |
| Profile (name, accent) | `profiles` row in the owner's personal space; nothing arrives in the other user's feeds |
| Sync bookkeeping | Tables `outbox`, `meta`, `identity` are device-only; the server never receives them |
Homework due dates (FR-13, P2 NOT approved) carry no column today; approving them later = additive migration, no redesign (§12).

## 9. SyncEngine — state machine, triggers, and interrupted-sync recovery
States (chip-mapped, design-spec §4 + spec §8):
```
              ┌──────────── start / connectivity / debounced write / 10-min tick / manual
BOOT → AUTHENTICATING → SYNCING ⇄ IDLE                failures → RETRY-WAIT (ADR-9 backoff)
                          │  (push batch → pull pages → classify/merge → apply → commit cursor atomically)
                          ├─ any same-field conflict row queued: CONFLICT-PENDING (chip+badge, non-blocking)
                          ├─ transient transport fail:           OFFLINE (chip; pending never dropped, FR-08)
                          ├─ tokens dead + refresh fail:         REAUTH (explicit re-login surface)
                          └─ schema version gate fail:           NEEDS-UPDATE (chip; no data damage)
```
Guarantees per state: SYNCING is cancellable/killable at any instant; IDLE+nonempty outbox is impossible (engine wake guarantees reconsideration); OFFLINE awaits triggers only; CONFLICT-PENDING does **not** block unrelated rows from syncing (only the conflicted rows are stalled); REAUTH keeps local writes flowing (offline rights never end locally).
**Recovery after interrupted synchronization:** interrupted push → outbox rows unchanged → next kick re-pushes; ledger answers by op_id (no duplicates). Interrupted pull → cursor stayed → replay; version-guarded apply makes replay no-op. Interrupted apply+cursor commit → both happened or neither (single transaction). Long outage → local ops queue; on regain, ordering is restored purely by feed replay order, so post-outage edits converge. No manual repair is ever needed by users — the Phase-3 recovery harness verifies this invariant (§14).

## 10. Security boundaries & threat notes
| Boundary | Enforced by | Note |
|---|---|---|
| Device at rest | OS app sandbox | SQLite unencrypted in v1 (same acceptance level as v1.3 REQ-SEC-02). Recorded; upgrade = encrypted SQLite variant (§15 Q6) — cost/compat is why it's a flagged option, not the default |
| Transport | TLS 1.2+ only; HSTS by provider (D-6 baseline, ADR-10) | |
| Server authorization | RLS default-DENY + per-space policies (ADR-4) | Personal isolation is data-layer, test-verified (§10.3) |
| Account integrity | Pre-provisioned accounts; password reset = out-of-band (ADR-3) | No credential material in repo/bundle (C8) |
| WebView XSS | Strict; all dynamic text escaped at render (existing discipline `esc()` kept; new views same rule) | REQ-SEC-01 |
| Import surface | `E.import()` schema-validated, size-bounded | REQ-SEC-03 discipline carries to SQLite import |
| Export blob (FR-14) | Contains user content, not tokens | Warned + attributed in UI per spec (share carefully) |
| Token theft | Short-lived access token + refresh token in Keystore-backed storage; export/re-sync needs live login | ADR-6 |
### 10.3 Isolation test (success criterion 2 in the spec)
After full bidirectional sync: the SQLite file and change-feed captures of either device contain **zero rows, IDs, or field values from their peer's personal space** — enforced by RLS, demonstrated by direct DB/feed inspection (a test-lead case, executed later — here only the requirement is planted).

## 11. Dependencies & build constraints (Android / Termux reality, nothing assumed)
| Dependency | Class | Need | Risk / note |
|---|---|---|---|
| Capacitor core/android/**cli** 8.5.3 | existing | — | Current versions kept; plugin compatibility checked at install (R1) |
| **@capacitor-community / sqlite plugin** (candidate) | NEW, native | Local store | Android native code compiles via Gradle on both CI and Termux. R1: must verify official Capacitor 8 compatibility **before** committing — the plugin may lag new Capacitors |
| Secure storage plugin (candidate) | NEW, native | Tokens (ADR-6) | Keystore-backed; R2: same caution as R1 |
| Network connectivity plugin (candidate) | NEW, small | connectivity events | Tiny, low risk |
| Supabase client (candidate) | NEW, JS | transport | `supabase-js` ESM build vendored under `www/vendor/` (single file, no bundler — C9); only REST+Auth slices used; RISK: pinned version, no CDN fetch |
| Postgres RLS+triggers | server, free | Authorization, feed | Written as SQL migrations in repo |
Existing GHA + Termux Gradle: unchanged by this design except prerequisite **F-1**: remove/repair the Termux `aapt2FromMavenOverride` setting tracking (AUDIT defect #1) so CI clean-checkouts build — otherwise **no native plugin can even be compiled on CI**, and none of this architecture is reachable.
No bundler is introduced. Pure-ES modules; smallest expressible `.vendor/` for the backend client only.

## 12. Migration strategy
- **No data migration** from v1.3 (D-0 + spec exclusion 9). New shell installs fresh; old `sp_state`/IDB keys are left as-is — inert. Existing **text export** from v1.3 is not carried in (explicit exclusion).
- **Schema versioning (ADR-8):** server migrations forward-only (`schema_meta.version`); client migrations via `user_version`; breaking contract changes gate with NEEDS-UPDATE, never silent divergence. **Two devices means migrations are short-lived coexistence windows — the standing design check is: "will both devices agree during the ≤1-day window when only one has upgraded?"**
- **Additive-first content policy:** new fields (e.g., FR-13 due dates if ever approved) are additive nullable columns + version bump only. Nothing else.
- **Repair hatch (§13):** device SQLite rebuildable from server feed replay (fresh cursor 0, re-apply). Import (FR-14) runs the reverse — content back into local DB with re-sync. Both are engineering safety nets, not user features.
- **Tombstone GC** only after the retention window and after both devices observed the tombstone (§15 Q4).

## 13. Failure modes (each with detection + standing behavior)
| # | Failure | Standing behavior (built into the design) |
|---|---|---|
| F1 | Force-kill / crash mid-write, mid-push, mid-pull | SQLite transaction + ADR-5 mechanisms → consistent local state; recovery by replay (§9) |
| F2 | Network flap, long outage | Local sovereignty preserved (C2); outbox queue grows; chip OFFLINE; retry economy ADR-9 resumes convergence on regain; ordering via feed |
| F3 | Same-field edits both offline | Explicit conflict surface; never auto-picked (D-5); unrelated rows unaffected |
| F4 | Edit-vs-delete race | Delete is a field-class conflict too: "retain my edit creating or accept the deletion" is surfaced, decided by a human (no silent drop) |
| F5 | Invalid/quota op rejected (`invalid`) | Engine poison-flags the op; chip shows "+1 error"; user surface explains; never silently dropped or retried forever |
| F6 | Token expiry / refresh failure | REAUTH state; local writes keep happening; local data safe; syncing restores on new session; SSO/refresh handled via secure store (ADR-6) |
| F7 | Server schema moves on (schema_ver gate) | NEEDS-UPDATE state, chip, explicit in-app angle — no column-guessing |
| F8 | Outbox grows unboundedly (rare: total outage) | Attempts cap soft-block at device-tunable size; user is told via chip; storage pressure transferable via export (FR-14); **flush happens automatically on regain** |
| F9 | Clock skew / clock tampering | Server timestamps only, authoritative in feed and conflict classification; client clocks never trusted (ADR-5) |
| F10 | Backend outage / data loss | Device is authority for its own content; re-push after any server restore (all 2 spaces' content re-continued from the device ledger). This is why the outbox is durable and server-ordered, not device-trusting |
| F11 | Identity wiping / reinstall (clear data) | Server remains the memory: rebind → pull own spaces from server (C8 covers account ops); shared history rests server-side (backup policy = provider's, surfaced in PL docs) |

## 14. Integration plan (phases; each phase lands verifiable behavior first)
**Phase 0 (pre-flight, AUDIT discharge — allowed before any sync code):**
  F-1 fix gradle.properties Termux override (untracked/overridable) so CI can build clean; commit tracked-file drift (AUDIT #1-3); version-consistency pass (v1.2 vs v1.3); `Example/` remains untouched.
**Phase 1 (local shell, no backend):** SQLite LocalDb + migrations + repository layer + per-entity stores; views rebuilt onto repos; identity screen (FR-01); all features fully airplane-mode working, export/import rebuilt (FR-14); existing app retired.
  Verify: local durability tests (§ test-strategy TC-DA scheme, extended to SQLite kill-safety); zero network bytes.
**Phase 2 (backend exists):** server migrations + RLS + feeds + ledger; two accounts bootstrapped (PL-supplied credentials out-of-band); Auth + session storage in Keystore-backed storage; Synchronization smoke (push/pull happy path; identity-isolation verified at feed level).
**Phase 3 (sync engine full):** outbox retry economy ADR-9; field merging + conflict classification + pending-conflict surface; SyncBadge per §9 states; interrupted-sync recovery harness tests (spec §12 success criteria).
  Verify: convergence/durability/isolation tests from §12 of spec (spec §12.1-12.6).
**Phase 4 (hardening):** failure-mode table §13 as test cases; low-storage/clock-skew/repeat-offline soak; performance budget NFR-02 (cold start <2 s, sync off-UI-thread); UI polish per design-spec (tokens, a11y, empty states).
Cross-phase: **conflict/deletion UX copy (§7/§9 F4) is written in Indonesian and reviewed before Phase 3 lands** (it is system language, not decoration).

## 15. Decisions requiring Project Leader approval (blockers for implementation start)
| Q | Decision | Architect's recommendation | Why it's yours, not mine |
|---|---|---|---|
| Q1 | D-7 backend class + provider + region + billing tier (free tiers pause; ~$5-25/mo otherwise); or PL-run PocketBase VPS | Managed Postgres+RLS (Supabase) | Cost + data residency + who carries an ops pager (C6/spec §0.3 make zero-ops your call)  **RECOMMENDATION PREPARED — PENDING PL SIGN-OFF (docs/decision-report-2026-10-21.md)** |

| Q2 | Account flavor: password (distributed out-of-band) vs magic-link distribution | Password, distributed once | WHO touches the server account lifecycle (reset etc.)  **RECOMMENDATION PREPARED — PENDING PL SIGN-OFF (docs/decision-report-2026-10-21.md)** |

| Q3 | D-6: accept server-operator-Sees-content v1 and E2EE deferred? | Yes (TLS+RLS baseline) | Privacy posture is a product permission, not a tech nicety  **RECOMMENDATION PREPARED — PENDING PL SIGN-OFF (docs/decision-report-2026-10-21.md)** |

| Q4 | Tombstone retention (90 d proposed) and backend GC policy | 90 days server-side | Retention is a data-governance choice  **RECOMMENDATION PREPARED — PENDING PL SIGN-OFF (docs/decision-report-2026-10-21.md)** |

| Q5 | Deletion conflict verdicts (edit-beats-delete?) and whether "both texts visible" merge UI is acceptable | Edit-beats-delete stays a *type of conflict*, user decides; visibility = both texts shown | Product surface, not tech  **RECOMMENDATION PREPARED — PENDING PL SIGN-OFF (docs/decision-report-2026-10-21.md)** |

| Q6 | Device-at-rest encryption: accept plaintext SQLite (like REQ-SEC-02) now, encrypted plugin variant optional later? | Accept now, revisit later | Same risk envelope as v1.3 but now with server copies — your sign-off  **RECOMMENDATION PREPARED — PENDING PL SIGN-OFF (docs/decision-report-2026-10-21.md)** |

| Q7 | Plugin additions (SQLite, secure-storage, network) + vendor supabase-js | All four | New dependency/attack surface budget  **RECOMMENDATION PREPARED — PENDING PL SIGN-OFF (docs/decision-report-2026-10-21.md)** |

| Q8 | ADR-1 whole local-store replacement + v1.3 retirement (spec-consistent, but irreversible UX level) | Confirm D-0 read: no v1.3 carry-over path, dormant old data keys acceptable on old installs | The "reuse vs replace" line  **RECOMMENDATION PREPARED — PENDING PL SIGN-OFF (docs/decision-report-2026-10-21.md)** |


**Resolved-locally (no approval needed, for transparency):** RLS as the isolation mechanism (ADR-4), tombstone/CRDT-adjacent mechanics (ADR-5), cursor semantics, state-machine states, code-free decisions about module boundaries.

> **Round-2 decision inputs (2026-10-21):** `docs/decision-table-2026-10-21.md` holds the evidence-backed comparison material for the open §15 items: Supabase region/residency (Q1), password vs magic-link recovery (Q2/ADR-3), D-6 option A (RLS/baseline) vs option B (E2EE) with revised contract implications (Q3/ADR-10), retention-policy detail (Q4/ADR-7), plugin-encryption facts + supabase-js vendoring analysis (Q6/Q7), and migration/backup implications (Q8/ADR-1). **PL sign-offs recorded same day: Q3 = Option A (RLS baseline) ✅ · Q2 = email+password self-serve recovery ✅ · Q4 = 90-day retention ✅ · Q6 = token-encryption baseline ✅.** Still open: Q1c region final confirm (Singapore recommended; no Indonesia region exists), Q7 install authorization, Q5 copy-set pick.

## 16. No implementation yet
No production source was touched while producing this document. Implementation begins only after:
(Q1-Q8 answered) → Phase 0 → per-phase `Verify` gates. The architecture doc itself is the artifact of record; spec decisions supersede any code-level impulses that predate sign-off.
