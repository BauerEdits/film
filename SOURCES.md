# Sources

Accessed 2026-11-19. Names, schools, classes, heights, weights, and stats are copied from the cited source. They are not guessed, averaged, or filled in from a second site. A blank field means the cited source did not publish it.

This is not a complete national portal. Two seasons are loaded, and both have gaps that are counted below.

`portal_entry_date` is null for every row. None of the cited pages give the day a player entered the portal. Auburn's dates are the "Signed" column only.

## 2025 season: NCAA roster previous schools

Source: Dharit Shah, NCAA All-Sports Rosters 2025-26, v2.1.1, CC0 1.0. DOI 10.57967/hf/9512. Dataset card: https://huggingface.co/datasets/dharits3/ncaa-college-athlete-rosters-2025-26. The football slice is `by_sport/football/all.parquet`, joined to `data/ncaa_athlete_bio_2025-26.parquet` on `athlete_id`, with 2025 counting stats from `by_sport/football/stats.parquet`. The football codebook calls `previous_school` the JUCO and transfer pipeline and also says the field is heterogeneous. The build date on the datasheet is 14 August 2026. The files used here were downloaded 19 November 2026.

`portal_year` for these rows is 2025, the season column on the roster file. `school_to` is the roster school. `school_from` is the previous-school cell after removing a leading "Previous School:" label, when that label was present. The rest of the cell is stored as printed, including a slash between two schools. `roster_url` is the `source_url` of that roster page.

A row is kept only when that previous-school text identifies a college or junior college: it matches a football school name in the same release (after ordinary abbreviations such as State/St.), it contains a college word (college, university, junior, community, institute, C.C., J.C.), or it is one of the short college names listed in `scripts/build_roster_transfers.py`. High-school matches, prep and academy wording, and academic majors that landed in the column are dropped. Strings that still do not identify a college are dropped too.

The exact kept and dropped counts are in `server/data/roster2025.meta.json` and in the coverage line the app serves. In short: 72,512 football roster rows; 17,152 have a previous-school value; the kept set is the college and junior-college subset; the rest of the football file has no previous school and is not on the board. Dropped examples that are still missing include Albany, Southern, Charleston, Lincoln, Smithville, South Oak Cliff, West Linn, and Pine Creek, where the text is a short name that could be a college or a high school and was not promoted.

Height and weight are stored only when the bio sidecar has a whole-inch height from 58 to 90 and a weight from 85 to 450. Anything outside that, or missing, stays null. Position group uses the file's group when it is already QB, RB, WR, TE, OL, DL, LB, DB, or ATH. Special-teams rows are mapped from the printed position (kicker, punter, snapper). Other wording is mapped only when the printed words name one of those groups. Otherwise the group is null and the raw position is kept.

Counting stats are the 2025 columns in the stats sidecar: games, passing, rushing, receiving, tackles, tackles for loss, sacks, interceptions, passes defended, field goals, punts, and punt average. A figure is stored only when it is present and not zero. A zero is omitted rather than shown as a season total. These are the destination roster's 2025 line, not a prior school's line.

## 2026 season: four athletics announcements

`school_to` is the school that published the player as an incoming transfer. `school_from` is the previous-school column on that same page. `portal_year` is the 2026 class those pages describe.

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

## Committed and uncommitted

A loaded player is known-committed when `school_to` is the school named by the cited page. For the 2025 roster rows, that is the school whose roster lists him. For the 2026 rows, that is Auburn, Illinois, Kennesaw State, or Wisconsin, the school that announced him as an incoming transfer. All 1,753 players who remain after the FBS filter are known-committed. None of those destination schools were cleared.

A loaded player would be known-uncommitted only when a cited source says he entered the portal and names no new school. There are 0 such rows. No loaded row has an unknown commitment: every loaded row has a destination on the cited page.

People who entered the portal and are not named on a cited page are missing from the database. They are not stored as available. On 19 November 2026, TransferPortl's public portal page said 6 of 4,789 tracked 2026 players were still available and 4,773 had committed (https://transferportl.com/portal?status=available). That named list is not loaded. TransferPortl's terms say not to copy the site's data into a competing product, and the same terms say its destinations are model estimates, not facts (https://transferportl.com/terms, updated 6 October 2026). The Digest count of 979 players without a new school, cited above, is a CollegeFootballData.com compilation and is not loaded as names for the same reason.

## Evaluation grades

Grades are computed when a player card is opened. They are not stored, and a missing number is not filled in.

Each input is a 0–100 percentile against other loaded players in the same position group who have that input. The percentile is `100 * (players below + half the players tied) / players with the input`, rounded to one decimal. A player is not scored on an input when he does not have it, or when fewer than two players at his position have it.

Production uses only stats already in `player_stats`, from the latest season that contains the pieces of that input. A ratio uses one season. Completions and attempts in that season make completion percentage; a published completion percentage is used only when attempts are not stored. Yards per carry is rushing yards divided by attempts in one season, or a published yards-per-carry figure when attempts are not stored. Games played prefers `gp`, then `games`. Tackles prefer `tackles_tot`, then `tackles`. Interceptions prefer `def_int`, then `int`.

| Position | Production inputs that exist in the database | Inputs named by the request that are not stored |
| --- | --- | --- |
| QB | Completion percentage, yards per attempt, TD/INT ratio, rushing yards | — |
| RB | Yards per carry, rushing yards, receiving yards | — |
| WR | Receptions, yards per reception, receiving touchdowns | Yards per route |
| TE | Same receiving inputs as WR | Yards per route |
| OL | Starts, games played. The printed position is shown on the card and is not scored. | No other evaluation metric is invented |
| DL and LB | Tackles, tackles for loss, sacks | Pressures |
| DB | Interceptions, passes defended, tackles | — |
| K, P, and LS | Punting average, only when that player has it | Field goals made and attempted, so field-goal percentage stays blank. Return yards, so return production stays blank. |

ATH and players with no position group have no production template. Their production stays blank.

Athletic profile is the average of the height percentile and the weight percentile at that position. Experience is the average of games played and starts. Competition level is the percentile of the previous school's division: D3 = 1, D2 = 2, D1 = 3. That division comes from the same CC0 football roster file, through `scripts/build_school_divisions.py`, which writes `server/data/school-divisions.json`. The destination school's division in the context note is not used. A previous school that does not match one division stays blank. Two schools in one cell are used only when both match the same division.

Overall is the weighted average of the component scores that exist: production 0.45, athletic profile 0.25, experience 0.15, competition 0.15. The weights are scaled to the components that have a score. Starts are not required. A production input that was never published stays blank and is left out of the average. Experience and competition stay on the card when they were published and stay blank when they were not. If every component is blank, overall is blank and there is no projected-impact label. When an overall number exists, that number is the grade. It is not marked incomplete. Projected impact uses only the overall grade: High at 67 or above, Medium from 34 through 66.9, Low below 34.

On the FBS board, all 1,753 loaded players have an overall grade. None are blank, because each remaining player has at least one published input that can be scored.

## FBS filter

The board keeps a player only when both `school_from` and `school_to` match one of the 136 Football Bowl Subdivision programs in the 2025 conference lineups published by FBSchedules on 1 July 2025 (Kevin Kelley). https://fbschedules.com/college-football-realignment-conference-changes-for-2025-take-effect-today/ That list is the ACC, American, Big 12, Big Ten, Conference USA, MAC, Mountain West, Pac-12, SEC, and Sun Belt lineups printed there, plus Notre Dame and UConn as the FBS independents. Delaware, Missouri State, and UMass are on the 2025 list. `scripts/build_fbs_schools.py` writes `server/data/school-fbs.json` by matching those names to the CC0 football roster. A roster school that is not one of the 136 is stored as not FBS. A previous-school string that matches neither an FBS name nor a roster school is unknown. Unknown is left out. It is not treated as FBS. Of the 10,331 players assembled from the roster release and the four 2026 announcements, 1,753 remain and 8,578 are removed.

## Not in this database

The 2026 national portal. CollegeFootballDigest's portal page for 2026, which cites CollegeFootballData.com, said on its 16 November 2026 refresh that 4,483 players entered for the 2026 season, 3,504 had a new school on file, and 979 did not. https://collegefootballdigest.com/data/portal/2026. That player list is not loaded. CollegeFootballData.com's terms (Rad Sports Analytics LLC, effective 12 August 2026) allow display of reasonable portions and a private cache, and they prohibit publishing the API data as a standalone dataset, bulk download, or public database mirror. https://collegefootballdata.com/terms. CollegeFootballDigest's own source table marks a CSV of the CollegeFootballData.com feed as not allowed. https://collegefootballdigest.com/data/source-permissions. Copying that dump into this public repository would break those terms, so the 2026 board is only the four athletics pages above. Everyone in the 4,483 who is not named on those pages is missing.

Also missing:

- Portal cycles from 2021 through 2024. The roster release used here is the 2025-26 athletic year only.
- 2025 roster rows with no previous school, and the previous-school rows classified as a high school, a major, or an unidentified string. The counts are in `server/data/roster2025.meta.json`.
- Players who entered a portal and never appeared on a cited 2025 roster or 2026 announcement.
- Portal-entry dates.
- NIL valuations and official or unofficial visits. `nil_reports` and `campus_visits` exist and are empty so a later cited source can fill them without reshaping the player row.
- Recruiting rankings, snap grades, and whether a player stayed enrolled after the page was published.
