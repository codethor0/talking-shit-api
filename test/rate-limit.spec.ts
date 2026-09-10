import { describe, expect, it } from "vitest";
import { handleRequest } from "../src/app";
import type { AppEnv } from "../src/types";

function capturingEnv(keys: string[]): AppEnv {
  return {
    RATE_LIMITER: {
      async limit(input) {
        keys.push(input.key);
        return { success: true };
      },
    },
  };
}

describe("rate-limit identity", () => {
  it("uses one bucket per client across different paths", async () => {
    const keys: string[] = [];
    const env = capturingEnv(keys);
    const headers = { "CF-Connecting-IP": "203.0.113.10" };

    await handleRequest(new Request("https://example.com/v1/health", { headers }), env);
    await handleRequest(new Request("https://example.com/not-a-route", { headers }), env);

    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
    expect(keys[0]).toMatch(/^[a-f0-9]{64}$/);
    expect(keys[0]).not.toContain("203.0.113.10");
  });

  it("separates different clients", async () => {
    const keys: string[] = [];
    const env = capturingEnv(keys);

    await handleRequest(
      new Request("https://example.com/v1/health", {
        headers: { "CF-Connecting-IP": "203.0.113.10" },
      }),
      env,
    );
    await handleRequest(
      new Request("https://example.com/v1/health", {
        headers: { "CF-Connecting-IP": "203.0.113.11" },
      }),
      env,
    );

    expect(keys).toHaveLength(2);
    expect(keys[0]).not.toBe(keys[1]);
  });

  it("keeps the local anonymous fallback stable", async () => {
    const keys: string[] = [];
    const env = capturingEnv(keys);

    await handleRequest(new Request("https://example.com/v1/health"), env);
    await handleRequest(new Request("https://example.com/v1/categories"), env);

    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
  });
});
