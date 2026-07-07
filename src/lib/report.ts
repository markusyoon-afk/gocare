/**
 * One-page IVD point-of-care detection report → print / Save as PDF.
 *
 * Opens a self-contained, print-styled report in a new window and triggers the
 * browser print dialog (Save as PDF). Layout follows standard POC test reports:
 * facility + instrument header, sample/operator, per-target result, AMR, internal
 * control, reviewed sign-out, and the Investigational-Use-Only footer.
 */
import { APPS, MATRICES, SNP_ASSAYS, type AppId } from "../data/catalog";
import { clinicalReadout } from "./format";
import type { DetectResult } from "../engine/run";

export interface ReportParams {
  clinic: { name: string; address: string; npi: string; contact: string };
  device: { model: string; serial: string; label: string; locationLabel: string };
  operatorName: string;
  sampleId: string | null;
  patientRef: string | null;
  appId: AppId;
  matrixId: string | null;
  result: DetectResult;
  signedBy: string | null;
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

export function openDetectionReport(p: ReportParams): void {
  const now = new Date();
  const readout = clinicalReadout(p.result);
  const app = APPS[p.appId];
  const matrix = p.matrixId ? MATRICES[p.matrixId] : null;
  const toneColor = readout.tone === "resistant" ? "#C0392B" : readout.tone === "positive" ? "#0E7C86" : readout.tone === "invalid" ? "#B7791F" : "#334";

  const targetRows = p.result.targets
    .map(
      (t) => `<tr><td>${esc(t.name)}</td><td class="mono">${esc(t.idMarker ?? "—")}</td>
      <td class="${t.detected ? "hit" : "neg"}">${t.detected ? "DETECTED" : "Not detected"}</td></tr>`,
    )
    .join("");

  const snpRows = p.result.snps.length
    ? p.result.snps
        .map((s) => {
          const a = SNP_ASSAYS.find((x) => x.id === s.assayId);
          return `<tr><td class="mono">${esc(s.label)}</td><td>${esc(a?.antibioticClass ?? "")}</td>
          <td class="${s.detected ? "hit" : "neg"}">${s.detected ? "Mutation detected" : "Wild-type"}</td></tr>`;
        })
        .join("")
    : `<tr><td colspan="3" class="neg">No AMR markers interrogated for this target.</td></tr>`;

  const avoid = p.result.interpretation.avoid;
  const consider = p.result.interpretation.consider;

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>GoCARE Detection Report — ${esc(p.sampleId ?? "")}</title>
<style>
  @page { size: letter; margin: 0.6in; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #16202a; margin: 0; font-size: 12px; line-height: 1.4; }
  .mono { font-family: ui-monospace, Menlo, Consolas, monospace; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0E7C86; padding-bottom: 10px; }
  .brand { font-size: 20px; font-weight: 700; color: #0E7C86; letter-spacing: -0.01em; }
  .sub { color: #5a6673; font-size: 11px; }
  .rtitle { text-align: right; font-size: 11px; color: #5a6673; }
  h2 { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: #5a6673; margin: 16px 0 6px; border-bottom: 1px solid #dfe4e8; padding-bottom: 3px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 24px; }
  .kv { display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px dotted #e5e9ec; }
  .kv b { font-weight: 600; }
  .result { border: 1.5px solid ${toneColor}; border-radius: 8px; padding: 12px 14px; margin-top: 6px; }
  .result .r1 { font-size: 18px; font-weight: 700; color: ${toneColor}; }
  .result .r2 { margin-top: 5px; font-size: 12.5px; }
  .result .r2 b { background: #f2f5f6; padding: 1px 6px; border-radius: 4px; font-size: 10px; letter-spacing: 0.06em; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th, td { text-align: left; padding: 4px 6px; border-bottom: 1px solid #eef1f3; font-size: 11.5px; }
  th { color: #5a6673; font-size: 9.5px; letter-spacing: 0.06em; text-transform: uppercase; }
  td.hit { color: #C0392B; font-weight: 700; }
  td.neg { color: #7a8791; }
  .pills b { display: inline-block; border: 1px solid #dfe4e8; border-radius: 100px; padding: 2px 9px; margin: 2px 4px 0 0; font-weight: 600; font-size: 10.5px; }
  .avoid { color: #C0392B; border-color: #edc9c4 !important; }
  .use { color: #0E7C86; border-color: #bfe0e2 !important; }
  .sign { margin-top: 14px; border: 1px solid #dfe4e8; border-radius: 8px; padding: 8px 12px; display: flex; justify-content: space-between; }
  .foot { margin-top: 16px; border-top: 1px solid #dfe4e8; padding-top: 8px; color: #8b97a1; font-size: 9.5px; display:flex; justify-content:space-between; }
  .disc { color: #8b97a1; font-size: 9.5px; margin-top: 8px; }
</style></head><body>
  <div class="head">
    <div>
      <div class="brand">GoDx · GoCARE</div>
      <div class="sub">${esc(app?.tm ?? "GoDETECT")} — Pathogen &amp; Antimicrobial-Resistance Detection Report</div>
    </div>
    <div class="rtitle">Report generated<br><b>${now.toLocaleString()}</b></div>
  </div>

  <h2>Facility &amp; Instrument</h2>
  <div class="grid">
    <div class="kv"><span>Facility</span><b>${esc(p.clinic.name)}</b></div>
    <div class="kv"><span>Instrument</span><b>${esc(p.device.label)} · ${esc(p.device.model)}</b></div>
    <div class="kv"><span>Address</span><b>${esc(p.clinic.address)}</b></div>
    <div class="kv"><span>Serial</span><b class="mono">${esc(p.device.serial)}</b></div>
    <div class="kv"><span>NPI</span><b class="mono">${esc(p.clinic.npi)}</b></div>
    <div class="kv"><span>Location</span><b>${esc(p.device.locationLabel)}</b></div>
  </div>

  <h2>Sample &amp; Test</h2>
  <div class="grid">
    <div class="kv"><span>Sample ID</span><b class="mono">${esc(p.sampleId ?? "—")}</b></div>
    <div class="kv"><span>Assay</span><b>${esc(app?.tm ?? "GoDETECT")}</b></div>
    <div class="kv"><span>Patient reference</span><b>${esc(p.patientRef ?? "—")}</b></div>
    <div class="kv"><span>Sample type</span><b>${esc(matrix?.name ?? "Environmental")}</b></div>
    <div class="kv"><span>Operator</span><b>${esc(p.operatorName)}</b></div>
    <div class="kv"><span>Collected / tested</span><b>${now.toLocaleDateString()}</b></div>
  </div>

  <h2>Result</h2>
  <div class="result">
    <div class="r1">${esc(readout.result)}</div>
    <div class="r2"><b>ACTION</b> ${esc(readout.action)}</div>
  </div>

  <h2>Pathogen panel</h2>
  <table><thead><tr><th>Target</th><th>ID marker</th><th>Result</th></tr></thead><tbody>${targetRows}</tbody></table>

  <h2>Antimicrobial resistance</h2>
  <table><thead><tr><th>Marker</th><th>Drug class</th><th>Call</th></tr></thead><tbody>${snpRows}</tbody></table>
  ${
    avoid.length || consider.length
      ? `<div class="pills" style="margin-top:8px">
      ${avoid.map((d) => `<b class="avoid">Avoid: ${esc(d)}</b>`).join("")}
      ${consider.map((d) => `<b class="use">Consider: ${esc(d)}</b>`).join("")}</div>`
      : ""
  }

  <div class="sign">
    <div><b>Internal control:</b> ${p.result.controlValid ? '<span style="color:#0E7C86;font-weight:700">VALID</span>' : '<span style="color:#B7791F;font-weight:700">INVALID — repeat</span>'}</div>
    <div><b>Reviewed &amp; signed:</b> ${esc(p.signedBy ?? "— pending —")}${p.signedBy ? " · " + now.toLocaleTimeString() : ""}</div>
  </div>

  <div class="disc">Performance figures shown in the app are illustrative demo values. Molecular AMR detects known resistance markers only; absence is reported as "no resistance detected," not phenotypic susceptibility. Confirm per local antibiogram and guidelines.</div>

  <div class="foot"><span>GoDx, Inc. — GoCARE SaMD</span><span>Investigational Use Only — not for diagnostic procedures</span><span>Page 1 of 1</span></div>

  <script>window.onload=function(){setTimeout(function(){window.print();},250);};</script>
</body></html>`;

  const w = window.open("", "_blank", "width=820,height=1060");
  if (!w) {
    alert("Please allow pop-ups to generate the PDF report.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
