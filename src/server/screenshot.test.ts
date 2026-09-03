import { describe, expect, it } from "vitest";
import { ScreenshotCaptureError, validateCaptureUrl } from "@/server/screenshot";

describe("validateCaptureUrl (SSRF guard)", () => {
  it("accepts ordinary http(s) URLs", () => {
    expect(validateCaptureUrl("https://ui-ux-wireframes-690056f8c48f.herokuapp.com/").href).toBe(
      "https://ui-ux-wireframes-690056f8c48f.herokuapp.com/"
    );
    expect(validateCaptureUrl("http://example.com/page").protocol).toBe("http:");
  });

  it("rejects non-http(s) schemes", () => {
    expect(() => validateCaptureUrl("file:///etc/passwd")).toThrow(ScreenshotCaptureError);
    expect(() => validateCaptureUrl("ftp://example.com")).toThrow(ScreenshotCaptureError);
    expect(() => validateCaptureUrl("javascript:alert(1)")).toThrow(ScreenshotCaptureError);
  });

  it("rejects malformed URLs", () => {
    expect(() => validateCaptureUrl("not a url")).toThrow(ScreenshotCaptureError);
    expect(() => validateCaptureUrl("")).toThrow(ScreenshotCaptureError);
  });

  it("rejects localhost and loopback hosts", () => {
    expect(() => validateCaptureUrl("http://localhost:3001/api")).toThrow(ScreenshotCaptureError);
    expect(() => validateCaptureUrl("http://sub.localhost/")).toThrow(ScreenshotCaptureError);
    expect(() => validateCaptureUrl("http://127.0.0.1:5432")).toThrow(ScreenshotCaptureError);
    expect(() => validateCaptureUrl("http://[::1]/")).toThrow(ScreenshotCaptureError);
  });

  it("rejects private-network IPv4 hosts", () => {
    expect(() => validateCaptureUrl("http://10.0.0.5/internal")).toThrow(ScreenshotCaptureError);
    expect(() => validateCaptureUrl("http://172.16.0.1/")).toThrow(ScreenshotCaptureError);
    expect(() => validateCaptureUrl("http://172.31.255.255/")).toThrow(ScreenshotCaptureError);
    expect(() => validateCaptureUrl("http://192.168.1.1/")).toThrow(ScreenshotCaptureError);
    expect(() => validateCaptureUrl("http://169.254.169.254/latest/meta-data")).toThrow(
      ScreenshotCaptureError
    );
  });

  it("allows public IPv4 hosts and hosts that merely resemble private ranges", () => {
    expect(() => validateCaptureUrl("http://8.8.8.8/")).not.toThrow();
    // 172.32.x.x is outside the 172.16.0.0/12 private range.
    expect(() => validateCaptureUrl("http://172.32.0.1/")).not.toThrow();
  });
});
