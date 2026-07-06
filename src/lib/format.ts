import { MATRICES, PATHOGENS } from "../data/catalog";
import type { DetectResult } from "../engine/run";

export type DeviceStatus = "ready" | "running" | "done";

/**
 * GoDEVICE indicator-light status from the workflow stage:
 *  ready  → green static  (empty, ready to receive a cartridge)
 *  running→ yellow pulse  (processing)
 *  done   → red static    (finished cartridge still inserted)
 */
export function deviceStatus(stage: string): DeviceStatus {
  if (stage === "running") return "running";
  if (stage === "results") return "done";
  return "ready";
}

export const STATUS_META: Record<DeviceStatus, { label: string; hint: string }> = {
  ready: { label: "Ready", hint: "Empty — ready to receive a cartridge" },
  running: { label: "Processing", hint: "Run in progress" },
  done: { label: "Cartridge in — done", hint: "Finished cartridge still inserted" },
};

/** Format seconds as m:ss, or h:mm:ss past an hour. */
export function fmtClock(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(ss)}` : `${m}:${pad(ss)}`;
}

export type ReadoutTone = "positive" | "resistant" | "negative" | "invalid";

export interface ClinicalReadout {
  tone: ReadoutTone;
  /** One-line result, no jargon. */
  result: string;
  /** The single next action, phrased directly — no interpretation needed. */
  action: string;
}

/**
 * Turn a detection result into a direct, actionable readout for the clinician —
 * the "what do I do now" line, so the screen doesn't require interpretation.
 */
export function clinicalReadout(result: DetectResult): ClinicalReadout {
  if (!result.controlValid) {
    return {
      tone: "invalid",
      result: "Invalid run — internal control failed",
      action: "Do not report. Repeat the test with a new cartridge.",
    };
  }
  if (!result.positivePathogen) {
    return {
      tone: "negative",
      result: "No target pathogen detected",
      action: "Negative for the panel. Pursue alternative workup if symptoms persist.",
    };
  }
  const name = PATHOGENS[result.positivePathogen].name;
  const { avoid, consider } = result.interpretation;
  if (avoid.length > 0) {
    const considerTxt = consider.length ? ` Use ${consider.join(" or ")}.` : "";
    return {
      tone: "resistant",
      result: `${name} detected — resistant`,
      action: `Do NOT use ${avoid.join(", ")} (resistance detected).${considerTxt}`,
    };
  }
  return {
    tone: "positive",
    result: `${name} detected — no resistance detected`,
    action: "No known resistance markers found. First-line therapy is appropriate per local guidelines.",
  };
}

/** One-line human summary of a completed run — used in the audit log and history. */
export function summarize(appId: string, result: DetectResult | null, matrixId: string | null): string {
  if (appId === "goprep") return `Purified NA · ${matrixId ? MATRICES[matrixId].name : "sample"}`;
  if (appId === "goseq") return "Library ready → BugSEQ";
  if (result) {
    if (!result.controlValid) return "Invalid — internal control failed";
    if (!result.positivePathogen) return "No target detected";
    const name = PATHOGENS[result.positivePathogen].name;
    const resistant = result.interpretation.avoid.length > 0;
    return `${name} detected${resistant ? ` · resists ${result.interpretation.avoid.length} drug(s)` : " · susceptible"}`;
  }
  return "Run complete";
}
