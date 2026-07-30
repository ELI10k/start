"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { clients } from "@/lib/clients";
import { mockCheckIns } from "@/lib/check-ins/mock-data";
import type { WeeklyCheckIn } from "@/lib/check-ins/types";
import { mockWeighIns } from "@/lib/progress/mock-data";
import type { WeighIn } from "@/lib/progress/types";

type ClientData = {
  weighIns: readonly WeighIn[];
  checkIns: readonly WeeklyCheckIn[];
  addWeighIn: (entry: WeighIn) => boolean;
  addCheckIn: (entry: WeeklyCheckIn) => boolean;
};
const Context = createContext<ClientData | null>(null);

export function ClientDataProvider({ children }: { children: React.ReactNode }) {
  const [weighIns, setWeighIns] = useState<readonly WeighIn[]>(mockWeighIns);
  const [checkIns, setCheckIns] = useState<readonly WeeklyCheckIn[]>(mockCheckIns);
  const knownClient = (id: string) => clients.some((client) => client.id === id);
  const addWeighIn = useCallback((entry: WeighIn) => {
    if (!knownClient(entry.clientId)) return false;
    setWeighIns((current) => [...current, entry]); return true;
  }, []);
  const addCheckIn = useCallback((entry: WeeklyCheckIn) => {
    if (!knownClient(entry.clientId)) return false;
    setCheckIns((current) => [...current, entry]); return true;
  }, []);
  const value = useMemo(() => ({ weighIns, checkIns, addWeighIn, addCheckIn }), [weighIns, checkIns, addWeighIn, addCheckIn]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useClientData() {
  const value = useContext(Context);
  if (!value) throw new Error("useClientData must be used inside ClientDataProvider");
  return value;
}
