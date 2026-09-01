import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "@/lib/safe-redirect";

describe("safeRedirectPath", () => {
  it("accepts same-origin relative paths", () => {
    expect(safeRedirectPath("/staff/projects/p1")).toBe("/staff/projects/p1");
    expect(safeRedirectPath("/client/deliverables/d1?version=v1")).toBe(
      "/client/deliverables/d1?version=v1"
    );
  });

  it("rejects external and protocol-relative targets", () => {
    expect(safeRedirectPath("https://evil.test/phish")).toBeNull();
    expect(safeRedirectPath("//evil.test/phish")).toBeNull();
    expect(safeRedirectPath("staff/projects")).toBeNull();
    expect(safeRedirectPath("")).toBeNull();
    expect(safeRedirectPath(null)).toBeNull();
  });
});
