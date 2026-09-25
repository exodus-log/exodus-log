
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
  var hr=FIX.cog*D2R, bfx=Math.sin(hr), bfz=-Math.cos(hr);
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
/* 24.9 (רשימת הממשק, סעיף 9): מעל המים הזרם כמעט לא נראה — סרט אחד, מטר מתחת לפני הים, שפונה אל המצלמה ("עומד").
   עכשיו, כשמסתכלים מעל המים, החיצים שוכבים על פני הים, מקבילים להם, עבים וברורים יותר. מתחת למים — כמו קודם */
var CUR_FLAT=false;
function curStroke(ax,ay,az,bx,by,bz,eye,w,a,sh){                 /* קטע עבה שפונה אל המצלמה, עם קצה מעוגל ב-b */
  var dx=bx-ax, dy=by-ay, dz=bz-az, ex=eye[0]-ax, ey=eye[1]-ay, ez=eye[2]-az;
  var cx=dy*ez-dz*ey, cy=dz*ex-dx*ez, cz=dx*ey-dy*ex; if(CUR_FLAT){ cx=-dz; cy=0; cz=dx; }      /* שוכב: הרוחב אופקי */
  var cl=Math.sqrt(cx*cx+cy*cy+cz*cz); if(cl<1e-6) return;
  cx*=w/cl; cy*=w/cl; cz*=w/cl; if(!CUR_FLAT&&cy<0){ cx=-cx; cy=-cy; cz=-cz; }                     /* c מצביע תמיד כלפי מעלה */
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
    var cx=dy*ez-dz*ey, cy=dz*ex-dx*ez, cz=dx*ey-dy*ex; if(CUR_FLAT){ cx=-dz; cy=0; cz=dx; }
    var cl=Math.sqrt(cx*cx+cy*cy+cz*cz); if(cl<1e-6){ have=false; continue; }
    var wk=w*(0.22+0.78*Math.pow(f,0.6))/cl; cx*=wk; cy*=wk; cz*=wk;
    if(have?(cx*lx+cy*ly+cz*lz<0):(!CUR_FLAT&&cy<0)){ cx=-cx; cy=-cy; cz=-cz; }            /* הצד הבהיר נשאר באותו צד לאורך כל הסרט */
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
  var crawl=cspd; CUR_FLAT=!under;
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
      tr.x[k]=x+cnx*so; tr.z[k]=z+cnz*so; tr.y[k]=CUR_FLAT?(waveY(x,z,t)+0.06):(waveY(x,z,t)*0.55*wy-dep+0.10*Math.sin(k*0.55+p.ph*2.0)*straight);
      x-=fxd*0.95; z-=fzd*0.95; }
    var fade2=Math.min(1,p.age/2.0)*Math.min(1,(p.life-p.age)/2.6), edg2=Math.min(1,2.4*(1-rr2/p.R));
    var dcam=Math.hypot(eye[0]-p.px,eye[2]-p.pz);
    var base=(under?[0.60,0.50,0.40][ly]:0.62)*(0.46+0.54*str)*gain;
    var d3=Math.sqrt(dcam*dcam+(eye[1]-(-dep))*(eye[1]-(-dep)));
    a=base*fade2*edg2*Math.max(0,Math.min(1,1.25-dcam/(under?52:64)))*sst(2.5,7.0,d3); if(a<0.012) continue;      /* סרט שעובר ממש מול העין נמוג */
    var hw=(0.125+0.090*h1(i*3.9))*(1+0.10*ly)*(0.78+0.22*str)*thin*(CUR_FLAT?2.0:1), sh=[0.0,0.42,0.80][ly];   /* חצי עובי: כ-0.18 עד 0.30 מ' עובי מלא */
    curRibbon(tr,eye,hw,a,sh);
    /* הראש קטן ודק מהגוף. קודם הוא היה עבה ממנו, ושתי הזרועות נפגשו באותו פיקסל — ובמיזוג מצטבר
       הן הכפילו את עצמן והראש יצא כתם מלא במקום חץ. */
    var hx=tr.x[CSEG], hy=tr.y[CSEG], hz=tr.z[CSEG], HL=(0.70+0.95*str)+hw*2.2, HWd=(0.50+0.55*str)+hw*1.6, tx=hx+fxd*0.55, tz=hz+fzd*0.55;
    /* הראש: חץ פתוח. הזרועות במישור האופקי כשמסתכלים מלמעלה, ובמישור האנכי כשמסתכלים מהצד, כך שהוא נקרא מכל זווית */
    var vy=Math.abs(eye[1]-hy), vh=Math.hypot(eye[0]-hx,eye[2]-hz), kv=CUR_FLAT?1:sst(0.35,1.1,vy/Math.max(0.5,vh));
    var ox=cnx*HWd*kv, oz=cnz*HWd*kv, oy=HWd*(1-kv);
    curStroke(hx,hy,hz,tx,hy,tz,eye,hw*0.85,a*0.9,sh);
    curStroke(tx-fxd*HL+ox,hy+oy,tz-fzd*HL+oz,tx,hy,tz,eye,hw*0.62,a*0.72,sh);
    curStroke(tx-fxd*HL-ox,hy-oy,tz-fzd*HL-oz,tx,hy,tz,eye,hw*0.62,a*0.72,sh); }
  CUR_FLAT=false; }
