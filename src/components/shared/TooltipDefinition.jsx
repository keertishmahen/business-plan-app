import { useState, useId } from "react";

/**
 * TooltipDefinition — hover/focus tooltip for technical terms.
 * Displays the term with a dotted underline; on hover or keyboard focus,
 * shows a plain-language definition tooltip above the term.
 * Uses aria-describedby for accessibility.
 */
export default function TooltipDefinition({ term, definition }) {
  const [visible, setVisible] = useState(false);
  const tooltipId = useId();

  function show() { setVisible(true); }
  function hide() { setVisible(false); }

  return (
    <span
      style={{ position: "relative", display: "inline-block" }}
    >
      <span
        tabIndex={0}
        role="term"
        aria-describedby={visible ? tooltipId : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        style={{
          borderBottom: "1.5px dotted var(--color-text-muted)",
          cursor: "help",
          color: "inherit",
        }}
      >
        {term}
      </span>

      {visible && (
        <span
          id={tooltipId}
          role="tooltip"
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--color-surface)",
            boxShadow: "var(--shadow-md)",
            padding: "8px 12px",
            borderRadius: "var(--radius-md)",
            maxWidth: 280,
            fontSize: "0.8rem",
            lineHeight: 1.5,
            color: "var(--color-text-primary)",
            whiteSpace: "normal",
            zIndex: "var(--z-tooltip)",
            pointerEvents: "none",
            animation: "fadeIn 0.15s ease",
          }}
        >
          {definition}
        </span>
      )}
    </span>
  );
}
