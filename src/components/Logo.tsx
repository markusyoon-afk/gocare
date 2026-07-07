/**
 * GoCARE logomark — a molecular hexagon with a vital-sign pulse.
 *
 * Marketing rationale: the hexagon reads molecular / biotech (GoDx's domain), the
 * heartbeat reads care & vitals (the "CARE"). Together: molecular care. Distinctive,
 * clinical, and legible from favicon to signage — and not a water drop.
 */
export function Logo({ size = 38, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="GoCARE"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="gcHx" x1="8" y1="3" x2="40" y2="45" gradientUnits="userSpaceOnUse">
          <stop stopColor="#63E6F8" />
          <stop offset="1" stopColor="#12A0C6" />
        </linearGradient>
        <radialGradient id="gcHxHi" cx="0.33" cy="0.2" r="0.85">
          <stop stopColor="#FFFFFF" stopOpacity="0.42" />
          <stop offset="0.6" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* molecular hexagon */}
      <path
        d="M24 2.5 L42.62 13.25 L42.62 34.75 L24 45.5 L5.38 34.75 L5.38 13.25 Z"
        fill="url(#gcHx)"
        stroke="#7FEDFB"
        strokeOpacity="0.35"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <path d="M24 2.5 L42.62 13.25 L42.62 34.75 L24 45.5 L5.38 34.75 L5.38 13.25 Z" fill="url(#gcHxHi)" />
      {/* vital-sign pulse */}
      <path
        d="M8 24 H16 L18.8 24 L21 15.6 L24 33.4 L26.6 18.4 L28.6 24 H40"
        fill="none"
        stroke="#06222B"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
