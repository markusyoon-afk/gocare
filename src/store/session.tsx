/**
 * Session store — the workflow state machine for one GoDEVICE run.
 *
 * The reducer owns transitions only; all computation lives in the pure engine
 * (SURV engine/store split). Screens dispatch intents; the reducer advances the
 * clinical workflow: scan cartridge → configure → run → results.
 */

import { createContext, useContext, useReducer, type ReactNode } from "react";
import type { AppId } from "../data/catalog";
import type { DetectResult } from "../engine/run";

export type Stage =
  | "home" // device dashboard, awaiting cartridge
  | "scan" // scanning / reading the cartridge QR
  | "configure" // app-specific setup (sample type, review targets)
  | "running" // run in progress
  | "results"; // report

export interface SessionState {
  stage: Stage;
  appId: AppId | null;
  matrixId: string | null;
  /** Cartridge lot id read from the QR, doubles as the run seed. */
  lot: string | null;
  /** Optional forced positive to make a specific case reproducible in demos. */
  forcedPathogen?: string;
  runProgress: number; // 0..1
  result: DetectResult | null;
  /** GoSEQ downstream step index (flow-cell transfer → BugSEQ). */
  seqStep: number;
  history: RunRecord[];
}

export interface RunRecord {
  id: string;
  appId: AppId;
  matrixId: string | null;
  lot: string;
  when: number;
  summary: string;
}

type Action =
  | { type: "SCAN_CARTRIDGE"; appId: AppId; lot: string }
  | { type: "RESET" }
  | { type: "SELECT_MATRIX"; matrixId: string; forcedPathogen?: string }
  | { type: "START_RUN" }
  | { type: "SET_PROGRESS"; progress: number }
  | { type: "COMPLETE_RUN"; result: DetectResult | null }
  | { type: "SET_SEQ_STEP"; step: number }
  | { type: "GO_HOME" }
  | { type: "RECORD"; record: RunRecord };

const initial: SessionState = {
  stage: "home",
  appId: null,
  matrixId: null,
  lot: null,
  forcedPathogen: undefined,
  runProgress: 0,
  result: null,
  seqStep: 0,
  history: [],
};

function reducer(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case "SCAN_CARTRIDGE":
      return {
        ...state,
        stage: "configure",
        appId: action.appId,
        lot: action.lot,
        matrixId: null,
        forcedPathogen: undefined,
        result: null,
        runProgress: 0,
        seqStep: 0,
      };
    case "SELECT_MATRIX":
      return { ...state, matrixId: action.matrixId, forcedPathogen: action.forcedPathogen };
    case "START_RUN":
      return { ...state, stage: "running", runProgress: 0, result: null };
    case "SET_PROGRESS":
      return { ...state, runProgress: action.progress };
    case "COMPLETE_RUN":
      return { ...state, stage: "results", runProgress: 1, result: action.result };
    case "SET_SEQ_STEP":
      return { ...state, seqStep: action.step };
    case "RECORD":
      return { ...state, history: [action.record, ...state.history].slice(0, 20) };
    case "GO_HOME":
      return { ...state, stage: "home", appId: null, matrixId: null, result: null, runProgress: 0, seqStep: 0 };
    case "RESET":
      return { ...initial, history: state.history };
    default:
      return state;
  }
}

const Ctx = createContext<{ state: SessionState; dispatch: React.Dispatch<Action> } | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export function useSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
