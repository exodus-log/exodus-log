
/* ===================== שמיים אמיתיים (מנה ג׳, סעיף 5) =====================
   נכנס ל-v2/deck.js בזמן הבנייה, אחרי engine_add.js.
   כוכבים: קטלוג הכוכבים הבהירים של ייל (assets/v2/stars.js, נטען אחרי הפריים הראשון), מצוירים כנקודות בשכבה משלהם,
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
  var d=days(nowMs), lst=(((18.697374558+24.06570982441908*d)%24)*15+FIX.lon)*D2R, sL=Math.sin(lst), cL=Math.cos(lst), la=FIX.lat*D2R, sp=Math.sin(la), cp=Math.cos(la);
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
