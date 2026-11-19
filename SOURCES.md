# Sources

Accessed 2026-11-19. School names, classes, heights, and weights are copied as each athletics site printed them. They are not normalized, converted, or filled in from a second site.

`school_to` is the school that published the player as an incoming transfer. `school_from` is the previous-school column on that same page. `portal_year` is the 2026 class those pages describe. `portal_entry_date` is null for every row: none of these pages give the day a player entered the portal. Auburn's dates are the "Signed" column only.

## Pages in the database

1. Auburn Athletics, "Transfer Portal Tracker: Auburn closes portal with 39 newcomers" (bylined January 7, 2026; the table includes signing dates through January 23, 2026).
   https://auburntigers.com/news/2026/1/7/2026-transfer-portal-tracker
   All 39 table rows are included. Hometowns and counting stats come from the bios on that page. The roster table spells the running back Nykahi Davenport. A bio heading on the same page spells it Nyakhi. The stored name is Nykahi, and the heading is kept as a name variant. A later Auburn roster page lists his weight as 212. This seed does not use that page. The tracker table and its bio line both say 216.

2. Illinois Athletics, "Illini Football Transfer Portal Tracker", January 5, 2026.
   https://fightingillini.com/news/2026/1/5/illini-football-transfer-portal-tracker
   All 17 table rows are included. The linked bio pages were not opened, so Illinois players have no counting stats.

3. Kennesaw State Athletics, "Kennesaw State Football Adds 28 Transfers to Roster", January 21, 2026.
   https://ksuowls.com/news/2026/1/21/kennesaw-state-football-adds-28-transfers-to-roster.aspx
   All 28 table rows are included. Size, class, previous school, hometown, and prep come from the table. Counting stats come from the bios on the same page. Where the table and a bio heading disagree, the table is stored and the player note says so:
   - Cam Miller is 208 pounds on the table. The bio heading says 206.
   - Matt McKenzie is r-Jr. on the table. The bio heading says r-Sr.
   - Jaiden Crawford's prep is blank. The table's hometown/high school cell says Delta Junior College, and the bio heading says Cesar Chavez HS.

4. Wisconsin Athletics, "Wisconsin Football: 2026 Transfer Additions".
   https://uwbadgers.com/sports/2026/1/2/wisconsin-football-2026-transfer-additions
   The page has no single publication date in the article text. The table has no counting stats. Rows are included only when the Previous School cell names a college. These six rows are omitted because that cell names a high school, and no college was invented for them:
   - Jake Anderson — Durand
   - Marvin Burks Jr. — Cardinal Ritter
   - Malachai Coleman — Lincoln East
   - Bryan Jackson — McKinney
   - Nate Palmer — Decatur
   - Hammond Russell IV — Dublin Coffman

Position groups on the chart are a display grouping. Cornerbacks and safeties are DB. Outside linebackers are LB. The stored `position_raw` is the label the school printed.

## What was not copied, even when a page mentioned it

- Recruiting stars and rankings.
- Pro Football Focus grades.
- High school statistics.
- Team rankings and team yardage totals.
- A single highlight play treated as a season line. Locklan Hewlett's bio describes one touchdown pass and does not give a season passing line, so he has no stat rows.
- Figures the same bio states two different ways. Brayden Munroe's bio prints both 92 receptions for 1,322 yards and 93 receptions for 1,428 career yards. Neither career line is stored. His 2025 line, 46 receptions for 696 yards and three touchdowns, is stored. Josh Anglin's 2024 section says both 12 games and eight games, so that season is not stored. His 2025 Tulsa line is stored.

## How a stat got its season label

- The year printed in the bullet is the season label.
- If a bullet does not repeat the year, and the immediately previous bullet is the only open season, that year is used. Cole Skinner's two rushing touchdowns are tagged 2025 for that reason: they follow the bullet that says he played 12 games in 2025.
- Otherwise the label uses the words on the page, such as "Career", "At Oregon State", or "One season at Florida State", and does not invent a calendar year.
- "2023-24" and "2023-25" are labels the page itself used for a span.

## Not in this database

Everyone outside these four announcements. Portal entry dates. NIL valuations. Official or unofficial visits. Snap grades. Depth-chart status after the announcement. Whether a player remained enrolled after the article ran.

`nil_reports` and `campus_visits` exist and are empty so those can be added later from a cited source without reshaping the player row.
