# SiswaPro MVP — QA Strategy & Test Plan v2

| | |
|---|---|
| **Version** | v0.1-draft |
| **Date** | 2026-10-21 |
| **Status** | **PROPOSED — nothing executed.** No result below may be recorded as run. Run gating is tied to architecture §14 phases (Phase 1 local shell / Phase 2 backend / Phase 3 sync engine / Phase 4 hardening): a TC is runnable only when the phase it depends on has passed its verify gate. |
| **Binds to** | docs/spec/product-spec-v0.3.0.md (FR-01…FR-16 incl. FR-13/FR-14/FR-15/FR-16, NFR-01…NFR-07, §12 success criteria) · docs/architecture-v0.1.md (§9 state machine + interrupted-sync recovery, §10.3 isolation test requirement, §13 failure modes F1–F11, §14 phase verify gates) · docs/review-report-2026-10-21.md (C-3) |
| **Cross-reference pending** | REQ2-* IDs do not exist yet: `docs/product-requirements-v2.md` has not landed (review-report §5, Product assignment). QA will bind exact REQ2-* IDs to the TCs in §2 after reading that document. Until then this matrix traces to FR/NFR IDs directly. |
| **Evidence discipline** | Same as v1.3 §top matter: no functionality may be claimed working based on documentation, code reading, or this plan. Every result requires recorded evidence via the template in §9. |

## 1. Explicit honesty statement

**NOTHING in this plan has been executed.** There are no results, no pass rates, no "verified in CI" claims. The two-device harness described in §4 is an **unproven proposal until its first run** — device/ADB/AVD behavior (EMULATOR network flapping control, storage-file extraction permissions, timing determinism) is assumed-until-demonstrated, and the first execution phase of each harness TC includes "prove the harness mechanics themselves".

## 2. Requirement-to-test traceability matrix

Priority inherits spec FR priorities: P0 = release-blocking; P1 = high. **Phase gate** = earliest arch §14 phase at which the TC becomes runnable. Backend-dependent TCs are marked **NOT-RUN-UNTIL-PHASE-2** or **NOT-RUN-UNTIL-PHASE-3**.

| Req (spec v0.3.0) | TC IDs | Automated? | Priority | Phase gate |
|---|---|---|---|---|
| FR-01 Identity selection | TC-FR-01-A/B/C, TC-SC-05 | UI-automated (single device) | P0 | 1 |
| FR-02 Personal space owner-only | TC-FR-02-A, TC-ISO-01..03 | device | P0 | 1 (owner-only), 3 (peer-zero-trace) |
| FR-03 Shared space, both read/write | TC-FR-03-A/B, TC-CONV-* | two-device | P0 | 3 |
| FR-04 Space navigation | TC-FR-04-A | UI-automated | P0 | 1 |
| FR-05 Offline operation | TC-NFR-01-A/B, TC-SC-01 | device | P0 | 1 |
| FR-06 Local durability | TC-DUR-* | device | P0 | 1 |
| FR-07 Background sync | TC-FR-07-A/B, TC-SM-01..03, TC-SOAK-01 | two-device | P0 | NOT-RUN-UNTIL-PHASE-2 (smoke), 3 (full) |
| FR-08 Sync status chip | TC-FR-08-A/B/C | UI-automated + device | P0 | smoke 2, full 3 |
| FR-09 Conflict handling | TC-CONV-01 (same-field), TC-CONV-02 (auto-merge), TC-CONV-03b (edit-vs-delete F4), TC-FM-F3/F4 | two-device | P0 | NOT-RUN-UNTIL-PHASE-3 |
| FR-10 Sync isolation | TC-ISO-01..03 | device + adb inspect | P0 | NOT-RUN-UNTIL-PHASE-2 (smoke), 3 (full data-layer) |
| FR-11 Shared tasks (title+done, no subject field) | TC-FR-11-A/B, TC-SC-06 | UI-automated + two-device | P0 | 1 (field shape), 3 (sync) |
| FR-12 Personal notes | TC-FR-12-A, TC-ISO-01 | device | P0 | 1 (local), 3 (not-transmitted) |
| FR-13 Due dates (P2, NOT approved) | — | — | — | n/a — no TC; test only if D-4 reopened (scope discipline: do not test unapproved scope) |
| FR-14 Export & reset | TC-FR-14-A/B/C | device | P0 | 1 (export of local), 3 (export after sync) |
| FR-15 Personal homework | TC-FR-15-A/B, TC-ISO-02 | device | P0 | 1 (local), 3 (zero-trace peer) |
| FR-16 Personal subject list | TC-FR-16-A/B, TC-SC-06, TC-ISO-02 | UI-automated + device | P0 | 1 (per-user list), 3 (never synced cross-user) |
| NFR-01 7-day airplane-mode use | TC-SC-01 + TC-SOAK-01 | device soak | P0 | 1 (local), 3 (with sync) |
| NFR-02 UI never blocks; cold start <2 s | TC-NFR-02-A/B | device | P0 | 1 (start), 2 (off-UI-thread sync) |
| NFR-03 Data-layer privacy | TC-ISO-01..03 | adb + feed capture | P0 | NOT-RUN-UNTIL-PHASE-2/3 |
| NFR-04 Durability (force-kill, crash, battery pull) | TC-DUR-01..04 | device | P0 | 1 |
| NFR-05 Convergence, repeated sync no-op | TC-CONV-01..06 | two-device | P1 | NOT-RUN-UNTIL-PHASE-3 |
| NFR-06 Indonesian UI, no ads/tracking | TC-NFR-06-A/B | UI-automated + traffic capture | P1 | 1 (language), 3 (zero outbound beyond sync host) |
| NFR-07 Destructive confirm + export-first | TC-NFR-07-A/B | UI-automated | P0 | 1 |
| (REQ2-*) | **pending** — binder note §top | — | — | after product-requirements-v2.mdis lands |

Trace rule: every TC maps back to exactly the FR/NFR/§12/F-row that justifies it; no TC without an anchor, no anchor without a TC (audit the matrix both directions before any release gate).

## 3. Spec §12 success criteria as explicit TCs

Each §12 acceptance line is an explicit TC. All are two-device except where noted; all NOT-RUN-UNTIL-PHASE-2/3 where sync is involved.

| TC | §12 criterion | Case (concrete) | Evidence |
|---|---|---|---|
| TC-SC-01 | §12.1 airplane-mode ≥7 days | With networking off: both identities complete full create/edit/complete/delete for shared tasks, personal notes, homework. Soak: device stays offline 7 days (see §5 soak path), then perform ≥5 more operations, then reconnect | Pre/post SQLite dumps; outbox state before/after; convergence check §4 |
| TC-SC-02 | §12.2 isolation at data layer | Full bidirectional sync; then extraction method per §6: SQLite file + change-feed capture of each device must contain **zero** peer-personal-space rows/IDs/field values (arch §10.3) | `adb pull` of DB file + feed dump, inspection script output recorded verbatim |
| TC-SC-03 | §12.3 convergence byte-identical, no-conflict path needs zero manual steps | A scripted sequence of disjoint offline edits on both devices (see §5 orchestration), reconnect, no user interaction: final rows on both devices byte-identical (hash of serialized rows) | Row-hash comparison log; UI recording proving no dialogs appeared |
| TC-SC-04 | §12.4 durability force-kill | Kill app (`adb shell am force-stop` or `kill -9` the process) at each scripted point: mid-write, mid-push, mid-pull, mid-apply (see TC-DUR table §8), after each acknowledged save re-open and verify item present | Per-kill-point adb logcat + post-restart DB dump |
| TC-SC-05 | §12.5 first-run <30 s, two taps | Fresh install → identity choice (tap 1) → confirm (tap 2) → usable personal space; stopwatch from launch intent | Screen recording with visible clock; `am start` timestamp from logcat |
| TC-SC-06 | §12.6 school separation | Search **both devices'** SQLite files and every synced payload for: (a) the other user's subject names, (b) any shared-space row carrying a subject field. Expected: zero occurrences of (a) in peer's storage; zero rows in `shared_tasks` with a non-null subject column (arch/FR-11: shared tasks have no subject field at all) | Schema dump of `shared_tasks` table + full-file grep of DB blob for subject strings; supersedes UI-only check |

## 4. Two-device test approach (fixes review C-3)

Three candidate harnesses. **Recommendation: (a) as primary CI, (b) for manual/on-device realism, (c) for release-gate soak only.** All three are unproven until run (§1).

### 4.1 Option (a) — two AVDs on one GHA runner (PRIMARY CI)

- `reactive-circle` style runner or one with KVM; boot two AVDs (different API levels optional) with `emulator -avd A`, `emulator -avd B`, fuss-free via helper scripts.
- Orchestration purely over **adb**: `adb -s emulator-5554 ...` per device. Install same APK on both; bind identity Lea vs Violet per device; seed fixtures via app-driven writes through a debug test hook OR UI automation (deeplink/adb input) — **preference: drive via UI/adb input where possible; a test-only hook must not ship in release builds** (gate in §10).
- Pros: deterministic, cheap, parallelizable, reproducible network characteristics; Cons: emulator clock skew, no real radio, `am force-stop` semantics vs real low-memory kill differ — durability claims from AVD are strengthened, not replaced, by option (b).

### 4.2 Option (b) — 1 physical device + 1 AVD via ADB (manual / verification)

- Same APK, one real device (Lea role), one AVD (Violet role) over USB adb.
- Adds: real storage eviction behavior, real kill semantics, real clock. Used to validate AVD-only conclusions from (a) before any release gate and for the §5 soak.

### 4.3 Option (c) — two physical devices (release-gate soak)

- Both Lea's and Violet's roles on real test hardware (not users' phones).
- Highest fidelity for NFR-01/TC-SC-01 and TC-DUR battery-pull. Manual, occasional, checklist-driven.

### 4.4 Orchestration primitives (all options)

1. **Deterministic offline-edit-then-reconnect:** both devices start in airplane mode (or emulator network via `adb shell svc data disable` / `svc wifi disable`, or `-gsm` emulated network). Scripted writes on both. Then re-enable one device, wait for sync completion via the FR-08 chip state (poll chip or debug state endpoint), then re-enable the other, wait, then run the convergence check of §3 TC-SC-03. The script asserts chip transitions OFFLINE → SYNCING → synced and never REAUTH/NEEDS-UPDATE during a healthy flow.
2. **Controlled clock:** device timezone set fixed; airplane-mode days simulated by advancing device clock for soak scenarios where 7 real days is impractical — **distinct from NFR-01's literal 7-calendar-day requirement, which is run as a real soak (c)**; both kinds recorded separately in evidence. Client clocks are never trusted by the design (F9) so clock manipulation may not disturb convergence assertions — that is itself an assertion (TC-SOAK-03).
3. **Artificial connectivity flapping:** a driver toggles `svc data`/`svc wifi` (AVD) or airplane mode (physical) on a scripted schedule (drop mid-push, drop mid-pull, RST mid-batch) to exercise ADR-9 backoff + F2. Exact deterministic behavior of emulator networking switches is **unproven until run**; where insufficient, fall back to a local proxy between device and backend that kills connections on command. Proxy is harness infrastructure, not production, and is documented in evidence.

## 5. Third set of §12 checks — automated two-device flow (concretized)

- **Concurrency offline:** both devices are script-driven with disjoint single edits while offline, in alternating order, ≥3 permutations, before reconnect — asserting convergence regardless of who reconnects first.
- **Soak path (manual, option b/c):** TC-SOAK-01 real 7-day airplane soak with light use; weekly snapshot of SQLite + outbox; reconnect; full convergence + zero-loss check (§12.1).
- **TC-SOAK-02:** 24-hour connectivity-flap soak with continuous scripted edits (AVD acceptable here), asserting no unboundedly growing outbox (F8 bound) and eventual convergence.
- **TC-SOAK-03:** clock disturbance during convergence window (advance +48 h mid-flight) — converges; no duplicate rows (NFR-05 + F9).

## 6. Data-layer isolation method (implements arch §10.3, §3 TC-SC-02)

```
for DEVICE in A B:
  adb root || adb root-required note   # on normal user devices: use work profile copy via `run-as` if debuggable build
  adb pull /data/data/<pkg>/databases/<name>.db (+ wal/shm)
  decode: rows tbl(*) GROUP BY space_id -> assert {A: A-personal only + shared; B: B-personal only + shared}
  change-feed capture: from server, dump /sync/pull full feed per space_id
    assert: B-personal space feed not fetchable under A's session (403), and vice versa
  full-db raw grep: no byte sequence of peer's seeded fixture titles/ids in either DB file
assert: peer-space content count == 0  (rows, ids, field values)
```
Fixtures use unique sentinel strings (e.g. `ISOLEA-<uuid>`) so grep hits are unambiguous. RLS itself is also probed directly with each account's token against the other's space IDs (expect DENY), since RLS is ADR-4's single enforcement point. This works only for Phase ≥2; in Phase 1 the equivalent is asserted as: the app-level export of device A contains no rows for device B's identity (no backend exists yet, TC-ISO-00).

## 7. Convergence property tests (Phase 3; NOT-RUN-UNTIL-PHASE-3)

| TC | Property | Method | Expected (anchored: FR-09, NFR-05, arch §7/§9) |
|---|---|---|---|
| TC-CONV-01 | both-edit-same-field | Both devices offline-edit `title` of same shared task; both reconnect; per §7 arch, second pusher receives `stale` + stamps; **surface appears on that device**; user picks | Explicit resolution surface on exactly the conflicted item (single column "title"), both stalled versions shown; choice applies; after both devices pull again: rows byte-identical (hash equal); no silent pick executed anywhere; unrelated rows synced meanwhile (CONFLICT-PENDING non-blocking) |
| TC-CONV-02 | non-overlapping auto-merge | Disjoint fields offline-edited (`title` on A, `done` on B) | Both fields present both devices, no prompt ever, no conflict row created, byte-identical after sync |
| TC-CONV-03 | repeated sync no-op | After convergence: trigger sync ≥3× (manual chip tap + connectivity flap + idle tick) | No duplicate rows; row hashes stable; no outbox growth; feed cursor unchanged when no new ops |
| TC-CONV-04 | interrupted push replay | Push driven, kill app mid-push (TC-DUR-02 kill points) | On restart: outbox intact; same ops re-pushed without duplicates (ledger answers by op_id); server content correct; final state converged |
| TC-CONV-05 | interrupted pull replay | Pull driven, kill mid-page application | Cursor either advanced-with-applied or stayed-and-replayed; version-guarded apply makes replay no-op; rows never duplicated (single-transaction guarantee §9) |
| TC-CONV-06 | long-outage convergence | Both devices offline ≥1 simulated day + edits; reconnect both (order permuted) | Converged per server receipt order without manual repair (§9 last paragraph) |

Property-test harness note: scripted kill points come from instrumenting the app's debug build (log line just before/after each critical commit) — this is harness-only instrumentation on test devices, recorded in evidence.

Underlying kill-point matrix (TC-DUR, Phase 1+ for local rows, Phase 3 for sync rows):

| TC | Kill point | Expected |
|---|---|---|
| TC-DUR-01 | mid local write (row + outbox op in one transaction §6.3) | force-stop during write; restart: either full row+op committed or neither; no torn state |
| TC-DUR-02 | mid push (each of: before batch send, mid-batch, after server ack before ledger confirm) | outbox rows intact; replay answers by op_id; no duplicate apply (TC-CONV-04) |
| TC-DUR-03 | mid pull (before page apply, after partial page apply, before cursor commit) | cursor advanced-with-page or stayed-and-replayed; version-guarded replay no-op (TC-CONV-05) |
| TC-DUR-04 | battery pull / OS reboot with queued offline edits | outbox survives; sync on regain converges |

## 8. Failure-mode coverage (arch §13 → TCs)

| Arch F# | Failure | TC | Phase gate |
|---|---|---|---|
| F1 | Force-kill mid-write/push/pull/apply | TC-DUR-01 (write), TC-CONV-04 (push), TC-CONV-05 (pull/apply), TC-SC-04 | 1 (write), 3 (sync) |
| F2 | Network flap / long outage | TC-SOAK-02, TC-FM-F2-A (kill network mid-push batch), TC-FM-F2-B (10-min outage, then regain) | NOT-RUN-UNTIL-PHASE-2/3 |
| F3 | Same-field both offline | TC-CONV-01 | NOT-RUN-UNTIL-PHASE-3 |
| F4 | Edit-vs-delete race | TC-CONV-03b: A deletes offline, B edits same row offline; connect; expect explicit retained-edit vs accept-delete surface, no silent loss (verdict semantics per arch Q5 — pending PL; TC stays valid either way since both outcomes are explicit) | NOT-RUN-UNTIL-PHASE-3 |
| F5 | `invalid` op rejected | TC-FM-F5: submit malformed op via seeded bad row; chip shows error count, op surfaced, not dropped, not retried forever | NOT-RUN-UNTIL-PHASE-3 |
| F6 | Token expiry / refresh failure | TC-FM-F6: expire access + fail refresh; REAUTH state; local writes still succeed offline; re-login restores sync; no data loss meanwhile | NOT-RUN-UNTIL-PHASE-2 (auth), 3 (full) |
| F7 | Schema version gate | TC-FM-F7: stub server `schema_version` bump; device → NEEDS-UPDATE; chip surfaces; no sync attempt column-guessing; no data damage | NOT-RUN-UNTIL-PHASE-2 |
| F8 | Unbounded outbox (total outage) | TC-SOAK-02 long variant + TC-FM-F8: reach soft-block threshold via offline flood; chip informs; export path offered (FR-14); flush automatic on regain | NOT-RUN-UNTIL-PHASE-3 |
| F9 | Clock skew / tamper | TC-SOAK-03 | NOT-RUN-UNTIL-PHASE-3 |
| F10 | Backend outage / data loss | TC-FM-F10: wipe server project data (test project); devices re-push from durable outboxes; content restored; convergence regained | NOT-RUN-UNTIL-PHASE-2 |
| F11 | Reinstall / clear data | TC-FM-F11: clear data, rebind identity, pull own spaces; personal restored, shared history server-side | NOT-RUN-UNTIL-PHASE-2 |

## 9. Carry-over generic negative cases from v1.3 (adapted)

Adapted from v1.3 test-strategy §7 to the new SQLite + sync shell. Phase-1-runnable ones are NOT-RUN-UNTIL then.

| ID | Source | Adaptation to new shell | Expected | Phase |
|---|---|---|---|---|
| GN-01 | N-01/N-02 | Import: garbage / valid-JSON-but-wrong-schema into `E.import()` | rejected, schema-validated, no state change, no partial write | 1 |
| GN-02 | N-03 | Import: valid shape, wrong types | rejected or normalized per stated policy; never crash | 1 |
| GN-03 | N-04 | Corrupted/truncated SQLite file (pre-open tamper on a copy) | migration/boot path rejects or repairs; app does not boot into silently zeroed DB; no data shown as if fresh unless user informed | 1 |
| GN-04 | N-06 | XSS payload in every free-text field (task title, notes, subject names) | stored literal, rendered escaped, no execution | 1 |
| GN-05 | N-07/SRC | Oversized payload: huge title/note body; size-bounded import (REQ-SEC-03 discipline carried per §10 boundary row "Import surface") | hard bound enforced; no OOM; no silent truncation without user signal | 1 |
| GN-06 | N-11 | Duplicate rapid-write: scripted double-tap on create ×10 | either exactly 1 row or documented duplicate-set; **with sync added in Phase 3: duplicates (if any) must converge deterministically across devices, no slow-real double-rows** — carry-over of v1.3's "baseline for future sync design" note | 1 local / 3 sync |
| GN-07 | N-10 | Low storage injection (AVD: filluserdata qemu arg or dd to near-full partition) | SQLite writes fail gracefully, blocking per spec §8 storage-failure row: error state blocks data path, export offered before data risk, no silent zeroing | 1 (visualize), 3 (with outbox pressure) |
| — | N-05 | Drop: IDB open-failure case | localStorage/IndexedDB stack is retired (ADR-1) — not meaningful in new shell | n/a |
| — | TC-FO-06/N-09 etc. | Drop: timer/chart/grade/negative-grade cases | v1.3-only feature set; spec D-0 retires timer/grades | n/a |
| TC-SC-10 | (new, §8 storage-failure row) | Simulated storage failure mid-session (space exhaustion during a write) | blocking dialog, export path offered before data risk; chart must not continue accepting writes into a broken store that then loses them | 1/3 |

## 10. Phased testability summary (arch §14)

| Phase | Runnable TCs | Gating TCs |
|---|---|---|
| **1** local shell | FR-01, FR-02 (owner-only local), FR-04, FR-05, FR-06 via TC-DUR-01..04, FR-11 (field shape), FR-12/15/16 local create/edit/complete/delete, FR-14 export/import incl. TC-FR-14-A/B, NFR-02 cold start, NFR-07, GN-01..04, GN-06(local), TC-ISO-00, TC-SC-05 | TC-SC-01 only in its local half (no sync half) |
| **2** backend exists | Sync smoke: TC-SM-01 (login/session), TC-SM-02 (push/pull happy path), TC-SM-03 (RLS DENY on peer space token); TC-FR-07 smoke; TC-FM-F6/F7/F10/F11; TC-NFR-02-B (off-UI-thread sync); TC-ISO smoke (feed-level) | Convergence property set, conflict UX, durability-at-kill-during-sync |
| **3** sync engine full | TC-CONV-01..06, TC-F4, TC-SC-02/03/06 (data-layer isolation full), TC-FR-08 full, TC-FM-F3/F4/F5/F8, GN-06(sync), TC-SC-01(local+sync) | — |
| **4** hardening | TC-SOAK-01 (real 7-day soak option b/c), TC-SOAK-02/03, F8 threshold TC-FM-F8, cold-start+soak combined, visual/a11y per design-spec (separate design-doc QA, not here) | — |

Nothing enters a release gate from a phase whose arch verify gate has not passed.

## 11. Two-device contention & data-ethics policy

- **Offline contention rule:** automated tests drive offline writes **scripted and per-device**, never concurrently on the *same* row beyond the explicit TC-CONV-01 scenario; disjoint edits use disjoint fixtures (`<FIXA>-`/`<FIXB>-` prefixed IDs). Same-field contention is only ever exercised inside convergence cases, and the harness is the only "user".
- **Synthetic fixtures only.** All test content is generated sentinel strings. **Never write, copy, import or inspect real Lea/Violet data**; test accounts and test spaces are namespace-separated (test Supabase project or `test_*` schema) from any production-ish dataset.
- **Destructive operations:** reset / clear-data / DB deletion / server data wipe run on **test devices and test backend only**. TC-FM-F10 wipes a dedicated test project, never a live one.
- **Evidence privacy:** screenshots/DB dumps may contain synthetic content only; DB files pulled from devices are treated as evidence artifacts and deleted after capture, not committed (evidence location: issue attachments / CI artifacts).

## 12. Evidence template + release gates (v1.3 §10/§11 style, reused)

### Evidence template (identical fields to v1.3 §11; one per executed TC)

```
Test ID:
Version under test (versionName/build):
Environment: (device model / AVD API level / adb ids / harness option a|b|c)
Date & tester:
Preconditions setup:
Steps performed (numbered, actual not planned):
Expected result (trace FR/NFR/§12/F#):
Actual result:
Evidence: (screenshots | adb/logcat dumps | SQLite pull + inspector output | CI URL | harness config)
Automated? (yes/no — if yes, test file + commit):
Observed failures & linked issues:
Decision: PASS / FAIL / PASS-WITH-RECORD  (record = deviation accepted by owner, linked)
```

### Release gates (superset of v1.3 §10)

1. CI build green from clean checkout; APK artifact present.
2. All P0 TCs of the shipped phase's set PASS on latest build, without any trial being skipped silently.
3. Manual smoke on one physical device (list per phase).
4. **Isolation gate:** TC-SC-02 evidence — zero peer-space content at data layer on both devices (no weakening of this wording is permitted; anything short of direct file + feed inspection is a FAIL).
5. **Convergence gate:** TC-SC-03 + TC-CONV-01..03 pass with byte-identical hash comparison recorded.
6. **Durability gate:** TC-SC-04 kill-point matrix evidence (all points recorded, each point's restart dump shown).
7. **No silent discard of conflicts:** for every conflict scenario executed (TC-CONV-01, TC-CONV-03b/F4, F5), evidence must show each conflict reached an explicit surface (human-or-harness choice recorded), never an auto-pick, auto-retry-forever, or silent drop. Absence of a surface in evidence = FAIL of the gate regardless of data outcome.
8. Open spec/arch open items (D-6/D-7, arch Q1–Q8, product-requirements-v2 binding) resolved or accepted-with-record.
9. Harness integrity: every harness TC includes first-run validation of harness mechanics themselves (§1) and failures of the harness are recorded separately from failures of the product.

## 13. Execution status

| Test ID | Status | Result | Evidence |
|---|---|---|---|
| (all) | PROPOSED | not executed | — |

Propose-to-execute order: implement the Phase-1 automated set first, then the §4 option-(a) harness on CI for Phase 2/3, then soaks at Phase 4.
