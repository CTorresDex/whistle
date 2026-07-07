import { expect, test } from "@playwright/test";
import { PASSWORD, login, signup, signupAndLogin, uniqueUsername } from "./helpers";

test("landing redirects to /login when logged out", async ({ page }) => {
  await page.goto("/");
  await page.waitForURL("**/login");
  await expect(page.getByTestId("submit-login")).toBeVisible();
});

test("login page links to signup", async ({ page }) => {
  await page.goto("/login");
  await page.getByTestId("goto-signup").click();
  await page.waitForURL("**/signup");
  await expect(page.getByTestId("submit-signup")).toBeVisible();
});

test("signup then login reaches home", async ({ page }) => {
  const username = uniqueUsername();
  await signup(page, username);
  await login(page, username);
  await expect(page.getByTestId("open-download")).toBeVisible();
});

test("landing redirects to /home when logged in", async ({ page }) => {
  await signupAndLogin(page);
  await page.goto("/");
  await page.waitForURL("**/home");
});

test("duplicate signup shows UserAlreadyExist error", async ({ page }) => {
  const username = uniqueUsername();
  await signup(page, username);
  await page.goto("/signup");
  await page.getByTestId("username").fill(username);
  await page.getByTestId("password").fill(PASSWORD);
  await page.getByTestId("submit-signup").click();
  await expect(page.getByTestId("signup-error")).toHaveText("El usuario ya existe");
});

// Single wrong-password attempt only: the server login guard blocks the shared
// client IP after 5 failures.
test("wrong password shows InvalidUsernameAndPassword error", async ({ page }) => {
  const username = uniqueUsername();
  await signup(page, username);
  await page.goto("/login");
  await page.getByTestId("username").fill(username);
  await page.getByTestId("password").fill("wrongpass");
  await page.getByTestId("submit-login").click();
  await expect(page.getByTestId("login-error")).toHaveText("Usuario o contraseña inválidos");
  // clear the guard counter for subsequent tests
  await login(page, username);
});
