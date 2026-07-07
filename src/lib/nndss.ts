/**
 * National / regional / state infectious-disease surveillance from CDC NNDSS.
 *
 * Uses the CURRENT (proper-case) location format of dataset x9gk-5huc, which carries
 * live 2025–present weekly data (`states`: "U.S. Residents", a census region, or a
 * state). Serves a baked snapshot instantly, then refreshes live (CORS open).
 * CDC NNDSS is U.S.-only.
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
const NATIONAL = "U.S. Residents";

/** [proper-case name = API value = label, 2-letter abbr] */
const STATES: [string, string][] = [
  ["Alabama", "AL"], ["Alaska", "AK"], ["Arizona", "AZ"], ["Arkansas", "AR"], ["California", "CA"], ["Colorado", "CO"],
  ["Connecticut", "CT"], ["Delaware", "DE"], ["District of Columbia", "DC"], ["Florida", "FL"], ["Georgia", "GA"], ["Hawaii", "HI"],
  ["Idaho", "ID"], ["Illinois", "IL"], ["Indiana", "IN"], ["Iowa", "IA"], ["Kansas", "KS"], ["Kentucky", "KY"], ["Louisiana", "LA"],
  ["Maine", "ME"], ["Maryland", "MD"], ["Massachusetts", "MA"], ["Michigan", "MI"], ["Minnesota", "MN"], ["Mississippi", "MS"],
  ["Missouri", "MO"], ["Montana", "MT"], ["Nebraska", "NE"], ["Nevada", "NV"], ["New Hampshire", "NH"], ["New Jersey", "NJ"],
  ["New Mexico", "NM"], ["New York", "NY"], ["North Carolina", "NC"], ["North Dakota", "ND"], ["Ohio", "OH"], ["Oklahoma", "OK"],
  ["Oregon", "OR"], ["Pennsylvania", "PA"], ["Rhode Island", "RI"], ["South Carolina", "SC"], ["South Dakota", "SD"], ["Tennessee", "TN"],
  ["Texas", "TX"], ["Utah", "UT"], ["Vermont", "VT"], ["Virginia", "VA"], ["Washington", "WA"], ["West Virginia", "WV"],
  ["Wisconsin", "WI"], ["Wyoming", "WY"],
];
const REGIONS = [
  "New England", "Middle Atlantic", "East North Central", "West North Central", "South Atlantic", "East South Central",
  "West South Central", "Mountain", "Pacific",
];

export const NNDSS_LOCATIONS = {
  national: [[NATIONAL, "United States (national)"]] as [string, string][],
  regions: REGIONS.map((r) => [r, r] as [string, string]),
  states: STATES.map(([n]) => [n, n] as [string, string]),
};

export function locationLabel(value: string): string {
  return value === NATIONAL ? "United States (national)" : value;
}

/** Derive a proper-case state value from a device location label like "Madison, WI". */
export function stateFromLabel(label?: string | null): string | null {
  if (!label) return null;
  const abbr = label.match(/,\s*([A-Za-z]{2})\b/);
  if (abbr) {
    const hit = STATES.find((s) => s[1] === abbr[1].toUpperCase());
    if (hit) return hit[0];
  }
  const low = label.toLowerCase();
  return STATES.find((s) => low.includes(s[0].toLowerCase()))?.[0] ?? null;
}

function empty(): Record<string, NndssPoint[]> {
  return { salmonella: [], campylobacter: [], shigella: [], stec: [] };
}

async function fetchLive(location: string): Promise<Nndss | null> {
  const inList = Object.keys(LABELS)
    .map((l) => `'${l.replace(/'/g, "''")}'`)
    .join(",");
  const where = `states='${location.replace(/'/g, "''")}' AND label in(${inList})`;
  const url =
    `https://data.cdc.gov/resource/${RESOURCE}.json?` +
    `$select=label,year,week,m1&$where=${encodeURIComponent(where)}&$order=year,week&$limit=2000`;

  const res = await fetch(url);
  if (!res.ok) return null;
  const rows: Array<{ label: string; year: string; week: string; m1?: string }> = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const series = empty();
  const years = new Set<number>();
  for (const r of rows) {
    const id = LABELS[r.label];
    if (!id) continue;
    const year = Number(r.year);
    years.add(year);
    series[id].push({ year, week: Number(r.week), cases: Math.round(Number(r.m1) || 0) });
  }
  for (const k of Object.keys(series)) series[k].sort((a, b) => a.year - b.year || a.week - b.week);
  const yrs = [...years].sort((a, b) => a - b);
  return { ...(snapshot as Nndss), region: location, years: yrs, latestYear: yrs[yrs.length - 1], fetchedAt: new Date().toISOString(), series };
}

export function useNndss(location: string): { data: Nndss; live: boolean; loading: boolean } {
  const [data, setData] = useState<Nndss>(snapshot as Nndss);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLive(false);
    if (location === NATIONAL) setData(snapshot as Nndss);
    fetchLive(location)
      .then((d) => {
        if (cancelled) return;
        if (d) {
          setData(d);
          setLive(true);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [location]);

  return { data, live, loading };
}

/** Totals over the visible window (sliced to `weeks`) — the range total, latest, and points. */
export function nndssTotals(data: Nndss, weeks?: number) {
  return Object.entries(data.series).map(([id, all]) => {
    const pts = weeks ? all.slice(-weeks) : all;
    return {
      id,
      total: pts.reduce((s, p) => s + p.cases, 0),
      latest: pts.length ? pts[pts.length - 1].cases : 0,
      points: pts,
    };
  });
}
