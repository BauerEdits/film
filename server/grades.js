import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { scoreAll } from "../shared/grades.js";

const divisions = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "data", "school-divisions.json"), "utf8"),
);

const cache = new WeakMap();

const ABBR = [
  ["kentucky", "ky"],
  ["michigan", "mich"],
  ["illinois", "ill"],
  ["carolina", "caro"],
  ["florida", "fla"],
  ["tennessee", "tenn"],
  ["colorado", "colo"],
  ["mississippi", "miss"],
  ["georgia", "ga"],
  ["alabama", "ala"],
  ["louisiana", "la"],
  ["connecticut", "conn"],
  ["massachusetts", "mass"],
  ["pennsylvania", "pa"],
  ["saint", "st"],
  ["state", "st"],
  ["university", ""],
  ["college", ""],
];

function schoolKey(value) {
  return value
    .toLowerCase()
    .replace(/^previous school:\s*/i, "")
    .replace(/&/g, " and ")
    .replace(/\./g, " ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function lookupKeys(value) {
  const base = schoolKey(value);
  const keys = new Set([base]);
  let current = base;
  for (const [long, short] of ABBR) {
    current = current.replace(new RegExp(`\\b${long}\\b`, "g"), short).replace(/\s+/g, " ").trim();
    if (current) keys.add(current);
  }
  return [...keys];
}

function divisionOf(value) {
  const found = new Set(lookupKeys(value).map((key) => divisions[key]).filter(Boolean));
  return found.size === 1 ? [...found][0] : null;
}

export function previousDivision(schoolFrom) {
  if (!schoolFrom?.trim()) return null;
  const text = schoolFrom.trim();
  const parts = text.split(/\s*\/\s*|\s*;\s*/).map((part) => part.trim()).filter(Boolean);
  if (parts.length <= 1) return divisionOf(text);
  const found = parts.map((part) => divisionOf(part));
  if (found.some((division) => division == null)) return null;
  return found.every((division) => division === found[0]) ? found[0] : null;
}

function divisionRank(label) {
  if (label === "D1") return 3;
  if (label === "D2") return 2;
  if (label === "D3") return 1;
  return null;
}

function latest(stats, keys) {
  let best = null;
  for (const stat of stats) {
    if (stat.value_num == null || !keys.includes(stat.stat_key)) continue;
    if (!best || stat.season_sort > best.season_sort) best = stat;
    else if (stat.season_sort === best.season_sort && keys.indexOf(stat.stat_key) < keys.indexOf(best.stat_key)) {
      best = stat;
    }
  }
  return best?.value_num ?? null;
}

function sameSeason(stats, keyA, keyB) {
  const seasons = new Map();
  for (const stat of stats) {
    if (stat.value_num == null) continue;
    if (stat.stat_key !== keyA && stat.stat_key !== keyB) continue;
    const bucket = seasons.get(stat.season_sort) ?? {};
    bucket[stat.stat_key] = stat.value_num;
    seasons.set(stat.season_sort, bucket);
  }
  const ordered = [...seasons.entries()].sort((a, b) => b[0] - a[0]);
  for (const [, values] of ordered) {
    if (values[keyA] != null && values[keyB] != null) return values;
  }
  return null;
}

function metricsFor(player, stats) {
  const passing = sameSeason(stats, "pass_cmp", "pass_att");
  const attempts = sameSeason(stats, "pass_yds", "pass_att");
  const ratio = sameSeason(stats, "pass_td", "pass_int");
  const carry = sameSeason(stats, "rush_yds", "rush_att");
  const catchRate = sameSeason(stats, "rec_yds", "rec");
  const goals = sameSeason(stats, "fgm", "fga");
  let cmpPct = null;
  if (passing && passing.pass_att > 0) cmpPct = (100 * passing.pass_cmp) / passing.pass_att;
  else {
    const published = latest(stats, ["pass_cmp_pct"]);
    if (published != null) cmpPct = published <= 1 ? published * 100 : published;
  }
  let ypc = null;
  if (carry && carry.rush_att > 0) ypc = carry.rush_yds / carry.rush_att;
  else ypc = latest(stats, ["rush_ypc"]);
  return {
    cmp_pct: cmpPct,
    ypa: attempts && attempts.pass_att > 0 ? attempts.pass_yds / attempts.pass_att : null,
    td_int: ratio && ratio.pass_int > 0 ? ratio.pass_td / ratio.pass_int : null,
    qb_rush: latest(stats, ["rush_yds"]),
    ypc,
    rush_yds: latest(stats, ["rush_yds"]),
    rec_yds: latest(stats, ["rec_yds"]),
    rec: latest(stats, ["rec"]),
    ypr: catchRate && catchRate.rec > 0 ? catchRate.rec_yds / catchRate.rec : null,
    rec_td: latest(stats, ["rec_td"]),
    starts: latest(stats, ["starts"]),
    games: latest(stats, ["gp", "games"]),
    tackles: latest(stats, ["tackles_tot", "tackles"]),
    tfl: latest(stats, ["tfl"]),
    sacks: latest(stats, ["sacks"]),
    int: latest(stats, ["def_int", "int"]),
    pbu: latest(stats, ["pbu"]),
    fg_pct: goals && goals.fga > 0 ? (100 * goals.fgm) / goals.fga : null,
    punt_avg: latest(stats, ["punt_avg"]),
    returns: latest(stats, ["kr_yds", "pr_yds", "return_yds"]),
    height: player.height_inches,
    weight: player.weight_lbs,
    division: divisionRank(previousDivision(player.school_from)),
  };
}

function load(db) {
  const players = db
    .prepare("SELECT id, position_group, height_inches, weight_lbs, school_from FROM players")
    .all();
  const stats = db
    .prepare("SELECT player_id, season_sort, stat_key, value_num FROM player_stats")
    .all();
  const byPlayer = new Map();
  for (const stat of stats) {
    if (!byPlayer.has(stat.player_id)) byPlayer.set(stat.player_id, []);
    byPlayer.get(stat.player_id).push(stat);
  }
  const records = players.map((player) => ({
    id: player.id,
    group: player.position_group,
    metrics: metricsFor(player, byPlayer.get(player.id) ?? []),
  }));
  const grades = scoreAll(records);
  return new Map(records.map((record, index) => [record.id, grades[index]]));
}

export function gradeFor(db, id) {
  let grades = cache.get(db);
  if (!grades) {
    grades = load(db);
    cache.set(db, grades);
  }
  return grades.get(id) ?? null;
}

export function gradeSummary(db) {
  let grades = cache.get(db);
  if (!grades) {
    grades = load(db);
    cache.set(db, grades);
  }
  const counts = { complete: 0, incomplete: 0, none: 0 };
  for (const grade of grades.values()) counts[grade.status] += 1;
  return counts;
}
