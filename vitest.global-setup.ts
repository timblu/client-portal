import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export default async function globalSetup() {
  const testDbPath = path.join(process.cwd(), "prisma", "test.db");
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  process.env.DATABASE_URL = `file:${testDbPath}`;
  process.env.NODE_ENV = "test";

  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    stdio: "pipe",
  });
  execSync("npx tsx prisma/seed.ts", {
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    stdio: "pipe",
  });
}
