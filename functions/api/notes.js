/* ===== functions/api/notes.js — ההערות של תחנת הבדיקה (/review/) =====
   Cloudflare Pages Function. מסד D1 בשם exodus-review, מחובר לפרויקט בשם REVIEW_DB.
   הטבלה: notes (id TEXT PRIMARY KEY, data TEXT, created INTEGER, updated INTEGER); data הוא JSON של הערה אחת.
   כל בקשה חייבת כותרת x-review-key. כאן יושב רק ה-SHA-256 שלו; המפתח עצמו לא בריפו.
   GET  → {notes:[…]}
   POST {op:'add',   note:{n,key,fname,view,allViews,target,page,screen,point,text}}
   POST {op:'reply', id, who:'user'|'claude', text, status?:'open'|'fixed'|'done'|'wontfix'}
   POST {op:'delete', id} */
const HASH = '910c6e2e57e00406cb9d4508f89cd318805530bcbdd1d18eca3d7507c82ce0af';
const STATUSES = ['open', 'fixed', 'done', 'wontfix'];

function out(o, status) {
  return new Response(JSON.stringify(o), { status: status || 200, headers: {
    'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
}
async function sha256(t) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}
const str = (v, n) => (typeof v === 'string' ? v : v == null ? '' : String(v)).slice(0, n);

export async function onRequest({ request, env }) {
  const key = request.headers.get('x-review-key') || '';
  if (key.length < 20 || key.length > 200 || (await sha256(key)) !== HASH) return out({ error: 'key' }, 401);
  const db = env.REVIEW_DB;
  if (!db) return out({ error: 'db' }, 503);

  if (request.method === 'GET') {
    const r = await db.prepare('SELECT data FROM notes ORDER BY created').all();
    return out({ notes: (r.results || []).map(x => JSON.parse(x.data)) });
  }
  if (request.method !== 'POST') return out({ error: 'method' }, 405);

  let b;
  try { b = await request.json(); } catch (e) { return out({ error: 'json' }, 400); }
  const now = Date.now();

  if (b.op === 'add') {
    const n = b.note || {};
    const text = str(n.text, 4000).trim();
    if (!text) return out({ error: 'empty' }, 400);
    const pt = Array.isArray(n.point) && n.point.length === 2 ? n.point.map(v => Math.round(+v || 0)) : null;
    const note = {
      id: crypto.randomUUID(), n: str(n.n, 8), key: str(n.key, 160), fname: str(n.fname, 200),
      view: str(n.view, 20), allViews: !!n.allViews, target: str(n.target, 10), page: str(n.page, 10),
      screen: str(n.screen, 20), point: pt, status: 'open',
      thread: [{ t: now, who: 'user', text, status: 'open' }], created: now, updated: now };
    await db.prepare('INSERT INTO notes (id, data, created, updated) VALUES (?1, ?2, ?3, ?4)')
      .bind(note.id, JSON.stringify(note), now, now).run();
    return out({ note });
  }

  if (b.op === 'reply') {
    const row = await db.prepare('SELECT data FROM notes WHERE id = ?1').bind(str(b.id, 64)).first();
    if (!row) return out({ error: 'notfound' }, 404);
    const note = JSON.parse(row.data);
    if ((note.thread || []).length >= 200) return out({ error: 'long' }, 400);
    const status = STATUSES.includes(b.status) ? b.status : note.status;
    const text = str(b.text, 4000).trim();
    if (!text && status === note.status) return out({ error: 'empty' }, 400);
    note.thread = note.thread || [];
    note.thread.push({ t: now, who: b.who === 'claude' ? 'claude' : 'user', text, status });
    note.status = status; note.updated = now;
    await db.prepare('UPDATE notes SET data = ?2, updated = ?3 WHERE id = ?1').bind(note.id, JSON.stringify(note), now).run();
    return out({ note });
  }

  if (b.op === 'delete') {
    await db.prepare('DELETE FROM notes WHERE id = ?1').bind(str(b.id, 64)).run();
    return out({ ok: true });
  }
  return out({ error: 'op' }, 400);
}
