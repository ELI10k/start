"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createMemoryAdapter } from "@/lib/storage/demo-adapter";
import type { DemoSnapshot } from "@/lib/storage/types";
import { currentCheckIns, currentClient, currentPlan, currentWeighIns } from "@/lib/client-app";

export type MealStatus = "pending" | "eaten";
export type ClientPreferences = { reminders: boolean; weeklySummary: boolean; compactMeals: boolean };
type ClientAppState = { mealStatuses: Readonly<Record<string, MealStatus>>; setMealStatus: (id: string, status: MealStatus) => void; preferences: ClientPreferences; updatePreferences: (next: ClientPreferences) => void };
const Context = createContext<ClientAppState | null>(null);
const initialSnapshot: DemoSnapshot = { identity: { id: currentClient.id, role: "client", demo: true }, profile: { fullName: currentClient.fullName, phone: currentClient.phone, targetWeightKg: currentClient.targetWeight }, assignedMealPlanId: currentPlan?.id, mealCompletions: {}, measurements: currentWeighIns, weightEntries: currentWeighIns, checkIns: currentCheckIns, preferences: { reminders: true, weeklySummary: true, compactMeals: false }, contentProgress: {}, coachNotes: [] };

export function ClientAppProvider({ children }: { children: React.ReactNode }) {
  const adapter = useMemo(() => createMemoryAdapter(initialSnapshot), []);
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  useEffect(() => { const timer = window.setTimeout(() => setSnapshot(adapter.load()), 0); return () => window.clearTimeout(timer); }, [adapter]);
  const commit = useCallback((update: (current: DemoSnapshot) => DemoSnapshot) => {
    setSnapshot((current) => { const next = update(current); adapter.save(next); return next; });
  }, [adapter]);
  const value = useMemo(() => ({
    mealStatuses: snapshot.mealCompletions,
    setMealStatus: (id: string, status: MealStatus) => commit((current) => ({ ...current, mealCompletions: { ...current.mealCompletions, [id]: current.mealCompletions[id] === status ? "pending" : status } })),
    preferences: snapshot.preferences,
    updatePreferences: (preferences: ClientPreferences) => commit((current) => ({ ...current, preferences })),
  }), [commit, snapshot.mealCompletions, snapshot.preferences]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useClientApp() { const value = useContext(Context); if (!value) throw new Error("useClientApp must be used inside ClientAppProvider"); return value; }
