import { useEffect, useRef, useState } from "react";
import {
  APPS,
  MATRICES,
  PATHOGENS,
  SNP_ASSAYS,
  CLINICAL_PERFORMANCE,
  GOSEQ_KIT,
  GOSEQ_DOWNSTREAM,
  MNGS_EXAMPLE,
  makeScan,
} from "../data/catalog";
import { useSession, can } from "../store/session";
import { useDevice, activeDevice } from "../store/device";
import { summarize, clinicalReadout } from "../lib/format";
import { openDetectionReport } from "../lib/report";
import type { DetectResult } from "../engine/run";

export function ResultsScreen() {
  const { state, dispatch } = useSession();
  const { state: dev } = useDevice();
  const appId = state.appId!;
  const app = APPS[appId];

  // Record the run once (ref guard survives StrictMode's double-invoked effect).
  const recorded = useRef(false);
  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;
    const unit = activeDevice(dev);
    dispatch({
      type: "RECORD",
      record: {
        id: `${state.lot}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        appId,
        matrixId: state.matrixId,
        lot: state.lot ?? "LOT",
        sampleId: state.sampleId,
        when: Date.now(),
        summary: summarize(appId, state.result, state.matrixId),
        signed: false,
        operatorName: state.operator?.name ?? "—",
        location: unit.location?.label ?? unit.label,
        deviceSerial: unit.serial,
        pathogen: state.result?.positivePathogen ?? null,
        resistant: (state.result?.interpretation.avoid.length ?? 0) > 0,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fade-in">
      <div className="page-head results-head">
        <div>
          <div className="eyebrow">{app.tm} · Run complete</div>
          <h1 className="page-title">Results</h1>
          <p className="page-sub mono" style={{ fontSize: 12 }}>
            {state.lot} · sample {state.sampleId ?? "—"}
            {state.matrixId ? ` · ${MATRICES[state.matrixId].name}` : ""}
          </p>
        </div>
        <button className="press btn btn-ghost" onClick={() => dispatch({ type: "GO_HOME" })}>
          New cartridge
        </button>
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
  const { state, dispatch } = useSession();
  const { state: dev } = useDevice();

  function report() {
    const unit = activeDevice(dev);
    openDetectionReport({
      clinic: dev.clinic,
      device: { model: unit.model, serial: unit.serial, label: unit.label, locationLabel: unit.location?.label ?? unit.label },
      operatorName: state.operator?.name ?? "—",
      sampleId: state.sampleId,
      patientRef: state.patientRef,
      appId: state.appId ?? "godetect",
      matrixId: state.matrixId,
      result,
      signedBy: state.signedBy,
    });
  }
  const positive = result.positivePathogen ? PATHOGENS[result.positivePathogen] : null;
  const anyResistant = result.interpretation.calls.some((c) => c.susceptibility === "resistant");

  // QC gate: an invalid internal control means the result is not reportable.
  if (!result.controlValid) {
    return (
      <div className="fade-in">
        <div className="verdict verdict-resistant" style={{ marginBottom: 18 }}>
          <div className="verdict-icon" style={{ background: "rgba(255,107,107,0.18)" }}>⚠</div>
          <div>
            <div className="stat" style={{ fontSize: 20 }}>Invalid run — internal control failed</div>
            <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 3 }}>
              QC gating (CLIA §493.1256): results are not reportable. Repeat with a new cartridge.
            </div>
          </div>
        </div>
        <div className="panel panel-pad" style={{ maxWidth: 620 }}>
          <div className="kv"><span className="k">Internal control</span><span className="v" style={{ color: "var(--red)" }}>FAILED · {(result.controlSignal * 100).toFixed(0)}% (min 40%)</span></div>
          <div className="kv"><span className="k">Result status</span><span className="v">Suppressed · not reportable</span></div>
          <div className="kv"><span className="k">Sign-out</span><span className="v">Blocked until control valid</span></div>
          <button className="press btn btn-primary" style={{ marginTop: 16, width: "100%" }} onClick={() => dispatch({ type: "GO_HOME" })}>
            ↻ Repeat test with new cartridge
          </button>
        </div>
      </div>
    );
  }

  const readout = clinicalReadout(result);

  return (
    <>
      {/* Direct, actionable readout — no interpretation required */}
      <div className={"action-banner tone-" + readout.tone}>
        <div className="action-result">{readout.result}</div>
        <div className="action-line">
          <span className="ra-label">ACTION</span>
          {readout.action}
        </div>
      </div>

      <div className="results-grid">
      <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
        <div className={"verdict " + (positive ? "verdict-positive" : "")}>
          <div className="verdict-icon" style={{ background: positive ? "rgba(53,204,230,0.18)" : "rgba(255,255,255,0.06)" }}>
            {positive ? "🧫" : "○"}
          </div>
          <div>
            <div className="stat" style={{ fontSize: 21 }}>
              {positive ? `${positive.name} detected` : "No target pathogen detected"}
            </div>
            <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 3 }}>
              {positive ? `${positive.disease} · ID marker ${positive.idMarker}` : "All panel targets below threshold"}
              {environmental && " · logged to surveillance"}
            </div>
          </div>
          <span className="chip chip-susceptible qc-chip">CONTROL VALID</span>
        </div>

        <div className="panel panel-pad">
          <div className="section-label">Pathogen panel — lateral-flow readout</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {result.targets.map((t) => (
              <div key={t.pathogenId} className={"result-target" + (t.detected ? " hit" : "")}>
                <div style={{ minWidth: 130 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>{t.name}</div>
                  <div className="helper mono">{t.idMarker}</div>
                </div>
                <div className="lfa hide-compact" style={{ flex: 1 }}>
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

        {result.snps.length > 0 && (
          <div className="panel panel-pad table-wrap">
            <div className="section-label">AMR SNP calls · {positive?.name}</div>
            <table className="dtable">
              <thead>
                <tr>
                  <th>Marker</th>
                  <th className="hide-compact">Gene</th>
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
                      <td className="mono hide-compact">{s.gene}</td>
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

      {/* RIGHT: interpretation + sign-out */}
      <div className="results-rail">
        <div className={"panel panel-pad " + (anyResistant ? "verdict-resistant" : "feature")}>
          <div className="section-label">Treatment interpretation</div>
          <div className="stat" style={{ fontSize: 16, lineHeight: 1.3, marginBottom: 14 }}>
            {result.interpretation.headline}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {result.interpretation.calls.map((c) => (
              <div key={c.antibioticClass} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13.5 }}>{c.antibioticClass}</span>
                <span className={"chip " + (c.susceptibility === "resistant" ? "chip-resistant" : "chip-susceptible")}>
                  {c.susceptibility === "resistant" ? "RESISTANT" : "NO RESISTANCE"}
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
        </div>

        {/* Review & electronic sign-out (21 CFR Part 11 / CLIA) */}
        <div className="panel panel-pad">
          <div className="section-label">Review &amp; sign-out</div>
          {state.signedOut ? (
            <>
              <div className="signed-box">
                <div className="verdict-icon" style={{ background: "rgba(70,211,154,0.18)", width: 40, height: 40, fontSize: 18 }}>✓</div>
                <div>
                  <div className="stat" style={{ fontSize: 15 }}>Signed out</div>
                  <div className="helper">{state.signedBy} · {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
              </div>
              <EmrSend />
            </>
          ) : can(state, "sign_out") ? (
            <>
              <div className="helper" style={{ marginBottom: 12 }}>
                {state.operator?.name} attests this result was reviewed. The signature is bound in the audit log.
              </div>
              <button className="press btn btn-primary" style={{ width: "100%" }} onClick={() => dispatch({ type: "SIGN_RESULT" })}>
                ✎ Review &amp; sign out
              </button>
            </>
          ) : (
            <div className="helper">Your role ({state.operator?.role}) cannot sign out results. A clinician or lab technician must review.</div>
          )}
          <button className="press btn btn-ghost" style={{ width: "100%", marginTop: 10 }} onClick={report}>
            ⤓ Report (PDF)
          </button>
        </div>

        {positive && (
          <div className="panel panel-pad hide-compact">
            <div className="section-label">Assay performance · illustrative</div>
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
          </div>
        )}
      </div>
      </div>
    </>
  );
}

function EmrSend() {
  const { dispatch } = useSession();
  const { state: dev } = useDevice();
  const [sent, setSent] = useState(false);
  if (!dev.integrations.emr) return null;
  return (
    <div style={{ marginTop: 12 }}>
      {sent ? (
        <div className="helper" style={{ color: "var(--green)" }}>✓ Sent to EMR as a FHIR DiagnosticReport.</div>
      ) : (
        <button
          className="press btn btn-ghost"
          style={{ width: "100%" }}
          onClick={() => {
            dispatch({ type: "EMR_SENT", target: "EMR (FHIR R4)" });
            setSent(true);
          }}
        >
          ⇪ Send to EMR (FHIR)
        </button>
      )}
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
    <div className="results-grid">
      <div className="panel panel-pad">
        <div className="verdict verdict-positive" style={{ marginBottom: 18 }}>
          <div className="verdict-icon" style={{ background: "rgba(53,204,230,0.18)" }}>🧪</div>
          <div>
            <div className="stat" style={{ fontSize: 21 }}>Purified nucleic acid eluted</div>
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
          Magnetic-bead chemistry: lysis → capture → wash → elution. Recovery figures are illustrative demo values.
        </div>
      </div>
      <div className="panel panel-pad results-rail">
        <div className="section-label">Next step — route the eluate</div>
        <p className="helper" style={{ marginBottom: 14 }}>
          Load the purified NA tube into a GoDETECT or GoSEQ cartridge to continue.
        </p>
        <button
          className="press btn"
          style={{ justifyContent: "flex-start" }}
          onClick={() => dispatch({ type: "SCAN_CARTRIDGE", ...makeScan("godetect"), sampleId: state.sampleId ?? undefined, matrixId: state.matrixId ?? undefined })}
        >
          → GoDETECT · pathogen + AMR
        </button>
        <button
          className="press btn"
          style={{ justifyContent: "flex-start" }}
          onClick={() => dispatch({ type: "SCAN_CARTRIDGE", ...makeScan("goseq"), sampleId: state.sampleId ?? undefined })}
        >
          → GoSEQ · mNGS library prep
        </button>
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
    <div className="results-grid">
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

      <div className="panel panel-pad table-wrap">
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
              <PerfStat label="on-target" value={MNGS_EXAMPLE.onTargetAssembled} />
              <PerfStat label="to library" value={GOSEQ_KIT.timeToLibrary} />
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
