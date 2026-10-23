export const PORT = 3100;
export const BASE_URL = `http://localhost:${PORT}`;

// Prisma resolves sqlite paths relative to prisma/schema.prisma, so
// "../e2e/.tmp/e2e.db" lands at <repo root>/e2e/.tmp/e2e.db.
export const TEST_DATABASE_URL = "file:../e2e/.tmp/e2e.db";

export const INVITE_CODE = "e2e-invite";
export const CURADOR_CODE = "e2e-curador";
export const SESSION_SECRET = "e2e-test-secret-do-not-use-in-production";
