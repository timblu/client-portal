import { describe, expect, it } from "vitest";
import {
  isCrossOriginPrototypeUrl,
  locationKeyFromHref,
  screenLabel,
} from "@/lib/prototype-bridge";

describe("prototype-bridge location keys", () => {
  it("uses pathname+search+hash for same-origin URLs", () => {
    expect(locationKeyFromHref("/proto/checkout/shipping", "http://localhost:5173/review")).toBe(
      "/proto/checkout/shipping"
    );
    expect(
      locationKeyFromHref("http://localhost:5173/proto/checkout/cart?x=1#top", "http://localhost:5173/")
    ).toBe("/proto/checkout/cart?x=1#top");
  });

  it("keeps origin for cross-origin URLs so hosts do not collide", () => {
    expect(
      locationKeyFromHref("https://proto.example.com/shipping", "http://localhost:5173/")
    ).toBe("https://proto.example.com/shipping");
  });

  it("labels screens with the last path segment or host for roots", () => {
    expect(screenLabel("/proto/checkout/shipping")).toBe("shipping");
    expect(screenLabel("https://proto.example.com/app/cart")).toBe("cart");
    expect(screenLabel("https://ui-ux-wireframes.example.com/")).toBe("ui-ux-wireframes.example.com");
  });

  it("detects cross-origin absolute prototype URLs", () => {
    expect(
      isCrossOriginPrototypeUrl(
        "https://ui-ux-wireframes-690056f8c48f.herokuapp.com/",
        "http://localhost:5173"
      )
    ).toBe(true);
    expect(isCrossOriginPrototypeUrl("/proto/checkout/cart", "http://localhost:5173")).toBe(false);
    expect(
      isCrossOriginPrototypeUrl("http://localhost:5173/proto/checkout/cart", "http://localhost:5173")
    ).toBe(false);
  });
});
