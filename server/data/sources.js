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
];

export const COVERAGE_SUMMARY =
  "This board is a public subset of the 2026 college football transfer class, not a national portal dump. It holds incoming players named by Auburn (39), Illinois (17), Kennesaw State (28), and Wisconsin (28) on their official athletics sites. Six Wisconsin rows were left out because the previous-school cell names a high school. Heights, weights, schools, classes, and stats are copied from those pages. Anything a page does not state is left blank. NIL, official visits, recruiting rankings, and portal-entry dates are not in this database.";
