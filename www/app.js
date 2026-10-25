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
  S.dark  = kv.dark === '1';

  const subs = await LocalDb.subjectsAll();
  S.mapel = subs.map(r=>r.name);
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
    LocalDb.setSetting('dark', S.dark?'1':'0'),
    LocalDb.setSetting('quote_i', S.quoteI||0)
  ]);
}
const persist = err => { if(err) console.error('persist failed', err); };

// ---------- tema ----------
const THEMES = [
  {a:'#4f46e5',a2:'#7c3aed',soft:'#e0e7ff',text:'#4338ca',bar:'#4f46e5'},
  {a:'#0284c7',a2:'#0891b2',soft:'#cffafe',text:'#0e7490',bar:'#0891b2'},
  {a:'#16a34a',a2:'#0d9488',soft:'#dcfce7',text:'#166534',bar:'#16a34a'},
  {a:'#e11d48',a2:'#f43f5e',soft:'#ffe4e6',text:'#9f1239',bar:'#e11d48'}
];
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
  $('dark-btn').textContent = lbl;
  toast(S.dark===false ? 'Mode terang' : S.dark==='black' ? 'Mode gelap pekat (hitam) aktif' : 'Mode gelap aktif');
}
function applyDark(){
  document.body.classList.toggle('dark', !!S.dark);
  document.body.classList.toggle('black', S.dark==='black');
  // light mode: applyAcc already set the accent meta color — don't clobber it
  if (S.dark) document.querySelector('meta[name=theme-color]').content =
    S.dark==='black' ? '#000000' : '#141c2e';
}

// ---------- onboarding (FR-01 sementara: nama lokal; akun server = Phase 2) ----------
function obPick(i,el){
  document.querySelectorAll('#ob .acc').forEach(b=>b.classList.remove('on'));
  el.classList.add('on'); applyAcc(i);
}
function obDone(){
  S.nama = $('ob-nama').value.trim() || 'Siswa';
  S.ob = true;
  save().catch(persist);
  $('ob').style.display='none';
  renderAll();
  toast('Selamat belajar, '+S.nama+'! 🚀');
  // Phase 2: setelah onboarding → tampilkan login bila server terpasang
  if (Auth.ok && !Auth.session){
    updateChip('Masuk');
    $('auth').style.display='flex';
  }
}

// waktu util
function nowMin(){ const n=new Date(); return n.getHours()*60+n.getMinutes(); }
function hariIni(){ return HARI[new Date().getDay()]; }

// ---------- BERANDA ----------
const QUOTES = [
  'Belajar sedikit tapi rutin lebih kuat dari belajar banyak tapi sekali.',
  'Ujian tidak menguji hafalanmu, tapi kebiasaan muat belajarmu.',
  'Catat ulang dengan bahasamu sendiri — itu cara tercepat paham.',
  'Sedikit demi sedikit lama-lama jadi buku. Belajar pun begitu.',
  'Fokus 25 menit itu ajib, karena menang lawan rasa malas.',
  'Jadwal yang baik tertib membuat lelah lebih terdistribusi.',
  'Kerjakan PR paling tidak disukai duluan. Itu disiplin.',
  'Nonton video tanpa mencatat = nonton hiburan, bukan belajar.',
  'Istirahat bagian dari belajar, bukan lawannya.',
  'Kalau bingung tanyakan macam di mana tidak salah.',
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
  const sapa = h<11?'Semangat Pagi':(h<15?'Siap Siang':(h<18?'Bagus Sore':'Malam Tenang'));
  $('h-greet').textContent = S.nama? sapa+', '+nama+'! 👋' : 'Selamat datang! 👋';
  $('h-sub').textContent = S.nama? 'Semua catatan buatanmu tersimpan. Lanjutkan belajarnya!' : 'Isi namamu di Pengaturan ⚙️';

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
    $('tl').innerHTML = '<div class="empty"><div class="e-ico">🗓️</div>'+(wd==='Minggu'||wd==='Sabtu'?'Hari libur — isi ulang energi kegembiraan!':'Belum ada jadwal hari ini.<br>Tambahkan di tab Jadwal.')+'</div>';
  }

  // PR dekat
  const open = S.pr.filter(p=>!p.d).sort((p,q)=>(p.due||'zzz')<(q.due||'zzz')?-1:1);
  $('h-pr').innerHTML = open.length ? open.slice(0,3).map((p)=>prItem(p, S.pr.indexOf(p), true)).join('') : '<div class="empty"><div class="e-ico">🎉</div>Tidak ada PR dekat. Mantap!</div>';

  // quote hari
  $('h-quote').textContent = '"'+QUOTES[new Date().getDate()%QUOTES.length]+'"';
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
function tog(i){ const p=S.pr[i]; p.d=!p.d; LocalDb.taskSetDone(p.id,p.d).catch(persist); renderPR(); if(p.d){ buzz(200); toast('PR selesai. Kerja bagus!'); } }
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
  if(!start||!end||tm(end)<=tm(start)){ toast('Cek jam mulai & selesai'); return; }
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
  $('streak-sub').innerHTML = streak>0? ('🔥 Streak belajar: <b>'+streak+'</b> hari berturut-turut — jaga ya!') : 'Belajar fokus hari ini untuk mulai 🔥 streak!';
}

// ---------- RAPOR ----------
function hitung(){
  const t=+$('nt').value||0,u=+$('nu').value||0,a=+$('na').value||0;
  const tot=(t*.25)+(u*.35)+(a*.4);
  const g=tot>=85?'A — Sangat Baik':tot>=75?'B — Baik':tot>=60?'C — Cukup, Ayok Lebih Giat':'D — Perlu Belajar Lagi';
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
  save().catch(persist); renderHome(); toast(S.nama? 'Sapaan diperbarui ✓':'Nama dikosongkan');
}
function renderMapelSelect(){
  const o=S.mapel.map(m=>'<option>'+esc(m)+'</option>').join('');
  $('in-mapel').innerHTML=o||'<option value="">— Belum ada mapel, terisi otomatis —</option>';
  $('in-jd-mapel').innerHTML=o;
}
function renderMapelList(){
  $('list-mapel').innerHTML = S.mapel.length? S.mapel.map(m=>{
    const n=S.jadwal.filter(j=>j.m===m).length + S.pr.filter(p=>p.m===m).length;
    return `<div class="mapel-row">
      <span class="swatch" style="background:${colorOf(m)}"></span>
      <span style="flex:1;font-size:13px;font-weight:700">${esc(m)}</span>
      <span class="use-badge">${n} dipakai</span>
      <button class="btn-ico" onclick="delMapel('${esc(m).replace(/'/g,'\\&#39;')}')">🗑️</button>
    </div>`;
  }).join('') : '<div class="empty">Belum ada mapel. Tambah satu!</div>';
}
function tambahMapel(){
  const v=$('in-mapel-add').value.trim();
  if(!v){ toast('Tulis nama mapelnya'); return; }
  if(S.mapel.includes(v)){ toast('Mapel sudah ada'); return; }
  LocalDb.subjectAdd(v).then(id=>{ S.mapel.push(v); mapelId[v]=id; $('in-mapel-add').value=''; renderMapelSelect(); renderMapelList(); }).catch(persist);
  toast('Mapel ditambahkan ✓');
}
function delMapel(m){
  if(!confirm('Hapus mapel "'+m+'"? Jadwal & PR yang pakai akan tetap ada.')) return;
  LocalDb.subjectDel(mapelId[m]).catch(persist);
  S.mapel=S.mapel.filter(x=>x!==m); delete mapelId[m];
  renderMapelSelect(); renderMapelList(); toast('Mapel dihapus ✓');
}

// ---------- EKSPOR / IMPOR (FR-14) ----------
function eksport(){
  LocalDb.exportAll().then(d=>{
    $('io-area').value=JSON.stringify(d);
    toast('Data diekspor. Salin teksnya ke tempat aman ✓');
  }).catch(()=>toast('Ekspor gagal — coba lagi'));
}
async function importData(){
  const v=$('io-area').value.trim();
  if(!v){ toast('Tempel dulu data cadangan ke kotak teks'); return; }
  let d;
  try{ d=JSON.parse(v); }catch(e){ toast('Data tidak valid — cek tempelan'); return; }

  // format MVP (mvp1)
  if(d && d._v==='mvp1'){
    if(!Array.isArray(d.mapel)||!Array.isArray(d.jadwal)||!Array.isArray(d.tasks)) { toast('Struktur cadangan tidak lengkap'); return; }
    for(const j of d.jadwal) await LocalDb.scheduleAdd(j);
    for(const t of d.tasks) await LocalDb.taskAdd(t);
    for(const s of d.mapel||[]) await LocalDb.subjectAdd(s.name);
    toast('Data MVP dipulihkan ✓');
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
    toast('Data v1.x dipulihkan (import satu arah) ✓');
    location.reload();
    return;
  }
  toast('Data tidak dikenali — ini bukan cadangan SiswaPro');
}
function resetAll(){
  if(!confirm('YAKIN hapus SEMUA data (jadwal, PR, fokus, pengaturan)?')) return;
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
  if(target==='set'){ $('in-nama').value=S.nama; $('dark-btn').textContent=S.dark===false?'🌙 Mode Gelap: OFF':S.dark==='black'?'⬛ Mode Gelap: HITAM':'☀️ Mode Gelap: ON'; refreshIdentityCard(); }
  window.scrollTo({top:0,behavior:'smooth'});
}

// ---------- IDENTITAS (FR-01 Phase 1: profil lokal; binding akun server = Phase 2) ----------
function refreshIdentityCard(){
  const el=$('identity-status'); if(!el) return;
  el.textContent = S.nama
    ? 'Profil lokal aktif: '+S.nama+'.'
    : 'Nama belum diisi — profil lokal belum lengkap.';
}

// ---------- INIT ----------
function renderAll(){
  applyAcc(S.accent); applyDark();
  renderMapelSelect(); renderMapelList(); renderHome(); renderPR(); renderJd(); renderBars(); renderStreak();
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
  if (!Auth.ok || !Auth.session) { toast('Belum masuk akun — chip tidak aktif'); tab('set'); return; }
  updateChip((Auth.identity && Auth.identity.role || 'Sinkron') + '…');
  try {
    const r = await Sync.syncNow();
    if (r && r.ok) { updateChip((Auth.identity && Auth.identity.role || '') + ' ✓'); toast('Sinkron selesai' + (r.pulled !== undefined ? ' — ' + r.pulled + ' perubahan' : '') + ' ✓'); await hydrate(); renderAll(); }
    else updateChip('Sinkron');
  } catch (e) {
    updateChip('Sinkron ⚠️');
    toast('Sinkron gagal: ' + (e.message || e));
  }
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
    ? 'Daftar dengan email untuk menjaga catatan belajarmu lintas perangkat. Password minimal 6 karakter.'
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
    err.textContent = 'Server belum dikonfigurasi — minta pembuat aplikasi isi fase 2.';
    return;
  }
  btn.disabled = true;
  try {
    await Auth.google();
    // alur lanjut di browser Google → balik via siswapro://auth/callback
    toast('Menunggu Google… selesai di browser lalu balik otomatis ✓');
  } catch (e) {
    err.textContent = (e && e.message || 'Google gagal').replace(/^AuthApiError:? */,'');
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
    err.textContent = 'Server belum dikonfigurasi — pemulihan akun butuh fase 2.';
    return;
  }
  try {
    await Auth.requestReset(email);
    toast('Tautan reset dikirim ke ' + email + ' — buka di HP ini, lalu Masuk lagi.');
  } catch (e) {
    err.textContent = (e && e.message || 'Gagal mengirim tautan reset.');
  }
}
function spLegal(name){ toast(name + ' akan tersedia di rilis berikutnya.'); }

async function doLogin(){
  const btn=$('li-btn'), err=$('li-err');
  err.textContent='';
  const email=$('li-email').value.trim(), pass=$('li-pass').value;
  if(!email.includes('@')){
    err.textContent='Gunakan alamat email kamu (format nama@contoh.com).';
    return;
  }
  if(!pass){ err.textContent='Masukkan kata sandi.'; return; }
  if(!window.SUPABASE_CONFIG || (Auth.client && !Auth.ok)){
    err.textContent='Server belum dikonfigurasi — minta pembuat aplikasi isi fase 2.';
    return;
  }
  btn.disabled=true; btn.textContent='Memverifikasi…';
  try{
    const idty = await Auth.login(email, pass);
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
    err.textContent='Isi email yang valid dan password minimal 6 karakter.';
    return;
  }
  if(!window.SUPABASE_CONFIG || (Auth.client && !Auth.ok)){
    err.textContent='Server belum dikonfigurasi — minta pembuat aplikasi isi fase 2.';
    return;
  }
  btn.disabled=true; btn.textContent='Membuat akun…';
  try{
    await Auth.initClient();
    const idty = await Auth.signup(email, pass);
    $('auth').style.display='none';
    toast('Akun dibuat — selamat datang, ' + (idty.role || idty.email) + ' ✓');
    updateChip((idty.role || 'Sinkron') + '…');
    await manualSync();
  }catch(e){
    err.textContent = (e && e.message || 'Pendaftaran gagal').replace(/^AuthApiError:? */,'');
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
    $('ob').innerHTML = '<div class="obcard"><h1 class="ob-t">Database gagal dibuka</h1><p class="ob-p">'+
      'Penyimpanan lokal (SQLite) tidak tersedia: '+esc(String(e&&e.message||e))+
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
      updateChip('Masuk'); // belum onboarding: login setelah onboarding
      $('auth').style.display='none';
    } else if (idty) {
      updateChip((idty.role || 'Sinkron') + '…');
      await manualSync();
    } else {
      updateChip('Masuk');
      $('auth').style.display='flex';
    }
  }
})();

// info pembaruan versi
const VER='2.0-mvp1';
if(localStorage.getItem('sp_ver')!==VER){
  localStorage.setItem('sp_ver',VER);
}

// jam hidup di beranda
setInterval(()=>{ if($('v-home').style.display!=='none'){ renderHome(); } },30000);
window.addEventListener('scroll',()=>{ const t=$('totop'); if(window.scrollY>150) t.classList.add('show'); else t.classList.remove('show'); },{passive:true});
