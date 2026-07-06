import {
  SNP_ASSAYS,
  PATHOGENS,
  AMR_REFERENCE,
  type AssayStatus,
} from "../data/catalog";

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

/** AMR library: the candidate SNP-assay panel + Univ. of Iowa reference frequencies. */
export function AmrScreen() {
  return (
    <div className="fade-in">
      <div className="page-head">
        <div className="eyebrow">GoDETECT · Antimicrobial resistance</div>
        <h1 className="page-title">AMR library — SNP assays &amp; drug resistance</h1>
        <p className="page-sub">
          Resistance resolved at the SNP level. Each assay maps a point mutation to the antibiotic class it defeats, so
          GoDETECT pairs pathogen identity with the resistance markers that guide treatment at the point of care.
        </p>
      </div>

      <div className="section-label">Candidate SNP-detection panel</div>
      <div className="panel panel-pad" style={{ marginBottom: 26 }}>
        <table className="dtable">
          <thead>
            <tr>
              <th>Pathogen</th>
              <th>GoDx SNP detection</th>
              <th>Antibiotic class</th>
              <th>Resolves resistance to</th>
              <th style={{ textAlign: "right" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {SNP_ASSAYS.map((a) => (
              <tr key={a.id}>
                <td style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--ink)" }}>
                  {PATHOGENS[a.pathogen].name}
                </td>
                <td className="mono accent-val" style={{ fontSize: 12 }}>{a.detection}</td>
                <td>{a.antibioticClass}</td>
                <td style={{ color: "var(--muted)" }}>{a.drugs.join(", ")}</td>
                <td style={{ textAlign: "right" }}>
                  <span className="chip" style={{ gap: 6 }}>
                    <span className={"status-dot " + STATUS_DOT[a.status]} />
                    {STATUS_LABEL[a.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section-label">Genes most commonly associated with AMR — reference frequencies</div>
      <div className="grid grid-2">
        {(["salmonella", "campylobacter"] as const).map((pid) => {
          const ref = AMR_REFERENCE[pid];
          return (
            <div key={pid} className="panel panel-pad">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span className="stat" style={{ fontSize: 18 }}>{PATHOGENS[pid].name}</span>
                <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>n = {ref.n.toLocaleString()}</span>
              </div>
              <table className="dtable">
                <thead>
                  <tr>
                    <th>Gene</th>
                    <th>Type</th>
                    <th className="num">Count</th>
                    <th className="num">Freq.</th>
                    <th style={{ textAlign: "right" }}>Panel</th>
                  </tr>
                </thead>
                <tbody>
                  {ref.rows.map((r) => (
                    <tr key={r.gene} className={r.targeted ? "row-targeted" : ""}>
                      <td className="mono" style={{ color: r.targeted ? "var(--accent)" : "var(--ink-2)" }}>{r.gene}</td>
                      <td style={{ color: "var(--muted)" }}>{r.type}</td>
                      <td className="num">{r.count.toLocaleString()}</td>
                      <td className="num accent-val">{r.frequency}</td>
                      <td style={{ textAlign: "right" }}>
                        {r.targeted ? <span className="chip chip-accent">TARGETED</span> : <span className="helper">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
      <div className="helper" style={{ marginTop: 14 }}>
        Reference dataset: University of Iowa. Highlighted rows are markers on the GoDETECT SNP panel.
      </div>
    </div>
  );
}
