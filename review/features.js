/* ===== review/features.js — רשימת הפיצ'רים של תחנת הבדיקה =====
   כל פיצ'ר מקבל מספר ושם שלא משתנים בין סבבים ובין גדלי מסך. הערות נשמרות לפי key,
   ולכן לא משנים key של פיצ'ר קיים ולא ממחזרים מספר. פיצ'ר חדש מקבל מספר חדש.

   sel   — בורר CSS בתוך הדף הנבדק. multi:true = כל ההתאמות (מסגרת לכל אחת, מספר על הראשונה).
   calc  — מיקום מחושב מתוך window.EXO של ההדמיה (ring, boat), כשאין אלמנט HTML.
   scr   — המסך שבו הפיצ'ר חי: sim (ההדמיה), menu (התפריט פתוח), globe (הגלובוס), journey (המסע והניתוח).
   chip  — פיצ'רים שפרושים על כל הסצנה ואין להם מקום אחד: מופיעים כשורת כפתורים מתחת למסגרת.
   הדף "הניתוח המלא" (deep) ממוספר אוטומטית לפי סדר הפרקים: D1, D2...  */
window.REVIEW_FEATURES = [
  /* --- ההדמיה --- */
  {n:1,  key:'top-row1',  scr:'sim', sel:'.hud.topr .row.r1 > span', multi:true, name:'שורת הכותרת: שם היומן, יום המסע, תאריך, נ״צ וגיל הנתון'},
  {n:2,  key:'top-row2',  scr:'sim', sel:'.hud.topr .row.r2 > span:not([hidden])', multi:true, name:'רוח, גל וזרם בשורה העליונה'},
  {n:3,  key:'top-row3',  scr:'sim', sel:'#hRow3 > span:not([hidden])', multi:true, name:'השורה השלישית: לחץ, עננות, ראות, גשם, אוויר ומים'},
  {n:4,  key:'tstrip',    scr:'sim', sel:'#tstrip',           name:'רצועת הזמן: שבוע, ההווה באמצע, בתחתית המסך'},
  {n:5,  key:'clocks',    scr:'sim', sel:'.topr .clocks > span', multi:true, name:'שלושת השעונים'},
  {n:6,  key:'vit',       scr:'sim', sel:'.hud.vit',          name:'שורת מספרי המרוץ'},
  {n:7,  key:'mini',      scr:'sim', sel:'#mini',             name:'מפת המיקומים — הכפתור אל המסע והניתוח'},
  {n:8,  key:'ly-wind',   scr:'sim', sel:'#lay .ly-wind',     name:'כפתור שכבת הרוח'},
  {n:9,  key:'ly-wave',   scr:'sim', sel:'#lay .ly-wave',     name:'כפתור שכבת הגל'},
  {n:10, key:'ly-cur',    scr:'sim', sel:'#lay .ly-cur',      name:'כפתור שכבת הזרם'},
  {n:11, key:'menuBtn',   scr:'sim', sel:'#menuBtn',          name:'כפתור התפריט'},
  {n:12, key:'snd',       scr:'sim', sel:'#sndBtn',           name:'כפתור הקול'},
  {n:13, key:'ring',      scr:'sim', calc:'ring',             name:'טבעת המצפן על המים: שנתות, מעלות, צפון'},
  {n:14, key:'ring-wind', scr:'sim', sel:'#labels .lb.dat.wind', name:'סימון הרוח על הטבעת (נוצה ותווית)'},
  {n:15, key:'ring-wave', scr:'sim', sel:'#labels .lb.dat.wave', name:'סימון הגל על הטבעת (קשתות ותווית)'},
  {n:16, key:'ring-cur',  scr:'sim', sel:'#labels .lb.dat.cur',  name:'סימון הזרם על הטבעת (חץ גלי ותווית)'},
  {n:17, key:'ring-gate', scr:'sim', sel:'#labels .lb.dat.gate', name:'היעד הבא על הטבעת (מעוין)'},
  {n:18, key:'beacon',    scr:'sim', sel:'#labels .lb.beacon',   name:'המשואה באופק: שם היעד, מרחק וכיוון'},
  {n:19, key:'boat',      scr:'sim', calc:'boat',             name:'הסירה'},
  {n:20, key:'wind-air',  scr:'sim', chip:true, name:'הרוח באוויר: הזרמים סביב המפרשים'},
  {n:21, key:'waves',     scr:'sim', chip:true, name:'קווי הגלים על המים'},
  {n:22, key:'current',   scr:'sim', chip:true, name:'נחשי הזרם, גם מתחת למים'},
  {n:23, key:'sky',       scr:'sim', chip:true, name:'השמיים: עננים, כוכבים, שמש וירח'},
  {n:24, key:'sea',       scr:'sim', chip:true, name:'המים: צבע, קצף, ערפל'},
  {n:25, key:'toast',     scr:'sim', sel:'#toast:not(.off)',  name:'הודעה קופצת'},
  {n:26, key:'camera',    scr:'sim', chip:true, name:'תנועת המצלמה: גרירה, זום, הגלישה לסיפון ולגלובוס'},
  {n:27, key:'sound',     scr:'sim', chip:true, name:'הקול'},

  /* --- התפריט --- */
  {n:30, key:'menu',      scr:'menu', sel:'#menu',             name:'התפריט כולו'},
  {n:31, key:'menuX',     scr:'menu', sel:'#menuX',            name:'סגירת התפריט'},
  {n:32, key:'menu-btns', scr:'menu', sel:'#menu .grp',        name:'כפתורי התפריט: קול, מצב קל, מסך מלא, התקנה'},
  {n:33, key:'menu-hint', scr:'menu', sel:'#mHint',            name:'שורת ההסבר בתפריט'},
  {n:34, key:'menu-fine', scr:'menu', sel:'#menu p.fine:last-of-type', name:'"פרויקט אוהדים עצמאי" בתפריט'},

  /* --- הגלובוס --- */
  {n:40, key:'globe',     scr:'globe', sel:'#globe',           name:'הגלובוס עצמו: כדור הארץ, יום ולילה'},
  {n:41, key:'gBack',     scr:'globe', sel:'#gBack',           name:'"חזרה אל הסירה" בגלובוס'},
  {n:42, key:'g-leg',     scr:'globe', sel:'.g-leg',           name:'המקרא של הגלובוס'},
  {n:43, key:'scrub',     scr:'globe', sel:'#scrub',           name:'רצועת הימים וכפתור הניגון'},
  {n:44, key:'g-names',   scr:'globe', sel:'.gl-name', multi:true, name:'שמות אוקיינוסים, יבשות ואיים'},
  {n:45, key:'g-deg',     scr:'globe', sel:'.gl-deg', multi:true,  name:'תוויות קווי הרוחב והאורך'},
  {n:46, key:'g-marks',   scr:'globe', sel:'.gl-label:not(.k-me)', multi:true, name:'נקודות החובה ושמותיהן'},
  {n:47, key:'g-me',      scr:'globe', sel:'.gl-boat, .gl-label.k-me', multi:true, name:'אקסודוס על הגלובוס'},
  {n:48, key:'g-rim',     scr:'globe', sel:'.gl-rim',          name:'המשולש בשפת הכדור (כשהסירה מעבר לאופק)'},
  {n:49, key:'g-lines',   scr:'globe', chip:true, name:'קווים על הגלובוס: המסלול, השובלים, קו הלילה, רשת המעלות'},
  {n:39, key:'g-gesture', scr:'globe', chip:true, name:'גרירה וזום בגלובוס, והחזרה אל הסירה'},

  /* --- המסע והניתוח --- */
  {n:50, key:'j-bar',     scr:'journey', sel:'#journey .j-bar',    name:'הסרגל העליון של המסע וכפתור החזרה'},
  {n:51, key:'j-lead',    scr:'journey', sel:'#journey .j-lead',   name:'הפתיח: משפט הסיפור'},
  {n:52, key:'race-head', scr:'journey', sel:'#race > header',     name:'"המרוץ כרגע" — כותרת ושורת הסיכום'},
  {n:53, key:'race-box',  scr:'journey', sel:'#race .racebox',     name:'גרף המרוץ'},
  {n:54, key:'fleetTbl',  scr:'journey', sel:'#fleetTbl',          name:'טבלת הצי'},
  {n:55, key:'scale',     scr:'journey', sel:'#scale',             name:'"כמה זה, בעצם" — כרטיסי קנה המידה'},
  {n:56, key:'ahead',     scr:'journey', sel:'#ahead .aheadbox',   name:'"24 השעות הקרובות" — גרפי הרוח והגל'},
  {n:57, key:'daybar',    scr:'journey', sel:'#daybar',            name:'פס היום: זריחה, שקיעה ואיפה השמש'},
  {n:58, key:'sextant',   scr:'journey', sel:'#sextant',           name:'"לנווט כמו דניאל" — הסקסטנט'},
  {n:59, key:'gobtn',     scr:'journey', sel:'#more .gobtn',       name:'הכפתור אל הניתוח המלא'},
  {n:60, key:'prov',      scr:'journey', sel:'#more .prov',        name:'"מה כאן נמדד, מה מחושב ומה מודל"'},
  {n:61, key:'j-foot',    scr:'journey', sel:'#journey > footer',  name:'השורה התחתונה: קרדיטים ומקורות'},
  {n:62, key:'ahead-head',scr:'journey', sel:'#ahead > header',    name:'"24 השעות הקרובות" — כותרת ושורת הסיכום'},
  /* 21.9 בערב */
  {n:63, key:'hudDot',    scr:'sim', sel:'#hudDot',            name:'הנקודה הזוהרת שפותחת ומקפלת את הנתונים שבראש המסך'},
  {n:64, key:'whale',     scr:'sim', chip:true, name:'הלוויתן: שחייה רחוקה, נשימה, נשיפה וזנב'},
  /* 21.9 לילה */
  {n:65, key:'gl-scale',  scr:'globe', sel:'.gl-scale',        name:'סרגל קנה המידה בשולי הגלובוס'},
  {n:66, key:'fleet-view',scr:'globe', chip:true, name:'ההתרחקות האוטומטית: מהסמל הלבן ועד הפריים הראשון שבו רואים עוד משהו'},
  /* 22.9 לילה */
  {n:67, key:'vw',        scr:'sim', sel:'#vw',               name:'שלושת המבטים: סירה / אזור / כל המרוץ, והטבעת שנעה עם הזום'},
  {n:68, key:'past',      scr:'sim', chip:true, name:'גרירה אחורה ברצועת הזמן: הסירה עומדת איפה שהייתה, והים והרוח של אותה שעה מהארכיון'},
  /* 23.9 — המסך הראשון בחיסור (l19), ב-/next/ */
  {n:69, key:'lead-title',scr:'sim', sel:'#lead .lead-t',      name:'שורת הכותרת: מי זה ומה רואים כאן'},
  {n:70, key:'lead-story',scr:'sim', sel:'#leadStory',         name:'משפט הסיפור מתחת לכותרת (בטלפון עד שלוש שורות; נגיעה פותחת)'},
  {n:71, key:'lean-nums', scr:'sim', sel:'.vit', name:'ארבעת המספרים במסך הראשון: יום למסע, מקום, עד הסיום, מתי עודכן'},
  {n:72, key:'more-btn',  scr:'sim', sel:'#moreBtn', name:'"עוד" / "פחות": כל המכשירים מאחורי נגיעה אחת, והטלפון זוכר'},
  {n:73, key:'menu-lean', scr:'sim', sel:'#menuBtn2', name:'התפריט במסך הראשון, ובראשו "המסע והניתוח"'},
  /* 23.9 לילה — הממשק הנקי (l23), ב-/next/ */
  {n:74, key:'key',       scr:'sim', sel:'#key',               name:'העיגול (המפתח): משפט הפתיחה נשאב אליו, והוא פותח את השכבות'},
  {n:75, key:'lead-suck', scr:'sim', chip:true, name:'משפט הפתיחה: ארבע שניות, ואז נשאב לתוך העיגול (נגיעה לפני כן — מיד)'},
  {n:76, key:'thin-line', scr:'sim', sel:'.hud.vit',           name:'השורה הדקה בתחתית: יום · איפה במילים · עד קו הסיום'},
  {n:77, key:'layers-bar',scr:'sim', sel:'#lyr',               name:'התפריט העליון: שש קטגוריות, כל אחת שכבה (נגיעה מדליקה, נגיעה מכבה)'},
  {n:78, key:'layer-caps',scr:'sim', sel:'#lyCap',             name:'המלל הקצר של השכבות הדולקות, מתחת לתפריט'},
  {n:79, key:'fleet-hz',  scr:'sim', sel:'#labels .lb.fb', multi:true, name:'"המירוץ": הסירות הקרובות כסימנים באופק, בכיוון ובמרחק האמיתיים'},
  {n:80, key:'about',     scr:'sim', sel:'#bAbout',            name:'"אודות": מי, מקורות, יצירת קשר, זכויות והגדרות'}
];
