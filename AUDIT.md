# SiswaPro Repository Audit — Discovery Report

Date: 2026-10-21. Scope: read-only discovery only. No code was changed by this audit.

## Repository tree (verified)

```
SiswaPro/                        (git repo, 3 commits: "Build SiswaPro Android app",
                                  "Fix Android SDK setup", "Configure Android SDK packages")
├── package.json                 Capacitor 8.5.3 core/android/cli; scripts.build = no-op console.log
├── package-lock.json            (UNTRACKED)
├── capacitor.config.json        appId com.siswapro.app, name SiswaPro, webDir "www"
├── www/                        Web app ENTRY POINT: index.html (10.1K), app.css (15K), app.js (22.5K)
│                               — app.css / app.js are UNTRACKED in git
├── Example/                     UNTRACKED, unrelated: "Rerezz Official | Portfolio" web page
├── .github/workflows/build-apk.yml
├── .opencode/                   opencode plugin only (@opencode-ai/plugin 1.19.3)
├── android/                     Capacitor Android project
│   ├── build.gradle             AGP 8.13.0, google-services 4.4.4 classpath (unused; no google-services.json)
│   ├── capacitor.settings.gradle  MODIFIED: projectDir → ../node_modules (was ../../node_modules)
│   ├── gradle.properties        MODIFIED: android.aapt2FromMavenOverride=/data/data/com.termux/files/usr/bin/aapt2
│   ├── local.properties         UNTRACKED (correct), sdk.dir=/data/data/com.termux/files/home/android-sdk
│   ├── variables.gradle         minSdk 24 / compileSdk + targetSdk 36
│   ├── gradle-wrapper → 8.14.3-all
│   └── app/
│       ├── build.gradle         MODIFIED: `copyWebAssets` Copy task injected; versionCode 4, versionName "1.3"
│       ├── capacitor.build.gradle  Java 21
│       └── src/main/
│           └── ...  MainActivity (empty BridgeActivity), manifest (INTERNET, FileProvider, single task),
│                     only template tests present
└── android/app/src/main/assets/
    ├── capacitor.config.json, capacitor.plugins.json ( [] — zero Capacitor plugins )
    └── public/                  copied web assets + empty cordova.js / cordova_plugins.js
```

## Application entry points / UI modules (verified from code)

- **Android entry**: `android/app/src/main/java/com/siswapro/app/MainActivity.java` — bare
  `BridgeActivity`. Launcher activity `.MainActivity`, `launchMode="singleTask"`.
- **UI**: single-page app with 6 views (`home/pr/jadwal/fokus/nilai/set`) in `www/index.html`;
  5 bottom-nav tabs plus a gear button for Settings.
- **Features implemented in `www/app.js` (482 lines):**
  - Onboarding (name + theme color pick)
  - Home dashboard: day timeline with live status (done / in progress with progress bar / upcoming),
    stats (active tasks, today's classes, today's focus minutes), daily quote
  - Task list: add / toggle / delete / 4 filters / progress bar per subject + due dates
  - Weekly schedule: per-day view, add with collision warning, delete
  - Focus timer: 10/25/50 min presets, conic-gradient ring, beep + vibrate on finish,
    session history (capped at 30 days), 7-day bar chart, streak calculation
  - Grade calculator: weights Tugas 25% / UTS 35% / UAS 40%, predicate grade ring
  - Settings: name, 4 accent themes, dark mode, subject manager (add/delete with usage count),
    text export/import of all state, reset-all
  - Toasts, scroll-to-top, 30s auto home refresh

## Storage implementation (verified)

- **Primary**: `localStorage` key `sp_state` (plus `sp_ts` timestamp), `save()` at `www/app.js:93-97`.
- **Fallback/durable layer**: IndexedDB database `siswapro`, object store `kv`, key `state`,
  wrapped get/put helpers with a 1.5s timeout (`www/app.js:15-40`).
- On init: if IDB `savedAt` > `localStorage.sp_ts`, IDB state wins and app re-renders
  (`www/app.js:465-473`) — designed to survive localStorage loss on app updates.

### Storage risks

1. **`resetAll()` clears only localStorage, never the IndexedDB copy** — the
   timestamp comparison ("greater than") can resurrect the deleted state after reset.
   (`www/app.js:426-430`)
2. Export/import is a plaintext whole-state JSON blob — no schema versioning and
   only minimal validation (array checks) on import (`www/app.js:411-425`).
3. `save()` is called from every render function (`renderPR`, `renderJd`, `renderMapelList`) —
   full-state JSON stringify runs on each UI interaction.
4. Data never leaves the device — consistent with the "no account, no server" claim.

## Capacitor configuration (verified)

- `capacitor.config.json`: `{ appId: "com.siswapro.app", appName: "SiswaPro", webDir: "www" }`
- `webDir` matches the real source directory (`www/`). The `Example/` directory is
  unrelated content and participates in no build.
- `android/app/src/main/assets/capacitor.plugins.json` = `[]` — zero Capacitor plugins.

## Web asset copy & build tracking (verified)

- Copy chain: `www/` → `android/app/src/main/assets/public/` (custom `copyWebAssets` Copy task in
  `android/app/build.gradle:3-11`, wired to all `merge*Assets` tasks and declared with
  `inputs.files` so Gradle re-copies when assets change) → packaged APK.
- Evidence (executed):
  - SHA-256 of `www/app.js` = `0f730ea23a8e82cd547be3ce33240e32c9d27b3da7636285f69230f67fdd526b`
  - Identical hash in `android/app/src/main/assets/public/app.js`
  - Same hash **inside the built APK** — `unzip -p android/app/build/outputs/apk/debug/app-debug.apk assets/public/app.js | sha256sum`
  - Timestamps: last asset edit 13:19–13:20, copy task ran 13:21:35, APK written 13:21 (same day)
- Conclusion: **fresh assets are inside the shipped APK; the build tracks asset changes.**

## Android Gradle configuration (verified)

- AGP 8.13.0, Gradle wrapper 8.14.3-all, Java 21 (`capacitor.build.gradle`).
- `variables.gradle`: minSdk 24, compileSdk 36, targetSdk 36 (AndroidX versions declared).
- `app/build.gradle`: `applicationId com.siswapro.app`, versionCode 4, versionName "1.3",
  release build `minifyEnabled false`, no signing config (debug only).
- Manifest: INTERNET permission, FileProvider, single activity, no plugins.
- google-services plugin classpath present but not applied (no `google-services.json`) — push
  notifications unavailable by design of the template guard.

## Build scripts / CI (verified)

- `.github/workflows/build-apk.yml`: Node 22, Temurin Java 21, `android-actions/setup-android`
  (platform 36, build-tools 35.0.0), `npm install`, `npx cap sync android`, `./gradlew assembleDebug`,
  upload APK artifact. Triggers: push to `main` + manual `workflow_dispatch`.
- `package.json scripts.build` is a no-op (`console.log(...)`).

## Build prerequisites (verified)

- Node 22 + `npm install` (Capacitor deps only), Java 21, Android SDK platform 36,
  Google/Maven repositories. On Termux: `aapt2` binary must exist at
  `/data/data/com.termux/files/usr/bin/aapt2` (declared in tracked `gradle.properties`).
- Build command: `./gradlew assembleDebug` (wrapper 8.14.3).
- Verified build output: `android/app/build/outputs/apk/debug/app-debug.apk` (4.1 MB,
  built on the audit date) + `output-metadata.json`.

## Dependencies (verified)

- Direct npm deps: `@capacitor/core`, `@capacitor/android`, `@capacitor/cli`, all `^8.5.3`.
- Zero Capacitor plugins installed. `node_modules/` present locally, untracked.
- `.opencode/` contains only `@opencode-ai/plugin`.

## Tests (verified)

- None covering app logic. Only Capacitor template files:
  `android/app/src/test/java/com/getcapacitor/myapp/ExampleUnitTest.java` (trivial 2+2)
  and `ExampleInstrumentedTest.java` (template). Tests were not run (read-only scope).
- No tests exist for: timer, streak, grade calculation, IDB migration, import validation, filters.

## Defects (verified)

1. **CI-breaking tracked config**: `android/gradle.properties` sets
   `android.aapt2FromMavenOverride=/data/data/com.termux/files/usr/bin/aapt2` — a Termux-specific
   path that does not exist on GitHub Actions runners; AGP fails when the override is missing/invalid.
2. **`android/capacitor.settings.gradle` points to `../node_modules`** (modified, uncommitted).
   It resolves correctly for this layout (node_modules is one level above `android/`), but CI runs
   `npx cap sync android` which may regenerate the file differently — behavior on CI UNKNOWN
   (no run logs inspected).
3. **Uncommitted/untracked drift**: modified tracked files (`gradle.properties`,
   `capacitor.settings.gradle`, `app/build.gradle`, `www/index.html`), untracked
   `www/app.css`, `www/app.js`, `package-lock.json`, `Example/`, `node_modules/`.
   A fresh clone only gets the old v1.0 inline-styled `www/index.html` and the older settings paths.
4. Version string inconsistency: badge and `VER` = **v1.3** (`www/index.html:37`, `www/app.js:476`)
   but the About card says **"SiswaPro v1.2"** (`www/index.html:220`).
5. `delMapel` onclick escaping hack (`\\&#39;`) at `www/app.js:394` breaks for subjects
   containing quotes/special characters.
6. `package.json scripts.build` is a no-op — CI relies solely on `npx cap sync` for asset copying.
7. Cosmetic typo: menu header "PR SEGERA TENGAT" (`www/index.html:69`).
8. Storage: `resetAll()` does not clear IndexedDB (see storage risks above).

## Unknowns (explicit)

- Whether the GitHub Actions workflow ever succeeded (no run logs inspected).
- Exact behavior of `npx cap sync` regeneration of `capacitor.settings.gradle` on CI layout.
- Runtime UI behavior on a device (app not launched during audit).

## Commands executed (all read-only)

`ls`, `git log`, `git status`, `git ls-files`, `git diff`, `sha256sum`,
`ls -l --time-style`, `unzip -p` (stdout only), `bash -n` (syntax check), file reads.
No files were edited, created, or deleted during the audit.

## Recommended next actions

1. Commit the drift: add `www/app.css`, `www/app.js`, `www/index.html`, `package.json`,
   `package-lock.json`, and modified Gradle files; decide whether `Example/` stays (delete or ignore).
2. Move `aapt2FromMavenOverride` out of the tracked `gradle.properties` (e.g. into untracked
   `local.properties` or a local `~/.gradle/init.gradle`) so CI builds can succeed.
3. Add a CI guard: compare hash of `assets/public` vs `www` before `assembleDebug`.
4. Fix `resetAll()` to also delete the IndexedDB `kv` state (or `deleteDatabase('siswapro')`);
   unify v1.2/v1.3 version strings.
5. Add minimal unit tests for pure logic: grade weights (`hitung`), streak calculation,
   `dueInfo`, import validation.

## Addendum (2026-10-21, planning phase — post-audit)

The audit above reflects the repository as found. Since then, this file and `docs/` remain
untracked; the following planning documents were added in `docs/` (none touch production
code, and the uncommitted-drift defect list above still stands):

- `docs/spec/product-spec-v0.3.0.md` — confirmed 2-user MVP scope
- `docs/requirements.md` — v1.3 requirements (now scope-bannered; REQ-NI-01 labels corrected)
- `docs/product-requirements-v2.md` — new-MVP REQ2-* requirements
- `docs/architecture-v0.1.md` — v0.2-draft: ADR set + typo fixes + privacy-posture + identity-recovery note
- `docs/plugin-verification-plan.md` — verify-only plugin protocol (nothing installed)
- `docs/design-spec.md` / `docs/design-spec-v0.2-two-user.md` — v0.1 bannered; v0.2 two-user UI
- `docs/test-strategy.md` / `docs/test-strategy-v2.md` — v1.3 bannered; MVP strategy v2
- `docs/review-report-2026-10-21.md` / `docs/decision-report-2026-10-21.md` — INTAKE review + Q1–Q8 decision report


---

# Audit 2026-10-26 — subject system + repair batch (commit 2.0-mvp3)

## Fixed
- Mapel state id-keyed (`S.mapel[i] = {id,name,teacher}`); inline-onclick quote bug in settings list replaced by id-based handlers (`delMapel(id)`, `renameMapel(id)`).
- `ensurePersonalSpace` meta write no longer interpolates SQL (parameterised).
- Import (mvp1) uses shared `SUBJECTS.filterImportSettings` — cursor/server keys can never be imported.
- versionCode bumped 6→7, versionName 2.0-mvp3; `VER` const kept in sync.

## New: subject system (mission §5)
- `www/subjects.js`: 60-entry curriculum-neutral seed catalog (Umum/SD·SMP/SMA·MA/SMK blocks), pure helpers `normName/isDupe/validateCustom/suggestionsFor/filterImportSettings`, node-testable.
- Onboarding card 2: level chips (SD/MI, SMP/MTs, SMA/MA, SMK, Paket, Lainnya) + search + multi-select catalog + skip. Level stored in settings `level`.
- Settings card rebuild: search + level filter chips + add/remove catalog + "＋ Tambah Mata Pelajaran Sendiri" (name + optional teacher) + selected list with use-counts, rename, delete.
- LocalDb migration v2: `ALTER TABLE subjects ADD COLUMN teacher` (existing rows preserved). `subjectAdd` is add-if-absent (case-insensitive, idempotent re-pick). `subjectRename` updates subjects + tasks + schedule atomically (name-keyed refs; subject_id col is the Phase-3 upgrade). `subjectSetTeacher` added.
- Catalog rows are inserted into the SAME subjects table as customs → identical treatment in PR/jadwal/sync/export.

## Tests
- `tests/run-tests.js` (node, no framework): 21 checks — catalog integrity, normalization, dupe/validation, level search, import filter. `npm test` wired. 21/21 pass.
- `npm audit --omit=dev`: 3 moderate — uuid<11.1.1 via xcode via @capacitor/cli (dev-only build tooling, not shipped in APK; force-fix is breaking → accepted residual risk, documented here).

## Not verified on device (external)
- Ob step-2 UI, pick/remove/rename/teacher flows, migration v2 on an existing install — require manual device run of APK versionCode 7.
