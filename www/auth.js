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
      auth: {
        storage: this.storageAdapter(), persistSession: true,
        autoRefreshToken: true,
        // implicit: OAuth + email-confirm deep links land as
        // #access_token/refresh_token — matches Auth.handleUrl parsing
        flowType: 'implicit'
      }
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

  // self-serve account creation (2026-10-23 sign-off: users register
  // themselves; personal space is bootstrapped by Sync.resolveSpace)
  // self-serve password recovery (ADR-3 signed: email reset).
  // Recovery link lands on siswapro://auth/callback with session tokens —
  // handleUrl() below exchanges them for a persisted session.
  async requestReset(email) {
    if (!this.ok) throw new Error('Server belum dikonfigurasi (fase 2).');
    const { error } = await this.client.auth.resetPasswordForEmail(email, {
      redirectTo: 'siswapro://auth/callback'
    });
    if (error) throw error;
  },

  async signup(email, password) {
    if (!this.ok) throw new Error('Sinkronisasi belum dikonfigurasi (fase 2).');
    const { data, error } = await this.client.auth.signUp({
      email, password,
      options: { emailRedirectTo: 'siswapro://auth/callback' }
    });
    if (error) throw error;
    if (!data.session) {
      throw new Error('Cek email kamu: tautan konfirmasi sudah dikirim — buka di HP ini, lalu Masuk di sini.');
    }
    this.session = data.session;
    this.identity = this.identify(email || (data.user && data.user.email));
    return this.identity;
  },

  // Google OAuth (provider enabled live 2026-10-24). Implicit flow →
  // callback returns fragment tokens; open system browser via
  // @capacitor/browser; landing 'siswapro://auth/callback' is handled
  // by Auth.handleUrl (schema registered in AndroidManifest).
  async google() {
    if (!this.ok && !(await this.initClient()))
      throw new Error('Sinkronisasi belum dikonfigurasi (fase 2).');
    const P = window.Capacitor && window.Capacitor.Plugins.Browser;
    if (!P) throw new Error('Browser plugin tidak tersedia — perbarui aplikasi.');
    const { data, error } = await this.client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'siswapro://auth/callback', skipBrowserRedirect: true }
    });
    if (error) throw error;
    if (!data || !data.url) throw new Error('URL Google tidak diperoleh — coba lagi.');
    await P.open({ url: data.url });
    return true;
  },

  // deep-link landing for the auth email (emailRedirectTo). The Supabase
  // /auth/v1/verify endpoint 302s to siswapro://auth/callback#access_token=…
  // &refresh_token=… — exchange them for a persisted session.
  async handleUrl(url) {
    if (!this.ok || typeof url !== 'string' ||
        !url.startsWith('siswapro://auth/callback')) return false;
    const i = url.indexOf('#');
    if (i < 0) return false;
    let frag = {}; let okFrag = false;
    url.slice(i + 1).split('&').forEach(kv => {
      const p = kv.split('=');
      if (p.length === 2) { frag[p[0]] = decodeURIComponent(p[1]); okFrag = true; }
    });
    if (!okFrag || !frag.access_token || !frag.refresh_token) return false;
    const { data, error } = await this.client.auth.setSession({
      access_token: frag.access_token,
      refresh_token: frag.refresh_token
    });
    if (error) throw error;
    this.session = data.session;
    const user = data.session.user || {};
    this.identity = this.identify(user.email || '');
    return true;
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
