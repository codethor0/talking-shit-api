import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { ROASTS } from "../src/content/roasts";
import { selectRoast, selectRoasts } from "../src/engine";
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

  it("selects bounded batches without replacement", () => {
    const results = selectRoasts("code", "dark", 5, () => 0);

    expect(results).toHaveLength(5);
    expect(new Set(results.map((result) => result.text)).size).toBe(5);
    for (const result of results) {
      expect(ROASTS.code.dark).toContain(result.text);
      expect(result.category).toBe("code");
      expect(result.level).toBe("dark");
    }
  });

  it("rejects invalid internal batch counts", () => {
    expect(() => selectRoasts("general", "mild", 0, () => 0)).toThrow(RangeError);
    expect(() => selectRoasts("general", "mild", 6, () => 0)).toThrow(RangeError);
  });

  it("keeps every catalog bucket deep enough for useful randomness", () => {
    for (const category of CATEGORIES) {
      for (const level of LEVELS) {
        expect(ROASTS[category][level].length).toBeGreaterThanOrEqual(12);
      }
    }
  });

  it("keeps catalog entries unique, single-line, and bounded", () => {
    const allRoasts: string[] = [];

    for (const category of CATEGORIES) {
      for (const level of LEVELS) {
        for (const roast of ROASTS[category][level]) {
          expect(roast).toBe(roast.trim());
          expect(roast).not.toMatch(/[\r\n]/);
          expect(roast.length).toBeGreaterThanOrEqual(20);
          expect(roast.length).toBeLessThanOrEqual(220);
          allRoasts.push(roast);
        }
      }
    }

    expect(new Set(allRoasts).size).toBe(allRoasts.length);
    expect(allRoasts).toHaveLength(288);
  });
});
