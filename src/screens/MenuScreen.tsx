import { MATRICES, MATRIX_ORDER, PATHOGENS } from "../data/catalog";

const CAT_ACCENT: Record<string, string> = {
  "Environmental Surveillance": "var(--teal)",
  "GI Pathogens": "var(--accent)",
  "Urogenital & Viral": "#5b8def",
  Respiratory: "#8bd35a",
};

/** Full GoDx test menu: every sample matrix and the disease targets validated on it. */
export function MenuScreen() {
  return (
    <div className="fade-in">
      <div className="page-head">
        <div className="eyebrow">Reference · what this GoDEVICE can test</div>
        <h1 className="page-title">Test menu</h1>
        <p className="page-sub hide-compact">
          A read-only reference of the sample types and diseases this GoDEVICE is cleared to run — check here to see if a
          test is available before you insert a cartridge.
        </p>
      </div>

      <div className="panel panel-pad menu-legend">
        <div className="menu-legend-item">
          <span className="chip chip-accent">VALIDATED</span>
          <span className="helper">Completed analytical &amp; clinical validation on GoDEVICE — cleared to run today.</span>
        </div>
        <div className="menu-legend-item">
          <span className="chip chip-snp">SNP · AMR</span>
          <span className="helper">Also reports antibiotic resistance (which drugs won't work).</span>
        </div>
        <div className="menu-legend-item">
          <span className="mono genome-dsdna">dsDNA</span>
          <span className="genome-ssrna mono">ssRNA</span>
          <span className="helper">Genome type — bacterial vs. viral.</span>
        </div>
      </div>

      <div className="grid grid-2">
        {MATRIX_ORDER.map((id) => {
          const m = MATRICES[id];
          const accent = CAT_ACCENT[m.category] ?? "var(--accent)";
          return (
            <div key={id} className="panel panel-pad">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <div>
                  <div className="stat" style={{ fontSize: 20 }}>{m.name}</div>
                  <div className="mono" style={{ fontSize: 10, letterSpacing: "0.08em", color: accent, textTransform: "uppercase", marginTop: 4 }}>
                    {m.category}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {m.validated && <span className="chip chip-accent">VALIDATED</span>}
                </div>
              </div>
              {m.recovery && (
                <div className="helper" style={{ marginBottom: 12 }}>
                  {m.recovery} recovery · {m.recoveryTarget}
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                {m.panel.map((pid) => {
                  const p = PATHOGENS[pid];
                  return (
                    <div key={pid} className="result-target" style={{ padding: "10px 14px" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>{p.name}</span>
                          {p.snpAmr && <span className="chip chip-snp">SNP · AMR</span>}
                        </div>
                        <div className="helper">{p.disease}</div>
                      </div>
                      <div className={"mono " + (p.genome.startsWith("dsDNA") ? "genome-dsdna" : "genome-ssrna")} style={{ fontSize: 10.5, textAlign: "right" }}>
                        {p.genome}
                        <div style={{ color: "var(--muted-2)" }}>{p.idMarker}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
