/**
 * Compliance & governance model.
 *
 * IMPORTANT / honest framing: HIPAA and CMMC are *organizational* certifications
 * (BAAs, infrastructure, audited policies). Software cannot self-certify. What this
 * app does is implement and *evidence* the technical safeguards those frameworks
 * require, and label where a control is operational vs. in-app. The Compliance
 * screen renders this map so the posture is inspectable, not asserted.
 *
 * Cross-referenced against IVD/POC conventions (Cepheid GeneXpert, BioFire
 * FilmArray, Abbott ID NOW, Roche cobas Liat): barcode/QR-driven assay selection,
 * mandatory Sample ID, internal-control validity gating the result, operator
 * identity, and reviewed sign-out.
 */

export const SOFTWARE = {
  name: "GoCARE",
  version: "0.5.0",
  build: "SaMD · IVD workflow · connected fleet + surveillance",
  udiDi: "GODX-GOCARE-0003", // placeholder device identifier
  classification: "CONFIDENTIAL // CUI",
  intendedUse: "Investigational Use Only — not for diagnostic procedures",
  sessionLockMs: 1800000, // AC-11 / HIPAA auto-logoff (30 min; production configurable)
};

export type Role = "Lab Technician" | "Clinician" | "Administrator";

export interface Operator {
  id: string;
  name: string;
  initials: string;
  role: Role;
  /** Scopes gate which actions the operator may take (least privilege). */
  scopes: ("run" | "sign_out" | "admin")[];
}

export const OPERATORS: Operator[] = [
  { id: "op-ck", name: "Dr. C. Kim", initials: "CK", role: "Clinician", scopes: ["run", "sign_out"] },
  { id: "op-ls", name: "Dr. L. Shin", initials: "LS", role: "Clinician", scopes: ["run", "sign_out"] },
  { id: "op-ma", name: "Dr. M. Alipanah", initials: "MA", role: "Clinician", scopes: ["run", "sign_out"] },
  { id: "op-sk", name: "Dr. S. Kim", initials: "SK", role: "Clinician", scopes: ["run", "sign_out"] },
  { id: "op-my", name: "M. Yoon", initials: "MY", role: "Administrator", scopes: ["run", "sign_out", "admin"] },
];

export interface ControlItem {
  id: string;
  title: string;
  detail: string;
  /** Framework citations this control speaks to. */
  frameworks: string[];
  /** "app" = enforced in this software; "ops" = requires organizational infra. */
  layer: "app" | "ops";
}

export const CONTROLS: ControlItem[] = [
  {
    id: "access",
    title: "Access control & least privilege",
    detail: "Operator identity required before any run. Role scopes gate run vs. result sign-out vs. admin.",
    frameworks: ["HIPAA §164.312(a)(1)", "CMMC AC.L2-3.1.1", "IEC 62304 §5"],
    layer: "app",
  },
  {
    id: "session",
    title: "Automatic sign-out",
    detail: "Inactivity signs the operator out after 30 minutes; identity must be re-entered. A manual Lock button covers quick step-aways. No unattended access.",
    frameworks: ["HIPAA §164.312(a)(2)(iii)", "CMMC AC.L2-3.1.10", "NIST 800-171 3.1.10"],
    layer: "app",
  },
  {
    id: "audit",
    title: "Audit & accountability",
    detail: "Every material action (sign-in, cartridge scan, run, result, sign-out, lock) is logged with operator and timestamp.",
    frameworks: ["HIPAA §164.312(b)", "CMMC AU.L2-3.3.1", "21 CFR Part 11"],
    layer: "app",
  },
  {
    id: "minimum",
    title: "Minimum necessary PHI",
    detail: "Only a Sample/Accession ID is required. Patient identifiers are optional, flagged, and never leave the device.",
    frameworks: ["HIPAA §164.502(b)", "HIPAA §164.514"],
    layer: "app",
  },
  {
    id: "integrity",
    title: "Result integrity & QC gating",
    detail: "The cartridge internal control must be valid for a result to be reportable. Invalid controls block sign-out and prompt a repeat.",
    frameworks: ["CLIA §493.1256", "IEC 62304 §5.7", "ISO 13485 §7.5"],
    layer: "app",
  },
  {
    id: "esign",
    title: "Reviewed electronic sign-out",
    detail: "A scoped operator reviews and electronically signs each result before it is final; the signature is bound in the audit log.",
    frameworks: ["21 CFR Part 11 §11.10", "CLIA §493.1291"],
    layer: "app",
  },
  {
    id: "no-persist",
    title: "Local-only, no persistence",
    detail: "No PHI is written to browser storage. Session and results are in-memory; a cleared session leaves no PHI at rest.",
    frameworks: ["HIPAA §164.312(a)(2)(iv)", "CMMC SC.L2-3.13.16"],
    layer: "app",
  },
  {
    id: "classification",
    title: "Data classification & marking",
    detail: "CUI / Confidential banner is displayed persistently; Investigational-Use-Only labeling is fixed to every screen.",
    frameworks: ["CMMC MP.L2-3.8.4", "FDA 21 CFR 809.10(c)"],
    layer: "app",
  },
  {
    id: "transport",
    title: "Encrypted transport & at-rest (deployment)",
    detail: "Requires TLS in transit and encrypted storage at rest on the hosting device/LIS — an organizational deployment control.",
    frameworks: ["HIPAA §164.312(e)(1)", "CMMC SC.L2-3.13.8", "CMMC SC.L2-3.13.11"],
    layer: "ops",
  },
  {
    id: "traceability",
    title: "Software lifecycle & traceability",
    detail: "Versioned SaMD build with device/lot traceability on every result. Verification battery gates each release.",
    frameworks: ["IEC 62304", "ISO 13485", "FDA SaMD"],
    layer: "ops",
  },
];

/** POC systems we cross-referenced for the workflow shape. */
export const IVD_REFERENCES = [
  { system: "Cepheid GeneXpert", convention: "Barcode-driven assay load · Sample ID · internal SPC control" },
  { system: "BioFire FilmArray", convention: "Pouch scan · single Sample ID · RNA/PCR2 controls gate report" },
  { system: "Abbott ID NOW", convention: "Insert → scan → run, near-zero interaction" },
  { system: "Roche cobas Liat", convention: "Tube barcode auto-selects assay · walk-away run" },
];
