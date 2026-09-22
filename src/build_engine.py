# -*- coding: utf-8 -*-
"""Builds assets/v2/deck.js (the engine of the full-window front page) from the site's assets/deck.js.
   The old file is only read, never written, so the old page keeps working untouched."""
import re, io, os
SRC = os.path.join(os.environ.get('GGR_SITE') or (os.path.dirname(os.path.dirname(os.path.abspath(__file__))) if os.path.exists(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'deck.js')) else '/mnt/user-data/uploads/GGR Project'), 'assets', 'deck.js')
s = io.open(SRC, encoding='utf-8').read()
import os
HERE=os.path.dirname(os.path.abspath(__file__))
add = io.open(os.path.join(HERE,'engine_add.js'), encoding='utf-8').read() + io.open(os.path.join(HERE,'sky_add.js'), encoding='utf-8').read() + io.open(os.path.join(HERE,'flow_add.js'), encoding='utf-8').read() + io.open(os.path.join(HERE,'boat_add.js'), encoding='utf-8').read() + io.open(os.path.join(HERE,'deck9_add.js'), encoding='utf-8').read() + io.open(os.path.join(HERE,'crew_add.js'), encoding='utf-8').read() + io.open(os.path.join(HERE,'whale_add.js'), encoding='utf-8').read()

def rep(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, ('expected %d, found %d: %r' % (n, c, old[:70]))
    s = s.replace(old, new)

def rex(pat, new, flags=re.S):
    global s
    m = re.findall(pat, s, flags)
    assert len(m) == 1, ('regex expected 1, found %d: %r' % (len(m), pat[:70]))
    s = re.sub(pat, lambda _m: new, s, count=1, flags=flags)

# 1. LAB state
rep("  quality:'full', simulated:T_OFF!==0\n};",
    "  quality:'full', simulated:T_OFF!==0\n};\n"
    "var LAB=EXO.lab={ compass:'world', wind:'sails', wave:'arcs', cur:'snake', lines:'both',\n"
    "  cloud:0.35, vis:300, water:'subtropic', cam:'orbit', fov:64, ringHot:0, ringHotT:0, RR:13, ringStyle:'dash', ringTint:'white' };")

# 2. SKY shader: clouds + underwater column
rep("  'uniform float uTanF,uAsp,uSunUp,uNight,uMoonUp,uIllum,uWax,uDusk,uTime; uniform vec2 uOff; uniform vec3 uDuskCol;',",
    "  'uniform float uTanF,uAsp,uSunUp,uNight,uMoonUp,uIllum,uWax,uDusk,uTime; uniform vec2 uOff; uniform vec3 uDuskCol;',\n"
    "  'uniform float uCloudOn,uCloudTh,uUnder,uUGlow; uniform vec2 uCloudV; uniform vec3 uAbyss;',\n"
    "  'float h21c(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }',\n"
    "  'float vnc(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);',\n"
    "  ' float a=h21c(i), b=h21c(i+vec2(1.0,0.0)), c=h21c(i+vec2(0.0,1.0)), d=h21c(i+vec2(1.0,1.0));',\n"
    "  ' return mix(mix(a,b,f.x),mix(c,d,f.x),f.y); }',\n"
    "  'float fbmc(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<5;i++){ s+=a*vnc(p); p=p*2.03+vec2(11.3,7.7); a*=0.5; } return s; }',")
rep("  ' vec3 c=mix(uHor,uZen,pow(h,0.62));',",
    "  ' vec3 c=mix(uHor,uZen,pow(h,0.62));',\n"
    "  ' if(uUnder>0.5){ float up=clamp(r.y,0.0,1.0), dn=clamp(-r.y,0.0,1.0);',\n"
    "  '  c=mix(uHor,uZen,pow(up,0.85)); c=mix(c,uAbyss,pow(dn,0.55));',\n"
    "  '  c+=vec3(0.55,0.85,0.80)*pow(max(dot(r,uSunDir),0.0),5.0)*0.30*uUGlow; }',")
rep("  ' float d=max(dot(r,uSunDir),0.0);',",
    "  ' float cov=0.0;',\n"
    "  ' if(uCloudOn>0.5 && r.y>0.012 && uUnder<0.5){',\n"
    "  '  vec2 cp=r.xz/(r.y+0.11)*1.10+uCloudV*uTime*0.0065;',\n"
    "  '  float n=fbmc(cp);',\n"
    "  '  cov=smoothstep(uCloudTh-0.10,uCloudTh+0.14,n)*smoothstep(0.012,0.15,r.y);',\n"
    "  '  float dens=smoothstep(uCloudTh,uCloudTh+0.34,n);',\n"
    "  '  float toSun=pow(max(dot(r,uSunDir),0.0),6.0);',\n"
    "  '  vec3 lit=mix(vec3(0.97,0.98,1.0),uSunCol,0.30)*(0.22+0.78*uSunUp)+uSunCol*toSun*0.35*uSunUp+uDuskCol*uDusk*0.40;',\n"
    "  '  vec3 shade=mix(uHor*0.85,vec3(0.36,0.40,0.47)*(0.20+0.80*uSunUp),0.62);',\n"
    "  '  vec3 cc=mix(lit,shade,dens*0.80);',\n"
    "  '  cc=mix(cc,cc*0.12+vec3(0.018,0.026,0.045),uNight*0.88);',\n"
    "  '  c=mix(c,cc,cov*0.95); }',\n"
    "  ' float sv=1.0-cov*0.93;',\n"
    "  ' float d=max(dot(r,uSunDir),0.0);',")
rep("  ' c+=uSunCol*pow(d,9.0)*0.30*uSunUp; c+=uSunCol*pow(d,90.0)*0.55*uSunUp;',",
    "  ' c+=uSunCol*pow(d,9.0)*0.30*uSunUp*sv; c+=uSunCol*pow(d,90.0)*0.55*uSunUp*sv;',")
rep("  ' c+=uSunCol*pow(d,7000.0)*10.0*uSunUp;',",
    "  ' c+=uSunCol*pow(d,7000.0)*10.0*uSunUp*sv*sv;',")

# 3. SEA shader: the underside of the surface
rep("  'uniform float uSunUp,uFogD,uAmpMax,uFoam,uChop,uDusk; uniform vec2 uWindV; uniform float uTime; uniform vec3 uDuskCol,uGlowDir;',",
    "  'uniform float uSunUp,uFogD,uAmpMax,uFoam,uChop,uDusk; uniform vec2 uWindV; uniform float uTime; uniform vec3 uDuskCol,uGlowDir;',\n"
    "  'uniform float uUnder;',")
rep("  ' float fg=1.0-exp(-pow(dist*uFogD,2.0));',",
    "  ' if(uUnder>0.5){ float up=clamp(dot(N,-V),0.0,1.0);',\n"
    "  '  vec3 uc=mix(uDeep*0.55,uShal*1.45+vec3(0.05,0.17,0.17)*uSunUp,pow(up,1.5));',\n"
    "  '  uc+=uSunCol*pow(max(dot(-V,normalize(uSunDir)),0.0),22.0)*0.60*uSunUp;',\n"
    "  '  uc+=vec3(0.75,0.95,0.92)*pow(max(dot(N,normalize(normalize(uSunDir)-V)),0.0),90.0)*0.35*uSunUp;',\n"
    "  '  col=uc; }',\n"
    "  ' float fg=1.0-exp(-pow(dist*uFogD,2.0));',")

# 4. vertex budget
rep("var MAXV=NWIND*TSEG*6+NCUR*CSEG*12+NSPRAY*6+NWAKE*12+NCHEV*48+900;",
    "var MAXV=NWIND*TSEG*6+NCUR*CSEG*12+NSPRAY*6+NWAKE*12+NCHEV*48+900+36000;")

# 5. lab functions, before buildFlow
rep("function buildFlow(c,t,dt,eye,bodyY){", add + "\nfunction buildFlow(c,t,dt,eye,bodyY){")

# 6. wind: air mode
rep("  for(i=0;i<nUse;i++){ p=PW[i];\n    p.age+=dt;\n    var rr=Math.sqrt(p.px*p.px+p.pz*p.pz);\n    if(p.age>p.life||rr>p.R){ seedW(p);",
    "  if(LAB.wind==='air'||LAB.wind==='sails'){ buildAir(c,t,dt,eye,wx,wz,wspd); } else\n"
    "  for(i=0;i<nUse;i++){ p=PW[i];\n    p.age+=dt;\n    var rr=Math.sqrt(p.px*p.px+p.pz*p.pz);\n    if(p.age>p.life||rr>p.R){ seedW(p);")

# 7. current: snakes with a head, true speed
rep("  var crawl=0.55+cspd*2.2;",
    "  var snk=(LAB.cur!=='now'), crawl=snk?(cspd*(LAB.cur==='snake4'?4:1)):(0.55+cspd*2.2);\n"
    "  var cnx=Math.cos(cr), cnz=Math.sin(cr), sdx=Math.sin(cr), sdz=-Math.cos(cr);")
rep("    for(k=CSEG;k>=0;k--){ tr.x[k]=x; tr.z[k]=z; tr.y[k]=waveY(x,z,t)*0.55-p.dep;",
    "    for(k=CSEG;k>=0;k--){ var so=snk?(0.30*Math.sin(k*0.80-t*(0.9+crawl*1.4)+p.ph)*(0.25+0.75*(1-k/CSEG))):0;\n"
    "      tr.x[k]=x+cnx*so; tr.z[k]=z+cnz*so; tr.y[k]=waveY(x,z,t)*0.55-p.dep;")
rep("    softDash(tr,eye,0.10+p.dep*0.04,a,1,i); }",
    "    if(snk){ var aa=Math.min(1,a*1.55), hx=tr.x[CSEG], hy=tr.y[CSEG], hz=tr.z[CSEG];\n"
    "      ribbon(tr,eye,0.15+p.dep*0.03,aa,1);\n"
    "      fv(hx+sdx*0.95,hy,hz+sdz*0.95,aa,1); fv(hx+cnx*0.38-sdx*0.10,hy,hz+cnz*0.38-sdz*0.10,aa,1); fv(hx-cnx*0.38-sdx*0.10,hy,hz-cnz*0.38-sdz*0.10,aa,1); }\n"
    "    else softDash(tr,eye,0.10+p.dep*0.04,a,1,i); }")

# 8. surface: arcs / chevrons / none; lanes optional; the ring on the water
rep("      chevron(p.x,p.z,d0[0],d0[1],1.5+Math.min(2.2,c.waveH*0.75),a,t); }",
    "      if(LAB.wave==='arcs'){ if(i<10) crestArc(p.x,p.z,d0[0],d0[1],4.2+Math.min(3,c.waveH),Math.min(1,a*1.7),t); }\n"
    "      else if(LAB.wave==='chev') chevron(p.x,p.z,d0[0],d0[1],1.5+Math.min(2.2,c.waveH*0.75),a,t); }")
rep("  lane(GATE_BRG,90,0.27,0.70,2,true);", "  if(LAB.lines==='water') lane(GATE_BRG,90,0.27,0.70,2,true);")
rep("  lane(FIX.cog,58,0.16,0.62,3,false);", "  if(LAB.lines==='water') lane(FIX.cog,58,0.16,0.62,3,false);")
# the ring is its own range: drawn right after the sea, without depth test, before the boat
rep("var rngCur=[0,0], rngSurf=[0,0], rngAir=[0,0];", "var rngCur=[0,0], rngSurf=[0,0], rngAir=[0,0], rngRing=[0,0];")
rep("  buildSurface(c,t,dt,eye);           rngSurf=[rngCur[1],flowN-rngCur[1]];",
    "  var ring0=flowN; if(LAB.compass==='world') worldRing(c,t); rngRing=[ring0,flowN-ring0];\n"
    "  var surf0=flowN; buildSurface(c,t,dt,eye); rngSurf=[surf0,flowN-surf0];")

# 8b. ring colour slot (index 6)
rep(" ['precision highp float; uniform vec3 uCw,uCc,uCs,uCh,uCv,uCl,uFogCol; uniform float uK;',",
    " ['precision highp float; uniform vec3 uCw,uCc,uCs,uCh,uCv,uCl,uCr,uCg,uCp,uFogCol; uniform float uK;',")
rep("  'void main(){ vec3 c=vC<0.5?uCw:(vC<1.5?uCc:(vC<2.5?uCs:(vC<3.5?uCh:(vC<4.5?uCv:uCl))));',",
    "  'void main(){ vec3 c=vC<0.5?uCw:(vC<1.5?uCc:(vC<2.5?uCs:(vC<3.5?uCh:(vC<4.5?uCv:(vC<5.5?uCl:(vC<6.5?uCr:(vC<7.5?uCg:uCp)))))));',")
rep("  ' float A=vA*(1.0-vF*0.85); gl_FragColor=vec4(mix(c,uFogCol,clamp(vF,0.0,1.0))*A,A*(vC>4.5?0.0:uK));}'].join('\\n'));",
    "  ' float A=vA*(1.0-vF*0.85); gl_FragColor=vec4(mix(c,uFogCol,clamp(vF,0.0,1.0))*A,A*((vC>4.5&&vC<5.5)?0.0:uK));}'].join('\\n'));")
rep("  gl.uniform3f(FLOW.u('uCs'),0.97,0.99,1.0);",
    "  gl.uniform3f(FLOW.u('uCs'),0.97,0.99,1.0); var rc=LAB.ringCol||[0.97,0.99,1.0]; gl.uniform3f(FLOW.u('uCr'),rc[0],rc[1],rc[2]); gl.uniform3f(FLOW.u('uCg'),0.22,0.86,0.47); gl.uniform3f(FLOW.u('uCp'),0.96,0.22,0.20);")

# 9. flow colours
rep("  gl.uniform3f(FLOW.u('uCw'),1.00*dim,0.74*dim,0.42*dim);",
    "  if(LAB.wind!=='now') gl.uniform3f(FLOW.u('uCw'),0.86*dim+0.08,0.93*dim+0.05,1.0*dim+0.0);\n"
    "  else gl.uniform3f(FLOW.u('uCw'),1.00*dim,0.74*dim,0.42*dim);")


# 10. camera: full vertical range, deck view, under-water flag; boat pose moved up
rep("  cam.az+=cam.vaz; cam.el=Math.max(0.045,Math.min(1.45,cam.el+cam.vel));",
    "  cam.az+=cam.vaz; cam.el=Math.max(-1.30,Math.min(1.50,cam.el+cam.vel));\n"
    "  zoomAxisFrame(performance.now());\n"
    "  /* הטבעת: נדלקת מהר, נשארת 800 מילישניות אחרי המגע האחרון, ודועכת בכשליש שנייה. מנורמל לזמן, לא לפריימים */\n"
    "  var _rn=performance.now(), _rdt=Math.min(0.1,(_rn-(LAB._rhN||_rn))/1000); LAB._rhN=_rn;\n"
    "  var _rT=((_rn-(LAB.ringHotT||-1e9))<800)?1:0, _rk=1-Math.pow(1-(_rT>LAB.ringHot?0.35:0.18),_rdt*60);\n"
    "  LAB.ringHot+=(_rT-LAB.ringHot)*_rk; if(LAB.ringHot<0.002&&!_rT) LAB.ringHot=0;")

pose_pat = r"  var hRad=FIX\.cog\*D2R;\n.*?  var plan=planFor\(c,twa\); lastPlan=plan;\n"
m = re.findall(pose_pat, s, re.S); assert len(m) == 1
pose = m[0]
s = re.sub(pose_pat, lambda _m: "", s, count=1, flags=re.S)

cam_pat = r"  var bodyY=waveY\(0,0,t\);\n.*?  var VP=mMul\(mTrans\(EXO\.view\.ox,EXO\.view\.oy,0\),mMul\(mPersp\(fovy,asp,0\.5,2000\),mLook\(eye,ctr,\[0,1,0\]\)\)\);\n"
new_cam = ("  var bodyY=waveY(0,0,t);\n"
"  /* תנוחת הסירה והמפרשים מחושבת מוקדם: מצלמת הסיפון והרוח שסביב המפרשים צריכות אותה */\n"
+ pose +
"  RIG.length=0;\n"
"  function rigAdd(M,foot,luff){ var l=Math.hypot(M[0],M[2])||1; RIG.push({M:M,foot:foot,luff:luff,y0:M[13],dx:-M[0]/l,dz:-M[2]/l}); }\n"
"  if(plan==='spin'){ rigAdd(mainM,4.3,9.9); rigAdd(spinM,6.1,11.2); }\n"
"  else if(plan==='heavy'){ rigAdd(mainM,4.0,7.4); rigAdd(jibM,2.5,6.4); }\n"
"  else { rigAdd(mainM,4.3,9.9); rigAdd(yankM,3.7,9.0); }\n"
"  /* ציר זום אחד: sD = כמה אנחנו על הסיפון (0 עד 1), gT = כמה התיישרנו למבט מלמעלה בדרך לגלובוס, gX = ההצלבה אל הגלובוס */\n"
"  var asp=C.width/C.height, sD=cam.u<0?smooth(0,1,-cam.u):0, gT=cam.u>U_MAX?smooth(0,1,(cam.u-U_MAX)/(U_TOP-U_MAX)):0;\n"
"  var gX=cam.u>U_TOP?Math.min(1,(cam.u-U_TOP)/(U_GLOBE-U_TOP)):0, deck=sD>0.6;\n"
"  LAB.cam=deck?'deck':'orbit'; LAB.fov=cam.u<U_DECK?70+(cam.u-U_DECK)*32:70; LAB.ringK=1-gT;\n"
"  var fovO=(asp<0.8?60:46), fovy=(fovO+(LAB.fov-fovO)*sD)*D2R;\n"
"  var elO=cam.el+(1.50-cam.el)*gT, ce=Math.cos(elO), se=Math.sin(elO);\n"
"  var eyeO=[cam.r*ce*Math.sin(cam.az), cam.r*se+(2.2+bodyY*0.5)*(1-gT), cam.r*ce*Math.cos(cam.az)];\n"
"  var ty0=(EXO.view.ty===undefined?2.4:EXO.view.ty), lowF=Math.max(0,Math.min(1,(elO+0.35)/0.45));\n"
"  var ctr0=[0,(0.2+(ty0-0.2)*lowF)*(1-gT),0];\n"
"  var d0=norm3([ctr0[0]-eyeO[0],ctr0[1]-eyeO[1],ctr0[2]-eyeO[2]]);\n"
"  var rgt=norm3(cross3(d0,[0,1,0]));\n"
"  var dv=cam.tilt?rotAxis(d0,rgt,cam.tilt*D2R):d0;\n"
"  var eye=eyeO, dir=dv;\n"
"  if(sD>0){ var bb=-cam.az, pch=Math.max(-1.25,Math.min(1.35,-(cam.el-0.16)));\n"
"    var eyeD=xfm(boatM,-4.35,FREE+1.80,0.50), dirD=[Math.sin(bb)*Math.cos(pch),Math.sin(pch),-Math.cos(bb)*Math.cos(pch)];      /* z=0.50: הקוקפיט הצטמצם עם הרוחב האמיתי */\n"
"    eye=mix3(eyeO,eyeD,sD); dir=norm3(mix3(dv,dirD,sD)); }\n"
"  var ctr=[eye[0]+dir[0]*10,eye[1]+dir[1]*10,eye[2]+dir[2]*10];\n"
"  var under=eye[1]<waveY(eye[0],eye[2],t)+0.04;\n"
"  var VP=mMul(mTrans(EXO.view.ox,EXO.view.oy,0),mMul(mPersp(fovy,asp,sD>0.2?0.12:0.5,gT>0?4000:2000),mLook(eye,ctr,[0,1,0])));\n"
"  var hfx=Math.atan(Math.tan(fovy/2)*asp);\n"
"  LAB._eye=eye; LAB._k=2*Math.tan(fovy/2)/Math.max(1,C.clientHeight); LAB._under=under;\n"
"  var rrT=ringFit(VP); rrT+=(14-rrT)*sD; if(!LAB._rrInit){ LAB.RR=rrT; LAB._rrInit=1; } else LAB.RR+=(rrT-LAB.RR)*0.2;\n")
rex(cam_pat, new_cam)

# 11. overcast, water palette, under-water fog — right after the dusk/sun colours are known
rep("  var mR=norm3(cross3(moonDir,[0,1,0])), mU=cross3(mR,moonDir);",
    "  var mR=norm3(cross3(moonDir,[0,1,0])), mU=cross3(mR,moonDir);\n"
    "  var WT=WATER[LAB.water]||WATER.subtropic, cl=Math.max(0,Math.min(1,LAB.cloud)), ov=cl*cl*0.80;\n"
    "  var lumH=hor[0]*0.30+hor[1]*0.55+hor[2]*0.15; hor=mix3(hor,[lumH*0.92,lumH*0.95,lumH*1.0],ov);\n"
    "  var lumZ=zen[0]*0.30+zen[1]*0.55+zen[2]*0.15; zen=mix3(zen,[lumZ*1.25,lumZ*1.30,lumZ*1.38],ov*0.9);\n"
    "  var sunSea=sunUp*(1-0.88*cl*cl);\n"
    "  var wDeep=mix3(WT.deepN,WT.deepD,dayF), wShal=mix3(WT.shalN,WT.shalD,dayF);\n"
    "  var lumW=wDeep[0]*0.3+wDeep[1]*0.55+wDeep[2]*0.15; wDeep=mix3(wDeep,[lumW*0.95,lumW*1.0,lumW*1.05],ov*0.55);\n"
    "  var wFog=[wDeep[0]*0.55+wShal[0]*0.45,wDeep[1]*0.55+wShal[1]*0.45,wDeep[2]*0.55+wShal[2]*0.45];\n"
    "  var wUp=[wShal[0]*1.5+0.04*dayF,wShal[1]*1.5+0.10*dayF,wShal[2]*1.5+0.10*dayF];\n"
    "  /* בדרך אל הגלובוס מסתכלים ישר למטה: מה שמעבר לקצה רשת הים מקבל את צבע הים, והרשת נמוגה אליו בערפל */\n"
    "  if(gT>0&&!under){ var seaTop=[wDeep[0]*0.55+wShal[0]*0.45+zen[0]*0.10,wDeep[1]*0.55+wShal[1]*0.45+zen[1]*0.10,wDeep[2]*0.55+wShal[2]*0.45+zen[2]*0.10];\n"
    "    hor=mix3(hor,seaTop,gT); zen=mix3(zen,seaTop,gT*0.92); }\n"
    "  var fogCol=under?wFog:hor;")
rep("  gl.uniform3fv(SKY.u('uZen'),zen); gl.uniform3fv(SKY.u('uHor'),hor); gl.uniform3fv(SKY.u('uSunCol'),sunCol);",
    "  gl.uniform3fv(SKY.u('uZen'),under?wUp:zen); gl.uniform3fv(SKY.u('uHor'),under?wFog:hor); gl.uniform3fv(SKY.u('uSunCol'),sunCol);\n"
    "  gl.uniform1f(SKY.u('uUnder'),under?1:0); gl.uniform1f(SKY.u('uUGlow'),sunUp*(1-0.7*cl));\n"
    "  gl.uniform3f(SKY.u('uAbyss'),wDeep[0]*0.10,wDeep[1]*0.12,wDeep[2]*0.16);\n"
    "  gl.uniform1f(SKY.u('uCloudOn'),cl>0.02?1:0); gl.uniform1f(SKY.u('uCloudTh'),0.485+0.118*probit(1-cl));\n"
    "  var cwr=((c.windDir+180)%360)*D2R; gl.uniform2f(SKY.u('uCloudV'),-Math.sin(cwr),Math.cos(cwr));")
rep("  gl.uniform1f(SKY.u('uSunUp'),sunUp); gl.uniform1f(SKY.u('uNight'),nightF);",
    "  gl.uniform1f(SKY.u('uSunUp'),under?0:sunUp); gl.uniform1f(SKY.u('uNight'),under?0:nightF);")
rep("  gl.uniform1f(SKY.u('uMoonUp'),moonUp); gl.uniform1f(SKY.u('uIllum'),mp.illum);",
    "  gl.uniform1f(SKY.u('uMoonUp'),under?0:moonUp); gl.uniform1f(SKY.u('uIllum'),mp.illum);")
rep("  var fogD=0.0048;",
    "  var fogD=under?0.024:(1.45/Math.max(30,LAB.vis))*(1-0.45*gT);\n"
    "  var lk=1-0.62*cl*cl; lightCol=[lightCol[0]*lk,lightCol[1]*lk,lightCol[2]*lk];\n"
    "  ambSky=[ambSky[0]*(1+0.30*ov),ambSky[1]*(1+0.30*ov),ambSky[2]*(1+0.30*ov)];")
rep("  gl.uniform3fv(SEA.u('uDeep'),mix3(P.deepN,P.deepD,dayF));", "  gl.uniform3fv(SEA.u('uDeep'),wDeep); gl.uniform1f(SEA.u('uUnder'),under?1:0);")
rep("  gl.uniform3fv(SEA.u('uShal'),mix3(P.shalN,P.shalD,dayF));", "  gl.uniform3fv(SEA.u('uShal'),wShal);")
rep("  gl.uniform3fv(SEA.u('uHor'),hor); gl.uniform3fv(SEA.u('uFogCol'),hor);", "  gl.uniform3fv(SEA.u('uHor'),hor); gl.uniform3fv(SEA.u('uFogCol'),fogCol);")
rep("  gl.uniform1f(SEA.u('uSunUp'),sunUp); gl.uniform1f(SEA.u('uFogD'),fogD);", "  gl.uniform1f(SEA.u('uSunUp'),sunSea); gl.uniform1f(SEA.u('uFogD'),fogD);")
rep("  gl.uniform3fv(SOLID.u('uFogCol'),hor); gl.uniform3fv(SOLID.u('uEye'),eye);", "  gl.uniform3fv(SOLID.u('uFogCol'),fogCol); gl.uniform3fv(SOLID.u('uEye'),eye);")
rep("  gl.uniform3fv(SAILP.u('uFogCol'),hor); gl.uniform3fv(SAILP.u('uEye'),eye);", "  gl.uniform3fv(SAILP.u('uFogCol'),fogCol); gl.uniform3fv(SAILP.u('uEye'),eye);")

# 12. draw order: from below, the current must be depth-tested against the hull
rep("  drawRange(rngCur,'cur',VP,eye,hor,fogD,nightF);", "  if(!under){ drawRange(rngCur,'cur',VP,eye,fogCol,fogD,nightF); drawRange(rngRing,'ring',VP,eye,fogCol,fogD,nightF); }")
rep("  if(mode==='cur') gl.disable(gl.DEPTH_TEST);", "  if(mode==='cur'||mode==='ring') gl.disable(gl.DEPTH_TEST);")
rep("  drawRange(rngSurf,'surf',VP,eye,hor,fogD,nightF);", "  if(under) drawRange(rngCur,'curU',VP,eye,fogCol,fogD,nightF);\n  drawRange(rngSurf,'surf',VP,eye,fogCol,fogD,nightF);")
rep("  drawRange(rngAir,'air',VP,eye,hor,fogD,nightF,navCol);", "  drawRange(rngAir,'air',VP,eye,fogCol,fogD,nightF,navCol);")

# 13. nobody stands in front of the lens in the deck view
rep("  var sway=Math.sin(t*0.62)*0.035;", "  if(sD<0.22){\n  var sway=Math.sin(t*0.62)*0.035;")
rep("  drawMesh(D_HAIR, mMul(dM,mTrans(-0.012,0.030,0)), COL.hair);", "  drawMesh(D_HAIR, mMul(dM,mTrans(-0.012,0.030,0)), COL.hair);\n  }")

# 14. per-frame state for the page
rep("  for(var li=0;li<EXO._onFrame.length;li++) EXO._onFrame[li](EXO.frame);",
    "  EXO.frame.u=cam.u; EXO.frame.sD=sD; EXO.frame.gT=gT; EXO.frame.gX=gX; EXO.frame.touching=Object.keys(pts).length>0;\n"
    "  EXO.frame.under=under; EXO.frame.deck=deck; EXO.frame.el=cam.el; EXO.frame.pitch=pitch; EXO.frame.heave=bodyY;\n"
    "  labAnchors(VP,t);\n"
    "  for(var li=0;li<EXO._onFrame.length;li++) EXO._onFrame[li](EXO.frame);")

# 15. steering: vertical drag on touch too, free wheel zoom, zoom-out hand-off
rep("  cam.auto=false; camFly=null; cam.tilt=0; C.classList.add('drag');",
    "  cam.auto=false; camFly=null; cam.tilt=0; C.classList.add('drag'); LAB.ringHotT=performance.now();")
rex(r"  cam\.vaz=-dx\*0\.0035; cam\.az\+=cam\.vaz;\n.*?  if\(e\.pointerType==='mouse'\)\{ cam\.vel=dy\*0\.0030; cam\.el=clamp\(cam\.el\+cam\.vel,0\.045,1\.45\); \}\n",
    "  var sgD=1-2*(cam.u<0?smooth(0,1,-cam.u):0); LAB.ringHotT=performance.now();      /* על הסיפון הגרירה מסובבת את הראש; הסימן מתהפך בהדרגה, דרך אפס */\n"
    "  cam.vaz=-dx*0.0035*sgD; cam.az+=cam.vaz;\n"
    "  cam.vel=dy*0.0030*sgD; cam.el=clamp(cam.el+cam.vel,-1.30,1.50);\n")
rep("  if(n>=2){ var d=pdist(); if(pinch0>10&&d>10) cam.r=clamp(r0*pinch0/d,9,150); kick(); return; }",
    "  if(n>=2){ var d=pdist(); if(pinch0>10&&d>10){ var uw=u0+Math.log(pinch0/d);\n"
    "      if(uCeil()===U_MAX){ if(uw>U_MAX+0.36&&EXO.onZoomOut){ pinch0=0; EXO.onZoomOut(); } }\n"
    "      else if(EXO.globeOwns){ if(EXO.onOver) EXO.onOver(uw-U_GLOBE); kick(); return; }      /* אחרי המסירה אותה צביטה נוהגת בגלובוס, פנימה והחוצה */\n"
    "      setU(uw); } kick(); return; }")
rep("  if(Object.keys(pts).length===2){ pinch0=pdist(); r0=cam.r; }", "  if(Object.keys(pts).length===2){ pinch0=pdist(); r0=cam.r; u0=(cam.u===undefined?uOfR(cam.r):cam.u); }")
rep("var pts={}, pinch0=0, r0=0;", "var pts={}, pinch0=0, r0=0, u0=0;")
rep("  if(!e.ctrlKey&&!e.shiftKey) return;\n  cam.r=clamp(cam.r+e.deltaY*0.05,9,150); cam.auto=false; e.preventDefault(); kick();",
    "  if(cam.u===undefined) cam.u=uOfR(cam.r);\n"
    "  if(uCeil()===U_MAX&&cam.u>=U_MAX-0.004&&e.deltaY>0&&EXO.onZoomOut) EXO.onZoomOut();\n"
    "  setU(cam.u+clamp(e.deltaY,-240,240)*0.0012);\n"
    "  cam.auto=false; e.preventDefault(); kick();")
rep("EXO.reframe=function(){ cam.r=homeR(); kick(); };",
    "EXO.reframe=function(){ if(cam.u===undefined||(cam.u>=0&&cam.u<=U_MAX)) cam.r=homeR(); kick(); };\n"
    "EXO.glideTo=function(u,dur){ if(cam.u===undefined) cam.u=uOfR(cam.r); if(reduce||!dur){ setU(u,true); camGlide=null; } else camGlide={t0:performance.now(),dur:dur,from:cam.u,to:Math.max(U_FOV,Math.min(uCeil(),u))}; kick(); };\n"
    "EXO.setU=function(u){ setU(u); kick(); }; EXO.zoomAxis={DECK:U_DECK,MAX:U_MAX,TOP:U_TOP,GLOBE:U_GLOBE,uOfR:uOfR};\n"
    "EXO.setCam=function(mode){ cam.auto=false; camFly=null; cam.tilt=0; cam.vaz=cam.vel=0;\n"
    "  if(mode==='deck'){ cam.az=-FIX.cog*D2R; cam.el=0.20; EXO.glideTo(U_DECK,1400); } else { cam.el=0.26; EXO.glideTo(uOfR(homeR()),1400); } kick(); };\n"
    "EXO.dive=function(down){ LAB.cam='orbit'; EXO.lookToward((((-cam.az*R2D)%360)+360)%360,{el:down?-0.40:0.26,dur:1500}); };\n"
    "EXO.setZoom=function(r){ setU(uOfR(clamp(r,9,150)),true); camGlide=null; kick(); };\n"
    "EXO.setEl=function(v){ cam.el=v; kick(); };\n"
    "EXO.kick=function(){ kick(); };")


# ======================= production patches (not in the lab) =======================

# P1. conditions: six more columns when data.js carries them (pressure, air, sea, cloud, visibility, rain).
#     Old nine-column rows keep working: the new fields are then null and the page hides those items.
rep("  return { wind:L(best[1],nx[1]), gust:L(best[2],nx[2]), windDir:A(best[3],nx[3]),",
    "  function X(i){ var a=best[i], b=nx[i]; if(a==null||b==null) return (a==null?(b==null?null:b):a); return L(a,b); }\n"
    "  function at3(i){ var t=now-3*3600000, k, r0=null, r1=null; for(k=0;k<COND.length;k++){ var tk=Date.parse(COND[k][0]+'Z'); if(tk<=t) r0=COND[k]; else { r1=COND[k]; break; } }\n"
    "    if(!r0||r0[i]==null) return null; if(!r1||r1[i]==null) return r0[i]; var a0=Date.parse(r0[0]+'Z'), a1=Date.parse(r1[0]+'Z'); return r0[i]+(r1[i]-r0[i])*Math.max(0,Math.min(1,(t-a0)/(a1-a0||1))); }\n"
    "  var ext=(best.length>=15), pNow=ext?X(9):null, pOld=ext?at3(9):null;\n"
    "  return { pres:pNow, presTrend:(pNow!=null&&pOld!=null)?(pNow-pOld):null, airT:ext?X(10):null, seaT:ext?X(11):null,\n"
    "           cloud:ext?X(12):null, visKm:ext?X(13):null, precip:ext?X(14):null,\n"
    "           wind:L(best[1],nx[1]), gust:L(best[2],nx[2]), windDir:A(best[3],nx[3]),")

# P2. sky cover, visibility and water colour come from the data, not from a slider
rep("  var WT=WATER[LAB.water]||WATER.subtropic, cl=Math.max(0,Math.min(1,LAB.cloud)), ov=cl*cl*0.80;",
    "  var WT=waterNow(c), cl=Math.max(0,Math.min(1,(c.cloud==null?LAB.cloud:c.cloud/100))), ov=cl*cl*0.80;")
rep("  var fogD=under?0.024:(1.45/Math.max(30,LAB.vis))*(1-0.45*gT);",
    "  var fogD=under?0.024:(1.45/Math.max(30,(c.visKm==null?LAB.vis:Math.max(90,Math.min(300,c.visKm*120)))))*(1-0.45*gT);")
rep("function probit(p){",
    "/* צבע המים לפי המקום: סובטרופי, טרופי (לפי טמפרטורת המים כשיש, אחרת לפי קו הרוחב), ואפור־ירקרק בקווי הרוחב הגבוהים */\n"
    "var _wFor=null, _wVal=null;\n"
    "function mixW(a,b,f){ var o={}, k; for(k in a){ o[k]=[a[k][0]+(b[k][0]-a[k][0])*f, a[k][1]+(b[k][1]-a[k][1])*f, a[k][2]+(b[k][2]-a[k][2])*f]; } return o; }\n"
    "function waterNow(c){ if(_wFor===c&&_wVal) return _wVal; var la=Math.abs(FIX.lat);\n"
    "  var tw=(c.seaT!=null)?smooth(24.5,28,c.seaT):smooth(26,12,la), sw=smooth(38,50,la);\n"
    "  _wFor=c; _wVal=mixW(mixW(WATER.subtropic,WATER.tropic,tw),WATER.south,sw); return _wVal; }\n"
    "function probit(p){")

# P3. pause while something covers the window (the journey panel)
rep("  if(!visible){ requestAnimationFrame(frame); return; }", "  if(!visible||EXO.paused){ requestAnimationFrame(frame); return; }")
rep("EXO.kick=function(){ kick(); };", "EXO.kick=function(){ kick(); };\nEXO.pause=function(on){ EXO.paused=!!on; if(!on) kick(); };")

# P4. wording of the no-WebGL fallback: the rest of the page now lives in the menu
rep("הדפדפן הזה לא מריץ WebGL, אז ההדמיה לא תוצג. כל השאר בעמוד זמין כרגיל.",
    "הדפדפן הזה לא מריץ WebGL, אז ההדמיה לא תוצג. המסע, הצי והניתוח המלא זמינים מהתפריט.")

# P5. header
rep("/* ===== deck.js — סצנת הסיפון =====",
    "/* ===== v2/deck.js — מנוע ההדמיה של הדף במסך מלא =====\n"
    "   נבנה אוטומטית מ-assets/deck.js (הדף הקודם) ועוד תוספות: טבעת מצפן על המים, זרמי אוויר סביב המפרשים,\n"
    "   נחשי זרם, קשתות גל, עננים, מבט מהסיפון ומתחת למים. לא עורכים את הקובץ הזה ביד.\n"
    "   ===== deck.js — סצנת הסיפון =====")

# ======================= מנה א׳, 20.9.2026 =======================

# A1 (9א׳). מידות: השלט שעל הרציף (Baba 35): אורך 10.62, רוחב 3.40, שוקע 1.68. היה 10.67 / 3.99 / 1.76.
K = 3.40/3.99
rep("var LOA=10.67, BEAM=3.99, FREE=1.02;",
    "var LOA=10.62, BEAM=3.40, FREE=1.02;   /* Baba 35, לפי השלט שעל הרציף: LOA 10.62, רוחב 3.40, שוקע 1.68 */")
# כל מה שהיה מכויל לרוחב הישן מצטמצם איתו: התא, הדודג'ר, הקוקפיט, המדרגה, הגנרטור
rep("var st=[[-2.05,1.08],[-1.0,1.12],[0.4,1.10],[1.5,1.00],[2.35,0.78],[2.75,0.50]];",
    "var st=[[-2.05,0.94],[-1.0,0.98],[0.4,0.96],[1.5,0.87],[2.35,0.67],[2.75,0.43]];")
rep("z=-Math.cos(a)*1.16;", "z=-Math.cos(a)*1.02;")
# ירכתי קאנו מלאים יותר: עם הרוחב האמיתי הקוקפיט כבר לא נכנס בירכתיים המחודדים של הדגם הישן
rep("function hb(t){ return (BEAM/2)*Math.pow(Math.sin(Math.PI*Math.pow(t,1.05)),0.66); }",
    "function hb(t){ return (BEAM/2)*Math.pow(Math.sin(Math.PI*Math.pow(t,1.05)),t<0.5?0.50:0.66); }")
rep("if(xm>-4.65 && xm<-2.32 && Math.abs(zm)<0.92) continue;", "if(xm>-4.50 && xm<-2.32 && Math.abs(zm)<0.72) continue;")
rep("M_COAM1=boxMesh(2.0,0.24,0.09,-3.35,FREE+0.17,-0.95),", "M_COAM1=boxMesh(2.0,0.24,0.09,-3.35,FREE+0.17,-0.76),")
rep("M_COAM2=boxMesh(2.0,0.24,0.09,-3.35,FREE+0.17,0.95),", "M_COAM2=boxMesh(2.0,0.24,0.09,-3.35,FREE+0.17,0.76),")
rep("M_SOLE=boxMesh(2.30,0.07,1.84,-3.48,FREE-0.44,0),", "M_SOLE=boxMesh(2.22,0.07,1.46,-3.41,FREE-0.44,0),")
rep("M_STEP=boxMesh(0.52,0.13,1.26,-2.58,FREE-0.15,0),", "M_STEP=boxMesh(0.52,0.13,1.04,-2.58,FREE-0.15,0),")
rep("M_GEN=cylMesh(0.16,0.16,0.22,-4.95,FREE+1.95,-0.75),", "M_GEN=cylMesh(0.16,0.16,0.22,-4.95,FREE+1.95,-0.62),")
rep("M_GENP=cylMesh(0.05,0.05,1.9,-4.95,FREE+1.0,-0.75),", "M_GENP=cylMesh(0.05,0.05,1.9,-4.95,FREE+1.0,-0.62),")
# שוקע: תחתית השדרית מ-1.76 ל-1.68, וההגה איתה
rep("M_KEEL=foilMesh([[1.95,-0.72],[0.55,-1.66],[-1.35,-1.76],[-2.30,-1.60],[-2.30,-0.86]],",
    "M_KEEL=foilMesh([[1.95,-0.72],[0.55,-1.59],[-1.35,-1.68],[-2.30,-1.53],[-2.30,-0.86]],")
rep("function(y){return 0.115+0.145*Math.max(0,(y+1.8)/1.1);}),", "function(y){return 0.115+0.145*Math.max(0,(y+1.72)/1.1);}),")
rep("M_RUD=foilMesh([[-2.32,-1.68],[-3.02,-1.42],[-3.08,-0.56],[-2.32,-0.60]],", "M_RUD=foilMesh([[-2.32,-1.60],[-3.02,-1.36],[-3.08,-0.56],[-2.32,-0.60]],")

# A0. תיקון ישן שהתגלה עכשיו: הנורמלים של הסיפון, גג התא ורצפת הקוקפיט פונים למטה (סדר הקודקודים הפוך), ולכן כל
#     משטח שפונה למעלה הואר כאילו הוא פונה אל המים ויצא אפור כהה בכל צבע. השיידר הופך נורמל שפונה מהמצלמה והלאה.
rep("  ' float df=max(dl,0.0); float wr=dl*0.5+0.5;',",
    "  ' if(dot(N,uEye-vW)<0.0){ N=-N; dl=-dl; }',\n  ' float df=max(dl,0.0); float wr=dl*0.5+0.5;',")

# A0b. שני דברים שהסתירו את הסיפון מאז ומעולם: (1) לגוף היה "מכסה" בגובה קו הסיפון, 3 ס"מ מעל רשת הסיפון, שכיסה
#      אותה ואת הקוקפיט; (2) בלי עקומת חשיפה, משטח מואר מלמעלה קיבל מכפיל של כ-2.5 ונחתך: כתום יצא צהוב, והכול יצא לבן.
#      המכסה יורד, ובשיידר נוספת "ברך": עד 0.8 בלי שינוי, ומעל זה הבהירות נדחסת אל 1 בלי לשנות את הגוון.
rep("  if(hi>=0.999) for(i=0;i<NS-1;i++){ var q=i*NG+(NG-1),r=base+i*NG+(NG-1);\n    idx.push(q,q+NG,r,r,q+NG,r+NG); }\n", "")
rep("  ' vec3 col=mix(uCol*(amb+uLightCol*df),uCol,uFlat);',",
    "  ' vec3 lit=uCol*(amb+uLightCol*df); float Lm=max(lit.r,max(lit.g,lit.b));',\n"
    "  ' if(Lm>0.8) lit*=(0.8+0.2*(1.0-exp(-(Lm-0.8)/0.2)))/Lm;',\n"
    "  ' vec3 col=mix(lit,uCol,uFlat);',")

# A2 (9א׳). צבעים, לפי התמונות: טיק אפור־כסוף בלוי, סיפון כתום מחוספס עם שוליים לבנים, גג תא לבן־אפרפר, דופן לבן קריר
rep("var COL={ tops:[0.955,0.950,0.930], bott:[0.105,0.125,0.155], boot:[0.40,0.13,0.11],",
    "var COL={ tops:[0.940,0.950,0.960], bott:[0.105,0.125,0.155], boot:[0.40,0.13,0.11],   /* boot: הצבע האמיתי לא ודאי עד שתהיה תמונת יום של קו המים */")
rep("          rail:[0.455,0.285,0.135], deck:[0.80,0.77,0.70], trunk:[0.875,0.855,0.805], teak:[0.46,0.30,0.15],",
    "          rail:[0.445,0.430,0.400], deck:[0.885,0.395,0.105], deckEdge:[0.915,0.920,0.920], trunk:[0.865,0.875,0.875], teak:[0.470,0.455,0.425],\n"
    "          hatch:[0.62,0.63,0.64], vane:[0.70,0.72,0.74],")
# הסיפון: משטח לבן מקצה לקצה, ועליו משטח כתום צר יותר, מורם בחצי סנטימטר. חוד החרטום וחוד הירכתיים נשארים לבנים
rep("function deckMesh(){\n  var NS=34,NZ=8,p=[],idx=[],i,jj;", "function deckMesh(kw,lift,tMin,tMax){\n  kw=kw||0.985; lift=lift||0; var NS=34,NZ=8,p=[],idx=[],i,jj;")
rep("    var w0=hb(t0)*0.985, w1=hb(t1)*0.985;\n    var y0=sheer(t0)-0.03, y1=sheer(t1)-0.03;",
    "    if(tMin!==undefined&&(t0<tMin||t1>tMax)) continue;\n"
    "    var w0=Math.max(0,hb(t0)*0.985-(0.985-kw)*BEAM/2), w1=Math.max(0,hb(t1)*0.985-(0.985-kw)*BEAM/2);\n"
    "    var y0=sheer(t0)-0.03+lift, y1=sheer(t1)-0.03+lift;")
rep("M_DECK=deckMesh(), M_SOLE=", "M_DECK=deckMesh(), M_DECKO=deckMesh(0.905,0.006,0.085,0.955), M_SOLE=")
rep("  drawMesh(M_DECK, boatM, COL.deck);", "  drawMesh(M_DECK, boatM, COL.deckEdge);\n  drawMesh(M_DECKO,boatM, COL.deck);")
rep("  drawMesh(M_HATCH,boatM, COL.deck);", "  drawMesh(M_HATCH,boatM, COL.hatch);")
rep("  drawMesh(M_VANE, boatM, COL.deck);", "  drawMesh(M_VANE, boatM, COL.vane);")
rep("  drawMesh(M_GEN,  boatM, COL.deck);", "  drawMesh(M_GEN,  boatM, COL.vane);")

# ======================= מנה ג׳, סעיף 5: שמיים אמיתיים =======================
# C1. הכוכבים מהקטלוג מצוירים מיד אחרי השמיים, לפני הים. כשהם פעילים, רעש הכוכבים הישן כבוי.
rep("  'uniform float uCloudOn,uCloudTh,uUnder,uUGlow; uniform vec2 uCloudV; uniform vec3 uAbyss;',",
    "  'uniform float uCloudOn,uCloudTh,uUnder,uUGlow,uStarCat,uMW; uniform vec2 uCloudV; uniform vec3 uAbyss; uniform mat3 uCel;',")
rep("  ' if(uNight>0.01 && r.y>0.0){ vec3 g=r*170.0; vec3 q=floor(g); float s=hash(q);',",
    "  /* שביל החלב: מודל בקואורדינטות גלקטיות. פס שמתרחב ומתבהר לכיוון מרכז הגלקסיה, בליטה, בקע כהה לאורך הציר, וענני מגלן */\n"
    "  ' if(uMW>0.003 && r.y>-0.02 && uUnder<0.5){ vec3 e=uCel*r;',\n"
    "  '  vec3 gq=vec3(dot(e,vec3(-0.0548756,-0.8734371,-0.4838350)),dot(e,vec3(0.4941094,-0.4448296,0.7469822)),dot(e,vec3(-0.8676661,-0.1980764,0.4559838)));',\n"
    "  '  float gb=asin(clamp(gq.z,-1.0,1.0)), gl2=atan(gq.y,gq.x);',\n"
    "  '  float core=exp(-gl2*gl2/1.35), wid=0.105+0.115*core;',\n"
    "  '  float band=exp(-gb*gb/(wid*wid))*(0.46+0.54*core)+0.85*exp(-(gl2*gl2/0.10+gb*gb/0.030));',\n"
    "  '  float mott=fbmc(vec2(gl2*5.0,gb*11.0)+3.7);',\n"
    "  '  float rift=smoothstep(0.46,0.70,fbmc(vec2(gl2*3.2+9.1,gb*16.0)))*exp(-gb*gb/0.0065)*(0.35+0.65*core);',\n"
    "  '  band*=(0.55+0.90*mott)*(1.0-0.72*rift);',\n"
    "  '  float lmc=exp(-(1.0-dot(e,vec3(0.0547,0.3416,-0.9383)))/0.0019), smc=exp(-(1.0-dot(e,vec3(0.2879,0.0675,-0.9553)))/0.00055);',\n"
    "  '  band+=(0.85*lmc+0.60*smc)*(0.75+0.5*mott);',\n"
    "  '  c+=vec3(0.62,0.68,0.84)*band*0.19*uMW*smoothstep(-0.02,0.20,r.y); }',\n"
    "  ' if(uNight>0.01 && r.y>0.0 && uStarCat<0.5){ vec3 g=r*170.0; vec3 q=floor(g); float s=hash(q);',")
rep("  gl.uniform1f(SKY.u('uWax'),mp.waxing?1:0);\n  gl.drawArrays(gl.TRIANGLES,0,3);\n  gl.disableVertexAttribArray(SKY.a('aP')); gl.depthMask(true);",
    "  gl.uniform1f(SKY.u('uWax'),mp.waxing?1:0);\n"
    "  var starsOn=(!under&&nightF>0.04&&starsInit()), liteQ=(EXO.quality==='lite');\n"
    "  gl.uniform1f(SKY.u('uStarCat'),starsOn?1:0);\n"
    "  /* שביל החלב נראה רק בשמיים חשוכים באמת: דמדומים, ירח (לפי החלק המואר והגובה) ואובך מוחקים אותו. במצב קל: בלי */\n"
    "  var mwK=(starsOn&&!liteQ)?Math.pow(nightF,3)*Math.max(0,1-1.35*moonUp*mp.illum)*(1-0.6*cl):0;\n"
    "  gl.uniform1f(SKY.u('uMW'),mwK); if(mwK>0){ var cr=celestialRot(nowMs); gl.uniformMatrix3fv(SKY.u('uCel'),false,new Float32Array([cr[0],cr[3],cr[6],cr[1],cr[4],cr[7],cr[2],cr[5],cr[8]])); }\n"
    "  gl.drawArrays(gl.TRIANGLES,0,3);\n  gl.disableVertexAttribArray(SKY.a('aP')); gl.depthMask(true);\n"
    "  if(starsOn) drawStars(VP,eye,nowMs,t,nightF,moonUp,mp.illum,moonDir,cl,-Math.sin(cwr),Math.cos(cwr),C.width/Math.max(1,C.clientWidth));")

# ======================= מנה ג׳, סעיף 8: הגל והזרם (flow_add.js) =======================
# W1. קווי פסגה ארוכים במקום הקשתות הקצרות. הקשתות הישנות נשארות תחת LAB.wave==='arcsOld'.
rep("    var nC=Math.round(NCHEV*(EXO.quality==='lite'?0.6:1));\n",
    "    var nC=Math.round(NCHEV*(EXO.quality==='lite'?0.6:1));\n"
    "    if(LAB.wave==='arcs') crestLines(c,t,dt,eye);\n")
rep("      if(LAB.wave==='arcs'){ if(i<10) crestArc(", "      if(LAB.wave==='arcsOld'){ if(i<10) crestArc(")
# W2. הזרם: buildCurrent החדש יושב ב-flow_add.js; הישן נשאר כ-buildCurrentOld (LAB.cur שונה מ-'ribbon').
rep("function buildCurrent(c,t,dt,eye){\n  if(!EXO.layers.cur) return;\n  var i,p,a, cr=c.curDir*D2R, cspd=Math.max(0.03,c.cur*0.5144);",
    "function buildCurrentOld(c,t,dt,eye){\n  if(!EXO.layers.cur) return;\n  var i,p,a, cr=c.curDir*D2R, cspd=Math.max(0.03,c.cur*0.5144);")
rep("wave:'arcs', cur:'snake',", "wave:'arcs', cur:'ribbon',")
# W3. גוון הסרט בחלק השברי של אינדקס הצבע: 1.0 בהיר ורווי (מואר מלמעלה), 1.45 כהה ודהוי (עמוק, צד תחתון).
rep("(vC<1.5?uCc:(", "(vC<1.5?mix(uCc,vec3(0.035,0.17,0.27),clamp((vC-1.0)*2.2,0.0,1.0)):(")
# W4. מקום במאגר לסרטים העבים ולקווי הפסגה
rep("+NCHEV*48+900+36000;", "+NCHEV*48+900+36000+18000;")

# ======================= מנה ד׳, סעיף 9ד׳: תורן, חיבל, מפרשים ודגל (boat_add.js) =======================
# B1. התורן והבום למידות האמיתיות: I=14.60 מעל הסיפון, E=4.72.
rep("    M_MAST=cylMesh(0.082,0.112,13.4,0.35,FREE+6.7,0),",
    "    M_MAST=cylMesh(0.086,0.118,14.95,0.35,FREE+7.40,0),")
rep("M_SPRIT=cylMesh(0.075,0.062,1.85,0,0,0), M_BOOM=cylMesh(0.058,0.058,4.4,0,0,0),",
    "M_SPRIT=cylMesh(0.082,0.066,1.32,0,0,0), M_BOOM=cylMesh(0.062,0.058,4.80,0,0,0),")
rep("  drawMesh(M_BOOM, mMul(mMul(mainM,mTrans(-2.20,0,0)),mRotZ(Math.PI/2)),COL.spar);",
    "  drawMesh(M_BOOM, mMul(mMul(mainM,mTrans(-2.40,0,0)),mRotZ(Math.PI/2)),COL.spar);")
rep("  var lx=0.35, ly=FREE+13.55, lz=0;", "  var lx=0.35, ly=FREE+15.05, lz=0;")
# B2. שטחי המפרשים: P=13.26 ו-E=4.72 לראשי, והמפרשים הקדמיים לפי אורך החלוץ ולא שליש ממנו.
rep("    M_MAIN=sailMesh(4.3,9.9,0.55), M_MAINR=sailMesh(4.0,7.4,0.46),\n"
    "    M_YANK=sailMesh(3.7,9.0,0.58), M_STAY=sailMesh(2.5,6.7,0.5),\n"
    "    M_SPIN=sailMesh(6.1,11.2,1.10), M_JIB=sailMesh(2.5,6.4,0.40),",
    "    M_MAIN=sailMesh(4.72,13.26,0.55), M_MAINR=sailMesh(4.30,9.60,0.44),\n"
    "    M_YANK=sailMesh(4.45,13.40,0.58,0.363), M_STAY=sailMesh(3.25,10.35,0.50,0.246),\n"
    "    M_SPIN=sailMesh(6.40,14.00,1.10,0.376), M_JIB=sailMesh(2.95,8.60,0.40,0.400),")
rep("function sailMesh(foot,luff,camber){\n  var NU=12,NV=16,p=[],idx=[],uv=[],i,j;",
    "function sailMesh(foot,luff,camber,rake){\n  var NU=12,NV=16,p=[],idx=[],uv=[],i,j;\n"
    "  var rkS=Math.sin(rake||0), rkC=Math.cos(rake||0);")
rep("    p.push(-chord*u, v*luff, Math.sin(Math.PI*Math.min(1,u+0.001))*Math.sin(Math.PI*v*0.88+0.16)*camber);",
    "    p.push(-chord*u-v*luff*rkS, v*luff*rkC, Math.sin(Math.PI*Math.min(1,u+0.001))*Math.sin(Math.PI*v*0.88+0.16)*camber);")
# B3. המפרשים הקדמיים: הלוף נוטה אחורה עם החלוץ (גזירה ב-sailMesh, כדי שהתחתית תישאר אופקית והקלו לא ייפול אל תוך הגוף).
rep("  var yankM=mMul(mMul(boatM,mTrans(6.80,FREE+0.52,0)),mRotY(jibA));\n"
    "  var stayM=mMul(mMul(boatM,mTrans(3.10,FREE+0.18,0)),mRotY(jibA));\n"
    "  var spinM=mMul(mMul(boatM,mTrans(7.30,FREE+0.26,0)),mRotY(jibA*0.78));",
    "  var yankM=mMul(mMul(boatM,mTrans(5.71,FREE+0.52,0)),mRotY(jibA));\n"
    "  var stayM=mMul(mMul(boatM,mTrans(3.10,FREE+0.18,0)),mRotY(jibA));\n"
    "  var jibM2=mMul(mMul(boatM,mTrans(4.90,FREE+0.34,0)),mRotY(jibA));\n"
    "  var spinM=mMul(mMul(boatM,mTrans(6.05,FREE+0.30,0)),mRotY(jibA*0.78));")
rep("    drawSail(M_JIB, jibM, TEX_FLAG, flatS);", "    drawSail(M_JIB, jibM2, TEX_FLAG, flatS);")
# B4. הדגל יורד מהמפרשים: כולם לבנים וחלקים, כמו בתמונות.
rep("    drawSail(M_SPIN, spinM, TEX_FLAG, flatS);", "    drawSail(M_SPIN, spinM, TEX_PLAIN, flatS);")
rep("    drawSail(M_JIB, jibM2, TEX_FLAG, flatS);", "    drawSail(M_JIB, jibM2, TEX_PLAIN, flatS);")
rep("    drawSail(M_YANK, yankM, TEX_FLAG, flatS);", "    drawSail(M_YANK, yankM, TEX_PLAIN, flatS);")
rep("var TEX_FLAG=flagTexture(), TEX_NUM=numberTexture(),", "var TEX_FLAG=flagTexture(), TEX_NUM=mainTexture(),")
# B5. החיבל הקבוע, המשטחים, והמפרש שהורד כגליל על החרטומית.
rep("  drawMesh(M_SPRIT,mMul(mMul(boatM,mTrans(6.08,FREE+0.42,0)),mRotZ(Math.PI/2)),COL.spar);",
    "  drawMesh(M_SPRIT,mMul(mMul(boatM,mTrans(6.08,FREE+0.42,0)),mRotZ(Math.PI/2)),COL.spar);\n"
    "  drawMesh(M_RIG,  boatM, COL.wire);\n"
    "  drawMesh(M_SPREAD,boatM, COL.spar);\n"
    "  if(plan==='spin'||plan==='heavy') drawMesh(M_FURL, mMul(mMul(boatM,mTrans(5.42,FREE+0.58,0)),mRotZ(Math.PI/2)), COL.tops);")
# B6. דגל ישראל קטן מעל הירכתיים, מתנופף עם הרוח המדומה.
rep("  gl.uniform1f(SAILP.u('uTwo'),0);\n  drawSail(M_DECS, boatM, TEX_NAME, 1);",
    "  var enR=(((c.windDir+180)-FIX.cog+540)%360-180)*D2R, enW=Math.min(1,c.wind/16);\n"
    "  var enM=mMul(mMul(mMul(boatM,mTrans(-3.45,FREE+5.15,0)),mRotY(-enR+Math.sin(t*1.7)*0.09*enW)),mRotZ(-0.13+Math.sin(t*2.3+1.1)*0.05*enW));\n"
    "  gl.uniform1f(SAILP.u('uTwo'),1); drawSail(M_ENSIGN, enM, TEX_FLAG, 1);\n"
    "  gl.uniform1f(SAILP.u('uTwo'),0);\n  drawSail(M_DECS, boatM, TEX_NAME, 1);")
rep("          dodge:[0.93,0.40,0.11], spar:[0.86,0.84,0.79], sail:[1,1,1],",
    "          dodge:[0.93,0.40,0.11], spar:[0.86,0.84,0.79], sail:[1,1,1], wire:[0.30,0.31,0.33],")

# ================= מנה ד׳, סעיפים 9ג׳, 9ב׳, 9ה׳, 9ו׳ (deck9_add.js) =================
# D1. צבעים חדשים
rep("          dodge:[0.93,0.40,0.11], spar:[0.86,0.84,0.79], sail:[1,1,1], wire:[0.30,0.31,0.33],",
    "          dodge:[0.93,0.40,0.11], spar:[0.86,0.84,0.79], sail:[1,1,1], wire:[0.30,0.31,0.33],\n"
    "          seam:[0.855,0.862,0.870], steel:[0.78,0.80,0.83], jack:[0.95,0.80,0.12], timber:[0.46,0.25,0.13],\n"
    "          solar:[0.125,0.135,0.165], bronze:[0.31,0.34,0.24], glass:[0.10,0.13,0.15], ring:[0.86,0.15,0.12],")
# D2. הפרטים הקטנים: רק קרוב, ולא במצב קל
rep("  drawMesh(M_BOOM, mMul(mMul(mainM,mTrans(-2.40,0,0)),mRotZ(Math.PI/2)),COL.spar);",
    "  drawMesh(M_BOOM, mMul(mMul(mainM,mTrans(-2.40,0,0)),mRotZ(Math.PI/2)),COL.spar);\n"
    "  var detail=(EXO.quality!=='lite') && (cam.r<46 || sD<0.55);\n"
    "  drawMesh(M_SEAMS,boatM, COL.seam);\n"
    "  drawMesh(M_RUB,  boatM, COL.rail);\n"
    "  if(detail){\n"
    "    drawMesh(M_STEEL, boatM, COL.steel);\n"
    "    drawMesh(M_JACK,  boatM, COL.jack);\n"
    "    drawMesh(M_TEAKD, boatM, COL.rail);\n"
    "    drawMesh(M_TILLER,boatM, COL.timber);\n"
    "    drawMesh(M_DARK,  boatM, COL.solar);\n"
    "    drawMesh(M_PORTS, boatM, COL.bronze);\n"
    "    drawMesh(M_PORTG, boatM, COL.glass);\n"
    "    drawMesh(M_RING,  boatM, COL.ring);\n"
    "    drawMesh(M_SLING, boatM, COL.tops);\n"
    "    drawMesh(M_ROPE,  boatM, COL.dodge);\n"
    "    if(plan!=='poled') drawMesh(M_POLE, mMul(mMul(boatM,mTrans(1.35,dY(1.35)+0.14,0.92)),mRotZ(Math.PI/2)), COL.spar);\n"
    "  }")
# D3. הגה רוח: להב גבוה ושטוח (כ-1.3 מ׳), נוטה מעט, ומתחתיו מנגנון המטוטלת
rep("    M_VANEP=boxMesh(0.06,0.95,0.06,-5.45,FREE+0.45,0),\n    M_VANE=boxMesh(0.42,0.80,0.035,-5.62,FREE+1.05,0),",
    "    M_VANEP=boxMesh(0.06,0.95,0.06,-5.45,FREE+0.45,0),\n    M_VANE=boxMesh(0.32,1.28,0.028,0,0.64,0),")
rep("  drawMesh(M_VANE, boatM, COL.vane);",
    "  drawMesh(M_VANE, mMul(mMul(mMul(boatM,mTrans(-5.62,FREE+0.62,0)),mRotZ(-0.16)),mRotY(Math.sin(t*0.37)*0.20+((c.windDir-FIX.cog+540)%360-180)*D2R*0.10)), COL.vane);")
# D4. מדבקת המספר ובדי החסות: מצוירים עם מפרשי הבד, כי יש להם טקסטורה עם שקיפות
rep("  drawSail(M_DECS, boatM, TEX_NAME, 1);\n  drawSail(M_DECP, boatM, TEX_NAME, 1);",
    "  drawSail(M_DECS, boatM, TEX_NAME, 1);\n  drawSail(M_DECP, boatM, TEX_NAME, 1);\n"
    "  drawSail(M_SEV7, boatM, TEX_SEVEN, 1);\n  drawSail(M_SEV7P,boatM, TEX_SEVEN, 1);\n"
    "  if(detail){ gl.uniform1f(SAILP.u('uTwo'),1);\n"
    "    drawSail(M_CLOTHS,boatM, TEX_SPON, 1); drawSail(M_CLOTHP,boatM, TEX_SPON, 1);\n"
    "    gl.uniform1f(SAILP.u('uTwo'),0); }")
# D5. 9ה׳: הזוהר מהאשנבים והאור האדום בקוקפיט
rep("  navLight(boatM,eye,right,upv,nightF,hRad);",
    "  cabinGlow(boatM,eye,right,upv,nightF);\n  navLight(boatM,eye,right,upv,nightF,hRad);")
# D6. 9ו׳: סירה של 9.6 טון עם שדרית מלאה — עלרוד וגלגול איטיים ומרוסנים, לא קפיציים
rep("  var pitch=Math.atan2(yB-yS,LOA)*0.85, roll=-Math.atan2(yP-(yB+yS)/2,BEAM/2)*0.75;",
    "  var pTgt=Math.atan2(yB-yS,LOA)*0.74, rTgt=-Math.atan2(yP-(yB+yS)/2,BEAM/2)*0.60;\n"
    "  var kLag=1-Math.exp(-dtF/0.85);\n"
    "  LAB._pit=(LAB._pit===undefined)?pTgt:LAB._pit+(pTgt-LAB._pit)*kLag;\n"
    "  LAB._rol=(LAB._rol===undefined)?rTgt:LAB._rol+(rTgt-LAB._rol)*kLag;\n"
    "  var pitch=LAB._pit, roll=LAB._rol;")

# ============ תיקונים לפי תמונות הייחוס שהגיעו ב-20.9 (boat-ref) ============
# R1. דניאל: מודל חדש, יושב על המושב הימני עם יד על הטילר
rep("""  /* Daniel: 1.78 m, standing at the helm */
  if(sD<0.22){
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
  }""",
    """  /* דניאל, 1.78 מ׳: יושב על המושב הימני של הקוקפיט, פונה קדימה, יד שמאל על הטילר */
  if(sD<0.22){
  var sway=Math.sin(t*0.52)*0.030, lean=Math.sin(t*0.37+1.2)*0.022;
  var dM=mMul(mMul(mMul(boatM,mTrans(HELM_X,HELM_Y,HELM_Z)),mRotZ(lean)),mRotY(sway));
  drawMesh(CREW.tr, dM, COL.short);
  drawMesh(CREW.sh, dM, COL.tee);
  drawMesh(CREW.sk, dM, COL.skin);
  drawMesh(C_HEAD,  dM, COL.skin);
  drawMesh(C_HAIR,  dM, COL.hair);
  drawMesh(CREW.gl, dM, COL.shade);
  }""")
rep("          skin:[0.80,0.60,0.45], tee:[0.94,0.94,0.93], coat:[0.34,0.16,0.15],\n          pant:[0.55,0.57,0.61], hair:[0.14,0.10,0.07] };",
    "          skin:[0.78,0.57,0.41], tee:[0.115,0.135,0.205], short:[0.74,0.71,0.64],\n"
    "          shade:[0.055,0.060,0.075], cush:[0.60,0.545,0.665], navy:[0.085,0.105,0.165],\n"
    "          hair:[0.115,0.080,0.055] };")
# R2. המפרש הראשי: לפי תמונת הלילה ותמונת ההפלגה — "7" מתחת ללוח הכתום, וטלאי המרוץ באמצע המפרש
rep('var b=box(1.55,1.85,0.50,0.615);                                 /* "7" שחור גדול מתחת ללוח הכתום */',
    'var b=box(1.45,1.75,0.52,0.800);                                 /* "7" שחור מיד מתחת ללוח הכתום */')
rep("b=box(0.58,0.58,0.24,0.135);                                     /* טלאי המרוץ: ריבוע שחור וטבעת זהובה, לא קריא */\n  x.fillStyle='#1b1f24'; x.fillRect(b[0],b[1],b[2],b[3]);",
    "b=box(1.28,1.28,0.42,0.545);                                     /* טלאי המרוץ: ריבוע שחור עם מסגרת לבנה וטבעת זהובה, לא קריא */\n"
    "  x.fillStyle='#e9e7e0'; x.fillRect(b[0],b[1],b[2],b[3]);\n"
    "  x.fillStyle='#1b1f24'; x.fillRect(b[0]+b[2]*0.07,b[1]+b[3]*0.07,b[2]*0.86,b[3]*0.86);")
rep("  x.save(); x.translate(b[0]+b[2]/2,b[1]+b[3]/2); x.scale(b[2],b[3]);\n  x.strokeStyle='#c9a648'; x.lineWidth=0.17; x.beginPath(); x.arc(0,0,0.31,0,6.283); x.stroke(); x.restore();",
    "  x.save(); x.translate(b[0]+b[2]/2,b[1]+b[3]/2); x.scale(b[2],b[3]);\n"
    "  x.strokeStyle='#c9a648'; x.lineWidth=0.13; x.beginPath(); x.arc(0,0.02,0.24,0,6.283); x.stroke(); x.restore();")
rep("for(var r=0;r<2;r++){ var vv=0.115+r*0.105;", "for(var r=0;r<2;r++){ var vv=0.100+r*0.095;")
# R3. המדבקות בדופן: EXODUS ברבע הקדמי וטבעת ה-7 מעט לפני אמצע הגוף, כמו בתמונות
rep('  var NS=26, t0=0.175, t1=0.470, v0=0.605, v1=0.870, off=0.055;',
    '  var NS=26, t0=0.801, t1=0.943, v0=0.600, v1=0.855, off=0.055;   /* EXODUS ממש ליד החרטום: 8% עד 11% מהאורך, לפי תמונות 12 ו-13 */')
rep("var M_SEV7=panelOnHull(1,0.503,0.552,0.585,0.900,0.055), M_SEV7P=panelOnHull(-1,0.503,0.552,0.585,0.900,0.055);",
    "var M_SEV7=panelOnHull(1,0.462,0.538,0.527,0.913,0.055), M_SEV7P=panelOnHull(-1,0.462,0.538,0.527,0.913,0.055);   /* טבעת של 0.8 מ׳ באמצע הגוף */")
# R4. הסיפון: ה-non-skid הכתום הוא רק בסיפון הקדמי; סיפוני הצד וגג התא לבנים (תמונות 04, 05)
rep("M_DECK=deckMesh(), M_DECKO=deckMesh(0.905,0.006,0.085,0.955), M_SOLE=",
    "M_DECK=deckMesh(), M_DECKO=deckMesh(0.905,0.006,0.085,0.955), M_DECKF=deckMesh(0.905,0.009,0.752,0.955), M_SOLE=")
rep("  drawMesh(M_DECKO,boatM, COL.deck);", "  drawMesh(M_DECKO,boatM, COL.dkwhite);\n  drawMesh(M_DECKF,boatM, COL.deck);")
rep("rail:[0.445,0.430,0.400], deck:[0.885,0.395,0.105], deckEdge:[0.915,0.920,0.920],",
    "rail:[0.445,0.430,0.400], deck:[0.885,0.395,0.105], dkwhite:[0.895,0.898,0.888], deckEdge:[0.915,0.920,0.920],")

# R5. הדודג׳ר, הכרית, והחרטומית מעץ — לפי התמונות
rep("  drawMesh(M_DODGE,boatM, COL.dodge);",
    "  drawMesh(M_DODLIN,boatM, COL.dodgeIn);\n  drawMesh(M_DODGE,boatM, COL.dodge);\n  drawMesh(M_DODTRIM,boatM, COL.navy);")
rep("    drawMesh(M_ROPE,  boatM, COL.dodge);", "    drawMesh(M_ROPE,  boatM, COL.dodge);\n    drawMesh(M_CUSH,  boatM, COL.cush);")
rep("  drawMesh(M_SPRIT,mMul(mMul(boatM,mTrans(6.08,FREE+0.42,0)),mRotZ(Math.PI/2)),COL.spar);",
    "  drawMesh(M_SPRIT,mMul(mMul(boatM,mTrans(5.44,FREE+0.42,0)),mRotZ(Math.PI/2)),COL.timber);")
rep("dodge:[0.93,0.40,0.11], spar:[0.86,0.84,0.79], sail:[1,1,1], wire:[0.30,0.31,0.33],",
    "dodge:[0.93,0.40,0.11], dodgeIn:[0.085,0.195,0.145], spar:[0.86,0.84,0.79], sail:[1,1,1], wire:[0.30,0.31,0.33],")

# ============ סבב תיקונים 21.9: מפרשים, דגל, גלגל הצלה, לוויתן, קליק כפול ============
# S1. הבטן של המפרש תמיד לצד המוגן. עד היום היא הייתה תמיד ב-+z, ולכן בהלך אחד היא הצביעה אל הרוח.
rep("function sailMesh(foot,luff,camber,rake){\n  var NU=12,NV=16,p=[],idx=[],uv=[],i,j;\n"
    "  var rkS=Math.sin(rake||0), rkC=Math.cos(rake||0);",
    "function sailMesh(foot,luff,camber,rake,fl){\n  var NU=12,NV=16,p=[],idx=[],uv=[],i,j;\n"
    "  var rkS=Math.sin(rake||0), rkC=Math.cos(rake||0); fl=(fl===undefined)?1:fl;")
rep("    p.push(-chord*u-v*luff*rkS, v*luff*rkC, Math.sin(Math.PI*Math.min(1,u+0.001))*Math.sin(Math.PI*v*0.88+0.16)*camber);",
    "    p.push(-chord*u-v*luff*rkS, v*luff*rkC, fl*Math.sin(Math.PI*Math.min(1,u+0.001))*Math.sin(Math.PI*v*0.88+0.16)*camber);")
rep("    M_MAIN=sailMesh(4.72,13.26,0.55), M_MAINR=sailMesh(4.30,9.60,0.44),\n"
    "    M_YANK=sailMesh(4.45,13.40,0.58,0.363), M_STAY=sailMesh(3.25,10.35,0.50,0.246),\n"
    "    M_SPIN=sailMesh(6.40,14.00,1.10,0.376), M_JIB=sailMesh(2.95,8.60,0.40,0.400),",
    "    M_MAIN=sailMesh(4.72,13.26,0.55), M_MAINR=sailMesh(4.30,9.60,0.44),\n"
    "    M_YANK=sailMesh(4.45,13.40,0.58,0.363), M_STAY=sailMesh(3.25,10.35,0.50,0.246),\n"
    "    M_SPIN=sailMesh(6.40,14.00,1.10,0.376), M_JIB=sailMesh(2.95,8.60,0.40,0.400),\n"
    "    M_MAINX=sailMesh(4.72,13.26,0.55,0,-1), M_MAINRX=sailMesh(4.30,9.60,0.44,0,-1),\n"
    "    M_YANKX=sailMesh(4.45,13.40,0.58,0.363,-1), M_STAYX=sailMesh(3.25,10.35,0.50,0.246,-1),\n"
    "    M_SPINX=sailMesh(6.40,14.00,1.10,0.376,-1), M_JIBX=sailMesh(2.95,8.60,0.40,0.400,-1),")
rep("""  if(plan==='spin'){
    drawSail(M_MAIN, mainM, TEX_NUM, flatS);
    drawSail(M_SPIN, spinM, TEX_PLAIN, flatS);
  } else if(plan==='heavy'){
    drawSail(M_MAINR, mainM, TEX_NUM, flatS);
    drawSail(M_JIB, jibM2, TEX_PLAIN, flatS);
  } else {
    drawSail(M_MAIN, mainM, TEX_NUM, flatS);
    drawSail(M_STAY, stayM, TEX_PLAIN, flatS);
    drawSail(M_YANK, yankM, TEX_PLAIN, flatS);
  }""",
    """  var mB=(boomA>=0), jB=(jibA>=0);                    /* הבטן לאותו צד שאליו יצא הבום או המפרש הקדמי */
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
  }""")
# S2. הדגל יושב בדיוק על האחורן, ובזווית שלו
rep("mTrans(-3.45,FREE+5.15,0)),mRotY(-enR+Math.sin(t*1.7)*0.09*enW)),mRotZ(-0.13+",
    "mTrans(-3.35,FREE+5.06,0)),mRotY(-enR+Math.sin(t*1.7)*0.09*enW)),mRotZ(-0.37+")
# S3. שקיפות ל-SOLID, בשביל הלוויתן שנראה דרך פני המים
rep("' float fg=1.0-exp(-pow(length(uEye-vW)*uFogD,2.0));',\n"
    "  ' gl_FragColor=vec4(mix(col,uFogCol,clamp(fg,0.0,1.0)),1.0);}'].join('\\n'));\nvar SAILP=prog(",
    "' float fg=1.0-exp(-pow(length(uEye-vW)*uFogD,2.0));',\n"
    "  ' gl_FragColor=vec4(mix(col,uFogCol,clamp(fg,0.0,1.0)),uA);}'].join('\\n'));\nvar SAILP=prog(")
rep("['precision highp float;',LIT,'varying vec3 vW,vN;',\n"
    "  'void main(){ vec3 N=normalize(vN); float dl=dot(N,normalize(uLightDir));',",
    "['precision highp float;',LIT,'uniform float uA;','varying vec3 vW,vN;',\n"
    "  'void main(){ vec3 N=normalize(vN); float dl=dot(N,normalize(uLightDir));',")
rep("  gl.uniform1f(SOLID.u('uFogD'),fogD);\n  gl.enableVertexAttribArray(SOLID.a('aP')); gl.enableVertexAttribArray(SOLID.a('aN'));",
    "  gl.uniform1f(SOLID.u('uFogD'),fogD); gl.uniform1f(SOLID.u('uA'),1);\n  gl.enableVertexAttribArray(SOLID.a('aP')); gl.enableVertexAttribArray(SOLID.a('aN'));")
# S4. הלוויתן מצויר אחרי הסירה ולפני המפרשים
rep("  gl.disableVertexAttribArray(SOLID.a('aP')); gl.disableVertexAttribArray(SOLID.a('aN'));\n\n  /* sails, with her real flag and race number */",
    "  gl.disableVertexAttribArray(SOLID.a('aP')); gl.disableVertexAttribArray(SOLID.a('aN'));\n\n"
    "  drawWhale(t,dtF,eye,under,VP);\n\n  /* sails, with her real flag and race number */")
# S5. קליק כפול על הסירה: מבט מעמדת ההגאי. שומרים את מטריצת ההקרנה כדי לדעת איפה הסירה על המסך.
rep("  LAB._eye=eye; LAB._k=2*Math.tan(fovy/2)/Math.max(1,C.clientHeight); LAB._under=under;",
    "  LAB._eye=eye; LAB._k=2*Math.tan(fovy/2)/Math.max(1,C.clientHeight); LAB._under=under; LAB._VP=VP;")

# S6. הפסים הלבנים של גלגל ההצלה
rep("    drawMesh(M_RING,  boatM, COL.ring);", "    drawMesh(M_RING,  boatM, COL.ring);\n    drawMesh(M_RINGW, boatM, COL.tops);")
# S7. הקשה כפולה על הסירה מחליקה לעמדת ההגאי
rep("C.addEventListener('pointerup',up);",
    "/* הקשה כפולה על הסירה: מעבר לעמדת ההגאי. שתי הקשות תוך 340 מ\"ש, קרוב זו לזו, וקרוב לסירה על המסך. */\n"
    "var tapT=0, tapX=0, tapY=0;\n"
    "function boatOnScreen(){ var VP=LAB._VP; if(!VP) return null;\n"
    "  var n=project(VP,[0,FREE+1.6,0]); if(!n) return null;\n"
    "  return [ (n[0]*0.5+0.5)*C.clientWidth, (0.5-n[1]*0.5)*C.clientHeight ]; }\n"
    "function tapped(e){\n"
    "  var now=performance.now(), x=e.clientX, y=e.clientY;\n"
    "  if(now-tapT<340 && Math.hypot(x-tapX,y-tapY)<34 && cam.u>U_DECK+0.05 && cam.u<U_MAX+0.02){\n"
    "    var b=boatOnScreen(), rad=Math.max(90,Math.min(C.clientWidth,C.clientHeight)*0.30);\n"
    "    if(b && Math.hypot(x-b[0],y-b[1])<rad){ tapT=0; EXO.setCam('deck'); return; } }\n"
    "  tapT=now; tapX=x; tapY=y; }\n"
    "C.addEventListener('pointerup',function(e){ if(Object.keys(pts).length<=1) tapped(e); });\n"
    "C.addEventListener('pointerup',up);")

# S8. ציר הזום: לא קופצים מאמצע ההצלבה. הצביטה או הגלגלת קובעות, והמצלמה נשארת בדיוק איפה שהושארה.
rep("""  else if(cam.u>U_TOP+1e-3&&cam.u<U_GLOBE-1e-3&&!Object.keys(pts).length&&now-zoomT>320){      /* לא נשארים באמצע ההצלבה */
    var dir=((cam.u-U_TOP)/(U_GLOBE-U_TOP)>0.45)?1:-1; cam.u=Math.max(U_TOP,Math.min(U_GLOBE,cam.u+dir*1.5*dt)); }""",
    """  /* ההצלבה נשארת איפה שהמשתמש עצר: הזום רציף מהסיפון ועד החלל, בלי מדרגות ובלי קפיצות */""")
# S9. הגלגלת מזיזה זום בלי Ctrl, ובצעד אחיד — קודם היא הייתה גסה ותלוית מכשיר
rep("  setU(cam.u+clamp(e.deltaY,-240,240)*0.0012);",
    "  var dz=e.deltaMode===1?e.deltaY*16:(e.deltaMode===2?e.deltaY*400:e.deltaY);\n"
    "  setU(cam.u+clamp(dz,-180,180)*0.00135);")

# ================= סבב 21.9ב: הים אינסופי, והציר מתרחק עד קנה המידה של הגלובוס =================
# T1. הים היה ריבוע של 340 מ׳. מהתרחקות בינונית ומעלה ראו את הקצה שלו כמשולש על רקע השמיים.
#     במקומו רשת קוטבית מעריכית סביב הסירה: טבעות צפופות קרוב (0.45 מ׳) שגדלות ב-12% עד 220 ק"מ.
#     נקודת המוצא לא זזה, ולכן הקודקודים נשארים קבועים בעולם ואין "שחייה" של הגלים.
rep("var SEG=((C.clientWidth||400)<560?96:140),SPAN=340,seaPos=[],seaIdx=[];\n"
    "for(var gy=0;gy<=SEG;gy++) for(var gx=0;gx<=SEG;gx++) seaPos.push((gx/SEG-0.5)*SPAN,(gy/SEG-0.5)*SPAN);\n"
    "for(var iy=0;iy<SEG;iy++) for(var ix=0;ix<SEG;ix++){ var a0=iy*(SEG+1)+ix,b0=a0+SEG+1;\n"
    "  seaIdx.push(a0,b0,a0+1,a0+1,b0,b0+1); }",
    "var LOWSEA=((C.clientWidth||400)<560);\n"
    "/* רדיוסי הטבעות בשני אזורים: עד 2.6 ק\"מ יש גלים ולכן המשולשים מאוזנים (אורך רדיאלי ~ אורך משיקי),\n"
    "   ומשם והלאה המשטח שטוח ואפשר לגדול מהר עד 400 ק\"מ. סך הכול פחות משולשים מהריבוע שהיה כאן קודם. */\n"
    "var NANG=LOWSEA?96:128, R_IN=1.2, R_WAVE=2600.0, R_OUT=400000.0, seaPos=[0,0], seaIdx=[], seaR=[];\n"
    "(function(){ var i,j, step=6.2831853/NANG, gA=1+step, rr=R_IN;\n"
    "  while(rr<R_WAVE){ seaR.push(rr); rr*=gA; }\n"
    "  rr=R_WAVE; while(rr<R_OUT){ seaR.push(rr); rr*=1.55; } seaR.push(R_OUT);\n"
    "  for(i=0;i<seaR.length;i++) for(j=0;j<NANG;j++){ var a=j*step; seaPos.push(Math.cos(a)*seaR[i],Math.sin(a)*seaR[i]); }\n"
    "  for(j=0;j<NANG;j++) seaIdx.push(0,1+j,1+(j+1)%NANG);\n"
    "  for(i=0;i<seaR.length-1;i++) for(j=0;j<NANG;j++){\n"
    "    var a0=1+i*NANG+j, a1=1+i*NANG+(j+1)%NANG, b0=a0+NANG, b1=a1+NANG;\n"
    "    seaIdx.push(a0,b0,a1, a1,b0,b1); } })();")
# T2. הגלים דועכים עם המרחק: מעבר לכמה מאות מטרים המשטח שטוח, גם כדי שלא יהיה רעש וגם בגלל דיוק ה-float
rep("  'void main(){ vec3 n; float fold; vec3 d=gerst(aP,n,fold);',\n"
    "  ' vec3 p=vec3(aP.x+d.x,d.y,aP.y+d.z);',",
    "  'void main(){ float rr=length(aP);',\n"
    "  ' float kf=1.0-smoothstep(420.0,2600.0,rr);',      /* רחוק: משטח שטוח, בלי רעש ובלי איבוד דיוק */\n"
    "  ' vec3 n=vec3(0.0,1.0,0.0); float fold=1.0; vec3 d=vec3(0.0);',\n"
    "  ' if(kf>0.002){ d=gerst(aP,n,fold)*kf; n=normalize(mix(vec3(0.0,1.0,0.0),n,kf)); fold=mix(1.0,fold,kf); }',\n"
    "  ' vec3 p=vec3(aP.x+d.x,d.y,aP.y+d.z);',")
# T3. ציר הזום: ההתרחקות ממשיכה עד 130 ק"מ, קנה המידה שבו הגלובוס נמסר (זום 8.4).
#     עד היום היא נעצרה ב-1.5 ק"מ, ולכן המסירה קפצה פי מאה בקנה מידה בבת אחת.
rep("var U_FOV=-2, U_DECK=-1, U_MAX=Math.log(150/9), U_TOP=U_MAX+0.55, U_GLOBE=U_MAX+0.95, zoomT=0, camGlide=null;",
    "var U_FOV=-2, U_DECK=-1, U_MAX=Math.log(150/9), U_TOP=U_MAX+0.75, U_GLOBE=U_MAX+2.82, zoomT=0, camGlide=null;")

# T4. הגלים דועכים גם לפי גובה המצלמה: מ-400 מ׳ ומעלה אי אפשר להפריד גל של 7 מ׳, והרשת הקוטבית
#     יצרה שם טבעות מואריי סביב הסירה. עכשיו המשטח מתיישר, והמרקם מגיע מהשיידר בלבד.
rep("var SEA=prog(['precision highp float; attribute vec2 aP; uniform mat4 uVP;',WAVE,",
    "var SEA=prog(['precision highp float; attribute vec2 aP; uniform mat4 uVP; uniform float uWaveK;',WAVE,")
rep("  ' float kf=1.0-smoothstep(420.0,2600.0,rr);',      /* רחוק: משטח שטוח, בלי רעש ובלי איבוד דיוק */",
    "  ' float kf=(1.0-smoothstep(420.0,2600.0,rr))*uWaveK;',   /* רחוק מהסירה, או גבוה מעליה: משטח שטוח */")
rep("  gl.uniform3fv(SEA.u('uDeep'),wDeep); gl.uniform1f(SEA.u('uUnder'),under?1:0);",
    "  gl.uniform3fv(SEA.u('uDeep'),wDeep); gl.uniform1f(SEA.u('uUnder'),under?1:0);\n"
    "  gl.uniform1f(SEA.u('uWaveK'),Math.max(0,Math.min(1,1-(cam.r-140)/420)));")
# T5. מישור הרחוק גדל עם המצלמה: אחרת בהתרחקות של קילומטרים הכול נחתך
rep("mPersp(fovy,asp,sD>0.2?0.12:0.5,gT>0?4000:2000)",
    "mPersp(fovy,asp,sD>0.2?0.12:0.5,Math.max(2000,cam.r*14))")
# T6. רוחב השטח שהמצלמה רואה, במטרים. הגלובוס מתיישר לפיו, וכך אין קפיצה בקנה המידה במסירה.
rep("  EXO.frame.u=cam.u; EXO.frame.sD=sD; EXO.frame.gT=gT; EXO.frame.gX=gX;",
    "  EXO.frame.groundW=2*cam.r*Math.tan(hfx);\n"
    "  EXO.frame.u=cam.u; EXO.frame.sD=sD; EXO.frame.gT=gT; EXO.frame.gX=gX;")
# T7. ההצלבה מתחילה מאוחר, כשקנה המידה כבר קרוב לזה של הגלובוס (כ-9 ק"מ ומעלה)
rep("var U_FOV=-2, U_DECK=-1, U_MAX=Math.log(150/9), U_TOP=U_MAX+0.75, U_GLOBE=U_MAX+2.82, zoomT=0, camGlide=null;",
    "var U_FOV=-2, U_DECK=-1, U_MAX=Math.log(150/9), U_TOP=U_MAX+0.75, U_XF=U_TOP-0.12, U_GLOBE=U_TOP+0.42, zoomT=0, camGlide=null;")
rep("var gX=cam.u>U_TOP?Math.min(1,(cam.u-U_TOP)/(U_GLOBE-U_TOP)):0, deck=sD>0.6;",
    "var gX=cam.u>U_XF?Math.min(1,(cam.u-U_XF)/(U_GLOBE-U_XF)):0, deck=sD>0.6;")
rep("EXO.setU=function(u){ setU(u); kick(); }; EXO.zoomAxis={DECK:U_DECK,MAX:U_MAX,TOP:U_TOP,GLOBE:U_GLOBE,uOfR:uOfR};",
    "EXO.setU=function(u){ setU(u); kick(); };\n"
    "/* ההמרה המלאה בין מרחק מצלמה ל-u, בשני חלקי הציר. הגלובוס משתמש בה כדי לחזור אל ההדמיה באותו קנה מידה. */\n"
    "function uOfRFull(r){ return r<=150?uOfR(r):(U_MAX+Math.log(r/150)/2.4); }\n"
    "EXO.zoomAxis={DECK:U_DECK,MAX:U_MAX,TOP:U_TOP,XF:U_XF,GLOBE:U_GLOBE,uOfR:uOfR,uOfRFull:uOfRFull,\n"
    "  uOfW:function(w){ return uOfRFull(Math.max(1,w/(2*Math.tan(LAB._hfx||0.30)))); },\n  wOfU:function(u){ return 2*rOfU(u)*Math.tan(LAB._hfx||0.30); }, K:2.4};")
rep("  var hfx=Math.atan(Math.tan(fovy/2)*asp);", "  var hfx=Math.atan(Math.tan(fovy/2)*asp); LAB._hfx=hfx;")

# ============ סבב 21.9ג ============
# V1. הדגל: לפי התמונה המסומנת הוא על האחורן בגובה של כ-10.3 מ׳ מעל הסיפון (כ-70% מגובה התורן),
#     ולא בשליש הגובה, וגדול יותר: כ-52 על 40 ס״מ.
rep("mTrans(-3.35,FREE+5.06,0)),mRotY(-enR+Math.sin(t*1.7)*0.09*enW)),mRotZ(-0.37+",
    "mTrans(-1.32,FREE+10.30,0)),mRotY(-enR+Math.sin(t*1.7)*0.09*enW)),mRotZ(-0.37+")
rep("  var NU=7,NV=4,p=[],idx=[],uv=[],i,j, W=0.45, H=0.30;", "  var NU=7,NV=4,p=[],idx=[],uv=[],i,j, W=0.52, H=0.40;")
# V2. עוצמת הפגיעה עוברת אל הקול
rep("  EXO.frame.groundW=2*cam.r*Math.tan(hfx);",
    "  EXO.frame.groundW=2*cam.r*Math.tan(hfx); EXO.frame.burst=LAB._burst||0;")
# V3. צבע המים: תגובה רחבה יותר לטמפרטורת הים ולקו הרוחב, כדי שהשינוי לאורך המסלול ייראה
rep("  var tw=(c.seaT!=null)?smooth(24.5,28,c.seaT):smooth(26,12,la), sw=smooth(38,50,la);",
    "  var tw=(c.seaT!=null)?smooth(21.5,27.5,c.seaT):smooth(28,10,la), sw=(c.seaT!=null)?smooth(17,8,c.seaT):smooth(34,48,la);")
# V4. הקשה כפולה בהדמיה: מקרוב אל עמדת ההגאי, ומרחוק אל מבט ברירת המחדל מעל המים
rep("    if(b && Math.hypot(x-b[0],y-b[1])<rad){ tapT=0; EXO.setCam('deck'); return; } }",
    "    if(b && Math.hypot(x-b[0],y-b[1])<rad){ tapT=0; EXO.setCam(cam.u>0.75?'home':'deck'); return; } }")


# ============ סבב 21.9ד ============
# Z1. הגלגלת: נקישה בודדת עדיין מדייקת, אבל סיבוב מהיר מאיץ עד פי 3.2. בלי זה המסלול מהסיפון ועד
#     קנה המידה של הגלובוס הוא כשלושים נקישות, וזה מה שהרגיש ארוך מדי.
rep("EXO.zoomBy=function(f){ cam.r=clamp(cam.r*f,9,150); kick(); };",
    "/* צעד הגלגלת. הבסיס גדל מ-0.00135 ל-0.0019, ומעליו מאיץ שמזהה סיבוב רצוף.\n"
    "   אותו מאיץ משרת גם את הגלובוס, כך שסיבוב אחד עובר את כל הציר בלי לאבד את התאוצה בהצלבה. */\n"
    "var whT=0, whA=1;\n"
    "function wheelStep(){ var n=performance.now(), d=n-whT; whT=n;\n"
    "  if(d<90) whA=Math.min(3.2,whA*1.30); else if(d<230) whA=Math.min(3.2,whA*1.07); else whA=1;\n"
    "  return 0.0019*whA; }\n"
    "EXO.wheelStep=wheelStep;\n"
    "EXO.zoomBy=function(f){ cam.r=clamp(cam.r*f,9,150); kick(); };")
rep("  setU(cam.u+clamp(dz,-180,180)*0.00135);", "  setU(cam.u+clamp(dz,-180,180)*wheelStep());")

# Z2. שעון הדף נשלט מבחוץ: רצועת הזמן שמתחת לשורות הנתונים מזיזה את כל הסצנה אחורה וקדימה.
#     T_OFF כבר היה קיים (פרמטר t בכתובת); כאן הוא נעשה נגיש בזמן ריצה.
rep("EXO.setEl=function(v){ cam.el=v; kick(); };",
    "EXO.setEl=function(v){ cam.el=v; kick(); };\n"
    "/* הזזת השעון: התנאים, השמש, הירח והמפרשים נגזרים ממנו, ולכן די בלחשב מחדש פעם אחת ולשדר. */\n"
    "EXO.setClock=function(off){ T_OFF=off||0; EXO.simulated=(T_OFF!==0);\n"
    "  var n=clockNow(); cond=pickCond(n); condAt=n; applyConditions(cond); emitState(cond,n); kick(); };\n"
    "EXO.clockOff=function(){ return T_OFF; };")

# R6. טבלת מזג האוויר יכולה לחזור ריקה — מקור שנפל, רענון שנכשל באמצע, קובץ נתונים חלקי.
#     עד כאן זה הפיל את כל ההדמיה: pickCond ניגש ל-COND[0] שאינו קיים, נזרקה שגיאה,
#     והמסך הוחלף בהודעה "ההדמיה נעצרה". נמדד ב-audit_truth.py. הכלל של הפרויקט הוא
#     שהאתר עובד גם בלי המקורות החיים, ולכן: ים רגוע, ושורות מזג האוויר פשוט לא מוצגות.
#     לא ממציאים רוח — missing מסמן ל-hud.js להציג "—" במקום מספר.
rep("""function pickCond(now){
  var best=COND[0], bi=0, i;""",
    """function pickCond(now){
  if(!COND||!COND.length) return { pres:null,presTrend:null,airT:null,seaT:null,cloud:null,visKm:null,precip:null,
    wind:0,gust:0,windDir:0,waveH:0.25,waveT:6,waveDir:0,cur:0,curDir:0,forecast:false,past:false,missing:true };
  var best=COND[0], bi=0, i;""")

# R7 (נוסה ובוטל, 21.9 לילה): ניסיון להפוך את קצף ההתנפצות לפסים לאורך הרוח. בצילום לפני/אחרי ההבדל
#     כמעט לא נראה — כי הכתמים הלבנים ביום הם לא הקצף אלא הברק של השמש: 'pow(N·H,300.0)*1.9', על נורמלים
#     שחלקים בקנה מידה של פני גל שלם, ולכן כל פן משקף את השמש ככתם רווי אחד ולא כשדה נצנוצים. התיקון
#     האמיתי הוא נורמלים עדינים (אדוות) שמפרקים את הברק, ועוצמה שלא נחתכת בלבן — וזה בדיוק "ספקולר
#     וחספוס" של מנה ה׳. לא לשנות את הקצף לפני שהברק מטופל.

# ======================= P — המנוע בעבר (22.9.2026, עבודת לילה) =======================
# ציר הזמן, שלב "שעון אחד" (claude/ציר-הזמן-הצעה.md). עד כאן השעון של המנוע זז רק על COND — כ-12 שעות אחורה.
# הארכיון (assets/cond/wNN.json, נכתב רק על ידי הבוט) נותן לאקסודוס שורה לכל שעה מהזינוק, באותן 15 העמודות
# של COND ועוד lat/lon של הסירה באותה שעה. מכאן שני דברים:
#   P1. pickCond קורא מטבלה ממוזגת (ארכיון לפני COND[0], ואז COND). EXO.setArchive מזין אותה מבחוץ (hud.js).
#   P2. "תנוחת הסירה" BP: מיקום, כיוון ומהירות ברגע שעל השעון. בהווה ובתחזית = FIX כמו קודם. בעבר = אינטרפולציה
#       על נקודות הארכיון ונקודת הציון האחרונה; כיוון ומהירות מחושבים מהמקטע (שעה לכל צד), לא נמדדים.
#       כל קריאה של המנוע ל-FIX.lat/lon/cog/sog עוברת ל-BP — שמש, ירח, חרטום, שובל, צבע המים, המשואה.
#   מה שאין לו נתון לא ממציאים: פער בטבלה (יותר משלוש שעות בין שורות) מסומן gap, ו-hud.js לא נותן לגרור לתוכו.
import re as _re
_n=len(_re.findall(r'FIX\.(lat|lon|cog|sog)\b', s)); assert _n==36, _n
s=_re.sub(r'FIX\.(lat|lon|cog|sog)\b', r'BP.\1', s)
rep("""  var best=COND[0], bi=0, i;
  for(i=0;i<COND.length;i++) if(Date.parse(COND[i][0]+'Z')<=now){ best=COND[i]; bi=i; }
  var nx=COND[Math.min(bi+1,COND.length-1)];""",
"""  poseAt(now);
  var T=CONDX||COND, best=T[0], bi=0, i;
  for(i=0;i<T.length;i++) if(Date.parse(T[i][0]+'Z')<=now){ best=T[i]; bi=i; }
  var nx=T[Math.min(bi+1,T.length-1)];""")
rep("""function at3(i){ var t=now-3*3600000, k, r0=null, r1=null; for(k=0;k<COND.length;k++){ var tk=Date.parse(COND[k][0]+'Z'); if(tk<=t) r0=COND[k]; else { r1=COND[k]; break; } }""",
"""function at3(i){ var t=now-3*3600000, k, r0=null, r1=null; for(k=0;k<T.length;k++){ var tk=Date.parse(T[k][0]+'Z'); if(tk<=t) r0=T[k]; else { r1=T[k]; break; } }""")
rep("""           forecast: now>OBS_UNTIL, past: now>Date.parse(COND[COND.length-1][0]+'Z') };
}""",
"""           forecast: now>OBS_UNTIL, past: now>Date.parse(COND[COND.length-1][0]+'Z'),
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
  return BP; }""")

# ======================= E — איכות רינדור, מנה ה׳ (22.9.2026, עבודת לילה) =======================
# E1. ברק השמש על המים. עד כאן: pow(N·H,300)*1.9 על הנורמלים של פני הגל — כל פן רחב החזיר את השמש ככתם לבן
#     רווי אחד ("כתמי קצף" ביום). נמדד בצילום מול השמש ב-17:30 UTC: 27,616 פיקסלים רוויים, הכתם הגדול 7,663.
#     עכשיו: (א) הברק החד מחושב על נורמלים עם אדוות בקנה מידה של עשרות סנטימטרים, כך שפן אחד מתפרק לשדה נצנוצים;
#     (ב) העוצמה עוברת דרך 1−exp(−x) ולא נחתכת בלבן; (ג) הילה רכה ורחבה יותר נשארת, כמו שנראה ים אמיתי מול השמש.
rep("""  ' col+=uSunCol*pow(max(dot(N,H),0.0),300.0)*1.9*uSunUp;',""",
"""  ' vec3 Ng=N; if(det>0.012){ vec2 g=vW.xz*2.6-uWindV*uTime*1.1+vec2(uTime*0.07,0.0); float g0=vn(g), gx=vn(g+vec2(0.19,0.0)), gz=vn(g+vec2(0.0,0.19));',
  '  vec2 g2=vW.xz*7.3+uWindV*uTime*0.6; float k0=vn(g2), kx=vn(g2+vec2(0.17,0.0)), kz=vn(g2+vec2(0.0,0.17));',
  '  Ng=normalize(N+(vec3(gx-g0,0.0,gz-g0)*1.9+vec3(kx-k0,0.0,kz-k0)*1.1)*det); }',
  ' float spk=pow(max(dot(Ng,H),0.0),520.0)*3.2+pow(max(dot(N,H),0.0),90.0)*0.16;',
  ' col+=uSunCol*(1.0-exp(-spk*1.4))*0.92*uSunUp;',""")

# E2. חדות על מסכים חדים. עד כאן הקנבס צויר ב-1.5 פיקסלים לכל פיקסל CSS לכל היותר, גם בטלפונים של 3.
#     עכשיו: מתחילים ב-1.5 כמו קודם, ואחרי מדידת 60 הפריימים הראשונים (perfProbe) — אם הממוצע מתחת ל-20 מ״ש,
#     כלומר יש מרווח של פי 2.4 מתחת לסף הירידה ל"קל" (48), עולים עד 2. מכשיר איטי לא מקבל את זה לעולם.
rep("""  var dpr=Math.min(window.devicePixelRatio||1,EXO.quality==='lite'?1:1.5), W=Math.round(w*dpr), H=Math.round(h*dpr);""",
"""  var dpr=Math.min(window.devicePixelRatio||1,EXO.quality==='lite'?1:(EXO.dprMax||1.5)), W=Math.round(w*dpr), H=Math.round(h*dpr);""")
rep("""    if(avg>48&&EXO.quality==='full'&&!EXO.qualityLocked){ EXO.setQuality('lite',true); } }""",
"""    if(avg>48&&EXO.quality==='full'&&!EXO.qualityLocked){ EXO.setQuality('lite',true); }
    else if(avg<20&&EXO.quality==='full'&&(window.devicePixelRatio||1)>1.5){ EXO.dprMax=2; resize(); } }""")

# E3. ברק לכל חומר. עד כאן כל הגופים היו מט לגמרי (אור מפוזר בלבד), והגוף הלבן נראה כמו גבס.
#     עכשיו Blinn-Phong מנורמל עם פרנל של שליק, בעוצמה ובחדות לפי החומר: ג׳לקוט מבריק, אלומיניום התורן, נירוסטה,
#     זכוכית ופאנל סולארי; צבע הסיפון, הצבע נגד צמדה, בד הסוכך והעור כמעט מט. חומר שלא ברשימה (הלוויתן, למשל) = מט כמו קודם.
rep("""'uniform float uA;','varying vec3 vW,vN;',""","""'uniform float uA; uniform vec2 uSpec;','varying vec3 vW,vN;',""")
rep("""  ' vec3 col=mix(lit,uCol,uFlat);',""",
"""  ' if(uSpec.x>0.0){ vec3 V=normalize(uEye-vW), Hh=normalize(normalize(uLightDir)+V);',
  '  float fr=0.04+0.96*pow(1.0-max(dot(N,V),0.0),5.0);',
  '  lit+=uLightCol*uSpec.x*pow(max(dot(N,Hh),0.0),uSpec.y)*(uSpec.y+8.0)*0.02*df;',
  '  lit=mix(lit,uAmbSky*1.15,clamp(fr*uSpec.x*0.55,0.0,0.35)); }',
  ' vec3 col=mix(lit,uCol,uFlat);',""")
rep("""  gl.uniform1f(SOLID.u('uFlat'),flat||0);""",
"""  gl.uniform1f(SOLID.u('uFlat'),flat||0);
  var sp=SPEC.get(col); gl.uniform2f(SOLID.u('uSpec'),sp?sp[0]:0,sp?sp[1]:1);""")
rep("""var lastPlan='', SAIL_FLIP=1;""",
"""/* ברק לכל חומר: [עוצמה, חדות]. המפתח הוא אותו מערך צבע שמועבר ל-drawMesh */
var SPEC=new Map([[COL.tops,[0.55,70]],[COL.dkwhite,[0.30,40]],[COL.deckEdge,[0.30,40]],[COL.trunk,[0.30,40]],[COL.hatch,[0.40,60]],
  [COL.spar,[0.45,36]],[COL.steel,[0.70,80]],[COL.vane,[0.40,40]],[COL.glass,[0.90,140]],[COL.solar,[0.75,110]],[COL.bronze,[0.45,40]],
  [COL.ring,[0.25,30]],[COL.jack,[0.20,24]],[COL.bott,[0.05,12]],[COL.boot,[0.10,20]],[COL.deck,[0.06,16]],[COL.teak,[0.04,10]],[COL.rail,[0.06,14]],
  [COL.skin,[0.08,14]],[COL.hair,[0.10,18]],[COL.navy,[0.06,12]]]);
var lastPlan='', SAIL_FLIP=1;""")

# E4. צל מגע וצל שמש על המים. עד כאן הגוף "צף" מעל הים בלי שום מגע: המים סביבו בדיוק בצבע של המים רחוק ממנו.
#     עכשיו (א) הכהיה רכה צמודה לקו המים — המים שבין הגוף לבין האור מקבלים פחות שמיים; (ב) צל השמש של הגוף
#     על המים, מוזז בכיוון ההפוך לשמש לפי גובהה ומוגבל לשישה מטרים. אליפסה של 10.8×3.5 מ׳ לפי כיוון החרטום.
rep("""  'uniform float uUnder;',""","""  'uniform float uUnder; uniform vec4 uHull;',""")
rep("""  ' float fg=1.0-exp(-pow(dist*uFogD,2.0));',""",
"""  ' if(uUnder<0.5&&uHull.w>0.0){ vec2 q=vW.xz, f2=uHull.xy; float la=dot(q,f2), lb=q.y*f2.x-q.x*f2.y;',
  '  float e=length(vec2(la/5.45,lb/1.78))-1.0; float ao=exp(-max(e,0.0)*max(e,0.0)*9.0)*step(-0.35,e);',
  '  vec3 Ls=normalize(uSunDir); vec2 so=Ls.xz/max(Ls.y,0.12)*0.95; so*=min(1.0,6.0/max(length(so),0.001));',
  '  vec2 q2=q+so; float la2=dot(q2,f2), lb2=q2.y*f2.x-q2.x*f2.y; float e2=length(vec2(la2/5.2,lb2/1.6))-1.0;',
  '  float shd=(1.0-smoothstep(-0.25,0.35,e2))*uSunUp*uHull.z;',
  '  col*=1.0-(0.30*ao+0.34*shd)*uHull.w; }',
  ' float fg=1.0-exp(-pow(dist*uFogD,2.0));',""")
rep("""  gl.uniform1f(SEA.u('uAmpMax'),ampMax); gl.uniform1f(SEA.u('uFoam'),foam);""",
"""  gl.uniform1f(SEA.u('uAmpMax'),ampMax); gl.uniform1f(SEA.u('uFoam'),foam);
  var hrS=BP.cog*D2R; gl.uniform4f(SEA.u('uHull'),Math.sin(hrS),-Math.cos(hrS),1.0,EXO.quality==='lite'?0.0:1.0);""")

out=os.path.join(HERE,'out','assets','v2'); os.makedirs(out,exist_ok=True)
io.open(os.path.join(out,'deck.js'), 'w', encoding='utf-8').write(s)
print('assets/v2/deck.js', len(s), 'chars')
