// @vitest-environment node
/**
 * C1 – Built-bundle safety assertion.
 *
 * Run `npm run build` first, then `npm test`.  The test is skipped when
 * dist/ does not exist so the plain `npm test` flow (no prior build) still
 * passes green; CI must run build→test in that order.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const distAssetsDir = join(process.cwd(), "dist", "assets");
const hasDist = existsSync(distAssetsDir);

describe.skipIf(!hasDist)("client bundle safety (C1)", () => {
  it("does not contain PrismaClient — Prisma must not leak into the browser bundle", () => {
    const jsBundle = readdirSync(distAssetsDir)
      .filter((f) => f.endsWith(".js"))
      .map((f) => readFileSync(join(distAssetsDir, f), "utf-8"))
      .join("\n");

    expect(jsBundle, "PrismaClient found in client bundle — check @/lib/access or @/lib/db imports in client code").not.toMatch(
      /PrismaClient/
    );
    expect(jsBundle, "MagicLink schema found in client bundle — DB schema must not leak to the browser").not.toMatch(
      /MagicLink/
    );
  });
});
