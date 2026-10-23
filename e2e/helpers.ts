import type { Page } from "@playwright/test";

// UI copy below (placeholders, button labels) is quoted in Portuguese on purpose —
// it must match the app's actual rendered text, which stays in Portuguese.
export async function loginAs(page: Page, name: string, code: string) {
  await page.goto("/login");
  await page.getByPlaceholder("Como te chamam").fill(name);
  await page.getByPlaceholder("Peça pra quem te convidou").fill(code);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/edicoes$/);
}

/** Creates an Edição as Curador and returns its base URL (without query string). */
export async function createEdition(page: Page, name: string, year: string): Promise<string> {
  await page.getByPlaceholder("Rock The Mountain 2026").fill(name);
  await page.getByPlaceholder("2026", { exact: true }).fill(year);
  await page.getByRole("button", { name: "Criar" }).click();
  await page.waitForURL(/\/edicoes\/[^/]+\?tab=revisoes$/);
  return page.url().split("?")[0];
}

export function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
