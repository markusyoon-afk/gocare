/**
 * GoCARE logomark — GoDx-family diagnostic mark.
 * A cyan gradient chip with the open instrument ring and a sample droplet at its
 * center: reads as molecular diagnostics (analyze a sample). Matches the app icon.
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
        <linearGradient id="gcTile" x1="5" y1="2" x2="43" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#63E6F8" />
          <stop offset="1" stopColor="#149BC0" />
        </linearGradient>
        <radialGradient id="gcHi" cx="0.32" cy="0.2" r="0.9">
          <stop stopColor="#FFFFFF" stopOpacity="0.4" />
          <stop offset="0.55" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* chip + highlight + rim */}
      <rect x="1.5" y="1.5" width="45" height="45" rx="13" fill="url(#gcTile)" />
      <rect x="1.5" y="1.5" width="45" height="45" rx="13" fill="url(#gcHi)" />
      <rect x="2.4" y="2.4" width="43.2" height="43.2" rx="11.8" fill="none" stroke="#FFFFFF" strokeOpacity="0.3" strokeWidth="1" />
      {/* open diagnostic ring (instrument) */}
      <circle
        cx="24"
        cy="24"
        r="12.6"
        fill="none"
        stroke="#06222B"
        strokeWidth="4.4"
        strokeLinecap="round"
        strokeDasharray="59 20"
        transform="rotate(-56 24 24)"
      />
      {/* sample droplet */}
      <path
        d="M24 17.4 C 26.7 21.3 28.9 23.7 28.9 26.4 A 4.9 4.9 0 1 1 19.1 26.4 C 19.1 23.7 21.3 21.3 24 17.4 Z"
        fill="#06222B"
      />
    </svg>
  );
}
