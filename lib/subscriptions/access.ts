export const planCodes = ["digital", "coach", "vip"] as const;
export type PlanCode = (typeof planCodes)[number];

export const capabilities = [
  "nutrition_plan", "workout_plan", "recovery_mode", "weekly_adaptation",
  "start_iq", "premium_content", "coach_messaging", "human_checkin_review",
  "technique_review", "video_calls",
] as const;
export type Capability = (typeof capabilities)[number];

export type Entitlement = Readonly<{
  enabled: boolean;
  limit: number | null;
  configuration?: Readonly<Record<string, unknown>>;
}>;

export type SubscriptionAccess = Readonly<{
  plan: PlanCode | null;
  status: string | null;
  source: string | null;
  entitlements: Readonly<Partial<Record<Capability, Entitlement>>>;
  overrides: Readonly<Partial<Record<Capability, Entitlement>>>;
}>;

const planEntitlements: Record<PlanCode, Partial<Record<Capability, Entitlement>>> = {
  digital: {
    nutrition_plan: { enabled: true, limit: null }, workout_plan: { enabled: true, limit: null },
    recovery_mode: { enabled: true, limit: null }, weekly_adaptation: { enabled: true, limit: null },
    start_iq: { enabled: true, limit: null },
  },
  coach: {
    nutrition_plan: { enabled: true, limit: null }, workout_plan: { enabled: true, limit: null },
    recovery_mode: { enabled: true, limit: null }, weekly_adaptation: { enabled: true, limit: null },
    start_iq: { enabled: true, limit: null }, premium_content: { enabled: true, limit: null },
    coach_messaging: { enabled: true, limit: null }, human_checkin_review: { enabled: true, limit: null },
    technique_review: { enabled: true, limit: 2 },
  },
  vip: {
    nutrition_plan: { enabled: true, limit: null }, workout_plan: { enabled: true, limit: null },
    recovery_mode: { enabled: true, limit: null }, weekly_adaptation: { enabled: true, limit: null },
    start_iq: { enabled: true, limit: null }, premium_content: { enabled: true, limit: null },
    coach_messaging: { enabled: true, limit: null }, human_checkin_review: { enabled: true, limit: null },
    technique_review: { enabled: true, limit: 8 }, video_calls: { enabled: true, limit: 1 },
  },
};

export function subscriptionAccessForPlan(plan: PlanCode, source = "legacy"): SubscriptionAccess {
  return { plan, status: "active", source, entitlements: planEntitlements[plan], overrides: {} };
}

export function entitlementFor(access: SubscriptionAccess, capability: Capability): Entitlement {
  return access.overrides[capability] ?? access.entitlements[capability] ?? { enabled: false, limit: 0 };
}

export function hasEntitlement(access: SubscriptionAccess, capability: Capability): boolean {
  return entitlementFor(access, capability).enabled;
}

export function requiresCoachAssignment(capability: Capability): boolean {
  return capability === "coach_messaging" || capability === "human_checkin_review" || capability === "technique_review" || capability === "video_calls";
}

const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);

function parseEntitlements(value: unknown): Partial<Record<Capability, Entitlement>> {
  if (!isObject(value)) return {};
  return Object.fromEntries(capabilities.flatMap((capability) => {
    const raw = value[capability];
    if (!isObject(raw) || typeof raw.enabled !== "boolean") return [];
    const limit = raw.limit === null || (typeof raw.limit === "number" && Number.isInteger(raw.limit) && raw.limit >= 0) ? raw.limit : null;
    return [[capability, { enabled: raw.enabled, limit, ...(isObject(raw.configuration) ? { configuration: raw.configuration } : {}) }]];
  }));
}

export function parseSubscriptionAccess(value: unknown): SubscriptionAccess {
  if (!isObject(value)) return { plan: null, status: null, source: null, entitlements: {}, overrides: {} };
  const plan = typeof value.plan === "string" && planCodes.includes(value.plan as PlanCode) ? value.plan as PlanCode : null;
  return {
    plan,
    status: typeof value.status === "string" ? value.status : null,
    source: typeof value.source === "string" ? value.source : null,
    entitlements: parseEntitlements(value.entitlements),
    overrides: parseEntitlements(value.overrides),
  };
}
