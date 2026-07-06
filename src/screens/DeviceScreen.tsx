import { useState } from "react";
import { APPS, MATRICES, type AppId } from "../data/catalog";
import { FLOWS } from "../data/stages";
import { useSession } from "../store/session";
import { useDevice, inventorySummary, activeDevice } from "../store/device";
import { useLiveMirror } from "../lib/useLive";
import { publish, isDeviceWindow } from "../lib/live";
import { clinicalReadout, deviceStatus } from "../lib/format";
import { unifiedHistory, pathogenName } from "../lib/history";
import { StageTracker } from "../components/StageTracker";
import { StatusLight } from "../components/DeviceStatusBar";

/**
 * GoDEVICE touchscreen — the simplified instrument surface.
 *
 * Glanceable only: identity, the staged cartridge, the big stage tracker, and the
 * one actionable result line. It mirrors the console live (broadcast link) and can
 * start a staged run itself. Rendered both as an in-console tab and, via ?device=1,
 * as a standalone second-window kiosk.
 */
export function DeviceScreen({ kiosk = false }: { kiosk?: boolean }) {
  const { state: s } = useSession();
  const { state: dev } = useDevice();
  const { run: liveRun, runAt, tele } = useLiveMirror();
  const [statsApp, setStatsApp] = useState<AppId | null>(null);

  const liveFresh = Date.now() - runAt < 10000;

  // Merge live (remote) over local session state so both surfaces render correctly.
  const active: {
    appId: AppId;
    lot: string;
    sampleId: string | null;
    progress: number;
    done: boolean;
    readout: ReturnType<typeof clinicalReadout> | null;
  } | null =
    liveRun && liveFresh
      ? {
          appId: liveRun.appId,
          lot: liveRun.lot,
          sampleId: liveRun.sampleId,
          progress: liveRun.progress,
          done: liveRun.done,
          readout: (liveRun.readout as ReturnType<typeof clinicalReadout> | null) ?? null,
        }
      : s.stage === "running"
      ? { appId: s.appId!, lot: s.lot!, sampleId: s.sampleId, progress: s.runProgress, done: false, readout: null }
      : s.stage === "results" && (s.appId === "godetect" || s.appId === "goh2o") && s.result
      ? { appId: s.appId, lot: s.lot!, sampleId: s.sampleId, progress: 1, done: true, readout: clinicalReadout(s.result) }
      : null;

  const staged = tele?.staged ?? (s.stage === "configure" && s.appId ? { appId: s.appId, lot: s.lot!, sampleId: s.sampleId } : null);
  const stagedReady = Boolean(staged && staged.sampleId);

  const unit = activeDevice(dev);
  const device = tele?.device ?? { model: unit.model, serial: unit.serial, firmware: unit.firmware, label: unit.label };
  const clinic = tele?.clinic ?? dev.clinic.name;
  const inv = tele?.inventory ?? inventorySummary(dev).map((i) => ({ appId: i.appId, stock: i.stock, low: i.low }));
  const status = tele?.status ?? deviceStatus(s.stage);

  const running = active && !active.done;

  return (
    <div className={"device-kiosk" + (kiosk ? " kiosk-full" : "")}>
      {/* Instrument header */}
      <div className="kiosk-head">
        <div className="kiosk-brand">
          <StatusLight status={status} size={16} />
          <div>
            <div className="kiosk-model">{device.label} · {device.model}</div>
            <div className="kiosk-serial mono">SN {device.serial} · fw {device.firmware}</div>
          </div>
        </div>
        <div className="kiosk-head-right">
          <div className="kiosk-clinic hide-compact">{clinic}</div>
          <span className="chip chip-susceptible">
            <span className="status-dot dot-available" /> LINKED
          </span>
          {!kiosk && (
            <button
              className="press btn btn-ghost open-device-btn"
              onClick={() => window.open(location.pathname + "?device=1", "gocare-device", "width=1040,height=720")}
            >
              Open on GoDEVICE ↗
            </button>
          )}
        </div>
      </div>

      {/* Main stage */}
      <div className="kiosk-stage">
        {active ? (
          active.done && active.readout ? (
            <ActionableReadout appId={active.appId} lot={active.lot} sampleId={active.sampleId} readout={active.readout} />
          ) : (
            <div className="kiosk-run fade-in">
              <div className="kiosk-run-head">
                <span className="stat" style={{ fontSize: 26 }}>{APPS[active.appId].tm}</span>
                <span className="mono kiosk-lot">{active.lot} · {active.sampleId ?? "—"}</span>
              </div>
              <StageTracker flow={FLOWS[active.appId]} progress={active.progress} done={active.done} />
              <div className="kiosk-note">{running ? "Running — walk away. Do not open the lid." : "Complete"}</div>
            </div>
          )
        ) : staged ? (
          <div className="kiosk-staged fade-in">
            <div className="kiosk-cartridge-glyph">▤</div>
            <div className="stat" style={{ fontSize: 30 }}>{APPS[staged.appId].tm}</div>
            <div className="helper" style={{ marginBottom: 4 }}>Cartridge inserted · {staged.sampleId ? `sample ${staged.sampleId}` : "awaiting Sample ID"}</div>
            <button
              className="press btn btn-primary kiosk-start"
              disabled={!stagedReady}
              onClick={() => publish({ type: "cmd", action: "start" })}
            >
              ▶ Start
            </button>
            {!stagedReady && <div className="helper">Scan the Sample ID on the console to enable Start.</div>}
          </div>
        ) : (
          <div className="kiosk-idle">
            <div className="ring" style={{ width: 84, height: 84, animationDuration: "3.4s" }} />
            <div className="stat" style={{ fontSize: 24 }}>Ready</div>
            <div className="helper">Insert a cartridge to begin. {isDeviceWindow() ? "Linked to console." : ""}</div>
          </div>
        )}
      </div>

      {/* Cartridge inventory — tap a cartridge for its informatics */}
      <div className="kiosk-inv">
        {inv.map((c) => (
          <button key={c.appId} className={"press kiosk-inv-item" + (c.low ? " low" : "")} onClick={() => setStatsApp(c.appId)}>
            <span className="kiosk-inv-name">{APPS[c.appId].name}</span>
            <span className="kiosk-inv-stock stat">{c.stock}</span>
            <span className="kiosk-inv-hint">{c.low ? "LOW · view stats ›" : "view stats ›"}</span>
          </button>
        ))}
      </div>

      {statsApp && <CartridgeStatsModal appId={statsApp} onClose={() => setStatsApp(null)} />}
    </div>
  );
}

/** Per-cartridge informatics — detections, dates, locations for this application. */
function CartridgeStatsModal({ appId, onClose }: { appId: AppId; onClose: () => void }) {
  const { state: s } = useSession();
  const { state: dev } = useDevice();
  const app = APPS[appId];
  const inv = dev.inventory[appId];
  const rows = unifiedHistory(s.history).filter((r) => r.appId === appId);
  const isDetection = appId === "godetect" || appId === "goh2o";
  const positives = rows.filter((r) => r.pathogen).length;
  const resistant = rows.filter((r) => r.resistant).length;

  return (
    <div className="stats-overlay" onClick={onClose}>
      <div className="stats-modal fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="stats-head">
          <div>
            <div className="stat" style={{ fontSize: 20 }}>{app.tm}</div>
            <div className="helper">{app.tagline}</div>
          </div>
          <button className="press btn btn-ghost" style={{ padding: "8px 14px" }} onClick={onClose}>Close</button>
        </div>

        <div className="grid grid-4 posture-strip" style={{ marginBottom: 16 }}>
          <MiniStat label="In stock" value={String(inv.stock)} />
          <MiniStat label="Used" value={String(inv.used)} />
          {isDetection ? <MiniStat label="Detections" value={String(positives)} /> : <MiniStat label="Runs logged" value={String(rows.length)} />}
          {isDetection ? <MiniStat label="Resistant" value={String(resistant)} /> : <MiniStat label="Type" value="Prep" />}
        </div>

        {isDetection ? (
          rows.length === 0 ? (
            <div className="empty">No results logged for {app.name} yet.</div>
          ) : (
            <div className="table-wrap">
              <table className="dtable">
                <thead>
                  <tr>
                    <th>Date · time</th>
                    <th>Result</th>
                    <th className="hide-compact">Location</th>
                    <th style={{ textAlign: "right" }}>AMR</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 40).map((r, i) => (
                    <tr key={r.cartridgeId + i} className={r.resistant ? "row-targeted" : ""}>
                      <td className="mono" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                        {new Date(r.ts).toLocaleDateString([], { month: "short", day: "numeric" })}
                        <span style={{ color: "var(--muted-2)" }}> {new Date(r.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </td>
                      <td style={{ fontWeight: r.pathogen ? 600 : 400, color: r.pathogen ? "var(--ink)" : "var(--muted)" }}>{pathogenName(r.pathogen)}</td>
                      <td className="helper hide-compact">{r.location} · {MATRICES[r.matrix]?.name ?? r.matrix}</td>
                      <td style={{ textAlign: "right" }}>{r.resistant ? <span className="chip chip-resistant">resistant</span> : r.pathogen ? <span className="chip chip-susceptible">none</span> : <span className="helper">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="helper">
            {app.name} is a {appId === "goprep" ? "sample-prep" : "library-prep"} step — it doesn't make a pathogen call, so
            there are no detections to chart. {inv.used} cartridge(s) used on this device.
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="feature panel panel-pad" style={{ padding: "12px 14px" }}>
      <div className="stat accent" style={{ fontSize: 20 }}>{value}</div>
      <div className="helper">{label}</div>
    </div>
  );
}

function ActionableReadout({
  appId,
  lot,
  sampleId,
  readout,
}: {
  appId: AppId;
  lot: string;
  sampleId: string | null;
  readout: ReturnType<typeof clinicalReadout>;
}) {
  return (
    <div className={"kiosk-readout fade-in tone-" + readout.tone}>
      <div className="kiosk-readout-tag mono">{APPS[appId].tm} · RESULT · {lot} · {sampleId ?? "—"}</div>
      <div className="kiosk-readout-result">{readout.result}</div>
      <div className="kiosk-readout-action">
        <span className="ra-label">ACTION</span>
        {readout.action}
      </div>
    </div>
  );
}
