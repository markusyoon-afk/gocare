import { APPS, type AppId } from "../data/catalog";
import { FLOWS } from "../data/stages";
import { useSession } from "../store/session";
import { useDevice, inventorySummary, activeDevice } from "../store/device";
import { useLiveMirror } from "../lib/useLive";
import { publish, isDeviceWindow } from "../lib/live";
import { clinicalReadout, deviceStatus } from "../lib/format";
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

      {/* Cartridge inventory glance */}
      <div className="kiosk-inv">
        {inv.map((c) => (
          <div key={c.appId} className={"kiosk-inv-item" + (c.low ? " low" : "")}>
            <span className="kiosk-inv-name">{APPS[c.appId].name}</span>
            <span className="kiosk-inv-stock stat">{c.stock}</span>
            {c.low && <span className="chip chip-snp">LOW</span>}
          </div>
        ))}
      </div>
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
