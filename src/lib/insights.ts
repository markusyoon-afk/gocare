/**
 * AI-assisted bioinformatics insight synthesis.
 *
 * Data-driven synthesis across the four domains GoCARE serves — individual, community,
 * environment, and public health — from device results, resistance patterns, and the
 * live CDC benchmark. It computes real signals and phrases them as actionable insight;
 * in production this feeds (and is augmented by) a metagenomic/LLM bioinformatics
 * pipeline (GoSEQ + BugSEQ). Labeled in the UI as AI-assisted.
 */
import type { UnifiedRecord } from "./history";
import { pathogenName } from "./history";
import { PATHOGENS } from "../data/catalog";

export type InsightTone = "ok" | "watch" | "alert";
export interface Insight {
  domain: string;
  glyph: string;
  tone: InsightTone;
  text: string;
}

interface Rising {
  id: string;
  t: { recent: number; prior: number; pct: number };
}

const NOTIFIABLE = new Set(["salmonella", "shigella", "campylobacter", "stec", "neisseria"]);

export function generateInsights(args: {
  rows: UnifiedRecord[];
  byPath: { id: string; name: string; count: number }[];
  rising: Rising | undefined;
  location: string;
  cdcLatest: Record<string, number>;
}): { headline: string; insights: Insight[] } {
  const { rows, byPath, rising, location, cdcLatest } = args;
  const positives = rows.filter((r) => r.pathogen);
  const resistant = rows.filter((r) => r.resistant).length;
  const top = byPath[0];

  // Individual / human
  const human: Insight = {
    domain: "Individual",
    glyph: "🧑",
    tone: resistant > 0 ? "watch" : "ok",
    text: top
      ? `${positives.length} positive results this window; most frequent is ${top.name} (${top.count}). ${
          resistant > 0
            ? `${resistant} show resistance markers — alternative therapy is indicated for those patients.`
            : `No resistance markers detected — first-line therapy appropriate.`
        }`
      : `No positive detections yet — as results accrue, per-patient history and resistance trends appear here.`,
  };

  // Community
  const community: Insight = rising
    ? {
        domain: "Community",
        glyph: "👥",
        tone: "alert",
        text: `${pathogenName(rising.id)} detections up ${rising.t.pct}% week-over-week locally (${rising.t.recent} vs ${
          rising.t.prior
        }). CDC ${location} latest week: ${cdcLatest[rising.id] ?? "—"} cases. Pattern is consistent with an emerging cluster — recommend source tracing and contact follow-up.`,
      }
    : {
        domain: "Community",
        glyph: "👥",
        tone: "ok",
        text: `Local detection pattern tracks the CDC ${location} baseline; no cluster signal in the current window.`,
      };

  // Environment
  const env = rows.filter((r) => r.appId === "goh2o");
  const envPos = env.filter((r) => r.pathogen).length;
  const environment: Insight = {
    domain: "Environment",
    glyph: "🌊",
    tone: envPos > 0 ? "watch" : "ok",
    text:
      env.length > 0
        ? `GoH₂O environmental surveillance: ${envPos} of ${env.length} samples positive. Wastewater signals can precede clinical cases — correlate with the community trend for early warning.`
        : `No GoH₂O environmental samples in this window. Adding wastewater surveillance gives community-level early warning ahead of clinical presentation.`,
  };

  // Public health
  const notifiable = [...new Set(positives.map((r) => r.pathogen).filter((p): p is string => !!p && NOTIFIABLE.has(p)))];
  const publicHealth: Insight = {
    domain: "Public health",
    glyph: "🏛",
    tone: notifiable.length ? "watch" : "ok",
    text: notifiable.length
      ? `Notifiable pathogens detected: ${notifiable.map((n) => PATHOGENS[n].name).join(", ")}. Report per state requirements. ${
          resistant > 0 ? "Resistance present — apply stewardship and flag for surveillance." : "No resistance flagged."
        }`
      : `No nationally-notifiable pathogens in this window. AMR stewardship and reporting hooks are ready when they appear.`,
  };

  const headline = rising
    ? `Emerging ${pathogenName(rising.id)} signal — community cluster possible`
    : resistant > 0
    ? `Resistance detected in ${resistant} case${resistant === 1 ? "" : "s"} — stewardship advised`
    : `Stable surveillance — no clusters or resistance flags`;

  return { headline, insights: [human, community, environment, publicHealth] };
}
