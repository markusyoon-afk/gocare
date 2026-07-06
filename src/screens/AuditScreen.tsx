import { useSession } from "../store/session";

/** Audit & accountability view — the append-only trail (HIPAA §164.312(b), CMMC AU). */
export function AuditScreen() {
  const { state } = useSession();
  return (
    <div className="fade-in">
      <div className="page-head">
        <div className="eyebrow">Audit &amp; accountability</div>
        <h1 className="page-title">Audit trail</h1>
        <p className="page-sub hide-compact">
          Every material action is logged with operator identity and timestamp. In production this trail is written to
          an append-only, tamper-evident store; here it is retained in-session for review.
        </p>
      </div>

      {state.audit.length === 0 ? (
        <div className="panel panel-pad empty">No events yet this session.</div>
      ) : (
        <div className="panel panel-pad table-wrap">
          <table className="dtable">
            <thead>
              <tr>
                <th style={{ width: 92 }}>Time</th>
                <th>Action</th>
                <th className="hide-compact">Detail</th>
                <th style={{ textAlign: "right" }}>Operator</th>
              </tr>
            </thead>
            <tbody>
              {state.audit.map((e) => (
                <tr key={e.id}>
                  <td className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                    {new Date(e.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </td>
                  <td style={{ fontWeight: 600, fontFamily: "var(--font-display)" }}>{e.action}</td>
                  <td className="helper hide-compact">{e.detail}</td>
                  <td style={{ textAlign: "right", color: "var(--muted)" }}>{e.operatorName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
