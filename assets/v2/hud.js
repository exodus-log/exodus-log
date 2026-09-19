/* ===== v2/hud.js — כל מה שמסביב לסצנה בדף במסך מלא =====
   שורת הנתונים, שלושת השעונים, התוויות שעל טבעת המצפן, מפת המיקומים, התפריט, הקול,
   ופתיחת "המסע" (הגלובוס, המרוץ, התחזית והסקסטנט) מעל החלון.
   אין כאן מספר שכתוב ביד: הכול מגיע מ-data.js. רענון נתונים לא נוגע בקובץ הזה. */
(function(){
'use strict';
if(typeof FIX==='undefined') return;
var EXO=window.EXO||null, LIVE=!!(EXO&&EXO.ready), LAB=LIVE?(EXO.lab||(EXO.lab={})):{};
var $=function(id){ return document.getElementById(id); };
var stage=$('stage'), D2R=Math.PI/180, R2D=180/Math.PI;
function pad(v,w){ v=String(v); while(v.length<(w||2)) v='0'+v; return v; }
function thou(v){ return Math.round(v).toLocaleString('en-US'); }
function put(id,txt){ var e=$(id); if(e&&e.textContent!==String(txt)) e.textContent=txt; }
function show(id,on){ var e=$(id); if(e&&e.hidden===on) e.hidden=!on; }
function deg3(d){ return pad(Math.round(((d%360)+360)%360)%360,3)+'°'; }
function clamp(v,a,b){ return v<a?a:v>b?b:v; }
function store(k,v){ try{ if(v===undefined) return localStorage.getItem(k); localStorage.setItem(k,v); }catch(e){} return null; }

/* ---------- קומפוזיציה: הסירה במרכז החלון ---------- */
function frameScene(){ if(!LIVE) return; var w=stage.clientWidth, h=stage.clientHeight, portrait=w/h<0.8;
  EXO.view.ox=0; EXO.view.oy=(h<=520?0.06:portrait?0.06:0.0); EXO.view.ty=portrait?5.2:4.4; EXO.view.r=portrait?44:33;
  if(frameScene.p!==portrait){ frameScene.p=portrait; if(EXO.setEl&&LAB.cam!=='deck') EXO.setEl(portrait?0.55:0.30); }
  if(EXO.reframe&&LAB.cam!=='deck') EXO.reframe(); }

/* ================= שורת הנתונים והשעונים ================= */
function dmm(v,w,pos,neg){ var a=Math.abs(v), d=Math.floor(a), m=Math.round((a-d)*600)/10; if(m>=60){ d+=1; m=0; }
  return pad(d,w)+'°'+(m<10?'0':'')+m.toFixed(1)+'′'+(v>=0?pos:neg); }
function beaufort(kn){ var k=Math.round(kn), T=[3,6,10,16,21,27,33,40,47,55,63]; if(k<1) return 0;
  for(var i=0;i<T.length;i++) if(k<=T[i]) return i+1; return 12; }
function douglas(h){ var T=[0.01,0.1,0.5,1.25,2.5,4,6,9,14]; for(var i=0;i<T.length;i++) if(h<=T[i]) return i; return 9; }
var ilFmt=null; try{ ilFmt=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jerusalem',hour:'2-digit',minute:'2-digit',hour12:false}); }catch(e){}
function heb(v,one,two,many){ v=Math.round(v); return v<=1?one:v===2?two:v+' '+many; }
function signed(v){ return (v>0?'+':v<0?'−':'')+Math.abs(v).toFixed(1); }
var compact=false; function measure(){ compact=stage.clientWidth<=700; }

function renderHud(s){
  var c=s.cond, d=new Date(s.now);
  put('hDay','יום '+FIX.dayN);
  put('hDate',pad(d.getUTCDate())+'.'+pad(d.getUTCMonth()+1)+'.'+d.getUTCFullYear());
  put('hPos',dmm(FIX.lat,2,'N','S')+'  '+dmm(FIX.lon,3,'E','W'));
  var fx=new Date(FIX.at*1000), age=(s.now/1000-FIX.at)/3600;
  var ageTxt=age<1?'לפני פחות משעה':age<24?'לפני '+heb(age,'שעה','שעתיים','שע׳'):'לפני '+heb(age/24,'יום','יומיים','ימים');
  var hf=$('hFix'); hf.textContent='נ״צ '+pad(fx.getUTCHours())+':'+pad(fx.getUTCMinutes())+' UTC · '+ageTxt; hf.className=age>12?'stale':'dim';
  if(c){
    var S=compact?' ':' · ', U=compact?'':' ';
    put('hWind',deg3(c.windDir)+S+Math.round(c.wind)+U+'kn'+S+'G'+Math.round(c.gust)); put('hBft','בופור '+beaufort(c.wind));
    put('hWave',c.waveH.toFixed(1)+U+'m'+S+Math.round(c.waveT)+U+'s'+S+deg3(c.waveDir)); put('hSea','מצב ים '+douglas(c.waveH));
    put('hCur',c.cur.toFixed(1)+U+'kn'+(compact?'→':' → ')+deg3(c.curDir));
    /* השורה השלישית קיימת רק כשהרענון הביא את העמודות הנוספות; בלעדיהן היא פשוט לא מוצגת */
    var hasP=(c.pres!=null), hasC=(c.cloud!=null), hasV=(c.visKm!=null), hasR=(c.precip!=null&&c.precip>=0.05), hasT=(c.airT!=null||c.seaT!=null);
    show('hPresW',hasP); show('hCloudW',hasC); show('hVisW',hasV); show('hRainW',hasR); show('hTempW',hasT); show('hRow3',hasP||hasC||hasV||hasT);
    if(hasP){ put('hPres',Math.round(c.pres)+U+'hPa'+((c.presTrend!=null&&Math.abs(c.presTrend)>=0.15)?' '+signed(c.presTrend):''));
      put('hPresT',c.presTrend==null?'':Math.abs(c.presTrend)<0.15?'יציב':c.presTrend>0?'עולה, ב־3 שעות':'יורד, ב־3 שעות'); }
    if(hasC) put('hCloud',Math.round(c.cloud)+'%');
    if(hasV) put('hVis',(c.visKm<10?c.visKm.toFixed(1):Math.round(c.visKm))+U+'km');
    if(hasR) put('hRain',c.precip.toFixed(1)+' mm/h');
    if(hasT) put('hTemp',(c.airT!=null?Math.round(c.airT)+'°':'—')+(compact?'/':' / ')+(c.seaT!=null?Math.round(c.seaT)+'°C':'—'));
  }
  put('cBoat',s.localHM); put('cUtc',pad(d.getUTCHours())+':'+pad(d.getUTCMinutes()));
  put('cIl',ilFmt?ilFmt.format(d):'--:--');
  var gap=Math.round(FIX.dtf-FLEET[0][5]);
  put('vRank',FIX.rank); put('vOf','מתוך '+FLEET.length); put('vSog',FIX.sog.toFixed(1)+(compact?'kn ':' kn · ')+deg3(FIX.cog));
  put('vGap',gap<=0?'0':thou(gap)); put('vDtf',thou(FIX.dtf));
  if(c) labelTexts(s);
}

/* ================= תוויות על הסצנה: מעלות הטבעת, רוח, גל, זרם, היעד ================= */
var LB={}, labelsHost=$('labels'), SZ={}, safeTop=0;
function measureTop(){ var a=document.querySelector('.topr'), b=document.querySelector('.clocks'); safeTop=Math.max(a?a.getBoundingClientRect().bottom:0,b?b.getBoundingClientRect().bottom:0)+6; }
var DEG12=['N','030','060','E','120','150','S','210','240','W','300','330'];
DEG12.map(function(tx,i){ return ['g'+i,tx,'deg'+(i===0?' north':(i%3===0?' cardinal':''))]; }).concat([
 ['wind','','dat wind'],['wave','','dat wave'],['cur','','dat cur'],['gate','','dat gate'],['beacon','','beacon']])
.forEach(function(a){ var e=document.createElement('div'); e.className='lb '+a[2]; e.textContent=a[1]; e.hidden=true; labelsHost.appendChild(e); LB[a[0]]=e; });
function labelTexts(s){ var c=s.cond;
  LB.wind.innerHTML='רוח <span class="n">'+Math.round(c.wind)+' kn</span>';
  LB.wave.innerHTML='גל <span class="n">'+c.waveH.toFixed(1)+' m · '+Math.round(c.waveT)+' s</span>';
  LB.cur.innerHTML='זרם <span class="n">'+c.cur.toFixed(1)+' kn</span>';
  LB.gate.innerHTML=compact?(FIX.gate+' <span class="n">'+thou(FIX.toGate)+'</span>'):(FIX.gate+' <span class="n">'+deg3(s.gateBrg)+' · '+thou(FIX.toGate)+'</span> מייל');
  LB.beacon.innerHTML=FIX.gate+' · <span class="n">'+thou(FIX.toGate)+'</span> מייל · <span class="n">'+deg3(s.gateBrg)+'</span>';
}
function place(name,x,y,op){ var e=LB[name]; if(x===null){ if(!e.hidden) e.hidden=true; return; }
  if(e.hidden) e.hidden=false;
  var z=SZ[name]; if(!z||z.t!==e.textContent){ z=SZ[name]={w:e.offsetWidth,h:e.offsetHeight,t:e.textContent}; }
  var bx=x-z.w/2, by=(name==='beacon')?(y-z.h):(y-z.h/2);
  if(name==='beacon'){ var flip=(by<safeTop); if(flip!==!!e._flip){ e._flip=flip; e.classList.toggle('below',flip); } if(flip) by=y; bx=clamp(bx,6,stage.clientWidth-z.w-6); }
  e.style.transform='translate('+bx.toFixed(1)+'px,'+by.toFixed(1)+'px)'; e.style.opacity=op; }
function declutter(list){ list.sort(function(a,b){ return a[2]-b[2]; });
  for(var i=1;i<list.length;i++) for(var j=0;j<i;j++){
    var wi=(SZ[list[i][0]]||{w:110}).w, wj=(SZ[list[j][0]]||{w:110}).w;
    if(Math.abs(list[i][1]-list[j][1])<(wi+wj)/2+10 && Math.abs(list[i][2]-list[j][2])<17) list[i][2]=list[j][2]+17; }
  return list; }

var frameN=0;
if(LIVE) EXO.onFrame(function(f){
  var hot=LAB.ringHot||0, idleD=0.58+0.42*hot, A=f.anchors||{}, list=[], placed=[], rects=[], dat=['wind','wave','cur','gate'];
  function tryGrad(i,x,y,op,minD){ if(x===null||x===undefined){ place('g'+i,null); return; }
    for(var q=0;q<rects.length;q++) if(x>rects[q][0]&&x<rects[q][2]&&y>rects[q][1]&&y<rects[q][3]){ place('g'+i,null); return; }
    for(var k=0;k<placed.length;k++) if(Math.abs(placed[k][0]-x)<minD&&Math.abs(placed[k][1]-y)<minD*0.55){ place('g'+i,null); return; }
    placed.push([x,y]); place('g'+i,x,y,op); }
  if(!f.under){
    dat.forEach(function(n){ var q=A[n], on=q&&((n==='gate')?!A.beacon:EXO.layers[n]); if(on) list.push([n,q[0],q[1]]); else place(n,null); });
    declutter(list).forEach(function(it){ place(it[0],it[1],it[2],idleD); var z=SZ[it[0]]||{w:110,h:16}; rects.push([it[1]-z.w/2-18,it[2]-z.h/2-9,it[1]+z.w/2+18,it[2]+z.h/2+9]); });
    [0,3,6,9,1,2,4,5,7,8,10,11].forEach(function(i){ var p=A['g'+i]; tryGrad(i,p?p[0]:null,p?p[1]:null,(i%3===0?0.26:0.18)+0.74*hot,(i%3===0?22:34)); });
  } else { for(var gi=0;gi<12;gi++) place('g'+gi,null); dat.forEach(function(n){ place(n,null); }); }
  var bc=A.beacon; if(bc&&!f.under) place('beacon',bc[0],bc[1],1); else place('beacon',null);
  audioFrame(f);
  if((++frameN%12)===0) camButtons(f);
});

/* ================= מפת המיקומים הקטנה: הצי מסביב, כ-900 מייל. קו החוף נטען אחרי שהסצנה כבר רצה ================= */
var NEAR=null;
function nearCoast(){ if(NEAR||typeof COAST==='undefined') return NEAR; NEAR=[];
  var span=14, cl=Math.max(0.2,Math.cos(FIX.lat*D2R));
  COAST.forEach(function(r){ var x=r[0], y=r[1], pts=[[x/100,y/100]], x0=x, x1=x, y0=y, y1=y, i;
    for(i=2;i<r.length;i+=2){ x+=r[i]; y+=r[i+1]; pts.push([x/100,y/100]); if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }
    var dl=function(lon){ return ((lon-FIX.lon+540)%360)-180; };
    if(y1/100<FIX.lat-span||y0/100>FIX.lat+span) return;
    var a=dl(x0/100), b=dl(x1/100), wide=(x1-x0)/100>300;
    if(!wide&&(Math.max(a,b)<-span/cl||Math.min(a,b)>span/cl)) return;
    NEAR.push(pts.map(function(p){ return [FIX.lon+dl(p[0]),p[1]]; })); });
  return NEAR; }
function drawMini(){
  var cv=$('miniCv'); if(!cv) return; var S=cv.width, x=cv.getContext('2d'), R=S/2, spanDeg=7.5, k=(R-4)/spanDeg, cl=Math.cos(FIX.lat*D2R);
  function P(lat,lon){ return [R+(((lon-FIX.lon+540)%360)-180)*cl*k, R-(lat-FIX.lat)*k]; }
  x.clearRect(0,0,S,S); x.save(); x.beginPath(); x.arc(R,R,R-3,0,6.2832); x.clip();
  x.fillStyle='rgba(7,22,33,.78)'; x.fillRect(0,0,S,S);
  x.strokeStyle='rgba(205,225,238,.10)'; x.lineWidth=1; var g, la0=Math.floor((FIX.lat-10)/5)*5, lo0=Math.floor((FIX.lon-14)/5)*5;
  for(g=0;g<=20;g+=5){ var a=P(la0+g,FIX.lon-14), b=P(la0+g,FIX.lon+14); x.beginPath(); x.moveTo(a[0],a[1]); x.lineTo(b[0],b[1]); x.stroke(); }
  for(g=0;g<=30;g+=5){ var a2=P(FIX.lat-10,lo0+g), b2=P(FIX.lat+10,lo0+g); x.beginPath(); x.moveTo(a2[0],a2[1]); x.lineTo(b2[0],b2[1]); x.stroke(); }
  var land=nearCoast();
  if(land){ x.fillStyle='rgba(122,142,150,.55)'; x.strokeStyle='rgba(225,236,243,.75)'; x.lineWidth=1.2;
    land.forEach(function(r){ x.beginPath(); r.forEach(function(p,i){ var q=[R+(p[0]-FIX.lon)*cl*k, R-(p[1]-FIX.lat)*k]; if(i) x.lineTo(q[0],q[1]); else x.moveTo(q[0],q[1]); }); x.closePath(); x.fill(); x.stroke(); }); }
  /* המסלול שהופלג */
  var tp=TRACKP.split(' ').map(function(t){ var v=t.split(','); return [parseFloat(v[0]),parseFloat(v[1])]; });
  x.strokeStyle='rgba(255,255,255,.85)'; x.lineWidth=2; x.beginPath(); tp.forEach(function(p,i){ var q=P(p[0],p[1]); if(i) x.lineTo(q[0],q[1]); else x.moveTo(q[0],q[1]); });
  var c0=P(FIX.lat,FIX.lon); x.lineTo(c0[0],c0[1]); x.stroke();
  /* אל היעד הבא */
  var br=gateBearing()*D2R; x.setLineDash([5,5]); x.strokeStyle='rgba(255,255,255,.6)'; x.lineWidth=1.5;
  x.beginPath(); x.moveTo(c0[0],c0[1]); x.lineTo(c0[0]+Math.sin(br)*S,c0[1]-Math.cos(br)*S); x.stroke(); x.setLineDash([]);
  FLEET.forEach(function(b){ var q=P(b[2],b[3]); x.fillStyle=(b[1]===4)?'#fff':'rgba(215,230,240,.85)'; x.beginPath(); x.arc(q[0],q[1],(b[1]===4)?5.2:3.1,0,6.2832); x.fill(); });
  x.strokeStyle='#fff'; x.lineWidth=1.6; x.beginPath(); x.arc(c0[0],c0[1],10.5,0,6.2832); x.stroke();
  x.restore();
  x.strokeStyle='rgba(225,236,243,.55)'; x.lineWidth=2; x.beginPath(); x.arc(R,R,R-3,0,6.2832); x.stroke();
  x.fillStyle='#f0443e'; x.beginPath(); x.moveTo(R,1); x.lineTo(R-7,15); x.lineTo(R+7,15); x.closePath(); x.fill();
}
function gateBearing(){ if(LIVE&&EXO.state) return EXO.state.gateBrg;
  var p1=FIX.lat*D2R, p2=GATE[0]*D2R, dl=(GATE[1]-FIX.lon)*D2R;
  return (Math.atan2(Math.sin(dl)*Math.cos(p2),Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl))*R2D+360)%360; }

/* ================= טעינה עצלה ================= */
function loadScript(src){ return new Promise(function(ok,bad){ var s=document.createElement('script'); s.src=src; s.onload=ok; s.onerror=function(){ bad(new Error(src)); }; document.head.appendChild(s); }); }
function loadCss(href){ return new Promise(function(ok){ var l=document.createElement('link'); l.rel='stylesheet'; l.href=href; l.onload=ok; l.onerror=ok; document.head.appendChild(l); }); }
function idle(fn,ms){ if('requestIdleCallback' in window) requestIdleCallback(fn,{timeout:ms||2500}); else setTimeout(fn,ms||1200); }

/* ================= קול: רוח ומים, מסונתזים. משתנים עם המרחק, ומתעמעמים מתחת למים ================= */
var AU=null, auOn=false, auT=0, prevPitch=0, slam=0;
function audioStart(){
  var Ctx=window.AudioContext||window.webkitAudioContext; if(!Ctx) return false;
  var ac=new Ctx(), len=ac.sampleRate*3, wb=ac.createBuffer(1,len,ac.sampleRate), bb=ac.createBuffer(1,len,ac.sampleRate), w=wb.getChannelData(0), b=bb.getChannelData(0), last=0, i;
  for(i=0;i<len;i++){ var r=Math.random()*2-1; w[i]=r; last=(last+0.02*r)/1.02; b[i]=last*3.5; }
  function src(buf){ var s=ac.createBufferSource(); s.buffer=buf; s.loop=true; s.start(); return s; }
  var master=ac.createGain(); master.gain.value=0; var mlp=ac.createBiquadFilter(); mlp.type='lowpass'; mlp.frequency.value=18000; master.connect(mlp); mlp.connect(ac.destination);
  var wbp=ac.createBiquadFilter(); wbp.type='bandpass'; wbp.frequency.value=480; wbp.Q.value=0.55; var wg=ac.createGain(); wg.gain.value=0; src(wb).connect(wbp); wbp.connect(wg); wg.connect(master);
  var hbp=ac.createBiquadFilter(); hbp.type='bandpass'; hbp.frequency.value=2300; hbp.Q.value=7; var hg=ac.createGain(); hg.gain.value=0; src(wb).connect(hbp); hbp.connect(hg); hg.connect(master);
  var slp=ac.createBiquadFilter(); slp.type='lowpass'; slp.frequency.value=620; var sg=ac.createGain(); sg.gain.value=0; src(bb).connect(slp); slp.connect(sg); sg.connect(master);
  var bbp=ac.createBiquadFilter(); bbp.type='bandpass'; bbp.frequency.value=1500; bbp.Q.value=0.7; var bg=ac.createGain(); bg.gain.value=0; src(wb).connect(bbp); bbp.connect(bg); bg.connect(master);
  AU={ac:ac,master:master,mlp:mlp,wbp:wbp,wg:wg,hg:hg,sg:sg,bg:bg}; return true; }
function audioFrame(f){ if(!AU||!auOn) return; var now=performance.now(); if(now-auT<90) return; var dt=(now-auT)/1000; auT=now;
  var s=EXO.state; if(!s) return; var c=s.cond, T=AU.ac.currentTime, under=!!f.under;
  var z=f.deck?1:clamp(1-(f.r-12)/150,0.10,1), gust=1+0.22*Math.sin(now*0.0011)+0.12*Math.sin(now*0.0037+1.3);
  var dp=Math.abs((f.pitch||0)-prevPitch)/Math.max(0.03,dt); prevPitch=f.pitch||0; slam+=(Math.min(1,dp*9)-slam)*0.35;
  function set(p,v){ p.setTargetAtTime(v,T,0.18); }
  set(AU.wbp.frequency,(300+c.wind*24)*(0.75+0.25*z));
  set(AU.wg.gain,(0.10+c.wind/40*0.55)*(0.50+0.50*z)*gust*(under?0.06:1));
  set(AU.hg.gain,Math.max(0,(c.wind-11)/26)*0.10*z*(under?0:1));
  set(AU.sg.gain,(0.22+FIX.sog/7*0.40)*z*z*(f.deck?1.25:1)*(under?1.6:1));
  set(AU.bg.gain,(0.03+0.30*slam)*z*z*(under?0.2:1));
  set(AU.mlp.frequency,under?330:18000); }
function audioSet(on){ if(on&&!AU){ if(!audioStart()){ toast('הדפדפן הזה לא תומך בקול מסונתז'); return false; } }
  auOn=!!on; if(!AU) return false; if(auOn) AU.ac.resume(); AU.master.gain.setTargetAtTime(auOn?0.9:0,AU.ac.currentTime,0.25);
  var b=$('bSound'); if(b){ b.setAttribute('aria-pressed',auOn?'true':'false'); b.textContent=auOn?'קול: פועל':'קול'; } return auOn; }
document.addEventListener('visibilitychange',function(){ if(AU&&auOn) AU.master.gain.setTargetAtTime(document.hidden?0:0.9,AU.ac.currentTime,0.2); });

/* ================= הודעה קצרה ================= */
function toast(msg,ms){ var t=$('toast'); if(!t) return; t.textContent=msg; t.classList.remove('off'); clearTimeout(toast.t); toast.t=setTimeout(function(){ t.classList.add('off'); },ms||5200); }

/* ================= התפריט ================= */
var menu=$('menu'), menuBtn=$('menuBtn'), menuOpen=false;
function setMenu(on){ menuOpen=!!on; menu.hidden=!on; menuBtn.setAttribute('aria-expanded',on?'true':'false'); if(on){ var f=menu.querySelector('button,a'); if(f) try{ f.focus({preventScroll:true}); }catch(e){} } }
menuBtn.addEventListener('click',function(){ setMenu(!menuOpen); });
$('menuX').addEventListener('click',function(){ setMenu(false); menuBtn.focus(); });
document.addEventListener('pointerdown',function(ev){ if(menuOpen&&!menu.contains(ev.target)&&ev.target!==menuBtn&&!menuBtn.contains(ev.target)) setMenu(false); },true);
if(typeof STORY!=='undefined'&&STORY){ put('mStory',STORY); put('jLead',STORY); }

function camButtons(f){ var mode=f&&f.deck?'deck':(f&&f.under?'dive':'orbit'), bs=menu.querySelectorAll('[data-cam]');
  for(var i=0;i<bs.length;i++) bs[i].setAttribute('aria-pressed',bs[i].getAttribute('data-cam')===mode?'true':'false'); }
menu.addEventListener('click',function(ev){ var t=ev.target.closest?ev.target.closest('button,a'):ev.target; if(!t) return;
  var cam=t.getAttribute('data-cam'), lay=t.getAttribute('data-layer');
  if(cam&&LIVE){ if(cam==='deck'){ EXO.setCam('deck'); toast('מבט מהסיפון. גרירה מסובבת את הראש; הסירה זזה מתחתיך, האופק נשאר ישר'); }
    else if(cam==='dive'){ EXO.dive(true); } else { if(EXO.frame.under) EXO.dive(false); else EXO.setCam('orbit'); frameScene(); }
    setMenu(false); }
  else if(lay&&LIVE){ var on=t.getAttribute('aria-pressed')!=='true'; t.setAttribute('aria-pressed',on?'true':'false'); EXO.setLayer(lay,on); store('exo.layer.'+lay,on?'1':'0'); }
  else if(t.id==='bSound'){ audioSet(!auOn); }
  else if(t.id==='bLite'&&LIVE){ var n=EXO.quality==='lite'?'full':'lite'; EXO.setQuality(n); store('exo.quality',n); paintLite(false); }
  else if(t.id==='bFull'){ goFull(); setMenu(false); }
  else if(t.id==='bInstall'&&installEv){ installEv.prompt(); installEv=null; t.hidden=true; }
  else if(t.id==='mJourney'){ ev.preventDefault(); setMenu(false); openJourney('voyage'); }
});
function paintLite(auto){ var b=$('bLite'); if(!b||!LIVE) return; var lite=EXO.quality==='lite'; b.setAttribute('aria-pressed',lite?'true':'false');
  if(auto&&lite) toast('עברנו לבד למצב קל: המכשיר הזה התקשה עם ההדמיה המלאה. אפשר להחזיר מהתפריט',6500); }
if(LIVE){ var q=store('exo.quality'); if(q==='lite'||q==='full') EXO.setQuality(q); paintLite(false);
  ['wind','wave','cur'].forEach(function(n){ if(store('exo.layer.'+n)==='0'){ EXO.setLayer(n,false); var b=menu.querySelector('[data-layer="'+n+'"]'); if(b) b.setAttribute('aria-pressed','false'); } }); }
else { var off=menu.querySelectorAll('[data-cam],[data-layer],#bSound,#bLite'); for(var oi=0;oi<off.length;oi++) off[oi].disabled=true; }

/* מסך מלא: בדפדפנים שתומכים. באייפון אין דבר כזה לדף רגיל, רק דרך "הוספה למסך הבית" */
var de=document.documentElement, canFull=!!(de.requestFullscreen||de.webkitRequestFullscreen)&&(document.fullscreenEnabled||document.webkitFullscreenEnabled);
var standalone=(window.matchMedia&&(window.matchMedia('(display-mode: fullscreen)').matches||window.matchMedia('(display-mode: standalone)').matches))||window.navigator.standalone===true;
var isIOS=/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
function goFull(){ var on=document.fullscreenElement||document.webkitFullscreenElement;
  if(on){ (document.exitFullscreen||document.webkitExitFullscreen).call(document); return; }
  var p=(de.requestFullscreen||de.webkitRequestFullscreen).call(de); if(p&&p.catch) p.catch(function(){}); }
(function(){ var b=$('bFull'), h=$('mHint'); if(b) b.hidden=!canFull||standalone;
  if(h){ if(standalone) h.hidden=true; else if(isIOS) h.textContent='באייפון: שיתוף ← ״הוספה למסך הבית״. מהסמל שנוצר היומן נפתח על כל המסך, כמו אפליקציה.';
    else h.textContent='אפשר להוסיף את היומן למסך הבית מתפריט הדפדפן, ואז הוא נפתח על כל המסך, כמו אפליקציה.'; } })();
var installEv=null; window.addEventListener('beforeinstallprompt',function(e){ e.preventDefault(); installEv=e; var b=$('bInstall'); if(b) b.hidden=false; });

/* ================= "המסע": הגלובוס, המרוץ, התחזית והסקסטנט — נפתחים מעל החלון ================= */
var J=$('journey'), jOpen=false, jReady=null, jPushed=false;
function openJourney(section,globeView){
  if(globeView) window.EXO_GLOBE_START=globeView;
  if(!jOpen){ jOpen=true; J.hidden=false; document.body.classList.add('j-open'); if(LIVE) EXO.pause(true);
    if(AU&&auOn) AU.master.gain.setTargetAtTime(0.05,AU.ac.currentTime,0.3);
    try{ history.pushState({exoJourney:1},''); jPushed=true; }catch(e){ jPushed=false; }
    if(!jReady) jReady=loadCss('assets/front.css').then(function(){ return loadCss('assets/v2/journey.css'); }).then(function(){ return loadScript('assets/v2/journey.js'); })
      .catch(function(){ toast('חלק מהדף לא נטען. רענון בדרך כלל פותר את זה'); }); }
  (jReady||Promise.resolve()).then(function(){ var t=section&&$(section), bar=J.querySelector('.j-bar'), bh=bar?bar.offsetHeight:0; J.scrollTop=0;
    if(globeView){ var gb=J.querySelector('.globebox'); if(gb) J.scrollTop=Math.max(0,gb.getBoundingClientRect().top-J.getBoundingClientRect().top+J.scrollTop-bh-8); }
    else if(t&&section!=='voyage') J.scrollTop=Math.max(0,t.getBoundingClientRect().top-J.getBoundingClientRect().top+J.scrollTop-bh);
    if(globeView&&window.__exoFly) window.__exoFly(globeView);
    try{ $('jBack').focus({preventScroll:true}); }catch(e){} });
}
function closeJourney(fromPop){ if(!jOpen) return; jOpen=false; J.hidden=true; document.body.classList.remove('j-open'); if(LIVE){ EXO.pause(false); if(EXO.setZoom&&EXO.frame.r>120) EXO.setZoom(70); }
  if(AU&&auOn) AU.master.gain.setTargetAtTime(0.9,AU.ac.currentTime,0.3);
  if(!fromPop&&jPushed){ jPushed=false; try{ history.back(); }catch(e){} } }
window.addEventListener('popstate',function(){ if(jOpen){ jPushed=false; closeJourney(true); } });
$('jBack').addEventListener('click',function(){ closeJourney(false); });
$('mini').addEventListener('click',function(){ openJourney('voyage'); });
document.addEventListener('keydown',function(ev){ if(ev.key==='Escape'){ if(menuOpen){ setMenu(false); menuBtn.focus(); } else if(jOpen) closeJourney(false); } });
if(LIVE) EXO.onZoomOut=function(){ openJourney('voyage','world'); };
/* קישורים ישנים אל מקטעי הדף הקודם ממשיכים לעבוד */
(function(){ var h=(location.hash||'').replace('#',''); if(['journey','voyage','race','scale','ahead','sextant','more'].indexOf(h)>=0) setTimeout(function(){ openJourney(h==='journey'?'voyage':h); },400); })();

/* ================= הפעלה ================= */
function staticState(){ var now=Date.now(), best=null, bd=1e18, i; if(typeof COND!=='undefined') for(i=0;i<COND.length;i++){ var t=Date.parse(COND[i][0]+'Z'), dd=Math.abs(t-now); if(dd<bd){ bd=dd; best=COND[i]; } }
  var c=best?{wind:best[1],gust:best[2],windDir:best[3],waveH:best[4],waveT:best[5],waveDir:best[6],cur:best[7],curDir:best[8],
    pres:best.length>=15?best[9]:null,presTrend:null,airT:best.length>=15?best[10]:null,seaT:best.length>=15?best[11]:null,cloud:best.length>=15?best[12]:null,visKm:best.length>=15?best[13]:null,precip:best.length>=15?best[14]:null}:null;
  var loc=new Date(now+FIX.lon/15*3600000); return {now:now,cond:c,localHM:pad(loc.getUTCHours())+':'+pad(loc.getUTCMinutes()),gateBrg:gateBearing()}; }
measure(); frameScene(); drawMini();
if(LIVE){ EXO.on(function(s){ renderHud(s); drawMini(); if(s.qualityAuto) paintLite(true); }); }
else { renderHud(staticState()); setInterval(function(){ renderHud(staticState()); },30000); }
window.addEventListener('resize',function(){ measure(); frameScene(); SZ={}; if(LIVE&&EXO.state) renderHud(EXO.state); measureTop(); });
setTimeout(measureTop,300); setTimeout(measureTop,2500);
idle(function(){ loadScript('assets/v2/coast.js').then(function(){ NEAR=null; drawMini(); }).catch(function(){}); },1800);
if(LIVE&&!store('exo.hint.v2')){ setTimeout(function(){ toast('גרירה מסובבת לכל כיוון, גם אל מתחת למים. צביטה או גלגלת מקרבת ומרחיקה',7000); store('exo.hint.v2','1'); },1600); }
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(function(){ SZ={}; measureTop(); });
})();
