import { hashSeed, rng } from "../engine/run";

/**
 * Decorative but deterministic QR-style matrix rendered from a string.
 * Not a real QR payload — it's the scannable graphic on the cartridge label,
 * stable per lot id so the same cartridge always shows the same code.
 */
export function QRCode({ value, size = 7 }: { value: string; size?: number }) {
  const r = rng(hashSeed(value));
  const cells: boolean[] = [];
  for (let i = 0; i < size * size; i++) cells.push(r() > 0.5);
  // Force finder-pattern corners for a recognizable QR silhouette.
  const corners = [0, size - 1, (size - 1) * size];
  corners.forEach((c) => {
    cells[c] = true;
    if (c + 1 < cells.length) cells[c + 1] = true;
    if (c + size < cells.length) cells[c + size] = true;
  });
  return (
    <div className="qr" style={{ gridTemplateColumns: `repeat(${size},1fr)`, gridTemplateRows: `repeat(${size},1fr)` }}>
      {cells.map((on, i) => (
        <i key={i} className={on ? "" : "off"} />
      ))}
    </div>
  );
}
