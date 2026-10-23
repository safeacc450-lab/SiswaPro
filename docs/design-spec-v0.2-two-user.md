# SiswaPro — Design Spec v0.2 (Two-User MVP Shell)

| | |
|---|---|
| **Version** | 0.2 DRAFT |
| **Date** | 2026-10-21 |
| **Status** | DRAFT — pending PL approval. Documentation only; no production files touched. |
| **Supersedes** | `docs/design-spec.md` v0.1 §2–§4, §6–§10 **for the new MVP shell** (v0.1 remains the valid v1.3 student-app UI reference) |
| **Reuses by reference** | design-spec.md v0.1 **§1 Design Tokens** and **§5 Accessibility Checks** — carried forward unchanged, not copied here |
| **Traceability** | `docs/spec/product-spec-v0.3.0.md` (FR-01…16, NFR-01…07, US-01…11, flows F-1…F-4, §8 states table, §10 exclusions) · `docs/architecture-v0.1.md` §9 (SyncEngine state machine), §7 (conflict flow), §13 F4, ADR-9 |
| **Fix targets** | review-report-2026-10-21: **C-2** (§1), **C-8** (§3), **C-7** (§5) |

Section ↔ spec anchors:

| Design section | Anchors |
|---|---|
| §1 Navigation & identity | FR-01, FR-04, F-1, F-2 |
| §2 Screens | FR-02, FR-03, FR-11, FR-12, FR-14, FR-15, FR-16, F-3, spec §8 |
| §3 Sync chip | FR-07, FR-08, NFR-02, arch §9, ADR-9 |
| §4 Pending & offline | FR-05, FR-06, D-5 mechanics, NFR-07 |
| §5 Conflicts & copy | FR-09, D-5, arch §7/§13-F4, spec §8, NFR-07, **Q5 PENDING-PL** |
| §6 Accessibility | NFR-06 + design-spec.md §5 carry-over |
| §7 Checklist | spec §12 + v0.1 §9 adapted |

## 0. What changed from v0.1

- 5-tab v1.3 nav (Beranda/Tugas/Jadwal/Fokus/Rapor) and hash routing are **gone** — the new shell is 3-slot space navigation (FR-04, F-2). Timer, 7-day chart, schedule, grade calculator do not exist in the new MVP (D-0, D-2/D-8 content set).
- v0.1 §4 SyncBadge's 4 generic states → full arch §9 state map (§3 here). This resolves C-8.
- Conflict resolution surfaces + Indonesian copy added (C-7); v0.1 had none because shared spaces were undefined there — those blockers are resolved by the confirmed spec.
- v0.1 §1 tokens and §5 accessibility apply unchanged by reference.
- **Privacy copy rule (never weakened, FR-10/NFR-03):** UI may state the confirmed guarantee — personal content is *never transmitted to, stored in, or retrievable from the other user's personal space, at the data layer, not just the UI* (FR-10 verbatim intent). UI copy must **not** overstate (no claims of server-operator invisibility or E2E — that is arch ADR-10/Q3 territory, still open) and must not weaken the FR-10 statement.

---

## 1. Navigation (fixes C-2)

### 1.1 First run — identity screen (FR-01, F-1)

Launched with no stored identity → a full-screen identity state. Copy (id-ID):

- Title: **"Siapa kamu?"**
- Subtitle: **"Profil ini akan terikat ke perangkat ini dan tidak bisa diganti."**

Exactly two option cards, and **nothing else is on the screen**: no bottom nav, no app bar chip, no links, no skip path. Focus is trapped here until a choice is made.

1. **Lea** (card)
2. **Violet** (card)

Tap 1 selects, tap 2 confirms (spec §12.5: "identity + confirm" = two taps). Confirm sheet: **"Lanjut sebagai {nama}?"** — body **"Pilihan ini terikat ke perangkat ini. Identitas tidak dapat diganti di dalam aplikasi."** — buttons `Batal` / `Lanjut`.

After confirm: subject list seeded per identity (FR-16; see §2.3) → **Personal empty state** → normal app. No other path (F-1). Background auth runs after the local shell is usable; the identity screen never waits on network.

Identity never reappears while a bound identity exists (FR-01). Reinstall / clear-data restarts the device state, so the screen returns — that is device re-binding, never an in-app identity switch (exclusion 11, D-3).

### 1.2 Steady state (F-2, FR-04)

- Persistent bottom nav, exactly three slots, labels verbatim from spec F-2: **Personal · Shared · Settings**.
- Active space is identifiable **twice, without scrolling** (FR-04):
  1. nav item active state + `aria-current="page"`,
  2. app bar shows space name + bound identity name (e.g. "Personal — Lea").
- Space identity tint: Personal → `--personal` (accent-derived), Shared → `--shared` (fixed teal, v0.1 §1 token). Applied to app-bar underline and active nav icon.
- **No deep routes.** Sheets/modals only: create/edit, subject manager, destructive confirms, conflict surface, re-login, needs-update, storage-failure dialog. Hardware back closes the topmost sheet; otherwise standard Android exit. (v0.1 hash-routing acceptance is dropped with v1.3.)
- App bar carries the sync chip on all three screens (FR-08). *(Note for reviewers: this spec keeps the English slot names because spec F-2 fixes them; rendering "Pribadi/Bersama/Pengaturan" instead is a proposal awaiting PL confirmation.)*

### 2. Screens

### 2.1 Personal (FR-02, FR-12, FR-15)

One tab, two stacked sections, each with a 44px header add-button (proposal — replaces a FAB + type-picker sheet; simplest pattern for two content types):

- **Catatan** (`+ Catatan`): rows = title + one-line body preview. No done state (FR-12).
- **PR** (`+ PR`): rows = title + subject chip + done checkbox (`--success`). Homework subject comes **only from the owner's subject list** (FR-16) — never rendered from, seeded to, or synced into the other identity's list.

Create/edit flows are F-3 minimal fields:

| Type | Fields |
|---|---|
| Catatan | Judul (required) · Isi (textarea) |
| PR | Judul (required) · Mata pelajaran (required, select from owner's list) |
| Shared task (§2.2) | Judul (required) |

- PR form with an empty subject list → inline notice **"Tambahkan mata pelajaran dulu."** + button opening the subject manager (see §2.3; FR-16 seeds defaults so this is a rare state).
- Save → item appears instantly (local), marked pending when offline (F-3, FR-05).
- Delete note/homework: confirm dialog (NFR-07 mandates confirmation for reset + shared-task deletion only; extending it to personal deletes is a *proposal* for consistency).

Empty (spec §8): **"Belum ada apa-apa di sini."** + privacy line per FR-10 (kept strong): **"Catatan dan PR-mu bersifat pribadi — walau perangkat lain sudah selesai sinkron, isinya tidak pernah muncul di sana."** + CTA button.
Loading: skeleton rows on first sync pull (spec §8). Error: inline retry banner, **cached content stays visible** (spec §8). Offline: no special state — every action works (FR-05); rows get the pending affordance (§4).

### 2.2 Shared (FR-11, FR-03, D-1)

- List of shared tasks: **title + done checkbox only** (FR-11). No subject/school field anywhere. No author labels, no role affordances — rows are identical for both identities (exclusion 10, arch §7 "no who-wrote-what scoreboard").
- `+ Tugas` header button → sheet with **Judul** only (F-3). Edit reuses the sheet (Judul + done toggle). Complete via row checkbox.
- Delete: per-row action → confirm dialog naming the consequence (NFR-07) + tertiary **"Ekspor data dulu"** link (proposal on link placement; NFR-07 "export offered beforehand" is the requirement).
- Empty (spec §8 — shared empty explains purpose): **"Tempat tugas yang kalian atur bersama. Siapa pun bisa menambah, mencentang, atau menghapus — tanpa hak istimewa."** + CTA **"Tambah tugas pertama."**
- Loading/error same pattern as Personal (§2.1).

### 2.3 Settings (FR-14, FR-16, FR-08 detail)

Single scrollable screen, four sections, no sub-routes:

1. **Profil** — bound identity name shown, display name editable (*proposal*); accent picker with check-ring selection, not color-only (design-spec §5.8; palette per v0.1 §1 `--accent` picks).
2. **Mata pelajaran** (FR-16) — owner's list only: add / rename / delete. Seeded once at first run with sensible defaults (exact seeds = *proposal*, e.g. six common Indonesian school subjects; seeds are editable defaults, not a shared list). Delete of a subject still used by homework is blocked with inline error **"Masih ada PR yang memakai mata pelajaran ini."** (*proposal* — prevents dangling homework subjects).
3. **Data** —
   - **Ekspor** (FR-14): complete device copy produced outside the app DB (schema-stamped). Warning copy: **"Berkas memuat semua data di perangkat ini, termasuk catatan pribadi. Simpan dengan aman."**
   - **Hapus semua data** (FR-14 + NFR-07, destructive double-confirm per F-NFR-07): Dialog 1 names consequences + data reminder + primary offer **"Ekspor dulu"** before continuing. Dialog 2 final confirm: **"Semua data di perangkat ini akan hilang dan tidak bisa dikembalikan."** — destructive button the only path. Two confirmations + export-first are requirements; dialog copy details are *proposals*.
   - **Storage failure** (spec §8 — blocking; export offered before data risk): scrim dialog, no backdrop-tap close.
     Title: **"Penyimpanan bermasalah"**
     Body: **"Aplikasi tidak bisa menyimpan data ke memori perangkat. Perubahan baru belum tersimpan dengan aman. Ekspor salinan data sekarang sebelum melanjutkan."**
     Primary **"Ekspor data"**; secondary **"Tutup"** (closing shows a persistent inline banner until the next successful write — *proposal* on the fallback behavior; blocking + export-first is the mandated part).
4. **Sinkronisasi** (FR-08 detail) — engine state in plain words, last successful sync time, count of pending changes, count of unresolved conflicts + **"Tinjau konflik"** (opens §5 surface), manual **"Sinkron sekarang"** action (*proposal* — ADR-9 already allows manual kicks; the button makes it discoverable). REAUTH/NEEDS-UPDATE surfaces anchor here (§5.4).

---

## 3. Sync status chip — full arch §9 state map (fixes C-8)

Chip = dot + label + optional count badge, pinned to the app bar on every screen. It maps **every** architecture §9 state — v0.1's 4 generic states are replaced.

| Engine state (arch §9) | Chip label | Dot color | Chip badge | Tap behavior |
|---|---|---|---|---|
| BOOT | "Sinkron…" | neutral `--ink-3` | — | none (sub-second transient) *proposal* |
| AUTHENTICATING | "Sinkron…" | accent | — | none |
| SYNCING | "Sinkron…" | accent, pulsing (opacity-only) | — | opens Settings → Sinkronisasi detail |
| IDLE | "Tersimpan" | `--success` | — | opens sync detail |
| OFFLINE | "Lokal" | `--warn` | pending count *n* | manual sync retry (ADR-9 manual kick) + opens sync detail |
| RETRY-WAIT | "Menunggu" | `--warn` | pending count *n* | manual retry + opens sync detail |
| REAUTH | "Masuk kembali" | `--danger` | — | opens re-login sheet (§5.4) |
| NEEDS-UPDATE | "Perbarui aplikasi" | `--danger` | — | opens update dialog (§5.4) |
| CONFLICT-PENDING | base-state label kept | `--danger` | conflict count | opens conflict review surface (§5) |

Notes:

- **Mandated labels** are the ones above: OFFLINE → "Lokal", SYNCING → "Sinkron…", IDLE → "Tersimpan", REAUTH → "Masuk kembali", NEEDS-UPDATE → "Perbarui aplikasi", CONFLICT-PENDING → badge + count. (Spec §8 row "Sync" shows the example word "Menyinkronkan…" — v0.2 uses the shorter "Sinkron…" per this mapping; flagging the wording mismatch for the PL. *proposal* to keep "Sinkron…".)
- **CONFLICT-PENDING is an overlay condition, not a blocking state** (arch §9): non-conflicted rows keep syncing, so the chip keeps its base-state label while the badge shows the conflict count and the dot turns `--danger`. Stacked-state precedence: conflict badge > NEEDS-UPDATE > REAUTH > OFFLINE/RETRY-WAIT > SYNCING > IDLE (*proposal* — the only deterministic tiebreak; arch does not fix one).
- FR-08's minimum trio is covered: Lokal *(!n)* / Menunggu *(!n)* / Tersimpan. The arrow states (REAUTH, NEEDS-UPDATE) surface the engine's truth instead of hiding it.
- Label + badge text carry the meaning (never color-only — design-spec §5.4).
- Chip region is `aria-live="polite"`; label transitions are announced ("Sinkron…" → "Tersimpan").
- **≤2 s rule (carried from v0.1 §9):** any chip-visible state change — connectivity or engine state — is rendered within 2 seconds.

---

## 4. Pending-sync affordance & offline behavior (FR-05, FR-08)

- Any item created or edited while offline carries a compact `--warn` badge on its row: **"Menunggu sinkron"** (aria-label "belum terkirim"). It persists from local save until the op lands — FR-08's acceptance ("shows pending until the change is uploaded").
- The chip badge (§3) and Settings sync-detail count read the same outbox source.
- **Toasts suppressed while offline** (v0.1 carry-over): success/neutral toasts are suppressed while the chip is "Lokal"/"Menunggu" — the pending affordance already signals the save. Destructive confirms and error surfaces (storage failure, conflicts) are not toasts and remain visible.
- Offline deletes: row disappears immediately (tombstone + outbox pending; arch ADR-7). If the peer later conflicts, §5.3 applies — no silent drop.

---

## 5. Conflict resolution surface (fixes C-7; FR-09, D-5; arch §7)

Item-level. **Never auto-picks** (D-5). Both variants visible simultaneously, choose + confirm. All copy in Bahasa Indonesia (NFR-06).

### 5.1 Conflict banner (entry point; aria-live polite)

In the affected space list and in Settings sync detail:

> **"Ada {n} tugas dengan perubahan bentrok. Ketuk untuk memilih versi final."**
> "Tugas lain tetap tersinkron normal." *(non-blocking, arch §9)*

### 5.2 Same-field conflict on a shared task

Mechanically, fields changed on only one side are auto-merged without appearing here (arch §7 classification); the surface lists **only fields both sides touched** — per-field for `Judul` and `Status` (FR-11's field set), independently selectable.

Surface: "Selesaikan konflik" —
sub: **"Tugas ini diubah dari dua perangkat saat offline. Pilih isi final untuk tiap kolom bertabrakan."**

Per conflicting field, a `role="radiogroup"` of two variant cards, stacked (phone-first; side-by-side cards on ≥600px):

| Variant label | Meaning |
|---|---|
| **"Di perangkat ini"** | the user's edit |
| **"Dari perangkat lain"** | the incoming variant |

Labels stay device-level, never person-level (arch §7: attribution is for classification only). `Judul` variants show the two title strings; `Status` variants show **"Selesai"** vs **"Belum selesai"**.

- Primary **"Simpan pilihan"** — disabled until every conflicted field is chosen; helper line while unresolved: "Pilih dulu semua kolom yang bertabrakan."
- Ghost **"Nanti"** — leaves it unresolved; item stays flagged, chip badge remains. No timeout, no auto-resolution.
- Confirm footer (FR-09 convergence promise): **"Setelah disimpan, kedua perangkat akan menampilkan isi yang sama persis."**

### 5.3 Edit-vs-delete conflict (separate case; arch §13 F4) — **PENDING-PL per Q5**

Q5 asks the PL to pick the deletion verdict. **Both alternative copy sets are drafted; neither ships until the PL chooses.** In both sets the whole item conflicts (the incoming side deleted it while this device edited offline), and the branch that discards the user's edit additionally requires the confirm press — explicit consent is what makes a discard lawful under D-5.

**Copy set A (framing: keep-my-edit):**

> Title: **"Tugas sudah dihapus di perangkat lain, tetapi ada perubahanmu di sini"**
> Body: "Saat kamu offline, tugas ini dihapus dari perangkat lain. Perubahanmu berikut masih tersimpan di perangkat ini:"
> *(user's edited variant quoted)*
> Options —
> 1. **"Pertahankan perubahanmu"** — "Tugas kembali muncul di kedua perangkat dengan isi perubahanmu."
> 2. **"Ikuti penghapusan"** — "Tugas tetap terhapus dan perubahanmu ikut dibuang."

**Copy set B (framing: deletion-wins):**

> Title: **"Tugas ini telah dihapus di perangkat lain"**
> Body: "Saat kamu offline, tugas ini dihapus dari perangkat lain. Perubahanmu di perangkat ini belum sempat terkirim. Penghapusan akan diterapkan ke kedua perangkat."
> Options —
> 1. **"Teruskan penghapusan"** — "Tugas hilang permanen; perubahanmu tidak dipakai."
> 2. **"Simpan dengan isi perubahanmu"** — "Tugas dipulihkan di kedua perangkat."

Either set ends with a **"Konfirmasi"** button after the radio choice.

### 5.4 System dialog copy (mandated by arch §9 states)

**Needs-update (NEEDS-UPDATE, schema gate — arch ADR-8, failure F7):**
> Title: **"Perbarui aplikasi"**
> Body: "Versi aplikasi ini tidak cocok dengan format data terbaru. Sinkronisasi dijeda agar data tidak rusak. Data di perangkatmu tetap aman dan bisa dipakai seperti biasa."
> Primary **"Perbarui sekarang"**; ghost **"Nanti"** (chip stays "Perbarui aplikasi").

**Re-auth prompt (REAUTH — arch §9, failure F6):**
> Title: **"Masuk kembali"**
> Body: "Sesi loginmu berakhir. Data di perangkatmu tetap aman dan tetap bisa dipakai offline."
> Primary **"Masuk"**; ghost **"Nanti"**.

(The login form's shape — password vs magic link — waits on arch Q2/ADR-3; the UI reserves this sheet, fields to be spec'd by the architect later. **open**)

### 5.5 Surface behavior rules

- No auto-pick, no preselection, no timers (D-5; explicit choice always).
- Enters as a full-screen sheet; focus moves to the heading (design-spec §5.6 carry-over).
- 44px option cards; keyboard- and screen-reader-accessible radiogroups; banner `aria-live="polite"`.

---

## 6. Accessibility (carry-over + new-shell specifics)

design-spec.md **§5 is the launch gate**, applies wholesale. New-shell additions/carry-overs:

1. Focus-ring token visible in **both themes** (v0.1 §1).
2. Touch targets ≥ 44×44px: nav slots, header add-buttons, checkboxes, chips, conflict variant cards, dialog buttons.
3. `aria-live="polite"` on: conflict banners, conflict-surface state, **chip label transitions**. *(Timer announcements dropped — no timer exists in this shell; sync-state checks stay.)*
4. Emoji aria rules (§5.4): functional emoji get `aria-label`; decorative ones `aria-hidden`.
5. `prefers-reduced-motion: reduce` → all transform animations removed, **including the conflict surface and chip-badge entrances** — transitions become opacity-only (extends v0.1 §1 Motion).
6. Identity screen: focus trapped; the two identity cards are the only tab stops until a choice is made.
7. Min font 12px, `aria-current="page"` on active nav, dark/light parity per §5 unchanged.

---

## 7. UI acceptance checklist (adapted from v0.1 §9)

Dropped as v1.3-only: hash-routing back-exit, 5-tab nav items, Fokus chart. Mandated additions last three.

- [ ] Zero decorative glows/floating on reading surfaces; token-driven shadows only (v0.1 §9).
- [ ] All text passes WCAG AA in both themes (design-spec §1 token pairs).
- [ ] Every tap target ≥ 44px; keyboard focusable in DOM order; focus ring visible in dark (v0.1 §5).
- [ ] 4pt spacing scale — no pixel one-offs.
- [ ] Dark/light toggle instant; no flash of wrong theme at startup.
- [ ] Reduced-motion removes all transform animations, incl. conflict surface (§6.5).
- [ ] Empty, loading, error, offline states spec'd and implemented for every screen (spec §8 table).
- [ ] Accent picker shows check-ring; no color-only selection (§5.8).
- [ ] Personal space renders zero items from the other user — even after the other device synced fully — matching the data-layer rule (FR-02, FR-10).
- [ ] There is no path to the other space: no switch, no cross-space link; identity screen never reappears while bound (FR-01; exclusion 11).
- [ ] Offline-created/edited items show the pending affordance until their op lands (FR-05, FR-08).
- [ ] Success/neutral toasts suppressed while offline; nothing else fakes a network sense of success.
- [ ] Storage-failure blocking dialog offers export before any data action (spec §8).
- [ ] Reset requires double confirmation with export offered before the destructive step (FR-14, NFR-07).
- [ ] **Identity screen blocks all other navigation until a choice is made (FR-01).**
- [ ] **Conflict surface never auto-resolves — no preselection, no timeout, no silent discard (D-5).**
- [ ] **Sync chip reflects any state change within ≤ 2 s (v0.1 §9, widened from connectivity-only to all engine states).**

---

## 8. Open items (not decided in this doc)

| # | Item | Owner / status |
|---|---|---|
| 1 | Edit-vs-delete copy set A vs B (§5.3) — both drafted, **PENDING-PL per arch Q5** | PL |
| 2 | Chip wording — **RESOLVED by PL 2026-10-21: "Sinkron…" mandated** (round-2 decision); chip stacking precedence stays as §3 proposal | resolved / PL confirm |
| 3 | Subject-list seed content per identity (schools differ; proposal drafted §2.3) | PL |
| 4 | REAUTH login form fields (password vs magic link) | architect (Q2/ADR-3) |
| 5 | "Perbarui sekarang" target (store vs APK URL) | tech lead (D-7 consequence) |
| 6 | Display-name editable vs fixed at bind (§2.3.1) | PL confirm |
| 7 | Delete-subject blocking rule (§2.3.2) | PL confirm |
