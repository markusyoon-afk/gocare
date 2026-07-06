/**
 * National infectious-disease surveillance from CDC NNDSS.
 *
 * Serves a baked snapshot (src/data/nndss.json) instantly so the informatics are
 * always populated with real data, and attempts a live refresh from data.cdc.gov
 * at runtime (CORS is open). On any failure it keeps the snapshot.
 */
import { useEffect, useState } from "react";
import snapshot from "../data/nndss.json";

export interface NndssPoint {
  year: number;
  week: number;
  cases: number;
}
export interface Nndss {
  source: string;
  dataset: string;
  url: string;
  region: string;
  years: number[];
  latestYear: number;
  metric: string;
  fetchedAt: string;
  series: Record<string, NndssPoint[]>;
}

const LABELS: Record<string, string> = {
  "Salmonellosis (excluding Salmonella Typhi infection and Salmonella Paratyphi infection)": "salmonella",
  Campylobacteriosis: "campylobacter",
  Shigellosis: "shigella",
  "Shiga toxin-producing Escherichia coli (STEC)": "stec",
};

const RESOURCE = "x9gk-5huc";

async function fetchLive(): Promise<Nndss | null> {
  const inList = Object.keys(LABELS)
    .map((l) => `'${l.replace(/'/g, "''")}'`)
    .join(",");
  const where = `location2='US RESIDENTS' AND label in(${inList})`;
  const url =
    `https://data.cdc.gov/resource/${RESOURCE}.json?` +
    `$select=label,year,week,m1&$where=${encodeURIComponent(where)}&$order=week&$limit=1000`;

  const res = await fetch(url);
  if (!res.ok) return null;
  const rows: Array<{ label: string; year: string; week: string; m1?: string }> = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const series: Record<string, NndssPoint[]> = { salmonella: [], campylobacter: [], shigella: [], stec: [] };
  const years = new Set<number>();
  for (const r of rows) {
    const id = LABELS[r.label];
    if (!id) continue;
    const year = Number(r.year);
    years.add(year);
    series[id].push({ year, week: Number(r.week), cases: Number(r.m1) || 0 });
  }
  for (const k of Object.keys(series)) {
    series[k].sort((a, b) => a.year - b.year || a.week - b.week);
    series[k] = series[k].slice(-104);
  }
  const yrs = [...years].sort((a, b) => a - b);
  return {
    ...(snapshot as Nndss),
    years: yrs,
    latestYear: yrs[yrs.length - 1],
    fetchedAt: new Date().toISOString(),
    series,
  };
}

/** Baked snapshot immediately; live CDC refresh when reachable. */
export function useNndss(): { data: Nndss; live: boolean } {
  const [data, setData] = useState<Nndss>(snapshot as Nndss);
  const [live, setLive] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetchLive()
      .then((d) => {
        if (d && !cancelled) {
          setData(d);
          setLive(true);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return { data, live };
}

/** Weekly totals summed across the tracked pathogens (for a combined line). */
export function nndssTotals(data: Nndss) {
  return Object.entries(data.series).map(([id, pts]) => ({
    id,
    total: pts.reduce((s, p) => s + p.cases, 0),
    latest: pts.length ? pts[pts.length - 1].cases : 0,
    points: pts,
  }));
}
