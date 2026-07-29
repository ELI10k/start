import type { ClientDataAdapter, DemoSnapshot } from "./types.ts";

const STORAGE_KEY = "start-demo-v1";

export function createMemoryAdapter(initial: DemoSnapshot): ClientDataAdapter {
  let value = structuredClone(initial);
  return {
    load: () => structuredClone(value),
    save: (next) => { value = structuredClone(next); },
    clear: () => { value = structuredClone(initial); },
  };
}

export function createBrowserDemoAdapter(initial: DemoSnapshot): ClientDataAdapter {
  return {
    load() {
      if (typeof window === "undefined") return initial;
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        return stored ? { ...initial, ...JSON.parse(stored) as Partial<DemoSnapshot> } : initial;
      } catch { return initial; }
    },
    save(snapshot) {
      if (typeof window === "undefined") return;
      try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)); } catch { /* private mode or quota: session state still works */ }
    },
    clear() {
      if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
    },
  };
}
