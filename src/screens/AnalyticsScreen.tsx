import { useState } from "react";
import { useSession } from "../store/session";
import { unifiedHistory, dailySeries, byPathogen, trend, pathogenName } from "../lib/history";
import { useNndss, nndssTotals } from "../lib/nndss";

const DAYS = 28;
const RANGES = [
  { label: "12 wk", weeks: 12 },
  { label: "26 wk", weeks: 26 },
  { label: "52 wk", weeks: 52 },
  { label: "2 yr", weeks: 104 },
];

/** Analytics — result trends over time for proactive surveillance. */
export function AnalyticsScreen() {
  const { state } = useSession();
  const rows = unifiedHistory(state.history);
  const { data: nndss, live } = useNndss();
  const nat = nndssTotals(nndss);
  const [rangeWeeks, setRangeWeeks] = useState(104);
  const rangeLabel = RANGES.find((r) => r.weeks === rangeWeeks)?.label ?? "";
  // Window each pathogen's series to the selected duration.
  const natWindowed = nat.map((row) => {
    const pts = row.points.slice(-rangeWeeks);
    return { ...row, pts, latest: pts.length ? pts[pts.length - 1].cases : 0, total: pts.reduce((s, p) => s + p.cases, 0) };
  });
  const span = natWindowed[0]?.pts ?? [];
  const spanLabel = span.length ? `W${span[0].week} ${span[0].year} – W${span[span.length - 1].week} ${span[span.length - 1].year}` : "";

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
        <div className="verdict verdict-resistant alert-banner" style={{ marginBottom: 18 }}>
          <div className="verdict-icon" style={{ background: "rgba(242,178,92,0.18)" }}>▲</div>
          <div>
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
          <div className="helper">
            Real U.S. weekly confirmed cases · {nndss.region} — compare your device detections against the national trend.
          </div>
          <span className={"chip " + (live ? "chip-susceptible" : "")}>
            {live ? "● LIVE · data.cdc.gov" : "◍ snapshot"}
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
              <div className="nat-spark"><Sparkline values={row.pts.map((p) => p.cases)} /></div>
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

function Sparkline({ values }: { values: number[] }) {
  const W = 240;
  const H = 34;
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const pts = values
    .map((v, i) => `${((i / (values.length - 1)) * W).toFixed(1)},${(H - (v / max) * (H - 3) - 1.5).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" role="img" aria-label="52-week trend">
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
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
  const W = 520;
  const H = 160;
  const pad = 8;
  const max = Math.max(2, ...series, ...overlay);
  const pts = (arr: number[]) =>
    arr
      .map((v, i) => {
        const x = pad + (i / (arr.length - 1)) * (W - pad * 2);
        const y = H - pad - (v / max) * (H - pad * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="160" preserveAspectRatio="none" role="img" aria-label={`Detections per day, ${overlayLabel} overlaid`}>
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      <polyline points={pts(series)} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {overlay.length > 0 && (
        <polyline points={pts(overlay)} fill="none" stroke="var(--amber)" strokeWidth="2" strokeDasharray="4 3" strokeLinejoin="round" />
      )}
    </svg>
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
