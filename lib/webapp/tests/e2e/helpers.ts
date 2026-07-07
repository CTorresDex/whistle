import type { Page } from "@playwright/test";

let counter = 0;

export function uniqueUsername(): string {
  counter += 1;
  return `ui${Date.now().toString(36)}${counter}`;
}

export const PASSWORD = "secret123";

export async function signup(page: Page, username: string): Promise<void> {
  await page.goto("/signup");
  await page.getByTestId("username").fill(username);
  await page.getByTestId("password").fill(PASSWORD);
  await page.getByTestId("submit-signup").click();
  await page.waitForURL("**/login");
}

export async function login(page: Page, username: string): Promise<void> {
  await page.goto("/login");
  await page.getByTestId("username").fill(username);
  await page.getByTestId("password").fill(PASSWORD);
  await page.getByTestId("submit-login").click();
  await page.waitForURL("**/home");
}

export async function signupAndLogin(page: Page): Promise<string> {
  const username = uniqueUsername();
  await signup(page, username);
  await login(page, username);
  return username;
}
