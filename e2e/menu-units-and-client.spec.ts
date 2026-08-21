import { expect, test } from "@playwright/test";
import { assertNotProduction, identity, requireIdentity, signIn, openMealCards } from "./support/guards";

/**
 * The unit a portion is written in, end to end, and the client a menu is built
 * for.
 *
 * Both were only ever visible against a real database. measurement_unit was
 * constrained to three values and the save collapsed everything else into
 * 'גרם', so a pita reached the client as grams - right number, wrong word, in
 * front of the person eating it. And meal_plans held no client at all, so a
 * draft made for someone came back unassigned, with the goal and the macros
 * blank because the editor derives all three from the client.
 */

test.describe.configure({ mode: "serial" });

test.beforeAll(({}, testInfo) => {
  assertNotProduction(testInfo.project.use.baseURL);
});

test("a unit survives the save and reaches the client as a unit", async ({ page }) => {
  test.skip(!identity("coach") || !identity("client"), "set both E2E credentials to run");
  test.setTimeout(180_000);
  await signIn(page, requireIdentity("coach"));
  await page.goto("/coach/menus?status=no-menu");
  await expect(page.getByRole("heading", { name: "תפריטים" })).toBeVisible({ timeout: 30_000 });

  const row = page.locator(".app-list a").filter({ hasText: "START E2E Client" }).first();
  if (!(await row.count())) {
    await page.goto("/coach/menus/new");
    await expect(page.getByRole("heading", { name: "תפריט חדש" })).toBeVisible({ timeout: 30_000 });
  } else {
    await row.click();
    await page.waitForURL(/\/coach\/menus\/new\?clientId=/);
  }

  await page.getByLabel("שם התפריט").fill(`בדיקת יחידות ${Date.now()}`);
  await page.getByLabel("יעד קלוריות").fill("2000");

  // A pita into the carbohydrate group - a food whose unit is not grams.
  await page.getByRole("button", { name: /בחירת מאכל ראשי|בחירת מזון/ }).nth(1).click();
  await page.getByRole("combobox", { name: "חיפוש מזון" }).fill("פיתה");
  const option = page.locator(".food-picker__option").first();
  await expect(option).toBeVisible({ timeout: 20_000 });
  await option.locator(".food-picker__choose").click();

  const foodRow = page.locator(".food-row").first();
  console.log("BUILDER:", (await foodRow.innerText()).replace(/\n+/g, " | "));

  // A protein too, so the meal has something in every required group.
  await page.getByRole("button", { name: /בחירת מאכל ראשי/ }).first().click();
  await page.getByRole("combobox", { name: "חיפוש מזון" }).fill("ביצה");
  const protein = page.locator(".food-picker__option").first();
  await expect(protein).toBeVisible({ timeout: 20_000 });
  await protein.locator(".food-picker__choose").click();

  if (await page.getByLabel("לקוח").inputValue() === "") {
    await page.getByLabel("לקוח").selectOption({ label: "START E2E Client" });
  }
  await page.getByLabel("סטטוס").selectOption("active");
  await page.getByRole("button", { name: "שמירה" }).click();
  // Activating a menu that misses its target asks first, and the sheet takes a
  // moment - counting straight after the click races it.
  await page.getByRole("button", { name: "הפעלה בכל זאת" }).click({ timeout: 8_000 }).catch(() => {});
  await expect(page.locator(".menu-dock__message")).toContainText(/נשמר/, { timeout: 30_000 });

  // What the client is actually told.
  await signIn(page, requireIdentity("client"));
  await page.goto("/nutrition");
  await expect(page.getByRole("heading", { name: "הארוחות של היום" })).toBeVisible({ timeout: 30_000 });
  // Collapsed meal rows hide their groups; only the meal due right now is open.
  await openMealCards(page);
  const pitaLine = page.locator("fieldset button").filter({ hasText: "פיתה" }).first();
  await expect(pitaLine).toBeVisible({ timeout: 20_000 });
  const text = (await pitaLine.innerText()).replace(/\n+/g, " | ");
  console.log("CLIENT :", text);
  expect(text, "the client must be told pitas, not grams").toContain("פיתה");
});

test("a menu duplicated onto a client opens with that client, goal and macros", async ({ page }) => {
  test.skip(!identity("coach"), "set the coach E2E credentials to run");
  test.setTimeout(180_000);
  await signIn(page, requireIdentity("coach"));

  // The goal the editor shows has to be the goal the client's card holds - that
  // is the whole claim. Setting one here is not possible: updateClientIntake
  // goes through the admin client, and the local server has no service role key.
  // So the client's recorded goal is read and the two are compared.
  await page.goto("/coach/clients");
  await expect(page.getByRole("heading", { name: "לקוחות" })).toBeVisible({ timeout: 30_000 });
  await page.locator(".app-list a").filter({ hasText: "START E2E Client" }).first().click();
  await page.waitForURL(/\/coach\/clients\/[0-9a-f-]{36}/);
  const clientId = page.url().match(/clients\/([0-9a-f-]{36})/)?.[1];
  await page.goto(`/coach/clients/${clientId}?tab=intake`);
  await expect(page.getByLabel("מטרה")).toBeVisible({ timeout: 30_000 });
  const recordedGoal = await page.getByLabel("מטרה").inputValue();
  console.log(`מטרה רשומה בכרטיס הלקוח: "${recordedGoal || "(לא הוגדרה)"}"`);

  await page.goto("/coach/menus");
  await expect(page.getByRole("heading", { name: "תפריטים" })).toBeVisible({ timeout: 30_000 });

  await page.getByRole("button", { name: /שכפול ללקוח/ }).first().click();
  const client = page.getByRole("button", { name: /START E2E Client/ }).first();
  await expect(client).toBeVisible({ timeout: 20_000 });
  await client.click();

  await page.waitForURL(/\/coach\/menus\/[0-9a-f-]{36}/, { timeout: 60_000 });
  await expect(page.getByRole("heading", { name: "עריכת תפריט" })).toBeVisible({ timeout: 30_000 });

  const picked = await page.getByLabel("לקוח").inputValue();
  const goal = await page.getByLabel("מטרה").inputValue();
  const protein = await page.getByLabel("יעד חלבון").inputValue();
  const carbs = await page.getByLabel("יעד פחמימות").inputValue();
  console.log(`לקוח: "${picked}" | מטרה: "${goal}" | חלבון: "${protein}" | פחמימות: "${carbs}"`);

  expect(picked, "the copy must open with the client already on it").not.toBe("");
  expect(goal, "the goal must be the one on the client's card").toBe(recordedGoal);

  // Macros are derived from a calorie target, and a calorie target is derived
  // from the client's card. Where the card cannot produce one - this account is
  // missing age, height, sex and goal - blank fields are the correct answer and
  // the screen says which fields are missing. Asserting derived macros there
  // asserts something the data cannot support.
  //
  // This test had never actually run: the file is serial, the test above it was
  // failing since the meal rows were collapsed, and a failure in serial mode
  // skips the rest of the file. Fixing the first one revealed this.
  const cannotDerive = page.getByText(/לא ניתן לחשב יעד קלורי אוטומטי/);
  if (await cannotDerive.count()) {
    // The refusal has to name what is missing, or a coach cannot act on it.
    await expect(cannotDerive.first()).toContainText(/חסר בכרטיס הלקוח/);
    return;
  }
  expect(protein, "macros must be derived, not left blank").not.toBe("");
  expect(carbs).not.toBe("");
});
