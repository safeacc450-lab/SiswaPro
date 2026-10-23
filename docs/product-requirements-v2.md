# SiswaPro — Product Requirements v2 (new MVP, two-user sync app)

| | |
|---|---|
| **Version** | v0.1-draft |
| **Date** | 2026-10-21 |
| **Status** | DRAFT — pending Project Lead approval. Do not build from this doc until status changes. |
| **Supersedes for the new MVP** | docs/requirements.md (restricted to the retired v1.3 student app only; regression reference until v1.3 shell retires per D-0) |
| **Traceability** | Every requirement traces to docs/spec/product-spec-v0.3.0.md (CONFIRMED scope: FR-01…FR-16, NFR-01…NFR-07, D-0…D-8, exclusions §10). IDs below use scheme REQ2-*. |
| **Scope of this doc** | Product requirements only. No implementation technology (DB engine, sync protocol internals, backend vendor) is chosen here — those live in docs/architecture-v0.1.md pending PL sign-off. |

ID scheme:

- `REQ2-FRxx` — functional, one per spec FR-01…FR-16.
- `REQ2-NFRxx` — non-functional, one per spec NFR-01…NFR-07.
- `REQ2-DA-xx` — durability & data-lifecycle additions (FR-06, FR-14).
- `REQ2-SEC-xx` — security/privacy additions (FR-10/NFR-03, import, credentials, transport baseline).

Every statement that paraphrases or extends the confirmed spec but is not itself a spec sentence is marked **[proposal]**. Spec-sourced statements are quoted/rewritten without weakening.

---

## 1. Functional requirements

### REQ2-FR01 · Identity selection
- **Statement:** First launch presents exactly two choices: Lea or Violet. One profile per device.
- **Priority:** P0 (spec: Confirmed)
- **Trace:** FR-01, D-3, US-01, exclusion 11
- **Acceptance:**
  - Given first launch / When the app opens with no stored identity / Then an identity screen shows exactly two options and no other content is reachable until one is chosen.
  - Given an identity is chosen / When the app relaunches / Then the identity screen never appears again.
  - Given any screen in the app / When inspected / Then there is no UI path to switch identity on the device (D-3).
- **Notes:** No account creation UI of any kind; stranger accounts are excluded (spec §0.1, §10.3).
- **Tested:** QA: docs/test-strategy-v2.md *(placeholder) · Arch: Phase 1*

### REQ2-FR02 · Personal space
- **Statement:** Each user has exactly one personal space. Only the owning identity can read or write it.
- **Priority:** P0 (spec: Confirmed)
- **Trace:** FR-02, C-2, US-02, US-09
- **Acceptance:**
  - Given Lea is active / When she opens Personal / Then only Lea's personal notes and homework appear.
  - Given Violet's device has fully synced / When Violet opens Personal / Then she sees zero items originating from Lea's personal space.
  - Given any personal item / When its storage record is inspected / Then it belongs to exactly one space and its space is immutable after creation (spec §6 rule).
- **Notes:** See also REQ2-SEC-01 — isolation is enforced at the data layer, not by hiding UI.
- **Tested:** QA: docs/test-strategy-v2.md *(placeholder) · Arch: Phase 1 (local), Phase 2–3 (sync isolation)*

### REQ2-FR03 · Shared space
- **Statement:** One shared space, readable and writable by both identities.
- **Priority:** P0 (spec: Confirmed)
- **Trace:** FR-03, C-3, US-03, US-08, D-1
- **Acceptance:**
  - Given Violet creates a shared item offline / When Lea's device later syncs / Then the item appears in Lea's shared view.
  - Given either user edits a shared item / When both devices sync / Then both devices show the same final content.
- **Notes:** Shared content is restricted to tasks (title + done) per REQ2-FR11; no subject/school field ever enters the shared space (exclusion 12, school-separation criterion spec §12.6).
- **Tested:** QA: docs/test-strategy-v2.md *(placeholder) · Arch: Phase 1–3*

### REQ2-FR04 · Space navigation
- **Statement:** Persistent navigation exposes: Personal, Shared, Settings. Active space always visually identifiable.
- **Priority:** P0 (spec: Confirmed)
- **Trace:** FR-04, F-2
- **Acceptance:**
  - Given the app is open / When any screen is shown / Then the current space is identifiable without scrolling.
  - Given steady-state use / When the user navigates / Then the three targets (Personal, Shared, Settings) are always reachable via persistent navigation.
- **Notes:** **[proposal]** Visual form (bottom bar vs other persistent pattern) is a UX/design-doc matter, not fixed here; "persistent" and "always identifiable" are the binding constraints per spec F-2.
- **Tested:** QA: docs/test-strategy-v2.md *(placeholder) · Arch: Phase 1, polish Phase 4*

### REQ2-FR05 · Offline operation
- **Statement:** All reads and writes hit local storage first. Every feature is functional in airplane mode.
- **Priority:** P0 (spec: Confirmed)
- **Trace:** FR-05, C-4, US-04, NFR-01
- **Acceptance:**
  - Given airplane mode / When the user performs any supported action (create, edit, complete, delete) / Then it succeeds immediately and is marked pending sync.
  - Given airplane mode has persisted for 7 days of typical use / When the user uses any approved feature / Then 100% of approved features still function (NFR-01).
- **Notes:** No feature may require connectivity to become available. Sync bookkeeping never blocks a local write.
- **Tested:** QA: docs/test-strategy-v2.md *(placeholder) · Arch: Phase 1 (local), Phase 4 (7-day soak)*

### REQ2-FR06 · Local durability
- **Statement:** Data survives app kill, crash, and device restart.
- **Priority:** P0 (spec: Confirmed)
- **Trace:** FR-06, NFR-04, spec §12.4
- **Acceptance:**
  - Given an item was saved / When the app is force-killed and reopened / Then the item is present.
  - Given any acknowledged save / When a force-kill, crash, OS update, or battery pull occurs at any instant / Then no acknowledged save is lost (NFR-04; durability success criterion spec §12.4).
- **Notes:** Expanded into testable data-lifecycle requirements REQ2-DA-01…03.
- **Tested:** QA: docs/test-strategy-v2.md *(placeholder) · Arch: Phase 1, re-verified Phase 3*

### REQ2-FR07 · Background sync
- **Statement:** When connectivity is available, pending local changes upload and remote changes download without user action.
- **Priority:** P0 (spec: Confirmed)
- **Trace:** FR-07, C-5, US-05
- **Acceptance:**
  - Given pending changes exist / When the device regains connectivity / Then sync starts automatically and completes without interaction.
  - Given sync is in progress / When the user interacts with the UI / Then the UI is never blocked or frozen by sync activity (NFR-02).
- **Notes:** "Eventual" = seconds-to-minutes convergence acceptable; real-time collaboration explicitly not required (spec §0.4). Retry/trigger mechanics are architecture matters (arch ADR-5/ADR-9) — not specified here.
- **Tested:** QA: docs/test-strategy-v2.md *(placeholder) · Arch: Phase 2 (smoke), Phase 3 (full engine)*

### REQ2-FR08 · Sync status
- **Statement:** Persistent, glanceable indicator with at least three states: offline / pending-sync / synced.
- **Priority:** P0 (spec: Confirmed)
- **Trace:** FR-08, US-06, F-2
- **Acceptance:**
  - Given an edit was just made offline / When the user views the indicator / Then it shows pending until the change is uploaded.
  - Given connectivity is absent / When the user views the indicator / Then it shows offline.
  - Given all pending changes are uploaded / When the user views the indicator / Then it shows synced.
- **Notes:** **[proposal]** The full state set (REAUTH, NEEDS-UPDATE, CONFLICT-PENDING) is defined in arch §9 and is a design-spec re-base item (C-8); this requirement binds only the three spec-mandated states plus "at least".
- **Tested:** QA: docs/test-strategy-v2.md *(placeholder) · Arch: Phase 1 (basic), Phase 3 (full states)*

### REQ2-FR09 · Conflict handling
- **Statement:** Auto-merge: non-overlapping edits to the same item merge without user action. Same-field conflicts on the same item: explicit user resolution surface; no silent discard. All resolutions converge: both devices end byte-identical.
- **Priority:** P0 (spec: Confirmed, policy per D-5)
- **Trace:** FR-09, D-5, spec §12.3, arch §7
- **Acceptance:**
  - Given both users edited different fields of the same shared task offline / When both devices sync / Then both fields are present on both devices with no prompt.
  - Given both users edited the same field of the same task offline / When both devices sync / Then each device shows one resolution choice for that item and both devices converge to the same outcome.
  - Given any sequence of offline edits by both users / When both devices finish syncing with no new edits / Then shared-task contents are byte-identical, with no manual steps in the no-conflict case (success criterion spec §12.3).
  - Given a conflict resolution / When sync re-runs / Then repeated sync is a no-op — no duplicates (NFR-05).
- **Notes:** The edit-vs-delete conflict verdict is an **open PL decision (Q5)** — see §4 of this doc. This requirement requires the conflict to be surfaced explicitly regardless of which verdict is chosen; it does not pre-decide the verdict.
- **Tested:** QA: docs/test-strategy-v2.md *(placeholder) · Arch: Phase 3*

### REQ2-FR10 · Sync isolation
- **Statement:** Personal content of one user is never transmitted to, stored in, or retrievable from the other user's personal space — at the data layer, not just the UI.
- **Priority:** P0 (spec: Confirmed)
- **Trace:** FR-10, NFR-03, US-02, US-11, spec §12.2
- **Acceptance:**
  - Given Lea's personal note or homework synced / When Violet's device receives its sync payload / Then Lea's item is not present in any form Violet can access.
  - Given full bidirectional sync completed / When either device's local store and change-feed captures are directly inspected / Then they contain zero rows, IDs, or field values from the peer's personal space (spec §12.2, verified at data layer).
- **Notes:** Strengthened into REQ2-SEC-01. Privacy posture nuance (user-level isolation guaranteed; operator-level visibility in v1) is PENDING-PL per D-6/Q3 — see REQ2-SEC-04 and review-report C-5.
- **Tested:** QA: docs/test-strategy-v2.md *(placeholder) · Arch: Phase 2 (enforced), Phase 3 (verified)*

### REQ2-FR11 · Shared tasks
- **Statement:** Shared item = title + done state. No subject or school field. Create, edit, complete, delete by either user.
- **Priority:** P0 (spec: Confirmed, D-1)
- **Trace:** FR-11, D-1, US-03, US-08
- **Acceptance:**
  - Given Violet adds a shared task offline / When Lea syncs / Then she sees it with correct title and state.
  - Given either user / When performing create, edit, complete, or delete on a shared task / Then the action is permitted symmetrically (no roles; exclusion 10).
  - Given any shared item / When its record is inspected / Then it carries no subject or school field (spec §12.6).
- **Notes:** None.
- **Tested:** QA: docs/test-strategy-v2.md *(placeholder) · Arch: Phase 1*

### REQ2-FR12 · Personal notes
- **Statement:** Personal item = title + body, owned by the active identity. Create, edit, delete.
- **Priority:** P0 (spec: Confirmed, D-2)
- **Trace:** FR-12, D-2, US-09
- **Acceptance:**
  - Given Lea writes a note offline / When Violet syncs afterwards / Then the note is not on Violet's device.
  - Given the owning identity / When performing create, edit, or delete on a personal note / Then the action succeeds locally first (REQ2-FR05 applies).
- **Notes:** Personal homework is a separate content type (REQ2-FR15); notes are text-only.
- **Tested:** QA: docs/test-strategy-v2.md *(placeholder) · Arch: Phase 1*

### REQ2-FR13 · Due dates — **P2, NOT APPROVED. Excluded from MVP build.**
- **Statement:** *(Carried for traceability only, per spec:)* Optional date on any item; overdue/due-soon visible. No push notifications in MVP.
- **Priority:** P2 (spec: Proposal, D-4 — NOT approved)
- **Trace:** FR-13, D-4, US-10, exclusion 4
- **Acceptance:** None defined — no build obligation until the PL reopens D-4. Spec note stands: homework without due dates is deliberate scope discipline; reopening later is architecturally additive (additive migration path noted in arch §8/§12) — **[proposal]** that architectural claim is quoted from arch, not re-verified here.
- **Notes:** This requirement is **out of the MVP build and out of MVP acceptance**. No MVP test case may exist for it. Listed here solely so REQ2 numbering stays traceable to FR-01…FR-16 without silently renumbering.
- **Tested:** QA: none (excluded) · Arch: none (no column in MVP schema)

### REQ2-FR15 · Personal homework
- **Statement:** Personal item = title + subject (from the owner's subject list) + done state. Create, edit, complete, delete.
- **Priority:** P0 (spec: Confirmed, D-8)
- **Trace:** FR-15, D-8, US-11
- **Acceptance:**
  - Given Lea adds homework offline / When she reopens the app / Then it is present and marked pending sync.
  - Given Violet syncs fully / Then zero traces of Lea's homework exist on Violet's device.
- **Notes:** Subject values are constrained to the owner's own subject list (REQ2-FR16). No due-date field in MVP (REQ2-FR13 excluded).
- **Tested:** QA: docs/test-strategy-v2.md *(placeholder) · Arch: Phase 1*

### REQ2-FR16 · Personal subject list
- **Statement:** Each identity manages her own subject list, seeded with sensible defaults on first run; used only by her homework. Never visible to, shared with, or synced into the other user's space. No shared subject list exists anywhere in the product.
- **Priority:** P0 (spec: Confirmed, D-8)
- **Trace:** FR-16, D-8, exclusion 12, spec §12.6
- **Acceptance:**
  - Given Lea's device / When her subject list is inspected after sync / Then it contains only Lea's subjects; Violet's subjects never appear and vice versa.
  - Given first run / When a new identity is set up / Then the subject list is seeded with sensible defaults.
  - Given a homework item referencing Lea's subject list / When any sync or inspection occurs / Then it can never appear on Violet's device, and no shared item ever carries a subject field (spec §12.6).
- **Notes:** "Sensible defaults" content is a **[proposal]** UX decision — draft pick list lives with UX re-base (C-2 workstream), pending PL/design approval.
- **Tested:** QA: docs/test-strategy-v2.md *(placeholder) · Arch: Phase 1*

### REQ2-FR14 · Export & reset
- **Statement:** Given Settings / When user taps export / Then a complete copy of that device's data is produced outside the app database. Given reset / When confirmed twice / Then all local data is erased. Server-side copies are governed by D-7.
- **Priority:** P0 (spec: Confirmed)
- **Trace:** FR-14, US-07, NFR-07, D-7
- **Acceptance:**
  - Given Settings / When the user taps export / Then a complete copy of that device's data is produced outside the app database.
  - Given reset initiated / When the user confirms twice / Then all local data is erased.
  - Given a destructive action (reset, delete shared task) / When initiated / Then explicit confirmation is required and export is offered beforehand (NFR-07).
- **Notes:** Expanded into REQ2-DA-02/03. Server-side copy governance (retention, backend GC) is **PENDING-PL via D-7/Q1/Q4** — the local-side behavior above is binding regardless of that decision.
- **Tested:** QA: docs/test-strategy-v2.md *(placeholder) · Arch: Phase 1 (local), server-side posture per D-7 decision*

---

## 2. Non-functional requirements

### REQ2-NFR01 · Offline completeness
- **Statement:** 100% of approved features function in airplane mode for ≥7 days of typical use.
- **Priority:** P0
- **Trace:** NFR-01, FR-05, spec §12.1
- **Acceptance:**
  - Given networking is off for 7 days of typical use / When both users complete full create/edit/complete/delete flows for tasks, notes, and homework / Then nothing is lost (success criterion spec §12.1).
- **Notes:** "Typical use" profile is a QA harness matter (test-strategy-v2) — **[proposal]** QA defines the 7-day scenario explicitly rather than leaving it implicit.
- **Tested:** QA: docs/test-strategy-v2.md *(placeholder) · Arch: Phase 4 (soak)*

### REQ2-NFR02 · Responsiveness
- **Statement:** UI never blocks on network; sync is background. Cold app start < 2s on a low-end Android device.
- **Priority:** P0
- **Trace:** NFR-02, FR-07
- **Acceptance:**
  - Given any network condition (fast, slow, flapping, absent) / When the user interacts with the UI / Then no interaction blocks on the network.
  - Given a low-end Android device / When the app cold-starts / Then it reaches interactive state in < 2s.
- **Notes:** "Low-end Android device" model is a QA-harness definition — **[proposal]** QA names the reference device/class in test-strategy-v2.
- **Tested:** QA: docs/test-strategy-v2.md *(placeholder) · Arch: Phase 4 (performance budget)*

### REQ2-NFR03 · Privacy at the storage layer
- **Statement:** One user's personal data is inaccessible to the other at the storage layer, not merely hidden in UI.
- **Priority:** P0
- **Trace:** NFR-03, FR-10, spec §12.2
- **Acceptance:** As REQ2-FR10 / REQ2-SEC-01 (data-layer inspection test is the acceptance method).
- **Notes:** Operator-level visibility is a separate, open posture decision — see REQ2-SEC-04 (PENDING-PL, D-6/Q3/C-5). This requirement concerns only inter-user access and is binding now.
- **Tested:** QA: docs/test-strategy-v2.md *(placeholder) · Arch: Phase 2–3*

### REQ2-NFR04 · Durability
- **Statement:** No data loss on force-kill, crash, OS update, or battery pull.
- **Priority:** P0
- **Trace:** NFR-04, FR-06, spec §12.4
- **Acceptance:** As REQ2-FR06 / REQ2-DA-01.
- **Notes:** None.
- **Tested:** QA: docs/test-strategy-v2.md *(placeholder) · Arch: Phase 1, re-verified Phase 3*

### REQ2-NFR05 · Convergence
- **Statement:** After both devices sync with no new edits, contents are identical; repeated sync is a no-op (no duplicates).
- **Priority:** P1
- **Trace:** NFR-05, FR-09, spec §12.3
- **Acceptance:** As REQ2-FR09 (third/fourth acceptance criteria).
- **Notes:** P1 per spec — not a launch blocker, but the MVP success criteria (spec §12) include it.
- **Tested:** QA: docs/test-strategy-v2.md *(placeholder) · Arch: Phase 3*

### REQ2-NFR06 · Language & cleanliness
- **Statement:** Indonesian UI throughout; no ads, no third-party tracking.
- **Priority:** P1
- **Trace:** NFR-06
- **Acceptance:**
  - Given any app surface / When rendered / Then all copy is Indonesian (Bahasa Indonesia).
  - Given any app session / When network traffic and bundle contents are inspected / Then zero ads and zero third-party tracking are present.
- **Notes:** Conflict/deletion copy is Indonesian system language, drafted before Phase 3 per arch §14 — **[proposal]** timing note quoted from arch §14.
- **Tested:** QA: docs/test-strategy-v2.md *(placeholder) · Arch: Phase 4*

### REQ2-NFR07 · Destructive-action safety
- **Statement:** Destructive actions (reset, delete shared tasks) require explicit confirmation; export offered beforehand.
- **Priority:** P0
- **Trace:** NFR-07, FR-14
- **Acceptance:**
  - Given a destructive action initiated / When invoked / Then an explicit confirmation step is required.
  - Given reset is initiated / When the confirmation flow opens / Then export is offered beforehand.
- **Notes:** Applies to every destructive surface enumerated in spec (reset, delete shared tasks); **[proposal]** extends to personal-item deletion for consistency, pending design/doc approval.
- **Tested:** QA: docs/test-strategy-v2.md *(placeholder) · Arch: Phase 1*

---

## 3. Additional requirement groups

### REQ2-DA-xx — Durability & data lifecycle

- **REQ2-DA-01 · Atomic acknowledged saves · P0** *(proposal, deriving FR-06/NFR-04)*
  Every acknowledged local save is atomic: at any instant of kill (app, process, power) the device holds either the full saved state or the prior state — never a half-write. *Trace: FR-06, NFR-04.* **Tested:** QA placeholder · Arch: Phase 1.
- **REQ2-DA-02 · Export completeness · P0** *(proposal, deriving FR-14)*
  Export produces a complete copy of that device's data (personal + shared content, profile, subject list) with a schema version stamp, independent of the app's live database. Sync bookkeeping and credentials are excluded from the export blob. *Trace: FR-14, ADR-6 discipline.* **Tested:** QA placeholder · Arch: Phase 1.
- **REQ2-DA-03 · Reset erasure · P0** *(proposal, deriving FR-14/NFR-07)*
  Double-confirmed reset erases all local data on the device. Server-side copies (retention window, backend GC) are governed by D-7 — **PENDING-PL**; until decided, this requirement binds only local erasure and makes no server-side claim. *Trace: FR-14, D-7.* **Tested:** QA placeholder · Arch: Phase 1 (local), server posture per D-7.

### REQ2-SEC-xx — Security & privacy

- **REQ2-SEC-01 · Data-layer isolation · P0** *(deriving FR-10/NFR-03; not weakened)*
  Inter-user isolation of personal content is enforced at the data layer — a direct inspection of local stores and sync-payload captures shows zero peer-personal rows, IDs, or field values. UI hiding alone is non-compliant. *Trace: FR-10, NFR-03, spec §12.2.* **Tested:** QA placeholder · Arch: Phase 2 (enforced), Phase 3 (verified).
- **REQ2-SEC-02 · Import treated as untrusted · P0** *(proposal, carrying v1.3 REQ-SEC-03 discipline forward)*
  Any import/restore path schema-validates input, size-bounds it, and constrains it to the expected shape before applying; invalid input causes no state change. **[proposal]** Carrying this v1.3 discipline into the new shell is proposed, not yet a spec sentence — flagged for PL confirmation with the FR-14 build. *Trace:* requirement-gap[proposal]; precedent REQ-SEC-03. **Tested:** QA placeholder · Arch: Phase 1.
- **REQ2-SEC-03 · No credentials in repo, CI, or bundle · P0** *(proposal, standing repo rule C8)*
  No credential material ever enters the repository, CI configuration, or the app bundle; account credentials are distributed out-of-band once. **[proposal]** Restating the working rule as a trackable requirement — PL ratification requested with ADR-3 sign-off. *Trace: arch C8, ADR-3.* **Tested:** QA placeholder · Arch: Phase 2.
- **REQ2-SEC-04 · Transport & at-rest baseline · P0 — PENDING-PL (D-6/Q3)**
  Baseline posture **[proposal per ADR-10, requires PL sign-off]**: TLS for all transport in v1; inter-user isolation via server-side row-level access control; no promise beyond that baseline in v1 (spec exclusion 8). Operator-level readability of content in v1 is explicit and surfaced, never implied otherwise (review-report C-5). Personal-space E2EE is a candidate upgrade, deferred. **This requirement must not be implemented before the PL answers D-6/Q3** (arch §15 Q3); if the PL rejects operator visibility, the MVP requirements here are revised (E2EE promoted) before build. *Trace: D-6, Q3, ADR-10, C-5, exclusion 8.* **Tested:** QA placeholder · Arch: Phase 2.

---

## 4. v1.3 runway (resolves review-report C-11)

During the transition both shells exist on disk, in different roles:

1. **v1.3 stays releasable until the MVP replaces it.** docs/requirements.md remains the APPROVED requirements baseline for the v1.3 student app; QA may continue to test v1.3 against REQ-* for as long as v1.3 ships. Nothing in this doc removes v1.3's release-worthiness.
2. **The open flags in requirements.md §8–§9 are v1.3-only issues, not MVP blockers.** Specifically: REQ-DA-05 silence semantics, REQ-JD-03 overlap tolerance / hard-block question, REQ-FO-05 entries-vs-days ambiguity, REQ-NI-01 input bounds, REQ-AN-05 (signed release), and §9 Q1–Q4 (out-of-scope scheduling, APK signing, min Android version, FO-05 semantics). If and only if v1.3 ships beyond the MVP build start, an owner must still resolve them **on the v1.3 retirement path alone**; they neither gate nor appear in this MVP requirements baseline (REQ2-*).
3. **v1.3 retirement itself is D-0 (resolved):** replaced wholesale, no data migration, v1.3 shell retires when the MVP reaches Phase-1 replacement per arch §14. From that point, requirements.md + docs/test-strategy.md are retained only as regression reference for the old shell until its retirement completes.
4. AUDIT defects #4–#8 and the drift commit were already assigned to arch Phase 0 and are unaffected by this section.

**Net:** no MVP work item, no REQ2-*, and no phase gate in this doc depends on any §8–§9 flag in requirements.md.

---

## 5. Open items requiring Project Lead approval

These are **not resolved** in this document. They are carried as open dependencies and this doc must not be approved as final while they alter requirement content:

| Item | Source | What is waiting |
|---|---|---|
| D-6 — privacy baseline for sync transport | spec §11; arch §15 Q3; C-5 | Whether server-operator visibility in v1 (TLS + server-side isolation, E2EE deferred) is accepted. Affects REQ2-SEC-04; if rejected, E2EE enters MVP scope and revisions land before build. |
| D-7 — sync backend class | spec §11; arch §15 Q1/Q2/Q4 | Backend class/provider/region/billing, account flavor, tombstone retention/GC. Affects server-side governance language in REQ2-FR14 / REQ2-DA-03; no technology is fixed in this doc either way. |
| Q5 — deletion-conflict verdicts (edit-vs-delete; both-texts-visible merge surface) | arch §15 Q5; C-7 | The FR-09 conflict verdict for the edit-vs-delete race. REQ2-FR09 requires explicit resolution regardless; the *verdict* stays open and conflict copy (C-7) is blocked on it. |

Related PL gates already tracked in arch §15 (Q1–Q8 set, incl. C-4) are not duplicated here; this section lists only the three that change **requirement text**.

---

## 6. Status table

| REQ2 ID | Statement anchor | Priority | Tested in | Arch phase |
|---|---|---|---|---|
| REQ2-FR01 | FR-01, D-3 | P0 | QA: docs/test-strategy-v2.md *(placeholder)* | Phase 1 |
| REQ2-FR02 | FR-02 | P0 | QA placeholder | Phase 1; isolation Phase 2–3 |
| REQ2-FR03 | FR-03 | P0 | QA placeholder | Phase 1–3 |
| REQ2-FR04 | FR-04 | P0 | QA placeholder | Phase 1; polish Phase 4 |
| REQ2-FR05 | FR-05 | P0 | QA placeholder | Phase 1; 7-day soak Phase 4 |
| REQ2-FR06 | FR-06 | P0 | QA placeholder | Phase 1; re-verify Phase 3 |
| REQ2-FR07 | FR-07 | P0 | QA placeholder | Phase 2 smoke; Phase 3 full |
| REQ2-FR08 | FR-08 | P0 | QA placeholder | Phase 1 basic; Phase 3 full states |
| REQ2-FR09 | FR-09, D-5 | P0 | QA placeholder | Phase 3 |
| REQ2-FR10 | FR-10 | P0 | QA placeholder | Phase 2 enforced; Phase 3 verified |
| REQ2-FR11 | FR-11, D-1 | P0 | QA placeholder | Phase 1 |
| REQ2-FR12 | FR-12, D-2 | P0 | QA placeholder | Phase 1 |
| REQ2-FR13 | FR-13, D-4 | **P2 NOT APPROVED — excluded from MVP build** | none | none |
| REQ2-FR14 | FR-14 | P0 | QA placeholder | Phase 1 (local); server posture per D-7 |
| REQ2-FR15 | FR-15, D-8 | P0 | QA placeholder | Phase 1 |
| REQ2-FR16 | FR-16, D-8 | P0 | QA placeholder | Phase 1 |
| REQ2-NFR01 | NFR-01 | P0 | QA placeholder | Phase 4 soak |
| REQ2-NFR02 | NFR-02 | P0 | QA placeholder | Phase 4 perf budget |
| REQ2-NFR03 | NFR-03 | P0 | QA placeholder (via SEC-01 method) | Phase 2–3 |
| REQ2-NFR04 | NFR-04 | P0 | QA placeholder | Phase 1; Phase 3 |
| REQ2-NFR05 | NFR-05 | P1 | QA placeholder | Phase 3 |
| REQ2-NFR06 | NFR-06 | P1 | QA placeholder | Phase 4 |
| REQ2-NFR07 | NFR-07 | P0 | QA placeholder | Phase 1 |
| REQ2-DA-01 | FR-06/NFR-04 [proposal] | P0 | QA placeholder | Phase 1 |
| REQ2-DA-02 | FR-14 [proposal] | P0 | QA placeholder | Phase 1 |
| REQ2-DA-03 | FR-14, D-7 [proposal] | P0 | QA placeholder | Phase 1 (local); server per D-7 |
| REQ2-SEC-01 | FR-10/NFR-03 | P0 | QA placeholder | Phase 2–3 |
| REQ2-SEC-02 | REQ-SEC-03 carry-over [proposal] | P0 | QA placeholder | Phase 1 |
| REQ2-SEC-03 | arch C8 [proposal] | P0 | QA placeholder | Phase 2 |
| REQ2-SEC-04 | D-6/Q3 [proposal] | **P0 — PENDING-PL** | QA placeholder | Phase 2 (blocked until Q3 answered) |

*(All "QA placeholder" entries await docs/test-strategy-v2.md — QA workstream, review-report §5.)*

---

## 7. Proposal register (statements in this doc that are not spec sentences)

For PL review convenience, every non-spec assertion made above, in one list:

1. REQ2-FR04 note — navigation *form* is a design-doc matter; binding constraints are "persistent + always identifiable" (spec F-2).
2. REQ2-FR08 note — chip state set beyond the three spec states follows arch §9 after design re-base (C-8).
3. REQ2-NFR01 note — QA defines the "7 days typical use" scenario explicitly.
4. REQ2-NFR02 note — QA names the "low-end device" reference class.
5. REQ2-NFR06 note — conflict copy drafted before Phase 3 (timing quoted from arch §14).
6. REQ2-NFR07 acceptance note — explicit-confirmation extended to personal-item deletion.
7. REQ2-DA-01…03 — durability/export/reset decomposed into testable units; wording is new, substance is FR-06/FR-14/NFR-04/NFR-07.
8. REQ2-SEC-01 acceptance method — direct store/feed inspection as the isolation test method (from arch §10.3, spec §12.2).
9. REQ2-SEC-02 — import-as-untrusted carried from v1.3 REQ-SEC-03 as a proposal.
10. REQ2-SEC-03 — repo/CI/bundle credential rule restated as a requirement for ratification.
11. REQ2-SEC-04 — TLS + server-side isolation baseline, E2EE deferred, operator visibility explicit — all pending D-6/Q3.
12. §4 v1.3 runway decomposition of requirements.md §8–§9 flags as v1.3-only.

No item above weakens a confirmed spec statement; items 9–11 add constraints rather than remove them.
