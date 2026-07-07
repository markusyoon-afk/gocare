import { useState, useRef } from "react";
import { useSession } from "../store/session";
import { useDevice, activeDevice } from "../store/device";
import { unifiedHistory, dailySeries, byPathogen, trend, pathogenName } from "../lib/history";
import { useNndss, nndssTotals, NNDSS_LOCATIONS, locationLabel, stateFromLabel } from "../lib/nndss";
import { generateInsights } from "../lib/insights";

const DAYS = 28;
const RANGES = [
  { label: "3 mo", weeks: 13 },
  { label: "6 mo", weeks: 26 },
  { label: "1 yr", weeks: 52 },
  { label: "2 yr", weeks: 104 },
];

/** MMWR week-ending (Saturday) date for an (year, week). */
function weekEndDate(year: number, week: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const start = new Date(jan4);
  start.setUTCDate(jan4.getUTCDate() - jan4.getUTCDay()); // Sunday of MMWR week 1
  const d = new Date(start);
  d.setUTCDate(start.getUTCDate() + (week - 1) * 7 + 6); // Saturday (week end) of target week
  return d;
}
function fmtWeekDate(year: number, week: number, withYear = true): string {
  return weekEndDate(year, week).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

/** Analytics — result trends over time for proactive surveillance. */
export function AnalyticsScreen() {
  const { state } = useSession();
  const rows = unifiedHistory(state.history);
  const { state: dev } = useDevice();
  const deviceState = stateFromLabel(activeDevice(dev).location?.label);
  const [location, setLocation] = useState("US RESIDENTS");
  const { data: nndss, live, loading } = useNndss(location);
  const nat = nndssTotals(nndss);
  const [rangeWeeks, setRangeWeeks] = useState(104);
  const rangeLabel = RANGES.find((r) => r.weeks === rangeWeeks)?.label ?? "";
  // Window each pathogen's series to the selected duration.
  const natWindowed = nat.map((row) => {
    const pts = row.points.slice(-rangeWeeks);
    return { ...row, pts, latest: pts.length ? pts[pts.length - 1].cases : 0, total: pts.reduce((s, p) => s + p.cases, 0) };
  });
  const span = natWindowed[0]?.pts ?? [];
  const spanLabel = span.length
    ? `${fmtWeekDate(span[0].year, span[0].week)} – ${fmtWeekDate(span[span.length - 1].year, span[span.length - 1].week)}`
    : "";

  const totalPos = rows.filter((r) => r.pathogen).length;
  const resistant = rows.filter((r) => r.resistant).length;
  const resistanceRate = totalPos ? Math.round((resistant / totalPos) * 100) : 0;

  const byPath = byPathogen(rows);
  // Biggest recent rise across pathogens → the proactive signal.
  const rising = byPath
    .map((p) => ({ ...p, t: trend(rows, p.id) }))
    .filter((p) => p.t.recent >= 3 && p.t.pct >= 20)
    .sort((a, b) => b.t.pct - a.t.pct)[0];

  const allSeries = dailySeries(rows, DAYS);
  const topId = byPath[0]?.id;
  const topSeries = topId ? dailySeries(rows, DAYS, topId) : [];

  const cdcLatest = Object.fromEntries(nat.map((n) => [n.id, n.latest]));
  const ai = generateInsights({ rows, byPath, rising, location: locationLabel(location), cdcLatest });

  return (
    <div className="fade-in">
      <div className="page-head">
        <div className="eyebrow">Surveillance · trends</div>
        <h1 className="page-title">Analytics</h1>
        <p className="page-sub hide-compact">
          Result trends across this account's GoDEVICEs — to catch community clusters early, support contact tracing,
          and follow an individual's history. Built from the same log the History tab shows.
        </p>
      </div>

      {rising && (
        <div className="epi-alert" style={{ marginBottom: 18 }}>
          <div className="epi-icon">📈</div>
          <div>
            <div className="epi-eyebrow">Surveillance signal · possible cluster</div>
            <div className="stat" style={{ fontSize: 17 }}>
              {pathogenName(rising.id)} detections up {rising.t.pct}% week-over-week
            </div>
            <div className="helper">
              {rising.t.recent} in the last 7 days vs {rising.t.prior} prior — possible community cluster. Consider
              proactive public-health notification and source tracing.
            </div>
          </div>
        </div>
      )}

      {/* AI bioinformatics insights across human · community · environment · public health */}
      <div className="panel panel-pad ai-panel" style={{ marginBottom: 18 }}>
        <div className="ai-head">
          <span className="ai-badge">✦ AI</span>
          <span className="ai-headline">{ai.headline}</span>
        </div>
        <div className="ai-grid">
          {ai.insights.map((ins) => (
            <div key={ins.domain} className={"ai-insight tone-" + ins.tone}>
              <div className="ai-domain"><span className="ai-glyph">{ins.glyph}</span>{ins.domain}</div>
              <div className="ai-text">{ins.text}</div>
            </div>
          ))}
        </div>
        <div className="helper ai-foot">
          AI-assisted synthesis of device results + live CDC data across human, community, environment &amp; public
          health — augmented by GoSEQ metagenomics (BugSEQ) for novel &amp; drug-resistant threats. Illustrative demo.
        </div>
      </div>

      <div className="grid grid-4 posture-strip">
        <Stat label="Total positives (28d)" value={String(totalPos)} />
        <Stat label="Resistant" value={String(resistant)} />
        <Stat label="Resistance rate" value={resistanceRate + "%"} />
        <Stat label="GoDEVICEs reporting" value={String(new Set(rows.map((r) => r.deviceSerial)).size)} />
      </div>

      <div className="grid grid-2" style={{ marginTop: 18, alignItems: "start" }}>
        <div className="panel panel-pad">
          <div className="section-label">Detections per day · {DAYS} days</div>
          <LineChart series={allSeries} overlay={topSeries} overlayLabel={topId ? pathogenName(topId) : ""} />
          <div className="chart-legend">
            <span><span className="lg-swatch" style={{ background: "var(--accent)" }} /> All positives</span>
            {topId && <span><span className="lg-swatch" style={{ background: "var(--amber)" }} /> {pathogenName(topId)}</span>}
          </div>
        </div>

        <div className="panel panel-pad">
          <div className="section-label">Positives by pathogen · 28 days</div>
          <BarChart data={byPath} />
        </div>
      </div>

      {/* Real national surveillance benchmark — CDC NNDSS */}
      <div className="section-label" style={{ marginTop: 24 }}>National surveillance benchmark · CDC NNDSS</div>
      <div className="panel panel-pad">
        <div className="helper" style={{ marginBottom: 10 }}>
          Real weekly confirmed cases · <b style={{ color: "var(--ink)" }}>{locationLabel(location)}</b> — compare your device
          detections against the {location === "US RESIDENTS" ? "national" : "local"} trend. CDC NNDSS is U.S.-only.
        </div>

        {/* Location: national / region / state (+ device location) */}
        <div className="loc-bar">
          <select className="field field-sans loc-select" value={location} onChange={(e) => setLocation(e.target.value)} aria-label="Surveillance location">
            <optgroup label="National">
              {NNDSS_LOCATIONS.national.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </optgroup>
            <optgroup label="Census regions">
              {NNDSS_LOCATIONS.regions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </optgroup>
            <optgroup label="States">
              {NNDSS_LOCATIONS.states.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </optgroup>
          </select>
          {deviceState && location !== deviceState && (
            <button className="press btn btn-ghost loc-device" onClick={() => setLocation(deviceState)}>📍 {locationLabel(deviceState)}</button>
          )}
          <span className={"chip " + (loading ? "" : live ? "chip-susceptible" : "")}>
            {loading ? "◍ loading…" : live ? "● LIVE · data.cdc.gov" : "◍ snapshot"}
          </span>
        </div>

        {/* Timeline duration navigation */}
        <div className="range-bar">
          <div className="range-toggle">
            {RANGES.map((r) => (
              <button
                key={r.weeks}
                className={"press range-opt" + (rangeWeeks === r.weeks ? " selected" : "")}
                onClick={() => setRangeWeeks(r.weeks)}
              >
                {r.label}
              </button>
            ))}
          </div>
          <span className="mono range-span">{spanLabel}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
          {natWindowed.map((row) => (
            <div key={row.id} className="nat-row">
              <div className="nat-name">{pathogenName(row.id)}</div>
              <div className="nat-spark"><Sparkline points={row.pts} /></div>
              <div className="nat-metric"><span className="stat accent" style={{ fontSize: 18 }}>{row.latest.toLocaleString()}</span><span className="helper">latest wk</span></div>
              <div className="nat-metric hide-compact"><span className="stat" style={{ fontSize: 18 }}>{row.total.toLocaleString()}</span><span className="helper">{rangeLabel} total</span></div>
            </div>
          ))}
        </div>
        <div className="helper" style={{ marginTop: 14 }}>
          Source: {nndss.source} · dataset {nndss.dataset} · {nndss.metric} · retrieved {new Date(nndss.fetchedAt).toLocaleDateString()}.
        </div>
      </div>

      <div className="helper" style={{ marginTop: 14 }}>
        Your GoDEVICE charts above use this session's runs plus seeded demo history; the national benchmark below is real
        CDC data. In production both are live.
      </div>
    </div>
  );
}

interface Pt {
  year: number;
  week: number;
  cases: number;
}

/** Interactive trend line — drag or hover to read the exact cases + week/date. */
function Sparkline({ points }: { points: Pt[] }) {
  const [idx, setIdx] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const W = 240;
  const H = 44;
  if (points.length < 2) return null;

  const max = Math.max(1, ...points.map((p) => p.cases));
  const xOf = (i: number) => (i / (points.length - 1)) * W;
  const yOf = (v: number) => H - (v / max) * (H - 8) - 4;
  const line = points.map((p, i) => `${xOf(i).toFixed(1)},${yOf(p.cases).toFixed(1)}`).join(" ");

  function locate(clientX: number) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const rel = (clientX - r.left) / r.width;
    setIdx(Math.max(0, Math.min(points.length - 1, Math.round(rel * (points.length - 1)))));
  }

  const active = idx != null ? points[idx] : null;
  const pct = idx != null ? (idx / (points.length - 1)) * 100 : 0;
  const dotTopPct = active ? (yOf(active.cases) / H) * 100 : 0;

  return (
    <div
      className="spark-wrap"
      ref={ref}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        locate(e.clientX);
      }}
      onPointerMove={(e) => {
        if (e.buttons || e.pointerType === "mouse") locate(e.clientX);
      }}
      onPointerUp={() => setIdx(null)}
      onPointerLeave={() => setIdx(null)}
    >
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" role="img" aria-label="Trend — drag to read values">
        <polyline points={line} fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      {active && (
        <>
          <div className="spark-marker" style={{ left: `${pct}%` }} />
          <div className="spark-dot" style={{ left: `${pct}%`, top: `${dotTopPct}%` }} />
          <div className={"spark-tip" + (pct > 78 ? " tip-left" : pct < 22 ? " tip-right" : "")} style={{ left: `${pct}%` }}>
            <b>{active.cases.toLocaleString()}</b> cases · wk ending {fmtWeekDate(active.year, active.week)}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="feature panel panel-pad" style={{ padding: "16px 18px" }}>
      <div className="stat accent" style={{ fontSize: 24 }}>{value}</div>
      <div className="helper">{label}</div>
    </div>
  );
}

function LineChart({ series, overlay, overlayLabel }: { series: number[]; overlay: number[]; overlayLabel: string }) {
  const [idx, setIdx] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const W = 520;
  const H = 160;
  const pad = 8;
  const n = series.length;
  const max = Math.max(2, ...series, ...overlay);
  const X = (i: number) => pad + (i / (n - 1)) * (W - pad * 2);
  const Y = (v: number) => H - pad - (v / max) * (H - pad * 2);
  const line = (arr: number[]) => arr.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");

  function locate(clientX: number) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const rel = (clientX - r.left) / r.width;
    setIdx(Math.max(0, Math.min(n - 1, Math.round(rel * (n - 1)))));
  }
  const dateOf = (i: number) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };
  const pct = idx != null ? (idx / (n - 1)) * 100 : 0;

  return (
    <div
      className="spark-wrap chart-wrap"
      ref={ref}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        locate(e.clientX);
      }}
      onPointerMove={(e) => {
        if (e.buttons || e.pointerType === "mouse") locate(e.clientX);
      }}
      onPointerUp={() => setIdx(null)}
      onPointerLeave={() => setIdx(null)}
    >
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" role="img" aria-label="Detections per day — drag to read">
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        <polyline points={line(series)} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {overlay.length > 0 && (
          <polyline points={line(overlay)} fill="none" stroke="var(--amber)" strokeWidth="2" strokeDasharray="4 3" strokeLinejoin="round" />
        )}
      </svg>
      {idx != null && (
        <>
          <div className="spark-marker" style={{ left: `${pct}%` }} />
          <div className="spark-dot" style={{ left: `${pct}%`, top: `${(Y(series[idx]) / H) * 100}%` }} />
          {overlay.length > 0 && <div className="spark-dot dot-amber" style={{ left: `${pct}%`, top: `${(Y(overlay[idx]) / H) * 100}%` }} />}
          <div className={"spark-tip" + (pct > 72 ? " tip-left" : pct < 20 ? " tip-right" : "")} style={{ left: `${pct}%`, top: "-6px" }}>
            {dateOf(idx)} · <b>{series[idx]}</b> positive{series[idx] === 1 ? "" : "s"}
            {overlay.length > 0 && ` · ${overlay[idx]} ${overlayLabel}`}
          </div>
        </>
      )}
    </div>
  );
}

function BarChart({ data }: { data: { id: string; name: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      {data.map((d) => (
        <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 108, fontSize: 12.5, color: "var(--ink-2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.name}</span>
          <div style={{ flex: 1, height: 18, background: "rgba(255,255,255,0.06)", borderRadius: 5, overflow: "hidden" }}>
            <div style={{ width: `${(d.count / max) * 100}%`, height: "100%", background: "linear-gradient(90deg,var(--accent-2),var(--accent))", borderRadius: 5 }} />
          </div>
          <span className="mono" style={{ width: 26, textAlign: "right", fontSize: 12.5, color: "var(--accent)" }}>{d.count}</span>
        </div>
      ))}
    </div>
  );
}
