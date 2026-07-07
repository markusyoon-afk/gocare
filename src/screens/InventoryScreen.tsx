import { APP_ORDER, APPS } from "../data/catalog";
import { useDevice } from "../store/device";

type Level = "ok" | "near" | "under";
function level(stock: number, threshold: number): Level {
  if (stock <= threshold) return "under";
  if (stock <= threshold * 1.5) return "near";
  return "ok";
}
const LEVEL_COLOR: Record<Level, string> = {
  ok: "var(--accent)",
  near: "var(--amber)",
  under: "var(--red)",
};

/** Hardware-as-a-Service cartridge inventory — stock, usage, adjustable safety, reorder. */
export function InventoryScreen() {
  const { state, dispatch } = useDevice();
  const anyLow = APP_ORDER.some((id) => level(state.inventory[id].stock, state.inventory[id].threshold) !== "ok");
  const hasOrders = state.orders.length > 0;
  const openOrders = state.orders.filter((o) => o.status === "placed");

  return (
    <div className="fade-in">
      <div className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
        <div>
          <div className="eyebrow">Hardware-as-a-Service · GoDx Store</div>
          <h1 className="page-title">Cartridge inventory</h1>
          <p className="page-sub hide-compact">
            Live stock across the GoDEVICE. Each run uses one cartridge; at the safety level an order is placed
            automatically. Drag a safety slider to set when reordering kicks in.
          </p>
        </div>
        <span className={"chip " + (state.storeConnected ? "chip-susceptible" : "chip-resistant")}>
          <span className={"status-dot " + (state.storeConnected ? "dot-available" : "dot-consider")} /> GoDx Store {state.storeConnected ? "connected" : "offline"}
        </span>
      </div>

      {anyLow && (
        <div className="verdict verdict-resistant" style={{ marginBottom: 18 }}>
          <div className="verdict-icon" style={{ background: "rgba(242,178,92,0.18)" }}>⚠</div>
          <div>
            <div className="stat" style={{ fontSize: 17 }}>Some cartridges at or near safety</div>
            <div className="helper">Orange = getting low · red = at/under safety. Auto-reorder places {state.inventory.goprep.moq} when at safety.</div>
          </div>
        </div>
      )}

      <div className="grid grid-2">
        {APP_ORDER.map((id) => {
          const inv = state.inventory[id];
          const lv = level(inv.stock, inv.threshold);
          const color = LEVEL_COLOR[lv];
          const capacity = Math.max(inv.stock, inv.threshold + 4, 24);
          const fillPct = Math.max(3, Math.min(100, (inv.stock / capacity) * 100));
          const thrPct = Math.min(100, (inv.threshold / capacity) * 100);
          return (
            <div key={id} className={"panel panel-pad inv-card" + (lv === "under" ? " inv-low" : "")}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div className="stat" style={{ fontSize: 18 }}>{APPS[id].tm}</div>
                  <div className="helper">{APPS[id].tagline}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="stat" style={{ fontSize: 30, color }}>{inv.stock}</div>
                  <div className="helper">in stock</div>
                </div>
              </div>

              <div className="inv-bar">
                <div className="inv-bar-fill" style={{ width: `${fillPct}%`, background: color }} />
                <div className="inv-threshold" style={{ left: `${thrPct}%` }} title="Safety level" />
              </div>

              {/* Adjustable safety slider with a marked, detented recommended level */}
              <div className="safety-row">
                <span className="safety-label">Safety level</span>
                <div className="safety-slider-wrap">
                  <div className="safety-rec-mark" style={{ left: `${(inv.recommended / capacity) * 100}%` }} title={`Recommended: ${inv.recommended}`} />
                  <input
                    className="safety-slider"
                    type="range"
                    min={0}
                    max={capacity}
                    value={inv.threshold}
                    onChange={(e) => {
                      let v = Number(e.target.value);
                      if (Math.abs(v - inv.recommended) <= 1) v = inv.recommended; // detent snaps to recommended
                      dispatch({ type: "SET_THRESHOLD", appId: id, threshold: v });
                    }}
                    aria-label={`${APPS[id].name} safety level`}
                    style={{ accentColor: color }}
                  />
                </div>
                <span className="safety-val" style={{ color }}>{inv.threshold}</span>
              </div>
              <div className="safety-hint">
                {inv.threshold < inv.recommended ? (
                  <span style={{ color: "var(--amber)" }}>⚠ Below recommended ({inv.recommended}) — may run out before auto-reorder arrives</span>
                ) : (
                  <span className="helper"><span className="rec-dot" /> Recommended safety level: {inv.recommended}</span>
                )}
              </div>

              <div className="inv-stats">
                <span>Used <b>{inv.used}</b></span>
                <span>Incoming <b className={inv.incoming ? "accent" : ""}>{inv.incoming}</b></span>
              </div>

              <div className="inv-actions">
                <label className="toggle">
                  <input type="checkbox" checked={inv.autoReorder} onChange={() => dispatch({ type: "TOGGLE_AUTO", appId: id })} />
                  <span>Auto-reorder</span>
                </label>
                <button className="press btn btn-ghost inv-order-btn" onClick={() => dispatch({ type: "REORDER", appId: id, auto: false })} disabled={!state.storeConnected}>
                  Order {inv.moq}
                </button>
              </div>
              {lv === "under" && inv.incoming === 0 && <div className="helper" style={{ color: "var(--red)", marginTop: 8 }}>At safety level — order recommended.</div>}
              {lv === "near" && inv.incoming === 0 && <div className="helper" style={{ color: "var(--amber)", marginTop: 8 }}>Getting low.</div>}
              {inv.incoming > 0 && <div className="helper" style={{ color: "var(--accent)", marginTop: 8 }}>{inv.incoming} inbound from GoDx Store.</div>}
            </div>
          );
        })}
      </div>

      {/* Orders — only surfaced when there are any */}
      {hasOrders ? (
        <>
          <div className="section-label" style={{ marginTop: 22 }}>
            Orders {openOrders.length > 0 && <span className="chip chip-accent">{openOrders.length} open</span>}
          </div>
          <div className="panel panel-pad table-wrap">
            <table className="dtable">
              <thead>
                <tr>
                  <th>Cartridge</th>
                  <th className="num">Qty</th>
                  <th>Type</th>
                  <th className="hide-compact">Placed</th>
                  <th style={{ textAlign: "right" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {state.orders.map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>{APPS[o.appId].name}</td>
                    <td className="num">{o.qty}</td>
                    <td>{o.auto ? <span className="chip chip-accent">auto</span> : <span className="chip">manual</span>}</td>
                    <td className="helper hide-compact">{new Date(o.when).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                    <td style={{ textAlign: "right" }}>
                      {o.status === "placed" ? (
                        <button className="press btn btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => dispatch({ type: "RECEIVE", id: o.id })}>
                          Mark received
                        </button>
                      ) : (
                        <span className="chip chip-susceptible">received</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="helper" style={{ marginTop: 18 }}>No orders yet — they appear here when stock hits safety or you order manually.</div>
      )}
    </div>
  );
}
