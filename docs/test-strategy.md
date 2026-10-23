# SiswaPro — QA Strategy & Test Plan

> **SCOPE (2026-10-21):** This strategy applies to the **v1.3 student app** until its retirement (D-0: v1.3 is replaced by the two-user MVP). MVP coverage has moved to **`docs/test-strategy-v2.md`**. §1 flags marked N/A (sync/auth/authorization/multi-device) apply to v1.3 only — they are the core of the MVP and are covered in v2. The evidence template (§11) and release-gate format (§10) remain reusable by v2 by reference.

**Status:** PROPOSED — no test has been executed yet. Execution results must be reported separately.
**Binds to:** docs/requirements.md (REQ-IDs approved 2026-10-21).
**Evidence discipline:** No functionality may be claimed working based on documentation, code reading, or this plan alone. Every result requires recorded evidence (§10 template).

## 1. Scope flags (carried from QA review)

| Flag | Status |
|---|---|
| Requirements doc missing | RESOLVED — reconstructed & approved as docs/requirements.md |
| Auth / authorization / sync / multi-device concurrency / cross-device duplicate retries | UNTESTABLE / N/A — no backend or accounts exist; out of scope per REQ doc §2 |
| `Example/` folder is an unrelated portfolio site in the repo | OPEN — exclude from release artifacts |
| CI builds debug APK only; no signing/release gate | OPEN — affects release gates §8 |
| REQ-FO-05 "30 entries" vs "30 days" ambiguity (suspected code bug in `save()` slicing) | OPEN — owner decision pending; test TC-FO-06 documents actual behavior |
| Timer state does not survive page reload/WebView restart mid-session | KNOWN LIMITATION — test TC-DA-08 documents actual behavior |

## 2. Automated vs manual split

**Automated (browser, no device):** all pure logic and DOM behavior testable in headless Chromium/Playwright — module logic, filters, calculator, persistence round-trips (localStorage + IndexedDB are available in browser context), export/import, XSS escaping, negative inputs.

**Manual (real device / AVD):** APK install & update flows, IndexedDB survival of WebView storage eviction, airplane mode, vibration/audio hardware, orientation/split-screen, low-storage injection, cold-launch timing, set-date/time edge cases.

No destructive operations against real user data: all tests run on test devices/emulators with synthetic fixtures only.

## 3. Requirement-to-test traceability matrix

| Requirement | Automated | Manual/Device | Priority |
|---|---|---|---|
| REQ-OB-01/02 | TC-OB-01, TC-OB-02 | — | P1 |
| REQ-HM-01..04 | TC-HM-01, TC-HM-02 | TC-HM-03 (30 s refresh) | P2/P3 |
| REQ-PR-01..03 | TC-PR-01..05 | — | P1 |
| REQ-PR-04/05 | TC-PR-06..08 | — | P2 |
| REQ-JD-01..05 | TC-JD-01..05 | TC-JD-06 (today highlight by clock) | P1 |
| REQ-FO-01..03 | TC-FO-01..05 | TC-FO-07 (vibration/sound on device) | P1 |
| REQ-FO-04..06 | TC-FO-06, TC-FO-08, TC-FO-09 | — | P2 |
| REQ-NI-01..03 | TC-NI-01..05 | — | P2 |
| REQ-ST-01..04, 07 | TC-ST-01..07 | — | P1/P2 |
| REQ-ST-05/06 | TC-IO-01..04 | TC-IO-05 (round-trip on device) | P1 |
| REQ-DA-01..06 | TC-DA-01..07 | TC-DA-08, TC-DA-09 (storage eviction) | P1/P2 |
| REQ-AN-01 | — | TC-AN-01 (clean CI build) | P1 |
| REQ-AN-02..04 | — | TC-AN-02..05 | P1 |
| REQ-SEC-01..03 | TC-SEC-01..03 | TC-SEC-04 (exported data handling) | P2 |
| REQ-NF-01..03 | TC-NF-01 | TC-NF-02 (layout, 5 tabs) | P3 |

## 4. Priority definitions

- **P1 (Blocker for release):** data loss/corruption, crash, wrong core calculation, install failure.
- **P2 (High):** wrong visible behavior on real data flows, degraded UX.
- **P3 (Medium/Low):** cosmetic, informational, or degraded-mode only.

## 5. Detailed test cases (P1) — format: preconditions / actions / expected / evidence

### TC-DA-01 (P1) Persistence round-trip
- **Pre:** fresh browser context, app loaded, onboarding completed.
- **Act:** add 1 task, 1 schedule entry, complete a 10-min focus session; close and reload the page.
- **Exp:** all three survive exactly (titles, times, minutes, done states).
- **Ev:** before/after screenshots of the four tabs + exported JSON blob diff.

### TC-DA-02 (P1) IndexedDB newer-copy restore
- **Pre:** app with saved data; note task count.
- **Act:** programmatically delete `localStorage.sp_state`/`sp_ts` (simulating WebView storage eviction), reload app.
- **Exp:** state restored from IndexedDB; task count unchanged; update toast not duplicated per version.
- **Ev:** console log of storage keys post-reload + screenshot.

### TC-DA-03 (P1) Export → import round-trip
- **Pre:** app with ≥2 tasks, ≥2 schedule entries, renamed subject list.
- **Act:** export, copy JSON; reset all; import the JSON; reload.
- **Exp:** state identical to pre-reset (deep-equal of exported snapshots).
- **Ev:** two export blobs with diff showing equality.

### TC-PR-01..05 (P1) Task core
- TC-PR-01 add valid task → appears at top. TC-PR-02 empty title → toast, no entry. TC-PR-03 toggle done → SELESAI tag, vibration. TC-PR-04 delete with confirm → gone; cancel → stays. TC-PR-05 filtered view shows correct subset.
- **Pre:** default state; **Ev:** screenshots per step + reload persistence check.

### TC-JD-01..05 (P1) Schedule core
- TC-JD-01 add valid class (subject + start < end) → listed sorted on chosen day. TC-JD-02 end ≤ start → rejected toast, no entry, no state change. TC-JD-03 overlap → added + warning toast names conflicting subject (REQ-JD-03 soft rule). TC-JD-04 delete with confirm → gone. TC-JD-05 day selector defaults to today.
- **Ev:** screenshots; reload persistence; localStorage inspect.

### TC-FO-01/02 (P1) Focus completion accounting
- **Pre:** state with empty history. **Act:** set preset to 10, mock/accelerate time (automated: patch Date or invoke `selesai()` at sisa=0), confirm completion.
- **Exp:** history += 10 for today only; total in toast correct; no duplicate entry on second completion same day (cumulative).
- **Ev:** exported history JSON + toast screenshot.

### TC-ST-07 (P1) Reset all behaves as declared
- **Pre:** seeded state. **Act:** reset with both confirmations.
- **Exp:** `sp_state` removed; reload shows onboarding. Cancel at either dialog → state intact.
- **Ev:** storage keys dump + screenshots. ⚠️ Destructive-by-design — test device only.

### TC-AN-01..02 (P1) Build & install
- **Pre:** clean checkout on CI (or local); test device ≥ minSdk.
- **Act:** run the CI build path (`npx cap sync android` + `gradlew assembleDebug`); install artifact on device.
- **Exp:** build reproduces from clean checkout; app installs, launches past splash to onboarding; icon/name correct.
- **Ev:** CI run URL + install `adb install -r` output + launch screen recording.

## 6. P2/P3 grouped cases

| ID | Requirement | Case | Expected |
|---|---|---|---|
| TC-JD-06 | REQ-JD-05 | class view during current time window on today | SEDANG highlight + duration minutes correct |
| TC-FO-03..05 | REQ-HM/FO-03 | 7-day chart with zero and max days | no negative heights, today column marked |
| TC-FO-06 | REQ-FO-05 (flagged) | history >30 entries, entries with 0 minutes | zero-min excluded; actual retention behavior recorded verbatim (bug candidate reported if entry-based while req says days) |
| TC-FO-08 | REQ-FO-04 | streak with yesterday filled, today empty | streak counts ending yesterday |
| TC-FO-09 | REQ-FO-06 | start session, pause, resume | countdown continues from pause point |
| TC-NI-01 | REQ-NI-01..02 | 0.25/0.35/0.40 weights with sample scores | exact weighted result, correct predicate + color |
| TC-NI-02 | REQ-NI-02 | boundaries 85 / 84.95 / 75 / 74.95 / 60 / 59.9 | A/B/C/D exactly at thresholds |
| TC-NI-03 | REQ-NI-03 | reload after calculation | result gone, no persistence (by design) |
| TC-ST-01..03 | REQ-ST-01..03 | name edit; theme switch; dark toggle | immediate render, persisted across reload |
| TC-ST-04..06 | REQ-ST-04 | subject add (trim), duplicate reject, delete with users | usage count shown; records keep deleted subject's name |
| TC-HM-01/02 | REQ-HM-01..03 | dashboard tiles, ≤3 nearest-due tasks, timeline states by injected clock | counts and statuses correct |
| TC-HM-03 | REQ-HM-05 | leave home open 30+ s | refresh happens, no memory growth over 10 min |
| TC-OB-01/02 | REQ-OB-01/02 | first run, empty name submit, relaunch | default `Siswa`, onboarding never re-shows |
| TC-SEC-04 | REQ-SEC-02 | user inspects `chrome://device` storage | accepted: plaintext data; document in evidence |

## 7. Negative & failure-injection cases

| ID | Injection | Expected (REQ-DA-05, REQ-SEC-03) |
|---|---|---|
| N-01 | Import: non-JSON garbage string | toast "Data tidak valid", no state change |
| N-02 | Import: valid JSON missing `mapel` array | rejected, no state change |
| N-03 | Import: state with wrong types (`pr: "x"`) | rejected; if past array-check, normalized per REQ-DA-04 without crash |
| N-04 | localStorage preset to corrupt/truncated JSON | app boots to sane defaults, no crash |
| N-05 | IndexedDB open fails (automated: override IndexedDB) | app continues with localStorage state |
| N-06 | Form injection: task/subject/room/name `<img src=x onerror=alert(1)>` | stored as literal text, rendered escaped, no execution |
| N-07 | Calculator inputs: negative, 999, blank, non-numeric via keyboard | numeric parse; document out-of-range behavior (flag: bounds unowned) |
| N-08 | Schedule add while subject list emptied deliberately | app still saves entry with empty subject field per code path |
| N-09 | Device clock manual advance across midnight with timer running | documented actual behavior (no req flexes) |
| N-10 | Low storage: fill device storage, trigger save | no crash, failure silent-degraded per REQ-DA-05 (reported as data-loss risk) |
| N-11 | Duplicaterapid-click Add ×10 | exactly 1 task or 10 (documented) — retry/duplicate behavior baseline for future sync design |

## 8. Security test cases

| ID | Requirement | Case |
|---|---|---|
| TC-SEC-01 | REQ-SEC-01 | XSS payloads in every free-text input; verify escaping & no alert |
| TC-SEC-02 | REQ-SEC-03 | malformed/poisoned import payloads (arrays of modules, prototype keys, huge strings ≤1 MB) |
| TC-SEC-03 | REQ-NF-01 | traffic capture while app idle/host calls: zero outbound requests |
| TC-SEC-04 | REQ-SEC-02 | on-device data plaintext acceptance documented |
| TC-SEC-05 | — (hygiene) | APK manifest review: INTERNET permission unused; `allowBackup=true` review; exported components minimal |

## 9. Regression plan

- **Trigger:** any commit to `www/**` or build config.
- **Automated suite (once implemented):** all §4 automated TCs + §7 N-01..N-08 + §8 TC-SEC-01..03. Must pass before merge.
- **Manual smoke (each release):** TC-OB-01, TC-PR-01..04, TC-JD-01..04, TC-FO-01, TC-ST-05, TC-DA-01, TC-AN-02 — ~10 min device checklist.
- **Full regression per release:** entire plan on 1 AVD + 1 physical device of lowest claimed minSdk.
- **Data-migration regression:** state file format changes must append TC-DA cases proving old-format → new-format load (per REQ-DA-04).

## 10. Release gates

1. CI build green from clean checkout; APK artifact present (TC-AN-01 evidence).
2. All P1 automated cases pass on latest build.
3. Manual smoke pass on one physical device (strategy §9 list).
4. Open flags §1 resolved or accepted-with-record (especially debug-only APK and REQ-FO-05 semantics).
5. No new outbound network permissions/behaviors vs approved REQ doc.
6. Version bump: `versionCode`/`versionName` (android/app/build.gradle) and `VER` in www/app.js consistent with release notes.

## 11. Evidence template

```
Test ID:
Version under test (versionName/build):
Environment: (device model / AVD API level / browser+version)
Date & tester:
Preconditions setup:
Steps performed (numbered, actual not planned):
Expected result (trace REQ):
Actual result:
Evidence: (screenshots | screen recording | console/storage dump | CI URL | adb output)
Automated? (yes/no — if yes, test file + commit):
Observed failures & linked issues:
Decision: PASS / FAIL / PASS-WITH-RECORD  (record = deviation accepted by owner, linked)
```

## 12. Execution status

| Test ID | Status | Result | Evidence |
|---|---|---|---|
| (all) | PROPOSED | not executed | — |

No result may be entered until executed; propose to implement the automated browser suite first, then the device checklist.
