import { compileStory } from "../../utils/compileStory";

// ──────────────────────────────────────────────────────────────────
//  Phase display metadata
// ──────────────────────────────────────────────────────────────────
const PHASE_META = [
  { key: "basics", header: "Business Overview" },
  { key: "problem", header: "Problem & Solution" },
  { key: "customers", header: "Target Customers" },
];

// ──────────────────────────────────────────────────────────────────
//  Styles
// ──────────────────────────────────────────────────────────────────
const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-md, 16px)",
  },
  sectionCard: {
    border: "1px solid var(--color-border, rgba(0,0,0,0.08))",
    borderRadius: "var(--radius-md, 10px)",
    padding: "var(--space-md, 16px)",
    background: "var(--color-surface, #FFFFFF)",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "var(--space-sm, 8px)",
  },
  sectionTitle: {
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "var(--color-text-primary, #1A1A18)",
    margin: 0,
  },
  editButton: {
    fontSize: "0.75rem",
    fontWeight: 500,
    color: "var(--color-text-secondary, #5C5C58)",
    background: "transparent",
    border: "none",
    borderRadius: "var(--radius-sm, 6px)",
    padding: "4px 10px",
    cursor: "pointer",
    transition: "var(--transition-fast, 0.15s ease)",
  },
  sectionContent: {
    fontSize: "0.875rem",
    lineHeight: 1.6,
    color: "var(--color-text-primary, #1A1A18)",
    whiteSpace: "pre-wrap",
  },
  emptyContent: {
    fontSize: "0.875rem",
    color: "var(--color-text-muted, #9A9A94)",
    fontStyle: "italic",
  },
  storyPreview: {
    marginTop: "var(--space-md, 16px)",
    border: "1px solid var(--color-border, rgba(0,0,0,0.08))",
    borderRadius: "var(--radius-md, 10px)",
    padding: "var(--space-md, 16px)",
    background: "var(--color-brand-light, var(--color-brand-light))",
  },
  storyPreviewTitle: {
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "var(--color-brand, var(--color-brand))",
    margin: 0,
    marginBottom: "var(--space-sm, 8px)",
  },
  storyPreviewContent: {
    fontSize: "0.8125rem",
    lineHeight: 1.6,
    color: "var(--color-text-primary, #1A1A18)",
    whiteSpace: "pre-wrap",
  },
  submitButton: {
    width: "100%",
    padding: "14px 24px",
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "#FFFFFF",
    background: "var(--color-brand-mid, var(--color-brand-mid))",
    border: "none",
    borderRadius: "var(--radius-md, 10px)",
    cursor: "pointer",
    marginTop: "var(--space-md, 16px)",
    transition: "var(--transition-fast, 0.15s ease)",
  },
};

// ──────────────────────────────────────────────────────────────────
//  PhaseReview Component
// ──────────────────────────────────────────────────────────────────
/**
 * Final review screen compiling all phase responses.
 * Allows user to edit individual phases before submitting the compiled story.
 *
 * @param {{ basics: string, problem: string, customers: string }} responses - Phase responses
 * @param {function} onEdit - Called with phase key to navigate back for editing
 * @param {function} onSubmit - Called when user confirms and submits
 */
export default function PhaseReview({ responses, onEdit, onSubmit }) {
  const compiledStory = compileStory(responses);

  return (
    <div style={styles.container} role="region" aria-label="Review your responses">
      {/* Phase sections */}
      {PHASE_META.map(({ key, header }) => {
        const content = responses[key]?.trim();
        const isEmpty = !content;

        return (
          <div key={key} style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>{header}</h3>
              <button
                style={styles.editButton}
                onClick={() => onEdit(key)}
                aria-label={isEmpty ? `Add ${header}` : `Edit ${header}`}
              >
                {isEmpty ? "Add" : "Edit"}
              </button>
            </div>
            {isEmpty ? (
              <p style={styles.emptyContent}>(No response provided)</p>
            ) : (
              <p style={styles.sectionContent}>{content}</p>
            )}
          </div>
        );
      })}

      {/* Compiled story preview */}
      {compiledStory && (
        <div style={styles.storyPreview}>
          <h3 style={styles.storyPreviewTitle}>Compiled Story Preview</h3>
          <p style={styles.storyPreviewContent}>{compiledStory}</p>
        </div>
      )}

      {/* Submit button */}
      <button
        style={styles.submitButton}
        onClick={onSubmit}
        aria-label="Confirm and submit your story"
      >
        Looks good — let's go!
      </button>
    </div>
  );
}
