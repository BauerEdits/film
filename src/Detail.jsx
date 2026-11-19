import { formatDate, formatHeight, formatStatValue } from "../shared/format.js";
import { groupMeta } from "./positions.js";

function Field({ label, value, field }) {
  const missing = value == null || value === "";
  return (
    <div className="fact">
      <dt>{label}</dt>
      <dd data-field={field} className={missing ? "missing" : undefined}>
        {missing ? "Not published" : value}
      </dd>
    </div>
  );
}

function groupStats(stats) {
  const groups = [];
  for (const stat of stats) {
    const last = groups.at(-1);
    if (!last || last.season !== stat.seasonLabel) {
      groups.push({ season: stat.seasonLabel, rows: [stat] });
    } else {
      last.rows.push(stat);
    }
  }
  return groups;
}

function formatGrade(value) {
  return value == null ? null : value.toFixed(1);
}

function gradeStatus(status) {
  if (status === "complete") return "Complete";
  if (status === "incomplete") return "Incomplete";
  return null;
}

function emptyStats(source) {
  if (source?.statsScope === "table") {
    return "The cited roster table does not publish counting stats.";
  }
  if (source?.statsScope === "roster") {
    return "No non-zero counting stat from the 2025 roster line is stored for this player.";
  }
  return "No counting stat from the cited bio is stored for this player.";
}

export function Detail({
  selectedId,
  summary,
  detail,
  loading,
  error,
  hidden,
  neighbors,
  onSelectNeighbor,
}) {
  const player = detail ?? summary;
  const group = player ? groupMeta(player.positionGroup) : null;

  return (
    <section id="player-detail" className="detail card" aria-live="polite">
      {!selectedId && (
        <>
          <h2>Player</h2>
          <p className="empty">Select a point on the chart, or choose a name from the list.</p>
        </>
      )}
      {selectedId && !player && loading && <p className="empty">Loading player…</p>}
      {selectedId && error && <p className="error">{error}</p>}
      {player && (
        <>
          <p className="eyebrow">
            <span className="swatch" style={{ background: group.color }} />
            {player.positionRaw}
            {player.eligibilityRaw ? ` · ${player.eligibilityRaw}` : ""}
          </p>
          <h2>{player.fullName}</h2>
          {hidden && <p className="note filter-hidden">This player is hidden by the current filters.</p>}
          {!detail && loading && <p className="empty">Loading player…</p>}
          {detail && neighbors.length > 1 && (
            <div className="nearby">
              <p>Same spot</p>
              <div>
                {neighbors.map((neighbor) => (
                  <button
                    key={neighbor.id}
                    type="button"
                    aria-pressed={neighbor.id === player.id}
                    onClick={() => onSelectNeighbor(neighbor.id)}
                  >
                    {neighbor.fullName}
                  </button>
                ))}
              </div>
            </div>
          )}
          {detail && (
          <dl className="facts">
            <Field label="Position" value={player.positionRaw} field="position" />
            <Field label="Class" value={player.eligibilityRaw} field="class" />
            <Field label="Height" value={formatHeight(player.heightInches)} field="height" />
            <Field label="Weight" value={player.weightLbs != null ? `${player.weightLbs} lb` : null} field="weight" />
            <Field label="Portal class" value={player.portalYear ? String(player.portalYear) : null} field="portal-year" />
            <Field label="Entered portal" value={formatDate(player.portalEntryDate)} field="portal-entry" />
            <Field label="Signed with new school" value={formatDate(player.signedOn)} field="signed" />
            <Field label="School from" value={player.schoolFrom} field="school-from" />
            <Field label="School to" value={player.schoolTo} field="school-to" />
            <Field label="Hometown" value={player.hometown} field="hometown" />
            <Field label="Prep listed" value={player.prepListed} field="prep" />
          </dl>
          )}
          {detail?.variants?.map((variant) => (
            <p className="note" key={variant.name}>
              {variant.note}
            </p>
          ))}
          {detail?.dataNote && <p className="note">{detail.dataNote}</p>}
          {detail?.contextNote && <p className="note">{detail.contextNote}</p>}
          <h3>Evaluation</h3>
          {loading && !detail && <p className="empty">Loading evaluation…</p>}
          {detail?.grade && (
            <>
              <dl className="facts">
                <Field label="Overall" value={formatGrade(detail.grade.overall)} field="grade-overall" />
                <Field label="Grade status" value={gradeStatus(detail.grade.status)} field="grade-status" />
                <Field label="Projected impact" value={detail.grade.impact} field="grade-impact" />
                <Field label="Production" value={formatGrade(detail.grade.production)} field="grade-production" />
                <Field label="Athletic profile" value={formatGrade(detail.grade.athletic)} field="grade-athletic" />
                <Field label="Experience" value={formatGrade(detail.grade.experience)} field="grade-experience" />
                <Field label="Competition level" value={formatGrade(detail.grade.competition)} field="grade-competition" />
              </dl>
              <ul className="grade-inputs">
                {detail.grade.inputs.map((input) => (
                  <li key={input.id} data-grade-input={input.id}>
                    {input.label}: {input.score == null ? "Not published" : input.score.toFixed(1)}
                  </li>
                ))}
              </ul>
              <p className="group-note">
                Each number is a percentile against other loaded players at this position who have that input.
                Overall weights the published pieces: production 45, athletic profile 25, experience 15, competition
                15. Projected impact is High at 67 or above, Medium from 34 through 66.9, and Low below 34. Yards per
                route, pressures, and return yards are not stored, so those inputs stay blank. Offensive-line position
                is the printed position and is not scored.
              </p>
            </>
          )}
          <h3>Stats</h3>
          {loading && !detail && <p className="empty">Loading stats…</p>}
          {detail && detail.stats.length === 0 && <p className="empty">{emptyStats(detail.source)}</p>}
          {detail && detail.stats.length > 0 && (
            <div className="stat-groups">
              {groupStats(detail.stats).map((group) => (
                <table className="stats" key={group.season}>
                  <caption>{group.season}</caption>
                  <tbody>
                    {group.rows.map((stat) => (
                      <tr key={`${group.season}-${stat.key}`}>
                        <th scope="row">{stat.label}</th>
                        <td>{formatStatValue(stat)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ))}
            </div>
          )}
          {detail?.source && (
            <p className="source-line">
              Source:{" "}
              <a href={detail.source.url} rel="noreferrer">
                {detail.source.publisher} — {detail.source.title}
              </a>
            </p>
          )}
          {detail?.rosterUrl && (
            <p className="source-line">
              School roster page:{" "}
              <a href={detail.rosterUrl} rel="noreferrer">
                Open the page this row was read from
              </a>
            </p>
          )}
        </>
      )}
    </section>
  );
}
