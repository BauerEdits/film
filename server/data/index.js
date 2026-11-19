import { auburnPlayers } from "./auburn.js";
import { illinoisPlayers } from "./illinois.js";
import { kennesawPlayers } from "./kennesaw.js";
import { wisconsinPlayers } from "./wisconsin.js";

function tag(list, source, school) {
  return list.map((player) => ({
    stats: [],
    variants: [],
    prep: null,
    signed: null,
    dataNote: null,
    contextNote: null,
    ...player,
    source,
    to: school,
    year: player.year ?? 2026,
  }));
}

export const players = [
  ...tag(auburnPlayers, "auburn", "Auburn"),
  ...tag(illinoisPlayers, "illinois", "Illinois"),
  ...tag(kennesawPlayers, "kennesaw", "Kennesaw State"),
  ...tag(wisconsinPlayers, "wisconsin", "Wisconsin"),
];
