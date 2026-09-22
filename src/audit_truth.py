# -*- coding: utf-8 -*-
"""audit_truth.py — מצבי קצה של אמינות: נתון מיושן, נתון חסר, ומה הדף אומר כשגוררים אל תחזית.
   השאלה אחת: האם הדף מבטיח יותר ממה שהוא יודע."""
import argparse, asyncio, functools, http.server, json, os, threading, base64, io, re, shutil, time
from playwright.async_api import async_playwright
PIX=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
AP=argparse.ArgumentParser(); AP.add_argument('--root',default='www-truth'); AP.add_argument('--port',type=int,default=8170)
AP.add_argument('--out',default='audit-truth'); A=AP.parse_args(); os.makedirs(A.out,exist_ok=True)
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
threading.Thread(target=http.server.ThreadingHTTPServer(('127.0.0.1',A.port), functools.partial(H,directory=A.root)).serve_forever,daemon=True).start()

SRC=io.open('www/assets/data.js',encoding='utf-8').read()
def write_data(txt): io.open(os.path.join(A.root,'assets','data.js'),'w',encoding='utf-8').write(txt)

READ="""(function(){
  function t(id){ var e=document.getElementById(id); return e?e.textContent.trim():null; }
  function cls(id){ var e=document.getElementById(id); return e?e.className:null; }
  var vis=[]; document.querySelectorAll('.fallback,.nojs,#toast').forEach(function(e){
    var cs=getComputedStyle(e); if(cs.display!=='none'&&parseFloat(cs.opacity)>0.05&&(e.textContent||'').trim()) vis.push((e.textContent||'').trim().slice(0,90)); });
  return {day:t('hDay'), date:t('hDate'), pos:t('hPos'), fix:t('hFix'), fixClass:cls('hFix'),
          wind:t('hWind'), wave:t('hWave'), cur:t('hCur'), pres:t('hPres'),
          rank:t('vRank'), sog:t('vSog'), gap:t('vGap'), dtf:t('vDtf'),
          tsRead:t('tsRead'), notices:vis,
          row3:(function(){var e=document.getElementById('hRow3'); return e?getComputedStyle(e).display:null;})()};
})()"""

async def run(b,name,data_txt,after=None,wait=6000):
    if data_txt is None:
        try: os.remove(os.path.join(A.root,'assets','data.js'))
        except OSError: pass
    else: write_data(data_txt)
    ctx=await b.new_context(viewport={'width':1440,'height':900},locale='he-IL')
    await ctx.route('**://gibs.earthdata.nasa.gov/**', lambda r: asyncio.ensure_future(r.fulfill(status=200,content_type='image/png',body=PIX)))
    pg=await ctx.new_page(); errs=[]
    pg.on('pageerror', lambda e: errs.append('pageerror: '+str(e)[:120]))
    pg.on('console', lambda m: errs.append('console: '+m.text[:110]) if m.type=='error' else None)
    try: await pg.goto('http://127.0.0.1:%d/'%A.port, timeout=20000)
    except Exception as e: errs.append('goto: %s'%e)
    await pg.wait_for_timeout(wait)
    if after:
        try: await pg.evaluate(after)
        except Exception as e: errs.append('after: %s'%str(e)[:110])
        await pg.wait_for_timeout(2500)
    try: d=await pg.evaluate(READ)
    except Exception as e: d={'errs':[], 'probe':'נכשל: %s'%str(e)[:120]}
    d['errs']=errs
    try: await pg.screenshot(path=os.path.join(A.out,name+'.png'),timeout=12000)
    except Exception as e: d['shot']='צילום נכשל: %s'%str(e)[:90]
    await ctx.close(); write_data(SRC)
    print('  ... %s'%name,flush=True)
    return d

def shift_fix(hours):
    return re.sub(r'at:(\d+)', lambda m: 'at:%d'%(int(m.group(1))-int(hours*3600)), SRC, count=1)

async def main():
    shutil.rmtree(A.root,ignore_errors=True); shutil.copytree('www',A.root)
    res={}
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        async def safe(n,*a,**k):
            try: return await run(b,n,*a,**k)
            except Exception as e: return {'errs':['המקרה קרס: %s'%str(e)[:140]]}
        res['בסיס']              = await safe('01-base',SRC)
        res['נקודת ציון בת 13 שעות'] = await safe('02-stale13',shift_fix(13))
        res['נקודת ציון בת 50 שעות'] = await safe('03-stale50',shift_fix(50))
        res['נקודת ציון בת 8 ימים']  = await safe('04-stale8d',shift_fix(8*24))
        res['בלי COND (אין מזג אוויר)'] = await safe('05-nocond',re.sub(r'var COND = \[.*?\];','var COND = [];',SRC,flags=re.S))
        res['בלי data.js בכלל']   = await safe('06-nodata',None)
        res['גרירה אל תחזית +30 שעות'] = await safe('07-forecast',SRC,
            after="(function(){ var r=document.getElementById('tsRange'); if(!r) return 'אין רצועה'; r.value=r.max; r.dispatchEvent(new Event('input',{bubbles:true})); return r.value; })()")
        await b.close()
    json.dump(res,open(os.path.join(A.out,'truth.json'),'w'),ensure_ascii=False,indent=1)
    for k,v in res.items():
        print('\n=== %s ==='%k)
        for f in ['fix','fixClass','pos','wind','wave','cur','rank','sog','dtf','row3','tsRead']:
            if v.get(f) is not None: print('   %-9s %s'%(f,v[f]))
        if v.get('notices'): print('   הודעות:  '+' | '.join(v['notices']))
        if v.get('errs'):    print('   שגיאות:  '+' | '.join(v['errs'][:3]))
asyncio.run(main())
