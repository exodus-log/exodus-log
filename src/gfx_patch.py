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
    "  ' vec3 cl=ainv(c)+uSunL*(pow(d,7000.0)*9.0+pow(d,1400.0)*0.45)*uSunUp*sv*sv*(1.0-uEnv);',\n  ' gl_FragColor=vec4(uEnv>0.5?tmoN(cl):tmo(cl),1.0);}'")
rep("  gl.drawArrays(gl.TRIANGLES,0,3);\n  gl.disableVertexAttribArray(SKY.a('aP')); gl.depthMask(true);\n",
    "  var envOn=physOn&&!under; if(envOn&&envDue(t)) envRender(t,nowMs,starsOn,nightF,moonUp,mp.illum,moonDir,cl,-Math.sin(cwr),Math.cos(cwr));\n"
    "  envOn=envOn&&ENV.ok;\n"
    "  gl.drawArrays(gl.TRIANGLES,0,3);\n  gl.disableVertexAttribArray(SKY.a('aP')); gl.depthMask(true);\n")
rep("  TMO_GLSL,PHYS_GLSL,\n  'uniform vec3 uDeep,", "  TMO_GLSL,PHYS_GLSL,ENV_GLSL,\n  'uniform vec3 uDeep,")
rep("  ' vec3 skyR=uPhys>0.5?physSky(vec3(Rf.x,max(Rf.y,0.0),Rf.z)):",
    "  ' vec3 skyR=uEnvOn>0.5?ainv(texture2D(uEnvT,envUV(Rf)).rgb):uPhys>0.5?physSky(vec3(Rf.x,max(Rf.y,0.0),Rf.z)):")
rep("  gl.uniform3fv(SEA.u('uEye'),eye); physUniforms(SEA,physOn,ov,sunDir,moonDir);\n",
    "  gl.uniform3fv(SEA.u('uEye'),eye); physUniforms(SEA,physOn,ov,sunDir,moonDir);\n"
    "  gl.uniform1f(SEA.u('uEnvOn'),envOn?1:0); if(envOn){ gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D,ENV.tex); gl.uniform1i(SEA.u('uEnvT'),5); gl.activeTexture(gl.TEXTURE0); }\n")

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
  '  lit+=uSunCol*pow(max(dot(r,uSunDir),0.0),28.0)*(1.0-dens)*(1.0-dens)*1.3*uSunUp;',""")
rep("""  '  cc=mix(cc,cc*0.12+vec3(0.018,0.026,0.045),uNight*0.88);',""",
"""  '  cc=mix(cc,cc*0.12+vec3(0.018,0.026,0.045),uNight*0.88);',
  '  cc+=vec3(0.46,0.50,0.60)*uMoonUp*uIllum*uNight*(0.05+0.45*pow(max(dot(r,uMoonDir),0.0),10.0)*(1.0-dens)*(1.0-dens));',""")
rep("  gl.uniform1f(SKY.u('uCloudOn'),cl>0.02?1:0);",
    "  gl.uniform1f(SKY.u('uCloudOn'),cl>0.02?1:0); cirrusUniforms(cl,c.windDir,sp.alt);")
