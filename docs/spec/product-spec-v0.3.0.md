# SiswaPro — Product Specification (MVP)

| | |
|---|---|
| **Version** | 0.3.0-confirmed |
| **Status** | Product scope CONFIRMED by Project Lead 2026-10-21. D-6/D-7 (technical) open, owned by tech lead. |
| **Date** | 2026-10-21 |
| **Supersedes** | 0.2.0-confirmed (chat), 0.1.0-draft (chat) |
| **Scope of this doc** | Product requirements only. No implementation choices (DB, sync protocol, backend tech) are dictated. |

## Changelog

- **0.3.0-confirmed** — New constraint: Lea and Violet attend different schools. D-8 resolved (personal notes + personal homework with per-user subject list). Added FR-15, FR-16, US-11. Shared tasks confirmed school-agnostic. No shared subjects/timetables (exclusion 12).
- **0.2.0-confirmed** — Project Lead resolved D-0…D-5. FR-11, FR-12 promoted to P0. Identity-switch flow removed. Scope frozen for MVP.
- **0.1.0-draft** — initial draft.

## 0. Assumptions (standing unless corrected)

1. Lea and Violet are the only two users, ever. No account system for strangers.
2. Target platform: Android via Capacitor (existing shell), UI language stays Indonesian.
3. Lea and Violet may be non-technical users; zero server administration burden is acceptable to them.
4. "Eventual" sync means seconds-to-minutes convergence is acceptable; real-time collaboration is not required.
5. No backend exists today. Any sync backend is net-new.
6. The existing v1.3 single-user student app is **replaced** (D-0); its data is not migrated.
7. Lea and Violet attend **different schools**. Their subjects, class schedules, and homework are disjoint.

## 1. Primary user problem

Lea and Violet each manage their own day-to-day information, and they coordinate some things together. Today that lives scattered across chat apps, paper, and memory. Chat apps mix private and shared content badly and assume permanent connectivity; shared-notebook tools assume a team, not two people.

They each need one app on their phone where:

- each has a **personal space** that is truly private — the other person cannot see it, even on the same backend,
- a **shared space** holds what they jointly track and both can change,
- everything **works offline** (commute, dead zones, airplane mode),
- devices **converge on their own** when connectivity returns, without either person pressing "sync" or resolving scary dialogs in normal cases.

Success = both phones agree on the same shared content after any amount of offline drift, with zero data loss and no manual intervention in the common case.

## 2. Users

| User | Role |
|---|---|
| Lea | Peer user. Owns one personal space; co-owns the shared space. Attends her own school. |
| Violet | Peer user. Same rights as Lea. Symmetric — no admin, no hierarchy. Attends a different school. |

## 3. Confirmed vs proposed

**Confirmed pillars (from product brief):**

| ID | Pillar |
|---|---|
| C-1 | Two named users: Lea, Violet |
| C-2 | Personal spaces, private per user |
| C-3 | One shared space, visible/editable by both |
| C-4 | Offline-first behavior |
| C-5 | Eventual online synchronization |

**Confirmed via Project Lead decision:** shared tasks, school-agnostic (D-1); personal notes + personal homework with per-user subjects (D-2, D-8); one profile per device (D-3); auto-merge conflict policy (D-5); v1.3 replaced (D-0).

**Proposed, not approved:** due dates (FR-13, P2), reminders/notifications, anything in §10.

## 4. User stories

| ID | Priority | Story |
|---|---|---|
| US-01 | P0 | As Lea, I open the app for the first time and choose my identity, so the app knows which space is mine. |
| US-02 | P0 | As Lea, I see only my personal content and never Violet's personal content. |
| US-03 | P0 | As Violet, I can create and change items in the shared space. |
| US-04 | P0 | As either user, I can do everything the app offers with no network connection. |
| US-05 | P0 | As either user, when my device comes back online, my changes reach the other person without manual action. |
| US-06 | P0 | As either user, I can tell at a glance whether my data is saved locally and synced. |
| US-07 | P0 | As either user, I can export or wipe all data on my device. |
| US-08 | P0 | As Lea or Violet, I can add, edit, complete, and delete shared tasks both of us can see. |
| US-09 | P0 | As Lea, I can keep private notes only I can read. |
| US-10 | P2 | As Lea, I can attach a due date to an item and see what's due. *(Proposal — not approved.)* |
| US-11 | P0 | As Lea, I track my homework for my school's subjects, separate from Violet's. |

## 5. Functional requirements

Priorities: P0 = MVP-defining. P1/P2 = later, not approved for build.

### Identity & spaces

**FR-01 · Identity selection · P0 · Confirmed**
- First launch presents exactly two choices: Lea or Violet. One profile per device (D-3).
- Given first launch / When app opens with no stored identity / Then an identity screen shows two options and no other content is reachable until one is chosen.
- Given an identity is chosen / When app relaunches / Then identity screen never appears again.

**FR-02 · Personal space · P0 · Confirmed**
- Each user has exactly one personal space. Only the owning identity can read or write it.
- Given Lea is active / When she opens Personal / Then only Lea's personal notes and homework appear.
- Given Violet's device synced / When Violet opens Personal / Then she sees zero items originating from Lea's personal space.

**FR-03 · Shared space · P0 · Confirmed**
- One shared space, readable and writable by both identities.
- Given Violet creates a shared item offline / When Lea's device later syncs / Then the item appears in Lea's shared view.
- Given either user edits a shared item / When both devices sync / Then both devices show the same final content.

**FR-04 · Space navigation · P0 · Confirmed**
- Persistent navigation exposes: Personal, Shared, Settings. Active space always visually identifiable.
- Given app is open / When any screen is shown / Then current space is identifiable without scrolling.

### Offline-first

**FR-05 · Offline operation · P0 · Confirmed**
- All reads and writes hit local storage first. Every feature is functional in airplane mode.
- Given airplane mode / When user performs any supported action (create, edit, complete, delete) / Then it succeeds immediately and is marked pending sync.

**FR-06 · Local durability · P0 · Confirmed**
- Data survives app kill, crash, and device restart.
- Given an item was saved / When the app is force-killed and reopened / Then the item is present.

### Synchronization

**FR-07 · Background sync · P0 · Confirmed**
- When connectivity is available, pending local changes upload and remote changes download without user action.
- Given pending changes exist / When device regains connectivity / Then sync starts automatically and completes without interaction.
- Sync must never block or freeze the UI (NFR-02).

**FR-08 · Sync status · P0 · Confirmed**
- Persistent, glanceable indicator with at least three states: offline / pending-sync / synced.
- Given an edit was just made offline / When user views the indicator / Then it shows pending until the change is uploaded.

**FR-09 · Conflict handling · P0 · Confirmed (policy per D-5)**
- Auto-merge: non-overlapping edits to the same item merge without user action.
- Same-field conflicts on the same item: explicit user resolution surface; no silent discard.
- All resolutions converge: both devices end byte-identical.
- Given both users edited different fields of the same shared task offline / When both devices sync / Then both fields are present on both devices with no prompt.
- Given both users edited the same field of the same task offline / When both devices sync / Then each device shows one resolution choice for that item and both devices converge to the same outcome.

**FR-10 · Sync isolation · P0 · Confirmed**
- Personal content of one user is never transmitted to, stored in, or retrievable from the other user's personal space — at the data layer, not just the UI.
- Given Lea's personal note or homework synced / When Violet's device receives its sync payload / Then Lea's item is not present in any form Violet can access.

### Content

**FR-11 · Shared tasks · P0 · Confirmed (D-1)**
- Shared item = title + done state. No subject or school field. Create, edit, complete, delete by either user.
- Given Violet adds a shared task offline / When Lea syncs / Then she sees it with correct title and state.

**FR-12 · Personal notes · P0 · Confirmed (D-2)**
- Personal item = title + body, owned by the active identity. Create, edit, delete.
- Given Lea writes a note offline / When Violet syncs afterwards / Then the note is not on Violet's device.

**FR-13 · Due dates · P2 · Proposal (D-4) — NOT approved**
- Optional date on any item; overdue/due-soon visible. No push notifications in MVP.
- Note: homework without due dates is deliberate scope discipline (v0.3.0); D-4 may be reopened later without architectural impact.

**FR-15 · Personal homework · P0 · Confirmed (D-8)**
- Personal item = title + subject (from the owner's subject list) + done state. Create, edit, complete, delete.
- Given Lea adds homework offline / When she reopens the app / Then it is present and marked pending sync.
- Given Violet syncs fully / Then zero traces of Lea's homework exist on Violet's device.

**FR-16 · Personal subject list · P0 · Confirmed (D-8)**
- Each identity manages her own subject list, seeded with sensible defaults on first run; used only by her homework.
- Never visible to, shared with, or synced into the other user's space. No shared subject list exists anywhere in the product.

### Lifecycle

**FR-14 · Export & reset · P0 · Confirmed**
- Given Settings / When user taps export / Then a complete copy of that device's data is produced outside the app database.
- Given reset / When confirmed twice / Then all local data is erased. Server-side copies are governed by D-7.

## 6. Data ownership rules

| Data | Owner | Read | Write | Syncs to |
|---|---|---|---|---|
| Personal notes (Lea) | Lea | Lea only | Lea only | Lea's sync store only |
| Personal homework (Lea) | Lea | Lea only | Lea only | Lea's sync store only |
| Subject list (Lea) | Lea | Lea only | Lea only | Lea's sync store only |
| Same for Violet | Violet | Violet only | Violet only | Violet's sync store only |
| Shared tasks | Both jointly | Both | Both | Both sync stores |
| Profile (name, accent) | Owning user | Owning user | Owning user | Own sync store |
| Sync bookkeeping | Device-local | Device | Device | Never leaves device |

Rule: ownership is enforced at the data model, not by hiding UI. Every item belongs to exactly one space; space is immutable after creation. Subject lists and school config are strictly per-user — the two users' school data never mixes.

## 7. Navigation flows

- **F-1 First run:** Launch → identity screen (Lea / Violet) → Personal space (empty state) → normal app. No other path.
- **F-2 Steady state:** Fixed bottom nav: Personal · Shared · Settings. App bar carries sync-status chip (FR-08). Current space always visible.
- **F-3 Create item:** Compose button within active space → minimal fields (task: title; note: title+body; homework: title+subject) → Save → item appears instantly (local), marked pending.
- **F-4 Reconnect:** Offline chip visible → connectivity returns → auto-sync (FR-07) → chip → synced. Same-field conflict, if any (FR-09): one item-level resolution surface, then convergence.

## 8. Empty / loading / error states

| Surface | Empty | Loading | Error |
|---|---|---|---|
| Personal space | Friendly empty state + create CTA | Skeleton on first sync pull | Inline retry; cached content stays visible |
| Shared space | Explains what the shared space is for | Skeleton on first sync pull | Same |
| Sync | — | Chip: "Menyinkronkan…" | Chip: offline / retry; pending items never dropped |
| Conflict | — | — | Item-level banner, explicit choice, no auto-discard |
| Storage failure | — | — | Blocking dialog; export path offered before data risk |

## 9. Non-functional requirements

| ID | Priority | Requirement |
|---|---|---|
| NFR-01 | P0 | 100% of approved features function in airplane mode for ≥7 days of typical use. |
| NFR-02 | P0 | UI never blocks on network; sync is background. Cold app start < 2s on a low-end Android device. |
| NFR-03 | P0 | Privacy: one user's personal data is inaccessible to the other at the storage layer, not merely hidden in UI. |
| NFR-04 | P0 | Durability: no data loss on force-kill, crash, OS update, or battery pull. |
| NFR-05 | P1 | Convergence: after both devices sync with no new edits, contents are identical; repeated sync is a no-op (no duplicates). |
| NFR-06 | P1 | Indonesian UI throughout; no ads, no third-party tracking. |
| NFR-07 | P0 | Destructive actions (reset, delete shared tasks) require explicit confirmation; export offered beforehand. |

## 10. Explicit exclusions (out of scope for MVP)

1. Chat / messaging in the shared space.
2. Real-time collaborative editing (live cursors, typing indicators).
3. Any user beyond Lea and Violet; public accounts, signup.
4. Push notifications / reminder delivery (FR-13 is display-only even if approved later).
5. Attachments, photos, voice, file sharing.
6. Moving an item between personal and shared spaces after creation.
7. Web, iOS, desktop clients.
8. End-to-end encryption beyond the D-6 minimum.
9. Migration of v1.3 student-app data (v1.3 is replaced; text export/import of v1.3 is not carried into the new shell).
10. Fine-grained permissions/roles inside the shared space (users are symmetric).
11. Identity switching on one device (D-3: one profile per device).
12. Shared subject lists, shared timetables, or any cross-school feature — the users attend different schools, so school config is structurally per-user.

## 11. Decision log

| ID | Decision | Outcome |
|---|---|---|
| D-0 | Fate of existing v1.3 app | **Resolved:** replaced. Fresh two-user shell; v1.3 frozen, no data migration. |
| D-1 | Shared-space content type | **Resolved:** shared tasks (title + done state) only; school-agnostic, no subject field. |
| D-2 | Personal-space content type | **Resolved:** personal notes; expanded by D-8. |
| D-3 | Identity model | **Resolved:** one profile per device. |
| D-4 | Due dates in MVP | **Resolved:** out of MVP (FR-13 stays P2, unapproved). |
| D-5 | Conflict policy | **Resolved:** auto-merge non-overlapping edits; explicit user resolution for same-field conflicts; guaranteed convergence. |
| D-6 | Privacy baseline for sync transport | **Open — tech lead.** Constraint: TLS minimum (NFR-03); E2E personal spaces is a candidate upgrade. |
| D-7 | Sync backend class | **Open — tech lead.** Constraints: zero admin burden; must satisfy FR-07/09/10 and NFR-03/05. Product spec does not pick the technology. |
| D-8 | Personal school content | **Resolved:** personal spaces hold notes + own homework with own per-user subject list (FR-15, FR-16). |

## 12. Success criteria (acceptance for the MVP as a whole)

1. Airplane-mode test: with networking off, both users can complete full create/edit/complete/delete flows for tasks, notes, and homework; nothing is lost after 7 days.
2. Isolation test: after full bidirectional sync, Lea's device holds zero traces of Violet's notes, homework, or subject list and vice versa, verified at data layer.
3. Convergence test: any sequence of offline edits by both users ends with byte-identical shared tasks on both devices after sync, with no manual steps in the no-conflict case.
4. Durability test: force-kill at any point never loses an acknowledged save.
5. First-run test: a fresh install reaches a usable personal space in under 30 seconds with exactly two taps (identity + confirm).
6. School-separation test: a homework item referencing Lea's subject list can never appear on Violet's device, and no shared item ever carries a subject field.
