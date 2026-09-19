import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { handleRequest } from "../src/app";
import { ROASTS } from "../src/content/roasts";
import { type AppEnv, CATEGORIES, LEVELS, MAX_URL_LENGTH } from "../src/types";

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

const ERROR_CODES = new Set([
  "INVALID_REQUEST",
  "NOT_FOUND",
  "METHOD_NOT_ALLOWED",
  "URI_TOO_LONG",
  "RATE_LIMITED",
  "RATE_LIMIT_UNAVAILABLE",
]);

const METHODS = ["GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH", "DELETE"] as const;
const PUBLIC_PATHS = [
  "/",
  "/v1/health",
  "/v1/categories",
  "/v1/roast",
  "/v1/batch",
  "/v1/surprise",
  "/v1/stats",
  "/openapi.json",
] as const;

// A marker that cannot appear in any static message, so its presence in a response proves reflection.
const marker = fc.stringMatching(/^[0-9a-f]{12}$/).map((hex) => `zq${hex}`);

const placement = fc.constantFrom("path", "query-key", "query-value", "category-value");

function urlWithMarker(base: string, where: string, value: string): string {
  switch (where) {
    case "path":
      return `https://example.com${base === "/" ? "" : base}/${value}`;
    case "query-key":
      return `https://example.com${base}?${value}=1`;
    case "query-value":
      return `https://example.com${base}?x=${value}`;
    default:
      return `https://example.com${base}?category=${value}`;
  }
}

async function readEnvelope(response: Response) {
  return (await response.json()) as {
    ok: boolean;
    data?: unknown;
    error?: { code: string; message: string };
    meta: { api_version: string; service_version: string };
  };
}

function expectSecurityHeaders(response: Response): void {
  expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  expect(response.headers.get("Access-Control-Allow-Credentials")).toBeNull();
}

describe("HTTP invariants across generated requests", () => {
  it("returns a bounded status, security headers, and a valid envelope for any request", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...METHODS),
        fc.constantFrom(...PUBLIC_PATHS),
        placement,
        marker,
        async (method, path, where, value) => {
          const response = await handleRequest(
            new Request(urlWithMarker(path, where, value), { method }),
            allowEnv,
          );

          expect([200, 204, 400, 404, 405]).toContain(response.status);
          expectSecurityHeaders(response);

          if (method === "HEAD" || response.status === 204) {
            expect(await response.text()).toBe("");
            return;
          }

          const body = await readEnvelope(response);
          expect(body.ok).toBe(response.status === 200);
          expect(body.meta.api_version).toBe("v1");
          if (!body.ok) {
            expect(ERROR_CODES.has(body.error?.code ?? "")).toBe(true);
          }
        },
      ),
      { numRuns: 300 },
    );
  });

  it("never reflects any part of the request in a response body or header", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...METHODS),
        fc.constantFrom(...PUBLIC_PATHS),
        placement,
        marker,
        async (method, path, where, value) => {
          const response = await handleRequest(
            new Request(urlWithMarker(path, where, value), { method }),
            allowEnv,
          );
          const text = await response.text();
          const headers = [...response.headers.entries()].flat().join("\n");

          for (const needle of [value, value.toUpperCase()]) {
            expect(text).not.toContain(needle);
            expect(headers).not.toContain(needle);
          }
        },
      ),
      { numRuns: 300 },
    );
  });

  it("answers HEAD with the same status and content type as GET and no body", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...PUBLIC_PATHS),
        placement,
        marker,
        async (path, where, value) => {
          const url = urlWithMarker(path, where, value);
          const get = await handleRequest(new Request(url), allowEnv);
          const head = await handleRequest(new Request(url, { method: "HEAD" }), allowEnv);

          expect(head.status).toBe(get.status);
          expect(head.headers.get("Content-Type")).toBe(get.headers.get("Content-Type"));
          expect(await head.text()).toBe("");
        },
      ),
      { numRuns: 200 },
    );
  });

  it("fails closed with 429 for every method and path when the limiter denies", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...METHODS),
        fc.constantFrom(...PUBLIC_PATHS),
        marker,
        async (method, path, value) => {
          const response = await handleRequest(
            new Request(`https://example.com${path}?x=${value}`, { method }),
            denyEnv,
          );

          expect(response.status).toBe(429);
          expect(response.headers.get("Retry-After")).toBe("60");
          expectSecurityHeaders(response);
          if (method !== "HEAD") {
            expect((await readEnvelope(response)).error?.code).toBe("RATE_LIMITED");
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rejects an oversized URL with 414 before it reaches the rate limiter", async () => {
    let limiterCalls = 0;
    const countingEnv: AppEnv = {
      RATE_LIMITER: {
        async limit() {
          limiterCalls += 1;
          return { success: true };
        },
      },
    };
    const url = `https://example.com/v1/roast?category=${"a".repeat(MAX_URL_LENGTH)}`;

    const response = await handleRequest(new Request(url), countingEnv);

    expect(response.status).toBe(414);
    expect((await readEnvelope(response)).error?.code).toBe("URI_TOO_LONG");
    expect(limiterCalls).toBe(0);
  });
});

describe("catalog served over HTTP", () => {
  it("serves catalogued content for every category and level combination", async () => {
    for (const category of CATEGORIES) {
      for (const level of LEVELS) {
        const response = await handleRequest(
          new Request(`https://example.com/v1/roast?category=${category}&level=${level}`),
          allowEnv,
        );
        const body = (await readEnvelope(response)) as unknown as {
          data: { text: string; category: string; level: string };
        };

        expect(response.status).toBe(200);
        expect(body.data.category).toBe(category);
        expect(body.data.level).toBe(level);
        expect(ROASTS[category][level]).toContain(body.data.text);
      }
    }
  });

  it("serves a full batch of distinct catalogued roasts for every combination", async () => {
    for (const category of CATEGORIES) {
      for (const level of LEVELS) {
        const response = await handleRequest(
          new Request(`https://example.com/v1/batch?count=5&category=${category}&level=${level}`),
          allowEnv,
        );
        const body = (await readEnvelope(response)) as unknown as {
          data: Array<{ text: string; category: string; level: string }>;
        };

        expect(body.data).toHaveLength(5);
        expect(new Set(body.data.map((roast) => roast.text)).size).toBe(5);
        for (const roast of body.data) {
          expect(roast.category).toBe(category);
          expect(roast.level).toBe(level);
          expect(ROASTS[category][level]).toContain(roast.text);
        }
      }
    }
  });
});
