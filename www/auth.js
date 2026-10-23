'use strict';
// ============================================================
// SiswaPro Phase 2 — Auth + session (ADR-3 signed: email+password,
// self-serve email reset; ADR-6: refresh tokens in Keystore-backed
// secure storage via supabase-js custom storage adapter).
// Requires: supabase.umd.js, supabase-config.js. If the config is
// not filled, the app stays in local-only mode — never crashes.
// NO service-role or secret key — public anon material only (C8).
// ============================================================

const Auth = {
  client: null,
  ok: false,          // config + secure storage both available
  session: null,
  identity: null,     // {role:'Lea'|'Violet', email}

  configured() {
    const c = window.SUPABASE_CONFIG || {};
    // URL + publishable key are what gate sync; email mapping is only
    // used for identity naming (falls back to login email when absent)
    return !!(c.url && c.anonKey &&
              !/^PASTE_/.test(c.url) && !/^PASTE_/.test(c.anonKey));
  },

  secure() {
    // raw aparajita plugin (after round-2 verification): Keystore AES-GCM
    try { return window.Capacitor.Plugins.SecureStorage; }
    catch (e) { return null; }
  },

  storageAdapter() {
    const P = this.secure();
    return {
      getItem:  async k => { try { const r = await P.getItem(k); return r === undefined ? null : r; } catch (e) { return null; } },
      setItem:  async (k, v) => { await P.setItem(k, v); },
      removeItem: async k => { await P.removeItem(k); }
    };
  },

  async initClient() {
    if (this.client) return this.ok;
    if (!this.configured()) return false;
    const P = this.secure();
    if (!P) { console.warn('SecureStorage plugin missing — sync stays off (ADR-6)'); return false; }
    const cfg = window.SUPABASE_CONFIG;
    this.client = window.supabase.createClient(cfg.url, cfg.anonKey, {
      auth: { storage: this.storageAdapter(), persistSession: true, autoRefreshToken: true }
    });
    this.ok = true;
    return true;
  },

  identify(email) {
    const acc = (window.SUPABASE_CONFIG || {}).accounts || {};
    for (const role of ['lea', 'violet']) {
      if (acc[role] && acc[role].toLowerCase() === String(email).toLowerCase()) {
        return { role: role === 'lea' ? 'Lea' : 'Violet', email };
      }
    }
    return { role: null, email };
  },

  async login(email, password) {
    if (!this.ok) throw new Error('Sinkronisasi belum dikonfigurasi (fase 2).');
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    this.session = data.session;
    this.identity = this.identify(email);
    return this.identity;
  },

  // restore persisted session (Keystore-backed adapter handles refresh)
  async restore() {
    if (!this.ok && !(await this.initClient())) return null;
    try {
      const { data, error } = await this.client.auth.getSession();
      if (error || !data || !data.session) return null;
      this.session = data.session;
      const user = data.session.user || {};
      this.identity = this.identify(user.email);
      return this.identity;
    } catch (e) {
      console.warn('session restore failed', e);
      return null;
    }
  },

  async logout() {
    try { if (this.client) await this.client.auth.signOut(); } catch (e) {}
    this.session = null; this.identity = null;
  }
};

window.Auth = Auth;
