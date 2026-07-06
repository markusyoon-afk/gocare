import { flowTotals, typicalLabel, type AppFlow } from "../data/stages";

/**
 * StageTracker — the visible toll-gate progress bar.
 *
 * A segmented horizontal bar (segment widths = real stage durations) that fills as
 * the run advances, with an accelerated clinical clock (elapsed / total) and the
 * current stage called out. Presentational: the caller owns the timing so the same
 * component renders live on both the console and the GoDEVICE touchscreen mirror.
 */
export function StageTracker({
  flow,
  progress,
  done = false,
  compact = false,
}: {
  flow: AppFlow;
  progress: number; // 0..1 overall
  done?: boolean;
  compact?: boolean;
}) {
  const { total, cum } = flowTotals(flow);
  const elapsed = Math.min(total, progress * total);
  const activeIndex = done
    ? flow.stages.length - 1
    : (() => {
        let idx = 0;
        for (let i = 0; i < flow.stages.length; i++) if (elapsed >= cum[i]) idx = i;
        return idx;
      })();
  const active = flow.stages[activeIndex];

  return (
    <div className="tracker">
      <div className="tracker-head">
        <div>
          <div className="tracker-stage-label">
            {done ? "Complete" : `Stage ${activeIndex + 1} / ${flow.stages.length}`}
          </div>
          <div className="tracker-stage-name">{done ? "Run complete" : active.label}</div>
        </div>
        <div className="tracker-clock">
          <span className="tracker-typical-label">Typical run time</span>
          <span className="stat accent" style={{ fontSize: 22 }}>{typicalLabel(flow)}</span>
        </div>
      </div>

      {/* Segmented bar — each segment sized by its real duration, fills as time passes */}
      <div className="seg-bar" role="progressbar" aria-valuenow={Math.round(progress * 100)}>
        {flow.stages.map((s, i) => {
          const segStart = cum[i];
          const fill = done ? 1 : Math.max(0, Math.min(1, (elapsed - segStart) / s.estSec));
          const state = fill >= 1 ? "done" : i === activeIndex && !done ? "active" : fill > 0 ? "active" : "todo";
          return (
            <div key={s.key} className={"seg " + state} style={{ flexGrow: s.estSec }} title={s.label}>
              <div className="seg-fill" style={{ width: `${fill * 100}%` }} />
            </div>
          );
        })}
      </div>

      {!compact && (
        <div className="seg-labels">
          {flow.stages.map((s, i) => {
            const st = done || i < activeIndex ? "done" : i === activeIndex ? "active" : "todo";
            return (
              <div key={s.key} className={"seg-label " + st} style={{ flexGrow: s.estSec }}>
                <span className="seg-dot">{st === "done" ? "✓" : i + 1}</span>
                <span className="seg-text">{s.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {!compact && !done && <div className="tracker-detail">{active.detail}</div>}
    </div>
  );
}
