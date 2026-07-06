/**
 * Run simulation — deterministic, seeded results for a GoDETECT / GoSEQ / GoPREP run.
 *
 * Real GoDEVICE runs return per-target lateral-flow calls; here we synthesize a
 * plausible, reproducible result from a seed so the same cartridge lot always
 * demonstrates the same case. Pure and framework-free (SURV engine/store split).
 */

import {
  MATRICES,
  PATHOGENS,
  SNP_ASSAYS,
  type Pathogen,
  type SnpAssay,
} from "../data/catalog";
import { interpret, type Interpretation } from "./resistance";

/** Small seeded PRNG (mulberry32) — same seed, same world. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface TargetCall {
  pathogenId: string;
  name: string;
  disease: string;
  idMarker?: string;
  detected: boolean;
  /** Signal band shown on the strip readout (arbitrary 0–1 line intensity). */
  signal: number;
}

export interface SnpCall {
  assayId: string;
  label: string;
  gene: string;
  detected: boolean;
  signal: number;
}

export interface DetectResult {
  kind: "godetect";
  matrixId: string;
  seed: string;
  targets: TargetCall[];
  snps: SnpCall[];
  interpretation: Interpretation;
  positivePathogen?: string;
  /** Cartridge internal (procedural) control. Must be valid to report — CLIA QC gating. */
  controlValid: boolean;
  /** Control-line signal intensity (0–1); low intensity fails the run. */
  controlSignal: number;
}

/**
 * Simulate a GoDETECT run against a matrix panel.
 * `forcedPathogen` (optional) guarantees a demo-friendly positive.
 */
export function runDetect(matrixId: string, seed: string, forcedPathogen?: string): DetectResult {
  const matrix = MATRICES[matrixId];
  const r = rng(hashSeed(seed + matrixId));

  const panel: Pathogen[] = (matrix?.panel ?? []).map((id) => PATHOGENS[id]);

  // Pick the "true positive" organism for this sample.
  const positive =
    forcedPathogen && panel.some((p) => p.id === forcedPathogen)
      ? forcedPathogen
      : panel.length
      ? panel[Math.floor(r() * panel.length)].id
      : undefined;

  const targets: TargetCall[] = panel.map((p) => {
    const detected = p.id === positive;
    return {
      pathogenId: p.id,
      name: p.name,
      disease: p.disease,
      idMarker: p.idMarker,
      detected,
      signal: detected ? 0.72 + r() * 0.26 : r() * 0.06,
    };
  });

  // AMR SNPs only apply to the detected organism, and only assays that exist for it.
  const relevantAssays: SnpAssay[] = positive
    ? SNP_ASSAYS.filter((a) => a.pathogen === positive)
    : [];

  const snps: SnpCall[] = relevantAssays.map((a) => {
    // Available assays are more likely to show a resistant call in the demo world;
    // gate detection on the seeded draw so results are reproducible.
    const base = a.status === "available" ? 0.62 : a.status === "in_development" ? 0.4 : 0.25;
    const detected = r() < base;
    return {
      assayId: a.id,
      label: a.label,
      gene: a.gene,
      detected,
      signal: detected ? 0.6 + r() * 0.34 : r() * 0.05,
    };
  });

  const interpretation = interpret(snps.filter((s) => s.detected).map((s) => s.assayId));

  // Internal procedural control: valid in the large majority of runs; a weak
  // control line (<0.4) fails QC and blocks reporting (repeat the test).
  const controlSignal = 0.5 + r() * 0.5;
  const forcedInvalid = seed.toUpperCase().includes("QCFAIL");
  const controlValid = !forcedInvalid && controlSignal >= 0.4;

  return {
    kind: "godetect",
    matrixId,
    seed,
    targets,
    snps,
    interpretation,
    positivePathogen: positive,
    controlValid,
    controlSignal,
  };
}

/** Progress model: map an elapsed fraction (0–1) to a step index over N steps. */
export function stepFromProgress(progress: number, steps: number): number {
  return Math.min(steps - 1, Math.floor(progress * steps));
}
