export const POSITION_GROUPS = [
  { id: "QB", label: "Quarterback", color: "#c4552a" },
  { id: "RB", label: "Running back", color: "#1f6b45" },
  { id: "WR", label: "Wide receiver", color: "#2b6e8f" },
  { id: "TE", label: "Tight end", color: "#6d4c9a" },
  { id: "OL", label: "Offensive line", color: "#8d5a2b" },
  { id: "DL", label: "Defensive line", color: "#9c2f3b" },
  { id: "LB", label: "Linebacker", color: "#a07a12" },
  { id: "DB", label: "Defensive back", color: "#234e8a" },
  { id: "K", label: "Kicker", color: "#3e7c6f" },
  { id: "P", label: "Punter", color: "#7a4e2d" },
  { id: "LS", label: "Long snapper", color: "#555e68" },
  { id: "ATH", label: "Athlete", color: "#3f5c49" },
];

export function groupMeta(id) {
  return POSITION_GROUPS.find((group) => group.id === id) ?? { id, label: id, color: "#5c564c" };
}
