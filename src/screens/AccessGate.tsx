import { useState } from "react";
import { hashSeed } from "../engine/run";
import { Logo } from "../components/Logo";

/**
 * Shared access-code gate for the public demo link.
 *
 * NOTE: this is a deterrent, not real security — the check runs client-side, so a
 * determined viewer can bypass it. It keeps casual visitors out of a shared,
 * unlisted URL. Unlock persists in localStorage so a second window (the GoDEVICE
 * kiosk, ?device=1) doesn't re-prompt.
 */
const EXPECTED = 3788775592; // hashSeed("GoCARE2026")
export const ACCESS_KEY = "gocare-access";

export function isUnlocked(): boolean {
  try {
    return localStorage.getItem(ACCESS_KEY) === "ok";
  } catch {
    return true; // storage blocked → don't hard-lock the demo
  }
}

export function AccessGate({ onUnlock }: { onUnlock: () => void }) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (hashSeed(code.trim()) === EXPECTED) {
      try {
        localStorage.setItem(ACCESS_KEY, "ok");
      } catch {
        /* ignore */
      }
      onUnlock();
    } else {
      setErr(true);
    }
  }

  return (
    <div className="auth-screen app-bg">
      <form className="auth-card lock-card fade-in" onSubmit={submit}>
        <div className="brand" style={{ justifyContent: "center", marginBottom: 10 }}>
          <Logo className="logo-mark" size={44} />
          <div style={{ textAlign: "left" }}>
            <div className="brand-name" style={{ fontSize: 20 }}>GoCARE</div>
            <div className="brand-sub">GoDx · Molecular Intelligence</div>
          </div>
        </div>
        <div className="eyebrow" style={{ textAlign: "center" }}>Team demo · access code</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, margin: "8px 0 6px" }}>
          Enter the access code
        </h1>
        <p className="helper" style={{ marginBottom: 16 }}>
          This is a private demo of GoCARE. Enter the code shared by your team to continue.
        </p>
        <input
          className="field"
          type="password"
          placeholder="Access code"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setErr(false);
          }}
          autoFocus
          aria-label="Access code"
        />
        {err && <div className="helper" style={{ color: "var(--red)", marginTop: 8 }}>Incorrect code — try again.</div>}
        <button className="press btn btn-primary" style={{ width: "100%", marginTop: 14 }} type="submit">
          Enter demo
        </button>
        <div className="auth-foot" style={{ justifyContent: "center" }}>
          <span className="chip">CONFIDENTIAL // CUI</span>
          <span className="helper">Investigational Use Only</span>
        </div>
      </form>
    </div>
  );
}
