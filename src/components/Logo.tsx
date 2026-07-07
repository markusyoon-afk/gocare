/**
 * GoCARE logomark — a hexagon (molecular / biotech) holding a sample droplet.
 * One clean idea that reads at any size, from the 26px header to the app icon.
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
        <linearGradient id="gcHex" x1="8" y1="3" x2="40" y2="45" gradientUnits="userSpaceOnUse">
          <stop stopColor="#63E6F8" />
          <stop offset="1" stopColor="#12A0C6" />
        </linearGradient>
        <radialGradient id="gcHexHi" cx="0.33" cy="0.2" r="0.85">
          <stop stopColor="#FFFFFF" stopOpacity="0.42" />
          <stop offset="0.6" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* hexagon chip */}
      <path
        d="M24 2.5 L42.62 13.25 L42.62 34.75 L24 45.5 L5.38 34.75 L5.38 13.25 Z"
        fill="url(#gcHex)"
        stroke="#7FEDFB"
        strokeOpacity="0.35"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <path d="M24 2.5 L42.62 13.25 L42.62 34.75 L24 45.5 L5.38 34.75 L5.38 13.25 Z" fill="url(#gcHexHi)" />
      {/* sample droplet */}
      <path
        d="M24 14.6 C 27.7 19.7 30.6 23.1 30.6 27.0 A 6.6 6.6 0 1 1 17.4 27.0 C 17.4 23.1 20.3 19.7 24 14.6 Z"
        fill="#06222B"
      />
    </svg>
  );
}
