# SiswaPro — Consolidated Documentation Review
Date: 2026-10-21 · Reviewer: discovery/intake agent · Scope: read-only, no production files modified.

**Readiness: NOT READY FOR APPROVAL.** Blockers listed in §5. No implementation started.

---

## 1. Document index

| # | Path | Purpose | Version / date | Status (self-declared) | Cross-check status |
|---|---|---|---|---|---|
| 1 | `AUDIT.md` | Repository audit: tree, storage, build chain, defects 1–8 | 2026-10-21 | Discovery report | Spot-checked 7/8 claims against repo — all confirmed (see §2) |
| 2 | `docs/spec/product-spec-v0.3.0.md` | NEW product spec: 2-user (Lea/Violet) offline-first sync app | 0.3.0-confirmed, 2026-10-21 | CONFIRMED by Project Lead (D-0…D-5, D-8 resolved; D-6, D-7 open → tech lead) | Internally consistent; anchors the new MVP |
| 3 | `docs/requirements.md` | Requirements for the **existing v1.3 student app** | APPROVED 2026-10-21 | APPROVED | Accurate to v1.3 code, but scope contradicts spec D-0 (see C-1) |
| 4 | `docs/architecture-v0.1.md` | Sync architecture: SQLite local store, outbox/feed protocol, Supabase+RLS proposal, ADR-1…10, phases 0–4 | 0.1 DRAFT, 2026-10-21 | Pending PL sign-off (§15, Q1–Q8) | Claims verified against repo; sections referenced correctly except noted typos (§4, low) |
| 5 | `docs/design-spec.md` | UI design tokens, components, a11y, sync badge | 0.1 DRAFT, 2026-10-21 | Design-only, "pending decisions §8" | **Stale**: documents 5-tab v1.3 nav and "shared spaces undefined" §8.1 — contradicts confirmed spec (C-2) |
| 6 | `docs/test-strategy.md` | QA strategy + test cases for the v1.3 app | PROPOSED, 2026-10-21 | Binds to `requirements.md` REQ-* | Accurate to v1.3, but zero coverage for new MVP (C-3) |

No unreadable or missing files. No linked appendices exist beyond these six.

---

## 2. Verified technical claims (checked against repo this session)

| Claim (source) | Verification |
|---|---|
| Zero Capacitor plugins (`capacitor.plugins.json = []`) — AUDIT, arch §1 | CONFIRMED |
| Blob persistence, LWW overwrite, resetAll leaves IDB resurrection bug (`www/app.js:426-430`, IDB restore at 465-473) — AUDIT #8, ADR-1 | CONFIRMED in code |
| Version drift: badge/About "v1.2" (`index.html:220`) vs `VER='1.3'` (`app.js:476`) vs `versionName "1.3"` — AUDIT #4 | CONFIRMED |
| Termux `aapt2FromMavenOverride` tracked in `android/gradle.properties:23` (CI-breaking) — AUDIT #1 | CONFIRMED |
| `capacitor.settings.gradle` → `../node_modules` (modified, uncommitted; correct for this layout) — AUDIT #2 | CONFIRMED |
| Uncommitted drift: 4 modified + untracked `www/app.css`, `www/app.js`, `docs/`, `AUDIT.md`, `Example/`, `node_modules/`, `package-lock.json` — AUDIT #3 | CONFIRMED (git status) |
| `Example/` = unrelated portfolio site ("Rerezz Official") — AUDIT | CONFIRMED (title tag) |
| android/local.properties exists (sdk.dir) — AUDIT | CONFIRMED |
| INTERNET permission present — AUDIT | CONFIRMED in manifest |
| NOT verified (no run logs / no execution): CI workflow success history; `npx cap sync` regeneration behavior on CI; on-device runtime behavior; APK build freshness beyond AUDIT's hash evidence | OPEN, stated as unknown in AUDIT §Unknowns — correctly not claimed |

Requirements-vs-code spot-check: REQ-NI-01 in `requirements.md` says "theory ×0.25 + practice ×0.35 + attitude ×0.40" — code (`app.js:364-373`) is Tugas 0.25 / UTS 0.35 / UAS 0.40. Weight math correct; the *labels* theory/practice/attitude do not match Tugas/UTS/UAS (UTS/UAS are exams). Minor doc error to correct.

---

## 3. Approved / confirmed decisions (do not re-litigate)

- **Product scope (CONFIRMED, spec v0.3.0):** two users Lea+Violet; private personal spaces; one shared space; offline-first; eventual auto-sync. Shared = tasks (title+done). Personal = notes + own homework with own per-user subject list (D-8). One profile per device (D-3). Auto-merge non-overlapping edits; explicit same-field resolution; guaranteed convergence (D-5). v1.3 app replaced, no data migration (D-0). Due dates out of MVP (D-4). Exclusions 1–12 stand.
- **Requirements for v1.3 (APPROVED)** — valid for the v1.3 app until its retirement; QA may test it against these.
- **Reject list (spec §10 pick lists):** Firestore-style LWW (violates D-5), blob persistence (ADR-1), self-built infra v1, RxDB/PouchDB tier, signup-based identity.

---

## 4. Conflicts and unresolved issues (severity-ranked)

| ID | Sev | Conflict / issue | Documents | Status |
|---|---|---|---|---|
| C-1 | **HIGH** | `requirements.md` (APPROVED) and `test-strategy.md` scope the replaced v1.3 app. Spec D-0 replaces it. No reader error prevents someone treating REQ-* as the live source of truth for the NEW product. The new MVP has **no requirements document traceable to FR-01…FR-16 / NFR-01…07** | requirements.md vs product-spec §11 D-0 | Unresolved |
| C-2 | **HIGH** | `design-spec.md §2` navigation = 5-tab v1.3 (Beranda/Tugas/Jadwal/Fokus/Rapor); confirmed spec FR-04/F-2 = 3-tab (Personal/Shared/Settings). `§8` declares shared-space/sync decisions open; they are resolved in spec. Design_doc must be re-based on the confirmed spec before any UI build | design-spec §2, §8 vs spec FR-04, §11 | Unresolved |
| C-3 | **HIGH** | `test-strategy.md` explicitly flags sync/auth as "untestable / N/A" — now the core of the MVP. New-mvp acceptance tests (spec §12: isolation at data layer, convergence, durability, 7-day offline) have **no test strategy**; 2-device test infrastructure undefined; CI device matrix unclear | test-strategy §1 vs spec C-5, §12 | Unresolved |
| C-4 | **BLOCKER (PL)** | Architecture is DRAFT: Q1–Q8 in arch §15 (backend class/provider/region/billing, account flavor, E2EE-deferral accept, tombstone retention, edit-vs-delete verdicts, at-rest encryption, 4 new native plugins + vendored supabase-js, local-store replacement confirmation) all require PL sign-off. Implementation phase cannot lawfully start (contract rule: dependencies need documented approval) | arch §15, ADR-2/10 | Open — PL only |
| C-5 | MEDIUM | Data-at-rest risk framing: spec exclusion 8 says "no E2EE beyond D-6 minimum", ADR-10 defers personal-space E2EE and records that server operator can read content. Product-spec §1 promises "truly private — cannot see it, even on the same backend". A reader can interpret ADR-10 as weakening FR-10. Needs explicit PL/privacy note distinguishing **user-level isolation (guaranteed)** vs **operator-level (not E2E, v1)** | spec §1 vs ADR-10, Q3 | Unresolved — PL |
| C-6 | MEDIUM | Identity recovery: if a device is lost/reenrolled and password distributed out-of-band once (ADR-3), who can re-issue? Reset flows via PL ops note — acceptable but undocumented as a deliverable. No UX flow for REAUTH/rebind (arch §9) vs UI | arch ADR-3, F-11; spec F-1 | Unresolved — needs ops note + UX |
| C-7 | MEDIUM | Conflict resolution + deletion-conflict copy is a Phase-3 gate (arch §14) but has no owner/draft yet; also depends on Q5 verdict (edit-vs-delete) | arch §14, F-4; Q5 | Unresolved |
| C-8 | MEDIUM | Sync-status chip state set mismatch: design-spec §4 defines 4 states; arch state machine defines more (OFFLINE, SYNCING, IDLE/synced, REAUTH, NEEDS-UPDATE, CONFLICT-PENDING). UI must be re-spec'd after architecture approval | design-spec §4 vs arch §9 | Unresolved |
| C-9 | LOW | REQ-NI-01 label mismatch (Tugas/UTS/UAS vs theory/practice/attitude) — requirements doc error | requirements.md §3.6 | Open correction |
| C-10 | LOW | Architecture internal typos: references "wire contract (§7.2)" though contracts live at §6.4; "change-f observers" (ADR-7); stray duplicated phrase "handshake gate" (ADR-8 title) | arch §4 | Cosmetic |
| C-11 | LOW | v1.3 runway ambiguity: during transition both shells exist. requirements §8 flags (FO-05 entries-vs-days, negative grade bounds, JD-03 hard-block) still need owner resolution **if** v1.3 ships beyond MVP start; AUDIT defects #4–#8 and drift commit assigned to Phase 0 already | requirements §8; arch §14 Phase 0 | partially scheduled |
| C-12 | LOW | `Example/` fate (delete vs ignore) and version-string fix unresolved; both assigned Phase 0 but no owner named | AUDIT rec. next; arch Phase 0 | Open, minor |

**Duplicates detected:** NFR-02 cold start <2s appears in both spec §9 and arch (consistent — fine); FR-13 due-date handling repeated in spec FR-13/§8/arch §8 — consistent wording. No harmful duplication found.

---

## 5. Specialist assignments (research/design only — no code)

| Agent | Question | Deliverable |
|---|---|---|
| **Project Lead (not delegate)** | Answer arch §15 Q1–Q8, including C-4 and C-5 privacy posture | Signed decisions recorded in arch doc or new decisions file |
| **Product** | Author the NEW product requirements doc (REQ-new-N traceable to FR-01…FR-16, NFR-01…07); annotate `requirements.md` as "v1.3-only, superseded for new shell"; resolve C-1; clarify v1.3 runway (C-11) | `docs/product-requirements-v2.md` + annotations |
| **Architect** | Fix C-10 typos cross-refs; resolve C-6 (identity recovery ops note); pre-answer researcher questions for Q7 (Capacitor 8 compatibility of community SQLite/secure-storage/network plugins — R1/R2 verification, still no install); specify CI plugin-verification protocol | Patched architecture doc + compatibility verification plan (no code) |
| **UX/UI** | Re-base design doc on 3-tab space nav (C-2, C-8): Personal/Shared/Settings map, sync chip states incl. REAUTH/NEEDS-UPDATE/CONFLICT-PENDING, conflict resolution surface, empty/loading/error per new spec §8; keep tokens/a11y §5 which remain valid (reuse); draft Indonesian copy for conflict + deletion surfaces (C-7, blocked pending Q5) | `docs/design-spec-v0.2-two-user.md` + copy draft |
| **QA** | New test strategy for the new MVP: map FR/NFR-new → TCs; 2-device sync test harness design (CI: single runner — propose AVD×device or ADB-twin-device protocol); data-layer isolation test method; convergence property tests; carry-over reusable generic negative cases (N-01…N-10 style) | `docs/test-strategy-v2.md` |
| **Auditor** | (optional, after Phase 0) re-verify drift commit, aapt2 removal, and version-string fix | Updated audit addendum |

Dependencies: Q1–Q8 (PL) → Architect availability → QA harness design → UX chip re-spec → implementation phases per arch §14.

---

## 6. Recommended corrections to specs (proposed, not enacted)

1. `requirements.md`: fix REQ-NI-01 labels; add scope banner "describes v1.3 app only — superseded for MVP by docs/spec/product-spec-v0.3.0.md"; resolve §9 open Q1–Q4 (or mark them explicitly as applying only to the v1.3 retirement path).
2. `design-spec.md`: rebase on confirmed spec; delete stale §8 blockers; adopt arch §9 chip state set.
3. `test-strategy.md`: add scope banner; treat as v1.3 retirement regression asset; spawn v2 for MVP.
4. `architecture-v0.1.md`: fix §10 typos; make C-5 operator-visibility distinction explicit in ADR-10.
5. Delete or `.gitignore` `Example/` (portfolio site, no build role) — decision C-12.
6. `specs readiness`: none of these corrections require new features, deps, or tables — documentation only.

---

## 7. Readiness determination

**NOT READY FOR APPROVAL.** The product spec is confirmed and the architecture draft is credible and traceable, but:
1. Q1–Q8 PL decisions are administrative blockers before any implementation (C-4).
2. Three documents assert wrong scope or stale decisions and must be re-based first (C-1…C-3).
3. Plugin compatibility for the chosen local store is unverified and gates ADR-1 (arch §11 R1).
4. Privacy posture C-5/Q3 must be signed, not implied.

Once PL answers Q1–Q8 and the Product/Architect/UX/QA deliverables above land, revise to READY FOR APPROVAL and phase-0 can begin.

---

## 8. Post-review resolution status (updated 2026-10-21 same day, PL coordination)

Specialist deliverables landed (PL-verified; no production files touched):

| Item | Resolution | Evidence |
|---|---|---|
| C-1 | RESOLVED (pending PL approval of doc set) — `docs/product-requirements-v2.md` created (REQ2-FR01…16, REQ2-NFR01…07, REQ2-DA-01…03, REQ2-SEC-01…04); `requirements.md` scope banner added | PL read full deliverable |
| C-2 | RESOLVED (pending approval) — `docs/design-spec-v0.2-two-user.md` (3-tab nav, identity screen); `design-spec.md` superseded banner | PL read full deliverable |
| C-3 | RESOLVED (pending approval) — `docs/test-strategy-v2.md` (two-device harness proposal, isolation/convergence/durability TCs); `test-strategy.md` scope banner | PL read full deliverable |
| C-4 | UNBLOCKED — Q1–Q8 recommendations prepared in `docs/decision-report-2026-10-21.md`; **signature still PL's** | decision report |
| C-5 | RESOLVED (pending Q3 signature) — ADR-10 privacy-posture paragraph added (user-level isolation guaranteed vs operator-level plaintext, never implied otherwise) | arch v0.2 §ADR-10 |
| C-6 | RESOLVED (needs PL ack) — ADR-3 identity-recovery ops note | arch v0.2 |
| C-7 | DRAFTED — conflict surface + Indonesian copy in design v0.2 §5; edit-vs-delete copy sets A/B both drafted, blocked only on Q5 verdict | design v0.2 §5.3 |
| C-8 | RESOLVED — full arch §9 chip state map in design v0.2 §3 | design v0.2 §3 |
| C-9 | FIXED — REQ-NI-01 labels corrected (Tugas/UTS/UAS) | requirements.md |
| C-10 | FIXED — arch cross-refs/typos corrected (`§7.2`→§6.4, change-feed consumers, ADR-8 dedupe); 0.1→0.2-draft changelog | grep-verified zero stale refs |
| C-11 | RESOLVED — v1.3 runway clarified in product-requirements-v2 §4 (v1.3 persists until replacement; its flags are v1.3-only) | product-req v2 §4 |
| C-12 | OPEN — `Example/` fate + version-string fix remain Phase 0 items needing PL go | decision report §5 |

**Readiness is now conditional:** architecture Q1–Q8 recommendations are on the table (decision report); product/design/QA doc set awaits PL approval. Plugin verification (R1/R2) is *planned* in `docs/plugin-verification-plan.md` with researched facts (npm-registry access dates recorded) — explicitly NOT RUN until after approval; execution gate = Phase 0 F-1 (aapt2 override fix).
