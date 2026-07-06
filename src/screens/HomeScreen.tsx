import { APPS, APP_ORDER, type AppId } from "../data/catalog";
import { useSession } from "../store/session";
import { QRCode } from "../components/QRCode";

/** A short, human-readable cartridge lot id used as the run seed. */
function makeLot(appId: AppId): string {
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${APPS[appId].qrPrefix}-${suffix}`;
}

export function HomeScreen() {
  const { state, dispatch } = useSession();

  return (
    <div className="fade-in">
      <div className="page-head">
        <div className="eyebrow">GoDEVICE · Ready</div>
        <h1 className="page-title">
          Insert a cartridge to begin a <span className="accent">molecular run</span>
        </h1>
        <p className="page-sub">
          GoCARE reads the cartridge QR and automatically loads the right application, sample workflow, and target
          panel. One reusable instrument runs every GoDx cartridge — GoPREP, GoDETECT, GoSEQ, and GoH₂O.
        </p>
      </div>

      {/* Instrument status strip */}
      <div className="panel panel-pad" style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 26, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="ring" style={{ width: 60, height: 60, borderWidth: 3, animationDuration: "3.4s" }} />
            <div>
              <div className="stat" style={{ fontSize: 20 }}>
                GoDEVICE
              </div>
              <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                Bay empty · lid closed
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 30, marginLeft: "auto", flexWrap: "wrap" }}>
            <Metric label="Firmware" value="v3.1.4" />
            <Metric label="Thermal" value="37.0°C" />
            <Metric label="Bay" value="Vacant" />
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
            <button
              key={id}
              className="press tile"
              onClick={() => dispatch({ type: "SCAN_CARTRIDGE", appId: id, lot })}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span className="tile-meta">{app.tagline}</span>
                {app.lead && <span className="chip chip-lead">LEAD</span>}
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
              <div className="tile-desc" style={{ marginTop: "auto" }}>
                {app.cartridge}
              </div>
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
                  <span className="mono" style={{ marginLeft: 8, fontSize: 11, color: "var(--accent)" }}>
                    {h.lot}
                  </span>
                </span>
                <span className="v" style={{ fontWeight: 400, color: "var(--muted)" }}>
                  {h.summary}
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
      <div className="mono" style={{ fontSize: 9.5, letterSpacing: "0.12em", color: "var(--muted-2)", textTransform: "uppercase" }}>
        {label}
      </div>
      <div className="stat" style={{ fontSize: 18, marginTop: 4 }}>
        {value}
      </div>
    </div>
  );
}
