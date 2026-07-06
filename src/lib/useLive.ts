import { useEffect, useState } from "react";
import { subscribe, type LiveEvent } from "./live";

type RunEvent = Extract<LiveEvent, { type: "run" }>;
type TeleEvent = Extract<LiveEvent, { type: "telemetry" }>;

/** Subscribe to the live link and hold the latest run + telemetry snapshots. */
export function useLiveMirror() {
  const [run, setRun] = useState<RunEvent | null>(null);
  const [runAt, setRunAt] = useState(0);
  const [tele, setTele] = useState<TeleEvent | null>(null);

  useEffect(
    () =>
      subscribe((e) => {
        if (e.type === "run") {
          setRun(e);
          setRunAt(Date.now());
        } else if (e.type === "telemetry") {
          setTele(e);
        }
      }),
    [],
  );

  return { run, runAt, tele };
}
