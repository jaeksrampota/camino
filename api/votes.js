'use strict';
/*
 * /api/votes — shared vote store for the two of us.
 *
 * GET   -> { ok, mode, votes: { "<itemId>": { miska:true, jakub:true } } }
 * POST  -> body { id, voter:"miska"|"jakub", value:boolean }  -> same shape back
 *
 * Storage is an Upstash-protocol Redis hash reached over REST, so this file has
 * zero npm dependencies and the project needs no build step. It picks up either
 * naming convention that Vercel's Redis / Upstash integrations inject:
 *
 *   KV_REST_API_URL        + KV_REST_API_TOKEN
 *   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 *
 * With neither set, GET answers mode:"none" and the page silently falls back to
 * per-device localStorage — the site still works, votes just are not shared.
 */

const KEY = 'camino:votes:v1';
const VOTERS = ['miska', 'jakub'];
const MAX_ID = 200;

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const ENABLED = Boolean(URL_ && TOKEN);

async function redis(command) {
  const res = await fetch(URL_.replace(/\/+$/, ''), {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error('redis ' + res.status + ' ' + (await res.text()).slice(0, 200));
  const json = await res.json();
  if (json.error) throw new Error('redis: ' + json.error);
  return json.result;
}

/* flat [field, value, field, value, ...] -> { id: { voter: true } } */
function unpack(flat) {
  const out = {};
  if (!Array.isArray(flat)) return out;
  for (let i = 0; i < flat.length; i += 2) {
    const field = String(flat[i]);
    const sep = field.lastIndexOf('|');
    if (sep < 0) continue;
    const id = field.slice(0, sep);
    const voter = field.slice(sep + 1);
    if (!VOTERS.includes(voter)) continue;
    if (String(flat[i + 1]) !== '1') continue;
    (out[id] = out[id] || {})[voter] = true;
  }
  return out;
}

async function readAll() {
  return unpack(await redis(['HGETALL', KEY]));
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(204).end();
  }

  if (!ENABLED) {
    return res.status(200).end(
      JSON.stringify({
        ok: true,
        mode: 'none',
        votes: {},
        hint: 'No Redis credentials in env. Add the Upstash/Redis integration in the Vercel dashboard to switch shared voting on.',
      })
    );
  }

  try {
    if (req.method === 'GET') {
      return res.status(200).end(JSON.stringify({ ok: true, mode: 'kv', votes: await readAll() }));
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch (e) {
          body = null;
        }
      }
      if (!body || typeof body !== 'object') {
        return res.status(400).end(JSON.stringify({ ok: false, error: 'invalid body' }));
      }

      const id = String(body.id || '');
      const voter = String(body.voter || '');
      const value = body.value === true || body.value === 'true';

      if (!id || id.length > MAX_ID || id.includes('|')) {
        return res.status(400).end(JSON.stringify({ ok: false, error: 'invalid id' }));
      }
      if (!VOTERS.includes(voter)) {
        return res.status(400).end(JSON.stringify({ ok: false, error: 'invalid voter' }));
      }

      const field = id + '|' + voter;
      if (value) await redis(['HSET', KEY, field, '1']);
      else await redis(['HDEL', KEY, field]);

      return res.status(200).end(JSON.stringify({ ok: true, mode: 'kv', votes: await readAll() }));
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).end(JSON.stringify({ ok: false, error: 'method not allowed' }));
  } catch (err) {
    return res.status(500).end(JSON.stringify({ ok: false, error: String(err.message || err) }));
  }
};
