import { APP_ORDER, APPS } from "../data/catalog";
import { useDevice } from "../store/device";

/** Hardware-as-a-Service cartridge inventory — stock, usage, safety, auto-reorder. */
export function InventoryScreen() {
  const { state, dispatch } = useDevice();
  const anyLow = APP_ORDER.some((id) => state.inventory[id].stock <= state.inventory[id].threshold);
  const openOrders = state.orders.filter((o) => o.status === "placed");

  return (
    <div className="fade-in">
      <div className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
        <div>
          <div className="eyebrow">Hardware-as-a-Service · GoDx Store</div>
          <h1 className="page-title">Cartridge inventory</h1>
          <p className="page-sub hide-compact">
            Live stock across the placed GoDEVICE. Each run consumes one cartridge; when stock reaches the safety level,
            an MOQ order is placed automatically with the GoDx Store.
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
            <div className="stat" style={{ fontSize: 17 }}>Cartridges at safety level</div>
            <div className="helper">Auto-reorder places a minimum order of 10 for any line at or below threshold.</div>
          </div>
        </div>
      )}

      <div className="grid grid-2">
        {APP_ORDER.map((id) => {
          const inv = state.inventory[id];
          const low = inv.stock <= inv.threshold;
          const pct = Math.max(4, Math.min(100, (inv.stock / (inv.threshold * 2.5)) * 100));
          return (
            <div key={id} className={"panel panel-pad inv-card" + (low ? " inv-low" : "")}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div className="stat" style={{ fontSize: 18 }}>{APPS[id].tm}</div>
                  <div className="helper">{APPS[id].tagline}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="stat accent" style={{ fontSize: 30 }}>{inv.stock}</div>
                  <div className="helper">in stock</div>
                </div>
              </div>

              <div className="inv-bar">
                <div className="inv-bar-fill" style={{ width: `${pct}%`, background: low ? "var(--amber)" : "var(--accent)" }} />
                <div className="inv-threshold" style={{ left: `${Math.min(100, (inv.threshold / (inv.threshold * 2.5)) * 100)}%` }} title="Safety threshold" />
              </div>

              <div className="inv-stats">
                <span>Used <b>{inv.used}</b></span>
                <span>Safety <b>{inv.threshold}</b></span>
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
              {low && inv.incoming === 0 && <div className="helper" style={{ color: "var(--amber)", marginTop: 8 }}>At safety level — order recommended.</div>}
              {inv.incoming > 0 && <div className="helper" style={{ color: "var(--accent)", marginTop: 8 }}>{inv.incoming} inbound from GoDx Store.</div>}
            </div>
          );
        })}
      </div>

      <div className="section-label" style={{ marginTop: 22 }}>Orders</div>
      <div className="panel panel-pad table-wrap">
        {state.orders.length === 0 ? (
          <div className="empty">No orders yet. Orders appear here when stock hits the safety level or you order manually.</div>
        ) : (
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
        )}
      </div>
      {openOrders.length > 0 && (
        <div className="helper" style={{ marginTop: 10 }}>{openOrders.length} open order(s) · MOQ {state.inventory.goprep.moq} per line.</div>
      )}
    </div>
  );
}
