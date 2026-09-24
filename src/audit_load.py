# -*- coding: utf-8 -*-
"""audit_load.py — זמן עד שהסצנה נראית ומשקל ההורדה, בסימולציה של טלפון בינוני.

    python3 audit_load.py --path /          # הדף הראשי
    python3 audit_load.py --path /next/     # התצוגה המקדימה

הסימולציה (כמו ב-DevTools של כרום): מעבד מואט פי 4, ורשת "Fast 4G" — 165 מ"ש הלוך־חזור,
8.1 מגה-ביט להורדה, 1.35 להעלאה. השרת המקומי דוחס טקסט ב-gzip, כמו ש-Cloudflare דוחס (שם זה brotli, קצת יותר טוב),
ולכן המשקל כאן הוא הערכה שמרנית של מה שעובר ברשת.

מה נמדד בכל ריצה (חמש ריצות, חציון):
  scene  — הרגע שבו הקנבס מקבל את המחלקה on, כלומר הפריים הראשון של ההדמיה צויר (לפני הדהייה של 1.1 שנ׳)
  fcp    — הציור הראשון של משהו בדף
  bytesFirst — מה שירד עד scene;  bytesAll — מה שירד עד 12 שניות אחרי הפתיחה (כולל מה שנטען אחרי הפריים הראשון)
הערה כנה: ה-WebGL כאן הוא swiftshader (עיבוד בתוכנה על המעבד), כך שהמספרים מתאימים להשוואה לפני/אחרי
ולא לזמן מוחלט בטלפון אמיתי."""
import argparse, asyncio, functools, gzip, http.server, io, json, os, statistics, threading
from playwright.async_api import async_playwright

AP = argparse.ArgumentParser()
AP.add_argument('--root', default='www'); AP.add_argument('--port', type=int, default=8171)
AP.add_argument('--path', default='/'); AP.add_argument('--runs', type=int, default=5)
AP.add_argument('--at', default=''); AP.add_argument('--json', default='')
A = AP.parse_args()

TXT = ('.js', '.css', '.html', '.json', '.svg', '.webmanifest', '.txt')
_cache = {}
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def send_head(self):
        path = self.translate_path(self.path)
        if os.path.isdir(path): path = os.path.join(path, 'index.html')
        if path.endswith(TXT) and 'gzip' in (self.headers.get('Accept-Encoding') or '') and os.path.exists(path):
            k = (path, os.path.getmtime(path))
            if k not in _cache: _cache[k] = gzip.compress(open(path, 'rb').read(), 6)
            body = _cache[k]
            self.send_response(200)
            self.send_header('Content-Type', self.guess_type(path)); self.send_header('Content-Encoding', 'gzip')
            self.send_header('Content-Length', str(len(body))); self.send_header('Cache-Control', 'no-store'); self.end_headers()
            return io.BytesIO(body)
        return super().send_head()
    def end_headers(self):
        if not any(h.startswith(b'Cache-Control') for h in getattr(self, '_headers_buffer', [])):
            self.send_header('Cache-Control', 'no-store')
        super().end_headers()
threading.Thread(target=http.server.ThreadingHTTPServer(('127.0.0.1', A.port), functools.partial(H, directory=A.root)).serve_forever, daemon=True).start()

INIT = """(function(){
  window.__bytes=0;
  new MutationObserver(function(){ var c=document.getElementById('sea');
    if(c&&c.classList.contains('on')&&!window.__tScene){ window.__tScene=performance.now();
      window.__bScene=performance.getEntriesByType('resource').reduce(function(a,r){return a+(r.transferSize||0);},0)
        +((performance.getEntriesByType('navigation')[0]||{}).transferSize||0); } })
   .observe(document,{subtree:true,attributes:true,attributeFilter:['class']});
})()"""
MARKS = """(function(){
  var p=performance.getEntriesByType('paint'), n=performance.getEntriesByType('navigation')[0]||{};
  var fcp=(p.filter(function(e){return e.name==='first-contentful-paint';})[0]||{}).startTime;
  var res=performance.getEntriesByType('resource');
  var all=res.reduce(function(a,r){return a+(r.transferSize||0);},0)+(n.transferSize||0);
  return {scene:Math.round(window.__tScene||-1), fcp:Math.round(fcp||-1), bytesFirst:window.__bScene||0, bytesAll:all,
    n:res.length, list:res.map(function(r){return [r.name.split('/').slice(3).join('/'),r.transferSize,Math.round(r.responseEnd)];})};
})()"""

async def run_once(b):
    ctx = await b.new_context(viewport={'width': 412, 'height': 915}, device_scale_factor=2.625, is_mobile=True, has_touch=True, locale='he-IL')
    pg = await ctx.new_page()
    cdp = await ctx.new_cdp_session(pg)
    await cdp.send('Network.enable')
    await cdp.send('Network.setCacheDisabled', {'cacheDisabled': True})
    await cdp.send('Network.emulateNetworkConditions', {'offline': False, 'latency': 165,
        'downloadThroughput': 9e6 / 8 * 0.9, 'uploadThroughput': 1.5e6 / 8 * 0.9})
    await cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
    await pg.add_init_script(INIT)
    url = 'http://127.0.0.1:%d%s%s' % (A.port, A.path, ('?at=' + A.at) if A.at else '')
    await pg.goto(url, wait_until='commit')
    await pg.wait_for_timeout(12000)
    m = await pg.evaluate(MARKS)
    await ctx.close()
    return m

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        R = [await run_once(b) for _ in range(A.runs)]
        await b.close()
    med = lambda k: int(statistics.median([r[k] for r in R]))
    out = {'path': A.path, 'runs': A.runs, 'scene_ms': med('scene'), 'fcp_ms': med('fcp'),
           'kb_first': round(med('bytesFirst') / 1024), 'kb_all': round(med('bytesAll') / 1024),
           'scene_each': [r['scene'] for r in R], 'files': sorted(R[-1]['list'], key=lambda x: -x[1])[:14]}
    print(json.dumps(out, ensure_ascii=False, indent=1))
    if A.json: open(A.json, 'w').write(json.dumps(out, ensure_ascii=False))
asyncio.run(main())
