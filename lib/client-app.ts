import { clients } from "./clients.ts";
import { getMockCheckIns } from "./check-ins/mock-data.ts";
import { getLatestCheckIn } from "./check-ins/calculations.ts";
import { getAssignedMealPlan } from "./meal-plans/mock-data.ts";
import { calculateMealTotals, calculatePlanSummary } from "./meal-plans/calculations.ts";
import { foods } from "./foods.ts";
import { getMockWeighIns } from "./progress/mock-data.ts";
import { summarizeProgress } from "./progress/calculations.ts";

export const currentClient = clients[0];
export const currentPlan = getAssignedMealPlan(currentClient.id);
export const currentWeighIns = getMockWeighIns(currentClient.id);
export const currentCheckIns = getMockCheckIns(currentClient.id);
export const currentProgress = summarizeProgress(currentWeighIns);
export const currentLatestCheckIn = getLatestCheckIn(currentCheckIns);
export const clientFoodMap = new Map(foods.map((food) => [food.id, food]));
export const currentPlanSummary = currentPlan ? calculatePlanSummary(currentPlan, clientFoodMap) : undefined;
export const getMealTotals = (meal: NonNullable<typeof currentPlan>["meals"][number]) => calculateMealTotals(meal, clientFoodMap);
