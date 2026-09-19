/* ===== rose.js — שושנת הרוחות =====
   SVG ולא קנבס: חד בכל צפיפות מסך, מונפש ב-CSS, נגיש לקורא מסך, ואפשר לערוך אותו בלי לגעת ב-WebGL.
   צפון תמיד למעלה. כל גודל יושב ברדיוס משלו, ולכן שני חצים לא נוגעים זה בזה לעולם:
     שפה   שמש, ירח, זריחה, שקיעה, והכיוון אל נקודת החובה הבאה
     1     רוח   — נוצה, ענבר
     2     גל    — שברון כפול, לבן־כחול, עובי לפי גובה
     3     זרם   — חץ מקווקו, טורקיז
     מרכז  הסירה, מסתובבת לפי הכיוון שבו היא נעה
   כלל אחד לכל החצים: החץ יושב בצד שממנו הדבר מגיע, ומצביע אל הסירה — כלומר לכיוון שאליו הוא נע.
   שלוש מחוות: גרירה סביב הטבעת מסובבת את המבט, הקשה מפנה אותו לשם, הקשה על הטבור מדליקה ומכבה סיבוב. */
(function(){
'use strict';
var host=document.getElementById('rose'); if(!host||!window.EXO) return;
var EXO=window.EXO, NS='http://www.w3.org/2000/svg', C=110;
var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function el(tag,attrs,parent){ var e=document.createElementNS(NS,tag);
  for(var k in attrs) if(attrs.hasOwnProperty(k)) e.setAttribute(k,attrs[k]);
  if(parent) parent.appendChild(e); return e; }
function title(node,txt){ var t=node.querySelector('title')||el('title',{},node); t.textContent=txt; }
function pol(r,deg){ var a=deg*Math.PI/180; return [C+r*Math.sin(a), C-r*Math.cos(a)]; }

var svg=el('svg',{viewBox:'0 0 220 220',width:'100%',height:'100%','aria-hidden':'false',focusable:'false'},host);
svg.style.touchAction='none'; svg.style.display='block';

/* רקע וטבעות */
el('circle',{cx:C,cy:C,r:104,fill:'rgba(5,16,25,.58)',stroke:'rgba(200,225,240,.30)','stroke-width':1.2},svg);
[80,56,39,22].forEach(function(r){ el('circle',{cx:C,cy:C,r:r,fill:'none',stroke:'rgba(200,225,240,.10)','stroke-width':1},svg); });

/* המבט של המצלמה: טריז שקוף שנע על העיגול */
var wedge=el('g',{},svg);
(function(){ var a=pol(100,-24), b=pol(100,24);
  el('path',{d:'M'+C+' '+C+' L'+a[0].toFixed(1)+' '+a[1].toFixed(1)+' A100 100 0 0 1 '+b[0].toFixed(1)+' '+b[1].toFixed(1)+' Z',
    fill:'rgba(255,255,255,.085)'},wedge);
  el('path',{d:'M'+a[0].toFixed(1)+' '+a[1].toFixed(1)+' A100 100 0 0 1 '+b[0].toFixed(1)+' '+b[1].toFixed(1),
    fill:'none',stroke:'rgba(255,255,255,.75)','stroke-width':3,'stroke-linecap':'round'},wedge); })();

/* שנתות ואותיות הרוחות */
(function(){ var d='',i;
  for(i=0;i<360;i+=10){ var maj=(i%30===0), p=pol(maj?92:96,i), q=pol(100,i);
    d+='M'+p[0].toFixed(1)+' '+p[1].toFixed(1)+'L'+q[0].toFixed(1)+' '+q[1].toFixed(1); }
  el('path',{d:d,stroke:'rgba(200,225,240,.42)','stroke-width':1,fill:'none'},svg);
  [['צ',0,1],['מז',90,0],['ד',180,0],['מע',270,0]].forEach(function(c){
    var p=pol(86,c[1]);
    var t=el('text',{x:p[0].toFixed(1),y:(p[1]+4.2).toFixed(1),'text-anchor':'middle','font-size':c[2]?13:10.5,
      'font-weight':c[2]?700:400,fill:c[2]?'#ff8a3c':'rgba(225,238,246,.72)','font-family':'Assistant, sans-serif'},svg);
    t.textContent=c[0]; });
})();

/* ---- שלושת החצים. כל אחד בקבוצה שמסתובבת לאזימוט שממנו הוא מגיע; בתוך הקבוצה "למעלה" הוא החוצה ---- */
function flowOverlay(g,y0,y1,color,dur){
  /* חלקיקים זעירים שזוחלים לאורך החץ לכיוון שאליו הוא נע — זה מה שמכריע "רוח מ..." מול "רוח אל..." */
  var p=el('path',{d:'M'+C+' '+(C-y0)+' L'+C+' '+(C-y1),stroke:color,'stroke-width':2.2,'stroke-linecap':'round',
    'stroke-dasharray':'1 7',fill:'none',opacity:.95,'class':'rose-crawl'},g);
  p.style.animationDuration=dur+'s'; return p; }

var gWind=el('g',{'class':'r-wind'},svg), gWave=el('g',{'class':'r-wave'},svg), gCur=el('g',{'class':'r-cur'},svg);
/* רוח: נוצה. ציר מ-78 עד 58, ראש חץ ב-58, נוצות בזנב */
el('path',{d:'M'+C+' '+(C-79)+' L'+C+' '+(C-61),stroke:'#ffb454','stroke-width':3.2,'stroke-linecap':'round',fill:'none',opacity:.55},gWind);
el('path',{d:'M'+(C-6.5)+' '+(C-66)+' L'+C+' '+(C-57)+' L'+(C+6.5)+' '+(C-66),stroke:'#ffb454','stroke-width':3.2,
  'stroke-linecap':'round','stroke-linejoin':'round',fill:'none'},gWind);
el('path',{d:'M'+C+' '+(C-79)+' l-6 -5 M'+C+' '+(C-74)+' l-6 -5 M'+C+' '+(C-79)+' l6 -5 M'+C+' '+(C-74)+' l6 -5',
  stroke:'#ffb454','stroke-width':2.2,'stroke-linecap':'round',fill:'none'},gWind);
var crawlWind=flowOverlay(gWind,80,60,'#fff1d6',0.9);
/* גל: שברון כפול */
var chev=el('path',{d:'M'+(C-9)+' '+(C-54)+' L'+C+' '+(C-47)+' L'+(C+9)+' '+(C-54)+' M'+(C-9)+' '+(C-47)+' L'+C+' '+(C-40)+' L'+(C+9)+' '+(C-47),
  stroke:'#cfe6ff','stroke-width':3,'stroke-linecap':'round','stroke-linejoin':'round',fill:'none'},gWave);
/* זרם: חץ מקווקו */
el('path',{d:'M'+C+' '+(C-38)+' L'+C+' '+(C-27),stroke:'#3fd6cf','stroke-width':3,'stroke-dasharray':'3.4 3',fill:'none'},gCur);
el('path',{d:'M'+(C-5)+' '+(C-30)+' L'+C+' '+(C-23.5)+' L'+(C+5)+' '+(C-30),stroke:'#3fd6cf','stroke-width':2.6,
  'stroke-linecap':'round','stroke-linejoin':'round',fill:'none'},gCur);

/* מרכז: הסירה מלמעלה, והקו אל נקודת החובה */
var gGate=el('g',{},svg);
el('path',{d:'M'+C+' '+(C-100)+' l5 7 l-5 7 l-5 -7 Z',fill:'#fff',stroke:'rgba(5,16,25,.8)','stroke-width':1},gGate);
var gBoat=el('g',{},svg);
el('path',{d:'M'+C+' '+(C-19)+' C'+(C+7.5)+' '+(C-9)+' '+(C+7.5)+' '+(C+8)+' '+C+' '+(C+17)+' C'+(C-7.5)+' '+(C+8)+' '+(C-7.5)+' '+(C-9)+' '+C+' '+(C-19)+' Z',
  fill:'#fff',stroke:'rgba(5,16,25,.85)','stroke-width':1.2},gBoat);
el('path',{d:'M'+C+' '+(C-13)+' L'+C+' '+(C+9),stroke:'#ff8a3c','stroke-width':2,'stroke-linecap':'round'},gBoat);
var hub=el('circle',{cx:C,cy:C,r:21,fill:'transparent','class':'rose-hub'},svg);
var hubRing=el('circle',{cx:C,cy:C,r:21,fill:'none',stroke:'rgba(255,255,255,.55)','stroke-width':1.4,'stroke-dasharray':'3 4','class':'rose-auto'},svg);

/* שפה: שמש, ירח, זריחה, שקיעה */
var gRise=el('g',{},svg), gSet=el('g',{},svg);
[gRise,gSet].forEach(function(g){ el('path',{d:'M'+C+' '+(C-101)+' L'+C+' '+(C-108),stroke:'#ffcf7a','stroke-width':2.4,'stroke-linecap':'round'},g); });
var gSun=el('g',{'class':'rose-body','data-body':'sun',tabindex:0,role:'button'},svg);
(function(){ var cy=C-100, d='';
  for(var i=0;i<8;i++){ var a=i*Math.PI/4; d+='M'+(C+Math.cos(a)*8).toFixed(1)+' '+(cy+Math.sin(a)*8).toFixed(1)+'L'+(C+Math.cos(a)*11).toFixed(1)+' '+(cy+Math.sin(a)*11).toFixed(1); }
  el('circle',{cx:C,cy:cy,r:13,fill:'transparent'},gSun);
  el('path',{d:d,stroke:'#ffd76a','stroke-width':1.6,'stroke-linecap':'round','class':'sun-rays'},gSun);
  el('circle',{cx:C,cy:cy,r:6,fill:'#ffd76a',stroke:'rgba(5,16,25,.85)','stroke-width':1.2,'class':'sun-disc'},gSun); })();
var gMoon=el('g',{'class':'rose-body','data-body':'moon',tabindex:0,role:'button'},svg), moonLit;
(function(){ var cy=C-100;
  el('circle',{cx:C,cy:cy,r:13,fill:'transparent'},gMoon);
  el('circle',{cx:C,cy:cy,r:6,fill:'#1b2a38',stroke:'rgba(230,238,245,.9)','stroke-width':1.2},gMoon);
  moonLit=el('path',{d:'',fill:'#e9eef4'},gMoon); })();

function rot(g,deg){ g.setAttribute('transform','rotate('+deg.toFixed(1)+' '+C+' '+C+')'); }
function moonPath(illum,waxing){
  /* הצד המואר: חצי עיגול + אליפסה שמשלימה או גורעת לפי אחוז התאורה */
  var cy=C-100, r=5, k=(1-2*illum)*r, s=waxing?1:0;
  return 'M'+C+' '+(cy-r)+' A'+r+' '+r+' 0 0 '+s+' '+C+' '+(cy+r)+' A'+Math.abs(k).toFixed(2)+' '+r+' 0 0 '+((k>0)?(1-s):s)+' '+C+' '+(cy-r)+' Z';
}

var DIR_TO=['צפון','צפון־מזרח','מזרח','דרום־מזרח','דרום','דרום־מערב','מערב','צפון־מערב'];
function toName(d){ return DIR_TO[Math.round((((d%360)+360)%360)/45)%8]; }
function fix1(v){ return (Math.round(v*10)/10).toFixed(1); }

function render(s){
  var c=s.cond;
  rot(gWind,c.windDir); rot(gWave,c.waveDir); rot(gCur,(c.curDir+180)%360);
  rot(gBoat,FIX.cog); rot(gGate,s.gateBrg);
  chev.setAttribute('stroke-width',(2.2+Math.min(3,c.waveH*0.8)).toFixed(1));
  crawlWind.style.animationDuration=Math.max(0.35,1.6-c.wind*0.045).toFixed(2)+'s';
  rot(gSun,s.sun.az); rot(gMoon,s.moon.az);
  gSun.style.opacity=s.sun.alt>-0.8?1:0.38; gMoon.style.opacity=s.moon.alt>0?1:0.38;
  moonLit.setAttribute('d',moonPath(s.moon.illum,s.moon.waxing));
  if(s.riseAz!==null){ rot(gRise,s.riseAz); gRise.style.display=''; } else gRise.style.display='none';
  if(s.setAz!==null){ rot(gSet,s.setAz); gSet.style.display=''; } else gSet.style.display='none';
  title(gWind,'רוח '+Math.round(c.wind)+' קשר '+s.windFromName+', משבים עד '+Math.round(c.gust));
  title(gWave,'גל '+fix1(c.waveH)+' מטר, כל '+Math.round(c.waveT)+' שניות, מגיע מ'+toName(c.waveDir));
  title(gCur,'זרם '+fix1(c.cur)+' קשר לכיוון '+toName(c.curDir));
  title(gBoat,'אקסודוס נעה לכיוון '+toName(FIX.cog)+', '+FIX.cog+'°');
  title(gGate,'הכיוון אל '+FIX.gate);
  title(gSun,(s.sun.alt>-0.8?'השמש, בגובה '+Math.round(s.sun.alt)+'° — הקשה מפנה את המבט אליה':'השמש מתחת לאופק — כאן היא נמצאת'));
  title(gMoon,'הירח, '+Math.round(s.moon.illum*100)+'% מואר'+(s.moon.alt>0?' — הקשה מפנה את המבט אליו':', מתחת לאופק'));
  if(s.riseHM) title(gRise,'זריחה '+s.riseHM); if(s.setHM) title(gSet,'שקיעה '+s.setHM);

  /* המקרא שליד: גם מספרים, גם מתגים */
  put('lgWind',Math.round(c.wind)); put('lgWindDir','רוח '+s.windFromName);
  put('lgWave',fix1(c.waveH));     put('lgWaveT','גל כל '+Math.round(c.waveT)+' שנ׳');
  put('lgCur',fix1(c.cur));        put('lgCurDir','זרם ל'+toName(c.curDir));
  /* אותה תמונה במילים — לקורא מסך, ולמי שהאנימציה לא עולה אצלו */
  put('roseline','רוח '+Math.round(c.wind)+' קשר '+s.windFromName+' · גל '+fix1(c.waveH)+' מטר · זרם '+fix1(c.cur)+' קשר ל'+toName(c.curDir));
}
function put(id,txt){ var e=document.getElementById(id); if(e&&e.textContent!==String(txt)) e.textContent=txt; }
EXO.on(render);
EXO.onFrame(function(f){ rot(wedge,f.camBearing); hubRing.style.opacity=f.auto?1:0; });

/* ---------- מתגי השכבות: נשמרים, כדי שמי שכיבה את הזרם לא ימצא אותו דלוק מחר ---------- */
var KEY='exo.layers.v1', saved={};
try{ saved=JSON.parse(localStorage.getItem(KEY)||'{}')||{}; }catch(e){ saved={}; }
var btns=document.querySelectorAll('#layers button[data-layer]');
function applyLayer(name,on){
  EXO.setLayer(name,on);
  var g={wind:gWind,wave:gWave,cur:gCur}[name]; if(g) g.style.opacity=on?1:0.22;
  for(var i=0;i<btns.length;i++) if(btns[i].getAttribute('data-layer')===name) btns[i].setAttribute('aria-pressed',on?'true':'false');
}
['wind','wave','cur'].forEach(function(n){ applyLayer(n, saved[n]!==false); });
for(var bi=0;bi<btns.length;bi++) btns[bi].addEventListener('click',function(){
  var n=this.getAttribute('data-layer'), on=this.getAttribute('aria-pressed')!=='true';
  applyLayer(n,on); saved[n]=on; try{ localStorage.setItem(KEY,JSON.stringify(saved)); }catch(e){} });

/* ---------- שליטה ---------- */
function angleOf(ev){ var r=svg.getBoundingClientRect(), x=ev.clientX-(r.left+r.width/2), y=ev.clientY-(r.top+r.height/2);
  return { deg:((Math.atan2(x,-y)*180/Math.PI)+360)%360, rad:Math.hypot(x,y)/(r.width/2)*110 }; }
var drag=null, help=document.getElementById('roseHelp'), lp=null;
function showHelp(){
  if(!help) return;
  help.innerHTML='<b>השושנה היא גם ההגה של המצלמה</b><span>גרירה סביב הטבעת — מסובבת את המבט</span><span>הקשה על כיוון — המבט טס לשם</span><span>הקשה על השמש או הירח — מבט אליהם</span><span>הקשה על הסירה שבמרכז — סיבוב אוטומטי</span>';
  help.hidden=false; clearTimeout(showHelp.t); showHelp.t=setTimeout(function(){ help.hidden=true; },6500); }
svg.addEventListener('pointerdown',function(ev){
  var a=angleOf(ev), body=ev.target.closest?ev.target.closest('.rose-body'):null;
  drag={id:ev.pointerId,x:ev.clientX,y:ev.clientY,moved:false,a:a,body:body?body.getAttribute('data-body'):null,hub:a.rad<22};
  try{ svg.setPointerCapture(ev.pointerId); }catch(e){}
  lp=setTimeout(function(){ if(drag&&!drag.moved){ drag.long=true; showHelp(); } },560);
  ev.preventDefault(); });
svg.addEventListener('pointermove',function(ev){
  if(!drag||ev.pointerId!==drag.id) return;
  if(!drag.moved&&Math.hypot(ev.clientX-drag.x,ev.clientY-drag.y)>5){ drag.moved=true; clearTimeout(lp); }
  if(drag.moved&&!drag.hub) EXO.setBearing(angleOf(ev).deg); });
function end(ev){
  if(!drag||ev.pointerId!==drag.id) return; clearTimeout(lp);
  var d=drag; drag=null;
  if(d.moved||d.long) return;
  if(d.body) EXO.faceBody(d.body);
  else if(d.hub) EXO.toggleAuto();
  else EXO.lookToward(d.a.deg,{el:0.26}); }
svg.addEventListener('pointerup',end); svg.addEventListener('pointercancel',function(){ clearTimeout(lp); drag=null; });
[gSun,gMoon].forEach(function(g){ g.addEventListener('keydown',function(ev){
  if(ev.key==='Enter'||ev.key===' '){ EXO.faceBody(g.getAttribute('data-body')); ev.preventDefault(); } }); });

/* מקלדת: חצים מסובבים את המבט ב-15 מעלות, רווח מדליק ומכבה סיבוב אוטומטי */
host.setAttribute('tabindex','0');
host.addEventListener('keydown',function(ev){ var b=EXO.frame.camBearing;
  if(ev.key==='ArrowLeft'){ EXO.lookToward((b+345)%360); ev.preventDefault(); }
  else if(ev.key==='ArrowRight'){ EXO.lookToward((b+15)%360); ev.preventDefault(); }
  else if(ev.key===' '&&ev.target===host){ EXO.toggleAuto(); ev.preventDefault(); } });

/* רמז חד-פעמי: הטריז "נושם" כמה שניות בפעם הראשונה */
try{ if(!localStorage.getItem('exo.roseSeen')){ host.classList.add('hint');
  setTimeout(function(){ host.classList.remove('hint'); },7000); localStorage.setItem('exo.roseSeen','1'); } }catch(e){}
if(reduce) host.classList.add('still');
})();
