import { QRCode } from "./QRCode";
import { APPS, type AppId } from "../data/catalog";

/** Cartridge label card with its scannable QR and lot id. */
export function CartridgeCard({ appId, lot }: { appId: AppId; lot: string }) {
  const app = APPS[appId];
  return (
    <div className="cartridge" style={{ display: "flex", gap: 16, alignItems: "center" }}>
      <QRCode value={lot} />
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="stat" style={{ fontSize: 22 }}>
            {app.tm}
          </span>
          {app.lead && <span className="chip chip-lead">LEAD</span>}
        </div>
        <div className="mono" style={{ fontSize: 11, color: "var(--accent)", marginTop: 4, letterSpacing: "0.06em" }}>
          {lot}
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>{app.tagline}</div>
      </div>
    </div>
  );
}
