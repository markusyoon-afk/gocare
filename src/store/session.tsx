/**
 * Session store — clinical workflow state machine + governance layer.
 *
 * The reducer owns transitions; the pure engine computes. On top of the workflow
 * (scan → configure → run → results) this store carries the compliance spine:
 * operator identity, session lock, an append-only audit trail, minimal-PHI sample
 * capture, and reviewed electronic sign-out. Audit entries are written inside the
 * reducer on material transitions, so no screen can forget to log.
 *
 * Nothing here is persisted — session and results live in memory only (HIPAA
 * "no PHI at rest" for the demo).
 */

import { createContext, useContext, useReducer, type ReactNode } from "react";
import type { AppId } from "../data/catalog";
import type { Operator } from "../data/compliance";
import type { DetectResult } from "../engine/run";

export type Stage = "home" | "scan" | "configure" | "running" | "results";

export interface AuditEvent {
  id: string;
  ts: number;
  operatorId: string;
  operatorName: string;
  action: string;
  detail: string;
}

export interface RunRecord {
  id: string;
  appId: AppId;
  matrixId: string | null;
  lot: string; // unique cartridge id
  sampleId: string | null;
  when: number;
  summary: string;
  signed: boolean;
  operatorName: string;
  location: string;
  deviceSerial: string;
  pathogen: string | null;
  resistant: boolean;
}

export interface SessionState {
  // governance
  operator: Operator | null;
  locked: boolean;
  lastActivity: number;
  audit: AuditEvent[];
  // sample (minimal PHI)
  sampleId: string | null;
  patientRef: string | null;
  envSource: string | null; // GoH₂O environmental source (Wastewater / Lake / Stream)
  // workflow
  stage: Stage;
  appId: AppId | null;
  matrixId: string | null;
  lot: string | null;
  forcedPathogen?: string;
  runProgress: number;
  result: DetectResult | null;
  seqStep: number;
  signedOut: boolean;
  signedBy: string | null;
  history: RunRecord[];
}

type Action =
  | { type: "SIGN_IN"; operator: Operator }
  | { type: "SIGN_OUT_OPERATOR" }
  | { type: "LOCK" }
  | { type: "UNLOCK" }
  | { type: "ACTIVITY" }
  | { type: "SCAN_CARTRIDGE"; appId: AppId; lot: string }
  | { type: "SELECT_MATRIX"; matrixId: string; forcedPathogen?: string }
  | { type: "SET_ENV_SOURCE"; source: string }
  | { type: "SET_SAMPLE"; sampleId: string; patientRef: string | null }
  | { type: "START_RUN" }
  | { type: "SET_PROGRESS"; progress: number }
  | { type: "COMPLETE_RUN"; result: DetectResult | null; summary: string }
  | { type: "SET_SEQ_STEP"; step: number }
  | { type: "SIGN_RESULT" }
  | { type: "EMR_SENT"; target: string }
  | { type: "RECORD"; record: RunRecord }
  | { type: "GO_HOME" }
  | { type: "RESET" };

const base: Omit<SessionState, "operator" | "audit" | "history" | "locked" | "lastActivity"> = {
  sampleId: null,
  patientRef: null,
  envSource: null,
  stage: "home",
  appId: null,
  matrixId: null,
  lot: null,
  forcedPathogen: undefined,
  runProgress: 0,
  result: null,
  seqStep: 0,
  signedOut: false,
  signedBy: null,
};

const initial: SessionState = {
  operator: null,
  locked: false,
  lastActivity: Date.now(),
  audit: [],
  history: [],
  ...base,
};

let auditSeq = 0;
function log(state: SessionState, action: string, detail: string): AuditEvent[] {
  const op = state.operator;
  const evt: AuditEvent = {
    id: `a${Date.now()}-${auditSeq++}`,
    ts: Date.now(),
    operatorId: op?.id ?? "system",
    operatorName: op?.name ?? "System",
    action,
    detail,
  };
  return [evt, ...state.audit].slice(0, 200);
}

function reducer(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case "SIGN_IN":
      return {
        ...state,
        operator: action.operator,
        locked: false,
        lastActivity: Date.now(),
        audit: log({ ...state, operator: action.operator }, "Sign-in", `${action.operator.name} · ${action.operator.role}`),
      };
    case "SIGN_OUT_OPERATOR":
      return {
        ...initial,
        audit: log(state, "Sign-out (operator)", state.operator?.name ?? ""),
        // audit trail is retained across the operator change for accountability
      };
    case "LOCK":
      if (!state.operator || state.locked) return state;
      return { ...state, locked: true, audit: log(state, "Session locked", "Inactivity auto-lock") };
    case "UNLOCK":
      return { ...state, locked: false, lastActivity: Date.now(), audit: log(state, "Session unlocked", state.operator?.name ?? "") };
    case "ACTIVITY":
      return state.locked ? state : { ...state, lastActivity: Date.now() };

    case "SCAN_CARTRIDGE":
      return {
        ...state,
        ...base,
        stage: "configure",
        appId: action.appId,
        lot: action.lot,
        lastActivity: Date.now(),
        audit: log(state, "Cartridge scanned", `${action.appId.toUpperCase()} · ${action.lot}`),
      };
    case "SELECT_MATRIX":
      return { ...state, matrixId: action.matrixId, forcedPathogen: action.forcedPathogen, lastActivity: Date.now() };
    case "SET_ENV_SOURCE":
      return { ...state, envSource: action.source, lastActivity: Date.now() };
    case "SET_SAMPLE":
      return {
        ...state,
        sampleId: action.sampleId,
        patientRef: action.patientRef,
        lastActivity: Date.now(),
        audit: log(state, "Sample added", `ID ${action.sampleId}${action.patientRef ? " · patient ref set" : ""}`),
      };
    case "START_RUN":
      return {
        ...state,
        stage: "running",
        runProgress: 0,
        result: null,
        signedOut: false,
        signedBy: null,
        lastActivity: Date.now(),
        audit: log(state, "Run started", `${state.appId?.toUpperCase()} · ${state.lot} · sample ${state.sampleId ?? "—"}`),
      };
    case "SET_PROGRESS":
      return { ...state, runProgress: action.progress };
    case "COMPLETE_RUN":
      return {
        ...state,
        stage: "results",
        runProgress: 1,
        result: action.result,
        audit: log(state, "Result generated", action.summary),
      };
    case "SET_SEQ_STEP":
      return { ...state, seqStep: action.step, lastActivity: Date.now() };
    case "SIGN_RESULT": {
      if (state.signedOut) return state;
      // Reflect the signature on the most recent history record (the current run).
      const history = state.history.map((h, i) => (i === 0 ? { ...h, signed: true } : h));
      return {
        ...state,
        signedOut: true,
        signedBy: state.operator?.name ?? null,
        lastActivity: Date.now(),
        history,
        audit: log(state, "Result signed out", `${state.operator?.name ?? ""} · sample ${state.sampleId ?? "—"}`),
      };
    }
    case "EMR_SENT":
      return { ...state, audit: log(state, "Sent to EMR", `${action.target} · sample ${state.sampleId ?? "—"}`) };
    case "RECORD":
      return { ...state, history: [action.record, ...state.history].slice(0, 30) };
    case "GO_HOME":
      return { ...state, ...base, lastActivity: Date.now() };
    case "RESET":
      return { ...initial, operator: state.operator, audit: state.audit, history: state.history };
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

/** Whether the current operator holds a scope. */
export function can(state: SessionState, scope: "run" | "sign_out" | "admin"): boolean {
  return Boolean(state.operator?.scopes.includes(scope));
}
