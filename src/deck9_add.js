
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
var M_SEV7=panelOnHull(1,0.503,0.552,0.585,0.900,0.055), M_SEV7P=panelOnHull(-1,0.503,0.552,0.585,0.900,0.055);

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
