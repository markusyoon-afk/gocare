/**
 * National / regional / state infectious-disease surveillance from CDC NNDSS.
 *
 * Serves a baked national snapshot (src/data/nndss.json) instantly, then fetches
 * live from data.cdc.gov for the selected location (CORS is open). Location is the
 * uppercase value of the `states` field: "US RESIDENTS" (national), a census region
 * ("PACIFIC"…), or a state ("WISCONSIN"…). CDC NNDSS is U.S.-only.
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

/** [uppercase `states` value, display label, 2-letter abbr] */
const STATES: [string, string, string][] = [
  ["ALABAMA", "Alabama", "AL"], ["ALASKA", "Alaska", "AK"], ["ARIZONA", "Arizona", "AZ"], ["ARKANSAS", "Arkansas", "AR"],
  ["CALIFORNIA", "California", "CA"], ["COLORADO", "Colorado", "CO"], ["CONNECTICUT", "Connecticut", "CT"], ["DELAWARE", "Delaware", "DE"],
  ["DISTRICT OF COLUMBIA", "District of Columbia", "DC"], ["FLORIDA", "Florida", "FL"], ["GEORGIA", "Georgia", "GA"], ["HAWAII", "Hawaii", "HI"],
  ["IDAHO", "Idaho", "ID"], ["ILLINOIS", "Illinois", "IL"], ["INDIANA", "Indiana", "IN"], ["IOWA", "Iowa", "IA"],
  ["KANSAS", "Kansas", "KS"], ["KENTUCKY", "Kentucky", "KY"], ["LOUISIANA", "Louisiana", "LA"], ["MAINE", "Maine", "ME"],
  ["MARYLAND", "Maryland", "MD"], ["MASSACHUSETTS", "Massachusetts", "MA"], ["MICHIGAN", "Michigan", "MI"], ["MINNESOTA", "Minnesota", "MN"],
  ["MISSISSIPPI", "Mississippi", "MS"], ["MISSOURI", "Missouri", "MO"], ["MONTANA", "Montana", "MT"], ["NEBRASKA", "Nebraska", "NE"],
  ["NEVADA", "Nevada", "NV"], ["NEW HAMPSHIRE", "New Hampshire", "NH"], ["NEW JERSEY", "New Jersey", "NJ"], ["NEW MEXICO", "New Mexico", "NM"],
  ["NEW YORK", "New York", "NY"], ["NORTH CAROLINA", "North Carolina", "NC"], ["NORTH DAKOTA", "North Dakota", "ND"], ["OHIO", "Ohio", "OH"],
  ["OKLAHOMA", "Oklahoma", "OK"], ["OREGON", "Oregon", "OR"], ["PENNSYLVANIA", "Pennsylvania", "PA"], ["RHODE ISLAND", "Rhode Island", "RI"],
  ["SOUTH CAROLINA", "South Carolina", "SC"], ["SOUTH DAKOTA", "South Dakota", "SD"], ["TENNESSEE", "Tennessee", "TN"], ["TEXAS", "Texas", "TX"],
  ["UTAH", "Utah", "UT"], ["VERMONT", "Vermont", "VT"], ["VIRGINIA", "Virginia", "VA"], ["WASHINGTON", "Washington", "WA"],
  ["WEST VIRGINIA", "West Virginia", "WV"], ["WISCONSIN", "Wisconsin", "WI"], ["WYOMING", "Wyoming", "WY"],
];
const REGIONS: [string, string][] = [
  ["NEW ENGLAND", "New England"], ["MIDDLE ATLANTIC", "Middle Atlantic"], ["EAST NORTH CENTRAL", "East North Central"],
  ["WEST NORTH CENTRAL", "West North Central"], ["SOUTH ATLANTIC", "South Atlantic"], ["EAST SOUTH CENTRAL", "East South Central"],
  ["WEST SOUTH CENTRAL", "West South Central"], ["MOUNTAIN", "Mountain"], ["PACIFIC", "Pacific"],
];

export const NNDSS_LOCATIONS = {
  national: [["US RESIDENTS", "United States (national)"]] as [string, string][],
  regions: REGIONS,
  states: STATES.map(([v, l]) => [v, l] as [string, string]),
};

/** Display label for a location value. */
export function locationLabel(value: string): string {
  if (value === "US RESIDENTS") return "United States (national)";
  return [...REGIONS, ...STATES.map((s) => [s[0], s[1]] as [string, string])].find(([v]) => v === value)?.[1] ?? value;
}

/** Derive a state value from a device location label like "Madison, WI". */
export function stateFromLabel(label?: string | null): string | null {
  if (!label) return null;
  const abbr = label.match(/,\s*([A-Za-z]{2})\b/);
  if (abbr) {
    const hit = STATES.find((s) => s[2] === abbr[1].toUpperCase());
    if (hit) return hit[0];
  }
  const up = label.toUpperCase();
  return STATES.find((s) => up.includes(s[0]))?.[0] ?? null;
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
    `$select=label,year,week,m1&$where=${encodeURIComponent(where)}&$order=year,week&$limit=1500`;

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
  for (const k of Object.keys(series)) {
    series[k].sort((a, b) => a.year - b.year || a.week - b.week);
    series[k] = series[k].slice(-104);
  }
  const yrs = [...years].sort((a, b) => a - b);
  return { ...(snapshot as Nndss), region: location, years: yrs, latestYear: yrs[yrs.length - 1], fetchedAt: new Date().toISOString(), series };
}

/** Baked national snapshot immediately; live CDC refresh for the selected location. */
export function useNndss(location: string): { data: Nndss; live: boolean; loading: boolean } {
  const [data, setData] = useState<Nndss>(snapshot as Nndss);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLive(false);
    if (location === "US RESIDENTS") setData(snapshot as Nndss);
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

/** Weekly totals summed across the tracked pathogens. */
export function nndssTotals(data: Nndss) {
  return Object.entries(data.series).map(([id, pts]) => ({
    id,
    total: pts.reduce((s, p) => s + p.cases, 0),
    latest: pts.length ? pts[pts.length - 1].cases : 0,
    points: pts,
  }));
}
