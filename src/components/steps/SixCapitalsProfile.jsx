/**
 * Six Capitals profile — which capitals this business mainly builds or draws
 * down (Shiva's MS proposal, requirement 9). Tiles are grouped and coloured by
 * the sustainability sphere each capital belongs to (proposal Fig. 2), with the
 * viable / equitable / bearable overlaps underneath.
 */

export const SPHERE_LABELS = {
  social: "Social",
  environmental: "Environmental",
  economic: "Economic",
};

const EMPHASIS_LABELS = {
  primary: "Primary",
  supporting: "Supporting",
  limited: "Limited",
};

const OVERLAPS = [
  { key: "viable", label: "Viable", hint: "economic + environmental" },
  { key: "equitable", label: "Equitable", hint: "economic + social" },
  { key: "bearable", label: "Bearable", hint: "social + environmental" },
];

function ScoreBar({ score }) {
  return (
    <span className="caps-score" aria-label={`${score} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`caps-score__pip${n <= score ? " caps-score__pip--on" : ""}`} />
      ))}
    </span>
  );
}

function CapitalTile({ capital }) {
  return (
    <li className={`caps-tile caps-tile--${capital.sphere} caps-tile--${capital.emphasis}`}>
      <div className="caps-tile__head">
        <span className="caps-tile__name">{capital.label}</span>
        <span className={`caps-badge caps-badge--${capital.emphasis}`}>
          {EMPHASIS_LABELS[capital.emphasis] || capital.emphasis}
        </span>
      </div>
      <div className="caps-tile__meta">
        <span className="caps-tile__sphere">{SPHERE_LABELS[capital.sphere]}</span>
        <ScoreBar score={capital.score} />
      </div>
      <p className="caps-tile__text">{capital.rationale}</p>
      {capital.evidence?.length > 0 && (
        <ul className="caps-tile__evidence" aria-label={`Evidence for ${capital.label} capital`}>
          {capital.evidence.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      {capital.risk && <p className="caps-tile__risk">Risk: {capital.risk}</p>}
    </li>
  );
}

export default function SixCapitalsProfile({ profile, error, onReassess, disabled }) {
  if (!profile && !error) return null;

  return (
    <section className="caps" aria-labelledby="caps-title">
      <div className="caps__header">
        <h3 id="caps-title" className="rag-section__title">Six Capitals profile</h3>
        {onReassess && (
          <button type="button" className="rag-upload__remove caps__reassess" onClick={onReassess} disabled={disabled}>
            Re-assess
          </button>
        )}
      </div>
      <p className="rag-section__hint">
        Which forms of capital your business mainly builds or draws down — financial, manufactured,
        intellectual, human, social &amp; relationship and natural. Sent to the MIA agents and used in
        section 9 of your business plan.
      </p>

      {error && !profile && (
        <div className="rag-warning" role="alert">
          The Six Capitals analysis could not run right now ({error}). You can still continue; try
          Re-assess later.
        </div>
      )}

      {profile && (
        <>
          {profile.summary && <p className="caps__summary">{profile.summary}</p>}
          <ul className="caps__grid">
            {profile.capitals.map((c) => (
              <CapitalTile key={c.id} capital={c} />
            ))}
          </ul>
          <div className="caps__spheres" aria-label="Sustainability balance">
            {OVERLAPS.map((o) => (
              <div key={o.key} className="caps__sphere">
                <strong>{o.label}</strong>
                <span className="caps__sphere-hint">{o.hint}</span>
                <p>{profile.spheres?.[o.key] || "Not addressed yet."}</p>
              </div>
            ))}
          </div>
          <p className="rag-section__hint">
            Dominant sphere: <strong>{SPHERE_LABELS[profile.dominantSphere] || profile.dominantSphere}</strong>
          </p>
        </>
      )}
    </section>
  );
}
