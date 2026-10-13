import { expect, test } from "@playwright/test";

for (const standalone of [true, false]) {
  test(`iOS magic link completes from ${standalone ? "standalone" : "Mail handoff"} context`, async ({ page }) => {
    await page.addInitScript((installed) => {
      Object.defineProperty(navigator, "standalone", {
        configurable: true,
        value: installed,
      });
    }, standalone);

    let submittedToken = "";
    let submittedNext = "";
    await page.route("**/auth/accept-link", async (route) => {
      const request = route.request();
      expect(request.method()).toBe("POST");
      const form = await request.postDataJSON();
      submittedToken = String(form.token_hash ?? "");
      submittedNext = String(form.next ?? "");
      await route.fulfill({
        status: 303,
        headers: { location: "/login?ios_magic_link=accepted" },
      });
    });

    await page.goto("/auth/confirm-link?token_hash=ios-pwa-regression&type=magiclink&next=%2Fnutrition");

    await expect(page).toHaveURL(/\/login\?ios_magic_link=accepted$/);
    expect(submittedToken).toBe("ios-pwa-regression");
    expect(submittedNext).toBe("/nutrition");
  });
}
