import type { HealthSource, HealthSourceDetails, HealthSourceDevice } from "./types.ts";

// Where a figure came from, in words a client recognises.
//
// The health store merges the phone, a watch and any ring that writes to it, so
// "healthkit" was the only source LIFE FIT ever knew - and a client wearing an
// Oura could not tell whether the number on the screen was the ring's or the
// phone's. The native side now hands over what HealthKit itself says about each
// writer (HKSourceRevision + HKDevice). This file only ever repeats that: it
// never infers a brand from a number, and it never shows an identifier.

const FIELDS = ["sourceName", "sourceBundleIdentifier", "productType", "deviceName", "manufacturer", "model", "hardwareVersion"] as const;
const MAX_DEVICES = 6;
const MAX_LENGTH = 80;

const clean = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.replace(/[\u0000-\u001f]/g, "").trim().slice(0, MAX_LENGTH);
  return trimmed || undefined;
};

/** Keeps only the known string fields, trimmed and bounded. Anything else the bridge sends is dropped. */
export function normalizeSourceDevice(input: unknown): HealthSourceDevice | undefined {
  if (!input || typeof input !== "object") return undefined;
  const record = input as Record<string, unknown>;
  const device: Record<string, string> = {};
  for (const field of FIELDS) {
    const value = clean(record[field]);
    if (value) device[field] = value;
  }
  return Object.keys(device).length ? device : undefined;
}

export function normalizeSourceDetails(input: unknown): HealthSourceDetails | undefined {
  const list = Array.isArray(input)
    ? input
    : input && typeof input === "object" && Array.isArray((input as { devices?: unknown }).devices)
      ? (input as { devices: unknown[] }).devices
      : [];
  const devices: HealthSourceDevice[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    const device = normalizeSourceDevice(item);
    if (!device) continue;
    const key = deviceKey(device);
    if (seen.has(key)) continue;
    seen.add(key);
    devices.push(device);
    if (devices.length >= MAX_DEVICES) break;
  }
  return devices.length ? { devices } : undefined;
}

const deviceKey = (device: HealthSourceDevice) => `${device.sourceBundleIdentifier ?? device.sourceName ?? ""}|${device.model ?? ""}|${device.deviceName ?? ""}`;

/** A stable signature, so an unchanged set of writers is not written back on every sync. */
export function sourceDetailsKey(details: HealthSourceDetails | undefined): string {
  return (details?.devices ?? []).map(deviceKey).sort().join(";");
}

// Apple's own writers are identified by bundle id (com.apple.health.<uuid>)
// plus the hardware model HealthKit reports. Both are Apple's words.
const isApple = (device: HealthSourceDevice) =>
  /^com\.apple\./i.test(device.sourceBundleIdentifier ?? "") || /^apple/i.test(device.manufacturer ?? "");

function appleLabel(device: HealthSourceDevice): string | undefined {
  const hints = `${device.model ?? ""} ${device.productType ?? ""}`;
  if (/watch/i.test(hints)) return "Apple Watch";
  if (/iphone/i.test(hints)) return "iPhone";
  if (/ipad/i.test(hints)) return "iPad";
  return undefined;
}

/**
 * One short name per writer - what the client would call it. Third-party
 * writers are named after the app HealthKit says wrote the sample (Oura,
 * Ultrahuman, RingConn...), falling back to the device name it reported.
 */
export function deviceLabel(device: HealthSourceDevice): string | undefined {
  if (isApple(device)) return appleLabel(device);
  return device.sourceName ?? device.deviceName ?? device.manufacturer ?? undefined;
}

const PLATFORM: Record<HealthSource | "none", string> = {
  healthkit: "Apple Health",
  "health-connect": "Health Connect",
  manual: "הזנה ידנית",
  test: "מקור בדיקה",
  none: "Apple Health",
};

export type SourceSummary = Readonly<{
  /** The line under the figure: "מקור: Oura דרך Apple Health". */
  text: string;
  /** Every recognised writer, for the detail screen. */
  names: readonly string[];
  kind: "platform" | "single" | "multiple";
}>;

/**
 * - nothing specific         → "מקור: Apple Health"
 * - one Apple device         → "מקור: Apple Watch" / "מקור: iPhone"
 * - one third-party writer   → "מקור: Oura דרך Apple Health"
 * - more than one writer     → "מקור: מספר מכשירים דרך Apple Health"
 */
export function describeSources(details: HealthSourceDetails | undefined, source: HealthSource | "none" = "healthkit"): SourceSummary {
  const platform = PLATFORM[source] ?? PLATFORM.healthkit;
  const devices = details?.devices ?? [];
  const names: string[] = [];
  let unnamed = 0;
  let thirdParty = false;
  for (const device of devices) {
    const label = deviceLabel(device);
    if (!label) { unnamed += 1; continue; }
    if (!names.includes(label)) names.push(label);
    if (!isApple(device)) thirdParty = true;
  }
  if (names.length + (unnamed && names.length ? 1 : 0) > 1) {
    return { text: `מקור: מספר מכשירים דרך ${platform}`, names, kind: "multiple" };
  }
  if (names.length === 1) {
    return { text: thirdParty ? `מקור: ${names[0]} דרך ${platform}` : `מקור: ${names[0]}`, names, kind: "single" };
  }
  return { text: `מקור: ${platform}`, names, kind: "platform" };
}
