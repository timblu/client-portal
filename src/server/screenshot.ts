import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

// Full-page screenshots of prototype URLs we don't control (Figma Make, Claude design
// previews, external staging links). Stored on local disk, matching this app's existing
// "no object storage" file convention (README.md) — pasted paths served by Express.

const SCREENSHOTS_DIR = path.join(process.cwd(), "data", "screenshots");
const CAPTURE_TIMEOUT_MS = 25_000;
const VIEWPORT = { width: 1280, height: 800 };

export class ScreenshotCaptureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScreenshotCaptureError";
  }
}

/** Rejects file:// and other non-http(s) schemes, and loopback/private-network hosts,
 * so this endpoint can't be used to probe internal infrastructure (SSRF guard). */
export function validateCaptureUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ScreenshotCaptureError("That doesn't look like a valid URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ScreenshotCaptureError("Only http:// and https:// URLs can be captured.");
  }

  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname === "[::1]" ||
    hostname.endsWith(".localhost")
  ) {
    throw new ScreenshotCaptureError("Local addresses can't be captured.");
  }

  const ipv4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    const isPrivate =
      a === 127 || // loopback
      a === 10 || // 10.0.0.0/8
      (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
      (a === 192 && b === 168) || // 192.168.0.0/16
      (a === 169 && b === 254); // link-local
    if (isPrivate) {
      throw new ScreenshotCaptureError("Private network addresses can't be captured.");
    }
  }

  return url;
}

/** Reads width/height from a PNG buffer's IHDR chunk — avoids an image-processing dependency. */
function pngDimensions(buffer: Buffer): { width: number; height: number } {
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

export type CapturedScreenshot = {
  id: string;
  imageUrl: string;
  width: number;
  height: number;
};

export async function capturePrototypeScreenshot(rawUrl: string): Promise<CapturedScreenshot> {
  const url = validateCaptureUrl(rawUrl);

  const browser = await chromium.launch({ headless: true }).catch(() => {
    throw new ScreenshotCaptureError("The capture service is unavailable right now.");
  });

  try {
    const page = await browser.newPage({ viewport: VIEWPORT });
    page.setDefaultTimeout(CAPTURE_TIMEOUT_MS);

    try {
      await page.goto(url.toString(), { waitUntil: "networkidle", timeout: CAPTURE_TIMEOUT_MS });
    } catch (error) {
      // Some prototypes never go fully idle (polling, animations). Fall back to a basic
      // load event instead of failing the whole capture.
      try {
        await page.goto(url.toString(), { waitUntil: "load", timeout: CAPTURE_TIMEOUT_MS });
      } catch {
        throw mapNavigationError(error);
      }
    }

    const buffer = await page.screenshot({ fullPage: true, type: "png" });
    const { width, height } = pngDimensions(buffer);

    const id = randomUUID();
    await mkdir(SCREENSHOTS_DIR, { recursive: true });
    await writeFile(path.join(SCREENSHOTS_DIR, `${id}.png`), buffer);

    return { id, imageUrl: `/captures/${id}.png`, width, height };
  } finally {
    await browser.close();
  }
}

function mapNavigationError(error: unknown): ScreenshotCaptureError {
  const message = error instanceof Error ? error.message : String(error);
  if (/Timeout/i.test(message)) {
    return new ScreenshotCaptureError("Timed out loading that page. It may be slow, or require sign-in.");
  }
  if (/ERR_NAME_NOT_RESOLVED|ERR_CONNECTION_REFUSED|net::ERR/i.test(message)) {
    return new ScreenshotCaptureError("Could not reach that URL. Check that it's correct and publicly accessible.");
  }
  return new ScreenshotCaptureError("Unable to capture that page.");
}
