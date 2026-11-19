import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { formatHeight, parseHeight } from "../shared/format.js";
import { neighborsWithin } from "../shared/hit.js";
import rosterMeta from "./data/roster2025.meta.json" with { type: "json" };
import { players } from "./data/index.js";
import { openDatabase } from "./db.js";
import { startServer } from "./index.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function checkHitTest() {
  const points = [
    { id: "near", x: 0, y: 0 },
    { id: "edge", x: 10, y: 0 },
    { id: "far", x: 40, y: 0 },
  ];
  const found = neighborsWithin(points, { x: 0, y: 0 }, 12).map((point) => point.id);
  assert(found.join() === "near,edge", `hit test returned ${found.join()}`);
}

function rowMap(db) {
  const rows = db.prepare("SELECT * FROM players").all();
  return new Map(rows.map((row) => [row.person_key, row]));
}

function statValue(db, name, season, key) {
  const row = db
    .prepare(
      `SELECT value_num, value_text FROM player_stats s
       JOIN players p ON p.id = s.player_id
       WHERE p.full_name = ? AND p.portal_year = 2026 AND s.season_label = ? AND s.stat_key = ?`,
    )
    .get(name, season, key);
  assert(row, `missing stat ${name} ${season} ${key}`);
  return row;
}

function checkDatabase(db) {
  checkHitTest();
  assert(formatHeight(parseHeight("6-3")) === `6'3"`, "height format");
  const counts = db.prepare("SELECT src.slug, COUNT(p.id) AS n FROM sources src LEFT JOIN players p ON p.source_id = src.id GROUP BY src.id").all();
  const bySource = Object.fromEntries(counts.map((row) => [row.slug, row.n]));
  assert(bySource.auburn === 39, "auburn count");
  assert(bySource.illinois === 17, "illinois count");
  assert(bySource.kennesaw === 28, "kennesaw count");
  assert(bySource.wisconsin === 28, "wisconsin count");
  assert(bySource["ncaa-rosters-2025"] === rosterMeta.players, "2025 roster count");
  assert(db.prepare("SELECT COUNT(*) AS n FROM players").get().n === players.length, "total players");
  assert(db.prepare("SELECT COUNT(*) AS n FROM players WHERE portal_year = 2026").get().n === 112, "2026 class size");
  assert(db.prepare("SELECT COUNT(*) AS n FROM players WHERE portal_year = 2025").get().n === rosterMeta.players, "2025 class size");
  assert(db.prepare("SELECT COUNT(*) AS n FROM players WHERE portal_entry_date IS NOT NULL").get().n === 0, "portal entry dates must stay null");
  assert(db.prepare("SELECT COUNT(*) AS n FROM nil_reports").get().n === 0, "nil empty");
  assert(db.prepare("SELECT COUNT(*) AS n FROM campus_visits").get().n === 0, "visits empty");
  assert(db.prepare("SELECT COUNT(*) AS n FROM players WHERE source_id = (SELECT id FROM sources WHERE slug = 'auburn') AND signed_on IS NULL").get().n === 0, "auburn signed dates");
  assert(db.prepare("SELECT COUNT(*) AS n FROM players WHERE source_id != (SELECT id FROM sources WHERE slug = 'auburn') AND signed_on IS NOT NULL").get().n === 0, "only auburn has signed dates");

  const banned = ["Jake Anderson", "Marvin Burks Jr.", "Malachai Coleman", "Bryan Jackson", "Nate Palmer", "Hammond Russell IV"];
  for (const name of banned) {
    const row = db
      .prepare(
        `SELECT 1 FROM players p JOIN sources s ON s.id = p.source_id
         WHERE s.slug = 'wisconsin' AND p.full_name = ?`,
      )
      .get(name);
    assert(!row, `${name} should not be a Wisconsin row`);
  }
  const variant = db.prepare("SELECT variant, note FROM player_name_variants").all();
  assert(variant.length === 1 && variant[0].variant === "Nyakhi Davenport", "name variant");

  const stored = rowMap(db);
  assert(stored.size === players.length, "seed and database diverged");
  for (const player of players) {
    const row = stored.get(player.personKey);
    assert(row, `database missing ${player.name}`);
    assert(row.height_inches === (player.height ? parseHeight(player.height) : null), `${player.name} height`);
    assert(row.weight_lbs === (player.weight ?? null), `${player.name} weight`);
    assert(row.school_from === player.from, `${player.name} school from`);
    assert(row.eligibility_raw === (player.eligibility ?? null), `${player.name} class`);
    assert(row.position_raw === (player.pos ?? null), `${player.name} position`);
    assert(row.portal_year === player.year, `${player.name} year`);
  }

  const literals = [
    ["Byrum Brown", "Auburn", 75, 232, "USF", "Senior"],
    ["Nykahi Davenport", "Auburn", 72, 216, "USF", "Sophomore"],
    ["Tristan Ti'a", "Auburn", 74, 205, "Oregon State", "Freshman"],
    ["Colton Joseph", "Wisconsin", 74, 200, "Old Dominion", "R-Jr."],
    ["PJ Wilkins", "Wisconsin", 77, 340, "Ole Miss", "R-Jr."],
    ["Lucas Simmons", "Wisconsin", 80, 308, "Florida State", "R-Jr."],
    ["Ethan Moczulski", "Illinois", 71, 200, "Washington", "Sr."],
    ["Ja'Lyen Judson", "Kennesaw State", 72, 170, "UAB", "r-Fr."],
    ["Cam Miller", "Kennesaw State", 73, 208, "Memphis", "r-Sr."],
    ["Maliki Wright", "Kennesaw State", 71, 190, "Duke", "r-Fr."],
  ];
  for (const [name, school, height, weight, from, eligibility] of literals) {
    const row = db.prepare("SELECT * FROM players WHERE full_name = ? AND school_to = ? AND portal_year = 2026").get(name, school);
    assert(row && row.height_inches === height && row.weight_lbs === weight && row.school_from === from && row.eligibility_raw === eligibility, `literal mismatch for ${name}`);
  }

  const jaiden = db.prepare("SELECT prep_listed FROM players WHERE full_name = 'Jaiden Crawford' AND school_to = 'Kennesaw State' AND portal_year = 2026").get();
  const cam = db.prepare("SELECT data_note FROM players WHERE full_name = 'Cam Miller' AND school_to = 'Kennesaw State' AND portal_year = 2026").get();
  assert(jaiden.prep_listed == null, "Jaiden prep stays blank");
  assert(String(cam.data_note).includes("206"), "Cam Miller weight note");
  assert(statValue(db, "Byrum Brown", "2025", "pass_yds").value_num === 3158, "Byrum 2025 yards");
  assert(statValue(db, "Byrum Brown", "2025", "pass_td").value_num === 28, "Byrum 2025 pass td");
  assert(statValue(db, "Byrum Brown", "2025", "rush_yds").value_num === 1008, "Byrum 2025 rush");
  assert(statValue(db, "Byrum Brown", "2023", "pass_yds").value_num === 3292, "Byrum 2023 yards");
  assert(statValue(db, "Nykahi Davenport", "2025", "rush_yds").value_num === 612, "Nykahi yards");
  assert(statValue(db, "Bryson Washington", "Career", "rush_yds").value_num === 1861, "Bryson career");
  assert(statValue(db, "Rickie Collins", "2025", "pass_cmp_att").value_text === "97-of-181", "Rickie completions");
  assert(statValue(db, "Rickie Collins", "2025", "pass_yds").value_num === 1042, "Rickie yards");
  assert(statValue(db, "Brayden Munroe", "2025", "rec").value_num === 46, "Munroe receptions");
  assert(statValue(db, "Brayden Munroe", "2025", "rec_yds").value_num === 696, "Munroe yards");
  assert(db.prepare("SELECT COUNT(*) AS n FROM player_stats s JOIN players p ON p.id = s.player_id WHERE p.full_name = 'Brayden Munroe' AND p.portal_year = 2026 AND season_label != '2025'").get().n === 0, "Munroe conflicting career totals omitted");
  assert(db.prepare("SELECT COUNT(*) AS n FROM player_stats s JOIN players p ON p.id = s.player_id WHERE p.full_name = 'Josh Anglin' AND p.portal_year = 2026 AND season_label = '2024'").get().n === 0, "Anglin 2024 conflict omitted");
  assert(
    db.prepare(
      `SELECT COUNT(*) AS n FROM player_stats s
       JOIN players p ON p.id = s.player_id
       WHERE p.portal_year = 2026 AND p.full_name IN ('Locklan Hewlett', 'Scrap Richardson', 'Katin Houser', 'Deuce Adams')`,
    ).get().n === 0,
    "players without a stored line stay empty",
  );
}

async function checkApi(base) {
  const health = await fetch(`${base}/api/health`);
  assert(health.ok, "health");
  const meta = await fetch(`${base}/api/meta`).then((res) => res.json());
  const plotted = players.filter((player) => player.height && player.weight).length;
  assert(meta.playerCount === players.length && meta.plottedCount === plotted, "meta counts");
  assert(meta.seasons.join() === "2025,2026", "season");
  assert(meta.coverage.includes("not a complete national portal"), "coverage stays partial");
  const qbCount = players.filter((player) => player.group === "QB").length;
  const list = await fetch(`${base}/api/players?position=QB`).then((res) => res.json());
  assert(list.players.length === qbCount, `QB count ${list.players.length}`);
  const byrum = list.players.find((player) => player.fullName === "Byrum Brown" && player.schoolTo === "Auburn");
  assert(byrum, "Byrum in QB list");
  const detail = await fetch(`${base}/api/players/${byrum.id}`).then((res) => res.json());
  assert(detail.player.portalEntryDate === null, "API portal entry null");
  assert(detail.player.signedOn === "2026-01-06", "API signed date");
  assert(detail.player.schoolFrom === "USF" && detail.player.schoolTo === "Auburn", "API schools");
  assert(detail.player.stats.some((stat) => stat.key === "pass_yds" && stat.valueNum === 3158), "API stat");
  const missing = await fetch(`${base}/api/players?q=zzzz-no-player`).then((res) => res.json());
  assert(missing.players.length === 0, "empty search");
  const bad = await fetch(`${base}/api/players?season=nope`);
  assert(bad.status === 400, "bad season");
  const sample = players.find(
    (player) => player.source === "ncaa-rosters-2025" && player.stats.some((stat) => stat.key === "rush_yds" && stat.value > 0),
  );
  const matches = await fetch(`${base}/api/players?q=${encodeURIComponent(sample.name)}`).then((res) => res.json());
  const listed = matches.players.find((player) => player.fullName === sample.name && player.schoolTo === sample.to);
  assert(listed, "roster sample missing from search");
  const rosterDetail = await fetch(`${base}/api/players/${listed.id}`).then((res) => res.json());
  assert(rosterDetail.player.portalYear === 2025 && rosterDetail.player.portalEntryDate === null, "roster year");
  assert(rosterDetail.player.rosterUrl, "roster page url");
  const rush = sample.stats.find((stat) => stat.key === "rush_yds");
  assert(
    rosterDetail.player.stats.some((stat) => stat.key === "rush_yds" && stat.valueNum === rush.value),
    "roster rush yards",
  );
}

const dir = mkdtempSync(join(tmpdir(), "portal-"));
const dbPath = join(dir, "portal.sqlite");
const db = openDatabase(dbPath);
try {
  checkDatabase(db);
} finally {
  db.close();
}
const started = await startServer({ port: 0, dbPath });
try {
  await checkApi(started.url);
} finally {
  await new Promise((resolve) => started.server.close(resolve));
  started.db.close();
}
console.log(`ok ${players.length} players`);
