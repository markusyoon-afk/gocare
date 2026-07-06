/**
 * GoCARE clinical catalog — the single source of truth for the GoDx menu.
 *
 * Everything the workflow needs is data, not code: applications (cartridge types),
 * sample matrices, pathogen panels, AMR SNP assays, and the SNP -> drug-resistance
 * interpretation map. Screens read this; the engine computes on it. Adding a new
 * pathogen, matrix, or resistance marker is a data edit here — no UI change.
 *
 * Sources: GoDx Technical Brief, One-Pager, Overview & Investor decks; the candidate
 * SNP-assay table and the Univ. of Iowa AMR-gene frequency table.
 */

export type AppId = "goprep" | "godetect" | "goseq" | "goh2o";
export type AssayStatus = "available" | "in_development" | "in_consideration";
export type AntibioticClass = "Fluoroquinolones" | "Macrolides";

export interface GoApp {
  id: AppId;
  name: string;
  tm: string;
  tagline: string;
  stage: string;
  lead?: boolean;
  accent: string;
  /** Cartridge dimensions from the technical brief, where published. */
  cartridge: string;
  /** QR-code prefix printed on the cartridge; scanning auto-selects the application. */
  qrPrefix: string;
  description: string;
  steps: string[];
}

export const APPS: Record<AppId, GoApp> = {
  goprep: {
    id: "goprep",
    name: "GoPREP",
    tm: "GoPREP™",
    tagline: "Sample prep & extraction",
    stage: "Available",
    accent: "#35CCE6",
    cartridge: "8 cm × 10 cm × 0.6 cm",
    qrPrefix: "GODX-PREP",
    description:
      "Automated magnetic-bead nucleic-acid extraction from complex matrices. Lysis, bead capture, wash, and elution run on-cartridge, yielding purified nucleic acid in a detachable tube for downstream detection or sequencing.",
    steps: ["Lyse sample", "Magnetic-bead capture", "Wash", "Elute purified NA", "Eject NA tube"],
  },
  godetect: {
    id: "godetect",
    name: "GoDETECT",
    tm: "GoDETECT™",
    tagline: "Pathogen + AMR detection",
    stage: "FDA clearance path",
    accent: "#35CCE6",
    cartridge: "17 cm × 10 cm × 0.6 cm",
    qrPrefix: "GODX-DTCT",
    description:
      "Rapid pathogen identification and targeted antimicrobial-resistance analysis on one cartridge. GoAMP isothermal amplification (RPA, 37–42°C) with multiplex lateral-flow readout returns per-target results in 10–20 minutes.",
    steps: ["Lyse & release", "GoAMP amplification", "Lateral-flow readout", "Call targets", "Interpret AMR"],
  },
  goseq: {
    id: "goseq",
    name: "GoSEQ",
    tm: "GoSEQ™",
    tagline: "Automated mNGS library prep",
    stage: "Available",
    accent: "#35CCE6",
    cartridge: "Library-prep cartridge",
    qrPrefix: "GODX-SEQ",
    description:
      "Automated cartridge-based library preparation for portable metagenomic sequencing — a sequencing lab in a case. End-to-end lysis → cleanup → SPRI library from a single raw, unpurified sample in under 40 minutes, paired with Oxford Nanopore MinION and NVIDIA Jetson edge compute.",
    steps: ["Lyse raw sample", "Fragment & tag", "SPRI cleanup", "Build library", "Ready for flow cell"],
  },
  goh2o: {
    id: "goh2o",
    name: "GoH₂O",
    tm: "GoH₂O™",
    tagline: "Environmental & wastewater surveillance",
    stage: "Available",
    accent: "#3ED8B0",
    cartridge: "Environmental intake cartridge",
    qrPrefix: "GODX-H2O",
    description:
      "Environmental and wastewater pathogen & AMR surveillance at the point of need. Concentrates and captures nucleic acid from environmental matrices for downstream detection or metagenomic sequencing — the dual-use front end for public-health and biodefense programs.",
    steps: ["Concentrate sample", "Lyse & capture", "Purify NA", "Route to detect / seq", "Log to surveillance"],
  },
};

export const APP_ORDER: AppId[] = ["goprep", "godetect", "goseq", "goh2o"];

/* ------------------------------------------------------------------ */
/* Genomic structure of the organisms in the menu                      */
/* ------------------------------------------------------------------ */

export type GenomeType =
  | "dsDNA (bacterial)"
  | "ssRNA (+) (viral)"
  | "ssRNA (−), segmented (viral)";

export interface Pathogen {
  id: string;
  name: string;
  disease: string;
  genome: GenomeType;
  /** Identity (ID) marker amplified to confirm the organism is present. */
  idMarker?: string;
  /** Whether GoDETECT offers an AMR / SNP panel for this organism today. */
  snpAmr: boolean;
}

export const PATHOGENS: Record<string, Pathogen> = {
  salmonella: {
    id: "salmonella",
    name: "Salmonella",
    disease: "Salmonellosis",
    genome: "dsDNA (bacterial)",
    idMarker: "invA",
    snpAmr: true,
  },
  campylobacter: {
    id: "campylobacter",
    name: "Campylobacter",
    disease: "Campylobacteriosis",
    genome: "dsDNA (bacterial)",
    idMarker: "cj0414",
    snpAmr: true,
  },
  shigella: {
    id: "shigella",
    name: "Shigella",
    disease: "Shigellosis (Bacillary Dysentery)",
    genome: "dsDNA (bacterial)",
    idMarker: "ipaH",
    snpAmr: false,
  },
  stec: {
    id: "stec",
    name: "STEC",
    disease: "Hemorrhagic Colitis / HUS",
    genome: "dsDNA (bacterial)",
    idMarker: "stx1/stx2",
    snpAmr: false,
  },
  ecoli: {
    id: "ecoli",
    name: "Pathogenic E. coli",
    disease: "Urinary Tract Infection (UTI)",
    genome: "dsDNA (bacterial)",
    idMarker: "uidA",
    snpAmr: false,
  },
  neisseria: {
    id: "neisseria",
    name: "Neisseria",
    disease: "Gonorrhea / Meningitis",
    genome: "dsDNA (bacterial)",
    idMarker: "porA",
    snpAmr: false,
  },
  norovirus: {
    id: "norovirus",
    name: "Norovirus",
    disease: "Gastroenteritis",
    genome: "ssRNA (+) (viral)",
    idMarker: "ORF1-ORF2",
    snpAmr: false,
  },
  influenza: {
    id: "influenza",
    name: "Influenza",
    disease: "Influenza (Flu)",
    genome: "ssRNA (−), segmented (viral)",
    idMarker: "M gene",
    snpAmr: false,
  },
};

/* ------------------------------------------------------------------ */
/* Sample matrices (GoPREP menu) and the panels validated on each      */
/* ------------------------------------------------------------------ */

export interface SampleMatrix {
  id: string;
  name: string;
  category: string;
  /** Extraction recovery vs qPCR positive control, where published. */
  recovery?: string;
  recoveryTarget?: string;
  validated: boolean;
  /** Pathogen ids on this matrix's panel, in display order. */
  panel: string[];
  swab: string;
}

export const MATRICES: Record<string, SampleMatrix> = {
  stool: {
    id: "stool",
    name: "Stool",
    category: "GI Pathogens",
    recovery: "80.6%",
    recoveryTarget: "S. enterica · invA",
    validated: true,
    panel: ["salmonella", "campylobacter", "shigella", "stec"],
    swab: "Cap swab · dip in stool sample",
  },
  urine: {
    id: "urine",
    name: "Urine",
    category: "Urogenital & Viral",
    recovery: "72.8%",
    recoveryTarget: "E. coli · uidA",
    validated: true,
    panel: ["ecoli", "norovirus", "neisseria"],
    swab: "Draw from clean-catch urine",
  },
  nasal: {
    id: "nasal",
    name: "Nasal Swab",
    category: "Respiratory",
    validated: true,
    panel: ["influenza"],
    swab: "Anterior nares swab",
  },
  wastewater: {
    id: "wastewater",
    name: "Wastewater",
    category: "Environmental Surveillance",
    validated: true,
    panel: ["salmonella", "campylobacter", "shigella", "stec", "norovirus"],
    swab: "Concentrated grab / composite sample",
  },
};

export const MATRIX_ORDER = ["stool", "urine", "nasal", "wastewater"];

/** Roadmap matrices — shown as coming-soon in the picker. */
export const ROADMAP_MATRICES = ["Blood", "Saliva", "Expanded environmental"];

/** GoH₂O environmental sources (all run on the wastewater/environmental panel). */
export const ENV_SOURCES = ["Wastewater", "Lake", "Stream"];

/** Preset sample IDs for quick demo runs (fills the Sample ID field). */
export const DEMO_SAMPLES = [
  { id: "ACC-100482", note: "Stool · GI symptoms" },
  { id: "ACC-100517", note: "Urine · UTI workup" },
  { id: "ACC-100633", note: "Nasal · respiratory" },
  { id: "ACC-100704", note: "Stool · pediatric" },
  { id: "ACC-100812", note: "Stool · outbreak trace" },
  { id: "WW-24-0891", note: "Wastewater · surveillance" },
  { id: "ENV-24-0347", note: "Stream · field sample" },
];

/* ------------------------------------------------------------------ */
/* AMR SNP assays (the candidate SNP-detection panel)                  */
/* ------------------------------------------------------------------ */

export interface SnpAssay {
  id: string;
  pathogen: string;
  gene: string;
  /** Human-facing mutation label, e.g. "gyrA T86I". */
  label: string;
  /** Nucleotide-level detection description, e.g. "gyrA C257T". */
  detection: string;
  antibioticClass: AntibioticClass;
  drugs: string[];
  status: AssayStatus;
  /** Reference frequency from the Univ. of Iowa dataset, if catalogued. */
  frequency?: string;
  note: string;
}

export const SNP_ASSAYS: SnpAssay[] = [
  {
    id: "campy_gyrA_T86I",
    pathogen: "campylobacter",
    gene: "gyrA",
    label: "gyrA T86I",
    detection: "gyrA C257T",
    antibioticClass: "Fluoroquinolones",
    drugs: ["ciprofloxacin", "levofloxacin"],
    status: "available",
    frequency: "31.80%",
    note: "Dominant fluoroquinolone-resistance mutation in Campylobacter.",
  },
  {
    id: "campy_23S",
    pathogen: "campylobacter",
    gene: "23S rRNA",
    label: "23S rRNA A2075G / A2074C⁄G",
    detection: "23S rRNA A2075G, A2074C/G",
    antibioticClass: "Macrolides",
    drugs: ["azithromycin", "erythromycin"],
    status: "available",
    note: "Macrolide (azithromycin) resistance via 23S rRNA target-site mutation.",
  },
  {
    id: "salm_gyrA",
    pathogen: "salmonella",
    gene: "gyrA",
    label: "gyrA S83F/Y · D87Y/N/G",
    detection: "gyrA S83F/Y, D87Y/N/G",
    antibioticClass: "Fluoroquinolones",
    drugs: ["ciprofloxacin", "levofloxacin"],
    status: "in_development",
    frequency: "6.79% (D87Y)",
    note: "Primary quinolone-resistance determining region SNPs in Salmonella.",
  },
  {
    id: "salm_parC_S80",
    pathogen: "salmonella",
    gene: "parC",
    label: "parC S80I/R",
    detection: "parC S80I/R",
    antibioticClass: "Fluoroquinolones",
    drugs: ["ciprofloxacin", "levofloxacin"],
    status: "in_consideration",
    frequency: "0.70% (S80I)",
    note: "Secondary target mutation; additive to gyrA for high-level resistance.",
  },
  {
    id: "salm_23S",
    pathogen: "salmonella",
    gene: "23S rRNA",
    label: "23S rRNA A2058G / A2059G",
    detection: "23S rRNA A2058G/A2059G",
    antibioticClass: "Macrolides",
    drugs: ["azithromycin"],
    status: "in_consideration",
    note: "Macrolide resistance target-site mutation in Salmonella.",
  },
  {
    id: "salm_acrB_R717",
    pathogen: "salmonella",
    gene: "acrB",
    label: "acrB R717L/Q",
    detection: "acrB R717L/Q",
    antibioticClass: "Macrolides",
    drugs: ["azithromycin"],
    status: "available",
    note: "Efflux-pump variant conferring reduced azithromycin susceptibility.",
  },
];

/* ------------------------------------------------------------------ */
/* AMR reference frequencies (Univ. of Iowa) — shown as context        */
/* ------------------------------------------------------------------ */

export interface AmrGeneRow {
  gene: string;
  type: string;
  count: number;
  frequency: string;
  /** Whether GoDETECT currently offers/targets this marker. */
  targeted: boolean;
}

export const AMR_REFERENCE: Record<string, { n: number; rows: AmrGeneRow[] }> = {
  salmonella: {
    n: 725138,
    rows: [
      { gene: "gyrA_D87Y", type: "point", count: 49052, frequency: "6.79%", targeted: true },
      { gene: "gyrA_S83F", type: "point", count: 22132, frequency: "3.06%", targeted: true },
      { gene: "gyrA_D87N", type: "point", count: 14706, frequency: "2.04%", targeted: true },
      { gene: "gyrA_S83Y", type: "point", count: 11545, frequency: "1.60%", targeted: true },
      { gene: "gyrA_D87G", type: "point", count: 5149, frequency: "0.71%", targeted: true },
      { gene: "parC_S80I", type: "point", count: 5082, frequency: "0.70%", targeted: true },
      { gene: "parC_S80R", type: "point", count: 1113, frequency: "0.15%", targeted: true },
    ],
  },
  campylobacter: {
    n: 147410,
    rows: [
      { gene: "gyrA_T86I", type: "point", count: 46004, frequency: "31.80%", targeted: true },
      { gene: "cmeB", type: "complete", count: 4463, frequency: "3.09%", targeted: false },
      { gene: "gyrA_T86V", type: "point", count: 643, frequency: "0.44%", targeted: false },
      { gene: "gyrA_P104S", type: "point", count: 594, frequency: "0.41%", targeted: false },
      { gene: "gyrA_D90N", type: "point", count: 273, frequency: "0.19%", targeted: false },
      { gene: "gyrA_T86A", type: "point", count: 94, frequency: "0.06%", targeted: false },
    ],
  },
};

/* ------------------------------------------------------------------ */
/* GoDETECT clinical performance vs culture (technical brief)          */
/* ------------------------------------------------------------------ */

export interface PerfRow {
  pathogen: string;
  sens: string;
  spec: string;
  ppv: string;
  npv: string;
}

export const CLINICAL_PERFORMANCE: PerfRow[] = [
  { pathogen: "Shigella", sens: "95.0%", spec: "98.8%", ppv: "95%", npv: "98%" },
  { pathogen: "STEC", sens: "90.5%", spec: "94.9%", ppv: "82%", npv: "97%" },
  { pathogen: "Salmonella", sens: "78.9%", spec: "96.3%", ppv: "83%", npv: "95%" },
  { pathogen: "Campylobacter", sens: "70.0%", spec: "96.2%", ppv: "82%", npv: "92%" },
];

/* ------------------------------------------------------------------ */
/* GoSEQ — sequencing kit + downstream bioinformatics                  */
/* ------------------------------------------------------------------ */

export const GOSEQ_KIT = {
  libraryPrep: "GoDEVICE cartridge-based library prep",
  sequencer: "Oxford Nanopore MinION™ Mk1D",
  compute: "NVIDIA Jetson edge compute",
  interface: "Touchscreen tablet",
  bioinformatics: "BugSEQ",
  timeToLibrary: "<40 min",
  onTarget: "~99% of assembled reads",
};

/** Downstream steps after the cartridge finishes the library. */
export const GOSEQ_DOWNSTREAM = [
  {
    key: "prime",
    label: "Prime flow cell",
    detail: "Prime the Oxford Nanopore MinION Mk1D flow cell with priming mix.",
  },
  {
    key: "load",
    label: "Load library onto flow cell",
    detail: "Transfer the SPRI library from the cartridge tube onto the primed flow cell.",
  },
  {
    key: "sequence",
    label: "Sequence",
    detail: "Nanopore sequencing runs; reads stream live to Jetson edge compute.",
  },
  {
    key: "basecall",
    label: "Basecall & QC",
    detail: "On-device basecalling and read-quality QC on the Jetson module.",
  },
  {
    key: "bugseq",
    label: "Classify in BugSEQ",
    detail: "Reads are classified taxonomically and screened for AMR determinants in BugSEQ.",
  },
  {
    key: "report",
    label: "Report",
    detail: "Taxonomic profile + AMR findings returned to GoCARE and the secure device.",
  },
];

/** Example mNGS classification (contrived stool matrix, technical brief). */
export interface MngsRow {
  organism: string;
  reads: number;
  pctTotal: string;
  spiked: boolean;
}

export const MNGS_EXAMPLE = {
  totalReads: 596033,
  onTargetAssembled: "~99%",
  rows: [
    { organism: "Campylobacter jejuni", reads: 360476, pctTotal: "60.5%", spiked: true },
    { organism: "Salmonella enterica", reads: 49071, pctTotal: "8.2%", spiked: true },
    { organism: "Shigella flexneri", reads: 27038, pctTotal: "4.5%", spiked: true },
    { organism: "Vibrio cholerae", reads: 922, pctTotal: "0.15%", spiked: true },
  ] as MngsRow[],
};
