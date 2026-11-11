/* ============================================================
   出路指南 2026 — app
   ============================================================ */
(function(){
'use strict';
const G = window.GUIDE;
const $ = (s,r)=> (r||document).querySelector(s);
const $$ = (s,r)=> Array.from((r||document).querySelectorAll(s));
const GRADES = ['5**','5*','5','4','3','2','1'];
const LV = {'5**':7,'5*':6,'5':5,'4':4,'3':3,'2':2,'1':1,'U':0};
const fmt = n => (n==null?'—':n.toLocaleString('en-US'));
const cn = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g,' ');
const esc = s => String(s==null?'':s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------------- state ---------------- */
const KEY='chulu2026.grades';
let state = {chi:'',eng:'',math:'',csd:'',e1:'',e2:'',e3:'',m12:''};
try{ const s=JSON.parse(localStorage.getItem(KEY)||'null'); if(s) state=Object.assign(state,s); }catch(e){}
const save = ()=>{ try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(e){} };
const hasGrades = ()=> ['chi','eng','math','e1','e2'].every(k=>state[k]);

function num(g){ return g==='A'?2 : (LV[g]!=null?LV[g]:0); } // CSD 達標 視作 2 級（不計分）
function levelOf(g, map){ return map && map[g]!=null ? map[g] : 0; }

function best5(map){
  const pool = ['chi','eng','math','e1','e2','e3','m12']
    .map(k=> state[k]).filter(g=>g && g!=='A' && g!=='U')
    .map(g=> levelOf(g,map)).filter(v=>v>0)
    .sort((a,b)=>b-a);
  return pool.slice(0,5).reduce((a,b)=>a+b,0);
}
function electivesAtLeast(n){
  const es = ['e1','e2','e3'].map(k=>num(state[k])).sort((a,b)=>b-a);
  return es.filter(v=>v>=n).length>=2;
}
function coreStatus(key){
  const r = G.genReq.UGC[key];
  if(!r) return null;
  const need = [
    {k:'chi', min:r.chi, label:'中文'},
    {k:'eng', min:r.eng, label:'英文'},
    {k:'math', min:r.math, label:'數學'}
  ];
  const miss = need.filter(x=> num(state[x.k]) < x.min);
  const csdOk = state.csd==='A';
  const elOk = electivesAtLeast(r.electives[0]);
  return {ok: miss.length===0 && csdOk && elOk, miss, csdOk, elOk, req:r, oneLevel: miss.length===1 && (num(state[miss[0].k]) === miss[0].min-1)};
}
function tierIndex(){
  if(!hasGrades()) return -1;
  const c = coreStatus('HKU');
  if(c && c.ok) return 0;
  const five2 = ['chi','eng'].every(k=>num(state[k])>=2) && ['math','e1','e2'].filter(k=>num(state[k])>=2).length>=3;
  if(five2) return 1;
  if(state.chi!=='') return 2;
  return 3;
}

/* ---------------- me panel ---------------- */
const OPT = ['—'].concat(GRADES);
function gradeSelect(sel, val, isCsd){
  const opts = isCsd ? ['—','A','未達標'] : OPT;
  return `<select class="grade${isCsd?' csd':''}" data-sub="${sel}">`+
    opts.map(o=>`<option value="${o==='—'?'':o}" ${String(val)===String(o==='—'?'':o)?'selected':''}>${o==='A'?'達標':o==='—'?'—':o}</option>`).join('')+`</select>`;
}
function buildMe(){
  $('#meGrid').innerHTML = [
    ['chi','中文',false],['eng','英文',false],['math','數學',false],['csd','公民與社會發展',true],
    ['e1','選修一',false],['e2','選修二',false],['e3','選修三',false],['m12','M1 / M2',false]
  ].map(([k,l,c])=>`<label>${l} ${gradeSelect(k,state[k],c)}</label>`).join('');
  $$('#meGrid select').forEach(s=>{
    s.addEventListener('change',()=>{
      state[s.dataset.sub]=s.value; save(); refreshMe(); refreshCalc(); renderMap(); renderGradeMatch();
      renderScoreTable();
    });
  });
}
function refreshMe(){
  const on = hasGrades();
  $('#meDot').classList.toggle('on', on);
  $('#meLabel').textContent = on ? '已輸入成績' : '輸入我的成績';
  const box = $('#meResult');
  if(!on){ box.innerHTML = '<p class="fine">未輸入成績。輸入後，這裡會顯示你的位置與合資格院校數目。</p>'; return; }
  const c = coreStatus('HKU');
  const ti = tierIndex();
  let html='';
  if(c && c.ok){
    html += `<div class="verdict ok"><b>✓</b><span>符合 332A + 兩科選修第 3 級，可報聯招資助學位。</span></div>`;
  } else if(c){
    const parts=[];
    if(c.miss.length) parts.push(c.miss.map(m=>`${m.label}（需 ${m.min} 級）`).join('、'));
    if(!c.csdOk) parts.push(state.csd ? '公民與社會發展科未達「達標」' : '公民與社會發展科未填');
    if(!c.elOk) parts.push('選修科未達兩科第 3 級');
    const soft = c.oneLevel || !state.csd;
    html += `<div class="verdict ${soft?'warn':'bad'}"><b>!</b><span>未完全符合 332A：${parts.join('；')}。${c.oneLevel?'差一級：可留意彈性收生。':''}</span></div>`;
  }
  const rows = Object.keys(G.scoring).map(k=>({k, s:best5(G.scoring[k].levels), ok:(coreStatus(k)||{}).ok}));
  const okCount = rows.filter(r=>r.ok===true).length;
  html += `<div class="verdict ${ti===0?'ok':ti===1?'warn':'bad'}"><b>${ti===0?'1':ti===1?'2':'3'}</b><span>${
    ti===0?'你在地圖第一層：學位與副學位皆可。':ti===1?'你在地圖第二層：副學位、高級文憑為主要路線。':'你在地圖第三、四層：應用教育文憑、職專文憑、培訓與就業。'
  }</span></div>`;
  html += `<ul><li>最佳五科（港大換算）：<b>${rows[0].s}</b> 分</li><li>符合入學門檻的資助院校：<b>${okCount} / 8</b></li><li>分數最高的換算：<b>${Math.max(...rows.map(r=>r.s))}</b></li></ul>`;
  box.innerHTML = html;
}

/* ---------------- roadmap ---------------- */
function renderMap(){
  const ti = tierIndex();
  const t = $('#tiers');
  t.innerHTML = G.tiers.map((tier,i)=>{
    const total = tier.routes.reduce((a,r)=>a+(r.quota||0),0);
    const open = i===0 || i===ti;
    return `<div class="tier ${open?'open':''} ${i===ti?'mine':''}" data-i="${i}">
      <button class="tier-head" aria-expanded="${open}">
        <span class="tier-req">${esc(tier.tier)}<small>${i===0?'學士學位':i===1?'副學位 / 高級文憑':i===2?'中六畢業':'基礎學歷'}${total?` · 約 ${cn(total)} 個學額`:''}</small></span>
        <span class="tier-meta">
          <span class="chip ${i===0?'jade':i===1?'jade':i===2?'amber':'coral'}">${tier.routes.length} 條路線</span>
          ${i===ti?'<span class="chip amber">你的位置</span>':''}
        </span>
        <span class="tier-toggle">▾</span>
      </button>
      <div class="tier-body">
        ${tier.routes.map(r=>`<div class="route">
          <div class="route-ch">${esc(r.channel)}</div>
          <div class="route-name">${esc(r.programme)}</div>
          <div class="route-q ${r.quota?'':'na'}">${r.quota?cn(r.quota)+' 學額':'學額不定'}</div>
        </div>`).join('')}
      </div>
    </div>`;
  }).join('');
  $$('#tiers .tier-head').forEach(b=>b.addEventListener('click',()=>{
    const tier=b.parentElement; tier.classList.toggle('open');
    b.setAttribute('aria-expanded', tier.classList.contains('open'));
  }));

  // quota chart
  const q=G.quota;
  const items=[
    {lb:'資助學士', v:q.degree.government_funded, c:'var(--jade)'},
    {lb:'自資學士', v:q.degree.self_financed, c:'var(--amber)'},
    {lb:'資助副學位', v:q.subdegree.government_funded, c:'var(--jade-2)'},
    {lb:'自資副學位', v:q.subdegree.self_financed, c:'var(--amber)'},
    {lb:'應用教育文憑', v:5000, c:'var(--coral)'},
    {lb:'VTC 基礎課程', v:5000, c:'var(--coral)'}
  ];
  const max = Math.max(...items.map(i=>i.v));
  $('#quotaChart').innerHTML = items.map(i=>`<div class="bar-row"><span class="lb">${i.lb}</span>
    <span class="bar-track"><span class="bar-fill" style="width:${i.v/max*100}%;background:${i.c}"></span></span>
    <b>${cn(i.v)}</b></div>`).join('');
}
function renderGradeMatch(){
  const map=[
    {req:'443A33', note:'具競爭力的大學聯招資助學位課程'},
    {req:'332A + 2 選修第 2 級', note:'學位課程（資助或自資）、副學位'},
    {req:'22222（包括中英文）', note:'副學位課程（資助或自資）'},
    {req:'112A2 – 222A2', note:'文憑／學徒訓練／中六重讀'},
    {req:'中六畢業', note:'DAE、VTC 基礎課程、學徒、就業'}
  ];
  const ti = tierIndex();
  const hit = ti===0?1:ti===1?2:ti===2?4:4;
  $('#gradeMatch').innerHTML = map.map((m,i)=>`<div class="mrow ${i===hit&&ti>=0?'hit':''}">
    <b>${m.req}</b><span>${m.note}${i===hit&&ti>=0?' ← 你大約在這裡':''}</span></div>`).join('');
}

/* ---------------- timeline ---------------- */
function fmtDate(iso){
  const d = iso.slice(0,10).split('-');
  return `${+d[1]} 月 ${+d[2]} 日`;
}
function renderTimeline(){
  const list = G.jupasDates.map(x=>{
    const type = /考評局/.test(x.event) ? 'dse' : (/聯招|JUPAS/.test(x.event) ? 'jupas' : 'other');
    const d = x.date.includes('/') ? x.date.split('/')[0] : x.date;
    const span = x.date.includes('/') ? `<small>至 ${fmtDate(x.date.split('/')[1])}</small>` : '';
    return `<li class="tl-item" data-t="${type}">
      <div class="tl-date">${fmtDate(d)}${span}</div>
      <div class="tl-body"><h5>${esc(x.event)}${x.time?`<span class="tl-time">${esc(x.time)}</span>`:''}</h5></div>
    </li>`;
  }).join('');
  $('#timelineList').innerHTML = list;
  $$('#tlFilter button').forEach(b=>b.addEventListener('click',()=>{
    $$('#tlFilter button').forEach(x=>x.classList.remove('on')); b.classList.add('on');
    const f=b.dataset.f;
    $$('#timelineList .tl-item').forEach(li=> li.classList.toggle('hidden', f!=='all' && li.dataset.t!==f));
  }));

  $('#reviewList').innerHTML = [
    `成績發放：${G.review.results_release}`,
    `覆核申請：${G.review.review_application_window}（${G.review.review_application_deadline} 截止）`,
    `每宗申請最多 ${G.review.max_subjects_per_application} 科`,
    `覆核結果：${G.review.review_results_release} 公布`,
    `上訴覆核：${G.review.appeal.map(a=>a.category+'（'+a.deadline+'）').join('；')}`
  ].map(t=>`<li>${esc(t)}</li>`).join('');

  const rs=G.reviewStats;
  $('#reviewChart').innerHTML = rs.map(r=>{
    const pct=r.grade_up_school_pct;
    return `<div class="mini-row"><span>${r.year}</span><span class="bar-track"><span class="bar-fill" style="width:${pct/3*100}%"></span></span><b>${pct}%</b></div>`;
  }).join('') + `<p class="fine" style="margin:6px 0 0">升級比率（學校考生）：2024 年 1.5%、2025 年 1.7%。申請覆核人數佔考生約三分之一。</p>`;
}

/* ---------------- calculator ---------------- */
function buildCalc(){
  const subs=[['chi','中文'],['eng','英文'],['math','數學'],['e1','選修一'],['e2','選修二'],['e3','選修三']];
  $('#calcGrid').innerHTML = subs.map(([k,l])=>`<label>${l} ${gradeSelect(k,state[k],false)}</label>`).join('');
  $$('#calcGrid select').forEach(s=>s.addEventListener('change',()=>{
    state[s.dataset.sub]=s.value; save(); refreshCalc(); refreshMe(); renderMap(); renderGradeMatch(); renderScoreTable();
  }));
  refreshCalc();
}
function refreshCalc(){
  const raw = ['chi','eng','math','e1','e2','e3'].map(k=>num(state[k])).filter(v=>v>0).sort((a,b)=>b-a).slice(0,5);
  const total = raw.reduce((a,b)=>a+b,0);
  const el=$('#calcRaw'); el.textContent = total || '—'; el.classList.toggle('empty', !total);
  renderCalcBars();
}
function renderCalcBars(){
  const box=$('#calcBars'); if(!box) return;
  if(!hasGrades()){ box.innerHTML = '<h6>院校對照</h6><p class="fine" style="margin:0">輸入成績後，這裡會顯示各院校換算後的分數對比。</p>'; return; }
  const order=['HKU','CUHK','HKUST','PolyU','CityU','HKBU','EdUHK','HKMU','THEi','HKSYU','HSUHK','SFU'];
  const rows=order.filter(k=>G.scoring[k]).map(k=>({n:G.scoring[k].nameTC.replace('香港',''),v:best5(G.scoring[k].levels)}))
    .sort((a,b)=>b.v-a.v);
  const max=Math.max(...rows.map(r=>r.v),1);
  box.innerHTML = '<h6>院校對照（最佳五科）</h6>' + rows.map(r=>`<div class="bar-row">
    <span class="lb">${esc(r.n)}</span>
    <span class="bar-track"><span class="bar-fill" style="width:${r.v/max*100}%;background:${r.v===rows[0].v?'var(--jade)':'var(--jade-2)'};opacity:${r.v===rows[0].v?1:.65}"></span></span>
    <b>${r.v}</b></div>`).join('');
}
function renderScoreTable(){
  const tb = $('#scoreTable tbody');
  const order = ['HKU','CUHK','HKUST','PolyU','CityU','HKBU','LingnanU','EdUHK','HKMU','THEi','UOWCHK','HKSYU','HSUHK','SFU','CHC','TWC'];
  const rows = order.filter(k=>G.scoring[k]).map(k=>{
    const s=G.scoring[k], sc=best5(s.levels), c=coreStatus(k);
    const scale = s.levels['5**']===8.5 ? '5**=8.5' : '5**=7';
    let tag='';
    if(c) tag = c.ok ? '<span class="tag" style="background:var(--jade-soft);color:#0A5B4B">合資格</span>'
                     : (c.oneLevel?'<span class="tag flex">差一級 · 彈性</span>':'<span class="tag" style="background:var(--coral-soft);color:#8C3527">未達</span>');
    else tag = '<span class="tag">自資</span>';
    return {k,name:s.nameTC,sc,scale,tag,has:c!=null};
  });
  tb.innerHTML = rows.map(r=>`<tr>
    <td>${esc(r.name)}</td>
    <td class="fine">${r.scale}</td>
    <td class="sc">${hasGrades()?r.sc:'—'}</td>
    <td>${hasGrades()?r.tag:''}</td>
  </tr>`).join('');
}
function renderScoringTable(){
  const order=['HKU','CUHK','HKUST','PolyU','HKBU','CityU','LingnanU','EdUHK','HKMU','THEi','UOWCHK','HKSYU','HSUHK','SFU','CHC','TWC'];
  $('#scoringTable tbody').innerHTML = order.filter(k=>G.scoring[k]).map(k=>{
    const s=G.scoring[k];
    const lv=[s.levels['5'],s.levels['5*'],s.levels['5**']].join(' / ');
    let base = s.bestN===5?'最佳 5 科':(Array.isArray(s.bestN)?('最佳 '+s.bestN.join(' 或 ')+' 科'):(s.bestN||'視課程'));
    const notes=[];
    if(s.weighting) notes.push(`核心科加權 ${s.weighting.coreSubjects.join('–')} 倍，優先科目 ${s.weighting.prioritySubjects} 倍`);
    if(s.subjectWeightRange) notes.push(`科目加權 ${s.subjectWeightRange[0]}–${s.subjectWeightRange[1]} 倍`);
    if(s.bonus6thSubject) notes.push(s.bonus6thSubject);
    if(s.otherLanguageMax) notes.push(`其他語言最高 ${s.otherLanguageMax} 分`);
    if(s.excludedSubject) notes.push(`不計 ${s.excludedSubject}`);
    if(s.excludedFor) notes.push(`例外：${s.excludedFor.join('、')}`);
    if(s.note) notes.push(s.note);
    if(s.doubleWeightSubject) notes.push(`雙倍加權：${s.doubleWeightSubject}`);
    return `<tr><td><b>${esc(s.nameTC)}</b></td><td>${esc(base)}</td><td class="mono">${lv}</td><td class="fine">${esc(notes.join('；')||'—')}</td></tr>`;
  }).join('');
}
const INTERVIEWS=[
 {i:'香港大學',who:'大部分課程只邀請 Band A 申請人；非在校申請人及符合彈性收生者亦會獲安排',how:'個別或小組，以英語為主',when:'放榜前及／或放榜後'},
 {i:'香港中文大學',who:'原書只列出設面試課程清單，未列個別日期',how:'按課程而定',when:'按課程公布'},
 {i:'香港科技大學',who:'9 個課程必須面試（如國際科研、環球商業管理、量化金融學）',how:'全英語；表現優秀有額外加分',when:'放榜前及／或放榜後，或網上進行'},
 {i:'香港理工大學',who:'按課程邀請；缺席可能不再考慮申請',how:'多為小組／個人，英語（部分中文及英語）',when:'放榜後為主，7 月 22 日收到通知'},
 {i:'香港城市大學',who:'大部分課程設小組面試，部分「如有需要或會安排」',how:'小組為主，部分個人；JS1000 用 interview video',when:'6 月上旬至 8 月上旬'},
 {i:'香港浸會大學',who:'按課程邀請；音樂、社工、視覺藝術等設筆試',how:'個人／小組；中醫中藥為普通話、粵語及英語',when:'6 月及 7 月下旬'}
];
function renderInterview(){
  const tb=$('#interviewTable tbody'); if(!tb) return;
  tb.innerHTML=INTERVIEWS.map(x=>`<tr><td><b>${esc(x.i)}</b></td><td>${esc(x.who)}</td><td class="fine">${esc(x.how)}</td><td class="fine">${esc(x.when)}</td></tr>`).join('');
}
function renderFlex(){
  const order=['HKU','CUHK','HKUST','PolyU','HKBU','CityU','LingnanU','EdUHK','HKMU','HKSYU','HSUHK'];
  $('#flexGrid').innerHTML = order.filter(k=>G.flexible[k]).map(k=>{
    const f=G.flexible[k];
    const name = (G.scoring[k]&&G.scoring[k].nameTC) || k;
    return `<div class="flex-card">
      <h5>${esc(name)}<em>${esc(k)}</em></h5>
      <div class="flex-row"><b>容許：</b>${esc(f.coreShortfall)}</div>
      ${f.condition?`<div class="flex-row"><b>條件：</b>${esc(f.condition)}</div>`:''}
      ${f.appliesTo?`<div class="flex-row"><b>適用：</b>${esc(f.appliesTo)}</div>`:''}
      ${f.other?`<div class="flex-row"><b>其他：</b>${esc(f.other)}</div>`:''}
      ${f.penalty?`<span class="pen">${esc(f.penalty)}</span>`:''}
    </div>`;
  }).join('');
}
function renderSssdp(){
  const s=G.sssdp, a=s.annualFundingHKD;
  const cards=[
    {t:'SSSDP 學士學位', b:s.firstYearDegreePlaces, p:`${s.firstYearDegreeProgrammes} 個課程；每年資助 $${cn(a.nonLaboratory)}（非實驗室）／$${cn(a.laboratory)}（實驗室）`},
    {t:'SSSDP 銜接學位', b:s.topUpDegreePlaces, p:`${s.topUpDegreeProgrammes} 個課程；供副學位畢業生銜接`},
    {t:'應用學位課程', b:'$'+cn(a.appliedDegreeLaboratory), p:`實驗室為本每年資助；非實驗室為本 $${cn(a.appliedDegreeNonLaboratory)}。強調職業專才培訓`}
  ];
  $('#sssdpCards').innerHTML = cards.map(c=>`<div class="mini-card"><h5>${c.t}</h5><b>${typeof c.b==='number'?cn(c.b):c.b}</b><p>${c.p}</p></div>`).join('')
    + `<div class="mini-card"><h5>指定界別</h5><p style="margin-top:4px">${s.sectors.join('、')}</p></div>`;
}
function renderMovement(){
  const m=G.movement;
  const items = (m.newProgrammes||[]).map(x=>({inst:x.inst, code:x.code, txt:x.name, type:'新課程'}))
    .concat((m.renamedOrSplit||[]).map(x=>({inst:x.inst, code:x.code, txt:x.change, type:'改組／改名'})));
  $('#moveGrid').innerHTML = items.map(i=>`<div class="move"><b>${esc(i.code)}</b><span>${esc(i.txt)}</span></div>`).join('');
}

/* boot part 1 */
buildMe(); refreshMe(); renderMap(); renderGradeMatch(); renderTimeline();
buildCalc(); refreshCalc(); renderScoreTable(); renderScoringTable(); renderFlex(); renderSssdp(); renderMovement();

/* ============================================================
   04 · 聯招以外
   ============================================================ */
function renderNonJupas(){
  $('#nonJupasDates').innerHTML = G.nonJupasDates.map(d=>{
    const dt=d.date.slice(5).split('-');
    return `<li><time>${+dt[0]}月${+dt[1]}日</time><span>${esc(d.event)}</span></li>`;
  }).join('');

  const f=G.nonJupasFees;
  const rows=[];
  if(f['留位費上限']) rows.push(['聯招留位費上限', f['留位費上限']]);
  if(f['嶺南大學留位費']) rows.push(['嶺南大學留位費', f['嶺南大學留位費']]);
  if(f['香港演藝學院留位費']) rows.push(['演藝學院留位費', f['香港演藝學院留位費']]);
  if(f['報名費']) Object.entries(f['報名費']).forEach(([k,v])=>rows.push(['報名費 · '+k, typeof v==='number'?'$'+cn(v):v]));
  if(f['樹仁2026/27全年學費']) Object.entries(f['樹仁2026/27全年學費']).forEach(([k,v])=>rows.push(['樹仁學費 · '+k, typeof v==='number'?'$'+cn(v):v]));
  $('#feeTable').innerHTML = `<ul class="spec">${rows.map(([k,v])=>`<li><span>${esc(k)}</span><b>${esc(v)}</b></li>`).join('')}</ul>`;

  $('#refundTable tbody').innerHTML = G.refund.map(r=>`<tr>
    <td>${esc(r.institution)}</td><td class="num">$${cn(r.deposit_hkd)}</td>
    <td class="num">${r.admin_fee_hkd?('$'+cn(r.admin_fee_hkd)):(r.admin_fee_note||'—')}</td>
  </tr>`).join('');

  $('#instGrid').innerHTML = G.institutions.map(i=>`<div class="inst">
    <div class="inst-top"><h5>${esc(i.short)}</h5><span class="type ${i.type==='自資'?'self':''}">${esc(i.type)}</span></div>
    <p style="font-size:11.5px;color:var(--ink-3)">${esc(i.official_name||'')}</p>
    <p>${esc(i.intro||'')}</p>
  </div>`).join('');
}

function renderSubdegree(){
  const s=G.subdegreeSSSDP;
  $('#subStats').innerHTML = [
    {t:'SSSDP 副學位課程', b:s.programmes, p:'個課程，合共 '+cn(s.places)+' 個學額'},
    {t:'實驗室為本資助', b:'$'+cn(s.subsidy_amounts.laboratory_hkd), p:'每年每名學生'},
    {t:'非實驗室為本資助', b:'$'+cn(s.subsidy_amounts.non_laboratory_hkd), p:'每年每名學生'},
    {t:'教資會高年級學額', b:'5,000', p:'2026/27 學年，理大佔 1,750'}
  ].map(c=>`<div class="mini-card"><h5>${c.t}</h5><b>${typeof c.b==='number'?cn(c.b):c.b}</b><p>${c.p}</p></div>`).join('');

  const rows=[];
  s.institutions.forEach(inst=>{
    inst.courses.forEach(c=>rows.push({inst:inst.name, ...c}));
  });
  $('#subSssdpTable tbody').innerHTML = rows.map(r=>`<tr>
    <td>${esc(r.inst)}</td><td>${esc(r.name)}<br><span class="fine">${esc(r.category||'')}</span></td>
    <td class="num">${r.places?cn(r.places):'—'}</td></tr>`).join('');

  $('#subScoringTable tbody').innerHTML = G.subScoring.map(r=>{
    const core = r.core ? Object.entries(r.core).map(([g,v])=>`${g}=${v}`).join(' / ') : '—';
    const cit = r.citizenship ? Object.entries(r.citizenship).map(([g,v])=>`${g}=${v}`).join(' / ') : '—';
    return `<tr><td>${esc(r.institution)}</td><td class="fine">${esc(core)}</td><td class="fine">${esc(cit)}</td></tr>`;
  }).join('');

  $('#subScoreTable tbody').innerHTML = G.subScores.map(r=>`<tr>
    <td>${esc(r.programme)}<br><span class="fine">${esc(r.institution)}</span></td>
    <td class="num">${esc(String(r.score))}</td></tr>`).join('');
}

function renderDae(){
  const d=G.dae;
  $('#daeStruct').innerHTML = d.structure_options.map(o=>`<div class="opt"><b>組合 ${o.id}</b>${esc(o.composition)}<br><span class="fine">${esc(o.outcome)}</span></div>`).join('');
  const t=[...G.daeTuition].sort((a,b)=>a.tuition_hkd-b.tuition_hkd);
  const max=Math.max(...t.map(x=>x.tuition_hkd)), min=Math.min(...t.map(x=>x.tuition_hkd));
  $('#daeChart').innerHTML = t.map(x=>`<div class="bar-row"><span class="lb">${esc(x.institution.replace('港專 香港專業進修學校','港專'))}</span>
    <span class="bar-track"><span class="bar-fill" style="width:${(x.tuition_hkd/max)*100}%;background:linear-gradient(90deg,var(--jade),var(--jade-2))"></span></span>
    <b>$${cn(x.tuition_hkd)}</b></div>`).join('')
    + `<p class="fine" style="margin-top:10px">最高與最低相差 $${cn(max-min)}；全部課程出席率達 80% 可獲發還三成學費。</p>`;

  $('#daeGrid').innerHTML = G.daeInstitutions.map(i=>`<div class="inst">
    <div class="inst-top"><h5>${esc(i.name)}</h5><span class="type self">DAE</span></div>
    <p>${esc(i.dae_focus||'')}</p>
    <p class="fine">${esc(i.venue||'')}</p>
    <div class="fee">學費 $${cn(i.tuition_full_time_hkd)} / 年${i.tel?' · '+esc(i.tel):''}</div>
  </div>`).join('');

  $('#qfList').innerHTML = [...G.qf].sort((a,b)=>b.level-a.level).map(q=>`<div class="qf-row ${q.level===3?'hl':''}">
    <b>${q.level}</b><span>${q.titles.map(esc).join('、')}${q.level===3?' <em style="font-style:normal;color:var(--jade)">← 文憑試 / DAE</em>':''}</span></div>`).join('');

  $('#nonlocalList').innerHTML = G.nonlocalNotes.slice(0,6).map(n=>`<li>${esc(n)}</li>`).join('');

  $('#nonlocalTable tbody').innerHTML = G.nonlocalProgrammes.map(p=>`<tr>
    <td>${esc(p.institution)}</td><td>${esc(p.awarding_body)}</td>
    <td class="fine">${p.programmes.map(esc).join('<br>')}</td>
    <td class="num">${p.years||'—'}</td><td class="num">${p.tuition_per_year_hkd?'$'+cn(p.tuition_per_year_hkd):'—'}</td></tr>`).join('');

  // tabs
  $$('#beyondTabs button').forEach(b=>b.addEventListener('click',()=>{
    $$('#beyondTabs button').forEach(x=>x.classList.remove('on')); b.classList.add('on');
    $$('.tab-panel').forEach(p=>p.classList.toggle('on', p.dataset.panel===b.dataset.tab));
  }));
}

/* ============================================================
   05 · 留學
   ============================================================ */
const NEAR=['內地','臺灣','澳門','新加坡','日本','韓國'];
const LOW=['內地','臺灣','澳門','德國','法國','芬蘭'];
const ZH=['內地','臺灣','澳門','日本','韓國','新加坡'];
function renderDest(){
  $('#destGrid').innerHTML = G.destinations.map(d=>{
    const tags=[];
    if(ZH.includes(d.name)) tags.push('zh');
    else tags.push('en');
    if(NEAR.includes(d.name)) tags.push('near');
    if(LOW.includes(d.name)) tags.push('low');
    return `<div class="dest" data-t="${tags.join(' ')}" data-x="${esc((d.name+' '+d.學制+' '+d.語言要求+' '+d.亮點).toLowerCase())}">
      <div class="dest-head"><h4>${esc(d.name)}</h4><span class="dlang ${ZH.includes(d.name)?'zh':'en'}">${ZH.includes(d.name)?'中文授課':'英語授課'}</span></div>
      <div class="dest-body">
        <div class="row"><b>入學要求</b><span>${esc(d.入學要求)}</span></div>
        <div class="row"><b>學費</b><span>${esc(d.學費範圍)}</span></div>
        <div class="row"><b>生活費</b><span>${esc(d.生活費)}</span></div>
        <div class="row"><b>語言</b><span>${esc(d.語言要求)}</span></div>
        <div class="row"><b>截止</b><span>${esc(d.申請截止)}</span></div>
        <div class="row"><b>亮點</b><span class="dim">${esc(d.亮點)}</span></div>
      </div>
    </div>`;
  }).join('');

  const apply=()=>{
    const f=($('#abroadFilter .on')||{}).dataset ? $('#abroadFilter .on').dataset.f : 'all';
    const q=($('#abroadSearch').value||'').trim().toLowerCase();
    let n=0;
    $$('#destGrid .dest').forEach(el=>{
      const okF = f==='all' || el.dataset.t.split(' ').includes(f);
      const okQ = !q || el.dataset.x.includes(q);
      const show = okF&&okQ;
      el.classList.toggle('hidden', !show); if(show) n++;
    });
  };
  $$('#abroadFilter button').forEach(b=>b.addEventListener('click',()=>{
    $$('#abroadFilter button').forEach(x=>x.classList.remove('on')); b.classList.add('on'); apply();
  }));
  $('#abroadSearch').addEventListener('input', apply);
}

/* ============================================================
   06 · 職場
   ============================================================ */
function renderWork(){
  $('#indList').innerHTML = G.industries.map((i,idx)=>`<div class="ind" data-i="${idx}">
    <button class="ind-head" aria-expanded="false">
      <h5>${esc(i.name)}</h5>
      <span class="ind-pay">${esc((i['起薪/薪酬範圍']||'').slice(0,72))}${(i['起薪/薪酬範圍']||'').length>72?'…':''}</span>
      <span class="ind-toggle">▾</span>
    </button>
    <div class="ind-body">
      <div><h6>薪酬</h6><p>${esc(i['起薪/薪酬範圍'])}</p></div>
      <div><h6>入職要求</h6><p>${esc(i['入職要求'])}</p></div>
      <div><h6>資歷</h6><p>${esc(i['資歷'])}</p></div>
      <div><h6>前景</h6><p>${esc(i['前景'])}</p></div>
    </div></div>`).join('');
  $$('#indList .ind-head').forEach(b=>b.addEventListener('click',()=>{
    const p=b.parentElement; p.classList.toggle('open'); b.setAttribute('aria-expanded',p.classList.contains('open'));
  }));

  $('#schemeGrid').innerHTML = G.schemes.map(s=>`<div class="scheme" data-x="${esc((s.name+' '+s['對象']+' '+s['津貼']).toLowerCase())}">
    <h5>${esc(s.name)}</h5>
    <div class="srow"><b>對象</b>${esc(s['對象'])}</div>
    <div class="srow"><b>津貼</b>${esc(s['津貼'])}</div>
    ${s['網址']?`<div class="srow"><b>網址</b><a href="https://${esc(String(s['網址']).replace(/^https?:\/\//,''))}" target="_blank" rel="noopener">${esc(s['網址'])}</a></div>`:''}
  </div>`).join('');
  $('#schemeCount').textContent = G.schemes.length + ' 個計劃';
  $('#schemeSearch').addEventListener('input', e=>{
    const q=e.target.value.trim().toLowerCase(); let n=0;
    $$('#schemeGrid .scheme').forEach(el=>{
      const show=!q||el.dataset.x.includes(q); el.classList.toggle('hidden',!show); if(show)n++;
    });
    $('#schemeCount').textContent = n + ' 個計劃';
  });
}

/* ============================================================
   07 · 放榜準備
   ============================================================ */
const CHECK = [
  '身份證等必備證明文件',
  '文憑試成績單（正副本多份）',
  '專上院校「有條件取錄通知書」（如有）',
  '中四至中六成績表（有家長簽署，正副本多份）',
  '學生學習概覽（SLP）（正副本多份）',
  '比賽／活動證書，或聯招 OEA 部分（正副本多份）',
  '推薦書（如有）（正副本多份）',
  '學生證件照片（最少 12 張）',
  '《出路指南 2026》',
  '手提電話／平板（足夠電量及充電裝置）',
  '文具（原子筆、記事簿、文件夾、膠水、萬字夾、塗改液）',
  '八達通卡、輔幣（車資）',
  '足夠現金及提款卡（報名費、膳食）',
  '雨具／防曬衣物／扇／清水',
  '合適衣著、髮式儀容'
];
const CKEY='chulu2026.check';
function renderPrep(){
  let done={}; try{ done=JSON.parse(localStorage.getItem(CKEY)||'{}'); }catch(e){}
  $('#checklist').innerHTML = CHECK.map((t,i)=>`<li><label><input type="checkbox" data-i="${i}" ${done[i]?'checked':''}><span>${esc(t)}</span></label></li>`).join('');
  const upd=()=>{
    const boxes=$$('#checklist input'), n=boxes.filter(b=>b.checked).length;
    $('#prepCount').textContent = n+' / '+boxes.length;
    $('#prepBar').style.width = (n/boxes.length*100)+'%';
    const o={}; boxes.forEach(b=>{ if(b.checked) o[b.dataset.i]=1; });
    try{ localStorage.setItem(CKEY, JSON.stringify(o)); }catch(e){}
  };
  $$('#checklist input').forEach(b=>b.addEventListener('change',upd)); upd();

  $('#hotlineList').innerHTML = G.hotlines.map(h=>`<li><span>${esc(h.org)}${h.phone_parent?`<small>${esc(h.phone_parent)}</small>`:''}</span><b>${esc(h.phone||'')}</b></li>`).join('');
}

/* ============================================================
   interactions
   ============================================================ */
function initUI(){
  // me panel
  const panel=$('#mePanel'), btn=$('#meBtn');
  const openMe=(v)=>{
    panel.hidden = v==null ? !panel.hidden : !v;
    btn.setAttribute('aria-expanded', String(!panel.hidden));
    if(!panel.hidden) panel.scrollTop=0;
  };
  btn.addEventListener('click',()=>openMe());
  $('#meClose').addEventListener('click',()=>openMe(false));
  $('#heroMe').addEventListener('click',()=>{ openMe(true); setTimeout(()=>$('#meGrid select').focus(),80); });
  $('#meClear').addEventListener('click',()=>{
    state={chi:'',eng:'',math:'',csd:'',e1:'',e2:'',e3:'',m12:''}; save();
    buildMe(); refreshMe(); refreshCalc(); renderMap(); renderGradeMatch(); renderScoreTable();
  });
  document.addEventListener('click',e=>{
    if(!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) openMe(false);
  });

  // nav active + progress
  const secs=$$('main section[id]');
  const links=$$('#nav a');
  const onScroll=()=>{
    const h=document.documentElement;
    $('#progress').style.width = (h.scrollTop/(h.scrollHeight-h.clientHeight)*100)+'%';
    let cur=secs[0]&&secs[0].id;
    secs.forEach(s=>{ if(s.getBoundingClientRect().top<160) cur=s.id; });
    links.forEach(a=>a.classList.toggle('on', a.getAttribute('href')==='#'+cur));
  };
  document.addEventListener('scroll',onScroll,{passive:true}); onScroll();

  // search
  const modal=$('#searchModal'), input=$('#searchInput'), res=$('#searchResults');
  const items=[
    {t:'出路地圖', s:'四層門檻 十七條路線', h:'#map'},
    {t:'2026 放榜全流程', s:'時間軸 重要日程', h:'#timeline'},
    {t:'聯招計分器', s:'五科成績 換算 最佳五科', h:'#jupas'},
    {t:'彈性收生', s:'核心科目未達 332A', h:'#jupas'},
    {t:'SSSDP 與應用學位', s:'資助學額 46,780 81,450', h:'#jupas'},
    {t:'重考合計政策', s:'最佳成績計算', h:'#jupas'},
    {t:'自資學士 · NMTSS', s:'$35,120 免入息審查', h:'#beyond'},
    {t:'副學位', s:'副學士 高級文憑 SSSDP 退款', h:'#beyond'},
    {t:'應用教育文憑 DAE', s:'600 小時 資歷架構第 3 級', h:'#beyond'},
    {t:'資歷架構', s:'七級 QF', h:'#beyond'},
    {t:'留學漫遊', s:'十五個目的地', h:'#abroad'},
    {t:'職場情報', s:'熱門行業 學徒 見習', h:'#work'},
    {t:'放榜物資清單', s:'checklist 熱線', h:'#prepare'}
  ]
   .concat(G.destinations.map(d=>({t:d.name+' 留學', s:d.學費範圍, h:'#abroad'})))
   .concat(G.industries.map(i=>({t:i.name, s:(i['起薪/薪酬範圍']||'').slice(0,40), h:'#work'})))
   .concat(G.schemes.map(s=>({t:s.name, s:(s['對象']||'').slice(0,40), h:'#work'})))
   .concat(G.institutions.map(i=>({t:i.short+' '+i.name, s:'院校介紹 · '+i.type, h:'#beyond'})));

  const openSearch=()=>{ modal.hidden=false; input.value=''; input.focus(); paint(''); };
  const closeSearch=()=>{ modal.hidden=true; };
  $('#searchBtn').addEventListener('click',openSearch);
  modal.addEventListener('click',e=>{ if(e.target===modal) closeSearch(); });
  document.addEventListener('keydown',e=>{
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){ e.preventDefault(); openSearch(); }
    if(e.key==='Escape'){ closeSearch(); openMe(false); }
  });
  let sel=0, shown=[];
  function paint(q){
    const qq=(q||'').toLowerCase();
    shown = items.filter(i=>!qq|| (i.t+' '+i.s).toLowerCase().includes(qq)).slice(0,12);
    sel=0;
    res.innerHTML = shown.length? shown.map((i,idx)=>`<div class="sr ${idx===0?'sel':''}" data-h="${i.h}">
      <b>${esc(i.t)}</b><small>${esc(i.s||'')}</small></div>`).join('') : '<div class="sr"><b>沒有結果</b></div>';
  }
  input.addEventListener('input',()=>paint(input.value));
  res.addEventListener('click',e=>{
    const r=e.target.closest('.sr'); if(!r||!r.dataset.h) return;
    closeSearch(); location.hash=r.dataset.h;
  });
  document.addEventListener('keydown',e=>{
    if(modal.hidden||!shown.length) return;
    const rs=$$('#searchResults .sr');
    if(e.key==='ArrowDown'){ e.preventDefault(); sel=Math.min(sel+1,shown.length-1); }
    if(e.key==='ArrowUp'){ e.preventDefault(); sel=Math.max(sel-1,0); }
    if(e.key==='Enter'){ e.preventDefault(); closeSearch(); location.hash=shown[sel].h; return; }
    rs.forEach((r,i)=>r.classList.toggle('sel',i===sel));
    if(rs[sel]) rs[sel].scrollIntoView({block:'nearest'});
  });
}

renderInterview(); renderNonJupas(); renderSubdegree(); renderDae(); renderDest(); renderWork(); renderPrep(); initUI();
})();
