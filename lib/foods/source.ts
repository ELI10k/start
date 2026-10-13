const SCANNED_FOOD_SOURCES = new Set(["openfoodfacts", "manual"]);

/** Foods contributed through the barcode flow, rather than the curated catalogue. */
export function isScannedFoodSource(source: string | null | undefined): boolean {
  return source !== null && source !== undefined && SCANNED_FOOD_SOURCES.has(source);
}
