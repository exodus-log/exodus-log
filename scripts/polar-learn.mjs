#!/usr/bin/env node
/* polar-learn.mjs — ציר הזמן, שלב 2: פולאר נלמד ומבחן לאחור. בלי רשת, בלי קלוד.

   פולאר = טבלת מהירות הסירה לפי עוצמת הרוח (TWS, קשר) והזווית אליה (TWA: 0 = אף ברוח, 180 = רוח מאחור).
   כאן הוא לא מגיע מהיצרן אלא נלמד ממה שקרה באמת: המסלולים של כל הצי (assets/fleet-log.js, נקודה כל ארבע שעות)
   מול ארכיון מזג האוויר במיקום של כל סירה באותה שעה (assets/cond/*.json). לכל קטע של ארבע שעות:
   המהירות והכיוון על הקרקע → פחות הזרם = דרך המים; זווית ועוצמת הרוח מהארכיון; משקל = משך הקטע.

   המודל (רמה 2, כמו שהוחלט ב-22.9): פולאר אחד משותף לצי, V(TWS,TWA) = A(TWS)·B(TWA), נלמד ביומן
   (הכפלה → חיבור) בריבועים פחותים מסורגלים, ולכל סירה מקדם יעילות משלה (חציון היחס נמדד/מודל, חסום 0.6–1.4).
   הגלים: מקדם תיקון ליניארי על השארית. סירה שעומדת בנמל לא נלמדת.

   מבחן לאחור: מכל יום במרוץ, לכל סירה, חוזים 72 שעות קדימה רק ממה שהיה ידוע עד אז (הפולאר נלמד מחדש מהקטעים
   שנגמרו לפני אותו רגע), ומשווים למסלול האמיתי. הכיוון: אל הצומת הבא בקו המסלול הרשמי (COURSE), לפי המרחק
   לסיום שהמעקב נותן (לא "הצומת הקרוב" — דרך החזרה עוברת באותם מים). התנאים לאורך התחזית: מהארכיון, במיקום האמיתי של הסירה באותה שעה (תחליף לרשת תחזית —
   הטעות שנמדדת כאן היא טעות המודל והכיוון, לא של תחזית מזג האוויר). מולו שתי הערכות פשוטות:
   "ממשיך כמו בארבע השעות האחרונות" (רמה 1) ו"עומד במקום". רוחב המניפה על המסך צריך לבוא מהטבלה הזאת.

   פלט: assets/polar.json (הפולאר, המקדמים, טבלת הטעות) והדפסה. הרצה: node scripts/polar-learn.mjs [--quiet] */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const C = createRequire(import.meta.url)('./exo-core.js');
const QUIET = process.argv.includes('--quiet');
const say = (s = '') => { if (!QUIET) console.log(s); };

/* ---------- קלט ---------- */
const courseSrc = readFileSync('assets/course.js', 'utf8');
const RACE_START = +(/var RACE_START = (\d+)/.exec(courseSrc)[1]);
const COURSE = /var COURSE = "([^"]+)"/.exec(courseSrc)[1].trim().split(/\s+/).map(s => { const [la, lo] = s.split(',').map(Number); return { lat: la, lon: lo }; });
const PORTS = [[46.48, -1.79], [28.85, -13.82]];              /* לה סאבל, לנזרוטה: סירה שעומדת שם לא מלמדת כלום */
const dataSrc = readFileSync('assets/data.js', 'utf8');
const NAMES = {}; (/var FLEET=(\[[\s\S]*?\]\]);/.exec(dataSrc) ? JSON.parse(/var FLEET=(\[[\s\S]*?\]\]);/.exec(dataSrc)[1]) : []).forEach(r => { NAMES[r[1]] = r[4]; });
const log = C.readFleetLog(readFileSync('assets/fleet-log.js', 'utf8'));

/* הארכיון: לכל סירה רשימת שורות בזמן עולה. [t, wind, gust, from, wave, period, waveFrom, cur, curTo, ...] */
const COND = {};
for (let w = 1; w <= 60; w++) {
  for (const f of [`assets/cond/w${String(w).padStart(2, '0')}.json`, `assets/cond/fleet-w${String(w).padStart(2, '0')}.json`]) {
    let j; try { j = JSON.parse(readFileSync(f, 'utf8')); } catch { continue; }
    for (const id of Object.keys(j.boats)) {
      const a = COND[id] || (COND[id] = []);
      for (const r of j.boats[id]) {
        const t = Date.parse(r[0] + ':00Z') / 1000;
        if (!isFinite(t) || !isFinite(r[1]) || !isFinite(r[3])) continue;
        a.push({ t, tws: r[1], gust: r[2], wdir: r[3], wave: r[4] || 0, cur: r[7] || 0, curTo: r[8] || 0 });
      }
    }
  }
}
for (const id of Object.keys(COND)) { COND[id].sort((a, b) => a.t - b.t); const u = []; for (const r of COND[id]) if (!u.length || u[u.length - 1].t !== r.t) u.push(r); COND[id] = u; }
const FLEET_IDS = Object.keys(COND).filter(id => log[id]);
if (!FLEET_IDS.length) { console.error('polar-learn: אין ארכיון או אין היסטוריה'); process.exit(2); }

/* ---------- עזרים ---------- */
const rad = Math.PI / 180, R_NM = 3440.065;
const dist = C.dist;
function brg(a, b, c, d) { const y = Math.sin((d - b) * rad) * Math.cos(c * rad), x = Math.cos(a * rad) * Math.sin(c * rad) - Math.sin(a * rad) * Math.cos(c * rad) * Math.cos((d - b) * rad); return (Math.atan2(y, x) / rad + 360) % 360; }
function dest(a, b, br, nm) { const d = nm / R_NM, t = br * rad, p1 = a * rad, l1 = b * rad; const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(t)); const l2 = l1 + Math.atan2(Math.sin(t) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2)); return [p2 / rad, ((l2 / rad + 540) % 360) - 180]; }
const ang = (a, b) => { let d = ((a - b) % 360 + 540) % 360 - 180; return d; };       /* הפרש זוויות ב-(-180,180] */
const median = a => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const pct = (a, p) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const wmedian = (v, w) => { const idx = v.map((_, i) => i).sort((i, j) => v[i] - v[j]); const tot = w.reduce((s, x) => s + x, 0); let acc = 0; for (const i of idx) { acc += w[i]; if (acc >= tot / 2) return v[i]; } return v[idx[idx.length - 1]]; };
/* תנאים ממוצעים בקטע [t0,t1] מהארכיון של הסירה; null אם אין שורה בטווח ±2 שעות */
function condAvg(id, t0, t1) {
  const a = COND[id]; if (!a) return null;
  let rows = a.filter(r => r.t >= t0 - 1800 && r.t <= t1 + 1800);
  if (!rows.length) { const near = a.filter(r => Math.abs(r.t - (t0 + t1) / 2) <= 7200); if (!near.length) return null; rows = [near[0]]; }
  let ux = 0, uy = 0, cx = 0, cy = 0, wave = 0, tws = 0;
  for (const r of rows) { ux += r.tws * Math.sin(r.wdir * rad); uy += r.tws * Math.cos(r.wdir * rad); cx += r.cur * Math.sin(r.curTo * rad); cy += r.cur * Math.cos(r.curTo * rad); wave += r.wave; tws += r.tws; }
  const n = rows.length;
  return { tws: tws / n, wdir: (Math.atan2(ux, uy) / rad + 360) % 360, cur: Math.hypot(cx, cy) / n, curTo: (Math.atan2(cx, cy) / rad + 360) % 360, wave: wave / n };
}
function condAt(id, t) { const a = COND[id]; if (!a) return null; let lo = 0, hi = a.length - 1; if (t < a[0].t - 7200 || t > a[hi].t + 7200) return null; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (a[m].t <= t) lo = m; else hi = m; } return Math.abs(a[lo].t - t) <= Math.abs(a[hi].t - t) ? a[lo] : a[hi]; }

/* ---------- 1. דגימות: קטע של מסלול → (TWS, TWA, מהירות במים, גל, סירה, משקל) ---------- */
const SAMPLES = [];
for (const id of FLEET_IDS) {
  const tr = log[id].filter(p => p.at >= RACE_START);
  for (let i = 1; i < tr.length; i++) {
    const a = tr[i - 1], b = tr[i], dt = (b.at - a.at) / 3600;
    if (dt < 2 || dt > 8) continue;
    const nm = dist(a.lat, a.lon, b.lat, b.lon), sog = nm / dt, cog = brg(a.lat, a.lon, b.lat, b.lon);
    if (PORTS.some(p => dist(p[0], p[1], a.lat, a.lon) < 12 && sog < 1)) continue;          /* עומדת בנמל */
    const c = condAvg(id, a.at, b.at); if (!c) continue;
    const vx = sog * Math.sin(cog * rad) - c.cur * Math.sin(c.curTo * rad), vy = sog * Math.cos(cog * rad) - c.cur * Math.cos(c.curTo * rad);
    const stw = Math.hypot(vx, vy), hdg = (Math.atan2(vx, vy) / rad + 360) % 360;
    const twa = Math.abs(ang(c.wdir, hdg));                                                     /* 0 = אף ברוח */
    SAMPLES.push({ id, t0: a.at, t1: b.at, w: dt, tws: c.tws, twa, stw, sog, cog, wave: c.wave });
  }
}
say(`דגימות: ${SAMPLES.length} קטעים מ-${FLEET_IDS.length} סירות (${new Date(RACE_START * 1000).toISOString().slice(0, 10)} עד ${new Date(Math.max(...SAMPLES.map(s => s.t1)) * 1000).toISOString().slice(0, 16)}Z)`);

/* ---------- 2. הפולאר: V = A(TWS)·B(TWA), ביומן, עם החלקה ---------- */
const TWS_BINS = [0, 4, 7, 10, 13, 16, 20, 25, 32, 45, 80], TWA_BINS = [0, 35, 50, 65, 80, 95, 110, 125, 140, 155, 170, 181];
const bin = (v, edges) => { for (let i = 0; i < edges.length - 1; i++) if (v < edges[i + 1]) return i; return edges.length - 2; };
function fitPolar(samples) {
  /* log V = a[i] + b[j] + e  — ריבועים פחותים בסירוגין (אלטרנטיבי), עם משקל המשך ועם סירוגול לתא ריק דרך השכנים.
     מהירות קרובה לאפס מקבלת רצפה של 0.3 קשר כדי שהיומן לא יתפוצץ. */
  const S = samples.filter(s => s.tws > 0.5).map(s => ({ i: bin(s.tws, TWS_BINS), j: bin(s.twa, TWA_BINS), y: Math.log(Math.max(0.3, s.stw)), w: s.w, s }));
  const nI = TWS_BINS.length - 1, nJ = TWA_BINS.length - 1;
  const a = new Array(nI).fill(0), b = new Array(nJ).fill(0);
  const cnt = Array.from({ length: nI }, () => new Array(nJ).fill(0));
  for (const x of S) cnt[x.i][x.j] += x.w;
  for (let it = 0; it < 30; it++) {
    const sa = new Array(nI).fill(0), wa = new Array(nI).fill(0);
    for (const x of S) { sa[x.i] += x.w * (x.y - b[x.j]); wa[x.i] += x.w; }
    for (let i = 0; i < nI; i++) if (wa[i] > 0) a[i] = sa[i] / wa[i];
    const sb = new Array(nJ).fill(0), wb = new Array(nJ).fill(0);
    for (const x of S) { sb[x.j] += x.w * (x.y - a[x.i]); wb[x.j] += x.w; }
    for (let j = 0; j < nJ; j++) if (wb[j] > 0) b[j] = sb[j] / wb[j];
  }
  /* תא בלי מדידות (רוח שעוד לא הייתה במרוץ): ממלאים מהשכן הקרוב, ורוח חזקה מהחזקה ביותר שנמדדה — לא ממציאים יותר */
  const wa = new Array(nI).fill(0), wb = new Array(nJ).fill(0); for (const x of S) { wa[x.i] += x.w; wb[x.j] += x.w; }
  const fill = (arr, wt) => { for (let i = 0; i < arr.length; i++) if (!(wt[i] > 0)) { let k = 1, v = null; while (k < arr.length && v === null) { if (i - k >= 0 && wt[i - k] > 0) v = arr[i - k]; else if (i + k < arr.length && wt[i + k] > 0) v = arr[i + k]; k++; } arr[i] = v === null ? 0 : v; } };
  fill(a, wa); fill(b, wb);
  /* החלקה קלה בין תאים שכנים (1-2-1), כדי שמדרגה אחת רועשת לא תהפוך לקפיצה בתחזית */
  const smooth = arr => arr.map((v, i) => { const l = arr[Math.max(0, i - 1)], r = arr[Math.min(arr.length - 1, i + 1)]; return (l + 2 * v + r) / 4; });
  const A = smooth(a), B = smooth(b);
  const V = (tws, twa) => Math.exp(A[bin(tws, TWS_BINS)] + B[bin(Math.abs(twa), TWA_BINS)]);
  /* מקדם לכל סירה: חציון משוקלל של נמדד/מודל; גלים: שיפוע השארית ביומן על גובה הגל */
  const K = {}; const byBoat = {};
  for (const x of S) (byBoat[x.s.id] = byBoat[x.s.id] || []).push(x);
  for (const id of Object.keys(byBoat)) { const v = byBoat[id].map(x => Math.max(0.3, x.s.stw) / V(x.s.tws, x.s.twa)), w = byBoat[id].map(x => x.w); K[id] = Math.min(1.4, Math.max(0.6, wmedian(v, w))); }
  let sxy = 0, sxx = 0, sw = 0, mx = 0, my = 0; for (const x of S) { const r = x.y - Math.log(V(x.s.tws, x.s.twa) * (K[x.s.id] || 1)); mx += x.w * x.s.wave; my += x.w * r; sw += x.w; }
  mx /= sw || 1; my /= sw || 1; for (const x of S) { const r = x.y - Math.log(V(x.s.tws, x.s.twa) * (K[x.s.id] || 1)); sxy += x.w * (x.s.wave - mx) * (r - my); sxx += x.w * (x.s.wave - mx) ** 2; }
  const waveK = sxx > 0 ? Math.max(-0.4, Math.min(0.2, sxy / sxx)) : 0;
  const resid = S.map(x => x.y - Math.log(V(x.s.tws, x.s.twa) * (K[x.s.id] || 1) * Math.exp(waveK * (x.s.wave - mx))));
  const sigma = Math.sqrt(resid.reduce((s, r) => s + r * r, 0) / Math.max(1, resid.length));
  return { A, B, K, waveK, waveMean: mx, sigma, n: S.length, cnt,
           speed: (id, tws, twa, wave) => (K[id] || 1) * V(tws, twa) * Math.exp(waveK * ((wave || mx) - mx)) };
}
const POLAR = fitPolar(SAMPLES);
say(`פולאר: ${POLAR.n} דגימות · פיזור השארית ביומן σ=${POLAR.sigma.toFixed(2)} (≈ ±${Math.round((Math.exp(POLAR.sigma) - 1) * 100)}% במהירות) · מקדם גלים ${POLAR.waveK.toFixed(2)} לכל מטר`);
say('  TWS→ ' + TWS_BINS.slice(0, -1).map((e, i) => String(e + '-' + TWS_BINS[i + 1]).padStart(6)).join(''));
for (let j = 0; j < TWA_BINS.length - 1; j++) say('  TWA ' + String(TWA_BINS[j] + '°').padStart(4) + ' ' + POLAR.A.map((a, i) => (POLAR.cnt[i][j] > 0 ? Math.exp(a + POLAR.B[j]).toFixed(1) : ' ·').padStart(6)).join(''));
say('  מקדמי הסירות: ' + Object.keys(POLAR.K).sort((a, b) => POLAR.K[b] - POLAR.K[a]).map(id => `${NAMES[id] || id} ${POLAR.K[id].toFixed(2)}`).join(' · '));

/* ---------- 3. מבחן לאחור ---------- */
/* הצומת הבא בקו המסלול. לא "הקרוב ביותר": קו המסלול חוזר הביתה באותם מים (ליד פורטוגל ומדיירה יורד ועולה),
   וצומת של דרך החזרה יכול להיות קרוב יותר מהצומת הבא בדרך החוצה. לכן הולכים לפי המרחק לסיום (dtf) שהמעקב
   נותן לכל נקודה: היעד הוא הצומת הראשון שהמרחק שלו לסיום קטן מזה של הסירה. */
const CUM = new Array(COURSE.length); CUM[COURSE.length - 1] = 0;
for (let i = COURSE.length - 2; i >= 0; i--) CUM[i] = CUM[i + 1] + dist(COURSE[i].lat, COURSE[i].lon, COURSE[i + 1].lat, COURSE[i + 1].lon);
function nextNode(dtf) { for (let i = 0; i < COURSE.length; i++) if (CUM[i] < dtf - 8) return i; return COURSE.length - 1; }
/* זווית מינימלית לרוח: 0 בכוונה. הפולאר נלמד מממוצעים של ארבע שעות, ולכן התא "0–35°" כבר מכיל את הזיגזג נגד
   הרוח כפי שהצי באמת עשה אותו (313 שעות מדידה, רובן במפרץ ביסקאיה) — מהירות "עשויה טוב" בכיוון המטרה. זווית
   מינימלית מעליו הייתה סופרת את ההפסד פעמיים. נבדק: 0/30/42/50 נותנים אותה טעות במבחן לאחור (עד כאן המרוץ
   כמעט כולו עם הרוח). EXO_MIN_TWA=42 מחזיר את החוק הפיזיקלי, לבדיקה כשיהיו ימים נגד הרוח. */
const MIN_TWA = +(process.env.EXO_MIN_TWA ?? 0);
function simulate(id, polar, t0, lat, lon, dtf0, hours) {
  const out = []; let la = lat, lo = lon, k = nextNode(dtf0);
  for (let h = 1; h <= hours; h++) {
    const t = t0 + h * 3600, c = condAt(id, t); if (!c) return null;
    if (dist(la, lo, COURSE[k].lat, COURSE[k].lon) < 8 && k < COURSE.length - 1) k++;
    const tgt = COURSE[k]; let hdg = brg(la, lo, tgt.lat, tgt.lon);
    const rel = ang(hdg, c.wdir); if (Math.abs(rel) < MIN_TWA) hdg = (c.wdir + Math.sign(rel || 1) * MIN_TWA + 360) % 360;   /* אין להפליג ישר לרוח */
    const twa = Math.abs(ang(c.wdir, hdg)), v = polar.speed(id, c.tws, twa, c.wave);
    const vx = v * Math.sin(hdg * rad) + c.cur * Math.sin(c.curTo * rad), vy = v * Math.cos(hdg * rad) + c.cur * Math.cos(c.curTo * rad);
    const p = dest(la, lo, (Math.atan2(vx, vy) / rad + 360) % 360, Math.hypot(vx, vy)); la = p[0]; lo = p[1];
    out.push({ t, lat: la, lon: lo });
  }
  return out;
}
function posAt(tr, t) { if (t < tr[0].at || t > tr[tr.length - 1].at) return null; let lo = 0, hi = tr.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (tr[m].at <= t) lo = m; else hi = m; } const a = tr[lo], b = tr[hi], f = b.at === a.at ? 0 : (t - a.at) / (b.at - a.at); return { lat: a.lat + (b.lat - a.lat) * f, lon: a.lon + (b.lon - a.lon) * f, dtf: a.dtf + (b.dtf - a.dtf) * f, at: t }; }

const HORIZONS = [24, 48, 72];
const ERR = { model: {}, hold: {}, still: {} }; for (const k of Object.keys(ERR)) for (const h of HORIZONS) ERR[k][h] = [];
const BYBOAT = {}; const BYDAY = {};
const lastT = Math.max(...SAMPLES.map(s => s.t1));
let runs = 0, skipped = 0;
for (let D = RACE_START + 3 * 86400 - (RACE_START % 86400) + 86400; D + 24 * 3600 <= lastT; D += 86400) {   /* מהיום הרביעי, כל חצות UTC */
  const known = SAMPLES.filter(s => s.t1 <= D);
  if (known.length < 40) { skipped++; continue; }
  const polar = fitPolar(known);
  for (const id of FLEET_IDS) {
    const tr = log[id].filter(p => p.at >= RACE_START); const p0 = posAt(tr, D); if (!p0) continue;
    if (PORTS.some(p => dist(p[0], p[1], p0.lat, p0.lon) < 12)) continue;
    const pm = posAt(tr, D - 4 * 3600); if (!pm) continue;
    const sog = dist(pm.lat, pm.lon, p0.lat, p0.lon) / 4, cog = brg(pm.lat, pm.lon, p0.lat, p0.lon);
    const sim = simulate(id, polar, D, p0.lat, p0.lon, p0.dtf, 72); if (!sim) { skipped++; continue; }
    runs++;
    for (const h of HORIZONS) {
      const real = posAt(tr, D + h * 3600); if (!real) continue;
      const pr = sim[h - 1], hold = dest(p0.lat, p0.lon, cog, sog * h);
      const eM = dist(pr.lat, pr.lon, real.lat, real.lon), eH = dist(hold[0], hold[1], real.lat, real.lon), eS = dist(p0.lat, p0.lon, real.lat, real.lon);
      ERR.model[h].push(eM); ERR.hold[h].push(eH); ERR.still[h].push(eS);
      (BYBOAT[id] = BYBOAT[id] || { 24: [], 48: [], 72: [] })[h].push(eM);
      const dk = new Date(D * 1000).toISOString().slice(5, 10); (BYDAY[dk] = BYDAY[dk] || { 24: [], 48: [], 72: [] })[h].push(eM);
    }
  }
}
if (process.env.EXO_TRACE) {   /* EXO_TRACE=4:2026-09-15 — מדפיס את התחזית שעה-שעה לסירה אחת מיום אחד */
  const [tid, day] = process.env.EXO_TRACE.split(':'); const D = Date.parse(day + 'T00:00Z') / 1000;
  const tr = log[tid].filter(p => p.at >= RACE_START), p0 = posAt(tr, D), polar = fitPolar(SAMPLES.filter(s => s.t1 <= D));
  let la = p0.lat, lo = p0.lon, k = nextNode(p0.dtf);
  for (let h = 1; h <= 72; h++) { const t = D + h * 3600, c = condAt(tid, t); if (dist(la, lo, COURSE[k].lat, COURSE[k].lon) < 8 && k < COURSE.length - 1) k++; const tgt = COURSE[k]; let hdg = brg(la, lo, tgt.lat, tgt.lon); const rel = ang(hdg, c.wdir); if (Math.abs(rel) < MIN_TWA) hdg = (c.wdir + Math.sign(rel || 1) * MIN_TWA + 360) % 360;
    const twa = Math.abs(ang(c.wdir, hdg)), v = polar.speed(tid, c.tws, twa, c.wave); const vx = v * Math.sin(hdg * rad) + c.cur * Math.sin(c.curTo * rad), vy = v * Math.cos(hdg * rad) + c.cur * Math.cos(c.curTo * rad);
    const p = dest(la, lo, (Math.atan2(vx, vy) / rad + 360) % 360, Math.hypot(vx, vy)); la = p[0]; lo = p[1]; const real = posAt(tr, t);
    if (h % 6 === 0) console.log(`h${h} tgt ${tgt.lat},${tgt.lon} hdg ${hdg.toFixed(0)} wind ${c.tws.toFixed(0)}kn from ${c.wdir} twa ${twa.toFixed(0)} v ${v.toFixed(1)} cur ${c.cur} → ${la.toFixed(2)},${lo.toFixed(2)} | real ${real ? real.lat.toFixed(2) + ',' + real.lon.toFixed(2) : '-'} err ${real ? dist(la, lo, real.lat, real.lon).toFixed(0) : '-'}`); }
}
say(`\nמבחן לאחור: ${runs} תחזיות (${skipped} דולגו — אין מספיק היסטוריה או ארכיון)`);
say('  אופק    מודל p50 / p90     "ממשיך כמו עכשיו" p50 / p90     "עומד" p50');
for (const h of HORIZONS) say(`  ${String(h).padStart(2)} שע׳  ${pct(ERR.model[h], .5).toFixed(0).padStart(5)} / ${pct(ERR.model[h], .9).toFixed(0).padStart(4)} מייל      ${pct(ERR.hold[h], .5).toFixed(0).padStart(5)} / ${pct(ERR.hold[h], .9).toFixed(0).padStart(4)} מייל           ${pct(ERR.still[h], .5).toFixed(0).padStart(4)} מייל   (n=${ERR.model[h].length})`);
say('  לפי סירה (טעות חציונית ב-24/48/72 שע׳): ' + Object.keys(BYBOAT).sort((a, b) => median(BYBOAT[a][72]) - median(BYBOAT[b][72])).map(id => `${NAMES[id] || id} ${median(BYBOAT[id][24]).toFixed(0)}/${median(BYBOAT[id][48]).toFixed(0)}/${median(BYBOAT[id][72]).toFixed(0)}`).join(' · '));
say('  לפי יום הזינוק של התחזית (חציון 72 שע׳): ' + Object.keys(BYDAY).map(d => `${d}: ${median(BYDAY[d][72]).toFixed(0)}`).join(' · '));

/* ---------- 4. פלט ---------- */
const out = {
  v: 1, learnedAt: new Date().toISOString().slice(0, 16) + 'Z', about: 'פולאר נלמד מהמסלולים ומארכיון מזג האוויר (scripts/polar-learn.mjs). לא עורכים ביד.',
  samples: SAMPLES.length, boats: FLEET_IDS.length, sigmaLog: +POLAR.sigma.toFixed(3), waveK: +POLAR.waveK.toFixed(3), waveMean: +POLAR.waveMean.toFixed(2),
  twsBins: TWS_BINS, twaBins: TWA_BINS,
  grid: POLAR.A.map((a, i) => POLAR.B.map((b, j) => +Math.exp(a + b).toFixed(2))),             /* [tws bin][twa bin] קשר, לסירה ממוצעת */
  measured: POLAR.cnt.map(r => r.map(w => +w.toFixed(0))),                                      /* שעות מדידה בכל תא */
  factors: Object.fromEntries(Object.keys(POLAR.K).map(id => [id, +POLAR.K[id].toFixed(3)])),
  minTwa: MIN_TWA,
  backtest: { runs, horizons: Object.fromEntries(HORIZONS.map(h => [h, {
    n: ERR.model[h].length, model: { p50: +pct(ERR.model[h], .5).toFixed(1), p90: +pct(ERR.model[h], .9).toFixed(1) },
    hold: { p50: +pct(ERR.hold[h], .5).toFixed(1), p90: +pct(ERR.hold[h], .9).toFixed(1) }, still: { p50: +pct(ERR.still[h], .5).toFixed(1) } }])),
    byBoat: Object.fromEntries(Object.keys(BYBOAT).map(id => [id, Object.fromEntries(HORIZONS.map(h => [h, +median(BYBOAT[id][h]).toFixed(1)]))])) }
};
writeFileSync('assets/polar.json', JSON.stringify(out));
say(`\nנכתב assets/polar.json (${JSON.stringify(out).length} בתים)`);
