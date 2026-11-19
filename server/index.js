import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";
import { openDatabase, SEED_VERSION } from "./db.js";
import { COVERAGE_SUMMARY } from "./data/sources.js";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const distRoot = resolve(root, "dist");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

function sendJson(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(body));
}

function mapList(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    positionRaw: row.position_raw,
    positionGroup: row.position_group,
    heightInches: row.height_inches,
    weightLbs: row.weight_lbs,
    portalYear: row.portal_year,
    schoolFrom: row.school_from,
    schoolTo: row.school_to,
    eligibilityRaw: row.eligibility_raw,
  };
}

function listPlayers(db, url) {
  const position = url.searchParams.get("position")?.trim() ?? "";
  const season = url.searchParams.get("season")?.trim() ?? "";
  const q = url.searchParams.get("q")?.trim() ?? "";
  const commitment = url.searchParams.get("commitment")?.trim() ?? "";
  const where = [];
  const params = [];
  if (commitment === "uncommitted") where.push("school_to IS NULL");
  else if (commitment === "committed") where.push("school_to IS NOT NULL");
  else if (commitment && commitment !== "all") {
    return { status: 400, body: { error: "commitment must be uncommitted, committed, or all" } };
  }
  if (position) {
    where.push("position_group = ?");
    params.push(position);
  }
  if (season) {
    if (!/^\d{4}$/.test(season)) return { status: 400, body: { error: "season must be a four-digit year" } };
    where.push("portal_year = ?");
    params.push(Number(season));
  }
  if (q) {
    where.push("full_name LIKE ? ESCAPE '\\'");
    params.push(`%${q.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`);
  }
  const sql = `
    SELECT id, full_name, position_raw, position_group, height_inches, weight_lbs,
           portal_year, school_from, school_to, eligibility_raw
    FROM players
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY full_name COLLATE NOCASE, school_to
  `;
  const players = db.prepare(sql).all(...params).map(mapList);
  return { status: 200, body: { players } };
}

function getPlayer(db, id) {
  const row = db
    .prepare(
      `SELECT p.*, s.slug AS source_slug, s.publisher, s.title AS source_title, s.url AS source_url,
              s.published_on, s.accessed_on, s.stats_scope, s.coverage_note
       FROM players p
       JOIN sources s ON s.id = p.source_id
       WHERE p.id = ?`,
    )
    .get(id);
  if (!row) return null;
  const stats = db
    .prepare(
      `SELECT season_label, season_sort, stat_key, label, value_num, value_text, unit, sort_order
       FROM player_stats WHERE player_id = ? ORDER BY season_sort DESC, sort_order ASC`,
    )
    .all(id);
  const variants = db
    .prepare("SELECT variant, note FROM player_name_variants WHERE player_id = ? ORDER BY id")
    .all(id);
  return {
    id: row.id,
    fullName: row.full_name,
    positionRaw: row.position_raw,
    positionGroup: row.position_group,
    heightInches: row.height_inches,
    weightLbs: row.weight_lbs,
    portalYear: row.portal_year,
    portalEntryDate: row.portal_entry_date,
    signedOn: row.signed_on,
    schoolFrom: row.school_from,
    schoolTo: row.school_to,
    eligibilityRaw: row.eligibility_raw,
    hometown: row.hometown,
    prepListed: row.prep_listed,
    dataNote: row.data_note,
    contextNote: row.context_note,
    rosterUrl: row.roster_url,
    variants: variants.map((variant) => ({ name: variant.variant, note: variant.note })),
    stats: stats.map((stat) => ({
      seasonLabel: stat.season_label,
      seasonSort: stat.season_sort,
      key: stat.stat_key,
      label: stat.label,
      valueNum: stat.value_num,
      valueText: stat.value_text,
      unit: stat.unit,
    })),
    source: {
      slug: row.source_slug,
      publisher: row.publisher,
      title: row.source_title,
      url: row.source_url,
      publishedOn: row.published_on,
      accessedOn: row.accessed_on,
      statsScope: row.stats_scope,
      coverageNote: row.coverage_note,
    },
  };
}

function meta(db) {
  const sources = db
    .prepare(
      `SELECT src.slug, src.publisher, src.title, src.url, src.published_on, src.accessed_on,
              src.stats_scope, src.coverage_note, COUNT(p.id) AS player_count
       FROM sources src
       LEFT JOIN players p ON p.source_id = src.id
       GROUP BY src.id
       ORDER BY src.id`,
    )
    .all();
  const seasons = db
    .prepare("SELECT DISTINCT portal_year FROM players ORDER BY portal_year")
    .all()
    .map((row) => row.portal_year);
  const groups = db
    .prepare("SELECT DISTINCT position_group FROM players ORDER BY position_group")
    .all()
    .map((row) => row.position_group);
  const schoolsTo = db
    .prepare("SELECT DISTINCT school_to FROM players WHERE school_to IS NOT NULL ORDER BY school_to")
    .all()
    .map((row) => row.school_to);
  const playerCount = db.prepare("SELECT COUNT(*) AS n FROM players").get().n;
  const plottedCount = db
    .prepare("SELECT COUNT(*) AS n FROM players WHERE height_inches IS NOT NULL AND weight_lbs IS NOT NULL")
    .get().n;
  const knownUncommitted = db.prepare("SELECT COUNT(*) AS n FROM players WHERE school_to IS NULL").get().n;
  const knownCommitted = db.prepare("SELECT COUNT(*) AS n FROM players WHERE school_to IS NOT NULL").get().n;
  return {
    seedVersion: SEED_VERSION,
    playerCount,
    plottedCount,
    knownUncommitted,
    knownCommitted,
    seasons,
    groups,
    schoolsTo,
    coverage: COVERAGE_SUMMARY,
    sources: sources.map((source) => ({
      slug: source.slug,
      publisher: source.publisher,
      title: source.title,
      url: source.url,
      publishedOn: source.published_on,
      accessedOn: source.accessed_on,
      statsScope: source.stats_scope,
      coverageNote: source.coverage_note,
      playerCount: source.player_count,
    })),
  };
}

function serveStatic(res, pathname) {
  if (!existsSync(join(distRoot, "index.html"))) {
    sendJson(res, 404, { error: "Not found" });
    return;
  }
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  if (relative.includes("\0")) {
    sendJson(res, 400, { error: "Bad path" });
    return;
  }
  const file = normalize(resolve(distRoot, relative));
  if (file !== distRoot && !file.startsWith(distRoot + sep)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }
  const target = existsSync(file) && !file.endsWith(sep) ? file : extname(relative) ? "" : join(distRoot, "index.html");
  if (!target || !existsSync(target)) {
    sendJson(res, 404, { error: "Not found" });
    return;
  }
  const type = TYPES[extname(target)] ?? "application/octet-stream";
  res.writeHead(200, { "content-type": type });
  res.end(readFileSync(target));
}

function handle(req, res, db) {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }
  if (url.pathname === "/api/health") {
    sendJson(res, 200, { ok: true });
    return;
  }
  if (url.pathname === "/api/meta") {
    sendJson(res, 200, meta(db));
    return;
  }
  if (url.pathname === "/api/players") {
    const result = listPlayers(db, url);
    sendJson(res, result.status, result.body);
    return;
  }
  const match = /^\/api\/players\/(\d+)$/.exec(url.pathname);
  if (match) {
    const player = getPlayer(db, Number(match[1]));
    if (!player) {
      sendJson(res, 404, { error: "Player not found" });
      return;
    }
    sendJson(res, 200, { player });
    return;
  }
  if (url.pathname.startsWith("/api/")) {
    sendJson(res, 404, { error: "Not found" });
    return;
  }
  if (process.env.SERVE_STATIC === "0") {
    sendJson(res, 404, { error: "Not found" });
    return;
  }
  serveStatic(res, url.pathname);
}

export function startServer({ port = 0, host = "127.0.0.1", dbPath, log = false } = {}) {
  const db = openDatabase(dbPath);
  const server = createServer((req, res) => {
    try {
      handle(req, res, db);
    } catch (error) {
      console.error(error);
      if (!res.headersSent) sendJson(res, 500, { error: "Server error" });
    }
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      const address = server.address();
      const actual = typeof address === "object" && address ? address.port : port;
      if (log) console.log(`Transfer Portal API listening on http://${host}:${actual}`);
      resolve({ server, db, port: actual, url: `http://${host}:${actual}` });
    });
  });
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const port = Number(process.env.PORT || 8787);
  startServer({ port, log: true }).catch((error) => {
    if (error?.code === "EADDRINUSE") {
      console.error(`Port ${port} is already in use.`);
    } else {
      console.error(error);
    }
    process.exit(1);
  });
}
