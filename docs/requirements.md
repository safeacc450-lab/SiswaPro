# SiswaPro — Product Requirements

## ⚠ SCOPE BANNER (2026-10-21)

> **This document describes the retired v1.3 single-user student app ONLY.**
>
> For the **new MVP** (two-user offline-first sync app, Lea + Violet), the live sources of truth are:
> - `docs/spec/product-spec-v0.3.0.md` (CONFIRMED product scope)
> - `docs/product-requirements-v2.md` (REQ2-* requirements, traceable to FR-01…FR-16 / NFR-01…NFR-07)
>
> This doc is **retained as a regression reference** for the v1.3 shell until that shell retires (spec D-0). Do **not** treat REQ-* here as requirements for the new product. The v1.3 runway and the status of the §8–§9 open flags are clarified in `docs/product-requirements-v2.md` §4 (resolves review-report C-1 / C-11).

---

**Product:** SiswaPro — offline-first study companion for Indonesian students
**Doc status:** APPROVED (reconstructed from code by QA, approved by product owner 2026-10-21)
**Version target:** v1.3 (versionCode 4)
**Traceability prefix:** REQ-*

## 1. Overview

Single-user, local-only study app bundled as static web assets inside a Capacitor Android shell. All data lives on-device. No backend, no accounts, no network features.

## 2. Scope

**In scope (v1.3):** onboarding, dashboard, tasks, schedule, focus timer, grade calculator, settings, local persistence + backup, JSON export/import, data reset, Android APK distribution via CI.

**Out of scope (v1.3):** user accounts/authentication (AUTH-*), server synchronization (SYNC-*), multi-device concurrency/conflict resolution (CONC-*), cloud backup, push notifications, analytics/tracking, real user data processing.

> These map to the QA brief's auth/sync/concurrency scopes: **not implemented, therefore untestable until scheduled.** If a future architecture adds them, new requirements must be created here first.

## 3. Functional Requirements

### 3.1 Onboarding
- **REQ-OB-01 (P1)** First-run user (no saved state) sees onboarding with name input (max 24 chars) and 4 theme choices.
- **REQ-OB-02 (P1)** Empty name defaults to `Siswa`; onboarding never shows again once `ob=true` persisted.

### 3.2 Dashboard
- **REQ-HM-01 (P2)** Home shows date, greeting (time-of-day based), name, active-task count, today's class count, today's focus minutes.
- **REQ-HM-02 (P2)** Today's schedule timeline displays status per class: upcoming / in-progress (with % progress + minutes remaining) / finished.
- **REQ-HM-03 (P2)** Shows ≤3 open tasks sorted by nearest due date.
- **REQ-HM-04 (P3)** Daily rotating motivational quote (index = day-of-month mod list length).
- **REQ-HM-05 (P3)** Home auto-refreshes every 30 s while visible.

### 3.3 Tasks
- **REQ-PR-01 (P1)** Add task: required title; optional subject (dropdown) and due date; invalid/empty title shows toast, no entry.
- **REQ-PR-02 (P1)** Toggle done/undone per task; toggling to done haptic-buzzes + toast.
- **REQ-PR-03 (P1)** Delete task with confirmation dialog.
- **REQ-PR-04 (P2)** Filters: all / today / open / done; progress bar "x/y selesai"; new tasks insert at top.
- **REQ-PR-05 (P2)** Due-date badges: `TERLAMBAT` (past), `HARI INI`, `n hari lagi`; done tasks show SELESAI tag regardless of due.

### 3.4 Schedule
- **REQ-JD-01 (P1)** Day selector Senin–Sabtu; defaults to today (Monday fallback Sunday→Monday); lists that day's classes sorted by start time.
- **REQ-JD-02 (P1)** Add class: required subject, start/end times; end ≤ start rejected with toast; optional room.
- **REQ-JD-03 (P2)** Overlapping class on same day: accepted but warned via toast naming the conflicting subject (deliberate soft rule).
- **REQ-JD-04 (P1)** Delete class with confirmation.
- **REQ-JD-05 (P2)** Duration shown in minutes; class currently in progress highlighted on its day view.

### 3.5 Focus timer
- **REQ-FO-01 (P1)** Presets 10/25/50 min; default 25; ring progress, mm:ss display; start/pause/resume; reset.
- **REQ-FO-02 (P1)** Completion: beep, 1500 ms vibration, toast, and recorded minutes added to today's focus history.
- **REQ-FO-03 (P2)** 7-day bar chart (min height floor for visibility; max-scaled); weekly labels Sen–Min.
- **REQ-FO-04 (P2)** Streak = consecutive days with >0 focus minutes ending today (or yesterday if today=0); displayed with count.
- **REQ-FO-05 (P2)** History kept to last 30 recorded entries, zero-minute entries filtered.
- **REQ-FO-06 (P2)** Audio requires prior user interaction (browser autoplay policy); resilient if AudioContext unavailable.

### 3.6 Grade calculator
- **REQ-NI-01 (P2)** Score = Tugas×0.25 + UTS×0.35 + UAS×0.40; inputs numeric, 0 on blank/non-numeric.
- **REQ-NI-02 (P2)** Predicates: A ≥85, B ≥75, C ≥60, else D; result color-coded (green ≥75, orange ≥60, red below); conic ring reflects percentage.
- **REQ-NI-03 (P2)** Result haptic-buzz on calculate; not persisted across reloads.

### 3.7 Settings
- **REQ-ST-01 (P2)** Edit name (max 24 chars; empty toast, saved as-is); greeting updates immediately.
- **REQ-ST-02 (P3)** 4 accent themes; theme chosen during onboarding or settings persists; theme-color meta updates (light/dark aware).
- **REQ-ST-03 (P3)** Dark mode toggle; persists; label updates.
- **REQ-ST-04 (P2)** Subjects management: add (trimmed, duplicate-rejected), delete with confirmation; usage count shown ("n dipakai"); deletion keeps existing schedule/task records referencing it.
- **REQ-ST-05 (P1)** Export: current full state serialized to visible textarea for manual copy.
- **REQ-ST-06 (P1)** Import: parses pasted JSON; validates `pr`, `jadwal`, `mapel` are arrays; invalid → toast, no state change; valid → replaces state, saves, reloads.
- **REQ-ST-07 (P1)** Reset all: double-confirmation, removes app data, reloads to onboarding.

## 4. Data & Persistence Requirements

- **REQ-DA-01 (P1)** State persisted to `localStorage key sp_state` on every mutation; timestamp mirror in `sp_ts`.
- **REQ-DA-02 (P1)** Full state mirrored to IndexedDB (`siswapro`, store `kv`, key `state`) with `savedAt`.
- **REQ-DA-03 (P1)** On startup, if IndexedDB copy is newer than localStorage (`sp_ts`), restore it — designed to survive WebView storage clearing (e.g., app update).
- **REQ-DA-04 (P2)** Schema migration/normalization at load: missing arrays reset; legacy schema accepted.
- **REQ-DA-05 (P3)** All DB/storage failures silent-degrade — app must never crash on unrecoverable data operations (try/catch guards; acceptance = no crash, may lose write).
- **REQ-DA-06 (P3)** Update toast shown once per version (localStorage `sp_ver` marker) announcing data preserved.

## 5. Platform / Distribution Requirements

- **REQ-AN-01 (P1)** Debug APK builds via CI (Node 22, Java 21, SDK 36) using inline Gradle web-copy step; build reproducible from clean checkout.
- **REQ-AN-02 (P1)** App installs and launches on target Android versions (minSdk per `variables.gradle`).
- **REQ-AN-03 (P2)** App functions fully without network; no crash in airplane mode. (INTERNET permission present but unused — candidate for removal once verified.)
- **REQ-AN-04 (P3)** App icon, name "SiswaPro", splash screen transition to working app. Orientation changes / split-screen must not lose state (config changes handled natively by WebView).

## 6. Security & Privacy Requirements

- **REQ-SEC-01 (P2)** All user strings rendered through HTML-escaping; no script injection via task/subject/room/name inputs.
- **REQ-SEC-02 (P3)** Data stored unencrypted on-device (accepted local-only risk; no secrets processed). Export contents contain full personal state — user warned to keep it safe.
- **REQ-SEC-03 (P2)** Import treated as untrusted input: schema-validated, constrained to expected object shape.

## 7. Non-Functional Requirements

- **REQ-NF-01 (P3)** App is fully client-side; no telemetry.
- **REQ-NF-02 (P3)** Indonesian (Bahasa Indonesia) UI copy throughout.
- **REQ-NF-03 (P3)** Responsive layout for mobile-first viewport; bottom tab navigation across 5 tabs + "to-top" affordance after 150 px scroll.

## 8. Acceptance criteria known to be weak / needing owner input (flag list)

- REQ-DA-05 silence-on-failure is observable but ambiguous — define minimum: no crash + destructive warning? (testable as written only in edge form)
- REQ-JD-03 conflict-tolerance deliberately allows overlap; define whether a hard-block mode is required.
- REQ-FO-05 "30 entries" vs "30 days" ambiguity exists in code (observed slicing is entries-based; likely bug in intent). Owner must pick one.
- REQ-NI-01 allows negative/out-of-range scores — define input bounds (0–100?) before hardening.
- No performance criteria anywhere (startup time, render budget) — proposed: cold launch to interactive < 2 s on target device, if accepted add REQ-NF-04.

## 9. Open questions for product owner

1. Confirm out-of-scope list (auth/sync/concurrency) — schedule for v1.4+ or drop?
2. Is debug-only APK acceptable for distribution, or is signed release required (gates REQ-AN-05 to add)?
3. Target minimum Android version to claim support.
4. Approve/correct REQ-FO-05 semantics (entries vs days).
