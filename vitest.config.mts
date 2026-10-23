import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./test/setup.ts"],
    exclude: ["**/node_modules/**", "**/e2e/**"],
    // Integration tests hit the real Supabase project over the network (see
    // test/integration/database.test.ts) — the 5s default is too tight for
    // tests doing several round trips (Admin API + nested Prisma writes).
    testTimeout: 15000,
  },
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
});
