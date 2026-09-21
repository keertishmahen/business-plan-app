import React from 'react';

/**
 * RefinementInvitation — a visually distinct button that invites users to refine
 * generated output. Displays a pencil icon (✏️) with "Refine this" label.
 * Positioned after output blocks to proactively encourage user feedback.
 */
export default function RefinementInvitation({ onClickRefine, ariaLabel = 'Refine this output' }) {
  return (
    <button
      type="button"
      onClick={onClickRefine}
      aria-label={ariaLabel}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        marginTop: 16,
        padding: '8px 14px',
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--color-brand-mid, #4C7DFF)',
        background: 'var(--color-brand-light, var(--color-brand-light))',
        border: '1.5px solid var(--color-brand-pale, var(--color-brand-pale))',
        borderRadius: 'var(--radius-md, 10px)',
        cursor: 'pointer',
        transition: 'background 0.15s ease, border-color 0.15s ease, transform 0.15s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'var(--color-brand-pale, #C9D8FF)';
        e.currentTarget.style.borderColor = 'var(--color-brand-mid, #4C7DFF)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'var(--color-brand-light, var(--color-brand-light))';
        e.currentTarget.style.borderColor = 'var(--color-brand-pale, var(--color-brand-pale))';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 15, lineHeight: 1 }}>✏️</span>
      <span>Refine this</span>
    </button>
  );
}
