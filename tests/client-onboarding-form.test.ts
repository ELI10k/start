import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("client onboarding stays short and hides professional programming decisions", async () => {
  const form = await source("components/onboarding/ClientOnboardingForm.tsx");
  assert.match(form, /כ־2 דקות/);
  assert.doesNotMatch(form, />FBW</);
  assert.doesNotMatch(form, />PPL</);
  assert.match(form, /name="trainingSplit" value="auto"/);
  assert.match(form, /name="trainingFocus" value="balanced"/);
});

test("client onboarding collects the minimum required safety and personalization inputs", async () => {
  const form = await source("components/onboarding/ClientOnboardingForm.tsx");
  for (const field of ["ageYears", "sex", "height", "weight", "targetWeight", "nutritionGoal", "traineeLevel", "trainingGoal", "trainingLocation", "equipment", "weeklyWorkouts", "sessionMinutes", "dailySteps", "medicalReview"]) {
    assert.match(form, new RegExp(`name="${field}"`), `${field} is missing`);
  }
  for (const field of ["dietType", "dietTypeOther", "dietaryRestrictions", "allergies", "mealTimes", "foodPreferences", "foodAvoidances"]) {
    assert.match(form, new RegExp(`name="${field}"`), `${field} is missing`);
  }
});

test("server validates the safety gate and stores nutrition preferences", async () => {
  const action = await source("app/actions/onboarding.ts");
  const onboarding = action.slice(action.indexOf("export async function completeClientOnboarding"));
  assert.match(onboarding, /medicalReview!=="no"&&!value\(form,"medicalNotes"\)/);
  assert.match(onboarding, /food_preferences:value\(form,"foodPreferences"\)/);
  assert.match(onboarding, /food_avoidances:value\(form,"foodAvoidances"\)/);
  assert.match(onboarding, /diet_type:dietType/);
  assert.match(onboarding, /diet_type_other:dietTypeOther/);
  assert.match(onboarding, /dietary_restrictions:dietaryRestrictions/);
  assert.match(onboarding, /!dietaryRestrictions\.length/);
  assert.match(onboarding, /יש להשלים את כל שאלות התזונה/);
  assert.match(onboarding, /weeklyWorkouts<2\|\|weeklyWorkouts>6/);
  assert.match(onboarding, /!targetWeight\|\|targetWeight<30\|\|targetWeight>350/);
});

test("digital clients have a self-service assignment path with a medical gate", async () => {
  const [helper, migration, form] = await Promise.all([
    source("lib/workouts/assign-personalized.ts"),
    source("supabase/migrations/20261007120000_digital_client_workout_assignment.sql"),
    source("components/onboarding/ClientOnboardingForm.tsx"),
  ]);
  assert.match(helper, /assign_digital_intake_workout/);
  assert.match(migration, /medical_clearance_required/);
  assert.match(migration, /created_for_client_id/);
  assert.match(migration, /revoke all on function public\.assign_digital_intake_workout/);
  assert.match(form, /title="הצהרת בריאות"/);
  assert.match(form, /אני מאשר\/ת ויכול\/ה להתחיל להתאמן/);
  assert.match(form, /אחד מהסעיפים רלוונטי אליי/);
  assert.match(form, /נמתין עם הפעלת התוכנית עד לקבלת אישור רפואי/);
});
