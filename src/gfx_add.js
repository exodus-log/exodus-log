
/* ================= שדרוג הגרפיקה, 24.9.2026 (gfx_add.js) =================
   מה שהעין רואה: הים, השמיים, הסירה. לא נוגע בשכבות המידע (הרוח, הזרם, הטבעת) — הן נשארות בצבעים שלהן.

   ---- דרגות איכות ----
   0 = "קל" (EXO.quality==='lite', כמו שהיה); 1 = אמצעית (מה שהיה "מלא", ועוד השדרוגים הזולים); 2 = גבוהה (הכבדים).
   פתיחה: טלפון/טאבלט (מגע) בדרגה 1, מחשב בדרגה 2. ב-70 הפריימים הראשונים הקצב לא מוגבל ל-32 (אלא אם כבר שמונת
   הראשונים איטיים מ-30 מ"ש — אז אין מה לבדוק), ומודדים כמה המכשיר
   באמת מספיק: 54 פריימים בשנייה ומעלה בדרגה 1 → עולים ל-2. אחר כך, כל הזמן: ממוצע של 60 פריימים מעל 41 מ"ש
   (פחות מ-24 בשנייה) → יורדים דרגה, ולא עולים שוב. ?q=0|1|2 קובע דרגה ונועל. ?fps=1 מציג מונה פינתי. */
var GFX=EXO.gfx={ tier:1, auto:true, fps:0, ms:0, probe:true, noUp:false };
(function(){
  var m=/[?&]q=([012])(?:&|$)/.exec(location.search);
  var coarse=!!(window.matchMedia&&matchMedia('(pointer: coarse)').matches);
  if(m){ GFX.tier=+m[1]; GFX.auto=false; } else GFX.tier=coarse?1:2;
  if(GFX.tier===0) EXO.quality='lite';
  EXO.tier=GFX.tier;
})();
function setTier(n,why){ n=Math.max(0,Math.min(2,n)); if(n===GFX.tier) return;
  var was=GFX.tier; GFX.tier=EXO.tier=n; GFX.why=why||'';
  if(n===0&&EXO.quality!=='lite'){ EXO.setQuality('lite',true); return; }
  if(n>0&&EXO.quality==='lite') EXO.quality='full';
  if(n<2&&EXO.dprMax>1.5) EXO.dprMax=1.5;
  if(was<2&&n===2&&GFX.onTier2) GFX.onTier2();
  resize(); }
EXO.setTier=function(n){ GFX.auto=false; setTier(n,'ידני'); kick(); };

/* המדידה — מחליפה את perfProbe הישן (שם הקצב היה מוגבל ל-32, ולכן "מתחת ל-20 מ"ש" לא יכול היה לקרות) */
var GP={ n:0, last:0, win:[], cool:0, cnt:0, t1:0 };
function gfxProbe(pNow){
  var d=GP.last?pNow-GP.last:0; GP.last=pNow;
  if(d>0&&d<2000){ GP.win.push(d); if(GP.win.length>90) GP.win.shift(); }
  GP.cnt++; if(!GP.t1) GP.t1=pNow;
  if(pNow-GP.t1>=500){ GFX.fps=GP.cnt*1000/(pNow-GP.t1); GP.cnt=0; GP.t1=pNow;
    var s=0,i; for(i=0;i<GP.win.length;i++) s+=GP.win[i]; GFX.ms=GP.win.length?s/GP.win.length:0; fpsPaint(); }
  if(reduce) { GFX.probe=false; return; }
  if(GFX.probe){ GP.n++;
    /* מכשיר שכבר בפריימים הראשונים איטי מ-30 מ"ש לא יעלה דרגה בכל מקרה: מפסיקים לבדוק מיד, וחוזרים לתקרה של 32 */
    if(GP.n>=8&&avgLast(6)>30){ GFX.probe=false; GP.win.length=0; GP.cool=pNow+3000; return; }
    if(GP.n>=70){ GFX.probe=false; var a=avgLast(45); EXO.frameMs=a;
      if(GFX.auto){
        if(a>48&&!EXO.qualityLocked) setTier(0,'מדידת פתיחה');
        else if(GFX.tier===1&&a<18.5) setTier(2,'מדידת פתיחה');
        if(GFX.tier===2&&a<20&&(window.devicePixelRatio||1)>1.5){ EXO.dprMax=2; resize(); } }
      GP.win.length=0; GP.cool=pNow+3000; }
    return; }
  if(GFX.auto&&pNow>GP.cool&&GP.win.length>=60){ var a2=avgLast(60);
    if(a2>41){ if(GFX.tier===2) setTier(1,'קצב נפל'); else if(GFX.tier===1&&!EXO.qualityLocked) setTier(0,'קצב נפל');
      GFX.noUp=true; GP.win.length=0; GP.cool=pNow+4000; } }
}
function avgLast(k){ var n=Math.min(k,GP.win.length), s=0; for(var i=GP.win.length-n;i<GP.win.length;i++) s+=GP.win[i]; return n?s/n:0; }

/* ?fps=1: מונה קטן בפינה. בלי הפרמטר לא נוצר כלום */
var FPSEL=null;
if(/[?&]fps=1/.test(location.search)){
  FPSEL=document.createElement('div');
  FPSEL.setAttribute('aria-hidden','true');
  FPSEL.style.cssText='position:fixed;left:6px;top:6px;z-index:99999;pointer-events:none;font:600 11px/1.35 ui-monospace,monospace;'+
    'color:#e8f4ff;background:rgba(0,10,20,.62);padding:4px 7px;border-radius:6px;direction:ltr;white-space:pre';
  document.body.appendChild(FPSEL); }
function fpsPaint(){ if(!FPSEL) return;
  FPSEL.textContent=Math.round(GFX.fps)+' fps  '+GFX.ms.toFixed(1)+' ms\ntier '+GFX.tier+(GFX.auto?'':' (locked)')+'  dpr '+
    (C.width/Math.max(1,C.clientWidth)).toFixed(2)+(GFX.probe?'  probe':'')+(GFX.why?'\n'+GFX.why:''); }

/* ---- צבע: עבודה בלינארי ו-ACES ----
   הצבעים שכוילו עד היום (לוחות השמיים, המים, הסירה) הם "איך שזה אמור להיראות במסך". כדי לא לאבד את הכיול,
   כל צבע כזה עובר ACES הפוך אל ערך לינארי שעקומת ACES מחזירה בדיוק אליו. מכאן והלאה החישוב לינארי:
   האור מוכפל, ההשתקפות מתערבבת, השמש והנצנוצים עוברים את הלבן — ו-ACES מקפל אותם ברכות במקום לחתוך.
   ACES = ההתאמה של Stephen Hill ל-RRT+ODT (עם מטריצות הכניסה והיציאה), ואחריה sRGB. */
/* TMO_GLSL (עקומת ACES וההפוכה שלה ב-GLSL) מוגדר ב-gfx_patch.py לפני השמיים — השיידרים נבנים לפני הקובץ הזה */
function ainvJS(c){ var y=[0,0,0],i; for(i=0;i<3;i++) { var q=Math.max(0,Math.min(0.97,c[i])); y[i]=q*q; }
  var v=[y[0]*0.643038+y[1]*0.311187+y[2]*0.045775, y[0]*0.059269+y[1]*0.931436+y[2]*0.009295, y[0]*0.005962+y[1]*0.063929+y[2]*0.930118], u=[0,0,0];
  for(i=0;i<3;i++){ var w=Math.max(0,Math.min(0.99,v[i])), qa=1-0.983729*w, qb=0.0245786-0.4329510*w, qc=-(0.000090537+0.238081*w);
    u[i]=(-qb+Math.sqrt(qb*qb-4*qa*qc))/(2*qa); }
  return [Math.max(0,u[0]*1.764741-u[1]*0.675778-u[2]*0.088963), Math.max(0,-u[0]*0.147028+u[1]*1.160252-u[2]*0.013224), Math.max(0,-u[0]*0.036337-u[1]*0.162436+u[2]*1.198773)]; }
function tmoJS(c,E){ var x=[c[0]*E,c[1]*E,c[2]*E];
  var v=[x[0]*0.59719+x[1]*0.35458+x[2]*0.04823, x[0]*0.07600+x[1]*0.90834+x[2]*0.01566, x[0]*0.02840+x[1]*0.13383+x[2]*0.83777];
  for(var i=0;i<3;i++) v[i]=(v[i]*(v[i]+0.0245786)-0.000090537)/(v[i]*(0.983729*v[i]+0.4329510)+0.238081);
  var o=[v[0]*1.60475-v[1]*0.53108-v[2]*0.07367, -v[0]*0.10208+v[1]*1.10813-v[2]*0.00605, -v[0]*0.00327-v[1]*0.07276+v[2]*1.07602];
  return [Math.sqrt(Math.max(0,Math.min(1,o[0]))),Math.sqrt(Math.max(0,Math.min(1,o[1]))),Math.sqrt(Math.max(0,Math.min(1,o[2])))]; }
/* צבע (מערך) → לינארי, פעם אחת לכל מערך. WeakMap: מערך זמני (הנשיפה של הלוויתן) נאסף בלי לדלוף. צבע שמשתנה בכל פריים → LNf */
var LNC=new WeakMap();
function LN(c){ var r=LNC.get(c); if(!r){ r=new Float32Array(ainvJS(c)); LNC.set(c,r); } return r; }
function LNf(c){ return ainvJS(c); }
var EXPO=1;
var FOAM_D=[0.93,0.965,0.985];

/* ================= 7. שמיים פיזיקליים =================
   פיזור אטמוספרי חד-פעמי (single scattering) של ריילי (מולקולות: הכחול) ומי (אובך: ההילה הלבנה סביב השמש),
   עם בליעת אוזון (החגורה של שאפויס: היא שנותנת לשעה הכחולה את הכחול שלה). הכדור לא שקוף, ולכן אחרי השקיעה
   חלק מהאוויר בצל של כדור הארץ — הרצועה הכחולה-אפורה מעל האופק מול השמש, ומעליה חגורת ונוס הוורודה. כל זה
   יוצא מהחישוב, לא מצויר ביד. הקבועים: Bruneton & Neyret 2008 / Hillaire 2020 (ריילי 5.8/13.6/33.1, מי 4.0,
   אוזון 0.65/1.88/0.085, לכל ק"מ; האובך — מי — בחצי מהערך של אוויר יבשתי, כי מעל האוקיינוס הפתוח האוויר נקי יותר,
   ו-g=0.76). כדור ארץ 6360 ק"מ, ראש האטמוספרה 6460.
   החישוב ב-JS, לטבלה קטנה (32 כיוונים סביב השמש × 48 גבהים במבט), פעם בשנייה או כשהשמש זזה (גם בגלילת הזמן),
   והשיידר רק קורא ממנה. אותו חישוב לירח: אור הירח הוא אור שמש, ולכן סביב ירח מלא השמיים כחלחלים.
   הבהירות: היומית נצמדת לבהירות שכוילה עד היום (כדי שהסירה והים לא ישתנו), והגוון בא מהפיזיקה. */
var ATM=(function(){
  var RG=6360, RT=6460, HR=8, HM=1.2, BR=[5.802e-3,13.558e-3,33.1e-3], BMs=2.0e-3, BMe=2.22e-3, BO=[0.650e-3,1.881e-3,0.085e-3], G=0.76;
  var NH=40, NMU=80, TT=new Float32Array(NH*NMU*3);
  function dens(h){ return [Math.exp(-h/HR), Math.exp(-h/HM), Math.max(0,1-Math.abs(h-25)/15)]; }
  function muH(r){ return -Math.sqrt(Math.max(0,1-(RG/r)*(RG/r))); }
  /* עומק אופטי לאורך קרן מגובה h בזווית mu, עד ראש האטמוספרה */
  function tauRay(h,mu){ var r=RG+h, b=r*mu, c=r*r-RT*RT, L=-b+Math.sqrt(Math.max(0,b*b-c)), N=24, ds=L/N, t=[0,0,0], k;
    for(k=0;k<N;k++){ var s=(k+0.5)*ds, rr=Math.sqrt(r*r+s*s+2*r*s*mu), d=dens(rr-RG);
      for(var ch=0;ch<3;ch++) t[ch]+=(BR[ch]*d[0]+BMe*d[1]+BO[ch]*d[2])*ds; }
    return t; }
  (function(){ for(var i=0;i<NH;i++){ var x=i/(NH-1), h=100*x*x, mh=muH(RG+h);
    for(var j=0;j<NMU;j++){ var y=j/(NMU-1), mu=mh+(1-mh)*y*y, t=tauRay(h,Math.min(1,mu)), o=(i*NMU+j)*3;
      TT[o]=Math.exp(-t[0]); TT[o+1]=Math.exp(-t[1]); TT[o+2]=Math.exp(-t[2]); } } })();
  /* העברה (transmittance) מגובה h אל הכיוון mu; מתחת לאופק המקומי — צל, עם חצי-צל ברוחב של דיסקת השמש */
  function trans(h,mu,out){ var mh=muH(RG+h), sh=smooth(mh-0.0047,mh+0.0047,mu); if(sh<=0){ out[0]=out[1]=out[2]=0; return out; }
    var x=Math.sqrt(Math.max(0,Math.min(1,h/100))), y=Math.sqrt(Math.max(0,Math.min(1,(Math.max(mu,mh)-mh)/(1-mh))));
    var fi=x*(NH-1), fj=y*(NMU-1), i0=Math.min(NH-2,Math.floor(fi)), j0=Math.min(NMU-2,Math.floor(fj)), a=fi-i0, b=fj-j0;
    for(var ch=0;ch<3;ch++){ var o00=(i0*NMU+j0)*3+ch, o01=o00+3, o10=o00+NMU*3, o11=o10+3;
      out[ch]=((TT[o00]*(1-b)+TT[o01]*b)*(1-a)+(TT[o10]*(1-b)+TT[o11]*b)*a)*sh; }
    return out; }
  var NA=32, NE=48, EL0=-0.035, ELR=Math.PI/2+0.035;
  function elOf(v){ return EL0+ELR*v*v; }
  /* הטבלה: לכל כיוון מבט — קרינה (לינארית, ביחידות של "שמש = 1") */
  function table(lightEl,out,j0,j1){ var sl=Math.sin(lightEl), cl=Math.cos(lightEl), Ts=[0,0,0], i,j,k,ch;
    var h0=0.003, r0=RG+h0, N=18, MS=0.6/(4*Math.PI); if(j0===undefined){ j0=0; j1=NE; }
    /* MS: פיזור מרובה בקירוב גס — תוספת איזוטרופית, כמו אור שכבר התפזר פעם אחת ומגיע מכל הכיוונים. בלעדיו האופק
       שבניצב לשמש בשקיעה יוצא חום כהה, והזנית כהה פי כמה מהמציאות */
    for(j=j0;j<j1;j++){ var el=Math.max(0.0015,elOf(j/(NE-1))), ce=Math.cos(el), se=Math.sin(el);
      var b=r0*se, L=-b+Math.sqrt(b*b-(r0*r0-RT*RT)), ds, tauV;
      for(i=0;i<NA;i++){ var ph=Math.PI*i/(NA-1), vx=ce*Math.cos(ph), vy=se, vz=ce*Math.sin(ph);
        var cth=vx*cl+vy*sl, PR=3/(16*Math.PI)*(1+cth*cth), PM=3/(8*Math.PI)*((1-G*G)*(1+cth*cth))/((2+G*G)*Math.pow(1+G*G-2*G*cth,1.5));
        var acc=[0,0,0]; tauV=[0,0,0];
        /* צעדים לא אחידים: צפופים ליד הסירה, שם האוויר הכי צפוף */
        var sPrev=0;
        for(k=0;k<N;k++){ var f=(k+1)/N, s=L*f*f, dsk=s-sPrev, sm=(s+sPrev)/2; sPrev=s;
          var px=vx*sm, py=r0+vy*sm, pz=vz*sm, rr=Math.sqrt(px*px+py*py+pz*pz), hh=rr-RG, d=dens(hh);
          for(ch=0;ch<3;ch++) tauV[ch]+=(BR[ch]*d[0]+BMe*d[1]+BO[ch]*d[2])*dsk;
          var mus=(px*cl+py*sl)/rr; trans(hh,mus,Ts);
          for(ch=0;ch<3;ch++){ var tv=Math.exp(-tauV[ch]+ (BR[ch]*d[0]+BMe*d[1]+BO[ch]*d[2])*dsk*0.5);
            acc[ch]+=tv*Ts[ch]*(BR[ch]*d[0]*(PR+MS)+BMs*d[1]*(PM+MS))*dsk; } }
        var o=(j*NA+i)*3; out[o]=acc[0]; out[o+1]=acc[1]; out[o+2]=acc[2]; } }
    return out; }
  return { NA:NA, NE:NE, EL0:EL0, ELR:ELR, table:table, trans:trans, RG:RG };
})();
function lum3(c){ return c[0]*0.2126+c[1]*0.7152+c[2]*0.0722; }
/* טקסטורה של 8 ביט לכל ערוץ, בלוגריתם: 2^-24 עד 2^2 (26 סטופים), כך שגם השמיים של רבע שעה אחרי השקיעה נשמרים */
function SkyLUT(){ this.data=new Float32Array(ATM.NA*ATM.NE*3); this.px=new Uint8Array(ATM.NA*ATM.NE*4); this.tex=gl.createTexture(); this.el=null; this.t=0;
  gl.bindTexture(gl.TEXTURE_2D,this.tex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,ATM.NA,ATM.NE,0,gl.RGBA,gl.UNSIGNED_BYTE,this.px); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE); }
/* החישוב מתחלק על פני כמה פריימים (12 שורות בכל פריים), כדי שבטלפון איטי לא תהיה קפיצה; הטבלה הקודמת נשארת עד שהחדשה גמורה */
SkyLUT.prototype.update=function(lightEl,nowP){
  if(this.job===undefined||this.job===null){
    if(this.el!==null&&Math.abs(lightEl-this.el)<0.0006&&nowP-this.t<4000) return false;
    this.job={el:lightEl,j:0}; this.t=nowP; if(!this.work) this.work=new Float32Array(this.data.length); }
  var J=this.job, j1=Math.min(ATM.NE,J.j+(this.el===null?ATM.NE:12));
  ATM.table(J.el,this.work,J.j,j1); J.j=j1;
  if(J.j<ATM.NE) return false;
  var tmp=this.data; this.data=this.work; this.work=tmp; this.el=J.el; this.job=null;
  var d=this.data, p=this.px, n=ATM.NA*ATM.NE, i, ch;
  for(i=0;i<n;i++){ for(ch=0;ch<3;ch++){ var v=d[i*3+ch], e=(Math.log2(Math.max(v,6e-8))+24)/26; p[i*4+ch]=Math.max(0,Math.min(255,Math.round(e*255))); } p[i*4+3]=255; }
  /* UNPACK_FLIP_Y נשאר דלוק מהטקסטורות של המפרשים — כאן שורה 0 היא האופק, בלי היפוך */
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
  gl.bindTexture(gl.TEXTURE_2D,this.tex); gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,ATM.NA,ATM.NE,gl.RGBA,gl.UNSIGNED_BYTE,p);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
  return true; };
/* ממוצע בשורה אחת של הטבלה (גובה מבט), על כל הכיוונים או רק בצד של האור */
SkyLUT.prototype.row=function(el,side){ var v=Math.sqrt(Math.max(0,(el-ATM.EL0)/ATM.ELR)), j=Math.round(v*(ATM.NE-1)), s=[0,0,0], n=0, i;
  var i0=side?0:0, i1=side?3:ATM.NA-1;
  for(i=i0;i<=i1;i++){ var o=(j*ATM.NA+i)*3; s[0]+=this.data[o]; s[1]+=this.data[o+1]; s[2]+=this.data[o+2]; n++; }
  return [s[0]/n,s[1]/n,s[2]/n]; };
var LUT_S=null, LUT_M=null, SKYP={on:false};
function skyPhysFrame(sp,mp,horOld,zenOld,dayF,nightF,moonUp,cl){
  if(!LUT_S){ LUT_S=new SkyLUT(); LUT_M=new SkyLUT(); }
  var pn=performance.now(), sEl=sp.alt, mEl=mp.alt;
  if(sEl>-0.33) LUT_S.update(sEl,pn);
  if(mEl>-0.05&&nightF>0.02) LUT_M.update(mEl,pn);
  var sOn=sEl>-0.33, mOn=mEl>-0.05&&nightF>0.02;
  /* הרצפה של הלילה: הצבעים שכוילו ללילה (בלי ירח), לינאריים */
  var NZ=LNf(P.nightZ), NH2=LNf(P.nightH), fl=nightF;
  var tgtH=lum3(LNf(horOld)), flH=lum3(NH2)*fl, tgtZ=lum3(LNf(zenOld)), flZ=lum3(NZ)*fl;
  var hS=sOn?LUT_S.row(0.03,false):[0,0,0], hM=mOn?LUT_M.row(0.03,false):[0,0,0];
  var zS=sOn?LUT_S.row(1.5,false):[0,0,0], zM=mOn?LUT_M.row(1.5,false):[0,0,0];
  /* שני מכפילים: לאופק ולזנית. הגוון והמבנה (הצד של השמש, הצל של כדור הארץ) פיזיקליים; הבהירות של האופק ושל הזנית
     נצמדת למה שכויל, כי פיזור חד-פעמי מחשיך את הזנית פי כמה מהמציאות. היחס ביניהם מוגבל לפי 4 */
  var Kh=0, Kz=0; if(sOn){ var lh=lum3(hS), lz=lum3(zS);
    Kh=lh>1e-12?Math.max(0,tgtH-flH)/lh:0; Kz=lz>1e-12?Math.max(0,tgtZ-flZ)/lz:0;
    var cap=SKYP.Kday?SKYP.Kday*900:1e12; Kh=Math.min(Kh,cap); Kz=Math.min(Kz,Kh*4,cap*4); if(sEl>0.35) SKYP.Kday=Kh; }
  var Ks=Kh;
  var Km=0; if(mOn){ var lm=lum3(hM); Km=lm>1e-12?lum3(NH2)*1.25*moonUp*Math.pow(mp.illum,1.5)*nightF/lm:0; }
  SKYP.on=true; SKYP.Kh=Kh; SKYP.Kz=Kz; SKYP.Km=Km; SKYP.NZ=NZ; SKYP.NH=NH2; SKYP.fl=fl;
  /* הצבעים שהשאר צריך (ערפל, השתקפות, תאורת סביבה): מהשמיים עצמם, באותה עקומה */
  var hL=[Kh*hS[0]+Km*hM[0]+NH2[0]*fl, Kh*hS[1]+Km*hM[1]+NH2[1]*fl, Kh*hS[2]+Km*hM[2]+NH2[2]*fl];
  var zL=[Kz*zS[0]+Km*zM[0]+NZ[0]*fl, Kz*zS[1]+Km*zM[1]+NZ[1]*fl, Kz*zS[2]+Km*zM[2]+NZ[2]*fl];
  var dS=sOn?LUT_S.row(0.03,true):[0,0,0];
  var dL=[Kh*dS[0]+NH2[0]*fl, Kh*dS[1]+NH2[1]*fl, Kh*dS[2]+NH2[2]*fl];
  SKYP.hor=tmoJS(hL,1); SKYP.zen=tmoJS(zL,1); SKYP.dusk=tmoJS(dL,1);
  /* צבע השמש עצמה: מה שעובר את האוויר עד הסירה */
  var T=ATM.trans(0.003,Math.sin(sEl),[0,0,0]), mx=Math.max(T[0],T[1],T[2],1e-6);
  SKYP.sun=[0.25+0.75*T[0]/mx,0.25+0.75*T[1]/mx,0.25+0.75*T[2]/mx];
}
var SKY_GLSL_READY=true;

/* אותם uniforms לשמיים ולים (הים קורא מהטבלה את ההשתקפות של השמיים ואת צבע האופק לערפל, בכיוון שבו מסתכלים) */
function physUniforms(PR,on,ov,sunDir,moonDir){ gl.uniform1f(PR.u('uPhys'),on?1:0); if(!on) return;
  gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D,LUT_S.tex); gl.uniform1i(PR.u('uLutS'),3);
  gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D,LUT_M.tex); gl.uniform1i(PR.u('uLutM'),4); gl.activeTexture(gl.TEXTURE0);
  gl.uniform2f(PR.u('uKs'),SKYP.Kh,SKYP.Kz); gl.uniform1f(PR.u('uKm'),SKYP.Km); gl.uniform1f(PR.u('uFl'),SKYP.fl);
  gl.uniform3fv(PR.u('uNZ'),SKYP.NZ); gl.uniform3fv(PR.u('uNH'),SKYP.NH); gl.uniform1f(PR.u('uOvS'),ov);
  gl.uniform3fv(PR.u('uPSun'),sunDir); gl.uniform3fv(PR.u('uPMoon'),moonDir); }

/* ================= 1+12. השתקפות אמיתית: מפת סביבה של השמיים =================
   פעם בשתי שניות (או כשהשמיים השתנו — גלילת הזמן) שיידר השמיים עצמו מצויר לתוך טקסטורה קטנה בהטלה
   שווה-שטח של חצי הכדור העליון (אזימוט × שורש הגובה, כך שיש יותר פיקסלים ליד האופק — שם רוב ההשתקפויות),
   עם העננים, הירח, שביל החלב והכוכבים. הים קורא ממנה בכיוון ההשתקפות של כל פיקסל, ולכן הכוכבים והירח
   נשברים בגלים כמו במציאות. בלי דיסקת השמש — הנצנוצים שלה מחושבים בנפרד. דרגה 1: 256×64, דרגה 2: 512×128. */
var ENV={tex:null,fb:null,w:0,h:0,t:-1e9,ok:false,lutT:-1};
function envEnsure(){ var w=GFX.tier>=2?512:256, h=w/4;
  if(ENV.tex&&ENV.w===w) return true;
  try{
    if(!ENV.tex){ ENV.tex=gl.createTexture(); ENV.fb=gl.createFramebuffer(); }
    gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D,ENV.tex);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER,ENV.fb); gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,ENV.tex,0);
    var st=gl.checkFramebufferStatus(gl.FRAMEBUFFER); gl.bindFramebuffer(gl.FRAMEBUFFER,null); gl.bindTexture(gl.TEXTURE_2D,null); gl.activeTexture(gl.TEXTURE0);
    if(st!==gl.FRAMEBUFFER_COMPLETE){ ENV.dead=true; return false; }
    ENV.w=w; ENV.h=h; ENV.t=-1e9; ENV.ok=false; return true;
  }catch(e){ ENV.dead=true; return false; } }
function envDue(t){ if(ENV.dead||GFX.tier<1) return false; if(!envEnsure()) return false;
  var lt=LUT_S?LUT_S.t:0; return (t-ENV.t>2.0)||(lt!==ENV.lutT)||!ENV.ok; }
/* כוכבים במפת הסביבה: אותו קטלוג, אבל ההטלה היא של המפה ולא של המצלמה */
var ENVSTARP=null;
function envStars(nowMs,t,nightF,moonUp,illum,moonDir,cl,cwx,cwz){
  if(nightF<0.04||!starsInit()) return;
  if(!ENVSTARP){ try{ ENVSTARP=prog(
     ['precision highp float; attribute vec3 aD; attribute float aM;',
      'uniform mat3 uRot; uniform vec3 uMoonDir; uniform float uLim,uMoonUp,uPx;',
      'varying float vA; varying float vB;',
      'void main(){ vec3 r=uRot*aD; float az=atan(r.x,-r.z); float u=az/6.2831853+(az<0.0?1.0:0.0);',
      ' float v=sqrt(clamp(asin(clamp(r.y,-1.0,1.0))/1.5707963,0.0,1.0));',
      ' gl_Position=r.y<0.0?vec4(2.0,2.0,2.0,1.0):vec4(u*2.0-1.0,v*2.0-1.0,0.0,1.0);',
      ' float up=max(r.y,0.0), m=aM+0.28*(1.0/(up+0.025)-1.0);',
      ' vA=clamp((uLim-m)/1.6,0.0,1.0)*(1.0-uMoonUp*smoothstep(0.99975,0.99992,dot(r,uMoonDir)));',
      ' vB=clamp((4.6-m)/3.6,0.0,1.0); gl_PointSize=uPx*(1.0+1.2*vB); }'].join('\n'),
     ['precision highp float; varying float vA; varying float vB;',
      'void main(){ float d=length(gl_PointCoord-0.5); gl_FragColor=vec4(vec3(0.95,0.97,1.0),vA*(0.45+0.55*vB)*smoothstep(0.5,0.1,d)); }'].join('\n'));
    }catch(e){ ENVSTARP=null; return; } }
  var lim=6.2-5.2*(1-nightF)-2.7*moonUp*illum;
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE); gl.disable(gl.DEPTH_TEST);
  gl.useProgram(ENVSTARP);
  gl.uniformMatrix3fv(ENVSTARP.u('uRot'),false,new Float32Array(celestialRot(nowMs)));
  gl.uniform3fv(ENVSTARP.u('uMoonDir'),moonDir); gl.uniform1f(ENVSTARP.u('uMoonUp'),moonUp); gl.uniform1f(ENVSTARP.u('uLim'),lim-0.8);
  gl.uniform1f(ENVSTARP.u('uPx'),ENV.w>=512?1.6:1.2);
  var aD=ENVSTARP.a('aD'), aM=ENVSTARP.a('aM');
  gl.enableVertexAttribArray(aD); gl.enableVertexAttribArray(aM);
  gl.bindBuffer(gl.ARRAY_BUFFER,starBuf); gl.vertexAttribPointer(aD,3,gl.FLOAT,false,20,0); gl.vertexAttribPointer(aM,1,gl.FLOAT,false,20,12);
  gl.drawArrays(gl.POINTS,0,starN);
  gl.disableVertexAttribArray(aD); gl.disableVertexAttribArray(aM);
  gl.enable(gl.DEPTH_TEST); gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA); gl.disable(gl.BLEND); }
/* מצייר את המפה: נקרא באמצע ציור השמיים, כשכל ה-uniforms של SKY כבר במקום */
function envRender(t,nowMs,starsOn,nightF,moonUp,illum,moonDir,cl,cwx,cwz){
  /* שום יחידת טקסטורה לא מחזיקה את המפה בזמן שמציירים לתוכה (אחרת WebGL מסרב: לולאת משוב) */
  gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D,null); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,null);
  gl.uniform1i(SKY.u('uEnvT'),6);
  gl.bindFramebuffer(gl.FRAMEBUFFER,ENV.fb); gl.viewport(0,0,ENV.w,ENV.h);
  gl.uniform1f(SKY.u('uEnv'),1); gl.disable(gl.DEPTH_TEST);
  gl.drawArrays(gl.TRIANGLES,0,3);
  gl.uniform1f(SKY.u('uEnv'),0); gl.enable(gl.DEPTH_TEST);
  if(starsOn){ envStars(nowMs,t,nightF,moonUp,illum,moonDir,cl,cwx,cwz); gl.useProgram(SKY);
    /* הכוכבים כיבו את מערך הקודקודים שהשמיים משתמשים בו — מחזירים אותו */
    gl.bindBuffer(gl.ARRAY_BUFFER,quadB); gl.enableVertexAttribArray(SKY.a('aP')); gl.vertexAttribPointer(SKY.a('aP'),2,gl.FLOAT,false,0,0); }
  gl.bindFramebuffer(gl.FRAMEBUFFER,null); gl.viewport(0,0,C.width,C.height);
  ENV.t=t; ENV.ok=true; ENV.lutT=LUT_S?LUT_S.t:0; }

/* ================= 8+9. הירח מצילום, ושביל החלב מפנורמה אמיתית =================
   הירח: המפה הצבעונית של LRO (NASA's Scientific Visualization Studio, CGI Moon Kit, 2019 — נחלת הכלל, עם קרדיט),
   512×256, 27 ק"ב. הדיסקה מסובבת לפי הצפון השמימי (בקו הרוחב של הסירה הירח "נוטה"), והמופע מחושב מכיוון השמש
   על כל נקודה בכדור — כך שגם הסהר נוטה נכון. נטען רק כשהירח מעל האופק, אחרי שהסצנה כבר על המסך.
   שביל החלב: "The Milky Way panorama" של ESO/S. Brunier (CC BY 4.0), בהטלה שווה-מרחקים בקואורדינטות גלקטיות.
   הכוכבים הנקודתיים הוסרו מהתמונה (פתיחה אפורה, 5 פיקסלים) — הם כבר מצוירים מהקטלוג, ולא נרצה אותם פעמיים;
   נשארו הזוהר, הבקע הכהה וענני מגלן. דרגה 1: 1024×512 (25 ק"ב), דרגה 2: 2048×1024 (82 ק"ב). נטען רק בלילה. */
var SKYTEX={ moon:null, mw:null, mwW:0, moonLoading:false, mwLoading:false };
function loadTex(src,cb){ var im=new Image(); im.decoding='async';
  im.onload=function(){ try{ var t=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,t); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,im); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      cb(t); kick(); }catch(e){} };
  im.src=src; }
var SKYBASE=(function(){ var s=document.querySelector('script[src*="deck.js"]'); var u=s?s.getAttribute('src'):''; return u.replace(/assets\/v2n?\/deck\.js.*$/,''); })();
function skyTexFrame(moonUp,nightF,starsOn){
  if(GFX.tier<1||!EXO.firstFrame) return;
  if(!SKYTEX.moon&&!SKYTEX.moonLoading&&moonUp>0.01){ SKYTEX.moonLoading=true; loadTex(SKYBASE+'assets/sky/moon-512.jpg',function(t){ SKYTEX.moon=t; }); }
  var want=GFX.tier>=2?2:1;
  if(starsOn&&nightF>0.3&&SKYTEX.mwW<want&&!SKYTEX.mwLoading){ SKYTEX.mwLoading=true;
    loadTex(SKYBASE+'assets/sky/milkyway-'+want+'k.jpg',function(t){ SKYTEX.mw=t; SKYTEX.mwW=want; SKYTEX.mwLoading=false; }); } }
function skyTexUniforms(moonDir,cr){
  gl.uniform1f(SKY.u('uMoonTex'),SKYTEX.moon?1:0); gl.uniform1f(SKY.u('uMWTex'),SKYTEX.mw?1:0);
  if(SKYTEX.moon){ gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_2D,SKYTEX.moon); gl.uniform1i(SKY.u('uMoonT'),6); }
  if(SKYTEX.mw){ gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D,SKYTEX.mw); gl.uniform1i(SKY.u('uMWT'),7); }
  gl.activeTexture(gl.TEXTURE0);
  /* הצפון של הירח: הקוטב השמימי, מוטל על המישור שניצב לכיוון הירח */
  var la=BP.lat*D2R, N=[0,Math.sin(la),-Math.cos(la)], k=N[0]*moonDir[0]+N[1]*moonDir[1]+N[2]*moonDir[2];
  var U=norm3([N[0]-moonDir[0]*k,N[1]-moonDir[1]*k,N[2]-moonDir[2]*k]), R=cross3(moonDir,U);
  gl.uniform3fv(SKY.u('uMoonR'),R); gl.uniform3fv(SKY.u('uMoonU'),U); }
GFX.sky=SKYTEX;

/* 10. ה-cirrus: אור השמש בגובה 9 ק"מ (מסונן בדרך — אדום כשהשמש נמוכה), ועוצמה לפי העננות הכוללת */
function cirrusUniforms(cl,windDir,sAltR){
  var on=GFX.tier>0&&cl>0.08; gl.uniform1f(SKY.u('uCiOn'),on?1:0); if(!on) return;
  gl.uniform1f(SKY.u('uCiA'),Math.min(1,(cl-0.08)/0.45)*0.85);
  var a=(windDir+180)*D2R; gl.uniform2f(SKY.u('uCiDir'),Math.sin(a),-Math.cos(a));
  gl.uniform1f(SKY.u('uSunAltR'),sAltR);
  var T=ATM.trans(9,Math.sin(Math.max(sAltR,-0.052)),[0,0,0]), m=Math.max(T[0],T[1],T[2],1e-6);
  gl.uniform3f(SKY.u('uHiCol'),0.15+0.85*T[0]/m,0.15+0.85*T[1]/m,0.15+0.85*T[2]/m); }
