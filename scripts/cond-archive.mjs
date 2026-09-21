#!/usr/bin/env node
/* cond-archive.mjs — ארכיון מזג האוויר של המרוץ כולו, לכל הצי, במקום שבו כל סירה הייתה באותה שעה.
   רץ ב-GitHub Actions (.github/workflows/cond-archive.yml), כל שש שעות. בלי קלוד, בחינם.

   למה: ציר הזמן (claude/ציר-הזמן-הצעה.md, אפשרות ב׳) מציג כל רגע בעבר עם הים ששרר אז באמת,
   ומודל התחזית (שלב 2) לומד מהארכיון איך כל סירה שטה בכל רוח. COND שב-data.js מכסה רק יומיים סביב עכשיו.

   מה נשמר, לכל שבוע של המרוץ (שבוע 1 = 6.9–12.9):
     assets/cond/wNN.json        אקסודוס, כל שעה. זה מה שהדף יטען כשגוררים לעבר.
     assets/cond/fleet-wNN.json  כל שאר הסירות, כל שלוש שעות (00, 03, 06 ... UTC). בשביל התחזית, לא בשביל הדף.
   כל שורה: 15 העמודות של COND בדיוק באותו סדר (כדי ש-pickCond יעבוד עליהן בלי שינוי),
   ואחריהן: קו רוחב וקו אורך שבהם נדגם מזג האוויר, שעת המשיכה (שעות מאז 1970), ומקור ('f' = תחזית
   ששמורה בשרת הרגיל, עד כ-90 יום אחורה; 'h' = שרת ההיסטוריה של Open-Meteo, למה שישן מזה).

   שורה "סופית" כשמשכו אותה יותר מ-48 שעות אחרי הרגע שלה. שורה צעירה מזה נמשכת מחדש (לכל היותר פעם ב-12 שעות),
   כי המודל עוד מתקן את השעות האחרונות. כך העבר באתר משתפר אחרי שהוא קורה, ואז נקבע.

   מכסה: Open-Meteo החינמי מתיר כ-5,000 פניות בשעה ו-10,000 ביום, כשכל מיקום נספר כפנייה.
   לכן לכל ריצה יש תקציב (EXO_BUDGET, ברירת מחדל 1800 מיקומים), והמילוי אחורה מתפרס על כמה ריצות,
   מהישן לחדש. אחרי שהמילוי נגמר, ריצה רגילה משתמשת בכמה מאות.

   הרצה מקומית:  node scripts/cond-archive.mjs             (אמיתי: צריך גישה ל-YB ול-Open-Meteo)
                 EXO_MOCK=1 node scripts/cond-archive.mjs   (בדיקה בלי רשת: מיקומים מ-fleet-log.js, מזג אוויר מומצא) */
import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const C = createRequire(import.meta.url)('./exo-core.js');

const MOCK = process.env.EXO_MOCK === '1';
const BUDGET = +(process.env.EXO_BUDGET || 1800);
const DIR = process.env.EXO_COND_DIR || 'assets/cond';
const UA = 'exodus-log weather archive (+https://exodus-log.com)';
const H = 3600, DAY = 86400, WEEK = 7 * DAY;
const ME = 4, FLEET_STEP = 3 * H, FINAL_AFTER = 48 * H, LAG = 2 * H;
const WEEK0 = Math.floor(1788697800 / DAY) * DAY;             /* 6.9.2026 00:00 UTC — יום הזינוק */
const START = Math.ceil(1788697800 / H) * H;                    /* השעה העגולה הראשונה אחרי הזינוק */
const FORECAST_BACK = 85 * DAY;                                 /* מעבר לזה: שרת ההיסטוריה */
const BATCH = 40;                                               /* מיקומים בבקשה אחת */
const now = +(process.env.EXO_NOW || Math.floor(Date.now() / 1000));
const nowH = Math.floor(now / H);
const summary = [];
const say = (s = '') => { summary.push(s); console.log(s); };
const setOut = (k, v) => { if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${k}<<__EOF__\n${v}\n__EOF__\n`); };
const iso = t => new Date(t * 1000).toISOString().slice(0, 16);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const wk = t => Math.floor((t - WEEK0) / WEEK) + 1;
const pad2 = n => String(n).padStart(2, '0');

/* ---------- רשת ---------- */
let calls = 0;
async function get(url, kind) {
  let last;
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(60000) });
      if (r.status === 429) throw new Error('HTTP 429 (מכסה)');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return kind === 'bin' ? await r.arrayBuffer() : await r.json();
    } catch (e) { last = e; await sleep(/429/.test(e.message) ? 65000 : 4000 * (i + 1)); }
  }
  throw new Error(`${url.split('?')[0]}: ${last.message}`);
}

/* ---------- המסלולים ---------- */
/* מיקום בזמן t, בקו ישר בין שתי נקודות ציון (אותו חישוב כמו at() שבתוך exo-core.js, שלא מיוצא משם) */
function posAt(tr, t) {
  if (t <= tr[0].at) return tr[0];
  const last = tr[tr.length - 1]; if (t >= last.at) return last;
  let lo = 0, hi = tr.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (tr[mid].at <= t) lo = mid; else hi = mid; }
  const a = tr[lo], b = tr[hi], f = (t - a.at) / (b.at - a.at);
  let d = b.lon - a.lon; if (d > 180) d -= 360; if (d < -180) d += 360;
  return { lat: a.lat + (b.lat - a.lat) * f, lon: ((a.lon + d * f + 540) % 360) - 180 };
}
async function tracks() {
  if (!MOCK) {
    try {
      const parsed = C.parseYB(await get('https://pro.yb.tl/BIN/ggr2026/AllPositions3', 'bin'));
      const t = C.tracksFrom(parsed, now + 1800);
      say(`מסלולים: מהמעקב הרשמי, ${Object.keys(t).length} סירות.`);
      return t;
    } catch (e) { say(`> ⚠ המעקב לא נקרא (${e.message}). ממשיכים מ-fleet-log.js, כל ארבע שעות.`); }
  }
  const t = C.readFleetLog(readFileSync('assets/fleet-log.js', 'utf8'));
  say(`מסלולים: מ-fleet-log.js, ${Object.keys(t).length} סירות.`);
  return t;
}

/* ---------- הקבצים ---------- */
const fileOf = (boat, w) => `${DIR}/${boat === ME ? '' : 'fleet-'}w${pad2(w)}.json`;
const cache = {};
function load(path) {
  if (cache[path]) return cache[path];
  let f = null;
  if (existsSync(path)) { try { f = JSON.parse(readFileSync(path, 'utf8')); } catch { throw new Error(`${path} לא נקרא — עוצרים כדי לא לדרוס אותו`); } }
  if (!f) {
    const w = +/w(\d+)\.json$/.exec(path)[1], a = WEEK0 + (w - 1) * WEEK;
    f = { v: 1, week: w, from: iso(a).slice(0, 10), to: iso(a + WEEK - DAY).slice(0, 10),
          step: path.includes('fleet-') ? '3h' : '1h', boats: {} };
  }
  f._dirty = false;
  return (cache[path] = f);
}
function header(f) {
  return { v: 1, week: f.week, from: f.from, to: f.to, step: f.step,
    about: 'ארכיון מזג אוויר של יומן אקסודוס. נכתב על ידי scripts/cond-archive.mjs, לא עורכים ביד.',
    source: 'Open-Meteo: api.open-meteo.com/v1/forecast (ו-historical-forecast-api למה שישן מ-85 יום) לרוח ולאוויר, marine-api.open-meteo.com לגל, לזרם ולמים. best_match — מודל, לא מדידה.',
    cols: ['time UTC', 'wind kn', 'gust kn', 'wind from °', 'wave m', 'wave period s', 'wave from °', 'current kn', 'current to °',
           'pressure hPa', 'air °C', 'sea °C', 'cloud %', 'visibility km', 'precip mm/h', 'lat', 'lon', 'fetched (unix hours)', "host f|h"] };
}
function rowsOf(f, boat) { return f.boats[boat] || (f.boats[boat] = []); }
function save() {
  let n = 0;
  mkdirSync(DIR, { recursive: true });
  for (const [path, f] of Object.entries(cache)) {
    if (!f._dirty) continue;
    const out = header(f);
    out.boats = {};
    Object.keys(f.boats).map(Number).sort((a, b) => a - b).forEach(b => {
      out.boats[b] = f.boats[b].slice().sort((p, q) => (p[0] < q[0] ? -1 : 1));
    });
    /* שורה לכל רשומה: קובץ שקל לקרוא ב-diff, ועדיין JSON רגיל */
    const body = JSON.stringify(out, null, 0)
      .replace(/\],\[/g, '],\n[').replace(/"boats":\{/, '"boats":{\n').replace(/\]\],"/g, ']],\n"');
    JSON.parse(body);                                            /* לא כותבים קובץ שלא נקרא חזרה */
    writeFileSync(path, body + '\n');
    n++;
  }
  return n;
}

/* ---------- מה חסר ---------- */
function wanted(tr) {
  const want = [];
  const endH = Math.floor((now - LAG) / H) * H;
  for (const id of Object.keys(tr).map(Number)) {
    if (id >= 900) continue;                                     /* סירות רפאים של מרוצים קודמים */
    const t = tr[id]; if (!t || t.length < 2) continue;
    const step = id === ME ? H : FLEET_STEP;
    const last = Math.min(endH, t[t.length - 1].at);
    for (let s = Math.ceil(START / step) * step; s <= last; s += step) {
      if (s < t[0].at) continue;
      const f = load(fileOf(id, wk(s)));
      const have = rowsOf(f, id).find(r => r[0] === iso(s));
      if (have && (have[17] * H - s) >= FINAL_AFTER) continue;   /* סופית */
      if (have && nowH - have[17] < 12) continue;                /* שורה צעירה מתרעננת לכל היותר פעם ב-12 שעות */
      const p = posAt(t, s);
      want.push({ id, t: s, lat: +p.lat.toFixed(3), lon: +p.lon.toFixed(3), fresh: !have });
    }
  }
  /* קודם מה שחסר לגמרי, מהישן לחדש; אחר כך ריענון של השורות הצעירות */
  want.sort((a, b) => (a.fresh === b.fresh ? a.t - b.t : a.fresh ? -1 : 1));
  return want;
}

/* ---------- משיכה ---------- */
function urls(batch) {
  const lat = batch.map(s => s.lat).join(','), lon = batch.map(s => s.lon).join(',');
  const t0 = Math.min(...batch.map(s => s.t)), t1 = Math.max(...batch.map(s => s.t));
  const old = now - t0 > FORECAST_BACK;
  const win = `&timezone=GMT&start_hour=${iso(t0)}&end_hour=${iso(t1)}`;
  return { host: old ? 'h' : 'f',
    wx: (old ? 'https://historical-forecast-api.open-meteo.com/v1/forecast' : 'https://api.open-meteo.com/v1/forecast') +
        `?latitude=${lat}&longitude=${lon}${win}&wind_speed_unit=kn` +
        '&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m,pressure_msl,temperature_2m,cloud_cover,visibility,precipitation',
    sea: `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}${win}` +
         '&hourly=wave_height,wave_period,wave_direction,ocean_current_velocity,ocean_current_direction,sea_surface_temperature' };
}
/* בבדיקה בלי רשת: תשובה באותו מבנה בדיוק כמו של Open-Meteo, עם ערכים שנגזרים מהמיקום והשעה */
function mockReply(batch, kind) {
  const t0 = Math.min(...batch.map(s => s.t)), t1 = Math.max(...batch.map(s => s.t)), time = [];
  for (let t = t0; t <= t1; t += H) time.push(iso(t));
  return batch.map(s => {
    const f = (a, b) => time.map((_, i) => +(a + b * Math.sin((s.lat + i) / 7)).toFixed(2));
    return { hourly: kind === 'wx'
      ? { time, wind_speed_10m: f(14, 4), wind_gusts_10m: f(18, 5), wind_direction_10m: f(30, 20), pressure_msl: f(1015, 3),
          temperature_2m: f(24, 1), cloud_cover: f(20, 15), visibility: f(18000, 2000), precipitation: f(0, 0) }
      : { time, wave_height: f(1.3, 0.3), wave_period: f(7, 1), wave_direction: f(20, 10), ocean_current_velocity: f(0.7, 0.3),
          ocean_current_direction: f(230, 20), sea_surface_temperature: f(24, 1) } };
  });
}
async function fetchBatch(batch) {
  const u = urls(batch);
  let wx, sea;
  if (MOCK) { wx = mockReply(batch, 'wx'); sea = mockReply(batch, 'sea'); }
  else {
    [wx, sea] = await Promise.all([get(u.wx, 'json'), get(u.sea, 'json')]);
    if (wx.error || sea.error) throw new Error('Open-Meteo: ' + (wx.reason || sea.reason));
  }
  calls += batch.length * 2;
  /* buildCond מחזיר את 15 העמודות של COND; ב-COND הראות כבר בק״מ. בודקים שהמבנה לא השתנה. */
  const rows = C.buildCond(batch.map(s => ({ t: s.t, lat: s.lat, lon: s.lon })), wx, sea);
  if (rows.length !== batch.length || rows.some(r => r.length !== 15)) throw new Error('buildCond החזיר מבנה לא צפוי');
  return rows.map((r, i) => r.concat([batch[i].lat, batch[i].lon, nowH, u.host]));
}

/* ---------- ריצה ---------- */
async function main() {
  say('## ארכיון מזג האוויר' + (MOCK ? ' · בדיקה בלי רשת' : ''));
  const tr = await tracks();
  const want = wanted(tr);
  const fresh = want.filter(w => w.fresh).length;
  say(`חסרות ${fresh} שורות, ועוד ${want.length - fresh} צעירות מ-48 שעות לריענון. תקציב הריצה: ${BUDGET} מיקומים (${BUDGET * 2} פניות).`);
  const todo = want.slice(0, BUDGET);

  /* קבוצות: אותו יום UTC, עד BATCH מיקומים — כל מיקום מחזיר רק יממה אחת, ולכן נספר כפנייה אחת */
  const groups = [];
  let cur = [];
  for (const s of todo.slice().sort((a, b) => a.t - b.t)) {
    if (cur.length && (cur.length >= BATCH || Math.floor(s.t / DAY) !== Math.floor(cur[0].t / DAY))) { groups.push(cur); cur = []; }
    cur.push(s);
  }
  if (cur.length) groups.push(cur);

  /* הריצה הראשונה האמיתית (22.9) לקחה 21 דקות ל-1,800 מיקומים, קרוב לתקרה של 25 דקות ב-workflow.
     לכן: עצירה מסודרת אחרי 17 דקות, שמירה לדיסק כל 10 בקשות (כך שנפילה באמצע לא מוחקת עבודה),
     ושורת התקדמות בלוג. מה שלא הספיק נשאר לריצה הבאה. */
  const T0 = Date.now(), MAX_MS = +(process.env.EXO_MAX_MIN || 17) * 60000;
  let done = 0, nulls = 0, failed = 0, gi = 0, skipped = 0;
  for (const g of groups) {
    if (Date.now() - T0 > MAX_MS) { skipped += g.length; continue; }
    gi++; if (gi % 10 === 0) { save(); console.log(`… ${gi}/${groups.length} בקשות, ${done} שורות, ${Math.round((Date.now() - T0) / 60000)} דק׳`); }
    let rows;
    try { rows = await fetchBatch(g); }
    catch (e) { failed += g.length; say(`> ⚠ ${iso(g[0].t)}: ${e.message}`); if (/429/.test(e.message)) break; continue; }
    rows.forEach((r, i) => {
      const s = g[i], f = load(fileOf(s.id, wk(s.t))), list = rowsOf(f, s.id);
      if (r[1] == null || r[4] == null) nulls++;
      const k = list.findIndex(x => x[0] === r[0]);
      /* שורה ישנה טובה לא מוחלפת בשורה ריקה */
      if (k >= 0 && (r[1] == null && list[k][1] != null)) return;
      if (k >= 0) list[k] = r; else list.push(r);
      f._dirty = true; done++;
    });
    /* המכסה לדקה היא 600 פניות. כל בקשה כאן היא 2 פניות לכל מיקום, ולכן מחכים כדי להישאר סביב 400 בדקה */
    if (!MOCK) await sleep(g.length * 2 / 400 * 60000);
  }
  if (done && nulls / done > 0.2) throw new Error(`${nulls} מתוך ${done} שורות בלי רוח או גל — משהו השתנה ב-Open-Meteo. לא נכתב כלום.`);
  const files = save();

  if (skipped) say(`> עצירה מתוכננת אחרי ${Math.round(MAX_MS / 60000)} דקות: ${skipped} מיקומים עברו לריצה הבאה.`);
  const left = want.length - todo.length + failed + skipped;
  say(`נמשכו ${done} שורות ב-${gi} בקשות (${calls} פניות). שורות ריקות: ${nulls}. קבצים שנכתבו: ${files}.`);
  say(left ? `נשארו ${left} לריצה הבאה.` : 'הארכיון מלא עד לפני שעתיים.');
  /* מצב לכל שבוע: כמה שורות, וכמה מהן סופיות */
  const weeks = {};
  for (const [path, f] of Object.entries(cache)) {
    for (const [b, list] of Object.entries(f.boats)) {
      const w = weeks[f.week] || (weeks[f.week] = { me: 0, fleet: 0, fin: 0, all: 0 });
      if (+b === ME) w.me += list.length; else w.fleet += list.length;
      w.all += list.length; w.fin += list.filter(r => r[17] * H - Date.parse(r[0] + 'Z') / 1000 >= FINAL_AFTER).length;
    }
  }
  say('');
  say('| שבוע | אקסודוס (שעתי) | שאר הצי (כל 3 שעות) | סופיות |');
  say('|---|---|---|---|');
  Object.keys(weeks).map(Number).sort((a, b) => a - b).forEach(w => {
    const x = weeks[w]; say(`| ${w} | ${x.me} | ${x.fleet} | ${Math.round(100 * x.fin / (x.all || 1))}% |`);
  });
  setOut('changed', files ? 'true' : 'false');
  setOut('message', `ארכיון מזג אוויר: ${done} שורות` + (left ? `, נשארו ${left}` : ''));
}

try { await main(); }
catch (e) { say(`\n**נכשל:** ${e.message}`); process.exitCode = 1; }
finally { if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary.join('\n') + '\n'); }
