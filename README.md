# Renegade Raider — Transfer Portal

A local board of college football transfers. The chart plots published height against published weight. Choosing a point, by click or Enter, opens that player's schools, size, class, and whatever counting stats the cited page actually printed.

## Run

Node 22 or newer.

```bash
npm install
npm run dev
```

Open http://127.0.0.1:5173

The API is a small Node server using the built-in SQLite module. On startup it builds `data/portal.sqlite` from `db/migrations/001_init.sql` and the seed modules in `server/data/`. That file is generated. The seed modules are the source of the roster.

`npm start` builds the web app and serves it, with the API, on http://127.0.0.1:8787

`npm test` checks the seed against the database. `npm run verify` opens the app in Chrome and walks the chart: hover, click, Enter, filters, and a narrow window.

## What is loaded

Two seasons, and neither one is the full portal.

**2025.** Players on 2025-26 NCAA football rosters whose previous-school field names a college or junior college. The rows come from the CC0 roster release [NCAA All-Sports Rosters 2025-26](https://huggingface.co/datasets/dharits3/ncaa-college-athlete-rosters-2025-26) (Dharit Shah, v2.1.1). High-school previous schools, academic majors that leaked into that field, and strings that do not name a college are left out. The count and the exclusion totals are in [SOURCES.md](SOURCES.md). `scripts/build_roster_transfers.py` is the filter that produced `server/data/roster2025.json`.

**2026.** 112 incoming transfers from four official athletics announcements:

| School | Players | Page |
| --- | ---: | --- |
| Auburn | 39 | [Transfer portal tracker](https://auburntigers.com/news/2026/1/7/2026-transfer-portal-tracker) |
| Illinois | 17 | [Illini tracker](https://fightingillini.com/news/2026/1/5/illini-football-transfer-portal-tracker) |
| Kennesaw State | 28 | [28 transfers](https://ksuowls.com/news/2026/1/21/kennesaw-state-football-adds-28-transfers-to-roster.aspx) |
| Wisconsin | 28 | [2026 transfer additions](https://uwbadgers.com/sports/2026/1/2/wisconsin-football-2026-transfer-additions) |

CollegeFootballDigest, citing CollegeFootballData.com, reported 4,483 portal entries for the 2026 season. That list is not in this repo. The API terms prohibit republishing the bulk file, and the digest does not allow a CSV of that source. Everyone in that count who is not on the four pages above is still missing. So are portal cycles before 2025, entrants who never show up on a cited roster, portal-entry dates, NIL figures, and visits.

Unknown fields stay null. The card says "Not published". Portal entry dates, NIL figures, and campus visits are not in the seed. The last two already have empty tables so a later migration can fill them from a real source.

## Schema

`players` holds identity, position, size, portal year, schools, class, hometown, and prep. `player_stats` is one row per published figure, so a new stat does not need a new column. `player_name_variants` records a spelling the same source printed differently. `nil_reports` and `campus_visits` are empty. Another portal class is another set of player rows with a new `portal_year`.
