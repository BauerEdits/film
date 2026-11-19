/** Screen-space neighbors, nearest first. Includes the origin when it is in the list. */
export function neighborsWithin(points, origin, radiusPx) {
  const r2 = radiusPx * radiusPx;
  return points
    .map((point) => {
      const dx = point.x - origin.x;
      const dy = point.y - origin.y;
      return { point, d2: dx * dx + dy * dy };
    })
    .filter((item) => item.d2 <= r2)
    .sort((a, b) => a.d2 - b.d2)
    .map((item) => item.point);
}
