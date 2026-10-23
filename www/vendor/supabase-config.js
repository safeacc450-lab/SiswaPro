// SiswaPro Phase 2 — Supabase client config.
// ONLY publishes-anon-key material lives here (public by Supabase
// design; RLS guards the data — arch ADR-2/ADR-4). Service-role or
// secret keys NEVER go in the repo (C8).
// PL: create the project per docs/supabase-setup-guide.md, then paste
// Project URL + anon key and the two mapped account emails here.
window.SUPABASE_CONFIG = {
  url: 'https://atqfatnivxzzzibtqxzg.supabase.co',
  anonKey: 'sb_publishable_Ph3nfb8zPwvQMMJGGnFRPA_d21r7fPQ',
  accounts: {
    lea:    'LEA_EMAIL',             // e.g. lea@example.com   (bootstrapped in §4)
    violet: 'VIOLET_EMAIL'           // e.g. violet@example.com
  }
};
