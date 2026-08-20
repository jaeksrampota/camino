# camino

**Miška & Jakub — dovolenka.** Camino del Norte, Donostia → Bilbao, 6–16 September 2026.

Two separately-produced accommodation researches, merged into one page under one design, with a
vote button for each of us on every option.

**Live: https://jaeksrampota.github.io/camino/**

## What's here

| Path | What it is |
|---|---|
| `index.html` | The site. Generated — **do not hand-edit**, edit the sources or the build script. |
| `source/research-a.html` | Research 1, exactly as produced. Also served at `/source/research-a.html`. |
| `source/research-b.html` | Research 2, exactly as produced. Also served at `/source/research-b.html`. |
| `build/parse.js` | Reads both sources → `build/data.json`. |
| `build/render.js` | `data.json` → `index.html`. All CSS/JS inlined; the page makes no external requests. |
| `build/audit.js` | Proves the merge lost nothing. |
| `build/devserver.js` | Local preview, with a simulated vote store. |
| `api/votes.js` | Serverless vote store. **Dormant on GitHub Pages** — see *Hosting* below. |

62 votable options: 35 from Research 1 (7 nights), 27 from Research 2 (6 towns + 4 on-route fallbacks).

## Rebuild

```bash
node build/parse.js && node build/render.js && node build/audit.js
```

`audit.js` exits non-zero if any link, text block or card field from either source is missing from
the generated page, if the inline script fails to parse, or if the vote-control count drifts:

```
research 1: 144 links (0 missing) · 253 text blocks (0 missing)
research 2:  15 links (0 missing) ·  23 text blocks (0 missing)
research 2 JS card data: 27 cards · 0 missing values
inline page script: parses
vote controls: 62 (expected 62)
AUDIT PASSED — nothing lost.
```

## Local preview

```bash
node build/devserver.js
```

http://localhost:4321, with an in-memory vote store so server-synced voting can be exercised.
Add `--no-kv` to reproduce the GitHub Pages behaviour instead.

## Voting

Every option carries a **Miška** and a **Jakub** button. Either of us can press either one — the
"Who's voting?" picker in the header only highlights your own button, it doesn't lock the other.

- one vote → the card is outlined, *"… picked this"*
- both votes → the card turns green, *"Both agree ✓"*
- everything voted lands in **★ Shortlist**, grouped *Both agree / Miška only / Jakub only*

### Comparing picks

Votes are stored in each browser's `localStorage`. To compare, press **Share my picks** — it copies
a link with your votes packed into the fragment — and send it over. Opening that link **merges**
those votes into whatever is already on the other device:

- the merge is a union, so it never deletes anybody's votes
- re-opening the same link is a no-op
- it works whether the link is opened cold or while the page is already up
- a link from an older build is rejected with a message rather than applied wrongly

The wire format is `#v=<version>.<miška indices>.<jakub indices>`, base36, versioned so that a
rebuild which reorders cards can't silently mis-apply an old link.

## Hosting

Served by **GitHub Pages** from `main`, which is static-only, so `api/votes.js` never runs and the
header pill reads *Saved on this device*. Pages on a free plan requires a public repo, which is why
this one is public.

`api/votes.js` is kept because it needs no changes to work — it speaks the Upstash REST protocol
with zero npm dependencies, and the client already probes `/api/votes` on load and upgrades itself
to **Synced** whenever that endpoint answers. To turn on real cross-device voting:

1. Connect GitHub at https://vercel.com/account/login-connections
2. Import this repo as a Vercel project
3. Project → **Storage** → attach a Redis / Upstash store

Vercel injects `KV_REST_API_URL` / `KV_REST_API_TOKEN` (or the `UPSTASH_REDIS_REST_*` pair, both are
read) and shared voting starts working with no code change. Storage is one Redis hash,
`camino:votes:v1`, fields `<optionId>|<voter>` → `"1"` — one field per vote, so concurrent writes
can't clobber each other.

## Notes on the merge

Nothing from either research was rewritten, shortened or re-priced. Research 1's prose is carried
across as its original HTML; Research 2's structured fields are rendered into the same card
vocabulary. Every source link survives with its dates and 2-adults prefill intact.

One block of text was **added**, and is labelled as added on the page: the Overview box noting that
the two researches reach **opposite conclusions about Saturday 12 September**. Research 1 says the
Bilbao sleepover is not worth it (~95 min door-to-door from the stage end, against its ~75 min
rule); Research 2 says it is, conditionally (~60 min on the A3631, but only if Saturday actually
ends at the Andra Mari stop rather than at Eskerika). Same bus, same timetable — they differ on
where Saturday ends and whether the walk to the stop counts.

Prices in both researches were seen on **20 August 2026** and are indicative. Tap through before
believing any of them.
