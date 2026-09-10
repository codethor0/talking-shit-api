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

const denyEnv: AppEnv = {
  RATE_LIMITER: {
    async limit() {
      return { success: false };
    },
  },
};

describe("Talking Shit API", () => {
  it("serves the health endpoint through the application boundary", async () => {
    const response = await handleRequest(new Request("https://example.com/v1/health"), allowEnv);
    const body = (await response.json()) as {
      ok: boolean;
      data: { status: string };
    };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.status).toBe("talking shit");
  });

  it("returns a valid dark security roast", async () => {
    const response = await handleRequest(
      new Request("https://example.com/v1/roast?category=security&level=dark"),
      allowEnv,
    );
    const body = (await response.json()) as {
      ok: boolean;
      data: { text: string; category: string; level: string };
    };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.text.length).toBeGreaterThan(0);
    expect(body.data.category).toBe("security");
    expect(body.data.level).toBe("dark");
  });

  it("rejects unknown query parameters", async () => {
    const response = await handleRequest(
      new Request("https://example.com/v1/roast?category=code&wat=nope"),
      allowEnv,
    );

    expect(response.status).toBe(400);
    expect(await response.text()).not.toContain("wat=nope");
  });

  it("rejects duplicate query parameters", async () => {
    const response = await handleRequest(
      new Request("https://example.com/v1/roast?level=dark&level=mild"),
      allowEnv,
    );

    expect(response.status).toBe(400);
  });

  it("denies unsupported methods", async () => {
    const response = await handleRequest(
      new Request("https://example.com/v1/roast", { method: "POST" }),
      allowEnv,
    );

    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("GET, HEAD, OPTIONS");
  });

  it("returns HEAD without a body", async () => {
    const response = await handleRequest(
      new Request("https://example.com/v1/health", { method: "HEAD" }),
      allowEnv,
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("");
  });

  it("returns CORS preflight headers", async () => {
    const response = await handleRequest(
      new Request("https://example.com/v1/health", { method: "OPTIONS" }),
      allowEnv,
    );

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(response.headers.get("Content-Type")).toBeNull();
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("GET");
    expect(response.headers.get("Access-Control-Max-Age")).toBe("86400");
  });

  it("sets baseline security headers", async () => {
    const response = await handleRequest(new Request("https://example.com/v1/health"), allowEnv);

    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns 429 when the limiter denies a request", async () => {
    const response = await handleRequest(new Request("https://example.com/v1/health"), denyEnv);

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
  });

  it("fails closed when rate limiting is unavailable", async () => {
    const failingEnv: AppEnv = {
      RATE_LIMITER: {
        async limit() {
          throw new Error("unavailable");
        },
      },
    };

    const response = await handleRequest(new Request("https://example.com/v1/health"), failingEnv);

    expect(response.status).toBe(503);
  });

  it("serves an OpenAPI 3.1 document", async () => {
    const response = await handleRequest(new Request("https://example.com/openapi.json"), allowEnv);
    const body = (await response.json()) as { openapi: string };

    expect(response.status).toBe(200);
    expect(body.openapi).toBe("3.1.0");
  });
});

describe("HTTP boundary hardening", () => {
  it("rejects OPTIONS for an unknown path", async () => {
    const response = await handleRequest(
      new Request("https://example.com/not-a-route", { method: "OPTIONS" }),
      allowEnv,
    );

    expect(response.status).toBe(404);
  });

  it("removes bodies from rate-limited HEAD responses", async () => {
    const response = await handleRequest(
      new Request("https://example.com/v1/health", { method: "HEAD" }),
      denyEnv,
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(await response.text()).toBe("");
  });

  it("removes bodies from limiter-failure HEAD responses", async () => {
    const failingEnv: AppEnv = {
      RATE_LIMITER: {
        async limit() {
          throw new Error("unavailable");
        },
      },
    };

    const response = await handleRequest(
      new Request("https://example.com/v1/health", { method: "HEAD" }),
      failingEnv,
    );

    expect(response.status).toBe(503);
    expect(await response.text()).toBe("");
  });

  it("removes bodies from oversized HEAD responses", async () => {
    const oversizedPath = `/${"a".repeat(2100)}`;
    const response = await handleRequest(
      new Request(`https://example.com${oversizedPath}`, { method: "HEAD" }),
      allowEnv,
    );

    expect(response.status).toBe(414);
    expect(await response.text()).toBe("");
  });
});
