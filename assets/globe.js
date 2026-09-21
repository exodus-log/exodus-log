/* ===== globe.js — המפה והגלובוס (MapLibre GL, הטלת globe) =====
   נטען רק כשמתקרבים למקטע "המסע". הכול מקומי: אריחי Blue Marble של NASA שנאפו פעם אחת לתיקיית assets/tiles,
   קו החוף של Natural Earth מ-land50.js, קו המסלול הרשמי ונקודות החובה מ-course.js, והמיקומים מ-data.js.
   אין כאן פנייה לשום שרת חיצוני, ולכן הגלובוס לא נופל ביום שבו אלף אנשים נכנסים יחד. */
(function(){
'use strict';
if(typeof maplibregl==='undefined'||typeof FIX==='undefined') return;
var box=document.getElementById('globe'); if(!box) return;
var EXO=window.EXO||null, D2R=Math.PI/180, R2D=180/Math.PI;
var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function $(id){ return document.getElementById(id); }
function pad(v){ return (v<10?'0':'')+v; }
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }

/* ---------- גאוגרפיה ---------- */
function landGeoJSON(){
  var feats=[],i,j,k;
  for(i=0;i<LAND50.length;i++){ var poly=[];
    for(j=0;j<LAND50[i].length;j++){ var f=LAND50[i][j], ring=[], x=0, y=0;
      for(k=0;k<f.length;k+=2){ x+=f[k]; y+=f[k+1]; ring.push([x/100,y/100]); }
      ring.push(ring[0]); poly.push(ring); }
    feats.push({type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:poly}}); }
  return {type:'FeatureCollection',features:feats};
}
function parseLL(str){ return str.split(' ').map(function(p){ var a=p.split(','); return [+a[1],+a[0]]; }); }   /* → [lon,lat] */
function unwrap(pts){ var out=[pts[0].slice()],i; for(i=1;i<pts.length;i++){ var p=pts[i].slice(), prev=out[i-1][0];
  while(p[0]-prev>180) p[0]-=360; while(p[0]-prev<-180) p[0]+=360; out.push(p); } return out; }
function gcNm(a,b){ var p1=a[1]*D2R,p2=b[1]*D2R,dl=(b[0]-a[0])*D2R;
  return Math.acos(Math.min(1,Math.sin(p1)*Math.sin(p2)+Math.cos(p1)*Math.cos(p2)*Math.cos(dl)))*R2D*60; }

/* ---------- המסלול של אקסודוס, עם זמן לכל נקודה ---------- */
var TRACK=(function(){
  var out=[], la=0, lo=0, arr=ME_TRACK.split(' '), i;
  for(i=0;i<arr.length;i++){ var a=arr[i].split(','); la+=+a[0]; lo+=+a[1];
    out.push({t:(i<arr.length-1)?RACE_START+i*ME_STEP:null, p:[lo/100,la/100]}); }
  var bakeEnd=RACE_START+(arr.length-2)*ME_STEP; out[out.length-1].t=Math.max(bakeEnd+1,Math.min(FIX.at,bakeEnd+ME_STEP));
  /* מה שנוסף ל-TRACKP אחרי האפייה: ממשיכים מהנקודה הקרובה ביותר לסוף ההיסטוריה, בזמנים שווי-מרווח עד נקודת הציון האחרונה */
  if(FIX.at>out[out.length-1].t+1800){ var tp=parseLL(TRACKP), last=out[out.length-1].p, best=-1, bd=1e9;
    for(i=0;i<tp.length;i++){ var d=gcNm(tp[i],last); if(d<bd){ bd=d; best=i; } }
    var tail=tp.slice(best+1), t0=out[out.length-1].t;
    for(i=0;i<tail.length;i++) out.push({t:t0+(FIX.at-t0)*(i+1)/tail.length, p:tail[i]}); }
  var end=out[out.length-1]; if(gcNm(end.p,[FIX.lon,FIX.lat])>0.5) out.push({t:FIX.at,p:[FIX.lon,FIX.lat]}); else end.t=FIX.at;
  return out; })();
var T0=RACE_START, T1=FIX.at;

/* ---------- היסטוריית הצי: כל 12 שעות, ומהסוף שלה עד המצב הנוכחי ב-data.js ---------- */
var FH=(function(){ var m={}; HIST.split(';').forEach(function(row){ var v=row.split(',').map(Number), id=v[0], a=[], la=0, lo=0, d=0;
    for(var i=1;i<v.length;i+=3){ la+=v[i]; lo+=v[i+1]; d+=v[i+2]; a.push([lo/100,la/100,d]); } m[id]=a; }); return m; })();
function fleetAt(t){
  var out=[]; FLEET.forEach(function(f){ var h=FH[f[1]], cur=[f[3],f[2],f[5]], p;
    if(!h){ p=cur; } else { var k=(t-T0)/HIST_STEP, n=h.length-1, hEnd=T0+n*HIST_STEP;
      if(k<=0) p=h[0]; else if(k<n){ var i=Math.floor(k), fr=k-i; p=[h[i][0]+(h[i+1][0]-h[i][0])*fr, h[i][1]+(h[i+1][1]-h[i][1])*fr, h[i][2]+(h[i+1][2]-h[i][2])*fr]; }
      else { var fr2=(T1>hEnd)?Math.min(1,(t-hEnd)/(T1-hEnd)):1; p=[h[n][0]+(cur[0]-h[n][0])*fr2, h[n][1]+(cur[1]-h[n][1])*fr2, h[n][2]+(cur[2]-h[n][2])*fr2]; } }
    out.push({id:f[1],name:f[4],lon:p[0],lat:p[1],dtf:p[2],dmg:f[6]}); });
  out.sort(function(a,b){ return a.dtf-b.dtf; }); out.forEach(function(o,i){ o.rank=i+1; }); return out; }
function trackAt(t){ var pts=[],i; for(i=0;i<TRACK.length&&TRACK[i].t<=t;i++) pts.push(TRACK[i].p);
  if(i>0&&i<TRACK.length){ var a=TRACK[i-1], b=TRACK[i], f=(t-a.t)/((b.t-a.t)||1); pts.push([a.p[0]+(b.p[0]-a.p[0])*f, a.p[1]+(b.p[1]-a.p[1])*f]); }
  if(!pts.length) pts.push(TRACK[0].p); if(pts.length<2) pts.push(pts[0]); return pts; }
function headingAt(pts){ var n=pts.length; if(n<2) return FIX.cog; var a=pts[Math.max(0,n-3)], b=pts[n-1];
  var y=Math.sin((b[0]-a[0])*D2R)*Math.cos(b[1]*D2R), x=Math.cos(a[1]*D2R)*Math.sin(b[1]*D2R)-Math.sin(a[1]*D2R)*Math.cos(b[1]*D2R)*Math.cos((b[0]-a[0])*D2R);
  return (Math.atan2(y,x)*R2D+360)%360; }

/* המסלול שנותר: מהסירה אל הקטע הקרוב בקו המסלול הרשמי, ומשם עד קו הסיום.
   קו המסלול של המעקב הוא ציור, לא חובה: נקודות הביניים שלו אינן נקודות חובה. לכן מדלגים על נקודות ביניים
   כל עוד הקו הישר מהסירה אל הנקודה שאחריהן עובר בים פתוח, ולעולם לא עוברים על פני נקודה שמייצגת נקודת חובה או כף. */
var landRings=null;
function landIndex(){ if(landRings) return landRings;
  if(typeof LAND50==='undefined') return [];   /* קו החוף עוד לא נטען: לא שומרים, ננסה שוב בקריאה הבאה */
  landRings=[];
  for(var i=0;i<LAND50.length;i++) for(var j=0;j<LAND50[i].length;j++){ var f=LAND50[i][j], r=[], x=0, y=0, k, b=[1e9,1e9,-1e9,-1e9];
    for(k=0;k<f.length;k+=2){ x+=f[k]; y+=f[k+1]; var p=[x/100,y/100]; r.push(p);
      if(p[0]<b[0]) b[0]=p[0]; if(p[1]<b[1]) b[1]=p[1]; if(p[0]>b[2]) b[2]=p[0]; if(p[1]>b[3]) b[3]=p[1]; }
    landRings.push({r:r,b:b,hole:j>0}); }
  return landRings; }
function onLand(p){ var L=landIndex(), inside=false, i, k, n;
  for(i=0;i<L.length;i++){ var b=L[i].b; if(p[0]<b[0]||p[0]>b[2]||p[1]<b[1]||p[1]>b[3]) continue;
    var r=L[i].r, c=false; for(k=0,n=r.length-1;k<r.length;n=k++){ var a=r[k], d=r[n];
      if(((a[1]>p[1])!==(d[1]>p[1]))&&(p[0]<(d[0]-a[0])*(p[1]-a[1])/(d[1]-a[1])+a[0])) c=!c; }
    if(c) inside=!inside; }
  return inside; }
function openSea(a,b){ var n=Math.max(2,Math.ceil(gcNm(a,b)/12)), dl=b[0]-a[0], s;
  if(dl>180) dl-=360; if(dl<-180) dl+=360;
  for(s=1;s<n;s++){ var f=s/n, lo=a[0]+dl*f; lo=((lo+540)%360)-180; if(onLand([lo,a[1]+(b[1]-a[1])*f])) return false; }
  return true; }
var courseStops=null;
function stopsOn(c){ if(courseStops) return courseStops; courseStops={};
  (typeof MARKS!=='undefined'?MARKS:[]).forEach(function(m){ var p=[m[1],m[0]], bi=0, bd=1e9;
    c.forEach(function(q,i){ var d=gcNm(p,q); if(d<bd){ bd=d; bi=i; } }); courseStops[bi]=true; });
  return courseStops; }
var remMemo={};
function remaining(from){ var key=from[0].toFixed(2)+','+from[1].toFixed(2); if(remMemo[key]) return remMemo[key];
  var c=parseLL(COURSE), best=0, bd=1e9, i;
  for(i=0;i<c.length-1;i++){ var mid=[(c[i][0]+c[i+1][0])/2,(c[i][1]+c[i+1][1])/2], d=gcNm(from,c[i])+gcNm(from,c[i+1])-gcNm(c[i],c[i+1]);
    if(Math.abs(c[i][0]-c[i+1][0])>180) continue; if(d<bd&&i<c.length/2){ bd=d; best=i; } }
  var nxt=best+1, stop=stopsOn(c), coast=typeof LAND50!=='undefined';   /* בלי קו חוף לא מקצרים */
  while(coast && nxt+1<c.length/2 && !stop[nxt] && openSea(from,c[nxt+1])) nxt++;
  var rest=unwrap([from].concat(c.slice(nxt))), cut=rest.length-1;
  for(i=rest.length-1;i>0;i--){ if(rest[i][1]<0){ cut=i; break; } }       /* חציית קו המשווה בדרך הביתה */
  var out=[rest.slice(0,cut+1), rest.slice(cut)]; if(coast) remMemo[key]=out; return out; }

/* ---------- לילה: שלושה מצולעים (שמש מתחת ל-0°, ‎−6°, ‎−12°) שיוצרים קצה רך ---------- */
function nightPolys(ms){
  if(!EXO||!EXO.astro) return {type:'FeatureCollection',features:[]};
  var alt=function(la,lo){ return EXO.astro.sunPos(ms,la,lo).alt*R2D; }, feats=[];
  var darkSouth=alt(-80,0)+alt(-80,90)+alt(-80,180)+alt(-80,-90) < alt(80,0)+alt(80,90)+alt(80,180)+alt(80,-90);
  [0,-6,-12].forEach(function(h){ var line=[], lo;
    for(lo=-180;lo<=180;lo+=3){ var a=-85,b=85, fa=alt(a,lo)-h, fb=alt(b,lo)-h, la;
      if(fa*fb>0){
        /* כל קו האורך בצד אחד: חשוך כולו → עד הקוטב המואר; מואר כולו → נשארים בקוטב החשוך */
        la=(fa<0&&fb<0)?(darkSouth?85:-85):(darkSouth?-85:85); }
      else { for(var it=0;it<22;it++){ var m=(a+b)/2, fm=alt(m,lo)-h; if((fm<0)===(fa<0)){ a=m; fa=fm; } else { b=m; } } la=(a+b)/2; }
      line.push([lo,la]); }
    var pole=darkSouth?-85.05:85.05, ring=line.slice(); ring.push([180,pole]); ring.push([-180,pole]); ring.push(line[0]);
    feats.push({type:'Feature',properties:{h:h},geometry:{type:'Polygon',coordinates:[ring]}}); });
  return {type:'FeatureCollection',features:feats};
}

/* ---------- המפה ---------- */
var tiles=new URL('assets/tiles/earth/',location.href).href+'{z}/{x}/{y}.jpg';
var here=[FIX.lon,FIX.lat];
var style={ version:8, projection:{type:'globe'},
  sky:{'atmosphere-blend':['interpolate',['linear'],['zoom'],0,1,4.5,0.85,7,0]},
  /* בלי light מכוון-מפה: MapLibre מצלה בעזרתו צד שלם של הכדור, וזה טרמינטור מזויף
     שאין לו קשר לשמש האמיתית. קו היום והלילה מגיע משכבת night למטה, שמחושבת אסטרונומית. */
  light:{anchor:'viewport',position:[1.15,210,30],intensity:0.5},
  sources:{
    earth:{type:'raster',tiles:[tiles],tileSize:512,minzoom:0,maxzoom:3,attribution:'כדור הארץ: NASA Blue Marble'},
    land:{type:'geojson',data:landGeoJSON(),attribution:'קו חוף: Natural Earth'},
    night:{type:'geojson',data:{type:'FeatureCollection',features:[]}},
    todo:{type:'geojson',data:{type:'FeatureCollection',features:remaining(here).map(function(l,i){ return {type:'Feature',properties:{leg:i},geometry:{type:'LineString',coordinates:l}}; })},attribution:'מסלול ומיקומים: YB Tracking'},
    done:{type:'geojson',data:{type:'Feature',properties:{},geometry:{type:'LineString',coordinates:trackAt(T1)}}},
    marks:{type:'geojson',data:{type:'FeatureCollection',features:MARKS.map(function(m){ return {type:'Feature',properties:{name:m[2],kind:m[3]},geometry:{type:'Point',coordinates:[m[1],m[0]]}}; })}},
    fleet:{type:'geojson',data:{type:'FeatureCollection',features:[]}}
  },
  layers:[
    {id:'space',type:'background',paint:{'background-color':'#02060b'}},
    {id:'earth',type:'raster',source:'earth',paint:{'raster-fade-duration':200,'raster-saturation':-0.08,'raster-contrast':0.06,'raster-brightness-max':0.96}},
    {id:'land-fill',type:'fill',source:'land',paint:{'fill-color':'#4a5a44','fill-opacity':['interpolate',['linear'],['zoom'],4.2,0,6,0.9]}},
    {id:'land-line',type:'line',source:'land',paint:{'line-color':'rgba(235,245,250,.55)','line-width':['interpolate',['linear'],['zoom'],2,0.2,5,0.7,8,1.3],'line-opacity':['interpolate',['linear'],['zoom'],2.2,0,3.6,0.7]}},
    {id:'night',type:'fill',source:'night',paint:{'fill-color':'#01040c','fill-opacity':0.24,'fill-antialias':false}},
    {id:'todo',type:'line',source:'todo',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#ffffff','line-opacity':['case',['==',['get','leg'],1],0.30,0.74],'line-width':['interpolate',['linear'],['zoom'],0,1.1,5,2],'line-dasharray':[1.5,2.2]}},
    {id:'done-glow',type:'line',source:'done',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#ff8a3c','line-width':['interpolate',['linear'],['zoom'],0,5,6,12],'line-opacity':0.28,'line-blur':4}},
    {id:'done',type:'line',source:'done',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#ff8a3c','line-width':['interpolate',['linear'],['zoom'],0,2,6,3.6]}},
    {id:'marks-wp',type:'circle',source:'marks',filter:['==',['get','kind'],'wp'],paint:{'circle-radius':2.6,'circle-color':'rgba(255,255,255,.75)'}},
    {id:'marks',type:'circle',source:'marks',filter:['!=',['get','kind'],'wp'],paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,3.4,5,6],'circle-color':'rgba(5,16,25,.55)','circle-stroke-color':'#fff','circle-stroke-width':1.8}},
    {id:'fleet',type:'circle',source:'fleet',paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,2,3,3.2,6,6],'circle-color':['case',['==',['get','rank'],1],'#8fd0ff','rgba(240,246,249,.9)'],'circle-stroke-color':'#06121b','circle-stroke-width':1.2}}
  ]};

var map;
try{
  map=new maplibregl.Map({ container:box, style:style, center:[-24,8], zoom:1.6, minZoom:0.6, maxZoom:8.5, attributionControl:false,
    cooperativeGestures:true, dragRotate:false, pitchWithRotate:false, touchPitch:false, renderWorldCopies:false, fadeDuration:150,
    locale:{ 'CooperativeGesturesHandler.WindowsHelpText':'Ctrl + גלגלת כדי להתקרב ולהתרחק', 'CooperativeGesturesHandler.MacHelpText':'⌘ + גלגלת כדי להתקרב ולהתרחק',
             'CooperativeGesturesHandler.MobileHelpText':'שתי אצבעות כדי להזיז את הגלובוס' } });
}catch(e){ box.innerHTML='<div class="gl-fail">הגלובוס צריך WebGL, והדפדפן הזה לא מריץ אותו.</div>'; return; }
map.addControl(new maplibregl.AttributionControl({compact:true}),'top-left');
map.touchZoomRotate.disableRotation();
window.__exoMap=map;
function farClass(){ box.classList.toggle('far',map.getZoom()<2.7); } map.on('zoom',farClass); farClass();

/* אקסודוס: סמן HTML, כדי שיהיה חד ויסתובב לפי הכיוון */
var boatEl=document.createElement('div'); boatEl.className='gl-boat';
boatEl.innerHTML='<span></span><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 3 C28 14 28 27 20 37 C12 27 12 14 20 3 Z" fill="#ff8a3c" stroke="#fff" stroke-width="2.2"/></svg>';
var boat=new maplibregl.Marker({element:boatEl,rotationAlignment:'map',pitchAlignment:'map',opacityWhenCovered:'0'}).setLngLat(here).setRotation(FIX.cog).addTo(map);
var labels=[]; MARKS.forEach(function(m){ if(!m[2]) return; var e=document.createElement('div'); e.className='gl-label k-'+m[3]; e.textContent=m[2];
  labels.push(new maplibregl.Marker({element:e,anchor:'top',offset:[0,7],opacityWhenCovered:'0'}).setLngLat([m[1],m[0]]).addTo(map)); });
var meLab=document.createElement('div'); meLab.className='gl-label k-me'; meLab.textContent='אקסודוס';
var meMarker=new maplibregl.Marker({element:meLab,anchor:'bottom',offset:[0,-16],opacityWhenCovered:'0'}).setLngLat(here).addTo(map);
var css=document.createElement('style'); css.textContent=
  '.gl-boat{width:30px;height:30px}.gl-boat svg{width:30px;height:30px;display:block;filter:drop-shadow(0 2px 6px rgba(0,0,0,.6))}'
 +'.gl-boat span{position:absolute;inset:-9px;border-radius:50%;border:2px solid #ff8a3c;opacity:0;animation:glping 2.6s ease-out infinite}'
 +'@keyframes glping{0%{transform:scale(.35);opacity:.9}100%{transform:scale(1.25);opacity:0}}'
 +'.gl-label{font:600 13px Assistant,sans-serif;color:#fff;text-shadow:0 1px 4px #000,0 0 10px rgba(0,0,0,.85);white-space:nowrap;pointer-events:none;direction:rtl}'
 +'.far .gl-label.k-home{display:none}.gl-label.k-cape{font-weight:400;color:#d7e6ef;font-size:12px}.gl-label.k-me{color:#ffb27a;font-size:14px}.gl-label.k-home{color:#d7e6ef;font-weight:400;font-size:12px}'
 +'@media (prefers-reduced-motion:reduce){.gl-boat span{animation:none;opacity:.5;transform:scale(.8)}}';
document.head.appendChild(css);

/* ---------- ציור מצב לזמן t ---------- */
var todoMoved=false;
function todoFC(from){ return {type:'FeatureCollection',features:remaining(from).map(function(l,i){ return {type:'Feature',properties:{leg:i},geometry:{type:'LineString',coordinates:l}}; })}; }
var out=$('scOut'), range=$('scRange'), playBtn=$('scPlay'), icon=$('scIcon'), nightOn=true;
function fleetFC(list){ return {type:'FeatureCollection',features:list.filter(function(o){ return o.id!==4; }).map(function(o){
  return {type:'Feature',properties:{name:o.name,rank:o.rank,dtf:Math.round(o.dtf),dmg:o.dmg},geometry:{type:'Point',coordinates:[o.lon,o.lat]}}; })}; }
function draw(t,live){
  var pts=trackAt(t), pos=pts[pts.length-1], fl=fleetAt(t), me=null, i;
  for(i=0;i<fl.length;i++) if(fl[i].id===4) me=fl[i];
  if(live){ pos=here; }
  map.getSource('done').setData({type:'Feature',properties:{},geometry:{type:'LineString',coordinates:live?pts.concat([here]):pts}});
  map.getSource('fleet').setData(fleetFC(fl));
  boat.setLngLat(pos).setRotation(live?FIX.cog:headingAt(pts)); meMarker.setLngLat(pos);
  if(!live||todoMoved){ todoMoved=!live; map.getSource('todo').setData(todoFC(pos)); }
  var day=Math.floor((t-T0)/86400)+1, d=new Date(t*1000);
  out.innerHTML=live?('עכשיו · יום <span class="num">'+FIX.dayN+'</span> · מקום <span class="num">'+FIX.rank+'</span>')
    :('<span class="num">'+d.getUTCDate()+'.'+(d.getUTCMonth()+1)+'</span> · יום <span class="num">'+day+'</span> · מקום <span class="num">'+(me?me.rank:'—')+'</span>');
  if(nightOn!==live){ nightOn=live; map.setLayoutProperty('night','visibility',live?'visible':'none'); }
  return pos;
}
function tOf(v){ return T0+(T1-T0)*v/1000; }

/* שנתות לפס הזמן: כל כמה ימים, לפי אורך המסע */
(function(){ var days=(T1-T0)/86400, step=days>120?30:days>40?10:days>16?5:2, h='', d;
  for(d=0;d<=days;d+=step) h+='<span style="left:'+(d/days*100).toFixed(1)+'%">'+(d===0?'זינוק':'יום '+d)+'</span>';
  $('scTicks').innerHTML=h; })();

var playing=null;
function stop(){ if(playing){ cancelAnimationFrame(playing.raf); playing=null; } icon.setAttribute('d','M8 5v14l11-7z'); playBtn.setAttribute('aria-label','נגן את המסע מהזינוק'); }
function play(){
  stop(); var t0=performance.now(), DUR=reduce?1:15000, from=(+range.value>=995)?0:+range.value;
  icon.setAttribute('d','M7 5h4v14H7zM13 5h4v14h-4z'); playBtn.setAttribute('aria-label','עצור');
  setChip(null);
  var bounds=new maplibregl.LngLatBounds(); TRACK.forEach(function(q){ bounds.extend(q.p); });
  map.fitBounds(bounds,{padding:{top:70,bottom:110,left:50,right:50},maxZoom:5.2,duration:reduce?0:900});
  playing={raf:0};
  (function step(now){ var f=Math.min(1,(now-t0)/DUR), v=from+(1000-from)*f; range.value=v; draw(tOf(v),v>=999.5);
    if(f<1) playing.raf=requestAnimationFrame(step); else stop(); })(t0);
}
playBtn.addEventListener('click',function(){ if(playing) stop(); else play(); });
range.addEventListener('input',function(){ stop(); draw(tOf(+range.value),+range.value>=999.5); });

/* ---------- מבטים ---------- */
var chips=document.querySelectorAll('#globeChips button');
function setChip(name){ for(var i=0;i<chips.length;i++) chips[i].setAttribute('aria-pressed',chips[i].getAttribute('data-fly')===name?'true':'false'); }
function fly(name){ setChip(name); stop(); range.value=1000; draw(T1,true); var dur=reduce?0:2200;
  if(name==='boat') map.flyTo({center:here,zoom:4.6,duration:dur,essential:true});
  else if(name==='fleet'){ var b=new maplibregl.LngLatBounds(); FLEET.forEach(function(f){ b.extend([f[3],f[2]]); });
    map.fitBounds(b,{padding:{top:80,bottom:120,left:60,right:60},maxZoom:6.2,duration:dur,essential:true}); }
  else map.flyTo({center:[FIX.lon-8,Math.max(-35,FIX.lat-28)],zoom:worldZoom(),duration:dur,essential:true}); }
/* הזום שבו הכדור כולו ממלא את התיבה: קוטר הכדור בפיקסלים הוא 512·2^z/π */
function worldZoom(){ var d=Math.min(box.clientWidth,box.clientHeight-150)*0.94; return Math.max(0.6,Math.log(d*Math.PI/512)/Math.LN2); }
for(var ci=0;ci<chips.length;ci++) chips[ci].addEventListener('click',function(){ fly(this.getAttribute('data-fly')); });

/* הקשה על סירה: שם, מקום, פער */
var pop=new maplibregl.Popup({closeButton:false,offset:10,className:'gl-pop-wrap'});
map.on('click','fleet',function(e){ var p=e.features[0].properties;
  pop.setLngLat(e.features[0].geometry.coordinates).setHTML('<div class="gl-pop"><b>'+esc(p.name)+'</b>מקום '+p.rank+' · '+Number(p.dtf).toLocaleString('en-US')+' מייל לסיום</div>').addTo(map); });
map.on('mouseenter','fleet',function(){ map.getCanvas().style.cursor='pointer'; });
map.on('mouseleave','fleet',function(){ map.getCanvas().style.cursor=''; });

map.on('load',function(){
  draw(T1,true);
  var att=box.querySelector('.maplibregl-ctrl-attrib'); if(att){ att.classList.remove('maplibregl-compact-show'); att.removeAttribute('open'); }
  function night(){ map.getSource('night').setData(nightPolys((EXO&&EXO.state)?EXO.state.now:Date.now())); }
  night(); setInterval(night,5*60000);
  /* הכניסה: מהעולם כולו אל הסירה, פעם אחת, כשהגלובוס באמת נכנס למסך */
  var seen=false; function intro(){ if(seen) return; seen=true; setTimeout(function(){ fly('boat'); },650); }
  if('IntersectionObserver' in window){ var io=new IntersectionObserver(function(en){ if(en[0].isIntersecting&&en[0].intersectionRatio>0.45){ io.disconnect(); intro(); } },{threshold:[0.45]}); io.observe(box); }
  else intro();
});
})();
