import { describe, expect, it } from "vitest";
import { handleRequest } from "../src/app";
import { ROASTS } from "../src/content/roasts";
import { selectConstrainedSurpriseRoast, selectSurpriseRoast } from "../src/engine";
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

  it("uses fixed constraints without consuming random draws for them", () => {
    const draws = [2];

    const result = selectConstrainedSurpriseRoast("security", "dark", (length) => {
      const next = draws.shift();
      if (next === undefined) {
        throw new Error("unexpected random draw");
      }
      return next % length;
    });

    expect(result.category).toBe("security");
    expect(result.level).toBe("dark");
    expect(result.text).toBe(ROASTS.security.dark[2]);
    expect(draws).toHaveLength(0);
  });

  it("honors a category constraint while randomizing level", async () => {
    const response = await handleRequest(
      new Request("https://example.com/v1/surprise?category=security"),
      allowEnv,
    );
    const body = (await response.json()) as {
      ok: boolean;
      data: { text: string; category: string; level: string };
    };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.category).toBe("security");
    expect(LEVELS).toContain(body.data.level);

    const level = body.data.level as (typeof LEVELS)[number];
    expect(ROASTS.security[level]).toContain(body.data.text);
  });

  it("honors a level constraint while randomizing category", async () => {
    const response = await handleRequest(
      new Request("https://example.com/v1/surprise?level=dark"),
      allowEnv,
    );
    const body = (await response.json()) as {
      ok: boolean;
      data: { text: string; category: string; level: string };
    };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.level).toBe("dark");
    expect(CATEGORIES).toContain(body.data.category);

    const category = body.data.category as (typeof CATEGORIES)[number];
    expect(ROASTS[category].dark).toContain(body.data.text);
  });

  it("honors both surprise constraints", async () => {
    const response = await handleRequest(
      new Request("https://example.com/v1/surprise?category=git&level=mild"),
      allowEnv,
    );
    const body = (await response.json()) as {
      ok: boolean;
      data: { text: string; category: string; level: string };
    };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.category).toBe("git");
    expect(body.data.level).toBe("mild");
    expect(ROASTS.git.mild).toContain(body.data.text);
  });

  it("rejects invalid surprise controls without reflecting them", async () => {
    for (const path of [
      "/v1/surprise?category=not-a-category",
      "/v1/surprise?level=not-a-level",
      "/v1/surprise?wat=nope",
      "/v1/surprise?category=code&category=git",
    ]) {
      const response = await handleRequest(
        new Request(new URL(path, "https://example.com")),
        allowEnv,
      );
      const text = await response.text();

      expect(response.status).toBe(400);
      expect(text).not.toContain("not-a-category");
      expect(text).not.toContain("not-a-level");
      expect(text).not.toContain("wat=nope");
      expect(text).not.toContain("category=code");
    }
  });

  it("fails if the random source returns an out-of-range dimension", () => {
    expect(() => selectSurpriseRoast(() => 999)).toThrow(RangeError);
  });
});
