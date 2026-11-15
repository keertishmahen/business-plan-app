import React from "react";
import { APP_NAME, LOGO_LOCKUP_SRC, LOGO_MARK_SRC } from "../../constants/branding";

/**
 * BrandLogo — the Symmetra Systems logo.
 *
 * variant "lockup" is the mark plus the "Symmetra Systems" wordmark (light
 * backgrounds); "mark" is the loop-and-fan symbol alone, for tight spaces or
 * next to text that already names the product. `height` is in pixels; the
 * width follows the image's aspect ratio.
 */
export default function BrandLogo({ variant = "lockup", height = 36, className = "", decorative = false }) {
  const src = variant === "mark" ? LOGO_MARK_SRC : LOGO_LOCKUP_SRC;
  return (
    <img
      src={src}
      alt={decorative ? "" : APP_NAME}
      aria-hidden={decorative || undefined}
      height={height}
      className={`brand-logo brand-logo--${variant} ${className}`.trim()}
      style={{ height, width: "auto", display: "block" }}
      draggable="false"
    />
  );
}
