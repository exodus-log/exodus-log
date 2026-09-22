# -*- coding: utf-8 -*-
"""audit_mesh.py — כל חלק של הסירה יושב על הסירה.

   ב-22.9 התגלה לוח לבן שריחף חמישה מטרים משמאל לסירה, בעמוד הראשי, מאז מנה ד׳ — ואף ביקורת לא תפסה אותו,
   כי הביקורות מסתכלות על הממשק ועל הצילום, לא על הגאומטריה. הבדיקה הזאת סוגרת את החור:
   טוענת את הדף, מיירטת את המנוע הבנוי ומחדירה לו רישום — כל רשת (mesh) זוכרת את הקודקודים שלה, וכל ציור
   (drawMesh / drawSail) מדווח את המטריצה שאיתה צויר. אחרי כמה שניות של ריצה, כל רשת מתורגמת חזרה
   למערכת הצירים של הסירה (הופכי של boatM), ונבדק שהתיבה החוסמת שלה נוגעת בתיבה של הגוף, התורן והחרטומית,
   ועוד מטר. רשת שכולה מחוץ לתיבה המורחבת = "מרחפת" = כישלון. רשת שבולטת יותר ממטר = אזהרה (מפרש גדול,
   דגל בקצה התורן — בסדר, אבל שיהיה כתוב).

   מה לא נבדק: הלוויתן, כתמי הקצף והמים — הם לא חלק מהסירה, ומדולגים בשם.

   python3 src/audit_mesh.py [--path / | /next/] [--root www]     יוצא עם קוד 1 אם יש רשת מרחפת.
"""
import argparse, asyncio, functools, http.server, io, json, os, re, sys, threading
from playwright.async_api import async_playwright

AP = argparse.ArgumentParser()
AP.add_argument('--root', default='www'); AP.add_argument('--port', type=int, default=8177)
AP.add_argument('--path', default='/'); AP.add_argument('--out', default='audit-mesh')
AP.add_argument('--wait', type=int, default=7000, help='מ״ש של ריצה לפני האיסוף')
AP.add_argument('--margin', type=float, default=1.0, help='מטרים מעבר לתיבת הגוף שעדיין נחשבים "על הסירה"')
AP.add_argument('--selftest', action='store_true', help='מזריק את הלוח המרחף של 22.9 ומוודא שהבדיקה תופסת אותו')
A = AP.parse_args(); os.makedirs(A.out, exist_ok=True)

class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
threading.Thread(target=http.server.ThreadingHTTPServer(('127.0.0.1', A.port), functools.partial(H, directory=A.root)).serve_forever, daemon=True).start()

ENGINE = 'assets/v2n/deck.js' if A.path.rstrip('/').endswith('next') else 'assets/v2/deck.js'
SRC = io.open(os.path.join(A.root, ENGINE), encoding='utf-8').read()

# ---- ההחדרה: מוסיפים רישום למנוע הבנוי, בלי לגעת בקובץ שבדיסק ----
def patch(s):
    n = 0
    def rep(old, new, count=1):
        nonlocal s, n
        c = s.count(old); assert c == count, 'audit_mesh: expected %d, found %d: %r' % (count, c, old[:70])
        s = s.replace(old, new); n += 1
    rep("function mesh(pos,idx,uv){ var m={", "function mesh(pos,idx,uv){ var m={__pos:pos,__id:(window.__EXO_MID=(window.__EXO_MID||0)+1),")
    rep("function drawMesh(m,model,col,zs,flat){", "function drawMesh(m,model,col,zs,flat){ if(window.__EXO_REC) window.__EXO_REC(m,model,col,'mesh');")
    rep("function drawSail(m,model,tex,zs){", "function drawSail(m,model,tex,zs){ if(window.__EXO_REC) window.__EXO_REC(m,model,null,'sail');")
    # boatM נולד בכל פריים בתוך פונקציית הציור; מייצאים אותו כדי לתרגם כל רשת חזרה למערכת של הסירה
    rep("mRotZ(pitch)),mRotX(roll));", "mRotZ(pitch)),mRotX(roll)); window.__EXO_BOATM=boatM;")
    if A.selftest:   # הבאג המקורי: "בד הירכתיים" שנמתח על ציר x ונחת 5 מ׳ משמאל לסירה
        rep("M_CLOTHP=clothMesh(-4.10,-1.30,dY(-2.7)+0.16,0.46,-(dW(-2.7)-0.04),true);",
            "M_CLOTHP=clothMesh(-4.10,-1.30,dY(-2.7)+0.16,0.46,-(dW(-2.7)-0.04),true), M_SELFTEST=clothMesh(-0.48,0.48,dY(-2.7)+0.16,0.46,-5.15,false);")
        rep("drawSail(M_CLOTHP,boatM, TEX_SPON, 1);", "drawSail(M_CLOTHP,boatM, TEX_SPON, 1); drawSail(M_SELFTEST,boatM, TEX_SPON, 1);")
    # שמות: כל משתנה M_* / WHP.* / CREW.* / C_* שנראה ברמת המנוע, מיוצא בסוף ה-IIFE (מי שלא בטווח — מדולג)
    names = sorted(set(re.findall(r'\b(M_[A-Z0-9_]+)\s*=', s)) | set(re.findall(r'\b(C_[A-Z]+)\s*=', s)))
    exp = ['window.__EXO_NAMES={};']
    for nm in names: exp.append('try{if(%s&&%s.__id)__EXO_NAMES[%s.__id]=%r;}catch(e){}' % (nm, nm, nm, nm))
    exp.append("try{Object.keys(WHP).forEach(function(k){ if(WHP[k]&&WHP[k].__id) __EXO_NAMES[WHP[k].__id]='WHP.'+k; });}catch(e){}")
    exp.append("try{Object.keys(CREW).forEach(function(k){ if(CREW[k]&&CREW[k].__id) __EXO_NAMES[CREW[k].__id]='CREW.'+k; });}catch(e){}")
    tail = s.rstrip()
    assert tail.endswith('})();'), 'audit_mesh: engine does not end with })();'
    s = tail[:-len('})();')] + '\n' + '\n'.join(exp) + '\n})();\n'
    return s, n, len(names)
PATCHED, NPATCH, NNAMES = patch(SRC)

# ---- הרישום בדף: תיבה חוסמת לכל רשת, במערכת הצירים של הסירה ----
REC = """(function(){
  function inv(m){ // הופכי 4x4, עמודות-ראשונות (כמו mMul של המנוע)
    var a=m, o=new Array(16);
    var a00=a[0],a01=a[1],a02=a[2],a03=a[3],a10=a[4],a11=a[5],a12=a[6],a13=a[7],a20=a[8],a21=a[9],a22=a[10],a23=a[11],a30=a[12],a31=a[13],a32=a[14],a33=a[15];
    var b00=a00*a11-a01*a10,b01=a00*a12-a02*a10,b02=a00*a13-a03*a10,b03=a01*a12-a02*a11,b04=a01*a13-a03*a11,b05=a02*a13-a03*a12,
        b06=a20*a31-a21*a30,b07=a20*a32-a22*a30,b08=a20*a33-a23*a30,b09=a21*a32-a22*a31,b10=a21*a33-a23*a31,b11=a22*a33-a23*a32;
    var det=b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06; if(!det) return null; det=1/det;
    o[0]=(a11*b11-a12*b10+a13*b09)*det; o[1]=(a02*b10-a01*b11-a03*b09)*det; o[2]=(a31*b05-a32*b04+a33*b03)*det; o[3]=(a22*b04-a21*b05-a23*b03)*det;
    o[4]=(a12*b08-a10*b11-a13*b07)*det; o[5]=(a00*b11-a02*b08+a03*b07)*det; o[6]=(a32*b02-a30*b05-a33*b01)*det; o[7]=(a20*b05-a22*b02+a23*b01)*det;
    o[8]=(a10*b10-a11*b08+a13*b06)*det; o[9]=(a01*b08-a00*b10-a03*b06)*det; o[10]=(a30*b04-a31*b02+a33*b00)*det; o[11]=(a21*b02-a20*b04-a23*b00)*det;
    o[12]=(a11*b07-a10*b09-a12*b06)*det; o[13]=(a00*b09-a01*b07+a02*b06)*det; o[14]=(a31*b01-a30*b03-a32*b00)*det; o[15]=(a20*b03-a21*b01+a22*b00)*det;
    return o; }
  function mul(a,b){ var o=new Array(16); for(var c=0;c<4;c++) for(var r=0;r<4;r++) o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3]; return o; }
  var R=window.__EXO_BOX={}, frames=0;
  window.__EXO_REC=function(m,model,col,kind){
    if(!m||!m.__pos||!window.__EXO_BOATM) return;
    var bi=inv(window.__EXO_BOATM); if(!bi) return;
    var L=mul(bi,model), p=m.__pos, k=m.__id, r=R[k];
    if(!r){ r=R[k]={id:k,kind:kind,col:col?col.map(function(v){return +v.toFixed(2);}):null,min:[1e9,1e9,1e9],max:[-1e9,-1e9,-1e9],n:p.length/3,draws:0}; }
    r.draws++;
    for(var i=0;i<p.length;i+=3){ var x=p[i],y=p[i+1],z=p[i+2];
      var X=L[0]*x+L[4]*y+L[8]*z+L[12], Y=L[1]*x+L[5]*y+L[9]*z+L[13], Z=L[2]*x+L[6]*y+L[10]*z+L[14];
      if(X<r.min[0])r.min[0]=X; if(Y<r.min[1])r.min[1]=Y; if(Z<r.min[2])r.min[2]=Z;
      if(X>r.max[0])r.max[0]=X; if(Y>r.max[1])r.max[1]=Y; if(Z>r.max[2])r.max[2]=Z; }
  };
})()"""

COLLECT = """(function(){ var out=[], N=window.__EXO_NAMES||{};
  Object.keys(window.__EXO_BOX||{}).forEach(function(k){ var r=__EXO_BOX[k]; r.name=N[k]||null; out.push(r); });
  return {boxes:out, names:Object.keys(N).length, boatM:!!window.__EXO_BOATM}; })()"""

# הגוף עצמו: מהם נגזרת התיבה שהכול צריך לשבת בה. הלוויתן, הקצף והמים אינם חלק מהסירה.
HULL = ('M_BOTT', 'M_TOPS', 'M_DECK', 'M_KEEL', 'M_RUD', 'M_MAST', 'M_SPRIT', 'M_VANEP')   # הגוף הקבוע; המפרשים והבום זזים
SKIP_PREFIX = ('WHP.', 'M_FLUKE', 'M_PUFF')

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        ctx = await b.new_context(viewport={'width': 1280, 'height': 800}, locale='he-IL')
        await ctx.route('**/' + ENGINE, lambda r: asyncio.ensure_future(r.fulfill(status=200, content_type='application/javascript; charset=utf-8', body=PATCHED)))
        await ctx.route('**://gibs.earthdata.nasa.gov/**', lambda r: asyncio.ensure_future(r.abort()))
        pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)[:160]))
        pg.on('console', lambda m: errs.append('console: ' + m.text[:160]) if m.type == 'error' else None)
        await pg.add_init_script(REC)
        await pg.goto('http://127.0.0.1:%d%s' % (A.port, A.path), timeout=30000)
        await pg.wait_for_timeout(A.wait)
        d = await pg.evaluate(COLLECT)
        try: await pg.screenshot(path=os.path.join(A.out, 'deck.png'))
        except Exception: pass
        await b.close()
    return d, errs

d, errs = asyncio.run(main())
boxes = d['boxes']
print('audit_mesh — %s · %d טלאים במנוע, %d שמות מיוצאים, %d רשתות צוירו, boatM %s' % (A.path, NPATCH, NNAMES, len(boxes), 'נמצא' if d['boatM'] else 'לא נמצא'))
for e in errs: print('  !', e)
if not boxes or not d['boatM']:
    print('  לא נאסף כלום — הבדיקה לא מדדה.'); sys.exit(2)

hull = [r for r in boxes if r['name'] in HULL]
if len(hull) < 5:
    print('  נמצאו רק %d רשתות גוף מתוך %d — הבדיקה לא מדדה.' % (len(hull), len(HULL))); sys.exit(2)
ref = [[min(r['min'][i] for r in hull) for i in range(3)], [max(r['max'][i] for r in hull) for i in range(3)]]
M = A.margin
print('  תיבת הגוף (x לאורך, y לגובה, z לרוחב): x %.2f..%.2f · y %.2f..%.2f · z %.2f..%.2f  (מתוך %s)'
      % (ref[0][0], ref[1][0], ref[0][1], ref[1][1], ref[0][2], ref[1][2], ', '.join(sorted(r['name'] for r in hull))))

def fmt(r): return 'x %.2f..%.2f · y %.2f..%.2f · z %.2f..%.2f' % (r['min'][0], r['max'][0], r['min'][1], r['max'][1], r['min'][2], r['max'][2])
floating, protrude, ok, skipped = [], [], [], []
for r in sorted(boxes, key=lambda r: (r['name'] or 'zz#%04d' % r['id'])):
    nm = r['name'] or ('#%d' % r['id'])
    if any(nm.startswith(s) for s in SKIP_PREFIX): skipped.append(nm); continue
    disjoint = any(r['max'][i] < ref[0][i] - M or r['min'][i] > ref[1][i] + M for i in range(3))
    over = max(max(ref[0][i] - r['min'][i], r['max'][i] - ref[1][i]) for i in range(3))
    if disjoint: floating.append((nm, r))
    elif over > M and r['kind'] != 'sail': protrude.append((nm, r, over))   # מפרש בולט לצד הסירה בכוונה; רק ניתוק נחשב
    else: ok.append(nm)
print('  על הסירה: %d רשתות · מדולגות (לוויתן/קצף): %d' % (len(ok), len(skipped)))
for nm, r, over in protrude:
    print('  ~ בולט %.1f מ׳ מעבר לגוף: %-12s %s  [%s%s]' % (over, nm, fmt(r), r['kind'], (' צבע ' + str(r['col'])) if r['col'] else ''))
for nm, r in floating:
    print('  ✗ מרחף (כולו מחוץ לגוף + %.0f מ׳): %-12s %s  [%s%s, %d קודקודים]' % (M, nm, fmt(r), r['kind'], (' צבע ' + str(r['col'])) if r['col'] else '', r['n']))
unnamed = [r for r in boxes if not r['name']]
if unnamed: print('  (בלי שם: %d רשתות — נבדקו לפי מספר; שמות רק למשתנים ברמת המנוע)' % len(unnamed))
json.dump({'ref': ref, 'boxes': boxes, 'errs': errs}, io.open(os.path.join(A.out, 'mesh.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('  נשמר: %s/mesh.json, deck.png' % A.out)
if A.selftest:
    hit = any(nm == 'M_SELFTEST' for nm, _ in floating)
    print('  בדיקה עצמית: הלוח המוזרק %s' % ('נתפס ✓' if hit else 'לא נתפס ✗')); sys.exit(0 if hit else 3)
if floating: print('  ✗ %d רשתות מרחפות' % len(floating)); sys.exit(1)
print('  ✓ אף רשת לא מרחפת')
