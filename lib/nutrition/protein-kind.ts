// Dairy or meat - the one distinction the alternatives list has to respect.
//
// A protein group whose primary is cottage cheese cannot offer chicken breast as
// a swap and vice versa: the client keeps kosher, and a menu that mixes the two
// inside one portion is not a menu they can eat. The suggestion engine ranked by
// calories alone, so "הוספת חלופה" under a dairy primary came back all meat.
//
// The rule is deliberately name-first. The catalogue's categories are about where
// a product sits in a supermarket ("שימורי טונה", "מנות מוכנות"), not about what
// a portion may be swapped for.

export type ProteinKind = "dairy" | "meat" | "neutral";

export type KindableFood = Readonly<{
  name?: string;
  category?: string;
  brand?: string | null;
}>;

// Fish and eggs are pareve: they sit in either list, which is exactly how the
// coach uses them - tuna next to cottage cheese at breakfast, salmon next to
// chicken at lunch.
const NEUTRAL = /ביצה|ביצי|לבן ביצה|חלבון ביצה|טונה|סלמון|סלומון|דג |דגים|מושט|בקלה|אמנון|לברק|טופו|סייטן|טבעול|עדשים|חומוס|שעועית|קטניות/;
const DAIRY = /גבינ|קוטג|יוגורט|לבן|לבנה|שמנת|חלב|מעדן|בולגרית|צפתית|מוצרלה|ריקוטה|קוואטרו|סקי|פרו |יטבתה|תנובה|טרה|שטראוס|יופלה|דנונה|מיץ חלב|קפיר/;
const MEAT = /עוף|הודו|בקר|פרגית|כרע|פולקע|שוק|שייטל|אנטריקוט|סינטה|המבורגר|קבב|שניצל|נקניק|פסטרמה|כבש|טלה|בשר|צלי|אסאדו/;

export function proteinKind(food: KindableFood): ProteinKind {
  const label = `${food.name ?? ""} ${food.category ?? ""} ${food.brand ?? ""}`;
  // Order matters: "שניצל טבעול" is not meat, and "פסטרמה הודו" is.
  if (NEUTRAL.test(label)) return "neutral";
  if (MEAT.test(label)) return "meat";
  if (DAIRY.test(label)) return "dairy";
  return "neutral";
}

/**
 * Whether `candidate` may stand in for `primary` inside one protein group.
 *
 * Neutral foods go with anything. Dairy and meat never go with each other.
 */
export function isCompatibleProtein(primary: KindableFood, candidate: KindableFood): boolean {
  const a = proteinKind(primary);
  const b = proteinKind(candidate);
  return a === "neutral" || b === "neutral" || a === b;
}
