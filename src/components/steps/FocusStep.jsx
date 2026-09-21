import { useState, useRef, useEffect } from "react";
import SDGChip from "../shared/SDGChip";
import { DRIVER_STYLES } from "../../constants/steps";
import InfoTooltip from "../shared/InfoTooltip";
import { TOOLTIP_CONTENT } from "../../constants/tooltips";

function InferenceCard({ inferences, onConfirm }) {
  const [vals, setVals] = useState({ ...inferences });
  const [editingKey, setEditingKey] = useState(null);
  const [editAllMode, setEditAllMode] = useState(false);
  const announcementRef = useRef(null);

  const fields = [
    { key: "sector",             label: "Sector" },
    { key: "audience",           label: "Audience" },
    { key: "sdg_focus",          label: "SDG focus", tooltipKey: "sdg" },
    { key: "stage",              label: "Stage" },
    { key: "hidden_stakeholder", label: "Hidden stakeholder I noticed" },
  ];

  function announce(message) {
    if (announcementRef.current) {
      announcementRef.current.textContent = "";
      // Force screen reader re-announcement by clearing then setting
      requestAnimationFrame(() => {
        if (announcementRef.current) {
          announcementRef.current.textContent = message;
        }
      });
    }
  }

  function handleConfirmClick() {
    announce("Inferences confirmed. Generating focus areas.");
    onConfirm(vals);
  }

  function handleCorrectClick() {
    setEditAllMode(true);
    announce("Editing mode activated for all inferred attributes.");
  }

  function handleDoneEditing() {
    if (editAllMode) {
      // In edit-all mode, just blur; user stays in edit-all until they confirm
      return;
    }
    setEditingKey(null);
  }

  function isEditing(key) {
    return editAllMode || editingKey === key;
  }

  return (
    <form
      aria-label="AI inference review"
      onSubmit={(e) => e.preventDefault()}
      className="glass-info-card--brand focus-inference-card animate-fade-in"
      style={{ padding: "22px 26px", marginBottom: 28 }}
    >
      {/* ARIA live region for announcements */}
      <div
        ref={announcementRef}
        aria-live="assertive"
        aria-atomic="true"
        role="status"
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: 0,
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      />

      <h3 className="focus-inference__title">
        Here's how I read your story
      </h3>
      <p className="focus-inference__subtitle">
        Confirm or correct before we generate
      </p>

      {fields.map(f => (
        <div key={f.key} style={{
          display: "grid", gridTemplateColumns: "160px 1fr auto",
          alignItems: "center", gap: 12, marginBottom: 10,
        }}>
          <label
            htmlFor={`inference-${f.key}`}
            className="focus-inference__label"
          >
            {f.label}:
            {f.tooltipKey && TOOLTIP_CONTENT[f.tooltipKey] && (
              <InfoTooltip
                content={TOOLTIP_CONTENT[f.tooltipKey]}
                ariaLabel={`Info about ${f.label}`}
                position="right"
              />
            )}
          </label>
          {isEditing(f.key) ? (
            <input
              id={`inference-${f.key}`}
              aria-label={`Edit ${f.label}`}
              value={vals[f.key] || ""}
              onChange={e => setVals(v => ({ ...v, [f.key]: e.target.value }))}
              onBlur={() => handleDoneEditing(f.key)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  handleDoneEditing(f.key);
                  if (!editAllMode) setEditingKey(null);
                }
              }}
              autoFocus={!editAllMode || f.key === "sector"}
              style={{ fontSize: 13, padding: "4px 8px", borderRadius: 4, border: "1px solid var(--color-people-light)" }}
            />
          ) : (
            <span
              id={`inference-${f.key}`}
              style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}
            >
              {vals[f.key] || "—"}
            </span>
          )}
          {!editAllMode && (
            <button
              type="button"
              aria-label={`Edit ${f.label.toLowerCase()}`}
              onClick={() => {
                setEditingKey(editingKey === f.key ? null : f.key);
                if (editingKey !== f.key) {
                  announce(`Editing ${f.label}`);
                }
              }}
              className="focus-inference__edit-btn"
            >
              {editingKey === f.key ? "done" : "edit"}
            </button>
          )}
        </div>
      ))}

      <div className="focus-inference__actions" style={{ display: "flex", gap: 12, marginTop: 22 }}>
        <button
          type="button"
          className="btn-primary"
          onClick={handleConfirmClick}
          style={{ flex: 1, justifyContent: "center" }}
        >
          ✓ Looks right — generate
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={handleCorrectClick}
        >
          Something's off — let me correct
        </button>
      </div>
    </form>
  );
}

export default function FocusStep({ data, onInferenceConfirm, onInferenceReviewChange }) {
  const [inferenceConfirmed, setInferenceConfirmed] = useState(false);
  const announcementRef = useRef(null);
  const inferences = data?.inferences;

  useEffect(() => {
    if (!data) {
      onInferenceReviewChange?.(false);
      return;
    }
    onInferenceReviewChange?.(Boolean(inferences && !inferenceConfirmed));
  }, [data, inferences, inferenceConfirmed, onInferenceReviewChange]);

  if (!data) return null;

  const { focuses } = data;

  function announce(message) {
    if (announcementRef.current) {
      announcementRef.current.textContent = "";
      requestAnimationFrame(() => {
        if (announcementRef.current) {
          announcementRef.current.textContent = message;
        }
      });
    }
  }

  function handleConfirm(vals) {
    setInferenceConfirmed(true);
    onInferenceReviewChange?.(false);
    announce("Inferences confirmed. Focus areas generated.");
    if (onInferenceConfirm) onInferenceConfirm(vals);
  }

  return (
    <section className="animate-fade-in" aria-labelledby="focus-step-heading">
      {/* ARIA live region for step-level announcements */}
      <div
        ref={announcementRef}
        aria-live="polite"
        aria-atomic="true"
        role="status"
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: 0,
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      />

      <h2 id="focus-step-heading" className="sr-only">Focus Areas</h2>

      {inferences && !inferenceConfirmed && (
        <InferenceCard
          inferences={inferences}
          onConfirm={handleConfirm}
        />
      )}

      {(inferenceConfirmed || !inferences) && (
        <div style={{ display: "grid", gap: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text-primary)", margin: 0, display: "inline-flex", alignItems: "center", gap: 8 }}>
            Your Focus Areas
            <InfoTooltip
              content={TOOLTIP_CONTENT["dilemma-triangle"]}
              ariaLabel="Info about Dilemma Triangle"
              position="right"
            />
          </h3>
          {(focuses || []).map((f, i) => {
            const style = DRIVER_STYLES[f.driver] || {};
            return (
              <article key={i} aria-label={`Focus area: ${f.focus}`} className="glass-content-card" style={{
                borderLeft: `4px solid ${style.color}`,
                flexDirection: "column",
                gap: 6,
              }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: style.color,
                  textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 5,
                }}>
                  {f.driver}
                </div>
                <h4 style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 8, marginTop: 0 }}>
                  {f.focus}
                </h4>
                <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 10px", lineHeight: 1.65 }}>
                  {f.rationale}
                </p>
                <div>
                  {(f.sdgs || []).map(s => <SDGChip key={s} label={s} />)}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
