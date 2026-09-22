# -*- coding: utf-8 -*-
"""Packs the Yale Bright Star Catalogue (public domain) into assets/v2/stars.js.
   Source: bsc5-short.json from github.com/brettonw/YaleBrightStarCatalog (a JSON conversion of BSC5, Hoffleit & Warren 1991).
   Per star, 6 bytes: RA u16 (0..2pi), Dec u16 (-pi/2..pi/2), V u8 (-1.5..6.5), colour temperature u8 (2000 K + 120 K per step).
   Sorted brightest first, so that "lite" can simply draw the first half.   python3 bake_stars.py bsc5-short.json [vmax]"""
import json, re, sys, struct, base64, io, os
src = sys.argv[1]; vmax = float(sys.argv[2]) if len(sys.argv) > 2 else 6.0
def num(s): return [float(x) for x in re.findall(r'[-+]?\d+(?:\.\d+)?', s)]
rows = []
for s in json.load(io.open(src, encoding='utf-8')):
    if 'RA' not in s or 'Dec' not in s or 'V' not in s: continue
    try: v = float(s['V'])
    except ValueError: continue
    if v > vmax: continue
    h, m, sec = num(s['RA']); ra = (h + m/60 + sec/3600) * 15.0
    d = num(s['Dec']); sign = -1 if s['Dec'].strip().startswith('-') else 1
    dec = sign * (abs(d[0]) + d[1]/60 + d[2]/3600)
    k = float(s.get('K', 6000) or 6000)
    rows.append((v, ra, dec, k))
rows.sort()
buf = bytearray()
for v, ra, dec, k in rows:
    buf += struct.pack('<HHBB', min(65535, int(round(ra/360*65535))), min(65535, int(round((dec+90)/180*65535))),
                       max(0, min(255, int(round((v+1.5)/8*255)))), max(0, min(255, int(round((k-2000)/120)))))
js = ('/* ===== v2/stars.js — קטלוג הכוכבים הבהירים של ייל (BSC5, נחלת הכלל), עד בהירות %.1f: %d כוכבים =====\n'
      '   נאפה פעם אחת ב-bake_stars.py. לכל כוכב 6 בתים: עלייה ישרה, נטייה, בהירות, טמפרטורת צבע. ממוין מהבהיר לחלש.\n'
      '   נטען אחרי הפריים הראשון; בלעדיו נשארים בשמיים כוכבי הרעש של קודם. */\n'
      'var STARS_B64="%s";\n') % (vmax, len(rows), base64.b64encode(bytes(buf)).decode())
io.open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'stars.js'), 'w', encoding='utf-8', newline='\n').write(js)
print(len(rows), 'stars', len(js), 'bytes; brightest:', rows[:3])
