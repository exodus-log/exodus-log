(function(){
'use strict';
var C = document.getElementById('sea');
if (!C) return;

/* ===== deck.js — סצנת הסיפון =====
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

function pickCond(now){
  var best=COND[0], bi=0, i;
  for(i=0;i<COND.length;i++) if(Date.parse(COND[i][0]+'Z')<=now){ best=COND[i]; bi=i; }
  var nx=COND[Math.min(bi+1,COND.length-1)];
  var t0=Date.parse(best[0]+'Z'), t1=Date.parse(nx[0]+'Z');
  var f=(t1>t0)?Math.max(0,Math.min(1,(now-t0)/(t1-t0))):0;
  function L(a,b){return a+(b-a)*f;}
  function A(a,b){var d=((b-a+540)%360)-180;return (a+d*f+360)%360;}
  return { wind:L(best[1],nx[1]), gust:L(best[2],nx[2]), windDir:A(best[3],nx[3]),
           waveH:L(best[4],nx[4]), waveT:L(best[5],nx[5]), waveDir:A(best[6],nx[6]),
           cur:L(best[7],nx[7]), curDir:A(best[8],nx[8]),
           forecast: now>OBS_UNTIL, past: now>Date.parse(COND[COND.length-1][0]+'Z') };
}

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
var GATE_BRG=bearingTo(FIX.lat,FIX.lon,GATE[0],GATE[1]);
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
  '<div class="fallback">הדפדפן הזה לא מריץ WebGL, אז ההדמיה לא תוצג. כל השאר בעמוד זמין כרגיל.</div>');
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
  'float hash(vec3 p){ return fract(sin(dot(p,vec3(12.9898,78.233,45.164)))*43758.5453); }',
  'void main(){',
  ' vec3 r=normalize(uFwd+uRight*((vN.x-uOff.x)*uTanF*uAsp)+uUp*((vN.y-uOff.y)*uTanF));',
  ' float h=clamp(r.y*1.15+0.06,0.0,1.0);',
  ' vec3 c=mix(uHor,uZen,pow(h,0.62));',
  /* זוהר הזריחה והשקיעה יושב בצד של השמש, לא מסביב לכל האופק */
  ' vec2 rh=normalize(r.xz+vec2(1e-5)), sh2=normalize(uSunDir.xz+vec2(1e-5));',
  ' float side=pow(clamp(dot(rh,sh2)*0.5+0.5,0.0,1.0),3.0);',
  ' c=mix(c,uDuskCol,uDusk*side*pow(1.0-h,2.2));',
  ' if(uNight>0.01 && r.y>0.0){ vec3 g=r*170.0; vec3 q=floor(g); float s=hash(q);',
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
  ' float d=max(dot(r,uSunDir),0.0);',
  ' c+=uSunCol*pow(d,9.0)*0.30*uSunUp; c+=uSunCol*pow(d,90.0)*0.55*uSunUp;',
  ' c+=uSunCol*pow(d,7000.0)*10.0*uSunUp;',
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

var SEA=prog(['precision highp float; attribute vec2 aP; uniform mat4 uVP;',WAVE,
  'varying vec3 vW,vN; varying float vH; varying float vJ;',
  'void main(){ vec3 n; float fold; vec3 d=gerst(aP,n,fold);',
  ' vec3 p=vec3(aP.x+d.x,d.y,aP.y+d.z);',
  ' vW=p; vN=n; vH=d.y; vJ=fold; gl_Position=uVP*vec4(p,1.0);}'].join('\n'),
 ['precision highp float;',
  'uniform vec3 uDeep,uShal,uHor,uSunDir,uSunCol,uFogCol,uEye,uSss;',
  'uniform float uSunUp,uFogD,uAmpMax,uFoam,uChop,uDusk; uniform vec2 uWindV; uniform float uTime; uniform vec3 uDuskCol,uGlowDir;',
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
  ' col+=uSunCol*pow(max(dot(N,H),0.0),300.0)*1.9*uSunUp;',
  ' col+=uSunCol*pow(max(dot(N,H),0.0),22.0)*0.11*uSunUp;',
  /* whitecaps where the surface folds, broken up so they read as spray not paint */
  ' float fold=clamp((0.74-vJ)/0.74,0.0,1.0);',
  ' float fm=vn(vW.xz*1.15-uWindV*uTime*0.8);',
  ' float cap=smoothstep(0.12,0.60,fold*(0.32+uFoam*1.6)*(0.35+fm*1.1));',
  ' float crest=smoothstep(0.86,1.0,hn)*uFoam*0.34*(0.30+0.70*fm);',
  ' col=mix(col,vec3(0.93,0.965,0.985),clamp(cap+crest,0.0,0.92));',
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
 ['precision highp float; uniform vec3 uCw,uCc,uCs,uCh,uCv,uCl,uFogCol; uniform float uK;',
  'varying float vA; varying float vC; varying float vF;',
  'void main(){ vec3 c=vC<0.5?uCw:(vC<1.5?uCc:(vC<2.5?uCs:(vC<3.5?uCh:(vC<4.5?uCv:uCl))));',
  ' float A=vA*(1.0-vF*0.85); gl_FragColor=vec4(mix(c,uFogCol,clamp(vF,0.0,1.0))*A,A*(vC>4.5?0.0:uK));}'].join('\n'));

var SEG=((C.clientWidth||400)<560?96:140),SPAN=340,seaPos=[],seaIdx=[];
for(var gy=0;gy<=SEG;gy++) for(var gx=0;gx<=SEG;gx++) seaPos.push((gx/SEG-0.5)*SPAN,(gy/SEG-0.5)*SPAN);
for(var iy=0;iy<SEG;iy++) for(var ix=0;ix<SEG;ix++){ var a0=iy*(SEG+1)+ix,b0=a0+SEG+1;
  seaIdx.push(a0,b0,a0+1,a0+1,b0,b0+1); }
var seaPB=buf(seaPos), seaIB=buf(seaIdx,gl.ELEMENT_ARRAY_BUFFER,Uint16Array), seaCount=seaIdx.length;

/* ===== solid + textured-sail programs ===== */
var LIT=['uniform vec3 uCol,uLightDir,uLightCol,uAmbSky,uAmbGnd,uFogCol,uEye; uniform float uFogD,uFlat;'].join('\n');
var SOLID=prog(
 ['precision highp float; attribute vec3 aP,aN; uniform mat4 uVP,uM; uniform float uZS;',
  'varying vec3 vW,vN;',
  'void main(){ vec3 p=vec3(aP.x,aP.y,aP.z*uZS); vec4 w=uM*vec4(p,1.0); vW=w.xyz;',
  ' vN=mat3(uM[0].xyz,uM[1].xyz,uM[2].xyz)*aN; gl_Position=uVP*w;}'].join('\n'),
 ['precision highp float;',LIT,'varying vec3 vW,vN;',
  'void main(){ vec3 N=normalize(vN); float dl=dot(N,normalize(uLightDir));',
  ' float df=max(dl,0.0); float wr=dl*0.5+0.5;',
  ' vec3 amb=mix(uAmbGnd,uAmbSky,N.y*0.5+0.5)*(1.05+0.80*wr);',
  ' vec3 col=mix(uCol*(amb+uLightCol*df),uCol,uFlat);',
  ' float fg=1.0-exp(-pow(length(uEye-vW)*uFogD,2.0));',
  ' gl_FragColor=vec4(mix(col,uFogCol,clamp(fg,0.0,1.0)),1.0);}'].join('\n'));
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
var TEX_FLAG=flagTexture(), TEX_NUM=numberTexture(), TEX_NAME=nameTexture(), TEX_PLAIN=plainTexture();

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

var LOA=10.67, BEAM=3.99, FREE=1.02;
function hb(t){ return (BEAM/2)*Math.pow(Math.sin(Math.PI*Math.pow(t,1.05)),0.66); }
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
  if(hi>=0.999) for(i=0;i<NS-1;i++){ var q=i*NG+(NG-1),r=base+i*NG+(NG-1);
    idx.push(q,q+NG,r,r,q+NG,r+NG); }
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
  var NS=26, t0=0.175, t1=0.470, v0=0.605, v1=0.870, off=0.055;
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
function deckMesh(){
  var NS=34,NZ=8,p=[],idx=[],i,jj;
  for(i=0;i<NS-1;i++){
    var t0=i/(NS-1), t1=(i+1)/(NS-1);
    var x0=(t0-0.5)*LOA, x1=(t1-0.5)*LOA;
    var w0=hb(t0)*0.985, w1=hb(t1)*0.985;
    var y0=sheer(t0)-0.03, y1=sheer(t1)-0.03;
    for(jj=0;jj<NZ;jj++){
      var f0=jj/NZ*2-1, f1=(jj+1)/NZ*2-1;
      var xm=(x0+x1)/2, zm=(f0+f1)/2*((w0+w1)/2);
      if(xm>-4.65 && xm<-2.32 && Math.abs(zm)<0.92) continue;
      var b=p.length/3;
      p.push(x0,y0,f0*w0, x1,y1,f0*w1, x1,y1,f1*w1, x0,y0,f1*w0);
      idx.push(b,b+1,b+2,b,b+2,b+3); } }
  return mesh(p,idx); }
function trunkMesh(){
  var st=[[-2.05,1.08],[-1.0,1.12],[0.4,1.10],[1.5,1.00],[2.35,0.78],[2.75,0.50]];
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
  for(i=0;i<=N;i++){ var a=Math.PI*i/N, y=sheer(-0.15)+0.12+Math.sin(a)*0.62, z=-Math.cos(a)*1.16;
    p.push(-2.5,y,z, -1.55,y,z); }
  for(i=0;i<N;i++){ var b=i*2; idx.push(b,b+2,b+1, b+1,b+2,b+3); }
  return mesh(p,idx); }
function sphMesh(r,ox,oy,oz,sy,sz){ var NU=10,NV=7,p=[],idx=[],i,j;
  for(i=0;i<=NU;i++) for(j=0;j<=NV;j++){ var a=i/NU*Math.PI*2, b=j/NV*Math.PI;
    p.push(ox+r*(sz||1)*Math.sin(b)*Math.cos(a), oy+r*(sy||1)*Math.cos(b), oz+r*Math.sin(b)*Math.sin(a)); }
  for(i=0;i<NU;i++) for(j=0;j<NV;j++){ var q=i*(NV+1)+j, s2=q+NV+1; idx.push(q,s2,q+1,q+1,s2,s2+1); }
  return mesh(p,idx); }
function sailMesh(foot,luff,camber){
  var NU=12,NV=16,p=[],idx=[],uv=[],i,j;
  for(i=0;i<=NU;i++) for(j=0;j<=NV;j++){
    var u=i/NU,v=j/NV, chord=foot*(1-v)*(1+0.24*Math.sin(Math.PI*v));
    p.push(-chord*u, v*luff, Math.sin(Math.PI*Math.min(1,u+0.001))*Math.sin(Math.PI*v*0.88+0.16)*camber);
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
    M_KEEL=foilMesh([[1.95,-0.72],[0.55,-1.66],[-1.35,-1.76],[-2.30,-1.60],[-2.30,-0.86]],
                    function(y){return 0.115+0.145*Math.max(0,(y+1.8)/1.1);}),
    M_RUD=foilMesh([[-2.32,-1.68],[-3.02,-1.42],[-3.08,-0.56],[-2.32,-0.60]],function(){return 0.075;}),
    M_MAST=cylMesh(0.082,0.112,13.4,0.35,FREE+6.7,0),
    M_SPRIT=cylMesh(0.075,0.062,1.85,0,0,0), M_BOOM=cylMesh(0.058,0.058,4.4,0,0,0),
    M_HATCH=boxMesh(0.80,0.42,0.88,-2.75,FREE+0.26,0),
    M_COAM1=boxMesh(2.0,0.24,0.09,-3.35,FREE+0.17,-0.95),
    M_COAM2=boxMesh(2.0,0.24,0.09,-3.35,FREE+0.17,0.95),
    M_VANEP=boxMesh(0.06,0.95,0.06,-5.45,FREE+0.45,0),
    M_VANE=boxMesh(0.42,0.80,0.035,-5.62,FREE+1.05,0),
    M_PADL=boxMesh(0.12,1.00,0.30,-5.48,-0.42,0),
    M_GEN=cylMesh(0.16,0.16,0.22,-4.95,FREE+1.95,-0.75),
    M_GENP=cylMesh(0.05,0.05,1.9,-4.95,FREE+1.0,-0.75),
    M_DECK=deckMesh(), M_SOLE=boxMesh(2.30,0.07,1.84,-3.48,FREE-0.44,0),
    M_STEP=boxMesh(0.52,0.13,1.26,-2.58,FREE-0.15,0),
    M_DECS=decalMesh(1), M_DECP=decalMesh(-1),
    M_MAIN=sailMesh(4.3,9.9,0.55), M_MAINR=sailMesh(4.0,7.4,0.46),
    M_YANK=sailMesh(3.7,9.0,0.58), M_STAY=sailMesh(2.5,6.7,0.5),
    M_SPIN=sailMesh(6.1,11.2,1.10), M_JIB=sailMesh(2.5,6.4,0.40),
    D_LEG=cylMesh(0.075,0.062,0.86,0,0.43,0), D_HIP=boxMesh(0.30,0.24,0.36,0,0.97,0),
    D_TOR=cylMesh(0.175,0.190,0.56,0,1.22,0), D_SHO=boxMesh(0.20,0.14,0.44,0,1.52,0),
    D_COAT=boxMesh(0.26,0.50,0.09,0,1.24,0), D_ARM=cylMesh(0.052,0.046,0.60,0,0,0),
    D_NECK=cylMesh(0.052,0.052,0.11,0,1.62,0), D_HEAD=sphMesh(0.107,0,1.735,0,1.12,0.92),
    D_HAIR=sphMesh(0.118,0,1.762,0,0.92,0.96),
    M_ARROW=arrowMesh();

/* her real livery: white topsides, dark antifoul, varnished teak rail, that orange dodger */
var COL={ tops:[0.955,0.950,0.930], bott:[0.105,0.125,0.155], boot:[0.40,0.13,0.11],
          rail:[0.455,0.285,0.135], deck:[0.80,0.77,0.70], trunk:[0.875,0.855,0.805], teak:[0.46,0.30,0.15],
          dodge:[0.93,0.40,0.11], spar:[0.86,0.84,0.79], sail:[1,1,1],
          wind:[1.0,0.45,0.10], cur:[0.31,0.76,0.91],
          skin:[0.80,0.60,0.45], tee:[0.94,0.94,0.93], coat:[0.34,0.16,0.15],
          pant:[0.55,0.57,0.61], hair:[0.14,0.10,0.07] };
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
var MAXV=NWIND*TSEG*6+NCUR*CSEG*12+NSPRAY*6+NWAKE*12+NCHEV*48+900;
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
var rngCur=[0,0], rngSurf=[0,0], rngAir=[0,0];
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
function buildFlow(c,t,dt,eye,bodyY){
  flowN=0; rngCur=[0,0]; rngSurf=[0,0]; rngAir=[0,0];
  var i,p,ex,ey,ez,tl,sx,sy,sz,a,edge;
  var LY=EXO.layers, QF=(EXO.quality==='lite'?0.45:1);
  buildCurrent(c,t,dt,eye);           rngCur=[0,flowN];
  buildSurface(c,t,dt,eye);           rngSurf=[rngCur[1],flowN-rngCur[1]];
  var air0=flowN;
  /* --- wind: soft meandering ribbons, up in the air --- */
  if(LY.wind){
  var wt=(c.windDir+180)%360, wr=wt*D2R;
  var wx=Math.sin(wr), wz=-Math.cos(wr);
  var wspd=Math.max(0.6,c.wind*0.5144);
  var rw=0.021+wspd*0.0019;
  var wstep=0.44+wspd*0.058;
  var dens=Math.min(1,0.34+c.wind/24), nUse=Math.round(NWIND*dens*QF);
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
function buildCurrent(c,t,dt,eye){
  if(!EXO.layers.cur) return;
  var i,p,a, cr=c.curDir*D2R, cspd=Math.max(0.03,c.cur*0.5144);
  var n=Math.round(NCUR*(EXO.quality==='lite'?0.6:1));
  /* מהירות הזחילה מוגזמת פי כמה כדי שתיראה; היחס בין זרם חלש לחזק נשמר */
  var crawl=0.55+cspd*2.2;
  for(i=0;i<n;i++){ p=PC[i];
    p.age+=dt;
    var rr2=Math.sqrt(p.px*p.px+p.pz*p.pz);
    if(p.age>p.life||rr2>p.R){ seedC(p); rr2=Math.sqrt(p.px*p.px+p.pz*p.pz); }
    p.px+=Math.sin(cr)*crawl*dt; p.pz-=Math.cos(cr)*crawl*dt;
    var x=p.px, z=p.pz, k, tr=p.t; tr.n=CSEG+1;
    for(k=CSEG;k>=0;k--){ tr.x[k]=x; tr.z[k]=z; tr.y[k]=waveY(x,z,t)*0.55-p.dep;
      x-=Math.sin(cr)*0.95; z+=Math.cos(cr)*0.95; }
    var fade2=Math.min(1,p.age/2.0)*Math.min(1,(p.life-p.age)/2.6);
    var edg2=Math.min(1,2.4*(1-rr2/p.R));
    var dcam=Math.hypot(eye[0]-p.px,eye[2]-p.pz);
    a=(0.34+Math.min(0.26,c.cur*0.20))*fade2*edg2*(1-p.dep/3.6)*Math.max(0,Math.min(1,1.25-dcam/64)); if(a<0.012) continue;
    softDash(tr,eye,0.10+p.dep*0.04,a,1,i); }
}

/* --- פני המים: שברוני הסוול, הקו אל השער, קו החרטום והשובל --- */
function buildSurface(c,t,dt,eye){
  var i,p,a;
  if(EXO.layers.wave){
    /* השברונים נזרעים על פסגה של רכבת הסוול הראשית ונעים איתה במהירות הפאזה שלה,
       ולכן המרווח ביניהם הוא אורך הגל והקצב שבו הם עוברים הוא זמן המחזור האמיתי. */
    var d0=wDir[0], L=Math.max(wLen[0],9), cph=wSpd[0], k0=6.2831853/L;
    var nC=Math.round(NCHEV*(EXO.quality==='lite'?0.6:1));
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
      chevron(p.x,p.z,d0[0],d0[1],1.5+Math.min(2.2,c.waveH*0.75),a,t); }
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
  lane(GATE_BRG,90,0.27,0.70,2,true);      /* אל נקודת החובה הבאה: נקודות לבנות */
  lane(FIX.cog,58,0.16,0.62,3,false);      /* לאן החרטום מצביע: קו כתום רציף */

  /* --- her wake: two feathered strips, bright at the centreline --- */
  var hr=FIX.cog*D2R, bx=Math.sin(hr), bz=-Math.cos(hr);
  var kx=-bx, kz=-bz, jx=-kz, jz=kx;
  var spd=Math.min(1,FIX.sog/7.3);
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
  gl.uniform3f(FLOW.u('uCw'),1.00*dim,0.74*dim,0.42*dim);      /* רוח: ענבר */
  gl.uniform3f(FLOW.u('uCc'),0.16,0.78-0.25*nightF,0.80-0.22*nightF); /* זרם: טורקיז עמוק */
  gl.uniform3f(FLOW.u('uCs'),0.97,0.99,1.0);
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
  if(mode==='cur') gl.disable(gl.DEPTH_TEST);
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
  var dpr=Math.min(window.devicePixelRatio||1,EXO.quality==='lite'?1:1.5), W=Math.round(w*dpr), H=Math.round(h*dpr);
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
  if(!visible){ requestAnimationFrame(frame); return; }
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
  cam.az+=cam.vaz; cam.el=Math.max(0.045,Math.min(1.45,cam.el+cam.vel));
  cam.vaz*=0.90; cam.vel*=0.90;
  if(Math.abs(cam.vaz)<1e-5) cam.vaz=0;
  if(Math.abs(cam.vel)<1e-5) cam.vel=0;

  var bodyY=waveY(0,0,t);
  var ce=Math.cos(cam.el), se=Math.sin(cam.el);
  var eye=[cam.r*ce*Math.sin(cam.az), cam.r*se+2.2+bodyY*0.5, cam.r*ce*Math.cos(cam.az)];
  var ctr0=[0,(EXO.view.ty===undefined?2.4:EXO.view.ty),0];
  var d0=norm3([ctr0[0]-eye[0],ctr0[1]-eye[1],ctr0[2]-eye[2]]);
  var rgt=norm3(cross3(d0,[0,1,0]));
  var dv=cam.tilt?rotAxis(d0,rgt,cam.tilt*D2R):d0;
  var dist=Math.hypot(ctr0[0]-eye[0],ctr0[1]-eye[1],ctr0[2]-eye[2]);
  var ctr=[eye[0]+dv[0]*dist,eye[1]+dv[1]*dist,eye[2]+dv[2]*dist];
  var asp=C.width/C.height, fovy=(asp<0.8?60:46)*D2R;
  var VP=mMul(mTrans(EXO.view.ox,EXO.view.oy,0),mMul(mPersp(fovy,asp,0.5,2000),mLook(eye,ctr,[0,1,0])));
  var fwd=norm3([ctr[0]-eye[0],ctr[1]-eye[1],ctr[2]-eye[2]]);
  var right=norm3(cross3(fwd,[0,1,0])), upv=cross3(right,fwd);

  var sp=sunPos(nowMs,FIX.lat,FIX.lon), mp=moonPos(nowMs,FIX.lat,FIX.lon);
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

  gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

  gl.useProgram(SKY); gl.depthMask(false);
  gl.bindBuffer(gl.ARRAY_BUFFER,quadB);
  gl.enableVertexAttribArray(SKY.a('aP')); gl.vertexAttribPointer(SKY.a('aP'),2,gl.FLOAT,false,0,0);
  gl.uniform3fv(SKY.u('uFwd'),fwd); gl.uniform3fv(SKY.u('uRight'),right); gl.uniform3fv(SKY.u('uUp'),upv);
  gl.uniform3fv(SKY.u('uSunDir'),sunDir); gl.uniform3fv(SKY.u('uMoonDir'),moonDir);
  gl.uniform3fv(SKY.u('uMoonR'),mR); gl.uniform3fv(SKY.u('uMoonU'),mU);
  gl.uniform3fv(SKY.u('uZen'),zen); gl.uniform3fv(SKY.u('uHor'),hor); gl.uniform3fv(SKY.u('uSunCol'),sunCol);
  gl.uniform3fv(SKY.u('uDuskCol'),duskCol); gl.uniform1f(SKY.u('uDusk'),duskAmt); gl.uniform1f(SKY.u('uTime'),t);
  gl.uniform1f(SKY.u('uTanF'),Math.tan(fovy/2)); gl.uniform1f(SKY.u('uAsp'),asp);
  gl.uniform2f(SKY.u('uOff'),EXO.view.ox,EXO.view.oy);
  gl.uniform1f(SKY.u('uSunUp'),sunUp); gl.uniform1f(SKY.u('uNight'),nightF);
  gl.uniform1f(SKY.u('uMoonUp'),moonUp); gl.uniform1f(SKY.u('uIllum'),mp.illum);
  gl.uniform1f(SKY.u('uWax'),mp.waxing?1:0);
  gl.drawArrays(gl.TRIANGLES,0,3);
  gl.disableVertexAttribArray(SKY.a('aP')); gl.depthMask(true);

  var lightDir,lightCol;
  if(sAlt>-3){ var k1=0.35+1.0*smooth(-3,12,sAlt); lightDir=sunDir;
    lightCol=[sunCol[0]*k1,sunCol[1]*k1,sunCol[2]*k1]; }
  else { var k2=0.10+0.35*moonUp*mp.illum; lightDir=dirVec(mp.az,Math.max(mp.alt,0.15));
    lightCol=[P.moon[0]*k2,P.moon[1]*k2,P.moon[2]*k2]; }
  var ambSky=[hor[0]*(0.34+0.55*dayF),hor[1]*(0.34+0.55*dayF),hor[2]*(0.34+0.55*dayF)];
  var ambGnd=[0.10+0.16*dayF,0.14+0.18*dayF,0.17+0.20*dayF];
  var fogD=0.0048;

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
  gl.uniform3fv(SEA.u('uDeep'),mix3(P.deepN,P.deepD,dayF));
  gl.uniform3fv(SEA.u('uShal'),mix3(P.shalN,P.shalD,dayF));
  gl.uniform3fv(SEA.u('uHor'),hor); gl.uniform3fv(SEA.u('uFogCol'),hor);
  gl.uniform3fv(SEA.u('uDuskCol'),duskCol); gl.uniform1f(SEA.u('uDusk'),duskAmt); gl.uniform3fv(SEA.u('uGlowDir'),sunDir);
  gl.uniform3fv(SEA.u('uSunDir'),lightDir); gl.uniform3fv(SEA.u('uSunCol'),sunCol);
  gl.uniform3fv(SEA.u('uEye'),eye);
  gl.uniform1f(SEA.u('uSunUp'),sunUp); gl.uniform1f(SEA.u('uFogD'),fogD);
  gl.uniform1f(SEA.u('uAmpMax'),ampMax); gl.uniform1f(SEA.u('uFoam'),foam);
  gl.enableVertexAttribArray(SEA.a('aP'));
  gl.bindBuffer(gl.ARRAY_BUFFER,seaPB); gl.vertexAttribPointer(SEA.a('aP'),2,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,seaIB);
  gl.drawElements(gl.TRIANGLES,seaCount,gl.UNSIGNED_SHORT,0);
  gl.disableVertexAttribArray(SEA.a('aP'));

  /* הזרם: מצויר מיד אחרי הים ולפני הסירה, בלי בדיקת עומק — רואים אותו דרך פני המים */
  drawRange(rngCur,'cur',VP,eye,hor,fogD,nightF);

  var hRad=FIX.cog*D2R;
  var fx=Math.sin(hRad),fz=-Math.cos(hRad),sx=Math.cos(hRad),sz=Math.sin(hRad);
  var yB=waveY(fx*LOA/2,fz*LOA/2,t), yS=waveY(-fx*LOA/2,-fz*LOA/2,t), yP=waveY(sx*BEAM/2,sz*BEAM/2,t);
  var pitch=Math.atan2(yB-yS,LOA)*0.85, roll=-Math.atan2(yP-(yB+yS)/2,BEAM/2)*0.75;
  var boatM=mMul(mMul(mMul(mTrans(0,(yB+yS)/2-0.12,0),mRotY(Math.PI/2-hRad)),mRotZ(pitch)),mRotX(roll));

  var rel=((c.windDir-FIX.cog+540)%360)-180, twa=Math.abs(rel), sgn=rel>=0?1:-1;
  var boomA=Math.max(14,Math.min(84,twa*0.52))*D2R*sgn;
  var jibA=(twa>158?-1:1)*Math.max(10,Math.min(62,twa*0.42))*D2R*sgn;
  var flatS=c.wind<4?0.5:1;
  var mainM=mMul(mMul(boatM,mTrans(0.35,FREE+1.15,0)),mRotY(boomA));
  var yankM=mMul(mMul(boatM,mTrans(6.80,FREE+0.52,0)),mRotY(jibA));
  var stayM=mMul(mMul(boatM,mTrans(3.10,FREE+0.18,0)),mRotY(jibA));
  var spinM=mMul(mMul(boatM,mTrans(7.30,FREE+0.26,0)),mRotY(jibA*0.78));
  var jibM =mMul(mMul(boatM,mTrans(5.70,FREE+0.46,0)),mRotY(jibA));
  /* what she is most likely carrying, from wind strength and angle */
  var plan=planFor(c,twa); lastPlan=plan;

  gl.useProgram(SOLID);
  gl.uniformMatrix4fv(SOLID.u('uVP'),false,new Float32Array(VP));
  gl.uniform3fv(SOLID.u('uLightDir'),lightDir); gl.uniform3fv(SOLID.u('uLightCol'),lightCol);
  gl.uniform3fv(SOLID.u('uAmbSky'),ambSky); gl.uniform3fv(SOLID.u('uAmbGnd'),ambGnd);
  gl.uniform3fv(SOLID.u('uFogCol'),hor); gl.uniform3fv(SOLID.u('uEye'),eye);
  gl.uniform1f(SOLID.u('uFogD'),fogD);
  gl.enableVertexAttribArray(SOLID.a('aP')); gl.enableVertexAttribArray(SOLID.a('aN'));

  drawMesh(M_BOTT, boatM, COL.bott);
  drawMesh(M_TOPS, boatM, COL.tops);
  drawMesh(M_DECK, boatM, COL.deck);
  drawMesh(M_SOLE, boatM, COL.teak);
  drawMesh(M_STEP, boatM, COL.teak);
  drawMesh(M_RAIL, boatM, COL.rail);
  drawMesh(M_TRUNK,boatM, COL.trunk);
  drawMesh(M_DODGE,boatM, COL.dodge);
  drawMesh(M_HATCH,boatM, COL.deck);
  drawMesh(M_COAM1,boatM, COL.rail);
  drawMesh(M_COAM2,boatM, COL.rail);
  drawMesh(M_MAST, boatM, COL.spar);
  drawMesh(M_SPRIT,mMul(mMul(boatM,mTrans(6.08,FREE+0.42,0)),mRotZ(Math.PI/2)),COL.spar);
  drawMesh(M_VANEP,boatM, COL.spar);
  drawMesh(M_VANE, boatM, COL.deck);
  drawMesh(M_PADL, boatM, COL.bott);
  drawMesh(M_GENP, boatM, COL.spar);
  drawMesh(M_GEN,  boatM, COL.deck);
  drawMesh(M_BOOM, mMul(mMul(mainM,mTrans(-2.20,0,0)),mRotZ(Math.PI/2)),COL.spar);

  /* Daniel: 1.78 m, standing at the helm */
  var sway=Math.sin(t*0.62)*0.035;
  var dM=mMul(mMul(boatM,mTrans(-2.58,FREE-0.085,0)),mRotZ(sway));
  drawMesh(D_LEG, mMul(dM,mTrans(0,0,-0.10)), COL.pant);
  drawMesh(D_LEG, mMul(dM,mTrans(0,0, 0.10)), COL.pant);
  drawMesh(D_HIP, dM, COL.pant);
  drawMesh(D_TOR, dM, COL.tee);
  drawMesh(D_SHO, dM, COL.tee);
  drawMesh(D_COAT, mMul(dM,mTrans(0,0, 0.175)), COL.coat);
  drawMesh(D_COAT, mMul(dM,mTrans(0,0,-0.175)), COL.coat);
  drawMesh(D_COAT, mMul(mMul(dM,mTrans(-0.135,0,0)),mRotY(Math.PI/2)), COL.coat);
  drawMesh(D_ARM, mMul(mMul(mMul(dM,mTrans(0,1.44, 0.235)),mRotX(0.62)),mTrans(0,-0.30,0)), COL.coat);
  drawMesh(D_ARM, mMul(mMul(mMul(dM,mTrans(0,1.44,-0.235)),mRotX(-0.16)),mTrans(0,-0.30,0)), COL.coat);
  drawMesh(D_NECK, dM, COL.skin);
  drawMesh(D_HEAD, dM, COL.skin);
  drawMesh(D_HAIR, mMul(dM,mTrans(-0.012,0.030,0)), COL.hair);

  gl.disableVertexAttribArray(SOLID.a('aP')); gl.disableVertexAttribArray(SOLID.a('aN'));

  /* sails, with her real flag and race number */
  gl.useProgram(SAILP);
  gl.uniformMatrix4fv(SAILP.u('uVP'),false,new Float32Array(VP));
  gl.uniform3fv(SAILP.u('uLightDir'),lightDir); gl.uniform3fv(SAILP.u('uLightCol'),lightCol);
  gl.uniform3fv(SAILP.u('uAmbSky'),ambSky); gl.uniform3fv(SAILP.u('uAmbGnd'),ambGnd);
  gl.uniform3fv(SAILP.u('uFogCol'),hor); gl.uniform3fv(SAILP.u('uEye'),eye);
  gl.uniform3fv(SAILP.u('uCol'),COL.sail); gl.uniform1f(SAILP.u('uFogD'),fogD);
  gl.uniform1f(SAILP.u('uFlat'),0); gl.uniform1f(SAILP.u('uTwo'),SAIL_FLIP);
  gl.enableVertexAttribArray(SAILP.a('aP')); gl.enableVertexAttribArray(SAILP.a('aN'));
  gl.enableVertexAttribArray(SAILP.a('aUV'));
  if(plan==='spin'){
    drawSail(M_MAIN, mainM, TEX_NUM, flatS);
    drawSail(M_SPIN, spinM, TEX_FLAG, flatS);
  } else if(plan==='heavy'){
    drawSail(M_MAINR, mainM, TEX_NUM, flatS);
    drawSail(M_JIB, jibM, TEX_FLAG, flatS);
  } else {
    drawSail(M_MAIN, mainM, TEX_NUM, flatS);
    drawSail(M_STAY, stayM, TEX_PLAIN, flatS);
    drawSail(M_YANK, yankM, TEX_FLAG, flatS);
  }
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
  gl.uniform1f(SAILP.u('uTwo'),0);
  drawSail(M_DECS, boatM, TEX_NAME, 1);
  drawSail(M_DECP, boatM, TEX_NAME, 1);
  gl.depthMask(true); gl.disable(gl.BLEND);
  gl.disableVertexAttribArray(SAILP.a('aP')); gl.disableVertexAttribArray(SAILP.a('aN'));
  gl.disableVertexAttribArray(SAILP.a('aUV'));

  drawRange(rngSurf,'surf',VP,eye,hor,fogD,nightF);
  navLight(boatM,eye,right,upv,nightF,hRad);
  drawRange(rngAir,'air',VP,eye,hor,fogD,nightF,navCol);

  /* מצב לפריים: לאן המצלמה מסתכלת (כיוון מצפן), כדי שהשושנה תצייר את הטריז */
  EXO.frame.camBearing=(((-cam.az*R2D)%360)+360)%360; EXO.frame.auto=cam.auto; EXO.frame.r=cam.r;
  for(var li=0;li<EXO._onFrame.length;li++) EXO._onFrame[li](EXO.frame);
  perfProbe(pNow);

  if(!reduce) requestAnimationFrame(frame);
}

/* ===== אור הניווט בראש התורן: תלת־צבעי, כמו בסירה אמיתית =====
   אדום לשמאל, ירוק לימין, לבן לירכתיים. נדלק עם רדת החשכה. נבנה בזנב מאגר הזרימה. */
var navCol=[1,1,1];
function navLight(boatM,eye,right,upv,nightF,hRad){
  if(nightF<0.04) return;
  var lx=0.35, ly=FREE+13.55, lz=0;
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
    if(avg>48&&EXO.quality==='full'&&!EXO.qualityLocked){ EXO.setQuality('lite',true); } }
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
  var loc=new Date(nowMs+FIX.lon/15*3600000);
  var sp=sunPos(nowMs,FIX.lat,FIX.lon), mp=moonPos(nowMs,FIX.lat,FIX.lon), sAlt=sp.alt*R2D;
  var ev=sunEvents(nowMs,FIX.lat,FIX.lon);
  var rel=((c.windDir-FIX.cog+540)%360)-180, twa=Math.abs(rel);
  function hm(ts){ if(!ts) return null; var x=new Date(ts+FIX.lon/15*3600000);
    return pad(x.getUTCHours())+':'+pad(x.getUTCMinutes()); }
  EXO.state={
    now:nowMs, simulated:EXO.simulated, cond:c,
    localHM:pad(loc.getUTCHours())+':'+pad(loc.getUTCMinutes()),
    sun:{az:sp.az, alt:sAlt}, moon:{az:mp.az, alt:mp.alt*R2D, illum:mp.illum, waxing:mp.waxing},
    rise:ev.rise, set:ev.set, riseHM:hm(ev.rise), setHM:hm(ev.set),
    riseAz:ev.rise?sunPos(ev.rise,FIX.lat,FIX.lon).az:null, setAz:ev.set?sunPos(ev.set,FIX.lat,FIX.lon).az:null,
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
EXO.zoomBy=function(f){ cam.r=clamp(cam.r*f,9,150); kick(); };
function homeR(){ return EXO.view.r||((C.clientWidth/Math.max(1,C.clientHeight))<0.8?27:23); }
EXO.reframe=function(){ cam.r=homeR(); kick(); };
cam.r=homeR();

var pts={}, pinch0=0, r0=0;
function pdist(){ var k=Object.keys(pts); if(k.length<2) return 0;
  return Math.hypot(pts[k[0]].x-pts[k[1]].x, pts[k[0]].y-pts[k[1]].y); }
C.addEventListener('pointerdown',function(e){
  pts[e.pointerId]={x:e.clientX,y:e.clientY};
  cam.auto=false; camFly=null; cam.tilt=0; C.classList.add('drag');
  if(Object.keys(pts).length===2){ pinch0=pdist(); r0=cam.r; }
  if(e.pointerType==='mouse'&&C.setPointerCapture) C.setPointerCapture(e.pointerId);
});
C.addEventListener('pointermove',function(e){
  if(!pts[e.pointerId]) return;
  var prev=pts[e.pointerId]; pts[e.pointerId]={x:e.clientX,y:e.clientY};
  var n=Object.keys(pts).length;
  if(n>=2){ var d=pdist(); if(pinch0>10&&d>10) cam.r=clamp(r0*pinch0/d,9,150); kick(); return; }
  var dx=e.clientX-prev.x, dy=e.clientY-prev.y;
  cam.vaz=-dx*0.0035; cam.az+=cam.vaz;
  /* במגע, גרירה אנכית שייכת לגלילת הדף (touch-action: pan-y); בעכבר היא מטה את המבט */
  if(e.pointerType==='mouse'){ cam.vel=dy*0.0030; cam.el=clamp(cam.el+cam.vel,0.045,1.45); }
  kick();
});
function up(e){ delete pts[e.pointerId];
  if(Object.keys(pts).length<2) pinch0=0;
  if(!Object.keys(pts).length) C.classList.remove('drag'); }
C.addEventListener('pointerup',up);
C.addEventListener('pointercancel',up);
/* הגלגלת שייכת לגלילת הדף. זום: צביטה, או Ctrl/Shift + גלגלת */
C.addEventListener('wheel',function(e){
  if(!e.ctrlKey&&!e.shiftKey) return;
  cam.r=clamp(cam.r+e.deltaY*0.05,9,150); cam.auto=false; e.preventDefault(); kick();
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

