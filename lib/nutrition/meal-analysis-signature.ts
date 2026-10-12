import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { MealAnalysisComponent } from "@/lib/nutrition/meal-image-analysis";

export type SignedMealAnalysis = Readonly<{ userId: string; expiresAt: number; components: readonly MealAnalysisComponent[] }>;

function secret() {
  const value = process.env.AI_MEAL_SIGNING_SECRET?.trim();
  if (!value || value.length < 32) throw new Error("ai_meal_signing_secret_missing");
  return value;
}

export function signMealAnalysis(payload: SignedMealAnalysis): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function verifyMealAnalysis(token: string, userId: string): SignedMealAnalysis | null {
  try {
    const [body, supplied] = token.split(".");
    if (!body || !supplied) return null;
    const expected = createHmac("sha256", secret()).update(body).digest();
    const received = Buffer.from(supplied, "base64url");
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SignedMealAnalysis;
    return payload.userId === userId && payload.expiresAt >= Date.now() && Array.isArray(payload.components) ? payload : null;
  } catch { return null; }
}
