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
npm run dev        # http://localhost:5177  (dev, no service worker)
npm test           # engine regression + validation
npm run typecheck
npm run build      # icons + static PWA bundle in dist/ (relative base)
npm run preview    # serve the built app — installable & offline-capable
```

## Install as an app (PWA)

`npm run build` produces an installable Progressive Web App in `dist/`:

- **Manifest** (`manifest.webmanifest`) + generated icons → installs to home
  screen / desktop as **GoCARE**, standalone, GoDx navy chrome.
- **Service worker** (`sw.js`) caches the app shell for **offline** use. The
  offline fallback is *navigate-only* (playbook pitfall #1) — it never serves
  `index.html` for a failed asset request, so an installed build can't brick.
- **Relative base** (`base: "./"`) → runs from any subpath: a GoDEVICE kiosk,
  a static host, or GitHub Pages.

Install locally: `npm run preview`, open the URL, use the browser's **Install**
action (or Add to Home Screen on iOS).

## Ship it (public URL)

The build is host-agnostic — drop `dist/` on any static host. For GitHub Pages,
push `dist/` to a `gh-pages` branch (`.nojekyll` is already included).
**Note:** the UI carries *GoDx Confidential* material and unpublished
validation/financial figures — deploy only to a private/authenticated host, not
a public URL, unless that content is cleared for release.

*For demonstration. Not a medical device; results are simulated.*
