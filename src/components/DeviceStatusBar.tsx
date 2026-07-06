import { useState } from "react";
import { useSession } from "../store/session";
import { useDevice, activeDevice } from "../store/device";
import { deviceStatus, STATUS_META, type DeviceStatus } from "../lib/format";

/** The traffic-light dot: green static / yellow pulsing / red static. */
export function StatusLight({ status, size = 11 }: { status: DeviceStatus; size?: number }) {
  return (
    <span
      className={"status-light sl-" + status}
      style={{ width: size, height: size }}
      title={STATUS_META[status].hint}
      aria-label={STATUS_META[status].label}
    />
  );
}

/**
 * Global GoDEVICE status + device switcher. Pinned in the classification bar so
 * it is visible on every screen. Shows the active instrument's light, name, and a
 * menu to switch among the GoDEVICEs registered to the account.
 */
export function DeviceStatusBar() {
  const { state: s } = useSession();
  const { state: dev, dispatch } = useDevice();
  const [open, setOpen] = useState(false);
  const active = activeDevice(dev);
  const status = deviceStatus(s.stage);

  return (
    <div className="dsb">
      <button className="dsb-current" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <StatusLight status={status} />
        <span className="dsb-name">{active.label}</span>
        <span className="dsb-serial mono hide-compact">{active.serial}</span>
        <span className="dsb-state hide-compact">· {STATUS_META[status].label}</span>
        <span className="dsb-caret">▾</span>
      </button>
      {open && (
        <>
          <div className="dsb-backdrop" onClick={() => setOpen(false)} />
          <div className="dsb-menu">
            <div className="dsb-menu-label">GoDEVICEs on this account</div>
            {dev.devices.map((d) => {
              const isActive = d.id === active.id;
              return (
                <button
                  key={d.id}
                  className={"dsb-item" + (isActive ? " active" : "")}
                  onClick={() => {
                    dispatch({ type: "SELECT_DEVICE", id: d.id });
                    setOpen(false);
                  }}
                >
                  <StatusLight status={isActive ? status : "ready"} />
                  <span style={{ flex: 1, textAlign: "left" }}>
                    <span className="dsb-item-name">{d.label}</span>
                    <span className="dsb-item-sub mono">{d.serial}{d.location ? ` · ${d.location.label}` : ""}</span>
                  </span>
                  {isActive && <span className="chip chip-accent">active</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
