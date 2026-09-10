import { describe, expect, it } from "vitest";
import { handleRequest } from "../src/app";
import type { AppEnv } from "../src/types";

const allowEnv: AppEnv = {
  RATE_LIMITER: {
    async limit() {
      return { success: true };
    },
  },
};

type Roast = {
  text: string;
  category: string;
  level: string;
};

type BatchBody = {
  ok: boolean;
  data: Roast[];
};

describe("bounded batch endpoint", () => {
  it("returns three unique roasts with safe defaults", async () => {
    const response = await handleRequest(new Request("https://example.com/v1/batch"), allowEnv);
    const body = (await response.json()) as BatchBody;

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data).toHaveLength(3);
    expect(new Set(body.data.map((roast) => roast.text)).size).toBe(3);
    for (const roast of body.data) {
      expect(roast.category).toBe("general");
      expect(roast.level).toBe("spicy");
    }
  });

  it("returns the requested maximum batch from one bucket", async () => {
    const response = await handleRequest(
      new Request("https://example.com/v1/batch?count=5&category=git&level=dark"),
      allowEnv,
    );
    const body = (await response.json()) as BatchBody;

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(5);
    expect(new Set(body.data.map((roast) => roast.text)).size).toBe(5);
    for (const roast of body.data) {
      expect(roast.category).toBe("git");
      expect(roast.level).toBe("dark");
    }
  });

  it("rejects malformed and out-of-range counts", async () => {
    for (const count of ["0", "6", "1.5", "01", "nope"]) {
      const response = await handleRequest(
        new Request(`https://example.com/v1/batch?count=${count}`),
        allowEnv,
      );
      const body = await response.text();

      expect(response.status).toBe(400);
      expect(body).not.toContain(`count=${count}`);
    }
  });

  it("rejects duplicate batch parameters", async () => {
    const response = await handleRequest(
      new Request("https://example.com/v1/batch?count=2&count=3"),
      allowEnv,
    );

    expect(response.status).toBe(400);
  });

  it("rejects unknown batch query keys without reflecting them", async () => {
    const response = await handleRequest(
      new Request("https://example.com/v1/batch?count=2&target=someone"),
      allowEnv,
    );
    const body = await response.text();

    expect(response.status).toBe(400);
    expect(body).not.toContain("target=someone");
  });
});
