import { useEffect, useState } from "react";
import { SessionProvider, useSession } from "./store/session";
import { APPS, APP_ORDER, type AppId } from "./data/catalog";
import { SOFTWARE } from "./data/compliance";
import { HomeScreen } from "./screens/HomeScreen";
import { ConfigureScreen } from "./screens/ConfigureScreen";
import { RunScreen } from "./screens/RunScreen";
import { ResultsScreen } from "./screens/ResultsScreen";
import { MenuScreen } from "./screens/MenuScreen";
import { AmrScreen } from "./screens/AmrScreen";
import { AuditScreen } from "./screens/AuditScreen";
import { ComplianceScreen } from "./screens/ComplianceScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { LockScreen } from "./screens/LockScreen";

type View = "workflow" | "menu" | "amr" | "audit" | "compliance";

const NAV: { key: View; label: string; glyph: string }[] = [
  { key: "workflow", label: "Dashboard", glyph: "▦" },
  { key: "menu", label: "Test Menu", glyph: "☰" },
  { key: "amr", label: "AMR Library", glyph: "⚕" },
  { key: "audit", label: "Audit", glyph: "◈" },
  { key: "compliance", label: "Compliance", glyph: "⛨" },
];

function Workspace() {
  const { state, dispatch } = useSession();
  const [view, setView] = useState<View>("workflow");

  // Throttled activity signal so the inactivity timer only fires when truly idle.
  useEffect(() => {
    let last = 0;
    const onAct = () => {
      const now = Date.now();
      if (now - last > 3000) {
        last = now;
        dispatch({ type: "ACTIVITY" });
      }
    };
    const evts = ["pointerdown", "keydown", "click", "touchstart", "wheel"];
    evts.forEach((e) => window.addEventListener(e, onAct, { passive: true }));
    return () => evts.forEach((e) => window.removeEventListener(e, onAct));
  }, [dispatch]);

  // Auto-lock after inactivity (AC-11).
  useEffect(() => {
    const t = setInterval(() => {
      if (Date.now() - state.lastActivity >= SOFTWARE.sessionLockMs) dispatch({ type: "LOCK" });
    }, 1000);
    return () => clearInterval(t);
  }, [state.lastActivity, dispatch]);

  function launch(appId: AppId) {
    const lot = `${APPS[appId].qrPrefix}-${Math.floor(1000 + Math.random() * 9000)}`;
    dispatch({ type: "SCAN_CARTRIDGE", appId, lot });
    setView("workflow");
  }
  function goDashboard() {
    setView("workflow");
    if (state.stage !== "home") dispatch({ type: "GO_HOME" });
  }

  const stageLabel: Record<string, string> = { home: "Dashboard", configure: "Configure", running: "Running", results: "Results" };

  const crumbTrail =
    view === "workflow"
      ? state.appId && state.stage !== "home"
        ? [APPS[state.appId].name, stageLabel[state.stage]]
        : ["Dashboard"]
      : [NAV.find((n) => n.key === view)!.label];

  return (
    <div className="app-bg">
      {/* Persistent data-classification bar (CMMC marking) */}
      <div className="classification-bar">
        <span>{SOFTWARE.classification}</span>
        <span className="cb-mid hide-compact">GoDx GoCARE · SaMD</span>
        <span>{SOFTWARE.intendedUse}</span>
      </div>

      <div className="shell">
        {/* Sidebar (tablet / desktop) */}
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">Go</div>
            <div>
              <div className="brand-name">GoCARE</div>
              <div className="brand-sub">GoDx · SaMD</div>
            </div>
          </div>

          <div className="nav-label">Workspace</div>
          <nav className="nav">
            {NAV.map((n) => (
              <button
                key={n.key}
                className={"nav-item" + (view === n.key ? " active" : "")}
                onClick={() => (n.key === "workflow" ? goDashboard() : setView(n.key))}
              >
                <span className="nav-dot" /> {n.label}
              </button>
            ))}
          </nav>

          <div className="nav-label">Applications · scan to launch</div>
          <nav className="nav">
            {APP_ORDER.map((id) => {
              const app = APPS[id];
              const active = view === "workflow" && state.appId === id && state.stage !== "home";
              return (
                <button key={id} className={"nav-item" + (active ? " active" : "")} onClick={() => launch(id)}>
                  <span className="nav-dot" /> {app.name}
                  {app.lead && <span className="nav-tm">LEAD</span>}
                </button>
              );
            })}
          </nav>

          <div className="sidebar-foot">
            <div className="device-chip">
              <span className="pulse" />
              <div>
                <div className="dc-name">GoDEVICE</div>
                <div className="dc-status">CONNECTED · v{SOFTWARE.version}</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="main">
          <header className="topbar">
            <div className="crumbs">
              <span>GoCARE</span>
              {crumbTrail.map((c, i) => (
                <span key={i} style={{ display: "contents" }}>
                  <span className="crumb-sep">/</span>
                  {i === crumbTrail.length - 1 ? <b>{c}</b> : <span>{c}</span>}
                </span>
              ))}
            </div>
            <div className="topbar-right">
              <button className="press operator-chip" onClick={() => dispatch({ type: "LOCK" })} title="Lock session">
                <span className="avatar">{state.operator?.initials}</span>
                <span className="hide-compact op-meta">
                  <span className="op-name">{state.operator?.name}</span>
                  <span className="op-role">{state.operator?.role}</span>
                </span>
                <span className="lock-mini">🔒</span>
              </button>
              <button className="press btn btn-ghost signout-btn hide-compact" onClick={() => dispatch({ type: "SIGN_OUT_OPERATOR" })}>
                Sign out
              </button>
            </div>
          </header>

          <div className="scroll">
            {view === "menu" ? (
              <MenuScreen />
            ) : view === "amr" ? (
              <AmrScreen />
            ) : view === "audit" ? (
              <AuditScreen />
            ) : view === "compliance" ? (
              <ComplianceScreen />
            ) : state.stage === "home" ? (
              <HomeScreen />
            ) : state.stage === "configure" ? (
              <ConfigureScreen />
            ) : state.stage === "running" ? (
              <RunScreen />
            ) : (
              <ResultsScreen />
            )}
          </div>

          {/* Bottom tab bar (phone) */}
          <nav className="tabbar">
            {NAV.map((n) => (
              <button
                key={n.key}
                className={"tab" + (view === n.key ? " active" : "")}
                onClick={() => (n.key === "workflow" ? goDashboard() : setView(n.key))}
              >
                <span className="tab-glyph">{n.glyph}</span>
                <span className="tab-label">{n.label}</span>
              </button>
            ))}
          </nav>
        </main>
      </div>
    </div>
  );
}

function Gate() {
  const { state } = useSession();
  if (!state.operator) return <LoginScreen />;
  if (state.locked) return <LockScreen />;
  return <Workspace />;
}

export default function App() {
  return (
    <SessionProvider>
      <Gate />
    </SessionProvider>
  );
}
