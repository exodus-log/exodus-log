# -*- coding: utf-8 -*-
"""audit_perf.py — משקל, בקשות וזמני אבני דרך. מודד מה שאפשר למדוד כאן באמת.
   הערה כנה: ה-WebGL כאן רץ על swiftshader (עיבוד בתוכנה), ולכן קצב הפריימים אינו מייצג
   מכשיר אמיתי. המשקל, מספר הבקשות וסדר הטעינה — כן."""
import argparse, asyncio, functools, http.server, json, os, threading, base64, collections
from playwright.async_api import async_playwright
PIX=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
AP=argparse.ArgumentParser(); AP.add_argument('--root',default='www'); AP.add_argument('--port',type=int,default=8160)
AP.add_argument('--out',default='audit-perf'); AP.add_argument('--globe',action='store_true')
A=AP.parse_args(); os.makedirs(A.out,exist_ok=True)
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
    def end_headers(self):
        self.send_header('Cache-Control','no-store'); http.server.SimpleHTTPRequestHandler.end_headers(self)
threading.Thread(target=http.server.ThreadingHTTPServer(('127.0.0.1',A.port), functools.partial(H,directory=A.root)).serve_forever,daemon=True).start()

MARKS="""(function(){
  var n=performance.getEntriesByType('navigation')[0]||{}, p=performance.getEntriesByType('paint');
  var fcp=(p.filter(function(e){return e.name==='first-contentful-paint';})[0]||{}).startTime;
  var res=performance.getEntriesByType('resource').map(function(r){
    return {u:r.name.split('/').slice(3).join('/'), t:r.initiatorType,
            bytes:r.encodedBodySize||r.transferSize||0, start:Math.round(r.startTime), end:Math.round(r.responseEnd)}; });
  return {dcl:Math.round(n.domContentLoadedEventEnd||0), load:Math.round(n.loadEventEnd||0),
          fcp:Math.round(fcp||0), res:res,
          exoReady:window.__tReady||null, firstFrame:window.__tFrame||null,
          heap:(performance.memory?Math.round(performance.memory.usedJSHeapSize/1048576):null)};
})()"""
PROBE_READY="""(function(){
  var t0=performance.now();
  var iv=setInterval(function(){ if(window.EXO&&EXO.ready){ window.__tReady=Math.round(performance.now()); clearInterval(iv); } },20);
  requestAnimationFrame(function(){ requestAnimationFrame(function(){ window.__tFrame=Math.round(performance.now()); }); });
})()"""
FPS="""(async function(ms){ var n=0,t0=performance.now();
  return await new Promise(function(res){ function f(){ n++; if(performance.now()-t0<ms) requestAnimationFrame(f); else res(Math.round(n/((performance.now()-t0)/1000)*10)/10); } requestAnimationFrame(f); }); })(3000)"""
OPEN_GLOBE="""(async function(){ location.hash='globe'; var t0=Date.now();
 while(!window.__exoGlobeLoaded && Date.now()-t0<25000) await new Promise(r=>setTimeout(r,200));
 if(!document.body.classList.contains('g-open')&&window.EXO&&EXO.onZoomOut) EXO.onZoomOut();
 await new Promise(r=>setTimeout(r,2500)); return Math.round(Date.now()-t0); })()"""

async def main():
    out={}
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        for name,w,h,mob in [('desktop',1440,900,False),('phone',390,844,True)]:
            ctx=await b.new_context(viewport={'width':w,'height':h},is_mobile=mob,has_touch=mob,locale='he-IL')
            await ctx.route('**://gibs.earthdata.nasa.gov/**', lambda r: asyncio.ensure_future(r.fulfill(status=200,content_type='image/png',body=PIX)))
            pg=await ctx.new_page()
            await pg.add_init_script(PROBE_READY)
            await pg.goto('http://127.0.0.1:%d/'%A.port, wait_until='load')
            await pg.wait_for_timeout(9000)
            m=await pg.evaluate(MARKS)
            m['fps_deck']=await pg.evaluate(FPS)
            if A.globe:
                m['globe_ms']=await pg.evaluate(OPEN_GLOBE)
                m['fps_globe']=await pg.evaluate(FPS)
                m['res_after_globe']=len(await pg.evaluate("performance.getEntriesByType('resource').length"))if False else await pg.evaluate("performance.getEntriesByType('resource').length")
                m['bytes_after_globe']=await pg.evaluate("performance.getEntriesByType('resource').reduce(function(a,r){return a+(r.encodedBodySize||0);},0)")
            out[name]=m
            await ctx.close()
        await b.close()
    json.dump(out,open(os.path.join(A.out,'perf.json'),'w'),ensure_ascii=False,indent=1)
    for name,m in out.items():
        res=m['res']; tot=sum(r['bytes'] for r in res)
        print('\n=== %s ==='%name)
        print('  FCP %d ms | DOMContentLoaded %d ms | load %d ms | EXO.ready %s ms'%(
              m['fcp'],m['dcl'],m['load'],m['exoReady']))
        # דלי לפי מתי הבקשה התחילה, לא לפי מתי מדדנו. הרשימה של performance צוברת הכול,
        # ולכן snapshot אחרי 9 שניות נראה כאילו הכול נטען מראש — וזה לא נכון.
        buckets=[('עד הצביעה הראשונה',0,m['fcp']),('בין הצביעה ל-load',m['fcp'],m['load']),
                 ('אחרי load (נדחה)',m['load'],10**9)]
        for lbl,a_,b_ in buckets:
            sel=[r for r in res if a_<=r['start']<b_]
            if not sel: continue
            by=collections.Counter()
            for r in sel: by[r['t'] or '?']+=r['bytes']
            print('  %-22s %3d בקשות  %7.0f KB   (%s)'%(lbl,len(sel),sum(r['bytes'] for r in sel)/1024,
                  ', '.join('%s %.0fKB'%(k,v/1024) for k,v in by.most_common(4))))
        print('  סה"כ עד המדידה: %d בקשות, %.0f KB'%(len(res),tot/1024))
        print('  קצב פריימים (swiftshader, לא מייצג מכשיר): סיפון %s'%m['fps_deck'], end='')
        if 'fps_globe' in m: print(' | גלובוס %s | פתיחת גלובוס %d ms | סה"כ אחרי גלובוס %d בקשות, %.0f KB'%(
            m['fps_globe'],m['globe_ms'],m['res_after_globe'],m['bytes_after_globe']/1024))
        else: print()
        big=sorted(res,key=lambda r:-r['bytes'])[:10]
        print('  הכבדים ביותר (עם רגע ההתחלה):')
        for r in big: print('     %7.0f KB  @%5d ms  %-6s %s'%(r['bytes']/1024,r['start'],r['t'],r['u'][:58]))
asyncio.run(main())
