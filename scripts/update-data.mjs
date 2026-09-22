#!/usr/bin/env node
/* update-data.mjs — מרענן את assets/data.js בלי קלוד: מיקום, צי, מסלול ומזג אוויר.
   רץ ב-GitHub Actions (.github/workflows/update-data.yml), כל חצי שעה.

   שני מצבים, לפי EXO_MODE:
     compare (ברירת המחדל) — לא כותב כלום לאתר. מחשב פעמיים: פעם "כאילו" ברגע של data.js הנוכחי,
                             ומשווה שדה אחר שדה; ופעם את ההווה, ובודק אותו מול הלוח הרשמי. התוצאה בסיכום הריצה.
     publish               — כותב assets/data.js כשיש נקודת ציון חדשה של אקסודוס (לכל היותר פעם בשעתיים),
                             אחרי שעבר את הבדיקות. את הקומיט עושה ה-workflow.
   קצב (22.9.2026): כל קומיט הוא פרסום של Cloudflare Pages, ובמסלול החינמי יש 500 בחודש. עד כאן הבוט קימט
   גם על כל תזוזה של סירה אחרת וגם על כל נקודה בהיסטוריית הצי — כ-40 ביום. עכשיו קומיט אחד לכל נקודת ציון
   של אקסודוס (בדרך כלל כל ארבע שעות), ובו הכול: data.js, היסטוריית הצי, והארכיון (ה-workflow מוסיף אותו).
   סירה שדיווחה באיחור נכנסת בקומיט הבא — הדף ממילא מציג תמונת מצב של נקודת הציון.
   משפט הסיפור לא בקובץ הזה: הוא ב-assets/story.js, ואותו כותב רק קלוד.

   הרצה מקומית:  node scripts/update-data.mjs            (compare, בלי מזג אוויר אם לא מבקשים)
                 EXO_MODE=compare EXO_WEATHER=1 node scripts/update-data.mjs */
import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
const C = createRequire(import.meta.url)('./exo-core.js');

const MODE = (process.env.EXO_MODE || 'compare').trim();
const OUT = 'out';
const UA = 'exodus-log data bot (+https://exodus-log.com)';
const YB = 'https://pro.yb.tl/';
const now = Math.floor(Date.now() / 1000);
const summary = [];
const say = (s = '') => { summary.push(s); console.log(s); };
const setOut = (k, v) => { if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${k}<<__EOF__\n${v}\n__EOF__\n`); };

async function get(url, kind, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(45000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return kind === 'bin' ? await r.arrayBuffer() : kind === 'json' ? await r.json() : await r.text();
    } catch (e) { last = e; await new Promise(res => setTimeout(res, 3000 * (i + 1))); }
  }
  throw new Error(`${url.split('?')[0]}: ${last.message}`);
}

async function weather(samples) {
  const u = C.meteoUrls(samples);
  const [wx, sea] = await Promise.all([get(u.wx, 'json'), get(u.sea, 'json')]);
  if (wx.error || sea.error) throw new Error('Open-Meteo: ' + (wx.reason || sea.reason));
  return C.buildCond(samples, wx, sea);
}

const iso = t => new Date(t * 1000).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';

/* היסטוריית הצי (assets/fleet-log.js): נקודה לכל סירה כל ארבע שעות, בקובץ שגדל.
   בלעדיה כל מה שאחרי סוף האפייה ב-course.js (19.9.2026) הוא קו ישר, ורצועת הימים בגלובוס
   מראה מסלולים מלאכותיים. הקובץ נבנה מחדש בכל ריצה מהמיזוג של מה שכבר בו עם מה שיש במעקב עכשיו,
   ולכן הריצה הראשונה ממלאת אותו אחורה, והוא לא מאבד נקודות כשהמעקב מקצר את ההיסטוריה שלו.
   נכתב בשני המצבים — הוא לא נוגע ב-data.js, ולכן גם ריצת השוואה יכולה לצבור. */
const LOG = 'assets/fleet-log.js';
function fleetLog(parsed) {
  let was = '';
  try { was = readFileSync(LOG, 'utf8'); } catch {}
  const before = C.readFleetLog(was);
  const merged = C.mergeFleetLog(before, C.tracksFrom(parsed, now + 1800), { now });
  const text = C.renderFleetLog(merged);
  const n = k => Object.keys(k).reduce((a, i) => a + k[i].length, 0);
  const back = C.readFleetLog(text);
  if (n(back) !== n(merged) || Object.keys(back).length !== Object.keys(merged).length)
    { say('> ⚠ היסטוריית הצי לא נקראה חזרה כמו שנכתבה — לא נכתב כלום.'); return; }
  if (text === was) { say(`היסטוריית הצי: ${n(merged)} נקודות, אין חדשה.`); return; }
  writeFileSync(LOG, text);
  setOut('logged', 'true');
  const last = Math.max(...Object.keys(merged).map(k => merged[k][merged[k].length - 1].at));
  say(`היסטוריית הצי: ${n(merged)} נקודות ב-${Object.keys(merged).length} סירות (${n(merged) - n(before)} חדשות), עד ${iso(last)}. ${Math.round(text.length / 1024)}KB.`);
}
const table = rows => ['| שדה | הסקריפט | data.js הנוכחי |', '|---|---|---|', ...rows.map(r => `| ${r[0]} | ${r[1] ?? ''} | ${r[2] ?? ''} |`)].join('\n');

async function main() {
  mkdirSync(OUT, { recursive: true });
  const [buf, setup, lb] = await Promise.all([
    get(YB + 'BIN/ggr2026/AllPositions3', 'bin'), get(YB + 'JSON/ggr2026/RaceSetup', 'json'),
    get(YB + 'JSON/ggr2026/leaderboard', 'json').catch(e => { say(`> הלוח הרשמי לא נקרא: ${e.message}`); return null; })
  ]);
  const parsed = C.parseYB(buf);
  const land = C.decodeLand(new Function(readFileSync('assets/geo/land50.js', 'utf8') + ';return LAND50')());
  const prevText = readFileSync('assets/data.js', 'utf8');
  const prev = C.readData(prevText);

  const live = C.compute({ parsed, setup, leaderboard: lb, land, prev });
  const F = live.v.FIX;
  say(`## עדכון נתונים · מצב ${MODE}`);
  say(`נקודת הציון החדשה ביותר של אקסודוס: **${iso(F.at)}** (לפני ${((now - F.at) / 3600).toFixed(1)} שעות). ב-data.js הנוכחי: ${iso(prev.FIX.at)}.`);
  if (live.check) say(`מול הלוח הרשמי: DTF ${F.dtf} מול ${live.check.dtfLb.toFixed(1)} (הפרש ${live.check.dtfDiff.toFixed(1)}), מקום ${F.rank} מול ${live.check.rankLb}, 24 שעות ${F.dmg24} מול ${live.check.d24Lb.toFixed(1)}.`);
  for (const w of live.warn) say(`> ⚠ ${w}`);

  const hardFail = live.check && (Math.abs(live.check.dtfDiff) > 3 || !live.check.rankOk);

  if (MODE === 'compare') {
    fleetLog(parsed);
    /* מזג אוויר רק פעם בארבע שעות (או בבקשה), כדי לא לשרוף את המכסה החינמית של Open-Meteo */
    const h = new Date().getUTCHours(), m = new Date().getUTCMinutes();
    const wxNow = process.env.EXO_WEATHER === '1' || (h % 4 === 1 && m < 30);
    const past = C.compute({ parsed, setup, land, prev, asOf: prev.FIX.at });
    let pastCond = prev.COND, liveCond = prev.COND;
    if (wxNow) {
      try { [pastCond, liveCond] = await Promise.all([weather(past.v.samples), weather(live.v.samples)]); }
      catch (e) { say(`> מזג האוויר נכשל: ${e.message}`); }
    } else say('מזג אוויר: דולג בריצה הזאת (נבדק פעם בארבע שעות).');
    const pastText = C.render(past.v, prev, pastCond);
    writeFileSync(`${OUT}/data-asof-${prev.FIX.at}.js`, pastText);
    say('');
    say(`### השוואה ברגע של data.js הנוכחי (${iso(prev.FIX.at)})`);
    say(table(C.diff(C.readData(pastText), prev)));
    const liveText = C.render(live.v, prev, liveCond);
    writeFileSync(`${OUT}/data.js`, liveText);
    const errs = wxNow ? C.validate(liveText) : [];
    say('');
    say(errs.length ? `בדיקות הקובץ: ${errs.join('; ')}` : 'בדיקות הקובץ: עבר' + (wxNow ? '' : ' (בלי מזג אוויר)'));
    say(`במצב publish הריצה הזאת ${F.at > prev.FIX.at && !hardFail ? 'הייתה מפרסמת' : 'לא הייתה מפרסמת'}.`);
    setOut('changed', 'false');
    return;
  }

  if (MODE !== 'publish') throw new Error('EXO_MODE לא מוכר: ' + MODE);
  if (hardFail) throw new Error('החישוב לא מתיישב עם הלוח הרשמי — לא מפרסמים. כנראה שינוי בפורמט של המעקב.');

  const newFix = F.at > prev.FIX.at;
  if (!newFix) { say('אין נקודת ציון חדשה של אקסודוס. לא נכתב כלום (סירות אחרות ייכנסו עם הנקודה הבאה שלה).'); setOut('changed', 'false'); return; }
  let lastCommit = 0;
  try { lastCommit = +execSync('git log -1 --format=%ct -- assets/data.js').toString().trim() || 0; } catch {}
  /* ליד שער המעקב שולח כל חצי שעה. שעתיים הן הרצפה, כדי שגם אז לא נעבור את מכסת הפרסומים */
  if (now - lastCommit < 115 * 60) { say(`data.js עודכן לפני ${Math.round((now - lastCommit) / 60)} דקות. ממתינים (לכל היותר פרסום אחד בשעתיים).`); setOut('changed', 'false'); return; }

  let cond = prev.COND, wxOk = false;
  try { cond = await weather(live.v.samples); wxOk = true; }
  catch (e) { say(`> ⚠ מזג האוויר נכשל, נשארת הטבלה הקודמת: ${e.message}`); }
  fleetLog(parsed);
  const text = C.render(live.v, prev, cond);
  const errs = C.validate(text).filter(e => wxOk || !/COND לא מגיע/.test(e));
  if (errs.length) throw new Error('הקובץ נכשל בבדיקות: ' + errs.join('; '));
  writeFileSync('assets/data.js', text);
  writeFileSync(`${OUT}/data.js`, text);
  const msg = `נתונים ${iso(F.at)}: מקום ${F.rank}, ${F.dtf} מייל לסיום` + (wxOk ? '' : ' (מזג אוויר לא התעדכן)');
  say(`נכתב: ${msg}`);
  setOut('changed', 'true');
  setOut('message', msg);
}

try { await main(); }
catch (e) { say(`\n**נכשל:** ${e.message}`); process.exitCode = 1; }
finally { if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary.join('\n') + '\n'); }
