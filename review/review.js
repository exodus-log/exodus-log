/* ===== review/review.js — תחנת הבדיקה =====
   מציגה את האתר החי בתוך iframe בגודל מדויק (טלפון לאורך / לרוחב / מחשב), מקטינה אותו למסך,
   ומציירת מעליו מספר לכל פיצ'ר מתוך features.js. האתר והתחנה באותו מקור (exodus-log.com),
   ולכן אפשר לקרוא את ה-DOM ואת window.EXO של ההדמיה ישירות, בלי לשנות שורה בקוד שלה. */
(function(){
'use strict';
var $=function(id){ return document.getElementById(id); };
var VIEWS={portrait:[390,844,'טלפון לאורך'], landscape:[844,390,'טלפון לרוחב'], desktop:[1440,900,'מחשב']};
var SCREENS={sim:'ההדמיה', menu:'התפריט', globe:'הגלובוס', journey:'המסע והניתוח', deep:'הניתוח המלא'};
var IN={sim:'בהדמיה', menu:'בתפריט', globe:'בגלובוס', journey:'במסע והניתוח', deep:'בניתוח המלא'};
var STATUS={open:['פתוח','o'], fixed:['טופל — לבדוק','f'], done:['אושר','d'], wontfix:['לא ייעשה','d']};
var REPO='https://api.github.com/repos/exodus-log/exodus-log/commits?per_page=1&path=';
var FEAT=(window.REVIEW_FEATURES||[]).slice();
var BYKEY={}; FEAT.forEach(function(f){ BYKEY[f.key]=f; });

function ls(k,v){ try{ if(v===undefined) return localStorage.getItem(k); if(v===null) localStorage.removeItem(k); else localStorage.setItem(k,v); }catch(e){} return null; }
function ss(k,v){ try{ if(v===undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k,v); }catch(e){} return null; }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function ago(t){ var m=Math.round((Date.now()-t)/60000); if(m<1) return 'עכשיו'; if(m<60) return 'לפני '+m+' דק׳'; var h=Math.round(m/60); if(h<48) return 'לפני '+h+' ש׳'; return 'לפני '+Math.round(h/24)+' ימים'; }
function when(t){ try{ return new Date(t).toLocaleString('he-IL',{day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'}); }catch(e){ return ''; } }
function toast(m,ms){ var t=$('toast'); t.textContent=m; t.classList.add('on'); clearTimeout(toast.h); toast.h=setTimeout(function(){ t.classList.remove('on'); },ms||2400); }

/* ---------- המפתח ---------- */
var KEY=null;
(function(){ var m=/[#&]k=([A-Za-z0-9_-]{20,200})/.exec(location.hash);
  /* המפתח נשאר בכתובת בכוונה: כך סימנייה או קיצור במסך הבית (שבאייפון מקבל אחסון נפרד מהדפדפן) ממשיכים לעבוד */
  if(m){ KEY=m[1]; ls('exoReviewKey',KEY); }
  else KEY=ls('exoReviewKey'); })();

/* ---------- המצב ---------- */
var S={ view:ls('rvView')||'portrait', page:'sim', target:null, auto:true, mode:'notes', zoom:1, frames:false,
        sel:null, point:null, notes:[], meta:{}, info:null, screen:'sim', s:1 };
if(!VIEWS[S.view]) S.view='portrait';

/* ---------- איזו גרסה: next אם היא חדשה יותר, אחרת הראשי ---------- */
function lastCommit(path){
  return fetch(REPO+encodeURIComponent(path),{cache:'no-store'}).then(function(r){ if(!r.ok) throw new Error(r.status); return r.json(); })
    .then(function(j){ return j&&j[0]?{t:Date.parse(j[0].commit.committer.date), msg:(j[0].commit.message||'').split('\n')[0]}:null; });
}
function newest(a){ var b=null; a.forEach(function(x){ if(x&&(!b||x.t>b.t)) b=x; }); return b; }
function detect(){
  var cached=null; try{ cached=JSON.parse(ss('rvInfo')||'null'); }catch(e){}
  if(cached&&Date.now()-cached.at<10*60000) return Promise.resolve(cached);
  var live=fetch('/next/',{cache:'no-store'}).then(function(r){ return r.ok?r.text():''; }).then(function(t){ return t.indexOf('assets/v2n/')>=0; }).catch(function(){ return false; });
  var gh=Promise.all([lastCommit('next/index.html'),lastCommit('assets/v2n'),lastCommit('index.html'),lastCommit('assets/v2')])
    .then(function(r){ return {next:newest([r[0],r[1]]), main:newest([r[2],r[3]])}; }).catch(function(){ return null; });
  return Promise.all([live,gh]).then(function(r){
    var info={at:Date.now(), live:r[0], next:r[1]&&r[1].next, main:r[1]&&r[1].main, gh:!!r[1]};
    info.pick=!info.live?'main':(!info.gh?'next':((info.next&&info.main&&info.main.t>info.next.t)?'main':'next'));
    ss('rvInfo',JSON.stringify(info)); return info; });
}
function paintTarget(){
  var i=S.info||{}, t=S.target, c=$('tgt');
  c.classList.toggle('main',t==='main');
  $('tgtT').textContent=t==='next'?'next':'ראשי';
  $('tgtS').textContent=S.auto?'· החדש יותר':'· נבחר ידנית';
  var cm=t==='next'?i.next:i.main, line='';
  if(S.page==='deep') line='<b>הניתוח המלא</b> · אותו דף בשתי הגרסאות';
  else if(cm) line='<b>'+(t==='next'?'next':'הראשי')+'</b>, שינוי אחרון '+ago(cm.t)+': '+esc(cm.msg);
  else if(!i.gh&&i.at) line='לא הצלחתי לבדוק מול GitHub מה חדש יותר; מוצג '+(t==='next'?'next':'הראשי');
  if(i.at&&!i.live) line+=(line?' · ':'')+'אין כרגע תצוגה מקדימה ב-next';
  $('chg').innerHTML=line;
}
$('tgt').onclick=function(){
  var i=S.info||{};
  if(S.target==='main'&&!i.live){ toast('אין כרגע תצוגה מקדימה ב-next — היא מפנה לדף הראשי'); return; }
  S.target=S.target==='next'?'main':'next'; S.auto=(S.target===i.pick); ss('rvTarget',S.auto?'':S.target);
  paintTarget(); load();
};

/* ---------- טעינה ופריסה ---------- */
var fr=$('fr'), wrap=$('wrap'), stage=$('stage'), ov=$('ov'), shield=$('shield');
function url(bust){
  var u=S.page==='deep'?'/deep-dive':(S.target==='next'?'/next/':'/');
  return bust?u+'?rv='+Date.now().toString(36):u;
}
var loadedAt=0;
function load(bust){ $('loading').style.display=''; deepList=null; loadedAt=Date.now(); fr.src=url(bust); layout(); }
fr.addEventListener('load',function(){ $('loading').style.display='none'; deepList=null; unreg=[]; unregAt=0; });
function layout(){
  var v=VIEWS[S.view], W=v[0], H=v[1], sw=stage.clientWidth-16, sh=stage.clientHeight-16;
  var fit=Math.min(sw/W, sh/H); if(!(fit>0)) fit=0.3;
  S.s=fit*S.zoom;
  fr.style.width=W+'px'; fr.style.height=H+'px'; fr.style.transform='scale('+S.s+')';
  wrap.style.width=Math.round(W*S.s)+'px'; wrap.style.height=Math.round(H*S.s)+'px';
  tickNow();
}
window.addEventListener('resize',function(){ clearTimeout(layout.h); layout.h=setTimeout(layout,80); });

function segSet(host,attr,val){ [].forEach.call(host.querySelectorAll('button'),function(b){ b.setAttribute('aria-pressed',String(b.getAttribute(attr)===val)); }); }
$('views').onclick=function(e){ var b=e.target.closest('button'); if(!b) return; S.view=b.dataset.v; ls('rvView',S.view); S.zoom=1; segSet($('views'),'data-v',S.view); layout(); };
$('pages').onclick=function(e){ var b=e.target.closest('button'); if(!b||b.dataset.p===S.page) return; S.page=b.dataset.p; segSet($('pages'),'data-p',S.page); closeSheet(); paintTarget(); load(); };
$('reload').onclick=function(){ ss('rvInfo',''); detect().then(function(i){ S.info=i; if(S.auto) S.target=i.pick; paintTarget(); load(true); }); refreshNotes(); };
$('mode').onclick=function(e){ var b=e.target.closest('button'); if(!b) return; S.mode=b.dataset.m; segSet($('mode'),'data-m',S.mode); document.body.classList.toggle('use',S.mode==='use');
  if(S.mode==='use') toast('מצב שימוש: האתר מגיב למגע. חזור ל"הערות" כדי לכתוב.'); };
$('framesBtn').onclick=function(){ S.frames=!S.frames; this.setAttribute('aria-pressed',String(S.frames)); tickNow(); };
var ZL=[1,1.5,2,3];
function zoomBy(d){ var i=ZL.indexOf(S.zoom); i=Math.max(0,Math.min(ZL.length-1,(i<0?0:i)+d)); if(ZL[i]===S.zoom) return;
  var cx=(stage.scrollLeft+stage.clientWidth/2)/Math.max(1,wrap.offsetWidth), cy=(stage.scrollTop+stage.clientHeight/2)/Math.max(1,wrap.offsetHeight);
  S.zoom=ZL[i]; layout();
  stage.scrollLeft=cx*wrap.offsetWidth-stage.clientWidth/2; stage.scrollTop=cy*wrap.offsetHeight-stage.clientHeight/2; }
$('zIn').onclick=function(){ zoomBy(1); }; $('zOut').onclick=function(){ zoomBy(-1); };

/* ---------- קריאת הדף הנבדק ---------- */
var curDoc=null;
function frameDoc(){ try{ var d=fr.contentDocument; curDoc=d&&d.body?d:null; }catch(e){ curDoc=null; } return curDoc; }
function vis(el,W,H){
  if(!el||!el.isConnected||el.ownerDocument!==curDoc) return null;
  var r=el.getBoundingClientRect();
  if(r.width<2||r.height<2){
    /* display:contents (שורות הנתונים בטלפון לאורך) — אין לאלמנט קופסה משלו; המסגרת היא איחוד הילדים */
    var dv=el.ownerDocument&&el.ownerDocument.defaultView; if(!dv) return null;
    var cs=dv.getComputedStyle(el); if(cs.display!=='contents') return null;
    var u=null, c; for(c=el.firstElementChild;c;c=c.nextElementSibling){ var q=vis(c,W,H); if(q) u=u?{x:Math.min(u.x,q.x),y:Math.min(u.y,q.y),w:Math.max(u.x+u.w,q.x+q.w)-Math.min(u.x,q.x),h:Math.max(u.y+u.h,q.y+q.h)-Math.min(u.y,q.y)}:q; }
    return u; }
  try{ if(el.checkVisibility&&!el.checkVisibility({opacityProperty:true,visibilityProperty:true})) return null; }catch(e){}
  if(r.right<0||r.bottom<0||r.left>W||r.top>H) return null;
  return {x:r.left,y:r.top,w:r.width,h:r.height};
}
function screenOf(d){
  if(S.page==='deep') return 'deep';
  var b=d.body, j=d.getElementById('journey');
  if(b.classList.contains('j-open')||(j&&!j.hidden)) return 'journey';
  if(b.classList.contains('g-open')) return 'globe';
  var m=d.getElementById('menu'); if(m&&!m.hidden) return 'menu';
  return 'sim';
}
function allowed(scr){
  if(S.screen==='journey') return scr==='journey';
  if(S.screen==='globe') return scr==='globe'||scr==='sim';
  if(S.screen==='menu') return scr==='menu'||scr==='sim';
  return scr==='sim';
}
/* טבעת המצפן והסירה מצוירות ב-WebGL. ההדמיה מפרסמת בכל פריים איפה על המסך נמצאות תוויות המעלות
   (EXO.frame.anchors g0..g11); מהן נגזרת המסגרת של הטבעת, ומהמרכז שלה — הסירה. */
function ringRect(d,W,H){
  var w=fr.contentWindow, E=w&&w.EXO, A=E&&E.frame&&E.frame.anchors; if(!A||S.screen==='globe'||(E.frame.gT||0)>0.4) return null;
  var c=d.getElementById('sea'), o=c?c.getBoundingClientRect():{left:0,top:0}, xs=[], ys=[], i;
  for(i=0;i<12;i++){ var p=A['g'+i]; if(p){ xs.push(p[0]+o.left); ys.push(p[1]+o.top); } }
  if(xs.length<5) return null;
  var x0=Math.min.apply(0,xs), x1=Math.max.apply(0,xs), y0=Math.min.apply(0,ys), y1=Math.max.apply(0,ys), mx=(x1-x0)*0.07, my=(y1-y0)*0.12;
  var r={x:x0-mx,y:y0-my,w:x1-x0+2*mx,h:y1-y0+2*my};
  if(r.w<20||r.x>W||r.y>H||r.x+r.w<0||r.y+r.h<0) return null;
  return r;
}
function boatRect(ring){ if(!ring) return null; var cx=ring.x+ring.w/2, cy=ring.y+ring.h/2;
  return {x:cx-ring.w*0.16, y:cy-ring.h*0.62, w:ring.w*0.32, h:ring.h*0.74, cx:cx, cy:cy}; }

/* הניתוח המלא: ממוספר אוטומטית לפי סדר הפרקים (D1, D2...) */
var deepList=null;
var deepDoc=null;
function deepItems(d){
  if(deepDoc!==d){ deepList=null; deepDoc=d; }
  if(!deepList){ deepList=[]; var els=d.querySelectorAll('header.top, .wrap > section, details.fold, footer'), i;
    for(i=0;i<els.length;i++){ var e=els[i], nm;
      if(e.matches('header.top')) nm='הכותרת והפתיח';
      else if(e.matches('footer')) nm='שיטה ומקורות';
      else if(e.matches('details')){ var su=e.querySelector('summary'); nm='מקופל: '+(su?su.textContent:'').replace(/\s+/g,' ').trim(); }
      else { var h=e.querySelector('h2')||e.querySelector('.eyebrow'); nm=(h?h.textContent:'פרק').replace(/\s+/g,' ').trim(); }
      if(nm.length>70) nm=nm.slice(0,68)+'…';
      deepList.push({n:'D'+(i+1), key:'deep:'+(i+1), name:nm, el:e, scr:'deep'}); } }
  return deepList;
}
/* כפתורים וקישורים שאין להם עדיין מספר ברשימה — מסומנים "?" כדי שגם הם יקבלו הערה */
var unreg=[], unregAt=0;
function scanUnreg(d,W,H,covered){
  unreg=[]; var sel='button,a[href],input,select,summary,[role=button]', root=S.screen==='journey'?d.getElementById('journey'):d;
  if(!root) return; var els=root.querySelectorAll(sel), i, k=0;
  for(i=0;i<els.length&&k<30;i++){ var e=els[i];
    if(S.screen==='sim'&&e.closest('#journey,#globeLayer,#menu')) continue;
    if(S.screen==='globe'&&e.closest('#journey')) continue;
    if(covered.some(function(c){ return c.contains(e); })) continue;
    if(!vis(e,W,H)) continue;
    var nm=(e.getAttribute('aria-label')||e.textContent||e.value||e.id||e.tagName).replace(/\s+/g,' ').trim().slice(0,50);
    var path=e.id?'#'+e.id:(e.tagName.toLowerCase()+(e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\s+/).join('.'):''));
    unreg.push({n:'?', key:'x:'+S.screen+':'+path, name:'ללא מספר: '+nm, el:e, q:true, scr:S.screen}); k++; }
}

/* ---------- ציור המספרים ---------- */
var items=[], dots={}, lastTick=0;
function tickNow(){ lastTick=0; }
function counts(key){ var o=0,f=0; S.notes.forEach(function(n){ if(n.key===key){ if(n.status==='open') o++; else if(n.status==='fixed') f++; } }); return {o:o,f:f}; }
function tick(ts){
  requestAnimationFrame(tick);
  if(ts-lastTick<80) return; lastTick=ts;
  var d=frameDoc(), v=VIEWS[S.view], W=v[0], H=v[1];
  if(!d){ render([]); return; }
  S.screen=screenOf(d);
  var list=[], covered=[];
  if(S.page==='deep'){
    deepItems(d).forEach(function(f){ var r=vis(f.el,W,H); if(r){ list.push({f:f,rects:[r]}); covered.push(f.el); } });
  } else {
    var ring=null;
    FEAT.forEach(function(f){
      if(f.chip||!allowed(f.scr)) return;
      if(f.calc==='ring'){ ring=ringRect(d,W,H); if(ring) list.push({f:f,rects:[ring],anchor:'top'}); return; }
      if(f.calc==='boat'){ var b=boatRect(ring||ringRect(d,W,H)); if(b) list.push({f:f,rects:[b],anchor:'center',c:[b.cx,b.cy]}); return; }
      var els; try{ els=f.multi?d.querySelectorAll(f.sel):[d.querySelector(f.sel)]; }catch(e){ return; }
      var rs=[], i; for(i=0;i<els.length&&rs.length<60;i++){ var r=vis(els[i],W,H); if(r){ rs.push(r); covered.push(els[i]); } }
      if(rs.length) list.push({f:f,rects:rs});
    });
  }
  if(ts-unregAt>1200){ unregAt=ts; scanUnreg(d,W,H,covered); }
  unreg.forEach(function(f){ var r=vis(f.el,W,H); if(r) list.push({f:f,rects:[r]}); });
  items=list; render(list); paintChips();
}
function render(list){
  var s=S.s, ww=wrap.clientWidth, wh=wrap.clientHeight, seen={}, placed=[], html='';
  list.slice().sort(function(a,b){ return a.rects[0].y-b.rects[0].y||a.rects[0].x-b.rects[0].x; }).forEach(function(it){
    var f=it.f, r=it.rects[0], x, y;
    if(it.anchor==='center'){ x=it.c[0]*s-12; y=it.c[1]*s-12; }
    else if(it.anchor==='top'){ x=(r.x+r.w/2)*s-12; y=r.y*s-10; }
    else { x=r.x*s-8; y=r.y*s-8; if(r.w*s>ww*0.8&&r.h*s>wh*0.5){ x=r.x*s+6; y=r.y*s+6; } }
    x=Math.max(2,Math.min(ww-26,x)); y=Math.max(2,Math.min(wh-26,y));
    var OFF=[[0,0],[27,0],[-27,0],[54,0],[0,25],[-54,0],[27,25],[-27,25],[81,0],[0,-25]], k, fx=x, fy=y;
    function free(a,b){ return !placed.some(function(p){ return Math.abs(p[0]-a)<23&&Math.abs(p[1]-b)<23; }); }
    for(k=0;k<OFF.length;k++){ var cx=Math.max(2,Math.min(ww-26,fx+OFF[k][0])), cy=Math.max(2,Math.min(wh-26,fy+OFF[k][1])); if(free(cx,cy)){ x=cx; y=cy; break; } }
    placed.push([x,y]);
    var el=dots[f.key]; if(!el){ el=document.createElement('button'); el.type='button'; el.className='dt'; el.dataset.key=f.key; ov.appendChild(el); dots[f.key]=el; }
    var c=counts(f.key), sel=S.sel&&S.sel.key===f.key;
    el.className='dt'+(f.q?' q':'')+(c.o?' o':'')+(c.f&&!c.o?' f':'')+(sel?' sel':'');
    if(el._n!==f.n){ el.textContent=f.n; el._n=f.n; el.setAttribute('aria-label',f.n+' '+f.name); }
    el.style.transform='translate('+Math.round(x)+'px,'+Math.round(y)+'px)'; el.style.left='0'; el.style.top='0'; el.hidden=false;
    el._f=f; seen[f.key]=1;
    if(S.frames||sel){ it.rects.forEach(function(q){ html+='<div class="fr'+(sel?' sel':'')+(sel&&it.rects.length>1?' multi':'')+'" style="left:'+(q.x*s).toFixed(1)+'px;top:'+(q.y*s).toFixed(1)+'px;width:'+(q.w*s).toFixed(1)+'px;height:'+(q.h*s).toFixed(1)+'px"></div>'; }); }
  });
  if(S.point) html+='<div class="pin" style="left:'+(S.point[0]*s)+'px;top:'+(S.point[1]*s)+'px"></div>';
  Object.keys(dots).forEach(function(k){ if(!seen[k]) dots[k].hidden=true; });
  var fl=ov.querySelector('.frames'); if(!fl){ fl=document.createElement('div'); fl.className='frames'; ov.insertBefore(fl,ov.firstChild); }
  if(fl._h!==html){ fl.innerHTML=html; fl._h=html; }
}
ov.addEventListener('click',function(e){ var b=e.target.closest('.dt'); if(!b||!b._f) return; e.stopPropagation(); openSheet(b._f,null); });

/* פיצ'רים של הסצנה כולה: כפתורים מתחת למסגרת */
var chipsHtml='';
function paintChips(){
  var list=S.page==='deep'?[]:FEAT.filter(function(f){ return f.chip&&(S.screen===f.scr||(S.screen==='menu'&&f.scr==='sim')); }), h='';
  if(list.length){ h='<span class="lbl">בכל המסך:</span>';
    list.forEach(function(f){ var c=counts(f.key); h+='<button type="button" class="sc'+(c.o?' o':(c.f?' f':''))+'" data-key="'+f.key+'"><b>'+f.n+'</b>'+esc(f.name.split(':')[0])+'</button>'; }); }
  if(h!==chipsHtml){ $('chips').innerHTML=h; chipsHtml=h; requestAnimationFrame(function(){ layout(); }); }
}
$('chips').onclick=function(e){ var b=e.target.closest('.sc'); if(b) openSheet(BYKEY[b.dataset.key],null); };

/* ---------- מגע על המסגרת במצב הערות: הקשה בוחרת, גרירה גוללת ---------- */
var drag=null;
function scrollTarget(d,x,y){
  var el=d.elementFromPoint(x,y);
  while(el&&el!==d.body&&el!==d.documentElement){ var cs=d.defaultView.getComputedStyle(el);
    if(/(auto|scroll)/.test(cs.overflowY)&&el.scrollHeight>el.clientHeight+2) return el; el=el.parentElement; }
  return d.scrollingElement||d.documentElement;
}
shield.addEventListener('pointerdown',function(e){
  var d=frameDoc(), b=wrap.getBoundingClientRect(), fx=(e.clientX-b.left)/S.s, fy=(e.clientY-b.top)/S.s;
  drag={x:e.clientX,y:e.clientY,x0:e.clientX,y0:e.clientY,moved:false,fx:fx,fy:fy,tg:d?scrollTarget(d,fx,fy):null};
  try{ shield.setPointerCapture(e.pointerId); }catch(err){}
});
shield.addEventListener('pointermove',function(e){
  if(!drag) return; var dx=e.clientX-drag.x, dy=e.clientY-drag.y; drag.x=e.clientX; drag.y=e.clientY;
  if(!drag.moved&&Math.hypot(e.clientX-drag.x0,e.clientY-drag.y0)<7) return; drag.moved=true;
  var bx=stage.scrollLeft, by=stage.scrollTop; stage.scrollLeft-=dx; stage.scrollTop-=dy;
  var rx=-dx-(stage.scrollLeft-bx), ry=-dy-(stage.scrollTop-by);
  if(drag.tg&&(Math.abs(rx)>0.5||Math.abs(ry)>0.5)){ try{ drag.tg.scrollBy(rx/S.s, ry/S.s); }catch(err){} }
});
shield.addEventListener('pointerup',function(){ if(drag&&!drag.moved) tapAt(drag.fx,drag.fy); drag=null; });
shield.addEventListener('pointercancel',function(){ drag=null; });
function tapAt(x,y){
  var best=null, ba=Infinity;
  items.forEach(function(it){ it.rects.forEach(function(r){ if(x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h){ var a=r.w*r.h*(it.f.q?1.5:1); if(a<ba){ ba=a; best=it.f; } } }); });
  if(best) openSheet(best,null);
  else openSheet({n:'•', key:'pt:'+S.screen, name:'נקודה '+IN[S.screen]+' שאין לה מספר'}, [x,y]);
}

/* ---------- הערות: שרת ---------- */
function api(method,body){
  return fetch('/api/notes',{method:method,cache:'no-store',headers:{'x-review-key':KEY||'','content-type':'application/json'},body:body?JSON.stringify(body):undefined})
    .then(function(r){ return r.json().catch(function(){ return {}; }).then(function(j){ if(!r.ok) throw new Error(j.error||r.status); return j; }); });
}
var notesErr='';
function refreshNotes(){
  if(!KEY){ notesErr='nokey'; paintCounts(); return Promise.resolve(); }
  return api('GET').then(function(j){ S.notes=j.notes||[]; S.meta=j.meta||{}; notesErr=''; paintCounts(); paintHand(); if(!$('sheet').hidden&&S.sel) paintThread(); if(!$('lsheet').hidden) paintList(); tickNow(); })
    .catch(function(e){ notesErr=String(e.message||e); paintCounts(); });
}
function paintCounts(){ var o=0,f=0; S.notes.forEach(function(n){ if(n.status==='open') o++; else if(n.status==='fixed') f++; });
  $('cntO').textContent=o||''; $('cntF').textContent=f||''; }
setInterval(function(){ if(!document.hidden) refreshNotes(); },45000);

/* ---------- "לטיפול Claude": כל סבב הערות = שיחה חדשה וקצרה (כלל המקל, מ-21.9.2026) ----------
   אתר לא יכול לפתוח שיחה של Claude בעצמו. לכן הכפתור, בלחיצה אחת: מסמן במסד אילו הערות עברו (handed),
   מעתיק פתיחה מלאה שמספיקה לשיחה חדשה בלי שום היסטוריה, ופותח את Claude. שמוליק פותח משימה חדשה, מדביק ושולח.
   הכתובת שנפתחת: meta.start אם הוגדרה במסד, אחרת https://claude.ai/new. (meta.conv הישן — השיחה הקבועה — לא בשימוש.) */
var START_URL='https://claude.ai/new';
function lastUserT(n){ var t=0; (n.thread||[]).forEach(function(e){ if(e.who==='user'&&e.t>t) t=e.t; }); return t; }
function fresh(){ return S.notes.filter(function(n){ return n.status==='open'&&(!n.handed||lastUserT(n)>n.handed); }); }
/* הערות שכבר הועברו ועוד פתוחות ("אצל Claude"). עד 21.9 הכפתור התעלם מהן: אחרי לחיצה אחת הוא עבר ל"לשיחה עם Claude"
   והעתיק רק משפט כללי — ואם ההעתקה הראשונה נכשלה (קורה בטלפון), הסבב אבד. עכשיו לחיצה נוספת מעתיקה שוב את הסבב המלא. */
function pending(){ return S.notes.filter(function(n){ return n.status==='open'&&n.handed&&lastUserT(n)<=n.handed; }); }
function noteIds(L){ return L.map(function(n){ return n.key==='general'?'כללית':(String(n.n).charAt(0)==='D'||n.n==='?'||n.n==='•'?n.n:'#'+n.n); }); }
function handMsg(L){
  var base='הפרויקט בתיקייה Documents\\GGR Project במחשב שלי — בקש גישה אליה. קרא קודם את claude/לוח-תיאום.md.';
  if(!L.length) return 'שאלה על האתר exodus-log.com. '+base;
  return [
    'סבב תיקונים מתחנת הבדיקה של exodus-log.com: '+(L.length===1?'הערה אחת':L.length+' הערות')+' ('+noteIds(L).join(', ')+').',
    'אתה הבונה של הסבב הזה. הפרויקט בתיקייה Documents\\GGR Project במחשב שלי — בקש גישה אליה.',
    '1. קרא את claude/לוח-תיאום.md ואת claude/תחנת-בדיקה.md, וקח את המקל בלוח. אם המקל אצל שיחה אחרת — עצור ושאל אותי.',
    '2. אני מאשר לך להשתמש במפתח שבקובץ _private/review-key.txt כדי לקרוא את ההערות ולענות עליהן דרך כרום, כמו שכתוב בתחנת-בדיקה.md.',
    '3. טפל רק בהערות שהועברו בסבב הזה, פרסם, ובדוק שהתיקון באוויר לפני שאתה מסמן "טופל" ועונה בתחנה.',
    '4. בסוף: שחרר את המקל, שורה ביומן, ועדכון של "הדרך לסיום" במרכז אקסודוס.'
  ].join('\n');
}
function startUrl(){ var u=S.meta&&S.meta.start; return (u&&/^https:\/\/claude\.ai\//.test(u))?u:START_URL; }
function paintHand(){
  var a=$('handBtn'), L=fresh();
  a.href=startUrl(); a.setAttribute('aria-disabled','false');
  var P=L.length?[]:pending(), c=L.length||P.length;
  $('handC').textContent=c||'';
  $('handT').textContent=L.length?'לטיפול Claude':P.length?'שוב לטיפול Claude':'לשיחה עם Claude';
  a.classList.toggle('idle',!c);
}
/* העתקה שעובדת גם בטלפון: navigator.clipboard, ואם הוא נכשל — textarea ו-execCommand בתוך אותה לחיצה.
   אם שניהם נכשלו, הטקסט מוצג בחלון כדי להעתיק ביד, והקישור לא נפתח (אחרת הטקסט אובד). */
function copyText(t){
  var ok=false;
  try{ var ta=document.createElement('textarea'); ta.value=t; ta.setAttribute('readonly',''); ta.style.cssText='position:fixed;top:0;left:0;opacity:0;font-size:16px';
    document.body.appendChild(ta); ta.focus(); ta.select(); ta.setSelectionRange(0,t.length); ok=document.execCommand('copy'); document.body.removeChild(ta); }catch(e){}
  try{ if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(t).catch(function(){}); ok=true; } }catch(e){}
  return ok;
}
function showCopy(t){
  $('cpTxt').value=t; showSheet('cpsheet',true);
  setTimeout(function(){ try{ $('cpTxt').focus(); $('cpTxt').select(); }catch(e){} },50);
}
$('cpX').onclick=function(){ showSheet('cpsheet',false); };
$('cpGo').onclick=function(){ copyText($('cpTxt').value); showSheet('cpsheet',false); };
$('handBtn').addEventListener('click',function(e){
  var L=fresh(), again=!L.length; if(again) L=pending();
  var msg=handMsg(L);
  if(L.length){
    /* גם בשליחה חוזרת: handoff מעדכן את meta.lastHandoff לרשימה הזאת, כי ממנה השיחה החדשה יודעת במה לטפל */
    fetch('/api/notes',{method:'POST',keepalive:true,headers:{'x-review-key':KEY||'','content-type':'application/json'},
      body:JSON.stringify({op:'handoff',ids:L.map(function(n){ return n.id; })})}).then(function(){ refreshNotes(); }).catch(function(){});
    var now=Date.now(); L.forEach(function(n){ n.handed=now; }); paintHand();
  }
  if(!copyText(msg)){ e.preventDefault(); showCopy(msg); return; }
  toast(again?'הסבב הועתק שוב. ב־Claude: משימה חדשה, הדבקה ושליחה.':'הפתיחה הועתקה. ב־Claude: משימה חדשה, הדבקה ושליחה.',7000);
  /* בלי preventDefault: הקישור עצמו פותח את Claude בלשונית חדשה */
});
document.addEventListener('visibilitychange',function(){ if(!document.hidden) refreshNotes(); });

/* ---------- גיליון פיצ'ר ---------- */
function showSheet(id,on){ $(id).hidden=!on; $('scrim').hidden=!($('sheet').hidden===false||$('lsheet').hidden===false||$('cpsheet').hidden===false); }
function openSheet(f,pt){
  if(!f) return; S.sel=f; S.point=pt; showSheet('lsheet',false);
  $('shT').innerHTML='<span class="num">'+esc(f.n)+'</span>'+esc(f.name);
  var draft=ls('rvDraft:'+f.key); $('txt').value=draft||''; $('allV').checked=!!f.chip||f.key==='general';
  paintThread(); showSheet('sheet',true); tickNow();
}
function closeSheet(){ showSheet('sheet',false); showSheet('lsheet',false); showSheet('cpsheet',false); S.sel=null; S.point=null; tickNow(); }
$('shX').onclick=closeSheet; $('lsX').onclick=closeSheet; $('scrim').onclick=closeSheet;
function ctxLine(n){ var a=[]; a.push(n.allViews?'בכל הגדלים':(VIEWS[n.view]?VIEWS[n.view][2]:n.view)); if(n.target) a.push(n.target==='next'?'next':'ראשי'); if(n.screen&&SCREENS[n.screen]) a.push(SCREENS[n.screen]); return a.join(' · '); }
function noteHtml(n,withTitle){
  var st=STATUS[n.status]||STATUS.open, h='<div class="note '+st[1]+'" data-id="'+esc(n.id)+'">';
  if(withTitle) h+='<div class="li-t"><b>'+esc(n.n)+'</b> '+esc(n.fname)+'</div>';
  (n.thread||[]).forEach(function(t,i){
    h+='<div class="ent'+(t.who==='claude'?' cl':'')+'">'+(t.text?'<p>'+esc(t.text)+'</p>':'')+
       '<div class="meta">'+(i===0?'<span class="st '+st[1]+'">'+st[0]+'</span>'+esc(ctxLine(n))+' · ':(t.status&&t.status!==(n.thread[i-1]||{}).status?'<span class="st '+(STATUS[t.status]||st)[1]+'">'+(STATUS[t.status]||st)[0]+'</span>':''))+when(t.t)+'</div></div>'; });
  if(n.status==='open'&&n.handed&&lastUserT(n)<=n.handed) h+='<div class="meta"><span class="chip2">אצל Claude</span> '+ago(n.handed)+'</div>';
  h+='<div class="acts">';
  if(n.status==='fixed') h+='<button type="button" class="ok" data-a="done">✓ אושר</button><button type="button" class="no" data-a="again">עדיין לא טוב</button>';
  else if(n.status==='open') h+='<button type="button" data-a="add">הוספה</button>'+((n.thread||[]).length<2?'<button type="button" class="del" data-a="del">מחיקה</button>':'');
  else h+='<button type="button" data-a="again">פתיחה מחדש</button>';
  return h+'</div></div>';
}
function paintThread(){
  var f=S.sel, b=$('shB'), h='<p class="ctx">'+VIEWS[S.view][2]+' · '+(S.page==='deep'?'הניתוח המלא':(S.target==='next'?'next':'ראשי')+' · '+SCREENS[S.screen])+'</p>';
  if(!KEY) h+='<div class="warn">אין מפתח בדפדפן הזה, ולכן אי אפשר לשמור. פתח את התחנה מהקישור המלא שקיבלת בשיחה.</div>';
  else if(notesErr) h+='<div class="warn">השרת של ההערות לא עונה כרגע ('+esc(notesErr)+'). מה שתכתוב נשמר כטיוטה בטלפון.</div>';
  var mine=S.notes.filter(function(n){ return n.key===f.key; }).sort(function(a,b){ return (a.status==='done')-(b.status==='done')||b.updated-a.updated; });
  if(mine.length) mine.forEach(function(n){ h+=noteHtml(n,false); });
  else h+='<p class="empty">אין עדיין הערות על '+(String(f.key).indexOf('pt:')===0?'הנקודה הזאת':'זה')+'.</p>';
  b.innerHTML=h; $('saveBtn').disabled=!KEY;
}
$('txt').addEventListener('input',function(){ if(S.sel) ls('rvDraft:'+S.sel.key,this.value||null); });
var replyTo=null;
$('shB').onclick=function(e){
  var b=e.target.closest('button[data-a]'); if(!b) return; var id=b.closest('.note').dataset.id, a=b.dataset.a;
  if(a==='done'){ send({op:'reply',id:id,who:'user',text:'',status:'done'},'אושר'); return; }
  if(a==='del'){ if(b.dataset.sure){ send({op:'delete',id:id},'נמחק'); } else { b.dataset.sure='1'; b.textContent='בטוח? הקש שוב'; } return; }
  replyTo={id:id, status:a==='again'?'open':null};
  $('txt').placeholder=a==='again'?'מה עדיין לא טוב?':'מה להוסיף?'; $('txt').focus();
  $('saveBtn').textContent=a==='again'?'פתיחה מחדש':'הוספה';
};
function send(body,okMsg){
  return api('POST',body).then(function(){ toast(okMsg); return refreshNotes(); }).catch(function(e){ toast('לא נשמר: '+(e.message||e),4000); throw e; });
}
$('saveBtn').onclick=function(){
  var f=S.sel, t=$('txt').value.trim(); if(!f) return;
  if(!t&&!(replyTo&&replyTo.status)){ $('txt').focus(); return; }
  var btn=this; btn.disabled=true;
  var body=replyTo?{op:'reply',id:replyTo.id,who:'user',text:t,status:replyTo.status||undefined}
    :{op:'add',note:{n:String(f.n), key:f.key, fname:f.name, view:S.view, allViews:$('allV').checked, target:S.page==='deep'?'':S.target,
       page:S.page, screen:S.screen, point:S.point?[Math.round(S.point[0]),Math.round(S.point[1])]:null, text:t}};
  send(body,replyTo?'נוסף':'נשמר').then(function(){ ls('rvDraft:'+f.key,null); $('txt').value=''; resetReply(); })
    .catch(function(){}).then(function(){ btn.disabled=!KEY; });
};
function resetReply(){ replyTo=null; $('txt').placeholder='מה לא טוב כאן? מה היית רוצה במקום?'; $('saveBtn').textContent='שמירה'; }
$('shX').addEventListener('click',resetReply);

/* ---------- גיליון הרשימה ---------- */
var tab='open';
function paintList(){
  var h='<div class="tabs">', T=[['open','פתוחות'],['fixed','לבדוק'],['done','סגורות']];
  T.forEach(function(t){ var c=S.notes.filter(function(n){ return t[0]==='done'?(n.status==='done'||n.status==='wontfix'):n.status===t[0]; }).length;
    h+='<button type="button" data-t="'+t[0]+'" aria-pressed="'+(tab===t[0])+'">'+t[1]+' '+(c||'')+'</button>'; });
  h+='</div><button type="button" class="gen" id="genBtn">+ הערה כללית, לא על פיצ\'ר מסוים</button>';
  if(!KEY) h+='<div class="warn">אין מפתח בדפדפן הזה. פתח את התחנה מהקישור המלא שקיבלת בשיחה.</div>';
  else if(notesErr) h+='<div class="warn">השרת של ההערות לא עונה כרגע ('+esc(notesErr)+').</div>';
  var L=S.notes.filter(function(n){ return tab==='done'?(n.status==='done'||n.status==='wontfix'):n.status===tab; })
    .sort(function(a,b){ return (parseFloat(a.n)||999)-(parseFloat(b.n)||999)||b.updated-a.updated; });
  if(!L.length) h+='<p class="empty">'+(tab==='open'?'אין הערות פתוחות.':tab==='fixed'?'אין כרגע מה לבדוק.':'עוד לא נסגרה אף הערה.')+'</p>';
  L.forEach(function(n){ var last=(n.thread||[])[n.thread.length-1]||{}, first=(n.thread||[])[0]||{};
    h+='<button type="button" class="li" data-id="'+esc(n.id)+'"><div class="t"><span class="num">'+esc(n.n)+'</span>'+esc(n.fname)+'</div>'+
      '<div class="x2">'+esc(last.who==='claude'?'Claude: '+last.text:first.text)+'</div><div class="meta">'+(n.status==='open'&&n.handed&&lastUserT(n)<=n.handed?'<span class="chip2">אצל Claude</span> ':'')+esc(ctxLine(n))+' · '+ago(n.updated)+'</div></button>'; });
  $('lsB').innerHTML=h;
}
$('listBtn').onclick=function(){ S.sel=null; paintList(); showSheet('sheet',false); showSheet('lsheet',true); refreshNotes(); };
$('lsB').onclick=function(e){
  var t=e.target.closest('[data-t]'); if(t){ tab=t.dataset.t; paintList(); return; }
  if(e.target.closest('#genBtn')){ openSheet({n:0,key:'general',name:'הערה כללית'},null); return; }
  var li=e.target.closest('.li'); if(!li) return; var n=S.notes.filter(function(x){ return x.id===li.dataset.id; })[0]; if(!n) return;
  if(!n.allViews&&VIEWS[n.view]&&n.view!==S.view){ S.view=n.view; ls('rvView',S.view); segSet($('views'),'data-v',S.view); S.zoom=1; layout(); }
  var f=BYKEY[n.key]||{n:n.n,key:n.key,name:n.fname};
  openSheet(f,n.point||null);
};

/* ---------- הפעלה ---------- */
if(!ls('rvHelp')) $('help').hidden=false;
$('helpOk').onclick=function(){ $('help').hidden=true; ls('rvHelp','1'); };
segSet($('views'),'data-v',S.view);
var forced=ss('rvTarget');
detect().then(function(i){ S.info=i; S.target=forced&&(forced!=='next'||i.live)?forced:i.pick; S.auto=S.target===i.pick; paintTarget(); load(); })
  .catch(function(){ S.info={}; S.target='next'; paintTarget(); load(); });
layout(); refreshNotes(); requestAnimationFrame(tick);
})();
