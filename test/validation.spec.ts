import { describe, expect, it } from "vitest";
import {
  validateBatchRequest,
  validateRoastRequest,
  validateSurpriseRequest,
} from "../src/validation";

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

describe("self-correcting validation errors", () => {
  it("names the allowed parameters for the batch route", () => {
    expect(validateBatchRequest(new URL("https://example.com/v1/batch?size=3"))).toEqual({
      ok: false,
      code: "INVALID_REQUEST",
      message: "Unknown query parameter. Allowed parameters: category, level, count.",
    });
  });

  it("names the allowed parameters for the surprise route", () => {
    expect(validateSurpriseRequest(new URL("https://example.com/v1/surprise?count=2"))).toEqual({
      ok: false,
      code: "INVALID_REQUEST",
      message: "Unknown query parameter. Allowed parameters: category, level.",
    });
  });

  it("states the batch count bounds", () => {
    expect(validateBatchRequest(new URL("https://example.com/v1/batch?count=9"))).toEqual({
      ok: false,
      code: "INVALID_REQUEST",
      message: "Count must be a whole number from 1 to 5.",
    });
  });

  it("never reflects the rejected value", () => {
    const result = validateRoastRequest(
      new URL("https://example.com/v1/roast?category=kubernetes&level=spicy"),
    );

    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain("kubernetes");
  });
});
