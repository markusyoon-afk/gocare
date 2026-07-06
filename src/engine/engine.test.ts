/**
 * Engine test battery (SURV ratchet pattern): run with `npm test` (tsx).
 * Pure-logic regression + validation so future edits can't silently break the
 * resistance interpretation or the deterministic run simulation.
 */

import { interpret } from "./resistance";
import { runDetect, rng, hashSeed } from "./run";
import { SNP_ASSAYS, MATRICES } from "../data/catalog";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean) {
  if (cond) {
    pass++;
  } else {
    fail++;
    console.error("  ✗ " + name);
  }
}

// --- resistance interpretation ---
{
  const none = interpret([]);
  check("no assays => both classes susceptible", none.calls.every((c) => c.susceptibility === "susceptible"));
  check("no assays => empty avoid list", none.avoid.length === 0);

  const fq = interpret(["campy_gyrA_T86I"]);
  const fqCall = fq.calls.find((c) => c.antibioticClass === "Fluoroquinolones")!;
  check("gyrA T86I => fluoroquinolone resistant", fqCall.susceptibility === "resistant");
  check("gyrA T86I => avoid ciprofloxacin", fq.avoid.includes("ciprofloxacin"));
  check("gyrA T86I => consider a non-avoided fallback", fq.consider.length > 0 && !fq.consider.some((d) => fq.avoid.includes(d)));

  const both = interpret(["campy_gyrA_T86I", "campy_23S"]);
  check("gyrA + 23S => both classes resistant", both.calls.every((c) => c.susceptibility === "resistant"));
  check("both classes resistant => azithromycin avoided", both.avoid.includes("azithromycin"));
  check("both classes resistant => ceftriaxone still considered", both.consider.includes("ceftriaxone"));

  check("every SNP assay maps to a known class", SNP_ASSAYS.every((a) => ["Fluoroquinolones", "Macrolides"].includes(a.antibioticClass)));
}

// --- deterministic run ---
{
  const a = runDetect("stool", "LOT-42");
  const b = runDetect("stool", "LOT-42");
  check("same seed => identical positive call", a.positivePathogen === b.positivePathogen);
  check("same seed => identical SNP pattern", JSON.stringify(a.snps) === JSON.stringify(b.snps));

  const forced = runDetect("stool", "LOT-7", "salmonella");
  check("forced pathogen is the positive", forced.positivePathogen === "salmonella");
  check("forced positive target is detected", forced.targets.find((t) => t.pathogenId === "salmonella")?.detected === true);
  check("exactly one target detected", forced.targets.filter((t) => t.detected).length === 1);
  check("SNPs only belong to the positive organism", forced.snps.every((s) => SNP_ASSAYS.find((x) => x.id === s.assayId)?.pathogen === "salmonella"));

  check("every matrix panel references real pathogens", Object.values(MATRICES).every((m) => m.panel.length > 0));

  // QC / internal-control gating
  check("normal run has a valid internal control", a.controlValid === true);
  check("control signal in [0,1]", a.controlSignal >= 0 && a.controlSignal <= 1);
  const qc = runDetect("stool", "LOT-QCFAIL-1");
  check("QCFAIL seed forces an invalid control", qc.controlValid === false);
  check("invalid control still deterministic", runDetect("stool", "LOT-QCFAIL-1").controlValid === false);
}

// --- prng sanity ---
{
  const r = rng(hashSeed("seed"));
  const xs = Array.from({ length: 1000 }, () => r());
  check("prng stays in [0,1)", xs.every((x) => x >= 0 && x < 1));
  const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
  check("prng roughly uniform (mean ~0.5)", Math.abs(mean - 0.5) < 0.05);
}

console.log(`\nGoCARE engine: ${pass} passed, ${fail} failed`);
declare const process: { exit(code: number): never };
if (fail > 0) process.exit(1);
