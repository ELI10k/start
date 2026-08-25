export const FOOD_LOG_PHOTO_BUCKET = "food-log-photos";
export const FOOD_LOG_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const FOOD_LOG_PHOTO_URL_TTL_SECONDS = 5 * 60;
export const FOOD_LOG_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type FoodLogPhotoFile = Readonly<{ size: number; type: string }>;

export function validateFoodLogPhoto(file: FoodLogPhotoFile): string | null {
  if (!FOOD_LOG_PHOTO_TYPES.has(file.type)) return "התמונה חייבת להיות JPG, PNG או WebP.";
  if (file.size > FOOD_LOG_PHOTO_MAX_BYTES) return "התמונה יכולה להיות בגודל של עד 5MB.";
  return null;
}

/**
 * Where a food-log photograph lives.
 *
 * The owner's id is the first path segment, because that is what the storage
 * policy reads to decide who may see it - the same rule the check-in photos use.
 * Anything else would be a second way of answering the same question.
 */
export function foodLogPhotoPath(clientId: string, date: string, mimeType: string) {
  const extension = mimeType === "image/jpeg" ? "jpg" : mimeType === "image/png" ? "png" : "webp";
  // Random enough that two photographs taken in the same second cannot collide,
  // and carrying no meaning of its own.
  const unique = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return `${clientId}/${date}/${unique}.${extension}`;
}

export type LoggedFood = Readonly<{
  id: string;
  mealId: string | null;
  name: string;
  quantity: number | null;
  unit: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  source: "text" | "scan" | "photo";
  photoUrl: string | null;
  nutritionEstimated?: boolean;
}>;

/**
 * What a set of logged entries adds up to.
 *
 * Only entries that carry figures are counted, and how many did not is returned
 * beside the totals - a day with two scanned items and one photograph has a real
 * partial total, and rounding that to "300 calories" without saying that a third
 * of it is unmeasured would be the dishonest version.
 */
export function sumLoggedFood(entries: readonly LoggedFood[]) {
  const measured = entries.filter((entry) => entry.calories !== null);
  return {
    calories: measured.reduce((sum, entry) => sum + (entry.calories ?? 0), 0),
    protein: measured.reduce((sum, entry) => sum + (entry.protein ?? 0), 0),
    carbs: measured.reduce((sum, entry) => sum + (entry.carbs ?? 0), 0),
    fat: measured.reduce((sum, entry) => sum + (entry.fat ?? 0), 0),
    measured: measured.length,
    unmeasured: entries.length - measured.length,
  };
}
