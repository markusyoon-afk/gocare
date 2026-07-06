import { OPERATORS, SOFTWARE } from "../data/compliance";
import { useDevice } from "../store/device";

/** Device registration & configuration — instrument identity, clinic, operators. */
export function SettingsScreen() {
  const { state, dispatch } = useDevice();
  const { device, clinic, faceEnrolled, storeConnected } = state;

  return (
    <div className="fade-in">
      <div className="page-head">
        <div className="eyebrow">Device &amp; registration</div>
        <h1 className="page-title">Settings</h1>
        <p className="page-sub hide-compact">
          Instrument identity, clinic registration, and operator enrollment. These bind every result and audit entry to
          a device and a site.
        </p>
      </div>

      <div className="grid grid-2">
        {/* Device identity */}
        <div className="panel panel-pad">
          <div className="section-label">GoDEVICE identity</div>
          <div className="kv"><span className="k">Model</span><span className="v">{device.model}</span></div>
          <div className="kv"><span className="k">Serial number</span><span className="v mono">{device.serial}</span></div>
          <div className="kv"><span className="k">Firmware</span><span className="v mono">v{device.firmware}</span></div>
          <div className="kv"><span className="k">UDI-DI (software)</span><span className="v mono">{SOFTWARE.udiDi}</span></div>
          <div className="kv"><span className="k">GoCARE</span><span className="v">v{SOFTWARE.version} · {SOFTWARE.build}</span></div>
          <div className="helper" style={{ marginTop: 10 }}>Identity is factory-provisioned and read-only in the field.</div>
        </div>

        {/* Clinic registration */}
        <div className="panel panel-pad">
          <div className="section-label">Clinic / site</div>
          <Field label="Clinic name" value={clinic.name} onChange={(name) => dispatch({ type: "SET_CLINIC", clinic: { name } })} />
          <Field label="Address" value={clinic.address} onChange={(address) => dispatch({ type: "SET_CLINIC", clinic: { address } })} />
          <Field label="NPI" value={clinic.npi} onChange={(npi) => dispatch({ type: "SET_CLINIC", clinic: { npi } })} mono />
          <Field label="Contact" value={clinic.contact} onChange={(contact) => dispatch({ type: "SET_CLINIC", clinic: { contact } })} mono />
        </div>

        {/* Operator registration */}
        <div className="panel panel-pad">
          <div className="section-label">Registered operators</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {OPERATORS.map((op) => (
              <div key={op.id} className="operator-row" style={{ boxShadow: "none", border: "1px solid var(--line)" }}>
                <span className="avatar">{op.initials}</span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14 }}>{op.name}</span>
                  <span className="helper">{op.role}</span>
                </span>
                <span className="scopes">
                  {op.scopes.includes("sign_out") && <span className="chip chip-accent">sign-out</span>}
                  {op.scopes.includes("admin") && <span className="chip">admin</span>}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Authentication method */}
        <div className="panel panel-pad">
          <div className="section-label">Sign-in method</div>
          <div className="kv">
            <span className="k">Credentials (badge / PIN)</span>
            <span className="chip chip-susceptible">Enabled</span>
          </div>
          <div className="kv">
            <span className="k">Face scan</span>
            <span className={"chip " + (faceEnrolled ? "chip-susceptible" : "chip-dev")}>{faceEnrolled ? "Enrolled" : "Not enrolled"}</span>
          </div>
          <button
            className="press btn btn-ghost"
            style={{ width: "100%", marginTop: 12 }}
            onClick={() => dispatch({ type: "ENROLL_FACE", enrolled: !faceEnrolled })}
          >
            {faceEnrolled ? "Remove face enrollment" : "◎ Enroll face scan"}
          </button>
          <div className="divider" />
          <div className="kv">
            <span className="k">GoDx Store connection</span>
            <span className={"chip " + (storeConnected ? "chip-susceptible" : "chip-resistant")}>{storeConnected ? "Connected" : "Offline"}</span>
          </div>
          <button
            className="press btn btn-ghost"
            style={{ width: "100%", marginTop: 12 }}
            onClick={() => dispatch({ type: "SET_STORE", connected: !storeConnected })}
          >
            {storeConnected ? "Disconnect store" : "Reconnect store"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, mono }: { label: string; value: string; onChange: (v: string) => void; mono?: boolean }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="helper" style={{ marginBottom: 5 }}>{label}</div>
      <input className={"field" + (mono ? "" : " field-sans")} value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} />
    </div>
  );
}
