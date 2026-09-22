# -*- coding: utf-8 -*-
"""audit_docs.py — ביקורת על "המסע" ועל deep-dive.html מול הסגנון התיעודי שהוחלט:
   David Libre, משפטים שלמים, קו טורקיז אחד, פינות ישרות, בלי כתום. ועוד: אורך שורה, היררכיית
   כותרות, תמונות בלי alt, קישורים בלי טקסט, ניגודיות גוף הטקסט."""
import asyncio, functools, http.server, threading, base64, json, os, re
from playwright.async_api import async_playwright
PIX=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
threading.Thread(target=http.server.ThreadingHTTPServer(('127.0.0.1',8190), functools.partial(H,directory='www')).serve_forever,daemon=True).start()
os.makedirs('audit-docs',exist_ok=True)

PROBE="""(function(root){
  root=root?document.querySelector(root):document.body; if(!root) return {err:'no root'};
  function srgb(c){c/=255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4);}
  function lum(r){return 0.2126*srgb(r[0])+0.7152*srgb(r[1])+0.0722*srgb(r[2]);}
  function rgb(s){var m=s.match(/[\\d.]+/g);return m?m.slice(0,4).map(Number):[0,0,0,1];}
  function bgOf(e){ while(e){ var c=rgb(getComputedStyle(e).backgroundColor); if(c.length<4||c[3]>0.5) return c; e=e.parentElement; } return [6,18,27]; }
  var out={fonts:{},paras:[],heads:[],noalt:[],notext:[],orange:[],radius:[],lowc:[]};
  root.querySelectorAll('p,li,figcaption,blockquote').forEach(function(e){
    var cs=getComputedStyle(e); if(cs.display==='none'||!e.offsetParent) return;
    var t=(e.textContent||'').trim(); if(t.length<40) return;
    var fam=cs.fontFamily.split(',')[0].replace(/["']/g,'').trim(); out.fonts[fam]=(out.fonts[fam]||0)+1;
    var fs=parseFloat(cs.fontSize), w=e.getBoundingClientRect().width;
    var cpl=Math.round(w/(fs*0.48));        /* עברית: רוחב אות ממוצע כ-0.48em */
    var lh=cs.lineHeight==='normal'?1.2:parseFloat(cs.lineHeight)/fs;
    var fg=rgb(cs.color), bg=bgOf(e), L1=lum(fg), L2=lum(bg), cr=(Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);
    out.paras.push({fs:fs,cpl:cpl,lh:Math.round(lh*100)/100,cr:Math.round(cr*100)/100,txt:t.slice(0,30)});
    if(cr<4.5) out.lowc.push([t.slice(0,34),Math.round(cr*100)/100,cs.color]);
  });
  root.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(function(e){ if(!e.offsetParent&&getComputedStyle(e).position!=='fixed') return;
    out.heads.push([e.tagName,(e.textContent||'').trim().slice(0,40)]); });
  root.querySelectorAll('img').forEach(function(e){ if(!e.hasAttribute('alt')) out.noalt.push((e.getAttribute('src')||'').slice(-40)); });
  root.querySelectorAll('a,button').forEach(function(e){ if(!e.offsetParent) return;
    var t=(e.textContent||'').trim()||e.getAttribute('aria-label')||e.getAttribute('title')||(e.querySelector('img')&&e.querySelector('img').alt);
    if(!t) out.notext.push((e.getAttribute('href')||e.id||e.className||'').toString().slice(0,40)); });
  /* כתום: גוון 15°–45°, רוויה גבוהה — בכל צבע טקסט, רקע או גבול */
  function isOrange(c){ var r=c[0]/255,g=c[1]/255,b=c[2]/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn; if(d<0.25||mx<0.45) return false;
    var h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4; h*=60; if(h<0)h+=360; return h>=15&&h<=45; }
  var seenO={}, seenR={};
  root.querySelectorAll('*').forEach(function(e){ if(!e.offsetParent) return; var cs=getComputedStyle(e);
    ['color','backgroundColor','borderTopColor','borderRightColor'].forEach(function(k){ var c=rgb(cs[k]); if(c.length===4&&c[3]<0.3) return;
      if(isOrange(c)){ var key=k+cs[k]; if(!seenO[key]){ seenO[key]=1; out.orange.push([k,cs[k],(e.className||e.tagName).toString().slice(0,30)]); } } });
    var br=parseFloat(cs.borderTopLeftRadius); if(br>=3&&br<999&&(parseFloat(cs.borderTopWidth)>0||rgb(cs.backgroundColor)[3]>0.3)){
      var k2=br+'|'+(e.className||e.tagName); if(!seenR[k2]){ seenR[k2]=1; out.radius.push([br,(e.className||e.tagName).toString().slice(0,34)]); } } });
  return out;
})(__ROOT__)"""

async def shoot(b,name,w,h,mob,url,opener,root):
    ctx=await b.new_context(viewport={'width':w,'height':h},is_mobile=mob,has_touch=mob,locale='he-IL')
    await ctx.route('**://gibs.earthdata.nasa.gov/**', lambda r: asyncio.ensure_future(r.fulfill(status=200,content_type='image/png',body=PIX)))
    pg=await ctx.new_page(); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)[:110]))
    await pg.goto('http://127.0.0.1:8190/'+url); await pg.wait_for_timeout(4500)
    if opener:
        try: await pg.evaluate(opener)
        except Exception as e: errs.append('opener: %s'%str(e)[:100])
        await pg.wait_for_timeout(2500)
    d=await pg.evaluate(PROBE.replace('__ROOT__',json.dumps(root))); d['errs']=errs
    await pg.screenshot(path='audit-docs/%s.png'%name, full_page=(not opener))
    await ctx.close(); return d

async def main():
    res={}
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        J="(function(){ var m=document.querySelector('.mini'); if(m) m.click(); return !!m; })()"
        res['journey-desktop']=await shoot(b,'journey-desktop',1440,900,False,'',J,'#journey')
        res['journey-phone']  =await shoot(b,'journey-phone',390,844,True,'',J,'#journey')
        res['deep-desktop']   =await shoot(b,'deep-desktop',1440,900,False,'deep-dive.html',None,None)
        res['deep-phone']     =await shoot(b,'deep-phone',390,844,True,'deep-dive.html',None,None)
        await b.close()
    json.dump(res,open('audit-docs/docs.json','w'),ensure_ascii=False,indent=1)
    for k,d in res.items():
        print('\n=== %s ==='%k)
        if d.get('err'): print('  ',d['err']); continue
        ps=d['paras']
        if ps:
            cp=sorted(x['cpl'] for x in ps); fs=sorted(x['fs'] for x in ps); lh=sorted(x['lh'] for x in ps)
            print('  פסקאות: %d | גופנים: %s'%(len(ps),d['fonts']))
            print('  גודל: %.1f–%.1f px | תווים בשורה: %d–%d (חציון %d) | גובה שורה: %.2f–%.2f'%(fs[0],fs[-1],cp[0],cp[-1],cp[len(cp)//2],lh[0],lh[-1]))
        print('  כותרות: %s'%' › '.join(h[0] for h in d['heads'][:18]))
        if d['noalt']:  print('  תמונות בלי alt: %d  %s'%(len(d['noalt']),d['noalt'][:3]))
        if d['notext']: print('  קישורים/כפתורים בלי טקסט: %d  %s'%(len(d['notext']),d['notext'][:4]))
        if d['orange']: print('  כתום: %d  %s'%(len(d['orange']),d['orange'][:5]))
        if d['radius']: print('  פינות מעוגלות: %d  %s'%(len(d['radius']),d['radius'][:6]))
        if d['lowc']:   print('  ניגודיות גוף < 4.5: %d  %s'%(len(d['lowc']),d['lowc'][:3]))
        if d['errs']:   print('  שגיאות: %s'%d['errs'][:3])
asyncio.run(main())
