import { useEffect, useRef } from "react";
import {
  APPS,
  MATRICES,
  PATHOGENS,
  SNP_ASSAYS,
  CLINICAL_PERFORMANCE,
  GOSEQ_KIT,
  GOSEQ_DOWNSTREAM,
  MNGS_EXAMPLE,
} from "../data/catalog";
import { useSession } from "../store/session";
import type { DetectResult } from "../engine/run";

export function ResultsScreen() {
  const { state, dispatch } = useSession();
  const appId = state.appId!;
  const app = APPS[appId];

  // Record the run once. Ref guard survives StrictMode's double-invoked effect
  // so a single run never produces duplicate history entries.
  const recorded = useRef(false);
  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;
    const summary = summarize(appId, state.result, state.matrixId);
    dispatch({
      type: "RECORD",
      record: {
        id: `${state.lot}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        appId,
        matrixId: state.matrixId,
        lot: state.lot ?? "LOT",
        when: Date.now(),
        summary,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fade-in">
      <div className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20 }}>
        <div>
          <div className="eyebrow">{app.tm} · Run complete</div>
          <h1 className="page-title">Results</h1>
          <p className="page-sub mono" style={{ fontSize: 12 }}>
            {state.lot} {state.matrixId ? `· ${MATRICES[state.matrixId].name}` : "· raw sample"}
          </p>
        </div>
        <div className="btn-row">
          <button className="press btn btn-ghost" onClick={() => dispatch({ type: "GO_HOME" })}>
            New cartridge
          </button>
        </div>
      </div>

      {appId === "goprep" && <PrepResults />}
      {(appId === "godetect" || appId === "goh2o") && state.result && (
        <DetectResults result={state.result} environmental={appId === "goh2o"} />
      )}
      {appId === "goseq" && <SeqResults />}
    </div>
  );
}

/* ---------- GoDETECT / GoH2O ---------- */

function DetectResults({ result, environmental }: { result: DetectResult; environmental: boolean }) {
  const positive = result.positivePathogen ? PATHOGENS[result.positivePathogen] : null;
  const anyResistant = result.interpretation.calls.some((c) => c.susceptibility === "resistant");
  const detectedSnps = result.snps.filter((s) => s.detected);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Verdict */}
        <div className={"verdict " + (positive ? "verdict-positive" : "")}>
          <div className="verdict-icon" style={{ background: positive ? "rgba(53,204,230,0.18)" : "rgba(255,255,255,0.06)" }}>
            {positive ? "🧫" : "○"}
          </div>
          <div>
            <div className="stat" style={{ fontSize: 22 }}>
              {positive ? `${positive.name} detected` : "No target pathogen detected"}
            </div>
            <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 3 }}>
              {positive ? `${positive.disease} · ID marker ${positive.idMarker}` : "All panel targets below threshold"}
              {environmental && " · logged to surveillance"}
            </div>
          </div>
        </div>

        {/* Target panel readout */}
        <div className="panel panel-pad">
          <div className="section-label">Pathogen panel — lateral-flow readout</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {result.targets.map((t) => (
              <div key={t.pathogenId} className={"result-target" + (t.detected ? " hit" : "")}>
                <div style={{ minWidth: 150 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>{t.name}</div>
                  <div className="helper mono">{t.idMarker}</div>
                </div>
                <div className="lfa" style={{ flex: 1 }}>
                  <div className="lfa-band control" />
                  {t.detected && <div className="lfa-band test" />}
                </div>
                <span className={"chip " + (t.detected ? "chip-accent" : "chip-dev")} style={{ minWidth: 78, justifyContent: "center" }}>
                  {t.detected ? "DETECTED" : "not detected"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* AMR SNP calls */}
        {result.snps.length > 0 && (
          <div className="panel panel-pad">
            <div className="section-label">AMR SNP calls · {positive?.name}</div>
            <table className="dtable">
              <thead>
                <tr>
                  <th>Marker</th>
                  <th>Gene</th>
                  <th>Antibiotic class</th>
                  <th style={{ textAlign: "right" }}>Call</th>
                </tr>
              </thead>
              <tbody>
                {result.snps.map((s) => {
                  const assay = SNP_ASSAYS.find((a) => a.id === s.assayId)!;
                  return (
                    <tr key={s.assayId} className={s.detected ? "row-targeted" : ""}>
                      <td className="mono accent-val">{s.label}</td>
                      <td className="mono">{s.gene}</td>
                      <td>{assay.antibioticClass}</td>
                      <td style={{ textAlign: "right" }}>
                        <span className={"chip " + (s.detected ? "chip-resistant" : "chip-susceptible")}>
                          {s.detected ? "MUTATION +" : "wild-type"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RIGHT: interpretation */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 0 }}>
        <div className={"panel panel-pad " + (anyResistant ? "verdict-resistant" : "feature")}>
          <div className="section-label">Treatment interpretation</div>
          <div className="stat" style={{ fontSize: 17, lineHeight: 1.3, marginBottom: 14 }}>
            {result.interpretation.headline}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {result.interpretation.calls.map((c) => (
              <div key={c.antibioticClass} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13.5 }}>{c.antibioticClass}</span>
                <span className={"chip " + (c.susceptibility === "resistant" ? "chip-resistant" : "chip-susceptible")}>
                  {c.susceptibility.toUpperCase()}
                </span>
              </div>
            ))}
          </div>

          {result.interpretation.avoid.length > 0 && (
            <>
              <div className="divider" />
              <div className="helper" style={{ marginBottom: 6, color: "var(--red)" }}>AVOID</div>
              <div className="pill-key">
                {result.interpretation.avoid.map((d) => (
                  <span key={d} className="chip chip-resistant">{d}</span>
                ))}
              </div>
            </>
          )}
          {result.interpretation.consider.length > 0 && (
            <>
              <div className="helper" style={{ margin: "12px 0 6px", color: "var(--green)" }}>CONSIDER</div>
              <div className="pill-key">
                {result.interpretation.consider.map((d) => (
                  <span key={d} className="chip chip-susceptible">{d}</span>
                ))}
              </div>
            </>
          )}
          {detectedSnps.length === 0 && positive && (
            <div className="helper" style={{ marginTop: 12 }}>
              No resistance markers found for {positive.name}. First-line therapy expected to be effective; confirm per
              local antibiogram.
            </div>
          )}
        </div>

        {positive && (
          <div className="panel panel-pad">
            <div className="section-label">Assay performance · vs culture</div>
            {(() => {
              const perf = CLINICAL_PERFORMANCE.find((p) => p.pathogen === positive.name);
              if (!perf) return <div className="helper">Reference performance not catalogued for this target.</div>;
              return (
                <div className="grid grid-2" style={{ gap: 10 }}>
                  <PerfStat label="Sensitivity" value={perf.sens} />
                  <PerfStat label="Specificity" value={perf.spec} />
                  <PerfStat label="PPV" value={perf.ppv} />
                  <PerfStat label="NPV" value={perf.npv} />
                </div>
              );
            })()}
            <div className="helper" style={{ marginTop: 12 }}>
              For research / demo use. Values from internal contrived + clinical studies.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PerfStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px" }}>
      <div className="stat accent" style={{ fontSize: 22 }}>{value}</div>
      <div className="helper">{label}</div>
    </div>
  );
}

/* ---------- GoPREP ---------- */

function PrepResults() {
  const { state, dispatch } = useSession();
  const matrix = state.matrixId ? MATRICES[state.matrixId] : null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 20, alignItems: "start" }}>
      <div className="panel panel-pad">
        <div className="verdict verdict-positive" style={{ marginBottom: 18 }}>
          <div className="verdict-icon" style={{ background: "rgba(53,204,230,0.18)" }}>🧪</div>
          <div>
            <div className="stat" style={{ fontSize: 22 }}>Purified nucleic acid eluted</div>
            <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 3 }}>
              Detachable NA tube ready for downstream detection or sequencing.
            </div>
          </div>
        </div>
        <div className="grid grid-2" style={{ gap: 10 }}>
          <PerfStat label={matrix?.recoveryTarget ?? "Recovery"} value={matrix?.recovery ?? "—"} />
          <PerfStat label="No-template control" value="<0.1%" />
        </div>
        <div className="helper" style={{ marginTop: 14 }}>
          Magnetic-bead chemistry: lysis → capture → wash → elution, identical across matrices. Recovery relative to
          1×10³ CFU/mL positive control (qPCR).
        </div>
      </div>
      <div className="panel panel-pad">
        <div className="section-label">Next step — route the eluate</div>
        <p className="helper" style={{ marginBottom: 14 }}>
          Load the purified NA tube into a GoDETECT or GoSEQ cartridge to continue the workflow.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            className="press btn"
            style={{ justifyContent: "flex-start" }}
            onClick={() => dispatch({ type: "SCAN_CARTRIDGE", appId: "godetect", lot: "GODX-DTCT-" + Math.floor(1000 + Math.random() * 9000) })}
          >
            → GoDETECT · pathogen + AMR
          </button>
          <button
            className="press btn"
            style={{ justifyContent: "flex-start" }}
            onClick={() => dispatch({ type: "SCAN_CARTRIDGE", appId: "goseq", lot: "GODX-SEQ-" + Math.floor(1000 + Math.random() * 9000) })}
          >
            → GoSEQ · mNGS library prep
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- GoSEQ ---------- */

function SeqResults() {
  const { state, dispatch } = useSession();
  const step = state.seqStep;
  const atReport = step >= GOSEQ_DOWNSTREAM.length - 1;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "0.85fr 1.15fr", gap: 20, alignItems: "start" }}>
      {/* Downstream stepper */}
      <div className="panel panel-pad">
        <div className="verdict verdict-positive" style={{ marginBottom: 16 }}>
          <div className="verdict-icon" style={{ background: "rgba(53,204,230,0.18)" }}>🧬</div>
          <div>
            <div className="stat" style={{ fontSize: 19 }}>Library ready</div>
            <div className="helper">{GOSEQ_KIT.timeToLibrary} · SPRI library eluted</div>
          </div>
        </div>
        <div className="section-label">Transfer to flow cell → results</div>
        <div className="steps">
          {GOSEQ_DOWNSTREAM.map((s, i) => (
            <div key={s.key} className={"step" + (i < step ? " done" : i === step ? " active" : "")}>
              <div className="step-num">{i < step ? "✓" : String(i + 1).padStart(2, "0")}</div>
              <div>
                <div className="step-label">{s.label}</div>
                {i === step && <div className="step-detail">{s.detail}</div>}
              </div>
            </div>
          ))}
        </div>
        <div className="btn-row" style={{ marginTop: 16 }}>
          {!atReport ? (
            <button className="press btn btn-primary" onClick={() => dispatch({ type: "SET_SEQ_STEP", step: step + 1 })}>
              Advance →
            </button>
          ) : (
            <span className="chip chip-accent">Report ready in {GOSEQ_KIT.bioinformatics}</span>
          )}
          {step > 0 && (
            <button className="press btn btn-ghost" onClick={() => dispatch({ type: "SET_SEQ_STEP", step: step - 1 })}>
              Back
            </button>
          )}
        </div>
      </div>

      {/* BugSEQ classification */}
      <div className="panel panel-pad">
        <div className="section-label">
          {atReport ? `${GOSEQ_KIT.bioinformatics} — metagenomic classification` : "Awaiting sequencing output"}
        </div>
        {atReport ? (
          <div className="fade-in">
            <table className="dtable">
              <thead>
                <tr>
                  <th>Organism</th>
                  <th className="num">Reads</th>
                  <th className="num">% total</th>
                </tr>
              </thead>
              <tbody>
                {MNGS_EXAMPLE.rows.map((r) => (
                  <tr key={r.organism} className={r.spiked ? "row-targeted" : ""}>
                    <td style={{ fontStyle: "italic" }}>{r.organism}</td>
                    <td className="num">{r.reads.toLocaleString()}</td>
                    <td className="num accent-val">{r.pctTotal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="divider" />
            <div className="grid grid-3" style={{ gap: 10 }}>
              <PerfStat label="total reads" value={MNGS_EXAMPLE.totalReads.toLocaleString()} />
              <PerfStat label="assembled on-target" value={MNGS_EXAMPLE.onTargetAssembled} />
              <PerfStat label="sample-to-library" value={GOSEQ_KIT.timeToLibrary} />
            </div>
            <div className="helper" style={{ marginTop: 12 }}>
              Agnostic sequencing sees everything in the sample — including novel and drug-resistant organisms no
              targeted panel can. Classification + AMR screening via {GOSEQ_KIT.bioinformatics}.
            </div>
          </div>
        ) : (
          <div className="empty">
            <div className="ring" style={{ width: 64, height: 64 }} />
            <div>Advance the workflow to load the flow cell and stream reads to {GOSEQ_KIT.compute}.</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function summarize(appId: string, result: DetectResult | null, matrixId: string | null): string {
  if (appId === "goprep") return `Purified NA · ${matrixId ? MATRICES[matrixId].name : "sample"}`;
  if (appId === "goseq") return "Library ready → BugSEQ";
  if (result) {
    if (!result.positivePathogen) return "No target detected";
    const name = PATHOGENS[result.positivePathogen].name;
    const resistant = result.interpretation.avoid.length > 0;
    return `${name} +${resistant ? ` · resists ${result.interpretation.avoid.length} drug(s)` : " · susceptible"}`;
  }
  return "Run complete";
}
