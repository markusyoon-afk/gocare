/**
 * GoCARE logomark — a sample droplet on a vital-sign pulse.
 *
 * Marketing rationale: "Go" (GoDx molecular diagnostics) + "CARE" (health) →
 * the droplet is the sample/diagnostics, the heartbeat line is care/vitals.
 * One clean, meaningful mark on the GoDx cyan, legible from favicon to signage.
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
        <linearGradient id="gcChip" x1="6" y1="3" x2="42" y2="45" gradientUnits="userSpaceOnUse">
          <stop stopColor="#63E6F8" />
          <stop offset="1" stopColor="#12A0C6" />
        </linearGradient>
        <radialGradient id="gcChipHi" cx="0.32" cy="0.2" r="0.85">
          <stop stopColor="#FFFFFF" stopOpacity="0.42" />
          <stop offset="0.6" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* chip */}
      <rect x="1.5" y="1.5" width="45" height="45" rx="13" fill="url(#gcChip)" />
      <rect x="1.5" y="1.5" width="45" height="45" rx="13" fill="url(#gcChipHi)" />
      <rect x="2.4" y="2.4" width="43.2" height="43.2" rx="11.8" fill="none" stroke="#FFFFFF" strokeOpacity="0.28" strokeWidth="1" />
      {/* sample droplet */}
      <path d="M24 12.4 C 27.1 16.9 29.6 20 29.6 23.6 A 5.6 5.6 0 1 1 18.4 23.6 C 18.4 20 20.9 16.9 24 12.4 Z" fill="#06222B" />
      {/* vital-sign pulse */}
      <path
        d="M7 35 H17.5 L19.6 35 L21.6 30 L24 39.2 L26 32.4 L27.6 35 H41"
        fill="none"
        stroke="#F2FBFE"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
