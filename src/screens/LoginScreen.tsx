import { useState } from "react";
import { OPERATORS, SOFTWARE } from "../data/compliance";
import { useSession } from "../store/session";
import { Logo } from "../components/Logo";

/** Access-control gate — select an operator, then sign in (HIPAA/CMMC). */
export function LoginScreen() {
  const { dispatch } = useSession();
  const [selectedId, setSelectedId] = useState(OPERATORS[0].id);
  const selected = OPERATORS.find((o) => o.id === selectedId)!;

  function signIn() {
    dispatch({ type: "SIGN_IN", operator: selected });
  }

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
          Sign in to continue
        </h1>
        <p className="helper" style={{ marginBottom: 16 }}>
          Select your name and sign in. Your role sets what you can do; the session locks automatically after inactivity.
        </p>

        <div className="op-select">
          {OPERATORS.map((op) => {
            const active = op.id === selectedId;
            return (
              <button key={op.id} className={"press operator-row" + (active ? " selected" : "")} onClick={() => setSelectedId(op.id)}>
                <span className="avatar">{op.initials}</span>
                <span style={{ textAlign: "left", flex: 1 }}>
                  <span style={{ display: "block", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15 }}>{op.name}</span>
                  <span className="helper">{op.role}</span>
                </span>
                <span className="op-radio">{active ? "✓" : ""}</span>
              </button>
            );
          })}
        </div>

        <button className="press btn btn-primary signin-btn" onClick={signIn}>
          Sign in as {selected.name}
        </button>
        <button className="press btn btn-ghost signin-face" onClick={signIn}>
          <span aria-hidden>◎</span> Sign in with Face ID
        </button>

        <div className="auth-foot">
          <span className="chip">{SOFTWARE.classification}</span>
          <span className="helper">{SOFTWARE.name} v{SOFTWARE.version} · {SOFTWARE.intendedUse}</span>
        </div>
      </div>
    </div>
  );
}
