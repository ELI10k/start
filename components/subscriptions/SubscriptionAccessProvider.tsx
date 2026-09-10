"use client";

import { createContext, useContext } from "react";
import type { SubscriptionAccess } from "@/lib/subscriptions/access";

const empty: SubscriptionAccess = { plan: null, status: null, source: null, entitlements: {}, overrides: {} };
const SubscriptionContext = createContext<SubscriptionAccess>(empty);

export function SubscriptionAccessProvider({ access, children }: { access: SubscriptionAccess; children: React.ReactNode }) {
  return <SubscriptionContext.Provider value={access}>{children}</SubscriptionContext.Provider>;
}

export function useSubscriptionAccess() {
  return useContext(SubscriptionContext);
}
