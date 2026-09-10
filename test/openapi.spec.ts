import { describe, expect, it } from "vitest";
import { OPENAPI_DOCUMENT } from "../src/openapi";

type Operation = {
  responses: Record<string, unknown>;
};

type PublicPath = {
  get: Operation;
  head: Operation;
  options: Operation;
};

const paths = OPENAPI_DOCUMENT.paths as unknown as Record<string, PublicPath>;
const expectedPaths = [
  "/",
  "/openapi.json",
  "/v1/categories",
  "/v1/health",
  "/v1/roast",
  "/v1/surprise",
  "/v1/stats",
];

describe("OpenAPI contract", () => {
  it("documents every public path and supported method", () => {
    expect(Object.keys(paths).sort()).toEqual([...expectedPaths].sort());

    for (const path of expectedPaths) {
      expect(paths[path]).toBeDefined();
      expect(paths[path]?.get).toBeDefined();
      expect(paths[path]?.head).toBeDefined();
      expect(paths[path]?.options).toBeDefined();
    }
  });

  it("documents shared availability failures on every public operation", () => {
    for (const path of expectedPaths) {
      const operations = paths[path];
      expect(operations).toBeDefined();

      for (const method of ["get", "head", "options"] as const) {
        const responses = operations?.[method].responses;
        expect(responses).toHaveProperty("414");
        expect(responses).toHaveProperty("429");
        expect(responses).toHaveProperty("503");
      }
    }
  });

  it("documents roast validation and preflight semantics", () => {
    expect(paths["/v1/roast"]?.get.responses).toHaveProperty("400");
    expect(paths["/v1/roast"]?.head.responses).toHaveProperty("400");
    expect(paths["/v1/surprise"]?.get.responses).toHaveProperty("400");
    expect(paths["/v1/surprise"]?.head.responses).toHaveProperty("400");
    expect(paths["/v1/stats"]?.get.responses).toHaveProperty("400");
    expect(paths["/v1/stats"]?.head.responses).toHaveProperty("400");

    for (const path of expectedPaths) {
      expect(paths[path]?.options.responses).toHaveProperty("204");
    }
  });
});
