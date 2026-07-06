import { useSession } from "../store/session";
import { unifiedHistory, pathogenName } from "../lib/history";
import { MATRICES } from "../data/catalog";

/** Result history log — unique cartridge id, location, time, high-level result. */
export function HistoryScreen() {
  const { state } = useSession();
  const rows = unifiedHistory(state.history).slice(0, 60);

  return (
    <div className="fade-in">
      <div className="page-head">
        <div className="eyebrow">Surveillance · result log</div>
        <h1 className="page-title">History</h1>
        <p className="page-sub hide-compact">
          Every reported result — cartridge ID, location, time, and high-level call. This is the source series behind
          Analytics. Live runs from this session are tagged <span className="chip chip-accent" style={{ verticalAlign: "middle" }}>this session</span>.
        </p>
      </div>

      <div className="panel panel-pad table-wrap">
        <table className="dtable">
          <thead>
            <tr>
              <th>Time</th>
              <th>Cartridge ID</th>
              <th className="hide-compact">Location</th>
              <th>Result</th>
              <th style={{ textAlign: "right" }}>AMR</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.cartridgeId + i} className={r.resistant ? "row-targeted" : ""}>
                <td className="mono" style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" }}>
                  {new Date(r.ts).toLocaleDateString([], { month: "short", day: "numeric" })}
                  <span className="hide-compact"> {new Date(r.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </td>
                <td className="mono" style={{ fontSize: 11 }}>
                  {r.cartridgeId}
                  {r.live && <span className="chip chip-accent" style={{ marginLeft: 6 }}>session</span>}
                </td>
                <td className="helper hide-compact">
                  {r.location}
                  <span style={{ color: "var(--muted-2)" }}> · {MATRICES[r.matrix]?.name ?? r.matrix}</span>
                </td>
                <td style={{ fontWeight: r.pathogen ? 600 : 400, color: r.pathogen ? "var(--ink)" : "var(--muted)", fontFamily: r.pathogen ? "var(--font-display)" : "inherit" }}>
                  {pathogenName(r.pathogen)}
                </td>
                <td style={{ textAlign: "right" }}>
                  {r.resistant ? <span className="chip chip-resistant">resistant</span> : r.pathogen ? <span className="chip chip-susceptible">no resistance</span> : <span className="helper">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="helper" style={{ marginTop: 12 }}>
        Showing {rows.length} most-recent results. High-level only — no PHI is displayed in the log.
      </div>
    </div>
  );
}
