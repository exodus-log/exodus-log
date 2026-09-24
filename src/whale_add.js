
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
