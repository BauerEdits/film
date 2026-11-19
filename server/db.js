import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseHeight } from "../shared/format.js";
import { players } from "./data/index.js";
import { sources } from "./data/sources.js";
import { assertSeed } from "./validate.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationPath = join(root, "db", "migrations", "001_init.sql");
const defaultPath = join(root, "data", "portal.sqlite");

export const SEED_VERSION = "2026.11.19.2";

const SEASON_SORT = {
  2025: 20250,
  2024: 20240,
  2023: 20230,
  "2023-24": 20220,
  "2023-25": 20215,
  Career: 100,
};

function seasonSortOf(stat) {
  if (stat.seasonSort != null) return stat.seasonSort;
  return SEASON_SORT[stat.season] ?? 150;
}

function readVersion(db) {
  const table = db
    .prepare("SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = 'app_meta'")
    .get();
  if (!table) return null;
  return db.prepare("SELECT value FROM app_meta WHERE key = 'seed_version'").get()?.value ?? null;
}

function seed(db) {
  const list = assertSeed(players);
  const insertSource = db.prepare(`
    INSERT INTO sources (slug, publisher, title, url, published_on, accessed_on, stats_scope, coverage_note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const sourceIds = new Map();
  for (const source of sources) {
    const result = insertSource.run(
      source.slug,
      source.publisher,
      source.title,
      source.url,
      source.publishedOn,
      source.accessedOn,
      source.statsScope,
      source.coverageNote,
    );
    sourceIds.set(source.slug, Number(result.lastInsertRowid));
  }

  const insertPlayer = db.prepare(`
    INSERT INTO players (
      person_key, full_name, position_raw, position_group, height_inches, weight_lbs, portal_year,
      portal_entry_date, signed_on, school_from, school_to, eligibility_raw, hometown,
      prep_listed, data_note, context_note, roster_url, source_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertStat = db.prepare(`
    INSERT INTO player_stats (
      player_id, season_label, season_sort, stat_key, label, value_num, value_text, unit, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertVariant = db.prepare(`
    INSERT INTO player_name_variants (player_id, variant, note) VALUES (?, ?, ?)
  `);

  db.exec("BEGIN");
  try {
    for (const player of list) {
      const sourceId = sourceIds.get(player.source);
      if (!sourceId) throw new Error(`Unknown source ${player.source} for ${player.name}`);
      const height = player.height ? parseHeight(player.height) : null;
      const inserted = insertPlayer.run(
        player.personKey,
        player.name,
        player.pos,
        player.group,
        height,
        player.weight,
        player.year,
        player.signed,
        player.from,
        player.to,
        player.eligibility,
        player.hometown,
        player.prep,
        player.dataNote,
        player.contextNote,
        player.rosterUrl ?? null,
        sourceId,
      );
      const playerId = Number(inserted.lastInsertRowid);
      player.stats.forEach((stat, index) => {
        insertStat.run(
          playerId,
          stat.season,
          seasonSortOf(stat),
          stat.key,
          stat.label,
          stat.value ?? null,
          stat.valueText ?? null,
          stat.unit ?? null,
          index,
        );
      });
      for (const variant of player.variants) {
        insertVariant.run(playerId, variant.name, variant.note);
      }
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function openDatabase(dbPath = defaultPath) {
  mkdirSync(dirname(dbPath), { recursive: true });
  let db = new DatabaseSync(dbPath);
  db.exec("PRAGMA foreign_keys = ON");
  if (readVersion(db) === SEED_VERSION) return db;

  db.close();
  rmSync(dbPath, { force: true });
  db = new DatabaseSync(dbPath);
  db.exec("PRAGMA foreign_keys = ON");
  try {
    db.exec(readFileSync(migrationPath, "utf8"));
    db.prepare("INSERT INTO schema_migrations (version) VALUES (?)").run("001_init");
    seed(db);
    db.prepare("INSERT INTO app_meta (key, value) VALUES (?, ?)").run("seed_version", SEED_VERSION);
  } catch (error) {
    db.close();
    rmSync(dbPath, { force: true });
    throw error;
  }
  return db;
}
