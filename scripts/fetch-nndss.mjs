/**
 * Fetch real national infectious-disease surveillance from the CDC NNDSS
 * (National Notifiable Diseases Surveillance System) and bake a compact snapshot
 * into src/data/nndss.json. Re-run to refresh. The app also fetches this live at
 * runtime (CORS is open) and falls back to this snapshot.
 *
 * Dataset: data.cdc.gov resource x9gk-5huc · national weekly case counts (m1).
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RESOURCE = "x9gk-5huc";
const LABELS = {
  "Salmonellosis (excluding Salmonella Typhi infection and Salmonella Paratyphi infection)": "salmonella",
  Campylobacteriosis: "campylobacter",
  Shigellosis: "shigella",
  "Shiga toxin-producing Escherichia coli (STEC)": "stec",
};

const inList = Object.keys(LABELS)
  .map((l) => `'${l.replace(/'/g, "''")}'`)
  .join(",");
const where = `location2='US RESIDENTS' AND label in(${inList})`;
const url =
  `https://data.cdc.gov/resource/${RESOURCE}.json?` +
  `$select=label,year,week,m1&$where=${encodeURIComponent(where)}&$order=week&$limit=1000`;

const res = await fetch(url);
if (!res.ok) throw new Error(`CDC fetch failed: ${res.status}`);
const rows = await res.json();

const series = { salmonella: [], campylobacter: [], shigella: [], stec: [] };
const years = new Set();
for (const r of rows) {
  const id = LABELS[r.label];
  if (!id) continue;
  const year = Number(r.year);
  const week = Number(r.week);
  years.add(year);
  series[id].push({ year, week, cases: Number(r.m1) || 0 });
}
// Chronological order, keep only the most recent 104 weeks (2 years) for a clean trend.
for (const k of Object.keys(series)) {
  series[k].sort((a, b) => a.year - b.year || a.week - b.week);
  series[k] = series[k].slice(-104);
}

const yrs = [...years].sort();
const out = {
  source: "CDC NNDSS — National Notifiable Diseases Surveillance System",
  dataset: RESOURCE,
  url: "https://data.cdc.gov/resource/" + RESOURCE + ".json",
  region: "US RESIDENTS (national)",
  years: yrs,
  latestYear: yrs[yrs.length - 1],
  metric: "Confirmed cases per MMWR week (m1)",
  fetchedAt: new Date().toISOString(),
  series,
};

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "data");
writeFileSync(join(dir, "nndss.json"), JSON.stringify(out, null, 2));
const totals = Object.fromEntries(Object.entries(series).map(([k, v]) => [k, v.reduce((s, x) => s + x.cases, 0)]));
console.log(`Baked src/data/nndss.json — years ${yrs.join(",")}, weeks/series:`, Object.fromEntries(Object.entries(series).map(([k, v]) => [k, v.length])));
console.log("Total cases (last 104 wks):", totals);
