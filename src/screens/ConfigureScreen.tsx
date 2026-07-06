import { useState } from "react";
import {
  APPS,
  MATRICES,
  MATRIX_ORDER,
  ROADMAP_MATRICES,
  PATHOGENS,
  SNP_ASSAYS,
  GOSEQ_KIT,
  type AssayStatus,
} from "../data/catalog";
import { useSession, can } from "../store/session";
import { CartridgeCard } from "../components/Cartridge";

const STATUS_LABEL: Record<AssayStatus, string> = {
  available: "Available",
  in_development: "In development",
  in_consideration: "In consideration",
};
const STATUS_DOT: Record<AssayStatus, string> = {
  available: "dot-available",
  in_development: "dot-dev",
  in_consideration: "dot-consider",
};

export function ConfigureScreen() {
  const { state, dispatch } = useSession();
  const appId = state.appId!;
  const app = APPS[appId];
  const isSeq = appId === "goseq";
  const matrix = state.matrixId ? MATRICES[state.matrixId] : null;

  const [sid, setSid] = useState(state.sampleId ?? "");
  const [pref, setPref] = useState(state.patientRef ?? "");

  const hasSample = sid.trim().length > 0;
  const canRun = can(state, "run") && hasSample && (isSeq || Boolean(state.matrixId));

  function scanSample() {
    // One tap = accession the sample (barcode-driven, GeneXpert/Liat convention).
    const id = `ACC-${Math.floor(100000 + Math.random() * 899999)}`;
    setSid(id);
  }

  function start() {
    dispatch({ type: "SET_SAMPLE", sampleId: sid.trim(), patientRef: pref.trim() || null });
    dispatch({ type: "START_RUN" });
  }

  return (
    <div className="fade-in">
      <div className="page-head">
        <div className="eyebrow">{app.tm} · Cartridge loaded</div>
        <h1 className="page-title">{isSeq ? "Accession &amp; set up library prep" : "Accession the sample"}</h1>
        <p className="page-sub hide-compact">{app.description}</p>
      </div>

      <div className="cfg-grid">
        {/* LEFT: configuration */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
          {/* Step 1 — Sample accession (minimal PHI) */}
          <div>
            <div className="section-label">1 · Sample ID <span className="req">required</span></div>
            <div className="panel panel-pad">
              <div className="accession-row">
                <input
                  className="field"
                  placeholder="Scan or enter Sample / Accession ID"
                  value={sid}
                  onChange={(e) => setSid(e.target.value)}
                  aria-label="Sample or Accession ID"
                  inputMode="text"
                />
                <button className="press btn btn-ghost scan-btn" onClick={scanSample}>
                  ⧉ Scan
                </button>
              </div>
              <details className="phi-details">
                <summary>
                  Add patient reference <span className="chip chip-snp" style={{ marginLeft: 6 }}>PHI · optional</span>
                </summary>
                <input
                  className="field"
                  style={{ marginTop: 10 }}
                  placeholder="Patient reference (MRN / initials)"
                  value={pref}
                  onChange={(e) => setPref(e.target.value)}
                  aria-label="Patient reference"
                />
                <div className="helper" style={{ marginTop: 8 }}>
                  Minimum-necessary only. Stays on this device; never transmitted or written to storage.
                </div>
              </details>
            </div>
          </div>

          {isSeq ? (
            <div>
              <div className="section-label">2 · Library prep</div>
              <SeqSetup />
            </div>
          ) : (
            <>
              <div>
                <div className="section-label">2 · Sample matrix</div>
                <div className="grid grid-2">
                  {MATRIX_ORDER.map((id) => {
                    const m = MATRICES[id];
                    const selected = state.matrixId === id;
                    return (
                      <button
                        key={id}
                        className={"press tile" + (selected ? " selected" : "")}
                        onClick={() => dispatch({ type: "SELECT_MATRIX", matrixId: id })}
                      >
                        <div className="tile-meta">{m.category}</div>
                        <div className="tile-title">{m.name}</div>
                        <div className="tile-desc hide-compact">{m.swab}</div>
                        <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                          {m.validated && <span className="chip chip-accent">VALIDATED</span>}
                          {m.recovery && <span className="chip">{m.recovery} recovery</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="roadmap-row hide-compact">
                  <span className="helper">On the roadmap:</span>
                  {ROADMAP_MATRICES.map((r) => (
                    <span key={r} className="chip chip-dev">
                      {r}
                    </span>
                  ))}
                </div>
              </div>

              {matrix && <TargetPanel appId={appId} matrixId={matrix.id} />}
            </>
          )}
        </div>

        {/* RIGHT: run summary rail */}
        <div className="cfg-rail">
          <div className="panel panel-pad">
            <div className="section-label">Run summary</div>
            <CartridgeCard appId={appId} lot={state.lot!} />
            <div style={{ marginTop: 16 }}>
              <div className="kv">
                <span className="k">Operator</span>
                <span className="v">{state.operator?.initials ?? "—"}</span>
              </div>
              <div className="kv">
                <span className="k">Sample ID</span>
                <span className="v mono">{sid.trim() || "— required —"}</span>
              </div>
              <div className="kv">
                <span className="k">Sample</span>
                <span className="v">{isSeq ? "Raw / agnostic" : matrix ? matrix.name : "— select —"}</span>
              </div>
              <div className="kv">
                <span className="k">Est. time</span>
                <span className="v">{isSeq ? "<40 min" : appId === "godetect" ? "10–20 min" : "~25 min"}</span>
              </div>
            </div>
          </div>

          <button className="press btn btn-primary run-btn" disabled={!canRun} onClick={start}>
            ▶ Start {app.name} run
          </button>
          <button className="press btn btn-ghost" onClick={() => dispatch({ type: "GO_HOME" })}>
            Eject cartridge
          </button>
          {!canRun && (
            <div className="helper" style={{ textAlign: "center" }}>
              {!can(state, "run")
                ? "Your role cannot start runs."
                : !hasSample
                ? "Scan a Sample ID to enable the run."
                : "Select a sample type to enable the run."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TargetPanel({ appId, matrixId }: { appId: string; matrixId: string }) {
  const matrix = MATRICES[matrixId];
  const panel = matrix.panel.map((id) => PATHOGENS[id]);
  const showAmr = appId === "godetect";
  const amrAssays = showAmr ? SNP_ASSAYS.filter((a) => matrix.panel.includes(a.pathogen)) : [];

  return (
    <div className="fade-in hide-compact">
      <div className="section-label">
        {showAmr ? "3 · Targets on this cartridge — pathogen ID + AMR" : "Pathogen targets captured"}
      </div>
      <div className="panel panel-pad table-wrap">
        <table className="dtable">
          <thead>
            <tr>
              <th>Pathogen</th>
              <th>Disease</th>
              <th>ID marker</th>
              <th>Genome</th>
              <th style={{ textAlign: "right" }}>AMR</th>
            </tr>
          </thead>
          <tbody>
            {panel.map((p) => (
              <tr key={p.id}>
                <td style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--ink)" }}>{p.name}</td>
                <td style={{ color: "var(--muted)" }}>{p.disease}</td>
                <td className="mono">{p.idMarker ?? "—"}</td>
                <td className={"mono " + (p.genome.startsWith("dsDNA") ? "genome-dsdna" : "genome-ssrna")} style={{ fontSize: 11 }}>
                  {p.genome}
                </td>
                <td style={{ textAlign: "right" }}>
                  {p.snpAmr ? <span className="chip chip-snp">SNP · AMR</span> : <span className="helper">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAmr && amrAssays.length > 0 && (
        <>
          <div className="section-label" style={{ marginTop: 22 }}>
            AMR SNP assays interrogated
          </div>
          <div className="grid grid-2">
            {amrAssays.map((a) => (
              <div key={a.id} className="panel panel-pad" style={{ padding: "16px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15 }}>
                      {PATHOGENS[a.pathogen].name}
                    </div>
                    <div className="mono" style={{ color: "var(--accent)", fontSize: 12.5, marginTop: 3 }}>
                      {a.label}
                    </div>
                  </div>
                  <span className="chip" style={{ gap: 6 }}>
                    <span className={"status-dot " + STATUS_DOT[a.status]} />
                    {STATUS_LABEL[a.status]}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  <span className="chip chip-accent">{a.antibioticClass}</span>
                  {a.frequency && <span className="chip">{a.frequency} ref. freq.</span>}
                </div>
                <div className="helper" style={{ marginTop: 10 }}>
                  {a.note} Resolves susceptibility to {a.drugs.join(", ")}.
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SeqSetup() {
  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="panel panel-pad">
        <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.55, margin: "0 0 14px" }}>
          GoSEQ takes a single <b>raw, unpurified, agnostic</b> sample end-to-end in a sealed cartridge — no target
          panel. Lysis → cleanup → SPRI library runs automatically, then transfers to the flow cell.
        </p>
        <div className="grid grid-2 hide-compact">
          <div className="kv"><span className="k">Sequencer</span><span className="v">{GOSEQ_KIT.sequencer}</span></div>
          <div className="kv"><span className="k">Classifier</span><span className="v">{GOSEQ_KIT.bioinformatics}</span></div>
        </div>
      </div>
      <div className="feature panel panel-pad">
        <div style={{ display: "flex", gap: 30, flexWrap: "wrap" }}>
          <div>
            <div className="stat accent" style={{ fontSize: 28 }}>{GOSEQ_KIT.timeToLibrary}</div>
            <div className="helper">Sample-to-library</div>
          </div>
          <div>
            <div className="stat accent" style={{ fontSize: 28 }}>{GOSEQ_KIT.onTarget}</div>
            <div className="helper">on-target</div>
          </div>
        </div>
      </div>
    </div>
  );
}
