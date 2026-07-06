# GoCARE — the GoDx software ecosystem

The clinical software that runs on **GoDEVICE**. One reusable instrument, an
expanding portfolio of cartridge applications — **GoPREP**, **GoDETECT**,
**GoSEQ**, and **GoH₂O** — driven by a single cartridge-to-answer workflow.

Built with the SURV build-playbook bones: a pure, testable engine; a store that
only owns transitions; screens that render state. GoDx MedTech design system
(Space Grotesk / IBM Plex, deep-navy canvas, cyan accent, tactile pressed controls).

## The clinical workflow

1. **Insert a cartridge** — the QR is read and GoCARE auto-selects the application.
2. **GoPREP** — pick the sample matrix (stool, urine, nasal, wastewater); automated
   magnetic-bead extraction → purified NA tube → route to GoDETECT or GoSEQ.
3. **GoDETECT** — review the pathogen panel + AMR SNP assays on the cartridge, run
   GoAMP, and read per-target lateral-flow calls. Detected resistance SNPs are
   interpreted into **drug-class susceptibility and a treatment recommendation**
   (what to avoid, what to consider).
4. **GoSEQ** — automated mNGS library prep, then the downstream hand-off: prime and
   load the Oxford Nanopore flow cell → sequence → Jetson basecall → **BugSEQ**
   taxonomic + AMR classification.
5. **GoH₂O** — environmental / wastewater surveillance front end, logged to
   surveillance and routed to detection or sequencing.

The **Test Menu** and **AMR Library** views catalogue every validated sample type,
disease target, genome structure, SNP assay, and the Univ.-of-Iowa reference
frequencies.

## Repo map

```
src/data/catalog.ts     one source of truth: apps, matrices, pathogens, SNP assays,
                        resistance→drug map, performance, GoSEQ/BugSEQ workflow
src/engine/             resistance (interpretation) · run (deterministic simulation)
                        · engine.test.ts (regression + validation battery)
src/store/session.tsx   workflow state machine (transitions only)
src/screens/            Home · Configure · Run · Results · Menu · AMR
src/components/          QRCode · Cartridge
src/styles.css          GoDx MedTech design system
```

## Run it

```bash
npm install
npm run dev        # http://localhost:5177
npm test           # engine regression + validation
npm run typecheck
npm run build      # static bundle in dist/ (relative base — kiosk/Pages ready)
```

*For demonstration. Not a medical device; results are simulated.*
