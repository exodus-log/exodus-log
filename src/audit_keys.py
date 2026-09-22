# -*- coding: utf-8 -*-
"""audit_keys.py — האם אפשר להשתמש באתר בלי עכבר: לפתוח את הגלובוס ואת המסע, לנווט, ולחזור."""
import asyncio, functools, http.server, threading, base64
from playwright.async_api import async_playwright
PIX=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
threading.Thread(target=http.server.ThreadingHTTPServer(('127.0.0.1',8210), functools.partial(H,directory='www')).serve_forever,daemon=True).start()
FOC="""(function(){ var e=document.activeElement; if(!e||e===document.body) return 'body';
  var r=e.getBoundingClientRect(), cs=getComputedStyle(e);
  /* סימון פוקוס הוא לא בהכרח טבעת: לכפתורי הטבעת (.ly) יש clip-path בצורת גזרה, ו-outline היה
     נחתך על ידו — ולכן הם מסומנים ברקע בהיר. מדידה לפי outline בלבד דיווחה עליהם כחסרי סימון.
     כאן משווים את הסגנון המחושב במצב פוקוס מול אותו אלמנט בלי המחלקה, וכל שינוי נראה נחשב. */
  var ring=(cs.outlineStyle!=='none'&&parseFloat(cs.outlineWidth)>0)||cs.boxShadow!=='none';
  if(!ring){ var before=e.__exoBG; if(before===undefined){ ring=null; } else ring=(before!==cs.backgroundColor); }
  if(ring===null){ ring=(cs.backgroundColor!=='rgba(0, 0, 0, 0)'&&cs.backgroundColor!=='transparent'); }
  var vis=r.width>0&&r.height>0&&cs.visibility!=='hidden'&&!e.closest('[aria-hidden="true"]');
  /* outline ו-box-shadow נמדדים בוודאות. סימון שהוא שינוי רקע עם transition לא תמיד נקרא נכון
     ברגע המדידה, ולכן הכלי אומר "לא נמדד" ולא "אין" — דיווח על פגם שאינו קיים גרוע מכלום. */
  return (e.id||e.getAttribute('aria-label')||e.className||e.tagName).toString().slice(0,36)+(vis?'':' [נסתר!]')+(ring?'':' [טבעת פוקוס לא נמדדה — לבדוק בעין]'); })()"""
ST="""(function(){ return {globe:document.body.classList.contains('g-open'), journey:document.body.classList.contains('j-open')}; })()"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg=await (await b.new_context(viewport={'width':1440,'height':900})).new_page()
        await pg.route('**://gibs.earthdata.nasa.gov/**', lambda r: asyncio.ensure_future(r.fulfill(status=200,content_type='image/png',body=PIX)))
        await pg.goto('http://127.0.0.1:8210/'); await pg.wait_for_timeout(9000)   # מחכים שהגלובוס ייבנה ברקע
        print('=== סדר Tab בסיפון ===')
        seen=[]
        # שומרים את צבע הרקע של כל מועמד לפני שהפוקוס מגיע אליו, כדי שאפשר יהיה להשוות
        await pg.evaluate("document.querySelectorAll('button,[role=button],a,input,summary').forEach(function(e){ e.__exoBG=getComputedStyle(e).backgroundColor; })")
        for i in range(14):
            # 320 מ"ש ולא 120: לכפתורי הטבעת יש transition של 200 מ"ש על הרקע, וקריאה מוקדמת
            # מחזירה ערך באמצע המעבר — כך הכלי דיווח בטעות שאין להם סימון פוקוס.
            await pg.keyboard.press('Tab'); await pg.wait_for_timeout(320)
            f=await pg.evaluate(FOC); seen.append(f); print('  %2d  %s'%(i+1,f))
            if i>2 and f==seen[0]: break
        print('\n=== פתיחת הגלובוס מהמקלדת ===')
        await pg.evaluate("document.body.focus()")
        n=0
        for i in range(40):
            await pg.keyboard.press('-'); n+=1; await pg.wait_for_timeout(90)
            if (await pg.evaluate(ST))['globe']: break
        await pg.wait_for_timeout(1800)
        print('  "-" פעמים:', n, '→', await pg.evaluate(ST))
        for i in range(40):
            await pg.keyboard.press('+'); await pg.wait_for_timeout(90)
            if not (await pg.evaluate(ST))['globe']: break
        await pg.wait_for_timeout(1500)
        print('  "+" חזרה  →', await pg.evaluate(ST))
        await pg.evaluate("document.body.focus()")
        # ננסה את כל הדרכים הסבירות: מקש, קיצור, או כפתור בתפריט
        menu=await pg.evaluate("(function(){ var m=document.getElementById('menu'); if(!m) return []; return [...m.querySelectorAll('button,a')].map(function(e){return (e.textContent||'').trim().slice(0,30);}); })()")
        print('  פריטי התפריט:', menu)
        print('\n=== Escape ===')
        await pg.evaluate("document.querySelector('.mini').focus()"); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(2200)
        print('  Enter על המפה הקטנה →', await pg.evaluate(ST), ' פוקוס:', await pg.evaluate(FOC))
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(900)
        print('  Escape →', await pg.evaluate(ST), ' פוקוס:', await pg.evaluate(FOC))
        await b.close()
asyncio.run(main())
