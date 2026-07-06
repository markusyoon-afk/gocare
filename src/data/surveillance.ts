/**
 * Seeded surveillance history — synthetic prior results so the History log and
 * Analytics trends have something to show in the demo. Deterministic (seeded),
 * spread over the last 28 days, with a deliberate Campylobacter uptick in the most
 * recent week so the trend detector fires a public-health signal.
 *
 * In the real product these rows come from actual GoDEVICE runs; the shape matches
 * the live history record so charts read from one merged series.
 */

import { rng, hashSeed } from "../engine/run";
import { PATHOGENS } from "./catalog";

export interface SurvRecord {
  ts: number;
  cartridgeId: string;
  appId: string;
  pathogen: string | null; // null = negative
  matrix: string;
  location: string;
  deviceSerial: string;
  resistant: boolean;
  seed: true;
}

const DAY = 86400000;
const LOCATIONS = [
  { label: "Urgent Care", serial: "GDX-1-24A7F309" },
  { label: "In Field", serial: "GDX-1-24B2C817" },
];
const MATRIX_BY_PATH: Record<string, string> = {
  salmonella: "stool",
  campylobacter: "stool",
  shigella: "stool",
  stec: "stool",
  ecoli: "urine",
  norovirus: "urine",
  neisseria: "urine",
  influenza: "nasal",
};

function build(): SurvRecord[] {
  const r = rng(hashSeed("gocare-surveillance-v1"));
  const now = Date.now();
  const rows: SurvRecord[] = [];
  const pool = Object.keys(PATHOGENS);
  let n = 0;

  for (let day = 28; day >= 0; day--) {
    // Baseline 1–3 runs/day; Campylobacter cluster grows in the last 7 days.
    const recent = day <= 7;
    const count = 1 + Math.floor(r() * 3);
    for (let i = 0; i < count; i++) {
      // Weight Campylobacter heavily in the recent window to create a trend.
      let pathogen: string | null;
      if (recent && r() < 0.55) pathogen = "campylobacter";
      else if (r() < 0.2) pathogen = null; // negative
      else pathogen = pool[Math.floor(r() * pool.length)];

      const loc = LOCATIONS[Math.floor(r() * LOCATIONS.length)];
      const matrix = pathogen ? MATRIX_BY_PATH[pathogen] ?? "stool" : "stool";
      const resistant = pathogen === "campylobacter" || pathogen === "salmonella" ? r() < 0.4 : false;
      const ts = now - day * DAY - Math.floor(r() * DAY);
      rows.push({
        ts,
        cartridgeId: `GODX-DTCT-${1000 + (n % 9000)}${String.fromCharCode(65 + (n % 26))}`,
        appId: matrix === "nasal" ? "godetect" : "godetect",
        pathogen,
        matrix,
        location: loc.label,
        deviceSerial: loc.serial,
        resistant,
        seed: true,
      });
      n++;
    }
  }
  return rows.sort((a, b) => b.ts - a.ts);
}

export const SEED_HISTORY: SurvRecord[] = build();
