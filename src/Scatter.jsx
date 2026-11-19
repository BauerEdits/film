import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { neighborsWithin } from "../shared/hit.js";
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
    const root = chartRef.current;
    if (!root) {
      onSelect(player.id, [player.id]);
      return;
    }
    const spots = [...root.querySelectorAll(".point")].map((button) => {
      const rect = button.getBoundingClientRect();
      return {
        id: Number(button.dataset.playerId),
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    });
    const origin = spots.find((spot) => spot.id === player.id);
    const near = origin ? neighborsWithin(spots, origin, 16) : [{ id: player.id }];
    onSelect(
      player.id,
      near.map((spot) => spot.id),
    );
  }

  function moveFocus(delta) {
    const index = placed.findIndex((player) => player.id === focusId);
    const next = placed[(index + delta + placed.length) % placed.length];
    setFocusId(next.id);
    requestAnimationFrame(() => {
      chartRef.current?.querySelector(`[data-player-id="${next.id}"]`)?.focus();
    });
  }

  const tipStyle = hover
    ? { left: Math.min(window.innerWidth - 16, Math.max(16, hover.x)), top: hover.y }
    : null;

  return (
    <div className="chart-wrap" ref={chartRef}>
      <p className="axis-note">Vertical axis is weight in pounds. Horizontal axis is height.</p>
      <svg ref={svgRef} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} aria-hidden="true">
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
      </svg>
      <div className="points" role="group" aria-label="Height and weight. Tab to a point and press Enter to open that player.">
        {placed.map((player) => {
          const color = groupMeta(player.positionGroup).color;
          const selected = player.id === selectedId;
          return (
            <button
              key={player.id}
              type="button"
              className={selected ? "point selected" : "point"}
              data-player-id={player.id}
              style={{ left: `${(player.cx / VIEW_W) * 100}%`, top: `${(player.cy / VIEW_H) * 100}%` }}
              tabIndex={player.id === focusId ? 0 : -1}
              aria-pressed={selected}
              aria-label={`${player.fullName}, ${player.positionRaw}, ${formatHeight(player.heightInches)}, ${player.weightLbs} pounds`}
              onMouseEnter={(event) => setHover({ id: player.id, x: event.clientX, y: event.clientY })}
              onMouseMove={(event) => setHover({ id: player.id, x: event.clientX, y: event.clientY })}
              onMouseLeave={() => setHover((current) => (current?.id === player.id ? null : current))}
              onFocus={() => setFocusId(player.id)}
              onClick={(event) => choose(player, event)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") choose(player, event);
                if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                  event.preventDefault();
                  moveFocus(1);
                }
                if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                  event.preventDefault();
                  moveFocus(-1);
                }
              }}
            >
              <span className="core" style={{ background: color }} />
            </button>
          );
        })}
      </div>
      {hover && tipStyle && (
        <div className="tip" role="tooltip" style={tipStyle}>
          {placed.find((player) => player.id === hover.id)?.fullName}
        </div>
      )}
    </div>
  );
}
