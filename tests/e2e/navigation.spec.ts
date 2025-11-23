import { test, expect } from "@playwright/test";

test.describe("navigation", () => {
  test("dashboard and calendar render", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Race control center")).toBeVisible();
    await page.getByRole("link", { name: "Calendar" }).click();
    await expect(page.getByText("Race map")).toBeVisible();
  });
});
