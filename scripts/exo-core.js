/* exo-core.js — החישוב של סקריפט העדכונים, בלי רשת ובלי קבצים.
   אותו קוד רץ ב-Node (GitHub Actions) ובדפדפן (לבדיקות), ולכן אין בו require ואין בו import.
   כל מספר שיוצא מכאן מחושב מקובץ המעקב הרשמי (YB, ggr2026) או מ-Open-Meteo. שום מספר לא ממוצא. */
(function () {
'use strict';

var NM = 1852, R_NM = 3440.065, H = 3600, DAY = 86400;
var RACE_START = 1788697800;        /* 6.9.2026 12:30 UTC */
var ME = 4, GHOST = 940;            /* פינסקי; נוישפר 2022, המנצחת */

/* שמות בעברית, כפי שהם כתובים ב-data.js. הסקריפט מעדיף את מה שכבר כתוב בקובץ, וזה רק גיבוי */
var NAMES = { 1:'כריסטנסן', 2:'קֶרְדֶלְיֶה', 3:'קנטיני', 4:'פינסקי', 5:'דה־בור', 6:'גִיוּ', 8:'יאלצ׳ין',
  9:'נימן', 10:'לולס', 11:'קווסת׳', 12:'ווטון', 13:'מסיקומר', 14:'רוסלי', 15:'וודסייד', 16:'לודולו', 17:'בֶּשְׂקַרְדֶש' };

/* היעד הבא במסלול: רק סימונים שמפליגים אליהם ומקיפים אותם, לפי הסדר (NOR 2026 §C.1.3, ובדיוק כמו שהם
   רשומים במעקב הרשמי, RaceSetup.poi, נבדק 22.9.2026). name: בלי ה״א הידיעה — הדף כותב ל׳ לפניו.
   מה שלא כאן, בכוונה:
   - ‏45°S בין 40° ל-110° מזרח, 50°S 168°E, ‏49°S בין 150° ל-110° מערב, 50°S 90°W — אלה גבולות ("להשאיר מימין":
     אזור אסור מדרום להם), לא יעדים. הם על הגלובוס (course.js), אבל "היעד הבא" לא מצביע עליהם.
   - "שער קייפטאון" ו"שער פונטה דל אסטה" היו בהודעה המקדימה (Pre-NOR) ואינם במסלול הסופי ולא במעקב. */
var MARKS = [
  { name:'לנזרוטה',   lat:28.853,  lon:-13.821, note:'סימון החוף בקנריים' },
  { name:'טרינדאדה',  lat:-20.503, lon:-29.327, note:'האי טרינדאדה, מול ברזיל, להשאיר משמאל' },
  { name:'כף לואין',  lat:-34.375, lon:115.147, note:'להשאיר משמאל' },
  { name:'הובארט',    lat:-42.98,  lon:147.335, note:'עצירת חובה של 90 דקות' },
  { name:'כף הורן',   lat:-55.984, lon:-67.267, note:'להשאיר משמאל' },
  { name:'הסיום',     lat:46.48,   lon:-1.79 }
];

/* שמות לחופים, לפי הנקודה הקרובה ביותר ביבשה. הראשון שמתאים מנצח, ולכן איים קטנים לפני היבשות.
   [latMin, latMax, lonMin, lonMax, שם] */
var COASTS = [
  [27.5, 29.5, -18.3, -13.3, 'האיים הקנריים'], [32.3, 33.2, -17.4, -16.2, 'מדירה'],
  [36.8, 39.8, -31.5, -24.9, 'האיים האזוריים'], [14.7, 17.3, -25.5, -22.5, 'איי כף ורדה'],
  [-21, -20, -29.5, -28.5, 'האי טרינדאדה'], [-4.2, -3.6, -32.7, -32.2, 'פרננדו די נורוניה'],
  [1, 1.1, -29.5, -29.2, 'סלעי סנט פול'], [-8.1, -7.8, -14.5, -14.3, 'האי אסנסיון'],
  [-16.1, -15.8, -5.9, -5.6, 'סנט הלנה'], [-40.5, -37, -13, -9.5, 'טריסטן דה קוניה'],
  [-54.6, -54.3, 3.2, 3.5, 'האי בובה'], [-47.1, -46.5, 37.5, 38.1, 'איי הנסיך אדוארד'],
  [-46.6, -45.9, 50, 52.5, 'איי קרוזה'], [-50, -48.4, 68.5, 70.7, 'איי קרגלן'],
  [-53.3, -52.8, 72.5, 74, 'האי הרד'], [-39, -37.7, 77.4, 77.7, 'אמסטרדם וסן-פול'],
  [-44, -39.5, 143.5, 148.6, 'טסמניה'], [-48, -47.6, 179, 179.2, 'איי באונטי'],
  [-49.8, -49.5, 178.6, 178.9, 'איי אנטיפודס'], [-44.5, -43.5, -177, -175.8, 'איי צ׳טהאם'],
  [-51, -50.4, 165.8, 166.4, 'איי אוקלנד'], [-52.7, -52.4, 169, 169.3, 'האי קמפבל'],
  [-48, -34, 166, 179, 'ניו זילנד'], [-53, -51, -61.5, -57.5, 'איי פוקלנד'],
  [-55.1, -53.9, -38.5, -35.5, 'ג׳ורג׳יה הדרומית'],
  [-56.1, -55.6, -67.9, -66.9, 'כף הורן'], [-56, -52.3, -76, -63.5, 'טיירה דל פואגו'],
  [-52.3, -18, -76, -66, 'חוף צ׳ילה'], [-52.3, -34.9, -69, -56, 'חוף ארגנטינה'],
  [-34.9, -33.6, -58.5, -53.2, 'חוף אורוגוואי'], [-33.8, 5, -60, -34, 'חוף ברזיל'],
  [-35, -28, 15, 33, 'חוף דרום אפריקה'], [-29, -17, 11, 17, 'חוף נמיביה'],
  [-17.5, -5, 11, 14.5, 'חוף אנגולה'], [-40, -10, 112, 155, 'חוף אוסטרליה'],
  [36, 44, -10, -6.2, 'חוף פורטוגל'], [36, 44, -6.2, 3, 'חוף ספרד'], [43, 51, -5, 3, 'חוף צרפת'],
  [27.67, 36, -14, -1, 'חוף מרוקו'], [20.77, 27.67, -18, -8, 'חוף סהרה המערבית'],
  [16, 20.77, -18, -15, 'חוף מאוריטניה'], [12.3, 16, -18, -16, 'חוף סנגל'],
  [4, 12.3, -18, -7, 'חוף מערב אפריקה']
];

/* ---------- גאומטריה ---------- */
var rad = Math.PI / 180;
function dist(a, b, c, d) {             /* מייל ימי, מעגל גדול */
  var p1 = a * rad, p2 = c * rad, dp = (c - a) * rad, dl = (d - b) * rad;
  var h = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  return 2 * R_NM * Math.asin(Math.min(1, Math.sqrt(h)));
}
function brg(a, b, c, d) {
  var p1 = a * rad, p2 = c * rad, dl = (d - b) * rad;
  var y = Math.sin(dl) * Math.cos(p2), x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (Math.atan2(y, x) / rad + 360) % 360;
}
function dest(a, b, br, nm) {            /* נקודה במרחק ובכיוון נתונים */
  var d = nm / R_NM, t = br * rad, p1 = a * rad, l1 = b * rad;
  var p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(t));
  var l2 = l1 + Math.atan2(Math.sin(t) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
  return [p2 / rad, ((l2 / rad + 540) % 360) - 180];
}
function lerpLon(a, b, f) { var d = b - a; if (d > 180) d -= 360; if (d < -180) d += 360; var x = a + d * f; return ((x + 540) % 360) - 180; }

/* ---------- פענוח AllPositions3 (https://github.com/rahra/decyb) ---------- */
function parseYB(e) {
  var t = new DataView(e), i = t.getUint8(0), a = 1 === (1 & i), s = 2 === (2 & i), n = 4 === (4 & i), r = 8 === (8 & i), o = t.getUint32(1), l = 5, c = [];
  while (l < e.byteLength) {
    var u = t.getUint16(l); l += 2; var h = t.getUint16(l), d = new Array(h); l += 2; var g = void 0;
    for (var v = 0; v < h; v++) {
      var p = t.getUint8(l), m = {};
      if (128 === (128 & p)) {
        var w = t.getUint16(l); l += 2; var y = t.getInt16(l); l += 2; var M = t.getInt16(l); l += 2;
        if (a) { m.alt = t.getInt16(l); l += 2 }
        if (s) { var f = t.getInt16(l); l += 2; m.dtf = g.dtf + f; if (n) { m.lap = t.getUint8(l); l++ } }
        if (r) { m.pc = t.getInt16(l) / 32e3; l += 2 }
        w = 32767 & w; m.lat = g.lat + y; m.lon = g.lon + M; m.at = g.at - w; if (r) m.pc = g.pc + m.pc
      } else {
        var T = t.getUint32(l); l += 4; var b = t.getInt32(l); l += 4; var L = t.getInt32(l); l += 4;
        if (a) { m.alt = t.getInt16(l); l += 2 }
        if (s) { var x = t.getInt32(l); l += 4; m.dtf = x; if (n) { m.lap = t.getUint8(l); l++ } }
        if (r) { m.pc = t.getInt32(l) / 21e6; l += 4 }
        m.lat = b; m.lon = L; m.at = o + T
      }
      d[v] = m; g = m
    }
    d.forEach(function (z) { z.lat /= 1e5; z.lon /= 1e5 }); c.push({ id: u, moments: d })
  }
  return c;
}

/* מסלול של סירה, עולה בזמן, רק עד asOf. dtf במיילים. */
function tracksFrom(parsed, asOf) {
  var out = {};
  parsed.forEach(function (b) {
    var m = b.moments.filter(function (x) { return x.at <= asOf; })
      .map(function (x) { return { at: x.at, lat: x.lat, lon: x.lon, dtf: x.dtf / NM }; })
      .sort(function (p, q) { return p.at - q.at; });
    if (m.length) out[b.id] = m;
  });
  return out;
}
/* מיקום ומרחק-לסיום בזמן t, באינטרפולציה בין שתי נקודות ציון. לפני/אחרי הקצוות: הקצה. */
function at(tr, t) {
  if (t <= tr[0].at) return tr[0];
  var last = tr[tr.length - 1];
  if (t >= last.at) return last;
  var lo = 0, hi = tr.length - 1;
  while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (tr[mid].at <= t) lo = mid; else hi = mid; }
  var a = tr[lo], b = tr[hi], f = (t - a.at) / (b.at - a.at);
  return { at: t, lat: a.lat + (b.lat - a.lat) * f, lon: lerpLon(a.lon, b.lon, f), dtf: a.dtf + (b.dtf - a.dtf) * f };
}

/* ---------- מסלול המרוץ: מרחק לסיום של כל נקודת חובה ---------- */
function courseDtf(nodes) {
  var cum = new Array(nodes.length); cum[nodes.length - 1] = 0;
  for (var i = nodes.length - 2; i >= 0; i--) cum[i] = cum[i + 1] + dist(nodes[i].lat, nodes[i].lon, nodes[i + 1].lat, nodes[i + 1].lon);
  return function (lat, lon) {
    var best = 1e9, k = 0;
    for (var i = 0; i < nodes.length; i++) { var d = dist(lat, lon, nodes[i].lat, nodes[i].lon); if (d < best) { best = d; k = i; } }
    return { dtf: cum[k], node: k, off: best };
  };
}

/* ---------- היבשה הקרובה (Natural Earth 1:50m, assets/geo/land50.js) ---------- */
function decodeLand(land) {
  return land.map(function (poly) {
    var r = poly[0], x = 0, y = 0, pts = [], la0 = 90, la1 = -90, lo0 = 180, lo1 = -180;
    for (var i = 0; i < r.length; i += 2) {
      x += r[i]; y += r[i + 1]; var lo = x / 100, la = y / 100; pts.push([la, lo]);
      if (la < la0) la0 = la; if (la > la1) la1 = la; if (lo < lo0) lo0 = lo; if (lo > lo1) lo1 = lo;
    }
    return { pts: pts, box: [la0, la1, lo0, lo1] };
  });
}
function nearestLand(rings, lat, lon) {
  var best = { d: 1e9, lat: 0, lon: 0 }, cl = Math.cos(lat * rad);
  rings.forEach(function (g) {
    var b = g.box;                                       /* מסננת גסה: מרחק למלבן התוחם */
    var bl = Math.max(b[0], Math.min(b[1], lat)), dlon = 0;
    if (lon < b[2] || lon > b[3]) { var d1 = Math.abs(lon - b[2]), d2 = Math.abs(lon - b[3]); dlon = Math.min(d1, 360 - d1, d2, 360 - d2); }
    if (b[3] - b[2] > 300) dlon = 0;
    if (Math.hypot((bl - lat) * 60, dlon * 60 * Math.min(cl, Math.cos(bl * rad))) > best.d + 30) return;
    var p = g.pts;
    for (var i = 0; i + 1 < p.length; i++) {             /* מרחק לקטע, בהטלה מקומית */
      var ax = lerpLon(lon, p[i][1], 1) - lon, bx = lerpLon(lon, p[i + 1][1], 1) - lon;
      if (ax > 180) ax -= 360; if (ax < -180) ax += 360; if (bx > 180) bx -= 360; if (bx < -180) bx += 360;
      ax *= 60 * cl; bx *= 60 * cl; var ay = (p[i][0] - lat) * 60, by = (p[i + 1][0] - lat) * 60;
      var dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy, f = L ? -(ax * dx + ay * dy) / L : 0;
      f = Math.max(0, Math.min(1, f)); var qx = ax + dx * f, qy = ay + dy * f, d = Math.hypot(qx, qy);
      if (d < best.d) best = { d: d, lat: lat + qy / 60, lon: lon + qx / (60 * cl) };
    }
  });
  var name = null;
  for (var i = 0; i < COASTS.length; i++) { var c = COASTS[i];
    if (best.lat >= c[0] && best.lat <= c[1] && best.lon >= c[2] && best.lon <= c[3]) { name = c[4]; break; } }
  return { nm: best.d, lat: best.lat, lon: best.lon, name: name };
}

/* ---------- קריאת data.js הנוכחי ---------- */
function readData(text) {
  var f = new Function(text + '\n;return {FIX:typeof FIX!=="undefined"?FIX:null, GATE:typeof GATE!=="undefined"?GATE:null,' +
    'STORY:typeof STORY!=="undefined"?STORY:null, COND:typeof COND!=="undefined"?COND:null,' +
    'OBS_UNTIL:typeof OBS_UNTIL!=="undefined"?OBS_UNTIL:null, FLEET:typeof FLEET!=="undefined"?FLEET:null,' +
    'TRACKP:typeof TRACKP!=="undefined"?TRACKP:null};');
  var v = f();
  var m = text.match(/\n(\/\*[^*]*\*+(?:[^\/*][^*]*\*+)*\/[ \t]*\n)?var STORY\s*=\s*"[^\n]*";[^\n]*\n/);   /* המשפט נשמר מילה במילה, עם ההערה שמעליו */
  v.storyBlock = m ? m[0].replace(/^\n/, '') : null;
  return v;
}

/* ---------- החישוב ---------- */
/* in: { parsed, setup, leaderboard?, land, prev (readData), asOf? }  →  { v, warn[] }
   asOf: לחשב כאילו עכשיו asOf (לבדיקה מול data.js קיים). ברירת מחדל: הנקודה האחרונה שלו. */
function compute(inp) {
  var warn = [], prev = inp.prev || {};
  var asOf = inp.asOf || 4e9;
  /* נקודות הציון של הצי יוצאות כמעט יחד, בהפרש של שניות עד דקות. לכן הצי נחתך חצי שעה אחרי asOf,
     וכך סירה שהנקודה שלה נרשמה 40 שניות אחרי שלו לא נזרקת אחורה ארבע שעות. */
  var tr = tracksFrom(inp.parsed, asOf + 1800);
  var me = tr[ME] && tr[ME].filter(function (p) { return p.at <= asOf; });
  if (!me || !me.length) throw new Error('אין נקודות ציון לסירה ' + ME);
  tr[ME] = me;
  var T = me[me.length - 1].at, now = at(me, T);
  var names = {}; (prev.FLEET || []).forEach(function (r) { names[r[1]] = r[4]; });
  /* בלי ניקוד (22.9): היה ניקוד בשלושה שמות מתוך שש־עשרה — לא עקבי. המקף העברי (־) נשאר */
  function nm(id) { return String(names[id] || NAMES[id] || id).replace(/[\u0591-\u05BD\u05BF-\u05C7]/g, ''); }

  var racers = inp.setup.teams.filter(function (t) { return (t.tags || []).indexOf(84200) >= 0; }).map(function (t) { return t.id; });
  var status = {}; inp.setup.teams.forEach(function (t) { status[t.id] = t.status; });

  /* הצי: כל סירה בנקודה האחרונה שלה (לא מנחשים קדימה), dmg24 מ-24 שעות קודם לכן — כמו הלוח הרשמי */
  /* סירה שכבר לא מתחרה (פרשה, נפסלה) יורדת לסוף הדירוג ומסומנת (FLEET[7]=1). סטטוס כמו במעקב: RACING,
     FINISHED ואחרים. מי שסיימה נשארת בדירוג. */
  function isOut(id) { var s = String(status[id] || 'RACING').toUpperCase(); return s !== 'RACING' && s !== 'FINISHED'; }
  var fleet = racers.filter(function (id) { return tr[id]; }).map(function (id) {
    var t = tr[id], l = t[t.length - 1], tl = l.at, p = at(t, tl), p24 = at(t, tl - DAY);
    return { id: id, lat: p.lat, lon: p.lon, dtf: p.dtf, dmg24: p24.dtf - p.dtf, last: l.at, status: status[id], out: isOut(id) };
  }).sort(function (a, b) { return (a.out - b.out) || (a.dtf - b.dtf); });
  fleet.forEach(function (b, i) { b.rank = i + 1; });
  var mine = fleet.filter(function (b) { return b.id === ME; })[0];

  /* כיוון ומהירות: הקטע האחרון, מהנקודה שלפחות שלוש שעות לפני האחרונה */
  var k = me.length - 2; while (k > 0 && T - me[k].at < 3 * H) k--;
  var a = me[Math.max(0, k)];
  var legNm = dist(a.lat, a.lon, now.lat, now.lon), legH = (T - a.at) / H;
  var cog = Math.round(brg(a.lat, a.lon, now.lat, now.lon)), sog = legH > 0 ? legNm / legH : 0;

  /* מרחק שהופלג: סכום הקטעים מהזינוק */
  var sailed = 0, from = null;
  me.forEach(function (p) { if (p.at < RACE_START) return; if (from) sailed += dist(from.lat, from.lon, p.lat, p.lon); from = p; });

  /* הסירה הקרובה. כל סירה נמדדת ברגע האחרון שיש לשתיהן נקודת ציון — לא נקודה של סירה אחת מול נקודה בת ארבע
     שעות של השנייה (ב-22.9 זה נתן פעם 15 מייל ופעם 35 לאותו רגע) */
  var near = { d: 1e9, id: null };
  fleet.forEach(function (b) { if (b.id === ME || b.out) return; var tb = Math.min(T, b.last), p = at(tr[b.id], tb), q = at(me, tb);
    var d = dist(q.lat, q.lon, p.lat, p.lon); if (d < near.d) near = { d: d, id: b.id }; });

  /* רוח הרפאים: נוישפר 2022, באותו רגע. הזנת הרפאים מפגרת — משווים ברגע האחרון שיש לשתיהן */
  var ghost = null, g = tr[GHOST];
  if (g) { var tg = Math.min(T, g[g.length - 1].at); ghost = Math.round(at(g, tg).dtf - at(me, tg).dtf); if (T - tg > 6 * H) warn.push('הזנת רוח הרפאים מפגרת ' + Math.round((T - tg) / H) + ' שעות'); }
  else warn.push('אין נתוני רוח רפאים 940');

  /* נקודת החובה הבאה: הראשונה שהמרחק שלה לסיום קטן מזה שלו */
  var cd = courseDtf(inp.setup.course.nodes), gate = null, skipped = [];
  for (var i = 0; i < MARKS.length; i++) {
    var mk = MARKS[i];
    if (mk.lat == null) { skipped.push(mk.name); continue; }
    var c = cd(mk.lat, mk.lon);
    if (c.dtf < now.dtf - 1) { gate = mk; break; }
    skipped = [];
  }
  if (skipped.length) warn.push('דילוג על נקודת חובה בלי קואורדינטות: ' + skipped.join(', '));
  if (prev.FIX && gate && prev.FIX.gate !== gate.name) warn.push('נקודת החובה התחלפה: ' + prev.FIX.gate + ' ← ' + gate.name + ' (לעדכן את assets/story.js)');

  var land = inp.land ? nearestLand(inp.land, now.lat, now.lon) : null;
  if (land && !land.name) warn.push('אין שם עברי לחוף ב-' + land.lat.toFixed(2) + ',' + land.lon.toFixed(2));

  var FIX = {
    at: T, lat: +now.lat.toFixed(3), lon: +now.lon.toFixed(3), cog: cog, sog: +sog.toFixed(1),
    dtf: Math.round(now.dtf), rank: mine.rank, sailed: Math.round(sailed), dmg24: Math.round(mine.dmg24),
    nearBoat: Math.round(near.d), nearBoatName: nm(near.id),
    nearLand: land ? Math.round(land.nm) : (prev.FIX ? prev.FIX.nearLand : null),
    nearLandName: land ? (land.name || (prev.FIX && prev.FIX.nearLandName) || 'החוף הקרוב') : (prev.FIX ? prev.FIX.nearLandName : ''),
    toGate: gate ? Math.round(dist(now.lat, now.lon, gate.lat, gate.lon)) : 0, gate: gate ? gate.name : '',
    /* יום המרוץ לפי התאריך ב-UTC, כמו בדוחות הרשמיים של GGR (יום 3 = 9.9, יום 14 = 20.9). עד 22.9 היום התחלף
       ב-12:30 UTC, שעת הזינוק, ואחר הצהריים הדף הקדים את הדוח ואת הניתוח ביום. */
    dayN: Math.floor(T / DAY) - Math.floor(RACE_START / DAY),
    totalNm: Math.floor(inp.setup.course.distance * 1000 / NM), ghost: ghost
  };

  /* בדיקה מול הלוח הרשמי — רק כשמחשבים את ההווה, כי הלוח הוא תמונה של עכשיו */
  var check = null;
  if (inp.leaderboard && !inp.asOf) {
    var lt = (inp.leaderboard.tags || []).filter(function (x) { return x.id === 84200; })[0] || inp.leaderboard.tags[0];
    var lm = lt.teams.filter(function (x) { return x.id === ME; })[0];
    if (lm) {
      check = { dtfLb: lm.dtf / NM, rankLb: lm.rankR, d24Lb: lm.d24 / NM };
      check.dtfDiff = FIX.dtf - check.dtfLb; check.rankOk = check.rankLb === FIX.rank;
      if (Math.abs(check.dtfDiff) > 3) warn.push('DTF רחוק מהלוח הרשמי ב-' + check.dtfDiff.toFixed(1) + ' מייל');
      if (!check.rankOk) warn.push('דירוג ' + FIX.rank + ' מול ' + check.rankLb + ' בלוח הרשמי');
    }
  }

  var FLEET = fleet.map(function (b) {
    return [b.rank, b.id, +b.lat.toFixed(3), +b.lon.toFixed(3), nm(b.id), Math.round(b.dtf), Math.round(b.dmg24), b.out ? 1 : 0];
  });

  /* המסלול: מהזינוק, נקודה כל ~4 שעות (ליד שער המעקב שולח כל חצי שעה), ותמיד האחרונה */
  var kept = [], lastT = -1e12, run = me.filter(function (p) { return p.at >= RACE_START - H; });
  run.forEach(function (p, i) {
    if (i === run.length - 1 || p.at - lastT >= 3.8 * H) { kept.push(p); lastT = p.at; }
  });
  var TRACKP = kept.map(function (p) { return p.lat.toFixed(2) + ',' + p.lon.toFixed(2); }).join(' ');

  /* נקודות הדגימה למזג האוויר: 12 שעות אחורה על המסלול האמיתי, 36 קדימה על הקו המוקרן */
  var h0 = Math.floor(T / H) * H, p24 = at(me, T - DAY);
  var pBrg = brg(p24.lat, p24.lon, now.lat, now.lon), pSpd = dist(p24.lat, p24.lon, now.lat, now.lon) / 24;
  var samples = [];
  for (var hh = -12; hh <= 36; hh++) {
    var t = h0 + hh * H, pos;
    if (t <= T) { var q = at(me, t); pos = [q.lat, q.lon]; } else pos = dest(now.lat, now.lon, pBrg, pSpd * (t - T) / H);
    samples.push({ t: t, lat: +pos[0].toFixed(3), lon: +pos[1].toFixed(3) });
  }

  return { v: { FIX: FIX, GATE: gate ? [gate.lat, gate.lon] : prev.GATE, gateNote: gate && gate.note, FLEET: FLEET, TRACKP: TRACKP,
               OBS_UNTIL: new Date(T * 1000).toISOString().replace('.000', ''), samples: samples },
           warn: warn, check: check, projection: { brg: Math.round(pBrg), kn: +pSpd.toFixed(2) } };
}

/* ---------- Open-Meteo ---------- */
function meteoUrls(samples) {
  var lat = samples.map(function (s) { return s.lat; }).join(','), lon = samples.map(function (s) { return s.lon; }).join(',');
  var iso = function (t) { return new Date(t * 1000).toISOString().slice(0, 16); };
  var win = '&timezone=GMT&start_hour=' + iso(samples[0].t) + '&end_hour=' + iso(samples[samples.length - 1].t);
  return {
    wx: 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + win + '&wind_speed_unit=kn' +
        '&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m,pressure_msl,temperature_2m,cloud_cover,visibility,precipitation',
    sea: 'https://marine-api.open-meteo.com/v1/marine?latitude=' + lat + '&longitude=' + lon + win +
        '&hourly=wave_height,wave_period,wave_direction,ocean_current_velocity,ocean_current_direction,sea_surface_temperature'
  };
}
/* כל מיקום חוזר עם כל החלון; לוקחים מכל אחד רק את השעה שלו (האלכסון) */
function buildCond(samples, wx, sea) {
  var W = Array.isArray(wx) ? wx : [wx], S = Array.isArray(sea) ? sea : [sea];
  function pick(loc, key, t) {
    if (!loc || !loc.hourly || !loc.hourly[key]) return null;
    var i = loc.hourly.time.indexOf(new Date(t * 1000).toISOString().slice(0, 16));
    var v = i < 0 ? null : loc.hourly[key][i]; return v == null ? null : v;
  }
  function r(v, d) { if (v == null) return null; var f = Math.pow(10, d); return Math.round(v * f) / f; }
  return samples.map(function (s, i) {
    var w = W[i], m = S[i], t = s.t;
    var cur = pick(m, 'ocean_current_velocity', t), vis = pick(w, 'visibility', t);
    return [new Date(t * 1000).toISOString().slice(0, 16),
      r(pick(w, 'wind_speed_10m', t), 1), r(pick(w, 'wind_gusts_10m', t), 1), r(pick(w, 'wind_direction_10m', t), 0),
      r(pick(m, 'wave_height', t), 2), r(pick(m, 'wave_period', t), 1), r(pick(m, 'wave_direction', t), 0),
      cur == null ? null : r(cur / 1.852, 2), r(pick(m, 'ocean_current_direction', t), 0),
      r(pick(w, 'pressure_msl', t), 1), r(pick(w, 'temperature_2m', t), 1), r(pick(m, 'sea_surface_temperature', t), 1),
      r(pick(w, 'cloud_cover', t), 0), vis == null ? null : r(vis / 1000, 0), r(pick(w, 'precipitation', t), 1)];
  });
}

/* ---------- כתיבת data.js ---------- */
function q(s) { return JSON.stringify(String(s)).replace(/'/g, "\\'").replace(/^"|"$/g, "'").replace(/\\"/g, '"'); }
function render(v, prev, cond) {
  var F = v.FIX, L = [];
  L.push('/* אקסודוס · נתוני הרענון האחרון');
  L.push('   נכתב אוטומטית על ידי scripts/update-data.mjs (GitHub Actions) מקובץ המעקב הרשמי ומ-Open-Meteo. */');
  L.push('var FIX = { at:' + F.at + ', lat:' + F.lat + ', lon:' + F.lon + ', cog:' + F.cog + ', sog:' + F.sog + ',');
  L.push('            dtf:' + F.dtf + ', rank:' + F.rank + ', sailed:' + F.sailed + ', dmg24:' + F.dmg24 + ',');
  L.push('            nearBoat:' + F.nearBoat + ', nearBoatName:' + q(F.nearBoatName) + ', nearLand:' + F.nearLand + ', nearLandName:' + q(F.nearLandName) + ',');
  L.push('            toGate:' + F.toGate + ', gate:' + q(F.gate) + ', dayN:' + F.dayN + ', totalNm:' + F.totalNm + ', ghost:' + F.ghost + ' };');
  L.push('');
  L.push('/* נקודת החובה הבאה במסלול' + (v.gateNote ? ': ' + v.gateNote : '') + ' */');
  L.push('var GATE = [' + v.GATE[0] + ', ' + v.GATE[1] + '];');
  L.push('');
  /* משפט הסיפור לא כאן: הוא ב-assets/story.js, ואותו כותב רק Claude (מ-21.9.2026) */
  L.push('/* שעה (UTC), רוח קשר, משבים קשר, כיוון רוח, גל מ׳, מחזור שנ׳, כיוון גל, זרם קשר, כיוון זרם,');
  L.push('   ומהעמודה העשירית: לחץ hPa, אוויר °C, מים °C, עננות %, ראות ק״מ, משקעים מ״מ לשעה */');
  L.push('var COND = [');
  L.push(cond.map(function (r) { return '[' + r.map(function (x, i) { return i === 0 ? "'" + x + "'" : (x == null ? 'null' : x); }).join(',') + ']'; }).join(',\n'));
  L.push('];');
  L.push('');
  L.push("var OBS_UNTIL = Date.parse('" + v.OBS_UNTIL + "');");
  L.push('');
  L.push('var FLEET=' + JSON.stringify(v.FLEET) + ';');
  L.push('');
  L.push('var TRACKP="' + v.TRACKP + '";');
  return L.join('\n') + '\n';
}

/* ---------- בדיקות לפני כתיבה ---------- */
function validate(text) {
  var d = readData(text), e = [];
  ['FIX', 'GATE', 'COND', 'OBS_UNTIL', 'FLEET', 'TRACKP'].forEach(function (k) { if (d[k] == null) e.push('חסר ' + k); });
  if (e.length) return e;
  if (d.STORY != null) e.push('STORY נמצא ב-data.js — מקומו ב-assets/story.js');
  for (var i = 1; i < d.FLEET.length; i++) if (d.FLEET[i][0] < d.FLEET[i - 1][0]) e.push('FLEET לא ממוין');
  d.COND.forEach(function (r, i) {
    if (r.length !== 15) e.push('COND שורה ' + i + ': ' + r.length + ' עמודות');
    if (i && Date.parse(r[0] + 'Z') - Date.parse(d.COND[i - 1][0] + 'Z') !== 3600e3) e.push('COND לא שעתי בשורה ' + i);
  });
  var lastC = Date.parse(d.COND[d.COND.length - 1][0] + 'Z');
  if (lastC < d.FIX.at * 1000 + 24 * 3600e3) e.push('COND לא מגיע 24 שעות קדימה');
  var nulls = 0; d.COND.forEach(function (r) { if (r[1] == null) nulls++; });
  if (nulls > d.COND.length / 2) e.push('רוב שורות COND בלי רוח');
  if (!(d.FIX.dtf > 0 && d.FIX.dtf < 26000)) e.push('dtf לא סביר');
  return e;
}

/* ---------- השוואה של שני data.js, שדה אחר שדה ---------- */
function diff(a, b) {
  var rows = [];
  Object.keys(a.FIX).forEach(function (k) { rows.push([k, a.FIX[k], b.FIX[k]]); });
  rows.push(['GATE', a.GATE.join(','), b.GATE && b.GATE.join(',')]);
  var fb = {}; b.FLEET.forEach(function (r) { fb[r[1]] = r; });
  a.FLEET.forEach(function (r) { var o = fb[r[1]] || []; rows.push(['FLEET ' + r[4], r[0] + ' · ' + r[5] + ' · ' + r[6], o.length ? o[0] + ' · ' + o[5] + ' · ' + o[6] : '—']); });
  var ca = {}; a.COND.forEach(function (r) { ca[r[0]] = r; });
  var dmax = [0, 0, 0, 0], n = 0;
  b.COND.forEach(function (r) { var o = ca[r[0]]; if (!o || Date.parse(r[0] + 'Z') > a.OBS_UNTIL) return; n++;
    [[1, 0], [4, 1], [7, 2], [9, 3]].forEach(function (p) { if (o[p[0]] != null && r[p[0]] != null) dmax[p[1]] = Math.max(dmax[p[1]], Math.abs(o[p[0]] - r[p[0]])); }); });
  rows.push(['COND (' + n + ' שעות עבר) הפרש מרבי', 'רוח ' + dmax[0].toFixed(1) + ' · גל ' + dmax[1].toFixed(2) + ' · זרם ' + dmax[2].toFixed(2) + ' · לחץ ' + dmax[3].toFixed(1), '']);
  var ta = a.TRACKP.split(' '), tb = b.TRACKP.split(' ');
  rows.push(['TRACKP', ta.length + ' נק׳, אחרונה ' + ta[ta.length - 1], tb.length + ' נק׳, אחרונה ' + tb[tb.length - 1]]);
  return rows;
}

/* ---------- היסטוריית הצי: קובץ שגדל, נקודה לכל סירה כל ארבע שעות ----------
   היסטוריית הצי ב-course.js נאפתה פעם אחת ונגמרת ב-19.9.2026; בלי המשך, כל מה שאחריה הוא קו ישר
   בין נקודת האפייה האחרונה למצב הנוכחי, ורצועת הימים בגלובוס משקרת על אמצע המרוץ. הקובץ הזה
   (assets/fleet-log.js) נבנה מחדש בכל ריצה מהמיזוג של מה שכבר נשמר עם מה שקובץ המעקב מחזיק עכשיו,
   ולכן הוא גם מתמלא אחורה בריצה הראשונה וגם לא מאבד כלום כשהמעקב מקצר את ההיסטוריה שלו.

   הפורמט, שורה לכל סירה מופרדת ב-;:  id, t0, lat0*100, lon0*100, dtf0, ואז רביעיות של דלתות
   (dt, dlat, dlon, ddtf). אותו רעיון של HIST ב-course.js, בתוספת זמן — כי המרווח כאן לא קבוע. */
var LOG_STEP = 4 * 3600, LOG_TOL = 900, LOG_OLD = 45 * 86400, LOG_OLD_STEP = 12 * 3600;

function readFleetLog(text) {
  var out = {}, m = /var FLEET_LOG\s*=\s*"([\s\S]*?)";/.exec(text || '');
  if (!m || !m[1]) return out;
  m[1].split(';').forEach(function (row) {
    var v = row.split(',').map(Number);
    if (v.length < 5 || !isFinite(v[0])) return;
    var t = v[1], la = v[2], lo = v[3], d = v[4], a = [{ at: t, lat: la / 100, lon: lo / 100, dtf: d }];
    for (var j = 5; j + 3 < v.length; j += 4) {
      t += v[j]; la += v[j + 1]; lo += v[j + 2]; d += v[j + 3];
      a.push({ at: t, lat: la / 100, lon: lo / 100, dtf: d });
    }
    out[v[0]] = a;
  });
  return out;
}

/* מיזוג של מה שנשמר עם מה שיש עכשיו במעקב. הרווח המזערי הוא ארבע שעות, ומעל 45 יום — 12 שעות,
   כדי שהקובץ לא יגדל בלי גבול לאורך מרוץ של שמונה חודשים. */
function mergeFleetLog(log, tracks, opt) {
  opt = opt || {};
  var now = opt.now || Math.floor(Date.now() / 1000), out = {}, ids = {};
  Object.keys(log).forEach(function (k) { ids[k] = 1; });
  Object.keys(tracks).forEach(function (k) { ids[k] = 1; });
  Object.keys(ids).forEach(function (k) {
    var all = (log[k] || []).concat((tracks[k] || []).map(function (p) { return { at: p.at, lat: p.lat, lon: p.lon, dtf: p.dtf }; }));
    all.sort(function (a, b) { return a.at - b.at; });
    var keep = [];
    for (var i = 0; i < all.length; i++) {
      var p = all[i];
      if (!isFinite(p.at) || !isFinite(p.lat) || !isFinite(p.lon) || !isFinite(p.dtf)) continue;
      if (Math.abs(p.lat) > 90 || Math.abs(p.lon) > 180) continue;
      var gap = (now - p.at > LOG_OLD ? LOG_OLD_STEP : LOG_STEP) - LOG_TOL;
      if (!keep.length || p.at - keep[keep.length - 1].at >= gap) keep.push(p);
    }
    if (keep.length) out[k] = keep;
  });
  return out;
}

function renderFleetLog(log) {
  var rows = Object.keys(log).map(Number).sort(function (a, b) { return a - b; }).map(function (id) {
    var a = log[id], t = Math.round(a[0].at), la = Math.round(a[0].lat * 100), lo = Math.round(a[0].lon * 100), d = Math.round(a[0].dtf);
    var parts = [id, t, la, lo, d];
    for (var i = 1; i < a.length; i++) {
      var T = Math.round(a[i].at), LA = Math.round(a[i].lat * 100), LO = Math.round(a[i].lon * 100), D = Math.round(a[i].dtf);
      parts.push(T - t, LA - la, LO - lo, D - d); t = T; la = LA; lo = LO; d = D;
    }
    return parts.join(',');
  });
  return '/* ===== fleet-log.js — היסטוריית הצי, נצברת בכל ריצה של scripts/update-data.mjs =====\n'
    + '   המקור: קובץ המעקב של YB. רווח מזערי של ארבע שעות בין נקודה לנקודה, ומעל 45 יום — 12 שעות,\n'
    + '   כדי שהקובץ לא יגדל בלי גבול. הזרע הראשון הוא ההיסטוריה שנאפתה ב-course.js, כל 12 שעות.\n'
    + '   נטען רק כשנפתח הגלובוס, ורק הוא משתמש בו: בלעדיו המסלולים חוזרים להיות קו ישר מסוף\n'
    + '   ההיסטוריה שב-course.js אל המצב הנוכחי. לא עורכים ביד. */\n'
    + 'var FLEET_LOG = "' + rows.join(';') + '";\n';
}

var api = { parseYB: parseYB, compute: compute, meteoUrls: meteoUrls, buildCond: buildCond, render: render, validate: validate,
            readData: readData, decodeLand: decodeLand, nearestLand: nearestLand, diff: diff, dist: dist, ME: ME,
            tracksFrom: tracksFrom, readFleetLog: readFleetLog, mergeFleetLog: mergeFleetLog, renderFleetLog: renderFleetLog };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else (typeof globalThis !== 'undefined' ? globalThis : window).ExoCore = api;
})();
