import { useState } from "react";
import { OPERATORS, SOFTWARE } from "../data/compliance";
import { useDevice, activeDevice, type Integrations } from "../store/device";

/** Device registration & configuration — fleet, clinic, operators, integrations. */
export function SettingsScreen() {
  const { state, dispatch } = useDevice();
  const { clinic, faceEnrolled, storeConnected, devices, integrations } = state;
  const active = activeDevice(state);
  const [geo, setGeo] = useState<"idle" | "locating" | "ok" | "error">("idle");

  function useMyLocation() {
    if (!navigator.geolocation) {
      setGeo("error");
      return;
    }
    setGeo("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        dispatch({
          type: "SET_LOCATION",
          id: active.id,
          location: { lat: latitude, lng: longitude, label: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` },
        });
        setGeo("ok");
      },
      () => setGeo("error"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function registerDevice() {
    const n = devices.length + 1;
    const hex = Math.floor(Math.random() * 0xffffff).toString(16).toUpperCase().padStart(6, "0");
    dispatch({
      type: "REGISTER_DEVICE",
      unit: { id: `gdx-${hex.toLowerCase()}`, model: "GoDEVICE One", serial: `GDX-1-24${hex}`, firmware: "3.1.4", label: `GoDEVICE ${n}`, location: null },
    });
  }

  return (
    <div className="fade-in">
      <div className="page-head">
        <div className="eyebrow">Device &amp; registration</div>
        <h1 className="page-title">Settings</h1>
        <p className="page-sub hide-compact">
          Capture your <b>facility</b>, <b>device</b>, and <b>user</b> information here: register and select the GoDEVICE
          under control, name it and set its location, edit clinic details, and manage operators and integrations. The
          active device drives every run and is shown in the status bar on every screen.
        </p>
      </div>

      {/* GoDEVICE fleet */}
      <div className="panel panel-pad" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div className="section-label" style={{ marginBottom: 0 }}>Registered GoDEVICEs</div>
          <button className="press btn btn-ghost" style={{ padding: "8px 14px", fontSize: 12.5 }} onClick={registerDevice}>+ Register device</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
          {devices.map((d) => {
            const isActive = d.id === active.id;
            return (
              <div key={d.id} className={"device-reg" + (isActive ? " active" : "")}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <input
                    className="field field-sans device-label-input"
                    value={d.label}
                    onChange={(e) => dispatch({ type: "SET_DEVICE_LABEL", id: d.id, label: e.target.value })}
                    aria-label="Device name"
                  />
                  <div className="mono helper" style={{ marginTop: 4 }}>
                    {d.serial} · fw {d.firmware}{d.location ? ` · 📍 ${d.location.label}` : " · no location"}
                  </div>
                </div>
                {isActive ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                    <button className="press btn btn-ghost" style={{ padding: "8px 12px", fontSize: 12 }} onClick={useMyLocation} disabled={geo === "locating"}>
                      {geo === "locating" ? "Locating…" : "📍 Use GPS"}
                    </button>
                    <span className="chip chip-accent">controlling</span>
                    {geo === "error" && <span className="helper" style={{ color: "var(--amber)" }}>Location blocked</span>}
                  </div>
                ) : (
                  <button className="press btn btn-ghost" style={{ padding: "8px 14px", fontSize: 12.5 }} onClick={() => dispatch({ type: "SELECT_DEVICE", id: d.id })}>Control this</button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-2">
        {/* Active device identity */}
        <div className="panel panel-pad">
          <div className="section-label">Active GoDEVICE</div>
          <div className="kv"><span className="k">Placement</span><span className="v">{active.label}</span></div>
          <div className="kv"><span className="k">Model</span><span className="v">{active.model}</span></div>
          <div className="kv"><span className="k">Serial number</span><span className="v mono">{active.serial}</span></div>
          <div className="kv"><span className="k">Firmware</span><span className="v mono">v{active.firmware}</span></div>
          <div className="kv"><span className="k">Thermal</span><span className="v mono">37.0°C</span></div>
          <div className="kv"><span className="k">Location</span><span className="v">{active.location?.label ?? "— set below —"}</span></div>
          <div className="kv"><span className="k">GoCARE / UDI-DI</span><span className="v mono">v{SOFTWARE.version} · {SOFTWARE.udiDi}</span></div>
        </div>

        {/* Clinic registration */}
        <div className="panel panel-pad">
          <div className="section-label">Clinic / site</div>
          <Field label="Clinic name" value={clinic.name} onChange={(name) => dispatch({ type: "SET_CLINIC", clinic: { name } })} sans />
          <Field label="Address" value={clinic.address} onChange={(address) => dispatch({ type: "SET_CLINIC", clinic: { address } })} sans />
          <Field label="NPI" value={clinic.npi} onChange={(npi) => dispatch({ type: "SET_CLINIC", clinic: { npi } })} />
          <Field label="Contact" value={clinic.contact} onChange={(contact) => dispatch({ type: "SET_CLINIC", clinic: { contact } })} />
        </div>

        {/* Integrations */}
        <div className="panel panel-pad">
          <div className="section-label">Integrations</div>
          <IntegRow label="EMR (FHIR R4)" desc="Push signed results to the electronic medical record." on={integrations.emr} onToggle={() => dispatch({ type: "TOGGLE_INTEGRATION", key: "emr" })} />
          <IntegRow label="LIS (HL7 v2)" desc="Laboratory information system order/result exchange." on={integrations.lis} onToggle={() => dispatch({ type: "TOGGLE_INTEGRATION", key: "lis" })} />
          <IntegRow label="Sequencer · Oxford Nanopore / BugSEQ" desc="GoSEQ library hand-off and metagenomic reports." on={integrations.sequencer} onToggle={() => dispatch({ type: "TOGGLE_INTEGRATION", key: "sequencer" })} />
          <div className="divider" />
          <div className="kv"><span className="k">GoDx Store</span><span className={"chip " + (storeConnected ? "chip-susceptible" : "chip-resistant")}>{storeConnected ? "Connected" : "Offline"}</span></div>
          <button className="press btn btn-ghost" style={{ width: "100%", marginTop: 10 }} onClick={() => dispatch({ type: "SET_STORE", connected: !storeConnected })}>
            {storeConnected ? "Disconnect store" : "Reconnect store"}
          </button>
        </div>

        {/* Operators + auth */}
        <div className="panel panel-pad">
          <div className="section-label">Operators &amp; sign-in</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {OPERATORS.map((op) => (
              <div key={op.id} className="operator-row" style={{ boxShadow: "none", border: "1px solid var(--line)", padding: "10px 12px" }}>
                <span className="avatar" style={{ width: 26, height: 26, fontSize: 11 }}>{op.initials}</span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13.5 }}>{op.name}</span>
                  <span className="helper">{op.role}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="kv"><span className="k">Face scan</span><span className={"chip " + (faceEnrolled ? "chip-susceptible" : "chip-dev")}>{faceEnrolled ? "Enrolled" : "Not enrolled"}</span></div>
          <button className="press btn btn-ghost" style={{ width: "100%", marginTop: 10 }} onClick={() => dispatch({ type: "ENROLL_FACE", enrolled: !faceEnrolled })}>
            {faceEnrolled ? "Remove face enrollment" : "◎ Enroll face scan"}
          </button>
        </div>
      </div>
    </div>
  );
}

function IntegRow({ label, desc, on, onToggle }: { label: string; desc: string; on: boolean; onToggle: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500 }}>{label}</div>
        <div className="helper">{desc}</div>
      </div>
      <button className={"press btn " + (on ? "btn-primary" : "btn-ghost")} style={{ padding: "7px 14px", fontSize: 12 }} onClick={onToggle}>
        {on ? "On" : "Off"}
      </button>
    </div>
  );
}

function Field({ label, value, onChange, sans }: { label: string; value: string; onChange: (v: string) => void; sans?: boolean }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="helper" style={{ marginBottom: 5 }}>{label}</div>
      <input className={"field" + (sans ? " field-sans" : "")} value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} />
    </div>
  );
}

export type { Integrations };
