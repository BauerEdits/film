import { useEffect, useMemo, useState } from "react";
import { Detail } from "./Detail.jsx";
import { Scatter } from "./Scatter.jsx";
import { POSITION_GROUPS } from "./positions.js";

function readHash() {
  const match = /^#p=(\d+)$/.exec(window.location.hash);
  return match ? Number(match[1]) : null;
}

export function App() {
  const [meta, setMeta] = useState(null);
  const [players, setPlayers] = useState([]);
  const [position, setPosition] = useState("");
  const [season, setSeason] = useState("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(readHash);
  const [neighborIds, setNeighborIds] = useState([]);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [loadKey, setLoadKey] = useState(0);

  useEffect(() => {
    const onHash = () => {
      setSelectedId(readHash());
      setNeighborIds([]);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const next = selectedId ? `#p=${selectedId}` : "";
    if (window.location.hash !== next) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${next}`);
    }
  }, [selectedId]);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/meta", { signal: ctrl.signal, cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`Could not load coverage (${res.status})`);
        return res.json();
      })
      .then(setMeta)
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      });
    return () => ctrl.abort();
  }, [loadKey]);

  useEffect(() => {
    const ctrl = new AbortController();
    const params = new URLSearchParams();
    if (position) params.set("position", position);
    if (season) params.set("season", season);
    if (query.trim()) params.set("q", query.trim());
    const qs = params.toString();
    setLoading(true);
    fetch(`/api/players${qs ? `?${qs}` : ""}`, { signal: ctrl.signal, cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`Could not load players (${res.status})`);
        return res.json();
      })
      .then((body) => {
        setPlayers(body.players);
        setError("");
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setError(err.message);
        setLoading(false);
      });
    return () => ctrl.abort();
  }, [position, season, query, loadKey]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setDetailLoading(false);
      setDetailError("");
      return undefined;
    }
    const ctrl = new AbortController();
    setDetailLoading(true);
    setDetailError("");
    fetch(`/api/players/${selectedId}`, { signal: ctrl.signal, cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "That player is not in the database." : `Could not load player (${res.status})`);
        return res.json();
      })
      .then((body) => {
        setDetail(body.player);
        setDetailLoading(false);
        document.title = `${body.player.fullName} · Transfer Portal`;
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setDetailError(err.message);
        setDetailLoading(false);
      });
    return () => ctrl.abort();
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) {
      document.title = "Transfer Portal · Renegade Raider";
      return;
    }
    if (window.innerWidth >= 980) {
      document.querySelector(`[data-list-id="${selectedId}"]`)?.scrollIntoView({ block: "nearest" });
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("player-detail")?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
  }, [selectedId, players]);

  const plotted = useMemo(
    () => players.filter((player) => player.heightInches != null && player.weightLbs != null),
    [players],
  );
  const summary = players.find((player) => player.id === selectedId) ?? null;
  const neighbors = neighborIds
    .map((id) => players.find((player) => player.id === id))
    .filter(Boolean);
  const filtered = meta && players.length !== meta.playerCount;
  const unplotted = players.length - plotted.length;

  function selectFromChart(id, ids) {
    setSelectedId(id);
    setNeighborIds(ids);
  }

  function selectFromList(id) {
    setSelectedId(id);
    setNeighborIds([]);
  }

  function resetFilters() {
    setPosition("");
    setSeason("");
    setQuery("");
  }

  return (
    <div className="page">
      <header className="masthead">
        <p className="who">Renegade Raider</p>
        <h1>Transfer Portal</h1>
        <p className="lede">
          Height against weight for college football players whose cited roster names a previous college, plus the
          2026 classes published by Auburn, Illinois, Kennesaw State, and Wisconsin. This is not every portal
          entrant. Blank fields were not in the cited source.
        </p>
      </header>

      <form className="filters" onSubmit={(event) => event.preventDefault()}>
        <label>
          <span>Position</span>
          <select id="position" value={position} onChange={(event) => setPosition(event.target.value)}>
            <option value="">All positions</option>
            {POSITION_GROUPS.map((group) => (
              <option key={group.id} value={group.id}>
                {group.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Season</span>
          <select id="season" value={season} onChange={(event) => setSeason(event.target.value)}>
            <option value="">All seasons</option>
            {(meta?.seasons ?? [2026]).map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
        <label className="search">
          <span>Name</span>
          <input
            id="name-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search names"
            autoComplete="off"
          />
        </label>
        <button type="button" className="reset" onClick={resetFilters} disabled={!position && !season && !query}>
          Reset
        </button>
      </form>
      <p className="group-note">
        Cornerbacks and safeties are grouped as DB. Outside linebackers are grouped as LB. The position on each card
        is the one the school printed.
      </p>

      {error && (
        <p className="error">
          {error}{" "}
          <button type="button" onClick={() => setLoadKey((key) => key + 1)}>
            Try again
          </button>
        </p>
      )}

      <div className="workspace">
        <section className="chart-card card" aria-busy={loading}>
          <div className="card-head">
            <h2>Size chart</h2>
            <p className="count">
              {loading && !players.length
                ? "Loading the roster…"
                : filtered
                  ? `${players.length} of ${meta?.playerCount ?? "…"} players`
                  : `${players.length} players`}
              {unplotted > 0 ? ` · ${unplotted} not plotted because size is unpublished` : ""}
            </p>
          </div>
          <Scatter
            players={plotted}
            selectedId={selectedId}
            onSelect={selectFromChart}
            emptyLabel={
              players.length === 0
                ? "No players match these filters."
                : "No players with a published height and weight match these filters."
            }
          />
          <div className="legend">
            {POSITION_GROUPS.map((group) => (
              <button
                key={group.id}
                type="button"
                aria-pressed={position === group.id}
                onClick={() => setPosition((current) => (current === group.id ? "" : group.id))}
              >
                <span className="swatch" style={{ background: group.color }} />
                {group.id}
              </button>
            ))}
          </div>
          <p className="hint">Hover a point for the name. Click it, or focus the chart and press Enter, to open the player.</p>
        </section>

        <Detail
          selectedId={selectedId}
          summary={summary}
          detail={detail?.id === selectedId ? detail : null}
          loading={detailLoading}
          error={detailError}
          hidden={Boolean(selectedId && !loading && !summary)}
          neighbors={neighbors}
          onSelectNeighbor={(id) => selectFromChart(id, neighborIds)}
        />

        <section className="roster card">
          <h2 className="roster-title">Roster</h2>
          {players.length === 0 && !loading ? (
            <p className="empty">No players match these filters.</p>
          ) : (
            <ul>
              {players.slice(0, 200).map((player) => {
                const height =
                  player.heightInches == null
                    ? "Height not published"
                    : `${Math.floor(player.heightInches / 12)}'${player.heightInches % 12}"`;
                const weight = player.weightLbs == null ? "Weight not published" : `${player.weightLbs} lb`;
                return (
                  <li key={player.id}>
                    <button
                      type="button"
                      className={player.id === selectedId ? "row selected" : "row"}
                      data-list-id={player.id}
                      aria-pressed={player.id === selectedId}
                      onClick={() => selectFromList(player.id)}
                    >
                      <span className="row-name">{player.fullName}</span>
                      <span className="row-meta">
                        {player.positionRaw ?? "Position not published"} · {height} · {weight}
                      </span>
                      <span className="row-schools">
                        {player.schoolFrom ?? "School from not published"} → {player.schoolTo ?? "School to not published"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {players.length > 200 && (
            <p className="empty">Showing the first 200 of {players.length}. Search a name to narrow the list.</p>
          )}
        </section>
      </div>

      <footer className="sources">
        <h2>Sources and coverage</h2>
        <p>{meta?.coverage ?? "Coverage loads with the roster."}</p>
        <ul>
          {(meta?.sources ?? []).map((source) => (
            <li key={source.slug}>
              <a href={source.url} rel="noreferrer">
                {source.publisher}: {source.title}
              </a>
              <span>
                {" "}
                · {source.playerCount} players · accessed {source.accessedOn}
              </span>
              <p>{source.coverageNote}</p>
            </li>
          ))}
        </ul>
      </footer>
    </div>
  );
}
