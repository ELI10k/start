/**
 * Calories stay precise for nutrition calculations, but product UIs always
 * round upward so the displayed value never understates the product's energy.
 */
export function displayCalories(value: number | string): number {
  const calories = Number(value);
  return Number.isFinite(calories) ? Math.ceil(calories) : 0;
}
