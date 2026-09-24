(function(){
'use strict';
var C = document.getElementById('sea');
if (!C) return;

/* ===== v2/deck.js — מנוע ההדמיה של הדף במסך מלא =====
   נבנה אוטומטית מ-assets/deck.js (הדף הקודם) ועוד תוספות: טבעת מצפן על המים, זרמי אוויר סביב המפרשים,
   נחשי זרם, קשתות גל, עננים, מבט מהסיפון ומתחת למים. לא עורכים את הקובץ הזה ביד.
   ===== deck.js — סצנת הסיפון =====
   נגזר מ-app.js של הדף הישן. מה שהשתנה: הסצנה ממלאת את המסך, החיצים המרחפים ירדו
   (שושנת הרוחות מחליפה אותם), הרוח חיה באוויר, הגל הוא פני המים, והזרם מתחת להם.
   הקובץ לא נוגע ב-DOM של הדף: הוא מפרסם מצב דרך window.EXO, ו-rose.js / front.js מציירים. */
var D2R=Math.PI/180, R2D=180/Math.PI;

/* ?at=2026-09-19T12:00Z מציג את הסצנה בשעה אחרת. בלי הפרמטר: השעה האמיתית. */
var T_OFF=0;
(function(){ var m=/[?&]at=([^&]+)/.exec(location.search);
  if(m){ var t0=Date.parse(decodeURIComponent(m[1])); if(!isNaN(t0)) T_OFF=t0-Date.now(); } })();
function clockNow(){ return Date.now()+T_OFF; }

var EXO=window.EXO={
  state:null, frame:{camBearing:0, auto:true, r:23},
  _on:[], _onFrame:[],
  on:function(f){ this._on.push(f); if(this.state) f(this.state); },
  onFrame:function(f){ this._onFrame.push(f); },
  layers:{wind:true, wave:true, cur:true},
  view:{ox:0, oy:0},
  quality:'full', simulated:T_OFF!==0
};
var LAB=EXO.lab={ compass:'world', wind:'sails', wave:'arcs', cur:'ribbon', lines:'both',
  cloud:0.35, vis:300, water:'subtropic', cam:'orbit', fov:64, ringHot:0, ringHotT:0, RR:13, ringStyle:'dash', ringTint:'white' };

function pickCond(now){
  if(!COND||!COND.length) return { pres:null,presTrend:null,airT:null,seaT:null,cloud:null,visKm:null,precip:null,
    wind:0,gust:0,windDir:0,waveH:0.25,waveT:6,waveDir:0,cur:0,curDir:0,forecast:false,past:false,missing:true };
  poseAt(now);
  var T=CONDX||COND, best=T[0], bi=0, i;
  for(i=0;i<T.length;i++) if(Date.parse(T[i][0]+'Z')<=now){ best=T[i]; bi=i; }
  var nx=T[Math.min(bi+1,T.length-1)];
  var t0=Date.parse(best[0]+'Z'), t1=Date.parse(nx[0]+'Z');
  var f=(t1>t0)?Math.max(0,Math.min(1,(now-t0)/(t1-t0))):0;
  function L(a,b){return a+(b-a)*f;}
  function A(a,b){var d=((b-a+540)%360)-180;return (a+d*f+360)%360;}
  function X(i){ var a=best[i], b=nx[i]; if(a==null||b==null) return (a==null?(b==null?null:b):a); return L(a,b); }
  function at3(i){ var t=now-3*3600000, k, r0=null, r1=null; for(k=0;k<T.length;k++){ var tk=Date.parse(T[k][0]+'Z'); if(tk<=t) r0=T[k]; else { r1=T[k]; break; } }
    if(!r0||r0[i]==null) return null; if(!r1||r1[i]==null) return r0[i]; var a0=Date.parse(r0[0]+'Z'), a1=Date.parse(r1[0]+'Z'); return r0[i]+(r1[i]-r0[i])*Math.max(0,Math.min(1,(t-a0)/(a1-a0||1))); }
  var ext=(best.length>=15), pNow=ext?X(9):null, pOld=ext?at3(9):null;
  return { pres:pNow, presTrend:(pNow!=null&&pOld!=null)?(pNow-pOld):null, airT:ext?X(10):null, seaT:ext?X(11):null,
           cloud:ext?X(12):null, visKm:ext?X(13):null, precip:ext?X(14):null,
           wind:L(best[1],nx[1]), gust:L(best[2],nx[2]), windDir:A(best[3],nx[3]),
           waveH:L(best[4],nx[4]), waveT:L(best[5],nx[5]), waveDir:A(best[6],nx[6]),
           cur:L(best[7],nx[7]), curDir:A(best[8],nx[8]),
           forecast: now>OBS_UNTIL, past: now>Date.parse(COND[COND.length-1][0]+'Z'),
           archive: now<Date.parse(COND[0][0]+'Z'), gap: (t1-t0)>3*3600000||now<Date.parse(T[0][0]+'Z') };
}
/* ===== P: הארכיון ותנוחת הסירה לפי השעון ===== */
var CONDX=null, ARCH=[];
var BP={lat:FIX.lat, lon:FIX.lon, cog:FIX.cog, sog:FIX.sog, src:'fix'};
EXO.pose=BP;
EXO.setArchive=function(rows){ try{
  var c0=(COND&&COND.length)?Date.parse(COND[0][0]+'Z'):Infinity, seen={};
  ARCH=(rows||[]).filter(function(r){ var t=Date.parse(r[0]+'Z'); if(!(t<c0)||seen[r[0]]||r[15]==null||r[16]==null) return false; seen[r[0]]=1; return true; })
    .sort(function(a,b){ return a[0]<b[0]?-1:1; });
  CONDX=ARCH.length?ARCH.map(function(r){ return r.slice(0,15); }).concat(COND||[]):null;
  var n=clockNow(); cond=pickCond(n); condAt=n; applyConditions(cond); emitState(cond,n); kick(); }catch(e){} };
/* כל השורות, בסדר זמן — לרצועה */
EXO.condAll=function(){ return CONDX||COND||[]; };
function trackPts(){ var fx=FIX.at*1000, P=[], i;
  for(i=0;i<ARCH.length;i++){ var t=Date.parse(ARCH[i][0]+'Z'); if(t<fx) P.push([t,ARCH[i][15],ARCH[i][16]]); }
  P.push([fx,FIX.lat,FIX.lon]); return P; }
function posOn(P,t){ if(t<=P[0][0]) return [P[0][1],P[0][2]];
  for(var i=1;i<P.length;i++) if(t<=P[i][0]){ var a=P[i-1], b=P[i], f=(t-a[0])/Math.max(1,b[0]-a[0]);
    var dl=b[2]-a[2]; if(dl>180) dl-=360; if(dl<-180) dl+=360;
    return [a[1]+(b[1]-a[1])*f, ((a[2]+dl*f+540)%360)-180]; }
  var z=P[P.length-1]; return [z[1],z[2]]; }
function poseAt(now){
  var fx=FIX.at*1000;
  if(!ARCH.length||!(now<fx-60000)||now<Date.parse(ARCH[0][0]+'Z')){
    if(BP.src!=='fix'){ BP.lat=FIX.lat; BP.lon=FIX.lon; BP.cog=FIX.cog; BP.sog=FIX.sog; BP.src='fix'; GATE_BRG=bearingTo(BP.lat,BP.lon,GATE[0],GATE[1]); }
    return BP; }
  var P=trackPts(), p=posOn(P,now), a=posOn(P,now-3600000), b=posOn(P,Math.min(fx,now+3600000));
  var dt=(Math.min(fx,now+3600000)-(now-3600000))/3600000;
  var dy=(b[0]-a[0])*60, dxl=b[1]-a[1]; if(dxl>180) dxl-=360; if(dxl<-180) dxl+=360;
  var dx=dxl*60*Math.cos((a[0]+b[0])/2*D2R), dist=Math.hypot(dx,dy);
  BP.lat=p[0]; BP.lon=p[1]; BP.src='archive';
  if(dist>0.05) BP.cog=(Math.atan2(dx,dy)*R2D+360)%360;
  BP.sog=dt>0?dist/dt:0;
  GATE_BRG=bearingTo(BP.lat,BP.lon,GATE[0],GATE[1]);
  return BP; }

/* ===== astronomy ===== */
function days(n){ return n/86400000 + 2440587.5 - 2451545.0; }
function sunEcl(d){ var g=(357.5291+0.98560028*d)*D2R, L=(280.459+0.98564736*d)*D2R;
  return L+(1.915*Math.sin(g)+0.020*Math.sin(2*g))*D2R; }
function toHoriz(lam,bet,d,lat,lon){
  var eps=(23.439-0.00000036*d)*D2R;
  var ra=Math.atan2(Math.sin(lam)*Math.cos(eps)-Math.tan(bet)*Math.sin(eps),Math.cos(lam));
  var dec=Math.asin(Math.sin(bet)*Math.cos(eps)+Math.cos(bet)*Math.sin(eps)*Math.sin(lam));
  var gmst=(18.697374558+24.06570982441908*d)%24;
  var H=(gmst*15+lon)*D2R-ra, la=lat*D2R;
  return { alt:Math.asin(Math.sin(la)*Math.sin(dec)+Math.cos(la)*Math.cos(dec)*Math.cos(H)),
           az:((Math.atan2(-Math.sin(H),Math.tan(dec)*Math.cos(la)-Math.sin(la)*Math.cos(H)))*R2D+360)%360 };
}
function sunPos(n,lat,lon){ var d=days(n); return toHoriz(sunEcl(d),0,d,lat,lon); }
function moonPos(n,lat,lon){
  var d=days(n), Lp=(218.316+13.176396*d)*D2R, M=(134.963+13.064993*d)*D2R, F=(93.272+13.229350*d)*D2R;
  var lam=Lp+6.289*D2R*Math.sin(M), bet=5.128*D2R*Math.sin(F);
  var h=toHoriz(lam,bet,d,lat,lon), el=lam-sunEcl(d);
  h.illum=(1-Math.cos(el))/2; h.waxing=Math.sin(el)>0; return h;
}
/* sunrise / sunset by scanning the day — robust and good to a minute */
function sunEvents(now,lat,lon){
  var day=Math.floor(now/86400000)*86400000, prev=null, rise=null, set=null;
  for(var m=0;m<=1440;m+=4){
    var t=day+m*60000, a=sunPos(t,lat,lon).alt*R2D;
    if(prev!==null){
      if(prev< -0.833 && a>=-0.833 && rise===null) rise=t;
      if(prev>=-0.833 && a< -0.833 && set===null && rise!==null) set=t;
    }
    prev=a;
  }
  return {rise:rise,set:set};
}
function dirVec(azd,alt){ var a=azd*D2R,c=Math.cos(alt); return [Math.sin(a)*c,Math.sin(alt),-Math.cos(a)*c]; }
function bearingTo(la1,lo1,la2,lo2){ var p=D2R;
  var y=Math.sin((lo2-lo1)*p)*Math.cos(la2*p);
  var x=Math.cos(la1*p)*Math.sin(la2*p)-Math.sin(la1*p)*Math.cos(la2*p)*Math.cos((lo2-lo1)*p);
  return (Math.atan2(y,x)*R2D+360)%360; }
var GATE_BRG=bearingTo(BP.lat,BP.lon,GATE[0],GATE[1]);
function bearing2(deg){ var a=deg*D2R; return [Math.sin(a),-Math.cos(a)]; }
function norm3(v){ var l=Math.hypot(v[0],v[1],v[2])||1; return [v[0]/l,v[1]/l,v[2]/l]; }
function cross3(a,b){ return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]; }
function rotAxis(v,k,a){ var c=Math.cos(a),s=Math.sin(a),kv=k[0]*v[0]+k[1]*v[1]+k[2]*v[2],cr=cross3(k,v);
  return [v[0]*c+cr[0]*s+k[0]*kv*(1-c), v[1]*c+cr[1]*s+k[1]*kv*(1-c), v[2]*c+cr[2]*s+k[2]*kv*(1-c)]; }

/* orbit camera: azimuth, elevation, distance — with momentum */
var cam={ az:2.35, el:0.26, r:23, tilt:0, auto:true, vaz:0, vel:0 };
var lastSun=null, lastMoon=null;

/* ===== gl ===== */
var gl=C.getContext('webgl',{antialias:true,alpha:false})||C.getContext('experimental-webgl',{antialias:true,alpha:false});
if(!gl){ C.parentNode.insertAdjacentHTML('beforeend',
  '<div class="fallback">הדפדפן הזה לא מריץ WebGL, אז ההדמיה לא תוצג. המסע, הצי והניתוח המלא זמינים מהתפריט.</div>');
  EXO.noGL=true; EXO.astro={sunPos:sunPos,moonPos:moonPos,sunEvents:sunEvents,sunEcl:sunEcl,days:days};
  EXO.setLayer=EXO.setQuality=EXO.lookToward=EXO.setBearing=EXO.faceBody=EXO.toggleAuto=EXO.reframe=function(){};
  setTimeout(function(){ emitState(pickCond(clockNow()),clockNow()); },0); return; }
function sh(t,s){ var o=gl.createShader(t); gl.shaderSource(o,s); gl.compileShader(o);
  if(!gl.getShaderParameter(o,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; }
function prog(v,f){ var p=gl.createProgram();
  gl.attachShader(p,sh(gl.VERTEX_SHADER,v)); gl.attachShader(p,sh(gl.FRAGMENT_SHADER,f)); gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  p.u=function(n){return gl.getUniformLocation(p,n);}; p.a=function(n){return gl.getAttribLocation(p,n);}; return p; }
function buf(d,t,T){ var b=gl.createBuffer(), tt=t||gl.ARRAY_BUFFER;
  gl.bindBuffer(tt,b); gl.bufferData(tt,new (T||Float32Array)(d),gl.STATIC_DRAW); return b; }

function mIdent(){ return [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]; }
function mMul(a,b){ var o=new Array(16);
  for(var c=0;c<4;c++) for(var r=0;r<4;r++)
    o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];
  return o; }
function mTrans(x,y,z){ var m=mIdent(); m[12]=x;m[13]=y;m[14]=z; return m; }
function mRotY(a){ var c=Math.cos(a),s=Math.sin(a),m=mIdent(); m[0]=c;m[2]=-s;m[8]=s;m[10]=c; return m; }
function mRotX(a){ var c=Math.cos(a),s=Math.sin(a),m=mIdent(); m[5]=c;m[6]=s;m[9]=-s;m[10]=c; return m; }
function mRotZ(a){ var c=Math.cos(a),s=Math.sin(a),m=mIdent(); m[0]=c;m[1]=s;m[4]=-s;m[5]=c; return m; }
function mScale(x,y,z){ var m=mIdent(); m[0]=x;m[5]=y;m[10]=z; return m; }
function mBearing(b){ return mRotY(Math.PI/2-b*D2R); }
function mPersp(f,a,n,fa){ var t=1/Math.tan(f/2),m=new Array(16); for(var i=0;i<16;i++)m[i]=0;
  m[0]=t/a;m[5]=t;m[10]=(fa+n)/(n-fa);m[11]=-1;m[14]=2*fa*n/(n-fa); return m; }
function mLook(e,c,u){ var z=norm3([e[0]-c[0],e[1]-c[1],e[2]-c[2]]), x=norm3(cross3(u,z)), y=cross3(z,x);
  return [x[0],y[0],z[0],0, x[1],y[1],z[1],0, x[2],y[2],z[2],0,
    -(x[0]*e[0]+x[1]*e[1]+x[2]*e[2]), -(y[0]*e[0]+y[1]*e[1]+y[2]*e[2]), -(z[0]*e[0]+z[1]*e[1]+z[2]*e[2]),1]; }
function project(m,p){ var w=m[3]*p[0]+m[7]*p[1]+m[11]*p[2]+m[15];
  if(w<=0.001) return null;
  return [(m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12])/w, (m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13])/w]; }

/* ===== sky ===== */
var SKY=prog('attribute vec2 aP; varying vec2 vN; void main(){ vN=aP; gl_Position=vec4(aP,0.999,1.0);} ',
 ['precision highp float; varying vec2 vN;',
  'uniform vec3 uFwd,uRight,uUp,uSunDir,uMoonDir,uMoonR,uMoonU,uZen,uHor,uSunCol;',
  'uniform float uTanF,uAsp,uSunUp,uNight,uMoonUp,uIllum,uWax,uDusk,uTime; uniform vec2 uOff; uniform vec3 uDuskCol;',
  'uniform float uCloudOn,uCloudTh,uUnder,uUGlow,uStarCat,uMW; uniform vec2 uCloudV; uniform vec3 uAbyss; uniform mat3 uCel;',
  'float h21c(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }',
  'float vnc(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);',
  ' float a=h21c(i), b=h21c(i+vec2(1.0,0.0)), c=h21c(i+vec2(0.0,1.0)), d=h21c(i+vec2(1.0,1.0));',
  ' return mix(mix(a,b,f.x),mix(c,d,f.x),f.y); }',
  'float fbmc(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<5;i++){ s+=a*vnc(p); p=p*2.03+vec2(11.3,7.7); a*=0.5; } return s; }',
  'float hash(vec3 p){ return fract(sin(dot(p,vec3(12.9898,78.233,45.164)))*43758.5453); }',
  'void main(){',
  ' vec3 r=normalize(uFwd+uRight*((vN.x-uOff.x)*uTanF*uAsp)+uUp*((vN.y-uOff.y)*uTanF));',
  ' float h=clamp(r.y*1.15+0.06,0.0,1.0);',
  ' vec3 c=mix(uHor,uZen,pow(h,0.62));',
  ' if(uUnder>0.5){ float up=clamp(r.y,0.0,1.0), dn=clamp(-r.y,0.0,1.0);',
  '  c=mix(uHor,uZen,pow(up,0.85)); c=mix(c,uAbyss,pow(dn,0.55));',
  '  c+=vec3(0.55,0.85,0.80)*pow(max(dot(r,uSunDir),0.0),5.0)*0.30*uUGlow; }',
  /* זוהר הזריחה והשקיעה יושב בצד של השמש, לא מסביב לכל האופק */
  ' vec2 rh=normalize(r.xz+vec2(1e-5)), sh2=normalize(uSunDir.xz+vec2(1e-5));',
  ' float side=pow(clamp(dot(rh,sh2)*0.5+0.5,0.0,1.0),3.0);',
  ' c=mix(c,uDuskCol,uDusk*side*pow(1.0-h,2.2));',
  /* שביל החלב: מודל בקואורדינטות גלקטיות. פס שמתרחב ומתבהר לכיוון מרכז הגלקסיה, בליטה, בקע כהה לאורך הציר, וענני מגלן */
  ' if(uMW>0.003 && r.y>-0.02 && uUnder<0.5){ vec3 e=uCel*r;',
  '  vec3 gq=vec3(dot(e,vec3(-0.0548756,-0.8734371,-0.4838350)),dot(e,vec3(0.4941094,-0.4448296,0.7469822)),dot(e,vec3(-0.8676661,-0.1980764,0.4559838)));',
  '  float gb=asin(clamp(gq.z,-1.0,1.0)), gl2=atan(gq.y,gq.x);',
  '  float core=exp(-gl2*gl2/1.35), wid=0.105+0.115*core;',
  '  float band=exp(-gb*gb/(wid*wid))*(0.46+0.54*core)+0.85*exp(-(gl2*gl2/0.10+gb*gb/0.030));',
  '  float mott=fbmc(vec2(gl2*5.0,gb*11.0)+3.7);',
  '  float rift=smoothstep(0.46,0.70,fbmc(vec2(gl2*3.2+9.1,gb*16.0)))*exp(-gb*gb/0.0065)*(0.35+0.65*core);',
  '  band*=(0.55+0.90*mott)*(1.0-0.72*rift);',
  '  float lmc=exp(-(1.0-dot(e,vec3(0.0547,0.3416,-0.9383)))/0.0019), smc=exp(-(1.0-dot(e,vec3(0.2879,0.0675,-0.9553)))/0.00055);',
  '  band+=(0.85*lmc+0.60*smc)*(0.75+0.5*mott);',
  '  c+=vec3(0.62,0.68,0.84)*band*0.19*uMW*smoothstep(-0.02,0.20,r.y); }',
  ' if(uNight>0.01 && r.y>0.0 && uStarCat<0.5){ vec3 g=r*170.0; vec3 q=floor(g); float s=hash(q);',
  '  if(s>0.9915){ vec3 f=fract(g)-0.5; vec3 o=(vec3(hash(q+1.3),hash(q+2.1),hash(q+4.7))-0.5)*0.55;',
  '   float d=length(f-o); float mag=pow((s-0.9915)/0.0085,2.2);',
  '   float core=1.0-smoothstep(0.0,0.20+0.10*mag,d);',
  '   float tw=0.62+0.38*sin(uTime*(1.2+hash(q+5.0)*2.0)+hash(q+3.0)*40.0);',
  '   vec3 tint=mix(vec3(1.0,0.86,0.72),vec3(0.78,0.87,1.0),hash(q+9.0));',
  '   c+=tint*uNight*core*tw*(0.30+1.5*mag)*smoothstep(0.0,0.22,r.y);} }',
  ' float md=dot(r,uMoonDir); float mr=0.0105;',
  ' if(md>cos(mr*1.9)){ vec3 off=normalize(r-uMoonDir*md);',
  '  float ang=acos(clamp(md,-1.0,1.0))/mr;',
  '  float x=dot(off,uMoonR)*ang, y=dot(off,uMoonU)*ang;',
  '  if(x*x+y*y<1.0){ float lit=(uWax>0.5?x:-x);',
  '   float edge=(1.0-2.0*uIllum)*sqrt(max(0.0,1.0-y*y));',
  '   float f=smoothstep(-0.06,0.06,lit-edge);',
  '   float shade=0.55+0.45*sqrt(max(0.0,1.0-(x*x+y*y)));',
  '   c=mix(c,vec3(0.93,0.94,0.97)*shade,f*uMoonUp*(0.35+0.65*uNight)); } }',
  ' float cov=0.0;',
  ' if(uCloudOn>0.5 && r.y>0.012 && uUnder<0.5){',
  '  vec2 cp=r.xz/(r.y+0.11)*1.10+uCloudV*uTime*0.0065;',
  '  float n=fbmc(cp);',
  '  cov=smoothstep(uCloudTh-0.10,uCloudTh+0.14,n)*smoothstep(0.012,0.15,r.y);',
  '  float dens=smoothstep(uCloudTh,uCloudTh+0.34,n);',
  '  float toSun=pow(max(dot(r,uSunDir),0.0),6.0);',
  '  vec3 lit=mix(vec3(0.97,0.98,1.0),uSunCol,0.30)*(0.22+0.78*uSunUp)+uSunCol*toSun*0.35*uSunUp+uDuskCol*uDusk*0.40;',
  '  vec3 shade=mix(uHor*0.85,vec3(0.36,0.40,0.47)*(0.20+0.80*uSunUp),0.62);',
  '  vec3 cc=mix(lit,shade,dens*0.80);',
  '  cc=mix(cc,cc*0.12+vec3(0.018,0.026,0.045),uNight*0.88);',
  '  c=mix(c,cc,cov*0.95); }',
  ' float sv=1.0-cov*0.93;',
  ' float d=max(dot(r,uSunDir),0.0);',
  ' c+=uSunCol*pow(d,9.0)*0.30*uSunUp*sv; c+=uSunCol*pow(d,90.0)*0.55*uSunUp*sv;',
  ' c+=uSunCol*pow(d,7000.0)*10.0*uSunUp*sv*sv;',
  ' gl_FragColor=vec4(c,1.0);}'].join('\n'));
var quadB=buf([-1,-1, 3,-1, -1,3]);

/* ===== ocean: seven Gerstner trains, two directional families ===== */
var WAVE=[
 'uniform vec4 uW0,uW1,uW2,uW3,uW4,uW5,uW6; uniform vec4 uSpA,uSpB,uStA,uStB;',
 'uniform float uTime;',
 'void addWave(vec4 w,float spd,float stp,vec2 p,inout vec3 dsp,inout vec3 n,inout float jac){',
 ' float k=6.2831853/max(w.w,0.5); vec2 d=normalize(w.xy);',
 ' float f=k*dot(d,p)-spd*k*uTime; float a=w.z; float q=stp/max(k*a*4.0,0.0001);',
 ' float cf=cos(f), sf=sin(f);',
 ' dsp.x+=q*a*d.x*cf; dsp.z+=q*a*d.y*cf; dsp.y+=a*sf;',
 ' n.x-=d.x*k*a*cf; n.z-=d.y*k*a*cf; jac+=q*a*k*sf; }',
 'vec3 gerst(vec2 p,out vec3 nrm,out float fold){ vec3 dsp=vec3(0.0); vec3 n=vec3(0.0,1.0,0.0);',
 ' float j=0.0;',
 ' addWave(uW0,uSpA.x,uStA.x,p,dsp,n,j); addWave(uW1,uSpA.y,uStA.y,p,dsp,n,j);',
 ' addWave(uW2,uSpA.z,uStA.z,p,dsp,n,j); addWave(uW3,uSpA.w,uStA.w,p,dsp,n,j);',
 ' addWave(uW4,uSpB.x,uStB.x,p,dsp,n,j); addWave(uW5,uSpB.y,uStB.y,p,dsp,n,j);',
 ' addWave(uW6,uSpB.z,uStB.z,p,dsp,n,j);',
 ' fold=1.0-j; nrm=normalize(vec3(n.x,1.0,n.z)); return dsp; }'].join('\n');

var SEA=prog(['precision highp float; attribute vec2 aP; uniform mat4 uVP; uniform float uWaveK;',WAVE,
  'varying vec3 vW,vN; varying float vH; varying float vJ;',
  'void main(){ float rr=length(aP);',
  ' float kf=(1.0-smoothstep(420.0,2600.0,rr))*uWaveK;',   /* רחוק מהסירה, או גבוה מעליה: משטח שטוח */
  ' vec3 n=vec3(0.0,1.0,0.0); float fold=1.0; vec3 d=vec3(0.0);',
  ' if(kf>0.002){ d=gerst(aP,n,fold)*kf; n=normalize(mix(vec3(0.0,1.0,0.0),n,kf)); fold=mix(1.0,fold,kf); }',
  ' vec3 p=vec3(aP.x+d.x,d.y,aP.y+d.z);',
  ' vW=p; vN=n; vH=d.y; vJ=fold; gl_Position=uVP*vec4(p,1.0);}'].join('\n'),
 ['precision highp float;',
  'uniform vec3 uDeep,uShal,uHor,uSunDir,uSunCol,uFogCol,uEye,uSss;',
  'uniform float uSunUp,uFogD,uAmpMax,uFoam,uChop,uDusk; uniform vec2 uWindV; uniform float uTime; uniform vec3 uDuskCol,uGlowDir;',
  'uniform float uUnder; uniform vec4 uHull;',
  'varying vec3 vW,vN; varying float vH; varying float vJ;',
  'float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }',
  'float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);',
  ' float a=h21(i), b=h21(i+vec2(1.0,0.0)), c=h21(i+vec2(0.0,1.0)), d=h21(i+vec2(1.0,1.0));',
  ' return mix(mix(a,b,f.x),mix(c,d,f.x),f.y); }',
  'void main(){',
  ' float dist=length(uEye-vW);',
  /* high-frequency detail, faded out with distance so it never aliases */
  ' float det=clamp(1.0-dist/140.0,0.0,1.0)*uChop;',
  ' vec3 N=normalize(vN);',
  ' if(det>0.012){ vec2 q=vW.xz*0.55-uWindV*uTime*0.55; float e=0.32;',
  '  float n1=vn(q), nx1=vn(q+vec2(e,0.0)), nz1=vn(q+vec2(0.0,e));',
  '  N=normalize(vN+vec3((nx1-n1)*1.35,0.0,(nz1-n1)*1.35)*det); }',
  ' N=normalize(mix(N,vec3(0.0,1.0,0.0),smoothstep(45.0,150.0,dist)*0.82));',
  ' vec3 V=normalize(uEye-vW);',
  ' float fres=pow(1.0-max(dot(N,V),0.0),4.0)*0.78+0.045;',
  ' float hn=clamp(vH/max(uAmpMax,0.05)*0.5+0.5,0.0,1.0);',
  ' vec3 body=mix(uDeep,uShal,hn*0.85);',
  ' vec2 gd=normalize(uGlowDir.xz+vec2(1e-5));',
  ' vec3 Rf=reflect(-V,N); float sdR=pow(clamp(dot(normalize(Rf.xz+vec2(1e-5)),gd)*0.5+0.5,0.0,1.0),3.0);',
  ' vec3 col=mix(body,mix(uHor,uDuskCol,uDusk*sdR*0.9),fres);',
  ' vec3 L=normalize(uSunDir), H=normalize(L+V);',
  /* light coming through the back of a crest */
  ' float sss=pow(max(0.0,dot(V,-L)),3.0)*smoothstep(0.35,1.0,hn)*uSunUp;',
  ' col+=uSss*sss*0.55;',
  ' vec3 Ng=N; if(det>0.012){ vec2 g=vW.xz*2.6-uWindV*uTime*1.1+vec2(uTime*0.07,0.0); float g0=vn(g), gx=vn(g+vec2(0.19,0.0)), gz=vn(g+vec2(0.0,0.19));',
  '  vec2 g2=vW.xz*7.3+uWindV*uTime*0.6; float k0=vn(g2), kx=vn(g2+vec2(0.17,0.0)), kz=vn(g2+vec2(0.0,0.17));',
  '  Ng=normalize(N+(vec3(gx-g0,0.0,gz-g0)*1.9+vec3(kx-k0,0.0,kz-k0)*1.1)*det); }',
  ' float spk=pow(max(dot(Ng,H),0.0),520.0)*3.2+pow(max(dot(N,H),0.0),90.0)*0.16;',
  ' col+=uSunCol*(1.0-exp(-spk*1.4))*0.92*uSunUp;',
  ' col+=uSunCol*pow(max(dot(N,H),0.0),22.0)*0.11*uSunUp;',
  /* whitecaps where the surface folds, broken up so they read as spray not paint */
  ' float fold=clamp((0.74-vJ)/0.74,0.0,1.0);',
  ' float fm=vn(vW.xz*1.15-uWindV*uTime*0.8);',
  ' float cap=smoothstep(0.12,0.60,fold*(0.32+uFoam*1.6)*(0.35+fm*1.1));',
  ' float crest=smoothstep(0.86,1.0,hn)*uFoam*0.34*(0.30+0.70*fm);',
  ' col=mix(col,vec3(0.93,0.965,0.985),clamp(cap+crest,0.0,0.92));',
  ' if(uUnder>0.5){ float up=clamp(dot(N,-V),0.0,1.0);',
  '  vec3 uc=mix(uDeep*0.55,uShal*1.45+vec3(0.05,0.17,0.17)*uSunUp,pow(up,1.5));',
  '  uc+=uSunCol*pow(max(dot(-V,normalize(uSunDir)),0.0),22.0)*0.60*uSunUp;',
  '  uc+=vec3(0.75,0.95,0.92)*pow(max(dot(N,normalize(normalize(uSunDir)-V)),0.0),90.0)*0.35*uSunUp;',
  '  col=uc; }',
  ' if(uUnder<0.5&&uHull.w>0.0){ vec2 q=vW.xz, f2=uHull.xy; float la=dot(q,f2), lb=q.y*f2.x-q.x*f2.y;',
  '  float e=length(vec2(la/5.45,lb/1.78))-1.0; float ao=exp(-max(e,0.0)*max(e,0.0)*9.0)*step(-0.35,e);',
  '  vec3 Ls=normalize(uSunDir); vec2 so=Ls.xz/max(Ls.y,0.12)*0.95; so*=min(1.0,6.0/max(length(so),0.001));',
  '  vec2 q2=q+so; float la2=dot(q2,f2), lb2=q2.y*f2.x-q2.x*f2.y; float e2=length(vec2(la2/5.2,lb2/1.6))-1.0;',
  '  float shd=(1.0-smoothstep(-0.25,0.35,e2))*uSunUp*uHull.z;',
  '  col*=1.0-(0.30*ao+0.34*shd)*uHull.w; }',
  ' float fg=1.0-exp(-pow(dist*uFogD,2.0));',
  ' float sdV=pow(clamp(dot(normalize(-V.xz+vec2(1e-5)),gd)*0.5+0.5,0.0,1.0),3.0);',
  ' vec3 fogc=mix(uFogCol,uDuskCol,uDusk*sdV*0.87);',
  ' gl_FragColor=vec4(mix(col,fogc,clamp(fg,0.0,1.0)),1.0);}'].join('\n'));

/* ===== flow overlay: streaks in the air, darts on the water ===== */
var FLOW=prog(
 ['precision highp float; attribute vec3 aP; attribute vec2 aA;',
  'uniform mat4 uVP; uniform vec3 uEye; uniform float uFogD;',
  'varying float vA; varying float vC; varying float vF;',
  'void main(){ vA=aA.x; vC=aA.y;',
  ' vF=1.0-exp(-pow(length(uEye-aP)*uFogD,2.0));',
  ' gl_Position=uVP*vec4(aP,1.0);}'].join('\n'),
 ['precision highp float; uniform vec3 uCw,uCc,uCs,uCh,uCv,uCl,uCr,uCg,uCp,uFogCol; uniform float uK;',
  'varying float vA; varying float vC; varying float vF;',
  'void main(){ vec3 c=vC<0.5?uCw:(vC<1.5?mix(uCc,vec3(0.035,0.17,0.27),clamp((vC-1.0)*2.2,0.0,1.0)):(vC<2.5?uCs:(vC<3.5?uCh:(vC<4.5?uCv:(vC<5.5?uCl:(vC<6.5?uCr:(vC<7.5?uCg:uCp)))))));',
  ' float A=vA*(1.0-vF*0.85); gl_FragColor=vec4(mix(c,uFogCol,clamp(vF,0.0,1.0))*A,A*((vC>4.5&&vC<5.5)?0.0:uK));}'].join('\n'));

var LOWSEA=((C.clientWidth||400)<560);
/* רדיוסי הטבעות בשני אזורים: עד 2.6 ק"מ יש גלים ולכן המשולשים מאוזנים (אורך רדיאלי ~ אורך משיקי),
   ומשם והלאה המשטח שטוח ואפשר לגדול מהר עד 400 ק"מ. סך הכול פחות משולשים מהריבוע שהיה כאן קודם. */
var NANG=LOWSEA?96:128, R_IN=1.2, R_WAVE=2600.0, R_OUT=400000.0, seaPos=[0,0], seaIdx=[], seaR=[];
(function(){ var i,j, step=6.2831853/NANG, gA=1+step, rr=R_IN;
  while(rr<R_WAVE){ seaR.push(rr); rr*=gA; }
  rr=R_WAVE; while(rr<R_OUT){ seaR.push(rr); rr*=1.55; } seaR.push(R_OUT);
  for(i=0;i<seaR.length;i++) for(j=0;j<NANG;j++){ var a=j*step; seaPos.push(Math.cos(a)*seaR[i],Math.sin(a)*seaR[i]); }
  for(j=0;j<NANG;j++) seaIdx.push(0,1+j,1+(j+1)%NANG);
  for(i=0;i<seaR.length-1;i++) for(j=0;j<NANG;j++){
    var a0=1+i*NANG+j, a1=1+i*NANG+(j+1)%NANG, b0=a0+NANG, b1=a1+NANG;
    seaIdx.push(a0,b0,a1, a1,b0,b1); } })();
var seaPB=buf(seaPos), seaIB=buf(seaIdx,gl.ELEMENT_ARRAY_BUFFER,Uint16Array), seaCount=seaIdx.length;

/* ===== solid + textured-sail programs ===== */
var LIT=['uniform vec3 uCol,uLightDir,uLightCol,uAmbSky,uAmbGnd,uFogCol,uEye; uniform float uFogD,uFlat;'].join('\n');
var SOLID=prog(
 ['precision highp float; attribute vec3 aP,aN; uniform mat4 uVP,uM; uniform float uZS;',
  'varying vec3 vW,vN;',
  'void main(){ vec3 p=vec3(aP.x,aP.y,aP.z*uZS); vec4 w=uM*vec4(p,1.0); vW=w.xyz;',
  ' vN=mat3(uM[0].xyz,uM[1].xyz,uM[2].xyz)*aN; gl_Position=uVP*w;}'].join('\n'),
 ['precision highp float;',LIT,'uniform float uA; uniform vec2 uSpec;','varying vec3 vW,vN;',
  'void main(){ vec3 N=normalize(vN); float dl=dot(N,normalize(uLightDir));',
  ' if(dot(N,uEye-vW)<0.0){ N=-N; dl=-dl; }',
  ' float df=max(dl,0.0); float wr=dl*0.5+0.5;',
  ' vec3 amb=mix(uAmbGnd,uAmbSky,N.y*0.5+0.5)*(1.05+0.80*wr);',
  ' vec3 lit=uCol*(amb+uLightCol*df); float Lm=max(lit.r,max(lit.g,lit.b));',
  ' if(Lm>0.8) lit*=(0.8+0.2*(1.0-exp(-(Lm-0.8)/0.2)))/Lm;',
  ' if(uSpec.x>0.0){ vec3 V=normalize(uEye-vW), Hh=normalize(normalize(uLightDir)+V);',
  '  float fr=0.04+0.96*pow(1.0-max(dot(N,V),0.0),5.0);',
  '  lit+=uLightCol*uSpec.x*pow(max(dot(N,Hh),0.0),uSpec.y)*(uSpec.y+8.0)*0.02*df;',
  '  lit=mix(lit,uAmbSky*1.15,clamp(fr*uSpec.x*0.55,0.0,0.35)); }',
  ' vec3 col=mix(lit,uCol,uFlat);',
  ' float fg=1.0-exp(-pow(length(uEye-vW)*uFogD,2.0));',
  ' gl_FragColor=vec4(mix(col,uFogCol,clamp(fg,0.0,1.0)),uA);}'].join('\n'));
var SAILP=prog(
 ['precision highp float; attribute vec3 aP,aN; attribute vec2 aUV; uniform mat4 uVP,uM; uniform float uZS;',
  'varying vec3 vW,vN; varying vec2 vUV;',
  'void main(){ vec3 p=vec3(aP.x,aP.y,aP.z*uZS); vec4 w=uM*vec4(p,1.0); vW=w.xyz;',
  ' vN=mat3(uM[0].xyz,uM[1].xyz,uM[2].xyz)*aN; vUV=aUV; gl_Position=uVP*w;}'].join('\n'),
 ['precision highp float;',LIT,'uniform sampler2D uTex; uniform float uTwo;','varying vec3 vW,vN; varying vec2 vUV;',
  'void main(){ vec3 N=normalize(vN); float dl=dot(N,normalize(uLightDir));',
  ' float df=max(dl,0.0)+max(-dl,0.0)*0.70;',
  ' vec3 amb=mix(uAmbGnd,uAmbSky,N.y*0.5+0.5)*1.20;',
  ' vec2 uv=vUV; if(uTwo>0.5 && !gl_FrontFacing) uv.x=1.0-uv.x;',
  ' vec4 tx=texture2D(uTex,uv); vec3 base=tx.rgb*uCol;',
  ' vec3 col=base*(amb+uLightCol*df*0.92);',
  ' float fg=1.0-exp(-pow(length(uEye-vW)*uFogD,2.0));',
  ' gl_FragColor=vec4(mix(col,uFogCol,clamp(fg,0.0,1.0)),tx.a);}'].join('\n'));

/* ===== sail textures: the flag she actually flies, and her race number ===== */
function texFromCanvas(cv){
  var t=gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D,t);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,cv);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  return t;
}
function star(x,g,cx,cy,R,w){
  x.lineWidth=w; x.lineJoin='miter';
  for(var k=0;k<2;k++){
    x.beginPath();
    for(var i=0;i<3;i++){
      var a=(k?90:-90)+i*120, p=a*Math.PI/180;
      var px=cx+R*Math.cos(p), py=cy+R*Math.sin(p);
      if(i===0) x.moveTo(px,py); else x.lineTo(px,py);
    }
    x.closePath(); x.stroke();
  }
}
function panelSeams(x,s){
  x.strokeStyle='rgba(22,34,74,0.13)'; x.lineWidth=Math.max(1,s*0.0035);
  for(var k=1;k<9;k++){ x.beginPath(); x.moveTo(s*k/9,0); x.lineTo(s*k/9,s); x.stroke(); }
  x.strokeStyle='rgba(22,34,74,0.07)';
  for(var m=1;m<7;m++){ x.beginPath(); x.moveTo(0,s*m/7); x.lineTo(s,s*m/7); x.stroke(); }
}
function flagTexture(){
  var s=896, cv=document.createElement('canvas'); cv.width=cv.height=s;
  var x=cv.getContext('2d'), i;
  x.fillStyle='#f7f6f2'; x.fillRect(0,0,s,s);
  /* panels fan out from a point above the head, the way a radial spinnaker is cut */
  var hx=s*0.5, hy=-s*0.62;
  x.lineWidth=Math.max(1,s*0.0022);
  for(i=-11;i<=11;i++){
    x.strokeStyle='rgba(26,40,86,'+(i%3===0?0.14:0.08)+')';
    x.beginPath(); x.moveTo(hx,hy);
    x.lineTo(hx+i*s*0.105, s*1.25); x.stroke(); }
  /* the two flag bands, bowed the way the panels carry them */
  var BL='#2c58cc', amp=s*0.062;
  function band(y0,th){
    x.fillStyle=BL; x.beginPath();
    var u,px,py;
    for(u=0;u<=1.0001;u+=0.02){ px=u*s; py=y0+amp*(1-Math.pow(2*u-1,2));
      if(u===0) x.moveTo(px,py); else x.lineTo(px,py); }
    for(u=1;u>=-0.0001;u-=0.02){ px=u*s; py=y0+th+amp*(1-Math.pow(2*u-1,2));
      x.lineTo(px,py); }
    x.closePath(); x.fill(); }
  band(s*0.262, s*0.082);
  band(s*0.686, s*0.082);
  x.strokeStyle=BL;
  star(x,0,s*0.50,s*0.520,s*0.125,s*0.031);
  return texFromCanvas(cv);
}
function plainTexture(){
  var s=512, cv=document.createElement('canvas'); cv.width=cv.height=s;
  var x=cv.getContext('2d');
  x.fillStyle='#f6f5f1'; x.fillRect(0,0,s,s);
  panelSeams(x,s);
  return texFromCanvas(cv);
}
function numberTexture(){
  var s=512, cv=document.createElement('canvas'); cv.width=cv.height=s;
  var x=cv.getContext('2d');
  x.fillStyle='#f5f3ee'; x.fillRect(0,0,s,s);
  x.fillStyle='#17315e';
  x.font='bold '+Math.round(s*0.22)+'px Helvetica, Arial, sans-serif';
  x.textAlign='center'; x.textBaseline='middle';
  x.fillText('07', s*0.52, s*0.30);
  x.strokeStyle='#0c3f9e'; x.lineWidth=s*0.016;
  x.beginPath(); x.moveTo(s*0.30,s*0.44); x.lineTo(s*0.74,s*0.44); x.stroke();
  x.fillStyle='#0c3f9e'; x.font='bold '+Math.round(s*0.062)+'px Helvetica, Arial, sans-serif';
  x.fillText('ISR', s*0.52, s*0.50);
  return texFromCanvas(cv);
}
function nameTexture(){
  var w=1024,h=256, cv=document.createElement('canvas'); cv.width=w; cv.height=h;
  var x=cv.getContext('2d');
  x.clearRect(0,0,w,h);
  x.fillStyle='#14181d';
  x.textAlign='center'; x.textBaseline='middle';
  x.font='bold '+Math.round(h*0.52)+'px Helvetica, Arial, sans-serif';
  var txt='EXODUS', cw=[], i, total=0, sp=h*0.10;
  for(i=0;i<txt.length;i++){ cw[i]=x.measureText(txt[i]).width; total+=cw[i]; }
  total+=sp*(txt.length-1);
  var cx=w/2-total/2;
  for(i=0;i<txt.length;i++){ x.fillText(txt[i], cx+cw[i]/2, h*0.52); cx+=cw[i]+sp; }
  return texFromCanvas(cv);
}
var TEX_FLAG=flagTexture(), TEX_NUM=mainTexture(), TEX_NAME=nameTexture(), TEX_PLAIN=plainTexture();

/* ===== geometry ===== */
function normalsFor(pos,idx){ var n=new Float32Array(pos.length),i;
  for(i=0;i<idx.length;i+=3){ var a=idx[i]*3,b=idx[i+1]*3,c=idx[i+2]*3;
    var ux=pos[b]-pos[a],uy=pos[b+1]-pos[a+1],uz=pos[b+2]-pos[a+2];
    var vx=pos[c]-pos[a],vy=pos[c+1]-pos[a+1],vz=pos[c+2]-pos[a+2];
    var nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
    n[a]+=nx;n[a+1]+=ny;n[a+2]+=nz;n[b]+=nx;n[b+1]+=ny;n[b+2]+=nz;n[c]+=nx;n[c+1]+=ny;n[c+2]+=nz; }
  for(i=0;i<n.length;i+=3){ var l=Math.hypot(n[i],n[i+1],n[i+2])||1; n[i]/=l;n[i+1]/=l;n[i+2]/=l; }
  return n; }
function mesh(pos,idx,uv){ var m={p:buf(pos),n:buf(normalsFor(pos,idx)),
  i:buf(idx,gl.ELEMENT_ARRAY_BUFFER,Uint16Array),c:idx.length};
  if(uv) m.uv=buf(uv); return m; }
function boxMesh(sx,sy,sz,ox,oy,oz){
  var x=sx/2,y=sy/2,z=sz/2,p=[],idx=[];
  var v=[[-x,-y,-z],[x,-y,-z],[x,y,-z],[-x,y,-z],[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]];
  var f=[[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[3,2,6,7],[4,5,1,0]];
  for(var k=0;k<6;k++){ var b=p.length/3;
    for(var j=0;j<4;j++) p.push(v[f[k][j]][0]+(ox||0),v[f[k][j]][1]+(oy||0),v[f[k][j]][2]+(oz||0));
    idx.push(b,b+1,b+2,b,b+2,b+3); }
  return mesh(p,idx); }
function cylMesh(r1,r2,h,ox,oy,oz){ var N=10,p=[],idx=[],k;
  for(k=0;k<=N;k++){ var a=k/N*Math.PI*2,c=Math.cos(a),s=Math.sin(a);
    p.push(r1*c+(ox||0),-h/2+(oy||0),r1*s+(oz||0)); p.push(r2*c+(ox||0),h/2+(oy||0),r2*s+(oz||0)); }
  for(k=0;k<N;k++){ var b=k*2; idx.push(b,b+1,b+2,b+1,b+3,b+2); }
  return mesh(p,idx); }

var LOA=10.62, BEAM=3.40, FREE=1.02;   /* Baba 35, לפי השלט שעל הרציף: LOA 10.62, רוחב 3.40, שוקע 1.68 */
function hb(t){ return (BEAM/2)*Math.pow(Math.sin(Math.PI*Math.pow(t,1.05)),t<0.5?0.50:0.66); }
function sheer(t){ var a=Math.abs(2*t-1); return FREE+0.34*Math.pow(a,1.9)*(t>0.5?1.35:1.0); }
function dep(t){ return 1.05*Math.pow(Math.sin(Math.PI*t),0.35); }
function hullMesh(lo,hi,tint){
  var NS=34,NG=12,p=[],idx=[],i,j;
  for(i=0;i<NS;i++){ var t=i/(NS-1),x=(t-0.5)*LOA,w=hb(t),sh2=sheer(t),dp=dep(t);
    for(j=0;j<NG;j++){ var sv=lo+(hi-lo)*(j/(NG-1));
      p.push(x,-dp+sv*(sh2+dp),-w*Math.pow(Math.sin(sv*Math.PI/2),0.72)); } }
  var base=NS*NG;
  for(i=0;i<NS;i++){ var t2=i/(NS-1),x2=(t2-0.5)*LOA,w2=hb(t2),s3=sheer(t2),d2=dep(t2);
    for(j=0;j<NG;j++){ var s2=lo+(hi-lo)*(j/(NG-1));
      p.push(x2,-d2+s2*(s3+d2),w2*Math.pow(Math.sin(s2*Math.PI/2),0.72)); } }
  function quads(off,flip){ for(var a1=0;a1<NS-1;a1++) for(var b1=0;b1<NG-1;b1++){
    var a=off+a1*NG+b1,b=a+NG,c=a+1,d=b+1;
    if(flip) idx.push(a,b,c,c,b,d); else idx.push(a,c,b,c,d,b); } }
  quads(0,false); quads(base,true);
  return mesh(p,idx); }
function foilMesh(prof,halfT){ var p=[],idx=[],n=prof.length,i;
  for(i=0;i<n;i++) p.push(prof[i][0],prof[i][1],-halfT(prof[i][1]));
  for(i=0;i<n;i++) p.push(prof[i][0],prof[i][1], halfT(prof[i][1]));
  for(i=0;i<n;i++){ var j=(i+1)%n; idx.push(i,j,n+i,j,n+j,n+i); }
  for(i=1;i<n-1;i++){ idx.push(0,i+1,i); idx.push(n,n+i,n+i+1); }
  return mesh(p,idx); }
function caprailMesh(){ var NS=34,p=[],idx=[],i;
  for(i=0;i<NS;i++){ var t=i/(NS-1),x=(t-0.5)*LOA,w=hb(t)*1.02,s2=sheer(t)+0.13;
    p.push(x,s2,-w, x,s2-0.20,-w, x,s2,w, x,s2-0.20,w); }
  for(i=0;i<NS-1;i++){ var a=i*4;
    idx.push(a,a+4,a+1,a+1,a+4,a+5); idx.push(a+2,a+3,a+6,a+3,a+7,a+6); }
  return mesh(p,idx); }
function decalMesh(side){
  var NS=26, t0=0.801, t1=0.943, v0=0.600, v1=0.855, off=0.055;   /* EXODUS ממש ליד החרטום: 8% עד 11% מהאורך, לפי תמונות 12 ו-13 */
  var p=[],uv=[],idx=[],i,j;
  function pt(t,sv){ var x=(t-0.5)*LOA, w=hb(t), sh2=sheer(t), dp=dep(t);
    return [x, -dp+sv*(sh2+dp), side*w*Math.pow(Math.sin(sv*Math.PI/2),0.72)]; }
  for(i=0;i<NS;i++){ var t=t0+(t1-t0)*(i/(NS-1));
    var a=pt(Math.max(0.001,t-0.004),0.735), b=pt(Math.min(0.999,t+0.004),0.735);
    var dx=b[0]-a[0], dz=b[2]-a[2], L=Math.hypot(dx,dz)||1;
    var nx=(-dz/L)*side, nz=(dx/L)*side;
    for(j=0;j<2;j++){ var sv=j?v1:v0, q=pt(t,sv);
      p.push(q[0]+nx*off, q[1], q[2]+nz*off);
      var u=(i/(NS-1)); uv.push(side>0?u:1-u, j?1:0); } }
  for(i=0;i<NS-1;i++){ var a2=i*2;
    if(side>0) idx.push(a2,a2+2,a2+1,a2+1,a2+2,a2+3);
    else       idx.push(a2,a2+1,a2+2,a2+1,a2+3,a2+2); }
  return mesh(p,idx,uv); }
function deckMesh(kw,lift,tMin,tMax){
  kw=kw||0.985; lift=lift||0; var NS=34,NZ=8,p=[],idx=[],i,jj;
  for(i=0;i<NS-1;i++){
    var t0=i/(NS-1), t1=(i+1)/(NS-1);
    var x0=(t0-0.5)*LOA, x1=(t1-0.5)*LOA;
    if(tMin!==undefined&&(t0<tMin||t1>tMax)) continue;
    var w0=Math.max(0,hb(t0)*0.985-(0.985-kw)*BEAM/2), w1=Math.max(0,hb(t1)*0.985-(0.985-kw)*BEAM/2);
    var y0=sheer(t0)-0.03+lift, y1=sheer(t1)-0.03+lift;
    for(jj=0;jj<NZ;jj++){
      var f0=jj/NZ*2-1, f1=(jj+1)/NZ*2-1;
      var xm=(x0+x1)/2, zm=(f0+f1)/2*((w0+w1)/2);
      if(xm>-4.50 && xm<-2.32 && Math.abs(zm)<0.72) continue;
      var b=p.length/3;
      p.push(x0,y0,f0*w0, x1,y1,f0*w1, x1,y1,f1*w1, x0,y0,f1*w0);
      idx.push(b,b+1,b+2,b,b+2,b+3); } }
  return mesh(p,idx); }
function trunkMesh(){
  var st=[[-2.05,0.94],[-1.0,0.98],[0.4,0.96],[1.5,0.87],[2.35,0.67],[2.75,0.43]];
  var p=[],idx=[],i;
  for(i=0;i<st.length;i++){ var x=st[i][0],w=st[i][1],y0=sheer(x/LOA+0.5)-0.02,h=0.58;
    p.push(x,y0,-w, x,y0+h,-w*0.93, x,y0+h+0.07,0, x,y0+h,w*0.93, x,y0,w); }
  for(i=0;i<st.length-1;i++){ var a=i*5,b=a+5,k;
    for(k=0;k<4;k++) idx.push(a+k,b+k,a+k+1,a+k+1,b+k,b+k+1); }
  var f=(st.length-1)*5; idx.push(f,f+1,f+2,f,f+2,f+3,f,f+3,f+4);
  idx.push(0,2,1, 0,3,2, 0,4,3);
  return mesh(p,idx); }
function dodgerMesh(){
  var p=[],idx=[],N=9,i;
  for(i=0;i<=N;i++){ var a=Math.PI*i/N, y=sheer(-0.15)+0.12+Math.sin(a)*0.62, z=-Math.cos(a)*1.02;
    p.push(-2.5,y,z, -1.55,y,z); }
  for(i=0;i<N;i++){ var b=i*2; idx.push(b,b+2,b+1, b+1,b+2,b+3); }
  return mesh(p,idx); }
function sphMesh(r,ox,oy,oz,sy,sz){ var NU=10,NV=7,p=[],idx=[],i,j;
  for(i=0;i<=NU;i++) for(j=0;j<=NV;j++){ var a=i/NU*Math.PI*2, b=j/NV*Math.PI;
    p.push(ox+r*(sz||1)*Math.sin(b)*Math.cos(a), oy+r*(sy||1)*Math.cos(b), oz+r*Math.sin(b)*Math.sin(a)); }
  for(i=0;i<NU;i++) for(j=0;j<NV;j++){ var q=i*(NV+1)+j, s2=q+NV+1; idx.push(q,s2,q+1,q+1,s2,s2+1); }
  return mesh(p,idx); }
function sailMesh(foot,luff,camber,rake,fl){
  var NU=12,NV=16,p=[],idx=[],uv=[],i,j;
  var rkS=Math.sin(rake||0), rkC=Math.cos(rake||0); fl=(fl===undefined)?1:fl;
  for(i=0;i<=NU;i++) for(j=0;j<=NV;j++){
    var u=i/NU,v=j/NV, chord=foot*(1-v)*(1+0.24*Math.sin(Math.PI*v));
    p.push(-chord*u-v*luff*rkS, v*luff*rkC, fl*Math.sin(Math.PI*Math.min(1,u+0.001))*Math.sin(Math.PI*v*0.88+0.16)*camber);
    uv.push(u, v);
  }
  for(i=0;i<NU;i++) for(j=0;j<NV;j++){ var q=i*(NV+1)+j,r=q+NV+1; idx.push(q,r,q+1,q+1,r,r+1); }
  return mesh(p,idx,uv); }
function arrowMesh(){
  var L=1.0,hw=0.085,hl=0.30,hh=0.20,th=0.035,p=[],idx=[];
  var b0=p.length/3;
  p.push(0,-th,-hw, L-hl,-th,-hw, L-hl,-th,hw, 0,-th,hw, 0,th,-hw, L-hl,th,-hw, L-hl,th,hw, 0,th,hw);
  idx.push(b0+4,b0+5,b0+6,b0+4,b0+6,b0+7, b0,b0+2,b0+1,b0,b0+3,b0+2,
           b0,b0+1,b0+5,b0,b0+5,b0+4, b0+3,b0+7,b0+6,b0+3,b0+6,b0+2);
  var b1=p.length/3;
  p.push(L-hl,-th,-hh, L,-th,0, L-hl,-th,hh, L-hl,th,-hh, L,th,0, L-hl,th,hh);
  idx.push(b1+3,b1+4,b1+5, b1,b1+2,b1+1, b1,b1+1,b1+4,b1,b1+4,b1+3, b1+1,b1+2,b1+5,b1+1,b1+5,b1+4);
  return mesh(p,idx); }

var M_TOPS=hullMesh(0.30,1.0), M_BOTT=hullMesh(0.0,0.30), M_RAIL=caprailMesh(), M_TRUNK=trunkMesh(),
    M_DODGE=dodgerMesh(),
    M_KEEL=foilMesh([[1.95,-0.72],[0.55,-1.59],[-1.35,-1.68],[-2.30,-1.53],[-2.30,-0.86]],
                    function(y){return 0.115+0.145*Math.max(0,(y+1.72)/1.1);}),
    M_RUD=foilMesh([[-2.32,-1.60],[-3.02,-1.36],[-3.08,-0.56],[-2.32,-0.60]],function(){return 0.075;}),
    M_MAST=cylMesh(0.086,0.118,14.95,0.35,FREE+7.40,0),
    M_SPRIT=cylMesh(0.082,0.066,1.32,0,0,0), M_BOOM=cylMesh(0.062,0.058,4.80,0,0,0),
    M_HATCH=boxMesh(0.80,0.42,0.88,-2.75,FREE+0.26,0),
    M_COAM1=boxMesh(2.0,0.24,0.09,-3.35,FREE+0.17,-0.76),
    M_COAM2=boxMesh(2.0,0.24,0.09,-3.35,FREE+0.17,0.76),
    M_VANEP=boxMesh(0.06,0.95,0.06,-5.45,FREE+0.45,0),
    M_VANE=boxMesh(0.32,1.28,0.028,0,0.64,0),
    M_PADL=boxMesh(0.12,1.00,0.30,-5.48,-0.42,0),
    M_GEN=cylMesh(0.16,0.16,0.22,-4.95,FREE+1.95,-0.62),
    M_GENP=cylMesh(0.05,0.05,1.9,-4.95,FREE+1.0,-0.62),
    M_DECK=deckMesh(), M_DECKO=deckMesh(0.905,0.006,0.085,0.955), M_DECKF=deckMesh(0.905,0.009,0.752,0.955), M_SOLE=boxMesh(2.22,0.07,1.46,-3.41,FREE-0.44,0),
    M_STEP=boxMesh(0.52,0.13,1.04,-2.58,FREE-0.15,0),
    M_DECS=decalMesh(1), M_DECP=decalMesh(-1),
    M_MAIN=sailMesh(4.72,13.26,0.55), M_MAINR=sailMesh(4.30,9.60,0.44),
    M_YANK=sailMesh(4.45,13.40,0.58,0.363), M_STAY=sailMesh(3.25,10.35,0.50,0.246),
    M_SPIN=sailMesh(6.40,14.00,1.10,0.376), M_JIB=sailMesh(2.95,8.60,0.40,0.400),
    M_MAINX=sailMesh(4.72,13.26,0.55,0,-1), M_MAINRX=sailMesh(4.30,9.60,0.44,0,-1),
    M_YANKX=sailMesh(4.45,13.40,0.58,0.363,-1), M_STAYX=sailMesh(3.25,10.35,0.50,0.246,-1),
    M_SPINX=sailMesh(6.40,14.00,1.10,0.376,-1), M_JIBX=sailMesh(2.95,8.60,0.40,0.400,-1),
    D_LEG=cylMesh(0.075,0.062,0.86,0,0.43,0), D_HIP=boxMesh(0.30,0.24,0.36,0,0.97,0),
    D_TOR=cylMesh(0.175,0.190,0.56,0,1.22,0), D_SHO=boxMesh(0.20,0.14,0.44,0,1.52,0),
    D_COAT=boxMesh(0.26,0.50,0.09,0,1.24,0), D_ARM=cylMesh(0.052,0.046,0.60,0,0,0),
    D_NECK=cylMesh(0.052,0.052,0.11,0,1.62,0), D_HEAD=sphMesh(0.107,0,1.735,0,1.12,0.92),
    D_HAIR=sphMesh(0.118,0,1.762,0,0.92,0.96),
    M_ARROW=arrowMesh();

/* her real livery: white topsides, dark antifoul, varnished teak rail, that orange dodger */
var COL={ tops:[0.940,0.950,0.960], bott:[0.105,0.125,0.155], boot:[0.40,0.13,0.11],   /* boot: הצבע האמיתי לא ודאי עד שתהיה תמונת יום של קו המים */
          rail:[0.445,0.430,0.400], deck:[0.885,0.395,0.105], dkwhite:[0.895,0.898,0.888], deckEdge:[0.915,0.920,0.920], trunk:[0.865,0.875,0.875], teak:[0.470,0.455,0.425],
          hatch:[0.62,0.63,0.64], vane:[0.70,0.72,0.74],
          dodge:[0.93,0.40,0.11], dodgeIn:[0.085,0.195,0.145], spar:[0.86,0.84,0.79], sail:[1,1,1], wire:[0.30,0.31,0.33],
          seam:[0.855,0.862,0.870], steel:[0.78,0.80,0.83], jack:[0.95,0.80,0.12], timber:[0.46,0.25,0.13],
          solar:[0.125,0.135,0.165], bronze:[0.31,0.34,0.24], glass:[0.10,0.13,0.15], ring:[0.86,0.15,0.12],
          wind:[1.0,0.45,0.10], cur:[0.31,0.76,0.91],
          skin:[0.78,0.57,0.41], tee:[0.115,0.135,0.205], short:[0.74,0.71,0.64],
          shade:[0.055,0.060,0.075], cush:[0.60,0.545,0.665], navy:[0.085,0.105,0.165],
          hair:[0.115,0.080,0.055] };
/* ברק לכל חומר: [עוצמה, חדות]. המפתח הוא אותו מערך צבע שמועבר ל-drawMesh */
var SPEC=new Map([[COL.tops,[0.55,70]],[COL.dkwhite,[0.30,40]],[COL.deckEdge,[0.30,40]],[COL.trunk,[0.30,40]],[COL.hatch,[0.40,60]],
  [COL.spar,[0.45,36]],[COL.steel,[0.70,80]],[COL.vane,[0.40,40]],[COL.glass,[0.90,140]],[COL.solar,[0.75,110]],[COL.bronze,[0.45,40]],
  [COL.ring,[0.25,30]],[COL.jack,[0.20,24]],[COL.bott,[0.05,12]],[COL.boot,[0.10,20]],[COL.deck,[0.06,16]],[COL.teak,[0.04,10]],[COL.rail,[0.06,14]],
  [COL.skin,[0.08,14]],[COL.hair,[0.10,18]],[COL.navy,[0.06,12]]]);
var lastPlan='', SAIL_FLIP=1;
function planFor(c,twa){ return (twa>=118)?(c.wind<12?'spin':(c.wind<26?'poled':'heavy'))
  :(twa>=70?(c.wind<22?'reach':'heavy'):(c.wind<19?'beat':'heavy')); }
var SAILNAME={spin:'ספינקר גדול',poled:'ג׳נואה + סטייסייל',reach:'ג׳נואה + סטייסייל',
              beat:'ג׳נואה קרוב־רוח',heavy:'ריף עמוק + יעד'};

/* ===== wave field on the CPU ===== */
var NWV=7;
var wDir=[], wAmp=[], wLen=[], wSpd=[], wStp=[], ampMax=0.6, foam=0.2;
for(var wI=0;wI<NWV;wI++){ wDir.push([1,0]); wAmp.push(0.05); wLen.push(30); wSpd.push(7); wStp.push(0.5); }
function waveY(px,pz,t){ var y=0;
  for(var i=0;i<NWV;i++){ var k=6.2831853/Math.max(wLen[i],0.5);
    y+=wAmp[i]*Math.sin(k*(wDir[i][0]*px+wDir[i][1]*pz)-wSpd[i]*k*t); }
  return y; }
function applyConditions(c){
  var L0=Math.max(9,1.56*c.waveT*c.waveT);
  var sw=Math.max(0.08,c.waveH)*0.5;
  var wv=Math.max(0.03,c.wind*0.0060);
  var Lw=Math.max(6,0.075*c.wind*c.wind);
  var sd=(c.waveDir+180)%360, wd=(c.windDir+180)%360;
  var set=[
   [bearing2(sd),      sw*0.52, L0,                    0.60],
   [bearing2(sd-21),   sw*0.30, L0*0.74,               0.56],
   [bearing2(sd+26),   sw*0.19, L0*0.55,               0.53],
   [bearing2(wd-34),   wv*0.85, Math.max(7,Lw),        0.52],
   [bearing2(wd),      wv*1.00, Math.max(5,Lw*0.62),   0.50],
   [bearing2(wd+41),   wv*0.70, Math.max(3.5,Lw*0.40), 0.46],
   [bearing2(wd+9),    wv*0.42, Math.max(1.8,Lw*0.17), 0.40]];
  ampMax=0;
  for(var i=0;i<NWV;i++){ wDir[i]=set[i][0]; wAmp[i]=set[i][1]; wLen[i]=set[i][2]; wStp[i]=set[i][3];
    wSpd[i]=1.249*Math.sqrt(set[i][2]); ampMax+=set[i][1]; }
  ampMax=Math.max(0.12,ampMax);
  foam=Math.max(0,Math.min(0.9,(c.wind-8)/20)); }

/* ===== flow field: wind streaks in the air, current darts on the water ===== */
var LOWP=(C.clientWidth||400)<560 || (navigator.deviceMemory&&navigator.deviceMemory<=4) ||
         (navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=4);
var NWIND=LOWP?330:780, NCUR=LOWP?44:84, NSPRAY=LOWP?0:70, NWAKE=14, NCHEV=LOWP?9:16;
var TSEG=5, CSEG=12;
var FR=78, CR=58;
var MAXV=NWIND*TSEG*6+NCUR*CSEG*12+NSPRAY*6+NWAKE*12+NCHEV*48+900+36000+18000;
var flowArr=new Float32Array(MAXV*5), flowBuf=gl.createBuffer(), flowN=0;
gl.bindBuffer(gl.ARRAY_BUFFER,flowBuf);
gl.bufferData(gl.ARRAY_BUFFER,flowArr.byteLength,gl.DYNAMIC_DRAW);
function rnd(a,b){ return a+Math.random()*(b-a); }
var PW=[],PC=[],PS=[],i0;
function newTrail(n){ return {x:new Float32Array(n),y:new Float32Array(n),z:new Float32Array(n),n:0}; }
function seedW(p){ var a=Math.random()*6.283, r=p.R*Math.sqrt(Math.random());
  p.px=Math.cos(a)*r; p.pz=Math.sin(a)*r; p.py=rnd(0.6,p.R>40?12:7.0);
  p.age=0; p.life=rnd(7,14); p.t.n=0; }
for(i0=0;i0<NWIND;i0++){ var R0=(i0<NWIND*0.60)?30:FR;
  var pw0={R:R0,sp:rnd(0.78,1.32),ph:rnd(0,6.283),t:newTrail(TSEG+1)};
  seedW(pw0); pw0.age=rnd(0,pw0.life); PW.push(pw0); }
function seedC(p){ var a=Math.random()*6.283, r=p.R*Math.sqrt(Math.random());
  p.px=Math.cos(a)*r; p.pz=Math.sin(a)*r; p.age=0; p.life=rnd(9,18); p.t.n=0; }
for(i0=0;i0<NCUR;i0++){ var R1=(i0<NCUR*0.6)?26:CR;
  var pc0={R:R1,ph:rnd(0,6.283),dep:rnd(0.35,2.6),t:newTrail(CSEG+1)};
  seedC(pc0); pc0.age=rnd(0,pc0.life); PC.push(pc0); }
for(i0=0;i0<NSPRAY;i0++) PS.push({x:0,y:-999,z:0,vx:0,vy:0,vz:0,l:0,L:1});
var PV=[]; for(i0=0;i0<NCHEV;i0++) PV.push({x:0,z:0,age:1e9,life:0});
var flowOn=true;
/* שלושה טווחים באותו מאגר, כדי שכל שכבה תצויר במצב ה-GL שלה:
   הזרם לפני הסירה ובלי בדיקת עומק (רואים אותו דרך המים), פני המים אחריה, והרוח במיזוג מוסיף. */
var rngCur=[0,0], rngSurf=[0,0], rngAir=[0,0], rngRing=[0,0];
function fv(x,y,z,a,ci){ if(flowN>=MAXV) return; var o=flowN*5;
  flowArr[o]=x; flowArr[o+1]=y; flowArr[o+2]=z; flowArr[o+3]=a; flowArr[o+4]=ci; flowN++; }
function fquad(ax,ay,az,bx,by,bz,sx,sy,sz,a,ci){
  fv(ax-sx,ay-sy,az-sz,a,ci); fv(ax+sx,ay+sy,az+sz,a,ci); fv(bx+sx,by+sy,bz+sz,a,ci);
  fv(ax-sx,ay-sy,az-sz,a,ci); fv(bx+sx,by+sy,bz+sz,a,ci); fv(bx-sx,by-sy,bz-sz,a,ci); }

function flowPath(tr,x0,y0,z0,ang0,step,n,t,ph,kx,kz,kt,amp,onWater){
  var x=x0,z=z0,k; tr.n=n;
  for(k=n-1;k>=0;k--){
    tr.x[k]=x; tr.z[k]=z; tr.y[k]=onWater?(waveY(x,z,t)+0.07):y0;
    var s=Math.sin(x*kx+t*kt+ph)*Math.cos(z*kz-t*kt*0.8+ph*1.7);
    var a=ang0+s*amp;
    x-=Math.sin(a)*step; z+=Math.cos(a)*step; }
}
function wf(f){ var b=0.10+0.90*Math.pow(f,0.72);
  return f>0.84 ? b*(1-(f-0.84)/0.16*0.74) : b; }
function ribbon(tr,eye,w,a,ci){
  var n=tr.n,k;
  for(k=0;k<n-1;k++){
    var f0=k/(n-1), f1=(k+1)/(n-1);
    var ax=tr.x[k], ay=tr.y[k], az=tr.z[k];
    var bx=tr.x[k+1], by=tr.y[k+1], bz=tr.z[k+1];
    var dx=bx-ax, dy=by-ay, dz=bz-az;
    var ex=eye[0]-ax, ey=eye[1]-ay, ez=eye[2]-az;
    var cx=dy*ez-dz*ey, cy=dz*ex-dx*ez, cz=dx*ey-dy*ex;
    var cl=Math.sqrt(cx*cx+cy*cy+cz*cz); if(cl<1e-6) continue;
    var w0=w*wf(f0), w1=w*wf(f1);
    var a0=a*f0*f0, a1=a*f1*f1;
    var s0x=cx/cl*w0, s0y=cy/cl*w0, s0z=cz/cl*w0;
    var s1x=cx/cl*w1, s1y=cy/cl*w1, s1z=cz/cl*w1;
    fv(ax-s0x,ay-s0y,az-s0z,a0,ci); fv(ax+s0x,ay+s0y,az+s0z,a0,ci); fv(bx+s1x,by+s1y,bz+s1z,a1,ci);
    fv(ax-s0x,ay-s0y,az-s0z,a0,ci); fv(bx+s1x,by+s1y,bz+s1z,a1,ci); fv(bx-s1x,by-s1y,bz-s1z,a1,ci); }
}
function softDash(tr,eye,w,a,ci,dashPh){
  var n=tr.n,k;
  for(k=0;k<n-1;k++){
    if(((k+dashPh)%3)===2) continue;                 /* מקווקו: שני מקטעים מלאים, אחד ריק */
    var f0=k/(n-1), f1=(k+1)/(n-1);
    var ax=tr.x[k], ay=tr.y[k], az=tr.z[k], bx=tr.x[k+1], by=tr.y[k+1], bz=tr.z[k+1];
    var dx=bx-ax, dy=by-ay, dz=bz-az;
    var ex=eye[0]-ax, ey=eye[1]-ay, ez=eye[2]-az;
    var cx=dy*ez-dz*ey, cy=dz*ex-dx*ez, cz=dx*ey-dy*ex;
    var cl=Math.sqrt(cx*cx+cy*cy+cz*cz); if(cl<1e-6) continue;
    var sx=cx/cl*w, sy=cy/cl*w, sz=cz/cl*w;
    var a0=a*(0.35+0.65*f0), a1=a*(0.35+0.65*f1);
    /* שתי רצועות: קצה שקוף → ציר בהיר → קצה שקוף */
    fv(ax-sx,ay-sy,az-sz,0,ci); fv(ax,ay,az,a0,ci); fv(bx,by,bz,a1,ci);
    fv(ax-sx,ay-sy,az-sz,0,ci); fv(bx,by,bz,a1,ci); fv(bx-sx,by-sy,bz-sz,0,ci);
    fv(ax+sx,ay+sy,az+sz,0,ci); fv(bx,by,bz,a1,ci); fv(ax,ay,az,a0,ci);
    fv(ax+sx,ay+sy,az+sz,0,ci); fv(bx+sx,by+sy,bz+sz,0,ci); fv(bx,by,bz,a1,ci); }
}
/* שברון כפול ששוכב על פני המים ורוכב על פסגת הסוול */
function chevron(px,pz,dx,dz,size,a,t){
  var nx=-dz, nz=dx, k, th=size*0.085;
  for(k=0;k<2;k++){
    var ox=px-dx*size*0.55*k, oz=pz-dz*size*0.55*k;
    var tipx=ox+dx*size*0.42, tipz=oz+dz*size*0.42, s2;
    for(s2=-1;s2<=1;s2+=2){
      var ex=ox-dx*size*0.30+nx*size*0.62*s2, ez=oz-dz*size*0.30+nz*size*0.62*s2;
      var q1x=tipx, q1z=tipz, q2x=tipx-dx*th*2.2, q2z=tipz-dz*th*2.2;
      var q3x=ex, q3z=ez, q4x=ex-dx*th*2.2, q4z=ez-dz*th*2.2;
      var aa=a*(k?0.55:1);
      fv(q1x,waveY(q1x,q1z,t)+0.08,q1z,aa,4); fv(q2x,waveY(q2x,q2z,t)+0.08,q2z,aa,4); fv(q3x,waveY(q3x,q3z,t)+0.08,q3z,aa*0.25,4);
      fv(q2x,waveY(q2x,q2z,t)+0.08,q2z,aa,4); fv(q4x,waveY(q4x,q4z,t)+0.08,q4z,aa*0.25,4); fv(q3x,waveY(q3x,q3z,t)+0.08,q3z,aa*0.25,4); } }
}

/* ===================== תוספות הגרסה במסך מלא =====================
   נכנסות ל-v2/deck.js בזמן הבנייה. assets/deck.js של הדף הקודם לא משתנה. */
/* ---------- ציר זום אחד (מנה ב׳) ----------
   u הוא המשתנה היחיד. 0 עד U_MAX: מסלול סביב הסירה, 9 עד 150 מטר (לוגריתמי, כמו קודם). 0 עד ‎−1: המצלמה מחליקה אל עמדת
   ההגאי. ‎−1 עד ‎−2: על הסיפון, הצביטה משנה רק את שדה הראייה (70° עד 38°). U_MAX עד U_TOP: המצלמה מתיישרת למבט מלמעלה
   ומתרחקת מהר. U_TOP עד U_GLOBE: הצלבה אל הגלובוס, שמונעת מהצביטה עצמה. cam.r נגזר מ-u; מי שכותב ל-cam.r ישירות מתורגם. */
var U_FOV=-2, U_DECK=-1, U_MAX=Math.log(150/9), U_TOP=U_MAX+0.75, U_XF=U_TOP-0.12, U_GLOBE=U_TOP+0.42, zoomT=0, camGlide=null;
function rOfU(u){ return u>=0?9*Math.exp(Math.min(u,U_MAX)+Math.max(0,u-U_MAX)*2.4):9*Math.max(0,1+u); }
function uOfR(r){ return r>=9?Math.log(r/9):(r/9-1); }
function uCeil(){ return (!reduce&&EXO.globeReady&&EXO.quality!=='lite')?U_GLOBE:U_MAX; }
function setU(u,quiet){ if(cam.u===undefined) cam.u=uOfR(cam.r);
  u=Math.max(U_FOV,Math.min(uCeil(),u));
  /* מתקרבים אל הסיפון: המבט מתיישר בהדרגה אל האופק, כדי לא להגיע להגה כשמסתכלים על הרצפה */
  /* והוא פונה בהדרגה אל החרטום: מגיעים להגה כשמסתכלים קדימה, כמו מי שעומד שם */
  if(!quiet&&u<cam.u&&cam.u<0.35&&u>U_DECK-0.01){ var k=Math.min(1,(cam.u-u)*1.4); cam.el+=(0.20-cam.el)*k; cam.az+=(nearestAz(-BP.cog*D2R)-cam.az)*k; }
  if(u>cam.u&&u>U_MAX&&cam.u<U_XF){ var a0=Math.max(cam.u,U_MAX), kN=Math.min(1,(u-a0)/Math.max(1e-4,U_XF-a0)); cam.az+=(nearestAz(0)-cam.az)*kN; cam.vaz=0; }
  cam.u=u; cam.r=cam._r=rOfU(u); if(!quiet){ zoomT=performance.now(); camGlide=null; } }
function zoomAxisFrame(now){
  if(cam.u===undefined||cam.r!==cam._r){ cam.u=uOfR(Math.max(0.01,cam.r)); cam._r=cam.r; }
  var dt=Math.min(0.1,(now-(cam._zn||now))/1000); cam._zn=now;
  if(camGlide){ var f=(now-camGlide.t0)/camGlide.dur; if(f>=1){ cam.u=camGlide.to; camGlide=null; } else { f=f*f*(3-2*f); cam.u=camGlide.from+(camGlide.to-camGlide.from)*f; } }
  /* ההצלבה נשארת איפה שהמשתמש עצר: הזום רציף מהסיפון ועד החלל, בלי מדרגות ובלי קפיצות */
  if(cam.u>uCeil()) cam.u=uCeil();
  if(cam.u>=U_XF-0.02){ cam.az+=(nearestAz(0)-cam.az)*Math.min(1,dt*9); cam.vaz=0; }      /* מי שהגיע לכאן בהחלקה ולא ב-setU מתיישר גם הוא */
  cam.r=cam._r=rOfU(cam.u); }
function xfm(m,x,y,z){ return [m[0]*x+m[4]*y+m[8]*z+m[12], m[1]*x+m[5]*y+m[9]*z+m[13], m[2]*x+m[6]*y+m[10]*z+m[14]]; }
var RIG=[];                                   /* המפרשים של הפריים הזה: מטריצה, אורך תחתית, אורך מוביל */
var WATER={
  subtropic:{deepD:[0.024,0.157,0.243], shalD:[0.055,0.302,0.412], deepN:[0.008,0.063,0.110], shalN:[0.024,0.125,0.184]},
  tropic:   {deepD:[0.008,0.118,0.330], shalD:[0.030,0.345,0.560], deepN:[0.004,0.050,0.130], shalN:[0.014,0.130,0.230]},
  south:    {deepD:[0.036,0.105,0.118], shalD:[0.100,0.225,0.228], deepN:[0.012,0.040,0.050], shalN:[0.034,0.086,0.094]}
};
/* הופכי של ההתפלגות הנורמלית, קירוב: כמה מהשמיים מכוסים → סף הרעש */
/* צבע המים לפי המקום: סובטרופי, טרופי (לפי טמפרטורת המים כשיש, אחרת לפי קו הרוחב), ואפור־ירקרק בקווי הרוחב הגבוהים */
var _wFor=null, _wVal=null;
function mixW(a,b,f){ var o={}, k; for(k in a){ o[k]=[a[k][0]+(b[k][0]-a[k][0])*f, a[k][1]+(b[k][1]-a[k][1])*f, a[k][2]+(b[k][2]-a[k][2])*f]; } return o; }
function waterNow(c){ if(_wFor===c&&_wVal) return _wVal; var la=Math.abs(BP.lat);
  var tw=(c.seaT!=null)?smooth(21.5,27.5,c.seaT):smooth(28,10,la), sw=(c.seaT!=null)?smooth(17,8,c.seaT):smooth(34,48,la);
  _wFor=c; _wVal=mixW(mixW(WATER.subtropic,WATER.tropic,tw),WATER.south,sw); return _wVal; }
function probit(p){ p=Math.max(0.002,Math.min(0.998,p));
  var t=Math.sqrt(-2*Math.log(p<0.5?p:1-p));
  var z=t-(2.515517+0.802853*t+0.010328*t*t)/(1+1.432788*t+0.189269*t*t+0.001308*t*t*t);
  return p<0.5?-z:z; }

/* ---------- רוח: זרמי אוויר בגובה המפרשים, שנפתחים סביבם ---------- */
/* 22.9 (/next/): בטלפון לאורך הזרמים תפסו את כל המסך וקראו כמו גשם או שריטות — שני שלישים מהם */
var AK=34, NAIR=LOWP?((innerWidth<560&&innerHeight>innerWidth)?56:84):200, PAIR=[], airAcc=0;      /* מנה ג׳: כ-30% פחות זרמים, דקים וארוכים יותר */
/* מסכת הסירה: זרם אוויר שנמצא בין המצלמה לסירה, ושהקו מהעין דרכו ממשיך אל תוך הצללית של הגוף והמפרשים, כמעט נעלם.
   הצללית היא אליפסואיד בציר הסירה (5.6 מ' לאורך, 2.1 לרוחב, 7.2 לגובה, סביב גובה 6.2 מ'), עם שוליים רכים. זרמים מאחורי הסירה או לצדה לא נפגעים. */
function boatMask(px,py,pz,E,fx,fz){
  function S(x,y,z){ return [(x*fx+z*fz)/5.6,(y-6.2)/7.2,(-x*fz+z*fx)/2.1]; }
  var e=S(E[0],E[1],E[2]), p=S(px,py,pz), dx=p[0]-e[0], dy=p[1]-e[1], dz=p[2]-e[2], L=Math.sqrt(dx*dx+dy*dy+dz*dz); if(L<1e-4) return 0;
  dx/=L; dy/=L; dz/=L; var tc=-(e[0]*dx+e[1]*dy+e[2]*dz); if(tc<L) return 0;      /* הסירה לא מאחורי החלקיק: אין מה להסתיר */
  var qx=e[0]+dx*tc, qy=e[1]+dy*tc, qz=e[2]+dz*tc, d=Math.sqrt(qx*qx+qy*qy+qz*qz);
  return d>=1.4?0:d<=0.9?1:(1.4-d)/0.5; }
(function(){ for(var i=0;i<NAIR;i++){
  PAIR.push({x:0,y:0,z:0,age:1e9,life:0,ph:Math.random()*6.283,sp:0.85+Math.random()*0.35,
             corridor:(i<NAIR*0.72), n:0, hx:new Float32Array(AK), hy:new Float32Array(AK), hz:new Float32Array(AK)}); } })();
function seedAir(p,wx,wz,cx,cz,first){
  var nx=-wz, nz=wx, D, L;
  if(p.corridor){ D=first?(-22+Math.random()*40):(14+Math.random()*8); L=(Math.random()*2-1)*8.5; p.y=2.3+Math.random()*9.4; }
  else          { D=first?(-70+Math.random()*140):(62+Math.random()*10); L=(Math.random()<0.5?-1:1)*(13+Math.random()*52); p.y=1.2+Math.random()*19; }
  p.x=cx-wx*D+nx*L; p.z=cz-wz*D+nz*L; p.age=0; p.life=p.corridor?(9+Math.random()*6):(14+Math.random()*10); p.n=1;
  p.hx[AK-1]=p.x; p.hy[AK-1]=p.y; p.hz[AK-1]=p.z; }
function airRibbon(p,eye,w,a){
  var n=p.n, o=AK-n, k, X=p.hx, Y=p.hy, Z=p.hz;
  for(k=0;k<n-1;k++){
    var f0=k/(n-1), f1=(k+1)/(n-1);
    var ax=X[o+k], ay=Y[o+k], az=Z[o+k], bx=X[o+k+1], by=Y[o+k+1], bz=Z[o+k+1];
    var dx=bx-ax, dy=by-ay, dz=bz-az, ex=eye[0]-ax, ey=eye[1]-ay, ez=eye[2]-az;
    var cx=dy*ez-dz*ey, cy=dz*ex-dx*ez, cz=dx*ey-dy*ex, cl=Math.sqrt(cx*cx+cy*cy+cz*cz); if(cl<1e-6) continue;
    var nearF=Math.max(0,Math.min(1,(Math.sqrt(ex*ex+ey*ey+ez*ez)-1.6)/3.2));          /* פס שעובר ממש ליד העין נמוג, אחרת הוא נראה כמו מדרגות */
    var w0=w*wf(f0), w1=w*wf(f1), a0=a*f0*f0*nearF, a1=a*f1*f1*nearF;
    var s0x=cx/cl*w0, s0y=cy/cl*w0, s0z=cz/cl*w0, s1x=cx/cl*w1, s1y=cy/cl*w1, s1z=cz/cl*w1;
    fv(ax-s0x,ay-s0y,az-s0z,a0,0); fv(ax+s0x,ay+s0y,az+s0z,a0,0); fv(bx+s1x,by+s1y,bz+s1z,a1,0);
    fv(ax-s0x,ay-s0y,az-s0z,a0,0); fv(bx+s1x,by+s1y,bz+s1z,a1,0); fv(bx-s1x,by-s1y,bz-s1z,a1,0); }
}
function buildAir(c,t,dt,eye,wx,wz,wspd){
  var i,k,p, nx=-wz, nz=wx, hr=BP.cog*D2R, bfx=Math.sin(hr), bfz=-Math.cos(hr), cx=bfx*1.5, cz=bfz*1.5;
  var QF=(EXO.quality==='lite'?0.5:1), nUse=Math.round(NAIR*QF*Math.min(1,0.45+c.wind/22));
  airAcc+=dt; var tick=false; if(airAcc>=0.07){ airAcc=0; tick=true; }
  for(i=0;i<nUse;i++){ p=PAIR[i]; if(LAB.wind==='sails'&&!p.corridor) continue;
    p.age+=dt;
    var along=(p.x-cx)*wx+(p.z-cz)*wz;
    if(p.age>p.life || along>(p.corridor?26:74) || p.life===0){ seedAir(p,wx,wz,cx,cz,p.life===0); }
    /* שדה הזרימה: רוח אחידה + הפרעה של "גליל" סביב כל מפרש בגובה של החלקיק + ערבול בצל המפרש */
    var ux=wspd*p.sp, uy=0, uv=0, s;
    for(s=0;s<RIG.length;s++){ var R=RIG[s], v=(p.y-R.y0)/R.luff;
      if(v<0.02||v>0.97) continue;
      var chord=R.foot*(1-v)*(1+0.24*Math.sin(Math.PI*v));
      var mid=xfm(R.M,-chord*0.5,v*R.luff,0);
      var sinA=Math.abs(wx*R.dz-wz*R.dx);
      var a=0.5*chord*sinA*1.15+0.50;
      var X=(p.x-mid[0])*wx+(p.z-mid[2])*wz, Y=(p.x-mid[0])*nx+(p.z-mid[2])*nz;
      var r2=X*X+Y*Y, a2=a*a;
      if(r2<a2*1.04){ var rr=Math.sqrt(r2)||0.01, push=(a*1.03-rr); var sg=(Math.abs(Y)<0.02)?(Math.sin(p.ph)>0?1:-1):(Y>0?1:-1);
        p.x+=nx*sg*push; p.z+=nz*sg*push; Y+=sg*push; r2=X*X+Y*Y; }
      if(r2<a2*400){ var r4=r2*r2;
        ux+=-wspd*a2*(X*X-Y*Y)/r4; uy+=-wspd*2*a2*X*Y/r4; }
      if(X>0 && X<9*a+8){ var wdt=a*1.25+0.10*X, g=Math.exp(-(Y*Y)/(wdt*wdt))*Math.exp(-X/(7*a+5));
        ux*=(1-0.38*g);
        uy+=wspd*0.55*g*Math.sin(t*3.1+p.ph*5.0+X*0.85);
        uv+=wspd*0.30*g*Math.cos(t*2.3+p.ph*3.0+X*0.65); }
    }
    /* משב: נשימה איטית של כל השדה */
    var gust=1+0.10*Math.sin(t*0.55+p.x*0.03)+0.05*Math.sin(t*1.7+p.ph);
    p.x+=(wx*ux+nx*uy)*gust*dt; p.z+=(wz*ux+nz*uy)*gust*dt;
    p.y+=(uv+Math.sin(t*0.9+p.ph)*0.12)*dt;
    if(p.y<1.0) p.y=1.0;
    if(tick){ p.hx.copyWithin(0,1); p.hy.copyWithin(0,1); p.hz.copyWithin(0,1); if(p.n<AK) p.n++; }
    p.hx[AK-1]=p.x; p.hy[AK-1]=p.y; p.hz[AK-1]=p.z;
    if(p.n<3) continue;
    var fade=Math.min(1,p.age/1.2)*Math.min(1,(p.life-p.age)/1.6);
    var lim=p.corridor?26:74, edge=Math.min(1,(lim-along)/8);
    var al=(p.corridor?0.46:0.20)*fade*Math.max(0,edge);
    al*=(along>0?1.22:0.86);                                   /* הדגשה קלה בצד המוגן, שם האוויר עוזב את המפרשים */
    var mk=Math.max(boatMask(p.x,p.y,p.z,eye,bfx,bfz),boatMask(p.hx[AK-Math.min(p.n,12)],p.hy[AK-Math.min(p.n,12)],p.hz[AK-Math.min(p.n,12)],eye,bfx,bfz));
    al*=1-0.94*mk; if(al<0.012) continue;
    airRibbon(p,eye,(p.corridor?0.046:0.042)+wspd*0.0012,al);
  }
}

/* ---------- גל: קשת פסגה. הקצה המוביל בהיר, הזנב נמוג, והקצוות נשארים מאחור ---------- */
function crestArc(px,pz,dx,dz,half,a,t){
  var nx=-dz, nz=dx, S=10, k, w=0.24;
  for(k=0;k<S;k++){
    var s0=-1+2*k/S, s1=-1+2*(k+1)/S;
    var b0=half*0.20*s0*s0, b1=half*0.20*s1*s1;
    var ax=px+nx*half*s0-dx*b0, az=pz+nz*half*s0-dz*b0;
    var bx=px+nx*half*s1-dx*b1, bz=pz+nz*half*s1-dz*b1;
    var a0=a*Math.pow(Math.max(0,1-s0*s0),0.7), a1=a*Math.pow(Math.max(0,1-s1*s1),0.7);
    var q1x=ax+dx*w*0.4, q1z=az+dz*w*0.4, q2x=ax-dx*w, q2z=az-dz*w, q3x=bx+dx*w*0.4, q3z=bz+dz*w*0.4, q4x=bx-dx*w, q4z=bz-dz*w;
    fv(q1x,waveY(q1x,q1z,t)+0.09,q1z,a0,4); fv(q2x,waveY(q2x,q2z,t)+0.09,q2z,0,4); fv(q3x,waveY(q3x,q3z,t)+0.09,q3z,a1,4);
    fv(q2x,waveY(q2x,q2z,t)+0.09,q2z,0,4);  fv(q4x,waveY(q4x,q4z,t)+0.09,q4z,0,4); fv(q3x,waveY(q3x,q3z,t)+0.09,q3z,a1,4);
  }
}

/* ---------- טבעת המצפן על המים ----------
   שוכבת על פני הים ורוכבת על הגלים, אבל נראית כמו מכשיר: הקוטר הגדול ביותר שהמסך מאפשר,
   קווים ברוחב קבוע בפיקסלים (פונים תמיד אל המצלמה), שנתות כל 5°, ספרות כל 30°, וסימנים מעולם השיט:
   נוצת רוח (WMO), חץ גלי לזרם (מפות ימיות, INT 1), קשתות לגל, קו חרטום כפול, מעוין ליעד. */
function rp(r,brg,tau){ var b=brg*D2R, s=Math.sin(b), co=Math.cos(b); return [s*r+co*(tau||0), -co*r+s*(tau||0)]; }
function ringFit(VP){
  var lo=5, hi=150, it, k, fx=LAB.fitX||0.95, fb=LAB.fitB||0.84, ft=LAB.fitT||0.80;
  for(it=0;it<11;it++){ var mid=(lo+hi)/2, ok=true;
    for(k=0;k<24&&ok;k++){ var q=rp(mid,k*15), n=project(VP,[q[0],0,q[1]]);
      if(!n||n[0]<-fx||n[0]>fx||n[1]<-fb||n[1]>ft) ok=false; }
    if(ok) lo=mid; else hi=mid; }
  return Math.max(7.5,lo); }
function pxAt(x,z){ var E=LAB._eye; return Math.sqrt((E[0]-x)*(E[0]-x)+E[1]*E[1]+(E[2]-z)*(E[2]-z))*LAB._k; }   /* מטרים לפיקסל בנקודה הזאת */
function bseg(A,B,px,a0,a1,ci,t){                       /* קטע על פני המים ברוחב קבוע בפיקסלים */
  var E=LAB._eye, ax=A[0], az=A[1], bx=B[0], bz=B[1], ay=waveY(ax,az,t)+0.08, by=waveY(bx,bz,t)+0.08;
  var dx=bx-ax, dy=by-ay, dz=bz-az, ex=E[0]-ax, ey=E[1]-ay, ez=E[2]-az;
  var cx=dy*ez-dz*ey, cy=dz*ex-dx*ez, cz=dx*ey-dy*ex, cl=Math.sqrt(cx*cx+cy*cy+cz*cz); if(cl<1e-6) return;
  var d0=Math.sqrt(ex*ex+ey*ey+ez*ez), fx=E[0]-bx, fy=E[1]-by, fz=E[2]-bz, d1=Math.sqrt(fx*fx+fy*fy+fz*fz);
  var h0=px*0.5*d0*LAB._k/cl, h1=px*0.5*d1*LAB._k/cl;
  fv(ax-cx*h0,ay-cy*h0,az-cz*h0,a0,ci); fv(ax+cx*h0,ay+cy*h0,az+cz*h0,a0,ci); fv(bx+cx*h1,by+cy*h1,bz+cz*h1,a1,ci);
  fv(ax-cx*h0,ay-cy*h0,az-cz*h0,a0,ci); fv(bx+cx*h1,by+cy*h1,bz+cz*h1,a1,ci); fv(bx-cx*h1,by-cy*h1,bz-cz*h1,a1,ci); }
function wtri(A,B,Cc,a,ci,t){ var L=0.08;
  fv(A[0],waveY(A[0],A[1],t)+L,A[1],a,ci); fv(B[0],waveY(B[0],B[1],t)+L,B[1],a,ci); fv(Cc[0],waveY(Cc[0],Cc[1],t)+L,Cc[1],a,ci); }
function arcLine(r,b0,b1,px,a,ci,t){ var n=Math.max(2,Math.round(Math.abs(b1-b0)/3)), k;
  for(k=0;k<n;k++) bseg(rp(r,b0+(b1-b0)*k/n),rp(r,b0+(b1-b0)*(k+1)/n),px,a,a,ci,t); }

function worldRing(c,t){
  if(LAB._under) return;
  /* l23 (23.9): ringVis — הטבעת שייכת לשכבה "איפה הוא עכשיו"; 0 = מוסתרת כולה, כולל משולש הצפון */
  var RK=(LAB.ringK===undefined?1:LAB.ringK)*(LAB.ringVis===undefined?1:LAB.ringVis); if(RK<0.01) return;      /* נעלמת בדרך אל הגלובוס */
  var R=LAB.RR||13, hot=(LAB.ringHot||0)*RK, A=(0.04+0.93*hot)*RK, k;      /* במנוחה כמעט שקופה לגמרי; רק משולש הצפון נשאר כרמז */
  var rOut=R*0.965, rIn=Math.max(6.4,R*0.34), band=function(u){ return rOut-u*(rOut-rIn); };
  /* המעגל: מקווקו, מעלה אחת למקטע, שניים מלאים ואחד ריק */
  /* שנתות פנימה: 5° קצרה, 10° בינונית, 30° ארוכה, 90° הארוכה ביותר */
  for(k=0;k<72;k++){ var b=k*5, maj=(b%30===0), card=(b%90===0), ten=(b%10===0), q=rp(R,b), u=pxAt(q[0],q[1]);
    bseg(q,rp(R-(card?22:maj?16:ten?10:6)*u,b),(maj?1.8:1.2),A*(ten?1:0.8),A*(ten?1:0.8),6,t); }
  /* צפון: משולש אדום מחוץ למעגל, כמו בכרטיס מצפן */
  (function(){ var q=rp(R,0), u=pxAt(q[0],q[1]); wtri(rp(R+19*u,0),rp(R+4*u,0,-7*u),rp(R+4*u,0,7*u),(0.16+0.84*hot)*RK,8,t); })();
  /* קו החרטום (כיוון ההתקדמות) וקשתות שמאל־ימין: אדום לשמאל, ירוק לימין, כמו במכשירי רוח */
  if(LAB.lines!=='water'){ var H=BP.cog, qh=rp(R,H), uh=pxAt(qh[0],qh[1]);
    var am=(0.05+0.95*hot)*RK;                     /* הסמלים דועכים יחד עם השנתות */
    bseg(rp(R-15*uh,H,-2.6*uh),rp(R+11*uh,H,-2.6*uh),1.8,am,am,6,t); bseg(rp(R-15*uh,H,2.6*uh),rp(R+11*uh,H,2.6*uh),1.8,am,am,6,t);
    /* היעד הבא: מעוין על המעגל */
    var G=GATE_BRG, qg=rp(R,G), ug=pxAt(qg[0],qg[1]);
    wtri(rp(R+10*ug,G),rp(R,G,-6.5*ug),rp(R,G,6.5*ug),am,6,t); wtri(rp(R-10*ug,G),rp(R,G,6.5*ug),rp(R,G,-6.5*ug),am,6,t); }
  var LY=EXO.layers, hk=(0.05+0.95*hot)*RK;
  /* רוח: מצביע על המעגל + נוצת רוח. מוט לכיוון שאליו הרוח נושבת, נוצה מלאה = 10 קשר, חצי = 5, דגלון = 50.
     הנוצות פונות אל הלחץ הנמוך: בחצי הכדור הצפוני עם כיוון השעון, בדרומי נגדו. */
  if(LY.wind){ var W=c.windDir, qw=rp(R,W), uw=pxAt(qw[0],qw[1]), side=(BP.lat>=0?1:-1);
    wtri(rp(R-17*uw,W),rp(R+3*uw,W,-7*uw),rp(R+3*uw,W,7*uw),Math.min(1,hk+0.2),0,t);
    var s0=band(0.02), s1=band(0.40), L=s0-s1, n5=Math.round(c.wind/5), pen=Math.floor(n5/10), full=Math.floor((n5-pen*10)/2), half=(n5-pen*10)%2, pos=0, fl=L*0.42, j;
    var seg=7; for(j=0;j<seg;j++){ var f0=j/seg, f1=(j+1)/seg, ph=((f0-t*(0.30+c.wind/26))%1+1)%1, pu=Math.pow(Math.cos(6.2831853*ph)*0.5+0.5,2);
      bseg(rp(s0-L*f0,W),rp(s0-L*f1,W),2.2,hk*(0.55+0.45*pu),hk*(0.55+0.45*pu),0,t); }
    function feather(at,len){ var r0=s0-at; bseg(rp(r0,W),rp(r0+len*0.50,W,side*len*0.87),2.2,hk,hk,0,t); }
    for(j=0;j<pen;j++){ var r0=s0-pos; wtri(rp(r0,W),rp(r0+fl*0.5,W,side*fl*0.87),rp(r0-L*0.13,W),hk,0,t); pos+=L*0.15; }
    for(j=0;j<full;j++){ feather(pos,fl); pos+=L*0.11; }
    if(half){ if(pos===0) pos=L*0.11; feather(pos,fl*0.5); }
    }
  /* גל: שתי קשתות פסגה שנעות פנימה, אחת לכל מחזור */
  if(LY.wave){ var T=Math.max(3,c.waveT), jj, qq;
    for(jj=0;jj<2;jj++){ var pw=((t/T)+jj*0.5)%1, rr=band(0.44+0.24*pw), aw=Math.sin(Math.PI*pw)*hk, sp=Math.min(R*0.10,2.4);
      for(qq=0;qq<8;qq++){ var a0=-1+2*qq/8, a1=-1+2*(qq+1)/8;
        bseg(rp(rr+sp*0.30*a0*a0,c.waveDir,sp*a0),rp(rr+sp*0.30*a1*a1,c.waveDir,sp*a1),2.6,aw*(1-a0*a0*0.7),aw*(1-a1*a1*0.7),4,t); } } }
  /* זרם: חץ גלי — הסימון של זרם במפות ימיות — נכנס מהצד שממנו הוא בא */
  if(LY.cur){ var from=(c.curDir+180)%360, c0=band(0.72), c1=band(0.97), CL=c0-c1, m, nn=14;
    for(m=0;m<nn;m++){ var g0=m/nn, g1=(m+1)/nn, amp=Math.min(0.30,CL*0.10);
      bseg(rp(c0-CL*g0,from,amp*Math.sin(g0*6.2831853*2.2-t*1.4)),rp(c0-CL*g1,from,amp*Math.sin(g1*6.2831853*2.2-t*1.4)),2.4,hk,hk,1,t); }
    wtri(rp(c1-CL*0.22,from),rp(c1+CL*0.06,from,-CL*0.13),rp(c1+CL*0.06,from,CL*0.13),hk,1,t); }
}
/* עוגנים למיקום התוויות (HTML) מעל הסצנה */
var DEG12=['N','030','060','E','120','150','S','210','240','W','300','330'];
function labAnchors(VP,t){
  var R=LAB.RR||13, A=EXO.frame.anchors||(EXO.frame.anchors={}), cw=C.clientWidth, ch=C.clientHeight, i;
  function put(name,r,brg,far,tau){ var q=rp(r,brg,tau||0), y=far?0:waveY(q[0],q[1],t)+0.25, n=project(VP,[q[0],y,q[1]]);
    A[name]=(n&&Math.abs(n[0])<1.05&&Math.abs(n[1])<1.05)?[(n[0]*0.5+0.5)*cw,(1-(n[1]*0.5+0.5))*ch]:null; }
  var c=cond; if(!c) return;
  var rOut=R*0.965, rIn=Math.max(6.4,R*0.34), band=function(u){ return rOut-u*(rOut-rIn); };
  for(i=0;i<12;i++){ var q=rp(R,i*30), u=pxAt(q[0],q[1]); put('g'+i,R-(i%3===0?40:34)*u,i*30); }
  var qs=rp(R,c.windDir), us=pxAt(qs[0],qs[1]);
  put('wind',band(0.20),c.windDir,false,46*us); put('wave',band(0.56),c.waveDir,false,-52*us); put('cur',band(0.85),(c.curDir+180)%360,false,46*us);
  put('gate',R-30*us,GATE_BRG,false,-8*us); put('cog',R-30*us,BP.cog,false,30*us); put('beacon',1400,GATE_BRG,true);
  /* המשואה נעלמה בזומים ובכיוונים רבים (הערה בתחנה, 21.9): נקודת האופק שלה יצאה מהמסך — מעל הקצה העליון
     בטלפון לאורך, או לצד/מאחורי המצלמה — ו-project החזיר null. עכשיו נשמר גם המיקום הגולמי, עם הצד הנכון
     גם כשהנקודה מאחורי המצלמה (חלוקה ב-|w|), וה-HUD מצמיד את המשואה לשפת המסך במקום להעלים אותה. */
  (function(){ var qb=rp(1400,GATE_BRG), m=VP, px=qb[0], pz=qb[1], w=m[3]*px+m[11]*pz+m[15], aw=Math.max(Math.abs(w),1e-3);
    var nx=(m[0]*px+m[8]*pz+m[12])/aw, ny=(m[1]*px+m[9]*pz+m[13])/aw;
    A.beaconEx=[(nx*0.5+0.5)*cw,(1-(ny*0.5+0.5))*ch,w<=0.001?1:0]; })();
  /* l23 (23.9): נקודות אופק לכל כיוון שה-HUD מבקש (LAB.hz — הכיוונים אל שאר הסירות בשכבה "המירוץ"),
     באותה שיטה של המשואה: [x, y, מאחורי המצלמה] */
  if(LAB.hz&&LAB.hz.length){ var HZ=A.hz||(A.hz=[]), hi; HZ.length=LAB.hz.length;
    for(hi=0;hi<LAB.hz.length;hi++){ var qz=rp(1400,LAB.hz[hi]), mz=VP, wz=mz[3]*qz[0]+mz[11]*qz[1]+mz[15], az=Math.max(Math.abs(wz),1e-3);
      HZ[hi]=[((mz[0]*qz[0]+mz[8]*qz[1]+mz[12])/az*0.5+0.5)*cw,(1-((mz[1]*qz[0]+mz[9]*qz[1]+mz[13])/az*0.5+0.5))*ch,wz<=0.001?1:0]; } }
  else A.hz=null;
  EXO.frame.ringR=R;
}

/* ===================== שמיים אמיתיים (מנה ג׳, סעיף 5) =====================
   נכנס ל-v2/deck.js בזמן הבנייה, אחרי engine_add.js.
   כוכבים: קטלוג הכוכבים הבהירים של ייל (assets/v2n/stars.js, נטען אחרי הפריים הראשון), מצוירים כנקודות בשכבה משלהם,
   מסובבים לפי זמן כוכבי מקומי וקו הרוחב של הסירה. בלי הקובץ, או במצב קל בלי WebGL מספק, נשאר רעש הכוכבים הישן.
   כוכבי לכת: נוגה, מאדים, צדק ושבתאי, מיסודות מסלול ממוצעים (דיוק של כמעלה; מספיק לעין). בלי נצנוץ.
   שביל החלב: מודל פרוצדורלי בקואורדינטות גלקטיות, בתוך שיידר השמיים (פס, בליטה במרכז, בקע כהה, ענני מגלן).
   זה לא הצילום של נאס"א שההזמנה ביקשה: מסביבת הבנייה לא הייתה גישה אליו. מי שרוצה להחליף — הערה ב-README.
   נקיפה (כ-0.37° מאז J2000) לא מחושבת; לעין זה לא נראה. */
var STARP=null, starBuf=null, starN=0, planetBuf=null, STAR_R=1500;
function starsInit(){
  if(starBuf||typeof STARS_B64==='undefined') return !!starBuf;
  try{
    var bin=atob(STARS_B64), n=Math.floor(bin.length/6), a=new Float32Array(n*5), i;
    for(i=0;i<n;i++){ var o=i*6, ra=(bin.charCodeAt(o)|(bin.charCodeAt(o+1)<<8))/65535*6.283185307,
        de=((bin.charCodeAt(o+2)|(bin.charCodeAt(o+3)<<8))/65535-0.5)*3.141592654, cd=Math.cos(de);
      a[i*5]=cd*Math.cos(ra); a[i*5+1]=cd*Math.sin(ra); a[i*5+2]=Math.sin(de);
      a[i*5+3]=-1.5+bin.charCodeAt(o+4)/255*8; a[i*5+4]=2000+bin.charCodeAt(o+5)*120; }
    STARP=prog(
     ['precision highp float; attribute vec3 aD; attribute float aM,aK;',
      'uniform mat4 uVP; uniform mat3 uRot; uniform vec3 uEye,uMoonDir; uniform float uR,uLim,uTime,uPx,uTw,uCloudOn,uCloudTh,uMoonUp; uniform vec2 uCloudV;',
      'varying float vA; varying vec3 vC;',
      'float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }',
      'float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);',
      ' float a=h21(i), b=h21(i+vec2(1.0,0.0)), c=h21(i+vec2(0.0,1.0)), d=h21(i+vec2(1.0,1.0)); return mix(mix(a,b,f.x),mix(c,d,f.x),f.y); }',
      'float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<5;i++){ s+=a*vn(p); p=p*2.03+vec2(11.3,7.7); a*=0.5; } return s; }',
      'void main(){ vec3 r=uRot*aD; gl_Position=uVP*vec4(uEye+r*uR,1.0);',
      ' float up=max(r.y,0.0), X=1.0/(up+0.025);',                                  /* מסת אוויר: הכחדה ליד האופק */
      ' float m=aM+0.28*(X-1.0);',
      ' float a=clamp((uLim-m)/1.6,0.0,1.0)*smoothstep(-0.005,0.03,r.y);',
      ' if(uCloudOn>0.5 && r.y>0.012){ vec2 cp=r.xz/(r.y+0.11)*1.10+uCloudV*uTime*0.0065;',      /* אותם עננים בדיוק כמו בשיידר השמיים: הם מסתירים, לא רק מעמעמים */
      '  a*=1.0-smoothstep(uCloudTh-0.10,uCloudTh+0.14,fbm(cp))*smoothstep(0.012,0.15,r.y)*0.97; }',
      ' a*=1.0-uMoonUp*smoothstep(0.99975,0.99992,dot(r,uMoonDir));',              /* לא מציירים כוכב על דיסקת הירח */
      ' float ph=fract(aD.x*91.7+aD.y*57.3)*6.2832, tw=1.0+uTw*(0.10+0.55*pow(1.0-up,4.0))*sin(uTime*(3.0+fract(aD.z*33.1)*5.0)+ph);',
      ' float b=clamp((2.2-aM)/3.4,0.0,1.0);',                                     /* הבהירים גם גדולים יותר, לא רק בהירים יותר */
      ' gl_PointSize=uPx*(2.1+3.4*b*b+0.9*clamp((4.5-aM)/4.0,0.0,1.0));',
      ' vA=a*tw*(0.50+0.50*clamp((4.6-m)/3.6,0.0,1.0));',
      ' float k=clamp((aK-2600.0)/4200.0,0.0,1.0), hot=clamp((aK-7000.0)/16000.0,0.0,1.0);',
      ' vC=mix(mix(vec3(1.0,0.74,0.52),vec3(1.0,0.97,0.93),k),vec3(0.74,0.84,1.0),hot); }'].join('\n'),
     ['precision highp float; varying float vA; varying vec3 vC;',
      'void main(){ float d=length(gl_PointCoord-0.5); float s=smoothstep(0.5,0.16,d); gl_FragColor=vec4(vC,vA*s); }'].join('\n'));
    starBuf=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,starBuf); gl.bufferData(gl.ARRAY_BUFFER,a,gl.STATIC_DRAW); starN=n;
    planetBuf=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,planetBuf); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(20),gl.DYNAMIC_DRAW);
  }catch(e){ starBuf=null; STARP=null; window.STARS_B64=undefined; return false; }
  return true; }

/* מטריצת הסיבוב ממערכת המשווה השמימי אל העולם של הסצנה (X מזרח, Y למעלה, Z דרום), בסדר עמודות */
function celestialRot(nowMs){
  var d=days(nowMs), lst=(((18.697374558+24.06570982441908*d)%24)*15+BP.lon)*D2R, sL=Math.sin(lst), cL=Math.cos(lst), la=BP.lat*D2R, sp=Math.sin(la), cp=Math.cos(la);
  return [-sL,cp*cL,sp*cL,  cL,cp*sL,sp*sL,  0,sp,-cp]; }

/* כוכבי הלכת: יסודות מסלול ממוצעים ל-J2000 וקצב השינוי שלהם למאה (Standish, JPL), פתרון קפלר, ומעבר לקו המשווה השמימי */
var PLN=[ /* a, e, I, L, peri, node, ואחריהם הקצבים; בהירות אופיינית; טמפרטורת צבע */
  [0.72333566,0.00677672,3.39467605,181.97909950,131.60246718,76.67984255, 0.00000390,-0.00004107,-0.00078890,58517.81538729,0.00268329,-0.27769418, -4.1,5600],
  [1.52371034,0.09339410,1.84969142,-4.55343205,-23.94362959,49.55953891, 0.00001847,0.00007882,-0.00813131,19140.30268499,0.44441088,-0.29257343, 0.7,3600],
  [5.20288700,0.04838624,1.30439695,34.39644051,14.72847983,100.47390909, -0.00011607,-0.00013253,-0.00183714,3034.74612775,0.21252668,0.20469106, -2.2,5400],
  [9.53667594,0.05386179,2.48599187,49.95424423,92.59887831,113.66242448, -0.00125060,-0.00050991,0.00193609,1222.49362201,-0.41897216,-0.28867794, 0.6,5000]];
var EARTH_EL=[1.00000261,0.01671123,-0.00001531,100.46457166,102.93768193,0.0, 0.00000562,-0.00004392,-0.01294668,35999.37244981,0.32327364,0.0];
function helio(E,T){ var a=E[0]+E[6]*T, e=E[1]+E[7]*T, I=(E[2]+E[8]*T)*D2R, L=E[3]+E[9]*T, w=E[4]+E[10]*T, O=(E[5]+E[11]*T);
  var M=(((L-w)%360)+540)%360-180, m=M*D2R, Ea=m+e*Math.sin(m), i; for(i=0;i<6;i++) Ea=Ea-(Ea-e*Math.sin(Ea)-m)/(1-e*Math.cos(Ea));
  var xp=a*(Math.cos(Ea)-e), yp=a*Math.sqrt(1-e*e)*Math.sin(Ea), ww=(w-O)*D2R, Oo=O*D2R;
  var cw=Math.cos(ww), sw=Math.sin(ww), cO=Math.cos(Oo), sO=Math.sin(Oo), cI=Math.cos(I), sI=Math.sin(I);
  return [(cw*cO-sw*sO*cI)*xp+(-sw*cO-cw*sO*cI)*yp, (cw*sO+sw*cO*cI)*xp+(-sw*sO+cw*cO*cI)*yp, (sw*sI)*xp+(cw*sI)*yp]; }
function planetsNow(nowMs){ var T=days(nowMs)/36525, E=helio(EARTH_EL,T), eps=23.4393*D2R, ce=Math.cos(eps), se=Math.sin(eps), out=new Float32Array(20), i;
  for(i=0;i<4;i++){ var P=helio(PLN[i],T), x=P[0]-E[0], y=P[1]-E[1], z=P[2]-E[2], l=Math.sqrt(x*x+y*y+z*z)||1;
    out[i*5]=x/l; out[i*5+1]=(y*ce-z*se)/l; out[i*5+2]=(y*se+z*ce)/l; out[i*5+3]=PLN[i][12]; out[i*5+4]=PLN[i][13]; }
  return out; }
EXO.astro2={planetsNow:planetsNow,celestialRot:celestialRot};      /* לבדיקות */

var _plT=0;
function drawStars(VP,eye,nowMs,t,nightF,moonUp,illum,moonDir,cl,cwx,cwz,dprNow){
  if(nightF<0.04||!starsInit()) return;
  var lite=(EXO.quality==='lite'), n=lite?Math.floor(starN/2):starN;
  /* בהירות גבולית: 6.2 בלילה חשוך; הדמדומים והירח מעלים את בהירות הרקע ומוחקים את החלשים */
  var lim=6.2-5.2*(1-nightF)-2.7*moonUp*illum;
  var was=gl.isEnabled(gl.BLEND); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE); gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
  gl.useProgram(STARP);
  gl.uniformMatrix4fv(STARP.u('uVP'),false,new Float32Array(VP)); gl.uniformMatrix3fv(STARP.u('uRot'),false,new Float32Array(celestialRot(nowMs)));
  gl.uniform3fv(STARP.u('uEye'),eye); gl.uniform3fv(STARP.u('uMoonDir'),moonDir); gl.uniform1f(STARP.u('uMoonUp'),moonUp);
  gl.uniform1f(STARP.u('uR'),STAR_R); gl.uniform1f(STARP.u('uLim'),lim); gl.uniform1f(STARP.u('uTime'),t); gl.uniform1f(STARP.u('uPx'),Math.max(1,dprNow));
  gl.uniform1f(STARP.u('uCloudOn'),cl>0.02?1:0); gl.uniform1f(STARP.u('uCloudTh'),0.485+0.118*probit(1-cl)); gl.uniform2f(STARP.u('uCloudV'),cwx,cwz);
  var aD=STARP.a('aD'), aM=STARP.a('aM'), aK=STARP.a('aK');
  gl.enableVertexAttribArray(aD); gl.enableVertexAttribArray(aM); gl.enableVertexAttribArray(aK);
  function bind(){ gl.vertexAttribPointer(aD,3,gl.FLOAT,false,20,0); gl.vertexAttribPointer(aM,1,gl.FLOAT,false,20,12); gl.vertexAttribPointer(aK,1,gl.FLOAT,false,20,16); }
  gl.bindBuffer(gl.ARRAY_BUFFER,starBuf); bind(); gl.uniform1f(STARP.u('uTw'),reduce?0:1); gl.drawArrays(gl.POINTS,0,n);
  gl.bindBuffer(gl.ARRAY_BUFFER,planetBuf); if(nowMs-_plT>60000||nowMs<_plT){ _plT=nowMs; gl.bufferSubData(gl.ARRAY_BUFFER,0,planetsNow(nowMs)); }
  bind(); gl.uniform1f(STARP.u('uTw'),0); gl.drawArrays(gl.POINTS,0,4);
  gl.disableVertexAttribArray(aD); gl.disableVertexAttribArray(aM); gl.disableVertexAttribArray(aK);
  gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA); if(!was) gl.disable(gl.BLEND); }

/* ======================= מנה ג׳, סעיף 8: הגל והזרם =======================
   נכתב כך שיעבור אחר כך ל-ShaderMaterial בלי שכתוב: כל הגאומטריה נבנית כאן ב-CPU לתוך אותו מאגר (fv),
   והשיידר רק צובע לפי אינדקס צבע. אין כאן שום נתון מומצא: כיוון, אורך, מהירות פאזה וגובה הגל באים מ-applyConditions,
   וכיוון ומהירות הזרם מ-c.curDir ו-c.cur. */
function h1(n){ var s=Math.sin(n*127.1+311.7)*43758.5453; return s-Math.floor(s); }
function vn1(x){ var i=Math.floor(x), f=x-i; f=f*f*(3-2*f); return h1(i)*(1-f)+h1(i+1)*f; }
function sst(a,b,x){ var q=Math.max(0,Math.min(1,(x-a)/(b-a))); return q*q*(3-2*q); }

/* ---------- גל: קווי פסגה ארוכים שיושבים על השיא של אותה פונקציה שמזיזה את המים ----------
   לכל פסגה של רכבת הסוול הראשית יש מספר שלם n (k·s − ω·t = π/2 + 2πn), ולכן הזהות שלה יציבה לאורך כל חייה:
   האורך, ההיסט הצדי וההפסקות נגזרים מ-n. כל נקודה על הקו מוזזת לאורך כיוון ההתקדמות אל השיא של סכום שלושת רכיבי
   הסוול (שני צעדי ניוטון), כך שהקו והגבנון הם אותו דבר, והעיקול הקל שלו הוא העיקול האמיתי של הפסגה. */
var CREST_MAX=4, PHIT=[], hitAcc=0, foamHold=0, NHIT=LOWP?16:30;
(function(){ for(var i=0;i<NHIT;i++) PHIT.push({x:0,y:-999,z:0,vx:0,vy:0,vz:0,l:0,L:1}); })();
function crestH(x,z,t,d0,s){ var i,y=0, px=x+d0[0]*s, pz=z+d0[1]*s;
  for(i=0;i<3;i++){ var k=6.2831853/Math.max(wLen[i],0.5);
    y+=wAmp[i]*Math.sin(k*(wDir[i][0]*px+wDir[i][1]*pz)-wSpd[i]*k*t); }
  return y; }
/* התיקון אל השיא: סריקה חסומה במקום ניוטון. ניוטון קפץ לפעמים עשרה מטרים בנקודה אחת ויצר משולש ענק על המים;
   כאן ההיסט לעולם לא עובר את ±8% מאורך הגל, והוא רציף לאורך הקו. */
function crestShift(x,z,t,d0){
  var W=Math.max(wLen[0],9)*0.08, N=8, i, best=-1e9, bs=0, y;
  for(i=0;i<=N;i++){ var s=-W+2*W*i/N; y=crestH(x,z,t,d0,s); if(y>best){ best=y; bs=s; } }
  var h=2*W/N, y0=crestH(x,z,t,d0,bs-h), y2=crestH(x,z,t,d0,bs+h), den=y0-2*best+y2;   /* עידון פרבולי בין שלוש הדגימות */
  if(den<-1e-9){ var dd=0.5*(y0-y2)/den*h; bs+=Math.max(-h,Math.min(h,dd)); }
  return Math.max(-W,Math.min(W,bs)); }
function hullHalfBeam(a){ var q=1-(a/(LOA*0.485))*(a/(LOA*0.485)); return q<=0?0:BEAM*0.45*Math.pow(q,0.6); }
function crestLines(c,t,dt,eye){
  var d0=wDir[0], L=Math.max(wLen[0],9), cph=wSpd[0], k0=6.2831853/L, nx=-d0[1], nz=d0[0];
  var hr=BP.cog*D2R, bfx=Math.sin(hr), bfz=-Math.cos(hr);
  var lite=(EXO.quality==='lite'), Rv=Math.min(78,Math.max(30,2.1*L));
  var nMid=Math.round((-cph*t*k0-Math.PI/2)/6.2831853), cand=[], j;
  for(j=-4;j<=4;j++){ var n=nMid+j, s=(Math.PI/2+6.2831853*n)/k0+cph*t; if(Math.abs(s)<Rv) cand.push([Math.abs(s),n,s]); }
  cand.sort(function(a,b){ return a[0]-b[0]; }); if(cand.length>CREST_MAX) cand.length=CREST_MAX;
  /* חצי ההיטל של הגוף על כיוון הקו: רוחב הקטיעה והפער שבצד המוגן */
  var fn=bfx*nx+bfz*nz, sn=-bfz*nx+bfx*nz, hp=Math.sqrt(LOA*LOA*0.235*fn*fn+BEAM*BEAM*0.2*sn*sn)+0.5, DG=2.6*LOA;
  var hs=Math.max(0.3,Math.min(1,c.waveH/2.2)), burst=0;
  for(j=0;j<cand.length;j++){ var n2=cand[j][1], sN=cand[j][2];
    var len=(30+50*h1(n2*3.1))*Math.min(1,Math.max(0.5,L/40)), uc=(h1(n2*5.7)-0.5)*Math.min(50,len*0.9), half=len/2;
    var env=sst(0,0.30,1-Math.abs(sN)/Rv)*(0.72+0.28*h1(n2*9.3));
    var du=lite?4.2:2.6, S=Math.max(6,Math.min(lite?20:32,Math.round(len/du))), k, prev=null;
    /* הפער השקט שמאחורי הסירה: נסגר בהדרגה לאורך שניים-שלושה אורכי סירה */
    var gapW=(sN>0&&sN<DG)?hp*Math.pow(1-sN/DG,0.8):0;
    var SH=[], SH2=[]; for(k=0;k<=S;k++){ var u0=uc-half+len*k/S; SH.push(crestShift(d0[0]*sN+nx*u0,d0[1]*sN+nz*u0,t,d0)); }
    for(var ps=0;ps<3;ps++){ for(k=0;k<=S;k++) SH2[k]=(SH[Math.max(0,k-1)]+2*SH[k]+SH[Math.min(S,k+1)])/4; var tmpS=SH; SH=SH2; SH2=tmpS; }   /* הפסגה רציפה: מחליקים את התיקון לאורך הקו */
    for(k=0;k<=S;k++){ var f=k/S, u=uc-half+len*f;
      var x=d0[0]*sN+nx*u, z=d0[1]*sN+nz*u, sh=SH[k]; x+=d0[0]*sh; z+=d0[1]*sh;
      var a=env*sst(0,0.22,f)*sst(0,0.22,1-f)*sst(0.30,0.52,vn1(u*0.085+n2*13.7+t*0.02))*0.78;
      var a0=a;                                                      /* לפני הקטיעה: כך יודעים אם יש בכלל פסגה שפוגעת בגוף */
      if(gapW>0.05) a*=sst(gapW*0.75,gapW+1.6,Math.abs(u));
      var la=x*bfx+z*bfz, lb=-x*bfz+z*bfx, hb2=hullHalfBeam(la)+0.35, hc=(Math.abs(la)<LOA*0.5+0.3)?sst(hb2,hb2+0.9,Math.abs(lb)):1;
      a*=hc*sst(4,15,Math.sqrt((eye[0]-x)*(eye[0]-x)+eye[1]*eye[1]+(eye[2]-z)*(eye[2]-z)));      /* קו שעובר ממש מתחת לעין נמוג, אחרת הוא נראה כמו משטח */
      if(Math.abs(u)<du*0.6){ var e=Math.exp(-((sN+sh)/2.4)*((sN+sh)/2.4))*Math.min(1,a0/0.5); if(e>burst) burst=e; }
      var cur=[x,z,a];
      if(prev&&(prev[2]>0.004||a>0.004)){
        var wl=0.22, wt=0.95+0.50*hs;                                  /* קצה מוביל חד ובהיר, זנב שנמוג אחורה */
        var q1x=prev[0]+d0[0]*wl, q1z=prev[1]+d0[1]*wl, q2x=prev[0]-d0[0]*wt, q2z=prev[1]-d0[1]*wt;
        var q3x=x+d0[0]*wl, q3z=z+d0[1]*wl, q4x=x-d0[0]*wt, q4z=z-d0[1]*wt;
        var y1=waveY(q1x,q1z,t)+0.09, y2=waveY(q2x,q2z,t)+0.09, y3=waveY(q3x,q3z,t)+0.09, y4=waveY(q4x,q4z,t)+0.09;
        fv(q1x,y1,q1z,prev[2],4); fv(q2x,y2,q2z,0,4); fv(q3x,y3,q3z,a,4);
        fv(q2x,y2,q2z,0,4); fv(q4x,y4,q4z,0,4); fv(q3x,y3,q3z,a,4); }
      prev=cur; } }
  /* ---------- הפגיעה בסירה: פס קצף קצר לאורך הגוף בצד שממנו הגל בא, ברגע שהשיא עובר מתחתיו, והתזה ----------
     burst הוא 1 בדיוק כשקו הפסגה (אחרי התיקון אל השיא) עובר במרכז הסירה, כלומר באותו רגע שבו הסירה בשיא העלייה שלה. */
  burst=Math.min(1,burst)*hs; LAB._burst=burst;
  foamHold=Math.max(burst,foamHold-dt/1.5);                       /* הקצף נשאר על המים עוד שנייה וחצי אחרי שהשיא עבר, ונמוג */
  function hitW(la,sd){ var g=(hullHalfBeam(la+0.12)-hullHalfBeam(la-0.12))/0.24, na=-g, nb=sd, nl=Math.sqrt(na*na+nb*nb)||1;   /* כמה הנקודה הזאת על קו המים פונה אל הגל */
    na/=nl; nb/=nl; return sst(0.10,0.70,-((bfx*na-bfz*nb)*d0[0]+(bfz*na+bfx*nb)*d0[1])); }
  if(foamHold>0.03){ var NF=20, i2, sd, bK=Math.min(1,foamHold*1.7);
    for(sd=-1;sd<=1;sd+=2){ var pa=null;
      for(i2=0;i2<=NF;i2++){ var la2=(i2/NF-0.5)*LOA*0.968, hb3=hullHalfBeam(la2), wgt=hitW(la2,sd);
        var jit=0.25+0.75*vn1(la2*1.9+t*2.3+sd*9.0), brk=vn1(la2*4.3-t*1.1+sd*3.0), wOut=(0.22+1.15*bK*jit)*(0.6+0.4*hs);   /* שוליים לא אחידים: קצף, לא הילה */
        var ix=bfx*la2-bfz*sd*(hb3+0.02), iz=bfz*la2+bfx*sd*(hb3+0.02), ox=bfx*la2-bfz*sd*(hb3+wOut), oz=bfz*la2+bfx*sd*(hb3+wOut);
        var pb=[ix,iz,ox,oz,Math.min(1,bK*1.35)*wgt*(0.30+0.70*jit)*sst(0.18,0.55,brk+0.35*bK)];
        if(pa&&(pa[4]>0.01||pb[4]>0.01)){ var yi0=waveY(pa[0],pa[1],t)+0.12, yo0=waveY(pa[2],pa[3],t)+0.10, yi1=waveY(ix,iz,t)+0.12, yo1=waveY(ox,oz,t)+0.10;
          fv(pa[0],yi0,pa[1],pa[4],2); fv(pa[2],yo0,pa[3],0,2); fv(ix,yi1,iz,pb[4],2);
          fv(pa[2],yo0,pa[3],0,2); fv(ox,yo1,oz,0,2); fv(ix,yi1,iz,pb[4],2); }
        pa=pb; } } }
  if(!lite&&!reduce){ var i3,p;
    if(burst>0.22){ hitAcc+=dt*burst*40; }
    for(i3=0;i3<NHIT;i3++){ p=PHIT[i3];
      if(p.l<=0){ if(hitAcc>=1){ hitAcc-=1;
          var la3=0, sd2=1, tr2; for(tr2=0;tr2<5;tr2++){ la3=(Math.random()-0.5)*LOA*0.94; sd2=Math.random()<0.5?-1:1; if(hitW(la3,sd2)>0.4) break; }
          var hb4=hullHalfBeam(la3)+0.05;
          p.x=bfx*la3-bfz*sd2*hb4; p.z=bfz*la3+bfx*sd2*hb4; p.y=waveY(p.x,p.z,t)+0.15;
          p.vx=d0[0]*rnd(0.6,2.2)-bfz*sd2*rnd(0.2,0.9); p.vz=d0[1]*rnd(0.6,2.2)+bfx*sd2*rnd(0.2,0.9); p.vy=rnd(1.6,3.6)*(0.6+0.4*hs);
          p.L=rnd(0.55,1.05); p.l=p.L; } else continue; }
      p.l-=dt; p.x+=p.vx*dt; p.z+=p.vz*dt; p.y+=p.vy*dt; p.vy-=7.2*dt;
      if(p.l<=0||p.y<waveY(p.x,p.z,t)-0.1){ p.l=0; continue; }
      var f2=p.l/p.L, sz2=0.035+(1-f2)*0.10; fquad(p.x,p.y,p.z, p.x,p.y+sz2*1.7,p.z, sz2,0,0, 0.62*f2*f2, 2); } }
}

/* ---------- זרם: סרטים בעובי של מטרים, בשלוש שכבות עומק ----------
   העובי נתון במטרים (0.35 עד 0.6), ולכן יש לו פרספקטיבה. כל סרט בנוי משתי רצועות: הצד העליון בהיר (מואר מלמעלה)
   והתחתון כהה. הגוון נמסר לשיידר בחלק השברי של אינדקס הצבע: 1.0 בהיר ורווי, 1.45 כהה ודהוי.
   הגוף מתפתל, והראש (חץ פתוח ומעוגל, כמו בסמל הכפתור) מצביע תמיד ישר אל c.curDir.
   אותה מהירות בכל העומקים: אין נתון על גזירה בעומק ולא ממציאים. */
var CUR_DEPTH=[1.0,4.0,9.0];
function curStroke(ax,ay,az,bx,by,bz,eye,w,a,sh){                 /* קטע עבה שפונה אל המצלמה, עם קצה מעוגל ב-b */
  var dx=bx-ax, dy=by-ay, dz=bz-az, ex=eye[0]-ax, ey=eye[1]-ay, ez=eye[2]-az;
  var cx=dy*ez-dz*ey, cy=dz*ex-dx*ez, cz=dx*ey-dy*ex, cl=Math.sqrt(cx*cx+cy*cy+cz*cz); if(cl<1e-6) return;
  cx*=w/cl; cy*=w/cl; cz*=w/cl; if(cy<0){ cx=-cx; cy=-cy; cz=-cz; }                     /* c מצביע תמיד כלפי מעלה */
  var ci0=1+0.45*Math.max(0,sh-0.12), ci1=1+0.45*Math.min(1,sh+0.30);
  fv(ax+cx,ay+cy,az+cz,a,ci0); fv(ax,ay,az,a,(ci0+ci1)/2); fv(bx,by,bz,a,(ci0+ci1)/2);
  fv(ax+cx,ay+cy,az+cz,a,ci0); fv(bx,by,bz,a,(ci0+ci1)/2); fv(bx+cx,by+cy,bz+cz,a,ci0);
  fv(ax-cx,ay-cy,az-cz,a,ci1); fv(bx,by,bz,a,(ci0+ci1)/2); fv(ax,ay,az,a,(ci0+ci1)/2);
  fv(ax-cx,ay-cy,az-cz,a,ci1); fv(bx-cx,by-cy,bz-cz,a,ci1); fv(bx,by,bz,a,(ci0+ci1)/2);
  var dl=Math.sqrt(dx*dx+dy*dy+dz*dz)||1, ux=dx/dl*w, uy=dy/dl*w, uz=dz/dl*w, m, NS2=5, e2;   /* חצי עיגול בכל קצה */
  for(e2=0;e2<2;e2++){ var ox=e2?ax:bx, oy=e2?ay:by, oz=e2?az:bz, sg=e2?-1:1, px2=cx, py2=cy, pz2=cz;
    for(m=1;m<=NS2;m++){ var th=Math.PI*m/NS2, co=Math.cos(th), si=Math.sin(th)*sg, qx=cx*co+ux*si, qy=cy*co+uy*si, qz=cz*co+uz*si;
      fv(ox,oy,oz,a,(ci0+ci1)/2); fv(ox+px2,oy+py2,oz+pz2,a,py2>=0?ci0:ci1); fv(ox+qx,oy+qy,oz+qz,a,qy>=0?ci0:ci1); px2=qx; py2=qy; pz2=qz; } } }
function curRibbon(tr,eye,w,a,sh){
  var n=tr.n,k, ci0=1+0.45*Math.max(0,sh-0.12), ci1=1+0.45*Math.min(1,sh+0.30), cm=(ci0+ci1)/2;
  var px=0,py=0,pz=0,pa=0,have=false, lx=0,ly=0,lz=0, qx,qy,qz;
  for(k=0;k<n;k++){
    var f=k/(n-1), k0=Math.max(0,k-1), k1=Math.min(n-1,k+1), X=tr.x[k], Y=tr.y[k], Z=tr.z[k];
    var dx=tr.x[k1]-tr.x[k0], dy=tr.y[k1]-tr.y[k0], dz=tr.z[k1]-tr.z[k0], ex=eye[0]-X, ey=eye[1]-Y, ez=eye[2]-Z;
    var cx=dy*ez-dz*ey, cy=dz*ex-dx*ez, cz=dx*ey-dy*ex, cl=Math.sqrt(cx*cx+cy*cy+cz*cz); if(cl<1e-6){ have=false; continue; }
    var wk=w*(0.22+0.78*Math.pow(f,0.6))/cl; cx*=wk; cy*=wk; cz*=wk;
    if(have?(cx*lx+cy*ly+cz*lz<0):(cy<0)){ cx=-cx; cy=-cy; cz=-cz; }            /* הצד הבהיר נשאר באותו צד לאורך כל הסרט */
    var ak=a*Math.pow(f,1.4);
    if(have){
      fv(px+lx,py+ly,pz+lz,pa,ci0); fv(px,py,pz,pa,cm); fv(X,Y,Z,ak,cm);
      fv(px+lx,py+ly,pz+lz,pa,ci0); fv(X,Y,Z,ak,cm); fv(X+cx,Y+cy,Z+cz,ak,ci0);
      fv(px-lx,py-ly,pz-lz,pa,ci1); fv(X,Y,Z,ak,cm); fv(px,py,pz,pa,cm);
      fv(px-lx,py-ly,pz-lz,pa,ci1); fv(X-cx,Y-cy,Z-cz,ak,ci1); fv(X,Y,Z,ak,cm); }
    px=X; py=Y; pz=Z; pa=ak; lx=cx; ly=cy; lz=cz; have=true; } }
function buildCurrent(c,t,dt,eye){
  if(!EXO.layers.cur) return;
  if(LAB.cur!=='ribbon'){ buildCurrentOld(c,t,dt,eye); return; }
  var i,p,a, cr=c.curDir*D2R, cspd=Math.max(0.03,c.cur*0.5144), lite=(EXO.quality==='lite'), under=!!LAB._under;
  /* עוצמת הזרם. עד כאן סרט של זרם 0.1 קשר צויר כמעט באותה אטימות ובאותו עובי כמו זרם של 2 קשר,
     ולכן ים כמעט חסר זרם נראה כמו קרשים טורקיזיים צפים. עכשיו גם האטימות וגם העובי נגזרים מהמהירות.
     LAB.curGain ו-LAB.curThin הם ידיות לבדיקות; 1 הוא ברירת המחדל. */
  var str=sst(0.08,1.0,c.cur), gain=(LAB.curGain==null?1:LAB.curGain), thin=(LAB.curThin==null?1:LAB.curThin);
  var n=Math.round(NCUR*(lite?0.5:1));
  /* מהירות הזחילה מוגזמת פי כמה כדי שתיראה; היחס בין זרם חלש לחזק נשמר */
  var crawl=cspd;
  var fxd=Math.sin(cr), fzd=-Math.cos(cr), cnx=Math.cos(cr), cnz=Math.sin(cr);
  for(i=0;i<n;i++){ p=PC[i];
    var ly=lite?0:(i%3), dep=CUR_DEPTH[ly]*(0.85+0.3*h1(i*7.3));
    if(!under&&ly>0){ continue; }                                   /* מעל המים: רק השכבה העליונה, דרך פני המים */
    p.age+=dt;
    var rr2=Math.sqrt(p.px*p.px+p.pz*p.pz);
    if(p.age>p.life||rr2>p.R){ seedC(p); rr2=Math.sqrt(p.px*p.px+p.pz*p.pz); }
    p.px+=fxd*crawl*dt; p.pz+=fzd*crawl*dt;
    var x=p.px, z=p.pz, k, tr=p.t; tr.n=CSEG+1;
    var wy=Math.exp(-dep/6);                                        /* תנועת הגל דועכת עם העומק */
    for(k=CSEG;k>=0;k--){ var q=1-k/CSEG, straight=sst(0,0.30,q);      /* שלושת המקטעים שליד הראש מתיישרים: הגוף מתפתל, הראש לא */
      var so=0.42*Math.sin(k*0.80-t*(0.9+crawl*1.4)+p.ph)*straight;
      tr.x[k]=x+cnx*so; tr.z[k]=z+cnz*so; tr.y[k]=waveY(x,z,t)*0.55*wy-dep+0.10*Math.sin(k*0.55+p.ph*2.0)*straight;
      x-=fxd*0.95; z-=fzd*0.95; }
    var fade2=Math.min(1,p.age/2.0)*Math.min(1,(p.life-p.age)/2.6), edg2=Math.min(1,2.4*(1-rr2/p.R));
    var dcam=Math.hypot(eye[0]-p.px,eye[2]-p.pz);
    var base=(under?[0.60,0.50,0.40][ly]:0.34)*(0.46+0.54*str)*gain;
    var d3=Math.sqrt(dcam*dcam+(eye[1]-(-dep))*(eye[1]-(-dep)));
    a=base*fade2*edg2*Math.max(0,Math.min(1,1.25-dcam/(under?52:64)))*sst(2.5,7.0,d3); if(a<0.012) continue;      /* סרט שעובר ממש מול העין נמוג */
    var hw=(0.125+0.090*h1(i*3.9))*(1+0.10*ly)*(0.78+0.22*str)*thin, sh=[0.0,0.42,0.80][ly];   /* חצי עובי: כ-0.18 עד 0.30 מ' עובי מלא */
    curRibbon(tr,eye,hw,a,sh);
    /* הראש קטן ודק מהגוף. קודם הוא היה עבה ממנו, ושתי הזרועות נפגשו באותו פיקסל — ובמיזוג מצטבר
       הן הכפילו את עצמן והראש יצא כתם מלא במקום חץ. */
    var hx=tr.x[CSEG], hy=tr.y[CSEG], hz=tr.z[CSEG], HL=(0.70+0.95*str)+hw*2.2, HWd=(0.50+0.55*str)+hw*1.6, tx=hx+fxd*0.55, tz=hz+fzd*0.55;
    /* הראש: חץ פתוח. הזרועות במישור האופקי כשמסתכלים מלמעלה, ובמישור האנכי כשמסתכלים מהצד, כך שהוא נקרא מכל זווית */
    var vy=Math.abs(eye[1]-hy), vh=Math.hypot(eye[0]-hx,eye[2]-hz), kv=sst(0.35,1.1,vy/Math.max(0.5,vh));
    var ox=cnx*HWd*kv, oz=cnz*HWd*kv, oy=HWd*(1-kv);
    curStroke(hx,hy,hz,tx,hy,tz,eye,hw*0.85,a*0.9,sh);
    curStroke(tx-fxd*HL+ox,hy+oy,tz-fzd*HL+oz,tx,hy,tz,eye,hw*0.62,a*0.72,sh);
    curStroke(tx-fxd*HL-ox,hy-oy,tz-fzd*HL-oz,tx,hy,tz,eye,hw*0.62,a*0.72,sh); }
}

/* ======================= מנה ד׳, סעיף 9ד׳: תורן, חיבל, מפרשים ודגל =======================
   המידות מאומתות: הבאבא 35 (Ta Shing, תכנון Perry) — I 14.60 מ׳, J 5.36 מ׳, P 13.26 מ׳, E 4.72 מ׳,
   ושטח מפרשים מדווח 70.42 מ״ר, שהוא בדיוק P·E/2 + I·J/2. זה תואם את השלט שעל הרציף (70.48).
   מה שהיה כאן קודם: מוביל ראשי 9.9 מ׳ ושטח כולל של כ-53 מ״ר, נמוך מדי בכל המקורות.
   הערה לבדיקה מול תמונת צד: בסיס המשולש הקדמי במנוע הוא 6.45 מ׳ (תורן ב-x=0.35, נקודת החלוץ ב-6.80)
   מול J=5.36 שבמפרט. או שהתורן צריך לזוז קדימה או שהחרטומית ארוכה מדי; לא נוגעים עד שתהיה תמונה. */
function wireMesh(segs,r){                       /* חיבל: מוטות משולשים דקים, זולים ונקראים היטב מול שמיים */
  var p=[],idx=[],i,k;
  for(i=0;i<segs.length;i++){
    var a=segs[i][0], b=segs[i][1], rr=segs[i][2]||r;
    var dx=b[0]-a[0], dy=b[1]-a[1], dz=b[2]-a[2], L=Math.sqrt(dx*dx+dy*dy+dz*dz); if(L<1e-4) continue;
    dx/=L; dy/=L; dz/=L;
    var ux=-dy, uy=dx, uz=0, ul=Math.sqrt(ux*ux+uy*uy+uz*uz);
    if(ul<1e-4){ ux=1; uy=0; uz=0; ul=1; }
    ux/=ul; uy/=ul; uz/=ul;
    var vx=dy*uz-dz*uy, vy=dz*ux-dx*uz, vz=dx*uy-dy*ux;
    var b0=p.length/3;
    for(k=0;k<3;k++){ var an=k/3*6.2831853, cx=Math.cos(an)*rr, cy=Math.sin(an)*rr;
      p.push(a[0]+ux*cx+vx*cy, a[1]+uy*cx+vy*cy, a[2]+uz*cx+vz*cy);
      p.push(b[0]+ux*cx+vx*cy, b[1]+uy*cx+vy*cy, b[2]+uz*cx+vz*cy); }
    for(k=0;k<3;k++){ var q=b0+k*2, s=b0+((k+1)%3)*2; idx.push(q,q+1,s, q+1,s+1,s); }
  }
  return mesh(p,idx); }

/* J=5.36 מ׳ מהמפרט, והמדידה מתמונות 12 ו-13 מאשרת: החרטומית בולטת 0.3 עד 0.7 מ׳ מעבר לחרטום, לא 1.5.
   לכן התורן נשאר ב-x=0.35 ונקודת הקשירה יורדת מ-6.80 ל-5.71 (0.40 מ׳ מעבר לחרטום שב-5.31). */
var MAST_X=0.35, MAST_TOP=FREE+14.60, HOUNDS=FREE+11.10, SPR_TIP=6.05, TACK_X=5.71, STAY_X=3.10;
var SPR_Y=FREE+0.42, STERN_X=-5.20;
/* מספר המשטחים וצורת האחורן לא נראים בתמונות שהיו: נבחר משטח אחד בכל צד, כמקובל בבאבא 35, ואחורן יחיד. לבדיקה. */
var SPREAD_Y=FREE+7.60, SPREAD_Z=1.52;
var M_RIG=wireMesh([
  [[MAST_X,MAST_TOP,0],[TACK_X,FREE+0.52,0],0.016],                                  /* חלוץ */
  [[MAST_X,HOUNDS,0],[STAY_X,FREE+0.18,0],0.014],                                    /* חלוץ פנימי */
  [[MAST_X,MAST_TOP,0],[STERN_X,FREE+0.30,0],0.015],                                 /* אחורן */
  [[MAST_X,MAST_TOP,0],[MAST_X,SPREAD_Y,SPREAD_Z],0.013],
  [[MAST_X,MAST_TOP,0],[MAST_X,SPREAD_Y,-SPREAD_Z],0.013],
  [[MAST_X,SPREAD_Y,SPREAD_Z],[MAST_X,FREE+0.16,1.42],0.013],                   /* וונטה עליונה, מעל המשטח */
  [[MAST_X,SPREAD_Y,-SPREAD_Z],[MAST_X,FREE+0.16,-1.42],0.013],
  [[MAST_X,SPREAD_Y-0.25,0.10],[MAST_X+0.85,FREE+0.16,1.34],0.012],                  /* וונטות תחתונות, קדמית ואחורית */
  [[MAST_X,SPREAD_Y-0.25,-0.10],[MAST_X+0.85,FREE+0.16,-1.34],0.012],
  [[MAST_X,SPREAD_Y-0.25,0.10],[MAST_X-0.85,FREE+0.16,1.34],0.012],
  [[MAST_X,SPREAD_Y-0.25,-0.10],[MAST_X-0.85,FREE+0.16,-1.34],0.012],
  [[SPR_TIP,SPR_Y,0],[5.22,0.08,0],0.014],                                           /* מיתר החרטומית */
  [[SPR_TIP,SPR_Y,0],[5.00,FREE+0.10,1.02],0.011],                                   /* מיתרי צד לחרטומית */
  [[SPR_TIP,SPR_Y,0],[5.00,FREE+0.10,-1.02],0.011]
],0.014);
var M_SPREAD=wireMesh([[[MAST_X,SPREAD_Y,0.06],[MAST_X,SPREAD_Y+0.16,SPREAD_Z]],
                       [[MAST_X,SPREAD_Y,-0.06],[MAST_X,SPREAD_Y+0.16,-SPREAD_Z]]],0.035);
/* המפרש שהורד, קשור כגליל לבן על החרטומית (כך בתמונת הלילה) */
var M_FURL=cylMesh(0.115,0.085,1.50,0,0,0);

/* ---------- המפרש הראשי: לוח כתום בראש, "7" שחור, טלאי המרוץ, ושורות נקודות צמצום ----------
   מחליף את numberTexture ("07" כחול ו-ISR), שלא תואם את התמונות. v=1 (ראש המפרש) הוא ראש הקנבס. */
function mainTexture(){
  /* המפרש נמתח על משולש של 4.72 מ׳ תחתית ו-13.26 מ׳ מוביל, ולכן ריבוע בקנבס יוצא מלבן גבוה פי שלושה על המפרש.
     כל צורה כאן נמדדת במטרים ומומרת לקואורדינטות קנבס לפי המיתר באותו גובה. */
  var s=1024, cv=document.createElement('canvas'); cv.width=cv.height=s;
  var x=cv.getContext('2d'), k, FOOT=4.72, LUFF=13.26;
  function chordAt(v){ return FOOT*(1-v)*(1+0.24*Math.sin(Math.PI*v)); }
  function box(mW,mH,cxU,cV){                                      /* מלבן במטרים, ממורכז ב-(u,v) */
    var w=mW/Math.max(0.6,chordAt(cV)), h=mH/LUFF;
    return [ (cxU-w/2)*s, (1-cV-h/2)*s, w*s, h*s ]; }
  x.fillStyle='#f4f1e8'; x.fillRect(0,0,s,s);                      /* דקרון לבן־שמנת */
  x.strokeStyle='rgba(40,46,58,0.10)'; x.lineWidth=Math.max(1,s*0.0026);
  for(k=1;k<14;k++){ x.beginPath(); x.moveTo(0,s*k/14); x.lineTo(s,s*k/14); x.stroke(); }   /* תפרי לוחות אופקיים, כל מטר בערך */
  x.fillStyle='#e8681c'; x.fillRect(0,0,s,s*0.150);                /* לוח כתום ב-15% העליונים */
  x.fillStyle='rgba(255,255,255,0.14)'; x.fillRect(0,s*0.126,s,s*0.024);
  var b=box(1.45,1.75,0.52,0.800);                                 /* "7" שחור מיד מתחת ללוח הכתום */
  x.save(); x.fillStyle='#14181d';
  x.font='700 100px Georgia, "Times New Roman", serif';
  x.textAlign='center'; x.textBaseline='middle';
  var m=x.measureText('7'), gw=m.width||55;
  x.translate(b[0]+b[2]/2, b[1]+b[3]/2); x.scale(b[2]/gw, b[3]/72); x.fillText('7',0,0); x.restore();
  b=box(1.28,1.28,0.42,0.545);                                     /* טלאי המרוץ: ריבוע שחור עם מסגרת לבנה וטבעת זהובה, לא קריא */
  x.fillStyle='#e9e7e0'; x.fillRect(b[0],b[1],b[2],b[3]);
  x.fillStyle='#1b1f24'; x.fillRect(b[0]+b[2]*0.07,b[1]+b[3]*0.07,b[2]*0.86,b[3]*0.86);
  x.save(); x.translate(b[0]+b[2]/2,b[1]+b[3]/2); x.scale(b[2],b[3]);
  x.strokeStyle='#c9a648'; x.lineWidth=0.13; x.beginPath(); x.arc(0,0.02,0.24,0,6.283); x.stroke(); x.restore();
  x.fillStyle='rgba(40,46,58,0.32)';                               /* שתי שורות נקודות צמצום */
  for(var r=0;r<2;r++){ var vv=0.100+r*0.095;
    for(k=1;k<9;k++){ var d=box(0.07,0.07,k/9,vv); x.fillRect(d[0],d[1],Math.max(1,d[2]),Math.max(1,d[3])); } }
  return texFromCanvas(cv);
}
/* הדגל: כ-45×30 ס״מ, על האחורן בערך בשליש גובהו, מתנופף עם הרוח המדומה */
function ensignMesh(){
  var NU=7,NV=4,p=[],idx=[],uv=[],i,j, W=0.52, H=0.40;
  for(i=0;i<=NU;i++) for(j=0;j<=NV;j++){ var u=i/NU, v=j/NV;
    p.push(-u*W, (v-0.5)*H, Math.sin(u*5.4)*0.055*u); uv.push(u,v); }
  for(i=0;i<NU;i++) for(j=0;j<NV;j++){ var q=i*(NV+1)+j, r2=q+NV+1; idx.push(q,r2,q+1,q+1,r2,r2+1); }
  return mesh(p,idx,uv); }
var M_ENSIGN=ensignMesh();

/* ======================= מנה ד׳, סעיפים 9ג׳ ו-9ב׳: הסיפון, הקוקפיט והגוף =======================
   הכול בקוד, בלי קובצי מודל, כך שזה יעבור אחר כך ל-three.js כ-BufferGeometry. הפרטים הקטנים מצוירים
   רק כשהמצלמה קרובה (ראו LOD ב-frame), ובמצב קל בכלל לא.
   מקור המידות: ההזמנה מ-20.9, שנכתבה מול צילומי הגלריה. מה שלא נראה בתמונות מסומן כהנחה. */
function G(){ return {p:[],i:[]}; }
function gPush(g,pts,faces){ var b=g.p.length/3,k;
  for(k=0;k<pts.length;k++) g.p.push(pts[k][0],pts[k][1],pts[k][2]);
  for(k=0;k<faces.length;k++) g.i.push(b+faces[k][0],b+faces[k][1],b+faces[k][2]); }
function gBox(g,sx,sy,sz,ox,oy,oz){
  var x=sx/2,y=sy/2,z=sz/2;
  var v=[[-x,-y,-z],[x,-y,-z],[x,y,-z],[-x,y,-z],[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]].map(function(q){return [q[0]+ox,q[1]+oy,q[2]+oz];});
  gPush(g,v,[[0,1,2],[0,2,3],[5,4,7],[5,7,6],[4,0,3],[4,3,7],[1,5,6],[1,6,2],[3,2,6],[3,6,7],[4,5,1],[4,1,0]]); }
function gTube(g,a,b,r,N){ N=N||4;
  var dx=b[0]-a[0], dy=b[1]-a[1], dz=b[2]-a[2], L=Math.sqrt(dx*dx+dy*dy+dz*dz); if(L<1e-5) return;
  dx/=L; dy/=L; dz/=L;
  var ux=-dy, uy=dx, uz=0, ul=Math.sqrt(ux*ux+uy*uy); if(ul<1e-5){ ux=1; uy=0; ul=1; }
  ux/=ul; uy/=ul;
  var vx=dy*uz-dz*uy, vy=dz*ux-dx*uz, vz=dx*uy-dy*ux, k, pts=[], faces=[];
  for(k=0;k<N;k++){ var an=k/N*6.2831853, cc=Math.cos(an)*r, ss=Math.sin(an)*r;
    pts.push([a[0]+ux*cc+vx*ss, a[1]+uy*cc+vy*ss, a[2]+uz*cc+vz*ss]);
    pts.push([b[0]+ux*cc+vx*ss, b[1]+uy*cc+vy*ss, b[2]+uz*cc+vz*ss]); }
  for(k=0;k<N;k++){ var q=k*2, s2=((k+1)%N)*2; faces.push([q,q+1,s2],[q+1,s2+1,s2]); }
  gPush(g,pts,faces); }
function gArc(g,cx,cy,cz,r,a0,a1,N,tr,plane){       /* קשת עגולה מצינור, במישור xy או xz */
  var k,pv=null;
  for(k=0;k<=N;k++){ var a=a0+(a1-a0)*k/N, c=Math.cos(a), s=Math.sin(a);
    var pnt=plane==='xz'?[cx+c*r,cy,cz+s*r]:[cx+c*r,cy+s*r,cz];
    if(pv) gTube(g,pv,pnt,tr); pv=pnt; } }
function gMesh(g){ return mesh(g.p,g.i); }

function dY(x){ return sheer(x/LOA+0.5)-0.03; }                       /* גובה הסיפון ב-x */
function dW(x){ return hb(x/LOA+0.5)*0.985; }                         /* חצי רוחב הסיפון ב-x */
function trunkW(x){ var st=[[-2.05,0.94],[-1.0,0.98],[0.4,0.96],[1.5,0.87],[2.35,0.67],[2.75,0.43]],i;
  if(x<=st[0][0]) return st[0][1]; if(x>=st[st.length-1][0]) return st[st.length-1][1];
  for(i=0;i<st.length-1;i++) if(x<=st[i+1][0]){ var f=(x-st[i][0])/(st[i+1][0]-st[i][0]); return st[i][1]+(st[i+1][1]-st[i][1])*f; }
  return 0.43; }
function trunkTop(x){ return sheer(x/LOA+0.5)-0.02+0.58; }

/* ---------- נירוסטה: מעקים, עמודים, מאחזי יד, מסגרת התורן, אוורורים, כננות ---------- */
var STAN_X=[4.05,2.75,1.45,0.10,-1.25,-2.60,-3.85];
var gS=G();
(function(){ var i,k;
  for(i=0;i<STAN_X.length;i++){ var x=STAN_X[i], z=dW(x)-0.05, y=dY(x);
    for(k=-1;k<=1;k+=2) gTube(gS,[x,y,k*z],[x,y+0.62,k*z],0.022,4); }
  for(k=-1;k<=1;k+=2){                                                /* מעקה חבלים כפול, עם שער בין העמוד השלישי לרביעי */
    for(i=0;i<STAN_X.length-1;i++){ var xa=STAN_X[i], xb=STAN_X[i+1];
      gTube(gS,[xa,dY(xa)+0.62,k*(dW(xa)-0.05)],[xb,dY(xb)+0.62,k*(dW(xb)-0.05)],0.012,3);
      if(i!==3) gTube(gS,[xa,dY(xa)+0.31,k*(dW(xa)-0.05)],[xb,dY(xb)+0.31,k*(dW(xb)-0.05)],0.012,3); }
    gArc(gS,4.62,dY(4.62)+0.60,0,0.68,k>0?0:-1.62,k>0?1.62:0,6,0.024,'xz');   /* מעקה החרטום, כפול */
    gArc(gS,4.62,dY(4.62)+0.30,0,0.60,k>0?0:-1.62,k>0?1.62:0,6,0.020,'xz');
    gTube(gS,[4.05,dY(4.05)+0.62,k*(dW(4.05)-0.05)],[4.62,dY(4.62)+0.60,k*0.68],0.020,4);
    gArc(gS,-4.62,dY(-4.62)+0.60,0,0.60,k>0?1.52:1.62,k>0?3.14:4.76,6,0.024,'xz');  /* מעקה הירכתיים */
    gTube(gS,[-3.85,dY(-3.85)+0.62,k*(dW(-3.85)-0.05)],[-4.62,dY(-4.62)+0.60,k*0.60],0.020,4);
    gTube(gS,[2.20,trunkTop(2.20)+0.04,k*0.70],[-1.85,trunkTop(-1.85)+0.04,k*0.74],0.020,4);   /* מאחזי יד על גג התא */
    gTube(gS,[0.95,trunkTop(0.95),k*0.46],[0.95,trunkTop(0.95)+0.22,k*0.46],0.055,6); }        /* שני אוורורי נירוסטה ליד התורן */
  gArc(gS,0.35,dY(0.35)+0.52,0,0.62,0,3.1416,7,0.020,'xz');                                    /* מסגרת נירוסטה סביב התורן */
  for(k=-1;k<=1;k+=2) gTube(gS,[0.35+0.62*Math.cos(k>0?0:3.1416),dY(0.35),k*0.0],[0.35,dY(0.35)+0.52,k*0.62],0.018,4);
  for(k=-1;k<=1;k+=2){ gTube(gS,[-3.25,dY(-3.25)+0.30,k*0.86],[-3.25,dY(-3.25)+0.52,k*0.86],0.095,7);   /* כננות */
                       gTube(gS,[-2.45,dY(-2.45)+0.30,k*0.86],[-2.45,dY(-2.45)+0.50,k*0.86],0.082,7); }
  gTube(gS,[-5.05,dY(-5.05),0.34],[-5.05,dY(-5.05)+1.45,0.34],0.018,4);                        /* מוט אנטנות */
  gTube(gS,[-5.05,dY(-5.05),-0.34],[-5.05,dY(-5.05)+0.95,-0.34],0.016,4);
})();
var M_STEEL=gMesh(gS);
/* חבל כתום מלופף על הכננות */
var gR=G(); (function(){ var k;
  for(k=-1;k<=1;k+=2){ gTube(gR,[-3.25,dY(-3.25)+0.355,k*0.86],[-3.25,dY(-3.25)+0.475,k*0.86],0.104,7);
                       gTube(gR,[-2.45,dY(-2.45)+0.345,k*0.86],[-2.45,dY(-2.45)+0.455,k*0.86],0.090,7); } })();
var M_ROPE=gMesh(gR);

/* ---------- שתי רצועות הביטחון הצהובות: הפרט הצבעוני הבולט ביותר מלמעלה ---------- */
var gJ=G(); (function(){ var k,i,N=9;
  for(k=-1;k<=1;k+=2){ var pv=null;
    for(i=0;i<=N;i++){ var x=4.20-(4.20+2.70)*i/N, z=k*(dW(x)-0.30), pnt=[x,dY(x)+0.035,z];
      if(pv) gTube(gJ,pv,pnt,0.028,3); pv=pnt; } } })();
var M_JACK=gMesh(gJ);

/* ---------- עץ: החרטומית, עמוד הקשירה, מסגרת הפתח הקדמי, הטילר ---------- */
var gT=G(); (function(){ var i;
  gBox(gT,1.30,0.06,0.78,4.95,dY(4.95)+0.02,0);                       /* משטח טיק על החרטומית */
  gBox(gT,0.16,0.42,0.16,4.30,dY(4.30)+0.21,0);                       /* עמוד קשירה */
  gBox(gT,0.86,0.05,0.86,2.05,trunkTop(2.05)+0.015,0);                /* מסגרת הפתח הקדמי */
})();
var M_TEAKD=gMesh(gT);
/* הטילר: קשת למינציה מלוכה, מראש ההגה קדימה אל הקוקפיט */
var gTi=G(); (function(){ var i,pv=null,N=8;
  for(i=0;i<=N;i++){ var f=i/N, x=-4.62+1.55*f, y=dY(-4.0)+0.18+0.30*f*f, pnt=[x,y,0];
    if(pv) gTube(gTi,pv,pnt,0.032-0.008*f,5); pv=pnt; } })();
var M_TILLER=gMesh(gTi);

/* ---------- כהה: פאנלים סולאריים, כננת עוגן, מנגנון הגה הרוח ---------- */
var gD=G(); (function(){
  gBox(gD,1.15,0.035,1.15,1.35,trunkTop(1.35)+0.05,0);                /* פאנל גמיש מאחורי הפתח הקדמי */
  gBox(gD,1.45,0.035,1.55,-0.75,trunkTop(-0.75)+0.05,0);              /* הפאנל הגדול, בין התורן לדודג׳ר */
  gBox(gD,0.26,0.19,0.24,4.66,dY(4.66)+0.14,0);                       /* כננת עוגן ידנית */
  gTube(gD,[5.25,dY(5.25)+0.10,0],[5.62,dY(5.25)+0.02,0],0.075,6);    /* גלגלת עוגן */
})();
var M_DARK=gMesh(gD);

/* ---------- אשנבי ברונזה: חמישה בכל צד, עם פטינה ירקרקה ---------- */
function gDisc(g,cx,cy,cz,rx,ry,side){          /* אליפסה שפונה החוצה, במישור xy */
  var N=12,k,pts=[[cx,cy,cz]],faces=[];
  for(k=0;k<=N;k++){ var a=k/N*6.2831853; pts.push([cx+Math.cos(a)*rx, cy+Math.sin(a)*ry, cz]); }
  for(k=1;k<=N;k++) faces.push(side>0?[0,k,k+1]:[0,k+1,k]);
  gPush(g,pts,faces); }
var gB=G(), gGl=G(); (function(){ var i,k, xs=[-1.55,-0.75,0.10,0.95,1.80];
  for(i=0;i<xs.length;i++) for(k=-1;k<=1;k+=2){ var x=xs[i], w=trunkW(x)*0.99, y=trunkTop(x)-0.29;
    gDisc(gB,x,y,k*(w+0.010),0.185,0.105,k);                       /* טבעת ברונזה */
    gDisc(gGl,x,y,k*(w+0.026),0.135,0.070,k); } })();              /* זכוכית כהה */
var M_PORTS=gMesh(gB), M_PORTG=gMesh(gGl);

/* ---------- ירכתיים: גלגל הצלה, שק Lifesling, ומוט הספינקר על סיפון שמאל ---------- */
/* גלגל הצלה: פרסה כמעט סגורה (פתח קטן למטה) עם שלושה פסים לבנים, על מעקה הירכתיים */
var RG_X=-5.02, RG_Y=dY(-5.02)+0.62, RG_R=0.34;
var gRing=G(), gRW=G();
(function(){ var seg=[[0.46,1.48],[1.72,2.74],[2.98,4.24],[4.48,5.82]], i;      /* אדום: ארבעה קטעים */
  for(i=0;i<seg.length;i++) gArc(gRing,RG_X,RG_Y,0,RG_R,seg[i][0],seg[i][1],5,0.062,'xy');
  var wht=[[1.48,1.72],[2.74,2.98],[4.24,4.48]], j;                              /* לבן: הפסים שביניהם */
  for(j=0;j<wht.length;j++) gArc(gRW,RG_X,RG_Y,0,RG_R,wht[j][0],wht[j][1],3,0.062,'xy');
  gTube(gRing,[RG_X,RG_Y+RG_R+0.02,0],[RG_X,dY(-5.02)+1.04,0],0.018,4); })();    /* הקשירה אל המעקה */
var M_RING=gMesh(gRing), M_RINGW=gMesh(gRW);
var gW=G(); gBox(gW,0.34,0.30,0.22,-4.88,dY(-4.88)+0.58,-0.58);
var M_SLING=gMesh(gW);
var M_POLE=cylMesh(0.055,0.048,3.70,0,0,0);

/* ---------- בדי החסות: בד לבן עם עיגולים ומלבנים כהים לא קריאים. לא משחזרים סמלים מסחריים. ---------- */
function sponTexture(){
  var w=512,h=160, cv=document.createElement('canvas'); cv.width=w; cv.height=h;
  var x=cv.getContext('2d'), i;
  x.fillStyle='#f2f2f0'; x.fillRect(0,0,w,h);
  var rnd=function(n){ var s=Math.sin(n*91.7+13.1)*43758.5453; return s-Math.floor(s); };
  for(i=0;i<22;i++){ var cx=w*(0.06+0.88*rnd(i*1.7)), cy=h*(0.22+0.56*rnd(i*3.1+5)), sz=h*(0.10+0.16*rnd(i*5.3));
    x.fillStyle='rgba(38,44,56,'+(0.42+0.38*rnd(i*7.9))+')';
    if(rnd(i*11.3)<0.45){ x.beginPath(); x.arc(cx,cy,sz*0.5,0,6.283); x.fill(); }
    else x.fillRect(cx-sz*0.9,cy-sz*0.28,sz*1.8,sz*0.56); }
  return texFromCanvas(cv);
}
var TEX_SPON=sponTexture();
function clothMesh(x0,x1,y0,h,z,flip){
  var p=[],uv=[],idx=[],N=6,i;
  for(i=0;i<=N;i++){ var f=i/N, x=x0+(x1-x0)*f;
    p.push(x,y0,z, x,y0+h,z); uv.push(flip?1-f:f,0, flip?1-f:f,1); }
  for(i=0;i<N;i++){ var b=i*2; if(flip) idx.push(b,b+2,b+1,b+1,b+2,b+3); else idx.push(b,b+1,b+2,b+1,b+3,b+2); }
  return mesh(p,idx,uv); }
var M_CLOTHS=clothMesh(-4.10,-1.30,dY(-2.7)+0.16,0.46, dW(-2.7)-0.04,false),
    M_CLOTHP=clothMesh(-4.10,-1.30,dY(-2.7)+0.16,0.46,-(dW(-2.7)-0.04),true);
/* 22.9: היה כאן גם M_CLOTHT, "בד הירכתיים": clothMesh מותח את הבד לאורך ציר x, ולכן (-0.48..0.48, z=-5.15)
   יצא לוח לבן שמרחף באוויר 5 מ׳ משמאל לאמצע הסירה ולא בד על מעקה הירכתיים. בתמונה 09 הבדים יושבים על מעקה הצד
   ליד הקוקפיט (כבר קיימים כאן) ולא לרוחב הירכתיים — ולכן הוסר ולא הוזז. */

/* ---------- הגוף: תפרי לוחות, פס שפשוף, והמדבקה של המספר ---------- */
function hullPt(t,sv){ var x=(t-0.5)*LOA, w=hb(t), sh2=sheer(t), dp=dep(t);
  return [x,-dp+sv*(sh2+dp), w*Math.pow(Math.sin(sv*Math.PI/2),0.72)]; }
var gSe=G(); (function(){ var L,i,k,N=22, lv=[0.60,0.665,0.73,0.795,0.86];
  for(L=0;L<lv.length;L++) for(k=-1;k<=1;k+=2){ var pv=null;
    for(i=0;i<=N;i++){ var t=0.045+0.91*i/N, q=hullPt(t,lv[L]), pnt=[q[0],q[1],k*q[2]];
      if(pv) gTube(gSe,pv,pnt,0.009,3); pv=pnt; } } })();
var M_SEAMS=gMesh(gSe);
var gRb=G(); (function(){ var i,k,N=22;
  for(k=-1;k<=1;k+=2){ var pv=null;
    for(i=0;i<=N;i++){ var t=0.035+0.93*i/N, q=hullPt(t,0.905), pnt=[q[0],q[1],k*(q[2]+0.012)];
      if(pv) gTube(gRb,pv,pnt,0.035,4); pv=pnt; } } })();
var M_RUB=gMesh(gRb);
function panelOnHull(side,t0,t1,v0,v1,off){
  var NS=18,p=[],uv=[],idx=[],i,j;
  function pt(t,sv){ var q=hullPt(t,sv); return [q[0],q[1],side*q[2]]; }
  for(i=0;i<NS;i++){ var t=t0+(t1-t0)*(i/(NS-1));
    var a=pt(Math.max(0.001,t-0.004),(v0+v1)/2), b=pt(Math.min(0.999,t+0.004),(v0+v1)/2);
    var dx=b[0]-a[0], dz=b[2]-a[2], L=Math.hypot(dx,dz)||1, nx=(-dz/L)*side, nz=(dx/L)*side;
    for(j=0;j<2;j++){ var sv=j?v1:v0, q=pt(t,sv);
      p.push(q[0]+nx*off,q[1],q[2]+nz*off); var u=i/(NS-1); uv.push(side>0?u:1-u, j?1:0); } }
  for(i=0;i<NS-1;i++){ var a2=i*2;
    if(side>0) idx.push(a2,a2+2,a2+1,a2+1,a2+2,a2+3); else idx.push(a2,a2+1,a2+2,a2+1,a2+3,a2+2); }
  return mesh(p,idx,uv); }
function sevenTexture(){
  var s=256, cv=document.createElement('canvas'); cv.width=cv.height=s;
  var x=cv.getContext('2d');
  x.clearRect(0,0,s,s);
  x.strokeStyle='#14181d'; x.lineWidth=s*0.035;
  x.beginPath(); x.arc(s/2,s/2,s*0.40,0,6.283); x.stroke();
  x.fillStyle='#14181d'; x.textAlign='center'; x.textBaseline='middle';
  x.font='700 '+Math.round(s*0.56)+'px Georgia, "Times New Roman", serif';
  x.fillText('7',s*0.50,s*0.54);
  return texFromCanvas(cv);
}
var TEX_SEVEN=sevenTexture();
var M_SEV7=panelOnHull(1,0.462,0.538,0.527,0.913,0.055), M_SEV7P=panelOnHull(-1,0.462,0.538,0.527,0.913,0.055);   /* טבעת של 0.8 מ׳ באמצע הגוף */

/* ---------- לילה (9ה׳): זוהר חם מהאשנבים ונקודה אדומה בקוקפיט מתחת לדודג׳ר ---------- */
function cabinGlow(boatM,eye,right,upv,nightF){
  if(nightF<0.06) return;
  var xs=[-1.55,-0.75,0.10,0.95,1.80], i,k,L,q;
  var start=flowN;
  for(i=0;i<xs.length;i++) for(k=-1;k<=1;k+=2){
    var lx=xs[i], ly=trunkTop(lx)-0.30, lz=k*trunkW(lx)*1.02;
    var px=boatM[0]*lx+boatM[4]*ly+boatM[8]*lz+boatM[12],
        py=boatM[1]*lx+boatM[5]*ly+boatM[9]*lz+boatM[13],
        pz=boatM[2]*lx+boatM[6]*ly+boatM[10]*lz+boatM[14];
    var d=Math.hypot(eye[0]-px,eye[1]-py,eye[2]-pz); if(d>90) continue;
    var lay=[[0.13,0.85],[0.40,0.30]];
    for(L=0;L<lay.length;L++){ var sz=lay[L][0], a=lay[L][1]*nightF*Math.max(0,Math.min(1,1.6-d/60));
      for(q=0;q<8;q++){ var a0=q/8*6.2831853, a1=(q+1)/8*6.2831853;
        fv(px,py,pz,a,3);
        fv(px+(right[0]*Math.cos(a0)+upv[0]*Math.sin(a0))*sz, py+(right[1]*Math.cos(a0)+upv[1]*Math.sin(a0))*sz, pz+(right[2]*Math.cos(a0)+upv[2]*Math.sin(a0))*sz,0,3);
        fv(px+(right[0]*Math.cos(a1)+upv[0]*Math.sin(a1))*sz, py+(right[1]*Math.cos(a1)+upv[1]*Math.sin(a1))*sz, pz+(right[2]*Math.cos(a1)+upv[2]*Math.sin(a1))*sz,0,3); } } }
  /* אור אדום קטן בקוקפיט, מתחת לדודג׳ר */
  var rx=-2.05, ry=dY(-2.05)+0.42, rz=0.22;
  var px2=boatM[0]*rx+boatM[4]*ry+boatM[8]*rz+boatM[12],
      py2=boatM[1]*rx+boatM[5]*ry+boatM[9]*rz+boatM[13],
      pz2=boatM[2]*rx+boatM[6]*ry+boatM[10]*rz+boatM[14];
  var lay2=[[0.10,0.95],[0.34,0.26]];
  for(L=0;L<lay2.length;L++){ var s3=lay2[L][0], a3=lay2[L][1]*nightF;
    for(q=0;q<8;q++){ var b0=q/8*6.2831853, b1=(q+1)/8*6.2831853;
      fv(px2,py2,pz2,a3,8);
      fv(px2+(right[0]*Math.cos(b0)+upv[0]*Math.sin(b0))*s3, py2+(right[1]*Math.cos(b0)+upv[1]*Math.sin(b0))*s3, pz2+(right[2]*Math.cos(b0)+upv[2]*Math.sin(b0))*s3,0,8);
      fv(px2+(right[0]*Math.cos(b1)+upv[0]*Math.sin(b1))*s3, py2+(right[1]*Math.cos(b1)+upv[1]*Math.sin(b1))*s3, pz2+(right[2]*Math.cos(b1)+upv[2]*Math.sin(b1))*s3,0,8); } }
  gl.bindBuffer(gl.ARRAY_BUFFER,flowBuf);
  gl.bufferSubData(gl.ARRAY_BUFFER,start*20,flowArr.subarray(start*5,flowN*5));
  rngAir=[rngAir[0],flowN-rngAir[0]];
}

/* כרית ההגאי: סגלגלה, על המושב האחורי (תמונות 02 ו-11) */
var gCu=G(); gBox(gCu,0.52,0.085,0.44,-4.10,dY(-4.10)-0.30,0);
var M_CUSH=gMesh(gCu);
/* הדודג׳ר: פס כחול־כהה לאורך השפה העליונה, ובטנה ירוקה כהה מבפנים (תמונה 01) */
function dodgerTrim(){
  var p=[],idx=[],N=9,i;
  for(i=0;i<=N;i++){ var a=Math.PI*i/N, y=sheer(-0.15)+0.12+Math.sin(a)*0.62, z=-Math.cos(a)*1.02;
    p.push(-2.53,y,z, -2.34,y,z); }
  for(i=0;i<N;i++){ var b=i*2; idx.push(b,b+2,b+1, b+1,b+2,b+3); }
  return mesh(p,idx); }
var M_DODTRIM=dodgerTrim();
function dodgerLiner(){
  var p=[],idx=[],N=9,i;
  for(i=0;i<=N;i++){ var a=Math.PI*i/N, y=sheer(-0.15)+0.115+Math.sin(a)*0.605, z=-Math.cos(a)*0.995;
    p.push(-2.47,y,z, -1.60,y,z); }
  for(i=0;i<N;i++){ var b=i*2; idx.push(b,b+1,b+2, b+1,b+3,b+2); }
  return mesh(p,idx); }
var M_DODLIN=dodgerLiner();

/* ======================= דניאל — מודל לפי התמונות (20.9.2026) =======================
   מקור: התמונה שבה הוא מנופף מהקוקפיט (16), ושתי תמונות הקוקפיט (02, 11).
   שיער חום כהה מתולתל, משקפי שמש, חולצת טי כחולה־כהה קצרה, מכנסיים בהירים קצרים.
   מיקום: יושב על מושב הקוקפיט הימני, פונה קדימה, והיד הרחוקה על הטילר. הקוקפיט הוא
   x=-4.50 עד -2.32, רצפתו ב-FREE-0.44 והמושבים בערך ב-FREE-0.02; הטילר מגיע עד x=-3.07.
   הפרופורציות הן של אדם בגובה 1.78 מ׳: ראש 0.21, גו 0.60, זרוע 0.30+0.27, ירך 0.45, שוק 0.43. */
var HELM_X=-3.52, HELM_Z=0.60, HELM_Y=FREE-0.02;
function crewParts(){
  var sk=G(), sh=G(), tr=G(), hr=G(), gl2=G();
  gBox(tr,0.30,0.21,0.40, 0.00,0.105,0);                                   /* אגן */
  gTube(tr,[0.04,0.15, 0.115],[0.46,0.11, 0.155],0.088,6);                 /* ירכיים, אופקיות קדימה */
  gTube(tr,[0.04,0.15,-0.115],[0.46,0.11,-0.155],0.088,6);
  gTube(sk,[0.46,0.11, 0.155],[0.50,-0.40, 0.165],0.062,6);                /* שוקיים, יורדות אל הרצפה */
  gTube(sk,[0.46,0.11,-0.155],[0.50,-0.40,-0.165],0.062,6);
  gBox(sk,0.19,0.07,0.095, 0.545,-0.42, 0.165);                            /* כפות רגליים */
  gBox(sk,0.19,0.07,0.095, 0.545,-0.42,-0.165);
  gBox(sh,0.235,0.46,0.375, -0.01,0.44,0);                                 /* גו */
  gBox(sh,0.215,0.14,0.415, -0.01,0.70,0);                                 /* כתפיים */
  gTube(sh,[0.00,0.695, 0.20],[0.09,0.475, 0.255],0.055,6);                /* זרועות עליונות, בשרוול */
  gTube(sh,[0.00,0.695,-0.20],[0.11,0.470,-0.255],0.055,6);
  gTube(sk,[0.09,0.475, 0.255],[0.20,0.315, 0.315],0.046,6);               /* אמה ימנית: היד על הדופן */
  gTube(sk,[0.11,0.470,-0.255],[0.40,0.455,-0.470],0.046,6);               /* אמה שמאלית: היד על הטילר */
  gTube(sk,[0.20,0.315,0.315],[0.235,0.300,0.330],0.062,6);
  gTube(sk,[0.40,0.455,-0.470],[0.435,0.455,-0.500],0.062,6);
  gTube(sk,[-0.01,0.775,0],[0.00,0.855,0],0.052,6);                        /* צוואר */
  gBox(gl2,0.035,0.048,0.145, 0.088,0.955,0);                              /* משקפי שמש */
  return { sk:gMesh(sk), sh:gMesh(sh), tr:gMesh(tr), gl:gMesh(gl2) }; }
var CREW=crewParts();
var C_HEAD=sphMesh(0.104,0.00,0.955,0,1.02,0.93), C_HAIR=sphMesh(0.119,-0.018,0.975,0,0.93,0.97);

/* ======================= לוויתן =======================
   לוויתן מצוי (fin whale), 18 מ׳: ראש רחב וקהה ושטוח מלמעלה, גוף שמתעבה מאחורי הראש, גזע זנב דק,
   סנפיר גבי קטן ומגלי בשני שלישים לאחור, וסנפירי חזה צרים. לא כריש.
   התנועה: הגוף בנוי משלושה מקטעים שמסתובבים במישור האנכי בפאזות נדחות, כך שגל עובר מהראש אל המדוכה.
   זו התנועה האמיתית של לווייתנים — אנכית, לא צדית כמו דג. */
var WH_LEN=18.0;
function whProf(t){                                  /* חצי קוטר לאורך הגוף, מקצה הזנב אל החוטם */
  var p=[[0,0.03],[0.06,0.22],[0.14,0.50],[0.26,1.00],[0.40,1.46],[0.52,1.70],[0.64,1.76],[0.74,1.72],
         [0.83,1.60],[0.895,1.40],[0.945,1.12],[0.98,0.80],[1,0.58]],k;
  if(t<=0) return 0.03; if(t>=1) return 0.58;
  for(k=0;k<p.length-1;k++) if(t<=p[k+1][0]){ var f=(t-p[k][0])/(p[k+1][0]-p[k][0]); return p[k][1]+(p[k+1][1]-p[k][1])*f; }
  return 0.58; }
function sm(a,b,x){ var q=Math.max(0,Math.min(1,(x-a)/(b-a))); return q*q*(3-2*q); }
function whSeg(t0,t1,ox){                            /* מקטע גוף, עם ראשית הצירים בציר הסיבוב שלו */
  var g=G(), NS=Math.max(4,Math.round((t1-t0)*30)), NR=12, i,j, prev=null;
  for(i=0;i<=NS;i++){ var t=t0+(t1-t0)*i/NS, r=whProf(t), x=(t-0.5)*WH_LEN-ox;
    var head=sm(0.80,1.0,t), tail=sm(0.22,0.05,t);
    var wz=r*(0.84+0.34*head)*(1-0.55*tail), wy=r*(1.0-0.42*head)*(1-0.10*tail), drop=(t>0.86?-0.10*head*r:0);
    var ring=[];
    for(j=0;j<NR;j++){ var a=j/NR*6.2831853, sy=Math.sin(a), cz=Math.cos(a);
      ring.push([x, sy*wy*(sy<0?1.12:1.0)+drop, cz*wz]); }   /* בטן מעט מלאה יותר מהגב */
    var b=g.p.length/3;
    for(j=0;j<NR;j++) g.p.push(ring[j][0],ring[j][1],ring[j][2]);
    if(prev) for(j=0;j<NR;j++){ var q=b-NR+j, q2=b-NR+(j+1)%NR, s2=b+j, s3=b+(j+1)%NR; g.i.push(q,s2,q2, q2,s2,s3); }
    prev=ring; }
  return g; }
function whaleParts(){
  /* לכל מקטע ראשית הצירים בקצה הקדמי שלו (המפרק עם המקטע שלפניו), כדי שהשרשור יחזיק אותם צמודים */
  var A=whSeg(0.44,1.0,(0.44-0.5)*WH_LEN), B=whSeg(0.20,0.44,(0.44-0.5)*WH_LEN), C=whSeg(0.0,0.20,(0.20-0.5)*WH_LEN);
  /* סנפירי חזה: צרים וארוכים, מאחורי הראש */
  (function(){ var fx=(0.79-0.44)*WH_LEN, k;
    for(k=-1;k<=1;k+=2) for(var s=-1;s<=1;s+=2){
      gPush(A,[[fx+0.35,-0.45+s*0.05,k*0.78],[fx-1.55,-1.15+s*0.04,k*2.25],[fx-1.95,-0.92+s*0.04,k*2.05],[fx-0.30,-0.28+s*0.05,k*0.70]],
            (k*s>0)?[[0,1,2],[0,2,3]]:[[0,2,1],[0,3,2]]); } })();
  /* סנפיר גבי: קטן, מגלי, נוטה אחורה */
  (function(){ var dx=(0.325-0.44)*WH_LEN, s;
    for(s=-1;s<=1;s+=2)
      gPush(B,[[dx+0.62,1.02,s*0.05],[dx-0.34,0.98,s*0.05],[dx-0.42,1.74,s*0.04],[dx+0.16,1.62,s*0.04]],
            s>0?[[0,1,2],[0,2,3]]:[[0,2,1],[0,3,2]]); })();
  return { A:gMesh(A), B:gMesh(B), C:gMesh(C) }; }
function whaleFluke(){                               /* מדוכה רחבה עם חריץ במרכז */
  var g=G();
  var P=[[0.55,0,0],[-0.25,0.03,2.55],[-1.65,0.05,3.05],[-1.15,0.02,0.60],[-0.60,0,0.10]];
  var Q=[[0.55,0,0],[-0.60,0,-0.10],[-1.15,0.02,-0.60],[-1.65,0.05,-3.05],[-0.25,0.03,-2.55]];
  gPush(g,P,[[0,1,2],[0,2,3],[0,3,4]]);
  gPush(g,Q,[[0,4,3],[0,3,2],[0,2,1]]);
  gPush(g,[[P[0][0],-0.07,0],[P[1][0],-0.03,P[1][2]],[P[2][0],-0.03,P[2][2]],[P[3][0],-0.05,P[3][2]],[P[4][0],-0.07,P[4][2]]],[[0,2,1],[0,3,2],[0,4,3]]);
  gPush(g,[[Q[0][0],-0.07,0],[Q[1][0],-0.07,Q[1][2]],[Q[2][0],-0.05,Q[2][2]],[Q[3][0],-0.03,Q[3][2]],[Q[4][0],-0.03,Q[4][2]]],[[0,1,2],[0,2,3],[0,3,4]]);
  return gMesh(g); }
var WHP=whaleParts(), M_FLUKE=whaleFluke();
/* ---- התנהגות (מ-21.9 בערב, הערה בתחנה: "פרס למי שמתמיד ומסתכל") ----
   הלוויתן משחק רחוק מהסירה, 110 עד 300 מ׳. פעם בכמה דקות, כשהוא בטווח שרואים ממנו משהו, הוא עולה
   לנשום: עלייה איטית, כמה נשיפות מעל הגב, ואז צלילה עם הזנב — הגוף מתכופף, המדוכה יוצאת מהמים
   ויורדת לאט. מחזור השחייה נשאר כמו שהיה; רק העומק, ההטיה והזנב מונעים מהשלב. */
var WH={x:0,z:0,dep:14,dep0:14,hdg:0,spd:2.1,ph:0, st:'deep', stT:0, next:0, pitch:0, curl:0, blows:[]};
function whaleSeed(first){
  var a=Math.random()*6.2831853, d=first?(110+Math.random()*90):(190+Math.random()*60);
  WH.x=Math.cos(a)*d; WH.z=Math.sin(a)*d;
  WH.hdg=Math.atan2(-WH.x,WH.z)+(Math.random()-0.5)*2.4;
  WH.dep0=WH.dep=7+Math.random()*13; WH.spd=1.5+Math.random()*1.1; WH.ph=Math.random()*6.283;
  if(first) WH.next=55+Math.random()*50; }
whaleSeed(true);
/* ענן הנשיפה: כדור נמוך־פוליגונים, לבן, שעולה, מתרחב ונמוג */
var M_PUFF=(function(){ var g=G(), NR=7, NS=5, i, j;
  for(i=0;i<=NS;i++){ var v=i/NS*Math.PI, y=Math.cos(v), r=Math.sin(v); for(j=0;j<NR;j++){ var a=j/NR*6.2831853; g.p.push(Math.cos(a)*r,y,Math.sin(a)*r); } }
  for(i=0;i<NS;i++) for(j=0;j<NR;j++){ var q=i*NR+j, q2=i*NR+(j+1)%NR; g.i.push(q,q2,q+NR, q2,q2+NR,q+NR); }
  return gMesh(g); })();
function whBlow(W){ var hx=(0.84-0.44)*WH_LEN, c=[W[0]*hx+W[4]*1.1+W[12], W[1]*hx+W[5]*1.1+W[13], W[2]*hx+W[6]*1.1+W[14]];
  for(var k=0;k<9;k++) WH.blows.push({x:c[0],y:Math.max(c[1],0.1),z:c[2],vx:(Math.random()-0.5)*1.1,vy:7.5+Math.random()*4.0,vz:(Math.random()-0.5)*1.1,age:-k*0.05,L:2.4+Math.random()*1.0}); }
function whPhase(dt,dcam){
  var S=WH, e=(S.stT+=dt), sm2=function(a,b,x){ return sm(a,b,x); };
  if(S.st==='deep'){ S.next-=dt; S.dep+=(S.dep0-S.dep)*Math.min(1,dt*0.25); S.pitch*=0.98; S.curl*=0.98;
    /* עולה רק כשהוא בטווח שאפשר לראות ממנו, ולא צמוד לסירה */
    if(S.next<=0){ var r=Math.hypot(S.x,S.z); if(r>(S.force?20:70)&&r<240&&dcam<230){ S.st='rise'; S.stT=0; S.dep1=S.dep; } else S.next=8; } }
  else if(S.st==='rise'){ var f=sm2(0,12,e); S.dep=S.dep1+(1.25-S.dep1)*f; S.pitch=0.10*Math.sin(Math.PI*Math.min(1,e/12)); if(e>=12){ S.st='surf'; S.stT=0; S.nb=0; } }
  else if(S.st==='surf'){ S.dep=1.25+Math.sin(e*0.9)*0.08; S.pitch*=0.95;
    var at=[1.2,5.6,10.2]; if(S.nb<at.length&&e>=at[S.nb]){ S.nb++; S.blowNow=true; }
    if(e>=14){ S.st='dive'; S.stT=0; } }
  else if(S.st==='dive'){
    /* הגוף מתכופף אף־למטה, הזנב מתקמר והמדוכה עולה מעל המים, ואז יורדת לאט */
    S.pitch=-0.46*sm2(0,3.2,e)*(1-0.55*sm2(7,11,e));
    S.curl=sm2(1.2,4.2,e)*(1-sm2(7.5,11,e));
    S.dep=1.25+Math.max(0,e-2.2)*0.55+Math.max(0,e-6)*0.35;
    if(e>=11.5){ S.st='deep'; S.stT=0; S.dep0=8+Math.random()*12; S.next=150+Math.random()*120; } }
}
function drawBlows(dt,VP){
  if(!WH.blows.length) return;
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
  for(var k=WH.blows.length-1;k>=0;k--){ var b=WH.blows[k]; b.age+=dt; if(b.age<0) continue;
    if(b.age>b.L){ WH.blows.splice(k,1); continue; }
    b.x+=b.vx*dt; b.y+=b.vy*dt; b.z+=b.vz*dt; b.vy=Math.max(0.4,b.vy-5.2*dt); b.vx*=0.985; b.vz*=0.985;
    var f=b.age/b.L, r=0.34+f*1.7, a=0.72*(1-f)*(1-f)*Math.min(1,b.age*6);
    gl.uniform1f(SOLID.u('uA'),a);
    drawMesh(M_PUFF, mMul(mTrans(b.x,b.y,b.z),mScale(r,r*1.25,r)), [0.93,0.95,0.97], 1, 0.55); }
  gl.depthMask(true); gl.disable(gl.BLEND); gl.uniform1f(SOLID.u('uA'),1); }
function drawWhale(t,dt,eye,under,VP){
  /* l23 (23.9): הלוויתן ירד מהתצוגה (בעל האתר: "יגרום לאנשים לחשוב שזה לא אמיתי"). הקוד נשאר; EXO.whale('on') מפעיל ידנית */
  if(!WH.on){ WH.blows.length=0; return; }
  if(EXO.quality==='lite'||reduce) return;
  WH.x+=Math.sin(WH.hdg)*WH.spd*dt; WH.z-=Math.cos(WH.hdg)*WH.spd*dt;
  WH.hdg+=Math.sin(t*0.07+WH.ph)*0.0025;
  var rr=Math.hypot(WH.x,WH.z);
  /* שומר מרחק: קרוב מדי — פונה החוצה בעדינות. רחוק מדי — מתחלף, אבל לא באמצע נשימה */
  if(rr<95) WH.hdg+=(((Math.atan2(WH.x,-WH.z)-WH.hdg+Math.PI*3)%(Math.PI*2))-Math.PI)*0.004;
  if(rr>300&&WH.st==='deep') whaleSeed(false);
  var dcam=Math.hypot(eye[0]-WH.x,eye[2]-WH.z);
  whPhase(dt,dcam);
  if(dcam>330){ WH.blows.length=0; return; }
  var w=1.15+WH.spd*0.20, ph=t*w+WH.ph;
  var calm=(WH.st==='deep')?1:0.35;                               /* ליד פני המים הנדנוד רגוע יותר */
  var y=-WH.dep+(Math.sin(ph*0.30)*1.25+Math.sin(ph)*0.16)*calm*(WH.st==='deep'?1:0.2);
  var roll=Math.sin(t*0.21+WH.ph)*0.11*calm;
  var W=mMul(mMul(mMul(mTrans(WH.x,y,WH.z),mRotY(Math.PI/2-WH.hdg)),mRotZ(Math.sin(ph)*0.035*calm+WH.pitch)),mRotX(roll));
  var cu=WH.curl, a1=Math.sin(ph-0.7)*0.115*calm-0.10*cu, a2=Math.sin(ph-1.5)*0.20*calm-0.42*cu, a3=Math.sin(ph-2.3)*0.34*(1-0.7*cu)-0.62*cu;
  var MB=mMul(W,mRotZ(a1));
  var MC=mMul(mMul(MB,mTrans((0.20-0.44)*WH_LEN,0,0)),mRotZ(a2));
  var MF=mMul(mMul(MC,mTrans((0.0-0.20)*WH_LEN,0,0)),mRotZ(a3));
  if(WH.blowNow){ WH.blowNow=false; whBlow(W); }
  var deep=Math.max(0,Math.min(1,(WH.dep-1.5)/16));
  var a=under?1.0:(0.72-0.34*deep)*Math.max(0,Math.min(1,1.6-dcam/200));
  gl.useProgram(SOLID);
  gl.enableVertexAttribArray(SOLID.a('aP')); gl.enableVertexAttribArray(SOLID.a('aN'));
  if(a>=0.02){
    var col=under?[0.125,0.165,0.195]:[0.020,0.055,0.085];
    if(a<0.999){ gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA); gl.disable(gl.DEPTH_TEST); }
    gl.uniform1f(SOLID.u('uA'),a);
    drawMesh(WHP.A, W, col); drawMesh(WHP.B, MB, col); drawMesh(WHP.C, MC, col);
    drawMesh(M_FLUKE, MF, col);
    gl.uniform1f(SOLID.u('uA'),1);
    if(a<0.999){ gl.enable(gl.DEPTH_TEST); gl.disable(gl.BLEND); } }
  /* מעל המים: מה שיצא מהמים מצויר מוצק, עם בדיקת עומק מול הים — כך רק הגב, הסנפיר והמדוכה נראים,
     והשאר נשאר מתחת לפני המים. גב רטוב: אפור־כחלחל כהה, עם מעט ברק */
  if(!under&&WH.st!=='deep'){ var wet=[0.16,0.19,0.22];
    drawMesh(WHP.A, W, wet); drawMesh(WHP.B, MB, wet); drawMesh(WHP.C, MC, wet); drawMesh(M_FLUKE, MF, wet); }
  if(!under) drawBlows(dt,VP); else WH.blows.length=0;
  gl.disableVertexAttribArray(SOLID.a('aP')); gl.disableVertexAttribArray(SOLID.a('aN'));
}
EXO.whale=function(cmd,dist){ /* לבדיקות בלבד: 'on'/'off' מפעיל ומכבה (כבוי כברירת מחדל מ-23.9); 'front' מציב אותו מול המצלמה, 150 מ׳ מעבר לסירה, ומזמן נשימה */
  if(cmd==='on'||cmd==='front'||cmd==='surface') WH.on=true; if(cmd==='off'){ WH.on=false; WH.blows.length=0; }
  if(cmd==='front'&&LAB._eye){ var ex=LAB._eye[0], ez=LAB._eye[2], L=Math.hypot(ex,ez)||1; var dd=dist||150; WH.x=-ex/L*dd; WH.z=-ez/L*dd; WH.hdg=Math.atan2(-ez,-ex)+Math.PI/2; WH.next=0; WH.st='deep'; WH.force=!!dist; }
  if(cmd==='surface'){ WH.next=0; var r=Math.hypot(WH.x,WH.z); if(r<70||r>240){ var a=Math.atan2(WH.z,WH.x); WH.x=Math.cos(a)*150; WH.z=Math.sin(a)*150; } } return {st:WH.st,t:+WH.stT.toFixed(1),dep:+WH.dep.toFixed(2),r:Math.round(Math.hypot(WH.x,WH.z)),blows:WH.blows.length}; };

function buildFlow(c,t,dt,eye,bodyY){
  flowN=0; rngCur=[0,0]; rngSurf=[0,0]; rngAir=[0,0];
  var i,p,ex,ey,ez,tl,sx,sy,sz,a,edge;
  var LY=EXO.layers, QF=(EXO.quality==='lite'?0.45:1);
  buildCurrent(c,t,dt,eye);           rngCur=[0,flowN];
  var ring0=flowN; if(LAB.compass==='world') worldRing(c,t); rngRing=[ring0,flowN-ring0];
  var surf0=flowN; buildSurface(c,t,dt,eye); rngSurf=[surf0,flowN-surf0];
  var air0=flowN;
  /* --- wind: soft meandering ribbons, up in the air --- */
  if(LY.wind){
  var wt=(c.windDir+180)%360, wr=wt*D2R;
  var wx=Math.sin(wr), wz=-Math.cos(wr);
  var wspd=Math.max(0.6,c.wind*0.5144);
  var rw=0.021+wspd*0.0019;
  var wstep=0.44+wspd*0.058;
  var dens=Math.min(1,0.34+c.wind/24), nUse=Math.round(NWIND*dens*QF);
  if(LAB.wind==='air'||LAB.wind==='sails'){ buildAir(c,t,dt,eye,wx,wz,wspd); } else
  for(i=0;i<nUse;i++){ p=PW[i];
    p.age+=dt;
    var rr=Math.sqrt(p.px*p.px+p.pz*p.pz);
    if(p.age>p.life||rr>p.R){ seedW(p); rr=Math.sqrt(p.px*p.px+p.pz*p.pz); }
    var sw=Math.sin(p.px*0.026+t*0.20)*Math.cos(p.pz*0.022-t*0.15);
    var ang=wr+sw*0.15+0.035*Math.sin(p.ph)+0.05*Math.sin(t*5.3+p.ph*7.0);
    p.px+=Math.sin(ang)*wspd*p.sp*dt; p.pz-=Math.cos(ang)*wspd*p.sp*dt;
    p.py+=Math.sin(t*1.05+p.ph)*0.30*dt;
    flowPath(p.t,p.px,p.py+bodyY*0.3,p.pz,ang,wstep*p.sp,TSEG+1,t,0,0.026,0.022,0.20,0.15,false);
    var fade=Math.min(1,p.age/1.6)*Math.min(1,(p.life-p.age)/2.0);
    var edg=Math.min(1,2.4*(1-rr/p.R));
    a=(0.30+0.12*Math.sin(p.ph*3.1))*fade*edg; if(a<0.012) continue;
    ribbon(p.t,eye,rw*p.sp,a,0); }

  /* --- spray torn off the crests --- */
  if(NSPRAY&&c.wind>=15&&EXO.quality!=='lite'){
    for(i=0;i<NSPRAY;i++){ p=PS[i];
      p.l-=dt;
      if(p.l<=0){ var gx=rnd(-52,52), gz=rnd(-52,52);
        if(waveY(gx,gz,t)<ampMax*0.45){ p.l=0; p.y=-999; continue; }
        p.x=gx; p.z=gz; p.y=waveY(gx,gz,t)+0.15;
        p.vx=wx*wspd*0.55+rnd(-0.8,0.8); p.vz=wz*wspd*0.55+rnd(-0.8,0.8);
        p.vy=rnd(1.1,2.6); p.L=rnd(0.9,1.8); p.l=p.L; }
      p.x+=p.vx*dt; p.z+=p.vz*dt; p.y+=p.vy*dt; p.vy-=4.6*dt;
      if(p.y<-2){ p.l=0; continue; }
      var f2=p.l/p.L; a=0.46*f2*f2*Math.min(1,c.wind/22);
      if(a<0.02) continue;
      var sz2=0.055+(1-f2)*0.16;
      fquad(p.x,p.y,p.z, p.x,p.y+sz2*1.6,p.z, sz2,0,0, a, 2); } }
  }
  rngAir=[air0,flowN-air0];
}

/* --- הזרם: מתחת לפני המים. מקווקו, רך, זוחל בקצב אחיד בלי רעש --- */
function buildCurrentOld(c,t,dt,eye){
  if(!EXO.layers.cur) return;
  var i,p,a, cr=c.curDir*D2R, cspd=Math.max(0.03,c.cur*0.5144);
  var n=Math.round(NCUR*(EXO.quality==='lite'?0.6:1));
  /* מהירות הזחילה מוגזמת פי כמה כדי שתיראה; היחס בין זרם חלש לחזק נשמר */
  var snk=(LAB.cur!=='now'), crawl=snk?(cspd*(LAB.cur==='snake4'?4:1)):(0.55+cspd*2.2);
  var cnx=Math.cos(cr), cnz=Math.sin(cr), sdx=Math.sin(cr), sdz=-Math.cos(cr);
  for(i=0;i<n;i++){ p=PC[i];
    p.age+=dt;
    var rr2=Math.sqrt(p.px*p.px+p.pz*p.pz);
    if(p.age>p.life||rr2>p.R){ seedC(p); rr2=Math.sqrt(p.px*p.px+p.pz*p.pz); }
    p.px+=Math.sin(cr)*crawl*dt; p.pz-=Math.cos(cr)*crawl*dt;
    var x=p.px, z=p.pz, k, tr=p.t; tr.n=CSEG+1;
    for(k=CSEG;k>=0;k--){ var so=snk?(0.30*Math.sin(k*0.80-t*(0.9+crawl*1.4)+p.ph)*(0.25+0.75*(1-k/CSEG))):0;
      tr.x[k]=x+cnx*so; tr.z[k]=z+cnz*so; tr.y[k]=waveY(x,z,t)*0.55-p.dep;
      x-=Math.sin(cr)*0.95; z+=Math.cos(cr)*0.95; }
    var fade2=Math.min(1,p.age/2.0)*Math.min(1,(p.life-p.age)/2.6);
    var edg2=Math.min(1,2.4*(1-rr2/p.R));
    var dcam=Math.hypot(eye[0]-p.px,eye[2]-p.pz);
    a=(0.34+Math.min(0.26,c.cur*0.20))*fade2*edg2*(1-p.dep/3.6)*Math.max(0,Math.min(1,1.25-dcam/64)); if(a<0.012) continue;
    if(snk){ var aa=Math.min(1,a*1.55), hx=tr.x[CSEG], hy=tr.y[CSEG], hz=tr.z[CSEG];
      ribbon(tr,eye,0.15+p.dep*0.03,aa,1);
      fv(hx+sdx*0.95,hy,hz+sdz*0.95,aa,1); fv(hx+cnx*0.38-sdx*0.10,hy,hz+cnz*0.38-sdz*0.10,aa,1); fv(hx-cnx*0.38-sdx*0.10,hy,hz-cnz*0.38-sdz*0.10,aa,1); }
    else softDash(tr,eye,0.10+p.dep*0.04,a,1,i); }
}

/* --- פני המים: שברוני הסוול, הקו אל השער, קו החרטום והשובל --- */
function buildSurface(c,t,dt,eye){
  var i,p,a;
  if(EXO.layers.wave){
    /* השברונים נזרעים על פסגה של רכבת הסוול הראשית ונעים איתה במהירות הפאזה שלה,
       ולכן המרווח ביניהם הוא אורך הגל והקצב שבו הם עוברים הוא זמן המחזור האמיתי. */
    var d0=wDir[0], L=Math.max(wLen[0],9), cph=wSpd[0], k0=6.2831853/L;
    var nC=Math.round(NCHEV*(EXO.quality==='lite'?0.6:1));
    if(LAB.wave==='arcs') crestLines(c,t,dt,eye);
    for(i=0;i<nC;i++){ p=PV[i];
      p.age+=dt;
      var rr=Math.sqrt(p.x*p.x+p.z*p.z);
      if(p.age>p.life||rr>62){
        var ang=Math.random()*6.283, r0=8+52*Math.sqrt(Math.random());
        var sx0=Math.cos(ang)*r0, sz0=Math.sin(ang)*r0;
        /* הזזה לאורך כיוון ההתקדמות עד הפסגה הקרובה: k·s − ω·t = π/2 (mod 2π) */
        var ph=k0*(d0[0]*sx0+d0[1]*sz0)-cph*k0*t;
        var want=Math.PI/2, dphi=((want-ph)%6.2831853+6.2831853)%6.2831853;
        if(dphi>Math.PI) dphi-=6.2831853;
        p.x=sx0+d0[0]*dphi/k0; p.z=sz0+d0[1]*dphi/k0; p.age=0; p.life=rnd(5,9); }
      p.x+=d0[0]*cph*dt; p.z+=d0[1]*cph*dt;
      var fd=Math.min(1,p.age/1.2)*Math.min(1,(p.life-p.age)/1.6)*Math.min(1,2.2*(1-Math.sqrt(p.x*p.x+p.z*p.z)/62));
      a=0.42*fd; if(a<0.015) continue;
      if(LAB.wave==='arcsOld'){ if(i<10) crestArc(p.x,p.z,d0[0],d0[1],4.2+Math.min(3,c.waveH),Math.min(1,a*1.7),t); }
      else if(LAB.wave==='chev') chevron(p.x,p.z,d0[0],d0[1],1.5+Math.min(2.2,c.waveH*0.75),a,t); }
  }
  /* --- where she is pointed, and where she has to go --- */
  function lane(brgDeg,len,halfW,alpha,ci,dot){
    var br=brgDeg*D2R, dx=Math.sin(br), dz=-Math.cos(br);
    var px2=-dz, pz2=dx, seg=dot?0.55:len, d2=5.4;
    while(d2<len){
      var e2=Math.min(len,d2+seg);
      var fA=1-d2/len, fB=1-e2/len;
      var ax2=dx*d2, az2b=dz*d2, bx2=dx*e2, bz2=dz*e2;
      var q1x=ax2+px2*halfW, q1z=az2b+pz2*halfW, q2x=ax2-px2*halfW, q2z=az2b-pz2*halfW;
      var q3x=bx2+px2*halfW, q3z=bz2+pz2*halfW, q4x=bx2-px2*halfW, q4z=bz2-pz2*halfW;
      var aA=alpha*fA, aB=alpha*fB;
      fv(q1x,waveY(q1x,q1z,t)+0.05,q1z,aA,ci);
      fv(q2x,waveY(q2x,q2z,t)+0.05,q2z,aA,ci);
      fv(q3x,waveY(q3x,q3z,t)+0.05,q3z,aB,ci);
      fv(q2x,waveY(q2x,q2z,t)+0.05,q2z,aA,ci);
      fv(q4x,waveY(q4x,q4z,t)+0.05,q4z,aB,ci);
      fv(q3x,waveY(q3x,q3z,t)+0.05,q3z,aB,ci);
      d2=e2+(dot?3.1:0); }
  }
  if(LAB.lines==='water') lane(GATE_BRG,90,0.27,0.70,2,true);      /* אל נקודת החובה הבאה: נקודות לבנות */
  if(LAB.lines==='water') lane(BP.cog,58,0.16,0.62,3,false);      /* לאן החרטום מצביע: קו כתום רציף */

  /* --- her wake: two feathered strips, bright at the centreline --- */
  var hr=BP.cog*D2R, bx=Math.sin(hr), bz=-Math.cos(hr);
  var kx=-bx, kz=-bz, jx=-kz, jz=kx;
  var spd=Math.min(1,BP.sog/7.3);
  function wy2(x,z){ return waveY(x,z,t)+0.06; }
  for(i=0;i<NWAKE;i++){
    var dd0=4.6+i*(34/NWAKE), dd1=4.6+(i+1)*(34/NWAKE);
    var w0=0.55+dd0*0.062, w1=0.55+dd1*0.062;
    var x0=kx*dd0, z0=kz*dd0, x1=kx*dd1, z1=kz*dd1;
    var a0=0.20*spd*Math.pow(Math.max(0,1-dd0/40),1.8);
    var a1=0.20*spd*Math.pow(Math.max(0,1-dd1/40),1.8);
    if(a0<0.012) continue;
    var sd2;
    for(sd2=-1;sd2<=1;sd2+=2){
      var ox0=x0+jx*w0*sd2, oz0=z0+jz*w0*sd2;
      var ox1=x1+jx*w1*sd2, oz1=z1+jz*w1*sd2;
      fv(x0,wy2(x0,z0),z0,a0,2);
      fv(ox0,wy2(ox0,oz0),oz0,0,2);
      fv(ox1,wy2(ox1,oz1),oz1,0,2);
      fv(x0,wy2(x0,z0),z0,a0,2);
      fv(ox1,wy2(ox1,oz1),oz1,0,2);
      fv(x1,wy2(x1,z1),z1,a1,2); } }
}

var flowUploaded=false;
function drawRange(rng,mode,VP,eye,hor,fogD,nightF,lightCol3){
  if(!rng[1]) return;
  gl.useProgram(FLOW);
  gl.uniformMatrix4fv(FLOW.u('uVP'),false,new Float32Array(VP));
  gl.uniform3fv(FLOW.u('uEye'),eye); gl.uniform1f(FLOW.u('uFogD'),fogD);
  gl.uniform3fv(FLOW.u('uFogCol'),hor);
  var dim=1-0.45*nightF;
  if(LAB.wind!=='now') gl.uniform3f(FLOW.u('uCw'),0.86*dim+0.08,0.93*dim+0.05,1.0*dim+0.0);
  else gl.uniform3f(FLOW.u('uCw'),1.00*dim,0.74*dim,0.42*dim);      /* רוח: ענבר */
  gl.uniform3f(FLOW.u('uCc'),0.16,0.78-0.25*nightF,0.80-0.22*nightF); /* זרם: טורקיז עמוק */
  gl.uniform3f(FLOW.u('uCs'),0.97,0.99,1.0); var rc=LAB.ringCol||[0.97,0.99,1.0]; gl.uniform3f(FLOW.u('uCr'),rc[0],rc[1],rc[2]); gl.uniform3f(FLOW.u('uCg'),0.22,0.86,0.47); gl.uniform3f(FLOW.u('uCp'),0.96,0.22,0.20);
  gl.uniform3f(FLOW.u('uCh'),1.00,0.52,0.16);
  gl.uniform3f(FLOW.u('uCv'),0.80,0.91,1.0);                   /* גל: לבן־כחול */
  gl.uniform3fv(FLOW.u('uCl'),lightCol3||[1,1,1]);
  gl.bindBuffer(gl.ARRAY_BUFFER,flowBuf);
  if(!flowUploaded){ gl.bufferSubData(gl.ARRAY_BUFFER,0,flowArr.subarray(0,flowN*5)); flowUploaded=true; }
  gl.enableVertexAttribArray(FLOW.a('aP')); gl.enableVertexAttribArray(FLOW.a('aA'));
  gl.vertexAttribPointer(FLOW.a('aP'),3,gl.FLOAT,false,20,0);
  gl.vertexAttribPointer(FLOW.a('aA'),2,gl.FLOAT,false,20,12);
  gl.enable(gl.BLEND); gl.depthMask(false);
  gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  if(mode==='cur'||mode==='ring') gl.disable(gl.DEPTH_TEST);
  /* הרוח: בלילה מיזוג מוסיף (זוהרת), ביום מיזוג רגיל (נראית מול מים בהירים) */
  gl.uniform1f(FLOW.u('uK'),mode==='air'?(0.10+0.80*(1-nightF)):1.0);
  gl.drawArrays(gl.TRIANGLES,rng[0],rng[1]);
  gl.enable(gl.DEPTH_TEST);
  gl.depthMask(true); gl.disable(gl.BLEND);
  gl.disableVertexAttribArray(FLOW.a('aP')); gl.disableVertexAttribArray(FLOW.a('aA'));
}

function mix3(a,b,t){ return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]; }
var P={ dayZ:[0.165,0.423,0.706], dayH:[0.663,0.788,0.874],
        duskZ:[0.165,0.290,0.447], duskH:[0.878,0.514,0.290],
        nightZ:[0.012,0.031,0.078], nightH:[0.043,0.106,0.180],
        deepD:[0.024,0.157,0.243], shalD:[0.055,0.302,0.412],
        deepN:[0.008,0.063,0.110], shalN:[0.024,0.125,0.184],
        sunD:[1.0,0.957,0.863], sunK:[1.0,0.604,0.271], moon:[0.75,0.82,0.91] };
function smooth(a,b,x){ var t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); }

function resize(){ var w=C.clientWidth,h=C.clientHeight; if(!w||!h) return;
  var dpr=Math.min(window.devicePixelRatio||1,EXO.quality==='lite'?1:(EXO.dprMax||1.5)), W=Math.round(w*dpr), H=Math.round(h*dpr);
  if(C.width!==W||C.height!==H){ C.width=W; C.height=H; }
  gl.viewport(0,0,C.width,C.height); }

gl.enable(gl.DEPTH_TEST); gl.clearColor(0.02,0.06,0.09,1);
var tStart=performance.now();
var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var visible=true, cond=null, condAt=0, lastFrameT=0;

function drawMesh(m,model,col,zs,flat){
  gl.uniformMatrix4fv(SOLID.u('uM'),false,new Float32Array(model));
  gl.uniform3fv(SOLID.u('uCol'),col);
  gl.uniform1f(SOLID.u('uZS'),zs===undefined?1:zs);
  gl.uniform1f(SOLID.u('uFlat'),flat||0);
  var sp=SPEC.get(col); gl.uniform2f(SOLID.u('uSpec'),sp?sp[0]:0,sp?sp[1]:1);
  gl.bindBuffer(gl.ARRAY_BUFFER,m.p); gl.vertexAttribPointer(SOLID.a('aP'),3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,m.n); gl.vertexAttribPointer(SOLID.a('aN'),3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,m.i);
  gl.drawElements(gl.TRIANGLES,m.c,gl.UNSIGNED_SHORT,0);
}
function drawSail(m,model,tex,zs){
  gl.uniformMatrix4fv(SAILP.u('uM'),false,new Float32Array(model));
  gl.uniform1f(SAILP.u('uZS'),zs===undefined?1:zs);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,tex);
  gl.uniform1i(SAILP.u('uTex'),0);
  gl.bindBuffer(gl.ARRAY_BUFFER,m.p); gl.vertexAttribPointer(SAILP.a('aP'),3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,m.n); gl.vertexAttribPointer(SAILP.a('aN'),3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,m.uv); gl.vertexAttribPointer(SAILP.a('aUV'),2,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,m.i);
  gl.drawElements(gl.TRIANGLES,m.c,gl.UNSIGNED_SHORT,0);
}

var died=false;
function showErr(e){ if(died) return; died=true;
  var d=document.createElement('div'); d.className='fallback';
  d.textContent='ההדמיה נעצרה: '+(e&&e.message?e.message:String(e));
  C.parentNode.appendChild(d); }
function frame(){ try{ frameBody(); }catch(e){ showErr(e); } }

var lastDraw=0, MIN_DT=1000/32;
function frameBody(){
  if(!visible||EXO.paused){ requestAnimationFrame(frame); return; }
  var pNow=performance.now();
  if(!reduce && pNow-lastDraw<MIN_DT){ requestAnimationFrame(frame); return; }
  lastDraw=pNow;
  resize();
  var nowMs=clockNow(), t=reduce?12:(performance.now()-tStart)/1000;
  var dtF=Math.min(0.12,Math.max(0,t-lastFrameT)); lastFrameT=t;
  if(!cond||Math.abs(nowMs-condAt)>60000){ cond=pickCond(nowMs); condAt=nowMs; applyConditions(cond); emitState(cond,nowMs); }
  var c=cond;

  /* camera: orbit with momentum */
  if(camFly){ var ft=(pNow-camFly.t0)/camFly.dur;
    if(ft>=1){ cam.az=camFly.to; cam.el=camFly.el1; cam.tilt=camFly.tilt1; camFly=null; }
    else { var fe=ft*ft*(3-2*ft); cam.az=camFly.from+(camFly.to-camFly.from)*fe;
      cam.el=camFly.el0+(camFly.el1-camFly.el0)*fe; cam.tilt=camFly.tilt0+(camFly.tilt1-camFly.tilt0)*fe; } }
  if(cam.auto&&!reduce&&!camFly) cam.az+=0.0022;
  cam.az+=cam.vaz; cam.el=Math.max(-1.30,Math.min(1.50,cam.el+cam.vel));
  zoomAxisFrame(performance.now());
  /* הטבעת: נדלקת מהר, נשארת 800 מילישניות אחרי המגע האחרון, ודועכת בכשליש שנייה. מנורמל לזמן, לא לפריימים */
  var _rn=performance.now(), _rdt=Math.min(0.1,(_rn-(LAB._rhN||_rn))/1000); LAB._rhN=_rn;
  var _rT=((_rn-(LAB.ringHotT||-1e9))<800)?1:0, _rk=1-Math.pow(1-(_rT>LAB.ringHot?0.35:0.18),_rdt*60);
  LAB.ringHot+=(_rT-LAB.ringHot)*_rk; if(LAB.ringHot<0.002&&!_rT) LAB.ringHot=0;
  cam.vaz*=0.90; cam.vel*=0.90;
  if(Math.abs(cam.vaz)<1e-5) cam.vaz=0;
  if(Math.abs(cam.vel)<1e-5) cam.vel=0;

  var bodyY=waveY(0,0,t);
  /* תנוחת הסירה והמפרשים מחושבת מוקדם: מצלמת הסיפון והרוח שסביב המפרשים צריכות אותה */
  var hRad=BP.cog*D2R;
  var fx=Math.sin(hRad),fz=-Math.cos(hRad),sx=Math.cos(hRad),sz=Math.sin(hRad);
  var yB=waveY(fx*LOA/2,fz*LOA/2,t), yS=waveY(-fx*LOA/2,-fz*LOA/2,t), yP=waveY(sx*BEAM/2,sz*BEAM/2,t);
  var pTgt=Math.atan2(yB-yS,LOA)*0.74, rTgt=-Math.atan2(yP-(yB+yS)/2,BEAM/2)*0.60;
  var kLag=1-Math.exp(-dtF/0.85);
  LAB._pit=(LAB._pit===undefined)?pTgt:LAB._pit+(pTgt-LAB._pit)*kLag;
  LAB._rol=(LAB._rol===undefined)?rTgt:LAB._rol+(rTgt-LAB._rol)*kLag;
  var pitch=LAB._pit, roll=LAB._rol;
  var boatM=mMul(mMul(mMul(mTrans(0,(yB+yS)/2-0.12,0),mRotY(Math.PI/2-hRad)),mRotZ(pitch)),mRotX(roll));

  var rel=((c.windDir-BP.cog+540)%360)-180, twa=Math.abs(rel), sgn=rel>=0?1:-1;
  var boomA=Math.max(14,Math.min(84,twa*0.52))*D2R*sgn;
  var jibA=(twa>158?-1:1)*Math.max(10,Math.min(62,twa*0.42))*D2R*sgn;
  var flatS=c.wind<4?0.5:1;
  var mainM=mMul(mMul(boatM,mTrans(0.35,FREE+1.15,0)),mRotY(boomA));
  var yankM=mMul(mMul(boatM,mTrans(5.71,FREE+0.52,0)),mRotY(jibA));
  var stayM=mMul(mMul(boatM,mTrans(3.10,FREE+0.18,0)),mRotY(jibA));
  var jibM2=mMul(mMul(boatM,mTrans(4.90,FREE+0.34,0)),mRotY(jibA));
  var spinM=mMul(mMul(boatM,mTrans(6.05,FREE+0.30,0)),mRotY(jibA*0.78));
  var jibM =mMul(mMul(boatM,mTrans(5.70,FREE+0.46,0)),mRotY(jibA));
  /* what she is most likely carrying, from wind strength and angle */
  var plan=planFor(c,twa); lastPlan=plan;
  RIG.length=0;
  function rigAdd(M,foot,luff){ var l=Math.hypot(M[0],M[2])||1; RIG.push({M:M,foot:foot,luff:luff,y0:M[13],dx:-M[0]/l,dz:-M[2]/l}); }
  if(plan==='spin'){ rigAdd(mainM,4.3,9.9); rigAdd(spinM,6.1,11.2); }
  else if(plan==='heavy'){ rigAdd(mainM,4.0,7.4); rigAdd(jibM,2.5,6.4); }
  else { rigAdd(mainM,4.3,9.9); rigAdd(yankM,3.7,9.0); }
  /* ציר זום אחד: sD = כמה אנחנו על הסיפון (0 עד 1), gT = כמה התיישרנו למבט מלמעלה בדרך לגלובוס, gX = ההצלבה אל הגלובוס */
  var asp=C.width/C.height, sD=cam.u<0?smooth(0,1,-cam.u):0, gT=cam.u>U_MAX?smooth(0,1,(cam.u-U_MAX)/(U_TOP-U_MAX)):0;
  var gX=cam.u>U_XF?Math.min(1,(cam.u-U_XF)/(U_GLOBE-U_XF)):0, deck=sD>0.6;
  LAB.cam=deck?'deck':'orbit'; LAB.fov=cam.u<U_DECK?70+(cam.u-U_DECK)*32:70; LAB.ringK=1-gT;
  var fovO=(asp<0.8?60:46), fovy=(fovO+(LAB.fov-fovO)*sD)*D2R;
  var elO=cam.el+(1.50-cam.el)*gT, ce=Math.cos(elO), se=Math.sin(elO);
  var eyeO=[cam.r*ce*Math.sin(cam.az), cam.r*se+(2.2+bodyY*0.5)*(1-gT), cam.r*ce*Math.cos(cam.az)];
  var ty0=(EXO.view.ty===undefined?2.4:EXO.view.ty), lowF=Math.max(0,Math.min(1,(elO+0.35)/0.45));
  var ctr0=[0,(0.2+(ty0-0.2)*lowF)*(1-gT),0];
  var d0=norm3([ctr0[0]-eyeO[0],ctr0[1]-eyeO[1],ctr0[2]-eyeO[2]]);
  var rgt=norm3(cross3(d0,[0,1,0]));
  var dv=cam.tilt?rotAxis(d0,rgt,cam.tilt*D2R):d0;
  var eye=eyeO, dir=dv;
  if(sD>0){ var bb=-cam.az, pch=Math.max(-1.25,Math.min(1.35,-(cam.el-0.16)));
    var eyeD=xfm(boatM,-4.35,FREE+1.80,0.50), dirD=[Math.sin(bb)*Math.cos(pch),Math.sin(pch),-Math.cos(bb)*Math.cos(pch)];      /* z=0.50: הקוקפיט הצטמצם עם הרוחב האמיתי */
    eye=mix3(eyeO,eyeD,sD); dir=norm3(mix3(dv,dirD,sD)); }
  var ctr=[eye[0]+dir[0]*10,eye[1]+dir[1]*10,eye[2]+dir[2]*10];
  var under=eye[1]<waveY(eye[0],eye[2],t)+0.04;
  var VP=mMul(mTrans(EXO.view.ox,EXO.view.oy,0),mMul(mPersp(fovy,asp,sD>0.2?0.12:0.5,Math.max(2000,cam.r*14)),mLook(eye,ctr,[0,1,0])));
  var hfx=Math.atan(Math.tan(fovy/2)*asp); LAB._hfx=hfx;
  LAB._eye=eye; LAB._k=2*Math.tan(fovy/2)/Math.max(1,C.clientHeight); LAB._under=under; LAB._VP=VP;
  var rrT=ringFit(VP); rrT+=(14-rrT)*sD; if(!LAB._rrInit){ LAB.RR=rrT; LAB._rrInit=1; } else LAB.RR+=(rrT-LAB.RR)*0.2;
  var fwd=norm3([ctr[0]-eye[0],ctr[1]-eye[1],ctr[2]-eye[2]]);
  var right=norm3(cross3(fwd,[0,1,0])), upv=cross3(right,fwd);

  var sp=sunPos(nowMs,BP.lat,BP.lon), mp=moonPos(nowMs,BP.lat,BP.lon);
  lastSun=sp; lastMoon=mp;
  var sAlt=sp.alt*R2D, mAlt=mp.alt*R2D;
  var dayF=smooth(-6,7,sAlt), duskF=Math.exp(-Math.pow(sAlt/7.5,2)), nightF=1-dayF;
  var sunDir=dirVec(sp.az,sp.alt), moonDir=dirVec(mp.az,mp.alt);
  var zen=mix3(mix3(P.nightZ,P.dayZ,dayF),P.duskZ,duskF*0.75);
  var hor=mix3(mix3(P.nightH,P.dayH,dayF),P.duskH,duskF*0.30);
  var duskCol=[1.0,0.56,0.27], duskAmt=Math.min(1,duskF*1.05)*smooth(-14,-3,sAlt);
  var sunCol=mix3(P.sunD,P.sunK,duskF);
  var sunUp=smooth(-2.2,1.5,sAlt), moonUp=smooth(-1.5,4,mAlt);
  var mR=norm3(cross3(moonDir,[0,1,0])), mU=cross3(mR,moonDir);
  var WT=waterNow(c), cl=Math.max(0,Math.min(1,(c.cloud==null?LAB.cloud:c.cloud/100))), ov=cl*cl*0.80;
  var lumH=hor[0]*0.30+hor[1]*0.55+hor[2]*0.15; hor=mix3(hor,[lumH*0.92,lumH*0.95,lumH*1.0],ov);
  var lumZ=zen[0]*0.30+zen[1]*0.55+zen[2]*0.15; zen=mix3(zen,[lumZ*1.25,lumZ*1.30,lumZ*1.38],ov*0.9);
  var sunSea=sunUp*(1-0.88*cl*cl);
  var wDeep=mix3(WT.deepN,WT.deepD,dayF), wShal=mix3(WT.shalN,WT.shalD,dayF);
  var lumW=wDeep[0]*0.3+wDeep[1]*0.55+wDeep[2]*0.15; wDeep=mix3(wDeep,[lumW*0.95,lumW*1.0,lumW*1.05],ov*0.55);
  var wFog=[wDeep[0]*0.55+wShal[0]*0.45,wDeep[1]*0.55+wShal[1]*0.45,wDeep[2]*0.55+wShal[2]*0.45];
  var wUp=[wShal[0]*1.5+0.04*dayF,wShal[1]*1.5+0.10*dayF,wShal[2]*1.5+0.10*dayF];
  /* בדרך אל הגלובוס מסתכלים ישר למטה: מה שמעבר לקצה רשת הים מקבל את צבע הים, והרשת נמוגה אליו בערפל */
  if(gT>0&&!under){ var seaTop=[wDeep[0]*0.55+wShal[0]*0.45+zen[0]*0.10,wDeep[1]*0.55+wShal[1]*0.45+zen[1]*0.10,wDeep[2]*0.55+wShal[2]*0.45+zen[2]*0.10];
    hor=mix3(hor,seaTop,gT); zen=mix3(zen,seaTop,gT*0.92); }
  var fogCol=under?wFog:hor;

  gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

  gl.useProgram(SKY); gl.depthMask(false);
  gl.bindBuffer(gl.ARRAY_BUFFER,quadB);
  gl.enableVertexAttribArray(SKY.a('aP')); gl.vertexAttribPointer(SKY.a('aP'),2,gl.FLOAT,false,0,0);
  gl.uniform3fv(SKY.u('uFwd'),fwd); gl.uniform3fv(SKY.u('uRight'),right); gl.uniform3fv(SKY.u('uUp'),upv);
  gl.uniform3fv(SKY.u('uSunDir'),sunDir); gl.uniform3fv(SKY.u('uMoonDir'),moonDir);
  gl.uniform3fv(SKY.u('uMoonR'),mR); gl.uniform3fv(SKY.u('uMoonU'),mU);
  gl.uniform3fv(SKY.u('uZen'),under?wUp:zen); gl.uniform3fv(SKY.u('uHor'),under?wFog:hor); gl.uniform3fv(SKY.u('uSunCol'),sunCol);
  gl.uniform1f(SKY.u('uUnder'),under?1:0); gl.uniform1f(SKY.u('uUGlow'),sunUp*(1-0.7*cl));
  gl.uniform3f(SKY.u('uAbyss'),wDeep[0]*0.10,wDeep[1]*0.12,wDeep[2]*0.16);
  gl.uniform1f(SKY.u('uCloudOn'),cl>0.02?1:0); gl.uniform1f(SKY.u('uCloudTh'),0.485+0.118*probit(1-cl));
  var cwr=((c.windDir+180)%360)*D2R; gl.uniform2f(SKY.u('uCloudV'),-Math.sin(cwr),Math.cos(cwr));
  gl.uniform3fv(SKY.u('uDuskCol'),duskCol); gl.uniform1f(SKY.u('uDusk'),duskAmt); gl.uniform1f(SKY.u('uTime'),t);
  gl.uniform1f(SKY.u('uTanF'),Math.tan(fovy/2)); gl.uniform1f(SKY.u('uAsp'),asp);
  gl.uniform2f(SKY.u('uOff'),EXO.view.ox,EXO.view.oy);
  gl.uniform1f(SKY.u('uSunUp'),under?0:sunUp); gl.uniform1f(SKY.u('uNight'),under?0:nightF);
  gl.uniform1f(SKY.u('uMoonUp'),under?0:moonUp); gl.uniform1f(SKY.u('uIllum'),mp.illum);
  gl.uniform1f(SKY.u('uWax'),mp.waxing?1:0);
  var starsOn=(!under&&nightF>0.04&&starsInit()), liteQ=(EXO.quality==='lite');
  gl.uniform1f(SKY.u('uStarCat'),starsOn?1:0);
  /* שביל החלב נראה רק בשמיים חשוכים באמת: דמדומים, ירח (לפי החלק המואר והגובה) ואובך מוחקים אותו. במצב קל: בלי */
  var mwK=(starsOn&&!liteQ)?Math.pow(nightF,3)*Math.max(0,1-1.35*moonUp*mp.illum)*(1-0.6*cl):0;
  gl.uniform1f(SKY.u('uMW'),mwK); if(mwK>0){ var cr=celestialRot(nowMs); gl.uniformMatrix3fv(SKY.u('uCel'),false,new Float32Array([cr[0],cr[3],cr[6],cr[1],cr[4],cr[7],cr[2],cr[5],cr[8]])); }
  gl.drawArrays(gl.TRIANGLES,0,3);
  gl.disableVertexAttribArray(SKY.a('aP')); gl.depthMask(true);
  if(starsOn) drawStars(VP,eye,nowMs,t,nightF,moonUp,mp.illum,moonDir,cl,-Math.sin(cwr),Math.cos(cwr),C.width/Math.max(1,C.clientWidth));

  var lightDir,lightCol;
  if(sAlt>-3){ var k1=0.35+1.0*smooth(-3,12,sAlt); lightDir=sunDir;
    lightCol=[sunCol[0]*k1,sunCol[1]*k1,sunCol[2]*k1]; }
  else { var k2=0.10+0.35*moonUp*mp.illum; lightDir=dirVec(mp.az,Math.max(mp.alt,0.15));
    lightCol=[P.moon[0]*k2,P.moon[1]*k2,P.moon[2]*k2]; }
  var ambSky=[hor[0]*(0.34+0.55*dayF),hor[1]*(0.34+0.55*dayF),hor[2]*(0.34+0.55*dayF)];
  var ambGnd=[0.10+0.16*dayF,0.14+0.18*dayF,0.17+0.20*dayF];
  var fogD=under?0.024:(1.45/Math.max(30,(c.visKm==null?LAB.vis:Math.max(90,Math.min(300,c.visKm*120)))))*(1-0.45*gT);
  var lk=1-0.62*cl*cl; lightCol=[lightCol[0]*lk,lightCol[1]*lk,lightCol[2]*lk];
  ambSky=[ambSky[0]*(1+0.30*ov),ambSky[1]*(1+0.30*ov),ambSky[2]*(1+0.30*ov)];

  flowUploaded=false; buildFlow(c,t,dtF,eye,bodyY);

  gl.useProgram(SEA);
  gl.uniformMatrix4fv(SEA.u('uVP'),false,new Float32Array(VP));
  gl.uniform1f(SEA.u('uTime'),t);
  for(var wq=0;wq<NWV;wq++)
    gl.uniform4f(SEA.u('uW'+wq),wDir[wq][0],wDir[wq][1],wAmp[wq],wLen[wq]);
  gl.uniform4f(SEA.u('uSpA'),wSpd[0],wSpd[1],wSpd[2],wSpd[3]);
  gl.uniform4f(SEA.u('uSpB'),wSpd[4],wSpd[5],wSpd[6],0);
  gl.uniform4f(SEA.u('uStA'),wStp[0],wStp[1],wStp[2],wStp[3]);
  gl.uniform4f(SEA.u('uStB'),wStp[4],wStp[5],wStp[6],0);
  var wvr=((c.windDir+180)%360)*D2R;
  gl.uniform2f(SEA.u('uWindV'),Math.sin(wvr),-Math.cos(wvr));
  gl.uniform1f(SEA.u('uChop'),Math.min(1.15,0.30+c.wind/22));
  gl.uniform3fv(SEA.u('uSss'),mix3([0.03,0.09,0.10],[0.10,0.42,0.34],dayF));
  gl.uniform3fv(SEA.u('uDeep'),wDeep); gl.uniform1f(SEA.u('uUnder'),under?1:0);
  gl.uniform1f(SEA.u('uWaveK'),Math.max(0,Math.min(1,1-(cam.r-140)/420)));
  gl.uniform3fv(SEA.u('uShal'),wShal);
  gl.uniform3fv(SEA.u('uHor'),hor); gl.uniform3fv(SEA.u('uFogCol'),fogCol);
  gl.uniform3fv(SEA.u('uDuskCol'),duskCol); gl.uniform1f(SEA.u('uDusk'),duskAmt); gl.uniform3fv(SEA.u('uGlowDir'),sunDir);
  gl.uniform3fv(SEA.u('uSunDir'),lightDir); gl.uniform3fv(SEA.u('uSunCol'),sunCol);
  gl.uniform3fv(SEA.u('uEye'),eye);
  gl.uniform1f(SEA.u('uSunUp'),sunSea); gl.uniform1f(SEA.u('uFogD'),fogD);
  gl.uniform1f(SEA.u('uAmpMax'),ampMax); gl.uniform1f(SEA.u('uFoam'),foam);
  var hrS=BP.cog*D2R; gl.uniform4f(SEA.u('uHull'),Math.sin(hrS),-Math.cos(hrS),1.0,EXO.quality==='lite'?0.0:1.0);
  gl.enableVertexAttribArray(SEA.a('aP'));
  gl.bindBuffer(gl.ARRAY_BUFFER,seaPB); gl.vertexAttribPointer(SEA.a('aP'),2,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,seaIB);
  gl.drawElements(gl.TRIANGLES,seaCount,gl.UNSIGNED_SHORT,0);
  gl.disableVertexAttribArray(SEA.a('aP'));

  /* הזרם: מצויר מיד אחרי הים ולפני הסירה, בלי בדיקת עומק — רואים אותו דרך פני המים */
  if(!under){ drawRange(rngCur,'cur',VP,eye,fogCol,fogD,nightF); drawRange(rngRing,'ring',VP,eye,fogCol,fogD,nightF); }


  gl.useProgram(SOLID);
  gl.uniformMatrix4fv(SOLID.u('uVP'),false,new Float32Array(VP));
  gl.uniform3fv(SOLID.u('uLightDir'),lightDir); gl.uniform3fv(SOLID.u('uLightCol'),lightCol);
  gl.uniform3fv(SOLID.u('uAmbSky'),ambSky); gl.uniform3fv(SOLID.u('uAmbGnd'),ambGnd);
  gl.uniform3fv(SOLID.u('uFogCol'),fogCol); gl.uniform3fv(SOLID.u('uEye'),eye);
  gl.uniform1f(SOLID.u('uFogD'),fogD); gl.uniform1f(SOLID.u('uA'),1);
  gl.enableVertexAttribArray(SOLID.a('aP')); gl.enableVertexAttribArray(SOLID.a('aN'));

  drawMesh(M_BOTT, boatM, COL.bott);
  drawMesh(M_TOPS, boatM, COL.tops);
  drawMesh(M_DECK, boatM, COL.deckEdge);
  drawMesh(M_DECKO,boatM, COL.dkwhite);
  drawMesh(M_DECKF,boatM, COL.deck);
  drawMesh(M_SOLE, boatM, COL.teak);
  drawMesh(M_STEP, boatM, COL.teak);
  drawMesh(M_RAIL, boatM, COL.rail);
  drawMesh(M_TRUNK,boatM, COL.trunk);
  drawMesh(M_DODLIN,boatM, COL.dodgeIn);
  drawMesh(M_DODGE,boatM, COL.dodge);
  drawMesh(M_DODTRIM,boatM, COL.navy);
  drawMesh(M_HATCH,boatM, COL.hatch);
  drawMesh(M_COAM1,boatM, COL.rail);
  drawMesh(M_COAM2,boatM, COL.rail);
  drawMesh(M_MAST, boatM, COL.spar);
  drawMesh(M_SPRIT,mMul(mMul(boatM,mTrans(5.44,FREE+0.42,0)),mRotZ(Math.PI/2)),COL.timber);
  drawMesh(M_RIG,  boatM, COL.wire);
  drawMesh(M_SPREAD,boatM, COL.spar);
  if(plan==='spin'||plan==='heavy') drawMesh(M_FURL, mMul(mMul(boatM,mTrans(5.42,FREE+0.58,0)),mRotZ(Math.PI/2)), COL.tops);
  drawMesh(M_VANEP,boatM, COL.spar);
  drawMesh(M_VANE, mMul(mMul(mMul(boatM,mTrans(-5.62,FREE+0.62,0)),mRotZ(-0.16)),mRotY(Math.sin(t*0.37)*0.20+((c.windDir-BP.cog+540)%360-180)*D2R*0.10)), COL.vane);
  drawMesh(M_PADL, boatM, COL.bott);
  drawMesh(M_GENP, boatM, COL.spar);
  drawMesh(M_GEN,  boatM, COL.vane);
  drawMesh(M_BOOM, mMul(mMul(mainM,mTrans(-2.40,0,0)),mRotZ(Math.PI/2)),COL.spar);
  var detail=(EXO.quality!=='lite') && (cam.r<46 || sD<0.55);
  drawMesh(M_SEAMS,boatM, COL.seam);
  drawMesh(M_RUB,  boatM, COL.rail);
  if(detail){
    drawMesh(M_STEEL, boatM, COL.steel);
    drawMesh(M_JACK,  boatM, COL.jack);
    drawMesh(M_TEAKD, boatM, COL.rail);
    drawMesh(M_TILLER,boatM, COL.timber);
    drawMesh(M_DARK,  boatM, COL.solar);
    drawMesh(M_PORTS, boatM, COL.bronze);
    drawMesh(M_PORTG, boatM, COL.glass);
    drawMesh(M_RING,  boatM, COL.ring);
    drawMesh(M_RINGW, boatM, COL.tops);
    drawMesh(M_SLING, boatM, COL.tops);
    drawMesh(M_ROPE,  boatM, COL.dodge);
    drawMesh(M_CUSH,  boatM, COL.cush);
    if(plan!=='poled') drawMesh(M_POLE, mMul(mMul(boatM,mTrans(1.35,dY(1.35)+0.14,0.92)),mRotZ(Math.PI/2)), COL.spar);
  }

  /* דניאל, 1.78 מ׳: יושב על המושב הימני של הקוקפיט, פונה קדימה, יד שמאל על הטילר */
  if(sD<0.22){
  var sway=Math.sin(t*0.52)*0.030, lean=Math.sin(t*0.37+1.2)*0.022;
  var dM=mMul(mMul(mMul(boatM,mTrans(HELM_X,HELM_Y,HELM_Z)),mRotZ(lean)),mRotY(sway));
  drawMesh(CREW.tr, dM, COL.short);
  drawMesh(CREW.sh, dM, COL.tee);
  drawMesh(CREW.sk, dM, COL.skin);
  drawMesh(C_HEAD,  dM, COL.skin);
  drawMesh(C_HAIR,  dM, COL.hair);
  drawMesh(CREW.gl, dM, COL.shade);
  }

  gl.disableVertexAttribArray(SOLID.a('aP')); gl.disableVertexAttribArray(SOLID.a('aN'));

  drawWhale(t,dtF,eye,under,VP);

  /* sails, with her real flag and race number */
  gl.useProgram(SAILP);
  gl.uniformMatrix4fv(SAILP.u('uVP'),false,new Float32Array(VP));
  gl.uniform3fv(SAILP.u('uLightDir'),lightDir); gl.uniform3fv(SAILP.u('uLightCol'),lightCol);
  gl.uniform3fv(SAILP.u('uAmbSky'),ambSky); gl.uniform3fv(SAILP.u('uAmbGnd'),ambGnd);
  gl.uniform3fv(SAILP.u('uFogCol'),fogCol); gl.uniform3fv(SAILP.u('uEye'),eye);
  gl.uniform3fv(SAILP.u('uCol'),COL.sail); gl.uniform1f(SAILP.u('uFogD'),fogD);
  gl.uniform1f(SAILP.u('uFlat'),0); gl.uniform1f(SAILP.u('uTwo'),SAIL_FLIP);
  gl.enableVertexAttribArray(SAILP.a('aP')); gl.enableVertexAttribArray(SAILP.a('aN'));
  gl.enableVertexAttribArray(SAILP.a('aUV'));
  var mB=(boomA>=0), jB=(jibA>=0);                    /* הבטן לאותו צד שאליו יצא הבום או המפרש הקדמי */
  if(plan==='spin'){
    drawSail(mB?M_MAIN:M_MAINX, mainM, TEX_NUM, flatS);
    drawSail(jB?M_SPIN:M_SPINX, spinM, TEX_PLAIN, flatS);
  } else if(plan==='heavy'){
    drawSail(mB?M_MAINR:M_MAINRX, mainM, TEX_NUM, flatS);
    drawSail(jB?M_JIB:M_JIBX, jibM2, TEX_PLAIN, flatS);
  } else {
    drawSail(mB?M_MAIN:M_MAINX, mainM, TEX_NUM, flatS);
    drawSail(jB?M_STAY:M_STAYX, stayM, TEX_PLAIN, flatS);
    drawSail(jB?M_YANK:M_YANKX, yankM, TEX_PLAIN, flatS);
  }
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
  var enR=(((c.windDir+180)-BP.cog+540)%360-180)*D2R, enW=Math.min(1,c.wind/16);
  var enM=mMul(mMul(mMul(boatM,mTrans(-1.32,FREE+10.30,0)),mRotY(-enR+Math.sin(t*1.7)*0.09*enW)),mRotZ(-0.37+Math.sin(t*2.3+1.1)*0.05*enW));
  gl.uniform1f(SAILP.u('uTwo'),1); drawSail(M_ENSIGN, enM, TEX_FLAG, 1);
  gl.uniform1f(SAILP.u('uTwo'),0);
  drawSail(M_DECS, boatM, TEX_NAME, 1);
  drawSail(M_DECP, boatM, TEX_NAME, 1);
  drawSail(M_SEV7, boatM, TEX_SEVEN, 1);
  drawSail(M_SEV7P,boatM, TEX_SEVEN, 1);
  if(detail){ gl.uniform1f(SAILP.u('uTwo'),1);
    drawSail(M_CLOTHS,boatM, TEX_SPON, 1); drawSail(M_CLOTHP,boatM, TEX_SPON, 1);
    gl.uniform1f(SAILP.u('uTwo'),0); }
  gl.depthMask(true); gl.disable(gl.BLEND);
  gl.disableVertexAttribArray(SAILP.a('aP')); gl.disableVertexAttribArray(SAILP.a('aN'));
  gl.disableVertexAttribArray(SAILP.a('aUV'));

  if(under) drawRange(rngCur,'curU',VP,eye,fogCol,fogD,nightF);
  drawRange(rngSurf,'surf',VP,eye,fogCol,fogD,nightF);
  cabinGlow(boatM,eye,right,upv,nightF);
  navLight(boatM,eye,right,upv,nightF,hRad);
  drawRange(rngAir,'air',VP,eye,fogCol,fogD,nightF,navCol);

  /* מצב לפריים: לאן המצלמה מסתכלת (כיוון מצפן), כדי שהשושנה תצייר את הטריז */
  EXO.frame.camBearing=(((-cam.az*R2D)%360)+360)%360; EXO.frame.auto=cam.auto; EXO.frame.r=cam.r;
  EXO.frame.groundW=2*cam.r*Math.tan(hfx); EXO.frame.burst=LAB._burst||0;
  EXO.frame.u=cam.u; EXO.frame.sD=sD; EXO.frame.gT=gT; EXO.frame.gX=gX; EXO.frame.touching=Object.keys(pts).length>0;
  EXO.frame.under=under; EXO.frame.deck=deck; EXO.frame.el=cam.el; EXO.frame.pitch=pitch; EXO.frame.heave=bodyY;
  labAnchors(VP,t);
  for(var li=0;li<EXO._onFrame.length;li++) EXO._onFrame[li](EXO.frame);
  perfProbe(pNow);

  if(!reduce) requestAnimationFrame(frame);
}

/* ===== אור הניווט בראש התורן: תלת־צבעי, כמו בסירה אמיתית =====
   אדום לשמאל, ירוק לימין, לבן לירכתיים. נדלק עם רדת החשכה. נבנה בזנב מאגר הזרימה. */
var navCol=[1,1,1];
function navLight(boatM,eye,right,upv,nightF,hRad){
  if(nightF<0.04) return;
  var lx=0.35, ly=FREE+15.05, lz=0;
  var px=boatM[0]*lx+boatM[4]*ly+boatM[8]*lz+boatM[12],
      py=boatM[1]*lx+boatM[5]*ly+boatM[9]*lz+boatM[13],
      pz=boatM[2]*lx+boatM[6]*ly+boatM[10]*lz+boatM[14];
  var fx=Math.sin(hRad), fz=-Math.cos(hRad), ex=eye[0]-px, ez=eye[2]-pz, el=Math.hypot(ex,ez)||1;
  ex/=el; ez/=el;
  var dot=fx*ex+fz*ez, crs=fx*ez-fz*ex;                 /* crs>0: המצלמה מימין לסירה */
  var relA=Math.atan2(crs,dot)*R2D;
  navCol=Math.abs(relA)>112.5?[1.0,0.96,0.86]:(relA>0?[0.20,1.0,0.45]:[1.0,0.16,0.12]);
  var start=flowN, k, N=10, layers=[[0.16,1.0],[0.62,0.42],[2.3,0.13]];
  for(var L=0;L<layers.length;L++){ var s=layers[L][0], a=layers[L][1]*nightF;
    for(k=0;k<N;k++){ var a0=k/N*6.2831853, a1=(k+1)/N*6.2831853;
      fv(px,py,pz,a,5);
      fv(px+(right[0]*Math.cos(a0)+upv[0]*Math.sin(a0))*s, py+(right[1]*Math.cos(a0)+upv[1]*Math.sin(a0))*s, pz+(right[2]*Math.cos(a0)+upv[2]*Math.sin(a0))*s,0,5);
      fv(px+(right[0]*Math.cos(a1)+upv[0]*Math.sin(a1))*s, py+(right[1]*Math.cos(a1)+upv[1]*Math.sin(a1))*s, pz+(right[2]*Math.cos(a1)+upv[2]*Math.sin(a1))*s,0,5); } }
  gl.bindBuffer(gl.ARRAY_BUFFER,flowBuf);
  gl.bufferSubData(gl.ARRAY_BUFFER,start*20,flowArr.subarray(start*5,flowN*5));
  rngAir=[rngAir[0],flowN-rngAir[0]];
}

/* ===== מדידה אמיתית: אם 60 הפריימים הראשונים איטיים, יורדים דרגה לבד ===== */
var probe={n:0,sum:0,last:0,done:false};
function perfProbe(pNow){
  if(probe.done||reduce) return;
  if(probe.last){ var d=pNow-probe.last; if(d<400){ probe.n++; if(probe.n>20) probe.sum+=d; } }
  probe.last=pNow;
  if(probe.n>=80){ probe.done=true;
    var avg=probe.sum/60; EXO.frameMs=avg;
    if(avg>48&&EXO.quality==='full'&&!EXO.qualityLocked){ EXO.setQuality('lite',true); }
    else if(avg<20&&EXO.quality==='full'&&(window.devicePixelRatio||1)>1.5){ EXO.dprMax=2; resize(); } }
}

/* ===== המצב שהדף מצייר ממנו: שעון, שמיים, תנאים, מפרשים ===== */
function pad(n){ return (n<10?'0':'')+n; }
function nextFixTxt(nowMs){
  var d=new Date(nowMs), h=d.getUTCHours()+d.getUTCMinutes()/60, nx=new Date(nowMs);
  if(h<5.75) nx.setUTCHours(5,45,0,0);
  else if(h<17.75) nx.setUTCHours(17,45,0,0);
  else { nx.setUTCDate(nx.getUTCDate()+1); nx.setUTCHours(5,45,0,0); }
  return nx.getTime();
}
function emitState(c,nowMs){
  var loc=new Date(nowMs+BP.lon/15*3600000);
  var sp=sunPos(nowMs,BP.lat,BP.lon), mp=moonPos(nowMs,BP.lat,BP.lon), sAlt=sp.alt*R2D;
  var ev=sunEvents(nowMs,BP.lat,BP.lon);
  var rel=((c.windDir-BP.cog+540)%360)-180, twa=Math.abs(rel);
  function hm(ts){ if(!ts) return null; var x=new Date(ts+BP.lon/15*3600000);
    return pad(x.getUTCHours())+':'+pad(x.getUTCMinutes()); }
  EXO.state={
    now:nowMs, simulated:EXO.simulated, cond:c,
    localHM:pad(loc.getUTCHours())+':'+pad(loc.getUTCMinutes()),
    sun:{az:sp.az, alt:sAlt}, moon:{az:mp.az, alt:mp.alt*R2D, illum:mp.illum, waxing:mp.waxing},
    rise:ev.rise, set:ev.set, riseHM:hm(ev.rise), setHM:hm(ev.set),
    riseAz:ev.rise?sunPos(ev.rise,BP.lat,BP.lon).az:null, setAz:ev.set?sunPos(ev.set,BP.lat,BP.lon).az:null,
    sky: sAlt>6?'יום':sAlt>-0.5?'שמש על האופק':sAlt>-6?'דמדומים':sAlt>-12?'בין ערביים':'לילה',
    twa:twa, twaSide:rel>=0?1:-1,
    pointOfSail: twa>150?'גבית':twa>110?'רוח מלאה':twa>75?'בטן־רוח':twa>50?'קרוב מלא':'קרוב־רוח',
    sail:(SAILNAME&&SAILNAME[planFor(c,twa)])||'', gateBrg:GATE_BRG, nextFix:nextFixTxt(nowMs), quality:EXO.quality,
    windFromName:dirName(c.windDir)
  };
  for(var i=0;i<EXO._on.length;i++){ try{ EXO._on[i](EXO.state); }catch(e){} }
}
function dirName(d){
  var n=['מצפון','מצפון־מזרח','ממזרח','מדרום־מזרח','מדרום','מדרום־מערב','ממערב','מצפון־מערב'];
  return n[Math.round(((d%360)+360)%360/45)%8];
}

/* ===== steering ===== */
function clamp(v,a,b){ return v<a?a:v>b?b:v; }
function kick(){ if(reduce) requestAnimationFrame(frame); }
var camFly=null;
/* המצלמה מסתכלת אל כיוון מצפן b כאשר cam.az = −b */
function nearestAz(target){ var TAU=2*Math.PI, d=(((target-cam.az)%TAU)+TAU+Math.PI)%TAU-Math.PI; return cam.az+d; }
EXO.lookToward=function(bearing,opts){ opts=opts||{}; cam.auto=false; cam.vaz=cam.vel=0;
  camFly={ t0:performance.now(), dur:opts.dur||520, from:cam.az, to:nearestAz(-bearing*D2R),
           el0:cam.el, el1:(opts.el===undefined?cam.el:opts.el),
           tilt0:cam.tilt, tilt1:(opts.tilt===undefined?0:opts.tilt) };
  if(reduce){ cam.az=camFly.to; cam.el=camFly.el1; cam.tilt=camFly.tilt1; camFly=null; }
  kick(); };
EXO.setBearing=function(bearing){ camFly=null; cam.auto=false; cam.tilt=0; cam.vaz=0;
  cam.az=nearestAz(-bearing*D2R); kick(); };
EXO.setAuto=function(on){ cam.auto=!!on; if(on){ camFly=null; cam.tilt=0; } EXO.frame.auto=cam.auto; kick(); };
EXO.toggleAuto=function(){ EXO.setAuto(!cam.auto); return cam.auto; };
EXO.faceBody=function(which){ var b=(which==='moon')?lastMoon:lastSun; if(!b) return;
  EXO.lookToward(b.az,{ el:0.10, tilt:clamp(b.alt*R2D*0.9-2,-8,64), dur:700 }); };
EXO.home=function(){ EXO.lookToward((((-cam.az*R2D)%360)+360)%360,{el:0.26,tilt:0}); cam.r=homeR(); };
EXO.setLayer=function(name,on){ EXO.layers[name]=!!on; kick(); };
EXO.setQuality=function(q,auto){ EXO.quality=q; if(!auto) EXO.qualityLocked=true; resize();
  if(EXO.state){ EXO.state.quality=q; EXO.state.qualityAuto=!!auto;
    for(var i=0;i<EXO._on.length;i++){ try{ EXO._on[i](EXO.state); }catch(e){} } } kick(); };
/* צעד הגלגלת. הבסיס גדל מ-0.00135 ל-0.0019, ומעליו מאיץ שמזהה סיבוב רצוף.
   אותו מאיץ משרת גם את הגלובוס, כך שסיבוב אחד עובר את כל הציר בלי לאבד את התאוצה בהצלבה. */
var whT=0, whA=1;
function wheelStep(){ var n=performance.now(), d=n-whT; whT=n;
  if(d<90) whA=Math.min(3.2,whA*1.30); else if(d<230) whA=Math.min(3.2,whA*1.07); else whA=1;
  return 0.0019*whA; }
EXO.wheelStep=wheelStep;
EXO.zoomBy=function(f){ cam.r=clamp(cam.r*f,9,150); kick(); };
function homeR(){ return EXO.view.r||((C.clientWidth/Math.max(1,C.clientHeight))<0.8?27:23); }
EXO.reframe=function(){ if(cam.u===undefined||(cam.u>=0&&cam.u<=U_MAX)) cam.r=homeR(); kick(); };
EXO.glideTo=function(u,dur){ if(cam.u===undefined) cam.u=uOfR(cam.r); if(reduce||!dur){ setU(u,true); camGlide=null; } else camGlide={t0:performance.now(),dur:dur,from:cam.u,to:Math.max(U_FOV,Math.min(uCeil(),u))}; kick(); };
EXO.setU=function(u){ setU(u); kick(); };
/* ההמרה המלאה בין מרחק מצלמה ל-u, בשני חלקי הציר. הגלובוס משתמש בה כדי לחזור אל ההדמיה באותו קנה מידה. */
function uOfRFull(r){ return r<=150?uOfR(r):(U_MAX+Math.log(r/150)/2.4); }
EXO.zoomAxis={DECK:U_DECK,MAX:U_MAX,TOP:U_TOP,XF:U_XF,GLOBE:U_GLOBE,uOfR:uOfR,uOfRFull:uOfRFull,
  uOfW:function(w){ return uOfRFull(Math.max(1,w/(2*Math.tan(LAB._hfx||0.30)))); },
  wOfU:function(u){ return 2*rOfU(u)*Math.tan(LAB._hfx||0.30); }, K:2.4};
EXO.setCam=function(mode){ cam.auto=false; camFly=null; cam.tilt=0; cam.vaz=cam.vel=0;
  if(mode==='deck'){ cam.az=-BP.cog*D2R; cam.el=0.20; EXO.glideTo(U_DECK,1400); } else { cam.el=0.26; EXO.glideTo(uOfR(homeR()),1400); } kick(); };
EXO.dive=function(down){ LAB.cam='orbit'; EXO.lookToward((((-cam.az*R2D)%360)+360)%360,{el:down?-0.40:0.26,dur:1500}); };
EXO.setZoom=function(r){ setU(uOfR(clamp(r,9,150)),true); camGlide=null; kick(); };
EXO.setEl=function(v){ cam.el=v; kick(); };
/* הזזת השעון: התנאים, השמש, הירח והמפרשים נגזרים ממנו, ולכן די בלחשב מחדש פעם אחת ולשדר. */
EXO.setClock=function(off){ T_OFF=off||0; EXO.simulated=(T_OFF!==0);
  var n=clockNow(); cond=pickCond(n); condAt=n; applyConditions(cond); emitState(cond,n); kick(); };
EXO.clockOff=function(){ return T_OFF; };
EXO.kick=function(){ kick(); };
EXO.pause=function(on){ EXO.paused=!!on; if(!on) kick(); };
cam.r=homeR();

var pts={}, pinch0=0, r0=0, u0=0;
function pdist(){ var k=Object.keys(pts); if(k.length<2) return 0;
  return Math.hypot(pts[k[0]].x-pts[k[1]].x, pts[k[0]].y-pts[k[1]].y); }
C.addEventListener('pointerdown',function(e){
  pts[e.pointerId]={x:e.clientX,y:e.clientY};
  cam.auto=false; camFly=null; cam.tilt=0; C.classList.add('drag'); LAB.ringHotT=performance.now();
  if(Object.keys(pts).length===2){ pinch0=pdist(); r0=cam.r; u0=(cam.u===undefined?uOfR(cam.r):cam.u); }
  if(e.pointerType==='mouse'&&C.setPointerCapture) C.setPointerCapture(e.pointerId);
});
C.addEventListener('pointermove',function(e){
  if(!pts[e.pointerId]) return;
  var prev=pts[e.pointerId]; pts[e.pointerId]={x:e.clientX,y:e.clientY};
  var n=Object.keys(pts).length;
  if(n>=2){ var d=pdist(); if(pinch0>10&&d>10){ var uw=u0+Math.log(pinch0/d);
      if(uCeil()===U_MAX){ if(uw>U_MAX+0.36&&EXO.onZoomOut){ pinch0=0; EXO.onZoomOut(); } }
      else if(EXO.globeOwns){ if(EXO.onOver) EXO.onOver(uw-U_GLOBE); kick(); return; }      /* אחרי המסירה אותה צביטה נוהגת בגלובוס, פנימה והחוצה */
      setU(uw); } kick(); return; }
  var dx=e.clientX-prev.x, dy=e.clientY-prev.y;
  var sgD=1-2*(cam.u<0?smooth(0,1,-cam.u):0); LAB.ringHotT=performance.now();      /* על הסיפון הגרירה מסובבת את הראש; הסימן מתהפך בהדרגה, דרך אפס */
  cam.vaz=-dx*0.0035*sgD; cam.az+=cam.vaz;
  cam.vel=dy*0.0030*sgD; cam.el=clamp(cam.el+cam.vel,-1.30,1.50);
  kick();
});
function up(e){ delete pts[e.pointerId];
  if(Object.keys(pts).length<2) pinch0=0;
  if(!Object.keys(pts).length) C.classList.remove('drag'); }
/* הקשה כפולה על הסירה: מעבר לעמדת ההגאי. שתי הקשות תוך 340 מ"ש, קרוב זו לזו, וקרוב לסירה על המסך. */
var tapT=0, tapX=0, tapY=0;
function boatOnScreen(){ var VP=LAB._VP; if(!VP) return null;
  var n=project(VP,[0,FREE+1.6,0]); if(!n) return null;
  return [ (n[0]*0.5+0.5)*C.clientWidth, (0.5-n[1]*0.5)*C.clientHeight ]; }
function tapped(e){
  var now=performance.now(), x=e.clientX, y=e.clientY;
  if(now-tapT<340 && Math.hypot(x-tapX,y-tapY)<34 && cam.u>U_DECK+0.05 && cam.u<U_MAX+0.02){
    var b=boatOnScreen(), rad=Math.max(90,Math.min(C.clientWidth,C.clientHeight)*0.30);
    if(b && Math.hypot(x-b[0],y-b[1])<rad){ tapT=0; EXO.setCam(cam.u>0.75?'home':'deck'); return; } }
  tapT=now; tapX=x; tapY=y; }
C.addEventListener('pointerup',function(e){ if(Object.keys(pts).length<=1) tapped(e); });
C.addEventListener('pointerup',up);
C.addEventListener('pointercancel',up);
/* הגלגלת שייכת לגלילת הדף. זום: צביטה, או Ctrl/Shift + גלגלת */
C.addEventListener('wheel',function(e){
  if(cam.u===undefined) cam.u=uOfR(cam.r);
  if(uCeil()===U_MAX&&cam.u>=U_MAX-0.004&&e.deltaY>0&&EXO.onZoomOut) EXO.onZoomOut();
  var dz=e.deltaMode===1?e.deltaY*16:(e.deltaMode===2?e.deltaY*400:e.deltaY);
  setU(cam.u+clamp(dz,-180,180)*wheelStep());
  cam.auto=false; e.preventDefault(); kick();
},{passive:false});

if('IntersectionObserver' in window){
  new IntersectionObserver(function(en){ visible=en[0].isIntersecting;
    if(visible&&!reduce) requestAnimationFrame(frame); },{threshold:0.01}).observe(C);
}
window.addEventListener('resize',resize);
resize();
cond=pickCond(clockNow()); condAt=clockNow(); applyConditions(cond); emitState(cond,clockNow());
EXO.ready=true; EXO.astro={sunPos:sunPos,moonPos:moonPos,sunEvents:sunEvents,sunEcl:sunEcl,days:days};
frame(); C.classList.add('on');
setInterval(function(){ if(visible){ var n=clockNow(); emitState(pickCond(n),n); } },30000);
})();

