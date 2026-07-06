/**
 * Resistance interpretation — pure functions, framework-free and unit-tested.
 *
 * Given a set of detected AMR SNP assays, produce a per-drug-class susceptibility
 * call and a plain-language treatment interpretation a clinician can act on at the
 * point of care. This is the "what drug is it resistant to?" logic from the spec.
 */

import { SNP_ASSAYS, type AntibioticClass, type SnpAssay } from "../data/catalog";

export type Susceptibility = "resistant" | "susceptible";

export interface ClassCall {
  antibioticClass: AntibioticClass;
  susceptibility: Susceptibility;
  /** Drugs in this class affected by the call. */
  drugs: string[];
  /** Assay ids that drove a resistant call (empty when susceptible). */
  evidence: string[];
}

export interface Interpretation {
  calls: ClassCall[];
  /** Drugs to avoid, deduped across resistant classes. */
  avoid: string[];
  /** Suggested alternatives given what remains susceptible. */
  consider: string[];
  headline: string;
}

const ALL_CLASSES: AntibioticClass[] = ["Fluoroquinolones", "Macrolides"];

/** Alternatives to fall back to, per resisted class, filtered to still-susceptible drugs. */
const FALLBACKS: Record<AntibioticClass, string[]> = {
  Fluoroquinolones: ["azithromycin", "ceftriaxone"],
  Macrolides: ["ciprofloxacin", "ceftriaxone"],
};

export function assayById(id: string): SnpAssay | undefined {
  return SNP_ASSAYS.find((a) => a.id === id);
}

/**
 * Interpret a set of detected assay ids into per-class susceptibility calls.
 * A class is called resistant if any detected assay targets that class.
 */
export function interpret(detectedAssayIds: string[]): Interpretation {
  const detected = detectedAssayIds.map(assayById).filter((a): a is SnpAssay => Boolean(a));

  const calls: ClassCall[] = ALL_CLASSES.map((cls) => {
    const hits = detected.filter((a) => a.antibioticClass === cls);
    const resistant = hits.length > 0;
    const drugs = uniq(hits.flatMap((a) => a.drugs));
    return {
      antibioticClass: cls,
      susceptibility: resistant ? "resistant" : "susceptible",
      drugs,
      evidence: hits.map((a) => a.id),
    };
  });

  const resistedClasses = calls.filter((c) => c.susceptibility === "resistant");
  const avoid = uniq(resistedClasses.flatMap((c) => c.drugs));

  // Consider drugs that are fallbacks for a resisted class and are NOT themselves in the avoid list.
  const consider = uniq(
    resistedClasses.flatMap((c) => FALLBACKS[c.antibioticClass]),
  ).filter((d) => !avoid.includes(d));

  const headline =
    resistedClasses.length === 0
      ? "No resistance markers detected — first-line therapy expected to be effective."
      : `Resistance detected: ${resistedClasses
          .map((c) => c.antibioticClass.toLowerCase())
          .join(" + ")}. Avoid ${avoid.join(", ")}.`;

  return { calls, avoid, consider, headline };
}

function uniq<T>(xs: T[]): T[] {
  return Array.from(new Set(xs));
}
