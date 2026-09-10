import { describe, expect, it } from "vitest";
import { handleRequest } from "../src/app";
import { type AppEnv, SERVICE_VERSION } from "../src/types";

const allowEnv: AppEnv = {
  RATE_LIMITER: {
    async limit() {
      return { success: true };
    },
  },
};

function urlWithExactLength(totalLength: number): string {
  const prefix = "https://example.com/";
  if (totalLength < prefix.length) {
    throw new RangeError("requested URL length is smaller than the fixed prefix");
  }
  return `${prefix}${"a".repeat(totalLength - prefix.length)}`;
}

function expectSecurityHeaders(response: Response): void {
  expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(response.headers.get("Permissions-Policy")).toBe(
    "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  );
  expect(response.headers.get("Cross-Origin-Resource-Policy")).toBe("cross-origin");
}

describe("adversarial HTTP boundary", () => {
  it("enforces the application URL length boundary exactly", async () => {
    const atLimit = new Request(urlWithExactLength(2048));
    const overLimit = new Request(urlWithExactLength(2049));

    expect(atLimit.url.length).toBe(2048);
    expect(overLimit.url.length).toBe(2049);

    expect((await handleRequest(atLimit, allowEnv)).status).toBe(404);
    expect((await handleRequest(overLimit, allowEnv)).status).toBe(414);
  });

  it("rejects percent-decoded duplicate query keys", async () => {
    const response = await handleRequest(
      new Request("https://example.com/v1/roast?category=code&%63ategory=git"),
      allowEnv,
    );
    const body = (await response.json()) as {
      ok: boolean;
      error: { code: string; message: string };
    };

    expect(response.status).toBe(400);
    expect(body).toEqual({
      ok: false,
      error: {
        code: "INVALID_REQUEST",
        message: "Duplicate query parameter.",
      },
      meta: {
        api_version: "v1",
        service_version: SERVICE_VERSION,
      },
    });
  });

  it("rejects percent-decoded unknown query keys without reflection", async () => {
    const response = await handleRequest(
      new Request("https://example.com/v1/roast?%77at=nope"),
      allowEnv,
    );
    const text = await response.text();

    expect(response.status).toBe(400);
    expect(text).not.toContain("wat");
    expect(text).not.toContain("nope");
  });

  it("rejects Unicode confusable category values without reflection", async () => {
    const response = await handleRequest(
      new Request("https://example.com/v1/roast?category=secur%D1%96ty"),
      allowEnv,
    );
    const text = await response.text();

    expect(response.status).toBe(400);
    expect(text).toContain('"message":"Unknown category."');
    expect(text).not.toContain("%D1%96");
  });

  it("rejects huge batch counts with a stable bounded error", async () => {
    const count = "9".repeat(200);
    const response = await handleRequest(
      new Request(`https://example.com/v1/batch?count=${count}`),
      allowEnv,
    );
    const body = (await response.json()) as {
      ok: boolean;
      error: { code: string; message: string };
    };

    expect(response.status).toBe(400);
    expect(body.error).toEqual({
      code: "INVALID_REQUEST",
      message: "Count must be a whole number within the allowed range.",
    });
  });

  it("rejects common state-changing methods with one stable contract", async () => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      const response = await handleRequest(
        new Request("https://example.com/v1/health", { method }),
        allowEnv,
      );

      expect(response.status).toBe(405);
      expect(response.headers.get("Allow")).toBe("GET, HEAD, OPTIONS");
    }
  });

  it("removes the body from invalid-query HEAD responses", async () => {
    const response = await handleRequest(
      new Request("https://example.com/v1/surprise?wat=nope", { method: "HEAD" }),
      allowEnv,
    );

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("");
  });

  it("keeps baseline security headers on error responses", async () => {
    const invalid = await handleRequest(
      new Request("https://example.com/v1/roast?wat=nope"),
      allowEnv,
    );
    const missing = await handleRequest(new Request("https://example.com/not-a-route"), allowEnv);

    expect(invalid.status).toBe(400);
    expect(missing.status).toBe(404);
    expectSecurityHeaders(invalid);
    expectSecurityHeaders(missing);
  });

  it("never enables credentialed cross-origin requests", async () => {
    const getResponse = await handleRequest(new Request("https://example.com/v1/health"), allowEnv);
    const optionsResponse = await handleRequest(
      new Request("https://example.com/v1/health", { method: "OPTIONS" }),
      allowEnv,
    );

    expect(getResponse.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(optionsResponse.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(getResponse.headers.get("Access-Control-Allow-Credentials")).toBeNull();
    expect(optionsResponse.headers.get("Access-Control-Allow-Credentials")).toBeNull();
  });
});
