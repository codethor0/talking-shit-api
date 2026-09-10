import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { ROASTS } from "../src/content/roasts";
import { selectRoast } from "../src/engine";
import { CATEGORIES, LEVELS } from "../src/types";

describe("roast engine", () => {
  it("selects only catalogued content for every category and level", () => {
    fc.assert(
      fc.property(fc.constantFrom(...CATEGORIES), fc.constantFrom(...LEVELS), (category, level) => {
        const result = selectRoast(category, level, () => 0);
        expect(ROASTS[category][level]).toContain(result.text);
        expect(result.category).toBe(category);
        expect(result.level).toBe(level);
      }),
      { numRuns: 100 },
    );
  });

  it("fails if a random source returns an out-of-range index", () => {
    expect(() => selectRoast("general", "mild", () => 999)).toThrow(RangeError);
  });

  it("keeps every catalog bucket non-empty", () => {
    for (const category of CATEGORIES) {
      for (const level of LEVELS) {
        expect(ROASTS[category][level].length).toBeGreaterThan(0);
      }
    }
  });
});
