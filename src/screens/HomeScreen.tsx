import { APPS, APP_ORDER, makeScan, type AppId } from "../data/catalog";
import { FLOWS, typicalLabel } from "../data/stages";
import { useSession } from "../store/session";
import { useDevice, activeDevice } from "../store/device";
import { deviceStatus } from "../lib/format";
import { QRCode } from "../components/QRCode";

function makeLot(appId: AppId): string {
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${APPS[appId].qrPrefix}-${suffix}`;
}

const BAY_LABEL: Record<string, string> = { ready: "Empty · ready", running: "In use", done: "Cartridge in" };

export function HomeScreen() {
  const { state, dispatch } = useSession();
  const { state: dev } = useDevice();
  const unit = activeDevice(dev);
  const status = deviceStatus(state.stage);

  return (
    <div className="fade-in">
      <div className="page-head">
        <div className="eyebrow">{unit.label} · {status === "ready" ? "Ready" : status === "running" ? "Processing" : "Cartridge in"}</div>
        <h1 className="page-title">
          Insert a cartridge to begin a <span className="accent">molecular run</span>
        </h1>
        <p className="page-sub hide-compact">
          GoCARE reads the cartridge QR and loads the right test automatically — pathogen and AMR answers from one
          reusable instrument.
        </p>
      </div>

      {/* Instrument status strip */}
      <div className="panel panel-pad" style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 26, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className={"ring ring-" + status} style={{ width: 60, height: 60, borderWidth: 3, animationDuration: "3.4s" }} />
            <div>
              <div className="stat" style={{ fontSize: 20 }}>{unit.model}</div>
              <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{unit.serial}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 30, marginLeft: "auto", flexWrap: "wrap" }}>
            <Metric label="Bay" value={BAY_LABEL[status]} />
            <Metric label="Location" value={unit.location?.label ?? "—"} />
            <Metric label="Runs today" value={String(state.history.length)} />
          </div>
        </div>
      </div>

      <div className="section-label">Load a cartridge — tap to scan &amp; insert</div>
      <div className="grid grid-4" style={{ marginBottom: 26 }}>
        {APP_ORDER.map((id) => {
          const app = APPS[id];
          const lot = makeLot(id);
          return (
            <button key={id} className="press tile" onClick={() => dispatch({ type: "SCAN_CARTRIDGE", ...makeScan(id) })}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span className="tile-meta">{app.tagline}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 2 }}>
                <QRCode value={lot} size={6} />
                <div>
                  <div className="tile-title">{app.tm}</div>
                  <div className="mono" style={{ fontSize: 9.5, color: "var(--accent)", marginTop: 3, letterSpacing: "0.06em" }}>
                    {app.qrPrefix}-••••
                  </div>
                </div>
              </div>
              <div className="tile-desc" style={{ marginTop: "auto" }}>Typical run time {typicalLabel(FLOWS[id])}</div>
            </button>
          );
        })}
      </div>

      {/* Recent runs */}
      <div className="section-label">Recent runs</div>
      <div className="panel panel-pad">
        {state.history.length === 0 ? (
          <div className="empty">
            <div style={{ fontSize: 26 }}>◌</div>
            <div>No runs yet. Insert a cartridge above to start.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {state.history.map((h) => (
              <div className="kv" key={h.id}>
                <span className="k">
                  <b style={{ color: "var(--ink)" }}>{APPS[h.appId].name}</b>
                  <span className="mono hide-compact" style={{ marginLeft: 8, fontSize: 11, color: "var(--accent)" }}>
                    {h.sampleId ?? h.lot}
                  </span>
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="v" style={{ fontWeight: 400, color: "var(--muted)" }}>{h.summary}</span>
                  {h.signed && <span className="chip chip-susceptible">signed</span>}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 9.5, letterSpacing: "0.12em", color: "var(--muted-2)", textTransform: "uppercase" }}>{label}</div>
      <div className="stat" style={{ fontSize: 16, marginTop: 4 }}>{value}</div>
    </div>
  );
}
