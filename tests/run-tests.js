'use strict';
// Node-based unit checks for pure logic (subjects catalog, validation,
// import filter). Run: node tests/run-tests.js  — exits 1 on failure.
const SUB = require('../www/subjects.js');

let pass = 0, fail = 0;
function eq(actual, expected, label) {
  const a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a === b) { pass++; console.log('  ok ' + label); }
  else { fail++; console.error('FAIL ' + label + '\n    got: ' + a + '\n    exp: ' + b); }
}
function ok(cond, label) { cond ? (pass++, console.log('  ok ' + label)) : (fail++, console.error('FAIL ' + label)); }

console.log('== catalog ==');
ok(SUB.CATALOG.length >= 60, 'catalog seeded comprehensively (' + SUB.CATALOG.length + ' entries)');
ok(SUB.CATALOG.some(r => r.name === 'Matematika'), 'gimnasium staple present');
ok(SUB.CATALOG.some(r => r.name === 'Pengembangan Perangkat Lunak dan Gim'), 'SMK vocational present');
ok(SUB.CATALOG.every(r => r.name && r.cat && Array.isArray(r.level) && r.level.length), 'every entry has name, cat, level');
ok(SUB.CATALOG.filter(r => r.level.includes('smk')).length >= 15, 'SMK block well populated');
const names = new Set(SUB.CATALOG.map(r => r.name));
eq(names.size, SUB.CATALOG.length, 'catalog names unique');

console.log('== normalize / dupe ==');
eq(SUB.normName('  Bahasa   Inggris '), 'Bahasa Inggris', 'normName trims + collapses spaces');
ok(SUB.isDupe('bahasa inggris', ['Bahasa Inggris', 'Fisika']), 'duplicate check case-insensitive');
ok(!SUB.isDupe('Bahasa Jepang', ['Bahasa Inggris']), 'distinct subjects not flagged');
ok(!SUB.isDupe('   ', ['Fisika']), 'blank never dupes');

console.log('== validateCustom ==');
eq(SUB.validateCustom('   '), { ok: false, error: 'Tulis nama mata pelajarannya' }, 'empty name rejected');
ok(SUB.validateCustom('  Membaca  Al-Quran ').ok, 'custom subject valid after normalize');
ok(!SUB.validateCustom('x'.repeat(49)).ok, 'overlong name rejected');

console.log('== suggestionsFor ==');
ok(SUB.suggestionsFor('smk', 'jaringan').some(r => r.name === 'Teknik Komputer dan Jaringan'), 'SMK search hit');
ok(SUB.suggestionsFor('sma', 'Bio').some(r => r.name === 'Biologi'), 'query search hit (partial, case-insens)');
ok(SUB.suggestionsFor('sd', 'Biologi').length === 0, 'SMA subject not suggested for SD');
ok(SUB.suggestionsFor('paket', '').length > 0, 'paket/other still suggests via general fallback');
ok(SUB.suggestionsFor(null, '').length > 0, 'null level suggests general set');

console.log('== import settings filter ==');
eq(SUB.filterImportSettings([{ k: 'nama', v: 'Budi' }, { k: 'server_space', v: 'X' }, { k: 'feed_cursor', v: '9' }, null, { v: 'nokey' }]),
  [{ k: 'nama', v: 'Budi' }], 'sync-internal keys dropped, invalid rows dropped');

console.log('== levels ==');
ok(SUB.LEVELS.some(l => l.id === 'paket'), 'paket/kesetaraan offered');
ok(SUB.LEVELS.some(l => l.id === 'other'), 'custom context offered');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
