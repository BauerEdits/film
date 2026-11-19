import { fbsCounts } from "./index.js";
import rosterMeta from "./roster2025.meta.json" with { type: "json" };

function comma(value) {
  return value.toLocaleString("en-US");
}

export const sources = [
  {
    slug: "auburn",
    publisher: "Auburn Athletics",
    title: "Transfer Portal Tracker: Auburn closes portal with 39 newcomers",
    url: "https://auburntigers.com/news/2026/1/7/2026-transfer-portal-tracker",
    publishedOn: "2026-01-07",
    accessedOn: "2026-11-19",
    statsScope: "bios",
    coverageNote:
      "All 39 players in the roster table. Signed dates are that column, not portal-entry dates. Hometowns and counting stats are from the bios printed on the same page.",
  },
  {
    slug: "illinois",
    publisher: "Illinois Athletics",
    title: "Illini Football Transfer Portal Tracker",
    url: "https://fightingillini.com/news/2026/1/5/illini-football-transfer-portal-tracker",
    publishedOn: "2026-01-05",
    accessedOn: "2026-11-19",
    statsScope: "table",
    coverageNote:
      "All 17 signings in the roster table. The linked bio pages were not opened, so counting stats are empty.",
  },
  {
    slug: "kennesaw",
    publisher: "Kennesaw State Athletics",
    title: "Kennesaw State Football Adds 28 Transfers to Roster",
    url: "https://ksuowls.com/news/2026/1/21/kennesaw-state-football-adds-28-transfers-to-roster.aspx",
    publishedOn: "2026-01-21",
    accessedOn: "2026-11-19",
    statsScope: "bios",
    coverageNote:
      "All 28 signees in the roster table. Size, class, previous school, and prep come from that table. Counting stats come from the bios on the same page. Where the table and a bio heading disagree, the table is stored and the player note says so.",
  },
  {
    slug: "wisconsin",
    publisher: "Wisconsin Athletics",
    title: "Wisconsin Football: 2026 Transfer Additions",
    url: "https://uwbadgers.com/sports/2026/1/2/wisconsin-football-2026-transfer-additions",
    publishedOn: null,
    accessedOn: "2026-11-19",
    statsScope: "table",
    coverageNote:
      "Incoming transfers whose Previous School cell names a college. Six rows are omitted because that cell names a high school: Jake Anderson (Durand), Marvin Burks Jr. (Cardinal Ritter), Malachai Coleman (Lincoln East), Bryan Jackson (McKinney), Nate Palmer (Decatur), and Hammond Russell IV (Dublin Coffman). The table has no counting stats.",
  },
  {
    slug: "ncaa-rosters-2025",
    publisher: "NCAA All-Sports Rosters 2025-26 (Dharit Shah, CC0 1.0)",
    title: "Football roster, bio, and 2025 stats sidecars, v2.1.1",
    url: "https://huggingface.co/datasets/dharits3/ncaa-college-athlete-rosters-2025-26",
    publishedOn: "2026-08-14",
    accessedOn: "2026-11-19",
    statsScope: "roster",
    coverageNote:
      `${comma(rosterMeta.players)} football players on 2025-26 NCAA rosters whose previous-school field names a college or junior college. Height, weight, class, and hometown are stored only when that roster published them. Counting stats are the 2025 season line from the same release, and only when the figure is not zero. This is the roster's previous-school field, not a portal-entry log.`,
  },
];

export const COVERAGE_SUMMARY =
  `This board is not a complete national portal, and it is limited to FBS. A player stays only when both the previous school and the destination are among the 136 Football Bowl Subdivision programs named for 2025 by FBSchedules on 1 July 2025. Of the ${comma(rosterMeta.players + 112)} players loaded from the cited roster and the four 2026 announcements, ${comma(fbsCounts.kept)} remain and ${comma(fbsCounts.removed)} are removed. ${comma(fbsCounts.other)} of those removed have a school the roster file places outside FBS, ${comma(fbsCounts.unknown)} have a school that could not be matched, and ${comma(fbsCounts.both)} have one of each. An unmatched school is left out. It is not treated as FBS. The 2025 season started from ${comma(rosterMeta.players)} players whose 2025-26 NCAA football roster lists a previous college or junior college, taken from the CC0 roster release (72,512 football rows). Of the ${comma(rosterMeta.previousSchoolRows)} rows with a previous-school value, ${comma(rosterMeta.excludedSameAsHighSchool)} match the high-school field, ${comma(rosterMeta.excludedHighSchoolWording)} read as a high school, ${comma(rosterMeta.excludedMajor)} are academic majors, and ${comma(rosterMeta.excludedUnclassified)} do not identify a college (examples: ${rosterMeta.unclassifiedExamples.slice(0, 8).join(", ")}). The other ${comma(rosterMeta.footballRosterRows - rosterMeta.previousSchoolRows)} football rows name no previous school and are not listed. The 2026 announcements named 112 players at Auburn, Illinois, Kennesaw State, and Wisconsin before the FBS cut. CollegeFootballDigest, citing CollegeFootballData.com, reported 4,483 portal entries for 2026 (3,504 with a new school and 979 without) on its 16 November 2026 refresh. That player list is not loaded: CollegeFootballData.com's terms prohibit republishing the API data as a bulk dataset, and CollegeFootballDigest does not allow a CSV of that source. Portal cycles before 2025, entrants who never appear on a cited roster, portal-entry dates, NIL figures, and visits are not in this database. Known-committed means the cited page names a destination school: all ${comma(fbsCounts.kept)} loaded players. Known-uncommitted means a cited source says the player entered the portal and names no new school: 0 loaded players. No destination was cleared to create that list. Players who entered the portal and are not on a cited page are missing, not marked available.`;
