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
:root{
 color-scheme:light dark;
 --paper:#f4f1e8; --paper2:#eae5d7; --card:#fffdf8; --ink:#1a2e29; --mut:#68736f;
 --line:#ddd7c7; --line2:#c9c2ae;
 --forest:#1d4d42; --forest2:#2a6b5c; --sea:#2c6d76; --sun:#c07d24; --rose:#9c4438;
 --acc:#1d4d42; --acc-ink:#fff;
 --t1-bg:#dceee2; --t1-ink:#14663f; --t2-bg:#fbeacd; --t2-ink:#7d4d09;
 --t3-bg:#dde8f4; --t3-ink:#1e4f80; --t4-bg:#f7dde2; --t4-ink:#8d2440;
 --warn-bg:#fbeacd; --warn-ink:#7a4a09; --soft-bg:#ecebe4; --soft-ink:#5b635f;
 --ok-bg:#dceee2; --ok-ink:#14663f; --ok-line:#2f8659;
 --band:#fdf6e3; --band-line:#e3cd93; --band-ink:#6a5210;
 --vbg:#fbe6e3; --vline:#c25a4c; --vink:#8d2f22;
 --shadow:0 1px 2px rgba(26,46,41,.04),0 8px 24px rgba(26,46,41,.06);
 --serif:Georgia,"Iowan Old Style","Times New Roman",serif;
 --sans:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
}
@media (prefers-color-scheme:dark){:root{
 --paper:#12161a; --paper2:#171c21; --card:#1a2026; --ink:#e6eae8; --mut:#9aa5a2;
 --line:#2b333a; --line2:#3a444c;
 --forest:#6fc0a8; --forest2:#4f9d88; --sea:#69b3bd; --sun:#e0a44f; --rose:#e08a7c;
 --acc:#6fc0a8; --acc-ink:#0d1a16;
 --t1-bg:#123326; --t1-ink:#86e0b2; --t2-bg:#3a2a0b; --t2-ink:#ffc879;
 --t3-bg:#13273c; --t3-ink:#9cc7f2; --t4-bg:#3a1420; --t4-ink:#ffa8bc;
 --warn-bg:#3a2a0b; --warn-ink:#ffc879; --soft-bg:#232a30; --soft-ink:#9aa5a2;
 --ok-bg:#123326; --ok-ink:#86e0b2; --ok-line:#3f9c68;
 --band:#221d0c; --band-line:#6d5a1f; --band-ink:#eed99a;
 --vbg:#2e1512; --vline:#b8564a; --vink:#ffb2a6;
 --shadow:0 1px 2px rgba(0,0,0,.3),0 8px 24px rgba(0,0,0,.28);
}}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.55 var(--sans);overflow-wrap:break-word}
a{color:var(--forest)}
h1,h2,h3{font-family:var(--serif);font-weight:600;letter-spacing:-.015em}
.wrap{max-width:940px;margin:0 auto;padding:0 14px 60px}

/* ---------- hero ---------- */
.hero{position:relative;overflow:hidden;color:#fff;
 background:linear-gradient(150deg,#12362e 0%,#1d4d42 52%,#2c6d76 100%)}
.hero:after{content:"";position:absolute;right:-70px;bottom:-140px;width:290px;height:290px;
 border:40px solid rgba(255,255,255,.07);border-radius:50%;pointer-events:none}
.hero-in{position:relative;z-index:1;max-width:940px;margin:0 auto;padding:34px 14px 26px}
.eyebrow{margin:0 0 10px;color:#cfe8de;font-size:.7rem;font-weight:800;letter-spacing:.16em;text-transform:uppercase}
.hero h1{margin:0;font-size:clamp(2rem,7.5vw,3.6rem);line-height:1;letter-spacing:-.035em;color:#fff}
.hero .tag2{margin:12px 0 0;font-size:clamp(1rem,2.6vw,1.3rem);color:#e4f0ea;font-family:var(--serif)}
.hero-meta{display:flex;flex-wrap:wrap;gap:6px 16px;margin:16px 0 0;color:#dcece6;font-size:.85rem}
.hero-meta span{display:inline-flex;align-items:center;gap:6px}

/* who am i */
.whoami{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:20px 0 0;
 padding:11px 12px;border:1px solid rgba(255,255,255,.22);border-radius:14px;background:rgba(255,255,255,.09)}
.whoami .q{margin-right:2px;font-size:.8rem;color:#dcece6;font-weight:600}
.who{display:inline-flex;align-items:center;gap:7px;min-height:38px;padding:0 13px;border-radius:999px;
 border:1px solid rgba(255,255,255,.35);background:transparent;color:#fff;font:inherit;font-size:.85rem;
 font-weight:600;cursor:pointer}
.who[aria-pressed=true]{background:#fff;color:#14362e;border-color:#fff}
.sync{margin-left:auto;display:inline-flex;align-items:center;gap:7px;font-size:.74rem;font-weight:700;
 letter-spacing:.03em;text-transform:uppercase;color:#dcece6}
.sync .dot{width:8px;height:8px;border-radius:50%;background:#c9a227}
.sync[data-mode=kv] .dot{background:#63d39b}
.sync[data-mode=local] .dot{background:#e0a44f}
.sync[data-mode=error] .dot{background:#e07a6a}
.sharebtn{display:inline-flex;align-items:center;gap:7px;min-height:38px;padding:0 14px;border-radius:999px;
 border:1px solid rgba(255,255,255,.4);background:rgba(255,255,255,.14);color:#fff;font:inherit;font-size:.85rem;
 font-weight:650;cursor:pointer}
.sharebtn:hover{background:rgba(255,255,255,.24)}
.sharebtn.done{background:#fff;color:#14362e;border-color:#fff}
#linkmsg{margin:14px 0 0;padding:12px 14px;border-radius:13px;background:var(--ok-bg);color:var(--ok-ink);
 border:1px solid var(--ok-line);font-size:.86rem;line-height:1.5}
#linkmsg b{font-weight:750}
.share-row{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:0 0 16px;padding:13px 14px;
 border:1px solid var(--line);border-radius:14px;background:var(--card)}
.share-row p{margin:0;font-size:.83rem;color:var(--mut);flex:1 1 260px;line-height:1.5}
.share-row button{min-height:38px;padding:0 15px;border-radius:999px;border:1px solid var(--forest);
 background:var(--forest);color:#fff;font:inherit;font-size:.83rem;font-weight:700;cursor:pointer}
@media (prefers-color-scheme:dark){.share-row button{color:#0d1a16}}
.share-row button.done{background:var(--ok-line);border-color:var(--ok-line);color:#fff}

/* ---------- nav ---------- */
nav.jump{position:sticky;top:0;z-index:40;background:color-mix(in srgb,var(--paper) 92%,transparent);
 backdrop-filter:saturate(160%) blur(10px);border-bottom:1px solid var(--line)}
nav.jump ul{display:flex;gap:6px;list-style:none;margin:0 auto;padding:8px 14px;max-width:940px;
 overflow-x:auto;scrollbar-width:none}
nav.jump ul::-webkit-scrollbar{display:none}
nav.jump a{display:flex;align-items:center;white-space:nowrap;min-height:38px;padding:0 12px;
 border:1px solid var(--line);border-radius:999px;background:var(--card);text-decoration:none;
 color:var(--ink);font-size:.8rem;font-weight:600}
nav.jump a.strong{background:var(--forest);color:#fff;border-color:var(--forest);font-family:var(--serif)}
nav.jump a[data-group=r1]:not(.strong){border-left:3px solid var(--sea)}
nav.jump a[data-group=r2]:not(.strong){border-left:3px solid var(--sun)}
nav.jump a[aria-current=true]{background:var(--acc);color:var(--acc-ink);border-color:var(--acc)}

/* ---------- research banners ---------- */
.rband{margin:34px 0 4px;padding:20px 18px;border-radius:18px;color:#fff;position:relative;overflow:hidden}
.rband.one{background:linear-gradient(120deg,#1d4d42,#2c6d76)}
.rband.two{background:linear-gradient(120deg,#5f3f0e,#8a5c1c)}
.rband .rnum{margin:0;font-size:.7rem;font-weight:800;letter-spacing:.16em;text-transform:uppercase;opacity:.92}
.rband h2{margin:4px 0 6px;font-size:clamp(1.5rem,4.4vw,2.1rem);color:#fff}
.rband p{margin:0;font-size:.9rem;line-height:1.5;opacity:.95;max-width:62ch}
.rband .rmeta{margin-top:10px;font-size:.78rem;opacity:.85}

/* ---------- sections ---------- */
section.stage{scroll-margin-top:64px;padding-top:26px}
.shead{border-top:1px solid var(--line);padding-top:16px;margin-bottom:12px}
.skicker{margin:0;font-size:.7rem;letter-spacing:.11em;text-transform:uppercase;color:var(--mut);font-weight:750}
.shead h2{margin:3px 0 3px;font-size:1.55rem}
.smeta{margin:0;color:var(--mut);font-size:.88rem}
.stage-count{display:flex;flex-wrap:wrap;gap:8px;margin:9px 0 0;font-size:.74rem}
.opt-count,.picked-count{padding:3px 9px;border-radius:999px;background:var(--soft-bg);color:var(--soft-ink);font-weight:700}
.picked-count{background:var(--ok-bg);color:var(--ok-ink)}
.picked-count:empty{display:none}
.dot{opacity:.5;padding:0 2px}

/* ---------- pass-through blocks (both researches) ---------- */
.market,.market-note{background:var(--card);border:1px solid var(--line);border-left:3px solid var(--sea);
 border-radius:12px;padding:12px 14px;font-size:.86rem;color:var(--mut);margin:0 0 14px;line-height:1.55}
.market p,.market-note{margin:0 0 8px}
.market p:last-child{margin:0}
p.market-note{margin:0 0 14px}
.lbl{display:inline-block;margin-right:5px;font-size:.66rem;font-weight:800;letter-spacing:.08em;
 text-transform:uppercase;color:var(--sea)}
.flag{background:var(--warn-bg);color:var(--warn-ink);border-radius:9px;padding:8px 10px;font-size:.83rem;font-weight:550}
.aside{background:var(--soft-bg);color:var(--soft-ink);border-radius:9px;padding:8px 10px}
.tiny{font-size:.78rem}
.nb{white-space:nowrap;font-variant-numeric:tabular-nums;font-weight:650}
.h2plain{font-family:var(--serif);font-size:1.15rem;margin:20px 0 8px}
.mini{font-size:.8rem;color:var(--mut)}
details{margin:8px 0 0;border:1px solid var(--line);border-radius:10px;background:var(--paper2)}
details summary{cursor:pointer;padding:9px 11px;font-size:.8rem;font-weight:700}
details p{margin:0;padding:0 11px 11px;font-size:.84rem}
.linklist{margin:8px 0;padding-left:18px;font-size:.8rem;color:var(--mut)}
.linklist li{margin:2px 0}
.bucket{margin:22px 0 12px;padding:13px 15px;border-radius:13px;background:var(--paper2);border:1px solid var(--line)}
.bucket h3{margin:0 0 5px;font-size:1.08rem}
.bucket p{margin:0;font-size:.86rem;color:var(--mut)}
.rest-list{display:grid;gap:8px;margin:14px 0 0}
@media(min-width:640px){.rest-list{grid-template-columns:repeat(2,1fr)}}
.rest-title{grid-column:1/-1;margin:0;font-size:.7rem;font-weight:800;letter-spacing:.1em;
 text-transform:uppercase;color:var(--mut)}
.rest-item{display:block;padding:11px 12px;border:1px solid var(--line);border-radius:12px;
 background:var(--card);text-decoration:none;color:inherit}
.rest-item strong{display:block;font-size:.87rem}
.rest-item span{display:block;margin-top:3px;font-size:.78rem;color:var(--mut)}

/* verdict blocks (used by both researches, different innards) */
.verdict{background:var(--vbg);border:1px solid var(--vline);border-radius:15px;padding:15px;margin:0 0 16px}
.verdict h3{margin:0 0 8px;font-size:1.1rem;color:var(--vink)}
.verdict p{font-size:.86rem;line-height:1.55}
.verdict ul{font-size:.85rem;line-height:1.55;padding-left:19px}
.verdict li{margin:6px 0}
.vbig{font-family:var(--serif);font-size:clamp(1.5rem,5.5vw,2.1rem);font-weight:700;color:var(--vink);
 letter-spacing:-.02em;margin:2px 0 8px}
.just{margin:0 0 12px;font-size:.88rem}
.verdict-label{display:inline-block;padding:4px 10px;border-radius:999px;background:var(--vink);color:#fff;
 font-size:.68rem;font-weight:800;letter-spacing:.09em;text-transform:uppercase}
.tiles,.journeys{display:grid;grid-template-columns:repeat(2,1fr);gap:9px;margin:12px 0}
@media(max-width:520px){.journeys{grid-template-columns:1fr}}
.tile,.journey{padding:11px;border:1px solid var(--vline);border-radius:12px;background:var(--card)}
.tile .n{font-family:var(--serif);font-size:1.35rem;font-weight:700;color:var(--vink)}
.tile .k{margin-top:3px;font-size:.72rem;color:var(--mut);line-height:1.35}
.journey{font-size:.83rem;line-height:1.5}
.rule,.transport-caveat{margin:12px 0 0;padding:11px 12px;border-radius:11px;background:var(--card);
 border:1px dashed var(--vline);font-size:.84rem;line-height:1.5}
.links{display:flex;flex-wrap:wrap;gap:7px;margin:12px 0 0}
.source-foot{margin:12px 0 0;font-size:.76rem;color:var(--mut);line-height:1.5}

/* research B booked article */
article.booked{background:var(--ok-bg);border:1px solid var(--ok-line);border-radius:15px;padding:15px;margin:0 0 14px}
article.booked h3{margin:5px 0 6px;font-size:1.2rem;color:var(--ok-ink)}
article.booked p{margin:0 0 6px;font-size:.87rem}
article.booked .status{display:inline-block;padding:4px 10px;border-radius:999px;background:var(--ok-line);
 color:#fff;font-size:.68rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase}

/* itinerary table */
table.itin{width:100%;border-collapse:collapse;font-size:.87rem;background:var(--card);
 border:1px solid var(--line);border-radius:13px;overflow:hidden}
table.itin td{padding:9px 11px;border-top:1px solid var(--line);vertical-align:top}
table.itin tr:first-child td{border-top:0}
table.itin td.d{white-space:nowrap;font-weight:750;color:var(--sea);width:1%}
table.itin td.km{white-space:nowrap;text-align:right;color:var(--mut);font-variant-numeric:tabular-nums;width:1%}
table.itin a{text-decoration:none;color:var(--ink)}
table.itin a:hover{text-decoration:underline}
.tag{display:inline-block;margin-left:5px;padding:1px 7px;border-radius:999px;font-size:.66rem;font-weight:800;
 letter-spacing:.05em}
.tag.ok{background:var(--ok-bg);color:var(--ok-ink)}
.tag.q{background:var(--warn-bg);color:var(--warn-ink)}

/* route strip / legend / quick picks */
.route-strip{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:0 0 18px}
@media(min-width:620px){.route-strip{grid-template-columns:repeat(5,1fr)}}
.route-day{padding:10px;border:1px solid var(--line);border-radius:11px;background:var(--card)}
.route-day b{display:block;color:var(--sea);font-size:.66rem;letter-spacing:.05em;text-transform:uppercase}
.route-day span{display:block;margin-top:3px;font-family:var(--serif);font-size:.95rem;line-height:1.2}
.legend{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 18px}
.legend span{padding:6px 10px;border:1px solid var(--line);border-radius:999px;background:var(--card);
 font-size:.72rem;font-weight:700}
.quick{margin:18px 0 24px;padding:16px;border-radius:16px;background:var(--forest);color:#fff}
@media (prefers-color-scheme:dark){.quick{background:#16302a}}
.quick h3{margin:0 0 10px;font-size:1.15rem;color:#fff}
.quick-grid{display:grid;gap:6px}
@media(min-width:560px){.quick-grid{grid-template-columns:repeat(2,1fr)}}
@media(min-width:900px){.quick-grid{grid-template-columns:repeat(3,1fr)}}
.quick-pick{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 11px;
 border-radius:10px;background:rgba(255,255,255,.1);font-size:.8rem}
.quick-pick span{color:#dcece6;text-align:right}

/* ---------- cards ---------- */
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px;margin:0 0 12px;
 box-shadow:var(--shadow);scroll-margin-top:70px;transition:border-color .15s,box-shadow .15s}
.card-top{display:flex;gap:10px;align-items:flex-start;justify-content:space-between}
.card-top h3{margin:0;font-size:1.16rem;line-height:1.28}
.card-top h3 a{text-decoration:none;color:var(--ink);border-bottom:1px solid var(--line2)}
.card-top h3 a:hover{border-bottom-color:var(--forest)}
.tier{flex:none;padding:3px 9px;border-radius:999px;font-size:.8rem;font-weight:800;letter-spacing:.02em}
.tier.t1{background:var(--t1-bg);color:var(--t1-ink)}
.tier.t2{background:var(--t2-bg);color:var(--t2-ink)}
.tier.t3{background:var(--t3-bg);color:var(--t3-ink)}
.tier.t4{background:var(--t4-bg);color:var(--t4-ink)}
.badge-ok{flex:none;padding:3px 10px;border-radius:999px;background:var(--ok-line);color:#fff;
 font-size:.68rem;font-weight:800;letter-spacing:.06em}
.chips{display:flex;flex-wrap:wrap;gap:5px;margin:9px 0 0}
.chip{padding:3px 9px;border-radius:999px;background:var(--soft-bg);color:var(--soft-ink);font-size:.7rem;font-weight:700}
.chip.type{background:var(--t3-bg);color:var(--t3-ink)}
.chip.pick{background:#8a5511;color:#fff}
@media (prefers-color-scheme:dark){.chip.pick{background:#e0a44f;color:#241703}}
.chip.warn-soft{background:var(--warn-bg);color:var(--warn-ink)}
.chip.ok-soft{background:var(--ok-bg);color:var(--ok-ink)}
.card-body{margin-top:10px}
.card-body>*:first-child{margin-top:0}
.price{margin:0 0 8px;font-size:.95rem}
.price b{font-family:var(--serif);font-size:1.12rem;letter-spacing:-.01em}
.note{margin:0 0 7px;font-size:.855rem;line-height:1.55}
.note.tiny{font-size:.775rem;color:var(--mut)}
.why{margin:10px 0 0;padding:9px 11px;border-radius:11px;background:var(--t1-bg);color:var(--t1-ink);
 font-size:.855rem;line-height:1.5;font-weight:520}
.sub2{margin:0 0 8px;font-size:.83rem;color:var(--mut)}
.btns{display:flex;flex-wrap:wrap;gap:7px;margin:12px 0 0}
.btn{display:inline-flex;align-items:center;min-height:36px;padding:0 12px;border:1px solid var(--line2);
 border-radius:9px;background:var(--paper2);color:var(--ink);text-decoration:none;font-size:.8rem;font-weight:650}
.btn.primary{background:var(--forest);border-color:var(--forest);color:#fff}
@media (prefers-color-scheme:dark){.btn.primary{color:#0d1a16}}
.btn:hover{border-color:var(--forest)}
.top-card{border-color:var(--sun);box-shadow:0 0 0 1px var(--sun),var(--shadow)}
.booked-card{background:var(--ok-bg);border-color:var(--ok-line)}

/* ---------- vote bar ---------- */
.votes{display:flex;flex-wrap:wrap;align-items:center;gap:7px;margin:13px -14px -14px;padding:11px 14px;
 border-top:1px dashed var(--line2);background:color-mix(in srgb,var(--paper2) 60%,transparent);
 border-radius:0 0 15px 15px}
.votes-label{font-size:.66rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--mut);margin-right:2px}
.vote{display:inline-flex;align-items:center;gap:7px;min-height:36px;padding:0 12px 0 5px;border-radius:999px;
 border:1px solid var(--line2);background:var(--card);color:var(--mut);font:inherit;font-size:.8rem;
 font-weight:650;cursor:pointer;transition:all .13s}
.vote:hover{border-color:var(--forest);color:var(--ink)}
.av{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;
 font-size:.7rem;font-weight:800;background:var(--soft-bg);color:var(--soft-ink)}
.vote[aria-pressed=true]{border-color:transparent;color:#fff}
.vote[data-voter=miska][aria-pressed=true]{background:#a8437a}
.vote[data-voter=jakub][aria-pressed=true]{background:#2c6d76}
.vote[aria-pressed=true] .av{background:rgba(255,255,255,.28);color:#fff}
.vote.you{box-shadow:0 0 0 2px color-mix(in srgb,var(--forest) 35%,transparent)}
.verdict-pill{margin-left:auto;padding:4px 10px;border-radius:999px;font-size:.7rem;font-weight:800;
 letter-spacing:.04em}
.verdict-pill.both{background:var(--ok-line);color:#fff}
.verdict-pill.one{background:var(--warn-bg);color:var(--warn-ink)}
.card.agreed{border-color:var(--ok-line);box-shadow:0 0 0 2px var(--ok-line),var(--shadow)}
.card.leaning{border-color:var(--sun)}

/* ---------- clash callout ---------- */
.clash{margin:22px 0 8px;padding:17px;border-radius:17px;background:var(--band);border:1px solid var(--band-line);color:var(--band-ink)}
.clash-kicker{margin:0;font-size:.66rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;opacity:.75}
.clash h3{margin:5px 0 8px;font-size:1.2rem;color:var(--band-ink)}
.clash p{font-size:.86rem;line-height:1.55}
.clash-cols{display:grid;gap:10px;margin:13px 0}
@media(min-width:700px){.clash-cols{grid-template-columns:1fr 1fr}}
.clash-col{padding:12px 13px;border-radius:13px;background:var(--card);border:1px solid var(--line)}
.clash-col p{margin:0 0 7px;color:var(--ink)}
.clash-col p:last-child{margin:0}
.clash-verdict{font-family:var(--serif);font-weight:700;font-size:.98rem}
.clash-col.no .clash-verdict{color:var(--rose)}
.clash-col.yes .clash-verdict{color:var(--forest2)}
.clash-link a{font-size:.82rem;font-weight:700;text-decoration:none}
.clash-foot{margin:0;font-size:.83rem}

/* ---------- shortlist ---------- */
#shortlist{scroll-margin-top:64px;padding-top:26px}
.sl-empty{padding:20px;border:1px dashed var(--line2);border-radius:14px;color:var(--mut);
 font-size:.88rem;text-align:center;background:var(--card)}
.sl-group{margin:0 0 18px}
.sl-group h3{margin:0 0 8px;font-size:1.05rem;display:flex;align-items:center;gap:8px}
.sl-badge{padding:3px 9px;border-radius:999px;font-size:.66rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
.sl-badge.both{background:var(--ok-bg);color:var(--ok-ink)}
.sl-badge.m{background:#f7e0ee;color:#8a2f63}
.sl-badge.j{background:var(--t3-bg);color:var(--t3-ink)}
@media (prefers-color-scheme:dark){.sl-badge.m{background:#3a1930;color:#f0a8d2}}
.sl-list{display:grid;gap:6px}
.sl-item{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 9px;padding:10px 12px;border:1px solid var(--line);
 border-radius:11px;background:var(--card);text-decoration:none;color:inherit}
.sl-item:hover{border-color:var(--forest)}
.sl-item b{font-size:.9rem}
.sl-item .where{font-size:.74rem;color:var(--mut)}
.sl-item .src{margin-left:auto;font-size:.66rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--mut)}

/* ---------- footer ---------- */
footer{margin-top:36px;padding-top:18px;border-top:1px solid var(--line);color:var(--mut);font-size:.82rem;line-height:1.55}
footer p{margin:0 0 8px}
.srclinks{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.srclinks a{display:inline-flex;align-items:center;min-height:34px;padding:0 12px;border:1px solid var(--line);
 border-radius:9px;background:var(--card);text-decoration:none;font-size:.78rem;font-weight:650}
`;

/* -------------------------------------------------------------------- JS */

const JS = `
(function(){
 "use strict";
 var VOTERS=["miska","jakub"], NAMES={miska:"Miška",jakub:"Jakub"};
 var LS_VOTES="camino.votes.v1", LS_ME="camino.me.v1";
 var votes={}, me=null, mode="local";

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
    if(d&&d.mode==="kv"){ mode="kv"; votes=d.votes||{}; save(); renderAll();
      setMode("kv","Synced"); }
    else { mode="local"; setMode("local","Saved on this device"); }
   })
   .catch(function(){ mode="local"; setMode("local","Saved on this device"); });
 }

 function push(id,voter,value){
  if(mode!=="kv") return Promise.resolve();
  return fetch("/api/votes",{method:"POST",headers:{"content-type":"application/json"},
   body:JSON.stringify({id:id,voter:voter,value:value})})
   .then(function(r){ if(!r.ok) throw new Error("bad"); return r.json(); })
   .then(function(d){ if(d&&d.votes){ votes=d.votes; save(); renderAll(); } })
   .catch(function(){ setMode("error","Not saved to server"); });
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
   ["miska","jakub"].forEach(function(w){ if(incoming[id][w]&&!cur[w]){ cur[w]=true; added++; } });
   votes[id]=cur;
  });
  save(); renderAll();
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
  if(!votes[id].miska&&!votes[id].jakub) delete votes[id];
  save();
  var it=ITEMS.filter(function(x){return x.id===id;})[0]; if(it) renderOne(it);
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
     links.forEach(function(l,j){
      if(j===i){ l.setAttribute("aria-current","true");
       var ul=l.parentNode.parentNode, left=l.offsetLeft-16;
       if(Math.abs(ul.scrollLeft-left)>28) ul.scrollTo({left:left,behavior:"smooth"});
      } else l.removeAttribute("aria-current");
     });
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
