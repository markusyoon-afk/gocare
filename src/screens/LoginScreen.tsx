import { OPERATORS, SOFTWARE } from "../data/compliance";
import { useSession } from "../store/session";
import { Logo } from "../components/Logo";

/** Access-control gate — an operator must badge in before any run (HIPAA/CMMC). */
export function LoginScreen() {
  const { dispatch } = useSession();
  return (
    <div className="auth-screen app-bg">
      <div className="auth-card fade-in">
        <div className="brand" style={{ marginBottom: 6 }}>
          <Logo className="logo-mark" size={44} />
          <div>
            <div className="brand-name" style={{ fontSize: 22 }}>GoCARE</div>
            <div className="brand-sub">GoDx · Molecular Intelligence</div>
          </div>
        </div>
        <div className="eyebrow" style={{ marginTop: 18 }}>Operator sign-in</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600, margin: "8px 0 4px", letterSpacing: "-0.01em" }}>
          Badge in to continue
        </h1>
        <p className="helper" style={{ marginBottom: 18 }}>
          Identity is required before any run. Your role determines what you can do; the session locks automatically
          after inactivity.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {OPERATORS.map((op) => (
            <button key={op.id} className="press operator-row" onClick={() => dispatch({ type: "SIGN_IN", operator: op })}>
              <span className="avatar">{op.initials}</span>
              <span style={{ textAlign: "left", flex: 1 }}>
                <span style={{ display: "block", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15 }}>{op.name}</span>
                <span className="helper">{op.role}</span>
              </span>
              <span className="scopes">
                {op.scopes.includes("sign_out") && <span className="chip chip-accent">sign-out</span>}
                {op.scopes.includes("admin") && <span className="chip">admin</span>}
              </span>
            </button>
          ))}
        </div>
        <div className="auth-foot">
          <span className="chip">{SOFTWARE.classification}</span>
          <span className="helper">{SOFTWARE.name} v{SOFTWARE.version} · {SOFTWARE.intendedUse}</span>
        </div>
      </div>
    </div>
  );
}
