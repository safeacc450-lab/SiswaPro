# SiswaPro — Decision Report
Date: 2026-10-21 · Prepared by: Project Lead coordination pass · Scope: planning/docs only.
**Status: COMPLETE (planning). No production code modified, no plugins installed, no resources created, no credentials handled.**

Companion docs: `docs/review-report-2026-10-21.md` (intake) · `docs/architecture-v0.1.md` v0.2-draft · `docs/plugin-verification-plan.md` · `docs/product-requirements-v2.md` · `docs/design-spec-v0.2-two-user.md` · `docs/test-strategy-v2.md`.

---

## 1. Q1–Q8 (architecture §15): recommendation, alternatives, approval status

Approval key: **PENDING-PL** = recommendation only; your signature decides. Each header row cross-checks against arch ADRs.

### Q1 — Backend class: managed Postgres+RLS (Supabase) · ADR-2, D-7 · **PENDING-PL**
- **Recommendation:** APPROVE managed Postgres+RLS; provider Supabase; **start on the Free tier for build/test only**; move to Pro ($25/mo, verified from supabase.com/pricing, accessed 2026-10-21) before daily use — **or** accept living with Free-tier behavior (see trade-offs).
- **Verified cost facts:** Free = $0, 500 MB DB, pauses after **1 week of inactivity** (production sync then stalls until a dashboard/login wake — cold resume delay); Pro starts $25/mo, never pauses, 8 GB DB, 100k MAU. Sizing: a 2-user notes/tasks app is ~1–5 MB — storage is irrelevant; **pausing is the only Free-tier decision**.
- **Alternatives:** (a) Free tier forever — sync becomes best-effort during >7-day idle periods (holidays); app stays fully offline-functional, converges on wake; (b) PL-run PocketBase VPS ~$5/mo — cheapest always-on, but violates C6 (zero-ops): PL administers updates/backups/uptime personally; (c) Neon/Firebase — rejected in ADR-2 (conflict semantics / no RLS-predicate API).
- **Region:** recommend nearest-to-users region (confirm where Lea & Violet actually are; Singapore `ap-southeast-1` is the typical fit for Indonesia). Your input required — not assumed.
- **Impact if you reject:** PocketBase fallback keeps the whole sync design (feed/outbox/CAS) with self-host duty; E2EE outcome (Q3) unchanged.

### Q2 — Account flavor: password, distributed once out-of-band (ADR-3) · **PENDING-PL**
- **Recommendation:** APPROVE password accounts created by PL during bootstrap; credentials handed to Lea & Violet out-of-band (never in git/CI/bundle); password reset = PL-run (identity-recovery ops note already in arch ADR-3).
- **Alternatives:** magic-link/email (needs provider email config; adds deliverability + mailbox dependency and self-recovery UX to spec/change); shared account (breaks FR-09 field-stamp attribution + ownership table).
- **Risk:** lost password = device rebind blocked until PL re-issues — acceptable for 2 known users; documented in ops note.

### Q3 — Privacy baseline: TLS+RLS now, E2EE deferred (ADR-10, D-6, review C-5) · **PENDING-PL**
- **Recommendation:** APPROVE ADR-10 as written. v1 promise: the **other user cannot access** your personal data (RLS, test-verified at data layer per spec §12.2); the **provider can technically read** plaintext (TLS in transit, no E2EE). User-facing copy must say hosted-storage-visible-to-nobody-but-approved-accounts truthfully; never imply E2EE.
- **Alternatives:** (a) personal-space E2EE in MVP — breaks server-side per-field merge stamps for those fields (FR-09 mechanics for personal data degrade to harder device-networking protocol); big scope increase; (b) accept now + schedule E2EE as Phase-5 candidate — recommended hybrid if desired later.
- **If you reject operator visibility:** say so — architecture §6 contracts are revised BEFORE build (explicitly stated in ADR-10); requirements REQ2-SEC-04 is marked as blocked on this signature.

### Q4 — Tombstone retention: 90 days server-side GC, only after both devices observed the delete (ADR-7) · **PENDING-PL**
- **Recommendation:** APPROVE 90 days. Long enough to survive long outages and restore windows (F10), short enough that "deleted" does not mean "kept forever".
- **Alternatives:** 30 days (faster privacy win on deletes, slightly reduces recovery margin) / 180+ (safety margin vs deletion privacy) / never-GC (deleted content persists server-side indefinitely — worst privacy, best recovery).
- **Data-loss risk:** near zero — GC only fires after tombstone propagation + window; device re-push restores content after any server restore.

### Q5 — Edit-vs-delete conflict: explicit user decision, never auto (ADR-5/§13 F4) · **PENDING-PL**
- **Recommendation:** APPROVE as conflict class with explicit surface. Recommendation between the two drafted copy sets (design v0.2 §5.3): **Set A ("Pertahankan perubahanmu" framing)** — deletion is at least as destructive as an edit-lose, and both sets require explicit confirmation to acknowledge a destructive choice. Both sets are written; only the pick is needed.
- **Alternatives:** auto edit-wins (silently resurrects deletes — contrary to user intent), auto delete-wins (silently eats edits — violates D-5's no-silent-discard spirit).
- **Unblocks:** design C-7 copy finalization + TC-CONV-03b soaks in v2 test strategy.

### Q6 — Device-at-rest: plaintext SQLite accepted for v1, encrypted variant deferred (ADR-10 §10) · **PENDING-PL**
- **Recommendation:** APPROVE. Same risk envelope as v1.3's plaintext localStorage (REQ-SEC-02), now with server copies — that change is why you should sign consciously.
- **Cost note:** the candidate SQLite plugin bundles SQLCipher — enabling at-rest encryption later is a config + key-derivation change, not a rebuild (Q7 caveat: SQLCipher carries a US crypto-export self-classification footnote regardless of use).
- **Alternatives:** encrypt now (extra key-management design without a confirmed threat model — premature); encrypted plugin variant later (default).

### Q7 — Dependency set: 3 native plugins + vendored supabase-js, gated on the verify plan (ADR-1/6/9, §11 R1/R2) · **PENDING-PL**
- **Recommendation:** APPROVE conditionally — execution order per `docs/plugin-verification-plan.md` §2 (strictly verify-first, one plugin at a time, dual Termux+CI paths, rollback = single revert):
  1. `@capacitor-community/sqlite` **8.1.1** (2026-08-06) — ADR-1; MEDIUM risk; SQLCipher export footnote; **fallback pinned: per-row IndexedDB (ADR-1 A/B)** if it fails verification.
  2. `@aparajita/capacitor-secure-storage` **8.0.1** (2026-09-23) — ADR-6; Android Keystore AES/GCM; LOW.
  3. `@capacitor/network` **8.0.1** (2026-02-12) — ADR-9 wake-on-connectivity; official plugin; LOW.
  4. `@supabase/supabase-js` **2.118.0** (2026-10-15) — vendored file (no CDN), version pin + SHA-256 at vendoring; only REST+Auth slices.
- **All version/compat facts are documentation-research (npm registry + GitHub, access date recorded in the plan); nothing has been executed here.** Capawesome secure-preferences rejected (paid Insiders registry + CI credential friction).
- **Verified today by this session:** registry metadata for all three native candidates + supabase-js accessed and recorded with exact dates; `@aparajita` 8.0.1 @ 2026-09-23 confirmed; `@capacitor-network` 8.0.1 confirmed.

### Q8 — Replace blob persistence + retire v1.3 shell (ADR-1, D-0) · **PENDING-PL**
- **Recommendation:** APPROVE. The localStorage/blob stack cannot express FR-09 (field merge + explicit resolution) or a durable op queue; v1.3 data is explicitly not migrated (spec exclusion 9 — confirm you accept the "Lea/Violet cannot carry their old PR list into the MVP" consequence, incl. any truly wanted schedule/timer/grade features starting from zero in the new shell).
- **Implication:** v1.3 stays releasable and gets a frozen final version (Phase 0 version-string fix) before the new shell replaces it in Phase 1.

---

## 2. Documents updated (exact paths + summary)

| Path | Change |
|---|---|
| `docs/product-requirements-v2.md` | **NEW** — REQ2-FR01…16, REQ2-NFR01…07, REQ2-DA-01…03, REQ2-SEC-01…04 with G/W/T acceptance; proposal register; v1.3 runway §4; status table. DRAFT pending approval |
| `docs/requirements.md` | Scope banner prepended (v1.3-only, superseded for MVP); REQ-NI-01 label fix (Tugas/UTS/UAS). Body otherwise untouched |
| `docs/architecture-v0.1.md` | In place: v0.1→v0.2-draft; ADR-10 privacy paragraph (C-5); ADR-3 identity-recovery ops note (C-6); typos/cross-refs fixed (C-10: §6.4 refs, "change-feed consumers", ADR-8 heading); §15 Q1–Q8 annotated PENDING-SIGN-OFF with decision-report pointer. Design content unchanged |
| `docs/plugin-verification-plan.md` | **NEW** — per-candidate research + verify-only protocol (marked NOT RUN) with sources + access dates |
| `docs/design-spec.md` | Superseded banner prepended only (v0.1 body intact) |
| `docs/design-spec-v0.2-two-user.md` | **NEW** — 3-slot nav (fixes C-2), identity screen, full chip state map (fixes C-8), conflict surfaces + Indonesian copy (fixes C-7), a11y carry-over, acceptance checklist |
| `docs/test-strategy.md` | Scope banner prepended only (v1.3 plan retained) |
| `docs/test-strategy-v2.md` | **NEW** — trace matrix FR/NFR→TC, spec §12 as TC-SC-01…06, two-device harness proposal, isolation method, convergence set, F1–F11 map, phased testability |
| `docs/review-report-2026-10-21.md` | §8 added: C-1…C-12 resolution statuses |
| `AUDIT.md` | Addendum appended listing planning docs added post-audit |
| `docs/decision-report-2026-10-21.md` | **NEW** — this file |

Production files (`www/`, `android/`, `package.json`, `capacitor.config.json`): untouched. Pre-existing drift (AUDIT defect #3) remains — Phase 0 item.

---

## 3. Decisions safely finalized without your approval (documentation-level only)

- C-1/C-2/C-3 doc rebases and banners (content constrained to the already-CONFIRMED spec).
- C-9 label fix; C-10 typo fixes; C-11 v1.3-runway clarification (derived from confirmed D-0/D-4).
- Verification-plan creation (R1/R2 discharge plan); nothing installed/executed.
- Two-offline-alert copy drafting, chip-label proposals (final wording confirmable later, non-blocking).
- Test-harness design (option (a) two-AVD primary) — proposal, unproven until run by definition.

## 4. Decisions explicitly requiring your approval (blockers)

1. **Q1–Q8 signatures** (§1 above) — backend/provider/region/billing, account flavor, privacy posture, retention, deletion verdict, at-rest acceptance, dependency set, replacement confirm.
2. **Approval of the new doc set** (product-requirements-v2, design v0.2, test-strategy v2) as the build baselines.
3. Residual product micro-decisions (non-blocking for Phase 0–1, recorded in design v0.2 §8): chip wording "Sinkron…" vs "Menyinkronkan…", subject-list seed lists per identity, display-name editability, delete-subject blocking rule.
4. **C-12:** `Example/` deletion/removal + version-string fix (Phase 0 will produce APK/CI changes).
5. **Q1 extension:** final Supabase region + when to move Free→Pro (or accept pause).

## 5. Remaining blockers (severity-ranked)

| # | Sev | Blocker | Owner |
|---|---|---|---|
| 1 | **HIGH** | Q1–Q8 unsigned — no implementation phase may start without them (contract rule 5) | PL (you) |
| 2 | **HIGH** | Phase 0 hygiene: uncommitted drift incl. tracked config (aapt2 override), untracked `docs/`, version strings, `Example/` — must land before any plugin/CI verification | PL + implementation phase |
| 3 | **HIGH** | R1/R2 verification NOT RUN — plugin compatibility is documentation-level only until plan §2 executes | Architect/impl, after #1–#2 |
| 4 | MED | Two-device harness unproven until first run | QA, Phase 1 |
| 5 | MED | New doc set pending approval + REQ2↔TC binding pass | PL + QA |
| 6 | LOW | Product micro-decisions above; conflict copy pick (Q5) needs signature before Phase 3 | PL |

## 6. Minimum implementation-readiness checklist

1. [ ] You sign Q1–Q8 (or amend recommendations).
2. [ ] You approve `product-requirements-v2.md`, `design-spec-v0.2-two-user.md`, `test-strategy-v2.md` as baselines.
3. [ ] Phase 0 executed: commit drift; remove Termux `aapt2FromMavenOverride` from tracked `gradle.properties` (keep local override); version-string unification (v1.2/v1.3); `Example/` fate; verify CI green from clean checkout.
4. [ ] Plugin verification protocol run and recorded (post #3, per plan §2).
5. [ ] Supabase (or chosen backend) test project created with region/billing per Q1; credentials out-of-band only (C8).
6. [ ] Phase 1 (local shell) authorized; P1 automated suite wired (QA strategy v2 Phase-1 set).

Items 1–2 are yours; 3–6 are the implementation phase that starts only on your explicit authorization.

## 7. Verification actually performed (and not)

**Executed/verified THIS session:**
- Read fully: all six intake documents + all four new specialist deliverables + three banner edits + AUDIT.md.
- Architecture-fix verification: grep-confirmed zero stale `§7.2`/`change-f ` refs; duplicate ADR-8 phrase removed (single "handshake gate"); §15 rows annotated; ADR-10/ADR-3 additions present.
- Registry facts via network curl (recorded with dates): `@capacitor-community/sqlite` 8.1.1 @ 2026-08-06; `@aparajita/capacitor-secure-storage` 8.0.1 @ 2026-09-23; `@capacitor/network` 8.0.1 @ 2026-02-12; `@supabase/supabase-js` 2.118.0 @ 2026-10-15. Today's Supabase pricing page read for Q1 cost facts.
- File-scope check: `git status` — no production file modified; only expected docs changed; pre-existing drift unchanged.
- Environment: `delegate_task` tooling is broken in this environment (missing orchestrator binary; all six spawned tasks errored with no side effects — confirmed by `list_tasks` empty + no partial files); work executed via the working `task` subagent mechanism.

**NOT RUN (must remain unclaimed):**
- No test execution of any kind (test strategies v1.3 + v2 are PROPOSED, zero results recorded).
- No plugin installs, no `npm install`, no `cap sync`, no Gradle build, no CI run, no backend/account creation.
- No performance, off-device, sync, isolation, or conflict tests.
- Plugin compatibility verdicts are documentation-research only (cited sources + dates in `docs/plugin-verification-plan.md`).

**Task status: COMPLETE** (planning/documentation). Scope confirmation: no production code, no dependencies, no credentials, no billable resources, no data changes. Stopping here for your approval as instructed.
