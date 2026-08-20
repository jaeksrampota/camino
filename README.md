# camino

**Miška & Jakub — dovolenka.** Camino del Norte, Donostia → Bilbao, 6–16 September 2026.

Two separately-produced accommodation researches, merged into one page under one design, with a
vote button for each of us on every option.

Live: *(Vercel URL — see below)*

## What's here

| Path | What it is |
|---|---|
| `index.html` | The site. Generated — **do not hand-edit**, edit the sources or the build script. |
| `source/research-a.html` | Research 1, exactly as produced. Served at `/source/research-a.html`. |
| `source/research-b.html` | Research 2, exactly as produced. Served at `/source/research-b.html`. |
| `api/votes.js` | Serverless vote store. Zero npm dependencies. |
| `build/parse.js` | Reads both sources → `build/data.json`. |
| `build/render.js` | `data.json` → `index.html`. All CSS/JS is inlined; the page makes no external requests. |
| `build/audit.js` | Proves the merge lost nothing. |
| `build/devserver.js` | Local preview with a simulated vote store. |

62 votable options: 35 from Research 1 (7 nights), 27 from Research 2 (6 towns + 4 on-route fallbacks).

## Rebuild

```bash
node build/parse.js && node build/render.js && node build/audit.js
```

`audit.js` exits non-zero if any link, text block, or card field from either source is missing from
the generated page, or if the vote-control count drifts. It passes today:

```
research 1: 144 links (0 missing) · 253 text blocks (0 missing)
research 2:  15 links (0 missing) ·  23 text blocks (0 missing)
research 2 JS card data: 27 cards · 0 missing values
vote controls: 62 (expected 62)
AUDIT PASSED — nothing lost.
```

## Local preview

```bash
node build/devserver.js
```

http://localhost:4321 — with an in-memory vote store, so shared voting behaves like production.
Add `--no-kv` to exercise the localStorage-only fallback instead.

## Voting

Every option carries a **Miška** and a **Jakub** button. Either of us can press either one — the
"Who's voting?" picker in the header only highlights your own button, it doesn't lock the other.

- one vote → the card is outlined and reads *"… picked this"*
- both votes → the card turns green, *"Both agree ✓"*
- everything voted lands in the **★ Shortlist** section at the bottom, grouped
  *Both agree / Miška only / Jakub only*

### How votes are stored

Votes always save to `localStorage` immediately, so the page works offline and on a fresh deploy
with nothing configured. When a Redis store is connected they also sync between our phones, and
the pill in the header switches from **This device only** to **Synced**.

`api/votes.js` speaks the Upstash REST protocol and reads whichever env-var pair is present:

```
KV_REST_API_URL        + KV_REST_API_TOKEN
UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
```

**To switch shared voting on:** Vercel dashboard → the `camino` project → **Storage** → create or
connect a Redis / Upstash store → connect it to this project → redeploy. Vercel injects the env
vars itself; no code change needed. Until then the site works fine, votes just stay per-device.

Storage is one Redis hash, `camino:votes:v1`, with fields `<optionId>|<voter>` → `"1"`. Each vote
is its own field, so we can't clobber each other's writes.

## Notes on the merge

Nothing from either research was rewritten, shortened, or re-priced. Research 1's prose is carried
across as its original HTML; Research 2's structured fields are rendered into the same card
vocabulary. Both keep every source link, with the dates and 2-adults prefill intact.

One block of text was **added**, and it is labelled as added on the page: the Overview box noting
that the two researches reach **opposite conclusions about Saturday 12 September**. Research 1 says
the Bilbao sleepover is not worth it (~95 min door-to-door from the stage end, against its ~75 min
rule); Research 2 says it is, conditionally (~60 min on the A3631, but only if Saturday actually
ends at the Andra Mari stop rather than at Eskerika). Same bus, same timetable — they differ on
where Saturday ends and whether the walk to the stop counts.

Prices in both researches were seen on **20 August 2026** and are indicative. Tap through before
believing any of them.
