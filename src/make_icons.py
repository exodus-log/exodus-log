# -*- coding: utf-8 -*-
import math, io, os, asyncio
from playwright.async_api import async_playwright
HERE=os.path.join(os.path.dirname(os.path.abspath(__file__)),'icons'); os.makedirs(HERE,exist_ok=True)
def svg(size, scale):
    # scale: how much of the canvas the artwork takes (maskable icons keep everything inside the central 80%)
    c=256; R=200*scale; t=[]
    for k in range(72):
        b=k*5; a=math.radians(b); L=(30 if b%90==0 else 22 if b%30==0 else 13 if b%10==0 else 8)*scale
        w=(5 if b%30==0 else 3)*scale; o=1.0 if b%10==0 else 0.75
        x0,y0=c+math.sin(a)*R, c-math.cos(a)*R; x1,y1=c+math.sin(a)*(R-L), c-math.cos(a)*(R-L)
        if b==0: continue
        t.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#eef5f9" stroke-opacity="%.2f" stroke-width="%.1f" stroke-linecap="butt"/>'%(x0,y0,x1,y1,o,w))
    s=scale
    north='<path d="M%.1f %.1f L%.1f %.1f L%.1f %.1f Z" fill="#f0443e"/>'%(c,c-R-16*s, c-20*s,c-R+26*s, c+20*s,c-R+26*s)
    boat=('<g transform="translate(%d %d) scale(%.3f)">'
          '<path d="M6 -118 L6 52 L98 52 Q70 -40 6 -118 Z" fill="#ffffff"/>'
          '<path d="M-8 -92 L-8 52 L-84 52 Q-52 -24 -8 -92 Z" fill="#cfe6ff"/>'
          '<path d="M-104 70 L112 70 Q96 112 60 112 L-64 112 Q-92 108 -104 70 Z" fill="#ffffff"/>'
          '</g>')%(c,c+6,s)
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 512 512">'
            '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d2a3e"/><stop offset=".6" stop-color="#06121b"/><stop offset="1" stop-color="#0a2a3a"/></linearGradient></defs>'
            '<rect width="512" height="512" fill="url(#g)"/>%s%s%s</svg>')%(size,size,''.join(t),north,boat)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-sandbox'])
        for name,size,scale in (('icon-512.png',512,1.0),('icon-192.png',192,1.0),('icon-32.png',32,1.0),('apple-touch-icon.png',180,0.92),('icon-maskable-512.png',512,0.74)):
            pg=await b.new_page(viewport={'width':size,'height':size},device_scale_factor=1)
            await pg.set_content('<html><body style="margin:0;background:#06121b">'+svg(size,scale)+'</body></html>')
            await pg.screenshot(path=os.path.join(HERE,name),clip={'x':0,'y':0,'width':size,'height':size})
            await pg.close()
        await b.close()
    io.open(os.path.join(HERE,'icon.svg'),'w',encoding='utf-8').write(svg(512,1.0))
asyncio.run(main())
