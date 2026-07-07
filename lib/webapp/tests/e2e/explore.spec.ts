import { expect, test } from "@playwright/test";
import { signupAndLogin } from "./helpers";

test.beforeEach(async ({ page }) => {
  await signupAndLogin(page);
});

test("navbar links between playlist and explore", async ({ page }) => {
  // starts on /home (Playlist)
  await page.getByTestId("nav-explore").click();
  await page.waitForURL("**/explore");
  await expect(page.getByTestId("explore-search")).toBeVisible();
  await page.getByTestId("nav-home").click();
  await page.waitForURL("**/home");
  await expect(page.getByTestId("open-download")).toBeVisible();
});

test("searching youtube lists the results", async ({ page }) => {
  await page.goto("/explore");
  await expect(page.getByText("Busca un video para empezar a escuchar")).toBeVisible();
  await page.getByTestId("explore-search").fill("lofi");
  await page.getByTestId("explore-search-submit").click();
  await expect(page.getByTestId("explore-row-0")).toContainText("lofi result 1");
  await expect(page.getByTestId("explore-row-1")).toContainText("lofi result 2");
});

test("playing a search result reveals the play bar", async ({ page }) => {
  await page.goto("/explore");
  await page.getByTestId("explore-search").fill("jazz");
  await page.getByTestId("explore-search-submit").click();
  await expect(page.getByTestId("explore-row-0")).toBeVisible();

  await expect(page.getByTestId("play-bar")).toHaveCount(0);
  await page.getByTestId("explore-play-0").click();
  await expect(page.getByTestId("play-bar")).toBeVisible();
  await expect(page.getByTestId("play-bar")).toContainText("jazz result 1");
});

test("downloading a result shows the row progress bar and keeps it after completion", async ({ page }) => {
  await page.goto("/explore");
  await page.getByTestId("explore-search").fill("rock");
  await page.getByTestId("explore-search-submit").click();
  await expect(page.getByTestId("explore-row-0")).toBeVisible();

  await expect(page.getByTestId("explore-progress-0")).toHaveCount(0);
  await page.getByTestId("explore-download-0").click();
  // progress bar becomes visible during the download and remains after it completes
  await expect(page.getByTestId("explore-progress-0")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("explore-download-0")).toBeEnabled({ timeout: 30_000 });
  await expect(page.getByTestId("explore-progress-0")).toBeVisible();
});
