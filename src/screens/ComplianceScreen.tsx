import { CONTROLS, IVD_REFERENCES, SOFTWARE, type ControlItem } from "../data/compliance";

/** Honest compliance posture: which safeguards are enforced in-app vs. operational. */
export function ComplianceScreen() {
  const appControls = CONTROLS.filter((c) => c.layer === "app");
  const opsControls = CONTROLS.filter((c) => c.layer === "ops");
  return (
    <div className="fade-in">
      <div className="page-head">
        <div className="eyebrow">Security &amp; compliance posture</div>
        <h1 className="page-title">Compliance</h1>
        <p className="page-sub">
          HIPAA and CMMC are organizational certifications — software cannot self-certify. GoCARE <b>implements and
          evidences</b> the technical safeguards those frameworks require. Each control below is marked as enforced
          in-app or dependent on deployment infrastructure.
        </p>
      </div>

      <div className="grid grid-4 posture-strip">
        <Posture label="Access control" value="Enforced" />
        <Posture label="Auto sign-out" value={`${Math.round(SOFTWARE.sessionLockMs / 60000)} min`} />
        <Posture label="Audit logging" value="On" />
        <Posture label="PHI at rest" value="None" />
      </div>

      <div className="section-label" style={{ marginTop: 22 }}>Enforced in this application</div>
      <div className="grid grid-2">
        {appControls.map((c) => (
          <ControlCard key={c.id} c={c} />
        ))}
      </div>

      <div className="section-label" style={{ marginTop: 22 }}>Requires deployment infrastructure</div>
      <div className="grid grid-2">
        {opsControls.map((c) => (
          <ControlCard key={c.id} c={c} />
        ))}
      </div>

      <div className="section-label" style={{ marginTop: 22 }}>Workflow cross-referenced against POC/IVD systems</div>
      <div className="panel panel-pad table-wrap">
        <table className="dtable">
          <thead>
            <tr>
              <th>System</th>
              <th>Workflow convention adopted</th>
            </tr>
          </thead>
          <tbody>
            {IVD_REFERENCES.map((r) => (
              <tr key={r.system}>
                <td style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>{r.system}</td>
                <td className="helper">{r.convention}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="helper" style={{ marginTop: 16 }}>
        {SOFTWARE.name} v{SOFTWARE.version} · {SOFTWARE.build} · UDI-DI {SOFTWARE.udiDi} · {SOFTWARE.intendedUse}.
      </div>
    </div>
  );
}

function ControlCard({ c }: { c: ControlItem }) {
  return (
    <div className="panel panel-pad" style={{ padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15 }}>{c.title}</div>
        <span className={"chip " + (c.layer === "app" ? "chip-susceptible" : "chip")}>
          {c.layer === "app" ? "IN-APP" : "DEPLOYMENT"}
        </span>
      </div>
      <div className="helper" style={{ margin: "8px 0 12px" }}>{c.detail}</div>
      <div className="pill-key">
        {c.frameworks.map((f) => (
          <span key={f} className="chip mono" style={{ fontSize: 9.5 }}>
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}

function Posture({ label, value }: { label: string; value: string }) {
  return (
    <div className="feature panel panel-pad" style={{ padding: "16px 18px" }}>
      <div className="stat accent" style={{ fontSize: 22 }}>{value}</div>
      <div className="helper">{label}</div>
    </div>
  );
}
