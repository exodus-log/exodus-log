# -*- coding: utf-8 -*-
"""audit_all.py — מריץ את כל הביקורות ברצף ומדפיס שורה אחת לכל אחת.
   שימוש:  python3 audit_all.py        (אחרי build_site.py ואחרי שהוקם www/)
   יוצא בקוד 1 אם shotq מצא שגיאת קונסול, או אם audit_mesh מצא חלק שמרחף מחוץ לסירה."""
import subprocess, sys, re, time
JOBS=[('צילומים ושגיאות קונסול','shotq.py --path / --out out-audit/shots',r'סך שגיאות קונסול: (\d+)','שגיאות'),
      ('פריסה בעשרה רוחבי מסך','audit_layout.py --out out-audit/layout',None,None),
      ('ניגודיות מול הרקע האמיתי','audit_contrast.py --out out-audit/contrast',r'סה"כ (\d+) מתוך (\d+)','מתחת לסף'),
      ('משקל וזמני טעינה','audit_perf.py --out out-audit/perf',None,None),
      ('מצבי קצה של נתונים','audit_truth.py --out out-audit/truth',None,None),
      ('"המסע" ו-deep-dive','audit_docs.py',None,None),
      ('מקלדת','audit_keys.py',None,None),
      ('כל חלק של הסירה על הסירה','audit_mesh.py --path / --out out-audit/mesh',r'על הסירה: (\d+) רשתות','על הסירה')]
bad=0
for name,cmd,pat,lbl in JOBS:
    t0=time.time()
    r=subprocess.run([sys.executable]+cmd.split(),capture_output=True,text=True)
    o=(r.stdout or '')+(r.stderr or '')
    extra=''
    if pat:
        m=re.search(pat,o)
        if m: extra='  %s: %s'%(lbl,' / '.join(m.groups()))
    if 'שגיאות קונסול: 0' not in o and 'shotq' in cmd: bad=1
    if 'audit_mesh' in cmd and r.returncode!=0: bad=1
    print('%-28s %5.0f שניות  %s%s'%(name,time.time()-t0,'תקין' if r.returncode==0 else 'קוד %d'%r.returncode,extra),flush=True)
sys.exit(bad)
