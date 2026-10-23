# SiswaPro — Round-2 Decision Table
Date: 2026-10-21 · Owner: Project Lead · Inputs: PL round-2 instructions (Q1c, Q2 comparison, Q3 option A/B, Q4 policy detail, Q6 encryption facts, Q7 dependency verification, Q8 migration note, micro-decisions 9–13).
Evidence keys: **[V]** verified this session against repo/registry/tarball/docs-local · **[R]** external documentation research, source + access date cited · **[U]** unknown — must verify before relevant gate.

## 1. Decision table

| ID | Question | Recommendation (this round) | Trade-offs | Status / open approval | Evidence |
|---|---|---|---|---|---|
| Q1a | Backend class | Supabase managed Postgres+RLS | None new vs ADR-2 | Approved by PL round-2 as recommendation | ADR-2; pricing/limits [R] supabase.com/pricing, accessed 2026-10-21 |
| Q1b | Billing tier | Free tier for dev/test ONLY; no upgrade, no paid resources without explicit PL approval; before production: verify current limits, backup/recovery options, realistic usage costs | Free pauses after 1 week idle; **Free tier backup posture must be confirmed before production** (auto-backups may be absent on Free — [U], verify at production gate) | Recommendation accepted as PLAN ("verify then decide" at production gate); no resources created | [R] pricing page (Free 500MB/2 projects; Pro $25/mo no pause; Team/backup tables), accessed 2026-10-21 |
| Q1c | Region | **ap-southeast-1 Singapore** — NO Indonesia region exists on Supabase (APAC options: Tokyo, Seoul, Singapore, Sydney, Mumbai); Singapore is nearest to Indonesia (~20–40ms typical) | Data resides in Singapore, incl. backups; Indonesian PDP law allows cross-border transfer under safeguards — residency is a Regional-PDP consideration, not a hard blocker for a private 2-user app, but it is a conscious choice (regional fidelity [R]) | PL asked "Indonesia?" 2026-10-21 → answered: impossible, Singapore recommended; **final confirm still open** (non-blocking until Phase 2 project creation); latency [U] until test project exists | [R] supabase.com/regions + docs/guides/platform/regions: 17 AWS regions; DB/Auth/Storage/backups stay in region; accessed 2026-10-21 |
| Q2 | Accounts | Individual accounts for Lea and Violet; **email+password with self-service email recovery** (see §2.2); bootstrap = PL creates accounts; PL NOT permanent reset intermediary | Password: single-credential loss recoverable by user email; Magic-link: no password to lose but every login needs an email round-trip (worse quick UX; both need SMTP — see §2.1) | **SIGNED 2026-10-21 (PL accepted recommendation): email+password.** Account creation still waits on region confirm (Q1c) | [R] Supabase auth-smtp / passwords / magic-link docs, accessed 2026-10-21 |
| Q3 | Privacy baseline | **Option A (RLS baseline, provider-readable, ADR-10 v0.2)** — recommended and now signed; Option B (E2EE) rejected for v1, may be revisited later as documented in §3 | B breaks server-side field merge for personal data; A means provider-readable plaintext | **SIGNED 2026-10-21 (PL: "recommend one" → Option A).** Gate closed | ADR-10 (v0.2), review C-5; analysis §3 below |
| Q4 | Retention | 90-day tombstones, policy details defined in §4 | Longer = recovery window; shorter = deletion privacy | **SIGNED 2026-10-21 (PL confirmed 90 days).** Gate closed | ADR-7; §4 below |
| Q5 | Edit-vs-delete | Principle APPROVED by PL: never silently discard; explicit resolution flow; tests for both choices + interrupted-recovery replay | Slight UX friction vs data safety | ADR-5/F4 + TC-CONV-03b/TC-CONV-04 v2 cover; retroactive copy pick pending | design v0.2 §5.3 (sets A/B); test-strategy v2 §7/§8 |
| Q6 | Device encryption | Safe baseline: content SQLite **unencrypted at rest in v1** (same envelope as v1.3), tokens Keystore-encrypted; SQLCipher path deferred; what-each-protects documented (§5) | Encrypted DB needs baked key-management + unrecoverable-on-reinstall risk | **SIGNED 2026-10-21 (PL: "ok").** Gate closed; SQLCipher = future option only | [V] plugin README facts (aparajita: Keystore AES/GCM, data deleted with app; web build unencrypted); sqlite plugin SQLCipher optional; backup/reinstall behavior [U] → §5 |
| Q7 | Dependencies | Verify-only scope per round-2: full compat/license/offline/maintenance checks in `plugin-verification-plan.md` protocol; supabase-js bundling question ANSWERED (§6): the vendored option that works WITHOUT a bundler is the published UMD bundle, or a small handcrafted client can be built; no unnecessary deps. No installation until PL gate | Executing plan adds 3 native plugins + 1 js client; thin client reduces supply chain but costs hand-rolled auth correctness | **GATE: install only on explicit PL authorization after the verify run** | [V] registry + tarball + README checks 2026-10-21; [U] compile/execution under Termux + AGP 8.13 |
| Q8 | Replacement | Fresh MVP; **v1.3 shell and its on-device data stay intact**; no deletion or data removal; per-spec exclusion 9, no automatic migration — the backup implications (defects #12) and "backup first" step per §7 | Zero-risk v1.3 coexistence; cost = old features (timer/schedule/grades) not available in the MVP shell | Architecture replacement plans PENDING-PL confirmation before any build/destructive action | product-req v2 §4; AUDIT #3/#8 |

**Micro-decisions applied:** 9 "Sinkron…" mandated (design v0.2 §3/§8 updated) · 10 UX subject-seed proposal open for PL (design v0.2 §2.3) · 11 `Example/` retained untouched until PL explicitly orders removal · 12 v2 docs committed as PROPOSED baseline 2026-10-21 (approved for commit by PL) · 13 planning docs committed 2026-10-21 (PL approval).

**Sign-off log (2026-10-21, PL round-2 replies):** Q3 = Option A ✅ signed · Q2 = email+password ✅ signed · Q4 = 90 days ✅ signed · Q6 = baseline ✅ signed · Q1c = pending final confirm (Singapore; no Indonesia region possible) · Q5 copy-set A/B = still open (non-blocking) · Q7 install authorization = still open · Q8 replacement plan = pre-approved per spec exclusion 9, final order later.

## 2. Q2 — Password vs magic-link comparison (evidence-based)

### 2.1 The email constraint is shared (decisive fact)
Supabase Auth sends signup confirmation, password reset, magic links, and OTPs **over email** ([R] supabase.com/docs/guides/auth/passwords, /guides/auth/auth-magic-link, /guides/auth/auth-smtp; accessed 2026-10-21). Default Supabase-hosted email service restrictions:
- Delivers ONLY to addresses that are members of the project's organization ("team"); others fail ("Email address not authorized").
- Rate limit 2 messages/hour, best-effort, explicitly "not intended for production".
- Custom SMTP (needed for production-grade delivery) requires an external email service + credentials (SMTP host/port/user/pass) = a credential surface in the project settings, not the repo (C8 safe).

**Consequence:** for exactly two named users whose emails are added as project-team members, the DEFAULT email service is usable for recovery/reset flows in dev without extra infra (2 mails/hour is fine for 2 people); production email needs custom SMTP either way.

### 2.2 Comparison
| Aspect | Email+password | Magic link / OTP |
|---|---|---|
| Login UX | Username/password each rebind; session persists via Keystore-encrypted refresh token (ADR-6) after first login | Email round-trip each fresh session (fine: rare after first bind) |
| Recovery | Self-service email reset flow exists (`resetPasswordForEmail`) — no PL intermediary needed [#PL requirement honored] | Inherently no-password recovery (PL-less too) |
| Email dependency | Needs email service for signup confirm + reset | Needs email for EVERY login |
| Operational burden | Lowest once set up (reset = user does it via mail; PL re-issuance only if mailbox lost) | Debated lower overall; but requires working email deliverability always |
| Risk | Password entry breached / forgotten | Link interception / mailbox loss == account loss; phishing-typical |
| MVP complexity | Smallest UI surface: password field + reset link screen | Similar OTP input UI; both blocked pending Q3 |

**Recommendation:** email+password, self-serve reset; magic-link identical infra and can be enabled later as an additive option without architectural impact (auth is provider-side).

## 3. Q3 — Option A vs Option B (NOT finalized)

| | **Option A — RLS baseline (current architecture)** | **Option B — E2EE of personal spaces** |
|---|---|---|
| What it guarantees | Other user CANNOT access personal data (DB enforced, test-verified); provider CAN read server-side plaintext (TLS 1.2+ in transit) | The server (and provider, incl. backups) cannot read personal-space content; provider sees ciphertext; RLS still needed for membership/authorization of shared space |
| Data-layer isolation test | TC-SC-02 as designed | Same test, plus crypto verification; **must NOT claim E2EE until implemented AND verified by evidence** |
| Conflict mechanics | Full per-field server merge (FR-09) for all entities | Per-field server merge IMPOSSIBLE on encrypted personal bodies → personal-space same-field conflicts need device-to-device key negotiation or degrade to user resolution; shared space unaffected |
| Key recovery | None needed | Lost key = personal data unreadable; recovery = secondary passphrase / multi-device key sync / server-backed key escrow (each is privacy reintroducing trust) — significant extra design |
| Device/reinstall | Rebind → pull own spaces (F11 trivial) | Reinstall needs key re-provisioning (identity + key recovery) — F11 becomes a designed flow with recovery-phrase UI |
| Complexity/schedule | Current scope | Effectively Phase-5-scale addition now; MVP time line +1 phase at least |
| Privacy posture honesty | Must copy "stored with a hosted service"; never imply E2EE (ADR-10 addition enforces) | True "nobody can read" claim possible ONLY after implemented + evidenced |

**Status:** both options documented; PL owns the pick (arch §15 Q3). Option B is feasible but is a real product/schedule change, not a config flag.

## 4. Q4 — Retention policy details (pending PL sign-off)

- **What is retained:** soft-deleted rows (`deleted_at` set) remain in server content tables and the change feed for the **retention window (90 days from deletion by default)**, then hard-GC'd.
- **Who can act:** deletion applies to the item live-isolated; OPT-out restoration during the window is NOT a user-facing feature in v1 (no undelete API); a technical restore is possible only via Project Lead action (provider dashboard/SQL + verified consent), because the tombstone would need reversion server-side.
- **When permanent:** GC pass deletes rows (and the corresponding feed entries stay as consumed markers only); after GC, content is not recoverable from the service — only from the standard provider backups (presence depends on tier Q1b) or device exports (FR-14).
- **Sensitive-content stance:** per PL instruction "do not retain sensitive content unnecessarily," a shorter window (e.g. 30d) is acceptable if PL prefers privacy over recovery margin; decision tied to Q4 sign-off.

## 5. Q6 — Encryption facts (verified) + safe baseline recommendation

**What actually encrypts (research/verified):**
- `@aparajita/capacitor-secure-storage` [V — README main branch, accessed 2026-10-21]: Android: AES-GCM with secret key generated by **Android Keystore**; ciphertext persisted in app-specific SharedPreferences; **data is deleted with the app**. iOS: system Keychain (not wiped on app deletion — Apple-side behavior; irrelevant to Android-only MVP). **Web build is UNENCRYPTED localStorage — dev-only; NEVER used for production.**
- `@capacitor-community/sqlite` [V — README, accessed 2026-10-21]: SQLCipher available as OPTIONAL AES-256 DB encryption (`androidIsEncryption`, `setEncryptionSecret`); default DB is **plaintext**; SQLCipher is bundled even when unencrypted by default (export-classification footnote).
- **Auth project data-suppression:** Android Keystore keys are **non-exportable and never backed up**, and several Keystore keys invalidate on backup-restore or factory-reset; device backup (Auto Backup) of the *ciphertext* alone is undecryptable on a new device without the Keystore key.
- Backup/reinstall behavior of the encrypted-store plugin file: [U] — whether `SharedPreferences` ciphertext is included by Auto Backup, and its interaction with Keystore invalidation on restore, must be verified against the plugin + Android docs at Phase 2 (before any reliance). Reinstall: Keystore-protected values are effectively lost → device rebind/REAUTH handles it by design (F11).

**Distinction:** encryption-at-rest = protects the DB / storage files from device-side access; **courtesy-token protection** = refresh tokens live in Keystore-encrypted storage (ADR-6) — that alone does NOT encrypt the SQLite content.

**Recommended safe baseline for PL description:** content DB unencrypted at rest v1 (same risk envelope as today's v1.3 localStorage) + tokens via Keystore-backed secure storage + TLS in transit + RLS at the provider; SQLCipher upgrade deferred and researched only if PL later signs an at-rest encryption requirement.

## 6. Q7 — Paul: supabase-js bundling reliability [verified today]

- Package `@supabase/supabase-js` **2.118.0**: `dependencies` = 5 first-party `@supabase/*` packages + `@opentelemetry/api` peer ([V] registry.npmjs.org, accessed 2026-10-21).
- Tarball inspected ([V]]: `dist/index.mjs` (37.9 KB) **imports the 5 sub-packages** — NOT self-contained. Bundling-ESM would mean vendoring that entire transitive graph by hand ≈ unnecessarily fragile (no bundler constraint).
- **The published `dist/umd/supabase.js` (213 KB) is self-contained** (IIFE exposes global `supabase`; verified by inspection) → vendorable as one static file + `<script>` include, hash-guarded (SHA-256 recorded at vendoring per plan §1.5).
- **Zero-dependency alternative:** a thin handcrafted client (fetch + `/auth/v1` + `/rest/v1` + feed endpoints) can fully displace supabase-js (protocol matches arch §6.4); costs = implementing PKCE/session-refresh must be done correctly and RFC-verified ([U] until implemented).
- **Recommendation for PL:** vendored UMD supabase-js for Phase 2 (dependencies and security provided) with a thin-client refactor later optional — OR thin client immediately for minimum deps. Either way: **no install until PL gate**, per the round-2 rule.

## 7. Q8 — Replacement migration/backup implications (documented, not executed)

1. **Today:** the v1.3 app and all on-device data (localStorage `sp_state` + IndexedDB) remain **untouched**; nothing is removed, reset or migrated; v1.3 remains releasable and remains the installed app until the MVP replaces it at Phase 1.
2. **Backup implication:** because the MVP is a fresh shell, the only carry-over path if ever desired is **v1.3's existing text export** (`Eksport ke Teks` in Settings) — the MVP will NOT include an importer for it (spec exclusion 9). If Lea/Violet want a keepsake copy of old PR/jadwal/fokus data, the practical step is: on the v1.3 app, run Export and save the text file (out-of-app, done by users, not by the PL) — before the MVP app is installed replaces the old app in place.
3. **No destructive action is scheduled:** app uninstall/reset/data wipes happen at the users' manual discretion, after the MVP is confirmed usable; the Project Lead signs any repository-level removal of `www/`+ legacy artifacts only at the planned destructive-action gate (Q8/planned).
4. **README/repo hygiene:** old v1.3 sources remain in git; retrieval = checkout history, no separate backup needed; per AUDIT #1-3, the drift fix should be immediately prior to any history-affecting change, Phases stay separated per round-2 rule.

## 8. Remaining open approvals (door for next gates)

| Gate | Approvals outstanding |
|---|---|
| Phase 0 (repo hygiene only, no MVP code) | green-light from PL (tool plan ready: commit-drift checklist, aapt2 fix, version strings; `Example/` untouched per decision 11; commit execution only after PL reviews diff per decision 13) |
| Plugin verification (Q7) | PL sign-off to execute the verify protocol |
| Q3/Option A-or-B + Q6 baseline | PL only; blocks Phase 2+ |
| Q2 final account flavor | PL (after Q3) |
| Region (Q1c) + production billing (Q1b) | PL at test vs production gates |
| Copy set A/B (Q5) | PL pick (non-blocking until Phase 3) |

**Status: verification round COMPLETE — evidence as cited above. Nothing installed, nothing created, nothing deleted, no credentials exercised, no MVP code written. Awaiting the next PL gate.**
