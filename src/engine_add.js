
/* ===================== תוספות הגרסה במסך מלא =====================
   נכנסות ל-v2/deck.js בזמן הבנייה. assets/deck.js של הדף הקודם לא משתנה. */
/* ---------- ציר זום אחד (מנה ב׳) ----------
   u הוא המשתנה היחיד. 0 עד U_MAX: מסלול סביב הסירה, 9 עד 150 מטר (לוגריתמי, כמו קודם). 0 עד ‎−1: המצלמה מחליקה אל עמדת
   ההגאי. ‎−1 עד ‎−2: על הסיפון, הצביטה משנה רק את שדה הראייה (70° עד 38°). U_MAX עד U_TOP: המצלמה מתיישרת למבט מלמעלה
   ומתרחקת מהר. U_TOP עד U_GLOBE: הצלבה אל הגלובוס, שמונעת מהצביטה עצמה. cam.r נגזר מ-u; מי שכותב ל-cam.r ישירות מתורגם. */
var U_FOV=-2, U_DECK=-1, U_MAX=Math.log(150/9), U_TOP=U_MAX+0.55, U_GLOBE=U_MAX+0.95, zoomT=0, camGlide=null;
function rOfU(u){ return u>=0?9*Math.exp(Math.min(u,U_MAX)+Math.max(0,u-U_MAX)*2.4):9*Math.max(0,1+u); }
function uOfR(r){ return r>=9?Math.log(r/9):(r/9-1); }
function uCeil(){ return (!reduce&&EXO.globeReady&&EXO.quality!=='lite')?U_GLOBE:U_MAX; }
function setU(u,quiet){ if(cam.u===undefined) cam.u=uOfR(cam.r);
  u=Math.max(U_FOV,Math.min(uCeil(),u));
  /* מתקרבים אל הסיפון: המבט מתיישר בהדרגה אל האופק, כדי לא להגיע להגה כשמסתכלים על הרצפה */
  /* והוא פונה בהדרגה אל החרטום: מגיעים להגה כשמסתכלים קדימה, כמו מי שעומד שם */
  if(!quiet&&u<cam.u&&cam.u<0.35&&u>U_DECK-0.01){ var k=Math.min(1,(cam.u-u)*1.4); cam.el+=(0.20-cam.el)*k; cam.az+=(nearestAz(-FIX.cog*D2R)-cam.az)*k; }
  if(u>cam.u&&u>U_MAX&&cam.u<U_XF){ var a0=Math.max(cam.u,U_MAX), kN=Math.min(1,(u-a0)/Math.max(1e-4,U_XF-a0)); cam.az+=(nearestAz(0)-cam.az)*kN; cam.vaz=0; }
  cam.u=u; cam.r=cam._r=rOfU(u); if(!quiet){ zoomT=performance.now(); camGlide=null; } }
function zoomAxisFrame(now){
  if(cam.u===undefined||cam.r!==cam._r){ cam.u=uOfR(Math.max(0.01,cam.r)); cam._r=cam.r; }
  var dt=Math.min(0.1,(now-(cam._zn||now))/1000); cam._zn=now;
  if(camGlide){ var f=(now-camGlide.t0)/camGlide.dur; if(f>=1){ cam.u=camGlide.to; camGlide=null; } else { f=f*f*(3-2*f); cam.u=camGlide.from+(camGlide.to-camGlide.from)*f; } }
  else if(cam.u>U_TOP+1e-3&&cam.u<U_GLOBE-1e-3&&!Object.keys(pts).length&&now-zoomT>320){      /* לא נשארים באמצע ההצלבה */
    var dir=((cam.u-U_TOP)/(U_GLOBE-U_TOP)>0.45)?1:-1; cam.u=Math.max(U_TOP,Math.min(U_GLOBE,cam.u+dir*1.5*dt)); }
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
  var i,k,p, nx=-wz, nz=wx, hr=FIX.cog*D2R, bfx=Math.sin(hr), bfz=-Math.cos(hr), cx=bfx*1.5, cz=bfz*1.5;
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
  if(LAB.lines!=='water'){ var H=FIX.cog, qh=rp(R,H), uh=pxAt(qh[0],qh[1]);
    var am=(0.05+0.95*hot)*RK;                     /* הסמלים דועכים יחד עם השנתות */
    bseg(rp(R-15*uh,H,-2.6*uh),rp(R+11*uh,H,-2.6*uh),1.8,am,am,6,t); bseg(rp(R-15*uh,H,2.6*uh),rp(R+11*uh,H,2.6*uh),1.8,am,am,6,t);
    /* היעד הבא: מעוין על המעגל */
    var G=GATE_BRG, qg=rp(R,G), ug=pxAt(qg[0],qg[1]);
    wtri(rp(R+10*ug,G),rp(R,G,-6.5*ug),rp(R,G,6.5*ug),am,6,t); wtri(rp(R-10*ug,G),rp(R,G,6.5*ug),rp(R,G,-6.5*ug),am,6,t); }
  var LY=EXO.layers, hk=(0.05+0.95*hot)*RK;
  /* רוח: מצביע על המעגל + נוצת רוח. מוט לכיוון שאליו הרוח נושבת, נוצה מלאה = 10 קשר, חצי = 5, דגלון = 50.
     הנוצות פונות אל הלחץ הנמוך: בחצי הכדור הצפוני עם כיוון השעון, בדרומי נגדו. */
  if(LY.wind){ var W=c.windDir, qw=rp(R,W), uw=pxAt(qw[0],qw[1]), side=(FIX.lat>=0?1:-1);
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
  put('gate',R-30*us,GATE_BRG,false,-8*us); put('cog',R-30*us,FIX.cog,false,30*us); put('beacon',1400,GATE_BRG,true);
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
