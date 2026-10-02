/** Convert the Hebrew free-text rest prescriptions in the imported workbooks
 * into one dependable countdown. Ranges use their upper bound so the client is
 * never rushed; plain numbers are already seconds in coach-created plans. */
export function workoutRestSeconds(value?: string) {
  const text = value?.trim().toLowerCase();
  if (!text) return null;
  const numbers = [...text.matchAll(/\d+(?:\.\d+)?/g)].map((match) => Number(match[0]));
  if (!numbers.length) return /דקה/.test(text) ? 60 : null;
  if (/שנ/.test(text)) return Math.max(...numbers.map(Math.round));
  if (/דק/.test(text)) return Math.round(Math.max(...numbers) * 60);
  return Math.round(Math.max(...numbers));
}
