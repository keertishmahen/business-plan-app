import { useEffect, useRef } from "react";

/**
 * ErrorBanner — displays an error message with optional retry and dismiss actions.
 * Uses role="alert" for screen reader announcements.
 *
 * Props:
 *   message     (string)          — the error message to display
 *   onRetry     (function|null)   — optional callback for the retry button
 *   onDismiss   (function|null)   — optional callback for the dismiss button; enables auto-dismiss after 10s
 */
export default function ErrorBanner({ message, onRetry, onDismiss }) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (onDismiss) {
      timerRef.current = setTimeout(() => {
        onDismiss();
      }, 10000);
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [onDismiss]);

  if (!message) return null;

  return (
    <div
      role="alert"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-md)",
        padding: "12px 16px",
        background: "var(--color-danger-light)",
        border: "1px solid var(--color-danger)",
        borderRadius: "var(--radius-md)",
        marginBottom: "var(--space-md)",
        animation: "fadeIn 0.25s ease both",
      }}
    >
      {/* Error icon */}
      <span
        aria-hidden="true"
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: "var(--color-danger)",
          color: "#fff",
          fontSize: 14,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        !
      </span>

      {/* Message text */}
      <p
        style={{
          flex: 1,
          fontSize: "0.875rem",
          color: "var(--color-danger)",
          fontWeight: 500,
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        {message}
      </p>

      {/* Retry button */}
      {onRetry && (
        <button
          className="btn-primary"
          onClick={onRetry}
          style={{
            flexShrink: 0,
            fontSize: "0.8125rem",
            padding: "6px 14px",
            background: "var(--color-danger)",
          }}
        >
          ⟳ Retry
        </button>
      )}

      {/* Dismiss button */}
      {onDismiss && (
        <button
          className="btn-ghost"
          onClick={onDismiss}
          aria-label="Dismiss error"
          style={{
            flexShrink: 0,
            fontSize: "0.8125rem",
            padding: "6px 10px",
            color: "var(--color-danger)",
            border: "none",
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
