# -*- coding: utf-8 -*-
# שדרוג הגרפיקה, 24.9.2026 — הטלאים. רץ מתוך build_engine.py (exec), על s אחרי כל הטלאים הקודמים.
# כל rep() נכשל בבנייה אם המחרוזת לא נמצאה בדיוק פעם אחת, כמו בשאר הקובץ.

# ---------- G0. תשתית: GLSL משותף לפני השמיים; מדידה ודרגות ----------
rep("/* ===== sky ===== */", io.open(os.path.join(HERE,'gfx_head.js'), encoding='utf-8').read() + "\n/* ===== sky ===== */")
rep("  perfProbe(pNow);\n", "  gfxProbe(pNow);\n")
rep("  if(!reduce && pNow-lastDraw<MIN_DT){ requestAnimationFrame(frame); return; }",
    "  if(!reduce && pNow-lastDraw<(GFX.probe?4:MIN_DT)){ requestAnimationFrame(frame); return; }")
# (בזמן המדידה: בלי התקרה של 32, אבל עדיין פריים אחד לכל רענון מסך — יש כאן יותר משרשרת rAF אחת)
rep("EXO.setQuality=function(q,auto){ EXO.quality=q; if(!auto) EXO.qualityLocked=true; resize();",
    "EXO.setQuality=function(q,auto){ EXO.quality=q; if(!auto) EXO.qualityLocked=true;\n"
    "  if(q==='lite') GFX.tier=EXO.tier=0; else if(GFX.tier===0) GFX.tier=EXO.tier=1;\n  resize();")
rep("quality:EXO.quality,\n", "quality:EXO.quality, tier:GFX.tier,\n")

# ---------- G3. צבע: לינארי ו-ACES בשמיים, בים, בסירה ובמפרשים. שכבות המידע (FLOW) לא משתנות ----------
# השמיים: הבסיס כמו שכויל (צבעי מסך) → לינארי; דיסקת השמש מתווספת בלינארי, מעל הלבן, ו-ACES מקפל אותה
rep("['precision highp float; varying vec2 vN;',", "['precision highp float; varying vec2 vN;',TMO_GLSL,'uniform vec3 uSunL;',")
rep("""  ' c+=uSunCol*pow(d,7000.0)*10.0*uSunUp*sv*sv;',
  ' gl_FragColor=vec4(c,1.0);}'].join('\\n'));""",
"""  ' vec3 cl=ainv(c)+uSunL*(pow(d,7000.0)*9.0+pow(d,1400.0)*0.45)*uSunUp*sv*sv;',
  ' gl_FragColor=vec4(tmo(cl),1.0);}'].join('\\n'));""")
rep("  gl.useProgram(SKY); gl.depthMask(false);", "  gl.useProgram(SKY); gl.depthMask(false); gl.uniform1f(SKY.u('uExpo'),EXPO); gl.uniform3fv(SKY.u('uSunL'),LNf(sunCol));")

# הים: כל הצבעים נכנסים לינאריים (LNf ב-JS); הנצנוצים של השמש עוברים את הלבן; הקצף מואר לפי השעה.
# פרנל: בלינארי ההשתקפות של השמיים שוקלת הרבה יותר מבמסך, ולכן המקדם יורד לערך הפיזיקלי של מים (2% במבט ישר, שליק בחזקת 5).
# צבע הנצנוץ: אור השמש מנורמל לשיא 1 ומולבן ב-30% — אחרת בשקיעה הוא יוצא סלמון רווי במקום זהב.
rep("  ' float fres=pow(1.0-max(dot(N,V),0.0),4.0)*0.78+0.045;',", "  ' float fres=pow(1.0-max(dot(N,V),0.0),5.0)*0.80+0.02;',")
rep("  'uniform vec3 uDeep,uShal,uHor,uSunDir,uSunCol,uFogCol,uEye,uSss;',",
    "  TMO_GLSL,\n  'uniform vec3 uDeep,uShal,uHor,uSunDir,uSunCol,uFogCol,uEye,uSss,uFoamC;',")
rep("  ' col+=uSss*sss*0.55;',", "  ' col+=uSss*sss*0.9; vec3 sunL=uSunCol;',")
rep("""  ' float spk=pow(max(dot(Ng,H),0.0),520.0)*3.2+pow(max(dot(N,H),0.0),90.0)*0.16;',
  ' col+=uSunCol*(1.0-exp(-spk*1.4))*0.92*uSunUp;',
  ' col+=uSunCol*pow(max(dot(N,H),0.0),22.0)*0.11*uSunUp;',""",
"""  ' float spk=pow(max(dot(Ng,H),0.0),520.0)*3.2, spb=pow(max(dot(N,H),0.0),90.0)*0.16;',
  ' col+=sunL*((1.0-exp(-spk*1.4))*2.4+spb*0.30)*uSunUp;',
  ' col+=sunL*pow(max(dot(N,H),0.0),22.0)*0.035*uSunUp;',""")
rep("  ' col=mix(col,vec3(0.93,0.965,0.985),clamp(cap+crest,0.0,0.92));',",
    "  ' col=mix(col,uFoamC,clamp(cap+crest,0.0,0.92));',")
rep("  '  col*=1.0-(0.30*ao+0.34*shd)*uHull.w; }',", "  '  col*=1.0-(0.42*ao+0.50*shd)*uHull.w; }',")
rep("  ' gl_FragColor=vec4(mix(col,fogc,clamp(fg,0.0,1.0)),1.0);}'].join('\\n'));",
    "  ' gl_FragColor=vec4(tmo(mix(col,fogc,clamp(fg,0.0,1.0))),1.0);}'].join('\\n'));")
rep("  gl.uniform3fv(SEA.u('uSss'),mix3([0.03,0.09,0.10],[0.10,0.42,0.34],dayF));",
    "  gl.uniform3fv(SEA.u('uSss'),LNf(mix3([0.03,0.09,0.10],[0.10,0.42,0.34],dayF))); gl.uniform1f(SEA.u('uExpo'),EXPO);\n"
    "  var fmK=0.10+0.90*dayF+0.08*moonUp*mp.illum*nightF, fmL=LN(FOAM_D); fmK=Math.pow(Math.min(1,fmK),2.2); gl.uniform3f(SEA.u('uFoamC'),fmL[0]*fmK,fmL[1]*fmK,fmL[2]*fmK);")
rep("  gl.uniform3fv(SEA.u('uDeep'),wDeep);", "  gl.uniform3fv(SEA.u('uDeep'),LNf(wDeep));")
rep("  gl.uniform3fv(SEA.u('uShal'),wShal);", "  gl.uniform3fv(SEA.u('uShal'),LNf(wShal));")
rep("  gl.uniform3fv(SEA.u('uHor'),hor); gl.uniform3fv(SEA.u('uFogCol'),fogCol);",
    "  gl.uniform3fv(SEA.u('uHor'),LNf(hor)); gl.uniform3fv(SEA.u('uFogCol'),fogL);")
rep("  gl.uniform3fv(SEA.u('uDuskCol'),duskCol);", "  gl.uniform3fv(SEA.u('uDuskCol'),LN(duskCol));")
rep("  gl.uniform3fv(SEA.u('uSunDir'),lightDir); gl.uniform3fv(SEA.u('uSunCol'),sunCol);",
    "  var sgl=LNf(sunCol), sgm=Math.max(sgl[0],sgl[1],sgl[2],1e-4); sgl=[sgl[0]/sgm*0.7+0.3,sgl[1]/sgm*0.7+0.3,sgl[2]/sgm*0.7+0.3];\n"
    "  gl.uniform3fv(SEA.u('uSunDir'),lightDir); gl.uniform3fv(SEA.u('uSunCol'),sgl);")
rep("  var fogCol=under?wFog:hor;\n", "  var fogCol=under?wFog:hor, fogL=LNf(fogCol);\n")

# הסירה: צבע החומר לינארי; עוצמת האור (שכוילה כמכפיל במסך) עוברת בחזקת 1.7 ללינארי (2.2 המלא החשיך את הסירה בלילה מתחת למה שהעין רואה בירח), בלי ה"ברך" הישנה —
# ACES מקפל את מה שעובר את הלבן. 0.26 = הכיול: בשמש מלאה (אור+סביבה ≈ 2.2) הצבע יוצא כמו שכויל
rep("['precision highp float;',LIT,'uniform float uA; uniform vec2 uSpec;','varying vec3 vW,vN;',",
    "['precision highp float;',LIT,TMO_GLSL,'uniform float uA; uniform vec2 uSpec;','varying vec3 vW,vN;',")
rep("""  ' vec3 lit=uCol*(amb+uLightCol*df); float Lm=max(lit.r,max(lit.g,lit.b));',
  ' if(Lm>0.8) lit*=(0.8+0.2*(1.0-exp(-(Lm-0.8)/0.2)))/Lm;',""",
"""  ' vec3 lit=uCol*pow(amb+uLightCol*df,vec3(1.7))*0.26;',""")
rep("  '  lit=mix(lit,uAmbSky*1.15,clamp(fr*uSpec.x*0.55,0.0,0.35)); }',",
    "  '  lit=mix(lit,uAmbSky*0.42,clamp(fr*uSpec.x*0.55,0.0,0.35)); }',")
rep("  ' gl_FragColor=vec4(mix(col,uFogCol,clamp(fg,0.0,1.0)),uA);}'].join('\\n'));",
    "  ' gl_FragColor=vec4(tmo(mix(col,uFogCol,clamp(fg,0.0,1.0))),uA);}'].join('\\n'));")
rep("  gl.uniform3fv(SOLID.u('uCol'),col);", "  gl.uniform3fv(SOLID.u('uCol'),LN(col));")
rep("  gl.uniform3fv(SOLID.u('uFogCol'),fogCol); gl.uniform3fv(SOLID.u('uEye'),eye);",
    "  gl.uniform3fv(SOLID.u('uFogCol'),fogL); gl.uniform3fv(SOLID.u('uEye'),eye); gl.uniform1f(SOLID.u('uExpo'),EXPO);")
# המפרשים (עם הטקסטורה): הצבע של כל פיקסל → לינארי בשיידר
rep("['precision highp float;',LIT,'uniform sampler2D uTex; uniform float uTwo;',",
    "['precision highp float;',LIT,TMO_GLSL,'uniform sampler2D uTex; uniform float uTwo;',")
rep("  ' vec4 tx=texture2D(uTex,uv); vec3 base=tx.rgb*uCol;',", "  ' vec4 tx=texture2D(uTex,uv); vec3 base=ainv(tx.rgb*uCol);',")
rep("  ' vec3 col=base*(amb+uLightCol*df*0.92);',", "  ' vec3 col=base*pow(amb+uLightCol*df*0.92,vec3(1.7))*0.26;',")
rep("  ' gl_FragColor=vec4(mix(col,uFogCol,clamp(fg,0.0,1.0)),tx.a);}'].join('\\n'));",
    "  ' gl_FragColor=vec4(tmo(mix(col,uFogCol,clamp(fg,0.0,1.0))),tx.a);}'].join('\\n'));")
rep("  gl.uniform3fv(SAILP.u('uFogCol'),fogCol); gl.uniform3fv(SAILP.u('uEye'),eye);",
    "  gl.uniform3fv(SAILP.u('uFogCol'),fogL); gl.uniform3fv(SAILP.u('uEye'),eye); gl.uniform1f(SAILP.u('uExpo'),EXPO);")

# בשקיעה, בלינארי, צבע הזוהר (כתום רווי) שולט בהשתקפות וצובע את כל הים בורוד. ההשתקפות שלו יורדת מ-0.9 ל-0.5.
rep("  ' vec3 col=mix(body,mix(uHor,uDuskCol,uDusk*sdR*0.9),fres);',", "  ' vec3 col=mix(body,mix(uHor,uDuskCol,uDusk*sdR*0.5),fres);',")

# ---------- G7. שמיים פיזיקליים (הטבלה מחושבת ב-gfx_add.js, ATM/SkyLUT) ----------
# בשיידר: הרקע של השמיים נקרא מהטבלאות (שמש + ירח) ועוד "רצפת הלילה" שכוילה; הזוהר המצויר בצד השמש יורד — הוא יוצא מהחישוב.
# מתחת למים ובדרגה 0 — השמיים הישנים, בלי שינוי.
rep("  'float h21c(vec2 p){", "  PHYS_GLSL,\n  'float h21c(vec2 p){")
rep("""  ' vec3 c=mix(uHor,uZen,pow(h,0.62));',
  ' if(uUnder>0.5){""", """  ' vec3 c=(uPhys>0.5&&uUnder<0.5)?tmoN(physSky(r)):mix(uHor,uZen,pow(h,0.62));',
  ' if(uUnder>0.5){""")
rep("  ' c=mix(c,uDuskCol,uDusk*side*pow(1.0-h,2.2));',", "  ' if(uPhys<0.5) c=mix(c,uDuskCol,uDusk*side*pow(1.0-h,2.2));',")
rep("  var mR=norm3(cross3(moonDir,[0,1,0])), mU=cross3(mR,moonDir);\n",
    "  var mR=norm3(cross3(moonDir,[0,1,0])), mU=cross3(mR,moonDir);\n"
    "  var physOn=(!under&&GFX.tier>0); if(physOn){ skyPhysFrame(sp,mp,hor,zen,dayF,nightF,moonUp); hor=SKYP.hor; zen=SKYP.zen; duskCol=SKYP.dusk; sunCol=SKYP.sun; }\n")
rep("  gl.uniform1f(SKY.u('uWax'),mp.waxing?1:0);",
    "  gl.uniform1f(SKY.u('uWax'),mp.waxing?1:0); physUniforms(SKY,physOn,ov,sunDir,moonDir);")
# הים: ההשתקפות של השמיים והערפל באופק — מהטבלה, בכיוון האמיתי (לא ממוצע אחד לכל האופק), ולכן אין תפר בקו האופק
rep("  TMO_GLSL,\n  'uniform vec3 uDeep,uShal,uHor,uSunDir,uSunCol,uFogCol,uEye,uSss,uFoamC;',",
    "  TMO_GLSL,PHYS_GLSL,\n  'uniform vec3 uDeep,uShal,uHor,uSunDir,uSunCol,uFogCol,uEye,uSss,uFoamC;',")
rep("  ' vec3 col=mix(body,mix(uHor,uDuskCol,uDusk*sdR*0.5),fres);',",
    "  ' vec3 skyR=uPhys>0.5?physSky(vec3(Rf.x,max(Rf.y,0.0),Rf.z)):mix(uHor,uDuskCol,uDusk*sdR*0.5); vec3 col=mix(body,skyR,fres);',")
rep("  ' vec3 fogc=mix(uFogCol,uDuskCol,uDusk*sdV*0.87);',",
    "  ' vec3 fogc=uPhys>0.5?physSky(normalize(vec3(-V.x,0.0,-V.z)+vec3(1e-5,0.0,0.0))):mix(uFogCol,uDuskCol,uDusk*sdV*0.87);',")
rep("  gl.uniform3fv(SEA.u('uEye'),eye);\n", "  gl.uniform3fv(SEA.u('uEye'),eye); physUniforms(SEA,physOn,ov,sunDir,moonDir);\n")

# ---------- G1+12. מפת סביבה: השמיים מצוירים לתוך טקסטורה, והים משקף אותה ----------
rep("  ' vec3 r=normalize(uFwd+uRight*((vN.x-uOff.x)*uTanF*uAsp)+uUp*((vN.y-uOff.y)*uTanF));',",
    "  ' vec3 r=uEnv>0.5?envDir(vN):normalize(uFwd+uRight*((vN.x-uOff.x)*uTanF*uAsp)+uUp*((vN.y-uOff.y)*uTanF));',")
rep("  PHYS_GLSL,\n  'float h21c(vec2 p){", "  PHYS_GLSL,ENV_GLSL,\n  'float h21c(vec2 p){")
rep("  ' vec3 cl=ainv(c)+uSunL*(pow(d,7000.0)*9.0+pow(d,1400.0)*0.45)*uSunUp*sv*sv;',\n  ' gl_FragColor=vec4(tmo(cl),1.0);}'",
    "  ' vec3 cl=ainv(c)+uSunL*(pow(d,7000.0)*9.0+pow(d,1400.0)*0.45)*uSunUp*sv*sv*(1.0-uEnv);',\n  ' gl_FragColor=vec4(uEnv>0.5?sqrt(clamp(cl/uEnvK,0.0,1.0)):tmo(cl),1.0);}'")
rep("  gl.drawArrays(gl.TRIANGLES,0,3);\n  gl.disableVertexAttribArray(SKY.a('aP')); gl.depthMask(true);\n",
    "  var envOn=physOn&&!under; if(envOn&&envDue(t)) envRender(t,nowMs,starsOn,nightF,moonUp,mp.illum,moonDir,cl,-Math.sin(cwr),Math.cos(cwr));\n"
    "  envOn=envOn&&ENV.ok;\n"
    "  gl.drawArrays(gl.TRIANGLES,0,3);\n  gl.disableVertexAttribArray(SKY.a('aP')); gl.depthMask(true);\n")
rep("  TMO_GLSL,PHYS_GLSL,\n  'uniform vec3 uDeep,", "  TMO_GLSL,PHYS_GLSL,ENV_GLSL,\n  'uniform vec3 uDeep,")
rep("  ' vec3 skyR=uPhys>0.5?physSky(vec3(Rf.x,max(Rf.y,0.0),Rf.z)):",
    "  ' vec3 skyR=uEnvOn>0.5?envRd(envUV(Rf),2.5):uPhys>0.5?physSky(vec3(Rf.x,max(Rf.y,0.0),Rf.z)):")
rep("  gl.uniform3fv(SEA.u('uEye'),eye); physUniforms(SEA,physOn,ov,sunDir,moonDir);\n",
    "  gl.uniform3fv(SEA.u('uEye'),eye); physUniforms(SEA,physOn,ov,sunDir,moonDir);\n"
    "  gl.uniform1f(SEA.u('uEnvOn'),envOn?1:0); gl.uniform1f(SEA.u('uEnvK'),ENV.k); if(envOn){ gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D,ENV.tex); gl.uniform1i(SEA.u('uEnvT'),5); gl.activeTexture(gl.TEXTURE0); }\n")

# ---------- G2. שביל הירח: אותו מודל נצנוצים של השמש, עם הירח (בלילה lightDir כבר מכוון אל הירח) ----------
# העוצמה לפי הגובה, החלק המואר (בחזקת 1.2) והחשכה; קרוב — שדה נצנוצים שבור; רחוק — פס רך שמצטמצם אל האופק.
rep("  ' col+=sunL*pow(max(dot(N,H),0.0),22.0)*0.035*uSunUp;',",
    "  ' col+=sunL*pow(max(dot(N,H),0.0),22.0)*0.035*uSunUp;',\n"
    "  ' if(uMoonGl>0.001){ col+=vec3(0.80,0.86,1.0)*((1.0-exp(-spk*1.4))*1.5+spb*0.55+pow(max(dot(N,H),0.0),40.0)*0.05)*uMoonGl; }',")
rep("  TMO_GLSL,PHYS_GLSL,ENV_GLSL,\n  'uniform vec3 uDeep,", "  TMO_GLSL,PHYS_GLSL,ENV_GLSL,'uniform float uMoonGl;',\n  'uniform vec3 uDeep,")
rep("  gl.uniform1f(SEA.u('uEnvOn'),envOn?1:0);",
    "  gl.uniform1f(SEA.u('uMoonGl'),(sAlt<=-3)?moonUp*Math.pow(mp.illum,1.2)*nightF*(1-0.85*cl*cl):0);\n  gl.uniform1f(SEA.u('uEnvOn'),envOn?1:0);")

# ---------- G8+9. הירח מצילום ושביל החלב מפנורמה (הטעינה והכיוונים ב-gfx_add.js) ----------
rep("  PHYS_GLSL,ENV_GLSL,\n  'float h21c(vec2 p){", "  PHYS_GLSL,ENV_GLSL,'uniform float uMoonTex,uMWTex; uniform sampler2D uMoonT,uMWT;',\n  'float h21c(vec2 p){")
rep("""  '   c=mix(c,vec3(0.93,0.94,0.97)*shade,f*uMoonUp*(0.35+0.65*uNight)); } }',""",
"""  '   if(uMoonTex>0.5){ float z=sqrt(max(0.0,1.0-x*x-y*y)); vec3 nw=uMoonR*x+uMoonU*y-uMoonDir*z;',
  '    float lt=smoothstep(-0.035,0.05,dot(nw,uSunDir)); vec3 alb=texture2D(uMoonT,vec2(0.5+atan(x,z)*0.1591549,0.5-asin(clamp(y,-1.0,1.0))*0.3183099)).rgb;',
  '    vec3 ml=alb*alb*(lt*(0.55+0.45*z)*4.2+0.018); float aa=smoothstep(1.0,0.93,sqrt(x*x+y*y));',
  '    c=mix(c,max(c,tmoN(ml)),aa*uMoonUp*(0.35+0.65*uNight)); }',
  '   else c=mix(c,vec3(0.93,0.94,0.97)*shade,f*uMoonUp*(0.35+0.65*uNight)); } }',
  /* הילה עדינה סביב הירח: כמה קטרים, לפי החלק המואר; ברקע השמיים הכחלחלים כבר באים מהפיזור */
  ' if(uMoonTex>0.5&&md>0.955){ float ar=acos(clamp(md,-1.0,1.0)); c+=vec3(0.70,0.76,0.86)*(exp(-ar*ar/0.0009)*0.10+exp(-ar*ar/0.012)*0.035)*uMoonUp*uIllum*uNight; }',""")
rep("""  '  float core=exp(-gl2*gl2/1.35), wid=0.105+0.115*core;',""",
"""  '  if(uMWTex>0.5){ vec3 mwc=texture2D(uMWT,vec2(0.5-gl2*0.1591549,0.5-gb*0.3183099)).rgb; c+=mwc*mwc*0.95*uMW*smoothstep(-0.02,0.20,r.y); } else {',
  '  float core=exp(-gl2*gl2/1.35), wid=0.105+0.115*core;',""")
rep("""  '  c+=vec3(0.62,0.68,0.84)*band*0.19*uMW*smoothstep(-0.02,0.20,r.y); }',""",
    """  '  c+=vec3(0.62,0.68,0.84)*band*0.19*uMW*smoothstep(-0.02,0.20,r.y); } }',""")
rep("  gl.uniform3fv(SKY.u('uMoonR'),mR); gl.uniform3fv(SKY.u('uMoonU'),mU);",
    "  gl.uniform3fv(SKY.u('uMoonR'),mR); gl.uniform3fv(SKY.u('uMoonU'),mU); if(GFX.tier>0) skyTexUniforms(moonDir);")
rep("  var starsOn=(!under&&nightF>0.04&&starsInit()), liteQ=(EXO.quality==='lite');",
    "  var starsOn=(!under&&nightF>0.04&&starsInit()), liteQ=(EXO.quality==='lite'); skyTexFrame(moonUp,nightF,starsOn);")
rep("frame(); C.classList.add('on');", "frame(); C.classList.add('on'); setTimeout(function(){ EXO.firstFrame=true; },600);")

# ---------- G11. כוכבים: נצנוץ חזק יותר ליד האופק, עם שינוי צבע (האוויר שובר את האור כמו מנסרה ומטלטל אותו),
#            וזוהר קטן סביב הבהירים ביותר. הכול בשיידר של הנקודות; העלות זניחה ----------
rep("      'varying float vA; varying vec3 vC;',\n      'float h21(vec2 p)", "      'varying float vA; varying vec3 vC; varying float vG;',\n      'float h21(vec2 p)")
rep("""      ' float ph=fract(aD.x*91.7+aD.y*57.3)*6.2832, tw=1.0+uTw*(0.10+0.55*pow(1.0-up,4.0))*sin(uTime*(3.0+fract(aD.z*33.1)*5.0)+ph);',""",
"""      ' float ph=fract(aD.x*91.7+aD.y*57.3)*6.2832, lo=pow(1.0-up,3.0), sp=uTime*(3.0+fract(aD.z*33.1)*5.0)+ph;',
      ' float tw=1.0+uTw*(0.12+0.80*lo)*(0.6*sin(sp)+0.4*sin(sp*2.7+1.3));',""")
rep("""      ' gl_PointSize=uPx*(2.1+3.4*b*b+0.9*clamp((4.5-aM)/4.0,0.0,1.0));',""",
"""      ' vG=clamp((1.2-aM)/2.6,0.0,1.0);',
      ' gl_PointSize=uPx*(2.1+3.4*b*b+0.9*clamp((4.5-aM)/4.0,0.0,1.0))*(1.0+1.8*vG);',""")
rep("""      ' vC=mix(mix(vec3(1.0,0.74,0.52),vec3(1.0,0.97,0.93),k),vec3(0.74,0.84,1.0),hot); }'].join('\\n'),""",
"""      ' vC=mix(mix(vec3(1.0,0.74,0.52),vec3(1.0,0.97,0.93),k),vec3(0.74,0.84,1.0),hot);',
      ' float cs=uTime*(9.0+fract(aD.y*41.3)*6.0)+ph; vC*=1.0+uTw*0.45*lo*vec3(sin(cs),sin(cs+2.1),sin(cs+4.2)); }'].join('\\n'),""")
rep("""     ['precision highp float; varying float vA; varying vec3 vC;',
      'void main(){ float d=length(gl_PointCoord-0.5); float s=smoothstep(0.5,0.16,d); gl_FragColor=vec4(vC,vA*s); }'].join('\\n'));""",
"""     ['precision highp float; varying float vA; varying vec3 vC; varying float vG;',
      'void main(){ float d=length(gl_PointCoord-0.5)*2.0, k=1.0+1.8*vG; float s=smoothstep(1.0/k,0.32/k,d);',
      ' float halo=vG*0.30*exp(-d*d*7.0)*(1.0-d); gl_FragColor=vec4(vC,vA*max(s,halo)); }'].join('\\n'));""")

# ---------- G10. עננים בשתי שכבות: cirrus גבוה (כ-9 ק"מ) מעל העננים הנמוכים; שוליים כסופים מול השמש ומול הירח;
#            והגבוהים נשארים מוארים בכתום-אדום אחרי השקיעה — כל עוד השמש, מהגובה שלהם ובמרחק שלהם, עוד מעל האופק.
#            אמת: נתון העננות הוא אחוז כולל אחד (Open-Meteo). החלוקה לשכבות היא ייצוג: ה-cirrus מופיע רק כשיש עננות
#            (מ-10%), ועוצמתו נגזרת ממנה; הכיוון שלו — לפי הרוח. אין כאן ענן שאין לו בסיס בנתון. ----------
rep("  PHYS_GLSL,ENV_GLSL,'uniform float uMoonTex,uMWTex; uniform sampler2D uMoonT,uMWT;',",
    "  PHYS_GLSL,ENV_GLSL,'uniform float uMoonTex,uMWTex; uniform sampler2D uMoonT,uMWT; uniform float uCiOn,uCiA,uSunAltR; uniform vec2 uCiDir; uniform vec3 uHiCol;',")
rep("  'float hash(vec3 p){ return fract(sin(dot(p,vec3(12.9898,78.233,45.164)))*43758.5453); }',",
    "  'float hash(vec3 p){ return fract(sin(dot(p,vec3(12.9898,78.233,45.164)))*43758.5453); }',\n"
    "  'float fbm3(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<3;i++){ s+=a*vnc(p); p=p*2.07+vec2(5.1,9.3); a*=0.5; } return s*1.143; }',")
rep("  ' float cov=0.0;',",
"""  ' if(uCiOn>0.5 && r.y>0.008 && uUnder<0.5){',
  '  vec2 q0=r.xz/(r.y+0.035), cq=q0*0.33; cq=vec2(dot(cq,uCiDir),dot(cq,vec2(-uCiDir.y,uCiDir.x)))*vec2(0.30,2.4)+vec2(uTime*0.0035,0.0);',
  '  float ci=fbm3(cq+vec2(fbm3(cq*1.9+3.1)*0.8,0.0));',
  '  float ca=smoothstep(0.50,0.80,ci)*smoothstep(0.008,0.10,r.y)*uCiA;',
  '  float dkm=length(q0)*9.0, sAz=dot(normalize(r.xz+vec2(1e-5)),normalize(uSunDir.xz+vec2(1e-5)));',
  '  float litH=smoothstep(-0.063,-0.047,uSunAltR+dkm/6360.0*sAz);',
  '  vec3 cic=uHiCol*litH*(0.45+0.55*uSunUp)+pow(max(dot(r,uSunDir),0.0),10.0)*uHiCol*0.35*litH;',
  '  cic+=vec3(0.30,0.34,0.42)*uMoonUp*uIllum*uNight*0.12;',
  '  c=mix(c,max(c,cic),ca*0.75); }',
  ' float cov=0.0;',""")
rep("""  '  vec3 lit=mix(vec3(0.97,0.98,1.0),uSunCol,0.30)*(0.22+0.78*uSunUp)+uSunCol*toSun*0.35*uSunUp+uDuskCol*uDusk*0.40;',""",
"""  '  vec3 lit=mix(vec3(0.97,0.98,1.0),uSunCol,0.30)*(0.22+0.78*uSunUp)+uSunCol*toSun*0.35*uSunUp+uDuskCol*uDusk*0.40;',
  '  lit+=uSunCol*pow(max(dot(r,uSunDir),0.0),60.0)*(1.0-dens)*(1.0-dens)*(1.0-dens)*0.8*uSunUp;',""")
rep("""  '  cc=mix(cc,cc*0.12+vec3(0.018,0.026,0.045),uNight*0.88);',""",
"""  '  cc=mix(cc,cc*0.12+vec3(0.018,0.026,0.045),uNight*0.88);',
  '  cc+=vec3(0.46,0.50,0.60)*uMoonUp*uIllum*uNight*(0.05+0.45*pow(max(dot(r,uMoonDir),0.0),10.0)*(1.0-dens)*(1.0-dens));',""")
rep("  gl.uniform1f(SKY.u('uCloudOn'),cl>0.02?1:0);",
    "  gl.uniform1f(SKY.u('uCloudOn'),cl>0.02?1:0); cirrusUniforms(cl,c.windDir,sp.alt);")

# ---------- G5. מפרשים חיים: נשימה עם המשבים (הבטן מתמלאת ומתרוקנת לפי היחס בין המשב לרוח הממוצעת בנתון),
#            ורפרוף קטן בקצה האחורי (ה-leech), חזק יותר ברוח חזקה. רק למפרשי הבד — לא לדגל ולא למדבקות ----------
rep("""  'void main(){ vec3 p=vec3(aP.x,aP.y,aP.z*uZS); vec4 w=uM*vec4(p,1.0); vW=w.xyz;',
  ' vN=mat3(uM[0].xyz,uM[1].xyz,uM[2].xyz)*aN; vUV=aUV; gl_Position=uVP*w;}'].join('\\n'),""",
"""  'uniform vec4 uSailA;',
  'void main(){ vec3 p=vec3(aP.x,aP.y,aP.z*uZS);',
  ' if(uSailA.w>0.5){ float br=1.0+uSailA.x*sin(aUV.y*2.2+uSailA.z*0.9)*0.35+uSailA.x;',
  '  float fl=uSailA.y*smoothstep(0.72,1.0,aUV.x)*(0.55+0.45*sin(aUV.y*37.0+uSailA.z*13.0))*sin(aUV.y*23.0-uSailA.z*17.0);',
  '  p.z=p.z*br+fl*sign(uZS+1e-4); }',
  ' vec4 w=uM*vec4(p,1.0); vW=w.xyz;',
  ' vN=mat3(uM[0].xyz,uM[1].xyz,uM[2].xyz)*aN; vUV=aUV; gl_Position=uVP*w;}'].join('\\n'),""")
rep("  var mB=(boomA>=0), jB=(jibA>=0);", "  sailAnim(c,t,1);\n  var mB=(boomA>=0), jB=(jibA>=0);")
rep("  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);\n  var enR=",
    "  sailAnim(c,t,0);\n  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);\n  var enR=")

# ---------- G4. שובל קצף וגל חרטום. במסגרת של הסירה: המים זורמים לאחור במהירות הסירה (SOG מהמעקב).
#            מאחור — פס קצף שמתרחב ודועך, ושתי זרועות של גל קלווין בזווית 19.5°; מלפנים — קצף סביב החרטום,
#            שמתנפץ כשהחרטום צולל לגל (לפי קצב השינוי של העלרוד). במהירות אפס — אין שובל ----------
rep("  TMO_GLSL,PHYS_GLSL,ENV_GLSL,'uniform float uMoonGl;',", "  TMO_GLSL,PHYS_GLSL,ENV_GLSL,'uniform float uMoonGl,uRich; uniform vec4 uWake;',")
rep("  ' col=mix(col,uFoamC,clamp(cap+crest,0.0,0.92));',",
"""  ' col=mix(col,uFoamC,clamp(cap+crest,0.0,0.92));',
  ' if(uUnder<0.5&&uWake.x>0.05){ vec2 q=vW.xz, f2=uHull.xy; float la=dot(q,f2), lb=q.y*f2.x-q.x*f2.y;',
  '  if(la>-160.0&&la<8.0&&abs(lb)<70.0){ float sp=uWake.x, d=max(0.0,-la-4.2);',
  '   float wn=vn(vec2(la+uTime*sp,lb*1.6)*0.85)*0.65+vn(vec2(la+uTime*sp,lb)*2.3+7.0)*0.35;',
  '   float wd=1.1+d*0.085, core=exp(-lb*lb/(wd*wd))*exp(-d/(7.0+sp*3.2))*step(la,-3.6);',
  '   float kd=abs(abs(lb)-0.354*d)/(0.5+0.035*d), kel=exp(-kd*kd)*exp(-d/(12.0+sp*4.0))*smoothstep(1.0,6.0,d);',
  '   float e=length(vec2(la/5.45,lb/1.78))-1.0, bow=exp(-e*e*55.0)*smoothstep(-1.0,4.5,la)*(0.35+uWake.y*1.6);',
  '   float wf=(core*0.85+kel*0.45)*smoothstep(0.35,0.75,wn+core*0.25)+bow*smoothstep(0.25,0.7,wn);',
  '   col=mix(col,uFoamC,clamp(wf*min(1.0,sp/2.5),0.0,0.72)); } }',""")
rep("  gl.uniform1f(SEA.u('uMoonGl'),", "  wakeUniforms(t,dtF);\n  gl.uniform1f(SEA.u('uMoonGl'),")

# ---------- G6. ים עשיר (דרגה 2): תשעה גלי Gerstner נוספים (16 בסך הכול) בפריסה סביב כיוון הים והרוח, ועוד
#            12 אדוות אנליטיות בנורמל במקום רעש הערכים. אמת: הגובה הכולל נשמר — כשהגלים הנוספים נכנסים,
#            שבעת הגלים של הנתון מוקטנים כך שהשונות (ולכן גובה הגל המשמעותי) לא משתנה ----------
rep(" 'uniform vec4 uW0,uW1,uW2,uW3,uW4,uW5,uW6; uniform vec4 uSpA,uSpB,uStA,uStB;',",
    " 'uniform vec4 uW0,uW1,uW2,uW3,uW4,uW5,uW6; uniform vec4 uSpA,uSpB,uStA,uStB; uniform vec4 uWX[9]; uniform float uRich;',")
rep(" ' addWave(uW6,uSpB.z,uStB.z,p,dsp,n,j);',",
    " ' addWave(uW6,uSpB.z,uStB.z,p,dsp,n,j);',\n ' if(uRich>0.5){ for(int i=0;i<9;i++){ addWave(uWX[i],1.249*sqrt(uWX[i].w),0.16,p,dsp,n,j); } }',")
rep("""  ' if(det>0.012){ vec2 q=vW.xz*0.55-uWindV*uTime*0.55; float e=0.32;',
  '  float n1=vn(q), nx1=vn(q+vec2(e,0.0)), nz1=vn(q+vec2(0.0,e));',
  '  N=normalize(vN+vec3((nx1-n1)*1.35,0.0,(nz1-n1)*1.35)*det); }',""",
"""  ' if(det>0.012&&uRich>0.5){ vec2 g0=uWindV, gp=vec2(-g0.y,g0.x); vec2 nd=vec2(0.0); float L=3.2;',
  '  float fp=dist*0.0022/max(0.07,abs(normalize(uEye-vW).y));',
  '  for(int i=0;i<12;i++){ float fi=float(i), an=(fract(fi*0.6180339+0.13)-0.5)*2.3; vec2 dd=g0*cos(an)+gp*sin(an);',
  '   float k=6.2831853/L, ph=k*dot(dd,vW.xz)-sqrt(9.81*k)*uTime+fi*2.39+sin(fi*3.7)*1.3; nd+=dd*k*cos(ph)*L*0.012*clamp((L-2.5*fp)/(2.5*fp),0.0,1.0); L*=0.7713; }',
  '  N=normalize(vN-vec3(nd.x,0.0,nd.y)*det*det*1.35); }',
  ' else if(det>0.012){ vec2 q=vW.xz*0.55-uWindV*uTime*0.55; float e=0.32;',
  '  float n1=vn(q), nx1=vn(q+vec2(e,0.0)), nz1=vn(q+vec2(0.0,e));',
  '  N=normalize(vN+vec3((nx1-n1)*1.35,0.0,(nz1-n1)*1.35)*det); }',""")
rep("  for(var wq=0;wq<NWV;wq++)\n    gl.uniform4f(SEA.u('uW'+wq),wDir[wq][0],wDir[wq][1],wAmp[wq],wLen[wq]);",
    "  for(var wq=0;wq<NWV;wq++)\n    gl.uniform4f(SEA.u('uW'+wq),wDir[wq][0],wDir[wq][1],wAmp[wq]*richScale(),wLen[wq]);\n  richUniforms();")

# ---------- G16. קרני שמש מבין העננים (דרגה 2): לכל פיקסל בשמיים, שש דגימות של כיסוי העננים בדרך אל השמש.
#            איפה שהדרך פנויה — האוויר מואר (קרן); איפה שענן חוסם — צל. רק כשיש עננים, השמש גבוהה עד 35°,
#            והפיקסל בתוך 60° מהשמש ----------
rep("  ' float sv=1.0-cov*0.93;',",
"""  ' if(uGR>0.001&&uUnder<0.5){ float sd=dot(r,uSunDir); if(sd>0.5&&r.y>0.0){ float acc=0.0;',
  '   for(int i=1;i<=6;i++){ vec3 s=normalize(mix(r,uSunDir,float(i)/7.0)); if(s.y>0.012){ vec2 cp2=s.xz/(s.y+0.11)*1.10+uCloudV*uTime*0.0065;',
  '    acc+=1.0-smoothstep(uCloudTh-0.10,uCloudTh+0.14,fbm3(cp2))*smoothstep(0.012,0.15,s.y); } else acc+=1.0; }',
  '   float ray=acc/6.0, fall=smoothstep(0.5,1.0,sd)*(1.0-cov);',
  '   c+=uSunCol*(ray-0.55)*0.22*fall*uGR; } }',
  ' float sv=1.0-cov*0.93;',""")
rep("  PHYS_GLSL,ENV_GLSL,'uniform float uMoonTex,uMWTex;", "  PHYS_GLSL,ENV_GLSL,'uniform float uGR;','uniform float uMoonTex,uMWTex;")
rep("  gl.uniform1f(SKY.u('uCloudOn'),cl>0.02?1:0); cirrusUniforms(cl,c.windDir,sp.alt);",
    "  gl.uniform1f(SKY.u('uCloudOn'),cl>0.02?1:0); cirrusUniforms(cl,c.windDir,sp.alt);\n"
    "  gl.uniform1f(SKY.u('uGR'),(GFX.tier>=2&&cl>0.12&&cl<0.92)?sunUp*smooth(35,5,sAlt)*Math.min(1,(cl-0.12)*4):0);")

# ---------- G13+14. מטאורים וזוהר קוטבי — בשיידר השמיים, לפני העננים (העננים מסתירים אותם) ----------
rep("  PHYS_GLSL,ENV_GLSL,'uniform float uGR;',", "  PHYS_GLSL,ENV_GLSL,'uniform float uGR; uniform vec3 uMetA,uMetN; uniform vec4 uMetP,uAur;',")
rep("""  ' if(uCiOn>0.5 && r.y>0.008 && uUnder<0.5){',""",
"""  ' if(uAur.w>0.001&&r.y>0.0&&uUnder<0.5){ float daz=atan(r.x,-r.z)-uAur.x; daz=atan(sin(daz),cos(daz)); float el=asin(r.y);',
  '  float x=daz*5.0; float rays=0.5+0.5*sin(x*9.0+fbm3(vec2(x*0.7,uTime*0.05))*7.0); rays=mix(0.25,1.0,rays)*(0.4+0.8*fbm3(vec2(x*1.9,uTime*0.03)));',
  '  float b0=uAur.y+0.03*sin(daz*3.0+uTime*0.06), hh=(el-b0)/(uAur.z-b0);',
  '  float cur=smoothstep(-0.06,0.06,hh)*exp(-max(hh,0.0)*1.9)*smoothstep(1.6,1.0,hh)*exp(-daz*daz/0.8);',
  '  c+=mix(vec3(0.16,0.95,0.42),vec3(0.90,0.22,0.32),smoothstep(0.35,1.05,hh))*cur*rays*uAur.w*0.5; }',
  ' if(uMetP.w>0.5&&uUnder<0.5){ float dn=dot(r,uMetN); if(abs(dn)<0.006){ vec3 rp=normalize(r-uMetN*dn);',
  '  float ang=atan(dot(cross(uMetA,rp),uMetN),dot(uMetA,rp)); if(ang<uMetP.x&&ang>uMetP.x-uMetP.y){ float k=(ang-(uMetP.x-uMetP.y))/max(uMetP.y,1e-4);',
  '   c+=vec3(0.86,0.93,1.0)*exp(-dn*dn/(3.2e-6*(0.35+k)))*k*k*uMetP.z*1.8; } } }',
  ' if(uCiOn>0.5 && r.y>0.008 && uUnder<0.5){',""")
rep("  gl.uniform1f(SKY.u('uCloudOn'),cl>0.02?1:0); cirrusUniforms(cl,c.windDir,sp.alt);",
    "  gl.uniform1f(SKY.u('uCloudOn'),cl>0.02?1:0); cirrusUniforms(cl,c.windDir,sp.alt);\n"
    "  metFrame(nowMs,t,dtF,fwd,right,upv,nightF,moonUp,mp.illum,cl); metUniforms(t); auroraFrame(nowMs,sAlt,moonUp,mp.illum,cl); auroraUniforms();")
# ---------- G15. האלבטרוס, עם גוף הסירה והצוות (אותה תוכנית SOLID) ----------
rep("  drawMesh(CREW.gl, dM, COL.shade);\n  }\n", "  drawMesh(CREW.gl, dM, COL.shade);\n  }\n  drawBird(t,nowMs,sunUp);\n")

# ---------- דרגות בזמן הבנייה של השיידר: SKY, SEA ו-SAILP נבנים לכל דרגה בנפרד (progV/progT ב-gfx_head.js),
#            והקוד של כל פריט עטוף ב-#if TIER. דרגה 0 = כמעט השיידרים של היום (ועוד ACES) ----------
rep("var SKY=prog('attribute vec2 aP;", "var SKY=progV('SKY','attribute vec2 aP;")
rep("var SEA=prog(['precision highp float; attribute vec2 aP;", "var SEA=progV('SEA',['precision highp float; attribute vec2 aP;")
rep("var SAILP=prog(\n", "var SAILP=progV('SAILP',\n")
rep("  if(q==='lite') GFX.tier=EXO.tier=0; else if(GFX.tier===0) GFX.tier=EXO.tier=1;\n  resize();",
    "  if(q==='lite') GFX.tier=EXO.tier=0; else if(GFX.tier===0) GFX.tier=EXO.tier=1;\n  tierProgs(); resize();")
T1="  '#if TIER>=1',\n"; T2="  '#if TIER>=2',\n"; EL="  '#else',\n"; EN="  '#endif',\n"
rep("  ' vec3 c=(uPhys>0.5&&uUnder<0.5)?tmoN(physSky(r)):mix(uHor,uZen,pow(h,0.62));',\n",
    T1+"  ' vec3 c=(uPhys>0.5&&uUnder<0.5)?tmoN(physSky(r)):mix(uHor,uZen,pow(h,0.62));',\n"+EL+"  ' vec3 c=mix(uHor,uZen,pow(h,0.62));',\n"+EN)
rep("  ' if(uAur.w>0.001&&r.y>0.0&&uUnder<0.5){", "  '#if defined(AUR)',\n  ' if(uAur.w>0.001&&r.y>0.0&&uUnder<0.5){")
rep("  '  c+=mix(vec3(0.16,0.95,0.42),vec3(0.90,0.22,0.32),smoothstep(0.35,1.05,hh))*cur*rays*uAur.w*0.5; }',\n",
    "  '  c+=mix(vec3(0.16,0.95,0.42),vec3(0.90,0.22,0.32),smoothstep(0.35,1.05,hh))*cur*rays*uAur.w*0.5; }',\n  '#endif',\n  '#if defined(MET)',\n")
rep("  '   c+=vec3(0.86,0.93,1.0)*exp(-dn*dn/(3.2e-6*(0.35+k)))*k*k*uMetP.z*1.8; } } }',\n",
    "  '   c+=vec3(0.86,0.93,1.0)*exp(-dn*dn/(3.2e-6*(0.35+k)))*k*k*uMetP.z*1.8; } } }',\n  '#endif',\n"+T1)
rep("  '  c=mix(c,max(c,cic),ca*0.75); }',\n", "  '  c=mix(c,max(c,cic),ca*0.75); }',\n"+EN)
rep("  ' if(uGR>0.001&&uUnder<0.5){", T2+"  ' if(uGR>0.001&&uUnder<0.5){")
rep("  '   c+=uSunCol*(ray-0.55)*0.22*fall*uGR; } }',\n", "  '   c+=uSunCol*(ray-0.55)*0.22*fall*uGR; } }',\n"+EN)
rep(" ' if(uRich>0.5){ for(int i=0;i<9;i++){", " '#if TIER>=2',\n ' if(uRich>0.5){ for(int i=0;i<9;i++){")
rep("0.16,p,dsp,n,j); } }',\n", "0.16,p,dsp,n,j); } }',\n '#endif',\n")
rep("  ' if(det>0.012&&uRich>0.5){", T2+"  ' if(det>0.012&&uRich>0.5){")
rep("  ' else if(det>0.012){ vec2 q=vW.xz*0.55-uWindV*uTime*0.55; float e=0.32;',\n",
    "  ' else',\n"+EN+"  ' if(det>0.012){ vec2 q=vW.xz*0.55-uWindV*uTime*0.55; float e=0.32;',\n")
rep("  ' vec3 skyR=uEnvOn>0.5?", T1+"  ' vec3 skyR=uEnvOn>0.5?")
rep("mix(uHor,uDuskCol,uDusk*sdR*0.5); vec3 col=mix(body,skyR,fres);',\n",
    "mix(uHor,uDuskCol,uDusk*sdR*0.5); vec3 col=mix(body,skyR,fres);',\n"+EL+"  ' vec3 col=mix(body,mix(uHor,uDuskCol,uDusk*sdR*0.5),fres);',\n"+EN)
rep("  ' if(uUnder<0.5&&uWake.x>0.05){", T1+"  ' if(uUnder<0.5&&uWake.x>0.05){")
rep("  '   col=mix(col,uFoamC,clamp(wf*min(1.0,sp/2.5),0.0,0.72)); } }',\n", "  '   col=mix(col,uFoamC,clamp(wf*min(1.0,sp/2.5),0.0,0.72)); } }',\n"+EN)
rep("  ' vec3 fogc=uPhys>0.5?physSky(normalize(vec3(-V.x,0.0,-V.z)+vec3(1e-5,0.0,0.0))):mix(uFogCol,uDuskCol,uDusk*sdV*0.87);',\n",
    T1+"  ' vec3 fogc=uEnvOn>0.5?envRd(vec2(atan(-V.x,V.z)*0.1591549+0.5,0.0),0.0):uPhys>0.5?physSky(normalize(vec3(-V.x,0.0,-V.z)+vec3(1e-5,0.0,0.0))):mix(uFogCol,uDuskCol,uDusk*sdV*0.87);',\n"+EL+"  ' vec3 fogc=mix(uFogCol,uDuskCol,uDusk*sdV*0.87);',\n"+EN)
rep("  ' if(uSailA.w>0.5){", T1+"  ' if(uSailA.w>0.5){")
rep("  '  p.z=p.z*br+fl*sign(uZS+1e-4); }',\n", "  '  p.z=p.z*br+fl*sign(uZS+1e-4); }',\n"+EN)
rep("  var c=cond;\n\n  /* camera: orbit with momentum */", "  var c=cond; flagsFrame(nowMs);\n\n  /* camera: orbit with momentum */")
