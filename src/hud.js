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
/* הסירה במרכז השטח הפנוי, לא במרכז המסך. oy הוא היסט במרחב הגזירה (NDC, למעלה חיובי), ועד כה
   הוא היה קבוע — 0.06 בטלפון, 0 במחשב — בלי קשר לכמה מקום תופסים הנתונים למעלה ומספרי המרוץ
   למטה. בטלפון לרוחב, 390 פיקסל גובה, השורות והרצועה תופסות 27% מלמעלה, והתורן והמפרשים ישבו
   מאחוריהן. עכשיו: ההיסט העיצובי הקודם, ועוד המרחק בין מרכז המסך למרכז הרצועה שבין --top ל---bot. */
function frameOffset(){ if(!LIVE||!EXO.view) return; var h=stage.clientHeight||window.innerHeight, w=stage.clientWidth||window.innerWidth, portrait=w/h<0.8;
  var cs=getComputedStyle(document.documentElement), top=parseFloat(cs.getPropertyValue('--topf'))||parseFloat(cs.getPropertyValue('--top'))||70, bot=parseFloat(cs.getPropertyValue('--bot'))||44;
  var free=-(top-bot)/h;
  EXO.view.oy=(h<=520?0.06:portrait?0.06:0.0)+Math.max(-0.26,Math.min(0.02,free)); }
function frameScene(){ if(!LIVE) return; var w=stage.clientWidth, h=stage.clientHeight, portrait=w/h<0.8;
  EXO.view.ox=0; frameOffset(); EXO.view.ty=portrait?5.2:4.4; EXO.view.r=portrait?44:33;
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
  /* 22.9: לפי התאריך ב-UTC, כמו בדוחות הרשמיים (יום 14 = 20.9) ובבוט. קודם התחלף ב-12:30, שעת הזינוק */
  var dayN=(typeof RACE_START!=='undefined')?Math.floor(s.now/86400000)-Math.floor(RACE_START/86400):FIX.dayN;
  put('hDay','יום '+dayN);
  put('hDate',pad(d.getUTCDate())+'.'+pad(d.getUTCMonth()+1)+'.'+d.getUTCFullYear());
  /* 22.9: המיקום עוקב אחרי השעון. בעבר — מהארכיון (אינטרפולציה בין שעות), ולכן הוא צבוע כמו שאר הערכים שנגררו */
  var ps=(LIVE&&EXO.pose)?EXO.pose:FIX;
  put('hPos',dmm(ps.lat,2,'N','S')+'  '+dmm(ps.lon,3,'E','W'));
  /* בעבר המיקום בא מהארכיון ולא מנקודת הציון, ולכן הוא וגם המרחק ליעד נצבעים כמו שאר הערכים שנגררו */
  var arch=ps.src==='archive'; $('hPos').classList.toggle('pa',arch); if(LB.beacon) LB.beacon.classList.toggle('pa',arch); if(LB.gate) LB.gate.classList.toggle('pa',arch);
  /* גיל נקודת הציון נמדד מההווה האמיתי ולא מהשעון המוצג: גרירה של יום קדימה לא מיישנת את המעקב */
  var fx=new Date(FIX.at*1000), age=(Date.now()/1000-FIX.at)/3600;
  var ageTxt=age<1?'לפני פחות משעה':age<24?'לפני '+heb(age,'שעה','שעתיים','שע׳'):'לפני '+heb(age/24,'יום','יומיים','ימים');
  var hf=$('hFix'); hf.textContent='נ״צ '+pad(fx.getUTCHours())+':'+pad(fx.getUTCMinutes())+' UTC · '+ageTxt; hf.className=age>12?'stale':'dim';
  /* מספרי המרוץ הם תמונת המצב של נקודת הציון. מעל 12 שעות זה כבר לא "עכשיו", והשורה אומרת זאת. */
  var stale=age>12, aw=$('vAgeW');
  if(aw){ aw.hidden=!stale; if(stale){ put('vAge',ageTxt); aw.className='stale'; } }
  /* 23.9 (l19): במסך הראשון "עודכן" תמיד מוצג — מי שמגיע מקבוצה צריך לדעת מתי המספרים נכונים */
  put('vUpd',ageTxt); var uw=$('vUpdW'); if(uw) uw.classList.toggle('stale',stale);
  put('vDay',dayN);
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
  put('vWhere',whereWords()); capNow(s,c,dayN,ps,ageTxt,stale);
  put('vRank',FIX.rank); put('vOf','מתוך '+FLEET.length); put('vSog',FIX.sog.toFixed(1)+(compact?'kn ':' kn · ')+deg3(FIX.cog));
  put('vGap',gap<=0?'0':thou(gap)); put('vDtf',thou(FIX.dtf));
  if(c){ labelTexts(s); put('lyWind',Math.round(c.wind)); put('lyWave',c.waveH.toFixed(1)); put('lyCur',c.cur.toFixed(1)); paintLayers(); }
}

/* 23.9 (l23): "איפה במילים" לשורה הדקה. רק ממקור אמיתי: החוף הקרוב שהבוט מחשב מקו החוף של המעקב
   (FIX.nearLand, FIX.nearLandName), ואם הוא רחוק מ-200 מייל או בלי שם — שם האוקיינוס, לפי הגבולות
   המקובלים (IHO: קו המשווה בין הצפוני לדרומי; 20° מזרח, מרידיאן כף אגולהס, בין האטלנטי להודי; 146.8° מזרח,
   טסמניה, בין ההודי לשקט; 67.3° מערב, כף הורן, בין השקט לאטלנטי; מדרום ל-60° — האוקיינוס הדרומי). */
function oceanHe(lat,lon){ lon=((lon+540)%360)-180; var N=lat>=0;
  if(lat<=-60) return 'האוקיינוס הדרומי';
  if((lon>=-67.3&&lon<20)||(N&&lon>=-98&&lon<-67.3&&lat>8)) return N?'האוקיינוס האטלנטי הצפוני':'האוקיינוס האטלנטי הדרומי';
  if(lon>=20&&lon<146.8&&lat<30) return 'האוקיינוס ההודי';
  return N?'האוקיינוס השקט הצפוני':'האוקיינוס השקט הדרומי'; }
function whereWords(){ var nm=FIX.nearLandName;
  if(FIX.nearLand!=null&&FIX.nearLand<=200&&nm&&nm!=='החוף הקרוב') return 'מול '+nm;
  return oceanHe(FIX.lat,FIX.lon); }

/* l23 מנה 2: המלל של "איפה הוא עכשיו" — מה שהיה בפס הנתונים: נ״צ ומתי, רוח וחוזקה, מהירות וכיוון.
   הערכים שנגזרים מהשעון המוצג (.tv) נצבעים כשגוררים בזמן, כמו בפס */
function capNow(s,c,dayN,ps,ageTxt,stale){ var e=$('capNow'); if(!e) return;
  var fx=new Date(FIX.at*1000), h='<b class="n tv">'+dmm(ps.lat,2,'N','S')+' '+dmm(ps.lon,3,'E','W')+'</b> · <span'+(stale?' style="color:#ffb3a8"':'')+'>נ״צ <span class="n">'+pad(fx.getUTCHours())+':'+pad(fx.getUTCMinutes())+' UTC</span>, '+ageTxt+'</span><br>';
  if(c&&!c.missing) h+='רוח <b class="n tv">'+Math.round(c.wind)+' kn</b> מכיוון <b class="n tv">'+deg3(c.windDir)+'</b> (בופור '+beaufort(c.wind)+') · גל <b class="n tv">'+c.waveH.toFixed(1)+' m</b><br>';
  h+='מהירות <b class="n">'+FIX.sog.toFixed(1)+' kn</b> לכיוון <b class="n">'+deg3(FIX.cog)+'</b>';
  if(e._h!==h){ e._h=h; e.innerHTML=h; }
  var r=$('capRace'); if(r){ var t='מקום <b class="n">'+FIX.rank+'</b> מתוך '+FLEET.length+' · הקרובה: '+FIX.nearBoatName+', <b class="n">'+thou(FIX.nearBoat)+'</b> מייל'; if(r._h!==t){ r._h=t; r.innerHTML=t; } } }

/* ================= תוויות על הסצנה: מעלות הטבעת, רוח, גל, זרם, היעד ================= */
var LB={}, labelsHost=$('labels'), SZ={}, safeTop=0;
/* --top: התחתית של מה שבאמת פתוח למעלה (הפס, או רק הנקודה). ההצללה והתוויות נשענות עליו.
   --topf: תמיד לפי הנקודה — המסגור של הסירה לא קופץ כשפותחים ומקפלים את הפס; הפס צף מעל. */
var hudBand=$('hudBand'), hudDot=$('hudDot');
var leadEl=$('lead');
function measureTop(){ var kE=$('key'), k=kE?kE.getBoundingClientRect().bottom-8:(hudDot?hudDot.getBoundingClientRect().bottom-8:0), d=k, open=!document.body.classList.contains('hfold');
  /* 23.9: הכותרת בראש המסך. כשהיא מוצגת, ההצללה נשענת על התחתית שלה.
     l23: המסגור של הסירה (--topf) נשען רק על העיגול — כשהמשפט נשאב, הסירה לא קופצת */
  if(leadEl&&getComputedStyle(leadEl).visibility!=='hidden'&&!leadEl.classList.contains('suck')&&!document.body.classList.contains('g-open')) d=Math.max(d,leadEl.getBoundingClientRect().bottom-10);
  var a=open&&hudBand&&document.body.classList.contains('more')?hudBand.getBoundingClientRect().bottom-2:0;
  safeTop=Math.max(a,d)+6;
  var st=document.documentElement.style; st.setProperty('--top',Math.round(safeTop)+'px'); st.setProperty('--topf',Math.round(Math.max(k,0)+6)+'px'); measureBot(); }
var hudTm=0, hudPinned=false;
function hudOpen(on,keep){ var b=document.body; clearTimeout(hudTm);
  if(keep) hudPinned=true;
  if(b.classList.contains('hfold')===!on) return;
  b.classList.toggle('hfold',!on); if(hudDot) hudDot.setAttribute('aria-expanded',on?'true':'false');
  /* 22.9: בקיפול, התוויות עולות רק אחרי שהפס סיים לדעוך (0.28 שנ׳). קודם הן עלו מיד ועברו דרכו — נתפס בצילום בטלפון */
  if(on) measureTop(); setTimeout(measureTop,on?320:300); }
window.__exoHudOpen=hudOpen;
if(hudDot) hudDot.addEventListener('click',function(){ hudPinned=true; hudOpen(document.body.classList.contains('hfold')); });
if(hudBand) hudBand.addEventListener('click',function(){ hudPinned=true; hudOpen(false); });
/* בכניסה הפס פתוח כמה שניות ומתקפל לנקודה — כך רואים לאן הוא הולך. נגיעה בו לפני כן משאירה אותו */
/* 23.9: בלי WebGL אין הדמיה שהפס מסתיר, והנתונים הם כל מה שיש בדף — אז הוא לא מתקפל */
/* 23.9 (l19): המסך הראשון — כותרת, הדמיה, ארבעה מספרים. "עוד" (body.more) מחזיר את כל המכשירים כמו שהיו:
   הפס פתוח כמה שניות ומתקפל לנקודה (בלי WebGL הוא נשאר פתוח). הבחירה נשמרת בטלפון (localStorage) */
var moreBtn=$('moreBtn');
function setMore(on,user){ var b=document.body; on=!!on;
  b.classList.toggle('more',on);
  if(moreBtn){ moreBtn.textContent=on?'פחות':'עוד'; moreBtn.setAttribute('aria-expanded',on?'true':'false');
    moreBtn.setAttribute('aria-label',on?'פחות: חזרה למסך הראשון':'עוד: רוח, גל, זרם, שעונים, מפה, רצועת הזמן והשכבות'); }
  if(user) store('exo.more',on?'1':'0');
  if(on){ if(user){ hudOpen(true,true); } else { hudOpen(true); hudTm=setTimeout(function(){ if(LIVE&&!hudPinned&&!tsScrub) hudOpen(false); },5200); } }
  else { if(tsScrub) try{ tsSet(0); }catch(e){} hudPinned=false; hudOpen(false); }
  measureTop(); setTimeout(function(){ measureTop(); frameScene(); },60); }
if(moreBtn) moreBtn.addEventListener('click',function(){ setMore(!document.body.classList.contains('more'),true); });
setMore(false,false);      /* l23: אין יותר "עוד"; מי שבחר בו פעם חוזר למסך הנקי */
/* ===== 23.9 (l23) משפט הפתיחה נשאב לתוך העיגול =====
   ארבע שניות, ואז בערך שנייה של התכווצות אל נקודת העיגול — כך רואים לאן הוא הלך. בכל ביקור.
   נגיעה, מקש או גלגלת לפני כן — נשאב מיד. בלי WebGL, במצב קל וב-reduced motion: בלי תנועה, המשפט פשוט מתחלף בעיגול. */
var keyEl=$('key'), keyed=false;
function keyBorn(anim){ var b=document.body; keyed=true; b.classList.add('keyed');
  if(anim){ b.classList.add('key-born'); setTimeout(function(){ b.classList.remove('key-born'); },2400); }
  measureTop(); }
function suck(){ if(!leadEl||keyed||suck.on) return; suck.on=true; clearTimeout(suck.t);
  var still=!LIVE||EXO.quality==='lite'||(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  if(still||!keyEl){ leadEl.classList.add('suck','gone'); keyBorn(false); return; }
  var kr=keyEl.getBoundingClientRect(), lr=leadEl.getBoundingClientRect();
  leadEl.style.transformOrigin=Math.round(kr.left+kr.width/2-lr.left)+'px '+Math.round(kr.top+kr.height/2-lr.top)+'px';
  leadEl.classList.add('suck'); measureTop();
  setTimeout(function(){ leadEl.classList.add('gone'); keyBorn(true); },950); }
window.__exoSuck=suck;
suck.t=setTimeout(suck,4000);
var keyArm=false; window.addEventListener('pointerdown',function(){ keyArm=keyed; },{capture:true,passive:true});
['pointerdown','keydown','wheel'].forEach(function(ev){
  window.addEventListener(ev,function h(e){ if(ev==='keydown'&&(e.key==='Shift'||e.key==='Alt'||e.key==='Control'||e.key==='Meta')) return;
    suck(); window.removeEventListener(ev,h,true); },{capture:true,passive:true}); });

/* ===== l23 מנה 2: התפריט העליון — שש קטגוריות, כל אחת שכבה ===== */
var lyrEl=$('lyr'), lyrIsOpen=false, LY_ON={};
function lyrOpen(on){ lyrIsOpen=!!on; if(!lyrEl) return; lyrEl.hidden=!on; document.body.classList.toggle('lyr-open',lyrIsOpen);
  if(keyEl) keyEl.setAttribute('aria-expanded',on?'true':'false'); if(!on&&menuOpen) setMenu(false);
  if(on){ var f=lyrEl.querySelector('button'); if(f&&document.activeElement===keyEl) try{ f.focus({preventScroll:true}); }catch(e){} } }
var ringAnim=0, ringHold=0;
function ringTo(v){ if(!LIVE) return; cancelAnimationFrame(ringAnim); var a=LAB.ringVis||0, t0=performance.now();
  (function st(){ var k=Math.min(1,(performance.now()-t0)/450); LAB.ringVis=a+(v-a)*(k*k*(3-2*k)); if(EXO.kick) EXO.kick(); if(k<1) ringAnim=requestAnimationFrame(st); })(); }
function setLy(n,on){ on=!!on; LY_ON[n]=on; document.body.classList.toggle('ly-'+n,on);
  var b=lyrEl&&lyrEl.querySelector('[data-l="'+n+'"]'); if(b) b.setAttribute('aria-pressed',on?'true':'false');
  if(n==='now'&&LIVE){ ringTo(on?1:0); EXO.setLayer('cur',on); clearInterval(ringHold);
    /* הטבעת בהירה כל עוד השכבה דולקת (במנוחה היא כמעט שקופה, ונדלקת רק בגרירה) */
    if(on){ LAB.ringHotT=performance.now(); ringHold=setInterval(function(){ LAB.ringHotT=performance.now(); },500); } }
  if(n==='race') fleetHz(on);
  if(n==='log'&&!on&&tsScrub) try{ tsSet(0); }catch(e){}
  if(n==='log'){ setTimeout(function(){ measureBot(); tsDraw(); },30); }
  SZ={}; measureTop(); }
if(lyrEl) lyrEl.addEventListener('click',function(ev){ var t=ev.target.closest?ev.target.closest('button'):null; if(!t) return;
  if(t.id==='bAbout'){ setMenu(!menuOpen); return; }
  var n=t.getAttribute('data-l'); if(n) setLy(n,!LY_ON[n]); });
/* בלי WebGL אין הדמיה לסמן עליה, והמלל הוא כל מה שיש: "איפה הוא עכשיו" דולקת מההתחלה */
if(!LIVE) setTimeout(function(){ setLy('now',true); },0);

/* "המירוץ": שאר הסירות כסימנים באופק, בכיוון האמיתי שלהן מאקסודוס (מעגל גדול, מנקודות הציון שב-FLEET).
   רק הקרובות — עד שש, בתוך 600 מייל — כדי שהאופק לא יתמלא. בלי "פער מהמוביל" */
var FB=[];
function gcNm(a1,o1,a2,o2){ var p1=a1*D2R,p2=a2*D2R,dl=(o2-o1)*D2R; return Math.acos(clamp(Math.sin(p1)*Math.sin(p2)+Math.cos(p1)*Math.cos(p2)*Math.cos(dl),-1,1))*R2D*60; }
function gcBrg(a1,o1,a2,o2){ var p1=a1*D2R,p2=a2*D2R,dl=(o2-o1)*D2R; return (Math.atan2(Math.sin(dl)*Math.cos(p2),Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl))*R2D+360)%360; }
function fleetHz(on){ FB.forEach(function(f){ if(f.el.parentNode) f.el.parentNode.removeChild(f.el); }); FB=[];
  if(!on||typeof FLEET==='undefined'){ if(LIVE) LAB.hz=null; return; }
  var L=[]; FLEET.forEach(function(b){ if(b[1]===4||b[7]===1||b[2]==null) return; var d=gcNm(FIX.lat,FIX.lon,b[2],b[3]); if(d<=600) L.push({n:b[4],d:d,brg:gcBrg(FIX.lat,FIX.lon,b[2],b[3])}); });
  L.sort(function(a,b){ return a.d-b.d; }); L=L.slice(0,6);
  L.forEach(function(f){ var e=document.createElement('div'); e.className='lb fb'; e.innerHTML=String(f.n).replace(/</g,'&lt;')+' · <span class="n">'+thou(f.d)+'</span> מייל'; e.hidden=true; labelsHost.appendChild(e); f.el=e; FB.push(f); });
  if(LIVE) LAB.hz=FB.map(function(f){ return f.brg; }); }
function fleetPlace(A,f){ if(!FB.length) return; var H=A.hz, W=stage.clientWidth, Hh=stage.clientHeight, used=[];
  var m=(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--edge'))||14)+2;
  FB.forEach(function(b,i){ var e=b.el, p=H&&H[i]; if(f.under||!p){ if(!e.hidden) e.hidden=true; return; }
    if(e.hidden) e.hidden=false; var w=e.offsetWidth, h=e.offsetHeight, x, y, edge=0;
    if(!p[2]&&p[0]>=0&&p[0]<=W){ x=p[0]-w/2; y=Math.max(p[1],safeTop+h+26)-h; }
    else { edge=(p[0]<W/2)?-1:1; x=edge<0?m:W-w-m; y=p[2]?Hh*0.42:clamp(p[1],safeTop+34,Hh*0.55); }
    x=clamp(x,6,W-w-6);
    for(var k=0;k<used.length;k++){ var u=used[k]; if(Math.abs(u[0]-x)<(u[2]+w)/2+8&&Math.abs(u[1]-y)<h+3){ y=u[1]+h+4; k=-1; } }
    used.push([x,y,w]);
    if(e._edge!==edge){ e._edge=edge; e.classList.toggle('edge',!!edge); e.classList.toggle('el',edge<0); e.classList.toggle('er',edge>0); }
    e.style.transform='translate('+x.toFixed(1)+'px,'+y.toFixed(1)+'px)'; }); }

/* בלי WebGL אין הדמיה שהפס מסתיר: במצב "עוד" הוא לא מתקפל */
if(!LIVE&&document.body.classList.contains('more')){ clearTimeout(hudTm); hudOpen(true); }
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
  document.documentElement.style.setProperty('--bot',band+'px'); frameOffset(); }
var DEG12=['N','030','060','E','120','150','S','210','240','W','300','330'];
DEG12.map(function(tx,i){ return ['g'+i,tx,'deg'+(i===0?' north':(i%3===0?' cardinal':''))]; }).concat([
 ['wind','','dat wind'],['wave','','dat wave'],['cur','','dat cur'],['gate','','dat gate'],['beacon','','beacon']])
.forEach(function(a){ var e=document.createElement('div'); e.className='lb '+a[2]; e.textContent=a[1]; e.hidden=true; labelsHost.appendChild(e); LB[a[0]]=e; });
function toGateNow(){ var ps=(LIVE&&EXO.pose)?EXO.pose:null; if(!ps||ps.src==='fix') return FIX.toGate;
  var p1=ps.lat*D2R, p2=GATE[0]*D2R, dl=(GATE[1]-ps.lon)*D2R;
  return Math.round(Math.acos(Math.max(-1,Math.min(1,Math.sin(p1)*Math.sin(p2)+Math.cos(p1)*Math.cos(p2)*Math.cos(dl))))*R2D*60); }
function labelTexts(s){ var c=s.cond, tg=toGateNow();
  LB.wind.innerHTML='רוח <span class="n">'+Math.round(c.wind)+' kn</span>';
  LB.wave.innerHTML='גל <span class="n">'+c.waveH.toFixed(1)+' m · '+Math.round(c.waveT)+' s</span>';
  LB.cur.innerHTML='זרם <span class="n">'+c.cur.toFixed(1)+' kn</span>';
  LB.gate.innerHTML=compact?(FIX.gate+' <span class="n">'+thou(tg)+'</span>'):(FIX.gate+' <span class="n">'+deg3(s.gateBrg)+' · '+thou(tg)+'</span> מייל');
  LB.beacon.innerHTML=FIX.gate+' · <span class="n">'+thou(tg)+'</span> מייל · <span class="n">'+deg3(s.gateBrg)+'</span>';
}
function place(name,x,y,op){ var e=LB[name]; if(x===null){ if(!e.hidden) e.hidden=true; return; }
  if(e.hidden) e.hidden=false;
  var z=SZ[name]; if(!z||z.t!==e.textContent){ z=SZ[name]={w:e.offsetWidth,h:e.offsetHeight,t:e.textContent}; }
  var bx=x-z.w/2, by=(name==='beacon')?(y-z.h):(y-z.h/2);
  if(name==='beacon'){ var flip=(by<safeTop); if(flip!==!!e._flip){ e._flip=flip; e.classList.toggle('below',flip); } if(flip) by=y; bx=clamp(bx,6,stage.clientWidth-z.w-6); }
  e.style.transform='translate('+bx.toFixed(1)+'px,'+by.toFixed(1)+'px)'; e.style.opacity=op; }
/* המשואה לא נעלמת לעולם (כל עוד לא מתחת למים): כשכיוון היעד מחוץ למסך היא נצמדת לשפה הקרובה עם חץ,
   וכשהאופק מעל הקצה העליון (טלפון לאורך, מבט מלמעלה) היא יורדת אל מתחת לשורות הנתונים. */
function beaconPlace(A,f){ var e=LB.beacon, ex=A.beaconEx;
  if(f.under||(!A.beacon&&!ex)){ place('beacon',null); return; }
  var W=stage.clientWidth, H=stage.clientHeight, edge=0, x, y;
  if(A.beacon&&A.beacon[0]>=0&&A.beacon[0]<=W){ x=A.beacon[0]; y=A.beacon[1]; }
  else if(ex&&!ex[2]&&ex[0]>=0&&ex[0]<=W){ x=ex[0]; y=Math.max(ex[1],safeTop); }
  else if(ex){ edge=(ex[0]<W/2)?-1:1; y=ex[2]?H*0.42:clamp(ex[1],safeTop+34,H*0.55); x=edge<0?0:W; }
  else { place('beacon',null); return; }
  if(e._edge!==edge){ e._edge=edge; e.classList.toggle('edge',!!edge); e.classList.toggle('el',edge<0); e.classList.toggle('er',edge>0); SZ.beacon=null; }
  if(edge){ var z=SZ.beacon; if(!z||z.t!==e.textContent){ z=SZ.beacon={w:e.offsetWidth,h:e.offsetHeight,t:e.textContent}; }
    var m=(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--edge'))||14)+2;
    var bx=edge<0?m:W-z.w-m; if(e.hidden) e.hidden=false;
    if(e._flip){ e._flip=false; e.classList.remove('below'); }
    e.style.transform='translate('+bx.toFixed(1)+'px,'+(y-z.h/2).toFixed(1)+'px)'; e.style.opacity=0.9; return; }
  place('beacon',x,y,1); }
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
    dat.forEach(function(n){ var q=A[n], on=q&&((n==='gate')?!(A.beacon||A.beaconEx):EXO.layers[n]); if(on) list.push([n,q[0],q[1]]); else place(n,null); });
    declutter(list).forEach(function(it){ place(it[0],it[1],it[2],idleD); var z=SZ[it[0]]||{w:110,h:16}; rects.push([it[1]-z.w/2-18,it[2]-z.h/2-9,it[1]+z.w/2+18,it[2]+z.h/2+9]); });
    [0,3,6,9,1,2,4,5,7,8,10,11].forEach(function(i){ var p=A['g'+i]; tryGrad(i,p?p[0]:null,p?p[1]:null,(i===0?0.16+0.84*hot:(i%3===0?0.06:0.03)+0.94*hot)*rk,(i%3===0?22:34)); });
  } else { for(var gi=0;gi<12;gi++) place('g'+gi,null); dat.forEach(function(n){ place(n,null); }); }
  beaconPlace(A,f); fleetPlace(A,f);
  audioFrame(f);
  globeX(f); gxT=!!f.touching; gxX=f.gX||0;
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
var AU=null, auOn=false, auT=0, prevPitch=0, slam=0, auWanted=(store('exo.snd23')==='1'), auTried=false;
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
  if(!quiet) store('exo.snd23',auOn?'1':'0'); auWanted=auOn; paintSound(); return auOn; }
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
function setMenu(on){ menuOpen=!!on; menu.hidden=!on; document.body.classList.toggle('about-open',menuOpen); menuBtn.setAttribute('aria-expanded',on?'true':'false'); var ab=$('bAbout'); if(ab) ab.setAttribute('aria-expanded',on?'true':'false'); if(menuBtn2) menuBtn2.setAttribute('aria-expanded',on?'true':'false'); if(on&&kbNav){ var f=menu.querySelector('button,a'); if(f) try{ f.focus({preventScroll:true}); }catch(e){} } }
/* הפוקוס עובר לחלונית רק למי שמנווט במקלדת; במגע הוא צייר מסגרת לבנה סביב ה-× */
var kbNav=false; window.addEventListener('keydown',function(){ kbNav=true; },true); window.addEventListener('pointerdown',function(){ kbNav=false; },true);
menuBtn.addEventListener('click',function(){ setMenu(!menuOpen); });
/* 23.9 (l19): במסך הראשון התפריט נפתח מהכפתור שבשורת המספרים */
var menuBtn2=$('menuBtn2');
if(menuBtn2) menuBtn2.addEventListener('click',function(){ setMenu(!menuOpen); });
/* l23: העיגול פותח את התפריט — רק אחרי שהמשפט כבר נשאב אליו (נגיעה לפני כן רק שואבת) */
if(keyEl){ keyEl.addEventListener('click',function(ev){ if(!keyed||(ev.detail>0&&!keyArm)) return; keyArm=false; lyrOpen(!lyrIsOpen); }); }
var sndB=$('sndBtn'); if(sndB) sndB.addEventListener('click',function(){ auTried=true; audioSet(!auOn); });
$('menuX').addEventListener('click',function(){ setMenu(false); ($('bAbout')||keyEl||menuBtn).focus(); });
document.addEventListener('pointerdown',function(ev){ if(menuOpen&&!menu.contains(ev.target)&&ev.target!==menuBtn&&!menuBtn.contains(ev.target)&&!(keyEl&&keyEl.contains(ev.target))&&!($('bAbout')&&$('bAbout').contains(ev.target))&&!(menuBtn2&&menuBtn2.contains(ev.target))) setMenu(false); },true);
if(typeof STORY!=='undefined'&&STORY){ put('jLead',STORY);
  /* 23.9 (l19): משפט הסיפור חוזר למסך הראשון, מתחת לכותרת */
  put('capStoryT',STORY);
  var ls=$('leadStory'); if(ls){ ls.textContent=STORY;      /* l23: המשפט עובר ל"הסיפור"; במסך הראשון רק משפט הפתיחה */
    var lsTog=function(){ var o=ls.classList.toggle('open'); ls.setAttribute('aria-expanded',o?'true':'false'); measureTop(); };
    ls.addEventListener('click',lsTog);
    ls.addEventListener('keydown',function(ev){ if(ev.key==='Enter'||ev.key===' '){ ev.preventDefault(); lsTog(); } }); } }

menu.addEventListener('click',function(ev){ var t=ev.target.closest?ev.target.closest('button,a'):ev.target; if(!t) return;
  if(t.id==='bSound'){ audioSet(!auOn); }
  else if(t.id==='bLite'&&LIVE){ var n=EXO.quality==='lite'?'full':'lite'; EXO.setQuality(n); store('exo.quality',n); paintLite(false); }
  else if(t.id==='bFull'){ goFull(); setMenu(false); }
  else if(t.id==='bInstall'&&installEv){ installEv.prompt(); installEv=null; t.hidden=true; }
});
function paintLite(auto){ var b=$('bLite'); if(!b||!LIVE) return; var lite=EXO.quality==='lite'; b.setAttribute('aria-pressed',lite?'true':'false');
  if(auto&&lite) toast('עברנו לבד למצב קל: המכשיר הזה התקשה עם ההדמיה המלאה. אפשר להחזיר מהתפריט',6500); }
if(LIVE){ var q=store('exo.quality'); if(q==='lite'||q==='full') EXO.setQuality(q); paintLite(false);
  /* l23: הטבעת, הזרמים ותוויות המים שייכים לשכבה "איפה הוא עכשיו" ומוסתרים כברירת מחדל. הרוח והגלים שבהדמיה נשארים */
  LAB.ringVis=0; EXO.setLayer('cur',false); }
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
/* שכבת הגלובוס נשארת בעמוד גם כשהיא סגורה — MapLibre חייב אותה כדי להיבנות ברקע. עד כאן זה
   אמר שהכפתורים שבתוכה, ובראשם "Toggle attribution" של MapLibre, נשארו בסדר ה-Tab: ההקשה
   הראשונה של משתמש מקלדת נחתה על כפתור בלתי נראה בתוך שכבה מוסתרת. inert מוציא את כל תוכנה
   מהפוקוס ומעץ הנגישות בלי לפרק אותה. */
try{ G.inert=true; }catch(e){}
function globeBuild(){ return gBuild||(gBuild=Promise.all([loadCss('assets/vendor/maplibre-gl.css'),loadScript('assets/vendor/maplibre-gl.js'),
    (typeof LAND50!=='undefined')?Promise.resolve():loadScript('assets/geo/land50.js'),
    loadScript('assets/v2/names.js').catch(function(){}),
    loadScript('assets/fleet-log.js').catch(function(){})]).then(function(){ return loadScript('assets/v2/globe.js'); })
    .catch(function(){ gFailed=true; if(gOpen){ closeGlobe(false); toast('הגלובוס לא נטען. רענון בדרך כלל פותר את זה'); } })); }
function openGlobe(how){
  if(gFailed){ toast('הגלובוס לא נטען. רענון בדרך כלל פותר את זה'); return; }
  if(jOpen) closeJourney(false);
  if(!gOpen){ gOpen=true; if(LIVE) EXO.globeOwns=true; tsVeil(1); G.setAttribute('aria-hidden','false'); G.inert=false; document.body.classList.add('g-open'); setMenu(false); if(LIVE) EXO.pause(true); measureTop();
    try{ history.pushState({exoGlobe:1},''); gPushed=true; }catch(e){ gPushed=false; } }
  if(!window.__exoGlobeLoaded) toast('הגלובוס נטען',2500);
  globeBuild().then(function(){ if(gOpen&&window.__exoGlobeEnter) window.__exoGlobeEnter(how||'boat'); });
  try{ $('gBack').focus({preventScroll:true}); }catch(e){} }
function closeGlobe(fromPop,stay){ if(!gOpen) return; gOpen=false; if(LIVE) EXO.globeOwns=false; tsVeil(0); G.setAttribute('aria-hidden','true'); G.inert=true; document.body.classList.remove('g-open');
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
var gxT=false, gxX=0;
function globeX(f){ var X=f.gX||0; tsVeil(gOpen?1:X);
  if(!gOpen){
    if(X>0&&!gxOn&&window.__exoGlobeArm){ gxOn=true; document.body.classList.add('g-x'); window.__exoGlobeArm(f.camBearing);
      /* 22.9: הסירה הפכה לסמל לבן — מכאן ההמשך אוטומטי ורך, עד הפריים הראשון שבו רואים עוד משהו */
      if(!f.touching&&window.__exoAutoOut&&!(window.__exoAutoRunning&&window.__exoAutoRunning())) window.__exoAutoOut('region'); }
    else if(gxOn&&gxT&&!f.touching&&X>gxX&&X<0.999&&window.__exoAutoOut&&!(window.__exoAutoRunning&&window.__exoAutoRunning())) window.__exoAutoOut('region');      /* האצבעות עזבו באמצע ההצלבה, בדרך החוצה */
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
/* 22.9 (/next/): הגלובוס — MapLibre, קו החוף, השמות והיסטוריית הצי, כ-1.5MB, ואחריהם אריחי NASA — נטען רק כשמבקר
   מתחיל להתרחק: גלגלת או מקש מינוס (שמגיע כגלגלת), או שתי אצבעות על המסך. עד כאן הוא נטען ברקע לכל מבקר אחרי
   ארבע שניות, גם למי שלא התרחק מעולם. עד שהוא מוכן ההתרחקות נעצרת בגבול של ההדמיה (uCeil), וממשיכה לבד. */
(function(){ var done=false;
  function want(){ if(done) return; done=true; if(!LIVE||EXO.quality!=='lite') globeBuild(); off(); }
  function onWheel(e){ if(e.deltaY>0) want(); }
  function onTouch(e){ if(e.touches&&e.touches.length>=2) want(); }
  function off(){ window.removeEventListener('wheel',onWheel,true); window.removeEventListener('touchstart',onTouch,true); }
  window.addEventListener('wheel',onWheel,{capture:true,passive:true});
  window.addEventListener('touchstart',onTouch,{capture:true,passive:true});
})();

/* ================= "המסע והניתוח": הסיפור, הצי, קנה המידה, התחזית והסקסטנט — נפתחים מכפתור מפת המיקומים ================= */
var J=$('journey'), jOpen=false, jReady=null, jPushed=false;
function fleetTable(){ var host=$('fleetTbl'); if(!host||host.firstChild||typeof FLEET==='undefined') return; var lead=FLEET[0][5];
  var h='<table><thead><tr><th>מקום</th><th>סירה</th><th class="nu">עד קו הסיום, מייל</th><th class="nu">פער מהמוביל, מייל</th><th class="nu">24 שעות, מייל</th></tr></thead><tbody>';
  /* b[7]=1: הסירה כבר לא מתחרה (פרשה לפי המעקב). היא בסוף הרשימה, בלי מקום ובלי פער */
  FLEET.forEach(function(b){ var out=b[7]===1, gap=Math.round(b[5]-lead); h+='<tr'+(b[1]===4?' class="me"':out?' class="out"':'')+'><td>'+(out?'—':b[0])+'</td><td>'+String(b[4]).replace(/&/g,'&amp;').replace(/</g,'&lt;')+(b[1]===4?' · אקסודוס':'')+(out?' · פרשה':'')+'</td><td class="nu">'+thou(b[5])+'</td><td class="nu">'+(out||gap<=0?'—':thou(gap))+'</td><td class="nu">'+(b[6]!=null?Math.round(b[6]):'—')+'</td></tr>'; });
  host.innerHTML=h+'</tbody></table>'; }
/* מי פתח את המסע: אחרי הסגירה הפוקוס חוזר אליו. עד כה הוא נפל אל body, ומשתמש מקלדת
   או קורא מסך התחיל שוב מראש הדף בכל פעם. */
var jOpener=null;
function openJourney(section){
  if(gOpen) closeGlobe(false);
  if(!jOpen){ jOpener=(document.activeElement&&document.activeElement!==document.body)?document.activeElement:null;
    jOpen=true; J.hidden=false; document.body.classList.add('j-open'); if(LIVE) EXO.pause(true);
    /* מה שמאחורי המסע יוצא ממסלול המקלדת: עד כאן Shift+Tab מ"חזרה" נחת על פקדים מוסתרים מאחורי השכבה */
    var st=$('stage'); if(st) st.inert=true;
    if(AU&&auOn) AU.master.gain.setTargetAtTime(0.05,AU.ac.currentTime,0.3);
    try{ history.pushState({exoJourney:1},''); jPushed=true; }catch(e){ jPushed=false; }
    fleetTable();
    if(!jReady) jReady=loadCss('assets/front.css').then(function(){ return loadCss('assets/v2/journey.css'); }).then(function(){ return loadScript('assets/v2/journey.js'); })
      .catch(function(){ toast('חלק מהדף לא נטען. רענון בדרך כלל פותר את זה'); }); }
  (jReady||Promise.resolve()).then(function(){ var t=section&&$(section), bar=J.querySelector('.j-bar'), bh=bar?bar.offsetHeight:0; J.scrollTop=0;
    if(t) J.scrollTop=Math.max(0,t.getBoundingClientRect().top-J.getBoundingClientRect().top+J.scrollTop-bh);
    try{ $('jBack').focus({preventScroll:true}); }catch(e){} });
}
function closeJourney(fromPop){ if(!jOpen) return; jOpen=false; J.hidden=true; document.body.classList.remove('j-open'); if(LIVE&&!gOpen) EXO.pause(false);
  var st=$('stage'); if(st) st.inert=false;
  if(AU&&auOn) AU.master.gain.setTargetAtTime(0.9,AU.ac.currentTime,0.3);
  if(!fromPop&&jPushed){ jPushed=false; popSkip++; try{ history.back(); }catch(e){ popSkip--; } }
  var back=jOpener||document.querySelector('.mini'); jOpener=null; if(back&&back.focus) try{ back.focus({preventScroll:true}); }catch(e){} }
window.addEventListener('popstate',function(){ if(popSkip>0){ popSkip--; return; } if(jOpen){ jPushed=false; closeJourney(true); } else if(gOpen){ gPushed=false; closeGlobe(true); } });
$('jBack').addEventListener('click',function(){ closeJourney(false); });
$('mini').addEventListener('click',function(){ openJourney(); });
if($('bJourney')) $('bJourney').addEventListener('click',function(){ setMenu(false); openJourney(); });
document.addEventListener('keydown',function(ev){ if(ev.key==='Escape'){ if(menuOpen){ setMenu(false); ($('bAbout')||keyEl||menuBtn).focus(); } else if(lyrIsOpen){ lyrOpen(false); keyEl.focus(); } else if(jOpen) closeJourney(false); else if(gOpen) closeGlobe(false); } });
/* זום במקלדת: + ו-−. עד כה הגלובוס היה נגיש רק בצביטה או בגלגלת — כלומר ממקלדת, או מקורא
   מסך, לא היה אליו שום מסלול (נבדק ב-audit_keys.py: Tab, "-", PageDown, End, והתפריט).
   במקום לוגיקת זום חדשה, המקש שולח אירוע גלגלת אל המשטח הפעיל: אותו מסלול בדיוק, כולל
   המאיץ, המסירה אל הגלובוס והחזרה ממנו. Ctrl/Cmd עם +/− הם זום הדפדפן ונשארים שלו. */
document.addEventListener('keydown',function(ev){
  if(ev.ctrlKey||ev.metaKey||ev.altKey||jOpen||menuOpen) return;
  var t=ev.target; if(t&&((t.tagName==='INPUT'&&t.type!=='range')||t.tagName==='TEXTAREA'||t.isContentEditable)) return;
  var k=ev.key, dir=(k==='-'||k==='_'||k==='Subtract')?1:(k==='+'||k==='='||k==='Add')?-1:0; if(!dir) return;
  var surf=gOpen?document.getElementById('globe'):document.getElementById('sea'); if(!surf) return;
  ev.preventDefault();
  var r=surf.getBoundingClientRect();
  surf.dispatchEvent(new WheelEvent('wheel',{deltaY:dir*120,deltaMode:0,clientX:r.left+r.width/2,clientY:r.top+r.height/2,bubbles:true,cancelable:true}));
});
/* קישורים ישנים אל מקטעי הדף הקודם ממשיכים לעבוד; "המסע" הישן היה הגלובוס */
(function(){ var h=(location.hash||'').replace('#','');
  if(h==='voyage'||h==='globe') setTimeout(function(){ openGlobe('boat'); },400);
  else if(['journey','race','scale','ahead','sextant','more'].indexOf(h)>=0) setTimeout(function(){ openJourney(h==='journey'?null:h); },400); })();

/* ================= רצועת הזמן: שבוע, וההווה תמיד באמצע =================
   מ-21.9 בערב (הערות בתחנה): בתחתית המסך, מקצה לקצה; שבוע שלם, 3.5 ימים לכל צד של ההווה; בלי כיתובים.
   הרקע הוא אור היום בנקודה של דניאל לאורך כל השבוע. הרוח, הגל והלחץ מצוירים רק איפה שיש להם נתונים
   (COND, בערך יומיים), ומחוץ לזה הרצועה מעומעמת והגרירה נעצרת בקצה הנתונים — לא ממציאים ים שלא נשמר.
   ארכיון מזג אוויר לכל המרוץ הוא הסבב הבא (claude/ציר-הזמן-הצעה.md), ואז הקצוות ייפתחו.
   מה שאומר איפה אתה בזמן הוא הצבע: הסמן, השטח שבינו לבין ההווה, והערכים בשורות — טורקיז לעבר,
   ענבר לתחזית, לבן להווה. חזרה להווה: הקשה במרכז (יש שם "גומה" של כמה פיקסלים), או הקשה כפולה. */
var TS={cv:$('tsCv'), rng:$('tsRange'), box:$('tstrip')};
var TS_HALF=3.5*86400000, TS_T0=0, TS_T1=0, TS_D0=0, TS_D1=0, tsScrub=false, tsW=0, tsH=0, tsPaint=0, tsLast=0;
var TS_PAST='143,227,222', TS_FUT='241,207,138';
function tsReady(){ return !!(TS.cv&&TS.rng&&typeof COND!=='undefined'&&COND.length>2); }
/* 22.9: השורות הן הארכיון (לפני COND) ואז COND. "כיסוי" = קטעים שבהם שורות סמוכות רחוקות זו מזו עד שלוש שעות.
   גרירה נעצרת בקצוות הכיסוי ולא נכנסת לפער: שם אין ים שנשמר, ולא ממציאים אותו. */
var TS_COV=[];
function tsRows(){ return (LIVE&&EXO.condAll)?EXO.condAll():COND; }
function tsSpan(){ var n=Date.now(), R=tsRows(), i, a=null, b=null; TS_T0=n-TS_HALF; TS_T1=n+TS_HALF; TS_COV=[];
  for(i=0;i<R.length;i++){ var t=Date.parse(R[i][0]+'Z'); if(a===null){ a=b=t; continue; }
    if(t-b>3*3600000){ TS_COV.push([a,b]); a=t; } b=t; }
  if(a!==null) TS_COV.push([a,b]);
  TS_D0=TS_COV.length?TS_COV[0][0]:n; TS_D1=TS_COV.length?TS_COV[TS_COV.length-1][1]:n; tsSun=null; }
function tsSnap(t){ var best=t, bd=Infinity, i;
  for(i=0;i<TS_COV.length;i++){ var c=TS_COV[i]; if(t>=c[0]&&t<=c[1]) return t;
    var d0=Math.abs(t-c[0]), d1=Math.abs(t-c[1]); if(d0<bd){ bd=d0; best=c[0]; } if(d1<bd){ bd=d1; best=c[1]; } }
  var now=Date.now(); if(Math.abs(t-now)<=bd) return now; return best; }
function tsTimeOf(v){ return TS_T0+(TS_T1-TS_T0)*(v/1000); }
function tsValOf(t){ return clamp(Math.round((t-TS_T0)/(TS_T1-TS_T0)*1000),0,1000); }
function tsLive(){ return LIVE?(Date.now()+(EXO.clockOff?EXO.clockOff():0)):Date.now(); }
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
  var span=TS_T1-TS_T0, i, px;
  function X(t){ return (t-TS_T0)/span*W; }
  /* אור היום, עמודה לכל פיקסל */
  if(!tsSun||tsSun.length!==W){ tsSun=new Float32Array(W); for(i=0;i<W;i++) tsSun[i]=tsSunAt(TS_T0+span*(i+0.5)/W); }
  for(i=0;i<W;i++){ var a=tsSun[i], day=clamp((a+4)/10,0,1), dusk=Math.max(0,1-Math.abs(a+1)/8);
    var R=Math.round(5+day*36+dusk*54), G=Math.round(11+day*64+dusk*24), B=Math.round(20+day*92+dusk*3);
    x.fillStyle='rgb('+R+','+G+','+B+')'; x.fillRect(i,0,1.02,H); }
  /* חצות, לפי השעון של דניאל: קו דק לכל יממה */
  x.fillStyle='rgba(205,225,238,.20)';
  var off=FIX.lon/15*3600000, d0=Math.ceil((TS_T0+off)/86400000), d1=Math.floor((TS_T1+off)/86400000);
  for(i=d0;i<=d1;i++){ px=X(i*86400000-off); x.fillRect(px-0.5,0,1,H); }
  /* הרוח, הגל והלחץ — רק בטווח שיש עליו נתונים */
  function series(col,cap,wid,fill){
    var RR=tsRows(), lo=1e9, hi=-1e9, v=[], tp=null; for(i=0;i<RR.length;i++){ var tt=Date.parse(RR[i][0]+'Z'); var q=(tt>=TS_T0-3600000&&tt<=TS_T1+3600000)?col(RR[i]):null; v.push(q); if(q!=null){ if(q<lo) lo=q; if(q>hi) hi=q; } }
    if(hi<=-1e8) return; if(hi-lo<1e-6) hi=lo+1;
    var pad2=(hi-lo)*0.18; lo-=pad2; hi+=pad2;
    x.beginPath(); var x0=null, xl=0;
    for(i=0;i<RR.length;i++){ if(v[i]==null) continue; var ti=Date.parse(RR[i][0]+'Z');
      px=X(ti); var py=H-2-(v[i]-lo)/(hi-lo)*(H-6);
      if(x0===null||(tp!==null&&ti-tp>3*3600000)){ if(fill&&x0!==null){ x.lineTo(xl,H); x.lineTo(x0,H); x.closePath(); } x.moveTo(px,py); x0=px; } else x.lineTo(px,py); xl=px; tp=ti; }
    if(fill){ x.lineTo(xl,H); x.lineTo(x0,H); x.closePath(); x.fillStyle=fill; x.fill(); }
    else { x.strokeStyle=cap; x.lineWidth=wid; x.lineJoin='round'; x.stroke(); } }
  series(function(c){ return c.length>=15?c[9]:null; },'rgba(207,230,255,.34)',1,null);
  series(function(c){ return c[1]; },null,0,'rgba(231,241,248,.13)');
  series(function(c){ return c[1]; },'rgba(244,249,252,.90)',1.1,null);
  series(function(c){ return c[4]; },'rgba(143,227,222,.95)',1.25,null);
  /* מחוץ לנתונים: מעומעם. השבוע נראה, אבל ברור איפה עוד אין מה לגרור */
  x.fillStyle='rgba(3,9,15,.62)'; var ce=TS_T0;
  for(i=0;i<=TS_COV.length;i++){ var cs=i<TS_COV.length?TS_COV[i][0]:TS_T1;
    if(cs>ce){ var g0=clamp(X(ce),0,W), g1=clamp(X(cs),0,W); if(g1>g0) x.fillRect(g0,0,g1-g0,H); }
    if(i<TS_COV.length) ce=Math.max(ce,TS_COV[i][1]); }
  /* ההווה: באמצע, תמיד. גומה קטנה למעלה ולמטה */
  var cx=X(Date.now()), tn=tsLive(), sx=clamp(X(tn),0,W), dir=tn<Date.now()-60000?-1:tn>Date.now()+60000?1:0, rgb=dir<0?TS_PAST:dir>0?TS_FUT:'255,255,255';
  /* השטח שבין ההווה לזמן שנבחר, בצבע של הכיוון */
  if(dir){ x.fillStyle='rgba('+rgb+',.20)'; x.fillRect(Math.min(cx,sx),0,Math.abs(sx-cx),H); }
  x.fillStyle='rgba(255,255,255,'+(dir?'.55':'.0')+')'; x.fillRect(cx-0.5,0,1,H);
  x.fillStyle='rgba(255,255,255,.85)';
  x.beginPath(); x.moveTo(cx-4,0); x.lineTo(cx+4,0); x.lineTo(cx,4); x.closePath(); x.fill();
  x.beginPath(); x.moveTo(cx-4,H); x.lineTo(cx+4,H); x.lineTo(cx,H-4); x.closePath(); x.fill();
  /* הסמן: איפה השעון של הדף עומד */
  x.fillStyle='rgba('+rgb+',.96)'; x.fillRect(sx-1,0,2,H);
  x.beginPath(); x.arc(sx,H/2,dir?3.2:2.6,0,6.283); x.fill(); }
function tsClass(off){ var b=document.body.classList, p=off<-60000, f=off>60000;
  if(b.contains('t-past')!==p) b.toggle('t-past',p); if(b.contains('t-fut')!==f) b.toggle('t-fut',f); }
function tsSet(off,fromUser){
  if(!LIVE||!EXO.setClock) return;
  EXO.setClock(off);
  vigTick();
  tsScrub=(off!==0);
  TS.box.classList.toggle('scrub',tsScrub);
  tsClass(off);
  if(tsScrub&&window.__exoHudOpen) window.__exoHudOpen(true,true);   /* הערכים הצבועים הם התשובה לגרירה: פס הנתונים נפתח */
  if(!fromUser) TS.rng.value=tsValOf(tsLive());
  tsDraw(); }
function tsInput(){
  var t=tsTimeOf(+TS.rng.value), now=Date.now(), W=tsW||TS.box.clientWidth||400;
  /* גומה סביב ההווה: 4 פיקסלים לכל צד נצמדים לזמן אמת */
  if(Math.abs(t-now)<(TS_T1-TS_T0)*4/W) t=now;
  var c=tsSnap(t);
  if(c!==t){ t=c; TS.rng.value=tsValOf(t); }
  tsSet(t===now?0:t-now,true); }
function tsInit(){
  if(!tsReady()){ if(TS.box) TS.box.hidden=true; return; }
  tsSpan();
  if(!LIVE||!EXO.setClock){ TS.rng.disabled=true; TS.rng.tabIndex=-1; }
  TS.rng.value=tsValOf(tsLive());
  TS.rng.addEventListener('input',tsInput);
  TS.rng.addEventListener('change',function(){ TS.rng.value=tsValOf(tsLive()); });
  TS.rng.addEventListener('dblclick',function(){ tsSet(0); });
  tsDraw();
  /* ההווה זז: פעם בדקה הציר מתמרכז מחדש, והסמן (שזוכר היסט ולא זמן) נשאר צמוד אליו */
  setInterval(function(){ if(document.hidden) return; tsSpan(); TS.rng.value=tsValOf(tsLive()); tsDraw(); },60000);
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
/* 22.9: ארכיון מזג האוויר של אקסודוס (assets/cond/wNN.json, שבוע לכל קובץ מ-6.9, נכתב על ידי הבוט).
   נטען ברקע אחרי שהסצנה רצה, רק השבועות שנכנסים לרצועה. קובץ שעוד לא קיים — פשוט אין שם כיסוי. */
if(LIVE&&EXO.setArchive&&typeof COND!=='undefined'&&COND.length) idle(function(){
  var W0=Date.UTC(2026,8,6), wk=function(t){ return Math.floor((t-W0)/(7*86400000))+1; }, now=Date.now(), c0=Date.parse(COND[0][0]+'Z');
  var a=Math.max(1,wk(now-TS_HALF)), b=wk(Math.min(now,c0)), L=[], k;
  for(k=a;k<=b;k++) L.push(fetch('assets/cond/w'+(k<10?'0':'')+k+'.json',{cache:'no-cache'}).then(function(r){ return r.ok?r.json():null; }).catch(function(){ return null; }));
  Promise.all(L).then(function(A){ var rows=[];
    A.forEach(function(d){ if(d&&d.boats&&d.boats['4']) rows=rows.concat(d.boats['4']); });
    if(!rows.length) return;
    EXO.setArchive(rows); tsSpan(); TS.rng.value=tsValOf(tsLive()); tsDraw(); }); },3000);
vigTick(); setInterval(vigTick,60000); if(window.EXO) EXO.vigTick=vigTick;   /* נחשף לבדיקות: audit_contrast.py מזיז את השעון ישירות */
/* קטלוג הכוכבים: רק אחרי שהסצנה כבר רצה. המנוע מזהה אותו לבד בפריים הבא; בלעדיו נשארים כוכבי הרעש */
if(LIVE) idle(function(){ loadScript('assets/v2/stars.js').then(function(){ if(EXO.kick) EXO.kick(); }).catch(function(){}); },2600);
idle(function(){ loadScript('assets/v2/coast.js').then(function(){ NEAR=null; drawMini(); }).catch(function(){}); },1800);
if(false&&LIVE&&!store('exo.hint.v2')){      /* l23: בלי הודעה צפה במסך הנקי */ setTimeout(function(){ toast('גרירה מסובבת לכל כיוון, גם אל מתחת למים. צביטה או גלגלת: פנימה עד הסיפון, החוצה עד הגלובוס',7000); store('exo.hint.v2','1'); },1600); }
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(function(){ SZ={}; measureTop(); });
/* ================= שלושת המבטים: סירה / אזור / כל המרוץ (22.9.2026) =================
   סרגל אנכי דק בשולי המסך השמאליים. כל עצירה עפה בתנועה אחת רכה לרמה שלה, והמחוון (טבעת קטנה על הקו)
   נע ברציפות עם כל זום — בגלגלת, בצביטה או בכפתור — כך שהסרגל הוא גם "איפה אני" ולא רק כפתורים.
   המדד הוא רוחב השטח שעל המסך במטרים, אותו מדד שמחבר את ההדמיה לגלובוס. */
(function(){
  var nav=$('vw'); if(!nav) return;
  if(!LIVE){ nav.hidden=true; return; }      /* 23.9: בלי WebGL אין לאן לעוף (גם הגלובוס צריך אותו) — פקד מת מוסתר, לא מוצג */
  var knob=nav.querySelector('.vw-knob'), btns=nav.querySelectorAll('button[data-v]'), lastY=-1, lastA='';
  function wBoat(){ var Z=EXO.zoomAxis; return (Z&&Z.wOfU&&Z.uOfR)?Z.wOfU(Z.uOfR(64)):120; }
  function stops(){ var s=window.__exoViewStops?window.__exoViewStops():null;
    return [Math.log(wBoat()), Math.log(s?s.region:74000), Math.log(s?s.race:2.2e7)]; }
  function nowW(){ var Z=EXO.zoomAxis;
    if(gOpen&&window.__exoGlobeWidth) return window.__exoGlobeWidth();
    return (Z&&Z.wOfU&&EXO.frame&&EXO.frame.u!==undefined)?Z.wOfU(EXO.frame.u):wBoat(); }
  function pos(){ var S=stops(), l=Math.log(Math.max(1,nowW()));
    if(l<=S[0]) return 0; if(l>=S[2]) return 2;
    return l<S[1]?(l-S[0])/(S[1]-S[0]):1+(l-S[1])/(S[2]-S[1]); }
  function tick(){ try{
    var p=pos(), h=nav.clientHeight, gap=(btns.length>1)?(btns[2].offsetTop-btns[0].offsetTop)/2:40;
    var y=Math.round((btns[0].offsetTop+btns[0].offsetHeight/2+p*gap)*2)/2;
    if(y!==lastY){ lastY=y; knob.style.transform='translate(-50%,'+(y-4.5)+'px)'; }
    var a=Math.abs(p-Math.round(p))<0.14?['boat','region','race'][Math.round(p)]:'';
    if(a!==lastA){ lastA=a; for(var i=0;i<btns.length;i++) btns[i].setAttribute('aria-pressed',btns[i].getAttribute('data-v')===a?'true':'false'); }
  }catch(e){} requestAnimationFrame(tick); }
  requestAnimationFrame(tick);
  function go(v){
    if(v==='boat'){ if(gOpen) closeGlobe(false);
      else if(EXO.glideTo&&EXO.zoomAxis){ EXO.glideTo(EXO.zoomAxis.uOfR(64),1300); } return; }
    if(gOpen){ if(window.__exoGlobeView) window.__exoGlobeView(v); return; }
    var ok=EXO.globeReady&&EXO.quality!=='lite'&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches&&window.__exoAutoOut;
    if(ok&&window.__exoAutoOut(v)) return;      /* מהמקום הנוכחי, דרך ההצלבה, בתנועה אחת */
    openGlobe(v==='race'?'race':'out'); }
  for(var i=0;i<btns.length;i++) btns[i].addEventListener('click',function(){ go(this.getAttribute('data-v')); });
})();
})();
