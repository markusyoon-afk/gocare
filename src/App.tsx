import { useState } from "react";
import { SessionProvider, useSession } from "./store/session";
import { APPS, APP_ORDER, type AppId } from "./data/catalog";
import { HomeScreen } from "./screens/HomeScreen";
import { ConfigureScreen } from "./screens/ConfigureScreen";
import { RunScreen } from "./screens/RunScreen";
import { ResultsScreen } from "./screens/ResultsScreen";
import { MenuScreen } from "./screens/MenuScreen";
import { AmrScreen } from "./screens/AmrScreen";

type View = "workflow" | "menu" | "amr";

function Shell() {
  const { state, dispatch } = useSession();
  const [view, setView] = useState<View>("workflow");

  function launch(appId: AppId) {
    const lot = `${APPS[appId].qrPrefix}-${Math.floor(1000 + Math.random() * 9000)}`;
    dispatch({ type: "SCAN_CARTRIDGE", appId, lot });
    setView("workflow");
  }

  const stageLabel: Record<string, string> = {
    home: "Dashboard",
    configure: "Configure",
    running: "Running",
    results: "Results",
  };

  return (
    <div className="app-bg">
      <div className="shell">
        {/* Sidebar */}
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
            <button
              className={"nav-item" + (view === "workflow" ? " active" : "")}
              onClick={() => {
                setView("workflow");
                if (state.stage !== "home") dispatch({ type: "GO_HOME" });
              }}
            >
              <span className="nav-dot" /> Dashboard
            </button>
            <button className={"nav-item" + (view === "menu" ? " active" : "")} onClick={() => setView("menu")}>
              <span className="nav-dot" /> Test Menu
            </button>
            <button className={"nav-item" + (view === "amr" ? " active" : "")} onClick={() => setView("amr")}>
              <span className="nav-dot" /> AMR Library
            </button>
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
                <div className="dc-status">CONNECTED · v3.1.4</div>
              </div>
            </div>
            <div className="mono" style={{ fontSize: 9, color: "var(--muted-2)", letterSpacing: "0.08em", padding: "0 4px" }}>
              GoDx Confidential
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="main">
          <header className="topbar">
            <div className="crumbs">
              {view === "workflow" ? (
                <>
                  <span>GoCARE</span>
                  <span className="crumb-sep">/</span>
                  {state.appId && state.stage !== "home" ? (
                    <>
                      <b>{APPS[state.appId].name}</b>
                      <span className="crumb-sep">/</span>
                      <span>{stageLabel[state.stage]}</span>
                    </>
                  ) : (
                    <span>Dashboard</span>
                  )}
                </>
              ) : (
                <>
                  <span>GoCARE</span>
                  <span className="crumb-sep">/</span>
                  <b>{view === "menu" ? "Test Menu" : "AMR Library"}</b>
                </>
              )}
            </div>
            <div className="topbar-right">
              <span className="chip chip-accent">Molecular intelligence</span>
            </div>
          </header>

          <div className="scroll">
            {view === "menu" ? (
              <MenuScreen />
            ) : view === "amr" ? (
              <AmrScreen />
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
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <Shell />
    </SessionProvider>
  );
}
