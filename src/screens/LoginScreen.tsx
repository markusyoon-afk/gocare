import { useState } from "react";
import { OPERATORS, SOFTWARE } from "../data/compliance";
import { useSession } from "../store/session";
import { Logo } from "../components/Logo";
import { hashSeed } from "../engine/run";

/** Access-control gate — select an operator and enter a 4-digit PIN (HIPAA/CMMC). */
export function LoginScreen() {
  const { dispatch } = useSession();
  const [selectedId, setSelectedId] = useState(OPERATORS[0].id);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const selected = OPERATORS.find((o) => o.id === selectedId)!;

  function selectOp(id: string) {
    setSelectedId(id);
    setPin("");
    setError(false);
  }
  function press(d: string) {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError(false);
    if (next.length === 4) {
      setTimeout(() => {
        if (hashSeed(next) === selected.pinHash) dispatch({ type: "SIGN_IN", operator: selected });
        else {
          setError(true);
          setPin("");
        }
      }, 130);
    }
  }
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

  return (
    <div className="auth-screen app-bg">
      <div className="auth-card fade-in">
        <div className="brand" style={{ marginBottom: 6 }}>
          <Logo className="logo-mark" size={40} />
          <div>
            <div className="brand-name" style={{ fontSize: 21 }}>GoCARE</div>
            <div className="brand-sub">GoDx · Molecular Intelligence</div>
          </div>
        </div>
        <div className="eyebrow" style={{ marginTop: 14 }}>Operator sign-in</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, margin: "6px 0 4px" }}>
          Select your name &amp; enter PIN
        </h1>

        <div className="op-select op-select-compact">
          {OPERATORS.map((op) => (
            <button key={op.id} className={"press operator-row" + (op.id === selectedId ? " selected" : "")} onClick={() => selectOp(op.id)}>
              <span className="avatar" style={{ width: 26, height: 26, fontSize: 11 }}>{op.initials}</span>
              <span style={{ textAlign: "left", flex: 1 }}>
                <span style={{ display: "block", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14 }}>{op.name}</span>
                <span className="helper">{op.role}</span>
              </span>
              <span className="op-radio">{op.id === selectedId ? "✓" : ""}</span>
            </button>
          ))}
        </div>

        <div className={"pin-block" + (error ? " pin-error" : "")}>
          <div className="pin-dots">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={"pin-dot" + (i < pin.length ? " filled" : "")} />
            ))}
          </div>
          <div className="pin-hint helper">
            {error ? <span style={{ color: "var(--red)" }}>Incorrect PIN — try again</span> : `Enter ${selected.name}'s 4-digit PIN`}
          </div>
          <div className="keypad">
            {keys.map((k, i) =>
              k === "" ? (
                <span key={i} />
              ) : (
                <button key={i} className="press key" onClick={() => (k === "⌫" ? setPin((p) => p.slice(0, -1)) : press(k))}>
                  {k}
                </button>
              ),
            )}
          </div>
        </div>

        <button className="press btn btn-ghost signin-face" onClick={() => dispatch({ type: "SIGN_IN", operator: selected })}>
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
