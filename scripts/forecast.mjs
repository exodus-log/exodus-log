#!/usr/bin/env node
/* forecast.mjs — ציר הזמן, שלב 3: תחזית 72 שעות לכל הצי. רץ בבוט אחרי polar-learn.mjs, בלי קלוד.

   לכל סירה שעדיין במרוץ: מהנקודה האחרונה שלה במעקב, שעה-שעה 72 שעות קדימה. המהירות מהפולאר שנלמד
   (assets/polar.json: טבלת הצי × מקדם הסירה × תיקון גלים), הכיוון אל הצומת הבא בקו המסלול הרשמי (course.js),
   ומעל זה הזרם. מזג האוויר מ-Open-Meteo, תחזית (best_match — מודל, לא מדידה), בשני מעברים: מעבר ראשון
   עם הרוח בנקודת ההתחלה מנחש את הדרך; מעבר שני מביא את הרוח והזרם בנקודות של הדרך הזאת (+24/+48/+72 שעות)
   ומחשב מחדש. ארבע קריאות ל-Open-Meteo לכל ריצה (שתי תחנות × שני מעברים, כל הצי בקריאה אחת).

   רוחב המניפה לא מנוחש: הוא הטעות שנמדדה במבחן לאחור של polar-learn (חציון ועשירון עליון לכל אופק),
   ומועתק לכאן כדי שהדף יצייר אותו בלי לחשב.

   פלט: assets/forecast.json. הדף קורא אותו בגלובוס (/next/): מעבר לנקודה האחרונה הסירות זזות לפי התחזית,
   עם מניפה בענבר וכיתוב "הערכה". סירה שפרשה, שעומדת בנמל או שלא דיווחה 24 שעות — בלי תחזית.

   הרצה:  node scripts/forecast.mjs            (רשת: Open-Meteo)
          EXO_MOCK=1 node scripts/forecast.mjs (בלי רשת: הרוח והזרם מהשורה האחרונה בארכיון assets/cond, קבועים) */
import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const C = createRequire(import.meta.url)('./exo-core.js');
const say = s => console.log(s);
const setOut = (k, v) => { if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${k}<<__EOF__\n${v}\n__EOF__\n`); };
const MOCK = process.env.EXO_MOCK === '1';
const HOURS = 72, STEP_OUT = 3, RECHECK = [24, 48, 72];
const rad = Math.PI / 180;
const ang = (a, b) => ((a - b) % 360 + 540) % 360 - 180;

/* ---------- קלט ---------- */
const polar = JSON.parse(readFileSync('assets/polar.json', 'utf8'));
const courseSrc = readFileSync('assets/course.js', 'utf8');
const COURSE = /var COURSE = "([^"]+)"/.exec(courseSrc)[1].trim().split(/\s+/).map(s => { const [la, lo] = s.split(',').map(Number); return { lat: la, lon: lo }; });
const CUM = new Array(COURSE.length); CUM[COURSE.length - 1] = 0;
for (let i = COURSE.length - 2; i >= 0; i--) CUM[i] = CUM[i + 1] + C.dist(COURSE[i].lat, COURSE[i].lon, COURSE[i + 1].lat, COURSE[i + 1].lon);
const dataSrc = readFileSync('assets/data.js', 'utf8');
const FLEET = JSON.parse(/var FLEET=(\[[\s\S]*?\]\]);/.exec(dataSrc)[1]);          /* [rank, id, lat, lon, name, dtf, dmg24, out] */
const FIX_AT = +/at:(\d+)/.exec(dataSrc)[1];
const log = C.readFleetLog(readFileSync('assets/fleet-log.js', 'utf8'));
const PORTS = [[46.48, -1.79], [28.85, -13.82]];

/* ---------- הפולאר, כמו ב-polar-learn ---------- */
const bin = (v, edges) => { for (let i = 0; i < edges.length - 1; i++) if (v < edges[i + 1]) return i; return edges.length - 2; };
function speed(id, tws, twa, wave) {
  const g = polar.grid[bin(tws, polar.twsBins)][bin(Math.abs(twa), polar.twaBins)];
  return (polar.factors[id] || 1) * g * Math.exp((polar.waveK || 0) * ((wave == null ? polar.waveMean : wave) - polar.waveMean));
}
function nextNode(dtf, lat, lon) {
  let best = 1e9, k = 0;
  for (let i = 0; i < COURSE.length - 1; i++) {
    if (Math.abs(CUM[i] - dtf) > 400) continue;
    const a = COURSE[i], b = COURSE[i + 1];
    const d = C.dist(lat, lon, a.lat, a.lon) + C.dist(lat, lon, b.lat, b.lon) - C.dist(a.lat, a.lon, b.lat, b.lon);
    if (d < best) { best = d; k = i + 1; }
  }
  return k;
}
/* שעה-שעה. cond(h) נותן {tws, wdir, cur, curTo, wave} לשעה h מההתחלה */
function simulate(id, start, cond) {
  const out = []; let la = start.lat, lo = start.lon, k = nextNode(start.dtf, la, lo);
  for (let h = 1; h <= HOURS; h++) {
    const c = cond(h); if (!c) return null;
    if (C.dist(la, lo, COURSE[k].lat, COURSE[k].lon) < 8 && k < COURSE.length - 1) k++;
    const hdg = C.brg(la, lo, COURSE[k].lat, COURSE[k].lon);
    const v = speed(id, c.tws, Math.abs(ang(c.wdir, hdg)), c.wave);
    const vx = v * Math.sin(hdg * rad) + c.cur * Math.sin(c.curTo * rad), vy = v * Math.cos(hdg * rad) + c.cur * Math.cos(c.curTo * rad);
    const p = C.dest(la, lo, (Math.atan2(vx, vy) / rad + 360) % 360, Math.hypot(vx, vy)); la = p[0]; lo = p[1];
    out.push({ h, lat: la, lon: lo });
  }
  return out;
}

/* ---------- מזג אוויר: תחזית לנקודות, כל הצי בקריאה אחת ---------- */
const UA = 'exodus-log data bot (+https://exodus-log.com)';
async function get(url) {
  let last;
  for (let i = 0; i < 3; i++) {
    try { const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(45000) }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
    catch (e) { last = e; await new Promise(res => setTimeout(res, 3000 * (i + 1))); }
  }
  throw new Error(url.split('?')[0] + ': ' + last.message);
}
/* לכל נקודה: שעות 0..72 של רוח, גל וזרם. מחזיר פונקציה (i, h) → תנאים */
async function fetchWx(points, t0) {
  const iso = t => new Date(t * 1000).toISOString().slice(0, 16);
  const lat = points.map(p => p.lat.toFixed(3)).join(','), lon = points.map(p => p.lon.toFixed(3)).join(',');
  const win = `&timezone=GMT&start_hour=${iso(t0)}&end_hour=${iso(t0 + HOURS * 3600)}`;
  const [wx, sea] = await Promise.all([
    get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}${win}&wind_speed_unit=kn&hourly=wind_speed_10m,wind_direction_10m`),
    get(`https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}${win}&hourly=wave_height,ocean_current_velocity,ocean_current_direction`)]);
  const W = Array.isArray(wx) ? wx : [wx], S = Array.isArray(sea) ? sea : [sea];
  return (i, h) => {
    const w = W[i], m = S[i]; if (!w || !w.hourly) return null;
    const t = iso(t0 + h * 3600), j = w.hourly.time.indexOf(t); if (j < 0) return null;
    const tws = w.hourly.wind_speed_10m[j], wdir = w.hourly.wind_direction_10m[j]; if (tws == null || wdir == null) return null;
    const jm = m && m.hourly ? m.hourly.time.indexOf(t) : -1;
    const cur = jm >= 0 && m.hourly.ocean_current_velocity[jm] != null ? m.hourly.ocean_current_velocity[jm] / 1.852 : 0;
    return { tws, wdir, cur, curTo: jm >= 0 ? (m.hourly.ocean_current_direction[jm] || 0) : 0, wave: jm >= 0 ? m.hourly.wave_height[jm] : null };
  };
}
/* בלי רשת: השורה האחרונה בארכיון של כל סירה, קבועה לאורך כל התחזית */
function mockWx(ids) {
  const last = {};
  for (let w = 1; w <= 60; w++) for (const f of [`assets/cond/w${String(w).padStart(2, '0')}.json`, `assets/cond/fleet-w${String(w).padStart(2, '0')}.json`]) {
    if (!existsSync(f)) continue; const j = JSON.parse(readFileSync(f, 'utf8'));
    for (const id of Object.keys(j.boats)) { const r = j.boats[id][j.boats[id].length - 1]; if (r) last[id] = { tws: r[1], wdir: r[3], cur: r[7] || 0, curTo: r[8] || 0, wave: r[4] }; }
  }
  return (i) => last[ids[i]] || null;
}

/* ---------- ריצה ---------- */
async function main() {
  const now = Math.floor(Date.now() / 1000);
  const boats = FLEET.filter(r => !r[7]).map(r => ({ id: String(r[1]), name: r[4] }));
  const starts = [], skipped = [];
  for (const b of boats) {
    const tr = log[b.id]; if (!tr || !tr.length) { skipped.push(b.name + ' (אין היסטוריה)'); continue; }
    const p = tr[tr.length - 1];
    if (now - p.at > 24 * 3600) { skipped.push(b.name + ' (לא דיווחה 24 שעות)'); continue; }
    if (PORTS.some(q => C.dist(q[0], q[1], p.lat, p.lon) < 12)) { skipped.push(b.name + ' (בנמל)'); continue; }
    const q = tr.length > 1 ? tr[tr.length - 2] : p;
    if (p.at > q.at && C.dist(q.lat, q.lon, p.lat, p.lon) / ((p.at - q.at) / 3600) < 0.5 && now - p.at < 12 * 3600 && p.at - q.at >= 3 * 3600) { skipped.push(b.name + ' (עומדת)'); continue; }
    starts.push({ ...b, at: p.at, lat: p.lat, lon: p.lon, dtf: p.dtf });
  }
  if (!starts.length) throw new Error('אין סירה עם נקודה טרייה');
  const t0 = Math.round(Math.max(...starts.map(s => s.at)) / 3600) * 3600;  /* התחזית נספרת מהנקודה הטרייה ביותר בצי, מעוגלת לשעה שלמה — Open-Meteo נותן
                                                                               שעות עגולות בלבד, ו-08:06 לא היה נמצא ברשימה (23.9: 0 סירות). מי שדיווחה קודם — נגררת עד t0 בפולאר */
  say(`תחזית מ-${new Date(t0 * 1000).toISOString().slice(0, 16)}Z, ${starts.length} סירות${skipped.length ? ' · בלי: ' + skipped.join(', ') : ''}`);

  /* מעבר 1: הרוח בנקודת ההתחלה של כל סירה */
  const ids = starts.map(s => s.id);
  let wx1 = MOCK ? mockWx(ids) : await fetchWx(starts, t0);
  const pass1 = starts.map((s, i) => simulate(s.id, s, h => wx1(i, h)));
  /* מעבר 2: הרוח בנקודות של הדרך שנוחשה (+24/+48/+72), כל שעה לוקחת את הנקודה הקרובה לה בזמן */
  const pts = []; const idx = [];
  starts.forEach((s, i) => { const path = pass1[i]; RECHECK.forEach(h => { const p = path ? path[h - 1] : s; pts.push({ lat: p.lat, lon: p.lon }); idx.push([i, h]); }); });
  let wx2 = MOCK ? null : await fetchWx(pts, t0);
  const condFor = (i, h) => {
    if (MOCK) return wx1(i, h);
    if (h <= 12) return wx1(i, h);
    const target = RECHECK.reduce((b, H) => Math.abs(H - h) < Math.abs(b - h) ? H : b, RECHECK[0]);
    const j = idx.findIndex(([bi, H]) => bi === i && H === target);
    return (j >= 0 && wx2(j, h)) || wx1(i, h);
  };
  const out = {};
  starts.forEach((s, i) => {
    const path = simulate(s.id, s, h => condFor(i, h)); if (!path) { skipped.push(s.name + ' (אין מזג אוויר)'); return; }
    const pts = [[s.at, +s.lat.toFixed(3), +s.lon.toFixed(3)]];
    for (let h = STEP_OUT; h <= HOURS; h += STEP_OUT) { const p = path[h - 1]; pts.push([t0 + h * 3600, +p.lat.toFixed(3), +p.lon.toFixed(3)]); }
    out[s.id] = { name: s.name, from: s.at, pts };
  });
  const bt = polar.backtest && polar.backtest.horizons ? polar.backtest.horizons : {};
  const fan = {}; for (const h of Object.keys(bt)) fan[h] = { p50: bt[h].model.p50, p90: bt[h].model.p90 };
  const json = {
    v: 1, madeAt: new Date(now * 1000).toISOString().slice(0, 16) + 'Z', from: t0, hours: HOURS, step: STEP_OUT,
    about: 'תחזית 72 שעות לכל הצי: פולאר שנלמד מהמסלולים (assets/polar.json) + תחזית Open-Meteo לאורך הדרך הצפויה. נכתב על ידי scripts/forecast.mjs — לא עורכים ביד. הערכה, לא מדידה.',
    source: MOCK ? 'mock: השורה האחרונה בארכיון, קבועה' : 'Open-Meteo forecast (best_match): api.open-meteo.com לרוח, marine-api.open-meteo.com לגל ולזרם',
    fan, polarLearnedAt: polar.learnedAt, backtestRuns: polar.backtest ? polar.backtest.runs : 0,
    skipped, boats: out
  };
  const txt = JSON.stringify(json);
  let was = ''; try { was = readFileSync('assets/forecast.json', 'utf8'); } catch {}
  writeFileSync('assets/forecast.json', txt);
  const me = out['4'];
  say(`נכתב assets/forecast.json (${txt.length} בתים): ${Object.keys(out).length} סירות · מניפה p90 ${Object.keys(fan).map(h => h + 'h ' + fan[h].p90).join(', ')} מייל` +
      (me ? ` · אקסודוס בעוד 72 שעות: ${me.pts[me.pts.length - 1][1]}, ${me.pts[me.pts.length - 1][2]}` : ''));
  setOut('forecast', was === txt ? 'same' : 'changed');
}
try { await main(); }
catch (e) { say(`**התחזית נכשלה:** ${e.message}`); process.exitCode = 1; }
