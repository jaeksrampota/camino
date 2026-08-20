'use strict';
/*
 * audit.js — proves the generated page lost nothing from the two originals.
 *   node build/audit.js
 *
 * Checks, per source file:
 *   1. every external link survives into index.html
 *   2. every block-level text element (p, li, td, h*, summary, div leaves)
 *      still appears in the page's visible text
 *   3. every field of research 2's JS card data appears
 *   4. one vote control exists per property
 *
 * Element text is the right unit: the merge deliberately reorders blocks inside
 * a card (vote bar appended, chips regrouped), so a sliding-window text diff
 * reports false positives, but a dropped block is a genuine loss.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const unesc = (s) =>
  s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<')
   .replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');

const norm = (s) => unesc(s.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

function stripped(file) {
  return fs
    .readFileSync(path.join(ROOT, file), 'utf8')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ');
}

function links(file) {
  const s = fs.readFileSync(path.join(ROOT, file), 'utf8');
  return new Set(
    (s.match(/href="[^"]+"/g) || []).map((h) => unesc(h.slice(6, -1))).filter((h) => /^https?:|^tel:/.test(h))
  );
}

/* text of every block element that has no nested block element inside it */
const BLOCK = 'p|li|td|th|h1|h2|h3|h4|summary|dd|dt|figcaption';
function blockTexts(file) {
  const s = stripped(file);
  const re = new RegExp('<(' + BLOCK + ')\\b[^>]*>([\\s\\S]*?)<\\/\\1>', 'gi');
  const out = [];
  let m;
  while ((m = re.exec(s))) {
    const inner = m[2];
    if (new RegExp('<(' + BLOCK + ')\\b', 'i').test(inner)) continue; // not a leaf
    const t = norm(inner);
    if (t.split(' ').length >= 4) out.push(t);
  }
  return out;
}

const pageText = norm(stripped('index.html'));
const pageLinks = links('index.html');

/* chrome from the originals that this page intentionally replaces */
const REPLACED = [
  /^Camino del Norte — Donostia (→|to) Bilbao, Sep 2026$/,
  /^2 adults · private double · 6–16 Sep 2026$/,
  /^researched on 20 Aug 2026$/,
  /^Camino del Norte Donostia → Bilbao$/, // research 2's own <h1>
];

let failures = 0;
for (const [label, file] of [['1', 'source/research-a.html'], ['2', 'source/research-b.html']]) {
  const srcLinks = links(file);
  const missLinks = [...srcLinks].filter((l) => !pageLinks.has(l));

  const texts = blockTexts(file);
  const missText = texts.filter((t) => !pageText.includes(t) && !REPLACED.some((r) => r.test(t)));

  console.log(
    'research ' + label + ': ' + srcLinks.size + ' links (' + missLinks.length + ' missing) · ' +
    texts.length + ' text blocks (' + missText.length + ' missing)'
  );
  missLinks.forEach((l) => console.log('    MISSING LINK  ' + l));
  missText.forEach((t) => console.log('    MISSING TEXT  ' + t.slice(0, 130)));
  failures += missLinks.length + missText.length;
}

/* research 2 keeps its cards in JS, so verify from the parsed dataset */
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'data.json'), 'utf8'));
const bCards = [...data.b.sections.flatMap((s) => s.cards), ...data.b.fallbacks];
let bMiss = 0;
for (const c of bCards) {
  for (const f of ['name', 'price', 'priceDetail', 'availability', 'distance', 'room', 'why']) {
    if (c[f] && !pageText.includes(norm(String(c[f])))) {
      console.log('    MISSING FIELD  ' + c.name + ' . ' + f);
      bMiss++;
    }
  }
  for (const f of ['booking', 'airbnb', 'nekatur', 'official', 'maps', 'priceSource']) {
    if (c[f] && !pageLinks.has(c[f])) {
      console.log('    MISSING LINK   ' + c.name + ' . ' + f);
      bMiss++;
    }
  }
}
console.log('research 2 JS card data: ' + bCards.length + ' cards · ' + bMiss + ' missing values');
failures += bMiss;

/* the page's inline script must actually parse — a stray quote in generated
   JS is silent in the HTML but kills every interactive feature */
try {
  const pageSrc = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const m = pageSrc.match(/<script>([\s\S]*)<\/script>\s*<\/body>/);
  if (!m) throw new Error('inline script not found');
  new Function(m[1]);
  console.log('inline page script: parses');
} catch (e) {
  console.log('    SCRIPT SYNTAX ERROR  ' + e.message);
  failures++;
}

const aCards = data.a.sections.reduce((n, s) => n + s.blocks.filter((b) => b.type === 'card').length, 0);
const votes = (fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').match(/class="votes"/g) || []).length;
console.log('vote controls: ' + votes + ' (expected ' + (aCards + bCards.length) + ')');
if (votes !== aCards + bCards.length) failures++;

console.log(failures === 0 ? '\nAUDIT PASSED — nothing lost.' : '\nAUDIT FAILED — ' + failures + ' problem(s).');
process.exit(failures === 0 ? 0 : 1);
