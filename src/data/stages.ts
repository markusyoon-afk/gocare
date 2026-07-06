/**
 * Clinical run stages per application — the "toll gates" the progress tracker fills.
 *
 * Ordering and durations follow each cartridge's real workflow (GoDx technical brief
 * + standard molecular POC practice). estSec is the real clinical time for the stage;
 * the tracker counts a real (accelerated) clock toward it. demoMs is the compressed
 * wall-clock the simulation actually takes.
 */

import type { AppId } from "./catalog";

export interface Stage {
  key: string;
  label: string;
  detail: string;
  estSec: number;
}

export interface AppFlow {
  stages: Stage[];
  demoMs: number;
}

export const FLOWS: Record<AppId, AppFlow> = {
  // Magnetic-bead extraction: prime/wash → lyse → capture → wash → elute.
  goprep: {
    demoMs: 6500,
    stages: [
      { key: "prime", label: "Prime & wash", detail: "Reagents primed; buffer wash of the cartridge channels.", estSec: 180 },
      { key: "lysis", label: "Lysis", detail: "Sample lysed to release nucleic acid.", estSec: 300 },
      { key: "capture", label: "Bead capture", detail: "Magnetic beads bind the nucleic acid.", estSec: 300 },
      { key: "wash", label: "Wash", detail: "Inhibitors and debris washed away.", estSec: 420 },
      { key: "elute", label: "Elution", detail: "Purified NA eluted into the detachable tube.", estSec: 300 },
    ],
  },
  // Sample prep → GoAMP (RPA) → lateral-flow detection → readout → report.
  godetect: {
    demoMs: 7000,
    stages: [
      { key: "prep", label: "Sample prep", detail: "On-cartridge extraction of nucleic acid.", estSec: 600 },
      { key: "goamp", label: "GoAMP amplification", detail: "Isothermal RPA at 37–42°C amplifies targets + SNP sites.", estSec: 300 },
      { key: "detect", label: "Detection", detail: "Multiplex lateral-flow strips develop.", estSec: 120 },
      { key: "readout", label: "Readout", detail: "Strip lines imaged and called per target.", estSec: 30 },
      { key: "report", label: "Report", detail: "Pathogen + AMR result compiled.", estSec: 30 },
    ],
  },
  // Water collector fills → sample prep → GoAMP → detection → report.
  goh2o: {
    demoMs: 7000,
    stages: [
      { key: "collect", label: "Water collection", detail: "Collector concentrates the environmental sample until filled.", estSec: 600 },
      { key: "prep", label: "Sample prep", detail: "Concentrated sample lysed and nucleic acid captured.", estSec: 600 },
      { key: "goamp", label: "GoAMP amplification", detail: "Isothermal RPA amplifies pathogen + AMR targets.", estSec: 300 },
      { key: "detect", label: "Detection", detail: "Lateral-flow strips develop and are called.", estSec: 240 },
      { key: "report", label: "Report", detail: "Surveillance result compiled and logged.", estSec: 60 },
    ],
  },
  // Sample prep → library prep → load flow cell → sequencing → bioinformatics → results.
  goseq: {
    demoMs: 8000,
    stages: [
      { key: "prep", label: "Sample prep", detail: "Raw agnostic sample lysed and cleaned.", estSec: 600 },
      { key: "library", label: "Library prep", detail: "Fragment, tag, and SPRI-clean the sequencing library.", estSec: 1800 },
      { key: "loadcell", label: "Load flow cell", detail: "Prime and load the Oxford Nanopore MinION flow cell.", estSec: 300 },
      { key: "sequencing", label: "Sequencing (NGS)", detail: "Nanopore reads stream to Jetson edge compute.", estSec: 3600 },
      { key: "bioinformatics", label: "Bioinformatics", detail: "BugSEQ classifies reads + screens AMR (untargeted / metagenomic).", estSec: 840 },
      { key: "results", label: "Results", detail: "Taxonomic profile + AMR findings compiled.", estSec: 60 },
    ],
  },
};

/** Total est seconds and the cumulative start offset of each stage. */
export function flowTotals(flow: AppFlow): { total: number; cum: number[] } {
  const cum: number[] = [];
  let acc = 0;
  for (const s of flow.stages) {
    cum.push(acc);
    acc += s.estSec;
  }
  return { total: acc, cum };
}

/** Active stage index for an overall 0..1 progress. */
export function stageAtProgress(flow: AppFlow, progress: number): number {
  const { total, cum } = flowTotals(flow);
  const t = progress * total;
  let idx = 0;
  for (let i = 0; i < flow.stages.length; i++) if (t >= cum[i]) idx = i;
  return idx;
}
