> STATUS (2026-10-21): superseded for the new MVP shell by docs/design-spec-v0.2-two-user.md. Remains valid as the v1.3 student-app UI reference; §1 tokens and §5 accessibility are reused by the v0.2 spec. Do not build the new shell from this document.

# SiswaPro Design Spec v0.1

Status: design-only. No production files modified. Pending product decisions in §8.

---

## 1. Design Tokens

CSS custom properties; every token defined as a light/dark pair.

### Color semantics (name by role, not hex)

| Token | Light | Dark | Semantic |
|---|---|---|---|
| `--bg` | `#f1f5f9` | `#0b1220` | app canvas |
| `--surface` | `#ffffff` | `#141c2e` | cards, sheets |
| `--surface-2` | `#f8fafc` | `#0f172a` | list items, inputs |
| `--ink` | `#0f172a` | `#e2e8f0` | primary text |
| `--ink-2` | `#475569` | `#cbd5e1` | secondary text |
| `--ink-3` | `#64748b` | `#7c8db0` | muted text |
| `--line` | `#e2e8f0` | `#22304d` | dividers, borders |
| `--accent` | per-user pick (indigo/sky/green/rose), hue lifted in dark | | interactive tint |
| `--accent-soft` | 12–14% accent tint | 18% tint | selected chips, active row bg |
| `--success` | `#16a34a` (bg `#f0fdf4`) | dark equivalent | PR done |
| `--warn` | `#d97706` (bg `#fffbeb`) | dark equivalent | due-today |
| `--danger` | `#dc2626` (bg `#fef2f2`) | dark equivalent | overdue, destructive |
| `--personal` | accent-derived | same | personal-space identity |
| `--shared` | fixed secondary hue (e.g. teal) | same | shared-space identity (pending §8.3) |

All ink/surface pairs ≥ 4.5:1 contrast in both themes.

### Typography

- Stack: `system-ui, -apple-system, 'Segoe UI', sans-serif`; `ui-monospace` for timer digits.
- Scale: Display 21px/800 · Title 15px/700 · Body 13.5px/400 · Reading body 16px/1.5 · Caption 11px/700.
- Hard floor: no text below 12px effective (current 9–10px stat labels must be lifted).
- Tabular numerals on counts, times, timer values.

### Spacing (4pt base)

`4 · 8 · 12 · 16 · 20 · 24`. Card padding 16, screen gutter 14, card gap 12.
No inline one-offs (`margin-top: 9px`, `14px` etc.) — use the scale.

### Radius

sm 10 · md 14 · lg 20 · pill 999.

### Elevation

- 0: flat
- 1: card — single soft shadow (replace current double shadow)
- 2: sticky appbar / bottom nav

### Motion

- Durations 100/200/300ms, `ease-out`.
- Allowed: view fade-slide-up (200ms), press scale 0.96 (100ms), progress width (300ms).
- Cut: all neon `box-shadow` glows, title text-shadows, `.app-icon` infinite float, hover translateY on touch targets, conic ring glow.
- Delight opt-in: timer-complete moment only.
- `prefers-reduced-motion: reduce` → view transitions opacity-only, no transforms.

### Focus ring

`outline: 2px solid var(--accent); outline-offset: 2px` — visible in both themes.

---

## 2. Navigation Map

```
First-run: Onboarding modal (name + accent) → Beranda
Bottom nav (persistent, 5):
  Beranda (hero stats · quick actions · today schedule · due PR)
    ├─ Tugas    (add form + full list + filters)
    ├─ Jadwal   (day chips · day list · add period form)
    ├─ Fokus    (timer ring · presets · 7-day chart)
    ├─ Rapor    (grade calculator)
    └─ Pengaturan (gear in appbar)
```

- Each tab = one screen; no deep routes.
- Sheets/modals (not routes): add/edit entity, confirm reset, onboarding.
- Hash routing: back button exits app from any tab; no scroll-jack on nav.
- Pengaturan hosts space management once shared-space flows approved (§8.1).

---

## 3. Component Inventory

| Component | Variants / States |
|---|---|
| App Bar | gradient (brand view) / plain surface (inner views); sync badge slot |
| Bottom Nav | default / active `aria-current="page"` / badge count (due-today PRs) |
| Card | default / hero / compact |
| List Item | default / active-now / due-today / overdue / done / draggable |
| Chip | filter / day / accent / preset |
| Button | primary / secondary / danger / icon-add / FAB |
| Stat Box · Progress Bar · Timer Ring · Bar Chart | token uplift, no glow |
| Input | default / focus / error / disabled; select, date, time, textarea |
| Toast | success / error / neutral; 2.3s; above nav |
| Modal/Sheet | onboarding / confirm; scrim, backdrop tap closes, `role="dialog"` |
| Empty State | icon + short copy + single CTA |
| SyncStatus badge | offline / syncing / synced / error (§4) |

---

## 4. Interaction States, Validation, Offline

### Interaction states
Every interactive element: default → hover (desktop only) → active (scale 0.96 + haptic `buzz()`) → focus-visible → disabled (40% opacity, no shadow).

### Form validation
- Errors shown per field: red 1.5px border + message below field (12px, `role="alert"`), first-error field autofocused, live-clear on input.
- Inline on submit attempt. Native date/time pickers only.
- Destructive (reset all): confirm dialog naming consequences + data-reminder.

### Offline / sync status
- App bar pill: dot + label — "Lokal" / "Sinkron…" / "Tersimpan" / ⚠ error (tap = retry).
- Unsaved badge on edited items while offline; toasts suppressed while unreachable.
- Exact state machine depends on sync mechanism (§8.2).

---

## 5. Accessibility Checks (launch gate)

1. Contrast: body pairs ≥ 4.5:1, large ≥ 3:1 — current `.stat-label` 9.5px @55% white on gradient fails.
2. Touch targets ≥ 44×44px (nav items, gear, `btn-ico` need padding).
3. Min font 12px.
4. Emoji icons get `aria-label`; decorative emoji `aria-hidden`.
5. Bottom nav = `<nav>` + `aria-current="page"` on active.
6. Views toggled via `hidden` attr + hash routing; focus moves to heading on view change.
7. Timer completion announced via `aria-live="polite"` (not per tick).
8. `prefers-color-scheme` default; manual toggle kept. Accent picker shows check-ring, not color-only.

---

## 6. Responsive Behavior

- Phone-first single column, 480px max container.
- ≥600px: centered, 640px max, 20px card padding.
- ≥900px: optional 2-col dashboard grid — verify demand before building.
- Safe-area insets: top appbar, bottom nav.

---

## 7. Light/Dark Consistency

- All per-theme values live in token pairs; fold current `body.dark` overrides (e.g. `.item.late`) into semantic tokens.
- Gradients: accent→accent-2 on appbar/hero/primary button only; charts flat accent in dark.
- Status colors tested in both themes.

---

## 8. Dependencies on Product Decisions (BLOCKERS)

1. **Shared spaces undefined.** Current app is single-user, local-only, no accounts. Blocked on: what data is shared (schedule? PR? grades?), join mechanism (invite code / sync server / QR), permission model (owner/member read-write?). Visual separation spec'd (badge on shared items, space switcher, `--shared` token) but shared-space screens are placeholders until approved product flows arrive.
2. **Sync mechanism** (real-time vs manual pull vs export/import cycle) — SyncStatus component spec'd generically; exact states per decision.
3. **Accent palette ownership** — confirm whether shared-space data carries own fixed tint independent of user accent; requires runtime accent token generation either way.

---

## 9. UI Acceptance Criteria

- [ ] Zero decorative glows/floating on reading surfaces; only token-driven shadows.
- [ ] All text passes WCAG AA both themes (token pairs checked).
- [ ] Every tap target ≥ 44px; keyboard focusable in DOM order; focus ring visible in dark.
- [ ] 4pt spacing scale used — no pixel one-offs.
- [ ] Back button exits app cleanly (hash routing works).
- [ ] Dark/light toggle instant; no flash of wrong theme at startup.
- [ ] Sync status reflects offline state within 2s of network change.
- [ ] Reduced-motion setting removes all transform animations.
- [ ] Empty, loading, error, offline states spec'd for every screen.
- [ ] Accent picker showing check-ring; no color-only selection.

---

## 10. Inspiration References (from `Example/index.html` only)

- Aqua accent direction — usable as one of the accent picks, not as default palette.
- Float animation + glow effects — noted as restraint targets (cut from production surfaces; see §1 Motion).
- No assets copied, no remote dependencies introduced.
