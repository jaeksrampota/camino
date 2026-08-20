'use strict';
/*
 * parse.js — reads the two original research files verbatim and normalises them
 * into build/data.json. No content is rewritten or summarised: prose from
 * research A is carried across as-is (inner HTML), research B's structured
 * fields are carried across as-is.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC_A = path.join(ROOT, 'source', 'research-a.html');
const SRC_B = path.join(ROOT, 'source', 'research-b.html');
const OUT = path.join(__dirname, 'data.json');

const BS = String.fromCharCode(92);

/* ------------------------------------------------------------------ utils */

function slug(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function stripTags(html) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* Attribute values come out of the source still HTML-escaped. Decode them here
   so the renderer can escape exactly once instead of producing &amp;amp;. */
function decodeAttr(s) {
  return String(s)
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/* Pull out a balanced element starting at index i (which must point at '<').
   Returns {outer, inner, end}. Handles nesting of the same tag name. */
function balanced(html, i, tag) {
  const open = new RegExp('<' + tag + '(\\s|>)', 'i');
  const close = '</' + tag + '>';
  let depth = 0;
  let k = i;
  while (k < html.length) {
    if (html[k] === '<') {
      const rest = html.slice(k, k + tag.length + 3);
      if (open.test(rest)) {
        depth++;
        k = html.indexOf('>', k) + 1;
        if (depth === 1) var innerStart = k;
        continue;
      }
      if (html.slice(k, k + close.length).toLowerCase() === close) {
        depth--;
        if (depth === 0) {
          return {
            outer: html.slice(i, k + close.length),
            inner: html.slice(innerStart, k),
            end: k + close.length,
          };
        }
        k += close.length;
        continue;
      }
    }
    k++;
  }
  throw new Error('unbalanced <' + tag + '> at ' + i);
}

/* Find every balanced <tag ...class contains cls...> block, in order. */
function findBlocks(html, tag, cls) {
  const out = [];
  const re = new RegExp('<' + tag + '\\b[^>]*class="([^"]*)"', 'gi');
  let m;
  while ((m = re.exec(html))) {
    if (cls && !m[1].split(/\s+/).includes(cls)) continue;
    const b = balanced(html, m.index, tag);
    out.push({ start: m.index, classes: m[1], ...b });
    re.lastIndex = b.end;
  }
  return out;
}

/* ------------------------------------------------------- research A parser */

function parseResearchA() {
  const raw = fs.readFileSync(SRC_A, 'utf8');
  const bodyStart = raw.indexOf('<div class="wrap">') + '<div class="wrap">'.length;
  const bodyEnd = raw.lastIndexOf('</div><script>');
  const body = raw.slice(bodyStart, bodyEnd);

  // header / banner
  const header = balanced(body, body.indexOf('<header'), 'header');
  const banner = findBlocks(body, 'div', 'banner')[0];
  const footer = balanced(body, body.indexOf('<footer'), 'footer');

  // sections
  const sections = [];
  const secRe = /<section id="([^"]+)"[^>]*>/g;
  let m;
  while ((m = secRe.exec(body))) {
    const b = balanced(body, m.index, 'section');
    sections.push({ id: m[1], inner: b.inner });
    secRe.lastIndex = b.end;
  }

  const parsed = sections.map((sec) => {
    let inner = sec.inner;
    // section head
    let head = { kicker: '', title: sec.id, meta: '' };
    const sh = findBlocks(inner, 'div', 'shead')[0];
    if (sh) {
      const k = sh.inner.match(/<p class="skicker">([\s\S]*?)<\/p>/);
      const h = sh.inner.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
      const mt = sh.inner.match(/<p class="smeta">([\s\S]*?)<\/p>/);
      head = {
        kicker: k ? stripTags(k[1]) : '',
        title: h ? stripTags(h[1]) : sec.id,
        meta: mt ? mt[1].trim() : '',
      };
      inner = inner.slice(0, sh.start) + inner.slice(sh.start + sh.outer.length);
    }

    // walk the remainder, splitting on <article class="card...">
    const blocks = [];
    const arts = findBlocks(inner, 'article', 'card');
    let cursor = 0;
    for (const art of arts) {
      const between = inner.slice(cursor, art.start).trim();
      if (between) blocks.push({ type: 'html', html: between });
      blocks.push({ type: 'card', card: parseCardA(art, sec.id) });
      cursor = art.start + art.outer.length;
    }
    const tail = inner.slice(cursor).trim();
    if (tail) blocks.push({ type: 'html', html: tail });

    return { id: sec.id, ...head, blocks };
  });

  return {
    headerHTML: header.inner,
    bannerHTML: banner ? banner.inner : '',
    footerHTML: footer.inner,
    sections: parsed,
  };
}

function parseCardA(art, sectionId) {
  let inner = art.inner;
  const booked = /\bbooked\b/.test(art.classes);

  // head
  let name = '', href = '', tier = '', badge = '';
  const ch = findBlocks(inner, 'div', 'chead')[0];
  if (ch) {
    const h3 = ch.inner.match(/<h3[^>]*>([\s\S]*?)<\/h3>/);
    if (h3) {
      const a = h3[1].match(/<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
      if (a) { href = decodeAttr(a[1]); name = stripTags(a[2]); }
      else name = stripTags(h3[1]);
    }
    const t = ch.inner.match(/<span class="tier[^"]*"[^>]*>([\s\S]*?)<\/span>/);
    if (t) tier = stripTags(t[1]);
    const bo = ch.inner.match(/<span class="badge-ok">([\s\S]*?)<\/span>/);
    if (bo) badge = stripTags(bo[1]);
    inner = inner.replace(ch.outer, '');
  }

  // chips
  const chips = [];
  const cp = findBlocks(inner, 'div', 'chips')[0];
  if (cp) {
    const re = /<span class="chip([^"]*)"[^>]*>([\s\S]*?)<\/span>/g;
    let m;
    while ((m = re.exec(cp.inner))) chips.push({ kind: m[1].trim(), text: stripTags(m[2]) });
    inner = inner.replace(cp.outer, '');
  }

  // buttons
  let buttons = [];
  const bt = findBlocks(inner, 'div', 'btns')[0];
  if (bt) {
    const re = /<a class="btn([^"]*)"\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    let m;
    while ((m = re.exec(bt.inner)))
      buttons.push({ primary: /primary/.test(m[1]), href: decodeAttr(m[2]), label: stripTags(m[3]) });
    inner = inner.replace(bt.outer, '');
  }

  return {
    id: 'r1:' + sectionId + ':' + slug(name),
    name,
    href,
    tier,
    badge,
    booked,
    chips,
    buttons,
    bodyHTML: inner.trim(),
  };
}

/* ------------------------------------------------------- research B parser */

function jsBlock(js, from, open, close) {
  const i = js.indexOf(open, from);
  let d = 0, q = null;
  for (let k = i; k < js.length; k++) {
    const c = js[k];
    if (q) { if (c === BS) { k++; continue; } if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; continue; }
    if (c === open) d++;
    else if (c === close) { d--; if (d === 0) return js.slice(i, k + 1); }
  }
  throw new Error('unbalanced ' + open);
}

function parseResearchB() {
  const raw = fs.readFileSync(SRC_B, 'utf8');
  const js = raw.slice(raw.indexOf('<script>') + 8, raw.lastIndexOf('</script>'));
  const AIR = new Function('return ' + jsBlock(js, js.indexOf('var AIR'), '{', '}'))();
  const DATA = new Function('AIR', 'return ' + jsBlock(js, js.indexOf('var DATA'), '{', '}'))(AIR);
  const FALLBACKS = new Function('AIR', 'return ' + jsBlock(js, js.indexOf('FALLBACKS'), '[', ']'))(AIR);
  const quick = new Function('return ' + jsBlock(js, js.indexOf('var quick'), '[', ']'))();

  // static section prose: intro paragraph per section + the Ziortza + transport blocks
  const body = raw.slice(raw.indexOf('<body>') + 6, raw.indexOf('</body>'));
  const sections = {};
  const secRe = /<section id="([^"]+)"[^>]*>/g;
  let m;
  while ((m = secRe.exec(body))) {
    const b = balanced(body, m.index, 'section');
    sections[m[1]] = b.inner;
    secRe.lastIndex = b.end;
  }

  function sectionMeta(id) {
    const inner = sections[id] || '';
    const h2 = inner.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
    const dates = inner.match(/<div class="section-head">[\s\S]*?<p>([\s\S]*?)<\/p>/);
    const nights = inner.match(/<span class="night-chip">([\s\S]*?)<\/span>/);
    const intro = inner.match(/<p class="market-note">([\s\S]*?)<\/p>/);
    return {
      id,
      title: h2 ? stripTags(h2[1]) : id,
      dates: dates ? stripTags(dates[1]) : '',
      nights: nights ? stripTags(nights[1]) : '',
      introHTML: intro ? intro[1].trim() : '',
    };
  }

  const order = ['donostia', 'zarautz', 'deba', 'markina', 'ziortza', 'bilbao'];
  const secs = order.map((id) => {
    const meta = sectionMeta(id);
    const cards = (DATA[id] || []).map((c) => ({ ...c, id: 'r2:' + id + ':' + slug(c.name) }));
    return { ...meta, cards };
  });

  // hero + framing text
  const heroCaveat = body.match(/<div class="caveat"[^>]*>([\s\S]*?)<\/div>/);
  const legend = [];
  {
    const lg = findBlocks(body, 'div', 'legend')[0];
    if (lg) {
      const re = /<span>([\s\S]*?)<\/span>/g;
      let x;
      while ((x = re.exec(lg.inner))) legend.push(stripTags(x[1]));
    }
  }
  const routeStrip = [];
  {
    const rs = findBlocks(body, 'div', 'route-strip')[0];
    if (rs) {
      const re = /<div class="route-day">\s*<b>([\s\S]*?)<\/b>\s*<span>([\s\S]*?)<\/span>\s*<\/div>/g;
      let x;
      while ((x = re.exec(rs.inner))) routeStrip.push([stripTags(x[1]), stripTags(x[2])]);
    }
  }

  // Deba rest-day activity links
  const activities = [];
  {
    const inner = sections.deba || '';
    const re = /<a class="rest-item"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    let x;
    while ((x = re.exec(inner))) {
      const t = x[2];
      const b = t.match(/<strong>([\s\S]*?)<\/strong>/);
      const s = t.match(/<span>([\s\S]*?)<\/span>/);
      activities.push({ href: decodeAttr(x[1]), title: b ? stripTags(b[1]) : stripTags(t), note: s ? stripTags(s[1]) : '' });
    }
  }

  // Ziortza booked block (verbatim inner HTML of the section, cards div excluded)
  const ziortzaHTML = (sections.ziortza || '').trim();
  // Bilbao transport analysis: everything in the bilbao section before the cards grid
  const bilbaoInner = sections.bilbao || '';
  const transportHTML = bilbaoInner.slice(0, bilbaoInner.indexOf('<div class="cards"'));

  // two elements carry class="source-foot"; the closing note is the last one
  const footAll = body.match(/<p class="source-foot">([\s\S]*?)<\/p>/g) || [];
  const closing = footAll.length
    ? [null, footAll[footAll.length - 1].replace(/^<p class="source-foot">/, '').replace(/<\/p>$/, '')]
    : null;

  return {
    heroCaveatHTML: heroCaveat ? heroCaveat[1].trim() : '',
    legend,
    routeStrip,
    quick,
    sections: secs,
    activities,
    ziortzaHTML,
    transportHTML,
    fallbacks: FALLBACKS.map((c) => ({ ...c, id: 'r2:onroute:' + slug(c.name) })),
    closingHTML: closing ? closing[1].trim() : '',
  };
}

/* --------------------------------------------------------------------- go */

const A = parseResearchA();
const B = parseResearchB();

const data = { a: A, b: B, generated: '2026-08-20' };
fs.writeFileSync(OUT, JSON.stringify(data, null, 1));

// ---- audit -----------------------------------------------------------------
let aCards = 0;
console.log('RESEARCH A');
for (const s of A.sections) {
  const n = s.blocks.filter((b) => b.type === 'card').length;
  aCards += n;
  console.log('  ' + s.id.padEnd(10) + n + ' cards  | ' + s.title);
  for (const b of s.blocks) {
    if (b.type === 'card' && !b.card.name) console.log('    !! card with no name');
  }
}
console.log('  total A cards: ' + aCards);

let bCards = 0;
console.log('RESEARCH B');
for (const s of B.sections) {
  bCards += s.cards.length;
  console.log('  ' + s.id.padEnd(10) + String(s.cards.length).padEnd(3) + '| ' + s.title + ' | ' + s.dates + ' | ' + s.nights);
}
console.log('  fallbacks: ' + B.fallbacks.length);
console.log('  total B cards: ' + (bCards + B.fallbacks.length));
console.log('  legend:' + B.legend.length + ' routeStrip:' + B.routeStrip.length + ' quick:' + B.quick.length + ' activities:' + B.activities.length);
console.log('  ziortzaHTML:' + B.ziortzaHTML.length + ' transportHTML:' + B.transportHTML.length);

// duplicate id check
const ids = [];
for (const s of A.sections) for (const b of s.blocks) if (b.type === 'card') ids.push(b.card.id);
for (const s of B.sections) for (const c of s.cards) ids.push(c.id);
for (const c of B.fallbacks) ids.push(c.id);
const dupes = ids.filter((x, i) => ids.indexOf(x) !== i);
console.log('TOTAL VOTABLE ITEMS: ' + ids.length + (dupes.length ? '  DUPLICATE IDS: ' + dupes.join(', ') : '  (all ids unique)'));
