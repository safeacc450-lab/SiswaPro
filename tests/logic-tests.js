/**
 * WHAT: logic.js pure module tests — timer FSM (durasi/exactly-once/background
 *       recovery), filter/sort/overdue, month grid, local-tz date parsing, dan
 *       statistik progres. SiswaPro 3.0.
 * RUN : node tests/logic-tests.js
 */
'use strict';
const LOGIC = require('../www/logic.js');

let failures = 0;
function ok(cond, msg){ if(!cond){ failures++; console.error('FAIL: '+msg); } }

/* ---------- parseDay / dayStr: tanggal lokal, bukan ISO-UTC ---------- */
const d=LOGIC.parseDay('2026-03-08');
ok(d.getFullYear()===2026&&d.getMonth()===2&&d.getDate()===8,'parseDay local parts');
ok(LOGIC.dayStr(new Date(2026,2,8))==='2026-03-08','dayStr zero-padded');
ok(LOGIC.dayStr(d)==='2026-03-08','dayStr↔parseDay roundtrip');

/* ---------- filterTasks: field kompatibel (t/tTitle, m/subject) ---------- */
const now=new Date();
const today=LOGIC.dayStr(now);
const yest=LOGIC.dayStr(new Date(now.getTime()-86400000));
const tom =LOGIC.dayStr(new Date(now.getTime()+86400000));
const T=[
 {id:'2',t:'Beta',m:'MTK',done:false,due:tom, priority:'normal'},
 {id:'1',t:'Alfa',m:'BIO',done:false,due:yest, priority:'high'},
 {id:'3',t:'Cici',m:'MTK',done:true, due:yest, priority:'normal'},
 {id:'4',t:'q harian',m:'',done:false,due:today,priority:'low'},
 {id:'5',t:'q bebas',m:'',done:false,priority:'normal'},
];
const all=LOGIC.filterTasks(T,{status:'all'});
ok(all[0]&&all[0].done===false,'sort: open first');
ok(all.slice(0,4).every(x=>x.id==='1'||x.id==='4'||x.id==='5'||x.id==='2'),'sort: member set open');
const openHours=all.filter(x=>!x.done);
for(let i=1;i<openHours.length;i++) ok((openHours[i-1].due||'9999')<=(openHours[i].due||'9999'),'sort due asc');
ok(LOGIC.isOverdue(T[1],today),'isOverdue: kemarin belum selesai');
ok(!LOGIC.isOverdue(T[0],today),'isOverdue: due future aman');
ok(!LOGIC.isOverdue(T[2],today),'isOverdue: done tidak telat');
ok(!LOGIC.isOverdue({t:'x'},today),'isOverdue: tanpa due aman');
const hq=LOGIC.filterTasks(T,{q:'BEBAS'});
ok(hq.length===1&&hq[0].id==='5','filterTasks q case-insensitive');
const TODAY=LOGIC.filterTasks(T,{due:today});
ok(TODAY.length===1&&TODAY[0].id==='4','filterTasks due filter');

/* ---------- FSM: durasi via timestamp + exactly-once ---------- */
const t0=1000000;               // epoch ms
const s=LOGIC.focusStart(25,t0);
ok(s.st==='running'&&s.remaining===25*60000,'focusStart state');
const p=LOGIC.focusPause(s,t0+5000);
ok(Math.abs(p.remaining-(25*60000-5000))<50,'focusPause: runtime 5s dikurangi');
const r=LOGIC.focusResume(p,t0+100000);
ok(r.st==='running','focusResume state');
const tk=LOGIC.focusTick(r,t0+101000);
ok(Math.abs(tk-(p.remaining-1000))<50,'focusTick: timestamp-based lanjut sesudah pause');
const c=LOGIC.focusCancel(r,t0+200000);
ok(c.st==='cancelled','focusCancel state');
ok(LOGIC.focusComplete(c)===null,'cancelled → complete null (tidak masuk statistik)');
// complete persis sekali
const s2=LOGIC.focusStart(10,t0); const p2=LOGIC.focusPause(s2,t0+3000); const r2=LOGIC.focusResume(p2,t0+3000);
const fin=LOGIC.focusComplete(r2);
ok(fin&&fin.st==='done'&&fin.once,'focusComplete once flag');
ok(LOGIC.focusOnce(fin)===null,'focusOnce fin kedua = null (idempoten)');
ok(LOGIC.focusOnce(r2)!==null,'focusOnce bawaan running → done baru');
// recovery normalisasi
const winS={st:'running',preset:25,remaining:25*60000,since:t0,once:false};
ok(LOGIC.focusTick(winS,t0+60000)===24*60000,'recover: tick mengurangi sesudah background');
const paS={st:'paused',preset:25,remaining:777777,since:t0};
ok(LOGIC.focusTick(paS,t0+99999)===777777,'paused: frozen sisa waktu');
ok(LOGIC.focusEarned({st:'done'},7)===7,'focusEarned: done → elapsed');
ok(LOGIC.focusEarned({st:'cancelled'},7)===0,'focusEarned: cancel → 0');
// FSM guard transitions
ok(LOGIC.focusEvents({st:'running'}).pause===true&&LOGIC.focusEvents({st:'done'}).pause===undefined,'focusEvents: guard matriks');
/* ---------- monthGrid Mon-first ---------- */
const g=LOGIC.monthGrid(2026,0); // Januari 2026: 1 Jan = Kamis
ok(g.cells.filter(Boolean).length===31,'Januari = 31 hari');
ok(g.cells[0]===null&&(g.cells[0]===null?g.cells.findIndex(Boolean)===3:true),'leading pad Kamis (3 slot)');
const d1=g.cells.find(Boolean); ok(d1.getDay()===4,'1 Jan 2026 = Kamis');
/* ---------- statistik ---------- */
const cnt=LOGIC.taskCounts(T,today);
ok(cnt.total===5&&cnt.done===1&&cnt.open===4,'taskCounts total/done/open');
ok(cnt.overdue===1,'taskCounts overdue = 1');
ok(LOGIC.completionRate(1,3)===25,'completionRate 25%');
ok(LOGIC.completionRate(0,0)===null,'completionRate 0 population = null');
const hist={'2026-10-25':15,'2026-10-24':25,'2026-10-20':50};
const days=LOGIC.focusByDaySeries(hist,new Date(2026,9,25),7);
ok(days.length===7&&days[6].m===15&&days[5].m===25&&days[0].m===0,'focusByDaySeries urut lama→baru');
const ss=LOGIC.subjectStats(T,yest,tom);
ok(ss.length===new Set(ss.map(x=>x.subject)).size,'subjectStats unik');
ok(ss.some(x=>x.subject==='MTK'&&x.done===1),'subjectStats per mapel selesai');
ok(ss.some(x=>x.subject===''),'subjectStats tanpa mapel masuk bucket kosong');

console.log('\n'+(failures?failures+' FAILED':'ALL LOGIC OK')+'');
process.exit(failures?1:0);
