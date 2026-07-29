import { foods } from "../foods.ts";
import type { MealPlan } from "./types.ts";

const assertFood = (id: string) => { if (!foods.some((food) => food.id === id)) throw new Error(`Unknown mock food: ${id}`); return id; };

export const exampleMealPlans: readonly MealPlan[] = [
  { id: "balanced-noam", name: "תפריט מאוזן לנועם", description: "תפריט יומי לדוגמה. יש להתאים לפי ההתקדמות.", targets: { calories: 2100, protein: 160, carbs: 220, fat: 65 }, status: "active", assignedClientId: "noam-levi", updatedAt: "2026-07-19", meals: [
    { id: "bn-breakfast", name: "ארוחת בוקר", order: 0, items: [{ id: "bn-cereal", foodId: assertFood("154"), quantityGrams: 80 }, { id: "bn-yogurt", foodId: assertFood("31"), quantityGrams: 200 }] },
    { id: "bn-lunch", name: "ארוחת צהריים", order: 1, items: [{ id: "bn-chicken", foodId: assertFood("276"), quantityGrams: 200 }, { id: "bn-rice", foodId: assertFood("121"), quantityGrams: 250 }] },
    { id: "bn-evening", name: "ארוחת ערב", order: 2, items: [{ id: "bn-cottage", foodId: assertFood("2"), quantityGrams: 250 }, { id: "bn-bread", foodId: assertFood("67"), quantityGrams: 100 }] },
  ] },
  { id: "maya-draft", name: "טיוטת חיזוק למאיה", description: "טיוטה פנימית להמשך עריכה.", targets: { calories: 1750, protein: 120, carbs: 180, fat: 55 }, status: "draft", assignedClientId: "maya-cohen", updatedAt: "2026-07-18", meals: [{ id: "md-breakfast", name: "ארוחת בוקר", order: 0, items: [{ id: "md-yogurt", foodId: assertFood("31"), quantityGrams: 180 }] }] },
  { id: "high-protein-template", name: "תבנית יום עשיר בחלבון", description: "תבנית לא משויכת לשימוש חוזר.", targets: { calories: 2000, protein: 170, carbs: 190, fat: 60 }, status: "active", updatedAt: "2026-07-16", meals: [{ id: "hp-lunch", name: "ארוחת צהריים", order: 0, items: [{ id: "hp-tuna", foodId: assertFood("127"), quantityGrams: 200 }, { id: "hp-bulgur", foodId: assertFood("125"), quantityGrams: 250 }] }] },
];

export function getExampleMealPlan(id: string) { return exampleMealPlans.find((plan) => plan.id === id); }
export function getAssignedMealPlan(clientId: string) { return exampleMealPlans.find((plan) => plan.assignedClientId === clientId); }
