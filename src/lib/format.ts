import { MATRICES, PATHOGENS } from "../data/catalog";
import type { DetectResult } from "../engine/run";

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
