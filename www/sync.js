'use strict';
// ============================================================
// SiswaPro Phase 2 — happy-path sync (arch §14 Phase 2):
//   push (upsert to own personal space) → pull (change_feed replay)
// Phase 3 replaces this with the full outbox economy + field merge;
// the WIRE paths (tables upsert + feed cursor) stay the same.
// Identity isolation comes from RLS, not client filtering.
// ============================================================

const Sync = {
  busy: false,
  spaceId: null,              // user's server personal space uuid
  lastPush: null, lastPull: null,

  async token() {
    if (!Auth.ok) throw new Error('auth client not ready');
    const { data, error } = await Auth.client.auth.getSession();
    if (error || !data || !data.session) throw new Error('session expired — REAUTH');
    return data.session.access_token;
  },

  async headers() {
    const t = await this.token();
    return {
      authorization: 'Bearer ' + t,
      apikey: window.SUPABASE_CONFIG.anonKey,
      'content-type': 'application/json'
    };
  },

  // Supabase base URL for REST
  base() { return window.SUPABASE_CONFIG.url.replace(/\/$/, '') + '/rest/v1'; },

  async rest(method, table, path, body) {
    const h = await this.headers();
    const r = await fetch(this.base() + '/' + table + (path || ''), {
      method, headers: h, body: body === undefined ? undefined : JSON.stringify(body)
    });
    const text = await r.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
    if (!r.ok) throw new Error(table + ' ' + method + ': HTTP ' + r.status + ' ' + (text || '').slice(0, 200));
    return data;
  },

  // ---------- server personal space discovery -------------------------
  async resolveSpace() {
    if (this.spaceId) return this.spaceId;
    const rows = await this.rest('GET', 'spaces', '?kind=eq.personal&select=id');
    if (!rows || rows.length !== 1) throw new Error('personal space not found — run guide §4 seed');
    this.spaceId = rows[0].id;
    await LocalDb.setSetting('server_space', this.spaceId);
    return this.spaceId;
  },

  // ---------- push: upsert via merge-duplicates (not tombstone-lossy) --
  async push() {
    const sp = await this.resolveSpace();
    const toIso = ms => new Date(Number(ms)).toISOString();
    const tasks = (await LocalDb.tasksAllRaw()).map(r => ({
      id: r.id, space_id: sp, title: r.title, subject: r.subject,
      done: !!r.done, due: r.due || '',
      created_at: toIso(r.created_at), updated_at: toIso(r.updated_at || r.created_at),
      deleted_at: r.deleted_at ? toIso(r.deleted_at) : null
    }));
    if (tasks.length) {
      await this.rest('POST', 'tasks', '?on_conflict=id', tasks)
        .catch(e => { throw new Error('push tasks: ' + e.message); });
      // feed triggers fire server-side
    }
  },

  // ---------- pull: feed replay above cursor --------------------------
  async pull() {
    const cursor = Number((await LocalDb.getSetting('feed_cursor')) || 0);
    const rows = await this.rest('GET', 'change_feed',
      '?row_seq=gt.' + cursor + '&order=row_seq.asc&select=row_seq,entity,row_id,op');
    let max = cursor;
    for (const ev of rows) {
      try {
        if (ev.op === 'delete') {
          await LocalDb.applyRemoteDelete(ev.entity, ev.row_id);
        } else {
          const src = await this.rest('GET', ev.entity, '?id=eq.' + ev.row_id + '&select=*');
          if (src && src[0]) await LocalDb.applyRemote(ev.entity, src[0]);
        }
      } catch (e) {
        // per-arch: interrupted pull → cursor stays → later replay; failed
        // single events stop THIS batch but cursor stays at last good row
        console.warn('feed apply failed seq', ev.row_seq, e.message);
        LocalDb.setSetting('feed_cursor', String(max)).catch(() => {});
        throw e;
      }
      max = ev.row_seq;
    }
    await LocalDb.setSetting('feed_cursor', String(max));
    return rows.length;
  },

  // ---------- orchestrator (chip states: Sinkron… / OK / ALERT) --------
  async syncNow(chip) {
    if (this.busy) return { ok: false, reason: 'busy' };
    if (!window.navigator.onLine) return { ok: false, reason: 'offline' };
    this.busy = true;
    try {
      await this.push();
      const n = await this.pull();
      return { ok: true, pulled: n };
    } finally {
      this.busy = false;
    }
  }
};

window.Sync = Sync;
