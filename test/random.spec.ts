import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { cryptoRandomIndex } from "../src/random";

function sequenceSource(values: readonly number[]) {
  let offset = 0;

  return (): number => {
    const value = values[offset];
    if (value === undefined) {
      throw new Error("random test source exhausted");
    }

    offset += 1;
    return value;
  };
}

describe("cryptoRandomIndex", () => {
  it("rejects invalid lengths", () => {
    for (const length of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 0x1_0000_0001]) {
      expect(() => cryptoRandomIndex(length)).toThrow(RangeError);
    }
  });

  it("supports the full uint32 range boundary", () => {
    const result = cryptoRandomIndex(0x1_0000_0000, sequenceSource([0xffff_ffff]));

    expect(result).toBe(0xffff_ffff);
  });

  it("retries values in the rejection tail instead of applying biased modulo", () => {
    let calls = 0;
    const source = sequenceSource([0xffff_ffff, 5]);

    const result = cryptoRandomIndex(3, () => {
      calls += 1;
      return source();
    });

    expect(result).toBe(2);
    expect(calls).toBe(2);
  });

  it("rejects invalid injected random values", () => {
    for (const value of [-1, 1.5, 0x1_0000_0000, Number.NaN]) {
      expect(() => cryptoRandomIndex(3, () => value)).toThrow(RangeError);
    }
  });

  it("maps accepted uint32 values into the requested range", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 0, max: 0xffff_ffff }),
        (length, raw) => {
          const range = 0x1_0000_0000;
          const rejectionLimit = Math.floor(range / length) * length;
          const accepted = raw % rejectionLimit;

          const result = cryptoRandomIndex(length, sequenceSource([accepted]));

          expect(result).toBe(accepted % length);
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThan(length);
        },
      ),
      { numRuns: 500 },
    );
  });
});
