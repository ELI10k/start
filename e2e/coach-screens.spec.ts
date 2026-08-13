import { expect, test, type Page } from "@playwright/test";
import { assertNotProduction, identity, requireIdentity, signIn, signOut } from "./support/guards";

// What the screens actually render, checked against a running app rather than
// against the source. Every one of these was reported from a real screenshot.
test.describe("coach screens", () => {
  test.skip(!identity("coach"), "set the coach E2E credentials to run");

  test.beforeAll(({}, testInfo) => {
    assertNotProduction(testInfo.project.use.baseURL);
  });

  test("the new-client form shows the intake fields and none of the removed ones", async ({ page }) => {
    await signIn(page, requireIdentity("coach"));
    await page.goto("/coach/clients/new");
    // Wait for the navigation to settle. During a client-side transition both
    // page trees are briefly in the DOM, so every label matches twice - which
    // reads as "the field is missing" and is the opposite of the truth.
    await expect(page.getByRole("heading", { name: "לקוח חדש" })).toHaveCount(1);

    // Present. Each is waited for as a single element: a client-side transition
    // briefly holds both page trees, so a label can match twice for a moment -
    // which reads as "missing" and is the opposite of the truth. Insisting on
    // exactly one both settles that and still fails on a genuine duplicate.
    for (const label of ["גיל", "מין", "ממוצע צעדים יומי", "מטרה", "רמת מתאמן"]) {
      await expect(page.getByLabel(label, { exact: true }), `${label} is missing from the form`).toHaveCount(1);
      await expect(page.getByLabel(label, { exact: true })).toBeVisible();
    }
    // The five goals and three levels, as options rather than free text.
    for (const goal of ["שימור", "חיטוב עדין", "חיטוב מהיר", "מסה עדינה", "מסה מלוכלכת"]) {
      await expect(page.getByLabel("מטרה", { exact: true }).locator("option", { hasText: goal })).toHaveCount(1);
    }
    for (const level of ["מתחיל", "בינוני", "מתקדם"]) {
      await expect(page.getByLabel("רמת מתאמן", { exact: true }).locator("option", { hasText: level }).first()).toHaveCount(1);
    }

    // Gone.
    for (const label of ["תאריך לידה", "רמת פעילות", "העדפות תזונה", "מאכלים שלא אוהב"]) {
      await expect(page.getByLabel(label, { exact: true }), `${label} should no longer be on the form`).toHaveCount(0);
    }

    // Kept.
    for (const label of ["שם מלא", "אימייל", "טלפון", "משקל נוכחי (ק״ג)", "גובה (ס״מ)", "יעד משקל (ק״ג)", "אימונים בשבוע"]) {
      await expect(page.getByLabel(label, { exact: true }), `${label} should still be collected`).toHaveCount(1);
    }
    await expect(page.getByLabel("סוג אימון", { exact: true }), "program assignment replaces the old training-type field").toHaveCount(0);

    await expect(noSidewaysScroll(page)).resolves.toBe(true);
    await signOut(page);
  });

  test("a training day shows the muscle group, the video and the guidance on every exercise", async ({ page }) => {
    await signIn(page, requireIdentity("coach"));
    const opened = await openFirstTrainingDay(page);
    if (!opened) test.skip(true, "no programme with a training day");

    const card = page.locator("article").first();
    await expect(card).toBeVisible();

    // The muscle group is a tag on the card, not a line of small print.
    await expect(card.locator(".pill").first()).toBeVisible();
    // Video and guidance sit together on every exercise.
    await expect(card.getByRole("button", { name: "דגשים לתרגיל" })).toBeVisible();
    await expect(card.getByRole("link", { name: /וידאו/ }).or(card.getByText("אין סרטון")).first()).toBeVisible();

    // And the sheet opens with something honest in it.
    await card.getByRole("button", { name: "דגשים לתרגיל" }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText(/שרירים עובדים|ציוד|איך מבצעים|לא סופק מידע/).first()).toBeVisible();
    await page.keyboard.press("Escape");

    await expect(noSidewaysScroll(page)).resolves.toBe(true);
    await signOut(page);
  });

  test("sets, reps and rest are editable on a coach programme and survive a reload", async ({ page }) => {
    await signIn(page, requireIdentity("coach"));
    let opened = await openFirstTrainingDay(page, { editableOnly: true });

    // Every catalogue programme is approved, and approved programmes are shared
    // by all clients and rejected by save_workout_program_tree. Making a copy is
    // the intended route to an editable one, so the test takes it rather than
    // skipping - that is what a coach does too.
    if (!opened) {
      const official = await openFirstTrainingDay(page, { officialOnly: true });
      if (!official) test.skip(true, "no programme at all");
      await page.getByRole("button", { name: /יצירת עותק לעריכה/ }).click();
      await expect(page).toHaveURL(/\/coach\/workouts\/[^/]+$/, { timeout: 30_000 });
      const day = page.locator('a[href*="/days/"]').first();
      await day.waitFor({ state: "visible", timeout: 30_000 });
      await day.click();
      await expect(page.locator("article").first()).toBeVisible({ timeout: 20_000 });
      opened = true;
    }

    const sets = page.getByLabel(/^סטים ל/).first();
    const reps = page.getByLabel(/^חזרות ל/).first();
    const rest = page.getByLabel(/^מנוחה ל/).first();
    await expect(sets).toBeVisible();

    // Write values that differ from whatever is already there. A previous run
    // leaves its own numbers behind, and re-typing an identical value is not an
    // edit - the save button would correctly stay disabled and the test would be
    // measuring nothing.
    const nextSets = (await sets.inputValue()) === "4" ? "5" : "4";
    const nextReps = (await reps.inputValue()) === "6-8" ? "10-12" : "6-8";
    const nextRest = (await rest.inputValue()) === "120 שניות" ? "90 שניות" : "120 שניות";

    await sets.fill(nextSets);
    await reps.fill(nextReps);
    await rest.fill(nextRest);
    await expect(sets).toHaveValue(nextSets);

    const save = page.getByRole("button", { name: "שמירת השינויים" });
    await expect(save).toBeEnabled();
    await save.click();
    await expect(page.getByText(/השינויים נשמרו/)).toBeVisible({ timeout: 30_000 });

    // A reload is the real test: the values have to have reached the database.
    await page.reload();
    await expect(page.getByLabel(/^סטים ל/).first()).toHaveValue(nextSets, { timeout: 30_000 });
    await expect(page.getByLabel(/^חזרות ל/).first()).toHaveValue(nextReps);
    await expect(page.getByLabel(/^מנוחה ל/).first()).toHaveValue(nextRest);

    await signOut(page);
  });

  test("an approved programme is editable in place, and says who else it affects", async ({ page }) => {
    await signIn(page, requireIdentity("coach"));
    const opened = await openFirstTrainingDay(page, { officialOnly: true });
    if (!opened) test.skip(true, "no approved programme");

    // These are shared by every client on them, which is worth saying - but it is
    // a warning now, not a gate. The fields save.
    await expect(page.getByText(/משותפת לכל הלקוחות/)).toBeVisible();
    await expect(page.getByLabel(/^סטים ל/).first()).toBeVisible();
    await expect(page.getByLabel(/^חזרות ל/).first()).toBeVisible();
    await expect(page.getByLabel(/^מנוחה ל/).first()).toBeVisible();
    // A copy is still offered, as an option rather than as the only route.
    await expect(page.getByRole("button", { name: /עריכה בעותק נפרד/ })).toBeVisible();
    await expect(page.getByText(/לקריאה בלבד/)).toHaveCount(0);

    await signOut(page);
  });
});

// Opens the first training day of a programme, optionally restricted to one the
// coach owns or to an approved one.
async function openFirstTrainingDay(page: Page, options: { editableOnly?: boolean; officialOnly?: boolean } = {}) {
  await page.goto("/coach/workouts");
  // Not just any link under /coach/workouts/ - the static "מאגר תרגילים" link is
  // one of those and is present before the programmes have loaded, so waiting on
  // it let the helper run against an empty list and skip every test silently.
  const programmeLinks = page.locator('a[href*="/coach/workouts/"]:not([href$="/exercises"]):not([href$="/new"])');
  await expect(programmeLinks.first()).toBeVisible({ timeout: 20_000 });

  // Collect the hrefs first: navigating invalidates the element handles.
  const hrefs = [...new Set((await programmeLinks.evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("href") ?? ""),
  )).filter((href) => /\/coach\/workouts\/[^/]+$/.test(href) && !href.endsWith("/new") && !href.endsWith("/exercises")))];

  for (const href of hrefs) {
    await page.goto(href);
    // The programme loads client-side, so its day links do not exist at the
    // moment the navigation resolves. Counting them straight away found none and
    // silently skipped every programme.
    const day = page.locator('a[href*="/days/"]').first();
    await day.waitFor({ state: "visible", timeout: 20_000 }).catch(() => undefined);
    if (!(await day.count())) continue;

    // The label the programme header carries. It used to read "לקריאה בלבד";
    // approved programmes are editable now, so it says who shares them instead -
    // and a detector still looking for the old wording matched nothing and
    // skipped every approved programme silently.
    const isOfficial = (await page.getByText("תוכנית רשמית משותפת").count()) > 0;
    if (options.editableOnly && isOfficial) continue;
    if (options.officialOnly && !isOfficial) continue;

    await day.click();
    await expect(page).toHaveURL(/\/days\//, { timeout: 20_000 });
    await expect(page.locator("article").first()).toBeVisible({ timeout: 20_000 });
    return true;
  }
  return false;
}

const noSidewaysScroll = async (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
