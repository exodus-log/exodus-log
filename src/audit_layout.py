# -*- coding: utf-8 -*-
"""audit_layout.py — מודד את הפריסה בכל רוחב מסך, ומדווח על חפיפות, חריגות ושוליים לא אחידים.
   לא משנה כלום. הפלט הוא JSON + סיכום קריא."""
import argparse, asyncio, functools, http.server, json, os, sys, threading, base64
from playwright.async_api import async_playwright
PIX=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
AP=argparse.ArgumentParser(); AP.add_argument('--root',default='www'); AP.add_argument('--port',type=int,default=8140)
AP.add_argument('--path',default='/'); AP.add_argument('--out',default='audit'); AP.add_argument('--globe',action='store_true')
A=AP.parse_args(); os.makedirs(A.out,exist_ok=True)
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
threading.Thread(target=http.server.ThreadingHTTPServer(('127.0.0.1',A.port), functools.partial(H,directory=A.root)).serve_forever,daemon=True).start()

VIEWPORTS=[('phone-s',360,640,True),('phone',390,844,True),('phone-max',430,932,True),
           ('phone-land',844,390,True),('tablet',768,1024,False),('tablet-land',1024,768,False),
           ('laptop',1280,800,False),('desktop',1440,900,False),('fhd',1920,1080,False),('ultra',2560,1080,False)]

MEASURE = """(function(){
  /* הרשימה חייבת לכלול כל דבר שמצויר על המסך, לא רק מה שנזכר. שלושה באגים נמצאו ב-21.9 דווקא
     באלמנטים שלא היו כאן: פקד הקרדיטים של MapLibre שצויר על הסיפון, כפתורי החזרה שהיו קטנים
     מ-44 פיקסל, ותוויות הסצנה. מה שלא נמדד — לא נבדק. */
  var sel = {clocks:'.clocks', data:'header.topr', tstrip:'.tstrip', mini:'.mini', rail:'.lay',
             snd:'#sndBtn', menu:'#menuBtn', race:'.hud.vit', toast:'#toast',
             gback:'#gBack', gleg:'.g-leg', scrub:'.g-scrub', scOut:'.g-scrub output', scPlay:'#scPlay',
             jback:'#jBack', jbar:'.j-bar',
             mlAttrib:'.maplibregl-ctrl-attrib', mlTopLeft:'.maplibregl-ctrl-top-left',
             beacon:'.lb.beacon', gate:'.lb.gate', info:'.gl-fail,.g-info,#gInfo'};
  var vw=innerWidth, vh=innerHeight, out={vw:vw,vh:vh,boxes:{},touch:[],overlaps:[],offscreen:[],tab:[]};
  function vis(e){ if(!e) return false; var cs=getComputedStyle(e);
    if(cs.display==='none'||cs.visibility==='hidden'||parseFloat(cs.opacity)<0.02) return false;
    var r=e.getBoundingClientRect(); return r.width>0&&r.height>0; }
  for(var k in sel){ var e=document.querySelector(sel[k]); if(!vis(e)) continue;
    var r=e.getBoundingClientRect();
    out.boxes[k]=[Math.round(r.left),Math.round(r.top),Math.round(r.right),Math.round(r.bottom)]; }
  /* שוליים: המרחק מכל תיבה אל הקצה הקרוב לה */
  out.gaps={};
  for(var k2 in out.boxes){ var b=out.boxes[k2];
    out.gaps[k2]={l:b[0], t:b[1], r:vw-b[2], b:vh-b[3]}; }
  /* חפיפות בין תיבות ממשק */
  var keys=Object.keys(out.boxes);
  for(var i=0;i<keys.length;i++) for(var j=i+1;j<keys.length;j++){
    var a=out.boxes[keys[i]], c=out.boxes[keys[j]];
    if(a[0]<c[2]&&c[0]<a[2]&&a[1]<c[3]&&c[1]<a[3]){
      var ox=Math.min(a[2],c[2])-Math.max(a[0],c[0]), oy=Math.min(a[3],c[3])-Math.max(a[1],c[1]);
      out.overlaps.push([keys[i],keys[j],ox,oy]); } }
  /* חריגה מהמסך */
  for(var k3 in out.boxes){ var q=out.boxes[k3];
    if(q[0]<0||q[1]<0||q[2]>vw||q[3]>vh) out.offscreen.push([k3,q]); }
  /* יעדי מגע: כל מה שאפשר ללחוץ עליו */
  document.querySelectorAll('button,[role=button],a,input,summary').forEach(function(e){
    if(!vis(e)) return; var r=e.getBoundingClientRect();
    if(r.width<44||r.height<44) out.touch.push([(e.id||e.className||e.tagName).toString().slice(0,34),Math.round(r.width),Math.round(r.height)]); });
  /* סדר מעבר במקלדת */
  document.querySelectorAll('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])').forEach(function(e){
    if(!vis(e)) return; var r=e.getBoundingClientRect();
    out.tab.push([(e.id||e.getAttribute('aria-label')||e.className||e.tagName).toString().slice(0,34),
                  Math.round(r.left),Math.round(r.top), e.tabIndex]); });
  /* חסרי שם נגיש */
  out.noname=[];
  document.querySelectorAll('button,[role=button],input').forEach(function(e){
    if(!vis(e)) return;
    var t=(e.getAttribute('aria-label')||e.getAttribute('title')||e.textContent||'').trim();
    if(!t) out.noname.push((e.id||e.className||e.tagName).toString().slice(0,34)); });
  return out;
})()"""
OPEN_GLOBE="""(async function(){ location.hash='globe'; var t0=Date.now();
 while(!window.__exoGlobeLoaded && Date.now()-t0<25000) await new Promise(r=>setTimeout(r,200));
 if(!document.body.classList.contains('g-open')&&window.EXO&&EXO.onZoomOut) EXO.onZoomOut();
 await new Promise(r=>setTimeout(r,2200)); return true; })()"""

async def main():
    res={}
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        for name,w,h,mob in VIEWPORTS:
            ctx=await b.new_context(viewport={'width':w,'height':h},is_mobile=mob,has_touch=mob,locale='he-IL')
            await ctx.route('**://gibs.earthdata.nasa.gov/**', lambda r: asyncio.ensure_future(r.fulfill(status=200,content_type='image/png',body=PIX)))
            pg=await ctx.new_page(); errs=[]
            pg.on('pageerror', lambda e: errs.append(str(e)[:120]))
            await pg.goto('http://127.0.0.1:%d%s'%(A.port,A.path)); await pg.wait_for_timeout(5200)
            if A.globe:
                await pg.evaluate(OPEN_GLOBE); await pg.wait_for_timeout(2500)
            d=await pg.evaluate(MEASURE); d['errs']=errs
            res[name]=d
            await pg.screenshot(path=os.path.join(A.out,name+'.png'))
            print('%-11s %4dx%-4d  חפיפות:%d  חריגות:%d  יעדי מגע קטנים:%d  בלי שם:%d'%(
                  name,w,h,len(d['overlaps']),len(d['offscreen']),len(d['touch']),len(d['noname'])),flush=True)
            for o in d['overlaps']: print('      חפיפה: %s × %s  (%dx%d px)'%(o[0],o[1],o[2],o[3]))
            for o in d['offscreen']: print('      חורג:  %s %s'%(o[0],o[1]))
            await ctx.close()
        await b.close()
    json.dump(res,open(os.path.join(A.out,'audit.json'),'w'),ensure_ascii=False,indent=1)
    print('\nנשמר ב-%s/audit.json'%A.out)
asyncio.run(main())
