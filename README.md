# GoCARE — the GoDx software ecosystem

The clinical software that runs on **GoDEVICE**. One reusable instrument, an
expanding portfolio of cartridge applications — **GoPREP**, **GoDETECT**,
**GoSEQ**, and **GoH₂O** — driven by a single cartridge-to-answer workflow.

Built with the SURV build-playbook bones: a pure, testable engine; a store that
only owns transitions; screens that render state. GoDx MedTech design system
(Space Grotesk / IBM Plex, deep-navy canvas, cyan accent, tactile pressed controls).

## The clinical workflow (full IVD)

The workflow is modeled on real POC/IVD systems (Cepheid GeneXpert, BioFire
FilmArray, Abbott ID NOW, Roche cobas Liat) — barcode-driven assay load, mandatory
Sample ID, internal-control QC gating, and reviewed sign-out — kept to the fewest
touch points that stay clinically sound.

1. **Sign in** — an operator badges in (access control). The session auto-locks
   after inactivity; role scopes gate run vs. sign-out vs. admin.
2. **Insert a cartridge** — the QR is read and GoCARE auto-selects the application.
3. **Accession the sample** — one-tap **Sample ID** scan (mandatory); optional,
   PHI-flagged patient reference that never leaves the device.
4. **GoPREP** — pick the matrix (stool, urine, nasal, wastewater); automated
   magnetic-bead extraction → purified NA tube → route to GoDETECT or GoSEQ.
5. **GoDETECT** — review the pathogen panel + AMR SNP assays, run GoAMP, read
   per-target lateral-flow calls. The **internal control must be valid** or the
   result is suppressed and a repeat is prompted. Detected resistance SNPs are
   interpreted into **drug-class susceptibility + treatment guidance** (avoid /
   consider), then **reviewed and electronically signed out** into the audit log.
6. **GoSEQ** — automated mNGS library prep → prime + load the Oxford Nanopore flow
   cell → sequence → Jetson basecall → **BugSEQ** taxonomic + AMR classification.
7. **GoH₂O** — environmental / wastewater surveillance front end, logged and routed.

**Test Menu**, **AMR Library**, **Audit** (full accountability trail), and
**Compliance** (the safeguard-to-framework map) round out the workspace.

## Security & compliance posture

HIPAA and CMMC are organizational certifications — software can't self-certify.
GoCARE *implements and evidences* their technical safeguards, and the Compliance
screen marks each as in-app vs. deployment-dependent:

- **Access control & least privilege** — operator identity + role scopes
  (HIPAA §164.312(a)(1), CMMC AC.L2-3.1.1).
- **Automatic session lock** — 2-min inactivity auto-lock (HIPAA §164.312(a)(2)(iii),
  CMMC AC.L2-3.1.10).
- **Audit & accountability** — every action logged with operator + timestamp
  (HIPAA §164.312(b), CMMC AU.L2-3.3.1, 21 CFR Part 11).
- **Minimum-necessary PHI · no persistence** — only a Sample ID is required; nothing
  is written to storage (HIPAA §164.514, §164.312(a)(2)(iv)).
- **QC gating + reviewed sign-out** — invalid internal control blocks the result;
  scoped electronic signature (CLIA §493.1256, 21 CFR Part 11 §11.10).
- **Classification marking** — persistent CUI / Investigational-Use-Only banner.
- *Deployment-layer* (TLS, encryption-at-rest, tamper-evident audit store) is
  labeled as an organizational responsibility, not asserted by the app.

## GoDEVICE touchscreen + live link

The app pairs with a simplified **GoDEVICE touchscreen** surface. Open it in-console
(GoDEVICE tab) or as a standalone kiosk window (`?device=1`, "Open on GoDEVICE ↗").
The two are **live-linked** over a broadcast channel (`src/lib/live.ts`, interface-first
— swap in WebSocket/BLE later): start a run on the console and the device tracks it in
real time; the device's **Start** button drives the console. The touchscreen shows only
prioritized info — identity, staged cartridge, the stage tracker, the one-line result,
and cartridge stock.

## Stage tracker (toll-gate timer)

Every run shows a segmented horizontal bar that fills across the cartridge's real
clinical stages, with an accelerated clinical clock (elapsed / total):

- **GoPREP** — Prime & wash → Lysis → Bead capture → Wash → Elution (~25 min)
- **GoDETECT** — Sample prep → GoAMP amplification → Detection → Readout → Report (~18 min)
- **GoH₂O** — Water collection → Sample prep → GoAMP → Detection → Report (~30 min)
- **GoSEQ** — Sample prep → Library prep → Load flow cell → Sequencing (NGS) →
  Bioinformatics (BugSEQ, untargeted/metagenomic) → Results (~2 hr)

## Actionable readout

Results lead with a direct, no-interpretation-needed line, e.g.
*"Campylobacter detected — resistant · ACTION: Do NOT use azithromycin,
erythromycin. Use ciprofloxacin or ceftriaxone."* — mirrored on the GoDEVICE screen.

## Device registration & HaaS inventory

- **Settings** — GoDEVICE model/serial/firmware, clinic registration, operator
  enrollment (credentials or face scan), GoDx Store connection.
- **Inventory** — Hardware-as-a-Service cartridge stock per line. Each run consumes a
  cartridge; when a line hits its safety threshold, an **MOQ order of 10** is placed
  automatically with the GoDx Store. Manual order, auto-reorder toggle, and order
  receipt included.

## Connected fleet & status light

A GoCARE account controls one or more registered **GoDEVICEs**; the active one is
picked in the status bar (visible on every screen) or in Settings. The instrument's
indicator light is derived live from the workflow and shown everywhere:

- **Green (static)** — empty, ready to receive a cartridge
- **Yellow (pulsing)** — processing (pressing Start on any cartridge turns it yellow)
- **Red (static)** — finished cartridge still inserted

## Surveillance: History & Analytics

- **History** — every reported result as a log: unique cartridge ID, location, time,
  and high-level call (no PHI).
- **Analytics** — trend charts over the account's GoDEVICEs with a proactive
  public-health signal (e.g. "Campylobacter up week-over-week — possible cluster")
  to support early cluster detection, source tracing, and individual history.

## CLIA-waived instructions & EMR

- **How to run** — an 8-step, CLIA-waived, plain-language operating guide with the
  indicator-light legend and per-cartridge stages.
- **Integrations** — EMR (FHIR R4), LIS (HL7), and sequencer (Oxford Nanopore /
  BugSEQ) connection points; signed results can be pushed to the EMR.

## Clinical wording

Molecular AMR detects *known* resistance markers only, so a wild-type result reads
**"No resistance detected"** (never "susceptible" — that is a phenotypic/culture call).

## Responsive — iPad-first

Optimized for iPad (bedside/bench), scaling up and down: full sidebar + multi-column
density on desktop/iPad landscape; rails stack on iPad portrait; on iPhone the
sidebar collapses to a bottom tab bar, secondary content is hidden (`hide-compact`),
and everything goes single-column. iOS safe-areas and standalone install supported.

## Repo map

```
src/data/catalog.ts     clinical source of truth: apps, matrices, pathogens, SNP
                        assays, resistance→drug map, performance, GoSEQ/BugSEQ
src/data/compliance.ts  operators/roles, safeguard→framework map, IVD references
src/engine/             resistance (interpretation) · run (deterministic sim + QC)
                        · engine.test.ts (regression + validation battery)
src/store/session.tsx   workflow state machine + governance (auth, lock, audit,
                        sample capture, sign-out) — transitions only
src/screens/            Login · Lock · Home · Configure · Run · Results
                        · Menu · AMR · Audit · Compliance
src/components/          QRCode · Cartridge
src/lib/format.ts       run summary (audit + history)
src/styles.css          GoDx MedTech design system + iPad-first responsive
scripts/                make-icons (PWA icons) · stress (pressure test)
```

## Run it

```bash
npm install
npm run dev        # http://localhost:5177  (dev, no service worker)
npm test           # engine regression + validation (22 checks)
npm run stress     # 4,000-run pressure test (~29k assertions)
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
