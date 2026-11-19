import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { formatHeight } from "../shared/format.js";
import { groupMeta } from "./positions.js";

const VIEW_W = 720;
const VIEW_H = 460;

function ticks(min, max, step) {
  const out = [];
  const start = Math.ceil(min / step) * step;
  for (let value = start; value <= max + step * 0.001; value += step) {
    out.push(Math.round(value * 100) / 100);
  }
  return out;
}

function paddedDomain(values, pad) {
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) return [min - pad, max + pad];
  return [min - pad * 0.85, max + pad * 0.45];
}

export function Scatter({ players, selectedId, onSelect, emptyLabel }) {
  const svgRef = useRef(null);
  const chartRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [hover, setHover] = useState(null);
  const [focusId, setFocusId] = useState(null);

  const ordered = useMemo(
    () =>
      [...players].sort(
        (a, b) => a.heightInches - b.heightInches || a.weightLbs - b.weightLbs || a.fullName.localeCompare(b.fullName),
      ),
    [players],
  );

  useEffect(() => {
    if (!ordered.length) {
      setFocusId(null);
      return;
    }
    if (!ordered.some((player) => player.id === focusId)) setFocusId(ordered[0].id);
  }, [ordered, focusId]);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    const measure = () => {
      const width = svg.getBoundingClientRect().width;
      const next = width > 0 ? width / VIEW_W : 1;
      setScale((prev) => (Math.abs(prev - next) < 0.01 ? prev : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(svg);
    return () => observer.disconnect();
  }, [ordered.length]);

  useEffect(() => {
    const hide = () => setHover(null);
    window.addEventListener("scroll", hide, true);
    return () => window.removeEventListener("scroll", hide, true);
  }, []);

  if (!ordered.length) {
    return <p className="chart-empty">{emptyLabel}</p>;
  }

  const safeScale = scale > 0 ? scale : 1;
  const pad = { l: 54 / safeScale, r: 18 / safeScale, t: 32 / safeScale, b: 40 / safeScale };
  const plotW = VIEW_W - pad.l - pad.r;
  const plotH = VIEW_H - pad.t - pad.b;
  const [xMin, xMax] = paddedDomain(
    ordered.map((player) => player.heightInches),
    2,
  );
  const [yMin, yMax] = paddedDomain(
    ordered.map((player) => player.weightLbs),
    18,
  );
  const xOf = (inches) => pad.l + ((inches - xMin) / (xMax - xMin)) * plotW;
  const yOf = (lbs) => pad.t + ((yMax - lbs) / (yMax - yMin)) * plotH;
  const heightStep = safeScale < 0.7 ? 3 : 2;
  const weightStep = safeScale < 0.7 ? 40 : 20;
  const font = 12 / safeScale;
  const placed = ordered.map((player) => ({
    ...player,
    cx: xOf(player.heightInches),
    cy: yOf(player.weightLbs),
  }));
  function choose(player, event) {
    event?.preventDefault();
    setFocusId(player.id);
    const limit = 16 / safeScale;
    const near = placed.filter((other) => {
      const dx = other.cx - player.cx;
      const dy = other.cy - player.cy;
      return dx * dx + dy * dy <= limit * limit;
    });
    onSelect(
      player.id,
      (near.length ? near : [player]).map((spot) => spot.id),
    );
  }

  function moveFocus(delta) {
    const index = placed.findIndex((player) => player.id === focusId);
    const next = placed[(index + delta + placed.length) % placed.length];
    setFocusId(next.id);
  }

  function onChartKey(event) {
    if (event.key === "Enter" || event.key === " ") {
      const player = placed.find((item) => item.id === focusId);
      if (player) choose(player, event);
    }
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      moveFocus(1);
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      moveFocus(-1);
    }
  }

  const tipStyle = hover
    ? { left: Math.min(window.innerWidth - 16, Math.max(16, hover.x)), top: hover.y }
    : null;

  return (
    <div
      className="chart-wrap"
      ref={chartRef}
      tabIndex={0}
      role="application"
      aria-label="Height and weight chart. Arrow keys move the highlight. Enter opens that player."
      onKeyDown={onChartKey}
    >
      <p className="axis-note">Vertical axis is weight in pounds. Horizontal axis is height.</p>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="group"
        aria-label="Players by height and weight"
        onMouseOver={(event) => {
          const id = Number(event.target?.dataset?.playerId);
          if (!id) return;
          setHover({ id, x: event.clientX, y: event.clientY });
        }}
        onMouseLeave={() => setHover(null)}
        onClick={(event) => {
          const player = placed.find((item) => item.id === Number(event.target?.dataset?.playerId));
          if (player) choose(player, event);
        }}
      >
        {ticks(yMin, yMax, weightStep).map((tick) => (
          <g key={`y-${tick}`}>
            <line x1={pad.l} x2={VIEW_W - pad.r} y1={yOf(tick)} y2={yOf(tick)} className="grid" />
            <text x={pad.l - 8 / safeScale} y={yOf(tick)} className="tick" fontSize={font} textAnchor="end" dominantBaseline="middle">
              {tick}
            </text>
          </g>
        ))}
        {ticks(xMin, xMax, heightStep).map((tick) => (
          <g key={`x-${tick}`}>
            <line x1={xOf(tick)} x2={xOf(tick)} y1={pad.t} y2={VIEW_H - pad.b} className="grid" />
            <text x={xOf(tick)} y={VIEW_H - pad.b + 18 / safeScale} className="tick" fontSize={font} textAnchor="middle">
              {formatHeight(tick)}
            </text>
          </g>
        ))}
        <text x={pad.l} y={VIEW_H - 8 / safeScale} className="axis-title" fontSize={font}>
          Height
        </text>
        <text x={4 / safeScale} y={16 / safeScale} className="axis-title" fontSize={font}>
          Weight (lb)
        </text>
        {placed.map((player) => {
          const color = groupMeta(player.positionGroup).color;
          const selected = player.id === selectedId;
          const focused = player.id === focusId;
          return (
            <circle
              key={player.id}
              className={selected ? "point selected" : focused ? "point focused" : "point"}
              data-player-id={player.id}
              cx={player.cx}
              cy={player.cy}
              r={selected || focused ? 5.4 : 4.2}
              fill={color}
              aria-label={`${player.fullName}, ${player.positionRaw ?? "position not published"}, ${formatHeight(player.heightInches)}, ${player.weightLbs} pounds`}
            />
          );
        })}
      </svg>
      {hover && tipStyle && (
        <div className="tip" role="tooltip" style={tipStyle}>
          {placed.find((player) => player.id === hover.id)?.fullName}
        </div>
      )}
    </div>
  );
}
