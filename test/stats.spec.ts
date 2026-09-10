import { describe, expect, it } from "vitest";
import { handleRequest } from "../src/app";
import { ROASTS } from "../src/content/roasts";
import { getCatalogStats } from "../src/stats";
import { type AppEnv, CATEGORIES, LEVELS } from "../src/types";

const allowEnv: AppEnv = {
  RATE_LIMITER: {
    async limit() {
      return { success: true };
    },
  },
};

describe("catalog statistics", () => {
  it("derives every count from the actual catalog", () => {
    const stats = getCatalogStats();

    const expectedTotal = CATEGORIES.reduce(
      (categorySum, category) =>
        categorySum +
        LEVELS.reduce((levelSum, level) => levelSum + ROASTS[category][level].length, 0),
      0,
    );

    expect(stats.total).toBe(expectedTotal);
    expect(stats.category_count).toBe(CATEGORIES.length);
    expect(stats.level_count).toBe(LEVELS.length);
    expect(stats.categories.map((item) => item.category)).toEqual([...CATEGORIES]);

    for (const item of stats.categories) {
      expect(item.levels.map((level) => level.level)).toEqual([...LEVELS]);

      const expectedCategoryTotal = LEVELS.reduce(
        (sum, level) => sum + ROASTS[item.category][level].length,
        0,
      );

      expect(item.total).toBe(expectedCategoryTotal);

      for (const level of item.levels) {
        expect(level.count).toBe(ROASTS[item.category][level.level].length);
      }
    }
  });

  it("serves the derived stats through the HTTP boundary", async () => {
    const response = await handleRequest(new Request("https://example.com/v1/stats"), allowEnv);

    const body = (await response.json()) as {
      ok: boolean;
      data: ReturnType<typeof getCatalogStats>;
    };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data).toEqual(getCatalogStats());
  });

  it("rejects query controls on the stats route", async () => {
    const response = await handleRequest(
      new Request("https://example.com/v1/stats?detail=all"),
      allowEnv,
    );

    expect(response.status).toBe(400);
    expect(await response.text()).toContain("Query parameters are not supported");
  });

  it("returns a bodyless HEAD response for stats", async () => {
    const response = await handleRequest(
      new Request("https://example.com/v1/stats", { method: "HEAD" }),
      allowEnv,
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("");
  });
});
