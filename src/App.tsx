import { useEffect, useRef, useState } from "react";
import { SessionProvider, useSession } from "./store/session";
import { DeviceProvider, useDevice, inventorySummary, activeDevice } from "./store/device";
import { APPS, APP_ORDER, type AppId } from "./data/catalog";
import { SOFTWARE } from "./data/compliance";
import { clinicalReadout, deviceStatus } from "./lib/format";
import { publish, subscribe, isDeviceWindow } from "./lib/live";
import { DeviceStatusBar } from "./components/DeviceStatusBar";
import { Logo } from "./components/Logo";
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
import { AccessGate, isUnlocked } from "./screens/AccessGate";
import { DeviceScreen } from "./screens/DeviceScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { InventoryScreen } from "./screens/InventoryScreen";
import { HistoryScreen } from "./screens/HistoryScreen";
import { AnalyticsScreen } from "./screens/AnalyticsScreen";
import { InstructionsScreen } from "./screens/InstructionsScreen";

type View =
  | "workflow" | "device" | "instructions" | "history" | "analytics"
  | "inventory" | "settings" | "menu" | "amr" | "audit" | "compliance";

const NAV: { key: View; label: string; glyph: string; section: string }[] = [
  { key: "workflow", label: "Dashboard", glyph: "▦", section: "Run" },
  { key: "device", label: "GoDEVICE", glyph: "▣", section: "Run" },
  { key: "instructions", label: "How to run", glyph: "▷", section: "Run" },
  { key: "history", label: "History", glyph: "◷", section: "Surveillance" },
  { key: "analytics", label: "Analytics", glyph: "◔", section: "Surveillance" },
  { key: "inventory", label: "Inventory", glyph: "▤", section: "Manage" },
  { key: "settings", label: "Settings", glyph: "⚙", section: "Manage" },
  { key: "menu", label: "Test Menu", glyph: "☰", section: "Reference" },
  { key: "amr", label: "AMR Library", glyph: "⚕", section: "Reference" },
  { key: "audit", label: "Audit", glyph: "◈", section: "Governance" },
  { key: "compliance", label: "Compliance", glyph: "⛨", section: "Governance" },
];
const SECTIONS = ["Run", "Surveillance", "Manage", "Reference", "Governance"];
const PHONE_TABS: View[] = ["workflow", "device", "history", "analytics", "inventory"];

/** Bridges the console to the live link: telemetry out, commands in, cartridge use. */
function LiveBridge() {
  const { state, dispatch } = useSession();
  const { state: dev, dispatch: devDispatch } = useDevice();
  const sessionRef = useRef(state);
  sessionRef.current = state;

  const lastLot = useRef<string | null>(null);
  useEffect(() => {
    if (state.stage === "running" && state.lot && state.appId && lastLot.current !== state.lot) {
      lastLot.current = state.lot;
      devDispatch({ type: "CONSUME", appId: state.appId });
    }
  }, [state.stage, state.lot, state.appId, devDispatch]);

  useEffect(() => {
    const send = () => {
      const unit = activeDevice(dev);
      const staged =
        state.stage === "configure" && state.appId
          ? { appId: state.appId, lot: state.lot!, sampleId: state.sampleId }
          : null;
      publish({
        type: "telemetry",
        device: { model: unit.model, serial: unit.serial, firmware: unit.firmware, label: unit.label },
        clinic: dev.clinic.name,
        status: deviceStatus(state.stage),
        staged,
        inventory: inventorySummary(dev).map((i) => ({ appId: i.appId, stock: i.stock, low: i.low })),
      });
      if (state.stage === "results" && (state.appId === "godetect" || state.appId === "goh2o") && state.result) {
        publish({
          type: "run",
          appId: state.appId,
          lot: state.lot ?? "",
          sampleId: state.sampleId,
          progress: 1,
          done: true,
          readout: clinicalReadout(state.result),
        });
      }
    };
    send();
    const t = setInterval(send, 1500);
    return () => clearInterval(t);
  }, [state.stage, state.appId, state.lot, state.sampleId, state.result, dev]);

  useEffect(
    () =>
      subscribe((e) => {
        if (e.type !== "cmd") return;
        const s = sessionRef.current;
        if (e.action === "start") {
          if (s.stage === "configure" && s.sampleId && (s.matrixId || s.appId === "goseq")) dispatch({ type: "START_RUN" });
        } else if (e.action === "home") {
          dispatch({ type: "GO_HOME" });
        }
      }),
    [dispatch],
  );

  return null;
}

function Workspace() {
  const { state, dispatch } = useSession();
  const [view, setView] = useState<View>("workflow");

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

  // Full sign-out after inactivity (auto-logoff); the topbar Lock button handles
  // quick step-aways separately.
  useEffect(() => {
    const t = setInterval(() => {
      if (Date.now() - state.lastActivity >= SOFTWARE.sessionLockMs) dispatch({ type: "SIGN_OUT_OPERATOR" });
    }, 5000);
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
  function nav(v: View) {
    v === "workflow" ? goDashboard() : setView(v);
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
      <LiveBridge />
      <div className="classification-bar">
        <span>{SOFTWARE.classification}</span>
        <span className="cb-mid hide-compact">{SOFTWARE.intendedUse}</span>
        <DeviceStatusBar />
      </div>

      <div className="shell">
        <aside className="sidebar">
          <div className="brand">
            <Logo className="logo-mark" size={38} />
            <div>
              <div className="brand-name">GoCARE</div>
              <div className="brand-sub">GoDx · SaMD</div>
            </div>
          </div>

          {SECTIONS.map((sec) => (
            <div key={sec}>
              <div className="nav-label">{sec}</div>
              <nav className="nav">
                {NAV.filter((n) => n.section === sec).map((n) => (
                  <button key={n.key} className={"nav-item" + (view === n.key ? " active" : "")} onClick={() => nav(n.key)}>
                    <span className="nav-glyph">{n.glyph}</span> {n.label}
                  </button>
                ))}
              </nav>
            </div>
          ))}

          <div className="nav-label">Scan to launch</div>
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
        </aside>

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
            {view === "device" ? <DeviceScreen />
              : view === "instructions" ? <InstructionsScreen />
              : view === "history" ? <HistoryScreen />
              : view === "analytics" ? <AnalyticsScreen />
              : view === "inventory" ? <InventoryScreen />
              : view === "settings" ? <SettingsScreen />
              : view === "menu" ? <MenuScreen />
              : view === "amr" ? <AmrScreen />
              : view === "audit" ? <AuditScreen />
              : view === "compliance" ? <ComplianceScreen />
              : state.stage === "home" ? <HomeScreen />
              : state.stage === "configure" ? <ConfigureScreen />
              : state.stage === "running" ? <RunScreen />
              : <ResultsScreen />}
          </div>

          <nav className="tabbar">
            {NAV.filter((n) => PHONE_TABS.includes(n.key)).map((n) => (
              <button key={n.key} className={"tab" + (view === n.key ? " active" : "")} onClick={() => nav(n.key)}>
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

function DeviceWindow() {
  return (
    <div className="app-bg device-window">
      <DeviceScreen kiosk />
    </div>
  );
}

export default function App() {
  const device = isDeviceWindow();
  const [unlocked, setUnlocked] = useState(isUnlocked());
  if (!unlocked) return <AccessGate onUnlock={() => setUnlocked(true)} />;
  return (
    <DeviceProvider>
      <SessionProvider>{device ? <DeviceWindow /> : <Gate />}</SessionProvider>
    </DeviceProvider>
  );
}
