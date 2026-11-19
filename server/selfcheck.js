import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { formatHeight, parseHeight } from "../shared/format.js";
import { neighborsWithin } from "../shared/hit.js";
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
  return new Map(rows.map((row) => [`${row.full_name}|${row.school_to}`, row]));
}

function statValue(db, name, season, key) {
  const row = db
    .prepare(
      `SELECT value_num, value_text FROM player_stats s
       JOIN players p ON p.id = s.player_id
       WHERE p.full_name = ? AND s.season_label = ? AND s.stat_key = ?`,
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
  assert(db.prepare("SELECT COUNT(*) AS n FROM players").get().n === 112, "total players");
  assert(db.prepare("SELECT COUNT(*) AS n FROM players WHERE portal_entry_date IS NOT NULL").get().n === 0, "portal entry dates must stay null");
  assert(db.prepare("SELECT COUNT(*) AS n FROM nil_reports").get().n === 0, "nil empty");
  assert(db.prepare("SELECT COUNT(*) AS n FROM campus_visits").get().n === 0, "visits empty");
  assert(db.prepare("SELECT COUNT(*) AS n FROM players WHERE source_id = (SELECT id FROM sources WHERE slug = 'auburn') AND signed_on IS NULL").get().n === 0, "auburn signed dates");
  assert(db.prepare("SELECT COUNT(*) AS n FROM players WHERE source_id != (SELECT id FROM sources WHERE slug = 'auburn') AND signed_on IS NOT NULL").get().n === 0, "only auburn has signed dates");

  const banned = ["Jake Anderson", "Marvin Burks Jr.", "Malachai Coleman", "Bryan Jackson", "Nate Palmer", "Hammond Russell IV", "Nyakhi Davenport"];
  for (const name of banned) {
    assert(!db.prepare("SELECT 1 FROM players WHERE full_name = ?").get(name), `${name} should not be a stored player`);
  }
  const variant = db.prepare("SELECT variant, note FROM player_name_variants").all();
  assert(variant.length === 1 && variant[0].variant === "Nyakhi Davenport", "name variant");

  const stored = rowMap(db);
  assert(stored.size === players.length, "seed and database diverged");
  for (const player of players) {
    const row = stored.get(`${player.name}|${player.to}`);
    assert(row, `database missing ${player.name}`);
    assert(row.height_inches === parseHeight(player.height), `${player.name} height`);
    assert(row.weight_lbs === player.weight, `${player.name} weight`);
    assert(row.school_from === player.from, `${player.name} school from`);
    assert(row.eligibility_raw === player.eligibility, `${player.name} class`);
    assert(row.position_raw === player.pos, `${player.name} position`);
    assert(row.portal_year === 2026, `${player.name} year`);
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
    const row = stored.get(`${name}|${school}`);
    assert(row && row.height_inches === height && row.weight_lbs === weight && row.school_from === from && row.eligibility_raw === eligibility, `literal mismatch for ${name}`);
  }

  assert(stored.get("Jaiden Crawford|Kennesaw State").prep_listed == null, "Jaiden prep stays blank");
  assert(String(stored.get("Cam Miller|Kennesaw State").data_note).includes("206"), "Cam Miller weight note");
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
  assert(db.prepare("SELECT COUNT(*) AS n FROM player_stats s JOIN players p ON p.id = s.player_id WHERE p.full_name = 'Brayden Munroe' AND season_label != '2025'").get().n === 0, "Munroe conflicting career totals omitted");
  assert(db.prepare("SELECT COUNT(*) AS n FROM player_stats s JOIN players p ON p.id = s.player_id WHERE p.full_name = 'Josh Anglin' AND season_label = '2024'").get().n === 0, "Anglin 2024 conflict omitted");
  assert(db.prepare("SELECT COUNT(*) AS n FROM player_stats s JOIN players p ON p.id = s.player_id WHERE p.full_name IN ('Locklan Hewlett', 'Scrap Richardson', 'Katin Houser', 'Deuce Adams')").get().n === 0, "players without a stored line stay empty");
}

async function checkApi(base) {
  const health = await fetch(`${base}/api/health`);
  assert(health.ok, "health");
  const meta = await fetch(`${base}/api/meta`).then((res) => res.json());
  assert(meta.playerCount === 112 && meta.plottedCount === 112, "meta counts");
  assert(meta.seasons.join() === "2026", "season");
  const list = await fetch(`${base}/api/players?position=QB`).then((res) => res.json());
  assert(list.players.length === 7, `QB count ${list.players.length}`);
  const byrum = list.players.find((player) => player.fullName === "Byrum Brown");
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
console.log("ok 112 players");
