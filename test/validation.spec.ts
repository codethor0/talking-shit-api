import { describe, expect, it } from "vitest";
import { validateRoastRequest } from "../src/validation";

describe("request validation", () => {
  it("uses safe defaults", () => {
    const result = validateRoastRequest(new URL("https://example.com/v1/roast"));

    expect(result).toEqual({ ok: true, category: "general", level: "spicy" });
  });

  it("rejects unknown categories", () => {
    const result = validateRoastRequest(
      new URL("https://example.com/v1/roast?category=definitely-not-real"),
    );

    expect(result.ok).toBe(false);
  });

  it("rejects unknown levels", () => {
    const result = validateRoastRequest(
      new URL("https://example.com/v1/roast?level=thermonuclear"),
    );

    expect(result.ok).toBe(false);
  });
});
