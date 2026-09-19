/* ===== sextant.js — לנווט כמו דניאל =====
   שלושים שניות שמסבירות את נשמת המרוץ: מורידים את השמש אל האופק, קוראים את הזווית, ומקבלים קו על הגלובוס.
   הכול אמיתי: גובה השמש מחושב למיקום של אקסודוס ולשעה של המדידה, והקו הוא "מעגל שווה־גובה" —
   כל הנקודות בעולם שבהן השמש נראית באותו רגע בדיוק באותו גובה. שתי מדידות נותנות שני מעגלים, והחיתוך הוא הסירה.
   הפשטות מודעות: בלי תיקון שבירה, גובה עין וחצי־קוטר, והסירה לא זזה בין שתי המדידות. */
(function(){
'use strict';
var host=document.getElementById('sxbox'); if(!host||typeof FIX==='undefined'||!window.EXO||!EXO.astro||typeof LAND50==='undefined') return;
var A=EXO.astro, D2R=Math.PI/180, R2D=180/Math.PI;
function pad(v){ return (v<10?'0':'')+v; }
function localHM(ms,lon){ var d=new Date(ms+lon/15*3600000); return pad(d.getUTCHours())+':'+pad(d.getUTCMinutes()); }
function subsolar(ms){ var d=A.days(ms), lam=A.sunEcl(d), eps=(23.439-0.00000036*d)*D2R;
  var dec=Math.asin(Math.sin(eps)*Math.sin(lam)), ra=Math.atan2(Math.cos(eps)*Math.sin(lam),Math.cos(lam));
  var gmst=((18.697374558+24.06570982441908*d)%24+24)%24, lon=ra*R2D-gmst*15; lon=((lon+540)%360)-180;
  return {lat:dec*R2D, lon:lon}; }
function altAt(ms,lat,lon){ return A.sunPos(ms,lat,lon).alt*R2D; }

/* ---------- שתי המדידות: בוקר ואחר הצהריים של היום, לפי שעת השמש אצל הסירה ---------- */
var obs={lat:FIX.lat, lon:FIX.lon, who:'boat'};
function plan(){
  var now=(EXO.state?EXO.state.now:Date.now()), ld=new Date(now+obs.lon/15*3600000);
  var day0=now-(ld.getUTCHours()*3600+ld.getUTCMinutes()*60+ld.getUTCSeconds())*1000, hrs=[[9.5,13.5],[10.5,13.5],[11,13]], i;
  for(i=0;i<hrs.length;i++){ var t1=day0+hrs[i][0]*3600000, t2=day0+hrs[i][1]*3600000;
    if(altAt(t1,obs.lat,obs.lon)>8&&altAt(t2,obs.lat,obs.lon)>8) return [t1,t2]; }
  return [day0+11*3600000, day0+13*3600000];
}
var sights=[], step=0, angle=0, times=plan();

/* ---------- DOM ---------- */
host.innerHTML=
  '<div class="sx-pane"><div class="sx-steps"><i class="on"></i><i></i><i></i></div>'
 +'<svg id="sxView" viewBox="0 0 520 380" role="img" aria-label="מבט דרך הסקסטנט: השמש, האופק, ותמונת השמש שמורידים אליו"></svg>'
 +'<div class="sx-ctl"><div class="sx-read"><span id="sxWhen"></span><b class="num" id="sxDeg">0.0°</b></div>'
 +'<input type="range" id="sxRange" min="0" max="80" step="0.1" value="0" aria-label="זווית הסקסטנט: כמה מורידים את השמש">'
 +'<button type="button" class="sx-btn" id="sxGo" disabled>תפסתי</button></div></div>'
 +'<div class="sx-pane"><canvas id="sxGlobe" width="840" height="700" aria-label="הגלובוס: קווי המיקום מהמדידות"></canvas><p class="sx-say" id="sxSay"></p></div>';
var view=document.getElementById('sxView'), rng=document.getElementById('sxRange'), go=document.getElementById('sxGo'),
    deg=document.getElementById('sxDeg'), when=document.getElementById('sxWhen'), say=document.getElementById('sxSay'),
    cv=document.getElementById('sxGlobe'), steps=host.querySelectorAll('.sx-steps i');

/* ---------- מבט הסקסטנט ---------- */
var HZ=292, PPD=3.7;                                   /* קו האופק, ופיקסלים למעלה */
function trueAlt(){ return altAt(times[Math.min(step,1)],obs.lat,obs.lon); }
function drawView(){
  var ta=trueAlt(), ySun=HZ-ta*PPD, yImg=HZ-(ta-angle)*PPD, ok=Math.abs(ta-angle)<0.35, s='';
  s+='<defs><linearGradient id="sxSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f78c4"/><stop offset=".78" stop-color="#9cc7e6"/><stop offset="1" stop-color="#d9e8ef"/></linearGradient>'
    +'<linearGradient id="sxSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d5c80"/><stop offset="1" stop-color="#0a2c44"/></linearGradient>'
    +'<radialGradient id="sxGlow"><stop offset="0" stop-color="#fff6d5" stop-opacity=".9"/><stop offset="1" stop-color="#fff6d5" stop-opacity="0"/></radialGradient></defs>';
  s+='<rect width="520" height="'+HZ+'" fill="url(#sxSky)"/><rect y="'+HZ+'" width="520" height="'+(380-HZ)+'" fill="url(#sxSea)"/>';
  s+='<path d="M0 '+HZ+' H520" stroke="#eaf3f8" stroke-opacity=".8" stroke-width="1.4"/>';
  /* קשת הסקסטנט: סולם המעלות, והמחוג */
  var yy; for(var a=0;a<=75;a+=5){ yy=HZ-a*PPD; s+='<path d="M'+(a%15===0?20:26)+' '+yy.toFixed(1)+' H34" stroke="#fff" stroke-opacity=".75" stroke-width="'+(a%15===0?1.8:1)+'"/>';
    if(a%15===0) s+='<text x="40" y="'+(yy+4).toFixed(1)+'" font-size="12" fill="#fff" fill-opacity=".9" font-family="IBM Plex Mono,monospace">'+a+'°</text>'; }
  /* השמש האמיתית, גבוה בשמיים */
  if(ySun>-10){ s+='<circle cx="330" cy="'+ySun.toFixed(1)+'" r="34" fill="url(#sxGlow)"/><circle cx="330" cy="'+ySun.toFixed(1)+'" r="10" fill="#fff8dc"/>'; }
  else s+='<path d="M330 16 l-7 10 h14 Z" fill="#fff8dc"/>';
  /* התמונה שהמראה מורידה */
  s+='<path d="M330 '+Math.max(8,ySun+12).toFixed(1)+' V'+(yImg-13).toFixed(1)+'" stroke="#fff" stroke-opacity=".55" stroke-dasharray="3 5"/>';
  s+='<g id="sxImg" style="cursor:ns-resize"><circle cx="330" cy="'+yImg.toFixed(1)+'" r="26" fill="transparent"/>'
    +'<circle cx="330" cy="'+yImg.toFixed(1)+'" r="10" fill="'+(ok?'#7dffb0':'#ff8a3c')+'" stroke="#0a1b28" stroke-width="2"/></g>';
  s+='<path d="M14 '+(HZ-angle*PPD).toFixed(1)+' l-9 -6 v12 Z" fill="#ff8a3c"/>';
  if(ok) s+='<text x="348" y="'+(HZ-16)+'" font-size="15" fill="#0a1b28" font-weight="700" font-family="Assistant,sans-serif">נוגעת באופק</text>';
  view.innerHTML=s; deg.textContent=angle.toFixed(1)+'°'; go.disabled=!ok||step>1;
  var img=document.getElementById('sxImg'); if(img) img.addEventListener('pointerdown',startDrag);
}
var dragging=null;
function startDrag(ev){ dragging={y:ev.clientY,a:angle}; ev.preventDefault();
  window.addEventListener('pointermove',onDrag); window.addEventListener('pointerup',endDrag); window.addEventListener('pointercancel',endDrag); }
function onDrag(ev){ if(!dragging) return; var k=380/view.getBoundingClientRect().height;
  angle=Math.max(0,Math.min(80,dragging.a+(ev.clientY-dragging.y)*k/PPD)); rng.value=angle; drawView(); }
function endDrag(){ dragging=null; window.removeEventListener('pointermove',onDrag); window.removeEventListener('pointerup',endDrag); window.removeEventListener('pointercancel',endDrag); snap(); }
function snap(){ var ta=trueAlt(); if(Math.abs(ta-angle)<0.9&&Math.abs(ta-angle)>=0.35){ angle=Math.round(ta*10)/10; rng.value=angle; drawView(); } }
rng.addEventListener('input',function(){ angle=+rng.value; drawView(); });
rng.addEventListener('change',snap);

/* ---------- הגלובוס: הטלה אורתוגרפית על קנבס, קו החוף של Natural Earth ---------- */
var LAND=(function(){ var out=[],i,j,k; for(i=0;i<LAND50.length;i++){ var f=LAND50[i][0], ring=[], x=0, y=0;
    if(f.length<24) continue;                                                        /* איים זעירים לא נחוצים בקנה המידה הזה */
    for(k=0;k<f.length;k+=2){ x+=f[k]; y+=f[k+1]; if(k%4===0||f.length<160) ring.push([x/100,y/100]); } out.push(ring); } return out; })();
var G={lat0:0,lon0:0};
function proj(lon,lat){ var p=lat*D2R, l=(lon-G.lon0)*D2R, p0=G.lat0*D2R;
  var cosc=Math.sin(p0)*Math.sin(p)+Math.cos(p0)*Math.cos(p)*Math.cos(l);
  return [Math.cos(p)*Math.sin(l), Math.cos(p0)*Math.sin(p)-Math.sin(p0)*Math.cos(p)*Math.cos(l), cosc]; }
function dest(lat,lon,brg,dist){ var p1=lat*D2R, l1=lon*D2R, b=brg*D2R, d=dist*D2R;
  var p2=Math.asin(Math.sin(p1)*Math.cos(d)+Math.cos(p1)*Math.sin(d)*Math.cos(b));
  var l2=l1+Math.atan2(Math.sin(b)*Math.sin(d)*Math.cos(p1),Math.cos(d)-Math.sin(p1)*Math.sin(p2));
  return [l2*R2D,p2*R2D]; }
function drawGlobe(){
  var c=cv.getContext('2d'), W=cv.width, H=cv.height, R=Math.min(W,H)*0.47, cx=W/2, cy=H/2, i, j;
  c.clearRect(0,0,W,H);
  var g=c.createRadialGradient(cx-R*0.3,cy-R*0.35,R*0.1,cx,cy,R); g.addColorStop(0,'#1f5f8c'); g.addColorStop(1,'#08263c');
  c.beginPath(); c.arc(cx,cy,R,0,6.2832); c.fillStyle=g; c.fill();
  c.save(); c.beginPath(); c.arc(cx,cy,R,0,6.2832); c.clip();
  c.fillStyle='#51634a'; c.strokeStyle='rgba(235,245,250,.35)'; c.lineWidth=1;
  for(i=0;i<LAND.length;i++){ var ring=LAND[i], any=false, pts=[];
    for(j=0;j<ring.length;j++){ var q=proj(ring[j][0],ring[j][1]); if(q[2]>0) any=true; else { var m=Math.hypot(q[0],q[1])||1; q=[q[0]/m,q[1]/m,q[2]]; } pts.push(q); }
    if(!any) continue; c.beginPath();
    for(j=0;j<pts.length;j++){ var X=cx+pts[j][0]*R, Y=cy-pts[j][1]*R; if(j) c.lineTo(X,Y); else c.moveTo(X,Y); }
    c.closePath(); c.fill(); c.stroke(); }
  c.strokeStyle='rgba(255,255,255,.10)'; c.lineWidth=1;
  for(var lo=-180;lo<180;lo+=30) line(function(t){ return [lo,-90+t*180]; },90);
  for(var la=-60;la<=60;la+=30) line(function(t){ return [-180+t*360,la]; },180);
  function line(fn,n){ c.beginPath(); var pen=false; for(var k=0;k<=n;k++){ var p=fn(k/n), q=proj(p[0],p[1]);
      if(q[2]>0){ var X=cx+q[0]*R, Y=cy-q[1]*R; if(pen) c.lineTo(X,Y); else { c.moveTo(X,Y); pen=true; } } else pen=false; } c.stroke(); }
  /* המעגלים שווי־הגובה */
  sights.forEach(function(s,idx){ c.strokeStyle=idx?'#ffe27a':'#ff8a3c'; c.lineWidth=4; c.shadowColor='rgba(0,0,0,.5)'; c.shadowBlur=6;
    line(function(t){ return dest(s.sub.lat,s.sub.lon,t*360,90-s.alt); },360); c.shadowBlur=0;
    var q=proj(s.sub.lon,s.sub.lat); if(q[2]>0){ var X=cx+q[0]*R, Y=cy-q[1]*R; c.fillStyle=idx?'#ffe27a':'#ff8a3c';
      c.beginPath(); c.arc(X,Y,7,0,6.2832); c.fill(); c.font='600 22px Assistant, sans-serif'; c.textAlign='center'; c.fillStyle='#fff';
      c.fillText('השמש בזנית',X,Y-14); } });
  /* המיקום האמיתי: מופיע רק אחרי שתי מדידות, כדי שהחיתוך יפתיע */
  if(sights.length>=2||obs.who==='me'){ var b=proj(obs.lon,obs.lat), bx=cx+b[0]*R, by=cy-b[1]*R;
    c.strokeStyle='#fff'; c.lineWidth=3; c.beginPath(); c.arc(bx,by,15,0,6.2832); c.stroke();
    c.fillStyle='#fff'; c.font='700 26px Assistant, sans-serif'; c.textAlign='center'; c.fillText(obs.who==='me'?'אתם כאן':'אקסודוס',bx,by-24); }
  c.restore();
  c.beginPath(); c.arc(cx,cy,R,0,6.2832); c.strokeStyle='rgba(190,220,240,.35)'; c.lineWidth=2; c.stroke();
}
function centerGlobe(){ var s0=subsolar(times[0]); var dl=((s0.lon-obs.lon+540)%360)-180;
  G.lat0=obs.lat*0.55+s0.lat*0.25; G.lon0=obs.lon+dl*0.35; }

/* ---------- הזרימה ---------- */
function setStep(n){ step=n; for(var i=0;i<steps.length;i++) steps[i].className=(i<=n?'on':'');
  if(n<2){ angle=0; rng.value=0; when.textContent=(n===0?'מדידה ראשונה · ':'מדידה שנייה · ')+localHM(times[n],obs.lon)+(obs.who==='me'?' אצלכם':' אצל דניאל'); }
  if(n===0) say.innerHTML='גררו את השמש הכתומה למטה, עד שהיא נוגעת באופק.<span>זה מה שסקסטנט עושה: מראה שמורידה את השמש, וסולם שמודד בכמה.</span>';
  drawView(); drawGlobe(); }
go.addEventListener('click',function(){
  var t=times[step], ta=altAt(t,obs.lat,obs.lon); sights.push({alt:ta,sub:subsolar(t)});
  if(step===0){ say.innerHTML='השמש בגובה <span class="num" style="display:inline;color:inherit;font-size:inherit">'+ta.toFixed(1)+'°</span>. בכל נקודה על הקו הכתום רואים אותה עכשיו בדיוק בגובה הזה — אז הסירה איפשהו עליו.<span>קו, לא נקודה. בשביל נקודה צריך מדידה שנייה, אחרי שהשמש זזה.</span>'; setStepKeep(1); }
  else { say.innerHTML='שני הקווים נחתכים בשתי נקודות, ורק אחת מהן על המסלול: שם הסירה.<span>כך דניאל מנווט: סקסטנט אמיתי ושעון מדויק. GPS אסור במרוץ.</span><button type="button" class="sx-btn" id="sxMe" style="margin-top:.7em">ומהמקום שלכם?</button> <button type="button" class="sx-btn" id="sxAgain" style="margin-top:.7em;background:transparent;border:1px solid var(--line-2);color:var(--ink-2)">שוב</button>';
    setStepKeep(2); wireEnd(); } });
function setStepKeep(n){ var keep=say.innerHTML; setStep(n); say.innerHTML=keep; if(n===2){ when.textContent='שתי מדידות, מיקום אחד'; go.disabled=true; } }
function wireEnd(){
  var again=document.getElementById('sxAgain'), me=document.getElementById('sxMe');
  if(again) again.addEventListener('click',function(){ obs={lat:FIX.lat,lon:FIX.lon,who:'boat'}; restart(); });
  if(me) me.addEventListener('click',function(){
    if(!navigator.geolocation){ say.innerHTML='הדפדפן הזה לא נותן מיקום.'; return; }
    say.innerHTML='מבקש מיקום מהדפדפן…<span>המיקום נשאר במכשיר שלכם. הוא לא נשלח לשום מקום.</span>';
    navigator.geolocation.getCurrentPosition(function(p){ obs={lat:p.coords.latitude,lon:p.coords.longitude,who:'me'}; restart();
      if(altAt(times[0],obs.lat,obs.lon)<3) say.innerHTML='אצלכם השמש נמוכה מדי בשעות המדידה היום. נסו שוב בעונה אחרת, או חזרו לאקסודוס.';
    },function(){ say.innerHTML='בלי מיקום אי אפשר למדוד מהמקום שלכם. אפשר לנסות שוב, או להישאר עם אקסודוס.<button type="button" class="sx-btn" id="sxAgain" style="margin-top:.7em">חזרה לאקסודוס</button>'; wireEnd(); },{maximumAge:600000,timeout:15000}); });
}
function restart(){ sights=[]; times=plan(); centerGlobe(); setStep(0); }
restart();
})();
