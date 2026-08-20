'use strict';
/* Local preview: serves the repo statically and runs /api/votes against an
   in-memory store so the synced-voting path can be exercised without Redis.
   node build/devserver.js            -> shared voting ON  (simulated store)
   node build/devserver.js --no-kv    -> shared voting OFF (localStorage path)  */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = Number(process.env.PORT || 4321);
const KV = !process.argv.includes('--no-kv');

const store = new Map(); // "id|voter" -> "1"
const VOTERS = ['miska', 'jakub'];

function unpack() {
  const out = {};
  for (const field of store.keys()) {
    const sep = field.lastIndexOf('|');
    const id = field.slice(0, sep);
    const voter = field.slice(sep + 1);
    (out[id] = out[id] || {})[voter] = true;
  }
  return out;
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.md': 'text/plain; charset=utf-8',
};

http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/votes') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      if (!KV) return res.end(JSON.stringify({ ok: true, mode: 'none', votes: {} }));
      if (req.method === 'GET') return res.end(JSON.stringify({ ok: true, mode: 'kv', votes: unpack() }));
      if (req.method === 'POST') {
        let raw = '';
        req.on('data', (c) => (raw += c));
        return req.on('end', () => {
          let b = {};
          try { b = JSON.parse(raw); } catch (e) { /* ignore */ }
          if (!b.id || !VOTERS.includes(b.voter)) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ ok: false, error: 'bad request' }));
          }
          const field = b.id + '|' + b.voter;
          if (b.value === true) store.set(field, '1');
          else store.delete(field);
          res.end(JSON.stringify({ ok: true, mode: 'kv', votes: unpack() }));
        });
      }
      res.statusCode = 405;
      return res.end(JSON.stringify({ ok: false }));
    }

    let p = decodeURIComponent(url.pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.statusCode = 404;
      return res.end('not found');
    }
    res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  })
  .listen(PORT, () => console.log('camino dev server on http://localhost:' + PORT + '  (kv=' + KV + ')'));
