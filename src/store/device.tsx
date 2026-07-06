/**
 * Device & HaaS store — the fleet of GoDEVICE instruments registered to the
 * account, the active one under control, cartridge inventory (Hardware-as-a-Service
 * auto-reorder), clinic registration, and external integrations.
 *
 * A GoCARE account can have many GoDEVICEs; one is "active" and controlled at a time.
 * Consuming a cartridge (on run start) decrements stock; crossing the safety
 * threshold auto-orders an MOQ from the GoDx Store.
 */

import { createContext, useContext, useReducer, type ReactNode } from "react";
import { APP_ORDER, APPS, type AppId } from "../data/catalog";

export interface GeoLoc {
  lat: number;
  lng: number;
  label: string;
}
export interface GoDeviceUnit {
  id: string;
  model: string;
  serial: string;
  firmware: string;
  label: string; // friendly placement name
  location: GeoLoc | null;
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
  threshold: number;
  moq: number;
  autoReorder: boolean;
  incoming: number;
}
export interface StoreOrder {
  id: string;
  appId: AppId;
  qty: number;
  when: number;
  status: "placed" | "received";
  auto: boolean;
}
export interface Integrations {
  emr: boolean; // FHIR R4
  lis: boolean; // HL7 v2
  sequencer: boolean; // Oxford Nanopore / BugSEQ
}

export interface DeviceState {
  devices: GoDeviceUnit[];
  activeId: string;
  clinic: Clinic;
  faceEnrolled: boolean;
  storeConnected: boolean;
  inventory: Record<AppId, CartridgeStock>;
  orders: StoreOrder[];
  integrations: Integrations;
}

const MOQ = 10;
function stock(n: number, threshold: number, autoReorder = true): CartridgeStock {
  return { stock: n, used: 0, threshold, moq: MOQ, autoReorder, incoming: 0 };
}

const initial: DeviceState = {
  devices: [
    {
      id: "gdx-a7f3",
      model: "GoDEVICE One",
      serial: "GDX-1-24A7F309",
      firmware: "3.1.4",
      label: "Front Desk",
      location: { lat: 43.0731, lng: -89.4012, label: "Madison, WI" },
    },
    {
      id: "gdx-b2c8",
      model: "GoDEVICE One",
      serial: "GDX-1-24B2C817",
      firmware: "3.1.4",
      label: "Triage Room 2",
      location: { lat: 43.0759, lng: -89.3841, label: "Madison, WI" },
    },
  ],
  activeId: "gdx-a7f3",
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
    godetect: stock(9, 8), // seeded low to demonstrate auto-reorder
    goseq: stock(11, 4),
    goh2o: stock(10, 6),
  },
  orders: [],
  integrations: { emr: true, lis: false, sequencer: true },
};

type Action =
  | { type: "CONSUME"; appId: AppId }
  | { type: "REORDER"; appId: AppId; auto: boolean }
  | { type: "RECEIVE"; id: string }
  | { type: "TOGGLE_AUTO"; appId: AppId }
  | { type: "SET_CLINIC"; clinic: Partial<Clinic> }
  | { type: "SELECT_DEVICE"; id: string }
  | { type: "REGISTER_DEVICE"; unit: GoDeviceUnit }
  | { type: "SET_LOCATION"; id: string; location: GeoLoc }
  | { type: "SET_DEVICE_LABEL"; id: string; label: string }
  | { type: "ENROLL_FACE"; enrolled: boolean }
  | { type: "SET_STORE"; connected: boolean }
  | { type: "TOGGLE_INTEGRATION"; key: keyof Integrations };

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
    case "SELECT_DEVICE":
      return state.devices.some((d) => d.id === action.id) ? { ...state, activeId: action.id } : state;
    case "REGISTER_DEVICE":
      return { ...state, devices: [...state.devices, action.unit], activeId: action.unit.id };
    case "SET_LOCATION":
      return { ...state, devices: state.devices.map((d) => (d.id === action.id ? { ...d, location: action.location } : d)) };
    case "SET_DEVICE_LABEL":
      return { ...state, devices: state.devices.map((d) => (d.id === action.id ? { ...d, label: action.label } : d)) };
    case "ENROLL_FACE":
      return { ...state, faceEnrolled: action.enrolled };
    case "SET_STORE":
      return { ...state, storeConnected: action.connected };
    case "TOGGLE_INTEGRATION":
      return { ...state, integrations: { ...state.integrations, [action.key]: !state.integrations[action.key] } };
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

export function activeDevice(state: DeviceState): GoDeviceUnit {
  return state.devices.find((d) => d.id === state.activeId) ?? state.devices[0];
}

export function inventorySummary(state: DeviceState) {
  return APP_ORDER.map((appId) => {
    const inv = state.inventory[appId];
    return { appId, name: APPS[appId].name, stock: inv.stock, low: inv.stock <= inv.threshold };
  });
}
