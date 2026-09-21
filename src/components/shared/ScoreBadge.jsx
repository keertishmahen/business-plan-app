import { useState, useId } from "react";

export default function ScoreBadge({ score, severity, reversibility, reach, scoreProduct }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipId = useId();

  const product = scoreProduct ?? (severity * reversibility * reach);
  const tooltipText = scoreProduct != null
    ? `Severity ${severity} × Reversibility ${reversibility} × Reach ${reach} = ${product} → Priority ${score}/10`
    : `Severity: ${severity} · Reversibility: ${reversibility} · Reach: ${reach}`;

  return (
    <span
      style={{ position: "relative", display: "inline-block" }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
    >
      <span
        role="img"
        aria-label={`Priority score: ${score} out of 10`}
        aria-describedby={tooltipId}
        tabIndex={0}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: "var(--color-brand-light)",
          border: "2px solid var(--color-brand)",
          fontWeight: 600,
          fontSize: "0.875rem",
          color: "var(--color-text-primary)",
          cursor: "default",
          userSelect: "none",
        }}
      >
        {score}
      </span>
      {showTooltip && (
        <span
          id={tooltipId}
          role="tooltip"
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: "var(--z-tooltip)",
            background: "var(--color-surface)",
            boxShadow: "var(--shadow-md)",
            padding: "8px 12px",
            borderRadius: "var(--radius-md)",
            fontSize: "0.75rem",
            color: "var(--color-text-secondary)",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          {tooltipText}
        </span>
      )}
    </span>
  );
}
