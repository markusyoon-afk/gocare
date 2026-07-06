import { useEffect, useRef } from "react";
import { APPS } from "../data/catalog";
import { FLOWS } from "../data/stages";
import { useSession } from "../store/session";
import { runDetect } from "../engine/run";
import { summarize, clinicalReadout } from "../lib/format";
import { publish } from "../lib/live";
import { StageTracker } from "../components/StageTracker";

export function RunScreen() {
  const { state, dispatch } = useSession();
  const appId = state.appId!;
  const app = APPS[appId];
  const flow = FLOWS[appId];

  // stateRef so the interval never acts on a stale closure (SURV pitfall).
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const start = performance.now();
    const dur = flow.demoMs;
    const timer = setInterval(() => {
      const p = Math.min(1, (performance.now() - start) / dur);
      dispatch({ type: "SET_PROGRESS", progress: p });
      const s = stateRef.current;
      publish({ type: "run", appId, lot: s.lot ?? "", sampleId: s.sampleId, progress: p, done: false, readout: null });
      if (p >= 1) {
        clearInterval(timer);
        const producesDetect = appId === "godetect" || appId === "goh2o";
        const result = producesDetect && s.matrixId ? runDetect(s.matrixId, s.lot ?? "LOT", s.forcedPathogen) : null;
        dispatch({ type: "COMPLETE_RUN", result, summary: summarize(appId, result, s.matrixId) });
        publish({
          type: "run",
          appId,
          lot: s.lot ?? "",
          sampleId: s.sampleId,
          progress: 1,
          done: true,
          readout: result ? clinicalReadout(result) : null,
        });
      }
    }, 90);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId]);

  return (
    <div className="fade-in run-layout">
      <div className="run-head">
        <div className="eyebrow">{app.tm} · Running</div>
        <h1 className="page-title" style={{ marginBottom: 4 }}>
          {app.tagline}
        </h1>
        <p className="page-sub mono" style={{ fontSize: 12 }}>
          {state.lot} · sample {state.sampleId ?? "—"}
        </p>
      </div>

      {/* The toll-gate tracker — the primary element */}
      <div className="panel panel-pad tracker-panel">
        <StageTracker flow={flow} progress={state.runProgress} />
      </div>

      <div className="run-foot">
        <div className="run-instrument">
          <div className="ring" style={{ width: 66, height: 66 }} />
          <div>
            <div className="stat" style={{ fontSize: 18 }}>{app.tm}</div>
            <div className="helper">Walk-away · do not open the lid</div>
          </div>
        </div>
        <div className="chip chip-accent live-tag">◉ Live to GoDEVICE</div>
      </div>
    </div>
  );
}
