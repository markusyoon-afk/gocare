/**
 * Device & HaaS store — the instrument's own state, separate from the clinical
 * session: GoDEVICE identity, clinic registration, operator enrollment, and the
 * cartridge inventory that drives Hardware-as-a-Service auto-reordering.
 *
 * Consuming a cartridge (on run start) decrements stock; when stock crosses the
 * safety threshold, an MOQ order is placed automatically with the GoDx store.
 */

import { createContext, useContext, useReducer, type ReactNode } from "react";
import { APP_ORDER, APPS, type AppId } from "../data/catalog";

export interface DeviceInfo {
  model: string;
  serial: string;
  firmware: string;
}
export interface Clinic {
  name: string;
  address: string;
  npi: string;
  contact: string;
}
export interface CartridgeStock {
  stock: number;
  used: number;
  threshold: number; // safety level that triggers reorder
  moq: number; // minimum order quantity
  autoReorder: boolean;
  incoming: number; // units on an open order
}
export interface StoreOrder {
  id: string;
  appId: AppId;
  qty: number;
  when: number;
  status: "placed" | "received";
  auto: boolean;
}

export interface DeviceState {
  device: DeviceInfo;
  clinic: Clinic;
  faceEnrolled: boolean;
  storeConnected: boolean;
  inventory: Record<AppId, CartridgeStock>;
  orders: StoreOrder[];
}

const MOQ = 10;
function stock(n: number, threshold: number, autoReorder = true): CartridgeStock {
  return { stock: n, used: 0, threshold, moq: MOQ, autoReorder, incoming: 0 };
}

const initial: DeviceState = {
  device: { model: "GoDEVICE One", serial: "GDX-1-24A7F309", firmware: "3.1.4" },
  clinic: {
    name: "Riverside Urgent Care",
    address: "1420 Water St, Madison, WI 53703",
    npi: "1780-XXXXXX",
    contact: "lab@riversideuc.example",
  },
  faceEnrolled: false,
  storeConnected: true,
  inventory: {
    goprep: stock(22, 8),
    godetect: stock(9, 8), // seeded low so the first run demonstrates auto-reorder
    goseq: stock(11, 4),
    goh2o: stock(10, 6),
  },
  orders: [],
};

type Action =
  | { type: "CONSUME"; appId: AppId }
  | { type: "REORDER"; appId: AppId; auto: boolean }
  | { type: "RECEIVE"; id: string }
  | { type: "TOGGLE_AUTO"; appId: AppId }
  | { type: "SET_CLINIC"; clinic: Partial<Clinic> }
  | { type: "SET_DEVICE"; device: Partial<DeviceInfo> }
  | { type: "ENROLL_FACE"; enrolled: boolean }
  | { type: "SET_STORE"; connected: boolean };

let orderSeq = 0;
function placeOrder(state: DeviceState, appId: AppId, auto: boolean): DeviceState {
  const inv = state.inventory[appId];
  const order: StoreOrder = {
    id: `ord-${Date.now()}-${orderSeq++}`,
    appId,
    qty: inv.moq,
    when: Date.now(),
    status: "placed",
    auto,
  };
  return {
    ...state,
    inventory: { ...state.inventory, [appId]: { ...inv, incoming: inv.incoming + inv.moq } },
    orders: [order, ...state.orders].slice(0, 40),
  };
}

function reducer(state: DeviceState, action: Action): DeviceState {
  switch (action.type) {
    case "CONSUME": {
      const inv = state.inventory[action.appId];
      const next = { ...inv, stock: Math.max(0, inv.stock - 1), used: inv.used + 1 };
      let s = { ...state, inventory: { ...state.inventory, [action.appId]: next } };
      // Auto-reorder when at/below the safety threshold and nothing already inbound.
      if (next.autoReorder && next.stock <= next.threshold && next.incoming === 0 && state.storeConnected) {
        s = placeOrder(s, action.appId, true);
      }
      return s;
    }
    case "REORDER":
      return placeOrder(state, action.appId, action.auto);
    case "RECEIVE": {
      const order = state.orders.find((o) => o.id === action.id);
      if (!order || order.status === "received") return state;
      const inv = state.inventory[order.appId];
      return {
        ...state,
        inventory: {
          ...state.inventory,
          [order.appId]: { ...inv, stock: inv.stock + order.qty, incoming: Math.max(0, inv.incoming - order.qty) },
        },
        orders: state.orders.map((o) => (o.id === action.id ? { ...o, status: "received" } : o)),
      };
    }
    case "TOGGLE_AUTO": {
      const inv = state.inventory[action.appId];
      return { ...state, inventory: { ...state.inventory, [action.appId]: { ...inv, autoReorder: !inv.autoReorder } } };
    }
    case "SET_CLINIC":
      return { ...state, clinic: { ...state.clinic, ...action.clinic } };
    case "SET_DEVICE":
      return { ...state, device: { ...state.device, ...action.device } };
    case "ENROLL_FACE":
      return { ...state, faceEnrolled: action.enrolled };
    case "SET_STORE":
      return { ...state, storeConnected: action.connected };
    default:
      return state;
  }
}

const Ctx = createContext<{ state: DeviceState; dispatch: React.Dispatch<Action> } | null>(null);

export function DeviceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export function useDevice() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDevice must be used within DeviceProvider");
  return ctx;
}

/** Compact inventory summary for telemetry / glanceable views. */
export function inventorySummary(state: DeviceState) {
  return APP_ORDER.map((appId) => {
    const inv = state.inventory[appId];
    return { appId, name: APPS[appId].name, stock: inv.stock, low: inv.stock <= inv.threshold };
  });
}
