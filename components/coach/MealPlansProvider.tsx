"use client";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { exampleMealPlans } from "@/lib/meal-plans/mock-data";
import type { MealPlan } from "@/lib/meal-plans/types";

type ContextValue = { plans: readonly MealPlan[]; savePlan: (plan: MealPlan) => void; deletePlan: (id: string) => void; duplicatePlan: (id: string) => MealPlan | undefined; getPlan: (id: string) => MealPlan | undefined };
const Context = createContext<ContextValue | null>(null);
const copyId = () => `menu-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
export function MealPlansProvider({ children }: { children: React.ReactNode }) {
  const [plans, setPlans] = useState<readonly MealPlan[]>(exampleMealPlans);
  const savePlan = useCallback((plan: MealPlan) => setPlans((current) => current.some((item) => item.id === plan.id) ? current.map((item) => item.id === plan.id ? plan : item) : [plan, ...current]), []);
  const deletePlan = useCallback((id: string) => setPlans((current) => current.filter((plan) => plan.id !== id)), []);
  const duplicatePlan = useCallback((id: string) => { let copy: MealPlan | undefined; setPlans((current) => { const source = current.find((plan) => plan.id === id); if (!source) return current; const newId = copyId(); copy = { ...source, id: newId, name: `${source.name} — עותק`, status: "draft", assignedClientId: undefined, updatedAt: new Date().toISOString().slice(0, 10), meals: source.meals.map((meal, index) => ({ ...meal, id: `${newId}-meal-${index}`, items: meal.items.map((item, itemIndex) => ({ ...item, id: `${newId}-item-${index}-${itemIndex}` })) })) }; return [copy, ...current]; }); return copy; }, []);
  const getPlan = useCallback((id: string) => plans.find((plan) => plan.id === id), [plans]);
  const value = useMemo(() => ({ plans, savePlan, deletePlan, duplicatePlan, getPlan }), [plans, savePlan, deletePlan, duplicatePlan, getPlan]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useMealPlans() { const value = useContext(Context); if (!value) throw new Error("useMealPlans must be used in provider"); return value; }
