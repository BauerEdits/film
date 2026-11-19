import labels from "./school-fbs.json" with { type: "json" };

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

function labelOf(value) {
  const found = new Set(lookupKeys(value).map((key) => labels[key]).filter(Boolean));
  if (found.size !== 1) return "unknown";
  return [...found][0] === "FBS" ? "FBS" : "other";
}

export function schoolFbs(value) {
  if (!value?.trim()) return "unknown";
  const parts = value
    .trim()
    .split(/\s*\/\s*|\s*;\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  const found = parts.map(labelOf);
  if (found.every((label) => label === "FBS")) return "FBS";
  if (found.some((label) => label === "unknown")) return "unknown";
  return "other";
}

export function fbsBoard(list) {
  const counts = { kept: 0, removed: 0, unknown: 0, other: 0, both: 0 };
  const kept = [];
  for (const player of list) {
    const from = schoolFbs(player.from);
    const to = schoolFbs(player.to);
    if (from === "FBS" && to === "FBS") {
      counts.kept += 1;
      kept.push(player);
      continue;
    }
    counts.removed += 1;
    const unknown = from === "unknown" || to === "unknown";
    const other = from === "other" || to === "other";
    if (unknown && other) counts.both += 1;
    else if (unknown) counts.unknown += 1;
    else counts.other += 1;
  }
  return { players: kept, counts };
}
