import { APPS, APP_ORDER } from "../data/catalog";
import { FLOWS } from "../data/stages";

/** CLIA-waived, end-to-end operating instructions — plain, numbered, no jargon. */
export function InstructionsScreen() {
  const steps = [
    { t: "Sign in", d: "Badge in (or face scan). Confirm the correct GoDEVICE is selected in the status bar." },
    { t: "Insert the cartridge", d: "Scan the cartridge QR or drop it into the bay. GoCARE loads the right test automatically. Light turns from green to amber when a cartridge is in." },
    { t: "Add the Sample ID", d: "Pick a preset, tap Scan, or type the Sample ID. Add a patient reference only if needed." },
    { t: "Collect & load the sample", d: "Dip the cap swab into the sample and seat it in the cartridge (GoH₂O fills from the water collector automatically)." },
    { t: "Press Start", d: "Close the lid and press Start on the app or the GoDEVICE screen. The light pulses yellow while it runs — walk away." },
    { t: "Read the result", d: "When the light turns red the run is done. The result shows one clear line with the action to take." },
    { t: "Review & sign out", d: "A clinician or lab tech reviews and signs the result. It’s logged to History and, if enabled, sent to the EMR." },
    { t: "Remove the cartridge", d: "Eject with New cartridge. The light returns to green — ready for the next test." },
  ];

  return (
    <div className="fade-in">
      <div className="page-head">
        <div className="eyebrow">CLIA-waived · operating guide</div>
        <h1 className="page-title">How to run a test</h1>
        <p className="page-sub hide-compact">
          A CLIA-waived, sample-to-answer workflow — no lab training required. Follow these eight steps end to end.
        </p>
      </div>

      <div className="grid grid-2">
        <div className="panel panel-pad">
          <div className="section-label">Every test — 8 steps</div>
          <div className="steps">
            {steps.map((s, i) => (
              <div key={s.t} className="step done" style={{ alignItems: "flex-start" }}>
                <div className="step-num">{i + 1}</div>
                <div>
                  <div className="step-label">{s.t}</div>
                  <div className="step-detail" style={{ color: "var(--muted)" }}>{s.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="panel panel-pad">
            <div className="section-label">Indicator light</div>
            <div className="kv"><span className="k"><span className="status-light sl-ready" style={{ marginRight: 8, display: "inline-block", verticalAlign: "middle" }} /> Green</span><span className="v">Ready — insert a cartridge</span></div>
            <div className="kv"><span className="k"><span className="status-light sl-running" style={{ marginRight: 8, display: "inline-block", verticalAlign: "middle" }} /> Yellow (pulsing)</span><span className="v">Processing — do not open</span></div>
            <div className="kv"><span className="k"><span className="status-light sl-done" style={{ marginRight: 8, display: "inline-block", verticalAlign: "middle" }} /> Red</span><span className="v">Done — remove cartridge</span></div>
          </div>

          <div className="panel panel-pad">
            <div className="section-label">Per-cartridge stages</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {APP_ORDER.map((id) => (
                <div key={id}>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14 }}>{APPS[id].tm}</div>
                  <div className="helper">{FLOWS[id].stages.map((s) => s.label).join(" → ")}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
