import { useEffect, useRef } from "react";
import { APPS } from "../data/catalog";
import { useSession } from "../store/session";
import { runDetect, stepFromProgress } from "../engine/run";

/** Total simulated run duration by application (ms) — compressed for demo. */
const DURATION: Record<string, number> = {
  goprep: 6000,
  godetect: 7000,
  goseq: 6500,
  goh2o: 6000,
};

export function RunScreen() {
  const { state, dispatch } = useSession();
  const appId = state.appId!;
  const app = APPS[appId];

  // stateRef so the interval never acts on a stale closure (SURV pitfall #stateRef).
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const start = performance.now();
    const dur = DURATION[appId] ?? 6000;
    const timer = setInterval(() => {
      const p = Math.min(1, (performance.now() - start) / dur);
      dispatch({ type: "SET_PROGRESS", progress: p });
      if (p >= 1) {
        clearInterval(timer);
        const s = stateRef.current;
        const producesDetect = appId === "godetect" || appId === "goh2o";
        const result =
          producesDetect && s.matrixId
            ? runDetect(s.matrixId, s.lot ?? "LOT", s.forcedPathogen)
            : null;
        dispatch({ type: "COMPLETE_RUN", result });
      }
    }, 90);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId]);

  const stepIdx = stepFromProgress(state.runProgress, app.steps.length);
  const pct = Math.round(state.runProgress * 100);

  return (
    <div className="fade-in" style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 30, alignItems: "center", height: "100%" }}>
      {/* Instrument animation */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
        <div style={{ position: "relative", display: "grid", placeItems: "center" }}>
          <div className="ring" />
          <div style={{ position: "absolute", textAlign: "center" }}>
            <div className="stat accent" style={{ fontSize: 34 }}>
              {pct}%
            </div>
            <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.1em" }}>
              RUNNING
            </div>
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div className="stat" style={{ fontSize: 22 }}>
            {app.tm}
          </div>
          <div className="mono" style={{ fontSize: 11, color: "var(--accent)", marginTop: 4 }}>
            {state.lot}
          </div>
        </div>
        <div style={{ width: "82%" }}>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="helper" style={{ textAlign: "center", maxWidth: 320 }}>
          Do not open the lid or remove the cartridge while the instrument is running. Results transfer to the secure
          device automatically.
        </div>
      </div>

      {/* Live step list */}
      <div className="panel panel-pad">
        <div className="section-label">Automated workflow · {app.tagline}</div>
        <div className="steps">
          {app.steps.map((label, i) => (
            <div key={label} className={"step" + (i < stepIdx ? " done" : i === stepIdx ? " active" : "")}>
              <div className="step-num">{i < stepIdx ? "✓" : String(i + 1).padStart(2, "0")}</div>
              <div>
                <div className="step-label">{label}</div>
                {i === stepIdx && <div className="step-detail">In progress…</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
