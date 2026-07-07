import { expect, test } from "@playwright/test";
import { signupAndLogin } from "./helpers";

test.beforeEach(async ({ page }) => {
  await signupAndLogin(page);
});

test("home starts with an empty audio list", async ({ page }) => {
  await expect(page.getByText("No hay audios todavía")).toBeVisible();
});

test("download modal opens, cancels and closes", async ({ page }) => {
  await page.getByTestId("open-download").click();
  await expect(page.getByTestId("download-modal")).toBeVisible();
  await page.getByTestId("cancel-download").click();
  await expect(page.getByTestId("download-modal")).toHaveCount(0);
});

test("download shows VideoNotFound error for unresolvable videos", async ({ page }) => {
  await page.getByTestId("open-download").click();
  await page.getByTestId("download-url").fill("https://youtu.be/notfound1234");
  await page.getByTestId("submit-download").click();
  await expect(page.getByTestId("download-error")).toHaveText("Video no encontrado");
});

test("downloading a video adds it to the list and closes the modal", async ({ page }) => {
  await page.getByTestId("open-download").click();
  await page.getByTestId("download-url").fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  await page.getByTestId("submit-download").click();
  // modal closes itself once the download completes
  await expect(page.getByTestId("download-modal")).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByTestId("audio-list")).toContainText("Stub Video");
});

test("playing an audio reveals the play bar", async ({ page }) => {
  await page.getByTestId("open-download").click();
  await page.getByTestId("download-url").fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  await page.getByTestId("submit-download").click();
  await expect(page.getByTestId("download-modal")).toHaveCount(0, { timeout: 30_000 });

  await expect(page.getByTestId("play-bar")).toHaveCount(0);
  await page.getByTestId("audio-list").getByRole("button").first().click();
  await expect(page.getByTestId("play-bar")).toBeVisible();
  await expect(page.getByTestId("play-bar")).toContainText("Stub Video");
  await expect(page.getByTestId("toggle-play")).toBeVisible();
});

test("the shared player keeps playing across page navigation", async ({ page }) => {
  await page.getByTestId("open-download").click();
  await page.getByTestId("download-url").fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  await page.getByTestId("submit-download").click();
  await expect(page.getByTestId("download-modal")).toHaveCount(0, { timeout: 30_000 });

  await page.getByTestId("audio-list").getByRole("button").first().click();
  await expect(page.getByTestId("play-bar")).toContainText("Stub Video");

  // The play-bar is now a single shared service rendered above the pages, so it
  // survives client-side navigation instead of being torn down per page.
  await page.getByTestId("nav-explore").click();
  await page.waitForURL("**/explore");
  await expect(page.getByTestId("play-bar")).toBeVisible();
  await expect(page.getByTestId("play-bar")).toContainText("Stub Video");
});
