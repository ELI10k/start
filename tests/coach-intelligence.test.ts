import assert from "node:assert/strict";
import test from "node:test";
import { calculateCoachScores, weeklyRecommendations } from "../lib/coach-intelligence/rule-engine.ts";
import { generateWeeklyReport } from "../lib/coach-intelligence/weekly-report.ts";
test("coach intelligence scores are bounded and explainable",()=>{const scores=calculateCoachScores({mealCompletion:100,workoutCompletion:100,averageProtein:160,proteinTarget:160,activeDays:7,checkIns:1,weightTrend:-.2,skippedWorkouts:0,logins:7});for(const value of Object.values(scores))assert.ok(value>=0&&value<=100);assert.ok(scores.health>scores.risk)});
test("coach intelligence recommends only data-backed actions",()=>{assert.match(weeklyRecommendations({mealCompletion:40,workoutCompletion:30,averageProtein:50,proteinTarget:150,activeDays:1,checkIns:0,weightTrend:0,skippedWorkouts:2,logins:1}).join(" "),/אימונים/)});
test("weekly generator is explicit when there is no data",()=>{assert.equal(generateWeeklyReport({mealCompletion:0,workoutCompletion:0,averageProtein:0,activeDays:0,checkIns:0,weightTrend:0,skippedWorkouts:0,logins:0}).status,"insufficient_data")});
