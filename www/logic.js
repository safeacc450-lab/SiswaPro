'use strict';
// ============================================================
// SiswaPro 3.0 — pure logic, zero DOM. Node-testable.
// Sources of truth:
//   assignments = tasks rows (done:0|1, due: 'YYYY-MM-DD' or '')
//   focus time  = SUM(minutes) of focus_sessions (deleted excluded)
//   completion rate = done/(open+done) of the queried population;
//     zero population → null (caller renders empty state)
// Focus rule: only COMPLETED sessions count; cancelled adds nothing.
// ============================================================

// date-only 'YYYY-MM-DD' → local Date at midnight (never UTC drift)
function parseDay(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}
function dayStr(d) {
  const x = d instanceof Date ? d : new Date();
  return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
}

// ---- assignments: filter/sort/counts ------------------------------
// f: {status:'all'|'open'|'done', subject:'', prio:'', q:'', due:'YYYY-MM-DD'|''}
function filterTasks(tasks, f) {
  f = f || {};
  const q = (f.q || '').trim().toLowerCase();
  let rows = (tasks || []).filter(t => {
    if (f.status === 'open' && t.done) return false;
    if (f.status === 'done' && !t.done) return false;
    if (f.subject && t.subject !== f.subject) return false;
    if (f.prio && t.priority !== f.prio) return false;
    if (f.due && t.due !== f.due) return false;
    if (q && !String(t.title || t.t || '').toLowerCase().includes(q)) return false;
    return true;
  });
  const P = { high: 0, normal: 1, low: 2 };
  rows.sort((a, b) => {
    switch (f.sort || 'due') {
      case 'created': return (b.created_at || 0) - (a.created_at || 0);
      case 'prio': return P[a.priority] - P[b.priority] ||
        ((a.due || '9999') < (b.due || '9999') ? -1 : 1);
      default: return (a.done - b.done) || // open first
        (a.due || '9999').localeCompare(b.due || '9999');
    }
  });
  return rows;
}

// overdue = open + due < today (date-only compare, local tz)
function isOverdue(t, todayIso) {
  return !t.done && !!t.due && t.due < todayIso;
}
function taskCounts(tasks, todayIso) {
  const open = (tasks || []).filter(t => !t.done);
  return {
    total: (tasks || []).length,
    open: open.length,
    done: (tasks || []).length - open.length,
    overdue: open.filter(t => isOverdue(t, todayIso)).length
  };
}

// next actionable: open task, soonest due (no due → after dated), tie-break prio
function nextTask(tasks, todayIso) {
  return filterTasks(tasks, { status: 'open' }).find(t => true) || null;
}

// month matrix (Mon-first): {first, last, cells:[{d: iso|null, inMonth}]}
function monthGrid(y, m) { // m: 0-11
  const first = new Date(y, m, 1);
  const lead = (first.getDay() + 6) % 7; // Mon=0
  const dim = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(new Date(y, m, d));
  while (cells.length % 7) cells.push(null);
  return { first, cells };
}

// ---- focus timer FSM ---------------------------------------------
const FOCUS = { IDLE: 'idle', RUNNING: 'running', PAUSED: 'paused', DONE: 'done', CANCELLED: 'cancelled' };
const FOCUS_TRANSITIONS = {
  idle:     { start: true },
  running:  { pause: true, cancel: true, complete: true },
  paused:   { resume: true, cancel: true, complete: true },
  done:     {},
  cancelled:{}
};
// state persisted as {st, preset, remaining, since, once}
//   running: since=epochAtStartOfSlice; remaining = msLeft recomputed from clock
//   paused:  remaining = frozen ms
function focusTick(s, now) {
  if (!s || s.st !== 'running') return s.remaining;
  return Math.max(0, s.remaining - (now - s.since));
}
function focusEvents(s) { return FOCUS_TRANSITIONS[s ? s.st : 'idle'] || {}; }
function focusStart(preset, now) {
  return { st: 'running', preset, remaining: preset * 60000, since: now, once: false };
}
function focusPause(s, now) {
  return { ...s, st: 'paused', remaining: focusTick(s, now) };
}
function focusResume(s, now) {
  return { ...s, st: 'running', since: now };
}
function focusComplete(s) {
  // exactly-once: second call after done returns null (caller skips insert)
  if (s.st === 'done' || s.once) return null;
  return { ...s, st: 'done', once: true };
}
// idempotence gate for the caller: pass the SAME ref you got back to guard re-entry
function focusOnce(s) { return s && s.st === 'done' ? null : focusComplete(s); }
function focusCancel(s) {
  return { ...s, st: 'cancelled', once: true };
}
// minutes actually earned by a session (completed → preset, else 0)
function focusEarned(stateBefore, minutesElapsed) {
  return stateBefore && stateBefore.st === 'done' ? Math.round(minutesElapsed) : 0;
}

// ---- analytics ----------------------------------------------------
function completionRate(doneCount, openCount) {
  const pop = (doneCount || 0) + (openCount || 0);
  return pop === 0 ? null : Math.round((doneCount / pop) * 100);
}
// daily focus minutes for last n days (oldest first) from {iso→min}
function focusByDaySeries(byDayMap, todayDate, n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(todayDate); d.setDate(d.getDate() - i);
    const iso = dayStr(d);
    out.push({ d: iso, m: Number(byDayMap[iso]) || 0 });
  }
  return out;
}
// subject breakdown within range [fromIso..todayIso]
function subjectStats(tasks, fromIso, toIso) {
  const map = {};
  for (const t of tasks || []) {
    // ponytail: tasks without a due date count in every range — ref-keyed
    // per-window rows would be the upgrade if that skews stats
    if (!t.due || (t.due >= fromIso && t.due <= toIso)) {
      const key = String(t.subject || t.m || '');
      const r = map[key] || (map[key] = { subject: key, total: 0, done: 0 });
      r.total++; if (t.done) r.done++;
    }
  }
  return Object.values(map).sort((a, b) => b.total - a.total);
}

const LOGIC = {
  parseDay, dayStr,
  filterTasks, isOverdue, taskCounts, nextTask, monthGrid,
  FOCUS, focusTick, focusEvents, focusStart, focusPause, focusResume, focusComplete, focusOnce, focusCancel, focusEarned,
  completionRate, focusByDaySeries, subjectStats
};

if (typeof window !== 'undefined') window.LOGIC = LOGIC;
if (typeof module !== 'undefined' && module.exports) module.exports = LOGIC;
