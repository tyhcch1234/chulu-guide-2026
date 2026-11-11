/* 課程資料庫 2026 */
(function(){
'use strict';
const P = window.PROGRAMMES || [];
const G = window.GUIDE || {};
const $ = (s,r)=>(r||document).querySelector(s);
const $$ = (s,r)=>Array.from((r||document).querySelectorAll(s));
const esc = s => String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const LV = {'5**':7,'5*':6,'5':5,'4':4,'3':3,'2':2,'1':1};
const num = v => (typeof v==='number'&&isFinite(v))?v:null;
const fp = v => num(v)==null?'—':(Number.isInteger(v)?v:v.toFixed(2).replace(/\.?0+$/,''));

/* ---- 我的成績 ---- */
let st={chi:'',eng:'',math:'',csd:'',e1:'',e2:'',e3:'',m12:''};
try{const s=JSON.parse(localStorage.getItem('chulu2026.grades')||'null'); if(s) st=Object.assign(st,s);}catch(e){}
function myBest5(levels){
  const pool=['chi','eng','math','e1','e2','e3','m12'].map(k=>st[k]).filter(g=>g&&g!=='A'&&g!=='U')
    .map(g=>(levels&&levels[g]!=null)?levels[g]:(LV[g]||0)).filter(v=>v>0).sort((a,b)=>b-a);
  return pool.slice(0,5).reduce((a,b)=>a+b,0);
}
const hasMe = ['chi','eng','math','e1','e2'].every(k=>st[k]);
const AVG=new Set(['東華學院','聖方濟各大學','香港恆生大學','香港樹仁大學','香港伍倫貢學院','香港珠海學院','香港高等教育科技學院（THEi）']);
const scaleOf = inst => { const s=Object.values(G.scoring||{}).find(x=>x.nameTC===inst); return s?s.levels:null; };

/* ---- state ---- */
const S={lv:'degree',q:'',inst:'',cat:'',sort:'inst',mine:false,limit:40};

/* ---- populate filters ---- */
const insts=[...new Set(P.map(p=>p.i).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'zh-Hant'));
$('#dbInst').innerHTML='<option value="">所有院校</option>'+insts.map(i=>`<option value="${esc(i)}">${esc(i)}</option>`).join('');
const cats=[...new Set(P.filter(p=>p.lv==='sub').map(p=>p.cat).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'zh-Hant'));
$('#dbCat').innerHTML='<option value="">所有範疇</option>'+cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');

/* ---- counts ---- */
const nDeg=P.filter(p=>p.lv==='degree').length, nSub=P.filter(p=>p.lv==='sub').length;
$('#cAll').textContent=nDeg+nSub; $('#cDegree').textContent=nDeg; $('#cSub').textContent=nSub;

/* ---- helpers ---- */
function scoreOf(p){
  if(p.lv==='degree') return num(p.l) ?? num(p.m);
  return num(p.s);
}
function scoreLabel(p){
  if(p.lv==='degree'){
    if(AVG.has(p.i) && num(p.m)!=null) return {v:p.m, tag:'平均'};
    if(num(p.l)!=null) return {v:p.l, tag:'LQ'};
    if(num(p.m)!=null) return {v:p.m, tag:'中位'};
    return null;
  }
  if(num(p.s)!=null) return {v:p.s, tag:'平均'};
  if(p.sr) return {v:null, tag:p.sr};
  return null;
}
function eligible(p){
  if(!hasMe) return false;
  const sc=scoreOf(p); if(sc==null) return false;
  const levels = p.lv==='degree' ? scaleOf(p.i) : null;
  return myBest5(levels) >= sc;
}
function filtered(){
  const q=S.q.trim().toLowerCase();
  let out=P.filter(p=>{
    if(S.lv!=='all' && p.lv!==S.lv) return false;
    if(S.inst && p.i!==S.inst) return false;
    if(S.cat && p.cat!==S.cat) return false;
    if(S.mine && !eligible(p)) return false;
    if(q){
      const hay=(p.c+' '+p.n+' '+p.i+' '+(p.cat||'')).toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  });
  const raw={
    'score-asc':(a,b)=>(scoreOf(a)??999)-(scoreOf(b)??999),
    'score-desc':(a,b)=>(scoreOf(b)??-1)-(scoreOf(a)??-1),
    'ratio-desc':(a,b)=>(num(b.r)??-1)-(num(a.r)??-1),
    'places-desc':(a,b)=>(num(b.p)??-1)-(num(a.p)??-1),
    'name':(a,b)=>(a.n||'').localeCompare(b.n||'','zh-Hant'),
    'inst':(a,b)=>(a.i||'').localeCompare(b.i||'','zh-Hant') || String(a.c||'').localeCompare(String(b.c||''))
  }[S.sort];
  const lvOrder=p=>p.lv==='degree'?0:1;
  return out.sort((a,b)=> S.lv==='all' ? (lvOrder(a)-lvOrder(b) || raw(a,b)) : raw(a,b));
}

/* ---- render ---- */
let rows=[];
function render(){
  rows=filtered();
  const shown=rows.slice(0,S.limit);
  $('#dbCount').textContent=`${rows.length} 個課程`;
  $('#dbBody').innerHTML = shown.length? shown.map((p,idx)=>{
    const sl=scoreLabel(p), good=p.lv==='degree'&&eligible(p);
    return `<tr data-k="${P.indexOf(p)}" class="${good?'elig':''}">
      <td class="c-code">${esc(p.c||'—')}</td>
      <td><span class="pname">${esc(p.n)}</span>${p.cat?`<span class="badge sub">${esc(p.cat)}</span>`:''}
        <div class="pmeta">${esc((p.mt||'').slice(0,46))}${(p.mt||'').length>46?'…':''}</div></td>
      <td class="c-inst">${esc(p.i||'')}</td>
      <td class="num c-place">${p.p?(p.g?'≈':'')+fp(p.p):'—'}</td>
      <td class="num"><span class="sc ${good?'low':''}">${sl?(sl.v!=null?fp(sl.v):esc(sl.tag)):'—'}</span>${sl&&sl.v!=null?`<div class="pmeta">${sl.tag}</div>`:''}</td>
      <td class="num c-band">${p.b?fp(p.b):'—'}</td>
      <td class="num c-ratio">${p.r?fp(p.r):'—'}</td>
      <td class="c-more">›</td>
    </tr>`;
  }).join('') : `<tr><td colspan="8" class="empty">沒有符合條件的課程，試試清除篩選。</td></tr>`;
  $('#dbMore').hidden = rows.length<=S.limit;
  $('#dbMore').textContent = `載入更多（還有 ${Math.max(0,rows.length-S.limit)} 個）`;
}

/* ---- drawer ---- */
function openDrawer(i){
  const p=P[i]; if(!p) return;
  const sl=scoreLabel(p);
  $('#dTitle').textContent=p.n||'課程';
  const cells=[];
  if(p.c) cells.push(['聯招編號',p.c]);
  cells.push(['院校',p.i||'—']);
  if(p.lv==='degree'){
    if(num(p.l)!=null) cells.push(['2025 LQ',fp(p.l)]);
    if(num(p.m)!=null) cells.push(['2025 中位',fp(p.m)]);
    if(num(p.u)!=null) cells.push(['2025 UQ',fp(p.u)]);
    if(p.p) cells.push(['首年學額',fp(p.p)]);
    if(p.b) cells.push(['Band A 報讀',fp(p.b)]);
    if(p.r) cells.push(['每學額競爭',fp(p.r)]);
  }else{
    if(num(p.s)!=null) cells.push(['平均總分',fp(p.s)]);
    if(p.sr) cells.push(['分數範圍',p.sr]);
    if(p.cat) cells.push(['學科範疇',p.cat]);
    if(p.f) cells.push(['學費',p.f]);
  }
  const sec=[];
  if(p.mt) sec.push(['計分方法',p.mt]);
  if(p.w) sec.push(['科目比重',p.w]);
  if(p.rq) sec.push(['額外課程要求',p.rq]);
  if(p.e) sec.push(['入學條件',p.e]);
  if(p.x) sec.push(['額外要求',p.x]);
  if(hasMe){
    const sc=scoreOf(p);
    if(sc!=null){
      const mine=myBest5(p.lv==='degree'?scaleOf(p.i):null);
      sec.unshift(['你的分數',`${mine} 分；此課程參考分數 ${fp(sc)}。${mine>=sc?'高於或等於參考分數。':'低於參考分數。'}`]);
    }
  }
  $('#dBody').innerHTML =
    `<div class="d-hero"><span>${p.lv==='degree'?'聯招學士':'副學位'}</span>${p.cat?`<span>${esc(p.cat)}</span>`:''}${hasMe&&scoreOf(p)!=null&&eligible(p)?'<span style="background:var(--jade);color:#fff">分數達門檻</span>':''}</div>
     <div class="d-grid">${cells.map(([k,v])=>`<div class="d-cell"><b>${esc(v)}</b><span>${esc(k)}</span></div>`).join('')}</div>
     ${sec.map(([k,v])=>`<div class="d-sec"><h4>${esc(k)}</h4><p>${esc(v)}</p></div>`).join('')}
     <p class="d-warn">資料照錄學友社《出路指南 2026》${p.lv==='degree'?'第一冊 p.62–107':'第二冊 p.32–55'}。課程每年調整，報名前請以院校及聯招處公布為準。</p>`;
  $('#drawer').hidden=false; $('#dScrim').hidden=false;
  document.body.style.overflow='hidden';
}
function closeDrawer(){
  $('#drawer').hidden=true; $('#dScrim').hidden=true; document.body.style.overflow='';
}

/* ---- events ---- */
$('#dbBody').addEventListener('click',e=>{
  const tr=e.target.closest('tr[data-k]'); if(!tr) return;
  openDrawer(+tr.dataset.k);
});
$('#dClose').addEventListener('click',closeDrawer);
$('#dScrim').addEventListener('click',closeDrawer);
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeDrawer(); });
$('#dbSearch').addEventListener('input',e=>{S.q=e.target.value;S.limit=40;render();});
$('#dbInst').addEventListener('change',e=>{S.inst=e.target.value;S.limit=40;render();});
$('#dbCat').addEventListener('change',e=>{S.cat=e.target.value;S.limit=40;render();});
$('#dbSort').addEventListener('change',e=>{S.sort=e.target.value;S.limit=40;render();});
$('#dbMine').addEventListener('change',e=>{S.mine=e.target.checked;S.limit=40;render();});
$('#dbMore').addEventListener('click',()=>{S.limit+=40;render();});
$$('#dbTabs button').forEach(b=>b.addEventListener('click',()=>{
  $$('#dbTabs button').forEach(x=>x.classList.remove('on')); b.classList.add('on');
  S.lv=b.dataset.lv; S.cat=''; $('#dbCat').value=''; S.limit=40; render();
}));
window.addEventListener('storage',e=>{ if(e.key==='chulu2026.grades'){ location.reload(); } });
// refresh when grades panel changes (same page)
document.addEventListener('click',e=>{
  if(e.target.closest('#meGrid,#meClear,#calcGrid')) setTimeout(()=>{
    try{const s=JSON.parse(localStorage.getItem('chulu2026.grades')||'null'); if(s) st=Object.assign(st,s);}catch(err){}
    render();
  },60);
});
render();
})();
