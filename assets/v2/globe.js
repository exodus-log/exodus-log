/* ===== v2/globe.js — נבנה אוטומטית מ-assets/globe.js: אותו גלובוס, בצבעי הגרסה החדשה. לא עורכים ביד. =====
   ===== globe.js — המפה והגלובוס (MapLibre GL, הטלת globe) =====
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
  var end=out[out.length-1]; if(gcNm(end.p,[FIX.lon,FIX.lat])>0.5) out.push({t:FIX.at,p:[FIX.lon,FIX.lat]}); else { end.t=FIX.at; end.p=[FIX.lon,FIX.lat]; }
  return out; })();
var T0=RACE_START, T1=FIX.at;

/* ---------- היסטוריית הצי: כל 12 שעות, ומהסוף שלה עד המצב הנוכחי ב-data.js ---------- */
var FH=(function(){ var m={}; HIST.split(';').forEach(function(row){ var v=row.split(',').map(Number), id=v[0], a=[], la=0, lo=0, d=0;
    for(var i=1;i<v.length;i+=3){ la+=v[i]; lo+=v[i+1]; d+=v[i+2]; a.push([lo/100,la/100,d]); } m[id]=a; }); return m; })();
function fleetAt(t){
  var out=[]; FLEET.forEach(function(f){ var p=fleetTrackAt(f[1],t)||[f[3],f[2],f[5]];
    out.push({id:f[1],name:f[4],lon:((p[0]+540)%360)-180,lat:p[1],dtf:p[2],dmg:f[6]}); });
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
var tiles=new URL('assets/tiles/earth/',document.baseURI).href+'{z}/{x}/{y}.jpg';
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
    {id:'done-glow',type:'line',source:'done',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#03101a','line-width':['interpolate',['linear'],['zoom'],0,5,6,12],'line-opacity':0.55,'line-blur':4}},
    {id:'done',type:'line',source:'done',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#ffffff','line-width':['interpolate',['linear'],['zoom'],0,2,6,3.6]}},
    {id:'marks-wp',type:'circle',source:'marks',filter:['==',['get','kind'],'wp'],paint:{'circle-radius':2.6,'circle-color':'rgba(255,255,255,.75)'}},
    {id:'marks',type:'circle',source:'marks',filter:['!=',['get','kind'],'wp'],paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,3.4,5,6],'circle-color':'rgba(5,16,25,.55)','circle-stroke-color':'#fff','circle-stroke-width':1.8}},
    {id:'fleet',type:'circle',source:'fleet',paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,2,3,3.2,6,6],'circle-color':['case',['==',['get','est'],1],'#f1cf8a',['==',['get','rank'],1],'#8fd0ff','rgba(240,246,249,.9)'],'circle-stroke-color':'#06121b','circle-stroke-width':1.2}}
  ]};

var map;
try{
  map=new maplibregl.Map({ container:box, style:style, center:here, zoom:5.6, minZoom:-1.6, maxZoom:16, attributionControl:false,
    cooperativeGestures:false, dragRotate:false, pitchWithRotate:false, touchPitch:false, renderWorldCopies:false, fadeDuration:0,
    locale:{ 'CooperativeGesturesHandler.WindowsHelpText':'Ctrl + גלגלת כדי להתקרב ולהתרחק', 'CooperativeGesturesHandler.MacHelpText':'⌘ + גלגלת כדי להתקרב ולהתרחק',
             'CooperativeGesturesHandler.MobileHelpText':'שתי אצבעות כדי להזיז את הגלובוס' } });
}catch(e){ box.innerHTML='<div class="gl-fail">הגלובוס צריך WebGL, והדפדפן הזה לא מריץ אותו.</div>'; return; }
map.addControl(new maplibregl.AttributionControl({compact:true}),'top-left');
map.touchZoomRotate.disableRotation();
window.__exoMap=map; window.__exoFly=function(n){ try{ fly(n); }catch(e){} };
function farClass(){ box.classList.toggle('far',map.getZoom()<2.7); } map.on('zoom',farClass); farClass();

/* אקסודוס: סמן HTML, כדי שיהיה חד ויסתובב לפי הכיוון */
var boatEl=document.createElement('div'); boatEl.className='gl-boat';
boatEl.innerHTML='<span></span><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 3 C28 14 28 27 20 37 C12 27 12 14 20 3 Z" fill="#ffffff" stroke="#06121b" stroke-width="2.2"/></svg>';
var boat=backWatch(new maplibregl.Marker({element:boatEl,rotationAlignment:'map',pitchAlignment:'map',opacityWhenCovered:'0'}).setLngLat(here).setRotation(FIX.cog).addTo(map),'boat');
var labels=[]; MARKS.forEach(function(m){ if(!m[2]) return; var e=document.createElement('div'); e.className='gl-label k-'+m[3]; e.textContent=m[2];
  labels.push(backWatch(new maplibregl.Marker({element:e,anchor:'top',offset:[0,7],opacityWhenCovered:'0'}).setLngLat([m[1],m[0]]).addTo(map))); });
var meLab=document.createElement('div'); meLab.className='gl-label k-me'; meLab.textContent='אקסודוס';
var meMarker=backWatch(new maplibregl.Marker({element:meLab,anchor:'bottom',offset:[0,-16],opacityWhenCovered:'0'}).setLngLat(here).addTo(map));
var css=document.createElement('style'); css.textContent=
  '.gl-boat{width:30px;height:30px;opacity:var(--bk,1)}.gl-boat svg{width:30px;height:30px;display:block;filter:drop-shadow(0 2px 6px rgba(0,0,0,.6))}'
 +'.gl-boat span{position:absolute;inset:-9px;border-radius:50%;border:2px solid #ffffff;opacity:0;animation:glping 2.6s ease-out infinite}'
 +'@keyframes glping{0%{transform:scale(.35);opacity:.9}100%{transform:scale(1.25);opacity:0}}'
 +'.gl-label{font:500 13px Heebo,sans-serif;color:#fff;text-shadow:0 1px 4px #000,0 0 10px rgba(0,0,0,.85);white-space:nowrap;pointer-events:none;direction:rtl;opacity:var(--bk,1)}'
 +'.far .gl-label.k-home{display:none}.gl-label.k-cape{font-weight:400;color:#d7e6ef;font-size:12px}.gl-label.k-me{color:#ffffff;font-size:14px}.gl-label.k-home{color:#d7e6ef;font-weight:400;font-size:12px}'
 +'@media (prefers-reduced-motion:reduce){.gl-boat span{animation:none;opacity:.5;transform:scale(.8)}}';
document.head.appendChild(css);

/* ---------- ציור מצב לזמן t ---------- */
var todoMoved=false;
function todoFC(from){ return {type:'FeatureCollection',features:remaining(from).map(function(l,i){ return {type:'Feature',properties:{leg:i},geometry:{type:'LineString',coordinates:l}}; })}; }
var out=$('scOut'), range=$('scRange'), playBtn=$('scPlay'), icon=$('scIcon'), nightOn=true;
function fleetFC(list){ return {type:'FeatureCollection',features:list.filter(function(o){ return o.id!==4; }).map(function(o){
  return {type:'Feature',properties:{name:o.name,rank:o.rank,dtf:Math.round(o.dtf),dmg:o.dmg,est:o.est?1:0},geometry:{type:'Point',coordinates:[o.lon,o.lat]}}; })}; }
function draw(t,live){
  var pts=trackAt(t), pos=pts[pts.length-1], fl=fleetAt(t), me=null, i;
  var fut=fcDraw(t,fl);
  for(i=0;i<fl.length;i++) if(fl[i].id===4) me=fl[i];
  if(live){ pos=here; } else if(fut&&me&&me.est){ pos=[me.lon,me.lat]; }
  map.getSource('done').setData({type:'Feature',properties:{},geometry:{type:'LineString',coordinates:live?pts.concat([here]):pts}});
  map.getSource('fleet').setData(fleetFC(fl));
  boat.setLngLat(pos).setRotation(live?FIX.cog:(fut&&me&&me.est?headingAt([here,pos]):headingAt(pts))); meMarker.setLngLat(pos);
  if(!live||todoMoved){ todoMoved=!live; map.getSource('todo').setData(todoFC(pos)); }
  var day=Math.floor(t/86400)-Math.floor(T0/86400), d=new Date(t*1000);
  var fxAgeH=((EXO&&EXO.state?EXO.state.now:Date.now())/1000-FIX.at)/3600, fxD=new Date(FIX.at*1000);
  var nowLbl=fxAgeH<1?'עכשיו':('נ״צ <span class="num">'+('0'+fxD.getUTCHours()).slice(-2)+':'+('0'+fxD.getUTCMinutes()).slice(-2)+'</span>');
  if(fut){ var fh=Math.round((t-T1)/3600); out.innerHTML='הערכה · <span class="num">'+d.getUTCDate()+'.'+(d.getUTCMonth()+1)+'</span> · בעוד <span class="num">'+fh+'</span> שע׳'; }
  else out.innerHTML=live?(nowLbl+' · יום <span class="num">'+FIX.dayN+'</span> · מקום <span class="num">'+FIX.rank+'</span>')
    :('<span class="num">'+d.getUTCDate()+'.'+(d.getUTCMonth()+1)+'</span> · יום <span class="num">'+day+'</span> · מקום <span class="num">'+(me?me.rank:'—')+'</span>');
  nightAt(live?((EXO&&EXO.state)?EXO.state.now:Date.now()):t*1000); trailsAt(t); backKick();
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
  stop(); var t0=performance.now(), DUR=reduce?1:15000, from=(+range.value>=995)?0:+range.value;   /* מהעתיד — מהזינוק */
  icon.setAttribute('d','M7 5h4v14H7zM13 5h4v14h-4z'); playBtn.setAttribute('aria-label','עצור');
  setChip(null);
  var bounds=new maplibregl.LngLatBounds(); TRACK.forEach(function(q){ bounds.extend(q.p); });
  map.fitBounds(bounds,{padding:{top:70,bottom:110,left:50,right:50},maxZoom:5.2,duration:reduce?0:900});
  playing={raf:0};
  (function step(now){ var f=Math.min(1,(now-t0)/DUR), v=from+(1000-from)*f; range.value=v; draw(tOf(v),v>=999.5);
    if(f<1) playing.raf=requestAnimationFrame(step); else stop(); })(t0);
}
playBtn.addEventListener('click',function(){ if(playing) stop(); else play(); });
var followP=null;
function scrubFollow(p){ try{ if(!p) return; var z=map.getZoom(); if(z<3.2){ followP=p; return; }
  var ref=followP||here, q=map.project(ref), w=box.clientWidth, h=box.clientHeight;
  if(Math.abs(q.x-w/2)<Math.min(w,h)*0.3&&Math.abs(q.y-h/2)<Math.min(w,h)*0.3) map.jumpTo({center:p});
  followP=p; }catch(e){} }
range.addEventListener('input',function(){ stop(); scrubFollow(draw(tOf(+range.value),Math.abs(+range.value-1000)<0.5)); });

/* ---------- מבטים ---------- */
var chips=document.querySelectorAll('#globeChips button');
function setChip(name){ for(var i=0;i<chips.length;i++) chips[i].setAttribute('aria-pressed',chips[i].getAttribute('data-fly')===name?'true':'false'); }
function fly(name){ armB=0; setChip(name); stop(); range.value=1000; draw(T1,true); var dur=reduce?0:2200;
  if(name==='boat') map.flyTo({center:here,zoom:4.6,bearing:0,duration:dur,essential:true});
  else if(name==='fleet'){ var b=new maplibregl.LngLatBounds(); FLEET.forEach(function(f){ b.extend([f[3],f[2]]); });
    map.fitBounds(b,{padding:{top:80,bottom:120,left:60,right:60},maxZoom:6.2,bearing:0,duration:dur,essential:true}); }
  else map.flyTo({center:[FIX.lon-8,Math.max(-35,FIX.lat-28)],zoom:worldZoom(),bearing:0,duration:dur,essential:true}); }
/* הזום שבו הכדור כולו ממלא את התיבה: קוטר הכדור בפיקסלים הוא 512·2^z/π */
function worldZoom(){ var d=Math.min(box.clientWidth*0.94,(box.clientHeight-190)*0.98); return Math.max(0.6,Math.log(d*Math.PI/512)/Math.LN2); }
for(var ci=0;ci<chips.length;ci++) chips[ci].addEventListener('click',function(){ fly(this.getAttribute('data-fly')); });

/* הקשה על סירה: שם, מקום, פער */
var pop=new maplibregl.Popup({closeButton:false,offset:10,className:'gl-pop-wrap'});
map.on('click','fleet',function(e){ var p=e.features[0].properties;
  pop.setLngLat(e.features[0].geometry.coordinates).setHTML('<div class="gl-pop"><b>'+esc(p.name)+'</b>מקום '+p.rank+' · '+Number(p.dtf).toLocaleString('en-US')+' מייל לסיום</div>').addTo(map); });
map.on('mouseenter','fleet',function(){ map.getCanvas().style.cursor='pointer'; });
map.on('mouseleave','fleet',function(){ map.getCanvas().style.cursor=''; });


/* ===================== תוספות הגלובוס הקבוע (מנה א׳, 20.9.2026) =====================
   נכנסות ל-v2/globe.js בזמן הבנייה. assets/globe.js לא משתנה.
   רשת קווי אורך ורוחב, תוויות מעלות, שמות בעברית בשלוש שכבות זום, וכניסה אל הגלובוס מתוך ההתרחקות מהסירה. */
function gridGeoJSON(){
  var f=[], la, lo, k;
  function lat(v,kind){ var c=[]; for(lo=-180;lo<=180;lo+=4) c.push([lo,v]); f.push({type:'Feature',properties:{k:kind},geometry:{type:'LineString',coordinates:c}}); }
  function lon(v,kind){ var c=[]; for(la=-84;la<=84;la+=4) c.push([v,la]); f.push({type:'Feature',properties:{k:kind},geometry:{type:'LineString',coordinates:c}}); }
  /* הקווים הראשיים: המשווה, שני הטרופיים, שני החוגים, קו האפס וקו התאריך */
  [0,23.44,-23.44,66.56,-66.56].forEach(function(v){ lat(v,'main'); }); lon(0,'main'); lon(180,'main');
  for(k=-60;k<=60;k+=30) if(k!==0) lat(k,'g30');
  for(k=-150;k<=150;k+=30) if(k!==0) lon(k,'g30');
  for(k=-80;k<=80;k+=10) if(k%30!==0) lat(k,'g10');
  for(k=-170;k<=170;k+=10) if(k%30!==0) lon(k,'g10');
  return {type:'FeatureCollection',features:f};
}
function addGrid(){
  var GC='rgba(205,225,238,1)';
  map.addSource('grid',{type:'geojson',data:gridGeoJSON()});
  /* רזולוציה בזום עמוק: Blue Marble של נאס"א (GIBS), רק מזום 4 ומעלה, ורק כתוספת. אם השרת לא עונה נשארים האריחים המקומיים
     וקו החוף הווקטורי, בדיוק כמו קודם. הכתובת לא נבדקה מסביבת הבנייה (אין ממנה גישה לרשת); לבדוק בתצוגה המקדימה. */
  try{ if(navigator.onLine!==false){
    map.addSource('gibs',{type:'raster',tiles:['https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg'],tileSize:256,minzoom:4,maxzoom:8,attribution:'NASA GIBS'});
    map.addLayer({id:'gibs',type:'raster',source:'gibs',minzoom:4,paint:{'raster-opacity':['interpolate',['linear'],['zoom'],4,0,4.8,1],'raster-fade-duration':180,'raster-saturation':-0.08}},'land-fill');
    var gibsOk=false; map.on('sourcedata',function(e){ if(!gibsOk&&e.sourceId==='gibs'&&e.tile&&e.tile.state==='loaded'){ gibsOk=true;
      /* לא מכבים את היבשה בבת אחת: בזום 4 עד 5 האריחים עוד נטענים, וכיבוי מיידי גרם ליבשות להיעלם ולחזור */
      map.setPaintProperty('land-fill','fill-opacity',['interpolate',['linear'],['zoom'],4.2,0,5.0,0.9,5.8,0]); } });
    map.on('error',function(){});      /* אריח שלא הגיע הוא לא שגיאה של האתר */
  } }catch(e){}
  map.addLayer({id:'grid10',type:'line',source:'grid',minzoom:3,filter:['==',['get','k'],'g10'],paint:{'line-color':GC,'line-width':0.6,'line-opacity':0.08}},'night');
  map.addLayer({id:'grid30',type:'line',source:'grid',filter:['==',['get','k'],'g30'],paint:{'line-color':GC,'line-width':0.7,'line-opacity':0.12}},'night');
  map.addLayer({id:'gridMain',type:'line',source:'grid',filter:['==',['get','k'],'main'],paint:{'line-color':GC,'line-width':0.8,'line-opacity':0.28}},'night');
}
/* הילה קרטוגרפית לשמות שעל המפה: טבעת כהה צמודה לאות ועוד זוהר רך מסביב. זוהר רך לבדו
   לא מחזיק שם לבן מעל אריח מדברי בהיר — נמדד 2.6:1 מול רקע בבהירות 0.30. */
function addNames(){
  var st=document.createElement('style'); st.textContent=
    /* --o היא האטימות של השם עצמו, --bk הדעיכה לפי הצד האחורי. המכפלה היא מה שנראה. */
    '.gl-name{--o:.45;font:300 12px Heebo,sans-serif;letter-spacing:.16em;color:#e9f1f6;opacity:calc(var(--o)*var(--bk,1));white-space:nowrap;pointer-events:none;direction:rtl;text-shadow:-1px -1px 0 rgba(2,8,14,.92),1px -1px 0 rgba(2,8,14,.92),-1px 1px 0 rgba(2,8,14,.92),1px 1px 0 rgba(2,8,14,.92),0 -1px 0 rgba(2,8,14,.92),0 1px 0 rgba(2,8,14,.92),-1px 0 0 rgba(2,8,14,.92),1px 0 0 rgba(2,8,14,.92),0 0 7px rgba(2,8,14,.85)}'
   +'.gl-name.ocean{font-size:13px;letter-spacing:.30em;--o:.55;color:#d3e6f2}.gl-name.cont{font-size:13px;letter-spacing:.24em;--o:.45}'
   +'.gl-name.sea{font-size:11.5px;color:#cfe3ef;--o:.45}.gl-name.land{font-size:11.5px;--o:.45}.gl-name.isle{font-size:11px;letter-spacing:.08em;--o:.5}'
   +'.gl-name.t1,.gl-name.t2,.gl-deg{display:none}.z25 .gl-name.t1{display:block}.z38 .gl-name.t2{display:block}.z2 .gl-deg{display:block}'
   +'.z38 .gl-name.cont,.z5 .gl-name.ocean{display:none}'
   +'.gl-deg{--o:.34;font:400 9.5px "B612 Mono",monospace;color:#dfe9ef;opacity:calc(var(--o)*var(--bk,1));letter-spacing:.02em;white-space:nowrap;pointer-events:none;direction:ltr;text-shadow:-1px -1px 0 rgba(2,8,14,.9),1px -1px 0 rgba(2,8,14,.9),-1px 1px 0 rgba(2,8,14,.9),1px 1px 0 rgba(2,8,14,.9),0 0 6px rgba(2,8,14,.8)}'
   +'.gl-back{display:none!important}'
   /* gl-hid: הסתרה מטעם פריסה (בתוך פס ממשק, חפיפה עם שם אחר, או חריגה משפת הכדור).
      נפרדת מ-gl-back כדי ששתי הסיבות לא ידרסו זו את זו. */
   +'.gl-hid{display:none!important}'
   /* משואת השפה: עבדה מסבב Z (נמדד: במקום הנכון, בכיוון הנכון, גלויה), אבל משולש לבן של 15 פיקסל
      על רקע שחור נקרא ככתם אבק. 22 פיקסל, הילה טורקיזית רכה ופעימה איטית אחת לשלוש שניות —
      מספיק כדי שהעין תמצא אותה, ובלי תנועה בכלל למי שביקש להפחית תנועה. */
   +'.gl-rim{position:absolute;left:0;top:0;width:22px;height:22px;pointer-events:none;z-index:3;filter:drop-shadow(0 0 4px rgba(67,214,207,.55)) drop-shadow(0 1px 3px rgba(2,8,14,.8))}'
   +'.gl-rim svg{width:22px;height:22px;display:block;animation:glRim 3s ease-in-out infinite}'
   +'@keyframes glRim{0%,100%{opacity:1}50%{opacity:.55}}'
   +'@media (prefers-reduced-motion:reduce){.gl-rim svg{animation:none}}';
  document.head.appendChild(st);
  function mk(cls,txt,ll,anchor,off){ var e=document.createElement('div'); e.className=cls; e.textContent=txt;
    return backWatch(new maplibregl.Marker({element:e,anchor:anchor||'center',offset:off||[0,0],opacityWhenCovered:'0'}).setLngLat(ll).addTo(map)); }
  if(typeof GEO_NAMES!=='undefined') GEO_NAMES.forEach(function(n){ mk('gl-name t'+n[3]+' '+n[4],n[2],[n[1],n[0]],n[4]==='isle'?'top':'center',n[4]==='isle'?[0,5]:[0,0]); });
  /* מעלות בשולי הרשת של 30°: קווי הרוחב על שני קווי אורך, קווי האורך על המשווה */
  var k; function dl(v,p,n){ return v===0?'0°':Math.abs(v)+'°'+(v>0?p:n); }
  for(k=-60;k<=60;k+=30){ mk('gl-deg',dl(k,'N','S'),[-38,k],'bottom-left',[3,-2]); mk('gl-deg',dl(k,'N','S'),[142,k],'bottom-left',[3,-2]); }
  for(k=-150;k<=180;k+=30) if(k!==-30&&k!==150) mk('gl-deg',k===180?'180°':dl(k,'E','W'),[k,0],'bottom-left',[3,-2]);
  function tiers(){ var z=map.getZoom(); box.classList.toggle('z2',z>=2); box.classList.toggle('z25',z>=2.5); box.classList.toggle('z38',z>=3.8); box.classList.toggle('z5',z>=5.2); }
  map.on('zoom',tiers); tiers();
}
/* מנה ב׳: הצלבה מההדמיה. arm = הגלובוס מתמקם מעל הסירה בזום המרבי, באותו כיוון מצפן שהיה למעלה בהדמיה; כשמתרחקים הצפון חוזר למעלה.
   settle = אחרי מסירה בלי אצבעות על המסך ממשיכים להתרחק לבד. return = מתקרבים חזרה אל הסירה: המרכז נמשך אליה, וההדמיה חוזרת. */
/* קנה מידה משותף להדמיה ולגלובוס: שתיהן מתוארות ברוחב השטח שנראה על המסך, במטרים.
   כך המסירה קורית בלי קפיצה — הגלובוס נכנס בדיוק באותו קנה מידה שבו ההדמיה נעצרה, ולהפך. */
function mppAt(z){ return 78271.517*Math.cos(here[1]*Math.PI/180)/Math.pow(2,z); }
function zForWidth(w){ return Math.log(78271.517*Math.cos(here[1]*Math.PI/180)*Math.max(1,box.clientWidth)/Math.max(1,w))/Math.LN2; }
function widthForZ(z){ return mppAt(z)*Math.max(1,box.clientWidth); }
var armB=0, retArmed=false, tracking=false;
window.__exoGlobeArm=function(brg){ try{ map.resize(); stop(); range.value=1000; draw(T1,true); retArmed=false;
  armB=0; map.jumpTo({center:here,bearing:0}); }catch(e){} };
/* ההדמיה מדווחת בכל פריים כמה מטרים רוחב היא מראה; הגלובוס מתיישר לזה בדיוק, בלי אנימציה. */
window.__exoGlobeTrack=function(widthM,brg){ try{
  tracking=true;
  var z=Math.max(map.getMinZoom(),Math.min(map.getMaxZoom(),zForWidth(widthM)));
  map.jumpTo({center:here,zoom:z,bearing:armB?armB*Math.max(0,Math.min(1,(z-5.4)/3.0)):map.getBearing()});
  tracking=false; }catch(e){ tracking=false; } };
window.__exoGlobeSettle=function(){ armB=0; if(autoRun) return; try{ bandGo(-1); }catch(e){} };
/* כל כתיבה אל המפה נדחית לפריים הבא: setCenter או setBearing בתוך אירוע zoom של אותה מפה
   מאלצים חישוב טרנספורם נוסף באמצע הציור, וזה היה מקור לחלק מהקפיצות בהתרחקות. */
var pendC=null, pendB=null, pRaf=0;
function applyPend(){ pRaf=0; try{
  if(pendB!==null){ var b=pendB; pendB=null; map.setBearing(b); }
  if(pendC){ var c=pendC; pendC=null; map.setCenter(c); } }catch(e){} }
function queuePend(){ if(!pRaf) pRaf=requestAnimationFrame(applyPend); }
function boatMid(){ var p=map.project(here), w=box.clientWidth, h=box.clientHeight; return p.x>-w*0.1&&p.x<w*1.1&&p.y>-h*0.1&&p.y<h*1.1; }
function zGlobe(){ var Z=window.EXO&&EXO.zoomAxis; return (Z&&Z.wOfU)?zForWidth(Z.wOfU(Z.GLOBE)):14; }
function zXfade(){ var Z=window.EXO&&EXO.zoomAxis; return (Z&&Z.wOfU)?zForWidth(Z.wOfU(Z.XF)):16; }
var retX=0;
map.on('zoom',function(){ if(tracking) return; var z=map.getZoom();
  if(!window.__exoGlobeReturn||!window.EXO||!EXO.zoomAxis) return;
  /* החזרה: אותו ציר, הפוך. רוחב השטח של הגלובוס מתורגם ל-u של ההדמיה, והיא מקבלת אותו כמות שהוא. */
  var Z=EXO.zoomAxis, u=Z.uOfW(widthForZ(z));
  var X=(u<Z.GLOBE&&(retX>0||boatMid()))?Math.max(0,Math.min(1,(Z.GLOBE-u)/(Z.GLOBE-Z.XF))):0;
  retX=X; window.__exoGlobeReturn(X,0,u); });
/* כל מי שמשנה זום — צביטה, גלגלת, או צביטה שנמשכת מההדמיה — עובר כאן, בכתיבה אחת למפה בכל פריים.
   המשיכה אל הסירה היא חלק מאותה כתיבה ולא תגובה לאירוע: כשמתקרבים והסירה על המסך המרכז נמשך אליה
   משלוש רמות לפני המסירה, ובתוך ההצלבה הוא מגיע אליה בדיוק — כי ההדמיה שמתחת תמיד ממורכזת על הסירה. */
function zLim(z){ var hi=map.getMaxZoom(); if(!boatMid()) hi=Math.max(map.getZoom(),Math.min(hi,12));      /* רחוק מהסירה אין מה לראות מעבר לרזולוציית התמונה */
  return Math.max(map.getMinZoom(),Math.min(hi,z)); }
function driveZoom(z,anchor,pt){ var z0=map.getZoom(); z=zLim(z);
  map.jumpTo({zoom:z});
  if(anchor&&pt){ var q=map.project(anchor), w=box.clientWidth, h=box.clientHeight;      /* הנקודה שמתחת לאצבעות נשארת מתחתן */
    if(Math.abs(q.x-pt[0])+Math.abs(q.y-pt[1])>0.4) map.jumpTo({center:map.unproject([w/2+q.x-pt[0],h/2+q.y-pt[1]])}); }
  if(z>z0){ var zG=zGlobe(), zX=zXfade();
    if(z>zG-3&&boatMid()){ var f=1-Math.exp(-(z-Math.max(z0,zG-3))*0.85);
      if(z>zG){ var Xn=Math.min(1,(z-zG)/Math.max(0.01,zX-zG)), Xp=Math.max(0,Math.min(0.999,(z0-zG)/Math.max(0.01,zX-zG))); f=Math.max(f,(Xn-Xp)/(1-Xp)); }
      var c=map.getCenter(); f=Math.max(0,Math.min(1,f));
      map.jumpTo({center:[c.lng+(here[0]-c.lng)*f,c.lat+(here[1]-c.lat)*f]}); } } }
window.__exoGlobeDrive=function(widthM){ try{ if(window.__exoGlobeZoomStop) window.__exoGlobeZoomStop(); driveZoom(zForWidth(widthM)); }catch(e){} };
/* כניסה מתוך ההתרחקות מהסירה */
window.__exoGlobeEnter=function(how){ if(!window.__exoGlobeLoaded){ window.__exoGlobeWant=how; return; } try{ map.resize(); stop(); range.value=1000; draw(T1,true);
  if(how==='handoff'){ return; }
  if(how==='race'){ armB=0; map.jumpTo({center:here,zoom:zFleet()}); tweenTo(zRace(),0); return; }
  if(how==='out'){ armB=0; var zf=zFleet(); map.jumpTo({center:here,zoom:zf+2.2}); map.easeTo({center:here,zoom:zf,duration:reduce?0:1500,essential:true}); }      /* 21.9 לילה: נוחתים במבט הצי ולא בכל האוקיינוס */
  else if(typeof fly==='function') fly(how||'boat'); }catch(e){} };

/* ===================== חלל: הכדור מתרחק אל תוך שדה כוכבים =====================
   עד היום ההתרחקות נעצרה בזום 0.6 והכדור נשאר ככדור קטן על רקע שחור ריק. עכשיו הזום יורד עד ‎−1.6,
   מאחורי הקנבס יש שדה כוכבים שנחשף בהדרגה, והתוויות נעלמות כשהכדור קטן מכדי שיקראו עליו. */
function addSpace(){
  var lay=document.getElementById('globeLayer'), box=document.getElementById('globe');
  if(!lay||!box) return;
  try{ map.setMinZoom(-1.6); }catch(e){}
  var sky=document.createElement('canvas');
  sky.width=1600; sky.height=1000;
  var x=sky.getContext('2d'), i;
  var g=x.createRadialGradient(800,500,60,800,500,1100);
  g.addColorStop(0,'#071420'); g.addColorStop(0.55,'#040b13'); g.addColorStop(1,'#01050a');
  x.fillStyle=g; x.fillRect(0,0,1600,1000);
  function h(n){ var v=Math.sin(n*127.1+311.7)*43758.5453; return v-Math.floor(v); }
  for(i=0;i<760;i++){                                  /* כוכבים: גודל ובהירות מתפלגים, כמה מהם חמימים */
    var px=h(i*1.7)*1600, py=h(i*3.1+5)*1000, b=Math.pow(h(i*5.3+9),2.1), r=0.35+b*1.5;
    var warm=h(i*7.9+2)<0.18;
    x.fillStyle='rgba('+(warm?255:222)+','+(warm?226:234)+','+(warm?198:248)+','+(0.16+b*0.78).toFixed(3)+')';
    x.beginPath(); x.arc(px,py,r,0,6.283); x.fill(); }
  for(i=0;i<2200;i++){                                 /* אבק כוכבים דק לאורך אלכסון אחד, במקום כתמים */
    var t=h(i*2.7), cx=t*1700-50, cy=150+t*640+(h(i*3.3)*2-1)*105*(0.4+0.6*Math.sin(t*3.14));
    x.fillStyle='rgba(176,196,226,'+(0.012+h(i*9.1)*0.030).toFixed(3)+')';
    x.beginPath(); x.arc(cx,cy,0.6+h(i*4.4)*1.5,0,6.283); x.fill(); }
  sky.style.cssText='position:absolute;inset:0;width:100%;height:100%;opacity:0;pointer-events:none;z-index:0';
  box.style.zIndex='1';
  lay.insertBefore(sky,box);
  var st=document.createElement('style');
  /* מזום 1.0 ומטה הכדור קטן מכדי שיקראו עליו, ונשארים רק קו המסלול ונקודת אקסודוס.
     zthin (הסתרת כל הסמנים מתחת לזום 2.9) ירד בסבב Z: מי שמסתיר עכשיו הוא הצד האחורי בלבד. */
  st.textContent='.zspace .gl-name,.zspace .gl-deg,.zspace .gl-label{display:none!important}'
   +'.zspace .gl-boat svg{width:19px;height:19px}';   /* transform על האלמנט עצמו לא עובד: MapLibre כותב אותו בכל פריים */
  document.head.appendChild(st);
  var lastO=-1, lastC=null;
  function upd(){ var z=map.getZoom();
    var o=Math.round(Math.max(0,Math.min(1,(2.2-z)/1.7))*25)/25;      /* מדרגות של 4%: לא כותבים סגנון בכל פריים */
    if(o!==lastO){ lastO=o; sky.style.opacity=o?o.toFixed(2):'0'; }
    var c=(z<1.0)?'space':'full';
    if(c!==lastC){ lastC=c; document.body.classList.toggle('zspace',c==='space'); } }
  map.on('zoom',upd); upd();
}

/* ===================== זום רציף בגלובוס =====================
   MapLibre מזיז את הזום בקפיצה קצרה ומרוככת לכל נקישת גלגלת, וכשנקישה חדשה מגיעה באמצע הקודמת היא
   מתחילה מחדש. זה מה שהרגיש מדורג בכל הדרך מזום 8 ועד 3, בעוד ההדמיה שמעליו רציפה לגמרי.
   כאן הגלגלת מזינה יעד בלבד, והזום נמשך אליו בכל פריים בקצב אקספוננציאלי — אותו חוק שמפעיל את ציר ההדמיה,
   ובאותו גודל צעד (2.4 נפר ליחידת u, כלומר 2.4/ln2 רמות זום), כך שסיבוב אחד עובר את ההצלבה בלי לשנות תחושה. */
function pinchZoom(){
  try{ map.touchZoomRotate.disable(); map.setMaxZoom(19); map.getCanvasContainer().style.touchAction='none'; }catch(e){}
  var on=false, dP=0, lnW=0, anchor=null, pt=null, raf=0;
  function gain(z){ return 1.25+1.15*Math.max(0,Math.min(1,(z-7)/3)); }
  function geo(e){ var r=box.getBoundingClientRect(), a=e.touches[0], b=e.touches[1];
    return {d:Math.max(1,Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)), x:(a.clientX+b.clientX)/2-r.left, y:(a.clientY+b.clientY)/2-r.top}; }
  function owns(){ return document.body.classList.contains('g-open'); }
  function apply(){ raf=0; if(!on) return; try{
    var W=Math.exp(lnW);
    if(!owns()){ if(window.EXO&&EXO.zoomAxis&&EXO.setU) EXO.setU(EXO.zoomAxis.uOfW(W)); return; }      /* ההדמיה חזרה באמצע המחווה */
    if(window.__exoGlobeZoomStop) window.__exoGlobeZoomStop();
    driveZoom(zForWidth(W),anchor,pt); try{ anchor=map.unproject(pt); }catch(x){}
    var Wr=widthForZ(map.getZoom()); if(Math.abs(Math.log(Wr/W))>0.02) lnW=Math.log(Wr);      /* נעצרנו בגבול: לא צוברים מרחק מת, וההיפוך מיידי */
  }catch(e){} }
  box.addEventListener('touchstart',function(e){ if(bandTw) bandStop(); if(e.touches.length!==2||!owns()){ on=false; return; }
    var g=geo(e); on=true; dP=g.d; pt=[g.x,g.y]; lnW=Math.log(widthForZ(map.getZoom()));
    try{ anchor=map.unproject(pt); }catch(x){ anchor=null; } },{capture:true,passive:true});
  box.addEventListener('touchmove',function(e){ if(!on||e.touches.length<2) return;
    e.preventDefault(); e.stopPropagation();
    var g=geo(e), z=owns()?map.getZoom():12; lnW+=gain(z)*Math.log(dP/g.d); dP=g.d; pt=[g.x,g.y];
    if(!raf) raf=requestAnimationFrame(apply); },{capture:true,passive:false});
  function end(e){ if(e.touches.length<2) on=false; }
  box.addEventListener('touchend',end,{capture:true,passive:true}); box.addEventListener('touchcancel',end,{capture:true,passive:true});
}
function smoothZoom(){
  try{ map.scrollZoom.disable(); }catch(e){}
  var zT=map.getZoom(), raf=0, last=0;
  function lim(z){ return Math.max(map.getMinZoom(),Math.min(map.getMaxZoom(),z)); }
  function step(ts){
    var dt=last?Math.min(0.05,(ts-last)/1000):0.0167; last=ts;
    var z=map.getZoom(), d=zT-z;
    if(!document.body.classList.contains('g-open')){ raf=0; last=0;
      if(zT>z&&window.EXO&&EXO.zoomAxis&&EXO.glideTo){ var Z=EXO.zoomAxis; EXO.glideTo(Math.max(Z.MAX,Math.min(Z.XF,Z.uOfW(widthForZ(zT)))),260); } return; }
    if(Math.abs(d)<0.0015){ raf=0; last=0; if(d) driveZoom(zT); return; }
    driveZoom(z+d*(1-Math.exp(-dt/0.075))); if(Math.abs(map.getZoom()-z)<1e-5&&Math.abs(d)>0.0015) zT=map.getZoom();
    raf=requestAnimationFrame(step); }
  function nudge(dz){
    if(bandTw){ if(dz*bandDir>0) return; bandStop(); }      /* גלגול באותו כיוון לא עוצר את ההחלקה */
    if(dz&&bandGo(dz>0?1:-1,true)) return;      /* גלגול בתוך הרצועה הריקה: קופצים אל הקצה שלה בהחלקה אחת */
    if(!raf){ try{ map.stop(); }catch(e){} zT=map.getZoom(); last=0; }
    zT=lim(zT+dz);
    if(!raf) raf=requestAnimationFrame(step); }
  pinchZoom();
  box.addEventListener('wheel',function(e){
    if(e.ctrlKey) return;                                   /* צביטת משטח מגע נשארת של הדפדפן */
    e.preventDefault(); e.stopPropagation();
    var dy=e.deltaMode===1?e.deltaY*16:(e.deltaMode===2?e.deltaY*400:e.deltaY);
    var st=(window.EXO&&EXO.wheelStep)?EXO.wheelStep():0.0019;
    nudge(-Math.max(-180,Math.min(180,dy))*st*3.4614); },{passive:false,capture:true});
  window.__exoGlobeZoomStop=function(){ if(raf){ cancelAnimationFrame(raf); raf=0; last=0; } };
  window.__exoGlobeZoomState=function(){ return [zT,raf,map.getZoom()]; };   /* לבדיקות */
}

/* הקשה כפולה בכל מקום על הגלובוס: חזרה אל הסירה, למבט ברירת המחדל מעל המים. */
(function(){ var tT=0,tX=0,tY=0;
  function back(){ if(window.__exoBackToBoat) window.__exoBackToBoat(); else if(typeof fly==='function') fly('boat'); }
  box.addEventListener('dblclick',function(e){ e.preventDefault(); e.stopPropagation(); back(); },true);
  box.addEventListener('pointerup',function(e){
    var n=performance.now();
    if(n-tT<340&&Math.hypot(e.clientX-tX,e.clientY-tY)<34){ tT=0; back(); return; }
    tT=n; tX=e.clientX; tY=e.clientY; },true);
})();

/* ===================== סבב Z — הסתרה לפי הצד האחורי =====================
   בהיטל globe, `map.project` של נקודה שמעבר לאופק מחזיר מיקום כאילו הכדור שקוף: השם או הסמן
   ממשיכים לצוף אל מחוץ לשפה, בצד הלא נכון של הכדור. MapLibre מסתיר ככה רק מה שהוא מצייר בעצמו
   (עיגולים, קווים, אריחים) — לא אלמנטים של DOM, ולכן השמות והתוויות היו צריכים תשובה משלהם.
   כאן נמדדת לכל אלמנט הזווית המרכזית בינו לבין מרכז המפה: מעל 85° הוא נעלם לגמרי (display:none,
   כך שהדפדפן לא משלם עליו כלום), ובין 70° ל-85° הוא דועך — כך הוא נכבה לפני השפה ולא קופץ בה.
   זה גם מה שהחליף את zthin: במקום לכבות הכול מתחת לזום 2.9, נשאר רק מה שבאמת פונה אלינו. */
var BK;      /* בלי אתחול: backWatch נקרא כבר מהחלק של globe.js שמעל, ו-var BK=null כאן היה מאפס אותו */
function backWatch(m,kind){ try{ (BK||(BK=[])).push({m:m,e:m.getElement(),k:kind||'',ll:null,v:null,q:-1}); }catch(e){} return m; }
function llVec(lng,lat){ var a=lng*D2R, b=lat*D2R, c=Math.cos(b); return [c*Math.cos(a),c*Math.sin(a),Math.sin(b)]; }
var BK_HIDE=Math.cos(85*D2R), BK_FULL=Math.cos(70*D2R);
function backAlpha(dot){ if(dot>=BK_FULL) return 1; if(dot<=BK_HIDE) return 0;
  return (85-Math.acos(Math.max(-1,Math.min(1,dot)))*R2D)/15; }
var bkRaf=0, rimEl=null;
function rimShow(on,cv,bv){
  if(!rimEl){ if(!on) return;
    rimEl=document.createElement('div'); rimEl.className='gl-rim'; rimEl.style.display='none';
    rimEl.innerHTML='<svg viewBox="0 0 15 15" aria-hidden="true"><path d="M7.5 1 L12.6 12.4 L7.5 9.7 L2.4 12.4 Z" fill="#ffffff" fill-opacity=".92"/></svg>';
    box.appendChild(rimEl); }
  if(!on){ rimEl.style.display='none'; return; }
  /* הנקודה שעל השפה בכיוון אקסודוס: על המעגל הגדול שבין מרכז המפה לסירה, בזווית 84° מהמרכז */
  var dot=cv[0]*bv[0]+cv[1]*bv[1]+cv[2]*bv[2];
  var t=[bv[0]-cv[0]*dot,bv[1]-cv[1]*dot,bv[2]-cv[2]*dot], n=Math.sqrt(t[0]*t[0]+t[1]*t[1]+t[2]*t[2]);
  if(n<1e-6){ rimEl.style.display='none'; return; }
  var ct=Math.cos(84*D2R), stp=Math.sin(84*D2R)/n;
  var p=[cv[0]*ct+t[0]*stp, cv[1]*ct+t[1]*stp, cv[2]*ct+t[2]*stp];
  var la=Math.asin(Math.max(-1,Math.min(1,p[2])))*R2D, lo=Math.atan2(p[1],p[0])*R2D, s, c0;
  try{ s=map.project([lo,la]); c0=map.project([map.getCenter().lng,map.getCenter().lat]); }catch(x){ rimEl.style.display='none'; return; }
  var w=box.clientWidth, h=box.clientHeight;
  if(!(s.x>-30&&s.x<w+30&&s.y>-30&&s.y<h+30)){ rimEl.style.display='none'; return; }
  var ang=Math.atan2(s.y-c0.y,s.x-c0.x)*R2D+90;
  rimEl.style.display='block';
  rimEl.style.transform='translate(-50%,-50%) translate('+s.x.toFixed(1)+'px,'+s.y.toFixed(1)+'px) rotate('+ang.toFixed(1)+'deg)';
}
/* ===== סינון לפי פריסה =====
   שלוש תקלות שנראו בצילומים, וכולן אותו שורש: שם על המפה שמצויר במקום שבו יושב משהו אחר.
   (א) שמות שנופלים בדיוק מאחורי פס הממשק — הכפתור "חזרה אל הסירה", המקרא, שורות הנתונים
       שלמעלה, רצועת הימים, המפה הקטנה — ומתערבבים באותיות שלהם עד שאי אפשר לקרוא אף אחד.
   (ב) שמות שנערמים זה על זה, בעיקר סביב הזינוק שבו כמה נקודות צפופות.
   (ג) שמות ארוכים שהעוגן שלהם עוד על הכדור אבל הטקסט עצמו כבר גולש אל השחור שמעבר לשפה.

   התיבה של כל שם מחושבת מההיטל של הנקודה ועוד היסט וגודל שנמדדו פעם אחת (measure למטה),
   ולא ב-getBoundingClientRect בכל פריים: בגרירה זה כ-110 מדידות פריסה לפריים. */
/* הבוררים חייבים להצביע על הבלוק שבאמת נראה, לא על המעטפת שלו: ל-.g-ui ול-.vit יש
   left:0;right:0, ולכן התיבה שלהם היא כל רוחב המסך — שמירה עליה מחקה כל שם באותו גובה,
   ובכלל זה "אקסודוס" כשהסירה הייתה שם. לכן הילדים, לא ההורה. */
var KEEP_SEL = '.vw,.gl-scale,.g-ui > *,.g-scrub,header.topr,#hudDot,.mini,.hud.vit > span,#menuBtn,.lay,#toast';
function rankOf(cn){ cn=cn||'';
  if(cn.indexOf('gl-boat')>=0) return 0;
  if(cn.indexOf('k-me')>=0) return 1;
  if(cn.indexOf('gl-label')>=0) return 2;
  if(cn.indexOf('gl-deg')>=0) return 5;
  if(cn.indexOf('ocean')>=0||cn.indexOf('cont')>=0) return 4;
  return 3; }
function hits(a,b){ return a[0]<b[2]&&b[0]<a[2]&&a[1]<b[3]&&b[1]<a[3]; }
function keepRects(){
  var out=[], n=document.querySelectorAll(KEEP_SEL), i, r;
  for(i=0;i<n.length;i++){
    if(n[i].offsetParent===null&&n[i].style.display==='none') continue;
    r=n[i].getBoundingClientRect(); if(!r.width||!r.height) continue;
    out.push([r.left-3,r.top-3,r.right+3,r.bottom+3]); }
  return out; }
/* רדיוס הדיסקה של הכדור, כשהיא נראית כולה: המרחק בהיטל מהמרכז אל נקודה ב-89° ממנו. */
function discR(cv){
  if(map.getZoom()>4.2) return 0;
  var up=[0,0,1], d=cv[2], t=[up[0]-cv[0]*d,up[1]-cv[1]*d,up[2]-cv[2]*d];
  var n=Math.sqrt(t[0]*t[0]+t[1]*t[1]+t[2]*t[2]);
  if(n<1e-6){ t=[1,0,0]; n=1; }
  var ct=Math.cos(89*D2R), st=Math.sin(89*D2R)/n;
  var p=[cv[0]*ct+t[0]*st, cv[1]*ct+t[1]*st, cv[2]*ct+t[2]*st];
  try{
    var c0=map.project(map.getCenter()), pe=map.project([Math.atan2(p[1],p[0])*R2D, Math.asin(Math.max(-1,Math.min(1,p[2])))*R2D]);
    var R=Math.hypot(pe.x-c0.x,pe.y-c0.y)/Math.sin(89*D2R);
    return (R>20&&R<40000)?R:0;
  }catch(e){ return 0; } }

function backTick(){ bkRaf=0; if(!BK) return;
  var c=map.getCenter(), cv=llVec(c.lng,c.lat), i, it, d, q, boatHid=false, bv=null, live=[];
  for(i=0;i<BK.length;i++){ it=BK[i];
    var l; try{ l=it.m.getLngLat(); }catch(e){ continue; }
    if(l!==it.ll||!it.v){ it.ll=l; it.v=llVec(l.lng,l.lat); }
    d=it.v[0]*cv[0]+it.v[1]*cv[1]+it.v[2]*cv[2];
    q=Math.round(backAlpha(d)*10);
    if(q!==it.q){ it.q=q;
      if(q<=0) it.e.classList.add('gl-back');
      else { it.e.classList.remove('gl-back');
        if(q>=10) it.e.style.removeProperty('--bk'); else it.e.style.setProperty('--bk',(q/10).toFixed(1)); } }
    if(it.k==='boat'){ boatHid=(q<=0); bv=it.v; }
    if(q>0) live.push(it); }

  /* מדידה חד-פעמית של גודל כל תווית וההיסט שלה מנקודת ההיטל */
  var c0=null;
  for(i=0;i<live.length;i++){ it=live[i];
    if(it.w===undefined&&!it.e.classList.contains('gl-hid')){
      var r=it.e.getBoundingClientRect(); if(!r.width){ continue; }
      var pp; try{ pp=map.project(it.ll); }catch(e){ continue; }
      var bx=box.getBoundingClientRect();
      it.w=r.width; it.h=r.height; it.dx=r.left-bx.left-pp.x; it.dy=r.top-bx.top-pp.y; } }

  var keep=keepRects(), bx2=box.getBoundingClientRect(), R=discR(cv);
  try{ c0=map.project(c); }catch(e){ c0=null; }
  live.sort(function(a,b){ return rankOf(a.e.className)-rankOf(b.e.className); });
  var placed=[];
  for(i=0;i<live.length;i++){ it=live[i];
    if(it.w===undefined){ continue; }
    var p; try{ p=map.project(it.ll); }catch(e){ continue; }
    var rb=[p.x+it.dx, p.y+it.dy, p.x+it.dx+it.w, p.y+it.dy+it.h];
    var hide=false;
    if(rankOf(it.e.className)>0){
      /* (ג) גלישה מעבר לשפת הכדור */
      if(R&&c0){ var corners=[[rb[0],rb[1]],[rb[2],rb[1]],[rb[0],rb[3]],[rb[2],rb[3]]], j;
        for(j=0;j<4;j++) if(Math.hypot(corners[j][0]-c0.x,corners[j][1]-c0.y)>R-3){ hide=true; break; } }
      /* (א) פסי הממשק — בקואורדינטות החלון */
      if(!hide){ var wb=[rb[0]+bx2.left,rb[1]+bx2.top,rb[2]+bx2.left,rb[3]+bx2.top], k;
        for(k=0;k<keep.length;k++) if(hits(wb,keep[k])){ hide=true; break; } }
      /* (ב) חפיפה עם שם בעל עדיפות גבוהה יותר שכבר נשמר.
         "אקסודוס" (k-me) פטור: הוא יושב בהגדרה צמוד לסמן הסירה, וכל בדיקת חפיפה תמחק אותו. */
      if(!hide&&rankOf(it.e.className)>=2){ var m; for(m=0;m<placed.length;m++) if(hits(rb,placed[m])){ hide=true; break; } } }
    if(hide) it.e.classList.add('gl-hid');
    else { it.e.classList.remove('gl-hid'); placed.push(rb); } }

  rimShow(boatHid&&!!bv,cv,bv);
}
function backKick(){ if(!bkRaf) bkRaf=requestAnimationFrame(backTick); }
function backFade(){ map.on('move',backKick); map.on('zoom',backKick); map.on('resize',backKick); backTick(); }

/* ===================== סבב Z — היסטוריית הצי לפי זמן =====================
   `course.js` נאפה פעם אחת: מיקום כל סירה כל 12 שעות, עד 19.9.2026. כל מה שאחרי זה היה קו ישר
   אל המצב הנוכחי, ולכן ככל שעובר הזמן רצועת הימים משקרת יותר על אמצע המרוץ. `assets/fleet-log.js`
   הוא קובץ שגדל: סקריפט העדכונים מוסיף לו נקודה לכל סירה כל כארבע שעות. כאן שני המקורות
   מתמזגים לרשימה אחת לפי זמן, ומהם האינטרפולציה — בלי הקובץ הזה הכול נשאר בדיוק כמו קודם. */
var FTRACK=(function(){
  var m={}, id, i;
  function add(bid,t,lon,lat,dtf){ (m[bid]||(m[bid]=[])).push([t,lon,lat,dtf]); }
  for(id in FH){ var h=FH[id]; for(i=0;i<h.length;i++) add(+id,T0+i*HIST_STEP,h[i][0],h[i][1],h[i][2]); }
  if(typeof FLEET_LOG==='string'&&FLEET_LOG) FLEET_LOG.split(';').forEach(function(row){
    var v=row.split(',').map(Number); if(v.length<5||!isFinite(v[0])) return;
    var bid=v[0], t=v[1], la=v[2], lo=v[3], d=v[4]; add(bid,t,lo/100,la/100,d);
    for(var j=5;j+3<v.length;j+=4){ t+=v[j]; la+=v[j+1]; lo+=v[j+2]; d+=v[j+3]; add(bid,t,lo/100,la/100,d); } });
  FLEET.forEach(function(f){ add(f[1],T1,f[3],f[2],f[5]); });
  for(id in m){ var a=m[id], out=[a[0]], k;
    a.sort(function(p,q){ return p[0]-q[0]; });
    out=[a[0]];
    for(k=1;k<a.length;k++) if(a[k][0]-out[out.length-1][0]>=10800||k===a.length-1) out.push(a[k]);
    for(k=1;k<out.length;k++){ while(out[k][1]-out[k-1][1]>180) out[k][1]-=360; while(out[k][1]-out[k-1][1]<-180) out[k][1]+=360; }
    m[id]=out; }
  return m; })();
function fleetTrackAt(bid,t){ var h=FTRACK[bid]; if(!h||!h.length) return null;
  if(t<=h[0][0]) return [h[0][1],h[0][2],h[0][3]];
  var n=h.length-1; if(t>=h[n][0]) return [h[n][1],h[n][2],h[n][3]];
  var lo=0, hi=n; while(hi-lo>1){ var mid=(lo+hi)>>1; if(h[mid][0]<=t) lo=mid; else hi=mid; }
  var a=h[lo], b=h[hi], fr=(t-a[0])/((b[0]-a[0])||1);
  return [a[1]+(b[1]-a[1])*fr, a[2]+(b[2]-a[2])*fr, a[3]+(b[3]-a[3])*fr]; }

/* ===================== סבב Z — שובלי הצי, והלילה שנע עם התאריך ===================== */
function addTrails(){ try{
  map.addSource('ftrail',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
  map.addLayer({id:'ftrail',type:'line',source:'ftrail',layout:{'line-cap':'round','line-join':'round'},
    paint:{'line-color':'rgba(226,238,246,1)','line-width':['interpolate',['linear'],['zoom'],0,0.6,6,1.4],
           'line-opacity':['interpolate',['linear'],['zoom'],0,0.16,3,0.26,6,0.34]}},'done-glow');
  trailsAt(T1);      /* draw() הראשון רץ לפני שהשכבה קיימת */
}catch(e){} }
function trailsAt(t){ var src=map.getSource&&map.getSource('ftrail'); if(!src) return;
  var fs=[]; FLEET.forEach(function(f){ if(f[1]===4) return; var h=FTRACK[f[1]]; if(!h||h.length<2) return;
    var pts=[], i; for(i=0;i<h.length&&h[i][0]<=t;i++) pts.push([h[i][1],h[i][2]]);
    if(i>0&&i<h.length){ var p=fleetTrackAt(f[1],t); if(p) pts.push([p[0],p[1]]); }
    if(pts.length>1) fs.push({type:'Feature',properties:{id:f[1]},geometry:{type:'LineString',coordinates:pts}}); });
  src.setData({type:'FeatureCollection',features:fs}); }
/* הלילה: מצולע אסטרונומי אמיתי, ולכן הוא יקר לחישוב. בגרירה הוא מתעדכן לכל היותר פעם ב-90 מ״ש,
   ורק אם הזמן המבוקש זז ביותר משש דקות — די והותר כדי שקו היום־לילה ייראה נע עם התאריך. */
var nT=0, nMs=0, nRaf=0, nWant=0;
function nightPaint(){ nRaf=0;
  var now=performance.now();
  if(now-nMs<90){ nRaf=requestAnimationFrame(nightPaint); return; }
  if(Math.abs(nWant-nT)<360000) return;
  nMs=now; nT=nWant;
  try{ map.getSource('night').setData(nightPolys(nT)); }catch(e){} }
function nightAt(ms){ nWant=ms; if(!nRaf) nRaf=requestAnimationFrame(nightPaint); }
function scrubbing(){ return !!(range&&Math.abs(+range.value-1000)>=0.5); }   /* 23.9: גם מעבר ל"עכשיו" (תחזית) זה עיון */

/* ===================== סבב Z — החזרה מושכת את רצועת הימים אל עכשיו =====================
   מי שעיין בעבר ואז צלל בחזרה אל הסירה היה מגיע לסיפון בזמן אמת בעוד הגלובוס שמאחוריו תקוע באתמול.
   עכשיו רצועת הימים נמשכת אל עכשיו לאורך ההצלבה עצמה: הצי מזנק קדימה תוך כדי הצלילה. */
var retV0=-1, sRaf=0;
function scrubDraw(){ sRaf=0; var v=+range.value; draw(tOf(v),Math.abs(v-1000)<0.5); }
map.on('zoom',function(){
  if(retX>0){ if(retV0<0) retV0=+range.value;
    if(Math.abs(retV0-1000)>2){ var v=retV0+(1000-retV0)*Math.max(0,Math.min(1,retX));
      if(Math.abs(v-(+range.value))>0.6){ range.value=v; if(!sRaf) sRaf=requestAnimationFrame(scrubDraw); } } }
  else retV0=-1; });


/* ===================== 21.9.2026 לילה — בלי רצועה ריקה בין הסירה לצי =====================
   הגלובוס מקבל את ההדמיה בקנה המידה שלה, כ-2.5 ק״מ רוחב. משם ועד שהמתחרים הקרובים נכנסים למסך
   יש כחמש רמות זום של ים כחול אחיד: שום דבר לא משתנה, והמבקר מגלגל ולא מבין אם משהו קורה.
   עכשיו הרצועה הזאת היא מעבר ולא מקום: אחרי המסירה הגלובוס מחליק לבד אל "מבט הצי" — הזום שבו
   שלושת המתחרים הקרובים על המסך. מי שמתקרב משם אל הסירה מחליק באותה תנועה חזרה אל הסיפון.
   מחוץ לסירה (גררו את המפה הצידה) הרצועה לא קיימת והזום רגיל. */
/* "מבט האזור" (מ-22.9): הזום של הפריים הראשון שבו נכנס למסך משהו חוץ מאקסודוס — סירה אחרת, קו חוף, נקודת חובה
   או שם גאוגרפי שמוצג בזום הזה. לכל מועמד מחשבים באיזה קנה מידה הוא נכנס למסגרת (עם שוליים: בגובה פחות, בגלל
   פס הנתונים למעלה ורצועת הימים למטה), והראשון שנכנס קובע. מחושב פעם אחת לכל נקודת ציון ולכל גודל מסך. */
var zfC=null;
function zFleet(){ var W=Math.max(1,box.clientWidth), H=Math.max(1,box.clientHeight), key=T1+'|'+W+'|'+H;
  if(zfC&&zfC.k===key&&(zfC.land||typeof LAND50==='undefined')) return zfC.z;
  var la0=here[1], cs=Math.cos(la0*D2R), best=1e12, land=false;
  function cand(lon,lat){ var dl=lon-here[0]; if(dl>180) dl-=360; if(dl<-180) dl+=360;
    var dx=Math.abs(dl)*60*cs*1852, dy=Math.abs(lat-la0)*60*1852;
    if(dx+dy<400) return;                                           /* אקסודוס עצמה */
    var m=Math.max(dx/(0.42*W),dy/(0.30*H)); if(m<best) best=m; }
  try{ fleetAt(T1).forEach(function(o){ if(o.id!==4) cand(o.lon,o.lat); }); }catch(e){}
  try{ MARKS.forEach(function(m){ if(m[2]) cand(m[1],m[0]); }); }catch(e){}
  try{ if(typeof GEO_NAMES!=='undefined') GEO_NAMES.forEach(function(n){ if(n[3]>0) cand(n[1],n[0]); }); }catch(e){}
  try{ if(typeof landIndex==='function'&&typeof LAND50!=='undefined'){ land=true;
    landIndex().forEach(function(R){ var b=R.b; if(b[3]<la0-14||b[1]>la0+14) return;
      for(var k=0;k<R.r.length;k++){ var q=R.r[k]; if(Math.abs(q[1]-la0)<14) cand(q[0],q[1]); } }); } }catch(e){}
  var z=best<1e12?Math.log(78271.517*cs/best)/Math.LN2-0.15:8;       /* ‏-0.15: עוד נשימה, כדי שהדבר הראשון לא יישב על הקצה */
  z=Math.max(3.2,Math.min(11,z)); zfC={k:key,z:z,land:land}; return z; }
function zRace(){ try{ return worldZoom(); }catch(e){ return 1.2; } }
var bandTw=0, bandDir=0;
function bandStop(){ if(bandTw){ cancelAnimationFrame(bandTw); bandTw=0; } }
/* dir -1 = החוצה אל מבט הצי, +1 = פנימה אל הסיפון. fromWheel: רק אם כבר בתוך הרצועה או על הסף שלה */
function bandGo(dir,fromWheel){
  var z0=map.getZoom(), zF=zFleet(), zG=zGlobe(), zTo;
  if(!boatMid()) return false;
  if(dir<0){ if(!(z0>zF+0.2&&z0<zG+0.6)) return false; zTo=zF; }
  else { if(!(z0>=zF-0.35&&z0<zG-0.02)) return false; zTo=zXfade()+0.03; }      /* עוברים את ההצלבה עד הסוף: ההדמיה חוזרת */
  if(window.__exoGlobeZoomStop) window.__exoGlobeZoomStop();
  bandStop(); bandDir=dir;
  var dur=reduce?0:Math.min(1500,650+130*Math.abs(zTo-z0)), t0=0;
  function ease(t){ return t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2; }
  function step(ts){ if(!t0) t0=ts; var k=dur?Math.min(1,(ts-t0)/dur):1;
    try{ driveZoom(z0+(zTo-z0)*ease(k)); }catch(e){ k=1; }
    if(k<1&&document.body.classList.contains('g-open')) bandTw=requestAnimationFrame(step); else bandTw=0; }
  bandTw=requestAnimationFrame(step);
  return true; }
/* מגע וכל מה שלא עובר בגלגלת (צביטה שהתחילה בהדמיה, מקלדת): כשהכול נרגע בתוך הרצועה, ממשיכים לכיוון האחרון */
(function(){ var nT=0, zPrev=null, dirL=-1, timer=0;
  document.addEventListener('touchstart',function(e){ nT=e.touches.length; },{capture:true,passive:true});
  function te(e){ nT=e.touches.length; if(!nT) kick(); }
  document.addEventListener('touchend',te,{capture:true,passive:true}); document.addEventListener('touchcancel',te,{capture:true,passive:true});
  function kick(){ clearTimeout(timer); timer=setTimeout(settle,240); }
  function settle(){ timer=0; if(bandTw||nT||!document.body.classList.contains('g-open')) return;
    var st=window.__exoGlobeZoomState&&window.__exoGlobeZoomState(); if(st&&st[1]) { kick(); return; }
    var z=map.getZoom(); if(dirL>0&&z<zFleet()+0.4) return;      /* נגיעה קלה פנימה ממבט הצי לא מחזירה לסיפון */
    bandGo(dirL); }
  map.on('zoom',function(){ var z=map.getZoom();
    if(zPrev!==null&&Math.abs(z-zPrev)>1e-4&&!bandTw) dirL=z>zPrev?1:-1;
    zPrev=z; if(!bandTw&&!tracking) kick(); });
})();

/* ===================== סרגל קנה מידה =====================
   עדין, בשולי המסך השמאליים, מתחת לכפתורי המבט — הרחק מכפתור החזרה, מרצועת הימים ומהמפה הקטנה.
   באורך "עגול" (1, 2 או 5 כפול חזקת עשר) שנכנס עד 96 פיקסלים; במייל ימי, ומתחת למייל במטרים.
   נכבה כשהכדור קטן מכדי שלקנה מידה אחד תהיה משמעות. */
function addScale(){
  var lay=document.getElementById('globeLayer'); if(!lay) return;
  var st=document.createElement('style'); st.textContent=
    '.gl-scale{position:absolute;z-index:3;left:calc(var(--e-l,14px) + 2px);top:calc(50% + 78px);pointer-events:none;direction:ltr;opacity:.62;transition:opacity .4s}'
   +'.gl-scale i{display:block;height:5px;border:1px solid rgba(233,241,246,.9);border-top:0;box-shadow:0 1px 2px rgba(2,8,14,.7);transition:width .12s linear}'
   +'.gl-scale b{display:block;margin-top:4px;font:400 10px "B612 Mono",monospace;color:#e3edf3;letter-spacing:.03em;white-space:nowrap;direction:rtl;text-align:left;'
   +'text-shadow:-1px -1px 0 rgba(2,8,14,.9),1px -1px 0 rgba(2,8,14,.9),-1px 1px 0 rgba(2,8,14,.9),1px 1px 0 rgba(2,8,14,.9),0 0 6px rgba(2,8,14,.8)}'
   +'.gl-scale.off{opacity:0}';
  document.head.appendChild(st);
  var el=document.createElement('div'); el.className='gl-scale off'; el.setAttribute('aria-hidden','true');
  el.innerHTML='<i></i><b></b>'; lay.appendChild(el);
  var bar=el.firstChild, lab=el.lastChild, last='', raf=0;
  function nice(v){ var p=Math.pow(10,Math.floor(Math.log(v)/Math.LN10)), m=v/p; return (m>=5?5:m>=2?2:1)*p; }
  function upd(){ raf=0; try{
    var z=map.getZoom(), c=map.getCenter();
    if(z<2.6){ if(last!=='off'){ last='off'; el.classList.add('off'); } return; }
    var mpp=78271.517*Math.cos(c.lat*Math.PI/180)/Math.pow(2,z), maxM=mpp*96, len, txt;
    if(maxM>=1852){ var nm=nice(maxM/1852); len=nm*1852; txt=(nm>=1000?nm.toLocaleString('en-US'):nm)+' מייל'; }
    else { var m=nice(maxM); len=m; txt=m+' מ׳'; }
    var px=Math.round(len/mpp), key=px+txt;
    if(key!==last){ last=key; el.classList.remove('off'); bar.style.width=px+'px'; lab.textContent=txt; } }catch(e){} }
  function q(){ if(!raf) raf=requestAnimationFrame(upd); }
  map.on('zoom',q); map.on('move',q); map.on('resize',q); upd();
}


/* ===================== 22.9.2026 — ההתרחקות האוטומטית ושלושת המבטים =====================
   מרגע שהסירה הופכת לסמל לבן (תחילת ההצלבה) ההמשך הוא תנועה אחת רכה, בלי גלגול: דרך ההצלבה, אל הגלובוס,
   ועד מבט האזור. אותה תנועה משרתת את הכפתורים "אזור" ו"כל המרוץ". התנועה היא על לוגריתם הרוחב במטרים —
   המדד המשותף להדמיה ולגלובוס — ולכן אין בה תפר: עד U_GLOBE היא מזיזה את ציר ההדמיה, ואחריו את הגלובוס.
   גלגול באותו כיוון לא מפריע לה; גלגול הפוך או נגיעה עוצרים אותה במקום. */
var autoRun=0;
function autoStop(){ if(autoRun){ cancelAnimationFrame(autoRun); autoRun=0; } }
function tgtZ(name){ return name==='race'?zRace():zFleet(); }
function tweenTo(zTo,durMin){
  if(window.__exoGlobeZoomStop) window.__exoGlobeZoomStop(); bandStop(); autoStop();
  var z0=map.getZoom(), dz=Math.abs(zTo-z0), dur=reduce?0:Math.max(durMin||0,Math.min(2600,700+170*dz)), t0=0, c0=map.getCenter();
  function ease(t){ return t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2; }
  function step(ts){ if(!t0) t0=ts; var k=dur?Math.min(1,(ts-t0)/dur):1, e=ease(k);
    try{ map.jumpTo({center:[c0.lng+(here[0]-c0.lng)*e,c0.lat+(here[1]-c0.lat)*e]}); driveZoom(z0+(zTo-z0)*e); }catch(x){ k=1; }
    autoRun=(k<1&&document.body.classList.contains('g-open'))?requestAnimationFrame(step):0; }
  autoRun=requestAnimationFrame(step); }
window.__exoGlobeView=function(name){ try{ tweenTo(tgtZ(name)); }catch(e){} };
window.__exoAutoOut=function(name){ try{
  var Z=window.EXO&&EXO.zoomAxis; if(!Z||!Z.wOfU||!EXO.frame) return false;
  if(document.body.classList.contains('g-open')){ tweenTo(tgtZ(name)); return true; }
  if(window.__exoGlobeZoomStop) window.__exoGlobeZoomStop(); bandStop(); autoStop();
  var zT=tgtZ(name), l0=Math.log(Math.max(1,Z.wOfU(EXO.frame.u))), l1=Math.log(widthForZ(zT)), lG=Math.log(Z.wOfU(Z.GLOBE));
  if(l1<=l0) return false;
  var dz=(l1-l0)/Math.LN2, dur=reduce?0:Math.min(2800,1000+130*dz), el=0, last=0;
  function ease(t){ return (1-Math.cos(Math.PI*t))/2; }                  /* רכה משני הצדדים: "בעדינות" */
  function step(ts){ var dt=last?Math.min(250,ts-last):16; last=ts;
    var open=document.body.classList.contains('g-open');
    var lw=l0+(l1-l0)*ease(dur?Math.min(1,el/dur):1);
    if(!open&&lw>=lG-1e-3){ EXO.setU(Z.GLOBE); }                        /* ממתינים למסירה בלי להתקדם בזמן: אין קפיצה */
    else { el+=dt; lw=l0+(l1-l0)*ease(dur?Math.min(1,el/dur):1);
      if(!open) EXO.setU(Math.min(Z.GLOBE,Z.uOfW(Math.exp(lw)))); else driveZoom(zForWidth(Math.exp(lw))); }
    if(open&&el>=dur){ autoRun=0; return; }
    if(el>dur+4000){ autoRun=0; return; }                                /* המסירה לא קרתה (גלובוס שנכשל): לא נתקעים */
    autoRun=requestAnimationFrame(step); }
  autoRun=requestAnimationFrame(step); return true; }catch(e){ return false; } };
window.__exoAutoRunning=function(){ return !!autoRun; };
/* גלגול באותו כיוון נבלע כל עוד התנועה רצה; הפוך — עוצר אותה ועובר הלאה כרגיל. נגיעה — עוצרת. */
window.addEventListener('wheel',function(e){ if(!autoRun||e.ctrlKey) return;
  if(e.deltaY>0){ e.preventDefault(); e.stopImmediatePropagation(); } else autoStop(); },{capture:true,passive:false});
window.addEventListener('touchstart',function(){ if(autoRun) autoStop(); },{capture:true,passive:true});
window.addEventListener('pointerdown',function(e){ if(autoRun&&e.pointerType==='mouse'&&!(e.target&&e.target.closest&&e.target.closest('.vw'))) autoStop(); },{capture:true,passive:true});
/* המחוון של כפתורי המבט צריך לדעת איפה אנחנו ואיפה שלוש העצירות, באותו מדד — רוחב במטרים */
window.__exoGlobeWidth=function(){ return widthForZ(map.getZoom()); };
window.__exoViewStops=function(){ return {region:widthForZ(zFleet()), race:widthForZ(zRace())}; };

/* ===================== ציר הזמן, שלב 3 — התחזית: 72 שעות קדימה (23.9.2026) =====================
   assets/forecast.json נכתב על ידי הבוט (scripts/forecast.mjs): לכל סירה במרוץ, מיקום צפוי כל 3 שעות עד 72 שעות
   מהנקודה האחרונה, עם הפולאר שנלמד מהמסלולים ותחזית Open-Meteo לאורך הדרך. הערכה, לא מדידה — ולכן ענבר.
   רצועת הימים נמשכת מעבר ל"עכשיו": הערך 1000 נשאר ההווה, ומעליו הרצועה ממשיכה באותו קנה מידה של זמן.
   בלי הקובץ — שום דבר לא משתנה. רוחב המניפה בא מהמבחן לאחור של הפולאר (העשירון העליון של הטעות), לא מניחוש. */
var FC=null, T2=T1, FUT=0;
function fcLoad(){
  try{ fetch('assets/forecast.json',{cache:'no-cache'}).then(function(r){ return r.ok?r.json():null; }).then(function(j){
    if(!j||!j.boats||!j.from||j.from<T1-6*3600) return;            /* תחזית ישנה מהנ״צ — לא מציגים */
    FC=j; T2=j.from+j.hours*3600; if(T2<=T1) { FC=null; return; }
    FUT=Math.round(1000*(T2-T1)/(T1-T0));
    range.max=1000+FUT; range.setAttribute('aria-label','פס זמן: מהזינוק ועד עכשיו, ומשם תחזית ל-72 שעות');
    scTicksDraw(); fcStyle(); if(typeof scNowMark==='function') scNowMark(); var lg=document.querySelector('.g-leg .l-fc'); if(lg) lg.hidden=false;
  }).catch(function(){}); }catch(e){} }
function scTicksDraw(){ var span=T2-T0, days=(T1-T0)/86400, step=days>120?30:days>40?10:days>16?5:2, h='', d;
  for(d=0;d<=days;d+=step) h+='<span style="left:'+(d*86400/span*100).toFixed(1)+'%">'+(d===0?'זינוק':'יום '+d)+'</span>';
  if(FC) h+='<span class="fut" style="left:'+(((T2-T0)/span)*100).toFixed(1)+'%">+3 ימים</span>';   /* "עכשיו" מסומן בצבע המסילה, לא במילה */
  $('scTicks').innerHTML=h; }
function fcStyle(){ var st=document.createElement('style');
  var p=((T1-T0)/(T2-T0)*100).toFixed(2)+'%';
  st.textContent='.g-scrub input[type=range]::-webkit-slider-runnable-track{background:linear-gradient(90deg,rgba(225,236,243,.6) '+p+',rgba(241,207,138,.26) '+p+')}'
    +'.g-scrub input[type=range]::-moz-range-track{background:linear-gradient(90deg,rgba(225,236,243,.6) '+p+',rgba(241,207,138,.26) '+p+')}'
    +'.g-scrub .sc-ticks span.fut{color:#f1cf8a}';
  document.head.appendChild(st); }
/* מיקום צפוי של סירה בזמן t (אחרי הנ״צ): אינטרפולציה בין נקודות התחזית; null אם אין לה תחזית */
function fcAt(bid,t){ var b=FC&&FC.boats[String(bid)]; if(!b) return null; var p=b.pts, n=p.length-1, i;
  if(t<=p[0][0]) return [p[0][2],p[0][1]]; if(t>=p[n][0]) return [p[n][2],p[n][1]];
  for(i=0;i<n&&p[i+1][0]<t;i++);
  var a=p[i], c=p[i+1], f=(t-a[0])/((c[0]-a[0])||1);
  return [a[2]+(c[2]-a[2])*f, a[1]+(c[1]-a[1])*f]; }
/* רדיוס המניפה (מייל) לפי שעות מהנ״צ: ליניארי בין 0, 24, 48, 72 שעות, מהעשירון העליון של המבחן לאחור */
function fanNm(h){ var f=FC&&FC.fan; if(!f) return 0; var ks=[0,24,48,72], vs=[0,f['24']?f['24'].p90:0,f['48']?f['48'].p90:0,f['72']?f['72'].p90:0], i;
  for(i=1;i<ks.length;i++) if(h<=ks[i]) return vs[i-1]+(vs[i]-vs[i-1])*(h-ks[i-1])/(ks[i]-ks[i-1]); return vs[3]; }
function circleFC(lon,lat,nm){ var c=[], k, cl=Math.max(0.2,Math.cos(lat*D2R));
  for(k=0;k<=36;k++){ var a=k/36*Math.PI*2; c.push([lon+nm/60*Math.sin(a)/cl, lat+nm/60*Math.cos(a)]); } return c; }
function fcFC(t){ var fs=[], h=(t-(FC?FC.from:T1))/3600, r=fanNm(h);
  FLEET.forEach(function(f){ var p=fcAt(f[1],t); if(!p) return;
    fs.push({type:'Feature',properties:{id:f[1],name:f[4]},geometry:{type:'Polygon',coordinates:[circleFC(p[0],p[1],r)]}}); });
  return {type:'FeatureCollection',features:fs}; }
function fcPathFC(t){ var b=FC&&FC.boats['4']; if(!b) return {type:'FeatureCollection',features:[]};
  var pts=[here], i; for(i=1;i<b.pts.length&&b.pts[i][0]<=t;i++) pts.push([b.pts[i][2],b.pts[i][1]]);
  var p=fcAt(4,t); if(p) pts.push(p);
  return {type:'FeatureCollection',features:[{type:'Feature',properties:{},geometry:{type:'LineString',coordinates:pts}}]}; }
function addForecast(){ try{
  map.addSource('fcfan',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
  map.addLayer({id:'fcfan',type:'fill',source:'fcfan',paint:{'fill-color':'#f1cf8a','fill-opacity':0.06}},'done-glow');
  map.addLayer({id:'fcfan-line',type:'line',source:'fcfan',paint:{'line-color':'#f1cf8a','line-width':1,'line-opacity':0.3}},'done-glow');
  map.addSource('fcpath',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
  map.addLayer({id:'fcpath',type:'line',source:'fcpath',layout:{'line-cap':'round'},paint:{'line-color':'#f1cf8a','line-width':['interpolate',['linear'],['zoom'],0,1.6,6,2.6],'line-dasharray':[1,2],'line-opacity':0.5}},'done-glow');
  fcLoad();
}catch(e){} }
/* נקרא מתוך draw(): מעבר ל"עכשיו" הסירות זזות לפי התחזית; הצי מקבל את הצבע הענברי */
function fcDraw(t,fl){ var fut=FC&&t>T1+60, src;
  if(fut){ fl.forEach(function(o){ var p=fcAt(o.id,t); if(p){ o.lon=p[0]; o.lat=p[1]; o.est=1; } }); }
  src=map.getSource&&map.getSource('fcfan'); if(src) src.setData(fut?fcFC(t):{type:'FeatureCollection',features:[]});
  src=map.getSource&&map.getSource('fcpath'); if(src) src.setData(fut?fcPathFC(t):{type:'FeatureCollection',features:[]});
  return fut; }

/* ===================== l23 מנה 3 (23.9.2026): זום אאוט — קו דק אחד, play שנעצר בהווה =====================
   שמוליק: למטה רק קו דק מקצה לקצה, מהזינוק ועד סוף התחזית, ועליו play קטן. כל הסירות זזות.
   הנגינה נעצרת ב"עכשיו"; לחיצה נוספת ממשיכה אל התחזית, ששם הקו והמסלולים חיוורים — בלי מילים.
   מתחת לקו רק תאריך קטן שזז עם נקודת הנגינה. */
var atNowStop=false;
function scNowMark(){ var tr=document.querySelector('#scrub .sc-track'); if(!tr) return; var m=tr.querySelector('.sc-now');
  if(!m){ m=document.createElement('i'); m.className='sc-now'; tr.appendChild(m); }
  var mx=+range.max||1000; m.style.left=(1000/mx*100).toFixed(2)+'%'; m.hidden=mx<=1000; }
function scOutPos(){ var mx=+range.max||1000, v=+range.value, w=range.clientWidth||1, th=9;
  var x=th/2+(w-th)*(v/mx); out.style.left=Math.max(18,Math.min(w-18,x)).toFixed(1)+'px'; out.classList.toggle('fut',v>1000.5); }
function scDate(t){ var d=new Date(t*1000); out.innerHTML='<span class="num">'+d.getUTCDate()+'.'+(d.getUTCMonth()+1)+'</span>'; scOutPos(); }
function play(){
  /* הגלובוס עוד נטען (המקורות של המפה לא קיימים): מחכים לו ואז מנגנים. נתפס באתר החי — נגיעה ב-play בשניות הראשונות */
  if(!map.getSource||!map.getSource('done')){ if(!play.wait){ play.wait=1; map.once('load',function(){ play.wait=0; setTimeout(play,0); }); } return; }
  stop(); var v=+range.value, mx=+range.max||1000, from, to;
  if(v>=mx-0.5) { from=0; to=1000; }
  else if(Math.abs(v-1000)<0.5){ if(atNowStop&&mx>1000.5){ from=1000; to=mx; } else { from=0; to=1000; } }
  else if(v<1000){ from=v; to=1000; } else { from=v; to=mx; }
  atNowStop=false;
  var DUR=reduce?1:Math.max(3500,15000*(to-from)/1000), t0=performance.now();
  icon.setAttribute('d','M7 5h4v14H7zM13 5h4v14h-4z'); playBtn.setAttribute('aria-label','עצור');
  setChip(null);
  if(from===0){ var bounds=new maplibregl.LngLatBounds(); TRACK.forEach(function(q){ bounds.extend(q.p); });
    map.fitBounds(bounds,{padding:{top:70,bottom:90,left:50,right:50},maxZoom:5.2,duration:reduce?0:900}); }
  playing={raf:0};
  (function step(now){ var f=Math.min(1,(now-t0)/DUR), vv=from+(to-from)*f; range.value=vv; draw(tOf(vv),Math.abs(vv-1000)<0.5);
    if(f<1) playing.raf=requestAnimationFrame(step); else { if(to===1000&&(+range.max||1000)>1000.5) atNowStop=true; stop(); } })(t0);
}
function stop(){ if(playing){ cancelAnimationFrame(playing.raf); playing=null; } icon.setAttribute('d','M8 5v14l11-7z');
  playBtn.setAttribute('aria-label',(Math.abs(+range.value-1000)<0.5&&atNowStop)?'המשך אל התחזית':'נגן את המסע מהזינוק'); }
range.addEventListener('input',function(){ atNowStop=false; });
/* התאריך הקטן: אחרי כל ציור. draw עצמו כותב את הפלט הישן — כאן מחליפים אותו */
var drawBase=draw;
draw=function(t,live){ if(!map.getSource||!map.getSource('done')) return here; var r=drawBase(t,live); scDate(live?FIX.at:t); return r; };
window.addEventListener('resize',function(){ scOutPos(); });
setTimeout(function(){ scNowMark(); scDate(FIX.at); },0);

map.on('load',function(){
  draw(T1,true);
  try{ addGrid(); addNames(); addTrails(); addSpace(); smoothZoom(); backFade(); addScale(); addForecast(); }catch(e){}
  var att=box.querySelector('.maplibregl-ctrl-attrib'); if(att){ att.classList.remove('maplibregl-compact-show'); att.removeAttribute('open'); }
  function night(){ if(!scrubbing()) nightAt((EXO&&EXO.state)?EXO.state.now:Date.now()); }
  night(); setInterval(night,5*60000);
  window.__exoGlobeLoaded=true; if(window.__exoGlobeWant){ var w0=window.__exoGlobeWant; window.__exoGlobeWant=null; window.__exoGlobeEnter(w0); }
});
})();
