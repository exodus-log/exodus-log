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
  put('vWhere',whereWords()); capPos(s,c,ps,ageTxt,stale); capNat(s,c); capLog(s,c,ps); capArea(s); if(LY_ON.race) radarDraw();
  put('vRank',FIX.rank); put('vOf','מתוך '+FLEET.length); put('vSog',FIX.sog.toFixed(1)+(compact?'kn ':' kn · ')+deg3(FIX.cog));
  put('vGap',gap<=0?'0':thou(gap)); put('vDtf',thou(FIX.dtf));
  if(c){ labelTexts(s); put('lyWind',Math.round(c.wind)); put('lyWave',c.waveH.toFixed(1)); put('lyCur',c.cur.toFixed(1)); paintLayers();
    put('natWind',Math.round(c.wind)+' kn'); put('natWave',c.waveH.toFixed(1)+' m'); put('natCur',c.cur.toFixed(1)+' kn'); }
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

/* 24.9 (סעיף 8): "נקודת ציון" — איפה הוא, במשפט אחד ביחס למקום מוכר, והקואורדינטות והשעה אצלו.
   המקומות המוכרים — מאותם קבצים שהגלובוס מסמן (course.js: נקודות החובה והכפים; names.js: איים על המסלול),
   ועוד שלוש ערים בקואורדינטות שלהן: פראיה ודקר (מול כף ורדה), קייפטאון. הכיוון והמרחק מחושבים (מעגל גדול) מהמיקום המוצג */
var PLACES=[[46.48,-1.79,'לה סאבל ד׳אולון'],[28.85,-13.82,'לנזרוטה'],[-20.50,-29.33,'טרינדאדה'],[-34.36,18.47,'כף התקווה הטובה'],
  [-34.38,115.15,'כף לואין'],[-42.99,147.33,'הובארט'],[-55.98,-67.27,'כף הורן'],
  [42.9,-9.9,'כף פיניסטרה'],[32.75,-17.0,'מדיירה'],[38.4,-28,'האיים האזוריים'],[-3.85,-32.42,'פרננדו דה נורוניה'],[-7.95,-14.37,'אסנשן'],
  [-15.96,-5.71,'סנט הלנה'],[-37.1,-12.3,'טריסטן דה קונה'],[-40.32,-9.93,'האי גוף'],[-54.42,3.38,'האי בובה'],[-46.77,37.85,'איי הנסיך אדוארד'],
  [-46.4,51.8,'איי קרוזה'],[-49.35,69.35,'איי קרגלן'],[-53.1,73.5,'האי הרד'],[-38.3,77.5,'אמסטרדם וסן פול'],[-50.7,166.1,'איי אוקלנד'],
  [-52.55,169.15,'האי קמפבל'],[-44,-176.5,'איי צ׳טהם'],[-27.1,-109.35,'אי הפסחא'],[-51.75,-59.2,'איי פוקלנד'],[-54.3,-36.7,'ג׳ורג׳יה הדרומית'],
  [14.92,-23.51,'פראיה, בירת כף ורדה'],[14.69,-17.44,'דקר'],[-33.92,18.42,'קייפטאון']];
function dir8(b,go){ var i=Math.round((((b%360)+360)%360)/45)%8;
  return (go?['צפונה','צפון-מזרחה','מזרחה','דרום-מזרחה','דרומה','דרום-מערבה','מערבה','צפון-מערבה']:['צפונית','צפונית-מזרחית','מזרחית','דרומית-מזרחית','דרומית','דרומית-מערבית','מערבית','צפונית-מערבית'])[i]; }
function roundNm(d){ return d<100?Math.round(d/5)*5:d<1000?Math.round(d/10)*10:Math.round(d/50)*50; }
function toHe(nm){ return /^ה/.test(nm)?'ל'+nm.slice(1):'ל'+nm; }
function posSentence(la,lo){ var o=oceanHe(la,lo), b=null;
  PLACES.forEach(function(p){ var d=gcNm(p[0],p[1],la,lo); if(!b||d<b.d) b={p:p,d:d}; });
  var at='ב'+o.slice(1);
  if(!b) return at;
  if(b.d<10) return at+', ליד '+b.p[2];
  return at+', כ־<b class="n tv">'+thou(roundNm(b.d))+'</b> מייל '+dir8(gcBrg(b.p[0],b.p[1],la,lo))+' '+toHe(b.p[2]); }
/* חציית 40 ו-50 דרום: מהמסלול האמיתי (ME_TRACK/נקודות הציון) — הרגע הראשון שבו קו הרוחב ירד מתחת לקו */
function crossedAt(latLine){ return FIX.lat<latLine?0:null; }      /* התאריך המדויק — כשהגלובוס טעון (window.__exoCrossed), אחרת בלי תאריך */
function capPos(s,c,ps,ageTxt,stale){ var e=$('capPos'); if(!e) return;
  var fx=new Date(FIX.at*1000), h=posSentence(ps.lat,ps.lon)+'.<br>'
    +'<b class="n tv" dir="ltr">'+dmm(ps.lat,2,'N','S')+' '+dmm(ps.lon,3,'E','W')+'</b> · אצל דניאל <b class="n tv">'+s.localHM+'</b><br>'
    +'<span'+(stale?' style="color:#ffb3a8"':'')+'>נקודת הציון האחרונה <span class="n">'+pad(fx.getUTCHours())+':'+pad(fx.getUTCMinutes())+' UTC</span>, '+ageTxt+'</span>';
  [[-40,'הארבעים השואגים'],[-50,'החמישים הזועמים']].forEach(function(L){ var k=crossedAt(L[0]); if(k===null) return; if(window.__exoCrossed) k=window.__exoCrossed(L[0])||0;
    h+='<br>חצה את קו '+(-L[0])+'° דרום, "'+L[1]+'"'+(k?', ב־<span class="n">'+new Date(k*1000).getUTCDate()+'.'+(new Date(k*1000).getUTCMonth()+1)+'</span>':''); });
  if(e._h!==h){ e._h=h; e.innerHTML=h; if(LY_ON.pos) measureTop(); } }
/* 24.9 (סעיף 9): "תנאי הטבע" — מתג לכל הדמיה עם הנתון של הרגע, ושורה אחת: הרוח מול כיוון השיט */
function capNat(s,c){ var e=$('capNat'); if(!e) return; var h='';
  if(c&&!c.missing){ var twa=Math.abs(((c.windDir-FIX.cog)%360+540)%360-180);
    h='רוח מכיוון <b class="n tv">'+deg3(c.windDir)+'</b> (בופור '+beaufort(c.wind)+'), והוא שט לכיוון <b class="n">'+deg3(FIX.cog)+'</b> ב־<b class="n">'+FIX.sog.toFixed(1)+' kn</b> — '
      +(twa<60?'נגד הרוח':twa<=120?'הרוח מהצד':'עם הרוח')+'.'; }
  if(e._h!==h){ e._h=h; e.innerHTML=h; if(LY_ON.nat) measureTop(); } }

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
  /* l23: המלל של השכבות הדולקות — ההצללה העליונה, המשואה והסימנים באופק יורדים אל מתחתיו */
  var lc=$('lyCap'); if(lc&&!document.body.classList.contains('g-open')){ var cs=lc.querySelectorAll('.cap'), cb=0; for(var ci=0;ci<cs.length;ci++){ if(cs[ci].offsetParent!==null&&cs[ci].offsetHeight) cb=Math.max(cb,cs[ci].getBoundingClientRect().bottom); } if(cb) d=Math.max(d,cb-4); }
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
   (מ-24.9: עלייה של כשתי שניות ועוד כחמש וחצי במלואו), ואז בערך שנייה של התכווצות אל נקודת העיגול — כך רואים לאן הוא הלך. בכל ביקור.
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
/* 24.9 (סעיף 1): הכותרת עולה בהדרגה (1.9 שנ׳), נשארת, ורק אחרי 7.5 שנ׳ נשאבת — קודם 4 */
if(leadEl) requestAnimationFrame(function(){ requestAnimationFrame(function(){ leadEl.classList.add('up'); }); });
suck.t=setTimeout(suck,7500);
var keyArm=false; window.addEventListener('pointerdown',function(){ keyArm=keyed; },{capture:true,passive:true});
['pointerdown','keydown','wheel'].forEach(function(ev){
  window.addEventListener(ev,function h(e){ if(ev==='keydown'&&(e.key==='Shift'||e.key==='Alt'||e.key==='Control'||e.key==='Meta')) return;
    suck(); window.removeEventListener(ev,h,true); },{capture:true,passive:true}); });

/* ===== l23 מנה 2: התפריט העליון — חמש שכבות, ו"שאלות" (24.9), שהיא חלונית ולא שכבה ו"אודות" נבלע בה ===== */
var lyrEl=$('lyr'), lyrIsOpen=false, LY_ON={};
function lyrOvf(){ if(lyrEl&&!lyrEl.hidden) lyrEl.classList.toggle('ovf',lyrEl.scrollWidth>lyrEl.clientWidth+1); }
window.addEventListener('resize',lyrOvf);
function lyrOpen(on){ lyrIsOpen=!!on; if(!lyrEl) return; lyrEl.hidden=!on; document.body.classList.toggle('lyr-open',lyrIsOpen); lyrOvf();
  if(keyEl) keyEl.setAttribute('aria-expanded',on?'true':'false'); if(!on&&faqOpen) setFaq(false);
  if(on){ var f=lyrEl.querySelector('button'); if(f&&document.activeElement===keyEl) try{ f.focus({preventScroll:true}); }catch(e){} } }
var ringAnim=0, ringHold=0;
function ringTo(v){ if(!LIVE) return; cancelAnimationFrame(ringAnim); var a=LAB.ringVis||0, t0=performance.now();
  (function st(){ var k=Math.min(1,(performance.now()-t0)/450); LAB.ringVis=a+(v-a)*(k*k*(3-2*k)); if(EXO.kick) EXO.kick(); if(k<1) ringAnim=requestAnimationFrame(st); })(); }
function setLy(n,on){ on=!!on; LY_ON[n]=on; document.body.classList.toggle('ly-'+n,on);
  var b=lyrEl&&lyrEl.querySelector('[data-l="'+n+'"]'); if(b) b.setAttribute('aria-pressed',on?'true':'false');
  /* 24.9: הטבעת (שושנת הרוחות) והזרם — "תנאי הטבע". בפתיחה: דולקים; המתגים שבמלל מדליקים ומכבים כל אחד לבד */
  if(n==='nat'&&LIVE){ natSet('rose',on); natSet('cur',on); if(!on){ natSet('wind',true); natSet('wave',true); } natPaint(); gWind(); }
  if(n==='pos'||n==='nat'){ var ea=$('capArea'), eb=$('capPosArea'); if(ea) ea._h=null; if(eb) eb._h=null; }
  if(n==='race'){ var r0=$('capRace'); if(r0) r0._h=null; radarShow(on); }
  if(n==='pos'||n==='nat'||n==='race'){ if(LIVE&&EXO.state) renderHud(EXO.state); else renderHud(staticState()); }
  if(n==='ahead'&&on) aheadLoad();
  /* "היומן" (פס 48 השעות האחרונות, a12) עבר ל"המסע והניתוח" — הוא כולו עבר */
  if(n==='story'){ if(on) logBuild(); else { try{ tsSet(0); }catch(e){} logPaint(); } }
  SZ={}; measureTop(); }
if(lyrEl) lyrEl.addEventListener('click',function(ev){ var t=ev.target.closest?ev.target.closest('button'):null; if(!t) return;
  var n=t.getAttribute('data-l'); if(n) setLy(n,!LY_ON[n]); });
/* 24.9: "שאלות" עברה לתוך "המסע והניתוח" */
if($('bFaq')) $('bFaq').addEventListener('click',function(){ setFaq(!faqOpen); });
/* מתגי "תנאי הטבע": רוח, גל וזרם — השכבות של המנוע; שושנת הרוחות — הטבעת */
var NAT={rose:false};
function natSet(n,on){ if(!LIVE) return; if(n==='rose'){ NAT.rose=!!on; ringTo(on?1:0); clearInterval(ringHold); document.body.classList.toggle('rose-off',!on);
    if(on){ LAB.ringHotT=performance.now(); ringHold=setInterval(function(){ LAB.ringHotT=performance.now(); },500); } }
  else EXO.setLayer(n,!!on); gWind(); }
/* 25.9: "תנאי הטבע" ממשיכה גם בגלובוס — רוח, גל וזרם במקום של כל סירה (globe_add.js) */
function natWant(){ var on=!!(LY_ON.nat&&LIVE&&EXO.layers); return {wind:on&&!!EXO.layers.wind, wave:on&&!!EXO.layers.wave, cur:on&&!!EXO.layers.cur}; }
window.__exoNatWant=natWant;
function gWind(){ if(window.__exoGlobeNat) window.__exoGlobeNat(natWant()); }
function natPaint(){ var bs=document.querySelectorAll('[data-nat]'); for(var i=0;i<bs.length;i++){ var n=bs[i].getAttribute('data-nat');
  bs[i].setAttribute('aria-pressed',(n==='rose'?NAT.rose:(LIVE&&EXO.layers&&!!EXO.layers[n]))?'true':'false'); } }
if($('capNatW')) $('capNatW').addEventListener('click',function(ev){ var t=ev.target.closest?ev.target.closest('[data-nat]'):null; if(!t||!LIVE) return;
  var n=t.getAttribute('data-nat'); natSet(n,t.getAttribute('aria-pressed')!=='true'); natPaint(); if(EXO.kick) EXO.kick(); });
if(!LIVE){ var nb=document.querySelectorAll('[data-nat]'); for(var ni=0;ni<nb.length;ni++) nb[ni].disabled=true; }
/* קווי אורך ורוחב: על הגלובוס (מרמת "אזור" ומעלה). ליד הסירה כמעט אף פעם לא עובר קו — שם אין מה להראות */
var gridOn=false;
if($('swGrid')) $('swGrid').addEventListener('click',function(){ gridOn=!gridOn; this.setAttribute('aria-pressed',gridOn?'true':'false'); if(window.__exoGrid) window.__exoGrid(gridOn); });
window.__exoGridWant=function(){ return gridOn; };
/* בלי WebGL אין הדמיה לסמן עליה, והמלל הוא כל מה שיש: "נקודת ציון" דולקת מההתחלה */
if(!LIVE) setTimeout(function(){ setLy('pos',true); },0);

/* ===== 24.9 (סעיף 10): רדאר המרוץ =====
   אקסודוס במרכז, צפון למעלה, טבעת כיוונים. כל סירה במרוץ (לא שפרשה) לפי הכיוון והמרחק שלה מאקסודוס — מעגל גדול
   מנקודות הציון שב-FLEET, כמו הסימנים שהיו באופק. המרחק בסקאלת שורש (קרוב — מפורט, רחוק — דחוס), עם טבעות מרחק מסומנות
   במייל, כדי שלא יהיה מטעה. ליד הקרובות (עד חמש) ולצד המובילה: המקום הרשמי במרוץ (FLEET[0]), השם והמרחק במיילים ימיים.
   השאר — נקודה בלבד: שבע-עשרה תוויות לא נכנסות בלוח של 240 פיקסלים, והרשימה המלאה ב"המסע והניתוח" */
var ORD=['','ראשון','שני','שלישי','רביעי','חמישי','שישי','שביעי','שמיני','תשיעי','עשירי'];
function ordHe(r){ return 'מקום '+(ORD[r]||r); }
function radarShow(on){ var e=$('radar'); if(!e) return; e.hidden=!on; if(on) radarDraw(); measureBot(); }
window.addEventListener('resize',function(){ if(LY_ON.race) radarDraw(); });
function radarDraw(){ var host=$('radar'), svg=$('radarSvg'); if(!host||!svg||typeof FLEET==='undefined') return;
  var W=stage.clientWidth, H=stage.clientHeight, S=Math.round(Math.min(210,W-28,H*(H<=520?0.5:0.27)));
  document.documentElement.style.setProperty('--rdS',S+'px');
  var L=[]; FLEET.forEach(function(b){ if(b[1]===4||b[7]===1||b[2]==null) return; var d=gcNm(FIX.lat,FIX.lon,b[2],b[3]); L.push({r:b[0],n:String(b[4]),d:d,a:gcBrg(FIX.lat,FIX.lon,b[2],b[3])}); });
  var key=S+'|'+L.map(function(o){ return o.r+o.n+Math.round(o.d); }).join(','); if(svg._k===key) return; svg._k=key;
  /* קנה המידה נקבע לפי הקרובות (החמישית בקרבה, ועוד רבע), כדי שמה שקרוב יהיה ברור. מי שרחוקה מזה — על שפת הרדאר,
     בעיגול חלול, בכיוון האמיתי; המרחק שלה נשאר מדויק בתווית (המובילה) או ברשימה המלאה */
  L.sort(function(a,b){ return a.d-b.d; });
  var c=S/2, R=c-16, d5=L.length?L[Math.min(4,L.length-1)].d:50, nice=[50,100,150,200,300,500,750,1000,1500,2000,3000,5000,8000,12000];
  var top=nice.filter(function(v){ return v>=d5*1.25; })[0]||12000;
  var rr=[nice.filter(function(v){ return v<=top/2.5; }).pop(),top].filter(Boolean);
  var rOf=function(d){ return R*Math.sqrt(Math.min(d,top)/top); };
  var h='<svg viewBox="0 0 '+S+' '+S+'" xmlns="http://www.w3.org/2000/svg"><circle class="rg" cx="'+c+'" cy="'+c+'" r="'+R+'"/>';
  rr.forEach(function(v,i){ var r=rOf(v); if(i<rr.length-1) h+='<circle class="rr" cx="'+c+'" cy="'+c+'" r="'+r.toFixed(1)+'"/>';
    h+='<text class="rl lbg" text-anchor="end" x="'+(c+r*0.7071+2).toFixed(1)+'" y="'+(c+r*0.7071+9).toFixed(1)+'">'+thou(v)+'</text>'; });
  [['צפון',0],['מזרח',90],['דרום',180],['מערב',270]].forEach(function(k){ var a=k[1]*D2R, x=c+Math.sin(a)*(R+9), y=c-Math.cos(a)*(R+9);
    h+='<text class="rc lbg" text-anchor="middle" dominant-baseline="central" x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'">'+k[0]+'</text>'; });
  /* ליד כל סירה: המספר של המקום שלה במרוץ. מתחת לרדאר, באותו מספר: השם והמרחק — לקרובות (עד ארבע) ולמובילה.
     כך גם ב-320 פיקסלים אין תוויות שעולות זו על זו, וכל סירה מזוהה */
  var lab=L.slice(0,4); var ld=L.filter(function(o){ return o.r===1; })[0]; if(ld&&lab.indexOf(ld)<0) lab.push(ld);
  L.forEach(function(o){ var a=o.a*D2R, r=rOf(o.d), far=o.d>top; o.x=c+Math.sin(a)*r; o.y=c-Math.cos(a)*r;
    h+='<circle class="bt'+(far?' far':'')+'" cx="'+o.x.toFixed(1)+'" cy="'+o.y.toFixed(1)+'" r="3"/>'; });
  h+='<circle class="me" cx="'+c+'" cy="'+c+'" r="4.5"/>';
  L.forEach(function(o){ var out=o.x>=c; h+='<text class="lbg rn'+(lab.indexOf(o)>=0?' hi':'')+'" text-anchor="'+(out?'end':'start')+'" dominant-baseline="central" x="'+(o.x+(out?5:-5)).toFixed(1)+'" y="'+o.y.toFixed(1)+'">'+o.r+'</text>'; });
  h+='</svg>';
  svg.outerHTML=h.replace('<svg ','<svg id="radarSvg" aria-hidden="true" '); var ns=$('radarSvg'); if(ns) ns._k=key;
  lab.sort(function(a,b){ return a.r-b.r; });
  var cap=lab.map(function(o){ return '<span><b class="n">'+o.r+'</b> '+o.n.replace(/&/g,'&amp;').replace(/</g,'&lt;')+' · '+ordHe(o.r)+' · <span class="n">'+thou(o.d)+'</span> מייל</span>'; }).join('')
    +'<span class="rme">אקסודוס: '+ordHe(FIX.rank)+' מתוך '+FLEET.length+' · מרחקים במייל ימי ממנו</span>';
  var ce=$('radarCap'); if(ce&&ce._h!==cap){ ce._h=cap; ce.innerHTML=cap; }
  if(!radarDraw.m){ radarDraw.m=1; setTimeout(function(){ radarDraw.m=0; measureBot(); },0); } }

/* ===== 24.9 (סעיף 7): "הדרך קדימה" — כמה נשאר, לאן בעוד יממה (התחזית של הבוט), והשעות הקרובות ===== */
var AHD=null;
function aheadLoad(){ capAhead(); if(AHD!==null) return; AHD=0;
  try{ fetch('assets/forecast.json',{cache:'no-cache'}).then(function(r){ return r.ok?r.json():null; }).then(function(j){ AHD=j||0; capAhead(); }).catch(function(){}); }catch(e){} }
function capAhead(){ var e=$('capAhead'); if(!e) return; var tg=toGateNow();
  var h='עד '+FIX.gate+' (נקודת החובה הבאה): <b class="n">'+thou(tg)+'</b> מייל · עד הסיום: <b class="n">'+thou(FIX.dtf)+'</b> מייל';
  var b=AHD&&AHD.boats&&AHD.boats['4'];
  if(b&&b.pts&&b.pts.length>1&&Math.abs(b.pts[0][0]-FIX.at)<6*3600){ var t=b.pts[0][0]+24*3600, p=null, i;
    for(i=1;i<b.pts.length;i++) if(b.pts[i][0]>=t){ var a=b.pts[i-1], q=b.pts[i], f=(t-a[0])/((q[0]-a[0])||1); p=[a[1]+(q[1]-a[1])*f,a[2]+(q[2]-a[2])*f]; break; }
    if(p){ var d=gcNm(FIX.lat,FIX.lon,p[0],p[1]), fan=AHD.fan&&AHD.fan['24'];
      h+='<br>בעוד יממה, לפי התחזית: כ־<b class="n">'+thou(roundNm(d))+'</b> מייל '+dir8(gcBrg(FIX.lat,FIX.lon,p[0],p[1]),1)+' מכאן'
        +(fan&&fan.p50?' <span class="dim">(הערכה; בבדיקה לאחור הטעות האופיינית ביממה — כ־<span class="n">'+Math.round(fan.p50)+'</span> מייל)</span>':' <span class="dim">(הערכה)</span>'); } }
  if(e._h!==h){ e._h=h; e.innerHTML=h; if(LY_ON.ahead) measureTop(); } }
if($('bAhead24')) $('bAhead24').addEventListener('click',function(){ openJourney('ahead'); });
/* 25.9 (שמוליק): "לנווט כמו דניאל" שייך ל"נקודת ציון" — זו התשובה ל"איך יודעים איפה הוא". הסקסטנט עצמו נשאר בחלונית המסע, והקישור פותח אותה עליו */
if($('bSextant')) $('bSextant').addEventListener('click',function(){ openJourney('sextant'); });

/* "היומן" — a12 (24.9 לילה, שמוליק: "הכי יפה זה בזריחה או בשקיעה; לתת לאנשים הזדמנות לראות את זה").
   במקום הזמנים במילים ("לפני 12 שע׳", "בעוד יום"): פס זמן אחד, רק אחורה, 48 שעות. "עכשיו" בקצה הימני — אותו כיוון כמו
   הפס בגלובוס, כך שיש פס זמן אחד בכל הגבהים. בלי תחזית בינתיים (a10/a11 פתוחים).
   על הפס: אור היום בנקודה שבה הסירה הייתה בכל רגע, וסימן קטן בכל זריחה ושקיעה. הזמנים מחושבים (לא מודל):
   גובה השמש במיקום של אקסודוס באותה שעה — מהארכיון (lat/lon של הבוט) ומנקודת הציון האחרונה — שעובר את -0.833°
   (מרכז השמש, עם השבירה וחצי הקוטר). נבדק מול ephem (ספרייה עצמאית): עד 3 שניות.
   גרירה שמתקרבת לסימן נדבקת אליו (מגנט, 12 פיקסלים), וגם לקצה של "עכשיו". הניגון עובר על היומיים ב-~24 שניות,
   מאט סביב כל זריחה ושקיעה ועוצר עליה לרגע. רק איפה שיש ים שנשמר (הכיסוי של tsSnap) — לא ממציאים. */
var SS={box:$('sScrub'), cv:$('ssCv'), rng:$('ssRange'), play:$('ssPlay')};
var ssPtr=false, SS_BACK=48*3600000, SS_T0=0, SS_T1=0, SS_EV=[], SS_TRACK=null, ssW=0, ssBg=null, ssPlayRaf=0, ssHold=0, ssLastT=0, ssHeld=null;
function ssOK(){ return !!(SS.box&&SS.cv&&SS.rng&&LIVE&&EXO.setClock&&typeof COND!=='undefined'&&COND.length); }
/* המסלול לחישוב השמש: נקודות הארכיון עד נקודת הציון, ואז נקודת הציון עצמה */
function ssTrackPts(){ var fx=FIX.at*1000, P=[], i; if(SS_TRACK) for(i=0;i<SS_TRACK.length;i++) if(SS_TRACK[i][0]<fx) P.push(SS_TRACK[i]);
  P.push([fx,FIX.lat,FIX.lon]); return P; }
function ssPos(P,t){ if(t<=P[0][0]) return [P[0][1],P[0][2]];
  for(var i=1;i<P.length;i++) if(t<=P[i][0]){ var a=P[i-1], b=P[i], f=(t-a[0])/Math.max(1,b[0]-a[0]), dl=b[2]-a[2]; if(dl>180) dl-=360; if(dl<-180) dl+=360;
    return [a[1]+(b[1]-a[1])*f, a[2]+dl*f]; }
  var z=P[P.length-1]; return [z[1],z[2]]; }
function ssAlt(P,t){ var p=ssPos(P,t); return EXO.astro.sunPos(t,p[0],p[1]).alt*R2D; }
function ssCovStart(){ return TS_COV.length?TS_COV[0][0]:Date.now(); }
function ssSpan(){ try{ tsSpan(); }catch(e){} var n=Date.now(); SS_T1=n; SS_T0=n-SS_BACK; ssBg=null; SS_EV=[];
  if(!EXO.astro||!EXO.astro.sunPos) return;
  /* זריחות ושקיעות: סריקה כל 5 דקות, ואז חציה עד שנייה. רק בטווח שיש לו מסלול אמיתי (הארכיון) או נקודת ציון קרובה */
  var P=ssTrackPts(), lo0=Math.max(SS_T0, P.length>1?P[0][0]:FIX.at*1000-6*3600000), t, a, tp=lo0, ap=ssAlt(P,lo0)+0.833;
  for(t=lo0+300000;t<=n;t+=300000){ a=ssAlt(P,t)+0.833;
    if((ap<0)!==(a<0)){ var lo=tp, hi=t; for(var k=0;k<22;k++){ var m=(lo+hi)/2; if(((ssAlt(P,m)+0.833)<0)===(ap<0)) lo=m; else hi=m; }
      SS_EV.push({t:Math.round(lo/1000)*1000, rise:a>=0}); }
    tp=t; ap=a; } }
function ssTimeOf(v){ return SS_T0+(SS_T1-SS_T0)*(v/1000); }
function ssValOf(t){ return clamp((t-SS_T0)/(SS_T1-SS_T0)*1000,0,1000); }
/* המיפוי של הציור זהה לזה של השדה range: הידית (30 פיקסלים) לא יוצאת מהקצוות, אז 15 פיקסלים שוליים לכל צד */
var SS_PAD=15;
function ssX(t,W){ return SS_PAD+(t-SS_T0)/(SS_T1-SS_T0)*(W-2*SS_PAD); }
/* הרקע של הפס: אור היום בכל עמודה, לפי גובה השמש במיקום של הסירה באותו רגע. נשמר ומצויר מחדש רק כשהטווח זז */
function ssBackground(W,H,dpr){ var c=document.createElement('canvas'); c.width=Math.round(W*dpr); c.height=Math.round(H*dpr);
  var x=c.getContext('2d'); if(!x) return null; x.setTransform(dpr,0,0,dpr,0,0);
  var P=ssTrackPts(), i, y0=H/2-4, bh=8, cs=ssCovStart();
  for(i=Math.floor(SS_PAD);i<W-SS_PAD;i++){ var t=SS_T0+(SS_T1-SS_T0)*(i+0.5-SS_PAD)/(W-2*SS_PAD), a=ssAlt(P,t), day=clamp((a+4)/10,0,1), dusk=Math.max(0,1-Math.abs(a+1)/8);
    var R=Math.round(14+day*52+dusk*150), G=Math.round(24+day*84+dusk*72), B=Math.round(38+day*104+dusk*8);
    x.fillStyle='rgb('+R+','+G+','+B+')'; x.fillRect(i,y0,1.02,bh); }
  /* לפני תחילת הים השמור: מעומעם, ואי אפשר לגרור לשם */
  if(cs>SS_T0){ x.fillStyle='rgba(3,9,15,.7)'; x.fillRect(SS_PAD,y0,clamp(ssX(cs,W),SS_PAD,W-SS_PAD)-SS_PAD,bh); }
  /* סימן לכל זריחה ושקיעה: חצי שמש על קו אופק קטן, מעל הפס */
  SS_EV.forEach(function(e){ if(e.t<cs) return; var px=ssX(e.t,W), yy=y0-5;
    x.fillStyle='rgba(241,207,138,.95)'; x.beginPath(); x.arc(px,yy,4,Math.PI,0); x.closePath(); x.fill();
    x.fillRect(px-6.5,yy+0.5,13,1.2); });
  return c; }
function ssDraw(){
  if(!ssOK()||!SS.box.offsetWidth) return;
  var cv=SS.cv, r=cv.getBoundingClientRect(), dpr=Math.min(window.devicePixelRatio||1,2), W=Math.max(60,Math.round(r.width)), H=Math.max(30,Math.round(r.height));
  if(W!==ssW||cv.width!==Math.round(W*dpr)||!ssBg){ ssW=W; cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); ssBg=ssBackground(W,H,dpr); }
  var x=cv.getContext('2d'); if(!x) return; x.setTransform(1,0,0,1,0,0); x.clearRect(0,0,cv.width,cv.height);
  if(ssBg) x.drawImage(ssBg,0,0); x.setTransform(dpr,0,0,dpr,0,0);
  var y0=H/2-4, bh=8, tn=tsLive(), past=tn<Date.now()-60000, sx=ssX(clamp(tn,SS_T0,SS_T1),W), xe=W-SS_PAD;
  /* השטח שבין הזמן שנבחר לבין עכשיו — בצבע של העבר */
  if(past){ x.fillStyle='rgba(143,227,222,.30)'; x.fillRect(sx,y0,xe-sx,bh); }
  /* עכשיו: קו קצר בקצה הימני */
  x.fillStyle='rgba(255,255,255,.8)'; x.fillRect(xe,y0-3,1.5,bh+6);
  /* הסמן */
  x.fillStyle=past?'#8fe3de':'#ffffff'; x.fillRect(sx-1,y0-6,2,bh+12);
  x.beginPath(); x.arc(sx,y0+bh/2,5,0,6.283); x.fill(); }
function ssNear(t){ var W=ssW||SS.cv.clientWidth||300, px=(SS_T1-SS_T0)/Math.max(30,W-2*SS_PAD), best=null, bd=12*px, cs=ssCovStart();
  SS_EV.forEach(function(e){ var d=Math.abs(e.t-t); if(e.t>=cs&&d<bd){ bd=d; best=e; } }); return best; }
function ssAt(t){ var cs=ssCovStart(); for(var i=0;i<SS_EV.length;i++){ var e=SS_EV[i]; if(e.t>=cs&&Math.abs(e.t-t)<20*60000) return e; } return null; }
function ssGo(t,fromUser){ var now=Date.now(); t=Math.min(t,now); if(t!==now) t=tsSnap(t);
  if(now-t<60000) t=now;
  try{ tsSet(t===now?0:t-now,true); }catch(e){}
  SS.rng.value=ssValOf(t); ssAria(t); ssDraw(); }
function ssAria(t){ var e=ssAt(t), d=new Date(t), h=(Date.now()-t)/3600000;
  SS.rng.setAttribute('aria-valuetext', h<0.02?'עכשיו':(e?(e.rise?'זריחה':'שקיעה')+', ':'')+'לפני '+(h<1?Math.round(h*60)+' דקות':Math.round(h)+' שעות')+', '+d.getUTCDate()+'.'+(d.getUTCMonth()+1)+' '+pad(d.getUTCHours())+':'+pad(d.getUTCMinutes())+' UTC'); }
function ssInput(){ ssStop(); var t=ssTimeOf(+SS.rng.value), W=ssW||SS.cv.clientWidth||300, px=(SS_T1-SS_T0)/Math.max(30,W-2*SS_PAD);
  if(SS_T1-t<10*px) t=Date.now();                       /* מגנט ל"עכשיו" */
  else if(ssPtr){ var e=ssNear(t); if(e){ if(ssHeld!==e&&navigator.vibrate) try{ navigator.vibrate(8); }catch(er){} ssHeld=e; t=e.t; } else ssHeld=null; }   /* מגנט לזריחה/שקיעה */
  ssGo(t,true); }
/* ניגון: מהזמן שעל הפס (או מלפני יומיים, אם עומדים על עכשיו) עד עכשיו. קצב בסיס ~2 שעות לשנייה;
   ב-40 הדקות שסביב זריחה או שקיעה מאט עד ל-5 דקות לשנייה, ועל הרגע עצמו עוצר לשנייה וחצי */
function ssStop(){ if(ssPlayRaf){ cancelAnimationFrame(ssPlayRaf); ssPlayRaf=0; } clearTimeout(ssHold); ssHold=0; if(SS.play){ SS.play.classList.remove('on'); SS.play.setAttribute('aria-label','נגן את היומיים האחרונים'); } }
function ssPlay(){ if(ssPlayRaf||ssHold){ ssStop(); return; }
  var now=Date.now(), cur=tsLive(); if(now-cur<5*60000) cur=Math.max(SS_T0,ssCovStart());
  ssGo(cur); SS.play.classList.add('on'); SS.play.setAttribute('aria-label','עצירה');
  var t=tsLive(), last=performance.now(), done={};
  SS_EV.forEach(function(e){ if(e.t<=t) done[e.t]=1; });
  (function step(){ var p=performance.now(), dt=Math.min(0.25,(p-last)/1000); last=p;
    var e=null, bd=Infinity; SS_EV.forEach(function(q){ var d=Math.abs(q.t-t); if(d<bd){ bd=d; e=q; } });
    var k=bd<40*60000?(bd/(40*60000)):1, v=7200000*(0.042+0.958*k*k), nt=t+v*dt;
    if(e&&!done[e.t]&&t<e.t&&nt>=e.t){ done[e.t]=1; t=e.t; ssGo(t); ssPlayRaf=0;
      ssHold=setTimeout(function(){ ssHold=0; last=performance.now(); ssPlayRaf=requestAnimationFrame(step); },1500); return; }
    t=nt; if(t>=Date.now()){ ssGo(Date.now()); ssStop(); return; }
    ssGo(t); ssPlayRaf=requestAnimationFrame(step); })(); }
function logBuild(){ if(!ssOK()){ if(SS.box) SS.box.hidden=true; return; }
  if(!SS.box._init){ SS.box._init=1;
    SS.rng.addEventListener('input',ssInput);
    /* המגנט רק באצבע או בעכבר: במקלדת כל לחיצה זזה צעד, ולא נתקעת על הסימן */
    SS.rng.addEventListener('pointerdown',function(){ ssPtr=true; });
    ['pointerup','pointercancel','blur'].forEach(function(n){ SS.rng.addEventListener(n,function(){ ssPtr=false; ssHeld=null; }); });
    SS.rng.addEventListener('dblclick',function(){ ssStop(); ssGo(Date.now()); });
    SS.play.addEventListener('click',ssPlay);
    window.addEventListener('resize',function(){ ssBg=null; ssW=0; ssDraw(); });
    setInterval(function(){ if(document.hidden||!LY_ON.story||ssPlayRaf||ssHold) return; ssSpan(); ssGo(tsLive()); },60000); }
  ssSpan(); SS.rng.value=ssValOf(tsLive()); ssAria(tsLive()); requestAnimationFrame(ssDraw);
  EXO.ss={ev:function(){ return SS_EV; }, go:ssGo, play:ssPlay, stop:ssStop};   /* לבדיקות */ }
function logPaint(){ ssStop(); if(SS.rng) SS.rng.value=1000; ssDraw(); }
function capLog(s,c,ps){ var e=$('capLog'); if(!e) return; var off=(LIVE&&EXO.clockOff)?EXO.clockOff():0, h;
  if(Math.abs(off)<60000){ h='גררו את הפס שלמטה אחורה, עד יומיים: הים, הרוח והאור של אותה שעה. הסימנים הקטנים — זריחה ושקיעה.'; }
  else { var d=new Date(s.now), past=off<0, se=past&&typeof ssAt==='function'?ssAt(s.now):null;
    h=(se?'<b>'+(se.rise?'זריחה':'שקיעה')+'</b> · ':'')+'<b class="n">'+d.getUTCDate()+'.'+(d.getUTCMonth()+1)+' '+pad(d.getUTCHours())+':'+pad(d.getUTCMinutes())+' UTC</b> · '+(past&&ps.src==='archive'?'היה ב־<b class="n">'+dmm(ps.lat,2,'N','S')+' '+dmm(ps.lon,3,'E','W')+'</b>':past?'בערך במקום שבו הוא עכשיו':'הצפוי במקום שבו הוא עכשיו');
    if(c&&!c.missing) h+='<br>רוח <b class="n">'+Math.round(c.wind)+' kn</b> · גל <b class="n">'+c.waveH.toFixed(1)+' m</b> · '+(past?'מהארכיון של מודל מזג האוויר':'תחזית, לא מדידה'); }
  if(e._h!==h){ e._h=h; e.innerHTML=h; } }

/* "האזור" (מנה 5): קצת על המקום שהוא עובר בו. כל פסקה — עובדה ידועה ממקור שמקושר אליה, או ערך ממודל
   שמסומן ככזה. האזורים לפי המרחק מנקודה ידועה (איים) או לפי קווי רוחב ואורך (משטרי רוח), ומה שלא מוגדר — לא מוצג.
   מקורות: ויקיפדיה (Cape Verde, Trindade and Martim Vaz, Trade winds, Intertropical Convergence Zone), NOAA (Why is the ocean blue). */
var AREA=[
  {near:[16.0,-24.0,300], t:'איי כף ורדה', k:'ידוע', src:'https://en.wikipedia.org/wiki/Cape_Verde',
   x:'עשרה איים געשיים, תשעה מהם מיושבים, כ-570 ק״מ מול חוף מערב אפריקה. הגבוה שבהם, הר הגעש פוגו (2,829 מ׳), התפרץ לאחרונה ב-2014. הזרמים הקרים שעולים מול החוף האפריקני לא מגיעים לכאן, ולכן הים סביב האיים חם יותר.'},
  {near:[-20.5,-29.33,400], t:'טרינדאדה', k:'ידוע', src:'https://en.wikipedia.org/wiki/Trindade_and_Martim_Vaz',
   x:'אי געשי קטן של ברזיל, כ-1,100 ק״מ מול החוף שלה. גרים בו רק אנשי חיל הים הברזילאי וקבוצת חוקרים קטנה. הפסגה הגבוהה, פיקו דזז׳אדו, מתנשאת ל-620 מ׳.', gate:'טרינדאדה'},
  {box:[8,35,-60,-10], t:'רוח הסחר', k:'ידוע', src:'https://en.wikipedia.org/wiki/Trade_winds',
   x:'בקווי הרוחב האלה נושבת רוח הסחר: רוח יציבה מצפון־מזרח, שזורמת מהלחץ הגבוה הסובטרופי אל קו המשווה. ספינות מפרש השתמשו בה מאות שנים כדי לחצות את האוקיינוס.'},
  {box:[-3,8,-50,-5], t:'אזור הדממה', k:'ידוע', src:'https://en.wikipedia.org/wiki/Intertropical_Convergence_Zone',
   x:'ליד קו המשווה נפגשות רוחות הסחר מהצפון ומהדרום. המלחים קוראים לאזור הזה "הדממה" בגלל ימים ארוכים כמעט בלי רוח, וענני סערה שמתפרצים בתוכם. המיקום המדויק שלו זז עם העונות.'},
  {box:[-30,-3,-45,10], t:'רוח הסחר הדרומית', k:'ידוע', src:'https://en.wikipedia.org/wiki/Trade_winds',
   x:'מדרום לקו המשווה רוח הסחר נושבת מדרום־מזרח, מהלחץ הגבוה של דרום האטלנטי אל קו המשווה.'}];
/* 24.9: "האזור" התפצל — האיים (near) ב"נקודת ציון", משטרי הרוח (box), הים הכחול וטמפרטורת המים ב"תנאי הטבע" */
function areaHtml(s,kind){ var la=FIX.lat, lo=FIX.lon, h='', n=0, max=(stage.clientWidth<=700&&stage.clientHeight>520)?1:2;
  AREA.forEach(function(a){ if(kind==='near'?!a.near:!a.box) return; var ok=a.near?gcNm(la,lo,a.near[0],a.near[1])<=a.near[2]:(la>=a.box[0]&&la<=a.box[1]&&lo>=a.box[2]&&lo<=a.box[3]);
    if(!ok||n>=max) return; n++;
    h+='<p><span class="t">'+a.t+'</span><span class="k">'+a.k+'</span> '+a.x+(a.gate&&FIX.gate===a.gate?' זו נקודת החובה הבאה במסלול.':'')+' <a href="'+a.src+'" rel="noopener" target="_blank">מקור</a></p>'; });
  if(kind==='near') return h;
  var c=s&&s.cond;
  /* "למה הים כחול" — רק כשאין כאן פסקה מקומית, כדי שהמלל יישאר קצר; טמפרטורת המים תמיד, מסומנת כמודל */
  if(!n) h+='<p><span class="t">למה הים כחול</span><span class="k">ידוע</span> המים בולעים את האור האדום ומשאירים לעין את הכחול. ליד חופים הים מקבל גוון ירוק או חום מחלקיקים ומשקעים שצפים בו. <a href="https://oceanservice.noaa.gov/facts/oceanblue.html" rel="noopener" target="_blank">מקור</a></p>';
  if(c&&!c.missing&&c.seaT!=null) h+='<p>המים כאן: <b class="n">'+Math.round(c.seaT)+'°C</b><span class="k">מודל</span></p>';
  return h; }
function capArea(s){ var e=$('capArea'), f=$('capPosArea'), h;
  if(e&&LY_ON.nat){ h=areaHtml(s,'box'); if(e._h!==h){ e._h=h; e.innerHTML=h; measureTop(); } }
  if(f&&LY_ON.pos){ h=areaHtml(s,'near'); if(f._h!==h){ f._h=h; f.innerHTML=h; measureTop(); } } }

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
    if(!p[2]&&p[0]>=0&&p[0]<=W){ x=p[0]-w/2; y=Math.max(p[1],safeTop+h+26)-h; if(y>Hh*0.7){ e.hidden=true; return; } }
    else { if(safeTop+34>Hh*0.6){ e.hidden=true; return; }      /* מלל רב מדי בראש מסך נמוך: אין מקום לסימן בשפה, ולא מעמיסים אותו על המלל */
      edge=(p[0]<W/2)?-1:1; x=edge<0?m:W-w-m; y=p[2]?Math.max(Hh*0.42,safeTop+34):clamp(p[1],safeTop+34,Hh*0.62); }
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
  var band=Math.max(0,Math.round(h-r.top))+4, st=document.documentElement.style;
  st.setProperty('--botv',band+'px');
  /* 24.9: כשהרדאר פתוח, הסירה ממוסגרת מעליו (המסגור נשען על --bot) */
  var rd=$('radar'); if(rd&&!rd.hidden&&!document.body.classList.contains('g-open')) band=Math.max(band,Math.round(h-rd.getBoundingClientRect().top)+4);
  st.setProperty('--bot',band+'px'); frameOffset(); }
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

/* ================= התפריט =================
   24.9 אחה"צ: "אודות" נבלע ב"שאלות" (בעל האתר: "תכניס את אודות לתוך שאלות"; כלל — הכול נכנס ברוחב, פשוט ומינימלי).
   אין יותר חלונית #menu. setMenu נשאר שם נרדף ל-setFaq, כדי שכל נתיב ישן שפתח או סגר את התפריט
   (הכפתור שבטבעת, פתיחת הגלובוס, "המסע") יפתח או יסגור את "שאלות". menuOpen נשאר false לתמיד. */
var menuBtn=$('menuBtn'), menuOpen=false;
function setMenu(on){ setFaq(on); }
/* הפוקוס עובר לחלונית רק למי שמנווט במקלדת; במגע הוא צייר מסגרת לבנה סביב ה-× */
var kbNav=false; window.addEventListener('keydown',function(){ kbNav=true; },true); window.addEventListener('pointerdown',function(){ kbNav=false; },true);
if(menuBtn) menuBtn.addEventListener('click',function(){ setFaq(!faqOpen); });
/* 23.9 (l19): במסך הראשון התפריט נפתח מהכפתור שבשורת המספרים */
var menuBtn2=$('menuBtn2');
if(menuBtn2) menuBtn2.addEventListener('click',function(){ setFaq(!faqOpen); });
/* l23: העיגול פותח את התפריט — רק אחרי שהמשפט כבר נשאב אליו (נגיעה לפני כן רק שואבת) */
if(keyEl){ keyEl.addEventListener('click',function(ev){ if(!keyed||(ev.detail>0&&!keyArm)) return; keyArm=false;
    /* l23 מנה 3: בגלובוס העיגול מחזיר אל הסירה ופותח את השכבות — הן חיות על ההדמיה */
    if(gOpen){ closeGlobe(false); lyrOpen(true); return; }
    lyrOpen(!lyrIsOpen); }); }
var sndB=$('sndBtn'); if(sndB) sndB.addEventListener('click',function(){ auTried=true; audioSet(!auOn); });
/* ================= "שאלות" (l26, 24.9) =================
   מה שמי שמגיע בפעם הראשונה רוצה לדעת, בשש קבוצות מקופלות, וכל שאלה מקופלת בתוך הקבוצה (בקשת בעל האתר).
   חלונית קריאה ולא שכבה: היא לא מסמנת כלום על ההדמיה. נסגרת מה-×, מ-Escape, וממגע מחוץ לה.
   מ-24.9 אחה"צ גם "אודות" כאן: המקורות ויצירת הקשר בקבוצה "האתר", וההגדרות והרישיון בסוף החלונית.
   האמת: עובדות קבועות — מאתר המרוץ (הכללים, המסלול, דף הסקיפר), ומוויקיפדיה, עם קישור "מקור". exodussail.com (האתר של דני) — רק הפניות, בלי לנסח את דבריו (25.9).
   כל מספר של המרוץ הנוכחי ("עכשיו") נבנה מ-data.js (FIX, FLEET) בכל פתיחה — אין כאן מספר כזה שכתוב ביד. */
var faqEl=$('faq'), faqOpen=false, faqBuilt=false;
function faqN(v){ return '<b class="n">'+thou(v)+'</b>'; }
function faqEsc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }
function faqSrc(u,l){ return ' <a class="src" href="'+u+'" rel="noopener" target="_blank">'+(l||'מקור')+'</a>'; }
function faqMi(d){ return d<1?'פחות ממייל':faqN(d)+' מייל'; }
function faqGap(d){ return 'בהפרש של '+faqMi(d); }
/* i-english-toggle (25.9): EN_ON — הדף באנגלית (window.EXO_LANG מהסקריפט שבראש הדף; en.js מתרגם את כל השאר) */
var EN_ON=window.EXO_LANG==='en';
function faqFixEn(){ var d=new Date(FIX.at*1000), M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], il='';
  try{ il=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jerusalem',hour:'2-digit',minute:'2-digit',hour12:false}).format(d); }catch(e){}
  return d.getUTCDate()+' '+M[d.getUTCMonth()]+', <span class="n" dir="ltr">'+pad(d.getUTCHours())+':'+pad(d.getUTCMinutes())+' UTC</span>'+(il?' ('+il+' in Israel)':''); }
function faqFix(){ var d=new Date(FIX.at*1000), u=d.getUTCDate()+'.'+(d.getUTCMonth()+1)+', <span class="n" dir="ltr">'+pad(d.getUTCHours())+':'+pad(d.getUTCMinutes())+' UTC</span>', il='';
  try{ il=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jerusalem',hour:'2-digit',minute:'2-digit',hour12:false}).format(d); }catch(e){}
  return u+(il?' ('+il+' בישראל)':''); }
var FAQ_NEXT={
  'לנזרוטה':'אחריה — רוח הסחר הצפונית ואיי כף ורדה, ואז אזור הדממה ליד קו המשווה.',
  'טרינדאדה':'בדרך אליה: אזור הדממה ליד קו המשווה — רצועה של רוחות חלשות ומשתנות וענני סערה — ואחריו רוח הסחר הדרומית־מזרחית. אחרי טרינדאדה המסלול פונה מזרחה, אל כף התקווה הטובה והים הדרומי.',
  'כף התקווה הטובה':'אחרי הכף מתחיל הים הדרומי: האוקיינוס ההודי, רוחות מערביות חזקות וגלים ארוכים, עד כף לואין שבאוסטרליה.',
  'כף לואין':'אחריה — דרום אוסטרליה, ושער קצר ליד הובארט שבטסמניה.',
  'הובארט':'שער קצר ליד טסמניה, בלי מגע עם אף אחד. אחריו — האוקיינוס השקט, הקטע הארוך והמבודד במסלול, עד כף הורן.',
  'כף הורן':'אחרי הכף הדרך פונה צפונה, לאורך האטלנטי, הביתה.'};
function faqData(){
  var N=FLEET.length, mi=-1, i;
  for(i=0;i<N;i++) if(FLEET[i][0]===FIX.rank) mi=i;
  var me=FLEET[mi]||null, up=mi>0?FLEET[mi-1]:null, dn=(mi>=0&&mi<N-1)?FLEET[mi+1]:null, lead=FLEET[0];
  var gate=FIX.gate||'', rest=FIX.dtf-FIX.toGate, lg=gate?'ל'+gate:'לנקודת החובה הבאה';
  var near50=0; FLEET.forEach(function(r){ if(r[0]!==FIX.rank&&!r[7]&&Math.abs(r[5]-FIX.dtf)<=50) near50++; });
  /* דוגמה חיה ל"עיגולים": הסירה הצמודה אליו בטבלה, והמרחק ביניהן בים */
  var tw=null; FLEET.forEach(function(r){ if(r[0]===FIX.rank||r[7]) return; var dd=Math.abs(r[5]-FIX.dtf); if(!tw||dd<tw.dd) tw={n:r[4],dd:dd,sea:gcNm(FIX.lat,FIX.lon,r[2],r[3])}; });
  var near=(FIX.nearLand!=null&&FIX.nearLand<=200&&FIX.nearLandName&&FIX.nearLandName!=='החוף הקרוב');
  var S1='https://en.wikipedia.org/wiki/Sunday_Times_Golden_Globe_Race', RT='https://goldengloberace.com/the-route/', RU='https://goldengloberace.com/the-rules/',
      SK='https://goldengloberace.com/skippers/daniel-pinsky/', EX='https://exodussail.com/';
  if(EN_ON&&window.EXO_EN) return EXO_EN.faq({FIX:FIX,N:N,me:me,up:up,dn:dn,lead:lead,gate:gate,rest:rest,near50:near50,tw:tw,near:near,ocean:oceanHe(FIX.lat,FIX.lon),
    pos:dmm(FIX.lat,2,'N','S')+' '+dmm(FIX.lon,3,'E','W'),cog:deg3(FIX.cog),faqN:faqN,faqEsc:faqEsc,faqSrc:faqSrc,fixEn:faqFixEn()});
  return [
  {t:'המרוץ', q:[
    ['מה זה הגולדן גלוב?','מרוץ הקפת עולם ביחידים, בלי עצירה ובלי עזרה מבחוץ, בסירות ובכלים שהיו קיימים ב־1968. הוא משחזר את מרוץ ״גלובוס הזהב״ של העיתון סאנדיי טיימס מאותה שנה: תשעה יצאו, ורק אחד סיים — רובין נוקס־ג׳ונסטון, אחרי 312 ימים בים על הסירה סוהאילי. הוא היה האדם הראשון שהקיף את העולם לבד בלי לעצור. המרוץ חודש ב־2018, במלאת 50 שנה, וזו המהדורה השלישית שלו.'+faqSrc(S1)],
    ['מתי יצאו, ומאיפה?','ב־6 בספטמבר 2026, בצהריים, מלה סאבל־ד׳אולון שבחוף האטלנטי של צרפת. יצאו '+faqN(N)+' סירות, ושם גם נמצא קו הסיום.'],
    ['מה המסלול?','מזרחה סביב העולם, כששלושת הכפים הגדולים — התקווה הטובה, לואין והורן — נשארים משמאל. דרומה לאורך האטלנטי דרך שתי נקודות חובה: לנזרוטה שבאיים הקנריים, והאי טרינדאדה מול ברזיל. משם מזרחה סביב כף התקווה הטובה, לרוחב האוקיינוס ההודי ומצפון לאיי קרוזה וקרגלן, סביב כף לואין שבאוסטרליה, אל שער קצר ליד הובארט שבטסמניה. אחר כך לרוחב האוקיינוס השקט, סביב כף הורן, וצפונה הביתה. בדרום יש קווי רוחב שאסור לרדת מתחתם — 45° באוקיינוס ההודי ו־46° בשקט — מטעמי בטיחות; חצייה עולה בעונש זמן.'+faqSrc(RT)],
    ['כמה ארוך המסלול?','המארגנים מעריכים כ־30,000 מייל ימי של שייט. קו המסלול של המעקב, שמחבר את נקודות החובה בקווים הקצרים ביותר, קצר יותר: '+faqN(Math.round(FIX.totalNm/100)*100)+' מייל. ההפרש הוא הדרך האמיתית — אף סירה לא שטה בקו ישר, כי הרוח לא נושבת לפי המפה.'+faqSrc(RT)],
    ['כמה זמן זה לוקח?','לראשונים — שבעה עד שמונה חודשים. ז׳אן־לוק ואן דן הדה ניצח ב־2018 אחרי כ־212 ימים, וקירסטן נוישפר ניצחה ב־2022 אחרי כ־234 ימים, האישה הראשונה שניצחה בגולדן גלוב. הסיום של המרוץ הזה צפוי בין אפריל ליוני 2027.'+faqSrc('https://en.wikipedia.org/wiki/2022_Golden_Globe_Race')],
    ['כמה מצליחים לסיים?','מעטים. ב־1968 סיים אחד מתוך תשעה. ב־2018 סיימו חמישה מתוך 18, ועוד אחד במחלקת צ׳יצ׳סטר (ראו ״הכללים״). ב־2022 סיימו שלושה מתוך 16, ועוד שניים במחלקת צ׳יצ׳סטר.'+faqSrc('https://en.wikipedia.org/wiki/2018_Golden_Globe_Race')],
    ['במה זה שונה מהוונדה גלוב?','הוונדה גלוב יוצא מאותו נמל, והוא הקצה השני: סירות מרוץ מודרניות של 60 רגל עם כנפי ריחוף, ניווט לווייני ותחזיות בזמן אמת. השיא שם, מ־2024–25, הוא כ־65 ימים. בגולדן גלוב אותה הקפה לוקחת פי שלושה ויותר, והמבחן הוא סבולת, ניווט ותחזוקה — לא מהירות.'+faqSrc('https://en.wikipedia.org/wiki/2024%E2%80%932025_Vend%C3%A9e_Globe')]]},
  {t:'הכללים', q:[
    ['אילו סירות מותרות?','סירות מפרש באורך 32 עד 36 רגל (כ־10 עד 11 מ׳), מדגם שתוכנן לפני 1988 ונבנה בלפחות 20 עותקים, עם שדרית מלאה — סנפיר שנמשך לכל אורך התחתית — והגה שמחובר לקצה האחורי שלה. אלה סירות כבדות ויציבות, איטיות בהרבה מסירות מרוץ, ובנויות לספוג ולא להישבר.'+faqSrc(RU)],
    ['למה בלי GPS, ואיך מנווטים?','כי מותר רק מה שהיה אפשרי ב־1968. מנווטים עם סקסטנט — מכשיר שמודד את הזווית בין השמש, הירח או כוכב לבין קו האופק — ועם שעון מדויק, טבלאות ומפות נייר. מהזווית ומהשעה מחשבים ביד את המיקום, כשהשמים פתוחים. בימים מעוננים מנווטים בהערכה: כיוון, מהירות והזמן שעבר מאז התצפית האחרונה.'+faqSrc(RU)],
    ['אז איך אנחנו יודעים איפה הוא?','על הסירה מותקן משדר מעקב לווייני של המרוץ, עם GPS משלו, שמשדר את המיקום לחוף. הוא סגור בפני המלח: דניאל לא רואה את מה שהמשדר שולח. מהמשדר הזה מגיעים כל המיקומים באתר.'+faqSrc(RU)],
    ['עם מי מותר לו לדבר?','עם מטה המרוץ — בטלפון לווייני ידני ובמכשיר הודעות קצרות, לבטיחות ולדיווח. ברדיו מותר לו לדבר עם משפחה, עם עיתונאים ועם סירות אחרות. אסור לו לקבל ניתוב: עצה אישית מבחוץ לאן להפליג לפי מזג האוויר.'+faqSrc(RU)],
    ['מה קורה אם משהו נשבר?','הוא מתקן לבד, במה שיש על הסירה. עגינה, קבלת ציוד או עזרה של מישהו אחר נחשבות ״עצירה״. לחירום יש על הסירה ציוד בטיחות מודרני וקופסה חתומה עם GPS וטלפון לווייני. מותר לשבור את החותם, אבל מי שעושה זאת יוצא מהדירוג הראשי.'+faqSrc(RU)],
    ['מה זו מחלקת צ׳יצ׳סטר?','מי שעוצר פעם אחת, או שובר את החותם של קופסת החירום, עובר למחלקה שנקראת על שם פרנסיס צ׳יצ׳סטר, שהקיף את העולם לבד ב־1966–67 עם עצירה אחת בסידני. הוא יכול להמשיך ולסיים, אבל כבר לא מתחרה על הניצחון. עצירה שנייה מוציאה מהמרוץ.'+faqSrc(RU)]]},
  {t:'דניאל ואקסודוס', q:[
    ['מי זה דניאל פינסקי?','ישראלי, בן 35 לפי אתר המרוץ, והישראלי הראשון שמשתתף בגולדן גלוב. בגיל 14 התחיל בפנימייה הימית בעכו, שירת במשמר החופים של חיל הים ולמד הנדסת מכונות. הוא ימאי מסעות שחי על סירה, ועבר יותר מ־20,000 מייל בכמה אוקיינוסים — ובהם הקפה מלאה של האטלנטי בשנים 2021–2024: מישראל דרך הים התיכון אל הקריביים, מרכז ודרום אמריקה, וחזרה לאירופה.'+faqSrc(SK,'אתר המרוץ')+' ·'+faqSrc('https://www.jns.org/news/israel-news/daniel-pinksy-becomes-first-israeli-sailor-to-embark-on-250-day-global-race','JNS')],
    ['למה הוא יוצא למרוץ הזה?','לדבריו, כדי לייצג את ישראל ולבחון את הגבולות שלו — ״לראות מי אני נהיה כשלא נשאר כלום חוץ מהרוח, הגלים וכוח הרצון״.'+faqSrc(SK)],
    ['איזו סירה זו?','<span dir="ltr">Baba 35</span> שנבנתה ב־1980, בתכנון של האדריכל הימי רוברט פרי: 10.67 מ׳ אורך ו־3.51 מ׳ רוחב. סירת מסעות, לא סירת מרוץ — גוף כבד, שדרית מלאה, ירכתיים מחודדות כמו החרטום והרבה עץ. דניאל קנה אותה באוקטובר 2025 ושיפץ אותה בקריביים ובצרפת. מספר המפרש שלה 07.'+faqSrc(SK)],
    ['למה קוראים לה אקסודוס?','דני מספר על זה בעצמו, <a href="'+EX+'" rel="noopener" target="_blank">באתר שלו ←</a>']]},
  {t:'המצב עכשיו', q:[
    ['איפה הוא עכשיו?',(near?'מול '+faqEsc(FIX.nearLandName)+', '+faqN(FIX.nearLand)+' מייל מהיבשה הקרובה':oceanHe(FIX.lat,FIX.lon))+', ב־<b class="n" dir="ltr">'+dmm(FIX.lat,2,'N','S')+' '+dmm(FIX.lon,3,'E','W')+'</b>.'+' בנקודת הציון האחרונה שט <b class="n">'+FIX.sog.toFixed(1)+'</b> קשר, לכיוון <b class="n">'+deg3(FIX.cog)+'</b>.'],
    ['באיזה מקום הוא?','מקום '+faqN(FIX.rank)+' מתוך '+faqN(N)+', לפי המרחק שנשאר לו עד הסיום (ראו ״איך מודדים״).'+
      (up?' לפניו '+faqEsc(up[4])+', '+faqGap(me[5]-up[5])+(dn?';':'.'):'')+(dn?' אחריו '+faqEsc(dn[4])+', '+faqGap(dn[5]-me[5])+'.':'')+
      (near50>=2?' '+faqN(near50)+' סירות נמצאות עד 50 מייל ממנו בטבלה, ולכן המקום יכול להתחלף בכל עדכון.':'')],
    ['כמה רחוק הוא מהמוביל?',FIX.rank===1?'הוא המוביל.'+(dn?' '+faqEsc(dn[4])+' אחריו, '+faqGap(dn[5]-me[5])+'.':''):faqN(FIX.dtf-lead[5])+' מייל במרחק לסיום אחרי '+faqEsc(lead[4])+', שמוביל את הצי.'],
    ['כמה הוא כבר עבר, וכמה נשאר?','זה היום ה־'+FIX.dayN+' של המרוץ. מהזינוק הוא שט '+faqN(FIX.sailed)+' מייל לפי נקודות הציון — בפועל קצת יותר, כי בין נקודה לנקודה הוא לא שט בקו ישר. לפי המעקב נשארו '+faqN(FIX.dtf)+' מייל. ב־24 השעות האחרונות התקרב לסיום ב־'+faqN(FIX.dmg24)+' מייל.'],
    ['איך הוא ביחס לזוכים הקודמים?',(typeof FIX.ghost==='number')?'המעקב הרשמי משדר גם את המסלול של קירסטן נוישפר, המנצחת ב־2022, על השעון של המרוץ הזה. באותו רגע במרוץ שלה, דניאל '+faqN(Math.abs(FIX.ghost))+' מייל '+(FIX.ghost>=0?'לפניה':'אחריה')+' במרחק לסיום. רוב הדרך, והים הדרומי, עוד לפניו.':'ההשוואה לזוכה הקודמת לא זמינה בעדכון הזה.'],
    ['מה מחכה לו בהמשך?',(gate?'נקודת החובה הבאה: '+faqEsc(gate)+', '+faqN(FIX.toGate)+' מייל בקו ישר. '+(FAQ_NEXT[gate]||''):'')+'']]},
  {t:'איך מודדים', q:[
    ['איך נקבע המקום?','לפי המרחק שנשאר עד הסיום — <span dir="ltr">DTF, Distance To Finish</span> — ולא לפי מי שנראה מקדימה במפה. המעקב מודד קו ישר מהסירה אל נקודת החובה הבאה, ומוסיף את אורך שאר המסלול, שזהה לכולם.'+
      (gate?' אצל דניאל עכשיו: '+faqN(FIX.toGate)+' מייל עד '+faqEsc(gate)+', ועוד '+faqN(rest)+' מייל של שאר המסלול — '+faqN(FIX.dtf)+' מייל בסך הכול. בפועל, מי שקרוב יותר '+faqEsc(lg)+' בקו ישר — מקדים.':'')],
    ['למה במפה נראה שמישהו מאחור, והוא בכל זאת לפני?','דמיינו עיגולים סביב '+(gate?faqEsc(gate):'נקודת החובה הבאה')+', כמו טבעות במים. מי שנמצא על עיגול קטן יותר מקדים — גם אם במפה הוא נראה צפוני יותר או רחוק מהשאר. לכן שתי סירות יכולות להיות רחוקות זו מזו בים, ובכל זאת צמודות בטבלה.'+
      (tw&&tw.sea>=40&&tw.sea>=4*tw.dd?' עכשיו, למשל: דניאל ו'+faqEsc(tw.n)+' רחוקים זה מזה '+faqN(tw.sea)+' מייל בים, וההפרש ביניהם בטבלה — '+faqMi(tw.dd)+'.':'')],
    ['כל כמה זמן המיקום מתעדכן?','המשדר שולח נקודת ציון בערך כל ארבע שעות, וכל סירה בשעה אחרת. האתר מתעדכן לבד, תוך כחצי שעה מהגעת נקודה חדשה של אקסודוס, ובודק את עצמו מול הלוח הרשמי. זה לא שידור חי: המספרים הם תמונת מצב של הנקודה האחרונה — כאן, '+faqFix()+'. ומכיוון שכל סירה מדווחת בשעה אחרת, המקום בטבלה יכול לקפוץ בין עדכונים גם כשההבדלים במים קטנים.'],
    ['מה זה מייל ימי וקשר?','מייל ימי הוא 1.852 ק״מ — דקה אחת של קו רוחב, ולכן זו יחידת המידה של הניווט. קשר הוא מייל ימי לשעה: 6 קשר הם כ־11 קמ״ש. לסירה כמו אקסודוס, 150 מייל ביממה הם יום טוב מאוד.'],
    ['האם דניאל יודע באיזה מקום הוא?','לא ישירות. המעקב סגור בפניו, והוא לא רואה את המפה והטבלה שאתם רואים. מה שהוא יודע על שאר הצי מגיע מהקשר עם מטה המרוץ ומשיחות ברדיו.'+faqSrc(RU)]]},
  {t:'האתר', q:[
    ['איך משתמשים באתר?','הדף הוא הדמיה של דניאל והסירה, במקום ובשעה האמיתיים. גוררים באצבע כדי להסתכל סביב — גם מתחת למים. העיגול בפינה פותח חמש קטגוריות, וכל אחת מוסיפה משהו להדמיה: נקודת ציון (איפה הוא), תנאי הטבע (רוח, גל וזרם, כל אחד עם מתג), המרוץ (רדאר של הסירות סביבו), הדרך קדימה (כמה נשאר והתחזית) והמסע (הים והרוח בשעות שעברו, הצי ו־24 השעות הקרובות). כאן, ב״שאלות״, יש גם הגדרות: קול, מצב קל והתקנה כאפליקציה. התרחקות — צביטה באצבעות או גלגלת בעכבר — מובילה עד הגלובוס עם כל הצי.'],
    ['מה אני רואה — זה צילום?','לא. זה שחזור: המיקום מהמשדר, והרוח, הגלים, הזרם והעננים ממודל מזג אוויר לאותה נקודה ולאותה שעה. השמש והכוכבים מחושבים לפי המקום והזמן, והסירה מצוירת לפי תצלומים של אקסודוס. שום דבר כאן לא נמדד על הסירה עצמה.'],
    ['קפה לבונה האתר','יומן אקסודוס הוא אתר עצמאי, לא רשמי, בלי קשר לדניאל או לצוות שלו. הקפה כאן הוא לבונה האתר. רוצים לתמוך בדני ובמסע עצמו? זה נעשה <a href="https://exodussail.com/support/" rel="noopener" target="_blank">באתר של הצוות שלו</a> — יש שם גם עדכונים שוטפים, הסברים מהקהילה והסיפור של דני במילים שלו.'+'<br><a class="cup-go" href="https://buymeacoffee.com/exodus.log" rel="noopener" target="_blank">לקנות קפה לבונה האתר ←</a>','faqCup'],
    ['מי עומד מאחורי האתר, ואיך יוצרים קשר?','יומן אקסודוס הוא אתר עצמאי ולא רשמי, בלי קשר למרוץ, לדניאל או לצוות שלו. רוצים לתמוך בדני ובמסע עצמו? זה נעשה <a href="https://exodussail.com/support/" rel="noopener" target="_blank">באתר של הצוות שלו</a>, ויש שם גם עדכונים שוטפים, הסברים מהקהילה והסיפור של דני במילים שלו. הקוד של האתר הזה פתוח, ברישיון MIT. הערות, טעויות ורעיונות — <a href="https://github.com/exodus-log/exodus-log/issues" rel="noopener" target="_blank">דרך GitHub</a>.'],
    ['איך האתר עובד?','<style>.xh-wrap svg{width:100%;height:auto;display:block}</style>'+
      '<span class="xh-wrap" style="display:block;margin:2px 0 4px"><svg viewBox="0 0 400 140" role="img" aria-label="חמש דמויות על סיפון קטן, בין תורן וארגזים"><g transform="translate(400,0) scale(-1,1)">'+
      '<rect width="400" height="140" fill="#050d13"/>'+
      '<circle cx="358" cy="20" r="9" fill="#e7c25a" opacity=".85"/><circle cx="40" cy="14" r="1.3" fill="#cfe3ea" opacity=".6"/><circle cx="90" cy="26" r="1" fill="#cfe3ea" opacity=".5"/><circle cx="260" cy="12" r="1.2" fill="#cfe3ea" opacity=".55"/>'+
      '<rect x="346" y="34" width="2.4" height="62" fill="#324a56"/><rect x="326" y="44" width="46" height="1.8" fill="#324a56"/><path d="M348 44 L348 60 L374 52 Z" fill="#2b4048"/>'+
      '<rect x="16" y="76" width="16" height="16" fill="#5c4326" stroke="#3c2c19" stroke-width="1"/><rect x="30" y="83" width="13" height="11" fill="#6b4e2c" stroke="#3c2c19" stroke-width="1"/>'+
      '<circle cx="270" cy="97" r="7" fill="none" stroke="#8a6a3c" stroke-width="2"/><circle cx="270" cy="97" r="3.4" fill="none" stroke="#8a6a3c" stroke-width="1.4"/>'+
      '<rect y="96" width="400" height="7" fill="#4a3722"/><rect y="96" width="400" height="1.6" fill="#6b4e2c"/>'+
      '<rect y="103" width="400" height="37" fill="#0d2430"/>'+
      '<path d="M-50 108 q12 -6 24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0" fill="none" stroke="#214a58" stroke-width="2.2" opacity=".6"><animateTransform attributeName="transform" type="translate" values="0,0; -48,0" dur="7s" repeatCount="indefinite"/></path>'+
      '<path d="M-50 116 q12 7 24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0" fill="none" stroke="#162f3a" stroke-width="2.2" opacity=".55"><animateTransform attributeName="transform" type="translate" values="0,0; -48,0" dur="10s" repeatCount="indefinite"/></path>'+
      '</g><g transform="translate(340,56.5) scale(2.5)"><g><animateTransform attributeName="transform" type="translate" values="0,0; 0,-1.2; 0,0" dur="2.6s" begin="0s" repeatCount="indefinite"/>'+
      '<rect x="6" y="4" width="4" height="1" fill="#43d6cf"/><rect x="5" y="5" width="6" height="6" rx="1" fill="#6fe3da"/><rect x="4" y="7" width="1" height="4" fill="#6fe3da"/><rect x="11" y="7" width="1" height="4" fill="#6fe3da"/><rect x="4" y="11" width="8" height="4" fill="#3fb5af"/>'+
      '<rect x="6" y="7" width="1.4" height="1.4" fill="#0c2226"><animate attributeName="opacity" values="1;1;0.15;1" keyTimes="0;0.88;0.94;1" dur="4.4s" begin="0.2s" repeatCount="indefinite"/></rect>'+
      '<rect x="8.6" y="7" width="1.4" height="1.4" fill="#0c2226"><animate attributeName="opacity" values="1;1;0.15;1" keyTimes="0;0.88;0.94;1" dur="4.4s" begin="0.2s" repeatCount="indefinite"/></rect>'+
      '<rect x="2" y="10" width="2" height="1" fill="#e7c25a"/><rect x="1" y="9" width="1" height="3" fill="#e7c25a"/></g></g>'+
      '<text x="360" y="128" text-anchor="middle" font-family="Heebo,Assistant,sans-serif" font-size="10" fill="#879caa">הנווט</text>'+
      '<g transform="translate(260,56.5) scale(2.5)"><g><animateTransform attributeName="transform" type="translate" values="0,0; 0,-1.2; 0,0" dur="2.6s" begin="0.35s" repeatCount="indefinite"/>'+
      '<rect x="4" y="3" width="8" height="2" fill="#c98b3f"/><rect x="3" y="5" width="10" height="1" fill="#c98b3f"/><rect x="5" y="6" width="6" height="5" rx="1" fill="#6fe3da"/><rect x="4" y="8" width="1" height="4" fill="#6fe3da"/><rect x="11" y="8" width="1" height="4" fill="#6fe3da"/><rect x="4" y="12" width="8" height="3" fill="#3fb5af"/>'+
      '<rect x="6" y="8" width="1.4" height="1.4" fill="#0c2226"><animate attributeName="opacity" values="1;1;0.15;1" keyTimes="0;0.88;0.94;1" dur="4.4s" begin="1.4s" repeatCount="indefinite"/></rect>'+
      '<rect x="8.6" y="8" width="1.4" height="1.4" fill="#0c2226"><animate attributeName="opacity" values="1;1;0.15;1" keyTimes="0;0.88;0.94;1" dur="4.4s" begin="1.4s" repeatCount="indefinite"/></rect>'+
      '<rect x="12" y="9" width="1" height="4" fill="#8a5a2e"/><rect x="11" y="9" width="3" height="1.4" fill="#b9bfc4"/></g></g>'+
      '<text x="280" y="128" text-anchor="middle" font-family="Heebo,Assistant,sans-serif" font-size="10" fill="#879caa">הנגר</text>'+
      '<g transform="translate(180,56.5) scale(2.5)"><g><animateTransform attributeName="transform" type="translate" values="0,0; 0,-1.2; 0,0" dur="2.6s" begin="0.7s" repeatCount="indefinite"/>'+
      '<rect x="5" y="2" width="6" height="2" fill="#7a86c9"/><rect x="5" y="5" width="6" height="5" rx="1" fill="#6fe3da"/><rect x="4" y="7" width="1" height="4" fill="#6fe3da"/><rect x="11" y="7" width="1" height="4" fill="#6fe3da"/><rect x="4" y="11" width="8" height="4" fill="#3fb5af"/>'+
      '<rect x="6" y="7" width="1.4" height="1.4" fill="#0c2226"><animate attributeName="opacity" values="1;1;0.15;1" keyTimes="0;0.88;0.94;1" dur="4.4s" begin="0.6s" repeatCount="indefinite"/></rect>'+
      '<rect x="8.6" y="7" width="1.4" height="1.4" fill="#0c2226"><animate attributeName="opacity" values="1;1;0.15;1" keyTimes="0;0.88;0.94;1" dur="4.4s" begin="0.6s" repeatCount="indefinite"/></rect>'+
      '<rect x="1" y="9" width="3" height="3" fill="none" stroke="#dfe6ea" stroke-width="0.6"/><rect x="0" y="12" width="1.4" height="1.4" fill="#dfe6ea" transform="rotate(45 0.7 12.7)"/></g></g>'+
      '<text x="200" y="128" text-anchor="middle" font-family="Heebo,Assistant,sans-serif" font-size="10" fill="#879caa">הבודק</text>'+
      '<g transform="translate(100,56.5) scale(2.5)"><g><animateTransform attributeName="transform" type="translate" values="0,0; 0,-1.2; 0,0" dur="2.6s" begin="1.05s" repeatCount="indefinite"/>'+
      '<path d="M4 3 a4 4 0 1 0 6 5 a5 5 0 0 1 -6 -5 Z" fill="#8592a0"/><rect x="5" y="5" width="6" height="5" rx="1" fill="#6fe3da"/><rect x="4" y="7" width="1" height="4" fill="#6fe3da"/><rect x="11" y="7" width="1" height="4" fill="#6fe3da"/><rect x="4" y="11" width="8" height="4" fill="#3fb5af"/>'+
      '<rect x="6" y="7" width="1.4" height="1.4" fill="#0c2226"><animate attributeName="opacity" values="1;1;0.15;1" keyTimes="0;0.88;0.94;1" dur="4.4s" begin="2.1s" repeatCount="indefinite"/></rect>'+
      '<rect x="8.6" y="7" width="1.4" height="1.4" fill="#0c2226"><animate attributeName="opacity" values="1;1;0.15;1" keyTimes="0;0.88;0.94;1" dur="4.4s" begin="2.1s" repeatCount="indefinite"/></rect>'+
      '<rect x="11.4" y="9.6" width="1.6" height="2" fill="#e7c25a"/><rect x="11.9" y="9" width="0.6" height="0.8" fill="#e7c25a"/></g></g>'+
      '<text x="120" y="128" text-anchor="middle" font-family="Heebo,Assistant,sans-serif" font-size="10" fill="#879caa">שומר הלילה</text>'+
      '<g transform="translate(20,56.5) scale(2.5)"><g><animateTransform attributeName="transform" type="translate" values="0,0; 0,-1.2; 0,0" dur="2.6s" begin="1.4s" repeatCount="indefinite"/>'+
      '<path d="M4.5 3.6 a3.5 2.6 0 0 1 7 0 Z" fill="#25404d"/><rect x="3.5" y="3.6" width="9" height="1" fill="#182a33"/><rect x="7.3" y="2.15" width="1.4" height="1.4" fill="#e7c25a"/><rect x="5" y="5.6" width="6" height="5" rx="1" fill="#6fe3da"/><rect x="4" y="7.6" width="1" height="4" fill="#6fe3da"/><rect x="11" y="7.6" width="1" height="4" fill="#6fe3da"/><rect x="4" y="11.6" width="8" height="4" fill="#3fb5af"/>'+
      '<rect x="6" y="7.6" width="1.4" height="1.4" fill="#0c2226"><animate attributeName="opacity" values="1;1;0.15;1" keyTimes="0;0.88;0.94;1" dur="4.4s" begin="3s" repeatCount="indefinite"/></rect>'+
      '<rect x="8.6" y="7.6" width="1.4" height="1.4" fill="#0c2226"><animate attributeName="opacity" values="1;1;0.15;1" keyTimes="0;0.88;0.94;1" dur="4.4s" begin="3s" repeatCount="indefinite"/></rect>'+
      '<circle cx="13.1" cy="10.6" r="2" fill="none" stroke="#dfe6ea" stroke-width="0.6"/><circle cx="13.1" cy="10.6" r="0.45" fill="#dfe6ea"/><line x1="13.1" y1="8.7" x2="13.1" y2="12.5" stroke="#dfe6ea" stroke-width="0.5"/><line x1="11.3" y1="9.5" x2="14.9" y2="11.7" stroke="#dfe6ea" stroke-width="0.5"/><line x1="11.3" y1="11.7" x2="14.9" y2="9.5" stroke="#dfe6ea" stroke-width="0.5"/></g></g>'+
      '<text x="40" y="128" text-anchor="middle" font-family="Heebo,Assistant,sans-serif" font-size="10" fill="#879caa">הקברניט</text>'+
      '</svg></span>'+
      '<span style="display:block;margin-top:8px">יומן אקסודוס מפליג ומנווט באוקיינוס המידע. <b>הנווט</b> מביא דיווחים טריים ממקורות פתוחים בעולם – מי בדיוק, אפשר לראות למטה ב״מאיפה הנתונים״. <b>הנגר</b> בונה ומתקן את מה שאתם רואים על המסך, ו<b>הבודק</b> עובר על כל שינוי ובוחן אותו לפני שהוא יוצא לאוויר. <b>שומר הלילה</b> עובד דווקא כשכולם ישנים, במשמרות ארוכות; ו<b>הקברניט</b> עושה כל בוקר סיבוב על הסיפון, מוודא שהכל כשורה ושהסירה מפליגה לכיוון הנכון.</span>'],
    ['מאיפה הנתונים?','מיקומים — <a href="https://pro.yb.tl/ggr2026/" rel="noopener" target="_blank">המעקב הרשמי של המרוץ</a> (YB Tracking). דיווחים — <a href="https://goldengloberace.com/" rel="noopener" target="_blank">אתר המרוץ</a>. רוח, גלים וזרמים — <a href="https://open-meteo.com/" rel="noopener" target="_blank">Open-Meteo</a>, מודל ולא מדידה בסירה. כדור הארץ — NASA Blue Marble; קו החוף — Natural Earth; המפה — MapLibre. הכוכבים — קטלוג הכוכבים הבהירים של ייל; הירח — <a href="https://svs.gsfc.nasa.gov/4720" rel="noopener" target="_blank">NASA\'s Scientific Visualization Studio</a> (LRO); שביל החלב — <a href="https://www.eso.org/public/images/eso0932a/" rel="noopener" target="_blank">ESO/S. Brunier</a>, ברישיון <a href="https://creativecommons.org/licenses/by/4.0/" rel="noopener" target="_blank">CC BY 4.0</a>. צבע השמיים מחושב מפיזור האור באוויר, לא מצולם. ועל דניאל: <a href="'+SK+'" rel="noopener" target="_blank">הדף שלו באתר המרוץ</a>.']]}
  ]; }
function faqBuild(){ if(faqBuilt||!faqEl) return; faqBuilt=true;
  var h=''; faqData().forEach(function(g){ h+='<details class="g"><summary>'+g.t+' <span class="c">'+g.q.length+'</span></summary><div>';
    g.q.forEach(function(q){ h+='<details class="q"'+(q[2]?' id="'+q[2]+'"':'')+'><summary>'+q[0]+'</summary><p>'+q[1]+'</p></details>'; }); h+='</div></details>'; });
  $('faqBody').innerHTML=h;
  $('faqS').innerHTML=EN_ON?'About the race, Daniel and this site. Today’s numbers are from the position fix of '+faqFixEn()+'.':'על המרוץ, על דניאל ועל האתר. המספרים של עכשיו — מנקודת הציון של '+faqFix()+'.'; }
function setFaq(on){ faqOpen=!!on; if(!faqEl) return; if(on){ faqBuild(); if(wordsOpen) setWords(false); }
  faqEl.hidden=!on; document.body.classList.toggle('faq-open',faqOpen);
  [$('bFaq'),menuBtn,menuBtn2].forEach(function(b){ if(b) b.setAttribute('aria-expanded',on?'true':'false'); });
  if(on&&kbNav){ var f=faqEl.querySelector('summary'); if(f) try{ f.focus({preventScroll:true}); }catch(e){} } }
if(faqEl){ $('faqX').addEventListener('click',function(){ setFaq(false); ($('bFaq')||keyEl).focus(); });
  document.addEventListener('pointerdown',function(ev){ if(faqOpen&&!faqEl.contains(ev.target)&&![$('bFaq'),keyEl,menuBtn,menuBtn2].some(function(b){ return b&&b.contains(ev.target); })) setFaq(false); },true); }
/* ================= g01 (24.9): "מילים לדניאל" — חלונית עם טופס קצר. נפתחת מ"הסיפור", נסגרת מה-×, מ-Escape וממגע בחוץ.
   השרת (functions/api/words.js) שומר את הזמן ואת מקום הסירה בעצמו, מ-data.js, ולא סומך על הדפדפן ================= */
var wordsEl=$('words'), wordsOpen=false;
function setWords(on){ wordsOpen=!!on; if(!wordsEl) return; if(on&&faqOpen) setFaq(false);
  wordsEl.hidden=!on; document.body.classList.toggle('words-open',wordsOpen);
  var b=$('bWords'); if(b) b.setAttribute('aria-expanded',on?'true':'false');
  if(on){ var t=$('wordsTx'); if(t&&kbNav) try{ t.focus({preventScroll:true}); }catch(e){} } }
if(wordsEl){
  $('bWords').addEventListener('click',function(){ setWords(!wordsOpen); });
  $('wordsX').addEventListener('click',function(){ setWords(false); $('bWords').focus(); });
  document.addEventListener('pointerdown',function(ev){ if(wordsOpen&&!wordsEl.contains(ev.target)&&!$('bWords').contains(ev.target)) setWords(false); },true);
  var wTx=$('wordsTx'), wGo=$('wordsGo'), wMsg=$('wordsMsg');
  wTx.addEventListener('input',function(){ $('wordsC').textContent=wTx.value.length+'/500'; });
  $('wordsF').addEventListener('submit',function(ev){ ev.preventDefault();
    var text=wTx.value.trim(); if(text.length<2){ wMsg.textContent='צריך לכתוב משהו קודם.'; wTx.focus(); return; }
    wGo.disabled=true; wMsg.textContent='שולח…';
    fetch('/api/words',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:text,name:$('wordsNm').value.trim(),hp:$('wordsHp').value})})
      .then(function(r){ return r.json().then(function(j){ return {ok:r.ok,j:j}; }); })
      .then(function(x){ if(x.ok&&x.j&&x.j.ok){ wTx.value=''; $('wordsC').textContent='0/500'; wMsg.textContent='נשמר. תודה.'; }
        else wMsg.textContent=(x.j&&x.j.error==='limit')?'אפשר לשלוח עד חמש הודעות ביום. מחר שוב.':'לא נשמר. אפשר לנסות שוב בעוד רגע.'; })
      .catch(function(){ wMsg.textContent='לא נשמר — אין חיבור. אפשר לנסות שוב.'; })
      .then(function(){ wGo.disabled=false; });
  });
}
/* ================= i-english-toggle (25.9): החלפת שפה — נשמרת, והדף נטען מחדש (en.js נטען רק באנגלית) ================= */
function langSet(l){ try{ localStorage.setItem('exo.lang',l); }catch(e){}
  var u=location.pathname+location.search.replace(/([?&])lang=(en|he)&?/,'$1').replace(/[?&]$/,''); u+=(u.indexOf('?')<0?'?':'&')+'lang='+l; location.replace(u+location.hash); }
(function(){ var b=$('langBtn'), c=$('bLang');
  if(b){ b.hidden=false; b.textContent=EN_ON?'עב':'EN'; b.setAttribute('lang',EN_ON?'he':'en'); b.setAttribute('aria-label',EN_ON?'עברית':'English'); b.addEventListener('click',function(){ langSet(EN_ON?'he':'en'); }); }
  if(c){ c.textContent=EN_ON?'עברית':'English'; c.setAttribute('lang',EN_ON?'he':'en'); } })();
/* ================= l21 (24.9): שיתוף. משפט אחד שאדם ישלח כמו שהוא, והכתובת הראשית (גם מ-/next/) ================= */
var shareBtn=$('shareBtn');
if(shareBtn){ shareBtn.hidden=false;
  shareBtn.addEventListener('click',function(){
    var d=EN_ON?{title:'Exodus Log',text:'Daniel Pinsky is sailing around the world alone, non-stop. See where he is right now:',url:'https://exodus-log.com/?lang=en'}
             :{title:'יומן אקסודוס',text:'דניאל פינסקי מקיף את העולם לבד, בלי עצירה. כאן רואים איפה הוא עכשיו:',url:'https://exodus-log.com/'};
    var ok=$('shareOk'), say=function(t){ ok.textContent=t; setTimeout(function(){ ok.textContent=''; },2200); };
    if(navigator.share){ navigator.share(d).catch(function(){}); return; }
    if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(d.url).then(function(){ say('הקישור הועתק'); },function(){ say(d.url); });
    else say(d.url);
  }); }
/* 25.9: קפה לבונה האתר — הכוס פותחת את "שאלות" על השאלה עצמה: ההבהרה (לא לדניאל ולא בשמו) והכפתור ל-Buy Me a Coffee באותו מקום */
var cupBtn=$('cupBtn');
if(cupBtn&&faqEl){ cupBtn.hidden=false;
  cupBtn.addEventListener('click',function(){ setFaq(true); var q=$('faqCup'); if(!q) return;
    q.open=true; var g=q.closest?q.closest('details.g'):null; if(g) g.open=true;
    try{ q.scrollIntoView({block:'start'}); }catch(e){}
    var s=q.querySelector('summary'); if(s) try{ s.focus({preventScroll:true}); }catch(e){} }); }
/* 25.9: משפט הסיפור ירד מהאתר יחד עם הניתוח (החלטת בעל האתר) — story.js כבר לא נטען */

if(faqEl) faqEl.addEventListener('click',function(ev){ var t=ev.target.closest?ev.target.closest('button,a'):ev.target; if(!t) return;
  if(t.id==='bSound'){ audioSet(!auOn); }
  else if(t.id==='bLite'&&LIVE){ var n=EXO.quality==='lite'?'full':'lite'; EXO.setQuality(n); store('exo.quality',n); paintLite(false); }
  else if(t.id==='bFull'){ goFull(); setFaq(false); }
  else if(t.id==='bLang'){ langSet(EN_ON?'he':'en'); }
  else if(t.id==='bInstall'&&installEv){ installEv.prompt(); installEv=null; t.hidden=true; }
});
function paintLite(auto){ var b=$('bLite'); if(!b||!LIVE) return; var lite=EXO.quality==='lite'; b.setAttribute('aria-pressed',lite?'true':'false');
  if(auto&&lite) toast('עברנו לבד למצב קל: המכשיר הזה התקשה עם ההדמיה המלאה. אפשר להחזיר מהתפריט',6500); }
if(LIVE){ var q=store('exo.quality'); if(q==='lite'||q==='full') EXO.setQuality(q); paintLite(false);
  /* l23: הטבעת, הזרמים ותוויות המים שייכים לשכבה "תנאי הטבע" (עד 24.9: "איפה הוא עכשיו") ומוסתרים כברירת מחדל. הרוח והגלים שבהדמיה נשארים */
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
var installEv=null; window.addEventListener('beforeinstallprompt',function(e){ e.preventDefault(); installEv=e; var b=$('bInstall'); if(b) b.hidden=false; var g=$('homeHintGo'); if(g) g.hidden=false; });
/* a-home-hint (24.9): ספירת ביקורים בפתק מקומי — לכל היותר אחד ביום. בשלישי, פעם אחת בלבד, אחרי שהעיגול נולד */
(function(){ var el=$('homeHint'); if(!el||standalone) return;
  var today=new Date().toISOString().slice(0,10), last=store('exo.visitDay'), n=+(store('exo.visits')||0);
  if(last!==today){ n++; store('exo.visits',String(n)); store('exo.visitDay',today); }
  if(n<3||store('exo.homeHint')) return;
  $('homeHintT').textContent=isIOS?'באייפון: שיתוף ← ״הוספה למסך הבית״':'אפשר להוסיף את היומן למסך הבית';
  function hide(){ el.hidden=true; }
  $('homeHintX').addEventListener('click',hide);
  $('homeHintGo').addEventListener('click',function(){ if(installEv){ installEv.prompt(); installEv=null; } hide(); });
  (function wait(){ if(!document.body.classList.contains('keyed')){ setTimeout(wait,500); return; }
    setTimeout(function(){ if(!isIOS&&!installEv) $('homeHintT').textContent='אפשר להוסיף למסך הבית מתפריט הדפדפן'; store('exo.homeHint','1'); el.hidden=false; },2500); })(); })();

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
    loadScript('assets/v2n/names.js').catch(function(){}),
    loadScript('assets/fleet-log.js').catch(function(){})]).then(function(){ return loadScript('assets/v2n/globe.js'); })
    .catch(function(){ gFailed=true; if(gOpen){ closeGlobe(false); toast('הגלובוס לא נטען. רענון בדרך כלל פותר את זה'); } })); }
function openGlobe(how){
  if(gFailed){ toast('הגלובוס לא נטען. רענון בדרך כלל פותר את זה'); return; }
  if(jOpen) closeJourney(false);
  if(!gOpen){ gOpen=true; if(LIVE) EXO.globeOwns=true; tsVeil(1); G.setAttribute('aria-hidden','false'); G.inert=false; document.body.classList.add('g-open'); setMenu(false); if(LIVE) EXO.pause(true); measureTop(); setTimeout(gWind,400);      /* 25.9: חיצי הרוח בגלובוס, אם "תנאי הטבע" ו"רוח" דולקות */
    try{ history.pushState({exoGlobe:1},''); gPushed=true; }catch(e){ gPushed=false; } }
  if(!window.__exoGlobeLoaded) toast('הגלובוס נטען',2500);
  globeBuild().then(function(){ if(gOpen&&window.__exoGlobeEnter) window.__exoGlobeEnter(how||'boat'); });
  if(kbNav) try{ $('gBack').focus({preventScroll:true}); }catch(e){} }      /* l23: רק במקלדת — במגע זה צייר מסגרת לבנה סביב הכפתור */
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
      /* 24.9 (סעיף 4): בלי "שאיבה". עד כאן, מרגע שהסירה הפכה לסמל לבן, התנועה המשיכה לבד עד מבט האזור — וזה בלבל.
         עכשיו ההתרחקות היא של המשתמש, והתחנות מגנטיות רכות (בסוף הסרגל, ב"שלושת המבטים"): מי שעוצר ליד תחנה — נמשך אליה בעדינות */ }
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
    if(!jReady) jReady=loadCss('assets/front.css').then(function(){ return loadCss('assets/v2n/journey.css'); }).then(function(){ return loadScript('assets/v2n/journey.js'); })
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
document.addEventListener('keydown',function(ev){ if(ev.key==='Escape'){ if(wordsOpen){ setWords(false); ($('bWords')||keyEl).focus(); } else if(faqOpen){ setFaq(false); ($('bFaq')||keyEl).focus(); } else if(lyrIsOpen){ lyrOpen(false); keyEl.focus(); } else if(jOpen) closeJourney(false); else if(gOpen) closeGlobe(false); } });
/* זום במקלדת: + ו-−. עד כה הגלובוס היה נגיש רק בצביטה או בגלגלת — כלומר ממקלדת, או מקורא
   מסך, לא היה אליו שום מסלול (נבדק ב-audit_keys.py: Tab, "-", PageDown, End, והתפריט).
   במקום לוגיקת זום חדשה, המקש שולח אירוע גלגלת אל המשטח הפעיל: אותו מסלול בדיוק, כולל
   המאיץ, המסירה אל הגלובוס והחזרה ממנו. Ctrl/Cmd עם +/− הם זום הדפדפן ונשארים שלו. */
document.addEventListener('keydown',function(ev){
  if(ev.ctrlKey||ev.metaKey||ev.altKey||jOpen||faqOpen) return;
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
    SS_TRACK=rows.filter(function(r){ return r[15]!=null&&r[16]!=null; }).map(function(r){ return [Date.parse(r[0]+'Z'),r[15],r[16]]; }).sort(function(a,b){ return a[0]-b[0]; });
    EXO.setArchive(rows); tsSpan(); TS.rng.value=tsValOf(tsLive()); tsDraw();
    if(LY_ON.story&&!ssPlayRaf&&!ssHold){ ssSpan(); ssGo(tsLive()); } else ssBg=null; }); },3000);
vigTick(); setInterval(vigTick,60000); if(window.EXO) EXO.vigTick=vigTick;   /* נחשף לבדיקות: audit_contrast.py מזיז את השעון ישירות */
/* קטלוג הכוכבים: רק אחרי שהסצנה כבר רצה. המנוע מזהה אותו לבד בפריים הבא; בלעדיו נשארים כוכבי הרעש */
if(LIVE) idle(function(){ loadScript('assets/v2n/stars.js').then(function(){ if(EXO.kick) EXO.kick(); }).catch(function(){}); },2600);
idle(function(){ loadScript('assets/v2n/coast.js').then(function(){ NEAR=null; drawMini(); }).catch(function(){}); },1800);
if(false&&LIVE&&!store('exo.hint.v2')){      /* l23: בלי הודעה צפה במסך הנקי */ setTimeout(function(){ toast('גרירה מסובבת לכל כיוון, גם אל מתחת למים. צביטה או גלגלת: פנימה עד הסיפון, החוצה עד הגלובוס',7000); store('exo.hint.v2','1'); },1600); }
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(function(){ SZ={}; measureTop(); });
/* ===== 24.9 (סעיף 3): לחיצה כפולה על הסירה =====
   בטלפון ובמחשב: לחיצה כפולה מביאה למבט הכי קרוב — על הסיפון, ליד דניאל — ומשם גרירה מסובבת את הראש לכל כיוון,
   גם אל השמיים, בלי שהמצלמה יורדת אל מתחת לסירה ולתוך המים. לחיצה כפולה נוספת מחזירה למבט המקיף סביב הסירה.
   הדפדפן לא מגדיל את הדף בלחיצה כפולה (touch-action:manipulation על הדף, none על ההדמיה) */
(function(){ var cv=$('sea'); if(!cv||!LIVE||!EXO.setCam) return;
  var t1=0, x1=0, y1=0, dx0=0, dy0=0;
  function toggle(){ var Z=EXO.zoomAxis, u=EXO.frame?EXO.frame.u:1;
    if(gOpen) return;
    if(Z&&u>Z.DECK+0.3){ LAB.cam='deck'; EXO.setCam('deck'); } else { LAB.cam='orbit'; EXO.setCam('orbit'); } }
  cv.addEventListener('pointerdown',function(e){ dx0=e.clientX; dy0=e.clientY; },{passive:true});
  cv.addEventListener('pointerup',function(e){ if(e.pointerType==='mouse') return;      /* בעכבר — dblclick */
    if(Math.abs(e.clientX-dx0)+Math.abs(e.clientY-dy0)>12){ t1=0; return; }      /* גרירה, לא הקשה */
    var now=performance.now();
    if(t1&&now-t1<340&&Math.abs(e.clientX-x1)+Math.abs(e.clientY-y1)<36){ t1=0; toggle(); return; }
    t1=now; x1=e.clientX; y1=e.clientY; },{passive:true});
  cv.addEventListener('dblclick',function(e){ e.preventDefault(); toggle(); });
  window.__exoDoubleTap=toggle;      /* לבדיקות */
})();
/* ================= שלושת המבטים: סירה / אזור / כל המרוץ (22.9.2026) =================
   סרגל אנכי דק בשולי המסך השמאליים. כל עצירה עפה בתנועה אחת רכה לרמה שלה, והמחוון (טבעת קטנה על הקו)
   נע ברציפות עם כל זום — בגלגלת, בצביטה או בכפתור — כך שהסרגל הוא גם "איפה אני" ולא רק כפתורים.
   המדד הוא רוחב השטח שעל המסך במטרים, אותו מדד שמחבר את ההדמיה לגלובוס. */
(function(){
  var nav=$('vw'); if(!nav) return;
  if(!LIVE){ nav.hidden=true; return; }      /* 23.9: בלי WebGL אין לאן לעוף (גם הגלובוס צריך אותו) — פקד מת מוסתר, לא מוצג */
  var knob=nav.querySelector('.vw-knob'), btns=nav.querySelectorAll('button[data-v]'), lastY=-1, lastA='';
  function wBoat(){ var Z=EXO.zoomAxis; return (Z&&Z.wOfU&&Z.uOfR)?Z.wOfU(Z.uOfR(64)):120; }
  function wDan(){ var Z=EXO.zoomAxis; return Math.max(0.5,(Z&&Z.wOfU)?Z.wOfU(Z.DECK):0.5); }      /* על הסיפון הרוחב הוא 0 — חצי מטר הוא הרצפה של הסקאלה */
  function stops(){ var s=window.__exoViewStops?window.__exoViewStops():null;
    return [Math.log(wDan()), Math.log(wBoat()), Math.log(s?s.region:74000), Math.log(s?s.race:2.2e7)]; }
  function nowW(){ var Z=EXO.zoomAxis;
    if(gOpen&&window.__exoGlobeWidth) return window.__exoGlobeWidth();
    return (Z&&Z.wOfU&&EXO.frame&&EXO.frame.u!==undefined)?Z.wOfU(EXO.frame.u):wBoat(); }
  function pos(){ var S=stops(), l=Math.log(Math.max(0.5,nowW())), i;
    if(l<=S[0]) return 0; if(l>=S[3]) return 3;
    for(i=0;i<3;i++) if(l<S[i+1]) return i+(l-S[i])/(S[i+1]-S[i]); return 3; }
  function tick(){ try{
    var p=pos(), h=nav.clientHeight, gap=(btns.length>1)?(btns[btns.length-1].offsetTop-btns[0].offsetTop)/(btns.length-1):40;
    var y=Math.round((btns[0].offsetTop+btns[0].offsetHeight/2+(btns.length-1-p)*gap)*2)/2;      /* 24.9: למעלה המרוץ, למטה דניאל */
    if(y!==lastY){ lastY=y; knob.style.transform='translate(-50%,'+(y-4.5)+'px)'; }
    var a=Math.abs(p-Math.round(p))<0.14?['daniel','boat','region','race'][Math.round(p)]:'';
    if(a!==lastA){ lastA=a; for(var i=0;i<btns.length;i++) btns[i].setAttribute('aria-pressed',btns[i].getAttribute('data-v')===a?'true':'false'); }
  }catch(e){} requestAnimationFrame(tick); }
  requestAnimationFrame(tick);
  function go(v){ ping(2200);
    if(v==='daniel'){ if(gOpen) closeGlobe(false); if(EXO.glideTo&&EXO.zoomAxis) setTimeout(function(){ EXO.glideTo(EXO.zoomAxis.DECK,1400); },gOpen?600:0); return; }
    if(v==='boat'){ if(gOpen) closeGlobe(false);
      else if(EXO.glideTo&&EXO.zoomAxis){ EXO.glideTo(EXO.zoomAxis.uOfR(64),1300); } return; }
    if(gOpen){ if(window.__exoGlobeView) window.__exoGlobeView(v); return; }
    var ok=EXO.globeReady&&EXO.quality!=='lite'&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches&&window.__exoAutoOut;
    if(ok&&window.__exoAutoOut(v)) return;      /* מהמקום הנוכחי, דרך ההצלבה, בתנועה אחת */
    openGlobe(v==='race'?'race':'out'); }
  for(var i=0;i<btns.length;i++) btns[i].addEventListener('click',function(){ go(this.getAttribute('data-v')); });
  /* 24.9 (סעיף 4): הסרגל מופיע עם הזום עצמו — גלגלת, צביטה (שתי אצבעות), או מקשי + ו-− — ונעלם כשנייה וחצי אחרי שהכול נרגע */
  var hideT=0; function ping(ms){ document.body.classList.add('vw-show'); clearTimeout(hideT); hideT=setTimeout(function(){ document.body.classList.remove('vw-show'); },ms||1500); }
  window.addEventListener('wheel',function(){ ping(); },{capture:true,passive:true});
  window.addEventListener('touchmove',function(e){ if(e.touches&&e.touches.length>1) ping(); },{capture:true,passive:true});
  window.addEventListener('keydown',function(e){ if(e.key==='+'||e.key==='-'||e.key==='='||e.key==='_') ping(); },{capture:true,passive:true});
  nav.addEventListener('pointerenter',function(){ ping(4000); });
  /* 24.9 (סעיף 4): התחנות מגנטיות רכות, כמו מגירה שנסגרת לבד בסוף הדרך. כשהזום נרגע (גלגלת שקטה רבע שנייה, או האצבעות
     עזבו), ואנחנו קרובים לתחנה (פחות מחמישית הדרך אליה) — המצלמה נמשכת אליה בתנועה רכה. כל זום נוסף עוצר את המשיכה.
     חריג אחד: באמצע ההצלבה בין ההדמיה לגלובוס לא נשארים (חצי שקוף) — נמשכים לתחנה הקרובה מבין "סירה" ו"אזור" */
  var magT=0, fingers=0;
  function magnet(){ magT=0; try{
    if(fingers||(window.__exoAutoRunning&&window.__exoAutoRunning())||(EXO.frame&&EXO.frame.touching)) return;
    var Z=EXO.zoomAxis, u=EXO.frame?EXO.frame.u:0, uB=Z.uOfR(64), mid=document.body.classList.contains('g-x'), v='';
    if(mid) v=(EXO.frame&&EXO.frame.gX>0.5)?'region':'boat';
    else if(!gOpen){ if(Math.abs(u-uB)>0.02&&Math.abs(u-uB)<0.3) v='boat'; else if(Math.abs(u-Z.DECK)>0.02&&Math.abs(u-Z.DECK)<0.3) v='daniel'; }
    else { var p=pos(), r=Math.round(p), d=Math.abs(p-r); if(r>=2&&d>0.02&&d<0.22) v=['daniel','boat','region','race'][r]; }
    if(!v) return;
    if(v==='daniel'||v==='boat'){ if(EXO.glideTo) EXO.glideTo(v==='daniel'?Z.DECK:uB,mid?1100:750); return; }
    if(gOpen){ if(window.__exoGlobeView) window.__exoGlobeView(v); return; }
    var ok=EXO.globeReady&&EXO.quality!=='lite'&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches&&window.__exoAutoOut;
    if(ok) window.__exoAutoOut(v);
  }catch(e){} }
  function arm(ms){ clearTimeout(magT); magT=setTimeout(magnet,ms||260); }
  window.addEventListener('wheel',function(){ arm(260); },{capture:true,passive:true});
  document.addEventListener('touchstart',function(e){ fingers=e.touches.length; clearTimeout(magT); },{capture:true,passive:true});
  function tEnd(e){ var was=fingers; fingers=e.touches.length; if(!fingers&&was>1) arm(300); }
  document.addEventListener('touchend',tEnd,{capture:true,passive:true}); document.addEventListener('touchcancel',tEnd,{capture:true,passive:true});
  document.addEventListener('touchmove',function(e){ if(e.touches.length>1) fingers=Math.max(fingers,e.touches.length); },{capture:true,passive:true});
  window.__exoMagnet=magnet;      /* לבדיקות */
})();
})();
