# -*- coding: utf-8 -*-
"""Builds the full-window version of the site into ./out/ (a mirror of the repo layout).
   Reads the staged copy of the live site; never writes to it."""
import io, os, re, shutil, subprocess, sys, json

HERE = os.path.dirname(os.path.abspath(__file__))
# האתר: GGR_SITE אם הוגדר; אחרת התיקייה שמעל src/ (כשרצים מתוך הריפו); אחרת הנתיב בסביבת העבודה של Claude
SITE = os.environ.get('GGR_SITE') or (os.path.dirname(os.path.dirname(os.path.abspath(__file__))) if os.path.exists(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'deck.js')) else '/mnt/user-data/uploads/GGR Project')
OUT = os.path.join(HERE, 'out')
NPM = os.path.join(HERE, 'npm', 'node_modules')   # only when the fonts change: npm i @fontsource-variable/heebo @fontsource/b612-mono @fontsource/david-libre

def rd(p): return io.open(p, encoding='utf-8').read()
def wr(p, s):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    io.open(p, 'w', encoding='utf-8', newline='\n').write(s)

class Patch:
    def __init__(self, s, name): self.s, self.name = s, name
    def rep(self, old, new, n=1):
        c = self.s.count(old)
        assert c == n, '%s: expected %d, found %d: %r' % (self.name, n, c, old[:80])
        self.s = self.s.replace(old, new)
    def rex(self, pat, new, flags=re.S):
        m = re.findall(pat, self.s, flags)
        assert len(m) == 1, '%s: regex expected 1, found %d: %r' % (self.name, len(m), pat[:80])
        self.s = re.sub(pat, lambda _m: new, self.s, count=1, flags=flags)
    def recolor(self):
        for a, b in (('#ff8a3c', '#43d6cf'), ('#ffb27a', '#8fe3de'), ('#ffb454', '#e7f1f8'),
                     ('Assistant,sans-serif', 'Heebo,sans-serif'), ('IBM Plex Mono,monospace', 'Heebo,sans-serif')):
            self.s = self.s.replace(a, b)

# ---------- 1. engine ----------
subprocess.check_call([sys.executable, os.path.join(HERE, 'build_engine.py')])

# ---------- 2. journey.js: front.js without the old first screen ----------
J = Patch(rd(os.path.join(SITE, 'assets', 'front.js')), 'journey.js')
J.rep("/* ===== front.js — מרנדר את הדף מתוך data.js =====",
      "/* ===== v2/journey.js — מרנדר את \"המסע\" מתוך data.js =====\n"
      "   נבנה אוטומטית מ-assets/front.js של הדף הקודם: אותם מקטעים (המרוץ, קנה המידה, התחזית, היום של דניאל),\n"
      "   בלי המסך הראשון הישן, שאת מקומו תפס החלון. נטען רק כשפותחים את המסע. לא עורכים את הקובץ הזה ביד.\n"
      "   ===== front.js — מרנדר את הדף מתוך data.js =====")
J.rep("var EXO=window.EXO||null;", "var EXO=(window.EXO&&window.EXO.ready)?window.EXO:null;")
J.rex(r"function renderTop\(\)\{\n.*?\n\}\nfunction renderSky\(s\)\{\n.*?\n\}\n",
      "function renderTop(){}\n"
      "function renderSky(s){\n  if($('pvSail')) $('pvSail').textContent=s.sail;\n  if($('pvTwa')) $('pvTwa').textContent=Math.round(s.twa);\n}\n")
J.rex(r"/\* קומפוזיציה: בדסקטופ.*?\nfunction frameScene\(\)\{\n.*?\n\}\n", "")
J.rex(r"/\* ================= מצב קל ================= \*/\n.*?(?=/\* ================= הפעלה ================= \*/)", "")
J.rep("if(EXO){ frameScene(); window.addEventListener('resize',frameScene);\n  EXO.on(", "if(EXO){\n  EXO.on(")
# מנה א׳: הגלובוס יצא מ"המסע" והפך לשכבה קבועה משלו (hud.js טוען אותו). כאן נשאר רק הסקסטנט.
J.rex(r"lazy\(\$\('voyage'\),function\(\)\{\n.*?\},'900px 0px'\);\n", "")
J.rep("var landP=null; function needLand(){ return landP||(landP=loadScript('assets/geo/land50.js')); }",
      "var landP=null; function needLand(){ return landP||(landP=(typeof LAND50!=='undefined')?Promise.resolve():loadScript('assets/geo/land50.js')); }")
J.rep("loadScript('assets/sextant.js')", "loadScript('assets/v2/sextant.js')")
# 22.9: סירה שנסוגה (24 שעות שליליות, למשל בדרך לנמל) — הזנב נמשך אל המוביל, כאילו התקדמה. עכשיו אורך אפס.
J.rep("tail=(W-padL-padR)*it.f[6]/maxGap;", "tail=(W-padL-padR)*Math.max(0,it.f[6])/maxGap;")
# 22.9 (/next/): רוח הרפאים של נוישפר — המספר הכי סיפורי שהבוט כבר מחשב (FIX.ghost) ואף רכיב לא הציג
J.rep("' בטווח של 25 מייל ממנה.':'אין סירה בטווח של 25 מייל ממנה.');",
      "' בטווח של 25 מייל ממנה.':'אין סירה בטווח של 25 מייל ממנה.')\n"
      "    +((typeof FIX.ghost==='number')?' מול קירסטן נוישפר, המנצחת ב־2022, באותו רגע במרוץ שלה: '+NUM(thou(Math.abs(FIX.ghost)))+(FIX.ghost>=0?' מייל לפניה.':' מייל אחריה.'):'');")
J.rep("' מייל ימי מאחוריו, '", "' מייל מאחוריו, '")
J.recolor()
assert 'frameScene' not in J.s and 'storyline' not in J.s and 'bLite' not in J.s
wr(os.path.join(OUT, 'assets', 'v2', 'journey.js'), J.s)

# ---------- 3. globe.js and sextant.js in the new colours ----------
G = Patch(rd(os.path.join(SITE, 'assets', 'globe.js')), 'globe.js')
# 21.9: נקודות TRACKP נשמרות בדיוק של 0.01° (כקילומטר) והנ״צ ב-0.001°. קו "הופלג" נגמר בנקודה המעוגלת,
# ובמצב חי נוסף אליו הנ״צ המדויק — "וו" של כ-300 מטר מעבר לסירה וחזרה. בזום של הצלילה (14 ומעלה) הוא
# נראה כמו מסלול שעבר את הסירה והסתובב. כשהסוף קרוב לנ״צ, הוא נצמד אליו.
G.rep("var end=out[out.length-1]; if(gcNm(end.p,[FIX.lon,FIX.lat])>0.5) out.push({t:FIX.at,p:[FIX.lon,FIX.lat]}); else end.t=FIX.at;",
      "var end=out[out.length-1]; if(gcNm(end.p,[FIX.lon,FIX.lat])>0.5) out.push({t:FIX.at,p:[FIX.lon,FIX.lat]}); else { end.t=FIX.at; end.p=[FIX.lon,FIX.lat]; }")
# 22.9: יום המרוץ ברצועת הימים לפי התאריך ב-UTC, כמו בדוחות הרשמיים ובשורה העליונה (יום 14 = 20.9)
G.rep("var day=Math.floor((t-T0)/86400)+1,", "var day=Math.floor(t/86400)-Math.floor(T0/86400),")
G.rep("/* ===== globe.js — המפה והגלובוס (MapLibre GL, הטלת globe) =====",
      "/* ===== v2/globe.js — נבנה אוטומטית מ-assets/globe.js: אותו גלובוס, בצבעי הגרסה החדשה. לא עורכים ביד. =====\n"
      "   ===== globe.js — המפה והגלובוס (MapLibre GL, הטלת globe) =====")
G.rep("new URL('assets/tiles/earth/',location.href)", "new URL('assets/tiles/earth/',document.baseURI)")
# 22.9 לילה: גרירה ברצועת הימים כשמסתכלים על אקסודוס (מבט האזור ומעלה) — המפה הולכת איתה. עד כאן המרכז נשאר על
# ההווה והסירות זזו אל מחוץ למסך: ביום 9, בטלפון, ים ריק עם קו דק (shotq 08-phone-globe). אם המבקר גרר את המפה
# הצידה (אקסודוס רחוקה מהמרכז) — לא נוגעים; ובמבט "כל המרוץ" (זום נמוך) אין צורך.
G.rep("range.addEventListener('input',function(){ stop(); draw(tOf(+range.value),+range.value>=999.5); });",
      "var followP=null;\n"
      "function scrubFollow(p){ try{ if(!p) return; var z=map.getZoom(); if(z<3.2){ followP=p; return; }\n"
      "  var ref=followP||here, q=map.project(ref), w=box.clientWidth, h=box.clientHeight;\n"
      "  if(Math.abs(q.x-w/2)<Math.min(w,h)*0.3&&Math.abs(q.y-h/2)<Math.min(w,h)*0.3) map.jumpTo({center:p});\n"
      "  followP=p; }catch(e){} }\n"
      "range.addEventListener('input',function(){ stop(); scrubFollow(draw(tOf(+range.value),+range.value>=999.5)); });")

G.rep("{id:'done-glow',type:'line',source:'done',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#ff8a3c','line-width':['interpolate',['linear'],['zoom'],0,5,6,12],'line-opacity':0.28,'line-blur':4}},",
      "{id:'done-glow',type:'line',source:'done',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#03101a','line-width':['interpolate',['linear'],['zoom'],0,5,6,12],'line-opacity':0.55,'line-blur':4}},")
G.rep("paint:{'line-color':'#ff8a3c','line-width':['interpolate',['linear'],['zoom'],0,2,6,3.6]}}", "paint:{'line-color':'#ffffff','line-width':['interpolate',['linear'],['zoom'],0,2,6,3.6]}}")
G.rep('fill="#ff8a3c" stroke="#fff" stroke-width="2.2"', 'fill="#ffffff" stroke="#06121b" stroke-width="2.2"')
G.rep("border:2px solid #ff8a3c", "border:2px solid #ffffff")
G.rep(".gl-label.k-me{color:#ffb27a;", ".gl-label.k-me{color:#ffffff;")
G.rep("font:600 13px Assistant,sans-serif", "font:500 13px Heebo,sans-serif")
G.rep("function intro(){ if(seen) return; seen=true; setTimeout(function(){ fly('boat'); },650); }",
      "function intro(){ if(seen) return; seen=true; setTimeout(function(){ fly(window.EXO_GLOBE_START||'boat'); },650); }")
G.rep("window.__exoMap=map;", "window.__exoMap=map; window.__exoFly=function(n){ try{ fly(n); }catch(e){} };")
# מנה א׳: שכבה קבועה על כל המסך. אצבע אחת מזיזה, צביטה וגלגלת לזום, בלי גלילה. נפתח קרוב מעל הסירה.
G.rep("cooperativeGestures:true, dragRotate:false", "cooperativeGestures:false, dragRotate:false")
# מנה ב׳: אחרי כניסה בהצלבה המפה עוד מסובבת; כל כפתור מבט מחזיר את הצפון למעלה
G.rep("function fly(name){ setChip(name);", "function fly(name){ armB=0; setChip(name);")
G.rep("map.flyTo({center:here,zoom:4.6,duration:dur,essential:true});", "map.flyTo({center:here,zoom:4.6,bearing:0,duration:dur,essential:true});")
G.rep("maxZoom:6.2,duration:dur,essential:true}); }", "maxZoom:6.2,bearing:0,duration:dur,essential:true}); }")
G.rep("zoom:worldZoom(),duration:dur,essential:true}); }", "zoom:worldZoom(),bearing:0,duration:dur,essential:true}); }")
G.rep("center:[-24,8], zoom:1.6, minZoom:0.6", "center:here, zoom:5.6, minZoom:0.6")
G.rep("minZoom:0.6, maxZoom:8.5, attributionControl:false,", "minZoom:-1.6, maxZoom:16, attributionControl:false,")
G.rep("renderWorldCopies:false, fadeDuration:150,", "renderWorldCopies:false, fadeDuration:0,")
# הגלובוס נבנה ברקע, מוסתר. אין "כניסה" אוטומטית: hud.js מבקש אותה כשהשכבה נפתחת באמת
G.rex(r"  /\* הכניסה: מהעולם כולו אל הסירה.*?\n  else intro\(\);\n",
      "  window.__exoGlobeLoaded=true; if(window.__exoGlobeWant){ var w0=window.__exoGlobeWant; window.__exoGlobeWant=null; window.__exoGlobeEnter(w0); }\n")
G.rep("function worldZoom(){ var d=Math.min(box.clientWidth,box.clientHeight-150)*0.94;", "function worldZoom(){ var d=Math.min(box.clientWidth*0.94,(box.clientHeight-190)*0.98);")
# ציר הזמן (21.9, לילה): הקצה הימני של רצועת הימים נקרא "עכשיו", אבל המיקומים שם הם של נקודת
# הציון האחרונה — שיכולה להיות בת שבע שעות. "עכשיו" נשאר רק כשהיא טרייה משעה; אחרת שעת הנ״צ.
G.rep("  out.innerHTML=live?('עכשיו · יום <span class=\"num\">'+FIX.dayN+'</span> · מקום <span class=\"num\">'+FIX.rank+'</span>')",
      "  var fxAgeH=((EXO&&EXO.state?EXO.state.now:Date.now())/1000-FIX.at)/3600, fxD=new Date(FIX.at*1000);\n"
      "  var nowLbl=fxAgeH<1?'עכשיו':('נ״צ <span class=\"num\">'+('0'+fxD.getUTCHours()).slice(-2)+':'+('0'+fxD.getUTCMinutes()).slice(-2)+'</span>');\n"
      "  out.innerHTML=live?(nowLbl+' · יום <span class=\"num\">'+FIX.dayN+'</span> · מקום <span class=\"num\">'+FIX.rank+'</span>')")

G.rep("map.on('load',function(){\n  draw(T1,true);", rd(os.path.join(HERE,'globe_add.js'))+"\nmap.on('load',function(){\n  draw(T1,true);\n  try{ addGrid(); addNames(); addTrails(); addSpace(); smoothZoom(); backFade(); addScale(); }catch(e){}")
# --- סבב Z: הצד האחורי, סמני הצי כשכבה, ורצועת הימים ---
# כל סמן DOM נרשם לדעיכה לפי הזווית ממרכז המפה (backWatch ב-globe_add.js). הצי עצמו כבר שכבת circle
# של MapLibre — היא מצוירת ב-GPU, נחתכת נכון בצד האחורי, ולא עולה כלום בגרירה.
G.rep("var boat=new maplibregl.Marker({element:boatEl,rotationAlignment:'map',pitchAlignment:'map',opacityWhenCovered:'0'}).setLngLat(here).setRotation(FIX.cog).addTo(map);",
      "var boat=backWatch(new maplibregl.Marker({element:boatEl,rotationAlignment:'map',pitchAlignment:'map',opacityWhenCovered:'0'}).setLngLat(here).setRotation(FIX.cog).addTo(map),'boat');")
G.rep("  labels.push(new maplibregl.Marker({element:e,anchor:'top',offset:[0,7],opacityWhenCovered:'0'}).setLngLat([m[1],m[0]]).addTo(map)); });",
      "  labels.push(backWatch(new maplibregl.Marker({element:e,anchor:'top',offset:[0,7],opacityWhenCovered:'0'}).setLngLat([m[1],m[0]]).addTo(map))); });")
G.rep("var meMarker=new maplibregl.Marker({element:meLab,anchor:'bottom',offset:[0,-16],opacityWhenCovered:'0'}).setLngLat(here).addTo(map);",
      "var meMarker=backWatch(new maplibregl.Marker({element:meLab,anchor:'bottom',offset:[0,-16],opacityWhenCovered:'0'}).setLngLat(here).addTo(map));")
G.rep("'.gl-boat{width:30px;height:30px}", "'.gl-boat{width:30px;height:30px;opacity:var(--bk,1)}")
G.rep("white-space:nowrap;pointer-events:none;direction:rtl}'", "white-space:nowrap;pointer-events:none;direction:rtl;opacity:var(--bk,1)}'")
# היסטוריית הצי: מיזוג של course.js עם assets/fleet-log.js, ואינטרפולציה לפי זמן אמיתי ולא לפי צעד קבוע
G.rep("""function fleetAt(t){
  var out=[]; FLEET.forEach(function(f){ var h=FH[f[1]], cur=[f[3],f[2],f[5]], p;
    if(!h){ p=cur; } else { var k=(t-T0)/HIST_STEP, n=h.length-1, hEnd=T0+n*HIST_STEP;
      if(k<=0) p=h[0]; else if(k<n){ var i=Math.floor(k), fr=k-i; p=[h[i][0]+(h[i+1][0]-h[i][0])*fr, h[i][1]+(h[i+1][1]-h[i][1])*fr, h[i][2]+(h[i+1][2]-h[i][2])*fr]; }
      else { var fr2=(T1>hEnd)?Math.min(1,(t-hEnd)/(T1-hEnd)):1; p=[h[n][0]+(cur[0]-h[n][0])*fr2, h[n][1]+(cur[1]-h[n][1])*fr2, h[n][2]+(cur[2]-h[n][2])*fr2]; } }
    out.push({id:f[1],name:f[4],lon:p[0],lat:p[1],dtf:p[2],dmg:f[6]}); });
  out.sort(function(a,b){ return a.dtf-b.dtf; }); out.forEach(function(o,i){ o.rank=i+1; }); return out; }""",
"""function fleetAt(t){
  var out=[]; FLEET.forEach(function(f){ var p=fleetTrackAt(f[1],t)||[f[3],f[2],f[5]];
    out.push({id:f[1],name:f[4],lon:((p[0]+540)%360)-180,lat:p[1],dtf:p[2],dmg:f[6]}); });
  out.sort(function(a,b){ return a.dtf-b.dtf; }); out.forEach(function(o,i){ o.rank=i+1; }); return out; }""")
# הלילה נע עם התאריך במקום להיעלם בעיון, השובלים מתקצרים איתו, והסמנים מחשבים מחדש את הצד האחורי
G.rep("  if(nightOn!==live){ nightOn=live; map.setLayoutProperty('night','visibility',live?'visible':'none'); }",
      "  nightAt(live?((EXO&&EXO.state)?EXO.state.now:Date.now()):t*1000); trailsAt(t); backKick();")
G.rep("  function night(){ map.getSource('night').setData(nightPolys((EXO&&EXO.state)?EXO.state.now:Date.now())); }",
      "  function night(){ if(!scrubbing()) nightAt((EXO&&EXO.state)?EXO.state.now:Date.now()); }")
# ---- ציר הזמן, שלב 3 (23.9): התחזית ברצועת הימים — ראו globe_add.js, "התחזית" ----
# "חי" = הערך 1000 בדיוק; מעליו הרצועה ממשיכה אל התחזית (range.max גדל כשהקובץ נטען)
G.rep("range.addEventListener('input',function(){ stop(); scrubFollow(draw(tOf(+range.value),+range.value>=999.5)); });",
      "range.addEventListener('input',function(){ stop(); scrubFollow(draw(tOf(+range.value),Math.abs(+range.value-1000)<0.5)); });")
G.rep("from=(+range.value>=995)?0:+range.value;", "from=(+range.value>=995)?0:+range.value;   /* מהעתיד — מהזינוק */")
# הסירות בעתיד: מהתחזית; המניפה והדרך הצפויה של אקסודוס
G.rep("  for(i=0;i<fl.length;i++) if(fl[i].id===4) me=fl[i];\n  if(live){ pos=here; }",
      "  var fut=fcDraw(t,fl);\n  for(i=0;i<fl.length;i++) if(fl[i].id===4) me=fl[i];\n  if(live){ pos=here; } else if(fut&&me&&me.est){ pos=[me.lon,me.lat]; }")
G.rep("  boat.setLngLat(pos).setRotation(live?FIX.cog:headingAt(pts)); meMarker.setLngLat(pos);",
      "  boat.setLngLat(pos).setRotation(live?FIX.cog:(fut&&me&&me.est?headingAt([here,pos]):headingAt(pts))); meMarker.setLngLat(pos);")
G.rep("  out.innerHTML=live?(nowLbl+' · יום <span class=\"num\">'+FIX.dayN+'</span> · מקום <span class=\"num\">'+FIX.rank+'</span>')",
      "  if(fut){ var fh=Math.round((t-T1)/3600); out.innerHTML='הערכה · <span class=\"num\">'+d.getUTCDate()+'.'+(d.getUTCMonth()+1)+'</span> · בעוד <span class=\"num\">'+fh+'</span> שע׳'; }\n"
      "  else out.innerHTML=live?(nowLbl+' · יום <span class=\"num\">'+FIX.dayN+'</span> · מקום <span class=\"num\">'+FIX.rank+'</span>')")
G.rep("  return {type:'Feature',properties:{name:o.name,rank:o.rank,dtf:Math.round(o.dtf),dmg:o.dmg},geometry:{type:'Point',coordinates:[o.lon,o.lat]}}; })}; }",
      "  return {type:'Feature',properties:{name:o.name,rank:o.rank,dtf:Math.round(o.dtf),dmg:o.dmg,est:o.est?1:0},geometry:{type:'Point',coordinates:[o.lon,o.lat]}}; })}; }")
G.rep("'circle-color':['case',['==',['get','rank'],1],'#8fd0ff','rgba(240,246,249,.9)'],",
      "'circle-color':['case',['==',['get','est'],1],'#f1cf8a',['==',['get','rank'],1],'#8fd0ff','rgba(240,246,249,.9)'],")
G.rep("try{ addGrid(); addNames(); addTrails(); addSpace(); smoothZoom(); backFade(); addScale(); }catch(e){}",
      "try{ addGrid(); addNames(); addTrails(); addSpace(); smoothZoom(); backFade(); addScale(); addForecast(); }catch(e){}")
assert '#ff8a3c' not in G.s
wr(os.path.join(OUT, 'assets', 'v2', 'globe.js'), G.s)

S = Patch(rd(os.path.join(SITE, 'assets', 'sextant.js')), 'sextant.js')
first = S.s.split('\n', 1)[0]
S.s = "/* v2/sextant.js — נבנה אוטומטית מ-assets/sextant.js, בצבעי הגרסה החדשה. לא עורכים ביד. */\n" + S.s
S.recolor(); S.s = S.s.replace("Assistant", "Heebo").replace("IBM Plex Mono", "Heebo")
wr(os.path.join(OUT, 'assets', 'v2', 'sextant.js'), S.s)

# ---------- 4. plain copies ----------
subprocess.check_call(['node', os.path.join(HERE, 'bake_coast.js'), '0.10', '0.15'], cwd=HERE)
os.makedirs(os.path.join(OUT, 'assets', 'icons'), exist_ok=True)
for f in ('icon-32.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'):
    if os.path.exists(os.path.join(HERE, 'icons', f)): shutil.copyfile(os.path.join(HERE, 'icons', f), os.path.join(OUT, 'assets', 'icons', f))
for f in ('hud.js', 'journey.css', 'names.js', 'stars.js'):
    wr(os.path.join(OUT, 'assets', 'v2', f), rd(os.path.join(HERE, f)))
wr(os.path.join(OUT, 'assets', 'v2', 'coast.js'), rd(os.path.join(HERE, 'coast.js')))
FONTS = [('@fontsource-variable/heebo/files', 'heebo-hebrew-wght-normal.woff2'), ('@fontsource-variable/heebo/files', 'heebo-latin-wght-normal.woff2'),
         ('@fontsource/b612-mono/files', 'b612-mono-latin-400-normal.woff2'), ('@fontsource/b612-mono/files', 'b612-mono-latin-700-normal.woff2'),
         ('@fontsource/david-libre/files', 'david-libre-hebrew-400-normal.woff2'), ('@fontsource/david-libre/files', 'david-libre-hebrew-700-normal.woff2'),
         ('@fontsource/david-libre/files', 'david-libre-latin-400-normal.woff2'), ('@fontsource/david-libre/files', 'david-libre-latin-700-normal.woff2')]
os.makedirs(os.path.join(OUT, 'assets', 'fonts'), exist_ok=True)
for d, f in FONTS:   # the fonts already live in the repo; they are copied only when the packages are installed here
    if os.path.exists(os.path.join(NPM, d, f)): shutil.copyfile(os.path.join(NPM, d, f), os.path.join(OUT, 'assets', 'fonts', f))
lic = rd(os.path.join(SITE, 'assets', 'fonts', 'LICENSE.txt')).rstrip('\n')
if 'heebo' not in lic:
    tail = "Files are the unmodified Hebrew and Latin subsets published by the Fontsource project."
    add = ("== heebo ==\nCopyright 2014 The Heebo Project Authors (https://github.com/OdedEzer/heebo)\n\n"
           "== b612-mono ==\nCopyright 2012 The B612 Project Authors (https://github.com/polarsys/b612)\n\n"
           "== david-libre ==\nCopyright 2016 The David Libre Project Authors (https://github.com/meirsadan/david-libre), with reserved font name \"Hadash\", \"Gentium\" and 'SIL'.\n\n")
    assert lic.count(tail) == 1
    lic = lic.replace(tail, add + tail) + '\n'
wr(os.path.join(OUT, 'assets', 'fonts', 'LICENSE.txt'), lic)

# ---------- 5. manifests ----------
def manifest(start):
    return json.dumps({
        "name": "יומן אקסודוס", "short_name": "אקסודוס", "lang": "he", "dir": "rtl",
        "description": "איפה אקסודוס עכשיו: דניאל פינסקי בגולדן גלוב",
        "start_url": start, "scope": start, "id": start,
        "display": "fullscreen", "display_override": ["fullscreen", "standalone"], "orientation": "any",
        "background_color": "#06121b", "theme_color": "#06121b",
        "icons": [{"src": "/assets/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
                  {"src": "/assets/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
                  {"src": "/assets/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}]
    }, ensure_ascii=False, indent=1) + '\n'
wr(os.path.join(OUT, 'manifest.webmanifest'), manifest('/'))
wr(os.path.join(OUT, 'next', 'manifest.webmanifest'), manifest('/next/'))

# ---------- 6. the page: once for /next/ (not indexed), once for the root ----------
page = rd(os.path.join(HERE, 'page.html'))
assert page.count('@@ROBOTS@@') == 1 and page.count('@@MANIFEST@@') == 1
wr(os.path.join(OUT, 'next', 'index.html'), page.replace('@@ROBOTS@@', '<meta name="robots" content="noindex">\n').replace('@@MANIFEST@@', 'next/manifest.webmanifest'))
wr(os.path.join(OUT, 'index.html'), page.replace('@@ROBOTS@@', '').replace('@@MANIFEST@@', 'manifest.webmanifest'))

# ---------- 6.5 בדיקת תחביר על כל קובץ בנוי ----------
# הבנייה היא החלפות מחרוזת. הערה שנוחתת בטעות בתוך מחרוזת מייצרת קובץ שנראה תקין ונשבר רק
# בדפדפן — קרה ב-21.9 עם הילת השמות. node --check תופס את זה בשנייה, לפני כל צילום מסך.
import subprocess as _sp
_bad = []
for _f in sorted(os.listdir(os.path.join(OUT, 'assets', 'v2'))):
    if not _f.endswith('.js'):
        continue
    _p = os.path.join(OUT, 'assets', 'v2', _f)
    _r = _sp.run(['node', '--check', _p], capture_output=True, text=True)
    if _r.returncode != 0:
        _bad.append((_f, (_r.stderr or '').strip().splitlines()[-1] if _r.stderr else '?'))
if _bad:
    for _f, _m in _bad:
        print('שגיאת תחביר: %s — %s' % (_f, _m))
    raise SystemExit('הבנייה נעצרה: קובץ בנוי אינו JavaScript תקין')
print('בדיקת תחביר: כל הקבצים תקינים')

# ---------- 7. תצוגה מקדימה שלא נוגעת בעמוד החי: out-preview/ = next/index.html + assets/v2n/ ----------
PRE = os.path.join(HERE, 'out-preview')
if os.path.isdir(PRE): shutil.rmtree(PRE)
for f in sorted(os.listdir(os.path.join(OUT, 'assets', 'v2'))):
    src = os.path.join(OUT, 'assets', 'v2', f)
    txt = rd(src).replace('assets/v2/', 'assets/v2n/')
    wr(os.path.join(PRE, 'assets', 'v2n', f), txt)
wr(os.path.join(PRE, 'next', 'index.html'), rd(os.path.join(OUT, 'next', 'index.html')).replace('assets/v2/', 'assets/v2n/'))
shutil.copyfile(os.path.join(OUT, 'next', 'manifest.webmanifest'), os.path.join(PRE, 'next', 'manifest.webmanifest'))

for root, _, files in os.walk(OUT):
    for f in sorted(files):
        p = os.path.join(root, f); print('%8d  %s' % (os.path.getsize(p), os.path.relpath(p, OUT)))
