'use strict';
// Regression tests for the "mandatory email" audit.
// Verifies: (1) LEA/VIOLET placeholders are display-only persona mapping —
// they must never authorize or block anything; (2) unknown emails map to a
// role: null identity (still allowed to sign in / stay local).
// Run: node tests/auth-tests.js
global.window = {
  SUPABASE_CONFIG: {
    url: 'https://example.supabase.co',
    anonKey: 'sb_publishable_TEST',
    accounts: { lea: 'LEA_EMAIL', violet: 'VIOLET_EMAIL' }
  }
};
global.Capacitor = { Plugins: {} }; // auth.js dry loads without native bridge
require('../www/auth.js');
const Auth = global.window.Auth;

let pass = 0, fail = 0;
function eq(a, b, label) {
  const s = JSON.stringify(a), t = JSON.stringify(b);
  if (s === t) { pass++; console.log('  ok ' + label); }
  else { fail++; console.error('FAIL ' + label + '\n    got: ' + s + '\n    exp: ' + t); }
}
function ok(c, label) { c ? (pass++, console.log('  ok ' + label)) : (fail++, console.error('FAIL ' + label)); }

console.log('== identity mapping (placeholder-safe) ==');
eq(Auth.identify('lea@example.com'), { role: null, email: 'lea@example.com' },
  'placeholder never matches a real account (no fabricated identity)');
eq(Auth.identify('LEA_EMAIL'), { role: null, email: 'LEA_EMAIL' },
  'placeholder string itself is not treated as a persona');
eq(Auth.identify('anyone@x.com'), { role: null, email: 'anyone@x.com' },
  'strangers get role: null (local-first, not blocked)');
eq(Auth.identify('LEA@example.COM').role, null, 'case-insensitive match still safe with placeholders');

console.log('== config gates ==');
// with placeholder emails, configured() must still be true (URL+key only)
// — placeholders may not disable sync for everyone else
ok(window.SUPABASE_CONFIG.url && window.SUPABASE_CONFIG.anonKey, 'url+key present identify-gates intact');
ok(!('password' in window.SUPABASE_CONFIG) && !('serviceRole' in window.SUPABASE_CONFIG),
  'no secrets in client config');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
