import { useEffect, useState } from "react";
import { Hourglass } from "lucide-react";
import BrandLogo from "./BrandLogo";

/**
 * LoadingState — accessible loading indicator with contextual messages
 * and reduced-motion support.
 *
 * @param {string} [label] - Custom loading label (overrides stepName-based label)
 * @param {string} [stepName] - Step context name for "Generating {stepName}…" message
 * @param {boolean} [brand] - Show the Symmetra logo above the indicator (full-page states)
 * @param {string} [hint] - Secondary line (defaults to the generation-time hint)
 */
export default function LoadingState({ label, stepName, brand = false, hint = "This usually takes 10–30 seconds" }) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const displayLabel = label || (stepName ? `Generating ${stepName}…` : "Generating…");

  return (
    <div
      role="status"
      aria-live="polite"
      className="loading-glass-card"
    >
      {brand && <BrandLogo height={44} className="brand-logo--center" />}
      {prefersReducedMotion ? (
        <div
          aria-hidden="true"
          style={{
            width: 40,
            height: 40,
            margin: "0 auto 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-brand)",
          }}
        >
          <Hourglass size={28} strokeWidth={1.75} />
        </div>
      ) : (
        <div
          aria-hidden="true"
          className="animate-spin"
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "3px solid var(--color-brand-light)",
            borderTop: "3px solid var(--color-brand)",
            margin: "0 auto 20px",
          }}
        />
      )}
      <p style={{ fontSize: 14, color: "var(--color-text-secondary)", fontWeight: 500 }}>
        {displayLabel}
      </p>
      <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>
        {hint}
      </p>
    </div>
  );
}
