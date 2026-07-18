import React from "react";

/**
 * Icône "Cloud Update" personnalisée — style Lucide (stroke, pas fill).
 * Nuage (haut) + deux grandes flèches circulaires de sync (bas).
 */
export function CloudUpdateIcon({
  className,
  style,
  size,
  strokeWidth = 1.8,
}: {
  className?: string;
  style?: React.CSSProperties;
  size?: number | string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size ?? "100%"}
      height={size ?? "100%"}
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* ── Nuage ── */}
      <path d="M9 11H8a3.5 3.5 0 0 1-.5-6.97A4.5 4.5 0 0 1 17.3 6.5H17a2.5 2.5 0 0 1 0 5h-1" />

      {/* ── Flèche gauche — arc anti-horaire, monte de bas-gauche vers haut ── */}
      <path d="M8 21a6 6 0 0 1 0-10" />
      <polyline points="5.5,13.5 8,11 10.5,13.5" />

      {/* ── Flèche droite — arc horaire, descend de haut vers bas-droit ── */}
      <path d="M16 11a6 6 0 0 1 0 10" />
      <polyline points="13.5,18.5 16,21 18.5,18.5" />
    </svg>
  );
}
