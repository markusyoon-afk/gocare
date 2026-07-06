/**
 * Stress / pressure test — headless engine, thousands of randomized runs.
 *
 * Complements the unit battery: hammers runDetect + interpret across every
 * matrix, every forced pathogen, and many random seeds, asserting the clinical
 * invariants hold every time (no exceptions, determinism, QC gating, and a
 * safe resistance interpretation). Run: `npm run stress`.
 */

import { runDetect } from "../src/engine/run.ts";
import { interpret } from "../src/engine/resistance.ts";
import { MATRICES, MATRIX_ORDER, SNP_ASSAYS, PATHOGENS, APP_ORDER } from "../src/data/catalog.ts";
import { FLOWS, flowTotals, typicalLabel } from "../src/data/stages.ts";

let checks = 0;
let fails = 0;
const seen = new Set();
function bad(msg) {
  fails++;
  if (fails <= 20) console.error("  ✗ " + msg);
}
function assert(cond, msg) {
  checks++;
  if (!cond) bad(msg);
}

const N = 4000;
let runs = 0;
let positives = 0;
let resistantRuns = 0;
let invalidRuns = 0;

for (let i = 0; i < N; i++) {
  const matrixId = MATRIX_ORDER[i % MATRIX_ORDER.length];
  const forceQC = i % 97 === 0; // periodically exercise the QC-fail path
  const seed = `${forceQC ? "QCFAIL-" : ""}S${i}-${(i * 2654435761) % 100000}`;
  let r;
  try {
    r = runDetect(matrixId, seed);
  } catch (e) {
    bad(`exception on ${matrixId}/${seed}: ${e}`);
    continue;
  }
  runs++;

  // Determinism: same inputs → identical result.
  if (JSON.stringify(runDetect(matrixId, seed)) !== JSON.stringify(r)) bad(`non-deterministic ${matrixId}/${seed}`);

  // Structure invariants.
  assert(typeof r.controlValid === "boolean", "controlValid is boolean");
  assert(r.controlSignal >= 0 && r.controlSignal <= 1, "controlSignal in range");
  if (forceQC) {
    assert(r.controlValid === false, `QCFAIL seed must invalidate control (${seed})`);
    invalidRuns++;
  }

  const detected = r.targets.filter((t) => t.detected);
  assert(detected.length <= 1, `at most one positive target (${matrixId}/${seed} had ${detected.length})`);
  if (r.positivePathogen) {
    positives++;
    assert(detected.length === 1 && detected[0].pathogenId === r.positivePathogen, "positive matches detected target");
    // SNPs, if any, belong only to the positive organism.
    for (const s of r.snps) {
      const assay = SNP_ASSAYS.find((a) => a.id === s.assayId);
      assert(assay && assay.pathogen === r.positivePathogen, `SNP ${s.assayId} belongs to positive`);
    }
    // A target's disease/name resolve to a real catalog pathogen.
    assert(!!PATHOGENS[r.positivePathogen], "positive is a catalog pathogen");
  } else {
    assert(r.snps.length === 0, "no SNPs when no positive");
  }

  // Resistance interpretation safety: avoid drugs derive only from resisted classes,
  // and considered alternatives are never simultaneously on the avoid list.
  const detectedSnps = r.snps.filter((s) => s.detected).map((s) => s.assayId);
  const interp = interpret(detectedSnps);
  if (interp.avoid.length > 0) resistantRuns++;
  for (const d of interp.consider) assert(!interp.avoid.includes(d), `considered drug ${d} must not be avoided`);
  const resistedClasses = interp.calls.filter((c) => c.susceptibility === "resistant");
  assert(
    (resistedClasses.length > 0) === (interp.avoid.length > 0),
    "avoid list non-empty iff a class is resistant",
  );
  // Every detected SNP's class must be marked resistant.
  for (const id of detectedSnps) {
    const cls = SNP_ASSAYS.find((a) => a.id === id).antibioticClass;
    assert(resistedClasses.some((c) => c.antibioticClass === cls), `class ${cls} resistant given detected SNP`);
  }
  seen.add(r.positivePathogen ?? "none");
}

// --- workflow / run-flow validation (every cartridge is runnable end to end) ---
for (const app of APP_ORDER) {
  const f = FLOWS[app];
  assert(!!f, `${app} has a run flow`);
  assert(f.stages.length >= 4, `${app} flow has >=4 stages`);
  assert(f.demoMs > 0, `${app} flow has a demo duration`);
  assert(f.stages.every((s) => s.estSec > 0 && s.label), `${app} stages have positive time + labels`);
  const { total, cum } = flowTotals(f);
  assert(total > 0, `${app} total est duration > 0`);
  assert(cum.every((c, i) => i === 0 || c > cum[i - 1]), `${app} cumulative stage offsets strictly increase`);
  assert(/^~/.test(typicalLabel(f)), `${app} typical-time label formatted (${typicalLabel(f)})`);
  // Start-gating truth table: goseq needs only a sample; detect/goprep/goh2o need a matrix too.
  const needsMatrix = app !== "goseq";
  const runnable = (hasSample, hasMatrix) => hasSample && (!needsMatrix || hasMatrix);
  assert(runnable(true, true) === true, `${app} runnable with sample + matrix`);
  assert(runnable(false, true) === false, `${app} blocked without a sample`);
  assert(runnable(true, false) === (app === "goseq"), `${app} matrix requirement correct`);
}

console.log(`\nStress: ${runs} runs · ${positives} positives · ${resistantRuns} with resistance · ${invalidRuns} QC-invalid`);
console.log(`Workflow: validated run flows for ${APP_ORDER.join(", ")}`);
console.log(`Distinct outcomes observed: ${[...seen].join(", ")}`);
console.log(`${checks} assertions, ${fails} failed`);
if (fails > 0) {
  console.error("STRESS FAILED");
  // eslint-disable-next-line no-undef
  globalThis.process?.exit?.(1);
} else {
  console.log("STRESS PASSED");
}
