export function parseHeight(raw) {
  const match = /^(\d+)-(\d{1,2})$/.exec(raw ?? "");
  if (!match) {
    throw new Error(`Unrecognized height "${raw}"`);
  }
  const feet = Number(match[1]);
  const inches = Number(match[2]);
  if (inches > 11) {
    throw new Error(`Unrecognized height "${raw}"`);
  }
  return feet * 12 + inches;
}

export function formatHeight(inches) {
  if (inches == null || Number.isNaN(inches)) return null;
  const feet = Math.floor(inches / 12);
  const rest = inches % 12;
  return `${feet}'${rest}"`;
}

export function formatDate(iso) {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatStatValue(stat) {
  if (stat.valueText) return stat.valueText;
  if (stat.valueNum == null) return null;
  const text = Number.isInteger(stat.valueNum)
    ? stat.valueNum.toLocaleString("en-US")
    : stat.valueNum.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return stat.unit ? `${text}${stat.unit}` : text;
}
