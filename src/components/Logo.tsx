/**
 * GoCARE logomark — the diagnostic-ring motif (matches the installed-app icon).
 * A cyan gradient chip with the open GoDEVICE ring + sample dot in deep navy:
 * reads as an instrument target / molecular sample — clean MedTech, not a text box.
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
        <linearGradient id="gcTile" x1="4" y1="2" x2="44" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5FE3F6" />
          <stop offset="1" stopColor="#1FA8CC" />
        </linearGradient>
      </defs>
      {/* chip */}
      <rect x="1.5" y="1.5" width="45" height="45" rx="13" fill="url(#gcTile)" />
      {/* crisp inner highlight for depth */}
      <rect x="2.5" y="2.5" width="43" height="43" rx="11.6" fill="none" stroke="#FFFFFF" strokeOpacity="0.28" strokeWidth="1" />
      {/* open diagnostic ring (instrument motif) */}
      <circle
        cx="24"
        cy="24"
        r="12.4"
        fill="none"
        stroke="#06222B"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="60 18"
        transform="rotate(-58 24 24)"
      />
      {/* sample dot */}
      <circle cx="24" cy="24" r="4" fill="#06222B" />
    </svg>
  );
}
