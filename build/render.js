'use strict';
/*
 * render.js — turns build/data.json into the single-file static site at /index.html.
 * One unified design applied to both researches; every card gets a vote control.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'data.json'), 'utf8'));
const A = data.a;
const B = data.b;

const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const domId = (voteId) => voteId.replace(/[^a-z0-9]+/gi, '-');

function tierClass(t) {
  if (!t) return '';
  const n = t.replace(/[^€+]/g, '');
  if (n === '€') return 't1';
  if (n === '€€') return 't2';
  if (n === '€€€') return 't3';
  if (n === '€€€+') return 't4';
  return 't3';
}

/* ------------------------------------------------------------- components */

function voteBar(id, name) {
  return (
    '<div class="votes" data-vote="' + esc(id) + '" data-name="' + esc(name) + '">' +
    '<span class="votes-label">Vote</span>' +
    '<button type="button" class="vote" data-voter="miska" aria-pressed="false">' +
    '<span class="av av-m">M</span>Miška</button>' +
    '<button type="button" class="vote" data-voter="jakub" aria-pressed="false">' +
    '<span class="av av-j">J</span>Jakub</button>' +
    '<span class="verdict-pill" hidden></span>' +
    '</div>'
  );
}

function buttonsHTML(buttons) {
  if (!buttons || !buttons.length) return '';
  return (
    '<div class="btns">' +
    buttons
      .map(
        (b) =>
          '<a class="btn' + (b.primary ? ' primary' : '') + '" href="' + esc(b.href) +
          '" target="_blank" rel="noopener noreferrer">' + esc(b.label) + '</a>'
      )
      .join('') +
    '</div>'
  );
}

/* --- research A card: prose carried across verbatim ---------------------- */
function cardA(c) {
  const tc = tierClass(c.tier);
  const chips = c.chips
    .map((ch) => '<span class="chip' + (ch.kind ? ' ' + esc(ch.kind) : '') + '">' + esc(ch.text) + '</span>')
    .join('');
  const title = c.href
    ? '<a href="' + esc(c.href) + '" target="_blank" rel="noopener noreferrer">' + esc(c.name) + '</a>'
    : esc(c.name);
  const mark = c.badge
    ? '<span class="badge-ok">' + esc(c.badge) + '</span>'
    : c.tier
    ? '<span class="tier ' + tc + '">' + esc(c.tier) + '</span>'
    : '';
  return (
    '<article class="card' + (c.booked ? ' booked-card' : '') + '" id="' + domId(c.id) + '">' +
    '<div class="card-top"><h3>' + title + '</h3>' + mark + '</div>' +
    (chips ? '<div class="chips">' + chips + '</div>' : '') +
    '<div class="card-body">' + c.bodyHTML + '</div>' +
    buttonsHTML(c.buttons) +
    voteBar(c.id, c.name) +
    '</article>'
  );
}

/* --- research B card: structured fields into the same vocabulary --------- */
function cardB(c) {
  const tc = tierClass(c.tier);
  const links = [];
  if (c.booking) links.push({ primary: true, href: c.booking, label: 'Booking' });
  if (c.airbnb) links.push({ href: c.airbnb, label: 'Airbnb' });
  if (c.nekatur) links.push({ href: c.nekatur, label: 'Nekatur' });
  if (c.official) links.push({ href: c.official, label: 'Official' });
  if (c.maps) links.push({ href: c.maps, label: 'Maps' });

  const availKind = /Exact quote/i.test(c.availability || '') ? 'ok-soft' : 'warn-soft';
  const chips =
    '<span class="chip type">' + esc(c.type) + '</span>' +
    (c.top ? '<span class="chip pick">first click</span>' : '') +
    '<span class="chip ' + availKind + '">' + esc(c.availability) + '</span>';

  const priceLine =
    '<p class="price"><b>' + esc(c.price) + '</b>' +
    (c.priceSource
      ? ' · <a href="' + esc(c.priceSource) + '" target="_blank" rel="noopener noreferrer">source</a>'
      : '') +
    '</p>' +
    (c.priceDetail ? '<p class="note tiny"><span class="lbl">Price basis</span> ' + esc(c.priceDetail) + '</p>' : '');

  return (
    '<article class="card' + (c.top ? ' top-card' : '') + '" id="' + domId(c.id) + '">' +
    '<div class="card-top"><h3>' +
    (c.official
      ? '<a href="' + esc(c.official) + '" target="_blank" rel="noopener noreferrer">' + esc(c.name) + '</a>'
      : esc(c.name)) +
    '</h3>' +
    (c.tier ? '<span class="tier ' + tc + '">' + esc(c.tier) + '</span>' : '') +
    '</div>' +
    '<div class="chips">' + chips + '</div>' +
    '<div class="card-body">' +
    priceLine +
    (c.distance ? '<p class="note"><span class="lbl">Where</span> ' + esc(c.distance) + '</p>' : '') +
    (c.room ? '<p class="note"><span class="lbl">Room</span> ' + esc(c.room) + '</p>' : '') +
    (c.why ? '<p class="why">' + esc(c.why) + '</p>' : '') +
    '</div>' +
    buttonsHTML(links) +
    voteBar(c.id, c.name) +
    '</article>'
  );
}

/* ------------------------------------------------------------- assembling */

// strip a leading <div class="section-head">…</div> from research B fragments
function dropSectionHead(html) {
  const i = html.indexOf('<div class="section-head">');
  if (i < 0) return html;
  const close = html.indexOf('</div></div>', i);
  if (close < 0) return html;
  return html.slice(0, i) + html.slice(close + '</div></div>'.length);
}

const NAV = [
  { href: '#overview', label: 'Overview', group: '' },
  { href: '#r1', label: 'Research 1', group: 'r1', strong: true },
  { href: '#r1-ss', label: 'Donostia', group: 'r1' },
  { href: '#r1-zarautz', label: 'Zarautz', group: 'r1' },
  { href: '#r1-deba', label: 'Deba', group: 'r1' },
  { href: '#r1-markina', label: 'Markina', group: 'r1' },
  { href: '#r1-ziortza', label: 'Ziortza ✓', group: 'r1' },
  { href: '#r1-sat12', label: 'Sat 12 ?', group: 'r1' },
  { href: '#r1-bilbao', label: 'Bilbao', group: 'r1' },
  { href: '#r2', label: 'Research 2', group: 'r2', strong: true },
  { href: '#r2-donostia', label: 'Donostia', group: 'r2' },
  { href: '#r2-zarautz', label: 'Zarautz', group: 'r2' },
  { href: '#r2-deba', label: 'Deba', group: 'r2' },
  { href: '#r2-markina', label: 'Markina', group: 'r2' },
  { href: '#r2-ziortza', label: 'Ziortza ✓', group: 'r2' },
  { href: '#r2-bilbao', label: 'Bilbao', group: 'r2' },
  { href: '#shortlist', label: '★ Shortlist', group: '' },
];

const navHTML =
  '<nav class="jump" aria-label="Jump to a stage"><ul>' +
  NAV.map(
    (n) =>
      '<li><a href="' + n.href + '"' +
      (n.group ? ' data-group="' + n.group + '"' : '') +
      (n.strong ? ' class="strong"' : '') +
      '>' + esc(n.label) + '</a></li>'
  ).join('') +
  '</ul></nav>';

/* ---- research A sections ---- */
const overviewSection = A.sections.find((s) => s.id === 'overview');
const aStages = A.sections.filter((s) => s.id !== 'overview');

function renderASection(s) {
  const n = s.blocks.filter((b) => b.type === 'card').length;
  return (
    '<section id="r1-' + s.id + '" class="stage">' +
    '<div class="shead">' +
    (s.kicker ? '<p class="skicker">' + esc(s.kicker) + '</p>' : '') +
    '<h2>' + esc(s.title) + '</h2>' +
    (s.meta ? '<p class="smeta">' + s.meta + '</p>' : '') +
    '<p class="stage-count"><span class="opt-count">' + n + ' option' + (n === 1 ? '' : 's') +
    '</span><span class="picked-count" data-scope="r1-' + s.id + '"></span></p>' +
    '</div>' +
    s.blocks.map((b) => (b.type === 'card' ? cardA(b.card) : b.html)).join('') +
    '</section>'
  );
}

/* ---- research B sections ---- */
function renderBSection(s) {
  const isZiortza = s.id === 'ziortza';
  const isBilbao = s.id === 'bilbao';
  let extra = '';
  if (isZiortza) extra = dropSectionHead(B.ziortzaHTML);
  if (isBilbao) extra = dropSectionHead(B.transportHTML);

  let activities = '';
  if (s.id === 'deba' && B.activities.length) {
    activities =
      '<div class="rest-list"><p class="rest-title">Rest-day ideas for Wed 9 Sep</p>' +
      B.activities
        .map(
          (a) =>
            '<a class="rest-item" href="' + esc(a.href) + '" target="_blank" rel="noopener noreferrer">' +
            '<strong>' + esc(a.title) + '</strong><span>' + esc(a.note) + '</span></a>'
        )
        .join('') +
      '</div>';
  }

  const n = s.cards.length;
  return (
    '<section id="r2-' + s.id + '" class="stage">' +
    '<div class="shead">' +
    (s.dates ? '<p class="skicker">' + esc(s.dates) + '</p>' : '') +
    '<h2>' + esc(s.title) + '</h2>' +
    (s.nights ? '<p class="smeta">' + esc(s.nights) + '</p>' : '') +
    (n
      ? '<p class="stage-count"><span class="opt-count">' + n + ' option' + (n === 1 ? '' : 's') +
        '</span><span class="picked-count" data-scope="r2-' + s.id + '"></span></p>'
      : '') +
    '</div>' +
    (s.introHTML ? '<div class="market"><p>' + s.introHTML + '</p></div>' : '') +
    extra +
    s.cards.map(cardB).join('') +
    activities +
    '</section>'
  );
}

const fallbackSection =
  '<section id="r2-onroute" class="stage">' +
  '<div class="shead"><p class="skicker">Sat 12 Sep · alternative</p>' +
  '<h2>If you decide to sleep on-route instead: 4 fallbacks</h2>' +
  '<p class="smeta">Research 2’s four fallbacks, for the night Research 1 calls the open question</p>' +
  '<p class="stage-count"><span class="opt-count">' + B.fallbacks.length + ' options</span>' +
  '<span class="picked-count" data-scope="r2-onroute"></span></p></div>' +
  '<div class="market"><p>Morga/Muxika preserves Sunday at 25.9 km. Gernika offers more beds but makes Sunday about 31 km unless you transit-hop back to the trail.</p></div>' +
  B.fallbacks.map(cardB).join('') +
  '</section>';

/* ---- the one editorial addition: where the two researches disagree ---- */
const disagreement =
  '<div class="clash">' +
  '<p class="clash-kicker">Added when merging the two researches</p>' +
  '<h3>The two researches disagree about Saturday 12 September</h3>' +
  '<p>Both looked at the same question — walk the 24.8 km to the stage end near Andra Mari / Eskerika, then bus into Bilbao for the night and back out on Sunday morning? They reached opposite conclusions, so read both before voting on that night.</p>' +
  '<div class="clash-cols">' +
  '<div class="clash-col no"><p class="clash-verdict">Research 1 · NOT WORTH IT</p>' +
  '<p>Measures the transfer door-to-door from the stage end, including the 1.8 km / ~25 min walk to the Andra Mari stop: <b>~95 min out on Saturday evening, ~85 min back Sunday morning</b>, against a ~75 min decision rule. Only 3 weekend departures, with a 17:30-or-20:00 ultimatum after a 24.8 km day.</p>' +
  '<p class="clash-link"><a href="#r1-sat12">Read Research 1 on Sat 12 →</a></p></div>' +
  '<div class="clash-col yes"><p class="clash-verdict">Research 2 · WORTH IT · conditional</p>' +
  '<p>Measures the A3631 bus leg itself, stop to stop: <b>about 60 min each way</b>, 20:00 out and 07:00 back. Explicitly conditional — it only holds <b>if Saturday actually finishes at the Andra Mari stop</b>. From Eskerika it adds 20–35 min of walking and becomes 85–110 min, which fails the same rule.</p>' +
  '<p class="clash-link"><a href="#r2-bilbao">Read Research 2 on Bilbao →</a></p></div>' +
  '</div>' +
  '<p class="clash-foot">They are not really contradicting each other on the facts: same bus, same ~60 min ride, same 3 weekend runs. The gap is <b>where Saturday ends</b> and whether the walk to the stop counts. Both agree the Sunday 07:00 return works.</p>' +
  '</div>';

/* ---- quick picks strip from research B ---- */
const quickHTML =
  '<div class="quick"><h3>Research 2’s first-click shortlist</h3><div class="quick-grid">' +
  B.quick.map((q) => '<div class="quick-pick"><strong>' + esc(q[0]) + '</strong><span>' + esc(q[1]) + '</span></div>').join('') +
  '</div></div>';

const routeStripHTML =
  '<div class="route-strip">' +
  B.routeStrip
    .map((r) => '<div class="route-day"><b>' + esc(r[0]) + '</b><span>' + esc(r[1]) + '</span></div>')
    .join('') +
  '</div>';

const legendHTML =
  '<div class="legend">' + B.legend.map((l) => '<span>' + esc(l) + '</span>').join('') + '</div>';

/* ------------------------------------------------------------------- CSS */

const CSS = `
*{box-sizing:border-box}

/* ===================================================================
   COASTAL EDITORIAL  ·  a printed travel feature, not an app
   Hairline rules instead of boxes. One type scale, three radii, a
   measured line length, warm paper in both light and dark. A dotted
   trail runs down the left margin with a waymarker at every stage,
   and a vote is a stamp in the credencial.
   =================================================================== */

:root{
 color-scheme:light dark;

 /* --- paper & ink ------------------------------------------------ */
 --paper:#f2eee3; --paper2:#e8e2d2; --card:#fffdf7;
 --ink:#1c2b26; --ink2:#33443e; --mut:#5a655f;
 --line:#dbd4c2; --line2:#c3bba4; --line3:#a79d85;
 /* --line/--line2/--line3 are DECORATIVE hairlines. A control edge is the
    only thing that says "this is tappable", so it gets its own token and
    clears 3:1 (WCAG 1.4.11) against both --card and --paper. */
 --ctl-line:#877e66;

 /* --- accents (used sparingly) ----------------------------------- */
 --forest:#1c4d40; --forest2:#2a6b5c; --sea:#255f68; --rose:#8f3a2e;
 --sun:#8a5709;   /* ochre for TEXT — AA on paper, card and band */
 --sun2:#b5761a;  /* ochre for LINES and marks — 3:1 non-text */
 --acc:#1c4d40; --acc-ink:#fff; --on-acc:#fff; --focus:#1c4d40;

 /* --- the two of them -------------------------------------------- */
 --miska:#9c3a70; --miska-soft:#f4e0ec; --miska-ink:#7f2a5b;
 --jakub:#25626b; --jakub-soft:#dcebec; --jakub-ink:#1c4d55;
 /* the veil behind the initial on a STAMPED vote must DARKEN the voter's
    ink, never lighten it — the glyph on top is white in this theme. */
 --on-voter:#fff; --av-veil:rgba(0,0,0,.22);

 /* --- price tiers ------------------------------------------------- */
 --t1-bg:#dfeee2; --t1-ink:#15603c; --t2-bg:#f9ebd0; --t2-ink:#7a4a09;
 --t3-bg:#dee8f3; --t3-ink:#1c4e7c; --t4-bg:#f6dee2; --t4-ink:#8a2a42;

 /* --- semantic ----------------------------------------------------- */
 --warn-bg:#f9ebd0; --warn-ink:#7a4a09; --soft-bg:#e9e5da; --soft-ink:#4f5a55;
 --ok-bg:#e2f0e5; --ok-ink:#14603c; --ok-line:#2c7d51; --on-ok:#fff;
 --agreed-bg:#e9f5ec;
 --band:#fbf3e0; --band-line:#e0c98d; --band-ink:#5c4610;
 --vbg:#fbeae6; --vline:#b8503f; --vink:#8b3324; --on-v:#fff;

 /* state halos — plain rgba on purpose, no color-mix in a signal */
 --halo-ok:rgba(44,125,81,.15); --halo-sun:rgba(181,118,26,.15);
 --tint-ok:rgba(226,240,229,.62); --tint-warn:rgba(249,235,208,.55);
 --led-ok:rgba(44,125,81,.22); --led-sun:rgba(181,118,26,.22); --led-err:rgba(143,58,46,.22);
 --stamp-rule:rgba(255,255,255,.42);

 /* --- structure ---------------------------------------------------- */
 --shadow:0 1px 1px rgba(28,43,38,.03);
 --r1:2px;   /* chips, buttons, tags — a printed rectangle */
 --r2:3px;   /* cards, panels */
 --r3:999px; /* discs only */
 --measure:70ch;
 --gutter:26px;
 --margin:76px; /* the left margin the trail spine lives in */
 --serif:Georgia,"Iowan Old Style","Times New Roman",serif;
 --sans:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;

 /* the coast, Donostia to Bilbao — three ridges receding into haze,
    six dots for the six walking days. One asset, redrawn per theme. */
 --coast:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 84' preserveAspectRatio='none'%3E%3Cg fill='none' stroke='%231c4d40' stroke-width='1'%3E%3Cpath d='M0 30C80 26 130 16 210 20C290 24 340 34 420 33C500 32 560 20 640 19C720 18 780 30 860 32C940 34 1000 22 1080 21C1140 20 1176 24 1200 26' stroke-opacity='.2'/%3E%3Cpath d='M0 46C60 40 96 24 168 26C240 28 276 50 348 51C420 52 456 30 528 28C600 26 636 46 708 49C780 52 816 28 888 26C960 24 996 44 1068 47C1128 49 1164 34 1200 30' stroke-opacity='.34'/%3E%3Cpath d='M0 66C60 60 96 44 168 46C240 48 276 70 348 71C420 72 456 50 528 48C600 46 636 66 708 69C780 72 816 48 888 46C960 44 996 64 1068 67C1128 69 1164 54 1200 50' stroke-width='1.4' stroke-opacity='.62'/%3E%3C/g%3E%3Cg fill='%231c4d40' fill-opacity='.6'%3E%3Ccircle cx='168' cy='46' r='2.6'/%3E%3Ccircle cx='348' cy='71' r='2.6'/%3E%3Ccircle cx='528' cy='48' r='2.6'/%3E%3Ccircle cx='708' cy='69' r='2.6'/%3E%3Ccircle cx='888' cy='46' r='2.6'/%3E%3Ccircle cx='1068' cy='67' r='2.6'/%3E%3C/g%3E%3C/svg%3E");

 /* the scallop shell — postmarked onto a card you both agreed on */
 --shell:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cg fill='none' stroke='%23fff' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M50 92C20 74 8 46 12 24 24 13 37 8 50 8s26 5 38 16c4 22-8 50-38 68z'/%3E%3Cpath d='M50 92 14 26M50 92 27 13M50 92V8M50 92 73 13M50 92 86 26'/%3E%3C/g%3E%3C/svg%3E");
}

@media (prefers-color-scheme:dark){:root{
 /* warm dark — the same paper after sunset, not a developer tool */
 --paper:#14120e; --paper2:#1d1a14; --card:#262119;
 --ink:#ece7dc; --ink2:#d5cfc2; --mut:#a49c8c;
 --line:#3a3428; --line2:#4f4838; --line3:#6b6349;
 --ctl-line:#867d62;

 --forest:#7fd0b4; --forest2:#63b89b; --sea:#79c0c9; --rose:#e2907f;
 --sun:#d9a253; --sun2:#c98f3f;
 --acc:#7fd0b4; --acc-ink:#12211b; --on-acc:#12211b; --focus:#7fd0b4;

 --miska:#e79ac4; --miska-soft:#3b1e2f; --miska-ink:#f0b6d4;
 --jakub:#8fd0d8; --jakub-soft:#1a2c30; --jakub-ink:#a8dde3;
 --on-voter:#1c1114; --av-veil:rgba(20,14,10,.22);

 --t1-bg:#12291d; --t1-ink:#8fe2b6; --t2-bg:#322608; --t2-ink:#ecc47b;
 --t3-bg:#10263a; --t3-ink:#a2caf0; --t4-bg:#33141d; --t4-ink:#f2a6ba;

 --warn-bg:#322608; --warn-ink:#ecc47b; --soft-bg:#2b2620; --soft-ink:#b3ab9a;
 --ok-bg:#12291d; --ok-ink:#8fe2b6; --ok-line:#4fbf83; --on-ok:#0c1a12;
 --agreed-bg:#1a2b20;
 --band:#241e10; --band-line:#5f4f22; --band-ink:#e9d6a2;
 --vbg:#2b1611; --vline:#b8564a; --vink:#f0a292; --on-v:#2a100b;

 --halo-ok:rgba(79,191,131,.17); --halo-sun:rgba(201,143,63,.17);
 --tint-ok:rgba(18,41,29,.7); --tint-warn:rgba(50,38,8,.6);
 --led-ok:rgba(79,191,131,.24); --led-sun:rgba(201,143,63,.24); --led-err:rgba(226,144,127,.24);
 --stamp-rule:rgba(18,12,8,.34);

 --shadow:0 1px 2px rgba(0,0,0,.4);
 --coast:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 84' preserveAspectRatio='none'%3E%3Cg fill='none' stroke='%237fd0b4' stroke-width='1'%3E%3Cpath d='M0 30C80 26 130 16 210 20C290 24 340 34 420 33C500 32 560 20 640 19C720 18 780 30 860 32C940 34 1000 22 1080 21C1140 20 1176 24 1200 26' stroke-opacity='.18'/%3E%3Cpath d='M0 46C60 40 96 24 168 26C240 28 276 50 348 51C420 52 456 30 528 28C600 26 636 46 708 49C780 52 816 28 888 26C960 24 996 44 1068 47C1128 49 1164 34 1200 30' stroke-opacity='.3'/%3E%3Cpath d='M0 66C60 60 96 44 168 46C240 48 276 70 348 71C420 72 456 50 528 48C600 46 636 66 708 69C780 72 816 48 888 46C960 44 996 64 1068 67C1128 69 1164 54 1200 50' stroke-width='1.4' stroke-opacity='.56'/%3E%3C/g%3E%3Cg fill='%237fd0b4' fill-opacity='.55'%3E%3Ccircle cx='168' cy='46' r='2.6'/%3E%3Ccircle cx='348' cy='71' r='2.6'/%3E%3Ccircle cx='528' cy='48' r='2.6'/%3E%3Ccircle cx='708' cy='69' r='2.6'/%3E%3Ccircle cx='888' cy='46' r='2.6'/%3E%3Ccircle cx='1068' cy='67' r='2.6'/%3E%3C/g%3E%3C/svg%3E");
}}

/* ---------- base ---------- */
html{font-size:16px;scroll-behavior:smooth;-webkit-text-size-adjust:100%}
@media(min-width:1000px){html{font-size:17px}}
body{margin:0;background:var(--paper);color:var(--ink);
 font:1rem/1.62 var(--sans);overflow-wrap:break-word;
 -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
a{color:var(--forest);text-underline-offset:2px}
a:hover{color:var(--forest2)}
h1,h2,h3{font-family:var(--serif);font-weight:600;letter-spacing:-.02em;line-height:1.15;
 text-wrap:balance}
p{text-wrap:pretty}
img,svg,table{max-width:100%}
::selection{background:var(--t1-bg);color:var(--t1-ink)}

/* One focus ring, on everything focusable, never removed. --focus is
   measured against every surface it can land on in both themes; the
   2px offset keeps it clear of filled controls (.btn.primary, a
   stamped .vote) so it never sits colour-on-colour. */
:focus-visible{outline:2px solid var(--focus);outline-offset:2px;border-radius:var(--r1)}
.vote:focus-visible,.who:focus-visible,.sharebtn:focus-visible,nav.jump a:focus-visible,
.share-row button:focus-visible,.srclinks a:focus-visible,.btn:focus-visible,
.rest-item:focus-visible,.sl-item:focus-visible{outline-offset:3px}
/* the running head clips its own overflow (overflow-x:auto + a mask), so a
   ring drawn OUTSIDE a 48px link is scissored away — draw it inside. */
nav.jump a:focus-visible{outline-offset:-3px}
/* a stamped "yours" vote already carries a 3.5px ring in the voter's ink;
   step the focus ring out past it so the full 2px lands on the card. */
.vote.you:focus-visible{outline-offset:5px}
.card:focus-within{border-color:var(--ctl-line)}

.wrap{position:relative;max-width:1080px;margin:0 auto;padding:0 20px 90px}
@media(min-width:760px){.wrap{padding:0 32px 110px}}

/* ---------- ONE micro-label recipe, used everywhere ---------- */
/* .68rem was 10.9px on a phone — every label here carries information,
   so the floor is 12px and nothing tracked sits below it. */
.eyebrow,.skicker,.votes-label,.rest-title,.rband .rnum,.clash-kicker,.sl-badge,
.sync,.verdict-label,.badge-ok,.tag,.chip,.opt-count,.picked-count,.btn,
.sharebtn,.share-row button,.srclinks a,article.booked .status,.night-chip,
.legend span,.route-day b,.sl-item .src,nav.jump a,details summary,.who,
.verdict-pill,.clash-link a{
 font-family:var(--sans);font-size:.76rem;font-weight:700;
 letter-spacing:.11em;text-transform:uppercase;font-style:normal}

/* ===================================================================
   MASTHEAD
   =================================================================== */
.hero{position:relative;background:var(--paper);color:var(--ink);
 border-top:4px solid var(--forest);border-bottom:1px solid var(--line)}
.hero-in{position:relative;z-index:1;max-width:1080px;margin:0 auto;padding:38px 20px 0}
@media(min-width:760px){.hero-in{padding:56px 32px 0}}

.eyebrow{margin:0;color:var(--sea);letter-spacing:.2em}
.eyebrow:after{content:"";display:block;width:46px;height:2px;background:var(--forest);
 margin:13px 0 0}

.hero h1{margin:20px 0 0;font-size:clamp(2.5rem,9.2vw,5rem);line-height:.95;
 letter-spacing:-.042em;color:var(--ink);font-weight:600}
.hero .tag2{margin:18px 0 0;max-width:26ch;font-family:var(--serif);font-style:italic;
 font-size:clamp(1.12rem,3.1vw,1.55rem);line-height:1.35;color:var(--ink2)}

.hero-meta{display:grid;grid-template-columns:repeat(2,1fr);gap:0;margin:34px 0 0;
 border-top:1px solid var(--line);color:var(--ink2);font-size:.85rem}
@media(min-width:760px){.hero-meta{grid-template-columns:repeat(4,1fr)}}
.hero-meta span{display:flex;align-items:center;min-height:56px;
 padding:12px var(--gutter) 12px 0;border-bottom:1px solid var(--line);
 font-family:var(--serif);font-size:1rem;line-height:1.3}
.hero-meta span:nth-child(2){color:var(--ink);font-size:1.16rem;letter-spacing:-.01em}

/* three receding ridges, full bleed, under the masthead */
.hero:after{content:"";display:block;height:84px;margin-top:10px;
 background-image:var(--coast);background-repeat:no-repeat;
 background-position:center bottom;background-size:100% 84px;pointer-events:none}

/* ---------- who's voting ---------- */
.whoami{display:flex;flex-wrap:wrap;align-items:center;gap:9px;margin:0;
 padding:22px 0 18px;background:none;border:0;border-radius:0}
.whoami .q{margin-right:4px;font-size:.76rem;font-weight:700;letter-spacing:.11em;
 text-transform:uppercase;color:var(--mut)}
.who{display:inline-flex;align-items:center;gap:8px;min-height:42px;padding:0 15px 0 6px;
 border:1px solid var(--ctl-line);border-radius:var(--r1);background:var(--card);
 color:var(--ink);cursor:pointer;-webkit-tap-highlight-color:transparent;
 transition:background-color .16s ease,border-color .16s ease,color .16s ease,transform .12s ease}
.who:hover{border-color:var(--ink)}
.who:active{transform:scale(.975)}
.who[aria-pressed=true]{color:var(--on-voter)}
.who[data-who=miska][aria-pressed=true]{background:var(--miska);border-color:var(--miska)}
.who[data-who=jakub][aria-pressed=true]{background:var(--jakub);border-color:var(--jakub)}
.who[aria-pressed=true] .av{background:var(--av-veil);color:inherit}

.sharebtn{display:inline-flex;align-items:center;gap:7px;min-height:42px;padding:0 16px;
 border:1px solid var(--forest);border-radius:var(--r1);background:transparent;
 color:var(--forest);cursor:pointer;-webkit-tap-highlight-color:transparent;
 transition:background-color .16s ease,color .16s ease,transform .12s ease}
.sharebtn:hover{background:var(--forest);color:var(--on-acc)}
.sharebtn:active{transform:scale(.975)}
.sharebtn.done{background:var(--ok-line);border-color:var(--ok-line);color:var(--on-ok)}

.sync{margin-left:auto;display:inline-flex;align-items:center;gap:9px;
 letter-spacing:.12em;color:var(--mut)}
/* the one status LED on the page — glow gives it a readable area. The idle
   fill is --mut, not a hairline, so all four states clear 3:1. */
.sync .dot{width:8px;height:8px;flex:none;padding:0;opacity:1;
 border-radius:var(--r3);background:var(--mut)}
.sync[data-mode=kv] .dot{background:var(--ok-line);box-shadow:0 0 0 3px var(--led-ok)}
.sync[data-mode=local] .dot{background:var(--sun2);box-shadow:0 0 0 3px var(--led-sun)}
.sync[data-mode=error] .dot{background:var(--rose);box-shadow:0 0 0 3px var(--led-err)}

/* ---------- avatars ---------- */
.av{display:inline-flex;align-items:center;justify-content:center;width:27px;height:27px;
 flex:none;border-radius:var(--r3);font-family:var(--serif);font-size:.82rem;
 font-weight:600;letter-spacing:0;text-transform:none;
 background:var(--soft-bg);color:var(--soft-ink);
 transition:background-color .16s ease,color .16s ease}
.av-m{background:var(--miska-soft);color:var(--miska-ink)}
.av-j{background:var(--jakub-soft);color:var(--jakub-ink)}

/* ---------- share link message ---------- */
#linkmsg{margin:26px 0 0;padding:15px 18px;border:0;border-left:3px solid var(--ok-line);
 border-radius:var(--r1);background:var(--ok-bg);color:var(--ok-ink);
 font-size:.9rem;line-height:1.55;max-width:var(--measure)}
#linkmsg b{font-weight:700}

.share-row{display:flex;flex-wrap:wrap;align-items:center;gap:14px;margin:0 0 26px;
 padding:18px 0;border:0;border-top:1px solid var(--line);border-bottom:1px solid var(--line);
 border-radius:0;background:none}
.share-row p{margin:0;flex:1 1 280px;font-size:.9rem;line-height:1.55;color:var(--ink2);
 max-width:var(--measure)}
.share-row button{min-height:42px;padding:0 18px;border:1px solid var(--forest);
 border-radius:var(--r1);background:var(--forest);color:var(--on-acc);cursor:pointer;
 -webkit-tap-highlight-color:transparent;
 transition:background-color .16s ease,transform .12s ease}
.share-row button:hover{background:var(--forest2);border-color:var(--forest2)}
.share-row button:active{transform:scale(.98)}
.share-row button.done{background:var(--ok-line);border-color:var(--ok-line);color:var(--on-ok)}

/* ===================================================================
   RUNNING HEAD (sticky nav)
   =================================================================== */
nav.jump{position:sticky;top:0;z-index:40;background:var(--paper);
 background:color-mix(in srgb,var(--paper) 90%,transparent);
 backdrop-filter:saturate(150%) blur(12px);-webkit-backdrop-filter:saturate(150%) blur(12px);
 border-bottom:1px solid var(--line)}
/* a live blur under a sticky bar on a 70,000px document is the single most
   expensive per-frame item here — keep it where a pointer implies a desktop
   GPU, and give phones a plain opaque strip instead. */
@media (hover:none),(max-width:760px){
 nav.jump{background:var(--paper);backdrop-filter:none;-webkit-backdrop-filter:none}
}
nav.jump ul{display:flex;gap:0;list-style:none;margin:0 auto;padding:0 20px;max-width:1080px;
 overflow-x:auto;scrollbar-width:none;
 -webkit-mask-image:linear-gradient(90deg,#000 0,#000 calc(100% - 42px),transparent 100%);
 mask-image:linear-gradient(90deg,#000 0,#000 calc(100% - 42px),transparent 100%)}
@media(min-width:760px){nav.jump ul{padding:0 32px}}
nav.jump ul::-webkit-scrollbar{display:none}
nav.jump a{position:relative;display:flex;align-items:center;white-space:nowrap;
 min-height:48px;padding:0 13px;border:0;border-radius:0;background:none;
 text-decoration:none;color:var(--mut);letter-spacing:.1em;
 -webkit-tap-highlight-color:transparent;transition:color .15s ease}
nav.jump li:first-child a{padding-left:0}
nav.jump li:last-child a{padding-right:46px}
nav.jump a:hover{color:var(--ink)}
/* research colour-coding: a fine rule under the label. Solid for research 1,
   DOTTED for research 2, so the grouping survives greyscale and is not
   carried by hue alone. */
nav.jump a[data-group]:not(.strong):after{content:"";position:absolute;left:13px;right:13px;
 bottom:12px;height:1px;background:var(--sea);opacity:.8}
nav.jump li:first-child a[data-group]:not(.strong):after{left:0}
nav.jump a[data-group=r2]:not(.strong):after{
 background:repeating-linear-gradient(90deg,var(--sun2) 0 3px,transparent 3px 6px)}
nav.jump a.strong{color:var(--ink);font-family:var(--serif);font-size:1rem;
 font-weight:600;letter-spacing:-.01em;text-transform:none;padding-right:16px}
nav.jump a.strong:hover{color:var(--forest)}
/* the active link is marked by the 2px rule below it plus full-ink colour.
   NOT by a weight change: bolding re-measures the link and shoves every
   item after it sideways on each scroll-spy update. */
nav.jump a[aria-current=true]{color:var(--ink)}
nav.jump a[aria-current=true]:before{content:"";position:absolute;left:0;right:0;bottom:0;
 height:2px;background:var(--forest)}

/* ===================================================================
   RESEARCH OPENERS
   =================================================================== */
.rband{position:relative;margin:66px 0 0;padding:22px 0 26px;border-radius:0;
 background:none;color:var(--ink);
 border-top:3px solid var(--sea);border-bottom:1px solid var(--line);overflow:visible}
.rband.two{border-top-color:var(--sun2)}
.rband .rnum{margin:0;color:var(--sea);opacity:1}
.rband.two .rnum{color:var(--sun)}
.rband h2{margin:10px 0 12px;font-size:clamp(1.95rem,5.4vw,3.1rem);letter-spacing:-.035em;
 color:var(--ink);max-width:18ch}
.rband p{margin:0;max-width:var(--measure);font-size:1rem;line-height:1.62;color:var(--ink2);opacity:1}
.rband .rmeta{margin-top:16px;font-size:.8rem;color:var(--mut);letter-spacing:.01em}
.banner.market{margin-top:22px}

/* ===================================================================
   STAGES — cards run two-up on wide screens, prose runs full width
   -------------------------------------------------------------------
   DEPENDENCY: this rule assumes article.card elements are DIRECT
   children of section.stage (see build/render.js cardA / cardB — the
   stage body is a flat list of cards interleaved with prose blocks).
   If a card is ever wrapped in a container div it silently becomes a
   full-width prose row instead of a grid cell. After any change to
   the stage markup, re-run build/audit.js and confirm it still sees
   62 vote controls.
   =================================================================== */
section.stage{scroll-margin-top:76px;padding-top:44px;display:grid;
 grid-template-columns:1fr;column-gap:var(--gutter);align-items:stretch}
section.stage>*{grid-column:1/-1;min-width:0}
@media(min-width:880px){
 section.stage{grid-template-columns:1fr 1fr}
 section.stage>.card{grid-column:auto}
}

.shead{position:relative;border-top:1px solid var(--line);padding-top:20px;margin:0 0 26px}
.skicker{margin:0;color:var(--mut)}
/* the yellow arrow — one occurrence, at the head of every stage */
.skicker:before{content:"";display:inline-block;width:0;height:0;margin-right:9px;
 vertical-align:.1em;border-top:5px solid transparent;border-bottom:5px solid transparent;
 border-left:8px solid var(--sun2)}
.shead h2{margin:12px 0 8px;font-size:clamp(1.7rem,4.2vw,2.4rem);letter-spacing:-.03em}
.smeta{margin:0;max-width:var(--measure);font-family:var(--serif);font-size:1.02rem;
 line-height:1.5;color:var(--mut)}
.stage-count{display:flex;flex-wrap:wrap;align-items:center;gap:6px 18px;margin:14px 0 0}
.opt-count{padding:0;background:none;border-radius:0;color:var(--mut)}
.picked-count{padding:0;background:none;border-radius:0;color:var(--forest2);font-weight:800}
.picked-count:empty{display:none}
.picked-count:before{content:"";display:inline-block;width:7px;height:7px;border-radius:var(--r3);
 background:var(--ok-line);margin-right:8px;vertical-align:.06em}
/* the "·" separators inside p.smeta — scoped, never bare .dot, which
   would also hit the sync LED */
p.smeta .dot{opacity:.45;padding:0 4px}

/* --- the trail: a dotted spine down the left margin, a waymarker
       ring at every stage head, a filled marker at the shortlist --- */
@media(min-width:960px){
 .wrap,.hero-in{padding-left:var(--margin)}
 nav.jump ul{padding-left:var(--margin)}
 .wrap:before{content:"";position:absolute;left:34px;top:6px;bottom:104px;width:2px;
  pointer-events:none;
  background-image:repeating-linear-gradient(180deg,var(--line2) 0 5px,transparent 5px 13px)}
 .shead:before{content:"";position:absolute;left:-47px;top:19px;width:13px;height:13px;
  border-radius:var(--r3);background:var(--card);border:3px solid var(--forest);
  box-shadow:0 0 0 4px var(--paper)}
 #shortlist .shead:before{background:var(--forest)}
 .rband:before{content:"";position:absolute;left:-48px;top:27px;width:15px;height:15px;
  border-radius:var(--r3);background:var(--ink);box-shadow:0 0 0 4px var(--paper);z-index:2}
}

/* ===================================================================
   PROSE / PASS-THROUGH BLOCKS
   =================================================================== */
.market,.market-note{background:none;border:0;border-left:2px solid var(--line2);
 border-radius:0;padding:1px 0 1px 20px;margin:0 0 26px;
 font-size:.92rem;line-height:1.68;color:var(--ink2);max-width:var(--measure)}
.market p,.market-note{margin:0 0 11px}
.market p:last-child{margin:0}
p.market-note{margin:0 0 26px}
.banner.market{border-left-color:var(--forest);max-width:var(--measure)}

/* 183 of these. Caps at 10.6px was 183 whispers inside card bodies —
   a bold sentence-case label with a hairline separator instead. */
.lbl{display:inline;margin-right:7px;font-family:var(--sans);font-size:.78rem;
 font-weight:700;letter-spacing:0;text-transform:none;color:var(--sea)}
.lbl:after{content:"";display:inline-block;width:1px;height:.8em;margin:0 0 -.06em 7px;
 background:var(--line2)}

.flag{background:var(--warn-bg);color:var(--warn-ink);border-radius:var(--r1);
 padding:12px 14px;font-size:.88rem;font-weight:400;line-height:1.6;max-width:var(--measure)}
.aside{background:none;color:var(--ink2);border-left:2px solid var(--line);
 border-radius:0;padding:2px 0 2px 18px;max-width:var(--measure);line-height:1.65}
.tiny{font-size:.8rem}
.nb{white-space:nowrap;font-variant-numeric:tabular-nums;font-weight:600}
.h2plain{font-family:var(--serif);font-size:1.35rem;letter-spacing:-.02em;
 margin:38px 0 12px;padding-top:18px;border-top:1px solid var(--line)}
.mini{font-size:.88rem;color:var(--ink2);max-width:var(--measure);line-height:1.62}
ul.mini{padding-left:0;list-style:none;margin:0 0 18px}
ul.mini>li{border-top:1px solid var(--line);padding:14px 0}
ul.mini>li>b{font-family:var(--serif);font-size:1.05rem;font-weight:600;letter-spacing:-.01em}
ul.mini p{margin:6px 0 0;color:var(--mut)}

details{margin:14px 0 0;border:0;border-top:1px solid var(--line);border-radius:0;
 background:none;max-width:var(--measure)}
details summary{cursor:pointer;padding:12px 0;color:var(--mut);
 list-style:none;transition:color .15s ease}
details summary::-webkit-details-marker{display:none}
details summary:before{content:"+";display:inline-block;width:15px;font-size:.95rem;
 font-weight:400;letter-spacing:0;color:var(--forest2)}
details[open] summary:before{content:"−"}
details summary:hover{color:var(--ink)}
details p{margin:0;padding:0 0 16px;font-size:.9rem;line-height:1.66;color:var(--ink2)}

.linklist{margin:12px 0;padding-left:18px;font-size:.85rem;color:var(--ink2);
 max-width:var(--measure);line-height:1.6}
.linklist li{margin:4px 0}

.bucket{margin:40px 0 18px;padding:20px 0 0;border:0;border-top:1px solid var(--line);
 border-radius:0;background:none}
.bucket h3{margin:0 0 7px;font-size:1.32rem;letter-spacing:-.02em}
.bucket p{margin:0;font-size:.92rem;line-height:1.62;color:var(--ink2);max-width:var(--measure)}

.section-head{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;
 gap:10px 16px;margin:0 0 18px;padding-top:20px;border-top:1px solid var(--line)}
.section-head h2{margin:0;font-size:1.6rem;letter-spacing:-.03em}
.section-head p{margin:5px 0 0;font-size:.85rem;color:var(--mut)}
.night-chip{display:inline-block;padding:5px 10px;border-radius:var(--r1);
 background:var(--soft-bg);color:var(--soft-ink)}

.rest-list{display:grid;gap:0;margin:22px 0 0}
@media(min-width:640px){.rest-list{grid-template-columns:repeat(2,1fr);column-gap:var(--gutter)}}
.rest-title{grid-column:1/-1;margin:0 0 4px;color:var(--mut)}
.rest-item{display:block;padding:14px 10px;margin:0 -10px;border:0;
 border-top:1px solid var(--line);border-radius:0;background:none;
 text-decoration:none;color:inherit;transition:background-color .15s ease}
.rest-item:hover{background:var(--card)}
.rest-item strong{display:block;font-family:var(--serif);font-size:1.02rem;font-weight:600;
 letter-spacing:-.01em}
.rest-item:hover strong{color:var(--forest)}
.rest-item span{display:block;margin-top:4px;font-size:.82rem;color:var(--mut)}

/* ---------- verdict feature blocks ---------- */
.verdict{background:none;border:0;border-top:3px solid var(--vline);
 border-bottom:1px solid var(--line);border-radius:0;padding:22px 0 26px;margin:0 0 30px}
.verdict h3{margin:0 0 12px;font-size:1.35rem;color:var(--vink);letter-spacing:-.02em}
.verdict p{font-size:.94rem;line-height:1.66;color:var(--ink2);max-width:var(--measure)}
.verdict ul{font-size:.92rem;line-height:1.66;padding-left:19px;color:var(--ink2);
 max-width:var(--measure)}
.verdict li{margin:8px 0}
.vbig{font-family:var(--serif);font-size:clamp(1.8rem,5.6vw,2.7rem);font-weight:600;
 color:var(--vink);letter-spacing:-.03em;line-height:1.1;margin:4px 0 14px}
.just{margin:0 0 16px;font-size:.94rem;line-height:1.66;max-width:var(--measure)}
.verdict-label{display:inline-block;padding:5px 11px;border-radius:var(--r1);
 background:var(--vink);color:var(--on-v)}

.tiles,.journeys{display:grid;grid-template-columns:repeat(2,1fr);gap:0 var(--gutter);margin:20px 0}
.tiles{max-width:var(--measure)}
@media(max-width:520px){.journeys{grid-template-columns:1fr}}
.tile{padding:14px 0 16px;border:0;border-top:1px solid var(--line2);border-radius:0;background:none}
.tile .n{font-family:var(--serif);font-size:clamp(1.5rem,4.4vw,2rem);font-weight:600;
 color:var(--ink);letter-spacing:-.03em;line-height:1.1}
.tile .k{margin-top:6px;font-size:.78rem;color:var(--mut);line-height:1.45}
.journey{padding:16px 0;border:0;border-top:1px solid var(--line);border-radius:0;
 background:none;font-size:.88rem;line-height:1.6;color:var(--ink2)}
.rule,.transport-caveat{margin:18px 0 0;padding:16px 18px;border-radius:var(--r1);
 background:var(--paper2);border:0;border-left:2px solid var(--vline);
 font-size:.9rem;line-height:1.62;max-width:var(--measure)}
.links{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0 0}
.source-foot{margin:20px 0 0;font-size:.8rem;color:var(--mut);line-height:1.6;
 max-width:var(--measure)}

/* ---------- the already-booked monastery ---------- */
article.booked{background:none;border:0;border-top:2px solid var(--ok-line);
 border-bottom:1px solid var(--line);border-radius:0;padding:20px 0 24px;margin:0 0 22px}
article.booked h3{margin:12px 0 10px;font-size:1.45rem;color:var(--ink);letter-spacing:-.025em}
article.booked p{margin:0 0 8px;font-size:.92rem;line-height:1.62;color:var(--ink2);
 max-width:var(--measure)}
article.booked .status{display:inline-block;padding:5px 11px;border-radius:var(--r1);
 background:var(--ok-line);color:var(--on-ok)}

/* ---------- itinerary table ---------- */
table.itin{width:100%;border-collapse:collapse;font-size:.92rem;background:none;
 border:0;border-top:2px solid var(--ink);border-radius:0;overflow:visible;margin:0 0 24px}
table.itin td{padding:13px 14px 13px 0;border-top:1px solid var(--line);vertical-align:baseline}
table.itin td:last-child{padding-right:0}
table.itin tr:first-child td{border-top:0;padding-top:16px}
table.itin td.d{white-space:nowrap;font-family:var(--serif);font-weight:600;font-size:1rem;
 color:var(--ink);width:1%}
table.itin td.km{white-space:nowrap;text-align:right;font-family:var(--serif);color:var(--mut);
 font-variant-numeric:tabular-nums;width:1%;padding-right:0}
table.itin a{text-decoration:none;color:var(--ink);border-bottom:1px solid var(--sea)}
table.itin a:hover{border-bottom-color:var(--forest);color:var(--forest)}
@media(max-width:560px){
 table.itin{font-size:.86rem}
 table.itin td{padding:11px 8px 11px 0}
}
.tag{display:inline-block;margin-left:6px;padding:2px 7px;border-radius:var(--r1);
 letter-spacing:.08em;vertical-align:.06em}
.tag.ok{background:var(--ok-bg);color:var(--ok-ink)}
.tag.q{background:var(--warn-bg);color:var(--warn-ink)}

/* ---------- the walk, day by day ---------- */
.route-strip{display:grid;grid-template-columns:repeat(2,1fr);gap:0 var(--gutter);margin:0 0 32px}
@media(min-width:620px){.route-strip{grid-template-columns:repeat(5,1fr)}}
.route-day{padding:14px 0 15px;border:0;border-top:1px solid var(--line);border-radius:0;
 background:none}
.route-day b{display:block;color:var(--sea);letter-spacing:.12em}
.route-day span{display:block;margin-top:6px;font-family:var(--serif);font-size:1.08rem;
 line-height:1.25;letter-spacing:-.01em;color:var(--ink)}

.legend{display:flex;flex-wrap:wrap;gap:8px 20px;margin:0 0 32px;padding:14px 0;
 border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.legend span{padding:0;border:0;border-radius:0;background:none;color:var(--mut)}

/* ---------- research 2's first-click list ---------- */
.quick{margin:34px 0 40px;padding:24px 0 0;border-radius:0;background:none;
 border-top:3px solid var(--forest);color:var(--ink)}
.quick h3{margin:0;font-size:1.5rem;color:var(--ink);letter-spacing:-.03em}
.quick-grid{display:grid;gap:0 var(--gutter);margin:18px 0 0}
@media(min-width:560px){.quick-grid{grid-template-columns:repeat(2,1fr)}}
@media(min-width:900px){.quick-grid{grid-template-columns:repeat(3,1fr)}}
.quick-pick{display:flex;align-items:baseline;justify-content:space-between;gap:14px;
 padding:14px 0;border-radius:0;border-top:1px solid var(--line);background:none;font-size:.9rem}
.quick-pick strong{font-family:var(--serif);font-size:1.08rem;font-weight:600;letter-spacing:-.01em}
.quick-pick span{color:var(--mut);text-align:right;font-family:var(--serif);font-size:.98rem}

/* ===================================================================
   THE CARDS
   =================================================================== */
.card{position:relative;z-index:0;display:flex;flex-direction:column;background:var(--card);
 border:1px solid var(--line);border-top:2px solid var(--line2);border-radius:var(--r2);
 padding:22px 22px 0;margin:0 0 24px;box-shadow:var(--shadow);scroll-margin-top:90px;
 transition:border-color .2s ease,background-color .2s ease,box-shadow .2s ease}

.card-top{display:flex;gap:14px;align-items:baseline;justify-content:space-between}
.card-top h3{margin:0;font-size:1.3rem;line-height:1.25;letter-spacing:-.025em}
.card-top h3 a{text-decoration:none;color:var(--ink);
 border-bottom:1px solid var(--sea);transition:border-color .15s ease,color .15s ease}
.card-top h3 a:hover{border-bottom-color:var(--forest);color:var(--forest)}

.tier{flex:none;padding:3px 10px;border-radius:var(--r1);font-family:var(--serif);
 font-size:1.05rem;font-weight:600;letter-spacing:.02em;text-transform:none;line-height:1.35;
 font-variant-numeric:tabular-nums}
.tier.t1{background:var(--t1-bg);color:var(--t1-ink)}
.tier.t2{background:var(--t2-bg);color:var(--t2-ink)}
.tier.t3{background:var(--t3-bg);color:var(--t3-ink)}
.tier.t4{background:var(--t4-bg);color:var(--t4-ink)}
.badge-ok{flex:none;padding:5px 10px;border-radius:var(--r1);background:var(--ok-line);
 color:var(--on-ok)}

/* Chips are a line of small-caps facts, each led by its own mark. The
   ones that carry a caution or a confirmation keep a fill, because a
   warning needs figure-ground. */
.chips{display:flex;flex-wrap:wrap;align-items:center;gap:7px 16px;margin:13px 0 0}
.chip{padding:0;border-radius:0;background:none;color:var(--mut);letter-spacing:.1em}
.chip:before{content:"";display:inline-block;width:4px;height:4px;border-radius:var(--r3);
 background:currentColor;margin-right:8px;vertical-align:.16em;opacity:.75}
.chip.type{color:var(--sea)}
.chip.warn-soft{padding:3px 9px;border-radius:var(--r1);
 background:var(--warn-bg);color:var(--warn-ink)}
.chip.ok-soft,.chip.ok{padding:3px 9px;border-radius:var(--r1);
 background:var(--ok-bg);color:var(--ok-ink)}
.chip.pick{padding:3px 9px;border-radius:var(--r1);background:var(--ink);color:var(--paper);
 font-weight:800}
.chip.pick:before{display:none}

.card-body{margin-top:16px;flex:1 1 auto}
.card-body>*:first-child{margin-top:0}
.sub2{margin:0 0 10px;font-size:.88rem;line-height:1.55;color:var(--mut)}

.price{margin:0 0 12px;font-size:.82rem;color:var(--mut);line-height:1.5}
.price b{display:inline-block;margin-right:4px;font-family:var(--serif);font-size:1.55rem;
 font-weight:600;letter-spacing:-.025em;color:var(--ink);line-height:1.1;
 font-variant-numeric:tabular-nums}
.price a{color:var(--mut);text-decoration:underline}
.price a:hover{color:var(--forest)}

.note{margin:0 0 10px;font-size:.9rem;line-height:1.66;color:var(--ink2)}
.note.tiny{font-size:.82rem;line-height:1.6;color:var(--ink2)}

/* the editorial "why" — a serif pull-line, not a green box */
.why{margin:16px 0 0;padding:2px 0 2px 15px;border-radius:0;background:none;
 border-left:2px solid var(--forest2);color:var(--ink2);
 font-family:var(--serif);font-size:1rem;font-weight:400;line-height:1.5}

.btns{display:flex;flex-wrap:wrap;gap:8px;margin:20px 0 0}
.btn{display:inline-flex;align-items:center;min-height:40px;padding:0 14px;
 border:1px solid var(--ctl-line);border-radius:var(--r1);background:transparent;
 color:var(--ink);text-decoration:none;letter-spacing:.1em;
 -webkit-tap-highlight-color:transparent;
 transition:border-color .15s ease,color .15s ease,background-color .15s ease,transform .12s ease}
.btn:hover{border-color:var(--forest);color:var(--forest)}
.btn:active{transform:scale(.97)}
.btn.primary{background:var(--forest);border-color:var(--forest);color:var(--on-acc)}
.btn.primary:hover{background:var(--forest2);border-color:var(--forest2);color:var(--on-acc)}

/* Research 2's first pick is an EDITORIAL mark, so it lives on a
   different axis from the vote states: an ink rail down the left edge
   plus a warm wash. A vote colours the border, the ring and the vote
   bar, and never wipes this. */
.top-card{background:linear-gradient(180deg,color-mix(in srgb,var(--t2-bg) 40%,var(--card)) 0,var(--card) 96px)}
.top-card:before{content:"";position:absolute;left:-1px;top:-1px;bottom:-1px;width:3px;
 border-radius:var(--r2) 0 0 var(--r2);background:var(--ink);z-index:2}
.booked-card{background:var(--ok-bg);border-color:var(--ok-line);border-top-color:var(--ok-line)}

/* ===================================================================
   THE VOTE — the point of the whole page
   A credencial: an empty slot is dashed, a cast vote is stamped in
   that person's own ink with an inner stamp rule. No rotation — the
   tilt was a legibility cost on 124 button labels.
   =================================================================== */
.votes{display:flex;flex-wrap:wrap;align-items:center;gap:8px;
 margin:auto -22px 0;padding:15px 22px;border-radius:0 0 var(--r2) var(--r2);
 border-top:1px solid var(--line);background:var(--paper2);
 background:color-mix(in srgb,var(--paper2) 42%,transparent);
 transition:background-color .2s ease}
.votes-label{margin-right:2px;letter-spacing:.12em;color:var(--mut)}
.vote{display:inline-flex;align-items:center;gap:8px;min-height:42px;padding:0 14px 0 6px;
 border:1px dashed var(--ctl-line);border-radius:var(--r1);background:var(--card);
 color:var(--ink2);font-family:var(--sans);font-size:.82rem;font-weight:700;
 letter-spacing:.02em;text-transform:none;cursor:pointer;
 -webkit-tap-highlight-color:transparent;
 transition:background-color .16s ease,border-color .16s ease,color .16s ease,
  box-shadow .16s ease,transform .12s ease}
.vote:hover{border-color:var(--ink);color:var(--ink)}
.vote:active{transform:scale(.955)}
/* stamped: solid edge, that person's ink, an inner stamp rule */
.vote[aria-pressed=true]{border-style:solid;border-color:transparent;color:var(--on-voter);
 box-shadow:inset 0 0 0 1.5px var(--stamp-rule)}
.vote[data-voter=miska][aria-pressed=true]{background:var(--miska);border-color:var(--miska)}
.vote[data-voter=jakub][aria-pressed=true]{background:var(--jakub);border-color:var(--jakub)}
.vote[aria-pressed=true] .av{background:var(--av-veil);color:inherit}
/* "this button is yours" — a solid ring in your own colour. Solid, not
   a color-mix wash: a wash cannot reach 3:1, and this ring is a hook. */
.vote.you[data-voter=miska]{box-shadow:0 0 0 2px var(--miska)}
.vote.you[data-voter=jakub]{box-shadow:0 0 0 2px var(--jakub)}
.vote.you[data-voter=miska][aria-pressed=true]{
 box-shadow:inset 0 0 0 1.5px var(--stamp-rule),0 0 0 1.5px var(--card),0 0 0 3.5px var(--miska)}
.vote.you[data-voter=jakub][aria-pressed=true]{
 box-shadow:inset 0 0 0 1.5px var(--stamp-rule),0 0 0 1.5px var(--card),0 0 0 3.5px var(--jakub)}

.verdict-pill{display:inline-block;margin-left:auto;padding:5px 11px;
 border-radius:var(--r1);letter-spacing:.1em}
.verdict-pill[hidden]{display:none}
.verdict-pill.one{background:transparent;color:var(--sun);box-shadow:inset 0 0 0 1px var(--sun2)}
.verdict-pill.both{background:var(--ok-line);color:var(--on-ok);transform:rotate(-1.5deg);
 box-shadow:inset 0 0 0 1.5px var(--stamp-rule)}

/* One vote and two votes on the same scale: a solid ring at the card
   edge, a soft halo around it, and a tint in the vote bar. Every
   signal here is a solid token — nothing that matters is a wash. */
/* The difference between the two states must survive greyscale, so it is
   carried by FORM, not hue: one vote = a DASHED edge and a 1px ring, still
   unsettled, matching the dashed empty vote slot. Two votes = a SOLID 3px
   ring, three times the ink. Colour only confirms what shape already says. */
.card.leaning{border-color:var(--sun2);border-style:dashed;
 box-shadow:inset 0 0 0 1px var(--sun2),0 0 0 5px var(--halo-sun),var(--shadow)}
.card.leaning .votes{background:var(--tint-warn)}
.card.agreed{border-color:var(--ok-line);background:var(--agreed-bg);
 box-shadow:inset 0 0 0 3px var(--ok-line),0 0 0 6px var(--halo-ok),var(--shadow)}
.card.agreed .votes{background:var(--tint-ok)}

/* the postmark: a scallop shell stamped on a night you both agreed on.
   Guarded, because without mask support a bare pseudo would paint as a
   solid green square over the card. */
@supports (mask-image:none) or (-webkit-mask-image:none){
 /* It used to be pinned to the top-RIGHT corner, where the opaque price-tier
    chip (and, on the booked card, the 93px badge) punched a rectangle
    straight through it. Top-left instead: measured on all 62 cards at both
    375px and desktop, that box falls only behind the serif title — large
    text, still over 3:1 across the mark in both themes — and stops short of
    the chips row, whose tags carry their own backgrounds. */
 .card.agreed:after{content:"";position:absolute;left:16px;top:6px;width:42px;height:42px;
  pointer-events:none;z-index:-1;opacity:.5;transform:rotate(-11deg);background:var(--ok-line);
  -webkit-mask-image:var(--shell);mask-image:var(--shell);
  -webkit-mask-size:contain;mask-size:contain;
  -webkit-mask-position:center;mask-position:center;
  -webkit-mask-repeat:no-repeat;mask-repeat:no-repeat}
}

/* MOTION IS FOR TRANSITIONS ONLY. build/render.js adds .just-voted to a
   card the moment someone actually taps a vote on it, so restored state
   arrives silently: a returning user with twenty agreed nights does not
   get twenty simultaneous flourishes on load, and only a genuine
   one-vote-to-two-votes transition animates. */
.card.just-voted.agreed{animation:agreeIn .58s cubic-bezier(.33,1.25,.5,1)}
.card.just-voted .verdict-pill.both{animation:stampIn .36s cubic-bezier(.2,.85,.3,1) both}

/* the bloom lives in the shadow itself, so no extra pseudo is needed on
   62 cards and .top-card:before stays free for its ink rail */
@keyframes agreeIn{
 0%{transform:translateY(0);
  box-shadow:inset 0 0 0 3px var(--ok-line),0 0 0 0 var(--ok-line),var(--shadow)}
 36%{transform:translateY(-4px);
  box-shadow:inset 0 0 0 3px var(--ok-line),0 0 0 13px transparent,var(--shadow)}
 100%{transform:translateY(0);
  box-shadow:inset 0 0 0 3px var(--ok-line),0 0 0 6px var(--halo-ok),var(--shadow)}}
@keyframes stampIn{
 0%{opacity:0;transform:scale(1.4) rotate(-13deg)}
 62%{opacity:1;transform:scale(.96) rotate(-.5deg)}
 100%{opacity:1;transform:scale(1) rotate(-1.5deg)}}
/* the narrow-screen pill goes full width, where a tilt reads as broken —
   same press, no rotation, so the animation cannot re-impose one */
@keyframes stampInFlat{0%{opacity:0;transform:scale(1.2)}100%{opacity:1;transform:scale(1)}}

/* ===================================================================
   THE CLASH — the one place the page argues
   =================================================================== */
.clash{margin:44px 0 30px;padding:28px 22px;border-radius:var(--r2);
 background:var(--band);border:1px solid var(--band-line);border-top:3px solid var(--sun2);
 color:var(--band-ink)}
@media(min-width:760px){.clash{padding:34px 32px}}
.clash-kicker{margin:0;color:var(--sun);opacity:1}
.clash h3{margin:12px 0 12px;font-size:clamp(1.45rem,3.6vw,2.05rem);letter-spacing:-.03em;
 color:var(--ink);max-width:22ch}
.clash p{font-size:.94rem;line-height:1.66;color:var(--ink2);max-width:var(--measure)}
.clash-cols{display:grid;gap:22px;margin:24px 0}
@media(min-width:700px){.clash-cols{grid-template-columns:1fr 1fr;gap:var(--gutter)}}
.clash-col{padding:0 0 0 18px;border:0;border-left:2px solid var(--line2);
 border-radius:0;background:none}
.clash-col.no{border-left-color:var(--rose)}
.clash-col.yes{border-left-color:var(--forest2)}
.clash-col p{margin:0 0 9px;color:var(--ink2);max-width:none}
.clash-col p:last-child{margin:0}
.clash-verdict{font-family:var(--serif);font-weight:600;font-size:1.16rem;
 letter-spacing:-.02em;line-height:1.3}
.clash-col.no .clash-verdict{color:var(--rose)}
.clash-col.yes .clash-verdict{color:var(--forest2)}
.clash-link a{text-decoration:none;border-bottom:1px solid currentColor;padding-bottom:1px}
.clash-foot{margin:0;font-size:.88rem;color:var(--ink2)}

/* ===================================================================
   SHORTLIST
   =================================================================== */
#shortlist{scroll-margin-top:76px;padding-top:60px;margin-top:26px}
#shortlist .shead{border-top-width:3px;border-top-color:var(--ink)}
.sl-empty{padding:44px 22px;border:1px dashed var(--line2);border-radius:var(--r2);
 color:var(--mut);font-family:var(--serif);font-size:1.06rem;font-style:italic;
 text-align:center;background:none}
.sl-group{margin:0 0 34px}
.sl-group h3{display:flex;align-items:center;gap:10px;margin:0 0 6px;font-size:1.15rem;
 letter-spacing:-.02em}
.sl-badge{padding:5px 10px;border-radius:var(--r1);letter-spacing:.1em}
.sl-badge.both{background:var(--ok-line);color:var(--on-ok)}
.sl-badge.m{background:var(--miska);color:var(--on-voter)}
.sl-badge.j{background:var(--jakub);color:var(--on-voter)}
.sl-list{display:grid;gap:0}
@media(min-width:860px){.sl-list{grid-template-columns:1fr 1fr;column-gap:var(--gutter)}}
.sl-item{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 12px;
 padding:15px 10px;margin:0 -10px;border:0;border-top:1px solid var(--line);
 border-radius:0;background:none;text-decoration:none;color:inherit;
 transition:background-color .15s ease}
.sl-item:hover{background:var(--card)}
.sl-item b{font-family:var(--serif);font-size:1.06rem;font-weight:600;letter-spacing:-.015em}
.sl-item:hover b{color:var(--forest)}
.sl-item .where{font-size:.82rem;color:var(--mut)}
.sl-item .src{margin-left:auto;letter-spacing:.1em;color:var(--mut)}

/* ===================================================================
   COLOPHON
   =================================================================== */
footer{margin-top:70px;padding-top:28px;border-top:2px solid var(--ink);
 color:var(--ink2);font-size:.85rem;line-height:1.66}
footer p{margin:0 0 10px;max-width:var(--measure)}
.srclinks{display:flex;flex-wrap:wrap;gap:8px;margin-top:20px}
.srclinks a{display:inline-flex;align-items:center;min-height:40px;padding:0 14px;
 border:1px solid var(--ctl-line);border-radius:var(--r1);background:none;
 text-decoration:none;color:var(--ink);
 transition:border-color .15s ease,color .15s ease}
.srclinks a:hover{border-color:var(--forest);color:var(--forest)}

/* ===================================================================
   NARROW SCREENS — 375px must not scroll sideways and the vote row
   must stay tappable
   =================================================================== */
@media(max-width:420px){
 .wrap{padding:0 16px 64px}
 .hero-in{padding:32px 16px 0}
 nav.jump ul{padding:0 16px}
 .card{padding:18px 18px 0}
 .votes{margin:auto -18px 0;padding:14px 18px;gap:7px}
 .verdict-pill{margin-left:0;width:100%;text-align:center;transform:none}
 /* .verdict-pill.both sets its own rotate at (0,2,0) — a media query adds no
    specificity, so the reset above never reached it and a full-width bar
    stayed tilted. Match the specificity instead of reaching for !important,
    which would also kill the flat animation's end state. */
 .verdict-pill.both{transform:none}
 .card.just-voted .verdict-pill.both{animation-name:stampInFlat}
 .sync{margin-left:0}
 .tiles{grid-template-columns:1fr}
 .clash{padding:22px 18px}
 .hero-meta span{padding-right:14px}
 .quick-pick{gap:8px}
}

/* ===================================================================
   MOTION PREFERENCES
   =================================================================== */
@media (prefers-reduced-motion:reduce){
 html{scroll-behavior:auto}
 *,*:before,*:after{animation-duration:.001ms!important;animation-iteration-count:1!important;
  transition-duration:.001ms!important;scroll-behavior:auto!important}
 .vote:active,.btn:active,.who:active,.sharebtn:active,.share-row button:active{transform:none}
}
`;

/* -------------------------------------------------------------------- JS */

const JS = `
(function(){
 "use strict";
 var VOTERS=["miska","jakub"], NAMES={miska:"Miška",jakub:"Jakub"};
 var LS_VOTES="camino.votes.v1", LS_ME="camino.me.v1";
 var votes={}, me=null, mode="local";
 var lastWire=null;     /* last server payload seen, so a 20s poll that changed nothing costs nothing */
 var RM=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)");
 var pendingMerge=[];   /* [[id,voter],...] merged from a share link, not yet on the server */

 function load(){ try{ votes=JSON.parse(localStorage.getItem(LS_VOTES)||"{}")||{}; }catch(e){ votes={}; }
   try{ me=localStorage.getItem(LS_ME)||null; }catch(e){} }
 function save(){ try{ localStorage.setItem(LS_VOTES,JSON.stringify(votes)); }catch(e){} }

 function setMode(m,label){ var el=document.getElementById("sync"); if(!el) return;
   el.setAttribute("data-mode",m); el.querySelector(".txt").textContent=label; }

 /* ---- catalogue of everything votable, built from the DOM ---- */
 var ITEMS=[];
 function buildCatalogue(){
  ITEMS=[].slice.call(document.querySelectorAll(".votes")).map(function(v){
   var card=v.closest(".card");
   var sec=v.closest("section.stage");
   var stageEl=sec?sec.querySelector(".shead h2"):null;
   return { id:v.getAttribute("data-vote"), name:v.getAttribute("data-name"),
            card:card, node:v, anchor:card?card.id:"",
            scope:sec?sec.id:"", stage:stageEl?stageEl.textContent:"",
            research:(v.getAttribute("data-vote")||"").indexOf("r1:")===0?"1":"2" };
  });
 }

 /* ---- rendering ---- */
 function renderOne(it){
  var v=votes[it.id]||{};
  var n=0;
  VOTERS.forEach(function(who){
   var btn=it.node.querySelector('.vote[data-voter="'+who+'"]');
   if(!btn) return;
   var on=!!v[who]; if(on) n++;
   btn.setAttribute("aria-pressed",on?"true":"false");
   btn.classList.toggle("you",me===who);
  });
  var pill=it.node.querySelector(".verdict-pill");
  if(pill){
   if(n===2){ pill.hidden=false; pill.className="verdict-pill both"; pill.textContent="Both agree ✓"; }
   else if(n===1){ var who=v.miska?"miska":"jakub"; pill.hidden=false; pill.className="verdict-pill one";
                   pill.textContent=NAMES[who]+" picked this"; }
   else { pill.hidden=true; pill.textContent=""; }
  }
  if(it.card){ it.card.classList.toggle("agreed",n===2); it.card.classList.toggle("leaning",n===1); }
 }

 function renderCounts(){
  var by={};
  ITEMS.forEach(function(it){ var v=votes[it.id]||{}; var n=(v.miska?1:0)+(v.jakub?1:0);
   if(!n) return; by[it.scope]=by[it.scope]||{one:0,both:0};
   if(n===2) by[it.scope].both++; else by[it.scope].one++; });
  [].slice.call(document.querySelectorAll(".picked-count")).forEach(function(el){
   var c=by[el.getAttribute("data-scope")];
   if(!c){ el.textContent=""; return; }
   var bits=[]; if(c.both) bits.push(c.both+" agreed"); if(c.one) bits.push(c.one+" picked");
   el.textContent=bits.join(" · ");
  });
 }

 function renderShortlist(){
  var host=document.getElementById("sl-body"); if(!host) return;
  var both=[],m=[],j=[];
  ITEMS.forEach(function(it){ var v=votes[it.id]||{};
   if(v.miska&&v.jakub) both.push(it); else if(v.miska) m.push(it); else if(v.jakub) j.push(it); });
  if(!both.length&&!m.length&&!j.length){
   host.innerHTML='<p class="sl-empty">No votes yet. Hit <b>Miška</b> or <b>Jakub</b> on any option and it shows up here.</p>';
   return;
  }
  function group(title,cls,list){
   if(!list.length) return "";
   return '<div class="sl-group"><h3><span class="sl-badge '+cls+'">'+title+'</span>'+
    '<span>'+list.length+'</span></h3><div class="sl-list">'+
    list.map(function(it){
     return '<a class="sl-item" href="#'+it.anchor+'"><b>'+it.name+'</b>'+
      '<span class="where">'+it.stage+'</span>'+
      '<span class="src">Research '+it.research+'</span></a>';
    }).join("")+'</div></div>';
  }
  host.innerHTML=group("Both agree","both",both)+group("Miška only","m",m)+group("Jakub only","j",j);
 }

 function renderAll(){ ITEMS.forEach(renderOne); renderCounts(); renderShortlist(); }

 /* ---- server sync ---- */
 function pull(){
  return fetch("/api/votes",{headers:{accept:"application/json"}})
   .then(function(r){ return r.json(); })
   .then(function(d){
    if(d&&d.mode==="kv"){ mode="kv";
      /* nothing changed since the last poll? then re-rendering 62 vote bars
         and rebuilding the shortlist would only cost a dropped frame. */
      var wire=JSON.stringify(d.votes||{});
      if(wire===lastWire&&!pendingMerge.length){ setMode("kv","Synced"); return; }
      lastWire=wire;
      votes=d.votes||{};
      /* a share-link merge is not on the server yet — re-apply it over the
         server state, or this replace would silently undo it */
      pendingMerge.forEach(function(p){ (votes[p[0]]=votes[p[0]]||{})[p[1]]=true; });
      save(); renderAll();
      setMode("kv","Synced"); flushMerge(); }
    else { mode="local"; setMode("local","Saved on this device"); }
   })
   .catch(function(){ mode="local"; setMode("local","Saved on this device"); });
 }

 function push(id,voter,value){
  lastWire=null;   /* local state has moved — the next poll must render again */
  if(mode!=="kv") return Promise.resolve();
  return fetch("/api/votes",{method:"POST",headers:{"content-type":"application/json"},
   body:JSON.stringify({id:id,voter:voter,value:value})})
   .then(function(r){ if(!r.ok) throw new Error("bad"); return r.json(); })
   .then(function(d){ if(d&&d.votes){ votes=d.votes; save(); renderAll(); } })
   .catch(function(){ setMode("error","Not saved to server"); });
 }

 /* A shared link is an explicit union, so on a synced host its votes have to be
    written up as well — otherwise the next pull() replaces local state and the
    merge vanishes while the page still says it was merged. */
 function flushMerge(){
  if(mode!=="kv"||!pendingMerge.length) return Promise.resolve();
  var batch=pendingMerge.slice(); pendingMerge=[];
  return batch.reduce(function(chain,pair){
   return chain.then(function(){ return push(pair[0],pair[1],true); });
  },Promise.resolve());
 }

 /* ---- share link -------------------------------------------------------
    No backend on a static host, so votes travel in the URL instead. Positions
    in ITEMS (DOM order) are the wire format, base36, version-tagged so a future
    rebuild that reorders cards cannot silently mis-apply an old link. ---- */
 var WIRE="1";
 function encodeVotes(){
  var m=[],j=[];
  ITEMS.forEach(function(it,i){ var v=votes[it.id]||{};
   if(v.miska) m.push(i.toString(36)); if(v.jakub) j.push(i.toString(36)); });
  return WIRE+"."+m.join(",")+"."+j.join(",");
 }
 function decodeVotes(str){
  var p=String(str).split("."); if(p[0]!==WIRE) return null;
  var out={},n=0;
  [["miska",p[1]],["jakub",p[2]]].forEach(function(pair){
   (pair[1]?pair[1].split(","):[]).forEach(function(x){
    var i=parseInt(x,36); var it=ITEMS[i]; if(!it) return;
    (out[it.id]=out[it.id]||{})[pair[0]]=true; n++;
   });
  });
  return n?out:null;
 }
 function shareURL(){
  return location.origin+location.pathname+"#v="+encodeURIComponent(encodeVotes());
 }
 function copyShare(btn){
  var url=shareURL(), label=btn.textContent;
  function ok(){ btn.textContent="Link copied ✓"; btn.classList.add("done");
   setTimeout(function(){ btn.textContent=label; btn.classList.remove("done"); },2200); }
  function fallback(){ window.prompt("Copy this link and send it over:",url); }
  if(navigator.clipboard&&navigator.clipboard.writeText)
   navigator.clipboard.writeText(url).then(ok,fallback);
  else fallback();
 }
 function note(html){
  var el=document.getElementById("linkmsg"); if(!el) return;
  el.innerHTML=html; el.hidden=false;
 }
 function applyIncoming(){
  var h=location.hash||"";
  if(h.indexOf("#v=")!==0) return;
  var incoming=decodeVotes(decodeURIComponent(h.slice(3)));
  history.replaceState(null,"",location.pathname+location.search);
  if(!incoming){ note("<b>That shared link could not be read.</b> It was probably made from an older version of this page — ask for a fresh one."); return; }
  var added=0;
  Object.keys(incoming).forEach(function(id){
   var cur=votes[id]||{};
   ["miska","jakub"].forEach(function(w){ if(incoming[id][w]&&!cur[w]){ cur[w]=true; added++; pendingMerge.push([id,w]); } });
   votes[id]=cur;
  });
  lastWire=null;
  save(); renderAll(); flushMerge();
  note(added
   ? "<b>Merged "+added+" vote"+(added===1?"":"s")+" from that link.</b> Nothing of yours was removed — see the <a href='#shortlist'>shortlist</a>."
   : "<b>Nothing new in that link.</b> Those picks were already on this device.");
 }

 /* ---- wiring ---- */
 function onVote(e){
  var btn=e.target.closest(".vote"); if(!btn) return;
  var bar=btn.closest(".votes"); var id=bar.getAttribute("data-vote");
  var voter=btn.getAttribute("data-voter");
  var cur=votes[id]||{}; var next=!cur[voter];
  votes[id]=Object.assign({},cur); votes[id][voter]=next;
  /* un-voting something that came in on a share link must not be re-pushed later */
  if(!next) pendingMerge=pendingMerge.filter(function(p){ return !(p[0]===id&&p[1]===voter); });
  if(!votes[id].miska&&!votes[id].jakub) delete votes[id];
  save();
  var it=ITEMS.filter(function(x){return x.id===id;})[0];
  /* the agreement flourish is CSS-gated on this class, so restored
     state renders silently and only a real vote animates */
  if(it){ if(it.card) it.card.classList.add("just-voted"); renderOne(it); }
  renderCounts(); renderShortlist();
  push(id,voter,next);
 }

 function setMe(who){
  me=(me===who)?null:who;
  try{ me?localStorage.setItem(LS_ME,me):localStorage.removeItem(LS_ME); }catch(e){}
  [].slice.call(document.querySelectorAll(".who")).forEach(function(b){
   b.setAttribute("aria-pressed",b.getAttribute("data-who")===me?"true":"false"); });
  ITEMS.forEach(renderOne);
 }

 /* ---- sticky nav highlighting ---- */
 function navSpy(){
  var links=[].slice.call(document.querySelectorAll("nav.jump a"));
  var map=links.map(function(a){ return document.querySelector(a.getAttribute("href")); });
  if(!("IntersectionObserver" in window)) return;
  var vis={};
  var io=new IntersectionObserver(function(es){
   es.forEach(function(e){ vis[map.indexOf(e.target)]=e.isIntersecting; });
   for(var i=0;i<map.length;i++){
    if(vis[i]){
     /* write every attribute FIRST, then read geometry once — reading
        offsetLeft mid-loop flushes layout on every scroll-driven update */
     links.forEach(function(l,j){
      if(j===i) l.setAttribute("aria-current","true");
      else l.removeAttribute("aria-current");
     });
     var active=links[i];
     if(active){
      var ul=active.parentNode.parentNode, left=active.offsetLeft-16;
      /* behavior in ScrollToOptions overrides scroll-behavior, so the
         reduced-motion block cannot reach this — gate it here instead */
      if(Math.abs(ul.scrollLeft-left)>28)
       ul.scrollTo({left:left,behavior:(RM&&RM.matches)?"auto":"smooth"});
     }
     break;
    }
   }
  },{rootMargin:"-64px 0px -72% 0px"});
  map.forEach(function(s){ if(s) io.observe(s); });
 }

 /* ---- go ---- */
 load();
 buildCatalogue();
 [].slice.call(document.querySelectorAll(".who")).forEach(function(b){
  b.addEventListener("click",function(){ setMe(b.getAttribute("data-who")); });
  b.setAttribute("aria-pressed",b.getAttribute("data-who")===me?"true":"false");
 });
 document.addEventListener("click",onVote);
 ["share-top","share-bottom"].forEach(function(id){
  var b=document.getElementById(id);
  if(b) b.addEventListener("click",function(){ copyShare(b); });
 });
 renderAll();
 applyIncoming();
 // a shared link opened while the page is already loaded only changes the hash,
 // which does not re-run this script — so merge on hashchange too
 window.addEventListener("hashchange",applyIncoming);
 navSpy();
 pull();
 setInterval(function(){ if(!document.hidden&&mode==="kv") pull(); },20000);
 window.addEventListener("focus",function(){ if(mode==="kv") pull(); });
})();
`;

/* ------------------------------------------------------------------ HTML */

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#1d4d42">
<meta name="robots" content="noindex,nofollow">
<meta name="referrer" content="no-referrer">
<meta name="description" content="Miška &amp; Jakub — Camino del Norte, Donostia to Bilbao, 6–16 September 2026. Two accommodation researches, side by side, with voting.">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%90%9A%3C/text%3E%3C/svg%3E">
<title>Miška &amp; Jakub — dovolenka · Camino del Norte</title>
<style>${CSS}</style>
</head>
<body>

<header class="hero">
 <div class="hero-in">
  <p class="eyebrow">Camino del Norte · Sep 2026</p>
  <h1>Miška &amp; Jakub<br>dovolenka</h1>
  <p class="tag2">Donostia → Bilbao, on foot. Where do we sleep?</p>
  <div class="hero-meta">
   <span>6–16 September 2026</span><span>6 walking days · 126.1 km</span>
   <span>10 nights</span><span>2 adults · 1 private double</span>
  </div>
  <div class="whoami">
   <span class="q">Who's voting?</span>
   <button type="button" class="who" data-who="miska" aria-pressed="false"><span class="av av-m">M</span>Miška</button>
   <button type="button" class="who" data-who="jakub" aria-pressed="false"><span class="av av-j">J</span>Jakub</button>
   <button type="button" class="sharebtn" id="share-top">Share my picks</button>
   <span class="sync" id="sync" data-mode="local"><span class="dot"></span><span class="txt">Checking…</span></span>
  </div>
 </div>
</header>

${navHTML}

<div class="wrap">

<div id="linkmsg" hidden></div>

<section id="overview" class="stage">
 <div class="shead">
  <p class="skicker">${esc(overviewSection.kicker)}</p>
  <h2>${esc(overviewSection.title)}</h2>
  <p class="smeta">${overviewSection.meta}</p>
 </div>
 ${overviewSection.blocks.map((b) => (b.type === 'card' ? cardA(b.card) : b.html)).join('')}
 ${routeStripHTML}
 ${legendHTML}
 ${disagreement}
 <div class="market" style="margin-top:16px">
  <p><b>How this page works.</b> Below are the two accommodation researches, one after the other, in full and unedited — Research 1 first, then Research 2. They cover the same nights and overlap on some properties, but they searched differently and priced differently, so keep them separate and vote on whatever you like in either.</p>
  <p>Every option has a <b>Miška</b> and a <b>Jakub</b> button. Tap yours. Anything you both tap turns green and lands in <a href="#shortlist">the shortlist at the bottom</a>.</p>
  <p><b>Votes live in your own browser</b> — the pill in the header says so. To compare, hit <b>Share my picks</b>, send the link, and opening it merges those votes into whatever the other phone already has. Nothing is deleted by a merge, so it is safe to swap links back and forth.</p>
 </div>
</section>

<div class="rband one" id="r1">
 <p class="rnum">Research one</p>
 <h2>The trip — locked</h2>
 <p>The stage-by-stage sweep. Denser prose, a market note per town, and the only one that tackles the open Saturday-12 question head-on. 35 options across 7 nights.</p>
 <p class="rmeta">Researched 20 Aug 2026 · prices indicative, tap through to verify</p>
</div>
<div class="banner market">${A.bannerHTML}</div>

${aStages.map(renderASection).join('')}

<div class="rband two" id="r2">
 <p class="rnum">Research two</p>
 <h2>Our first-click shortlist</h2>
 <p>The re-checked pass. Fewer options per town, but each one carries an explicit price basis — whether the figure is a dated tax-inclusive quote for your nights or just a generic "from" rate. 27 options.</p>
 <p class="rmeta">Researched + exact-price recheck 20 Aug 2026</p>
</div>
<div class="market">${B.heroCaveatHTML}</div>
${quickHTML}

${B.sections.map(renderBSection).join('')}
${fallbackSection}
<p class="source-foot">${B.closingHTML}</p>

<section id="shortlist">
 <div class="shead">
  <p class="skicker">Where you two landed</p>
  <h2>★ Shortlist</h2>
  <p class="smeta">Live tally across both researches</p>
 </div>
 <div class="share-row">
  <p><b>Comparing picks:</b> tap <b>Share my picks</b> and send the link. Opening it merges those
  votes into whatever is already on your device, so you both end up seeing the full picture.</p>
  <button type="button" id="share-bottom">Share my picks</button>
 </div>
 <div id="sl-body"></div>
</section>

<footer>
 ${A.footerHTML}
 <p><b>About this page.</b> It merges two separately-produced research documents into one design. Nothing was rewritten: Research 1's prose and Research 2's fields are carried across verbatim. The only text added is the "two researches disagree" box in the Overview, which is labelled as such.</p>
 <div class="srclinks">
  <a href="/source/research-a.html">Original Research 1 ↗</a>
  <a href="/source/research-b.html">Original Research 2 ↗</a>
 </div>
</footer>

</div>
<script>${JS}</script>
</body>
</html>
`;

fs.writeFileSync(path.join(ROOT, 'index.html'), html, 'utf8');

const votable = (html.match(/class="votes"/g) || []).length;
console.log('wrote index.html  ' + (html.length / 1024).toFixed(1) + ' KB');
console.log('vote controls rendered: ' + votable);
