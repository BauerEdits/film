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

112 incoming transfers from the 2026 class, taken from four official athletics announcements:

| School | Players | Page |
| --- | ---: | --- |
| Auburn | 39 | [Transfer portal tracker](https://auburntigers.com/news/2026/1/7/2026-transfer-portal-tracker) |
| Illinois | 17 | [Illini tracker](https://fightingillini.com/news/2026/1/5/illini-football-transfer-portal-tracker) |
| Kennesaw State | 28 | [28 transfers](https://ksuowls.com/news/2026/1/21/kennesaw-state-football-adds-28-transfers-to-roster.aspx) |
| Wisconsin | 28 | [2026 transfer additions](https://uwbadgers.com/sports/2026/1/2/wisconsin-football-2026-transfer-additions) |

This is not a national portal dump. Players who entered the portal and were not on these four lists are absent. Six Wisconsin rows are absent on purpose: the previous-school cell names a high school, and this board does not turn that into a college. Details, stat rules, and the omitted names are in [SOURCES.md](SOURCES.md).

Unknown fields stay null. The card says "Not published". Portal entry dates, NIL figures, and campus visits are not in the seed. The last two already have empty tables so a later migration can fill them from a real source.

## Schema

`players` holds identity, position, size, portal year, schools, class, hometown, and prep. `player_stats` is one row per published figure, so a new stat does not need a new column. `player_name_variants` records a spelling the same source printed differently. `nil_reports` and `campus_visits` are empty. Another portal class is another set of player rows with a new `portal_year`.
