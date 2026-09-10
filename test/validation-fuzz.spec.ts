import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { CATEGORIES, LEVELS } from "../src/types";
import { validateRoastRequest } from "../src/validation";

const categorySet = new Set<string>(CATEGORIES);
const levelSet = new Set<string>(LEVELS);

const token = fc
  .array(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789-_"), {
    minLength: 1,
    maxLength: 32,
  })
  .map((characters) => characters.join(""));

describe("request validation fuzzing", () => {
  it("returns a constant safe error for arbitrary unknown categories", () => {
    fc.assert(
      fc.property(
        token.filter((value) => !categorySet.has(value)),
        (value) => {
          const url = new URL("https://example.com/v1/roast");
          url.searchParams.set("category", value);

          expect(validateRoastRequest(url)).toEqual({
            ok: false,
            code: "INVALID_REQUEST",
            message: "Unknown category.",
          });
        },
      ),
      { numRuns: 300 },
    );
  });

  it("returns a constant safe error for arbitrary unknown levels", () => {
    fc.assert(
      fc.property(
        token.filter((value) => !levelSet.has(value)),
        (value) => {
          const url = new URL("https://example.com/v1/roast");
          url.searchParams.set("level", value);

          expect(validateRoastRequest(url)).toEqual({
            ok: false,
            code: "INVALID_REQUEST",
            message: "Unknown level.",
          });
        },
      ),
      { numRuns: 300 },
    );
  });

  it("returns a constant safe error for arbitrary unknown query keys", () => {
    fc.assert(
      fc.property(
        token.filter((key) => key !== "category" && key !== "level"),
        token,
        (key, value) => {
          const url = new URL("https://example.com/v1/roast");
          url.searchParams.set(key, value);

          expect(validateRoastRequest(url)).toEqual({
            ok: false,
            code: "INVALID_REQUEST",
            message: "Unknown query parameter.",
          });
        },
      ),
      { numRuns: 300 },
    );
  });

  it("accepts every documented category and level combination", () => {
    for (const category of CATEGORIES) {
      for (const level of LEVELS) {
        const url = new URL("https://example.com/v1/roast");
        url.searchParams.set("category", category);
        url.searchParams.set("level", level);

        expect(validateRoastRequest(url)).toEqual({
          ok: true,
          category,
          level,
        });
      }
    }
  });
});
