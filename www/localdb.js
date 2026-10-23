'use strict';
// ============================================================
// SiswaPro MVP Phase 1 — LocalDb (SQLite via Capacitor plugin)
// ADR-1: plugin-backed storage; rows already carry space_id +
// immutable ids so Phase 2/3 (server spaces, outbox) slot in.
// Access: Capacitor.Plugins.CapacitorSQLite (raw bridge — the
// npm wrapper's ES build targets bundlers we don't run).
// Space model Phase 1: exactly one local personal space.
// ============================================================

const DB = 'siswapro';

const Plugin = () => window.Capacitor.Plugins.CapacitorSQLite;
const SP = () => getSpaceId();

let _spaceId = null;

const LocalDb = {
  open: false,

  async init() {
    const P = Plugin();
    await P.createConnection({ database: DB, encrypted: false, mode: 'no-encryption', version: 1, readonly: false });
    await P.open({ database: DB, readonly: false });
    this.open = true;
    await this.migrate();
  },

  async exec(statements) {
    const P = Plugin();
    return P.execute({ database: DB, statements });
  },

  async all(statement, values) {
    const P = Plugin();
    const r = await P.query({ database: DB, statement, values: values || [] });
    return r && r.values ? r.values : [];
  },

  async one(statement, values) {
    const rows = await this.all(statement, values);
    return rows[0] || null;
  },

  async migrate() {
    const v = await this.all('PRAGMA user_version');
    const ver = (v[0] && (v[0].user_version ?? v[0].USER_VERSION)) || 0;
    if (ver < 1) {
      await this.exec([
        `CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)`,
        `CREATE TABLE IF NOT EXISTS spaces (
           id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK (kind IN ('personal','shared')),
           owner_id TEXT NOT NULL, name TEXT NOT NULL, created_at INTEGER NOT NULL)`,
        `CREATE TABLE IF NOT EXISTS subjects (
           id TEXT PRIMARY KEY, space_id TEXT NOT NULL, name TEXT NOT NULL,
           created_at INTEGER NOT NULL, deleted_at INTEGER)`,
        `CREATE TABLE IF NOT EXISTS schedule (
           id TEXT PRIMARY KEY, space_id TEXT NOT NULL,
           subject TEXT NOT NULL, day TEXT NOT NULL,
           start TEXT NOT NULL, "end" TEXT NOT NULL, room TEXT NOT NULL DEFAULT '',
           created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER)`,
        `CREATE TABLE IF NOT EXISTS tasks (
           id TEXT PRIMARY KEY, space_id TEXT NOT NULL,
           title TEXT NOT NULL, subject TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0,
           due TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL,
           updated_at INTEGER NOT NULL, deleted_at INTEGER)`,
        `CREATE TABLE IF NOT EXISTS focus_sessions (
           id TEXT PRIMARY KEY, space_id TEXT NOT NULL,
           day TEXT NOT NULL, minutes INTEGER NOT NULL, created_at INTEGER NOT NULL, deleted_at INTEGER)`,
        `CREATE TABLE IF NOT EXISTS settings (
           space_id TEXT NOT NULL, k TEXT NOT NULL, v TEXT NOT NULL, updated_at INTEGER NOT NULL,
           PRIMARY KEY (space_id, k))`,
        `CREATE INDEX IF NOT EXISTS idx_sched_day ON schedule (space_id, day, start)`,
        `CREATE INDEX IF NOT EXISTS idx_task_space ON tasks (space_id, deleted_at)`,
        `CREATE INDEX IF NOT EXISTS idx_focus_day ON focus_sessions (space_id, day)`
      ].join(';\n'));
      await this.exec('PRAGMA user_version = 1');
    }
  },

  async ensurePersonalSpace(ownerName) {
    if (_spaceId) return _spaceId;
    const row = await this.one("SELECT id FROM spaces WHERE kind='personal' LIMIT 1");
    if (row) { _spaceId = row.id; await this.exec(`INSERT OR REPLACE INTO meta (k,v) VALUES ('space_id','${row.id}')`); return _spaceId; }
    _spaceId = this.uid();
    await this.all(`INSERT INTO spaces (id,kind,owner_id,name,created_at) VALUES (?,?,?,?,?)`,
      [_spaceId, 'personal', _spaceId, ownerName || 'local', Date.now()]);
    await this.all(`INSERT OR REPLACE INTO meta (k,v) VALUES ('space_id',?)`, [_spaceId]);
    return _spaceId;
  },

  uid() {
    return (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  },

  // ---- settings ---------------------------------------------------
  async getSetting(k) {
    const r = await this.one('SELECT v FROM settings WHERE space_id=? AND k=?', [SP(), k]);
    return r ? r.v : null;
  },
  async setSetting(k, v) {
    await this.all(`INSERT INTO settings (space_id,k,v,updated_at) VALUES (?,?,?,?)
                    ON CONFLICT(space_id,k) DO UPDATE SET v=excluded.v, updated_at=excluded.updated_at`,
      [SP(), k, String(v), Date.now()]);
  },
  async settingsAll() {
    const rows = await this.all('SELECT k, v FROM settings WHERE space_id=?', [SP()]);
    return rows.reduce((a, r) => { a[r.k] = r.v; return a; }, {});
  },

  // ---- subjects ---------------------------------------------------
  async subjectsAll() {
    return this.all('SELECT id, name, created_at FROM subjects WHERE space_id=? AND deleted_at IS NULL ORDER BY created_at', [SP()]);
  },
  async subjectAdd(name) {
    const id = this.uid();
    await this.all('INSERT INTO subjects (id,space_id,name,created_at) VALUES (?,?,?,?)', [id, SP(), name, Date.now()]);
    return id;
  },
  async subjectDel(id) {
    await this.all('UPDATE subjects SET deleted_at=? WHERE id=?', [Date.now(), id]);
  },

  // ---- schedule -----------------------------------------------------
  async scheduleAll() {
    const rows = await this.all('SELECT id, subject AS m, day, start, "end" AS "endT", room, created_at FROM schedule WHERE space_id=? AND deleted_at IS NULL ORDER BY day, start', [SP()]);
    // plugin returns *original column names* and punts ambiguous aliases on
    // some Android builds — normalise defensively by positional fallback
    return rows.map(r => ({
      id: r.id, m: r.m ?? r.subject, day: r.day, start: r.start,
      end: r.end ?? r.endT ?? r['end'], room: r.room, created_at: r.created_at
    }));
  },
  async scheduleAdd(e) {
    const id = this.uid(), now = Date.now();
    await this.all(`INSERT INTO schedule (id,space_id,subject,day,start,"end",room,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)`,
      [id, SP(), e.m, e.day, e.start, e.end, e.room || '', now, now]);
    return id;
  },
  async scheduleDel(id) {
    await this.all('UPDATE schedule SET deleted_at=? WHERE id=?', [Date.now(), id]);
  },

  // ---- tasks -------------------------------------------------------
  async tasksAll() {
    return this.all('SELECT id, title, subject, done, due, created_at FROM tasks WHERE space_id=? AND deleted_at IS NULL ORDER BY created_at DESC', [SP()]);
  },
  // full local tasks including tombstones (Phase 2 push mirror)
  async tasksAllRaw() {
    return this.all('SELECT id, title, subject, done, due, created_at, updated_at, deleted_at FROM tasks', [SP()]);
  },
  // server row -> local upsert (times: ISO ms strings => epoch millis)
  async applyRemote(entity, row) {
    if (entity !== 'tasks') return; // Phase 2 happy-path scope
    const toMs = v => (typeof v === 'number' ? v : (v ? Date.parse(v) : Date.now()));
    const done = row.done === true || row.done === 1;
    await this.all(`INSERT INTO tasks (id,space_id,title,subject,done,due,created_at,updated_at,deleted_at)
                    VALUES (?,?,?,?,?,?,?,?,?)
                    ON CONFLICT(id) DO UPDATE SET
                      subject=excluded.subject, done=excluded.done, due=excluded.due,
                      updated_at=excluded.updated_at, deleted_at=excluded.deleted_at`,
      [row.id, SP(), row.title, row.subject, done ? 1 : 0, row.due || '', toMs(row.created_at), toMs(row.updated_at), row.deleted_at ? toMs(row.deleted_at) : null]);
  },
  async applyRemoteDelete(entity, id) {
    if (entity !== 'tasks') return;
    await this.all('UPDATE tasks SET deleted_at=? WHERE id=?', [Date.now(), id]);
  },
  // push uses id+subject+timestamps; created/updated kept as millis
  async taskAdd(t) {
    const id = this.uid(), now = Date.now();
    await this.all(`INSERT INTO tasks (id,space_id,title,subject,done,due,created_at,updated_at) VALUES (?,?,?,0,?,?,?,?)`,
      [id, SP(), t.t, t.m, t.due || '', now, now]);
    return id;
  },
  async taskSetDone(id, done) {
    await this.all('UPDATE tasks SET done=?, updated_at=? WHERE id=?', [done ? 1 : 0, Date.now(), id]);
  },
  async taskDel(id) {
    await this.all('UPDATE tasks SET deleted_at=?, updated_at=? WHERE id=?', [Date.now(), Date.now(), id]);
  },

  // ---- focus ------------------------------------------------------
  async focusByDay() {
    const rows = await this.all('SELECT day, SUM(minutes) AS m FROM focus_sessions WHERE space_id=? AND deleted_at IS NULL GROUP BY day', [SP()]);
    return rows.reduce((a, r) => { a[r.day] = r.m; return a; }, {});
  },
  async focusAdd(day, minutes) {
    const id = this.uid();
    await this.all('INSERT INTO focus_sessions (id,space_id,day,minutes,created_at) VALUES (?,?,?,?,?)', [id, SP(), day, minutes | 0, Date.now()]);
    return id;
  },

  // ---- export (FR-14) ----------------------------------------------
  async exportAll() {
    const [subjects, schedule, tasks, focus, settings] = await Promise.all([
      this.subjectsAll(), this.scheduleAll(), this.tasksAll(), this.focusByDay(), this.settingsAll()
    ]);
    return { _v: 'mvp1', exportedAt: Date.now(), mapel: subjects, jadwal: schedule, tasks, focus, settings };
  },

  async wipe() {
    // resets ONLY the MVP SQLite data; v1.3's localStorage/IndexedDB untouched
    await this.exec([
      'DELETE FROM subjects', 'DELETE FROM schedule', 'DELETE FROM tasks',
      'DELETE FROM focus_sessions', 'DELETE FROM settings', 'DELETE FROM spaces', 'DELETE FROM meta',
      'PRAGMA user_version = 0'
    ].join(';\n'));
    _spaceId = null;
  }
};

// stable accessor used before init completes (modules execute in order)
function getSpaceId() {
  if (!_spaceId) throw new Error('LocalDb: personal space not initialised');
  return _spaceId;
}

window.LocalDb = LocalDb;
