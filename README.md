# StyleVault (stylevault.app)

**Africa, in its own style.** *Style* is the distinctive way something is done. StyleVault gathers the way Africa does business, governs, creates, travels and plays, from newsrooms in all 54 countries, into one place you can browse freely or tune to what you follow.

## What it does

- **Today:** a continent-wide feed, newest first, with a separate **Top Stories** section: stories reported by 2+ different newsrooms in the last 24 hours.
- **All 54 countries:** a page per country, grouped by African Union region, showing how many local sources we read.
- **Topics:** 13 subject feeds, including *Style & Creative* (fashion, music, film, art, design).
- **Search:** full-text search with country, topic, publisher and date filters.
- **My Monitor:** saved combinations of countries + topics + keywords. Starring a country or topic creates one.
- **Saved stories:** bookmarks.
- **Accounts:** optional. Without one, monitors and saves live in the browser. Signing up or signing in moves them into the account so they sync across devices.

Every story shows headline, publisher, date and a short teaser, and links to the original article. We never store full article text.

## Architecture (zero monthly cost at launch)

| Piece | Tech |
|---|---|
| App UI | Vanilla JS single-page app in `public/`, served by Workers Static Assets |
| API | Cloudflare Worker (`src/index.js`), JSON under `/api/*` |
| Collection | Cron Trigger every 5 min; each run checks the next 7 sources that are due |
| Database | Cloudflare D1 (SQLite + FTS5 search) |
| Auth | PBKDF2-SHA256 password hashes, random session tokens (stored hashed), HttpOnly cookies |

### How collection works (`src/collector/`)

1. Pick sources whose `next_check_at` has passed (busy sources hourly, quiet ones back off to 6 h, failing ones to 24 h).
2. Fetch feeds with ETag / If-Modified-Since, then parse RSS, RDF or Atom.
3. Normalise URLs (strip tracking params) and skip anything already stored.
4. **Classify** with editable rules (`src/data/countries.js`, `src/data/topics.js`). Countries use *Option B*: a country is tagged only when the story is genuinely about it. A headline mention counts more than a teaser mention, and the publisher's home country is only a tie-breaker. See the header comment in `classify.js`.
5. **Cluster** near-identical headlines from different publishers into one story (feeds Top Stories). Wire copies are hidden from the feed; same-publisher reposts are dropped.
6. Write everything in one D1 batch and record source health.

National outlets' world-news items that match no African country are kept for search but hidden from the Africa feeds.

## Run locally

```bash
npm install
npm run setup      # create the local D1 database and load countries, topics, sources
npm run dev        # http://localhost:8787
npm run collect    # in another terminal: fetch every source now
npm test           # classifier + parser tests
```

`npm run collect` uses `ADMIN_TOKEN` from `.dev.vars` (git-ignored). Create that file with a line `ADMIN_TOKEN=<any long random string>`.

## Deploy to Cloudflare

```bash
npx wrangler login
npx wrangler d1 create stylevault        # paste the printed database_id into wrangler.jsonc
npm run db:migrate:remote
npm run db:seed:remote
npx wrangler secret put ADMIN_TOKEN      # for manual POST /api/admin/collect
npm run deploy
```

Then add `stylevault.app` as a Custom Domain on the Worker in the Cloudflare dashboard. The edge cache for API responses only operates on a custom domain.

## Editing coverage

- **Add or fix a source:** edit `src/data/sources.js`, then `npm run db:seed:remote`.
- **Improve classification:** edit `terms` / `exclude` in `src/data/countries.js` or `keywords` in `src/data/topics.js`, add a test in `test/classify.test.js`, run `npm test`, deploy. Rules apply to newly collected stories.
- **Permissions:** every source starts as `permission_status = 'unreviewed'`. Before public launch, review each publisher's terms and record the result (`permitted` / `restricted` / `denied`) in the `sources` table. `denied` sources are never fetched.

## Free-tier budget

Workers Free allows 100k requests/day, 10 ms CPU and 50 subrequests per invocation; D1 Free allows 5 GB total storage and 500 MB per database. Each cron run uses about 20 subrequests. Articles older than 90 days are pruned daily (saved ones are kept). If the logs show CPU-limit errors on cron runs, lower `COLLECT_BATCH_SIZE` in `wrangler.jsonc`; the Workers Paid plan ($5/mo) removes that ceiling.

## Not built yet (by design)

Password reset by email, email alerts and push notifications (all need a paid email service), AI summaries, personalised ranking, and mobile packaging with Capacitor.

The old static prototype is kept in `legacy-prototype/` for reference and is not deployed.
