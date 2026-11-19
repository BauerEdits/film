import { parseHeight } from "../shared/format.js";
import { players } from "./data/index.js";

const GROUPS = new Set(["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "K", "P", "LS", "ATH"]);
const ROSTER = "ncaa-rosters-2025";

export const EXPECTED_COUNTS = {
  auburn: 36,
  illinois: 14,
  kennesaw: 16,
  wisconsin: 22,
  [ROSTER]: 1665,
};

export function assertSeed(list = players) {
  const seen = new Set();
  const counts = {};
  for (const player of list) {
    const where = player.name ?? "(unnamed)";
    if (!player.name?.trim()) throw new Error("Player is missing a name");
    if (!player.personKey?.trim()) throw new Error(`${where} is missing a person key`);
    if (player.group != null && !GROUPS.has(player.group)) {
      throw new Error(`${where} has position group ${player.group}`);
    }
    if (!player.from?.trim()) throw new Error(`${where} is missing school from`);
    if (!player.to?.trim()) throw new Error(`${where} is missing school to`);
    if (!player.source?.trim()) throw new Error(`${where} is missing a source`);
    if (!Number.isInteger(player.year) || player.year < 1990 || player.year > 2100) {
      throw new Error(`${where} has a bad portal year`);
    }
    if (player.source !== ROSTER) {
      if (!player.pos?.trim()) throw new Error(`${where} is missing a position`);
      if (!GROUPS.has(player.group)) throw new Error(`${where} has position group ${player.group}`);
      if (!player.eligibility?.trim()) throw new Error(`${where} is missing class`);
      if (!player.hometown?.trim()) throw new Error(`${where} is missing hometown`);
      if (!Number.isInteger(player.weight) || player.weight < 140 || player.weight > 450) {
        throw new Error(`${where} has a bad weight`);
      }
      parseHeight(player.height);
    } else {
      if (player.weight != null && (!Number.isInteger(player.weight) || player.weight < 85 || player.weight > 450)) {
        throw new Error(`${where} has a bad weight`);
      }
      if (player.height) parseHeight(player.height);
    }
    if (player.signed != null && !/^\d{4}-\d{2}-\d{2}$/.test(player.signed)) {
      throw new Error(`${where} has a bad signed date`);
    }
    if (player.source === "auburn" && !player.signed) throw new Error(`${where} is missing a signed date`);
    if (player.source !== "auburn" && player.signed) throw new Error(`${where} should not have a signed date`);
    if (seen.has(player.personKey)) throw new Error(`Duplicate player ${player.personKey}`);
    seen.add(player.personKey);
    counts[player.source] = (counts[player.source] ?? 0) + 1;
    const statKeys = new Set();
    for (const stat of player.stats) {
      if (!stat.season || !stat.key || !stat.label) throw new Error(`${where} has a broken stat`);
      if (stat.value == null && !stat.valueText) throw new Error(`${where} stat ${stat.key} has no value`);
      if (stat.value != null && !Number.isFinite(stat.value)) throw new Error(`${where} stat ${stat.key} is not a number`);
      const statKey = `${stat.season}|${stat.key}`;
      if (statKeys.has(statKey)) throw new Error(`${where} repeats ${statKey}`);
      statKeys.add(statKey);
    }
  }
  for (const [source, expected] of Object.entries(EXPECTED_COUNTS)) {
    if (counts[source] !== expected) {
      throw new Error(`${source} has ${counts[source] ?? 0} players; expected ${expected}`);
    }
  }
  return list;
}
