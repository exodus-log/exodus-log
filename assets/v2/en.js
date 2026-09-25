/* ===== v2/en.js — English for יומן אקסודוס (i-english-toggle, 25.9.2026) =====
   נטען רק כשהשפה היא אנגלית (ראו את הסקריפט הקטן בראש page.html). מה שיש כאן:
   1. D — מילון של מקטעי מלל מדויקים (כמו שהם יושבים בצומתי הטקסט, אחרי trim), כולל aria-label ו-title.
   2. P — שמות מקומות; N — שמות הסקיפרים לפי המעקב הרשמי (YB, RaceSetup, נבדק 25.9.2026).
   3. R — כללים למקטעים שיש בהם מספר או שם.
   4. faq() — "שאלות" באנגלית, מלאה, עם אותם מספרים חיים מ-data.js.
   5. MutationObserver שמתרגם כל מלל עברי שנכתב לדף, גם אחרי שהוא משתנה. מה שלא נמצא — נשאר כמו שהוא.
   הכלל: תרגום נאמן, בלי להוסיף ובלי לפרש. הסיפור והניתוח לא מתורגמים — הם ירדו מהאתר. */
(function(){
'use strict';
var P={
 'אוסטרליה':'Australia','אורוגוואי':'Uruguay','אי הפסחא':'Easter Island','איי אוקלנד':'Auckland Islands','איי הנסיך אדוארד':'Prince Edward Islands',
 'איי סנדוויץ׳ הדרומיים':'South Sandwich Islands','איי פוקלנד':'Falkland Islands','איי צ׳טהם':'Chatham Islands','איי צ׳טהאם':'Chatham Islands',
 'איי קרגלן':'Kerguelen Islands','איי קרוזה':'Crozet Islands','אינדונזיה':'Indonesia','איסלנד':'Iceland','אירופה':'Europe','אירלנד':'Ireland',
 'אמסטרדם וסן פול':'Amsterdam and Saint-Paul','אמסטרדם וסן-פול':'Amsterdam and Saint-Paul','אמריקה הדרומית':'South America','אמריקה הצפונית':'North America',
 'אנגולה':'Angola','אנטארקטיקה':'Antarctica','אסיה':'Asia','אסנשן':'Ascension','האי אסנסיון':'Ascension Island','אפריקה':'Africa','ארגנטינה':'Argentina',
 'ארצות הברית':'United States','ברזיל':'Brazil','בריטניה':'Britain','גרינלנד':'Greenland','ג׳ורג׳יה הדרומית':'South Georgia','דרום אפריקה':'South Africa',
 'האוקיינוס האטלנטי הדרומי':'South Atlantic Ocean','האוקיינוס האטלנטי הצפוני':'North Atlantic Ocean','האוקיינוס הארקטי':'Arctic Ocean',
 'האוקיינוס הדרומי':'Southern Ocean','האוקיינוס ההודי':'Indian Ocean','האוקיינוס השקט הדרומי':'South Pacific Ocean','האוקיינוס השקט הצפוני':'North Pacific Ocean',
 'האי בובה':'Bouvet Island','האי גוף':'Gough Island','האי הרד':'Heard Island','האי קמפבל':'Campbell Island','האיים האזוריים':'the Azores',
 'האיים הקנריים':'the Canary Islands','הובארט':'Hobart','הודו':'India','הים הערבי':'Arabian Sea','הים הצפוני':'North Sea','הים הקריבי':'Caribbean Sea',
 'הים התיכון':'Mediterranean Sea','המפרץ האוסטרלי הגדול':'Great Australian Bight','טסמניה':'Tasmania','טרינדאדה':'Trindade','האי טרינדאדה':'Trindade Island',
 'טריסטן דה קונה':'Tristan da Cunha','טריסטן דה קוניה':'Tristan da Cunha','ים וודל':'Weddell Sea','ים טסמן':'Tasman Sea','ים סקוטיה':'Scotia Sea','ים רוס':'Ross Sea',
 'ישראל':'Israel','כף הורן':'Cape Horn','כף התקווה הטובה':'Cape of Good Hope','כף ורדה':'Cape Verde','איי כף ורדה':'Cape Verde Islands','כף לואין':'Cape Leeuwin',
 'כף פיניסטרה':'Cape Finisterre','לה סאבל ד׳אולון':'Les Sables-d’Olonne','לה סאבל־ד׳אולון':'Les Sables-d’Olonne','לנזרוטה':'Lanzarote','מאוריטניה':'Mauritania',
 'מאוריציוס':'Mauritius','מדגסקר':'Madagascar','מדיירה':'Madeira','מדירה':'Madeira','מפרץ ביסקאיה':'Bay of Biscay','מפרץ בנגל':'Bay of Bengal','מפרץ גינאה':'Gulf of Guinea',
 'מצר דרייק':'Drake Passage','מקסיקו':'Mexico','מרוקו':'Morocco','ניו זילנד':'New Zealand','נמיביה':'Namibia','סנגל':'Senegal','סנט הלנה':'Saint Helena','ספרד':'Spain',
 'פורטוגל':'Portugal','פרו':'Peru','פרננדו דה נורוניה':'Fernando de Noronha','פרננדו די נורוניה':'Fernando de Noronha','צרפת':'France','צ׳ילה':'Chile','קנדה':'Canada',
 'תעלת מוזמביק':'Mozambique Channel','סלעי סנט פול':'St Peter and St Paul Rocks','איי באונטי':'Bounty Islands','איי אנטיפודס':'Antipodes Islands',
 'טיירה דל פואגו':'Tierra del Fuego','חוף צ׳ילה':'the coast of Chile','חוף ארגנטינה':'the coast of Argentina','חוף אורוגוואי':'the coast of Uruguay',
 'חוף ברזיל':'the coast of Brazil','חוף דרום אפריקה':'the coast of South Africa','חוף נמיביה':'the coast of Namibia','חוף אנגולה':'the coast of Angola',
 'חוף אוסטרליה':'the coast of Australia','חוף פורטוגל':'the coast of Portugal','חוף ספרד':'the coast of Spain','חוף צרפת':'the coast of France',
 'חוף מרוקו':'the coast of Morocco','חוף סהרה המערבית':'the coast of Western Sahara','חוף מאוריטניה':'the coast of Mauritania','חוף סנגל':'the coast of Senegal',
 'חוף מערב אפריקה':'the West African coast','פראיה, בירת כף ורדה':'Praia, capital of Cape Verde','דקר':'Dakar','קייפטאון':'Cape Town','החוף הקרוב':'the nearest coast',
 'הסיום':'the finish','נקודת החובה הבאה':'the next mark','אקסודוס':'Exodus'};
/* הסקיפרים — לפי השמות ב-FLEET (data.js), מול RaceSetup של YB */
var N={'כריסטנסן':'Christensen','קרדליה':'Kerdelhué','קֶרְדֶלְיֶה':'Kerdelhué','קנטיני':'Cantini','פינסקי':'Pinsky','דה־בור':'deBoer','דה-בור':'deBoer',
 'גיו':'Guillou','גִיוּ':'Guillou','יאלצ׳ין':'Yalçın','נימן':'Nyman','לולס':'Lawless','קווסת׳':'Kveseth','ווטון':'Wootton','מסיקומר':'Messikommer',
 'רוסלי':'Rosli','וודסייד':'Woodside','לודולו':'Lodolo','בשקרדש':'Beşkardeş','בֶּשְׂקַרְדֶש':'Beşkardeş','נוישפר':'Neuschafer','קירסטן נוישפר':'Kirsten Neuschafer'};
var ORD={'ראשון':'1st','שני':'2nd','שלישי':'3rd','רביעי':'4th','חמישי':'5th','שישי':'6th','שביעי':'7th','שמיני':'8th','תשיעי':'9th','עשירי':'10th'};
var DIR={'צפונה':'north','צפון-מזרחה':'northeast','מזרחה':'east','דרום-מזרחה':'southeast','דרומה':'south','דרום-מערבה':'southwest','מערבה':'west','צפון-מערבה':'northwest',
 'צפונית':'north','צפונית-מזרחית':'northeast','מזרחית':'east','דרומית-מזרחית':'southeast','דרומית':'south','דרומית-מערבית':'southwest','מערבית':'west','צפונית-מערבית':'northwest',
 'צפון':'N','צפון־מזרח':'NE','מזרח':'E','דרום־מזרח':'SE','דרום':'S','דרום־מערב':'SW','מערב':'W','צפון־מערב':'NW'};
function pl(s){ s=String(s).trim(); if(P[s]) return P[s]; if(N[s]) return N[s];
  if(/^ה/.test(s)===false&&P['ה'+s]) return P['ה'+s]; return null; }
function nm(s){ s=String(s).trim(); return N[s]||pl(s)||s; }
function ord(s){ return ORD[s]||s; }
function ago(s){ s=s.trim(); if(s==='לפני פחות משעה') return 'less than an hour ago'; var m;
  if(s==='לפני שעה') return 'an hour ago'; if(s==='לפני שעתיים') return '2 hours ago'; if(s==='לפני יום') return 'a day ago'; if(s==='לפני יומיים') return '2 days ago';
  if((m=s.match(/^לפני (\d+) שע׳$/))) return m[1]+' h ago'; if((m=s.match(/^לפני (\d+) ימים$/))) return m[1]+' days ago'; return null; }

var D={
/* ---- הכותרת, המסך הראשון והפס העליון ---- */
'יומן אקסודוס':'Exodus Log','דניאל פינסקי':'Daniel Pinsky','מקיף את העולם לבד':'sailing around the world alone',
'יומן אקסודוס — דניאל פינסקי בגולדן גלוב':'Exodus Log — Daniel Pinsky in the Golden Globe Race',
'אצל דניאל':'at Daniel’s','UTC':'UTC','ישראל':'Israel','שלושה שעונים':'Three clocks','נתוני הרגע':'Right now',
'נתוני הרגע: תאריך, מיקום, רוח, גל, זרם ושעונים':'Right now: date, position, wind, waves, current and clocks',
'רוח':'Wind','גל':'Waves','זרם':'Current','לחץ':'Pressure','עננות':'Cloud','ראות':'Visibility','גשם':'Rain','אוויר / מים':'Air / sea',
'תחזית':'Forecast','יציב':'steady','יורד, ב־3 שעות':'falling, over 3 h','עולה, ב־3 שעות':'rising, over 3 h','נ״צ':'Fix',
'מייל עד קו הסיום':'miles to the finish','עד קו הסיום':'to the finish','איפה אקסודוס עכשיו':'Where Exodus is now',
'עוד: רוח, גל, זרם, שעונים, מפה, רצועת הזמן והשכבות':'More: wind, waves, current, clocks, map, timeline and layers','פחות: חזרה למסך הראשון':'Less: back to the first screen',
'עוד':'More','פחות':'Less',
/* ---- העיגול והתפריט ---- */
'המפתח: השכבות, מה שמאחורי ההדמיה':'The key: layers, what’s behind the simulation','השכבות':'Layers',
'נקודת ציון':'Position','תנאי הטבע':'Conditions','המרוץ':'Race','הדרך קדימה':'Ahead','המסע':'Voyage',
'קווי אורך ורוחב':'Latitude and longitude lines','לנווט כמו דניאל: בלי GPS, עם סקסטנט':'Navigate like Daniel: no GPS, with a sextant',
'מה מוצג בהדמיה':'What the simulation shows','שושנת הרוחות':'Wind rose','מוצג':'shown','מוסתר':'hidden','מוצגת':'shown','מוסתרת':'hidden',
'24 השעות הקרובות, שעה אחר שעה':'The next 24 hours, hour by hour','הצי, קנה המידה ו-24 השעות':'The fleet, the scale and the next 24 hours',
'מילים לדניאל':'Words for Daniel','שאלות':'Questions','שאלות והגדרות':'Questions and settings','שאלות ותשובות':'Questions and answers','סגירה':'Close',
'שיתוף היומן':'Share the log','קפה לבונה האתר':'A coffee for the site’s builder','הקישור הועתק':'Link copied','התקנה':'Install',
'גובה המבט: מאיפה מסתכלים':'View height: where you look from','מרוץ':'Race','אזור':'Region','סירה':'Boat','דניאל':'Daniel',
'גררו את הפס שלמטה אחורה, עד יומיים: הים, הרוח והאור של אותה שעה. הסימנים הקטנים — זריחה ושקיעה.':'Drag the bar below back in time, up to two days: the sea, the wind and the light of that hour. The small marks are sunrise and sunset.',
'היומן: 48 השעות האחרונות':'The log: the last 48 hours','היומן: אחורה בזמן עד יומיים. ימינה — עכשיו':'The log: back in time up to two days. Right end — now',
'נגן את היומיים האחרונים':'Play the last two days','נגן את המסע מהזינוק':'Play the voyage from the start','עצור':'Pause','המשך אל התחזית':'Continue into the forecast',
'פס זמן: מהזינוק ועד עכשיו':'Timeline: from the start until now','פס זמן: מהזינוק ועד עכשיו, ומשם תחזית ל-72 שעות':'Timeline: from the start until now, then a 72-hour forecast',
'זינוק':'Start','מה מסומן על המים ובאוויר':'What is marked on the water and in the air',
'רדאר המרוץ: הסירות סביב אקסודוס, לפי כיוון ומרחק':'Race radar: the boats around Exodus, by bearing and distance',
'מפת המיקומים, הצי מסביב ב-900 מייל. הקשה פותחת את המסע: הצי, קנה המידה, 24 השעות הקרובות והסקסטנט':'Position map, the fleet within 900 miles. Tap to open the voyage: the fleet, the scale, the next 24 hours and the sextant',
'גרירה מסובבת לכל כיוון, גם אל מתחת למים. צביטה או גלגלת: פנימה עד הסיפון, החוצה עד הגלובוס':'Drag to look in any direction, even under water. Pinch or scroll: in to the deck, out to the globe',
/* ---- השכבות: מלל ---- */
'נקודת הציון האחרונה':'Last position fix','ידוע':'known','מודל':'model','מקור':'source','המים כאן:':'Sea temperature here:',
'נגד הרוח':'into the wind','הרוח מהצד':'wind on the beam','עם הרוח':'with the wind','— נגד הרוח.':'— into the wind.','— הרוח מהצד.':'— wind on the beam.','— עם הרוח.':'— with the wind.',
'איי כף ורדה':'Cape Verde Islands','רוח הסחר':'Trade winds','אזור הדממה':'The Doldrums','רוח הסחר הדרומית':'Southeast trade winds','למה הים כחול':'Why the sea is blue',
'עשרה איים געשיים, תשעה מהם מיושבים, כ-570 ק״מ מול חוף מערב אפריקה. הגבוה שבהם, הר הגעש פוגו (2,829 מ׳), התפרץ לאחרונה ב-2014. הזרמים הקרים שעולים מול החוף האפריקני לא מגיעים לכאן, ולכן הים סביב האיים חם יותר.':'Ten volcanic islands, nine of them inhabited, about 570 km off the coast of West Africa. The highest, the Fogo volcano (2,829 m), last erupted in 2014. The cold currents that well up off the African coast don’t reach this far, so the sea around the islands is warmer.',
'אי געשי קטן של ברזיל, כ-1,100 ק״מ מול החוף שלה. גרים בו רק אנשי חיל הים הברזילאי וקבוצת חוקרים קטנה. הפסגה הגבוהה, פיקו דזז׳אדו, מתנשאת ל-620 מ׳.':'A small volcanic island belonging to Brazil, about 1,100 km off its coast. Only Brazilian Navy personnel and a small group of researchers live there. The highest peak, Pico Desejado, rises to 620 m.',
'אי געשי קטן של ברזיל, כ-1,100 ק״מ מול החוף שלה. גרים בו רק אנשי חיל הים הברזילאי וקבוצת חוקרים קטנה. הפסגה הגבוהה, פיקו דזז׳אדו, מתנשאת ל-620 מ׳. זו נקודת החובה הבאה במסלול.':'A small volcanic island belonging to Brazil, about 1,100 km off its coast. Only Brazilian Navy personnel and a small group of researchers live there. The highest peak, Pico Desejado, rises to 620 m. It is the next mark of the course.',
'בקווי הרוחב האלה נושבת רוח הסחר: רוח יציבה מצפון־מזרח, שזורמת מהלחץ הגבוה הסובטרופי אל קו המשווה. ספינות מפרש השתמשו בה מאות שנים כדי לחצות את האוקיינוס.':'At these latitudes the trade wind blows: a steady wind from the northeast, flowing from the subtropical high toward the equator. Sailing ships used it for centuries to cross the ocean.',
'ליד קו המשווה נפגשות רוחות הסחר מהצפון ומהדרום. המלחים קוראים לאזור הזה "הדממה" בגלל ימים ארוכים כמעט בלי רוח, וענני סערה שמתפרצים בתוכם. המיקום המדויק שלו זז עם העונות.':'Near the equator the trade winds from the north and the south meet. Sailors call this zone “the Doldrums” for its long days with almost no wind, broken by bursts of thunderstorms. Its exact position shifts with the seasons.',
'מדרום לקו המשווה רוח הסחר נושבת מדרום־מזרח, מהלחץ הגבוה של דרום האטלנטי אל קו המשווה.':'South of the equator the trade wind blows from the southeast, from the South Atlantic high toward the equator.',
'המים בולעים את האור האדום ומשאירים לעין את הכחול. ליד חופים הים מקבל גוון ירוק או חום מחלקיקים ומשקעים שצפים בו.':'Water absorbs red light and leaves blue for the eye. Near coasts the sea turns green or brown from particles and sediment floating in it.',
'הארבעים השואגים':'the Roaring Forties','החמישים הזועמים':'the Furious Fifties',
/* ---- רדאר ---- */
'צפון':'N','מזרח':'E','דרום':'S','מערב':'W',
/* ---- התחזית, הגלובוס ---- */
'הגלובוס: המסלול, הצי ונקודות החובה':'The globe: the course, the fleet and the marks','חזרה אל הסירה':'Back to the boat',
'הופלג':'sailed','הערכה, 72 שעות':'estimate, 72 h','הצי':'fleet','לילה':'night','נותר, סכמטי':'remaining, schematic','נקודת חובה':'mark',
'קו חוף: Natural Earth | כדור הארץ: NASA Blue Marble | מסלול ומיקומים: YB Tracking':'Coastline: Natural Earth | Earth: NASA Blue Marble | Course and positions: YB Tracking',
'הגלובוס נטען':'Globe loaded','הגלובוס לא נטען. רענון בדרך כלל פותר את זה':'The globe didn’t load. Refreshing usually fixes it',
'הגלובוס לא נטען. רענון הדף בדרך כלל פותר את זה.':'The globe didn’t load. Refreshing the page usually fixes it.',
'חלק מהדף לא נטען. רענון בדרך כלל פותר את זה':'Part of the page didn’t load. Refreshing usually fixes it',
'נתוני מזג האוויר לא נטענו. המיקום והמספרים מהמעקב נכונים; הרוח, הגל והזרם אינם מוצגים':'Weather data didn’t load. The position and tracker numbers are correct; wind, waves and current are not shown',
'עברנו לבד למצב קל: המכשיר הזה התקשה עם ההדמיה המלאה. אפשר להחזיר מהתפריט':'Switched to light mode: this device struggled with the full simulation. You can switch back in the menu',
'הופעל לבד: המכשיר הזה התקשה עם ההדמיה המלאה. הקשה מחזירה אותה':'Turned on automatically: this device struggled with the full simulation. Tap to bring it back',
'פחות חלקיקים ורזולוציה נמוכה יותר, למכשירים שמתחממים':'Fewer particles and lower resolution, for devices that run hot',
'פחות חלקיקים ורזולוציה נמוכה יותר. הקשה מחזירה את ההדמיה המלאה':'Fewer particles and lower resolution. Tap to bring back the full simulation',
'הדפדפן הזה לא מריץ WebGL, אז ההדמיה לא תוצג. המסע והצי זמינים מהתפריט.':'This browser doesn’t run WebGL, so the simulation can’t be shown. The voyage and the fleet are available from the menu.',
'הדפדפן הזה לא מריץ WebGL, אז ההדמיה לא תוצג. כל השאר בעמוד זמין כרגיל.':'This browser doesn’t run WebGL, so the simulation can’t be shown. Everything else on the page works as usual.',
'ההדמיה נעצרה':'Simulation paused',
'תחזית, לא מדידה':'forecast, not a measurement','מהארכיון של מודל מזג האוויר':'from the weather model’s archive','בערך במקום שבו הוא עכשיו':'at roughly where he is now','הצפוי במקום שבו הוא עכשיו':'expected where he is now',
/* ---- "המסע" ---- */
'המרוץ כרגע':'The race right now','כמה זה, בעצם':'How much is that, really','24 השעות הקרובות':'The next 24 hours','לנווט כמו דניאל':'Navigate like Daniel',
'בלי GPS. שמש, אופק ושעון מדויק.':'No GPS. Sun, horizon and an accurate clock.',
'מקום':'Place','עד קו הסיום, מייל':'To finish, mi','פער מהמוביל, מייל':'Behind leader, mi','24 שעות, מייל':'24 h, mi',
'הצי לפי המרחק שנותר לכל סירה עד קו הסיום':'The fleet by each boat’s distance to the finish','אל קו הסיום':'to the finish','מיילים מאחורי המוביל':'miles behind the leader',
'מיילים מאחורי המוביל · הזנב שמאחורי כל סירה: הדרך שעשתה ב־24 השעות האחרונות':'miles behind the leader · the tail behind each boat: its last 24 hours',
'מובילה':'leading','מוביל':'leader','אין סירה בטווח של 25 מייל ממנה.':'No boat within 25 miles of her.',
'גובה הגל עכשיו':'Wave height now','ימים בים':'Days at sea','כל נקודה היא יום בים':'Each dot is a day at sea','מהירות':'Speed',
'הליכה':'walking','ריצה':'running','אופניים':'cycling','עכשיו':'now','יום':'Day','מטר':'m','קשר':'kn','ק״מ':'km','מ׳':'m',
'בגובה קומה של בית':'the height of one storey','בגובה בית של שתי קומות':'the height of a two-storey house','בגובה של אדם':'the height of a person',
'עד הברך':'knee-high','עד המותן':'waist-high','עד החזה':'chest-high','עד הכתפיים':'shoulder-high',
'יותר מהיקף כדור הארץ כולו':'more than the whole circumference of the Earth','פחות מהיקף כדור הארץ':'less than the Earth’s circumference',
'קצב של ריצה קלה':'an easy jogging pace','קצב של ריצה מהירה':'a fast running pace','קצב של הליכה מהירה':'a brisk walking pace','קצב של רכיבה על אופניים':'a cycling pace','לאט מהליכה':'slower than walking',
'רוח, קשר':'Wind, kn','גובה גל, מטר':'Wave height, m','· הקו הדק: משבים':'· thin line: gusts','רוח ומשבים לפי שעה':'Wind and gusts by hour','גובה גל לפי שעה':'Wave height by hour',
'היום של דניאל: זריחה, שקיעה, ואיפה השמש עכשיו':'Daniel’s day: sunrise, sunset, and where the sun is now','זריחה':'sunrise','שקיעה':'sunset',
'מה כאן נמדד, מה מחושב ומה מודל':'What here is measured, what is calculated, and what is a model',
'נמדד.':'Measured.','מחושב.':'Calculated.','מחושב במדויק.':'Calculated precisely.','מודל.':'Model.','אחורה בזמן.':'Back in time.','סימנים.':'Symbols.','מוסק.':'Inferred.',
'מצויר מתצלומים שלה.':'Drawn from photos of her.','סכמטי.':'Schematic.','רוח הרפאים.':'The ghost.',
'המיקום, מקובץ המעקב הלווייני של המרוץ. דיווח כל ארבע שעות; מה שביניהם הוא השלמה.':'The position, from the race’s satellite tracking feed. A report every four hours; what lies between is interpolated.',
'הכיוון והמהירות: מהקטע שבין שתי נקודות הציון האחרונות, בדרך כלל ארבע שעות. המרחקים, המקום בצי והפער: מהמעקב, באותה שיטה כמו הלוח הרשמי.':'Course and speed: from the leg between the last two position fixes, usually four hours. Distances, place in the fleet and gaps: from the tracker, by the same method as the official leaderboard.',
'השמש, הירח, שלושת השעונים וקו היום והלילה על הגלובוס: אסטרונומיה, לרגע שעל השעון של הדף. השעה ״אצל דניאל״ היא הזמן המקומי הממוצע לפי קו האורך של הסירה.':'The sun, the moon, the three clocks and the day–night line on the globe: astronomy, for the moment on the page’s clock. The time “at Daniel’s” is local mean time for the boat’s longitude.',
'הרוח, הגלים, הזרם, הלחץ, העננות, הראות והטמפרטורות, ממודל אטמוספרי ואוקיינוגרפי ולא ממדידה בסירה. כיוון: ‎±20–30 מעלות. ‏G בשורה העליונה הוא המשבים: הרוח החזקה ביותר ברגעים הקצרים שבתוך השעה. הגל בים פועם בזמן המחזור האמיתי שלו, ונחשי הזרם נעים במהירות האמיתית שלו.':'Wind, waves, current, pressure, cloud, visibility and temperatures come from an atmospheric and ocean model, not from measurements on the boat. Direction: ±20–30 degrees. G in the top line is the gusts: the strongest wind in the short moments within the hour. The sea swells at its real period, and the current streaks move at its real speed.',
'כשגוררים את רצועת הזמן לעבר, הרוח, הגל והזרם באים מארכיון של אותו מודל, שעה אחר שעה. המיקום הוא השלמה בין נקודות הציון, והכיוון והמהירות מחושבים ממנו. איפה שאין ארכיון הרצועה מעומעמת ואי אפשר לגרור לשם. מספרי המרוץ בתחתית נשארים של נקודת הציון האחרונה.':'When you drag the timeline into the past, wind, waves and current come from that model’s archive, hour by hour. The position is interpolated between fixes, and course and speed are calculated from it. Where there is no archive the bar is dimmed and you can’t drag there. The race numbers at the bottom stay those of the last position fix.',
'על טבעת המצפן: נוצת רוח כמו במפות מזג אוויר (נוצה מלאה 10 קשר, חצי נוצה 5), חץ גלי לזרם כמו במפות ימיות, קשתות לגל, מעוין ליעד הבא וקו כפול לכיוון ההתקדמות.':'On the compass ring: a wind barb as on weather maps (full feather 10 kn, half feather 5), a wavy arrow for current as on nautical charts, arcs for waves, a diamond for the next mark and a double line for the direction of progress.',
'מצב המפרשים: אין עליו שום נתון. הוא נגזר מזווית הרוח ומעוצמתה. כרגע:':'The sail plan: there is no data on it. It is inferred from the wind angle and strength. Right now:',
'הגוף הלבן, הסיפון הקדמי הכתום, מעקה הטיק האפור, הסוכך הכתום, ה-7 והלוח הכתום על המפרש הראשי, ודגל ישראל על האחורן. המידות: באבא 35, לפי השלט שעל הרציף.':'The white hull, the orange foredeck, the grey teak rail, the orange dodger, the 7 and the orange panel on the mainsail, and the Israeli flag on the backstay. The dimensions: a Baba 35, per the sign on the dock.',
'המסלול שנותר על הגלובוס הוא קו בין נקודות החובה, לא תחזית ניווט.':'The remaining course on the globe is a line between the marks, not a routing forecast.',
'נוישפר של 2022: המסלול שלה כפי שהמעקב הרשמי משדר אותו על השעון של המרוץ הזה. ההשוואה היא בין המרחקים לסיום באותו רגע.':'Neuschafer in 2022: her track as the official tracker broadcasts it on this race’s clock. The comparison is between distances to finish at the same moment.',
'ג׳נואה + סטייסייל':'genoa + staysail',
'פרויקט עצמאי. לא אתר רשמי של המרוץ ולא של הצוות של דניאל. המספרים הם תמונת מצב מנקודת הציון האחרונה, לא שידור חי.':'An independent project. Not an official site of the race or of Daniel’s team. The numbers are a snapshot from the last position fix, not a live feed.',
'מעקב:':'Tracking:','YB Tracking, המעקב הרשמי':'YB Tracking, the official tracker','· דיווחים:':'· Reports:','· מזג אוויר:':'· Weather:',
'· כדור הארץ: NASA Blue Marble · קו חוף: Natural Earth · מפה: MapLibre':'· Earth: NASA Blue Marble · Coastline: Natural Earth · Map: MapLibre',
'שתי מדידות, מיקום אחד':'Two sights, one position','אתם כאן':'You are here','נוגעת באופק':'touching the horizon','תפסתי':'Got it','ומהמקום שלכם?':'And from where you are?',
'חזרה לאקסודוס':'Back to Exodus','אצלכם':'where you are','השמש בזנית':'The sun is at the zenith',
'הגלובוס: קווי המיקום מהמדידות':'The globe: the position lines from the sights','זווית הסקסטנט: כמה מורידים את השמש':'Sextant angle: how far down you bring the sun',
'מבט דרך הסקסטנט: השמש, האופק, ותמונת השמש שמורידים אליו':'The view through the sextant: the sun, the horizon, and the sun’s image you bring down to it',
'גררו את השמש הכתומה למטה, עד שהיא נוגעת באופק.':'Drag the orange sun down until it touches the horizon.','זה מה שסקסטנט עושה: מראה שמורידה את השמש, וסולם שמודד בכמה.':'That is what a sextant does: a mirror that brings the sun down, and a scale that measures by how much.',
'קו, לא נקודה. בשביל נקודה צריך מדידה שנייה, אחרי שהשמש זזה.':'A line, not a point. For a point you need a second sight, after the sun has moved.',
'שני הקווים נחתכים בשתי נקודות, ורק אחת מהן על המסלול: שם הסירה.':'The two lines cross at two points, and only one of them is on the course: that is where the boat is.',
'כך דניאל מנווט: סקסטנט אמיתי ושעון מדויק. GPS אסור במרוץ.':'This is how Daniel navigates: a real sextant and an accurate clock. GPS is banned in the race.',
'הדפדפן הזה לא נותן מיקום.':'This browser doesn’t provide a location.','מבקש מיקום מהדפדפן…':'Asking the browser for your location…','המיקום נשאר במכשיר שלכם. הוא לא נשלח לשום מקום.':'Your location stays on your device. It isn’t sent anywhere.',
'אצלכם השמש נמוכה מדי בשעות המדידה היום. נסו שוב בעונה אחרת, או חזרו לאקסודוס.':'Where you are, the sun is too low at the hours for a sight today. Try again in another season, or go back to Exodus.',
'בלי מיקום אי אפשר למדוד מהמקום שלכם. אפשר לנסות שוב, או להישאר עם אקסודוס.':'Without a location we can’t take a sight from where you are. You can try again, or stay with Exodus.',
/* ---- מילים לדניאל ---- */
'משפט אחד לדניאל, מכאן ועכשיו. הוא נשמר עם התאריך ועם המקום שבו הסירה נמצאת עכשיו. ההודעות לא מתפרסמות באתר — הן נאספות בשביל דניאל, לסוף המסע.':'One sentence for Daniel, from here and now. It is saved with the date and with where the boat is right now. Messages aren’t published on the site — they are collected for Daniel, for the end of the voyage.',
'נשמרים רק ההודעה, החתימה אם נכתבה, הזמן ומקום הסירה. כתובת ה‑IP לא נשמרת — רק סימן חד-כיווני ליום אחד, כדי לעצור הצפה.':'Only the message, the signature if given, the time and the boat’s position are saved. Your IP address isn’t stored — only a one-way mark for one day, to stop flooding.',
'ההודעה':'Message','חתימה (לא חובה)':'Signature (optional)','שליחה':'Send','שולח…':'Sending…','נשמר. תודה.':'Saved. Thank you.','צריך לכתוב משהו קודם.':'Write something first.',
'אפשר לשלוח עד חמש הודעות ביום. מחר שוב.':'Up to five messages a day. Try again tomorrow.','לא נשמר. אפשר לנסות שוב בעוד רגע.':'Not saved. You can try again in a moment.','לא נשמר — אין חיבור. אפשר לנסות שוב.':'Not saved — no connection. You can try again.',
/* ---- שאלות: כותרת והגדרות ---- */
'הגדרות':'Settings','קול':'Sound','מצב קל':'Light mode','מסך מלא':'Full screen','התקנה כאפליקציה':'Install as an app',
'© 2026 יומן אקסודוס · הקוד פתוח, ברישיון MIT':'© 2026 Exodus Log · open source, MIT license',
'קול מושתק, להפעלה':'Sound off — tap to turn on','קול פועל, להשתקה':'Sound on — tap to mute','קול: פועל':'Sound: on','הדפדפן הזה לא תומך בקול מסונתז':'This browser doesn’t support synthesized sound',
'אפשר להוסיף את היומן למסך הבית':'You can add the log to your home screen','אפשר להוסיף למסך הבית מתפריט הדפדפן':'You can add it to your home screen from the browser menu',
'אפשר להוסיף את היומן למסך הבית מתפריט הדפדפן, ואז הוא נפתח על כל המסך, כמו אפליקציה.':'You can add the log to your home screen from the browser menu, and then it opens full screen, like an app.',
'באייפון: שיתוף ← ״הוספה למסך הבית״':'On iPhone: Share → “Add to Home Screen”','באייפון: שיתוף ← ״הוספה למסך הבית״. מהסמל שנוצר היומן נפתח על כל המסך, כמו אפליקציה.':'On iPhone: Share → “Add to Home Screen”. From the new icon the log opens full screen, like an app.',
'נתוני המעקב לא נטענו כרגע. רענון בדרך כלל פותר את זה.':'The tracking data didn’t load right now. Refreshing usually fixes it.',
'אקסודוס בים, בתנאים של הרגע הזה':'Exodus at sea, in the conditions of this moment',
'רצועת הזמן: שבוע, וההווה באמצע. שמאלה אחורה בזמן, ימינה קדימה. הקשה במרכז או הקשה כפולה מחזירות להווה':'Timeline: a week, with the present in the middle. Left goes back in time, right goes forward. Tap the middle or double-tap to return to the present',
', רוח ב־':', wind at','מתוך':'of','עב':'עב',
'היה ב־':'Was at','· גל':'· waves','דקות':'min','שעות':'hours','שעה':'hour','שעתיים':'2 hours','ימים':'days','יומיים':'2 days','מכאן':'from here',
'עד':'to','אחריה':'after it',
'עברית':'עברית','English':'English'
};
for(var k in P) if(!D[k]) D[k]=P[k];
for(var k2 in N) if(!D[k2]) D[k2]=N[k2];

var R=[
 [/^(רוח|גל|זרם), ([\d.]+) (קשר|מטר), (מוצג|מוצגת|מוסתר|מוסתרת)$/,function(m){ return D[m[1]]+', '+m[2]+' '+(m[3]==='קשר'?'kn':'m')+', '+D[m[4]]; }],
 [/^יום (\d+)$/,function(m){ return 'Day '+m[1]; }],
 [/^יום (\d+) מתוך כ[-־]250$/,function(m){ return 'Day '+m[1]+' of about 250'; }],
 [/^מתוך כ[-־]250$/,function(){ return 'of about 250'; }],
 [/^\+(\d+) ימים$/,function(m){ return '+'+m[1]+' days'; }],
 [/^בופור (\d+)$/,function(m){ return 'Beaufort '+m[1]; }],
 [/^מצב ים (\d+)$/,function(m){ return 'Sea state '+m[1]; }],
 [/^נ״צ (.+ UTC) · (לפני .+)$/,function(m){ var a=ago(m[2]); return a?'Fix '+m[1]+' · '+a:null; }],
 [/^, (לפני .+)$/,function(m){ var a=ago(m[1]); return a?', '+a:null; }],
 [/^(לפני .+)$/,function(m){ return ago(m[1]); }],
 [/^מול (.+)$/,function(m){ var p=pl(m[1]); return p?'off '+p:null; }],
 [/^(\d[\d,]*) מייל$/,function(m){ return m[1]+' mi'; }],
 [/^מייל$/,function(){ return 'mi'; }],
 [/^מייל\.$/,function(){ return 'mi.'; }],
 [/^מייל ·$/,function(){ return 'mi ·'; }],
 [/^מייל · עד הסיום:$/,function(){ return 'mi · to the finish:'; }],
 [/^מייל דרומה מכאן$/,function(){ return 'mi south of here'; }],
 [/^מייל (צפונה|דרומה|מזרחה|מערבה|צפון-מזרחה|צפון-מערבה|דרום-מזרחה|דרום-מערבה) מכאן$/,function(m){ return 'mi '+DIR[m[1]]+' of here'; }],
 [/^עד (.+) \(נקודת החובה הבאה\):$/,function(m){ var p=pl(m[1]); return p?'To '+p+' (the next mark):':null; }],
 [/^עד (.+)\.$/,function(m){ var p=pl(m[1]); return p?'to '+p+'.':null; }],
 [/^(.+) ·$/,function(m){ var p=nm(m[1]); return p!==m[1]?p+' ·':null; }],
 [/^מייל (צפונית|צפונית-מזרחית|מזרחית|דרומית-מזרחית|דרומית|דרומית-מערבית|מערבית|צפונית-מערבית) ל(.+)\.$/,function(m){ var p=pl(m[2])||pl('ה'+m[2]); return p?'miles '+DIR[m[1]]+' of '+p+'.':null; }],
 [/^ב(ה?אוקיינוס .+?)(, כ־|, ליד (.+)\.|\.)$/,function(m){ var o=pl(m[1])||pl('ה'+m[1].replace(/^ה/,'')); if(!o) return null;
    if(m[2]===', כ־') return 'In the '+o+', about'; if(m[3]){ var p=pl(m[3]); return p?'In the '+o+', near '+p+'.':null; } return 'In the '+o+'.'; }],
 [/^חצה את קו (\d+)° דרום, "(.+)"(, ב־)?$/,function(m){ return 'Crossed '+m[1]+'° South, “'+(D[m[2]]||m[2])+'”'+(m[3]?', on':''); }],
 [/^רוח מכיוון$/,function(){ return 'Wind from'; }],
 [/^\(בופור (\d+)\), והוא שט לכיוון$/,function(m){ return '(Beaufort '+m[1]+'), and he is sailing'; }],
 [/^ב־$/,function(){ return 'at'; }],
 [/^, ב־$/,function(){ return ', on'; }],
 [/^— (נגד הרוח|הרוח מהצד|עם הרוח)\.$/,function(m){ return '— '+D[m[1]]+'.'; }],
 [/^בעוד יממה, לפי התחזית: כ־$/,function(){ return 'In 24 hours, per the forecast: about'; }],
 [/^\(הערכה; בבדיקה לאחור הטעות האופיינית ביממה — כ־$/,function(){ return '(estimate; in back-testing the typical 24-hour error is about'; }],
 [/^\(הערכה\)$/,function(){ return '(estimate)'; }],
 [/^מייל\)$/,function(){ return 'mi)'; }],
 [/^(.+) · מקום (\S+) ·$/,function(m){ return nm(m[1])+' · '+ord(m[2])+' ·'; }],
 [/^אקסודוס: מקום (\S+) מתוך (\d+) · מרחקים במייל ימי ממנו$/,function(m){ return 'Exodus: '+ord(m[1])+' of '+m[2]+' · distances in nautical miles from her'; }],
 [/^מקום (\S+)$/,function(m){ return ORD[m[1]]?ORD[m[1]]+' place':null; }],
 [/^(.+) · אקסודוס$/,function(m){ return nm(m[1])+' · Exodus'; }],
 [/^(.+) · פרשה$/,function(m){ return nm(m[1])+' · retired'; }],
 [/^(\d+) מייל$/,function(m){ return m[1]+' mi'; }],
 [/^רוח בין$/,function(){ return 'Wind between'; }],
 [/^ל־$/,function(){ return 'and'; }],
 [/^קשר, גל עד$/,function(){ return 'kn, waves up to'; }],
 [/^מטר\. מודל, לא מדידה\.$/,function(){ return 'm. Model, not a measurement.'; }],
 [/^מייל מאחוריו,$/,function(){ return 'miles behind him,'; }],
 [/^מייל ימי מאחוריו,$/,function(){ return 'nautical miles behind him,'; }],
 [/^מההקפה\.$/,function(){ return 'of the circumnavigation.'; }],
 [/^המסלול כולו: ([\d,]+) ק״מ, פי ([\d.]+) מקו המשווה$/,function(m){ return 'The whole course: '+m[1]+' km, '+m[2]+'× the equator'; }],
 [/^המסלול כולו ארוך פי ([\d.]+) מהיקף כדור הארץ$/,function(m){ return 'The whole course is '+m[1]+'× the Earth’s circumference'; }],
 [/^גל של ([\d.]+) מטר ליד אדם בגובה 1\.75 מטר, באותו קנה מידה$/,function(m){ return 'A '+m[1]+' m wave next to a 1.75 m person, to the same scale'; }],
 [/^([\d.]+) קילומטר לשעה על סולם של הליכה, ריצה ואופניים$/,function(m){ return m[1]+' km/h on a scale of walking, running and cycling'; }],
 [/^‎?([\d.]+) קמ״ש · ערכי ההשוואה מקורבים$/,function(m){ return m[1]+' km/h · comparison values are approximate'; }],
 [/^פסגה כל (\d+) שניות · האיש בציור: 1\.75 מ׳$/,function(m){ return 'A crest every '+m[1]+' s · the man in the drawing: 1.75 m'; }],
 [/^היום של דניאל: זריחה (.+), שקיעה (.+), עכשיו (.+)$/,function(m){ return 'Daniel’s day: sunrise '+m[1]+', sunset '+m[2]+', now '+m[3]; }],
 [/^בגובה בניין של (\d+) קומות$/,function(m){ return 'the height of a '+m[1]+'-storey building'; }],
 [/^\. סירה אחת בטווח של 25 מייל ממנה\. מול קירסטן נוישפר, המנצחת ב־2022, באותו רגע במרוץ שלה:$/,function(){ return '. One boat within 25 miles of her. Against Kirsten Neuschafer, the 2022 winner, at the same moment in her race:'; }],
 [/^\. (\S+) סירות בטווח של 25 מייל ממנה\. מול קירסטן נוישפר, המנצחת ב־2022, באותו רגע במרוץ שלה:$/,function(m){ return '. '+m[1]+' boats within 25 miles of her. Against Kirsten Neuschafer, the 2022 winner, at the same moment in her race:'; }],
 [/^\. אין סירה בטווח של 25 מייל ממנה\. מול קירסטן נוישפר, המנצחת ב־2022, באותו רגע במרוץ שלה:$/,function(){ return '. No boat within 25 miles of her. Against Kirsten Neuschafer, the 2022 winner, at the same moment in her race:'; }],
 [/^מייל (לפניה|אחריה)\.$/,function(m){ return 'miles '+(m[1]==='לפניה'?'ahead of her':'behind her')+'.'; }],
 [/^השמש בגובה$/,function(){ return 'The sun is at an altitude of'; }],
 [/^מדידה ראשונה · (.+)$/,function(m){ return 'First sight · '+m[1].replace(' אצל דניאל',' at Daniel’s').replace(' אצלכם',' where you are'); }],
 [/^מדידה שנייה · (.+)$/,function(m){ return 'Second sight · '+m[1].replace(' אצל דניאל',' at Daniel’s').replace(' אצלכם',' where you are'); }],
 [/^(\d\d:\d\d) אצל דניאל$/,function(m){ return m[1]+' at Daniel’s'; }],
 [/^· אצל דניאל$/,function(){ return '· at Daniel’s'; }]
];
var HE=/[\u0590-\u05FF]/;
function tr(s){ if(!s||!HE.test(s)) return null; var t=s.trim(), lead=s.slice(0,s.indexOf(t.charAt(0))), tail=s.slice(lead.length+t.length), r=D[t];
  if(r==null){ for(var i=0;i<R.length;i++){ var m=t.match(R[i][0]); if(m){ r=R[i][1](m); if(r!=null) break; } } }
  if(r==null) return null; if(/־$/.test(t)&&!tail&&!/\s$/.test(r)) r+=' '; return lead+r+tail; }
var CTX={SMALL:{'יום':' days','ימים':' days'}};

/* ---- שאלות באנגלית: אותו מבנה ואותם מספרים חיים כמו בעברית (hud.js, faqData) ---- */
function faq(c){ var FIX=c.FIX, N=c.N, me=c.me, up=c.up, dn=c.dn, lead=c.lead, gate=c.gate, rest=c.rest, near50=c.near50, tw=c.tw, near=c.near,
  n=c.faqN, esc=function(s){ return c.faqEsc(nm(s)); }, src=function(u){ return c.faqSrc(u,'source'); },
  mi=function(d){ return d<1?'less than a mile':n(d)+' mi'; }, gap=function(d){ return 'by '+mi(d); },
  S1='https://en.wikipedia.org/wiki/Sunday_Times_Golden_Globe_Race', RT='https://goldengloberace.com/the-route/', RU='https://goldengloberace.com/the-rules/',
  SK='https://goldengloberace.com/skippers/daniel-pinsky/', EX='https://exodussail.com/', G=gate?(pl(gate)||gate):'';
  var NEXT={'לנזרוטה':'After it: the northeast trade winds and the Cape Verde Islands, then the Doldrums near the equator.',
   'טרינדאדה':'On the way there: the Doldrums near the equator — a band of light, shifting winds and thunderstorm clouds — and then the southeast trade winds. After Trindade the course turns east, toward the Cape of Good Hope and the Southern Ocean.',
   'כף התקווה הטובה':'After the cape the Southern Ocean begins: the Indian Ocean, strong westerlies and long swells, all the way to Cape Leeuwin in Australia.',
   'כף לואין':'After it: southern Australia, and a short gate near Hobart in Tasmania.',
   'הובארט':'A short gate near Tasmania, with no contact with anyone. After it: the Pacific, the longest and most isolated stretch of the course, all the way to Cape Horn.',
   'כף הורן':'After the cape the way turns north, up the Atlantic, home.'};
  var where=near?'Off '+esc(FIX.nearLandName)+', '+n(FIX.nearLand)+' mi from the nearest land':'In the '+(pl(c.ocean)||c.ocean);
  return [
  {t:'The race', q:[
   ['What is the Golden Globe Race?','A solo, non-stop, unassisted race around the world, in boats and with equipment that existed in 1968. It recreates the Sunday Times “Golden Globe” race of that year: nine started and only one finished — Robin Knox-Johnston, after 312 days at sea aboard Suhaili. He was the first person to sail around the world alone without stopping. The race was revived in 2018, on its 50th anniversary, and this is its third edition.'+src(S1)],
   ['When did they start, and from where?','On 6 September 2026, at midday, from Les Sables-d’Olonne on the Atlantic coast of France. '+n(N)+' boats started, and the finish line is there too.'],
   ['What is the course?','East around the world, leaving the three great capes — Good Hope, Leeuwin and Horn — to port. South down the Atlantic through two marks: Lanzarote in the Canary Islands, and Trindade Island off Brazil. From there east around the Cape of Good Hope, across the Indian Ocean north of the Crozet and Kerguelen Islands, around Cape Leeuwin in Australia, to a short gate near Hobart in Tasmania. Then across the Pacific south of New Zealand, around Cape Horn, and north up the Atlantic back to Les Sables-d’Olonne.'+src(RT)],
   ['How long is the course?','The organisers estimate about 30,000 nautical miles of sailing. The tracker’s course line, which joins the marks by the shortest lines, is shorter: '+n(Math.round(FIX.totalNm/100)*100)+' mi. The difference is the real way — no boat sails in a straight line, because the wind doesn’t blow by the map.'+src(RT)],
   ['How long does it take?','For the leaders — seven to eight months. Jean-Luc Van Den Heede won in 2018 after about 212 days, and Kirsten Neuschafer won in 2022 after about 234 days, the first woman to win the Golden Globe. This race is expected to finish between April and June 2027.'+src('https://en.wikipedia.org/wiki/2022_Golden_Globe_Race')],
   ['How many finish?','Few. In 1968 one of nine finished. In 2018 five of 18 finished, plus one in the Chichester class (see “The rules”). In 2022 three of 16 finished, plus two in the Chichester class.'+src('https://en.wikipedia.org/wiki/2018_Golden_Globe_Race')],
   ['How is it different from the Vendée Globe?','The Vendée Globe starts from the same port and is the other extreme: modern 60-foot racing boats with foils, satellite navigation and real-time forecasts. The record there, from 2024–25, is about 65 days. In the Golden Globe the same circumnavigation takes three times as long or more, and the test is endurance, navigation and maintenance — not speed.'+src('https://en.wikipedia.org/wiki/2024%E2%80%932025_Vend%C3%A9e_Globe')]]},
  {t:'The rules', q:[
   ['Which boats are allowed?','Sailing boats 32 to 36 feet long (about 10 to 11 m), of a design drawn before 1988 and built in at least 20 copies, with a full keel — a keel that runs the whole length of the bottom — and a rudder attached to its trailing edge. These are heavy, stable boats, much slower than racing boats, and built to take punishment rather than break.'+src(RU)],
   ['Why no GPS, and how do they navigate?','Because only what was possible in 1968 is allowed. They navigate with a sextant — an instrument that measures the angle between the sun, the moon or a star and the horizon — with an accurate clock, tables and paper charts. From the angle and the time the position is worked out by hand, when the sky is clear. On cloudy days they navigate by dead reckoning: course, speed and time since the last sight.'+src(RU)],
   ['So how do we know where he is?','The boat carries the race’s satellite tracking unit, with its own GPS, which sends the position ashore. It is sealed from the sailor: Daniel can’t see what it sends. All the positions on this site come from that unit.'+src(RU)],
   ['Who is he allowed to talk to?','With race control — on a handheld satellite phone and a short-message device, for safety and reporting. On the radio he may talk with family, journalists and other boats. He may not receive routing: personal outside advice on where to sail according to the weather.'+src(RU)],
   ['What happens if something breaks?','He repairs it alone, with what is on board. Anchoring, receiving equipment or help from anyone else counts as a “stop”. For emergencies the boat carries modern safety equipment and a sealed box with a GPS and a satellite phone. Breaking the seal is allowed, but whoever does so drops out of the main ranking.'+src(RU)],
   ['What is the Chichester class?','A sailor who stops once, or breaks the seal on the emergency box, moves to a class named after Francis Chichester, who sailed around the world alone in 1966–67 with one stop in Sydney. They can continue and finish, but no longer compete for the win. A second stop means leaving the race.'+src(RU)]]},
  {t:'Daniel and Exodus', q:[
   ['Who is Daniel Pinsky?','Israeli, 35 according to the race website, and the first Israeli to take part in the Golden Globe. At 14 he started at the maritime boarding school in Akko, served in the Israeli Navy’s coast guard and studied mechanical engineering. He is a cruising sailor who lives on a boat, and has sailed more than 20,000 miles across several oceans — including a full loop of the Atlantic in 2021–2024: from Israel through the Mediterranean to the Caribbean, Central and South America, and back.'+src(SK)],
   ['Why is he doing this race?','In his words, to represent Israel and to test his limits — “to see who I become when nothing is left but the wind, the waves and willpower.”'+src(SK)],
   ['What boat is she?','A <span dir="ltr">Baba 35</span> built in 1980, designed by naval architect Robert Perry: 10.67 m long and 3.51 m wide. A cruising boat, not a racing boat — a heavy hull, a full keel, a pointed stern like the bow and a lot of wood. Daniel bought her in October 2025 and refitted her in the Caribbean and in France. Her sail number is 07.'+src(SK)],
   ['Why is she called Exodus?','Daniel tells the story himself, <a href="'+EX+'" rel="noopener" target="_blank">on his own site →</a>']]},
  {t:'Right now', q:[
   ['Where is he now?',where+', at <b class="n" dir="ltr">'+c.pos+'</b>. At the last position fix he was sailing <b class="n">'+FIX.sog.toFixed(1)+'</b> kn, on a course of <b class="n">'+c.cog+'</b>.'],
   ['What place is he in?',ordEn(FIX.rank)+' of '+n(N)+', by the distance he has left to the finish (see “How it’s measured”).'+
     (up?' Ahead of him: '+esc(up[4])+', '+gap(me[5]-up[5])+(dn?';':'.'):'')+(dn?' behind him: '+esc(dn[4])+', '+gap(dn[5]-me[5])+'.':'')+
     (near50>=2?' '+n(near50)+' boats are within 50 miles of him on the leaderboard, so his place can change with every update.':'')],
   ['How far is he from the leader?',FIX.rank===1?'He is the leader.'+(dn?' '+esc(dn[4])+' is behind him, '+gap(dn[5]-me[5])+'.':''):n(FIX.dtf-lead[5])+' mi in distance to finish behind '+esc(lead[4])+', who leads the fleet.'],
   ['How far has he sailed, and how far is left?','This is day '+FIX.dayN+' of the race. Since the start he has sailed '+n(FIX.sailed)+' mi by the position fixes — in fact a little more, because between fixes he doesn’t sail in a straight line. According to the tracker '+n(FIX.dtf)+' mi remain. In the last 24 hours he got '+n(FIX.dmg24)+' mi closer to the finish.'],
   ['How does he compare with past winners?',(typeof FIX.ghost==='number')?'The official tracker also broadcasts the track of Kirsten Neuschafer, the 2022 winner, on this race’s clock. At the same moment in her race, Daniel is '+n(Math.abs(FIX.ghost))+' mi '+(FIX.ghost>=0?'ahead of her':'behind her')+' in distance to finish. Most of the way, and the Southern Ocean, is still ahead of him.':'The comparison with the previous winner isn’t available in this update.'],
   ['What lies ahead?',(gate?'The next mark: '+esc(gate)+', '+n(FIX.toGate)+' mi in a straight line. '+(NEXT[gate]||''):'')]]},
  {t:'How it’s measured', q:[
   ['How is the place decided?','By the distance left to the finish — <span dir="ltr">DTF, Distance To Finish</span> — not by who looks ahead on the map. The tracker measures a straight line from the boat to the next mark, and adds the length of the rest of the course, which is the same for everyone.'+
     (gate?' For Daniel right now: '+n(FIX.toGate)+' mi to '+esc(gate)+', plus '+n(rest)+' mi for the rest of the course — '+n(FIX.dtf)+' mi in total. In practice, whoever is closer to '+esc(gate)+' in a straight line is ahead.':'')],
   ['Why does someone look behind on the map, yet rank ahead?','Picture circles around '+(gate?esc(gate):'the next mark')+', like rings on water. Whoever is on a smaller circle is ahead — even if on the map they look further north or far from the others. So two boats can be far apart at sea and still be neck and neck on the leaderboard.'+
     (tw&&tw.sea>=40&&tw.sea>=4*tw.dd?' Right now, for example: Daniel and '+esc(tw.n)+' are '+n(tw.sea)+' mi apart at sea, and the gap between them on the leaderboard is '+mi(tw.dd)+'.':'')],
   ['How often is the position updated?','The unit sends a position fix about every four hours, each boat at a different time. The site updates itself within about half an hour of a new Exodus fix, and checks itself against the official leaderboard. It isn’t a live feed: the numbers are a snapshot of the last fix — here, '+c.fixEn+'. And since each boat reports at a different time, the places on the leaderboard can jump between updates even when the differences on the water are small.'],
   ['What are a nautical mile and a knot?','A nautical mile is 1.852 km — one minute of latitude, which makes it the unit of navigation. A knot is one nautical mile per hour: 6 knots is about 11 km/h. For a boat like Exodus, 150 miles in a day is a very good day.'],
   ['Does Daniel know what place he is in?','Not directly. The tracker is sealed from him, and he can’t see the map and the leaderboard that you see. What he knows about the rest of the fleet comes from his contact with race control and from radio calls.'+src(RU)]]},
  {t:'This site', q:[
   ['How do I use the site?','The page is a simulation of Daniel and the boat, at the real place and time. Drag to look around — even under water. The circle in the corner opens five categories, each adding something to the simulation: Position (where he is), Conditions (wind, waves and current, each with a switch), The race (a radar of the boats around him), The road ahead (how far is left and the forecast) and The voyage (the sea and the wind in the past hours, the fleet and the next 24 hours). Here, under “Questions”, there are also settings: sound, light mode and installing as an app. Zooming out — pinch, or the mouse wheel — takes you all the way to the globe with the whole fleet.'],
   ['What am I seeing — is it a photo?','No. It is a reconstruction: the position from the tracking unit, and the wind, waves, current and clouds from a weather model for that point and that hour. The sun and the stars are calculated for the place and the time, and the boat is drawn from photos of Exodus. Nothing here is measured on the boat itself.'],
   ['A coffee for the site’s builder','Exodus Log is an independent, unofficial site, with no connection to Daniel or to his team. The coffee here is for the site’s builder. Want to support Daniel and the voyage itself? That happens <a href="https://exodussail.com/support/" rel="noopener" target="_blank">on his team’s site</a> — where you’ll also find regular updates, explanations from the community and Daniel’s story in his own words.'+'<br><a class="cup-go" href="https://buymeacoffee.com/exodus.log" rel="noopener" target="_blank">Buy the site’s builder a coffee →</a>','faqCup'],
   ['Who is behind this site, and how do I get in touch?','Exodus Log is an independent, unofficial site, with no connection to the race, to Daniel or to his team. Want to support Daniel and the voyage itself? That happens <a href="https://exodussail.com/support/" rel="noopener" target="_blank">on his team’s site</a>, where you’ll also find regular updates, explanations from the community and Daniel’s story in his own words. The code of this site is open source, under the MIT license. Comments, mistakes and ideas — <a href="https://github.com/exodus-log/exodus-log/issues" rel="noopener" target="_blank">via GitHub</a>.'],
   ['Where does the data come from?','Positions — <a href="https://pro.yb.tl/ggr2026/" rel="noopener" target="_blank">the race’s official tracker</a> (YB Tracking). Reports — <a href="https://goldengloberace.com/" rel="noopener" target="_blank">the race website</a>. Wind, waves and currents — <a href="https://open-meteo.com/" rel="noopener" target="_blank">Open-Meteo</a>, a model and not a measurement on the boat. Earth — NASA Blue Marble; coastline — Natural Earth; map — MapLibre. Stars — the Yale Bright Star Catalogue; moon — <a href="https://svs.gsfc.nasa.gov/4720" rel="noopener" target="_blank">NASA’s Scientific Visualization Studio</a> (LRO); Milky Way — <a href="https://www.eso.org/public/images/eso0932a/" rel="noopener" target="_blank">ESO/S. Brunier</a>, under <a href="https://creativecommons.org/licenses/by/4.0/" rel="noopener" target="_blank">CC BY 4.0</a>. The sky colour is calculated from the scattering of light in the air, not photographed. And about Daniel: <a href="'+SK+'" rel="noopener" target="_blank">his page on the race website</a>.']]}
  ]; }
function ordEn(r){ var s=['th','st','nd','rd'], v=r%100; return r+(s[(v-20)%10]||s[v]||s[0])+' place'; }

/* ---- ההחלה: כל צומת טקסט ותכונה בדף ---- */
var ATTR=['aria-label','title','placeholder','alt'];
var CTXID={raceLine:{'אקסודוס':'Exodus is in place'}};
function doText(n){ var v=n.nodeValue, p=n.parentNode, c=p&&(CTXID[p.id]||CTX[p.tagName]), r=(c&&c[v.trim()])||tr(v); if(r!=null&&r!==v) n.nodeValue=r; }
function doEl(e){ if(e.nodeType!==1) return; if(e.tagName==='SCRIPT'||e.tagName==='STYLE'||e.tagName==='TEXTAREA') return;
  for(var i=0;i<ATTR.length;i++){ var a=e.getAttribute(ATTR[i]); if(a&&HE.test(a)){ var r=tr(a); if(r!=null) e.setAttribute(ATTR[i],r); } }
  var w=document.createTreeWalker(e,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT,null), x;
  while((x=w.nextNode())){ if(x.nodeType===3){ var p=x.parentNode; if(p&&(p.tagName==='SCRIPT'||p.tagName==='STYLE'||p.tagName==='TEXTAREA')) continue; doText(x); }
    else for(var j=0;j<ATTR.length;j++){ var b=x.getAttribute(ATTR[j]); if(b&&HE.test(b)){ var r2=tr(b); if(r2!=null) x.setAttribute(ATTR[j],r2); } } } }
var mo=new MutationObserver(function(L){ for(var i=0;i<L.length;i++){ var m=L[i];
  if(m.type==='characterData') doText(m.target);
  else if(m.type==='attributes'){ var t=m.target, v=t.getAttribute(m.attributeName); if(v&&HE.test(v)){ var r=tr(v); if(r!=null) t.setAttribute(m.attributeName,r); } }
  else for(var j=0;j<m.addedNodes.length;j++){ var a=m.addedNodes[j]; if(a.nodeType===3) doText(a); else doEl(a); } } });
function start(){ doEl(document.body); var t=document.title, r=tr(t); if(r) document.title=r;
  mo.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:ATTR}); }
if(document.body) start(); else document.addEventListener('DOMContentLoaded',start);
window.EXO_EN={tr:tr,faq:faq,pl:pl,nm:nm,D:D};
})();
