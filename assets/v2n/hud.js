/* ===== v2/hud.js — כל מה שמסביב לסצנה בדף במסך מלא =====
   שורת הנתונים, שלושת השעונים, התוויות שעל טבעת המצפן, מפת המיקומים, כפתור השכבות (רוח, גל, זרם), התפריט, הקול,
   הגלובוס כשכבה קבועה על כל המסך, ו"המסע והניתוח" (הסיפור, הצי, התחזית והסקסטנט) שנפתח מכפתור מפת המיקומים.
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
  /* יום המרוץ נגזר מהשעון המוצג ולא מנקודת הציון: גרירה של 30 שעות קדימה החליפה את התאריך
     ל-22.09 והשאירה "יום 15". אותה נוסחה שרצועת הימים בגלובוס משתמשת בה. */
  var dayN=(typeof RACE_START!=='undefined')?Math.floor((s.now/1000-RACE_START)/86400)+1:FIX.dayN;
  put('hDay','יום '+dayN);
  put('hDate',pad(d.getUTCDate())+'.'+pad(d.getUTCMonth()+1)+'.'+d.getUTCFullYear());
  put('hPos',dmm(FIX.lat,2,'N','S')+'  '+dmm(FIX.lon,3,'E','W'));
  var fx=new Date(FIX.at*1000), age=(s.now/1000-FIX.at)/3600;
  var ageTxt=age<1?'לפני פחות משעה':age<24?'לפני '+heb(age,'שעה','שעתיים','שע׳'):'לפני '+heb(age/24,'יום','יומיים','ימים');
  var hf=$('hFix'); hf.textContent='נ״צ '+pad(fx.getUTCHours())+':'+pad(fx.getUTCMinutes())+' UTC · '+ageTxt; hf.className=age>12?'stale':'dim';
  /* מספרי המרוץ הם תמונת המצב של נקודת הציון. מעל 12 שעות זה כבר לא "עכשיו", והשורה אומרת זאת. */
  var stale=age>12, aw=$('vAgeW');
  if(aw){ aw.hidden=!stale; if(stale){ put('vAge',ageTxt); aw.className='stale'; } }
  /* "תחזית" רק כשהזמן המוצג נמצא אחרי ההווה האמיתי — כלומר גררו קדימה. forecast של pickCond
     (אחרי OBS_UNTIL) נכון כמעט כל היום, כי הרענון רץ פעמיים ביום: בזמן אמת הערך הוא ההערכה
     הטובה ביותר של *עכשיו*, לא ניבוי של העתיד, וכיתוב "תחזית" עליו היה מטעה בכיוון ההפוך. */
  var ahead=(LIVE&&EXO.clockOff)?EXO.clockOff():0;
  var fw=$('hFcastW'); if(fw) fw.hidden=!(c&&!c.missing&&ahead>5*60000);
  if(c&&c.missing){
    /* אין טבלת מזג אוויר. לא ממציאים מספר: מקף במקום ערך, והשורה השלישית נעלמת. */
    put('hWind','—'); put('hBft',''); put('hWave','—'); put('hSea',''); put('hCur','—');
    show('hRow3',false);
    if(!renderHud._noCond){ renderHud._noCond=true;
      setTimeout(function(){ toast('נתוני מזג האוויר לא נטענו. המיקום והמספרים מהמעקב נכונים; הרוח, הגל והזרם אינם מוצגים',8000); },2400); }
  } else if(c){
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
  if(c){ labelTexts(s); put('lyWind',Math.round(c.wind)); put('lyWave',c.waveH.toFixed(1)); put('lyCur',c.cur.toFixed(1)); paintLayers(); }
}

/* ================= תוויות על הסצנה: מעלות הטבעת, רוח, גל, זרם, היעד ================= */
var LB={}, labelsHost=$('labels'), SZ={}, safeTop=0;
function measureTop(){ var a=document.querySelector('.topr'), b=document.querySelector('.clocks'); safeTop=Math.max(a?a.getBoundingClientRect().bottom:0,b?b.getBoundingClientRect().bottom:0)+6;
  document.documentElement.style.setProperty('--top',Math.round(safeTop)+'px'); measureBot(); }
/* --bot: הגובה שתופסת שורת מספרי המרוץ בתחתית. עד כאן כל מה שישב מעליה — המפה הקטנה, טור
   הבקרות, ההודעה הצפה, רצועת הימים — קיבל קבוע משלו לכל רוחב מסך (44, 46, 62, 63, 66, 81),
   והם נסחפו זה מזה בכל שינוי. עכשיו מודדים אותה פעם אחת וכולם נשענים על אותה שורה. */
/* עומק ההצללה מאחורי שורות הנתונים, לפי גובה השמש בנקודה של דניאל — אותו מדרג שמצייר את
   רקע הרצועה השעתית, כדי ששניהם יספרו את אותו סיפור. נמדד: בלילה רקע בבהירות 0.006 וכל
   הטקסט מעל 6.4:1; ביום הרקע מגיע ל-0.35 ואפילו הערכים הלבנים יורדים ל-2.4:1. */
function vigTick(){
  var a; try{ a=tsSunAt(tsLive()); }catch(e){ return; }
  var d=Math.max(0,Math.min(1,(a+4)/10)), st=document.documentElement.style;
  st.setProperty('--vg1',(0.55+0.19*d).toFixed(3));
  st.setProperty('--vg2',(0.16+0.44*d).toFixed(3));
  st.setProperty('--vg3',(0.03+0.24*d).toFixed(3));
  st.setProperty('--vgb',(0.55+0.28*d).toFixed(3));
  /* בין #879caa ל-#ccd8e1, ובין #bccad3 ל-#e2ebf1 */
  st.setProperty('--ink3d',mixHex('#879caa','#ccd8e1',d));
  st.setProperty('--ink2d',mixHex('#bccad3','#e2ebf1',d));
  st.setProperty('--shd',d<0.15?'var(--sh)':
    '0 0 2px rgba(3,10,16,'+(0.9+0.06*d).toFixed(2)+'),0 0 6px rgba(3,10,16,'+(0.70+0.28*d).toFixed(2)+'),0 1px 3px rgba(3,10,16,'+(0.6+0.35*d).toFixed(2)+')');
}
function mixHex(a,b,t){ function p(h){ return [parseInt(h.substr(1,2),16),parseInt(h.substr(3,2),16),parseInt(h.substr(5,2),16)]; }
  var x=p(a), y=p(b), o='#';
  for(var i=0;i<3;i++){ var v=Math.round(x[i]+(y[i]-x[i])*t).toString(16); o+=(v.length<2?'0':'')+v; }
  return o; }
function measureBot(){ var v=document.querySelector('.hud.vit'); if(!v) return;
  var r=v.getBoundingClientRect(), h=window.innerHeight||document.documentElement.clientHeight;
  var band=Math.max(0,Math.round(h-r.top))+4;
  document.documentElement.style.setProperty('--bot',band+'px'); }
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
  var rk=1-(f.gT||0), hot=(LAB.ringHot||0)*rk, idleD=(0.10+0.90*hot)*rk, A=f.anchors||{}, list=[], placed=[], rects=[], dat=['wind','wave','cur','gate'];
  function tryGrad(i,x,y,op,minD){ if(x===null||x===undefined){ place('g'+i,null); return; }
    for(var q=0;q<rects.length;q++) if(x>rects[q][0]&&x<rects[q][2]&&y>rects[q][1]&&y<rects[q][3]){ place('g'+i,null); return; }
    for(var k=0;k<placed.length;k++) if(Math.abs(placed[k][0]-x)<minD&&Math.abs(placed[k][1]-y)<minD*0.55){ place('g'+i,null); return; }
    placed.push([x,y]); place('g'+i,x,y,op); }
  if(!f.under){
    dat.forEach(function(n){ var q=A[n], on=q&&((n==='gate')?!A.beacon:EXO.layers[n]); if(on) list.push([n,q[0],q[1]]); else place(n,null); });
    declutter(list).forEach(function(it){ place(it[0],it[1],it[2],idleD); var z=SZ[it[0]]||{w:110,h:16}; rects.push([it[1]-z.w/2-18,it[2]-z.h/2-9,it[1]+z.w/2+18,it[2]+z.h/2+9]); });
    [0,3,6,9,1,2,4,5,7,8,10,11].forEach(function(i){ var p=A['g'+i]; tryGrad(i,p?p[0]:null,p?p[1]:null,(i===0?0.16+0.84*hot:(i%3===0?0.06:0.03)+0.94*hot)*rk,(i%3===0?22:34)); });
  } else { for(var gi=0;gi<12;gi++) place('g'+gi,null); dat.forEach(function(n){ place(n,null); }); }
  var bc=A.beacon; if(bc&&!f.under) place('beacon',bc[0],bc[1],1); else place('beacon',null);
  audioFrame(f);
  globeX(f);
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
var AU=null, auOn=false, auT=0, prevPitch=0, slam=0, auWanted=(store('exo.sound')!=='0'), auTried=false;
/* שש שכבות מסונתזות: סוול עמוק, שבירת גלים, שטיפת הגוף לפי המהירות, רוח בחיבל, שריקה בפסגות הרוח,
   וחבטה כשגל פוגע. כולן נגזרות מהתנאים האמיתיים; עוצמתן יורדת עם המרחק מהסירה ונחנקת מתחת למים. */
function audioStart(){
  var Ctx=window.AudioContext||window.webkitAudioContext; if(!Ctx) return false;
  var ac=new Ctx(), len=Math.floor(ac.sampleRate*7), i;
  var wb=ac.createBuffer(2,len,ac.sampleRate), bb=ac.createBuffer(2,len,ac.sampleRate);
  for(var ch=0;ch<2;ch++){ var w=wb.getChannelData(ch), b=bb.getChannelData(ch), last=0, l2=0;
    for(i=0;i<len;i++){ var r=Math.random()*2-1; w[i]=r*0.9;
      last=(last+0.020*r)/1.020; l2=(l2+0.09*last)/1.09; b[i]=l2*26; }        /* רעש חום, לסוול */
    /* חפיפה קצרה בקצה כדי שהלולאה לא תקליק */
    var xf=Math.floor(ac.sampleRate*0.25);
    for(i=0;i<xf;i++){ var k=i/xf; w[i]=w[i]*k+w[len-xf+i]*(1-k); b[i]=b[i]*k+b[len-xf+i]*(1-k); } }
  function src(buf,rate){ var s=ac.createBufferSource(); s.buffer=buf; s.loop=true; if(rate) s.playbackRate.value=rate; s.start(Math.random()*0.1); return s; }
  var comp=ac.createDynamicsCompressor();
  comp.threshold.value=-18; comp.knee.value=18; comp.ratio.value=3.2; comp.attack.value=0.02; comp.release.value=0.35;
  var master=ac.createGain(); master.gain.value=0;
  var mlp=ac.createBiquadFilter(); mlp.type='lowpass'; mlp.frequency.value=19000;
  master.connect(mlp); mlp.connect(comp); comp.connect(ac.destination);
  function layer(node,g0){ var g=ac.createGain(); g.gain.value=g0||0; node.connect(g); g.connect(master); return g; }
  /* סוול: רעש חום נמוך מאוד */
  var slf=ac.createBiquadFilter(); slf.type='lowpass'; slf.frequency.value=150; slf.Q.value=0.6;
  src(bb,0.85).connect(slf); var swg=layer(slf);
  /* שבירת גלים: פס רחב סביב 400 הרץ */
  var wbp=ac.createBiquadFilter(); wbp.type='bandpass'; wbp.frequency.value=430; wbp.Q.value=0.5;
  src(wb).connect(wbp); var wg=layer(wbp);
  /* שטיפת הגוף: רעש בהיר יותר, תלוי מהירות */
  var hp=ac.createBiquadFilter(); hp.type='bandpass'; hp.frequency.value=1150; hp.Q.value=0.55;
  src(wb,1.07).connect(hp); var hwg=layer(hp);
  /* רוח בחיבל: פס בינוני שמשתנה עם המהירות */
  var wnd=ac.createBiquadFilter(); wnd.type='bandpass'; wnd.frequency.value=700; wnd.Q.value=0.8;
  src(wb,0.93).connect(wnd); var wng=layer(wnd);
  /* שריקה: פס צר, רק ברוח חזקה */
  var hbp=ac.createBiquadFilter(); hbp.type='bandpass'; hbp.frequency.value=2300; hbp.Q.value=8;
  src(wb,1.13).connect(hbp); var hg=layer(hbp);
  /* חבטה: נמוך ורחב, נפתח ברגע הפגיעה */
  var bbp=ac.createBiquadFilter(); bbp.type='bandpass'; bbp.frequency.value=260; bbp.Q.value=0.8;
  src(bb,1.4).connect(bbp); var bg=layer(bbp);
  AU={ac:ac,master:master,mlp:mlp,wbp:wbp,wnd:wnd,hbp:hbp,slf:slf,hp:hp,
      swg:swg,wg:wg,hwg:hwg,wng:wng,hg:hg,bg:bg}; return true; }
function audioFrame(f){ if(!AU||!auOn) return; var now=performance.now(); if(now-auT<80) return; var dt=(now-auT)/1000; auT=now;
  var s=EXO.state; if(!s) return; var c=s.cond, T=AU.ac.currentTime, under=!!f.under;
  /* מרחק: על הסיפון מלא, ומשם דועך עד שקט מוחלט בערך ב-260 מ׳ */
  var z=f.deck?1:clamp(1-(f.r-14)/250,0,1); z=z*z;
  var gust=1+0.20*Math.sin(now*0.00091)+0.13*Math.sin(now*0.0031+1.3)+0.07*Math.sin(now*0.0073+2.1);
  var dp=Math.abs((f.pitch||0)-prevPitch)/Math.max(0.03,dt); prevPitch=f.pitch||0;
  slam+=(Math.min(1,dp*9+(f.burst||0)*0.8)-slam)*0.30;
  var W=c.wind, H=c.waveH, S=FIX.sog;
  function set(p,v){ p.setTargetAtTime(v,T,0.16); }
  set(AU.slf.frequency,110+H*22);
  set(AU.swg.gain,(0.16+Math.min(0.55,H*0.24))*z*(under?1.5:1));
  set(AU.wbp.frequency,(330+W*16)*(0.8+0.2*z));
  set(AU.wg.gain,(0.07+Math.min(0.40,H*0.17)+Math.max(0,W-9)/30*0.16)*z*gust*(under?0.10:1));
  set(AU.hp.frequency,900+S*95);
  set(AU.hwg.gain,Math.max(0,S-1.4)/6*0.26*z*(f.deck?1.25:1)*(under?1.35:1));
  set(AU.wnd.frequency,520+W*30);
  set(AU.wng.gain,(0.05+W/38*0.42)*z*gust*(under?0.03:1));
  set(AU.hbp.frequency,1900+W*38);
  set(AU.hg.gain,Math.max(0,(W-13)/24)*0.085*z*gust*(under?0:1));
  set(AU.bg.gain,(0.02+0.34*slam)*z*(under?0.25:1));
  set(AU.mlp.frequency,under?300:19000); }
function audioSet(on,quiet){ if(on&&!AU){ if(!audioStart()){ if(!quiet) toast('הדפדפן הזה לא תומך בקול מסונתז'); return false; } }
  auOn=!!on; if(!AU) return false; if(auOn){ try{ AU.ac.resume(); }catch(e){} }
  AU.master.gain.setTargetAtTime(auOn?0.9:0,AU.ac.currentTime,0.3);
  store('exo.sound',auOn?'1':'0'); auWanted=auOn; paintSound(); return auOn; }
function paintSound(){ var b=$('sndBtn'); if(b){ b.setAttribute('aria-pressed',auOn?'true':'false'); b.classList.toggle('off',!auOn);
    b.setAttribute('aria-label',auOn?'קול פועל, להשתקה':'קול מושתק, להפעלה'); }
  var m=$('bSound'); if(m){ m.setAttribute('aria-pressed',auOn?'true':'false'); m.textContent=auOn?'קול: פועל':'קול'; } }
/* ברירת המחדל היא קול פועל. דפדפנים לא מרשים להתחיל בלי מגע, ולכן מתחילים במגע הראשון. */
function auArm(){ if(auTried||!auWanted) return; auTried=true; audioSet(true,true); }
['pointerdown','keydown','touchstart','wheel'].forEach(function(ev){
  window.addEventListener(ev,function h(){ auArm(); window.removeEventListener(ev,h,true); },{capture:true,passive:true}); });
document.addEventListener('visibilitychange',function(){ if(AU&&auOn) AU.master.gain.setTargetAtTime(document.hidden?0:0.9,AU.ac.currentTime,0.2); });

/* ================= הודעה קצרה ================= */
function toast(msg,ms){ var t=$('toast'); if(!t) return; t.textContent=msg; t.classList.remove('off'); clearTimeout(toast.t); toast.t=setTimeout(function(){ t.classList.add('off'); },ms||5200); }

/* ================= התפריט ================= */
var menu=$('menu'), menuBtn=$('menuBtn'), menuOpen=false;
function setMenu(on){ menuOpen=!!on; menu.hidden=!on; menuBtn.setAttribute('aria-expanded',on?'true':'false'); if(on){ var f=menu.querySelector('button,a'); if(f) try{ f.focus({preventScroll:true}); }catch(e){} } }
menuBtn.addEventListener('click',function(){ setMenu(!menuOpen); });
var sndB=$('sndBtn'); if(sndB) sndB.addEventListener('click',function(){ auTried=true; audioSet(!auOn); });
$('menuX').addEventListener('click',function(){ setMenu(false); menuBtn.focus(); });
document.addEventListener('pointerdown',function(ev){ if(menuOpen&&!menu.contains(ev.target)&&ev.target!==menuBtn&&!menuBtn.contains(ev.target)) setMenu(false); },true);
if(typeof STORY!=='undefined'&&STORY){ put('jLead',STORY); }

menu.addEventListener('click',function(ev){ var t=ev.target.closest?ev.target.closest('button,a'):ev.target; if(!t) return;
  if(t.id==='bSound'){ audioSet(!auOn); }
  else if(t.id==='bLite'&&LIVE){ var n=EXO.quality==='lite'?'full':'lite'; EXO.setQuality(n); store('exo.quality',n); paintLite(false); }
  else if(t.id==='bFull'){ goFull(); setMenu(false); }
  else if(t.id==='bInstall'&&installEv){ installEv.prompt(); installEv=null; t.hidden=true; }
});
function paintLite(auto){ var b=$('bLite'); if(!b||!LIVE) return; var lite=EXO.quality==='lite'; b.setAttribute('aria-pressed',lite?'true':'false');
  if(auto&&lite) toast('עברנו לבד למצב קל: המכשיר הזה התקשה עם ההדמיה המלאה. אפשר להחזיר מהתפריט',6500); }
if(LIVE){ var q=store('exo.quality'); if(q==='lite'||q==='full') EXO.setQuality(q); paintLite(false);
  ['wind','wave','cur'].forEach(function(n){ if(store('exo.layer.'+n)==='0') EXO.setLayer(n,false); }); }
else { var off=document.querySelectorAll('#lay [data-layer],#bSound,#bLite'); for(var oi=0;oi<off.length;oi++) off[oi].disabled=true; }

/* ================= כפתור השכבות: רוח, גל, זרם ================= */
var layHost=$('lay'), LAYN={wind:['רוח','קשר','מוצגת','מוסתרת'],wave:['גל','מטר','מוצג','מוסתר'],cur:['זרם','קשר','מוצג','מוסתר']};
function paintLayers(){ if(!layHost) return; var bs=layHost.querySelectorAll('[data-layer]');
  for(var i=0;i<bs.length;i++){ var n=bs[i].getAttribute('data-layer'), on=LIVE?!!EXO.layers[n]:true, v=bs[i].querySelector('.n'), L=LAYN[n];
    bs[i].setAttribute('aria-pressed',on?'true':'false');
    bs[i].setAttribute('aria-label',L[0]+', '+(v?v.textContent:'')+' '+L[1]+', '+(on?L[2]:L[3])); } }
if(layHost) layHost.addEventListener('click',function(ev){ var t=ev.target.closest?ev.target.closest('[data-layer]'):null; if(!t||!LIVE) return;
  var n=t.getAttribute('data-layer'), on=!EXO.layers[n]; EXO.setLayer(n,on); store('exo.layer.'+n,on?'1':'0'); paintLayers();
  LAB.ringHotT=performance.now(); if(EXO.kick) EXO.kick(); });     /* הטבעת נדלקת לרגע, כדי שרואים מה נדלק ומה כבה גם עליה */
paintLayers();

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

/* ================= הגלובוס: שכבה קבועה על כל המסך =================
   MapLibre (1.1MB), קו החוף והשמות נטענים והגלובוס נבנה ברקע, מוסתר, כמה שניות אחרי הפריים הראשון (ב"מצב קל": רק כשמבקשים).
   כך הוא מוכן ברגע שמתרחקים עד הסוף. אם מתרחקים לפני שהוא מוכן, הוא נפתח ומתמלא כשהטעינה מסתיימת. */
var popSkip=0;      /* history.back() שאנחנו יזמנו: ה-popstate שלו לא סוגר שום דבר נוסף */
var G=$('globeLayer'), gOpen=false, gBuild=null, gPushed=false, gFailed=false;
function globeBuild(){ return gBuild||(gBuild=Promise.all([loadCss('assets/vendor/maplibre-gl.css'),loadScript('assets/vendor/maplibre-gl.js'),
    (typeof LAND50!=='undefined')?Promise.resolve():loadScript('assets/geo/land50.js'),
    loadScript('assets/v2n/names.js').catch(function(){}),
    loadScript('assets/fleet-log.js').catch(function(){})]).then(function(){ return loadScript('assets/v2n/globe.js'); })
    .catch(function(){ gFailed=true; if(gOpen){ closeGlobe(false); toast('הגלובוס לא נטען. רענון בדרך כלל פותר את זה'); } })); }
function openGlobe(how){
  if(gFailed){ toast('הגלובוס לא נטען. רענון בדרך כלל פותר את זה'); return; }
  if(jOpen) closeJourney(false);
  if(!gOpen){ gOpen=true; if(LIVE) EXO.globeOwns=true; tsVeil(1); G.setAttribute('aria-hidden','false'); document.body.classList.add('g-open'); setMenu(false); if(LIVE) EXO.pause(true); measureTop();
    try{ history.pushState({exoGlobe:1},''); gPushed=true; }catch(e){ gPushed=false; } }
  if(!window.__exoGlobeLoaded) toast('הגלובוס נטען',2500);
  globeBuild().then(function(){ if(gOpen&&window.__exoGlobeEnter) window.__exoGlobeEnter(how||'boat'); });
  try{ $('gBack').focus({preventScroll:true}); }catch(e){} }
function closeGlobe(fromPop,stay){ if(!gOpen) return; gOpen=false; if(LIVE) EXO.globeOwns=false; tsVeil(0); G.setAttribute('aria-hidden','true'); document.body.classList.remove('g-open');
  G.style.opacity=''; gxOn=false; gRet=false; document.body.classList.remove('g-x');
  if(LIVE){ EXO.pause(false); if(!stay&&EXO.frame.r>120){ if(EXO.glideTo&&EXO.zoomAxis){ EXO.setU(EXO.zoomAxis.XF-0.02); EXO.glideTo(EXO.zoomAxis.uOfR(64),1500); } else EXO.setZoom(70); } }
  if(!fromPop&&gPushed){ gPushed=false; popSkip++; try{ history.back(); }catch(e){ popSkip--; } } }
$('gBack').addEventListener('click',function(){ closeGlobe(false); });
window.__exoBackToBoat=function(){ closeGlobe(false); };   /* הקשה כפולה על הגלובוס */
if(LIVE) EXO.onZoomOut=function(){ openGlobe('out'); };      /* בלי מעברים (מצב קל, reduced motion, או גלובוס שעוד לא מוכן): קפיצה, כמו במנה א׳ */

/* ההצלבה בין ההדמיה לגלובוס, לשני הכיוונים. המנוע מדווח gX (0 עד 1) בכל פריים, והוא מונע מהצביטה או מהגלגלת עצמה.
   ביציאה: כש-gX עולה מעל אפס הגלובוס מתמקם מעל הסירה, באותו כיוון מצפן, ונחשף בהדרגה; ב-1 הוא מקבל את המגע וההדמיה נעצרת.
   בחזרה: globe.js מדווח כמה עמוק התקרבו אל הסירה (__exoGlobeReturn), ההדמיה מתעוררת מתחת לגלובוס, והוא מתפוגג. */
var gxOn=false, gRet=false;
/* הרצועה השעתית שייכת לסיפון: היא נעלמת לאורך ההצלבה אל הגלובוס וחוזרת בחזרה אליו.
   על הגלובוס יש רצועת ימים משלו, והיא לא נוגעת בשעון של ההדמיה. */
var tsV=-1;
function tsVeil(X){ if(!TS||!TS.box) return; var v=Math.round(Math.max(0,Math.min(1,1-X))*40)/40;
  if(v===tsV) return; tsV=v;      /* נקרא בכל פריים של ההצלבה: כותבים רק כשבאמת השתנה */
  TS.box.style.opacity=v>=0.999?'':v.toFixed(3);
  TS.box.style.pointerEvents=v<0.5?'none':''; }
function globeX(f){ var X=f.gX||0; tsVeil(gOpen?1:X);
  if(!gOpen){
    if(X>0&&!gxOn&&window.__exoGlobeArm){ gxOn=true; document.body.classList.add('g-x'); window.__exoGlobeArm(f.camBearing); }
    if(gxOn){ G.style.opacity=X.toFixed(3);
      if(window.__exoGlobeTrack&&f.groundW) window.__exoGlobeTrack(f.groundW,f.camBearing);
      if(X>=0.999){ gxOn=false; document.body.classList.remove('g-x'); openGlobe('handoff'); G.style.opacity=''; if(!f.touching&&window.__exoGlobeSettle) window.__exoGlobeSettle(); }
      else if(X<=0){ gxOn=false; document.body.classList.remove('g-x'); G.style.opacity=''; } } }
  else if(gRet){ G.style.opacity=X.toFixed(3);
    if(X<=0.001){ gRet=false; closeGlobe(false,true); }
    else if(X>=0.999&&!retLive){ gRet=false; G.style.opacity=''; EXO.pause(true); } } }
var retLive=false;
window.__exoGlobeReturn=function(X,bearing,u){ if(!LIVE||!gOpen||!EXO.zoomAxis) return; var Z=EXO.zoomAxis;
  if(X>0&&!gRet){ gRet=true; EXO.pause(false); if(EXO.setBearing) EXO.setBearing(((bearing%360)+360)%360); }
  retLive=X>0; if(gRet) EXO.setU(Math.min(Z.GLOBE-0.0005,(u===undefined?Z.GLOBE-X*(Z.GLOBE-Z.XF):u))); };
if(LIVE){ EXO.onOver=function(over){ var Z=EXO.zoomAxis; if(gOpen&&Z&&window.__exoGlobeDrive) window.__exoGlobeDrive(Z.wOfU(Z.GLOBE)*Math.exp(over*Z.K)); };
  var gTick=setInterval(function(){ if(window.__exoGlobeLoaded){ EXO.globeReady=true; clearInterval(gTick); } },700); }
idle(function(){ setTimeout(function(){ if(!LIVE||EXO.quality!=='lite') globeBuild(); },3200); },4000);

/* ================= "המסע והניתוח": הסיפור, הצי, קנה המידה, התחזית והסקסטנט — נפתחים מכפתור מפת המיקומים ================= */
var J=$('journey'), jOpen=false, jReady=null, jPushed=false;
function fleetTable(){ var host=$('fleetTbl'); if(!host||host.firstChild||typeof FLEET==='undefined') return; var lead=FLEET[0][5];
  var h='<table><thead><tr><th>מקום</th><th>סירה</th><th class="nu">עד קו הסיום</th><th class="nu">פער מהמוביל</th><th class="nu">24 שעות</th></tr></thead><tbody>';
  FLEET.forEach(function(b){ var gap=Math.round(b[5]-lead); h+='<tr'+(b[1]===4?' class="me"':'')+'><td>'+b[0]+'</td><td>'+String(b[4]).replace(/&/g,'&amp;').replace(/</g,'&lt;')+(b[1]===4?' · אקסודוס':'')+'</td><td class="nu">'+thou(b[5])+'</td><td class="nu">'+(gap<=0?'—':thou(gap))+'</td><td class="nu">'+(b[6]!=null?Math.round(b[6]):'—')+'</td></tr>'; });
  host.innerHTML=h+'</tbody></table>'; }
function openJourney(section){
  if(gOpen) closeGlobe(false);
  if(!jOpen){ jOpen=true; J.hidden=false; document.body.classList.add('j-open'); if(LIVE) EXO.pause(true);
    if(AU&&auOn) AU.master.gain.setTargetAtTime(0.05,AU.ac.currentTime,0.3);
    try{ history.pushState({exoJourney:1},''); jPushed=true; }catch(e){ jPushed=false; }
    fleetTable();
    if(!jReady) jReady=loadCss('assets/front.css').then(function(){ return loadCss('assets/v2n/journey.css'); }).then(function(){ return loadScript('assets/v2n/journey.js'); })
      .catch(function(){ toast('חלק מהדף לא נטען. רענון בדרך כלל פותר את זה'); }); }
  (jReady||Promise.resolve()).then(function(){ var t=section&&$(section), bar=J.querySelector('.j-bar'), bh=bar?bar.offsetHeight:0; J.scrollTop=0;
    if(t) J.scrollTop=Math.max(0,t.getBoundingClientRect().top-J.getBoundingClientRect().top+J.scrollTop-bh);
    try{ $('jBack').focus({preventScroll:true}); }catch(e){} });
}
function closeJourney(fromPop){ if(!jOpen) return; jOpen=false; J.hidden=true; document.body.classList.remove('j-open'); if(LIVE&&!gOpen) EXO.pause(false);
  if(AU&&auOn) AU.master.gain.setTargetAtTime(0.9,AU.ac.currentTime,0.3);
  if(!fromPop&&jPushed){ jPushed=false; popSkip++; try{ history.back(); }catch(e){ popSkip--; } } }
window.addEventListener('popstate',function(){ if(popSkip>0){ popSkip--; return; } if(jOpen){ jPushed=false; closeJourney(true); } else if(gOpen){ gPushed=false; closeGlobe(true); } });
$('jBack').addEventListener('click',function(){ closeJourney(false); });
$('mini').addEventListener('click',function(){ openJourney(); });
document.addEventListener('keydown',function(ev){ if(ev.key==='Escape'){ if(menuOpen){ setMenu(false); menuBtn.focus(); } else if(jOpen) closeJourney(false); else if(gOpen) closeGlobe(false); } });
/* קישורים ישנים אל מקטעי הדף הקודם ממשיכים לעבוד; "המסע" הישן היה הגלובוס */
(function(){ var h=(location.hash||'').replace('#','');
  if(h==='voyage'||h==='globe') setTimeout(function(){ openGlobe('boat'); },400);
  else if(['journey','race','scale','ahead','sextant','more'].indexOf(h)>=0) setTimeout(function(){ openJourney(h==='journey'?null:h); },400); })();

/* ================= רצועת הזמן: תנאי הסביבה לאורך כל היממות שיש עליהן נתונים =================
   דקה וקבועה, ממש מתחת לשורות הנתונים. הרקע הוא אור היום, מחושב מגובה השמש בנקודה של דניאל:
   לילה כהה, דמדומים חמימים, יום בהיר. מעליו שטח הרוח, קו הגל וקו הלחץ. קו אנכי מפריד בין
   מה שנמדד למה שחזוי. גרירה מזיזה את השעון של כל הדף — השמיים, הים, המפרשים והשורות שלמעלה. */
var TS={cv:$('tsCv'), rng:$('tsRange'), read:$('tsRead'), now:$('tsNow'), box:$('tstrip')};
var TS_T0=0, TS_T1=0, TS_OBS=0, tsScrub=false, tsW=0, tsH=0, tsPaint=0;
function tsReady(){ return !!(TS.cv&&TS.rng&&typeof COND!=='undefined'&&COND.length>2); }
function tsSpan(){ TS_T0=Date.parse(COND[0][0]+'Z'); TS_T1=Date.parse(COND[COND.length-1][0]+'Z');
  TS_OBS=(typeof OBS_UNTIL!=='undefined')?OBS_UNTIL:TS_T1; }
function tsTimeOf(v){ return TS_T0+(TS_T1-TS_T0)*(v/1000); }
function tsValOf(t){ return clamp(Math.round((t-TS_T0)/(TS_T1-TS_T0)*1000),0,1000); }
function tsLive(){ return LIVE?(Date.now()+(EXO.clockOff?EXO.clockOff():0)):Date.now(); }
/* גובה השמש לאורך הרצועה. מחושב פעם אחת לכל עמודה ונשמר, כי הוא לא משתנה בין ציור לציור. */
var tsSun=null;
function tsSunAt(t){ if(LIVE&&EXO.astro&&EXO.astro.sunPos) return EXO.astro.sunPos(t,FIX.lat,FIX.lon).alt*R2D;
  return 20*Math.sin((t/3600000+FIX.lon/15-6)/12*Math.PI); }
function tsDraw(){
  if(!tsReady()) return;
  var cv=TS.cv, r=TS.box.getBoundingClientRect(), dpr=Math.min(window.devicePixelRatio||1,2);
  var W=Math.max(80,Math.round(r.width)), H=Math.max(18,Math.round(r.height));
  if(W!==tsW||H!==tsH||cv.width!==Math.round(W*dpr)){ tsW=W; tsH=H; cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); tsSun=null; }
  var x=cv.getContext('2d'); if(!x) return;
  x.setTransform(dpr,0,0,dpr,0,0); x.clearRect(0,0,W,H);
  var span=TS_T1-TS_T0, i, px, t;
  /* הרקע: אור היום. עמודה אחת לכל פיקסל, בלי מעבר חד בין לילה ליום */
  if(!tsSun||tsSun.length!==W){ tsSun=new Float32Array(W); for(i=0;i<W;i++) tsSun[i]=tsSunAt(TS_T0+span*(i+0.5)/W); }
  for(i=0;i<W;i++){ var a=tsSun[i], day=clamp((a+4)/10,0,1), dusk=Math.max(0,1-Math.abs(a+1)/8);
    var R=Math.round(5+day*36+dusk*54), G=Math.round(11+day*64+dusk*24), B=Math.round(20+day*92+dusk*3);
    x.fillStyle='rgb('+R+','+G+','+B+')'; x.fillRect(i,0,1.02,H); }
  /* הגבול בין מה שנמדד למה שחזוי: קו מקווקו, והצד החזוי מעומעם קלות */
  var obsX=(TS_OBS-TS_T0)/span*W;
  if(obsX>0&&obsX<W){ x.fillStyle='rgba(2,8,14,.13)'; x.fillRect(obsX,0,W-obsX,H);
    x.fillStyle='rgba(205,225,238,.50)'; for(i=0;i<H;i+=4) x.fillRect(obsX-0.5,i,1,2.4); }
  /* חצות ואמצע היום, לפי השעון של דניאל */
  x.fillStyle='rgba(205,225,238,.16)';
  var h0=Math.ceil((TS_T0+FIX.lon/15*3600000)/3600000), h1=Math.floor((TS_T1+FIX.lon/15*3600000)/3600000);
  for(i=h0;i<=h1;i++){ var hh=((i%24)+24)%24; if(hh!==0&&hh!==12) continue;
    px=(i*3600000-FIX.lon/15*3600000-TS_T0)/span*W; x.fillRect(px-0.5,hh===0?0:H-4,1,hh===0?H:4); }
  /* שלושה גדלים, כל אחד מנורמל לטווח שלו: רוח כשטח, גל וֹלחץ כקווים */
  function series(col,cap,wid,fill){
    var lo=1e9, hi=-1e9, v=[]; for(i=0;i<COND.length;i++){ var q=col(COND[i]); v.push(q); if(q!=null){ if(q<lo) lo=q; if(q>hi) hi=q; } }
    if(hi<=-1e8) return; if(hi-lo<1e-6) hi=lo+1;
    var pad2=(hi-lo)*0.18; lo-=pad2; hi+=pad2;
    x.beginPath();
    for(i=0;i<COND.length;i++){ if(v[i]==null) continue;
      px=(Date.parse(COND[i][0]+'Z')-TS_T0)/span*W; var py=H-2-(v[i]-lo)/(hi-lo)*(H-5);
      if(i===0) x.moveTo(px,py); else x.lineTo(px,py); }
    if(fill){ x.lineTo(W,H); x.lineTo(0,H); x.closePath(); x.fillStyle=fill; x.fill(); }
    else { x.strokeStyle=cap; x.lineWidth=wid; x.lineJoin='round'; x.stroke(); } }
  series(function(c){ return c.length>=15?c[9]:null; },'rgba(207,230,255,.34)',1,null);   /* לחץ, מאחור */
  series(function(c){ return c[1]; },null,0,'rgba(231,241,248,.13)');            /* רוח: שטח */
  series(function(c){ return c[1]; },'rgba(244,249,252,.90)',1.1,null);          /* רוח: קו */
  series(function(c){ return c[4]; },'rgba(143,227,222,.95)',1.25,null);         /* גל */
  /* הסמן: איפה השעון של הדף עומד */
  var tn=tsLive(); px=clamp((tn-TS_T0)/span*W,0,W);
  x.fillStyle=tsScrub?'#8fe3de':'rgba(255,255,255,.92)'; x.fillRect(px-1,0,2,H);
  x.beginPath(); x.arc(px,H-2.5,2.4,0,6.283); x.fill();
  /* עכשיו האמיתי, כשמעיינים בעבר או בעתיד */
  if(tsScrub){ var pr=clamp((Date.now()-TS_T0)/span*W,0,W);
    x.fillStyle='rgba(255,255,255,.34)'; x.fillRect(pr-0.5,0,1,H); } }
function tsLabel(t){ var d=new Date(t+FIX.lon/15*3600000);
  return pad(d.getUTCDate())+'.'+pad(d.getUTCMonth()+1)+'  '+pad(d.getUTCHours())+':'+pad(d.getUTCMinutes()); }
function tsSet(off,fromUser){
  if(!LIVE||!EXO.setClock) return;
  EXO.setClock(off);
  vigTick();                 /* גרירה אל שעות היום מבהירה את הים — ההצללה חייבת לעקוב מיד */
  tsScrub=(off!==0);
  TS.box.classList.toggle('scrub',tsScrub);
  if(TS.now) TS.now.hidden=!tsScrub;
  if(TS.read) TS.read.textContent=tsScrub?tsLabel(Date.now()+off):'';
  if(!fromUser) TS.rng.value=tsValOf(tsLive());
  tsDraw(); }
function tsInit(){
  if(!tsReady()){ if(TS.box) TS.box.hidden=true; return; }
  tsSpan();
  if(!LIVE||!EXO.setClock){ TS.rng.disabled=true; TS.rng.tabIndex=-1; }
  TS.rng.value=tsValOf(tsLive());
  TS.rng.addEventListener('input',function(){ tsSet(tsTimeOf(+TS.rng.value)-Date.now(),true); });
  TS.rng.addEventListener('dblclick',function(){ tsSet(0); });
  if(TS.now) TS.now.addEventListener('click',function(){ tsSet(0); TS.rng.focus(); });
  tsDraw();
  /* בזמן אמת הסמן זוחל לבד; פעם בדקה די והותר */
  setInterval(function(){ if(!tsScrub&&!document.hidden){ TS.rng.value=tsValOf(tsLive()); tsDraw(); } },60000);
  window.addEventListener('resize',function(){ clearTimeout(tsPaint); tsPaint=setTimeout(function(){ tsSun=null; tsDraw(); },160); });
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(tsDraw); }

/* ================= הפעלה ================= */
function staticState(){ var now=Date.now(), best=null, bd=1e18, i; if(typeof COND!=='undefined') for(i=0;i<COND.length;i++){ var t=Date.parse(COND[i][0]+'Z'), dd=Math.abs(t-now); if(dd<bd){ bd=dd; best=COND[i]; } }
  var c=best?{wind:best[1],gust:best[2],windDir:best[3],waveH:best[4],waveT:best[5],waveDir:best[6],cur:best[7],curDir:best[8],
    pres:best.length>=15?best[9]:null,presTrend:null,airT:best.length>=15?best[10]:null,seaT:best.length>=15?best[11]:null,cloud:best.length>=15?best[12]:null,visKm:best.length>=15?best[13]:null,precip:best.length>=15?best[14]:null}:null;
  var loc=new Date(now+FIX.lon/15*3600000); return {now:now,cond:c,localHM:pad(loc.getUTCHours())+':'+pad(loc.getUTCMinutes()),gateBrg:gateBearing()}; }
measure(); frameScene(); drawMini();
if(LIVE){ EXO.on(function(s){ renderHud(s); drawMini(); if(s.qualityAuto) paintLite(true); }); }
else { renderHud(staticState()); setInterval(function(){ renderHud(staticState()); },30000); }
window.addEventListener('resize',function(){ measure(); frameScene(); SZ={}; if(LIVE&&EXO.state) renderHud(EXO.state); measureTop(); });
tsInit(); setTimeout(measureTop,300); setTimeout(measureTop,2500);
vigTick(); setInterval(vigTick,60000); if(window.EXO) EXO.vigTick=vigTick;   /* נחשף לבדיקות: audit_contrast.py מזיז את השעון ישירות */
/* קטלוג הכוכבים: רק אחרי שהסצנה כבר רצה. המנוע מזהה אותו לבד בפריים הבא; בלעדיו נשארים כוכבי הרעש */
if(LIVE) idle(function(){ loadScript('assets/v2n/stars.js').then(function(){ if(EXO.kick) EXO.kick(); }).catch(function(){}); },2600);
idle(function(){ loadScript('assets/v2n/coast.js').then(function(){ NEAR=null; drawMini(); }).catch(function(){}); },1800);
if(LIVE&&!store('exo.hint.v2')){ setTimeout(function(){ toast('גרירה מסובבת לכל כיוון, גם אל מתחת למים. צביטה או גלגלת: פנימה עד הסיפון, החוצה עד הגלובוס',7000); store('exo.hint.v2','1'); },1600); }
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(function(){ SZ={}; measureTop(); });
})();
