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
  {n:79, key:'fleet-hz',  scr:'sim', sel:'#labels .lb.fb', multi:true, name:'"המירוץ": הסירות הקרובות כסימנים באופק, בכיוון ובמרחק האמיתיים — הוחלף ברדאר, 101 (25.9)'},
  {n:80, key:'about',     scr:'sim', sel:'#faq .faq-foot',     name:'"אודות" — מ-24.9 בתוך "שאלות": מקורות ויצירת קשר בקבוצה "האתר", הגדרות ורישיון בסוף החלונית'},
  {n:81, key:'globe-line',scr:'globe', sel:'#scrub',           name:'זום אאוט: קו דק מקצה לקצה, play שנעצר בהווה וממשיך אל התחזית החיוורת, ותאריך קטן'},
  {n:82, key:'log-times', scr:'sim', sel:'#logBar',            name:'"היומן": זמנים במילים במקום רצועת הזמן — ההדמיה עוברת לשם, והמלל אומר מה היה או מה צפוי — הוחלף ב-92 (a12, 25.9)'},
  {n:83, key:'area-text', scr:'sim', sel:'#capArea',           name:'"האזור": קצת על המקום (איים, משטר הרוח, צבע הים), עם מקור לכל פסקה, והמשואה באופק — התפצל ל"נקודת ציון" ול"תנאי הטבע", 98–99 (25.9)'},
  /* 24.9 — "שאלות" (l26), ב-/next/ */
  {n:84, key:'faq',       scr:'sim', sel:'#bFaq',              name:'"שאלות": 32 שאלות ותשובות בשש קבוצות מקופלות — המרוץ, הכללים, דניאל ואקסודוס, המצב עכשיו (מספרים חיים), איך מודדים, האתר (כולל מה שהיה ב"אודות")'},
  /* 24.9 — "מילים לדניאל" (g01), ב-/next/ */
  {n:85, key:'words',     scr:'sim', sel:'#bWords',            name:'"מילים לדניאל": קישור ב"הסיפור" שפותח טופס קצר — משפט שנשמר עם הזמן ומקום הסירה, לא מוצג באתר'},
  /* 24.9 ערב — שיתוף (l21) ורמז מסך הבית (a-home-hint), ב-/next/ */
  {n:86, key:'share',     scr:'sim', sel:'#shareBtn',          name:'שיתוף: סמל בפינה שמול העיגול — חלון השיתוף של הטלפון עם משפט אחד והכתובת הראשית; במחשב מעתיק את הקישור'},
  {n:87, key:'home-hint', scr:'sim', sel:'#homeHint',          name:'רמז "מסך הבית": שורה אחת מעל השורה התחתונה, בביקור השלישי, פעם אחת בלבד (לא למי שפתח מהסמל)'},
  /* 24–25.9 — שדרוג הגרפיקה של ההדמיה (17 פריטים), ב-/next/. ?fps=1 מונה, ?q=0|1|2 דרגה, ?met=1 ?aur=1 ?bird=1 בדיקה */
  {n:88, key:'gfx-sky',   scr:'sim', chip:true, name:'השמיים: צבע מחושב מפיזור האור (שקיעה, הצל של כדור הארץ, שעה כחולה), עננים בשתי שכבות, ירח מצילום של נאס"א, שביל חלב מ-ESO, כוכבים מנצנצים'},
  {n:89, key:'gfx-sea',   scr:'sim', chip:true, name:'הים: משקף את השמיים (עננים, ירח, כוכבים), שביל ירח, שובל קצף וגל חרטום, ובמכשיר חזק גלים ואדוות נוספים וקרני שמש מבין העננים'},
  {n:90, key:'gfx-sails', scr:'sim', chip:true, name:'המפרשים נושמים עם המשבים ומרפרפים בקצה האחורי'},
  {n:91, key:'gfx-nature',scr:'sim', chip:true, name:'מטאורים רק בלילות מטר אמיתי (IMO), זוהר קוטבי רק כשמדד Kp של NOAA מצדיק, אלבטרוס רק מדרום ל-25°S'},
  /* 25.9 לילה — a12 */
  {n:92, key:'log-sun',   scr:'sim', sel:'#sScrub',           name:'"היומן": פס זמן אחורה 48 שעות, עכשיו מימין. סימני זריחה ושקיעה במקום שבו הסירה הייתה; גרירה לידם נדבקת אליהם; ניגון שמאט ועוצר על השקיעה'},
  /* 25.9 — רשימת שינויי הממשק של בעל האתר (10 סעיפים, a09) */
  {n:93, key:'lead-2l',   scr:'sim', sel:'#lead',              name:'כותרת הפתיחה: "דניאל פינסקי / מקיף את העולם לבד", תמיד בשתי שורות; עולה בהדרגה, נשארת כ-7 שניות ונשאבת לעיגול'},
  {n:94, key:'key-idle',  scr:'sim', sel:'#key',               name:'העיגול: הבהוב חלש ועדין כל 12 שניות, כתזכורת'},
  {n:95, key:'dbl-tap',   scr:'sim', chip:true,                name:'לחיצה כפולה על ההדמיה: אל הסיפון, ליד דניאל (מסתכלים לכל כיוון, גם לשמיים); לחיצה כפולה נוספת — חזרה למבט המקיף'},
  {n:96, key:'height-rail',scr:'sim', sel:'#vw',               name:'סרגל הגובה משמאל: מרוץ / אזור / סירה / דניאל. מופיע רק בצביטה או בגלגלת ונעלם אחרי כשנייה וחצי; התחנות מגנטיות רכות, בלי "שאיבה" לגלובוס; "אזור" = אקסודוס ולפחות שלוש סירות'},
  {n:97, key:'menu5',     scr:'sim', sel:'#lyr',               name:'התפריט: חמש קטגוריות לפי שאלות הקורא — נקודת ציון, תנאי הטבע, המרוץ, הדרך קדימה, המסע והניתוח (שם גם "שאלות" והיומן)'},
  {n:98, key:'pos',       scr:'sim', sel:'#capPosW',           name:'"נקודת ציון": משפט ביחס למקום מוכר, קואורדינטות, השעה אצל דניאל, מתג קווי אורך ורוחב (בגלובוס, עם 40° ו-50° דרום)'},
  {n:99, key:'nature',    scr:'sim', sel:'#capNatW',           name:'"תנאי הטבע": מתג לכל הדמיה (רוח, גל, זרם, שושנת הרוחות) עם הנתון של הרגע, והרוח מול כיוון השיט'},
  {n:100,key:'cur-flat',  scr:'sim', chip:true,                name:'הזרם מעל המים: החיצים שוכבים על פני הים, עבים וברורים'},
  {n:101,key:'radar',     scr:'sim', sel:'#radar',             name:'"המרוץ": רדאר — אקסודוס במרכז, כל סירה לפי כיוון ומרחק, מספר המקום ליד כל נקודה, ומתחת שם ומרחק לקרובות ולמובילה; המשואה באופק'},
  {n:102,key:'ahead',     scr:'sim', sel:'#capAheadW',         name:'"הדרך קדימה": עד נקודת החובה ועד הסיום, איפה צפוי להיות בעוד יממה (הערכה + הטעות האופיינית), וקישור ל-24 השעות הקרובות'},
  {n:103,key:'scrub-big', scr:'globe', sel:'#scrub',           name:'ציר הזמן בגלובוס: גבוה ועבה יותר, וה-play בעיגול לצידו, באותו גובה'},
  {n:104,key:'fc-anchor', scr:'globe', chip:true,              name:'התחזית בגלובוס מתחילה בדיוק איפה שהסירה על המסך — בלי קפיצה ובלי קו שחוזר על עצמו'},
  {n:105,key:'globe-wind', scr:'globe', chip:true,              name:'"תנאי הטבע" בגלובוס: חץ רוח במקום של כל סירה (Open-Meteo, מהארכיון של הבוט) — השכבה מתאימה את עצמה לגובה'}
];
