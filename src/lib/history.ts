import { SEED_HISTORY } from "../data/surveillance";
import { PATHOGENS } from "../data/catalog";
import type { RunRecord } from "../store/session";

export interface UnifiedRecord {
  ts: number;
  cartridgeId: string;
  appId: string;
  pathogen: string | null;
  matrix: string; // matrix id
  location: string;
  deviceSerial: string;
  resistant: boolean;
  live: boolean;
}

/** Merge live session runs with the seeded surveillance history, newest first. */
export function unifiedHistory(live: RunRecord[]): UnifiedRecord[] {
  const liveRows: UnifiedRecord[] = live
    .filter((r) => r.appId === "godetect" || r.appId === "goh2o")
    .map((r) => ({
      ts: r.when,
      cartridgeId: r.lot,
      appId: r.appId,
      pathogen: r.pathogen,
      matrix: r.matrixId ?? "—",
      location: r.location,
      deviceSerial: r.deviceSerial,
      resistant: r.resistant,
      live: true,
    }));
  const seedRows: UnifiedRecord[] = SEED_HISTORY.map((s) => ({
    ts: s.ts,
    cartridgeId: s.cartridgeId,
    appId: s.appId,
    pathogen: s.pathogen,
    matrix: s.matrix,
    location: s.location,
    deviceSerial: s.deviceSerial,
    resistant: s.resistant,
    live: false,
  }));
  return [...liveRows, ...seedRows].sort((a, b) => b.ts - a.ts);
}

export function pathogenName(id: string | null): string {
  return id ? PATHOGENS[id]?.name ?? id : "Negative";
}

/** Daily positive counts over the last `days` for a pathogen (or all). */
export function dailySeries(rows: UnifiedRecord[], days: number, pathogen?: string): number[] {
  const DAY = 86400000;
  const now = Date.now();
  const buckets = new Array(days).fill(0);
  for (const r of rows) {
    if (!r.pathogen) continue;
    if (pathogen && r.pathogen !== pathogen) continue;
    const d = Math.floor((now - r.ts) / DAY);
    if (d >= 0 && d < days) buckets[days - 1 - d]++;
  }
  return buckets;
}

/** Positive counts by pathogen across the window. */
export function byPathogen(rows: UnifiedRecord[]): { id: string; name: string; count: number }[] {
  const m = new Map<string, number>();
  for (const r of rows) if (r.pathogen) m.set(r.pathogen, (m.get(r.pathogen) ?? 0) + 1);
  return [...m.entries()]
    .map(([id, count]) => ({ id, name: pathogenName(id), count }))
    .sort((a, b) => b.count - a.count);
}

/** Week-over-week trend for a pathogen: recent 7d vs prior 7d. */
export function trend(rows: UnifiedRecord[], pathogen: string): { recent: number; prior: number; pct: number } {
  const DAY = 86400000;
  const now = Date.now();
  let recent = 0;
  let prior = 0;
  for (const r of rows) {
    if (r.pathogen !== pathogen) continue;
    const d = (now - r.ts) / DAY;
    if (d <= 7) recent++;
    else if (d <= 14) prior++;
  }
  const pct = prior === 0 ? (recent > 0 ? 100 : 0) : Math.round(((recent - prior) / prior) * 100);
  return { recent, prior, pct };
}
