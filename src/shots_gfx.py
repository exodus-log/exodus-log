# -*- coding: utf-8 -*-
"""shots_gfx.py — צילומי לפני/אחרי של ההדמיה עצמה (ים, שמיים, סירה) בארבעה מצבי אור.

    python3 shots_gfx.py --path / --out gfx-before      # הראשי כמו שהוא
    python3 shots_gfx.py --path /next/ --out gfx-after  # /next/

המצבים (בשעון של הדף, ?at=): יום, שקיעה, לילה עם ירח (כמעט מלא), לילה בלי ירח (ירח חדש, 12.9).
לכל מצב שני מבטים: אל השמש/הירח, ומבט מהצד. המצלמה נעצרת (בלי סיבוב אוטומטי) כדי שההשוואה תהיה הוגנת.
גם: שגיאות קונסול, ו-?q=<דרגה> אם ביקשו דרגה מסוימת."""
import argparse, asyncio, functools, http.server, os, threading, json
from playwright.async_api import async_playwright
AP = argparse.ArgumentParser()
AP.add_argument('--root', default='www'); AP.add_argument('--port', type=int, default=8172)
AP.add_argument('--path', default='/next/'); AP.add_argument('--out', default='gfx')
AP.add_argument('--q', default=''); AP.add_argument('--only', default='')
AP.add_argument('--w', type=int, default=412); AP.add_argument('--h', type=int, default=915)
AP.add_argument('--extra', default='')
AP.add_argument('--scen', default='', help='name@at@face,... במקום התרחישים הקבועים')
A = AP.parse_args(); os.makedirs(A.out, exist_ok=True)
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
threading.Thread(target=http.server.ThreadingHTTPServer(('127.0.0.1', A.port), functools.partial(H, directory=A.root)).serve_forever, daemon=True).start()

SCEN = [('day', '2026-09-24T16:30Z', 'sun'), ('sunset', '2026-09-24T19:22Z', 'sun'), ('dusk', '2026-09-24T19:48Z', 'anti'),
        ('moon', '2026-09-24T23:00Z', 'moon'), ('dark', '2026-09-12T01:00Z', 'up')]
SETUP = """(async function(face){
  var t0=Date.now(); while(!(window.EXO&&EXO.ready&&EXO.state) && Date.now()-t0<20000) await new Promise(r=>setTimeout(r,100));
  document.body.classList.add('shot');
  EXO.setAuto(false);
  var s=EXO.state, b= face==='sun'?s.sun.az : face==='moon'?s.moon.az : face==='anti'?(s.sun.az+180)%360 : 200;
  var alt= face==='sun'?s.sun.alt : face==='moon'?s.moon.alt : face==='up'?40:6;
  EXO.lookToward(b,{el:0.10,tilt:Math.max(-8,Math.min(64,alt*0.9-2)),dur:1});
  await new Promise(r=>setTimeout(r,2600));
  return {sun:s.sun, moon:s.moon, q:EXO.quality, tier:EXO.tier};
})"""
SIDE = """(async function(){ var s=EXO.state; EXO.lookToward((s.sun.az+100)%360,{el:0.26,tilt:0,dur:1});
  await new Promise(r=>setTimeout(r,1800)); return true; })()"""
HIDE = """(function(){ var st=document.createElement('style'); st.textContent='body.shot > *:not(#stage):not(#sea){visibility:hidden!important} #stage > *:not(#sea){visibility:hidden!important}'; document.head.appendChild(st); })()"""

async def main():
    global SCEN
    if A.scen: SCEN=[tuple(x.split('@')) for x in A.scen.split(',')]
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        ctx = await b.new_context(viewport={'width': A.w, 'height': A.h}, device_scale_factor=1.5, is_mobile=A.w < 700, has_touch=A.w < 700, locale='he-IL')
        for name, at, face in SCEN:
            if A.only and name not in A.only.split(','): continue
            pg = await ctx.new_page()
            pg.on('console', lambda m, n=name: errs.append((n, m.text)) if m.type == 'error' else None)
            pg.on('pageerror', lambda e, n=name: errs.append((n, str(e))))
            q = ('&q=' + A.q) if A.q else ''
            await pg.goto('http://127.0.0.1:%d%s?at=%s%s%s' % (A.port, A.path, at, q, A.extra), wait_until='load')
            await pg.wait_for_timeout(2500)
            await pg.evaluate(HIDE)
            info = await pg.evaluate(SETUP + "('%s')" % face)
            await pg.screenshot(path=os.path.join(A.out, '%s-a.png' % name), timeout=120000)
            await pg.evaluate(SIDE)
            await pg.screenshot(path=os.path.join(A.out, '%s-b.png' % name), timeout=120000)
            print(name, at, json.dumps(info))
            await pg.close()
        await b.close()
    print('שגיאות קונסול:', len(errs))
    for e in errs[:20]: print('  ', e)
asyncio.run(main())
