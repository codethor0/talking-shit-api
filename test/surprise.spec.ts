import { describe, expect, it } from "vitest";
import { handleRequest } from "../src/app";
import { ROASTS } from "../src/content/roasts";
import { selectSurpriseRoast } from "../src/engine";
import { type AppEnv, CATEGORIES, LEVELS } from "../src/types";

const allowEnv: AppEnv = {
  RATE_LIMITER: {
    async limit() {
      return { success: true };
    },
  },
};

describe("surprise roast", () => {
  it("selects category, level, and roast from the curated catalog", () => {
    const draws = [1, 2, 3];

    const result = selectSurpriseRoast((length) => {
      const next = draws.shift();
      if (next === undefined) {
        throw new Error("unexpected random draw");
      }
      return next % length;
    });

    expect(result.category).toBe("code");
    expect(result.level).toBe("dark");
    expect(result.text).toBe(ROASTS.code.dark[3]);
    expect(draws).toHaveLength(0);
  });

  it("serves a valid surprise roast through the HTTP boundary", async () => {
    const response = await handleRequest(new Request("https://example.com/v1/surprise"), allowEnv);
    const body = (await response.json()) as {
      ok: boolean;
      data: { text: string; category: string; level: string };
    };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(CATEGORIES).toContain(body.data.category);
    expect(LEVELS).toContain(body.data.level);

    const category = body.data.category as (typeof CATEGORIES)[number];
    const level = body.data.level as (typeof LEVELS)[number];
    expect(ROASTS[category][level]).toContain(body.data.text);
  });

  it("rejects query controls on the surprise route", async () => {
    const response = await handleRequest(
      new Request("https://example.com/v1/surprise?category=code"),
      allowEnv,
    );

    expect(response.status).toBe(400);
    expect(await response.text()).not.toContain("category=code");
  });

  it("fails if the random source returns an out-of-range dimension", () => {
    expect(() => selectSurpriseRoast(() => 999)).toThrow(RangeError);
  });
});
