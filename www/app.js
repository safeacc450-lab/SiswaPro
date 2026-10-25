'use strict';
// ============================================================
// SiswaPro MVP Phase 1 shell — v1.3 UX onto SQLite (LocalDb).
// Storage: www/localdb.js (Capacitor plugin, single local
// personal space). v1.3's localStorage/IndexedDB store is NOT
// read, imported or touched (spec D-0/D-8 — no migration).
// Sync comes in Phase 2/3; offline-only here, airplane-mode
// safe by construction.
// ============================================================

// ---------- utils ----------
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const HARI = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const HARI3 = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
const PAL = ['#6366f1','#06b6d4','#16a34a','#ea580c','#8b5cf6','#db2777','#0ea5e8','#65a30d'];
const colorOf = s => { let h=0; for(const c of s) h=(h*31+c.charCodeAt(0))>>>0; return PAL[h%PAL.length]; };
const tm = t => { const [a,b]=t.split(':').map(Number); return a*60+Number(b); };
const iso = d => { const x=d||new Date(); return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0'); };
const pad = n => String(n).padStart(2,'0');
const hexToRgba = (hex,a) => { const n=parseInt(hex.slice(1),16); return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a+')'; };

function toast(msg){ const t=$('toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove('show'),2300); }
function upTop(){ window.scrollTo({top:0,behavior:'smooth'}); }
function buzz(ms){ if(navigator.vibrate) navigator.vibrate(ms||300); }
function beep(){
  try{
    const A = window.__ac || (window.__ac = new (window.AudioContext||window.webkitAudioContext)());
    [880,1108,1318].forEach((f,i)=>{
      const o=A.createOscillator(), g=A.createGain();
      o.frequency.value=f; o.type='sine';
      g.gain.setValueAtTime(.001,A.currentTime+i*.22);
      g.gain.exponentialRampToValueAtTime(.18,A.currentTime+i*.22+.03);
      g.gain.exponentialRampToValueAtTime(.0001,A.currentTime+i*.22+.2);
      o.connect(g); g.connect(A.destination);
      o.start(A.currentTime+i*.22); o.stop(A.currentTime+i*.22+.21);
    });
  }catch(e){}
}

// ---------- state (mirror of DB rows; writes go through LocalDb) ----------
const DEFAULT = {
  ob:false, nama:'', preset:25, accent:0, dark:false,
  mapel:[], jadwal:[], pr:[], hist:[]
};
let S = structuredClone(DEFAULT);
let mapelId = {};           // name -> subjects.id

// hydrate from LocalDb
async function hydrate(){
  const kv = await LocalDb.settingsAll();
  S.ob    = kv.onboarded === '1';
  S.nama  = kv.nama || '';
  S.preset= Number(kv.preset) || 25;
  S.accent= Number(kv.accent) || 0;
  S.dark  = kv.dark === '1' ? true : kv.dark === 'b' ? 'black' : false;

  const subs = await LocalDb.subjectsAll();
  S.mapel = subs.map(r=>({ id:r.id, name:r.name, teacher:r.teacher||'' }));
  mapelId = {};
  subs.forEach(r=>{ mapelId[r.name]=r.id; });

  S.jadwal = await LocalDb.scheduleAll();
  S.pr = (await LocalDb.tasksAll()).map(r=>({ id:r.id, t:r.title, m:r.subject, d:!!r.done, due:r.due||'' }));

  const focus = await LocalDb.focusByDay();
  S.hist = Object.keys(focus).map(d=>({d, m:focus[d]})).filter(e=>e.m>0).sort((a,b)=>a.d<b.d?-1:1).slice(-30);
}

// persist profile settings (returns Promise; UI may fire-and-forget)
function save(){
  return Promise.all([
    LocalDb.setSetting('onboarded', S.ob?'1':'0'),
    LocalDb.setSetting('nama', S.nama),
    LocalDb.setSetting('preset', S.preset),
    LocalDb.setSetting('accent', S.accent),
    LocalDb.setSetting('dark', S.dark===false?'0':S.dark==='black'?'b':'1'),
    LocalDb.setSetting('quote_i', S.quoteI||0)
  ]);
}
const persist = err => { if(err) console.error('persist failed', err); };

// ---------- tema ----------
const THEMES = [
  // persona: Lea = blue, Violet = violet (favorit mereka, 2026-10-24);
  // biru selaras palet login (#2563eb family)
  {a:'#2563eb',a2:'#1d4ed8',soft:'#dbeafe',text:'#1e40af',bar:'#2563eb'},
  {a:'#7c3aed',a2:'#6d28d9',soft:'#ede9fe',text:'#5b21b6',bar:'#7c3aed'},
  {a:'#16a34a',a2:'#0d9488',soft:'#dcfce7',text:'#166534',bar:'#16a34a'},
  {a:'#e11d48',a2:'#f43f5e',soft:'#ffe4e6',text:'#9f1239',bar:'#e11d48'}
];
// persona-driven accent (dipanggil setelah identity diketahui)
function personaTheme(idty){
  if (!idty || !idty.role) return;
  const i = idty.role === 'Lea' ? 0 : idty.role === 'Violet' ? 1 : null;
  if (i === null || S.accent === i) return;
  S.accent = i; applyAcc(i); save().catch(persist);
}
function applyAcc(i){
  S.accent=i; const t=THEMES[i], r=document.documentElement.style;
  r.setProperty('--a',t.a); r.setProperty('--a2',t.a2);
  r.setProperty('--a-soft',t.soft); r.setProperty('--a-text',t.text);
  r.setProperty('--bar',t.bar);
  r.setProperty('--glow',hexToRgba(t.a,.38));
  r.setProperty('--gline',hexToRgba(t.a,.5));
  document.querySelector('meta[name=theme-color]').content = S.dark === 'black' ? '#000000' : S.dark ? '#141c2e' : t.bar;
  [0,1,2,3].forEach(n=>{ const b=$('acc-'+n); if(b) b.classList.toggle('on', n===i); });
  save().catch(persist);
}
function setAcc(i){ applyAcc(i); toast('Tema warna diganti ✓'); }
function toggleDark(){
  // cycle: OFF → ON → HITAM (AMOLED pekat) → OFF
  S.dark = !S.dark ? true : (S.dark === true ? 'black' : false);
  applyDark(); renderHome(); save().catch(persist);
  const lbl = S.dark===false ? '🌙 Mode Gelap: OFF' : S.dark==='black' ? '⬛ Mode Gelap: HITAM' : '☀️ Mode Gelap: ON';
  $('dark-btn').textContent = lbl;  toast(S.dark===false ? 'Mode terang aktif' : S.dark==='black' ? 'Mode gelap pekat aktif' : 'Mode gelap aktif');
}
function applyDark(){
  document.body.classList.toggle('dark', !!S.dark);
  document.body.classList.toggle('black', S.dark==='black');
  // light mode: applyAcc already set the accent meta color — don't clobber it
  if (S.dark) document.querySelector('meta[name=theme-color]').content =
    S.dark==='black' ? '#000000' : '#141c2e';
}

// ---------- onboarding: kartu 1 identitas, kartu 2 jenjang + mapel ----------
function obPick(i,el){
  document.querySelectorAll('#ob .acc').forEach(b=>b.classList.remove('on'));
  el.classList.add('on'); applyAcc(i);
}
function obStep2(){
  S.nama = $('ob-nama').value.trim() || 'Siswa';
  $('ob-1').style.display='none';
  $('ob-2').style.display='block';
  renderObPick();
}
// pick state kartu onboarding (json nama -> guru ''; helper render ulang)
let obPicked=new Set(), obLevel=null;
function renderObPick(){
  const lvBox=$('ob-levels');
  lvBox.innerHTML = SUBJECTS.LEVELS.map(l=>
    '<button class="day-chip '+(l.id===obLevel?'on':'')+'" onclick="obSetLevel(\''+l.id+'\')">'+esc(l.label)+'</button>').join('');
  const q=SUBJECTS.normName($('ob-search').value).toLowerCase();
  const rows=SUBJECTS.suggestionsFor(obLevel||'sd', q);   // level null → subset umum lewat kosong
  const pool = obLevel ? SUBJECTS.suggestionsFor(obLevel,q) : SUBJECTS.CATALOG.filter(r=>r.level.includes('sd')||r.level.includes('smp')).filter(r=>!q||r.name.toLowerCase().includes(q));
  $('ob-pick').innerHTML = pool.length? pool.map(r=>{
    const on=obPicked.has(r.name);
    const arg=r.name.replace(/'/g,'');
    return `<div class="mapel-row ${on?'picked':''}">
      <span class="swatch" style="background:${colorOf(r.name)}"></span>
      <span style="flex:1;min-width:0;font-size:13px;font-weight:600">${esc(r.name)}${r.full&&r.name!==r.full?' <small style="color:var(--muted)">'+esc(r.full)+'</small>':''}</span>
      <button class="btn-add2 ${on?'on':''}" onclick="obToggle('${arg}')">${on?'✓':'+'}</button>
    </div>`;
  }).join('') : '<div class="empty">Tidak ditemukan? Buat sendiri nanti di Pengaturan.</div>';
  $('ob-count').textContent=obPicked.size;
}
function obSetLevel(id){ obLevel=id; renderObPick(); }
function obPickSearch(){ renderObPick(); }
function obToggle(name){ obPicked.has(name)? obPicked.delete(name) : obPicked.add(name); renderObPick(); }
async function obFinish(skip){
  try{
    if(!skip){
      for(const name of obPicked){
        const v=SUBJECTS.validateCustom(name); if(!v.ok) continue;
        const id=await LocalDb.subjectAdd(v.name);
        S.mapel.push({id,name:v.name,teacher:''}); mapelId[v.name]=id;
      }
    }
    if(obLevel) await LocalDb.setSetting('level', obLevel);
  }catch(e){ console.warn('ob subject save failed', e); }
  S.ob=true;
  await save();
  $('ob').style.display='none';
  $('ob-2').style.display='none'; $('ob-1').style.display='block';
  renderAll();
  toast('Selamat belajar, '+S.nama+'! 🚀');
  // login TIDAK dipaksa setelah onboarding — pintu: kartu akun + chip sinkron
}

// waktu util
function nowMin(){ const n=new Date(); return n.getHours()*60+n.getMinutes(); }
function hariIni(){ return HARI[new Date().getDay()]; }

// ---------- BERANDA ----------
const QUOTES = [
  'Belajar sedikit tapi rutin lebih kuat dari belajar banyak tapi sekali.',
  'Ujian tidak menguji hafalanmu, tapi kebiasaan belajarmu.',
  'Catat ulang dengan bahasamu sendiri — itu cara tercepat paham.',
  'Sedikit demi sedikit lama-lama jadi buku. Belajar pun begitu.',
  'Fokus 25 menit itu keren — kamu menang lawan rasa malas.',
  'Jadwal yang teratur membuat beban belajar terbagi rata.',
  'Kerjakan tugas yang paling tidak disukai duluan. Itu disiplin.',
  'Nonton video tanpa mencatat = nonton hiburan, bukan belajar.',
  'Istirahat bagian dari belajar, bukan lawannya.',
  'Kalau bingung, bertanya tidak pernah salah.',
  'Nilai sehat lahir dari kebiasaan rapi sejak hari-hari biasa.',
  'Perbandingan terbaik adalah dirimu kemarin.',
  'Meja yang rapi, pikiran pun rapi.',
  'Kebiasaan baik adalah modal terbesar pelajar.'
];
function renderHome(){
  const now=new Date(), wd=HARI[now.getDay()], nama=S.nama||'Siswa';
  const bulan = now.toLocaleDateString('id-ID',{month:'long'});
  $('h-date').textContent=(wd+', '+now.getDate()+' '+bulan).toUpperCase();
  const h=now.getHours();
  const sapa = h<11?'Semangat Pagi':(h<15?'Semangat Siang':(h<18?'Semangat Sore':'Malam Tenang'));
  $('h-greet').textContent = S.nama? sapa+', '+nama+'! 👋' : 'Selamat datang! 👋';
  $('h-sub').textContent = S.nama? 'Semua catatanmu tersimpan di perangkat. Lanjutkan belajarmu!' : 'Isi namamu di Pengaturan ⚙️';

  $('s-pr').textContent = S.pr.filter(p=>!p.d).length;
  const listToday = S.jadwal.filter(j=>j.day===wd).sort((a,b)=>a.start.localeCompare(b.start));
  $('s-mapel').textContent = listToday.length;
  const todayIso=iso(now), todayE=S.hist.find(e=>e.d===todayIso);
  $('s-fokus').textContent = ((todayE&&todayE.m)||0)+'m';

  // timeline hari ini
  const nm=nowMin();
  if(listToday.length){
    $('tl').innerHTML = listToday.map((j,i)=>statusJd(j,nm,i)).join('');
  } else {
    $('tl').innerHTML = '<div class="empty"><div class="e-ico">🗓️</div>'+(wd==='Minggu'||wd==='Sabtu'?'Hari libur — saatnya mengisi energi buat besok!':'Belum ada jadwal hari ini.<br>Tambahkan di tab Jadwal.')+'</div>';
  }

  // PR dekat
  const open = S.pr.filter(p=>!p.d).sort((p,q)=>(p.due||'zzz')<(q.due||'zzz')?-1:1);
  $('h-pr').innerHTML = open.length ? open.slice(0,3).map((p)=>prItem(p, S.pr.indexOf(p), true)).join('') : '<div class="empty"><div class="e-ico">🎉</div>Tidak ada tugas mendekati tenggat. Mantap!</div>';

  // quote hari
  $('h-quote').textContent = '\u201C'+QUOTES[new Date().getDate()%QUOTES.length]+'\u201D';
}
function statusJd(j,nm,idx){
  const [eh,em]=j.end.split(':').map(Number), [sh,sm]=j.start.split(':').map(Number);
  const startM=sh*60+sm, endM=eh*60+em;
  if(endM<nm) return `
    <div class="item fade">
      <div><div class="t1 done-t"><span class="tag" style="background:${colorOf(j.m)};margin-right:6px;opacity:.7">Jam ${idx+1}</span>${esc(j.m)} ✓</div>
      <div class="t2">${j.start} - ${j.end}${j.room?' • '+esc(j.room):''}</div></div>
      <span class="time-tag" style="opacity:.5">Selesai</span>
    </div>`;
  if(startM<=nm){
    const pct=Math.round((nm-startM)/(endM-startM)*100);
    return `
    <div class="item jamnow">
      <div style="flex:1">
        <div class="t1"><span class="tag" style="background:${colorOf(j.m)};margin-right:6px">Jam ${idx+1}</span>${esc(j.m)}<span class="pill" style="margin-left:6px">SEDANG</span></div>
        <div class="t2">${j.start} - ${j.end}${j.room?' • '+esc(j.room):''} • ${endM-nm} menit lagi</div>
        <div class="prog"><i style="width:${pct}%"></i></div>
      </div>
      <span class="time-tag">${j.start}</span>
    </div>`;
  }
  return `
    <div class="item">
      <div><div class="t1"><span class="tag" style="background:${colorOf(j.m)};margin-right:6px">Jam ${idx+1}</span>${esc(j.m)}</div>
      <div class="t2">${j.start} - ${j.end}${j.room?' • '+esc(j.room):''}</div></div>
      <span class="time-tag">${j.start}</span>
    </div>`;
}

// ---------- TUGAS ----------
let prFilter='all';
function setFilter(f,el){ prFilter=f; document.querySelectorAll('.fchip').forEach(b=>b.classList.remove('on')); el.classList.add('on'); renderPR(); }
function dueInfo(p){
  if(!p.due) return null;
  const t=iso(new Date());
  if(p.due<t) return {cls:'late', tag:'TERLAMBAT', color:'#dc2626'};
  if(p.due===t) return {cls:'duetoday', tag:'HARI INI', color:'#b45309'};
  const n=Math.round((new Date(p.due+'T00:00')-new Date(t+'T00:00'))/864e5);
  return {cls:'', tag:n+' hari lagi', color:'#64748b'};
}
function renderPR(){
  let rows = S.pr.map((p,i)=>({p,i})).filter(({p})=>
    prFilter==='all' ? true : prFilter==='done' ? p.d : !p.d && (prFilter!=='today' || p.due===iso(new Date()))
  );
  rows.sort((a,b)=> (a.p.d-b.p.d) || ((a.p.due||'zzz').localeCompare(b.p.due||'zzz')));
  $('list-pr').innerHTML = rows.length ? rows.map(({p,i})=>prItem(p,i,false)).join('')
    : '<div class="empty"><div class="e-ico">'+(prFilter==='done'?'🗑️':'🎉')+'</div>'+(prFilter==='done'?'Belum ada yang selesai.':'Tidak ada tugas di sini.')+'</div>';

  const total=S.pr.length, selesai=S.pr.filter(p=>p.d).length;
  $('pr-prog').textContent=selesai+'/'+total+' selesai';
  $('pr-bar').style.width = total? (selesai/total*100)+'%':'0';
}
function prItem(p, i, compact){
  const di=dueInfo(p);
  return `
  <div class="item ${p.d?'fade':''} ${di&&!p.d?di.cls:''}" onclick="tog(${i})">
    <div style="flex:1;min-width:0">
      <div class="t1 ${p.d?'done-t':''}">${esc(p.t)}</div>
      <div class="t2" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:5px">
        <span class="tag" style="background:${colorOf(p.m)}">${esc(p.m)}</span>
        ${di&&!p.d?`<span class="tag" style="background:transparent;color:${di.color};border:1.5px solid ${di.color}">${di.tag}</span>`:''}
        ${p.d?'<span class="tag" style="background:#16a34a">SELESAI</span>':''}
      </div>
    </div>
    <button class="btn-ico" onclick="event.stopPropagation();del(${i})">🗑️</button>
  </div>`;
}
function tambahPR(){
  const t=$('in-pr').value.trim(), m=$('in-mapel').value||'', due=$('in-due').value||'';
  if(!t){ toast('Tulis dulu judul tugasnya'); return; }
  LocalDb.taskAdd({t,m,due}).then(id=>{ S.pr.unshift({id,t,m,d:false,due}); renderPR(); }).catch(persist);
  $('in-pr').value=''; $('in-due').value='';
  toast('Tugas ditambahkan ✓');
}
function tog(i){ const p=S.pr[i]; p.d=!p.d; LocalDb.taskSetDone(p.id,p.d).catch(persist); renderPR(); if(p.d){ buzz(200); toast('Tugas selesai. Kerja bagus!'); } }
function del(i){ if(confirm('Hapus tugas ini?')){ const p=S.pr[i]; LocalDb.taskDel(p.id).catch(persist); S.pr.splice(i,1); renderPR(); } }

// ---------- JADWAL ----------
let jdDay=null;
const D_LIST=['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
function renderJd(){
  const ud=new Date().getDay();
  if(!jdDay) jdDay=D_LIST[ud===0?0:ud-1]||'Senin';
  $('day-chips').innerHTML = D_LIST.map(d=>`<button class="day-chip ${d===jdDay?'on':''}" onclick="pilihHari('${d}')">${d}</button>`).join('');
  $('jd-title').textContent='Jadwal Pelajaran ('+jdDay+')';
  const rows=S.jadwal.filter(j=>j.day===jdDay).sort((a,b)=>a.start.localeCompare(b.start));
  const isToday = jdDay===hariIni();
  const nm=nowMin();
  $('list-jd').innerHTML = rows.length ? rows.map((j,no)=>`
    <div class="item ${isToday&&tm(j.start)<=nm&&tm(j.end)>nm?'jamnow':''}">
      <div style="flex:1;min-width:0">
        <div class="t1"><span class="tag" style="background:${colorOf(j.m)};margin-right:6px">Jam ${no+1}</span>${esc(j.m)}${isToday&&tm(j.start)<=nm&&tm(j.end)>nm?'<span class="pill" style="margin-left:6px">SEDANG</span>':''}</div>
        <div class="t2">${j.start} - ${j.end} • ${(tm(j.end)-tm(j.start))} menit${j.room?' • '+esc(j.room):''}</div>
      </div>
      <button class="btn-ico" onclick="delJd(${S.jadwal.indexOf(j)})">🗑️</button>
    </div>`).join('')
    : '<div class="empty"><div class="e-ico">🗓️</div>Belum ada jam pelajaran hari '+jdDay+'.<br>Tambahkan lewat form di bawah.</div>';
}
function pilihHari(d){ jdDay=d; renderJd(); }
function tambahJd(){
  const m=$('in-jd-mapel').value, start=$('in-jd-start').value, end=$('in-jd-end').value, room=$('in-jd-room').value.trim();
  if(!m){ toast('Pilih mapel dulu (kelola di Pengaturan)'); return; }
  if(!start||!end||tm(end)<=tm(start)){ toast('Periksa jam mulai dan selesai'); return; }
  const bentrok=S.jadwal.find(j=>j.day===jdDay && tm(start)<tm(j.end) && tm(end)>tm(j.start));
  LocalDb.scheduleAdd({m,day:jdDay,start,end,room}).then(id=>{ S.jadwal.push({id,m,day:jdDay,start,end,room}); renderJd(); }).catch(persist);
  renderJd();
  toast(bentrok ? 'Ditambahkan, tapi bentrok dengan '+esc(bentrok.m)+' ⚠️' : 'Jam pelajaran ditambahkan ✓');
}
function delJd(i){ if(confirm('Hapus jam pelajaran ini?')){ LocalDb.scheduleDel(S.jadwal[i].id).catch(persist); S.jadwal.splice(i,1); renderJd(); } }

// ---------- FOKUS ----------
let dur=25*60, sisa=25*60, tmr=null, preset=25, paused=false;
function fmt(x){ return pad(Math.floor(x/60))+':'+pad(x%60); }
function setPreset(p,el){
  preset=p; dur=p*60; sisa=dur; stopT(); paused=false; S.preset=p;
  document.querySelectorAll('.preset').forEach(b=>b.classList.remove('on')); el.classList.add('on');
  ring(0); $('timer-box').textContent=fmt(sisa); $('ring-state').textContent='SIAP MULAI';
  $('btn-timer').textContent='▶ Mulai Belajar';
  save().catch(persist);
}
function ring(pct){ $('ring').style.background='conic-gradient(var(--a) '+pct+'%, var(--ring-bg) '+pct+'%)'; }
function stopT(){ clearInterval(tmr); tmr=null; }
function toggleTimer(){
  if(tmr){ stopT(); paused=true; $('btn-timer').textContent='▶ Lanjutkan'; $('ring-state').textContent='DIJEDA'; return; }
  tmr=setInterval(()=>{
    sisa--;
    ring(((dur-sisa)/dur*100)); $('timer-box').textContent=fmt(sisa);
    if(sisa<=0) selesai();
  },1000);
  if(!paused) $('ring-state').textContent='FOKUS • '+preset+' MENIT';
  $('btn-timer').textContent='⏸ Jeda';
}
function resetTimer(){
  stopT(); paused=false; sisa=dur;
  ring(0); $('timer-box').textContent=fmt(sisa);
  $('ring-state').textContent='SIAP MULAI'; $('btn-timer').textContent='▶ Mulai Belajar';
}
function selesai(){
  stopT(); paused=false;
  beep(); buzz(1500);
  const d=iso(new Date());
  LocalDb.focusAdd(d, preset).then(()=>LocalDb.focusByDay()).then(focus=>{
    S.hist = Object.keys(focus).map(day=>({d:day, m:focus[day]})).filter(e=>e.m>0).sort((a,b)=>a.d<b.d?-1:1).slice(-30);
    renderBars(); renderStreak();
  }).catch(persist);
  toast('Fokus '+preset+' menit selesai! 🎉');
  sisa=dur; ring(0); $('timer-box').textContent=fmt(sisa);
  $('ring-state').textContent='SELESAI ✓';
  $('btn-timer').textContent='▶ Mulai Lagi';
}
function renderBars(){
  const days=[];
  for(let i=6;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); days.push(d); }
  const max=Math.max(30, ...days.map(d=>{ const e=S.hist.find(x=>x.d===iso(d)); return e?e.m:0; }));
  $('bars').innerHTML = days.map(d=>{
    const e=dayMin(iso(d));
    const h=Math.round((e/max)*70)+5;
    const lbl=HARI3[d.getDay()];
    return '<div class="bar-col '+(d.getDate()===new Date().getDate()?'now':'')+'"><i style="height:'+h+'px"></i><span>'+lbl+'</span></div>';
  }).join('');
}
function dayMin(d){ const e=S.hist.find(x=>x.d===d); return e?e.m:0; }
function renderStreak(){
  let streak=0, d=new Date();
  if(dayMin(iso(d))===0) d.setDate(d.getDate()-1);
  while(dayMin(iso(d))>0){ streak++; d.setDate(d.getDate()-1); }
  $('streak-sub').innerHTML = streak>0? ('🔥 Streak belajarmu: <b>'+streak+'</b> hari berturut-turut — pertahankan ya!') : 'Belajar fokus hari ini untuk memulai streak 🔥!';
}

// ---------- RAPOR ----------
function hitung(){
  const t=+$('nt').value||0,u=+$('nu').value||0,a=+$('na').value||0;
  const tot=(t*.25)+(u*.35)+(a*.4);
  const g=tot>=85?'A — Sangat baik':tot>=75?'B — Baik':tot>=60?'C — Cukup, ayo lebih giat':'D — Perlu belajar lagi';
  const col=tot>=75?'#16a34a':tot>=60?'#ea580c':'#dc2626';
  $('hasil-box').style.display='block';
  $('hasil-n').textContent=tot.toFixed(1);
  $('hasil-p').textContent='Predikat: '+g;
  $('hasil-n').style.color=col; $('hasil-p').style.color=col;
  $('hasil-ring').style.background='conic-gradient('+col+' '+tot+'%, var(--ring-bg) '+tot+'%)';
  buzz(200);
}

// ---------- PENGATURAN ----------
function simpanNama(){
  S.nama=$('in-nama').value.trim();
  save().catch(persist); renderHome(); toast(S.nama? 'Nama disimpan ✓':'Nama dikosongkan');
}
// ---------- MATA PELAJARAN (katalog + custom, id-keyed) ----------
// state katalog picker
let pickQ='', pickLevel=null;      // pickLevel: null=semua
function mapelNames(){ return S.mapel.map(r=>r.name); }
function renderMapelSelect(){
  const o=S.mapel.map(r=>'<option>'+esc(r.name)+'</option>').join('');
  if($('in-mapel')) $('in-mapel').innerHTML=o||'<option value="">Belum ada mapel — tambahkan dulu di Pengaturan</option>';
  if($('in-jd-mapel')) $('in-jd-mapel').innerHTML=o;
}
function renderMapelList(){
  const box=$('list-mapel'); if(!box) return;
  box.innerHTML = S.mapel.length? S.mapel.map(r=>{
    const n=S.jadwal.filter(j=>j.m===r.name).length + S.pr.filter(p=>p.m===r.name).length;
    const tid=r.teacher? '<span class="tag" style="background:'+colorOf(r.name)+';opacity:.85">👤 '+esc(r.teacher)+'</span>':'';
    return `<div class="mapel-row">
      <span class="swatch" style="background:${colorOf(r.name)}"></span>
      <span style="flex:1;min-width:0;font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(r.name)}</span>
      ${tid}
      <span class="use-badge">${n} dipakai</span>      <button class="btn-ico" title="Ganti nama" onclick="renameMapel('${r.id}')">✏️</button>
      <button class="btn-ico" onclick="delMapel('${r.id}')">🗑️</button>
    </div>`;
  }).join('') : '<div class="empty">Belum ada mapel. Ambil dari katalog atau buat sendiri!</div>';
  const cnt=$('mapel-count'); if(cnt) cnt.textContent=S.mapel.length+' terpilih';
}
function renderMapelPick(){
  const box=$('pick-list'); if(!box) return;
  const lvBox=$('pick-levels');
  if (lvBox && !lvBox.dataset.ready){
    lvBox.innerHTML='<button class="fchip on" onclick="pickLevelBtn(null,this)">Semua</button>'+
      SUBJECTS.LEVELS.filter(l=>['sd','smp','sma','smk'].includes(l.id)).map(l=>
        '<button class="fchip" onclick="pickLevelBtn(\''+l.id+'\',this)">'+l.label.replace(' / ','/').replace('Pend. Kesetaraan (Paket)','Paket')+'</button>').join('');
    lvBox.dataset.ready='1';
  }
  const sel=new Set(mapelNames().map(x=>x.toLowerCase()));
  const q=SUBJECTS.normName(pickQ).toLowerCase();
  const rows=SUBJECTS.CATALOG.filter(r=>(!pickLevel||r.level.includes(pickLevel)) &&
    (!q||r.name.toLowerCase().includes(q)||(r.full||'').toLowerCase().includes(q)));
  box.innerHTML = rows.length? rows.map(r=>{
    const on=sel.has(r.name.toLowerCase());
    // onclick arg: single-quote-safe inline attr (catalog names have no quotes)
    const arg=r.name.replace(/'/g,'');
    const nm=esc(r.name)+(r.full&&r.name!==r.full?' <small style="color:var(--muted)">'+esc(r.full)+'</small>':'');
    return `<div class="mapel-row">
      <span class="swatch" style="background:${colorOf(r.name)}"></span>
      <span style="flex:1;min-width:0;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${nm}</span>
      <button class="${on?'btn-ico':'btn-add2'}" onclick="${on?'removeCatalog':'addCatalog'}('${arg}')">${on?'− hapus':'+'}</button>
    </div>`;
  }).join('') : '<div class="empty">Tidak ditemukan di katalog? Buat sendiri di bawah \u{1F447}</div>';
}
function pickLevelBtn(id,el){ pickLevel=id; document.querySelectorAll('#pick-levels .fchip').forEach(b=>b.classList.remove('on')); el.classList.add('on'); renderMapelPick(); }
function pickQChange(el){ pickQ=el.value; renderMapelPick(); }
async function addCatalog(name){
  name=SUBJECTS.normName(name);
  if(SUBJECTS.isDupe(name,mapelNames())){ toast('Mapel sudah ada'); return; }
  try{ const id=await LocalDb.subjectAdd(name); S.mapel.push({id,name,teacher:''}); mapelId[name]=id; renderMapelPick(); renderMapelList(); renderMapelSelect(); toast('Mapel ditambahkan ✓'); }
  catch(e){ toast(e.message||'Gagal menambahkan mapel'); }
}


// mapel custom: "+ Tambah Mata Pelajaran Sendiri"
function toggleCustomForm(){
  const f=$('custom-form'); if(!f) return;
  f.style.display = f.style.display==='none' ? 'block' : 'none';
  if(f.style.display==='block') $('in-custom-name').focus();
}
async function tambahMapel(){
  const nm=$('in-custom-name'), tc=$('in-custom-teacher');
  const v=SUBJECTS.validateCustom(nm.value);
  if(!v.ok){ toast(v.error); return; }
  if(SUBJECTS.isDupe(v.name,mapelNames())){ toast('Mapel sudah ada'); return; }
  try{
    const id=await LocalDb.subjectAdd(v.name, SUBJECTS.normName(tc.value));
    S.mapel.push({id,name:v.name,teacher:SUBJECTS.normName(tc.value)});
    mapelId[v.name]=id;
    nm.value=''; tc.value='';
    renderMapelPick(); renderMapelList(); renderMapelSelect();
    toggleCustomForm();
    toast('Mapel sendiri ditambahkan ✓');
  }catch(e){ toast(e.message||'Gagal menambahkan mapel'); }
}
async function renameMapel(id){
  const row=S.mapel.find(r=>r.id===id); if(!row) return;
  const nn=prompt('Nama baru untuk "'+row.name+'":', row.name);
  if(nn===null) return;
  const v=SUBJECTS.validateCustom(nn); if(!v.ok){ toast(v.error); return; }
  if(SUBJECTS.isDupe(v.name,mapelNames().filter(x=>x!==row.name))){ toast('Nama sudah dipakai mapel lain'); return; }
  try{
    await LocalDb.subjectRename(id, v.name);
    delete mapelId[row.name]; mapelId[v.name]=id; row.name=v.name;
    await hydrate();       // tasks/schedule references moved by rename — re-sync state
    renderMapelPick(); renderMapelList(); renderMapelSelect(); renderPR(); renderJd(); renderHome();
    toast('Nama mapel diganti ✓');
  }catch(e){ toast(e.message||'Gagal mengganti nama mapel'); }
}
async function editTeacher(id){
  const row=S.mapel.find(r=>r.id===id); if(!row) return;
  const t=prompt('Nama guru (opsional) untuk "'+row.name+'":', row.teacher||'');
  if(t===null) return;
  const tn=SUBJECTS.normName(t);
  await LocalDb.subjectSetTeacher(id, tn).catch(persist);
  row.teacher=tn; renderMapelList();
  if(tn) toast('Nama guru disimpan ✓');
}
async function delMapel(id){
  const row=S.mapel.find(r=>r.id===id); if(!row) return;
  if(!confirm('Hapus mapel "'+row.name+'"? Jadwal dan tugas yang memakainya tetap ada.')) return;
  await LocalDb.subjectDel(id).catch(persist);
  S.mapel=S.mapel.filter(x=>x.id!==id); delete mapelId[row.name];
  renderMapelPick(); renderMapelList(); renderMapelSelect();
  toast('Mapel dihapus ✓');
}
async function removeCatalog(name){
  const row=S.mapel.find(r=>r.name.toLowerCase()===name.toLowerCase()); if(!row) return;
  await delMapel(row.id);
}

// ---------- EKSPOR / IMPOR (FR-14) ----------
function eksport(){
  LocalDb.exportAll().then(d=>{
    $('io-area').value=JSON.stringify(d);
    toast('Data diekspor. Salin teksnya ke tempat yang aman ✓');
  }).catch(()=>toast('Ekspor gagal — coba lagi'));
}
async function importData(){
  const v=$('io-area').value.trim();
  if(!v){ toast('Tempel dulu data cadangan ke kotak teks'); return; }
  let d;
  try{ d=JSON.parse(v); }catch(e){ toast('Data tidak valid — periksa teksnya, lalu coba lagi'); return; }

  // format MVP (mvp1): export keys = DB rows (title/subject), import maps
  // ke signature lokal (t/m/due/done); fokus + settings ikut, kecuali
  // cursor sinkron (jangan menarik cursor perangkat lain)
  if(d && d._v==='mvp1'){
    if(!Array.isArray(d.mapel)||!Array.isArray(d.jadwal)||!Array.isArray(d.tasks)) { toast('Struktur cadangan tidak lengkap — datanya mungkin terpotong'); return; }
    for(const s of d.mapel||[]) await LocalDb.subjectAdd(s.name || String(s));
    for(const j of d.jadwal) await LocalDb.scheduleAdd(j);
    for(const t of d.tasks) {
      const id = await LocalDb.taskAdd({ t: t.title || t.t, m: t.subject || t.m, due: t.due || '' });
      if (t.done) await LocalDb.taskSetDone(id, true);
    }
    for(const k in (d.focus||{})) { const m=Number(d.focus[k]); if(m>0) await LocalDb.focusAdd(String(k), m|0); }
    for(const row of (d.settings||[])) if(SUBJECTS.filterImportSettings([row]).length) await LocalDb.setSetting(row.k, String(row.v));
    toast('Data dipulihkan ✓');
    location.reload();
    return;
  }
  // format v1.x keepsake (mapel: [string], jadwal: [{m,day,start,end,room}], pr: [{t,m,d,due}], hist)
  if(Array.isArray(d.mapel)&&Array.isArray(d.jadwal)&&Array.isArray(d.pr)){
    for(const m of d.mapel) await LocalDb.subjectAdd(String(m));
    for(const j of d.jadwal) await LocalDb.scheduleAdd({m:String(j.m),day:String(j.day),start:String(j.start),end:String(j.end),room:String(j.room||'')});
    for(const p of d.pr) await LocalDb.taskAdd({t:String(p.t),m:String(p.m),due:String(p.due||'')});
    for(const h of (Array.isArray(d.hist)?d.hist:[])) if(h.d&&h.m) await LocalDb.focusAdd(String(h.d), Number(h.m)|0);
    if(d.nama) await LocalDb.setSetting('nama', String(d.nama));
    await LocalDb.setSetting('onboarded','1');
    toast('Data lama dipulihkan ✓');
    location.reload();
    return;
  }
  toast('Data tidak dikenali — ini bukan cadangan SiswaPro');
}
function resetAll(){
  if(!confirm('Yakin hapus SEMUA data (mapel, jadwal, tugas, fokus, pengaturan)?')) return;
  if(!confirm('Konfirmasi terakhir: proses tidak bisa dibatalkan.')) return;
  LocalDb.wipe().then(()=>location.reload()).catch(()=>toast('Reset gagal — coba lagi'));
}

// ---------- NAV ----------
const TABS=['home','pr','jadwal','fokus','nilai','set'];
function tab(target){
  TABS.forEach(k=>{
    $('v-'+k).style.display=(k===target?'block':'none');
    $('b-'+k).className='nav-item'+(k===target?' active':'');
  });
  if(target==='home') renderHome();
  if(target==='jadwal') renderJd();
  if(target==='pr') renderPR();
  if(target==='fokus'){ renderBars(); renderStreak(); }
  if(target==='set'){ $('in-nama').value=S.nama; $('dark-btn').textContent=S.dark===false?'🌙 Mode Gelap: OFF':S.dark==='black'?'⬛ Mode Gelap: HITAM':'☀️ Mode Gelap: ON'; refreshIdentityCard(); renderMapelPick(); }
  window.scrollTo({top:0,behavior:'smooth'});
}

// ---------- AKUN (pola aplikasi standar: avatar + nama + email + keluar) ----------
function refreshIdentityCard(){
  const card=$('acc-card'); if(!card) return;
  const ses = (window.Auth && Auth.session) ? Auth.session.user : null;
  const av=$('acc-avatar'), nm=$('acc-name'), em=$('acc-email'),
        st=$('identity-status'), lb=$('acc-logout'), ln=$('acc-login'), nt=$('acc-note');
  if (ses) {
    const role = Auth.identity && Auth.identity.role;
    const nmShow = S.nama || ses.user_metadata?.full_name || ses.email.split('@')[0];
    av.textContent = (nmShow[0]||'?').toUpperCase();
    nm.textContent = nmShow + (role ? ' · ' + role : '');
    em.textContent = ses.email || '';
    st.textContent = 'Sinkronisasi aktif ✓ — data kamu tersambung ke server.';
    lb.style.display=''; ln.style.display='none'; nt.style.display='';
    lb.onclick=async ()=>{
      if(!confirm('Keluar dari akun di aplikasi ini?')) return;
      if (Auth.logout) await Auth.logout(); else { try{ await Auth.client.auth.signOut(); }catch(e){} Auth.session=null; Auth.identity=null; }
      toast('Keluar ✓'); updateChip('Masuk'); $('auth').style.display='flex';
      $('acc-logout').style.display='none';
      refreshIdentityCard();
    };
  } else {
    av.textContent='?';
    nm.textContent='Belum masuk';
    em.textContent='Masuk untuk menyinkronkan data tugas';
    st.textContent = 'Mode lokal. Data tersimpan di perangkat ini.';
    lb.style.display='none'; ln.style.display=''; nt.style.display='none';
    ln.onclick=()=>{ $('auth').style.display='flex'; window.scrollTo(0,0); };
  }
}

// ---------- INIT ----------
function renderAll(){
  applyAcc(S.accent); applyDark();
  renderMapelSelect(); renderMapelList(); renderMapelPick(); renderHome(); renderPR(); renderJd(); renderBars(); renderStreak();
  $('in-nama').value=S.nama;
  $('dark-btn').textContent=S.dark===false?'🌙 Mode Gelap: OFF':S.dark==='black'?'⬛ Mode Gelap: HITAM':'☀️ Mode Gelap: ON';
  refreshIdentityCard();
  const chips=document.querySelectorAll('.preset');
  chips.forEach((b,idx)=>{ const p=[10,25,50][idx]; b.classList.toggle('on', p===S.preset); });
  preset=S.preset||25; dur=preset*60; sisa=dur;
}

// ---------- SINKRON CHIP (Phase 2 happy-path states) ----------
// States: 'Lokal' (no server config) · 'Masuk' (needs session) ·
// '<Identity>…' (syncing) · '<Identity> ✓' ok · '<Identity> ⚠️' error
function updateChip(mode) {
  const el = $('sync-chip'); if (!el) return;
  el.textContent = mode;
}
function syncChipTap(){
  if (Auth.ok && Auth.session && !Auth.identity /* not yet logged */) { tab('set'); return; }
  if (Auth.ok && Auth.session) manualSync(); else tab('set');
}

async function manualSync(){
  if (!Auth.ok || !Auth.session) { toast('Masuk dulu untuk menyinkronkan data'); tab('set'); return; }
  updateChip((Auth.identity && Auth.identity.role || 'Sinkron') + '…');
  try {
    const r = await Sync.syncNow();
    if (r && r.ok) { updateChip((Auth.identity && Auth.identity.role || '') + ' ✓'); toast('Sinkronisasi selesai ✓' + (r.pulled !== undefined && r.pulled ? ' — ' + r.pulled + ' perubahan diterima' : '')); await hydrate(); renderAll(); }
    else if (r && r.reason === 'offline') { updateChip('Sinkron ⚠️'); toast('Sedang offline — sinkronisasi menunggu koneksi internet.'); }
    else updateChip('Sinkron');
  } catch (e) {
    updateChip('Sinkron ⚠️');
    toast(syncErrMsg(e));
  }
}
// pesan jawab user, bukan log internal (HTTP dump / token dsb tidak boleh bocor)
function syncErrMsg(e){
  const m = String((e && e.message) || e || '');
  if (!navigator.onLine) return 'Sedang offline — sinkronisasi menunggu koneksi internet.';
  if (/fetch|network|timeout|aborted/i.test(m)) return 'Sinkronisasi gagal — periksa koneksi internet, lalu coba lagi.';
  if (/session expired|REAUTH|auth/i.test(m)) return 'Sesi masuk habis — masuk lagi, lalu coba sinkronisasi.';
  if (/HTTP 40[13]/.test(m)) return 'Sesi masuk tidak berlaku — keluar lalu masuk lagi ke akun.';
  return 'Sinkronisasi gagal — coba lagi.';
}

// ---------- LOGIN/SIGNUP (Phase 2; self-serve accounts signed-off
// 2026-10-23; personal space bootstrapped by Sync.resolveSpace) -------
const AUTH_LBL = { login:'Masuk', signup:'Daftar' };
let authMode = 'login';
function renderAuthMode(){
  const signup = authMode === 'signup';
  const t = $('auth-t'), p = $('auth-p'), btn = $('li-btn'), lnk = $('li-mode');
  if (t) t.textContent = signup ? 'Buat akun SiswaPro' : 'Selamat datang kembali!';
  if (p) p.textContent = signup
    ? 'Daftar dengan email untuk menjaga catatan belajarmu lintas perangkat. Kata sandi minimal 6 karakter.'
    : 'Masuk untuk melanjutkan catatan belajarmu. Data tetap tersimpan aman di perangkat ini.';
  if (btn) btn.textContent = AUTH_LBL[authMode];
  if (lnk) lnk.textContent = signup ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Daftar';
  // Google belum tersedia (butuh OAuth client ID + provider Google di
  // Supabase) — sembunyikan di mode daftar bersama pemisahnya.
  const g = $('lp-google'), dv = $('lp-div'),
        frg = $('lp-forgot'), pass = $('li-pass');
  if (g) g.style.display = signup ? 'none' : 'flex';
  if (dv) dv.style.display = signup ? 'none' : 'flex';
  if (frg) frg.style.display = signup ? 'none' : 'inline-block';
  if (pass) pass.setAttribute('autocomplete', signup ? 'new-password' : 'current-password');
  const err = $('li-err'); if (err) err.textContent = '';
}
function toggleAuthMode(){
  authMode = authMode === 'login' ? 'signup' : 'login';
  renderAuthMode();
}
function doAuth(){ authMode === 'login' ? doLogin() : doSignup(); }

// --- kontrol UI login baru: toggle sandi, Google (boundary), lupa sandi,
// tautan legal ---------------------------------------------------------
function spTogglePass(){
  const inp = $('li-pass'), b = $('lp-eye');
  if (!inp) return;
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  if (b) {
    b.classList.toggle('on', show);
    b.setAttribute('aria-pressed', String(show));
    b.setAttribute('aria-label', show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
  }
}
async function spGoogle(){
  const err = $('li-err'), btn = $('lp-google');
  err.textContent = '';
  if (!Auth.ok && !(await Auth.initClient())) {
    err.textContent = 'Server belum siap — coba lagi nanti, atau hubungi pembuat aplikasi.';
    return;
  }
  btn.disabled = true;
  try {
    await Auth.google();
    // alur lanjut di browser Google → balik via siswapro://auth/callback
    toast('Membuka Google… selesaikan di browser, lalu kamu kembali otomatis.');
  } catch (e) {
    const m = String(e && e.message || '').replace(/^AuthApiError:? */,'');
    err.textContent = m || 'Gagal membuka Google — coba lagi.';
  } finally {
    btn.disabled = false;
  }
}
async function spForgot(){
  const err = $('li-err');
  err.textContent = '';
  const email = $('li-email').value.trim();
  if (!email.includes('@')) {
    err.textContent = 'Isi email kamu di kolom atas, lalu ketuk Lupa kata sandi.';
    return;
  }
  if (!Auth.ok && !(await Auth.initClient())) {
    err.textContent = 'Server belum siap — coba lagi nanti, atau hubungi pembuat aplikasi.';
    return;
  }
  try {
    await Auth.requestReset(email);
    toast('Tautan reset dikirim ke ' + email + ' — buka tautannya di HP ini, lalu masuk lagi.');
  } catch (e) {
    const m = String(e && e.message || '').replace(/^AuthApiError:? */,'');
    err.textContent = m || 'Gagal mengirim tautan reset.';
  }
}
function spLegal(name){ toast(name + ' akan tersedia di rilis berikutnya.'); }

async function doLogin(){
  const btn=$('li-btn'), err=$('li-err');
  err.textContent='';
  const email=$('li-email').value.trim(), pass=$('li-pass').value;
  if(!email.includes('@')){
    err.textContent='Isi alamat email kamu, mis. nama@contoh.com.';
    return;
  }
  if(!pass){ err.textContent='Masukkan kata sandi.'; return; }
  if(!window.SUPABASE_CONFIG || (Auth.client && !Auth.ok)){
    err.textContent='Server belum siap — coba lagi nanti, atau hubungi pembuat aplikasi.';
    return;
  }
  btn.disabled=true; btn.textContent='Memverifikasi…';
  try{
    const idty = await Auth.login(email, pass);
    personaTheme(idty);
    $('auth').style.display='none';
    toast('Masuk sebagai ' + (idty.role || idty.email) + ' ✓');
    updateChip((idty.role || 'Sinkron') + '…');
    await manualSync();
  }catch(e){
    err.textContent = (e && e.message || 'Masuk gagal').replace(/^AuthApiError:? */,'');
  }finally{
    btn.disabled=false; btn.textContent=AUTH_LBL[authMode];
  }
}

// ---------- SIGNUP (self-serve accounts, signed-off 2026-10-23; the
// personal space is bootstrapped server-side by Sync.resolveSpace) ----
async function doSignup(){
  const btn=$('li-btn'), err=$('li-err');
  err.textContent='';
  const email=$('li-email').value.trim(), pass=$('li-pass').value;
  if(!email.includes('@') || pass.length < 6){
    err.textContent='Isi email yang valid dan kata sandi minimal 6 karakter.';
    return;
  }
  if(!window.SUPABASE_CONFIG || (Auth.client && !Auth.ok)){
    err.textContent='Server belum siap — coba lagi nanti, atau hubungi pembuat aplikasi.';
    return;
  }
  btn.disabled=true; btn.textContent='Membuat akun…';
  try{
    await Auth.initClient();
    const idty = await Auth.signup(email, pass);
    personaTheme(idty);
    $('auth').style.display='none';
    toast('Akun dibuat — selamat datang, ' + (idty.role || idty.email) + ' ✓');
    updateChip((idty.role || 'Sinkron') + '…');
    await manualSync();
  }catch(e){
    err.textContent = (e && e.message || 'Pendaftaran gagal — coba lagi.').replace(/^AuthApiError:? */,'');
  }finally{
    btn.disabled=false; btn.textContent=AUTH_LBL.signup;
  }
}

(async function boot(){
  try{
    // tunggu bridge Capacitor (native-bridge injects before user scripts,
    // tapi hindari race kalau timing berubah)
    if(!window.Capacitor){
      await new Promise(res=>{
        let n=0; const iv=setInterval(()=>{ if(window.Capacitor||++n>50){ clearInterval(iv); res(); } },100);
      });
    }
    await LocalDb.init();
    await LocalDb.ensurePersonalSpace(S.nama);
    await hydrate();
  }catch(e){
    $('ob').innerHTML = '<div class="obcard"><h1 class="ob-t">Penyimpanan gagal dibuka</h1><p class="ob-p">'+
      'Penyimpanan lokal tidak tersedia: '+esc(String(e&&e.message||e))+
      '. Coba tutup dan buka aplikasi lagi.</p></div>';
    $('ob').style.display='flex';
    return;
  }
  if(!S.ob){ $('ob').style.display='flex'; } else { renderAll(); }

  // ---- Phase 2: session restore + first happy-path sync -----------
  updateChip('Lokal');
  // email-confirmation deep link (siswapro://auth/callback#access_token=…)
  try {
    if (window.Capacitor && window.Capacitor.Plugins.App) {
      const App = window.Capacitor.Plugins.App;
      App.addListener('appUrlOpen', async ({ url }) => {
        try {
          const landed = await Auth.handleUrl(url);
          if (landed) {
            $('auth').style.display = 'none';
            updateChip((Auth.identity && Auth.identity.role || 'Sinkron') + '…');
            toast('Email terkonfirmasi — masuk otomatis ✓');
            await manualSync();
          }
        } catch (e) {
          console.warn('deep link session failed', e);
          toast('Tautan konfirmasi gagal: ' + (e.message || e));
        }
      });
      const launch = await App.getLaunchUrl();
      if (launch && launch.url) {
        const landed = await Auth.handleUrl(launch.url);
        if (landed) {
          $('auth').style.display = 'none';
          personaTheme(Auth.identity);
          updateChip((Auth.identity && Auth.identity.role || 'Sinkron') + '…');
          toast('Email terkonfirmasi — masuk otomatis ✓');
          await manualSync();
        }
      }
    }
  } catch (e) { console.warn('App plugin unavailable', e); }
  if (await Auth.initClient()) {
    const idty = await Auth.restore();
    if (!S.ob) {
    updateChip('Lokal'); // belum onboarding: login opsional, kartu akun lebih dulu
  } else if (idty) {
    personaTheme(idty);
    updateChip((idty.role || 'Sinkron') + '…');
    await manualSync();
  } else {
    updateChip('Masuk'); // login TIDAK dipaksa — kartu akun + chip jadi pintu
  }
}

  // auto-sync: saat koneksi balik & saat app dibuka lagi (jika sudah masuk)
  try {
    const { Network } = Capacitor.Plugins;
    Network.addListener('networkStatusChange', (st) => {
      if (st.connected && Auth.session) manualSync().catch(()=>{});
    });
    const { App } = Capacitor.Plugins;
    App.addListener('appStateChange', (st) => {
      if (st.isActive && Auth.session) manualSync().catch(()=>{});
    });
  } catch (e) { console.warn('autolisten unavailable', e); }
})();

// info pembaruan versi
const VER='2.0-mvp4';
if(localStorage.getItem('sp_ver')!==VER){
  localStorage.setItem('sp_ver',VER);
}

// jam hidup di beranda
setInterval(()=>{ if($('v-home').style.display!=='none'){ renderHome(); } },30000);
window.addEventListener('scroll',()=>{ const t=$('totop'); if(window.scrollY>150) t.classList.add('show'); else t.classList.remove('show'); },{passive:true});
