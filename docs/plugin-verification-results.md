# SiswaPro — Plugin Verification Results (Q7 EXECUTED)

| | |
|---|---|
| **Date** | 2026-10-21 · Branch `verify/q7-plugins` · Local path Termux (AGP 8.13.0, Gradle 8.14.3-bin, JDK openjdk, SDK 36) + GHA clean-checkout (`ubuntu-latest`, run 39999914951) |
| **Authorization** | PL approved Q7 execution 2026-10-21 ("yes"); protocol: `docs/plugin-verification-plan.md` §2; records: this file |
| **Legend** | ✅ = executed and observed pass · 🔎 = documentation-research fact · ⚠️ = not executed / limitation · commits: 48b0b56 (sqlite), 2f3a499 (secure-storage), 2a4fafa (network), 8bbe7dd (supabase vendor) |

## 1. Per-candidate results

| # | Candidate | Version (pin, exact) | npm install | cap sync | Termux assembleDebug | GHA clean-checkout assembleDebug | License 🔎 | Latest-at-check = pinned? 🔎 |
|---|---|---|---|---|---|---|---|---|
| 1 | `@capacitor-community/sqlite` | **8.1.1** (commit 48b0b56) | ✅ added 18 pk | ✅ registered | ✅ BUILD SUCCESSFUL 9m8s (native SQLCipher C/C++ sources compiled on-device) | ✅ run 39999914951 [ok] | **MIT** | ✅ latest = 8.1.1 at execution |
| 2 | `@aparajita/capacitor-secure-storage` | **8.0.1** (commit 2f3a499) | ✅ added 4 pk | ✅ registered | ✅ BUILD SUCCESSFUL 3m20s (157 tasks) | ✅ (same run) | **MIT** | ✅ latest = 8.0.1 |
| 3 | `@capacitor/network` | **8.0.1** (commit 2a4fafa) | ✅ added 1 pk | ✅ registered | ✅ BUILD SUCCESSFUL 1m41s (187 tasks) | ✅ (same run) | **MIT** | ✅ latest = 8.0.1 |
| 4 | `@supabase/supabase-js` (vendored, not installed) | **2.118.0** UMD, commit 8bbe7dd | — vendored static file: `www/vendor/supabase.umd.js` (self-contained dist/umd, 213KB) — no npm runtime dep | n/a (static asset) | ✅ asset builds into APK through copyWebAssets | ✅ (same run) | **MIT** | ✅ latest = 2.118.0, no `next` tag vendored |

**Vendored-file hash guard:**
`SHA-256(www/vendor/supabase.umd.js) = ee3be8de192b97cb1d73d1e95d6b82bb1f6b658c0f97c4ef757fc331996ed3d3`
(re-compute at vendoring-time checkouts; CI re-check = Phase 2 wiring item, NOT yet in workflow)

## 2. Acceptance criteria (plan §2)

| Criterion | Result |
|---|---|
| Version matches recorded pin | ✅ all four (see table; exact pins, no `^`) |
| Compile green BOTH paths | ✅ Termux local + GHA run 39999914951 both green |
| Smoke behavior (plan step 4) | ⚠️ **NOT RUN** — see §3 limitation L1 |
| No new Android permissions beyond INTERNET | ✅ sync registered plugins without manifest permission additions (no `uses-permission` delta observed in diff; manifest untouched by plugins at compile time). Runtime permission behavior: sqlite/secure-storage/network need none (storage = app-private, network = state API) |
| Bundle-size delta noted | ✅ APK: 3.9M → **13.1M** (+9.2M, attributable to SQLCipher/SQLite native libs; secure-storage + network negligible; supabase UMD + thêm 213KB inside assets from Phase 2 wiring onward) |
| Rollback path intact | ✅ one commit per candidate (48b0b56/2f3a499/2a4fafa/8bbe7dd) — `git revert` each independently |

## 3. Limitations (explicit)

- **L1 — Device/AVD smoke NOT RUN (plan §2 step 4):** plugins are compiled in and registered by Capacitor but the v1.3 web shell does not call them yet, so runtime smoke (kill-safety of sqlite loop, secure-storage preserve-through-kill, networkStatusChange firing) requires the Phase-2 app wiring or a throwaway harness page. Do NOT treat compile-green as behavior-green. These smoke checks remain mapped to TC-SC-01/TC-SC-02 and Phase 2 acceptance.
- **L2 — Termux env quirk (recorded):** `/usr/bin/env` does not exist on Termux → `cap` launcher symlinks fail via shebang; use `node node_modules/@capacitor/cli/bin/capacitor <cmd>` directly. No repo change needed.
- **L3 — Gradle wrapper network:** phone network aborted large `-all` distro downloads; wrapper switched to `-bin` + `networkTimeout=120000` (repo fix, commit aa4bfce). Local distro cache seeded manually via SHA-256-verified download outside the repo.
- **L4 — supabase-js:** vendored file not yet referenced by app code; hash-guard CI step pending Phase 2.

## 4. Verdict

- **All three native plugin candidates PASS the compile/dual-path acceptance.** Plan §1 recommendation-order stands: aparajita adopted as primary secure storage (capawesome alternative unnecessary).
- **Q7 status: EXECUTED and PASSED** at the compile level; behavior-level smoke deferred to Phase 2 per L1.
- ADR-1 (sqlite), ADR-6 (secure-storage), ADR-9 (network) permits are now backed by executed evidence (compile level).
