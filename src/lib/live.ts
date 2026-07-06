/**
 * Live link — the transport between the clinician console and the GoDEVICE
 * touchscreen. Interface-first (SURV pattern): BroadcastChannel across windows
 * today; a WebSocket / BLE bridge to the physical instrument drops in behind the
 * same publish/subscribe surface with no screen changes.
 */

import type { AppId } from "../data/catalog";

export type LiveEvent =
  | {
      type: "run";
      appId: AppId;
      lot: string;
      sampleId: string | null;
      progress: number; // 0..1
      done: boolean;
      readout: { tone: string; result: string; action: string } | null;
    }
  | {
      type: "telemetry";
      device: { model: string; serial: string; firmware: string; label: string };
      clinic: string;
      status: "ready" | "running" | "done";
      staged: { appId: AppId; lot: string; sampleId: string | null } | null;
      inventory: { appId: AppId; stock: number; low: boolean }[];
    }
  | { type: "cmd"; action: "start" | "home" };

const CHANNEL = "gocare-live";
const senderId = Math.random().toString(36).slice(2);

type Handler = (e: LiveEvent, fromSelf: boolean) => void;

let chan: BroadcastChannel | null = null;
const handlers = new Set<Handler>();

function ensure(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  if (!chan) {
    chan = new BroadcastChannel(CHANNEL);
    chan.onmessage = (ev) => {
      const { from, payload } = ev.data ?? {};
      handlers.forEach((h) => h(payload as LiveEvent, from === senderId));
    };
  }
  return chan;
}

export function publish(e: LiveEvent) {
  const c = ensure();
  // Deliver to same-window subscribers too (BroadcastChannel skips the sender).
  handlers.forEach((h) => h(e, true));
  c?.postMessage({ from: senderId, payload: e });
}

export function subscribe(h: Handler): () => void {
  ensure();
  handlers.add(h);
  return () => handlers.delete(h);
}

/** True when this window was opened as the dedicated GoDEVICE touchscreen. */
export function isDeviceWindow(): boolean {
  return new URLSearchParams(location.search).get("device") === "1";
}
