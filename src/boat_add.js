
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
  var b=box(1.55,1.85,0.50,0.615);                                 /* "7" שחור גדול מתחת ללוח הכתום */
  x.save(); x.fillStyle='#14181d';
  x.font='700 100px Georgia, "Times New Roman", serif';
  x.textAlign='center'; x.textBaseline='middle';
  var m=x.measureText('7'), gw=m.width||55;
  x.translate(b[0]+b[2]/2, b[1]+b[3]/2); x.scale(b[2]/gw, b[3]/72); x.fillText('7',0,0); x.restore();
  b=box(0.58,0.58,0.24,0.135);                                     /* טלאי המרוץ: ריבוע שחור וטבעת זהובה, לא קריא */
  x.fillStyle='#1b1f24'; x.fillRect(b[0],b[1],b[2],b[3]);
  x.save(); x.translate(b[0]+b[2]/2,b[1]+b[3]/2); x.scale(b[2],b[3]);
  x.strokeStyle='#c9a648'; x.lineWidth=0.17; x.beginPath(); x.arc(0,0,0.31,0,6.283); x.stroke(); x.restore();
  x.fillStyle='rgba(40,46,58,0.32)';                               /* שתי שורות נקודות צמצום */
  for(var r=0;r<2;r++){ var vv=0.115+r*0.105;
    for(k=1;k<9;k++){ var d=box(0.07,0.07,k/9,vv); x.fillRect(d[0],d[1],Math.max(1,d[2]),Math.max(1,d[3])); } }
  return texFromCanvas(cv);
}
/* הדגל: כ-45×30 ס״מ, על האחורן בערך בשליש גובהו, מתנופף עם הרוח המדומה */
function ensignMesh(){
  var NU=7,NV=4,p=[],idx=[],uv=[],i,j, W=0.45, H=0.30;
  for(i=0;i<=NU;i++) for(j=0;j<=NV;j++){ var u=i/NU, v=j/NV;
    p.push(-u*W, (v-0.5)*H, Math.sin(u*5.4)*0.055*u); uv.push(u,v); }
  for(i=0;i<NU;i++) for(j=0;j<NV;j++){ var q=i*(NV+1)+j, r2=q+NV+1; idx.push(q,r2,q+1,q+1,r2,r2+1); }
  return mesh(p,idx,uv); }
var M_ENSIGN=ensignMesh();
