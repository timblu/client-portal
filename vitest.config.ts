import path from "node:path";
import { defineConfig } from "vitest/config";

const testDbPath = path.join(__dirname, "prisma", "test.db");

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    globalSetup: ["./vitest.global-setup.ts"],
    env: {
      DATABASE_URL: `file:${testDbPath}`,
      NODE_ENV: "test",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
