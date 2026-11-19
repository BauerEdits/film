import rosterPlayers from "./roster2025.json" with { type: "json" };
import { auburnPlayers } from "./auburn.js";
import { illinoisPlayers } from "./illinois.js";
import { kennesawPlayers } from "./kennesaw.js";
import { wisconsinPlayers } from "./wisconsin.js";

function tag(list, source, school) {
  return list.map((player) => {
    const year = player.year ?? 2026;
    return {
      stats: [],
      variants: [],
      prep: null,
      signed: null,
      dataNote: null,
      contextNote: null,
      rosterUrl: null,
      ...player,
      source,
      to: school,
      year,
      personKey: `${player.name}|${school}|${year}`,
    };
  });
}

function fromRoster(list) {
  return list.map((player) => ({
    stats: player.stats ?? [],
    variants: [],
    prep: null,
    signed: null,
    dataNote: player.dataNote ?? null,
    contextNote: player.contextNote ?? null,
    rosterUrl: player.rosterUrl ?? null,
    personKey: player.personKey,
    name: player.name,
    pos: player.pos,
    group: player.group,
    height: player.height,
    weight: player.weight,
    from: player.from,
    to: player.to,
    eligibility: player.eligibility,
    hometown: player.hometown,
    source: "ncaa-rosters-2025",
    year: 2025,
  }));
}

export const players = [
  ...fromRoster(rosterPlayers),
  ...tag(auburnPlayers, "auburn", "Auburn"),
  ...tag(illinoisPlayers, "illinois", "Illinois"),
  ...tag(kennesawPlayers, "kennesaw", "Kennesaw State"),
  ...tag(wisconsinPlayers, "wisconsin", "Wisconsin"),
];
