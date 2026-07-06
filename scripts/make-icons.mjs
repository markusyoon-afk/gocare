/**
 * make-icons — generate GoCARE PWA icons with zero dependencies.
 *
 * Hand-rolled PNG encoder (SURV pattern): draw the brand mark — the GoDEVICE
 * instrument ring on the deep-navy canvas with a cyan accent — straight to an
 * RGBA buffer, deflate via node's zlib, wrap in PNG chunks. CI-free, no fonts.
 */

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
mkdirSync(OUT, { recursive: true });

// Brand palette (from the GoDx decks).
const NAVY = [10, 15, 20];
const NAVY_TILE = [19, 28, 35];
const CYAN = [53, 204, 230];
const CYAN_DEEP = [34, 183, 216];

function lerp(a, b, t) {
  return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
}

/** Render an N×N RGBA icon buffer: navy tile, a cyan ring with a gap, center dot. */
function renderIcon(N) {
  const buf = Buffer.alloc(N * N * 4);
  const c = (N - 1) / 2;
  const outerR = N * 0.34;
  const innerR = N * 0.245;
  const dotR = N * 0.052;
  const tileR = N * 0.42; // rounded-square backdrop radius
  const corner = N * 0.11;

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const dx = x - c;
      const dy = y - c;
      const dist = Math.hypot(dx, dy);

      // Base: navy canvas, with a subtly lighter rounded-square tile in the safe zone.
      let col = NAVY;
      if (insideRoundedSquare(x, y, N, tileR, corner)) {
        // diagonal gradient on the tile
        const t = (x + y) / (2 * N);
        col = lerp(NAVY_TILE, NAVY, t * 0.5);
      }

      // Ring with a gap at the top-right (the spinner motif).
      const ang = Math.atan2(dy, dx); // -PI..PI
      const inGap = ang > -Math.PI * 0.45 && ang < -Math.PI * 0.05;
      if (dist >= innerR && dist <= outerR && !inGap) {
        // cyan gradient around the ring
        const t = (ang + Math.PI) / (2 * Math.PI);
        col = lerp(CYAN, CYAN_DEEP, t);
      }

      // Center accent dot.
      if (dist <= dotR) col = CYAN;

      const i = (y * N + x) * 4;
      buf[i] = col[0];
      buf[i + 1] = col[1];
      buf[i + 2] = col[2];
      buf[i + 3] = 255; // opaque — safe for maskable
    }
  }
  return buf;
}

function insideRoundedSquare(x, y, N, halfSpan, corner) {
  const c = (N - 1) / 2;
  const dx = Math.abs(x - c);
  const dy = Math.abs(y - c);
  const lim = halfSpan;
  if (dx > lim || dy > lim) return false;
  const inner = lim - corner;
  if (dx <= inner || dy <= inner) return true;
  return Math.hypot(dx - inner, dy - inner) <= corner;
}

/* ---- minimal PNG encoder ---- */

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePNG(N, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(N, 0);
  ihdr.writeUInt32BE(N, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // add per-scanline filter byte (0 = none)
  const raw = Buffer.alloc(N * (N * 4 + 1));
  for (let y = 0; y < N; y++) {
    raw[y * (N * 4 + 1)] = 0;
    rgba.copy(raw, y * (N * 4 + 1) + 1, y * N * 4, (y + 1) * N * 4);
  }
  const idat = deflateSync(raw, { level: 9 });

  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

const SIZES = [192, 512, 180, 32];
for (const N of SIZES) {
  const png = encodePNG(N, renderIcon(N));
  const name = N === 180 ? "apple-touch-icon.png" : N === 32 ? "favicon-32.png" : `icon-${N}.png`;
  writeFileSync(join(OUT, name), png);
  console.log(`  ✓ ${name} (${N}×${N}, ${png.length} bytes)`);
}
console.log("GoCARE icons generated in public/");
