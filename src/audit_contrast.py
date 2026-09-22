# -*- coding: utf-8 -*-
"""audit_contrast.py — מודד ניגודיות אמיתית של כל טקסט ממשק מול מה שבאמת מצויר מאחוריו.
   השיטה: מצלמים פעם אחת עם הטקסט מוסתר (זה הרקע האמיתי — ים, שמיים, מפה), מודדים את
   הבהירות הממוצעת בתיבה של כל תווית, ומשווים לצבע הטקסט המחושב.
   הערה כנה: WCAG לא יודע לספור צל טקסט, ולאתר הזה יש צל כבד בכל תווית. המספר כאן הוא
   הרצפה — הקריאוּת בפועל טובה ממנו — אבל הוא מוצא נכון את המקומות הגרועים."""
import argparse, asyncio, functools, http.server, json, os, threading, base64, io
from playwright.async_api import async_playwright
from PIL import Image
PIX=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
# 22.9: האריח המדומה היה ירוק חצי שקוף, והניגודיות על הגלובוס נמדדה מול ירוק שלא קיים. עכשיו גוון ים כהה.
def _ocean():
    import io as _io
    from PIL import Image
    b=_io.BytesIO(); Image.new('RGB',(256,256),(16,44,70)).save(b,'PNG'); return b.getvalue()
try: PIX=_ocean()
except Exception: pass
AP=argparse.ArgumentParser(); AP.add_argument('--root',default='www'); AP.add_argument('--port',type=int,default=8150)
AP.add_argument('--out',default='audit-contrast'); AP.add_argument('--reduced',action='store_true')
A=AP.parse_args(); os.makedirs(A.out,exist_ok=True)
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
threading.Thread(target=http.server.ThreadingHTTPServer(('127.0.0.1',A.port), functools.partial(H,directory=A.root)).serve_forever,daemon=True).start()

COLLECT="""(function(){
  var out=[], seen=new Set();
  function push(e,tag){
    var cs=getComputedStyle(e);
    if(cs.display==='none'||cs.visibility==='hidden'||parseFloat(cs.opacity)<0.25) return;
    var txt=(e.textContent||'').trim(); if(!txt) return;
    var r=e.getBoundingClientRect(); if(r.width<4||r.height<4) return;
    if(r.right<0||r.bottom<0||r.left>innerWidth||r.top>innerHeight) return;
    var key=tag+'|'+txt.slice(0,20)+'|'+Math.round(r.left)+','+Math.round(r.top);
    if(seen.has(key)) return; seen.add(key);
    out.push({tag:tag, txt:txt.slice(0,26), color:cs.color, size:parseFloat(cs.fontSize),
              weight:cs.fontWeight, box:[Math.round(r.left),Math.round(r.top),Math.round(r.right),Math.round(r.bottom)]});
  }
  /* העלים בלבד: אלמנט שיש לו טקסט ואין לו ילד עם טקסט */
  document.querySelectorAll('.hud span,.hud b,.hud i,.hud em,.clocks b,.clocks span,.lb,.mini span,#toast,.g-leg span,.g-scrub output,.sc-ticks span,#gBack,.gl-name,.gl-label,.gl-deg,.ly .n,.lnm,.j-bar b').forEach(function(e){
    var hasTextChild=false;
    for(var i=0;i<e.children.length;i++) if((e.children[i].textContent||'').trim()) hasTextChild=true;
    if(hasTextChild) return;
    push(e, e.className? (''+e.className).split(' ')[0] : e.tagName.toLowerCase());
  });
  return out;
})()"""
HIDE="""(function(){ var st=document.createElement('style'); st.id='__hideText';
  st.textContent='.hud,.lb,#toast,.mini span,.g-leg,.g-scrub output,.sc-ticks,#gBack,.gl-name,.gl-label,.gl-deg{visibility:hidden!important}';
  document.head.appendChild(st); return true; })()"""
OPEN_GLOBE="""(async function(){ location.hash='globe'; var t0=Date.now();
 while(!window.__exoGlobeLoaded && Date.now()-t0<25000) await new Promise(r=>setTimeout(r,200));
 if(!document.body.classList.contains('g-open')&&window.EXO&&EXO.onZoomOut) EXO.onZoomOut();
 await new Promise(r=>setTimeout(r,2500)); return true; })()"""

def srgb(c):
    c=c/255.0
    return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
def lum(rgb): return 0.2126*srgb(rgb[0])+0.7152*srgb(rgb[1])+0.0722*srgb(rgb[2])
def ratio(a,b):
    la,lb=lum(a),lum(b)
    if la<lb: la,lb=lb,la
    return (la+0.05)/(lb+0.05)
def parse_col(s):
    s=s.strip()
    if s.startswith('rgb'):
        n=[float(x) for x in s[s.find('(')+1:s.find(')')].replace('/',',').split(',')[:3]]
        return tuple(int(x) for x in n)
    return (255,255,255)

async def scene(b,name,w,h,mob,clock_off,globe):
    ctx=await b.new_context(viewport={'width':w,'height':h},is_mobile=mob,has_touch=mob,locale='he-IL',
                            reduced_motion=('reduce' if A.reduced else 'no-preference'))
    await ctx.route('**://gibs.earthdata.nasa.gov/**', lambda r: asyncio.ensure_future(r.fulfill(status=200,content_type='image/png',body=PIX)))
    pg=await ctx.new_page(); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)[:140]))
    pg.on('console', lambda m: errs.append('console: '+m.text[:120]) if m.type=='error' else None)
    await pg.goto('http://127.0.0.1:%d/'%A.port); await pg.wait_for_timeout(5200)
    # 22.9: ב-/next/ פס הנתונים מתקפל לבד אחרי 5.2 שנ׳ — בדיוק ברגע האיסוף. לפעמים נאסף פתוח וצולם מקופל,
    # והטקסט נמדד מול רקע בלי ההצללה שלו (54 "כשלים" שלא היו). נועלים אותו פתוח: זה המצב שבו קוראים אותו.
    try: await pg.evaluate("if(window.__exoHudOpen) __exoHudOpen(true,true)")
    except Exception: pass
    await pg.wait_for_timeout(600)
    if clock_off: 
        try: await pg.evaluate("EXO.setClock(%d); if(EXO.vigTick) EXO.vigTick();"%clock_off)
        except Exception as e: errs.append('setClock: %s'%e)
        await pg.wait_for_timeout(2200)
    if globe:
        await pg.evaluate(OPEN_GLOBE); await pg.wait_for_timeout(2000)
    items=await pg.evaluate(COLLECT)
    await pg.screenshot(path=os.path.join(A.out,name+'-text.png'))
    await pg.evaluate(HIDE); await pg.wait_for_timeout(350)
    shot=os.path.join(A.out,name+'-bg.png'); await pg.screenshot(path=shot)
    await ctx.close()
    im=Image.open(shot).convert('RGB'); rows=[]
    for it in items:
        x0,y0,x1,y1=it['box']
        x0=max(0,x0); y0=max(0,y0); x1=min(im.width,x1); y1=min(im.height,y1)
        if x1-x0<2 or y1-y0<2: continue
        crop=im.crop((x0,y0,x1,y1)); px=list(crop.getdata())
        n=len(px); mr=sum(p[0] for p in px)/n; mg=sum(p[1] for p in px)/n; mb=sum(p[2] for p in px)/n
        # גם הפיקסל הבהיר ביותר: קצף וגלים בהירים הם המקרה הגרוע
        lums=sorted(lum(p) for p in px)
        p90=lums[int(n*0.90)]
        fg=parse_col(it['color'])
        r_mean=ratio(fg,(mr,mg,mb))
        # ניגודיות מול הרקע הבהיר ביותר, כשהטקסט בהיר: מחשבים ישירות מהלומיננס
        lf=lum(fg); r_worst=(max(lf,p90)+0.05)/(min(lf,p90)+0.05)
        big = it['size']>=24 or (it['size']>=18.66 and int(it['weight'] or 400)>=700)
        need = 3.0 if big else 4.5
        rows.append(dict(scene=name,tag=it['tag'],txt=it['txt'],size=it['size'],color=it['color'],
                         mean=round(r_mean,2),worst=round(r_worst,2),need=need,box=it['box']))
    return rows,errs

async def main():
    allrows=[]; allerrs={}
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        for name,w,h,mob,off,globe in [
            ('deck-night',1440,900,False,0,False),
            ('deck-day',  1440,900,False,-7*3600*1000,False),
            ('phone-day', 390,844,True,-7*3600*1000,False),
            ('globe',     1440,900,False,0,True)]:
            rows,errs=await scene(b,name,w,h,mob,off,globe)
            allrows+=rows; allerrs[name]=errs
            bad=[r for r in rows if r['worst']<r['need']]
            print('%-11s  תוויות:%-4d  מתחת לסף:%-3d  שגיאות:%d'%(name,len(rows),len(bad),len(errs)),flush=True)
        await b.close()
    json.dump({'rows':allrows,'errs':allerrs},open(os.path.join(A.out,'contrast.json'),'w'),ensure_ascii=False,indent=1)
    print()
    bad=sorted([r for r in allrows if r['worst']<r['need']],key=lambda r:r['worst'])
    print('=== מתחת לסף WCAG (בלי לספור צל טקסט) — 24 הגרועים ===')
    for r in bad[:24]:
        print('  %-11s %-12s %-26s %4.1fpx  %-18s  ממוצע %5.2f  גרוע %5.2f  (דרוש %.1f)'%(
            r['scene'],r['tag'],r['txt'],r['size'],r['color'],r['mean'],r['worst'],r['need']))
    print('\nסה"כ %d מתוך %d תוויות מתחת לסף'%(len(bad),len(allrows)))
asyncio.run(main())
