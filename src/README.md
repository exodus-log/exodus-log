# src — המקורות של הדף הראשי

מכאן נבנים `assets/v2/*`, `assets/v2n/*`, `index.html` ו-`next/index.html`. את הקבצים הבנויים לא עורכים ביד — עורכים כאן ובונים מחדש.

## לבנות

```
python3 src/build_site.py
```

רץ מתוך שורש הריפו, בלי תלויות מלבד Python 3 ו-Node (לבדיקת התחביר). כותב אל `src/out/` (הדף הראשי) ואל `src/out-preview/` (התצוגה המקדימה ב-`/next/`), באותו מבנה של הריפו. קידום = העתקת `src/out/` אל השורש.

| קובץ | מה הוא |
|---|---|
| `page.html` | הדף עצמו: המבנה וכל ה-CSS של החלון. `index.html` ו-`next/index.html` נבנים ממנו |
| `hud.js` | שורת הנתונים, השעונים, התוויות, המפה הקטנה, הגלובוס כשכבה, "המסע", רצועת הזמן והקול |
| `build_engine.py` + `*_add.js` | המנוע (`assets/v2/deck.js`): טלאים עם `assert` על `assets/deck.js`, ועוד תוספות — ציר הזום, השמיים, הגל והזרם, הסירה, הסיפון, דניאל, הלוויתן |
| `build_site.py` | הכול: מריץ את `build_engine.py`, בונה את הגלובוס (`globe_add.js` על `assets/globe.js`), את "המסע" (`assets/front.js`), ובודק כל קובץ ב-`node --check` |
| `names.js`, `stars.js`, `journey.css` | שמות הגלובוס, קטלוג הכוכבים (Yale BSC5, נאפה ב-`bake_stars.py`), סגנון "המסע" |
| `bake_coast.js`, `make_icons.py` | קו החוף של המפה הקטנה, סמלי האפליקציה |
| `shotq.py`, `audit_*.py` | בדיקות: צילומים ושגיאות קונסול בעשרה תרחישים, פריסה, ניגודיות (האות מול מה שצמוד לה), משקל, מצבי קצה, מסמכים, מקלדת, וגאומטריה — `audit_mesh.py` מוודא שכל חלק של הסירה יושב על הסירה (Playwright). `audit_all.py` מריץ את כולן. מריצים על `src/www/` — האתר ועוד `out/` ו-`out-preview/` מעליו |

`assets/deck.js`, `assets/front.js`, `assets/globe.js` ו-`assets/sextant.js` שבשורש הם חלק מהמקורות: הדף לא טוען אותם, אבל מהם נבנים קובצי `v2`.
