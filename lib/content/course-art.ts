/* Where each course's banner lives.
 *
 * The artwork ships with the app - eleven files under `public/content/courses` -
 * so the pointer to it belongs next to the files rather than only in a column a
 * migration has to keep in step. `content_categories.cover_url` still wins when
 * it is set, which is what lets a coach replace a banner without a deploy; this
 * map is what a course falls back to, so a course can never lose its banner to a
 * migration that did not run or a row that was edited by hand.
 */
export const COURSE_ART: Readonly<Record<string, string>> = {
  "weight-basics": "/content/courses/weight-basics/cover.png",
  "nutrition-course": "/content/courses/nutrition/cover.jpg",
  "training-course": "/content/courses/training/cover.png",
  "sleep-science": "/content/courses/sleep-science/cover.jpg",
  "eat-2": "/content/courses/eat-2/schooler-cover.jpg",
  "body-type": "/content/courses/body-type/cover.jpg",
  "mindset-habits": "/content/courses/mindset-habits/cover.png",
  guides: "/content/courses/guides/cover.png",
  "nutrition-qa": "/content/courses/nutrition-qa/cover.jpg",
  "training-qa": "/content/courses/training-qa/cover.jpg",
  podcast: "/content/courses/podcast/cover.png",
};

export function courseArt(slug: string): string | null {
  return COURSE_ART[slug] ?? null;
}
