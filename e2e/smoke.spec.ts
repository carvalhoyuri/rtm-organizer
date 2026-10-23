import { test, expect } from "@playwright/test";
import path from "node:path";
import { CURADOR_CODE, INVITE_CODE } from "./env";
import { createEdition, loginAs, uniqueName } from "./helpers";
import { EXPECTED_SHOWS } from "./fixtures/pdf";

const FIXTURE_PDF = path.join(__dirname, ".tmp", "programacao.pdf");

test("curador uploads a structured revision and the favorited show shows up in the Agenda", async ({ page }) => {
  await loginAs(page, uniqueName("Curador"), CURADOR_CODE);

  const editionUrl = await createEdition(page, uniqueName("RTM E2E"), "2026");

  await page.setInputFiles('input[name="arquivo"]', FIXTURE_PDF);
  await page.getByRole("button", { name: "Processar Revisão" }).click();

  await expect(page.getByText(/Revisão aplicada: 2 shows novos, 0 atualizados, 0 cancelados\./)).toBeVisible();

  await page.goto(`${editionUrl}?tab=programacao`);
  const firstShow = EXPECTED_SHOWS[0];
  const scheduleItem = page.locator("li", { hasText: firstShow.artist });
  await expect(scheduleItem).toContainText(`${firstShow.startTime}–${firstShow.endTime}`);

  await scheduleItem.getByRole("button", { name: "♡ Favoritar" }).click();
  await expect(scheduleItem.getByRole("button")).toHaveText("♥ Favoritado");

  await page.goto(`${editionUrl}?tab=agenda`);
  const agendaItem = page.locator("li", { hasText: firstShow.artist });
  await expect(agendaItem).toContainText(`${firstShow.startTime}–${firstShow.endTime}`);
});

test("a user without the curador code cannot see curador-only actions", async ({ page, context }) => {
  await loginAs(page, uniqueName("Curador Authz"), CURADOR_CODE);
  const editionUrl = await createEdition(page, uniqueName("RTM Authz"), "2026");
  await context.clearCookies();

  await loginAs(page, uniqueName("Guest"), INVITE_CODE);
  await expect(page.getByRole("heading", { name: "Nova Edição" })).toHaveCount(0);

  await page.goto(`${editionUrl}?tab=revisoes`);
  await expect(page.getByRole("heading", { name: "Subir PDF da programação" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Processar Revisão" })).toHaveCount(0);
});
