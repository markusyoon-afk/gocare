import { SOFTWARE } from "../data/compliance";
import { useSession } from "../store/session";

/** Inactivity lock (AC-11). Re-authentication resumes the same session; sign-out clears it. */
export function LockScreen() {
  const { state, dispatch } = useSession();
  const op = state.operator;
  return (
    <div className="auth-screen app-bg">
      <div className="auth-card lock-card fade-in">
        <div className="lock-glyph">🔒</div>
        <div className="eyebrow">Session locked</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600, margin: "8px 0 6px" }}>
          Locked after inactivity
        </h1>
        <p className="helper" style={{ marginBottom: 20 }}>
          The session for <b style={{ color: "var(--ink)" }}>{op?.name}</b> was locked to protect patient data. No PHI
          is exposed while locked.
        </p>
        <button className="press btn btn-primary" style={{ width: "100%" }} onClick={() => dispatch({ type: "UNLOCK" })}>
          <span className="avatar" style={{ width: 24, height: 24, fontSize: 11 }}>{op?.initials}</span>
          Resume as {op?.name}
        </button>
        <button className="press btn btn-ghost" style={{ width: "100%", marginTop: 10 }} onClick={() => dispatch({ type: "SIGN_OUT_OPERATOR" })}>
          Sign out completely
        </button>
        <div className="auth-foot">
          <span className="chip">{SOFTWARE.classification}</span>
          <span className="helper">Re-authenticate to resume · auto sign-out after {Math.round(SOFTWARE.sessionLockMs / 60000)} min idle</span>
        </div>
      </div>
    </div>
  );
}
