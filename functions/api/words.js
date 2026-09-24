/* ===== functions/api/words.js — "מילים לדניאל" (g01) =====
   Cloudflare Pages Function. אותו מסד D1 של תחנת הבדיקה (REVIEW_DB), טבלה משלו.
   מבקר משאיר משפט; הוא נשמר עם הזמן ועם המקום של הסירה באותו רגע (מ-assets/data.js של האתר עצמו,
   לא ממה שהדפדפן שולח). ההודעות לא מוצגות באתר. בסוף המסע הן נפרשות על המפה בשביל דניאל.

   POST {text, name?, hp?}   → {ok:true}           (hp = שדה מלכודת לבוטים; מלא → "ok" בלי לשמור)
   GET  עם x-review-key      → {words:[…]}          (רק בעל האתר; המפתח עצמו לא בריפו)

   פרטיות: לא נשמרת כתובת IP. להגבלת קצב (5 ביום לכל שולח) נשמר גיבוב של IP+תאריך בטבלה נפרדת,
   ושורות מימים קודמים נמחקות בכל שליחה. */
const HASH = '910c6e2e57e00406cb9d4508f89cd318805530bcbdd1d18eca3d7507c82ce0af';
const PER_DAY = 5, MAX_TEXT = 500, MAX_NAME = 40;

function out(o, status) {
  return new Response(JSON.stringify(o), { status: status || 200, headers: {
    'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
}
async function sha256(t) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}
const clean = (v, n) => (typeof v === 'string' ? v : '')
  .replace(/[\u0000-\u0008\u000B-\u001F\u007F‪-‮⁦-⁩]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);

async function ensure(db) {
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS words (id TEXT PRIMARY KEY, created INTEGER, data TEXT)'),
    db.prepare('CREATE TABLE IF NOT EXISTS words_rl (k TEXT PRIMARY KEY, day TEXT, n INTEGER)')
  ]);
}

/* המקום של הסירה ברגע השליחה — מהקובץ שהבוט כותב, דרך האתר עצמו */
async function boatNow(env, url) {
  try {
    const r = await env.ASSETS.fetch(new Request(new URL('/assets/data.js', url)));
    const t = await r.text();
    const m = t.match(/var FIX\s*=\s*\{([\s\S]*?)\};/);
    if (!m) return null;
    const num = k => { const x = m[1].match(new RegExp('\\b' + k + ':\\s*(-?[\\d.]+)')); return x ? +x[1] : null; };
    const s = k => { const x = m[1].match(new RegExp('\\b' + k + ":\\s*'([^']*)'")); return x ? x[1] : null; };
    return { fixAt: num('at'), lat: num('lat'), lon: num('lon'), day: num('dayN'), near: s('nearLandName') };
  } catch (e) { return null; }
}

export async function onRequest({ request, env }) {
  const db = env.REVIEW_DB;
  if (!db) return out({ error: 'db' }, 503);

  if (request.method === 'GET') {
    const key = request.headers.get('x-review-key') || '';
    if (key.length < 20 || key.length > 200 || (await sha256(key)) !== HASH) return out({ error: 'key' }, 401);
    await ensure(db);
    const r = await db.prepare('SELECT data FROM words ORDER BY created').all();
    return out({ words: (r.results || []).map(x => JSON.parse(x.data)) });
  }
  if (request.method !== 'POST') return out({ error: 'method' }, 405);

  let b;
  try { b = await request.json(); } catch (e) { return out({ error: 'json' }, 400); }
  if (b && typeof b.hp === 'string' && b.hp) return out({ ok: true });
  const text = clean(b && b.text, MAX_TEXT), name = clean(b && b.name, MAX_NAME);
  if (text.length < 2) return out({ error: 'empty' }, 400);

  await ensure(db);
  const now = Date.now(), day = new Date(now).toISOString().slice(0, 10);
  const ip = request.headers.get('cf-connecting-ip') || '';
  const k = (await sha256(ip + '|' + day + '|words')).slice(0, 32);
  await db.prepare('DELETE FROM words_rl WHERE day <> ?1').bind(day).run();
  const row = await db.prepare('SELECT n FROM words_rl WHERE k = ?1').bind(k).first();
  if (row && row.n >= PER_DAY) return out({ error: 'limit' }, 429);

  const w = { id: crypto.randomUUID(), t: now, text, name, boat: await boatNow(env, request.url) };
  await db.batch([
    db.prepare('INSERT INTO words (id, created, data) VALUES (?1, ?2, ?3)').bind(w.id, now, JSON.stringify(w)),
    db.prepare('INSERT INTO words_rl (k, day, n) VALUES (?1, ?2, 1) ON CONFLICT(k) DO UPDATE SET n = n + 1').bind(k, day)
  ]);
  return out({ ok: true });
}
