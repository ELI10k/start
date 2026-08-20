import { expect, test } from "@playwright/test";
import { requireIdentity, signIn } from "./support/guards";

test("unit picker", async ({ page }) => {
  test.setTimeout(180_000);
  await signIn(page, requireIdentity("coach"));
  await page.goto("/coach/menus/new");
  await expect(page.getByLabel("שם התפריט")).toBeVisible({ timeout: 30_000 });

  // The carbohydrate group, where the pita lives.
  await page.getByRole("button", { name: "בחירת מאכל ראשי" }).nth(1).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("option").first()).toBeVisible({ timeout: 20_000 });
  const search = sheet.getByRole("combobox", { name: "חיפוש מזון" });
  await search.fill("פיתה");
  await expect(sheet.getByRole("option").first()).toBeVisible({ timeout: 15_000 });
  console.log("MATCHES:", (await sheet.getByRole("option").allInnerTexts()).slice(0, 3).map((t) => t.replace(/\n/g, " ")));
  await sheet.getByRole("option").first().locator("button").first().click();
  await expect(sheet).toBeHidden();

  const row = page.locator(".food-row").filter({ hasText: "פיתה" }).first();
  const picker = row.locator("select.food-row__unit");
  await expect(picker).toBeVisible({ timeout: 15_000 });
  console.log("OPTIONS:", await picker.locator("option").allInnerTexts());
  const qty = row.getByLabel("כמות");
  console.log("BEFORE:", await qty.inputValue(), "|", (await row.locator(".food-row__meta").innerText()).replace(/\n/g, " "));
  await picker.selectOption("gram");
  await expect(picker).toHaveValue("gram");
  console.log("AFTER :", await qty.inputValue(), "|", (await row.locator(".food-row__meta").innerText()).replace(/\n/g, " "));
  await row.screenshot({ path: "reports/review-unit-picker.png" });
});
