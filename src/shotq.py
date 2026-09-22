# -*- coding: utf-8 -*-
"""shotq.py — הבדיקה שרצה אחרי כל בנייה: צילומי מסך + קונסול, בלי לגעת באתר.

    python3 shotq.py                 # www/ על פורט 8123, הדף /next/
    python3 shotq.py --path / --out shots-root

מרים שרת מקומי על תיקיית www/ (האתר + מה שנבנה מעליו), פותח את הדף בכרומיום,
עובר על תרחיש אחרי תרחיש — הסיפון, הגלובוס, החלל, הצד האחורי, רצועת הימים, טלפון —
ומדפיס לכל אחד את מה שהקונסול אמר, בקשות שנכשלו, ומדדים מתוך הדף עצמו.
יוצא עם קוד 1 אם הייתה שגיאת קונסול או pageerror. הצילומים נשמרים ב---out.
"""
import argparse, asyncio, functools, http.server, json, os, sys, threading
from playwright.async_api import async_playwright
import base64
PIX = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
# 22.9: האריח המדומה היה ירוק חצי שקוף — כל צילום של הגלובוס יצא ירוק ולא אמר כלום על הצבעים. עכשיו אריח בגוון ים כהה.
def _ocean():
    import io
    from PIL import Image
    b = io.BytesIO(); Image.new('RGB', (256, 256), (16, 44, 70)).save(b, 'PNG'); return b.getvalue()
try: PIX = _ocean()
except Exception: pass

AP = argparse.ArgumentParser()
AP.add_argument('--root', default='www')
AP.add_argument('--port', type=int, default=8123)
AP.add_argument('--path', default='/next/')
AP.add_argument('--out', default='shots')
AP.add_argument('--only', default='')
A = AP.parse_args()
os.makedirs(A.out, exist_ok=True)

class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', A.port), functools.partial(H, directory=A.root))
threading.Thread(target=srv.serve_forever, daemon=True).start()

PROBE = """(function(){
  var m=window.__exoMap, g=document.getElementById('globe');
  function n(s){ return document.querySelectorAll(s).length; }
  function src(id){ try{ var d=m.getSource(id).serialize().data;
    return d.features?d.features.length:(d.geometry?d.geometry.coordinates.length:0); }catch(e){ return -1; } }
  function pts(id){ try{ var d=m.getSource(id).serialize().data, n=0;
    (d.features||[d]).forEach(function(f){ var c=f.geometry.coordinates; n+=(typeof c[0]==='number')?1:c.length; }); return n; }catch(e){ return -1; } }
  var rim=g&&g.querySelector('.gl-rim');
  return {
    z: m?+m.getZoom().toFixed(2):null,
    center: m?[+m.getCenter().lng.toFixed(1),+m.getCenter().lat.toFixed(1)]:null,
    names: n('.gl-name'), namesBack: n('.gl-name.gl-back'),
    labels: n('.gl-label'), labelsBack: n('.gl-label.gl-back'),
    degs: n('.gl-deg'), degsBack: n('.gl-deg.gl-back'),
    boatBack: n('.gl-boat.gl-back'),
    hidNames: n('.gl-name.gl-hid'), hidLabels: n('.gl-label.gl-hid'), hidDegs: n('.gl-deg.gl-hid'),
    meShown: !!document.querySelector('.gl-label.k-me:not(.gl-back):not(.gl-hid)'),
    rim: !!(rim && rim.style.display==='block'),
    fleet: src('fleet'), trails: src('ftrail'), trailPts: pts('ftrail'), night: src('night'), donePts: pts('done'),
    scrub: document.getElementById('scRange')?+document.getElementById('scRange').value:null,
    scOut: (document.getElementById('scOut')||{}).textContent,
    tsOpacity: (document.getElementById('tstrip')||{style:{}}).style.opacity,
    zthin: document.body.classList.contains('zthin'),
    zspace: document.body.classList.contains('zspace'),
    ml: (window.maplibregl&&maplibregl.getVersion)?maplibregl.getVersion():null
  };
})()"""

OPEN_GLOBE = """(async function(){
  location.hash='globe';
  var t0=Date.now();
  while(!window.__exoGlobeLoaded && Date.now()-t0<25000) await new Promise(r=>setTimeout(r,200));
  if(!document.body.classList.contains('g-open')&&window.EXO&&EXO.onZoomOut) EXO.onZoomOut();
  await new Promise(r=>setTimeout(r,1800));
  return !!window.__exoMap;
})()"""

def js_fly(lng, lat, z):
    return "(function(){ __exoMap.jumpTo({center:[%f,%f],zoom:%f}); return true; })()" % (lng, lat, z)

SCRUB = """(function(v){ var r=document.getElementById('scRange'); r.value=v;
  r.dispatchEvent(new Event('input',{bubbles:true})); return +r.value; })(%d)"""

SCENES = [
  dict(name='01-deck',    w=1440, h=900, wait=5000, steps=[]),
  dict(name='02-globe',   w=1440, h=900, wait=4000, steps=[('open', OPEN_GLOBE, 4200)]),
  dict(name='03-space',   w=1440, h=900, wait=4000, steps=[('open', OPEN_GLOBE, 4200), ('zoom out', js_fly(-24, -8, -1.2), 1800)]),
  dict(name='04-backside',w=1440, h=900, wait=4000, steps=[('open', OPEN_GLOBE, 4200), ('other side', js_fly(150, 10, 1.4), 1800)]),
  dict(name='05-days',    w=1440, h=900, wait=4000, steps=[('open', OPEN_GLOBE, 4200), ('day 5', SCRUB % 400, 1800)]),
  dict(name='06-days-play',w=1440,h=900, wait=4000, steps=[('open', OPEN_GLOBE, 4200), ('day 9', SCRUB % 700, 1500)]),
  dict(name='07-phone',   w=390,  h=844, m=True, wait=5000, steps=[]),
  dict(name='08-phone-globe', w=390, h=844, m=True, wait=4000, steps=[('open', OPEN_GLOBE, 4200), ('day 7', SCRUB % 550, 1500)]),
  # טלפון לרוחב: 390 פיקסל גובה. המצב הצפוף ביותר, ועד 21.9 לא נבדק כאן כלל 
  dict(name='09-phone-land', w=844, h=390, m=True, wait=5000, steps=[]),
  dict(name='10-phone-land-globe', w=844, h=390, m=True, wait=4000, steps=[('open', OPEN_GLOBE, 4200)]),
]

WATCH = ('z', 'hidNames', 'hidLabels', 'namesBack', 'labelsBack', 'degsBack', 'boatBack', 'rim', 'trailPts', 'donePts', 'scrub')

async def settle(pg, tries=24, gap=250, need=2):
    """ממתין עד שהמדדים שמשתנים עם התנועה מפסיקים לזוז, ומחזיר הודעה אם לא נרגעו."""
    prev, same = None, 0
    for _ in range(tries):
        try: d = await pg.evaluate(PROBE)
        except Exception as e: return 'probe failed: %s' % e
        cur = tuple(repr(d.get(k)) for k in WATCH)
        if cur == prev:
            same += 1
            if same >= need: return ''
        else:
            same, prev = 0, cur
        await pg.wait_for_timeout(gap)
    return 'המדדים לא נרגעו אחרי %dms' % (tries * gap)


async def main():
    bad_total = 0
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader',
                                          '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        for sc in SCENES:
            if A.only and A.only not in sc['name']: continue
            print('... %s' % sc['name'], flush=True)
            ctx = await b.new_context(viewport={'width': sc['w'], 'height': sc['h']},
                                      device_scale_factor=sc.get('dpr', 1), is_mobile=sc.get('m', False),
                                      has_touch=sc.get('m', False), locale='he-IL')
            # מסביבת הבנייה אין גישה ל-GIBS. מגישים אריח ריק במקום לחסום, כדי שהקונסול יישאר נקי ויעיד על הדף עצמו.
            await ctx.route('**://gibs.earthdata.nasa.gov/**',
                            lambda r: asyncio.ensure_future(r.fulfill(status=200, content_type='image/png', body=PIX)))
            pg = await ctx.new_page()
            logs, errs, fails = [], [], []
            pg.on('console', lambda m: (errs if m.type == 'error' else logs).append(m.type + ': ' + m.text))
            pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
            pg.on('requestfailed', lambda r: fails.append('FAILED ' + r.url))
            pg.on('response', lambda r: fails.append(str(r.status) + ' ' + r.url) if r.status >= 400 else None)
            await pg.goto('http://127.0.0.1:%d%s' % (A.port, A.path))
            await pg.wait_for_timeout(sc['wait'])
            for label, js, wait in sc['steps']:
                try: await pg.evaluate(js)
                except Exception as e: errs.append('step "%s": %s' % (label, e))
                await pg.wait_for_timeout(wait)
                # 22.9: פתיחת הגלובוס מפעילה החלקה אוטומטית אל מבט האזור (עד כ-2.6 שניות). צעד שמגיע באמצעה
                # נדרס בפריים הבא — כך "03-space" צילם את מבט האזור ולא את החלל. ממתינים שהתנועה תסתיים.
                for _ in range(40):
                    try:
                        if not await pg.evaluate('!!(window.__exoAutoRunning&&__exoAutoRunning())'): break
                    except Exception: break
                    await pg.wait_for_timeout(150)
                # הדעיכה לפי הצד האחורי רצה ב-requestAnimationFrame אחרי אירוע move, ולכן היא
                # מתעדכנת באיחור משתנה. המתנה קבועה החזירה מדדים ישנים — 'namesBack' זהה בכל
                # התרחישים ו-'rim' תמיד כבוי — כלומר הבדיקה לא הייתה מסוגלת לתפוס נסיגה שם.
                # עכשיו ממתינים עד שהמדדים נרגעים.
                st = await settle(pg)
                if st: errs.append('step "%s": %s' % (label, st))
            try: probe = await pg.evaluate(PROBE)
            except Exception as e: probe = {'probe': str(e)}
            shot = os.path.join(A.out, sc['name'] + '.png')
            await pg.screenshot(path=shot)
            print('\n== %s (%dx%d) ==' % (sc['name'], sc['w'], sc['h']))
            print('   ' + json.dumps(probe, ensure_ascii=False))
            # 22.9: שבוע ארכיון שהבוט עוד לא כתב (assets/cond/wNN.json) מחזיר 404, והדפדפן רושם את זה כשגיאה.
            # זה מצב אמיתי ולא מזיק — הדף ממשיך בלי כיסוי לשבוע הזה. נספר בנפרד, ורק אם זו הבקשה היחידה שנכשלה ב-404.
            k404 = [f for f in fails if f.startswith('404 ') and '/assets/cond/w' in f]
            o404 = [f for f in fails if f.startswith('404 ') and '/assets/cond/w' not in f]
            if k404 and not o404:
                n0 = len(errs); errs = [e for e in errs if 'status of 404' not in e]
                if n0 != len(errs): print('   ידוע: %d× שבוע ארכיון שעוד לא נכתב (%s)' % (n0 - len(errs), k404[0].split('/')[-1]))
            if errs: print('   שגיאות: ' + ' | '.join(errs[:6]))
            if fails: print('   בקשות: ' + ' | '.join(sorted(set(fails))[:6]))
            bad_total += len(errs)
            await ctx.close()
        await b.close()
    print('\nסך שגיאות קונסול: %d' % bad_total)
    sys.exit(1 if bad_total else 0)

asyncio.run(main())
