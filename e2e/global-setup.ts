import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { generateScheduleFixturePdf } from "./fixtures/pdf";
import { TEST_DATABASE_URL } from "./env";

const TMP_DIR = path.join(__dirname, ".tmp");
const DB_FILE = path.join(TMP_DIR, "e2e.db");
const FIXTURE_PDF = path.join(TMP_DIR, "programacao.pdf");

/**
 * Resets the test database and re-pushes the schema before the whole suite
 * runs — every smoke test run starts from an empty database, not the real dev.db.
 */
export default async function globalSetup() {
  fs.mkdirSync(TMP_DIR, { recursive: true });

  for (const file of [DB_FILE, `${DB_FILE}-journal`]) {
    if (fs.existsSync(file)) fs.rmSync(file);
  }

  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "inherit",
  });

  fs.writeFileSync(FIXTURE_PDF, await generateScheduleFixturePdf());
}
