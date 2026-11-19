// Grades are percentiles of numbers already stored. A missing input stays null.

export const WEIGHTS = {
  production: 0.45,
  athletic: 0.25,
  experience: 0.15,
  competition: 0.15,
};

export const IMPACT_HIGH = 67;
export const IMPACT_MEDIUM = 34;

export const INPUT_LABELS = {
  cmp_pct: "Completion percentage",
  ypa: "Yards per attempt",
  td_int: "TD/INT ratio",
  qb_rush: "Rushing yards",
  ypc: "Yards per carry",
  rush_yds: "Rushing yards",
  rec_yds: "Receiving yards",
  rec: "Receptions",
  ypr: "Yards per reception",
  rec_td: "Receiving touchdowns",
  starts: "Starts",
  games: "Games played",
  tackles: "Tackles",
  tfl: "Tackles for loss",
  sacks: "Sacks",
  int: "Interceptions",
  pbu: "Passes defended",
  fg_pct: "Field goal percentage",
  punt_avg: "Punting average",
  returns: "Return production",
  height: "Height",
  weight: "Weight",
  division: "Previous school division",
};

// Position is listed for offensive linemen and is not turned into a score.
export const PRODUCTION_INPUTS = {
  QB: ["cmp_pct", "ypa", "td_int", "qb_rush"],
  RB: ["ypc", "rush_yds", "rec_yds"],
  WR: ["rec", "ypr", "rec_td"],
  TE: ["rec", "ypr", "rec_td"],
  OL: ["starts", "games"],
  DL: ["tackles", "tfl", "sacks"],
  LB: ["tackles", "tfl", "sacks"],
  DB: ["int", "pbu", "tackles"],
  K: ["fg_pct", "punt_avg", "returns"],
  P: ["fg_pct", "punt_avg", "returns"],
  LS: ["fg_pct", "punt_avg", "returns"],
};

const ATHLETIC = ["height", "weight"];
const EXPERIENCE = ["games", "starts"];
const COMPETITION = ["division"];

export function round1(value) {
  return Math.round(value * 10) / 10;
}

export function percentile(value, values) {
  if (value == null || !Number.isFinite(value) || values.length < 2) return null;
  let below = 0;
  let equal = 0;
  for (const other of values) {
    if (other < value) below += 1;
    else if (other === value) equal += 1;
  }
  return round1((100 * (below + equal * 0.5)) / values.length);
}

export function impactLabel(overall) {
  if (overall == null) return null;
  if (overall >= IMPACT_HIGH) return "High";
  if (overall >= IMPACT_MEDIUM) return "Medium";
  return "Low";
}

function mean(values) {
  if (!values.length) return null;
  return round1(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function component(inputIds, raw, scores) {
  const inputs = [];
  const present = [];
  let incomplete = inputIds.length === 0;
  for (const id of inputIds) {
    const published = raw[id] != null;
    const score = published ? scores[id] ?? null : null;
    if (!published || score == null) incomplete = true;
    if (score != null) present.push(score);
    inputs.push({ id, label: INPUT_LABELS[id], score, published });
  }
  return { score: mean(present), incomplete, inputs };
}

export function scoreAll(players) {
  const pools = new Map();
  for (const player of players) {
    const group = player.group ?? "";
    if (!pools.has(group)) pools.set(group, new Map());
    const bucket = pools.get(group);
    for (const [id, value] of Object.entries(player.metrics)) {
      if (value == null || !Number.isFinite(value)) continue;
      if (!bucket.has(id)) bucket.set(id, []);
      bucket.get(id).push(value);
    }
  }

  return players.map((player) => {
    const group = player.group ?? "";
    const bucket = pools.get(group) ?? new Map();
    const scores = {};
    for (const [id, value] of Object.entries(player.metrics)) {
      scores[id] = percentile(value, bucket.get(id) ?? []);
    }
    const productionIds = PRODUCTION_INPUTS[group] ?? [];
    const production = component(productionIds, player.metrics, scores);
    const athletic = component(ATHLETIC, player.metrics, scores);
    const experience = component(EXPERIENCE, player.metrics, scores);
    const competition = component(COMPETITION, player.metrics, scores);
    const parts = { production, athletic, experience, competition };
    let weighted = 0;
    let weight = 0;
    let incomplete = false;
    for (const [name, part] of Object.entries(parts)) {
      if (part.incomplete || part.score == null) incomplete = true;
      if (part.score != null) {
        weighted += part.score * WEIGHTS[name];
        weight += WEIGHTS[name];
      }
    }
    const overall = weight ? round1(weighted / weight) : null;
    let status = "none";
    if (overall != null) status = incomplete ? "incomplete" : "complete";
    const inputs = [];
    const seen = new Set();
    for (const input of [
      ...production.inputs,
      ...athletic.inputs,
      ...experience.inputs,
      ...competition.inputs,
    ]) {
      if (seen.has(input.id)) continue;
      seen.add(input.id);
      inputs.push(input);
    }
    return {
      overall,
      status,
      impact: impactLabel(overall),
      production: production.score,
      athletic: athletic.score,
      experience: experience.score,
      competition: competition.score,
      inputs,
    };
  });
}
