'use strict';
// ============================================================
// SiswaPro — Subject catalog + pure helpers.
// Seed catalog covers SD/MI → SMP/MTs → SMA/MA → SMK contexts
// (seed only, not a claim that every subject exists everywhere;
// users add their own via "+ Tambah Mata Pelajaran Sendiri").
// Pure module: browser (window.SUBJECTS) + node tests (module.exports).
// ============================================================

const CATALOG = [
  // GENERAL / NATIONAL
  { name: 'Pendidikan Pancasila (PPKn)', cat: 'Umum', level: ['sd', 'smp', 'sma', 'smk'] },
  { name: 'Bahasa Indonesia', cat: 'Umum', level: ['sd', 'smp', 'sma', 'smk'] },
  { name: 'Matematika', cat: 'Umum', level: ['sd', 'smp', 'sma', 'smk'] },
  { name: 'Bahasa Inggris', cat: 'Umum', level: ['sd', 'smp', 'sma', 'smk'] },
  { name: 'Seni Budaya', cat: 'Umum', level: ['sd', 'smp', 'smk'] },
  { name: 'PJOK', full: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', cat: 'Umum', level: ['sd', 'smp', 'sma', 'smk'] },
  { name: 'Informatika', cat: 'Umum', level: ['sd', 'smp', 'sma', 'smk'] },
  { name: 'Prakarya', cat: 'Umum', level: ['sd', 'smp'] },
  { name: 'Muatan Lokal (Mulok)', cat: 'Umum', level: ['sd', 'smp', 'sma', 'smk'] },
  { name: 'Bahasa Daerah', cat: 'Umum', level: ['sd', 'smp'] },
  { name: 'Bahasa Jawa', cat: 'Umum', level: ['sd', 'smp'] },
  { name: 'Bahasa Sunda', cat: 'Umum', level: ['sd', 'smp'] },

  // SD & SMP
  { name: 'IPAS', full: 'Ilmu Pengetahuan Alam dan Sosial', cat: 'Umum', level: ['sd'] },
  { name: 'IPA', full: 'Ilmu Pengetahuan Alam', cat: 'Umum', level: ['smp'] },
  { name: 'IPS', full: 'Ilmu Pengetahuan Sosial', cat: 'Umum', level: ['smp'] },
  { name: 'Pendidikan Lingkungan', cat: 'Umum', level: ['sd', 'smp'] },
  { name: 'Bimbingan dan Konseling (BK)', cat: 'Umum', level: ['sd', 'smp'] },

  // SMA/MA
  { name: 'Biologi', cat: 'SMA/MA', level: ['sma'] },
  { name: 'Fisika', cat: 'SMA/MA', level: ['sma'] },
  { name: 'Kimia', cat: 'SMA/MA', level: ['sma'] },
  { name: 'Geografi', cat: 'SMA/MA', level: ['sma'] },
  { name: 'Ekonomi', cat: 'SMA/MA', level: ['sma'] },
  { name: 'Sosiologi', cat: 'SMA/MA', level: ['sma'] },
  { name: 'Sejarah', cat: 'SMA/MA', level: ['sma'] },
  { name: 'Antropologi', cat: 'SMA/MA', level: ['sma'] },
  { name: 'Matematika Tingkat Lanjut', cat: 'SMA/MA', level: ['sma'] },
  { name: 'Bahasa Indonesia Tingkat Lanjut', cat: 'SMA/MA', level: ['sma'] },
  { name: 'Bahasa Inggris Tingkat Lanjut', cat: 'SMA/MA', level: ['sma'] },
  { name: 'Bahasa dan Sastra Indonesia', cat: 'SMA/MA', level: ['sma'] },
  { name: 'Bahasa dan Sastra Inggris', cat: 'SMA/MA', level: ['sma'] },
  { name: 'Bahasa Arab', cat: 'SMA/MA', level: ['sma'] },
  { name: 'Bahasa Jepang', cat: 'SMA/MA', level: ['sma'] },
  { name: 'Bahasa Mandarin', cat: 'SMA/MA', level: ['sma'] },
  { name: 'Bahasa Jerman', cat: 'SMA/MA', level: ['sma'] },
  { name: 'Bahasa Perancis', cat: 'SMA/MA', level: ['sma'] },
  { name: 'Statistika', cat: 'SMA/MA', level: ['sma'] },
  { name: 'Bahasa Korea', cat: 'SMA/MA', level: ['sma'] },

  // SMK / VOCATIONAL
  { name: 'Dasar-Dasar Program Keahlian', cat: 'SMK', level: ['smk'] },
  { name: 'Konsentrasi Keahlian', cat: 'SMK', level: ['smk'] },
  { name: 'Produk Kreatif dan Kewirausahaan', cat: 'SMK', level: ['smk'] },
  { name: 'Projek Kreatif dan Kewirausahaan', cat: 'SMK', level: ['smk'] },
  { name: 'Teknik Komputer dan Jaringan', cat: 'SMK', level: ['smk'] },
  { name: 'Pengembangan Perangkat Lunak dan Gim', cat: 'SMK', level: ['smk'] },
  { name: 'Rekayasa Perangkat Lunak', cat: 'SMK', level: ['smk'] },
  { name: 'Desain Komunikasi Visual', cat: 'SMK', level: ['smk'] },
  { name: 'Akuntansi', cat: 'SMK', level: ['smk'] },
  { name: 'Manajemen Perkantoran', cat: 'SMK', level: ['smk'] },
  { name: 'Bisnis Digital', cat: 'SMK', level: ['smk'] },
  { name: 'Pemasaran', cat: 'SMK', level: ['smk'] },
  { name: 'Teknik Elektronika', cat: 'SMK', level: ['smk'] },
  { name: 'Teknik Otomotif', cat: 'SMK', level: ['smk'] },
  { name: 'Teknik Ketenagalistrikan', cat: 'SMK', level: ['smk'] },
  { name: 'Teknik Mesin', cat: 'SMK', level: ['smk'] },
  { name: 'Teknik Konstruksi', cat: 'SMK', level: ['smk'] },
  { name: 'Tata Boga', cat: 'SMK', level: ['smk'] },
  { name: 'Perhotelan', cat: 'SMK', level: ['smk'] },
  { name: 'Tata Busana', cat: 'SMK', level: ['smk'] },
  { name: 'Agribisnis', cat: 'SMK', level: ['smk'] },
  { name: 'Kesehatan', cat: 'SMK', level: ['smk'] },
  { name: 'Ekonomi Digital', cat: 'SMK', level: ['smk'] }
];

const LEVELS = [
  { id: 'sd', label: 'SD / MI' },
  { id: 'smp', label: 'SMP / MTs' },
  { id: 'sma', label: 'SMA / MA' },
  { id: 'smk', label: 'SMK' },
  { id: 'paket', label: 'Pend. Kesetaraan (Paket)' },
  { id: 'other', label: 'Lainnya / kustom' }
];

// normalize for display + duplicate checks (trim + collapse spaces)
function normName(s) { return String(s || '').trim().replace(/\s+/g, ' '); }

// case-insensitive duplicate check across a list of names
function isDupe(name, existingNames) {
  const n = normName(name).toLowerCase();
  if (!n) return false;
  return (existingNames || []).some(x => normName(x).toLowerCase() === n);
}

// validate a user-created subject → { ok, error }
function validateCustom(name) {
  const n = normName(name);
  if (!n) return { ok: false, error: 'Tulis nama mata pelajarannya' };
  if (n.length > 48) return { ok: false, error: 'Nama terlalu panjang (maks 48 karakter)' };
  return { ok: true, name: n };
}

// suggestions: catalog rows for a level, optionally filtered by query.
// 'other'/'paket' levels suggest the general set (user picks freely).
function suggestionsFor(levelId, query) {
  // known level → its rows; anything else (paket/other/nul) → general spread
  const lv = ['sd', 'smp', 'sma', 'smk'].includes(levelId) ? [levelId] : ['sd', 'smp', 'sma', 'smk'];
  const q = normName(query).toLowerCase();
  return CATALOG.filter(r => r.level.some(x => lv.includes(x)))
    .filter(r => !q || r.name.toLowerCase().includes(q) || (r.full || '').toLowerCase().includes(q));
}

// == mvp1 import helpers (pure, shared with app.js) ==
// keep only user settings; never import device-specific sync keys
const SYNC_KEYS = ['server_space', 'feed_cursor'];
function filterImportSettings(rows) {
  return (rows || []).filter(r => r && r.k && !SYNC_KEYS.includes(r.k));
}

const SUB = {
  CATALOG, LEVELS,
  normName, isDupe, validateCustom, suggestionsFor,
  filterImportSettings
};

if (typeof window !== 'undefined') window.SUBJECTS = SUB;
if (typeof module !== 'undefined' && module.exports) module.exports = SUB;
