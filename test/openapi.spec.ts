import { describe, expect, it } from "vitest";
import { handleRequest } from "../src/app";
import { OPENAPI_DOCUMENT } from "../src/openapi";
import type { AppEnv } from "../src/types";

type Operation = {
  responses: Record<string, unknown>;
  parameters?: Array<{ name: string; schema?: Record<string, unknown> }>;
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
  "/v1/batch",
  "/v1/categories",
  "/v1/health",
  "/v1/roast",
  "/v1/surprise",
  "/v1/stats",
];

const allowEnv: AppEnv = {
  RATE_LIMITER: {
    async limit() {
      return { success: true };
    },
  },
};

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

  it("keeps documented paths aligned with runtime preflight routing", async () => {
    for (const path of Object.keys(paths)) {
      const response = await handleRequest(
        new Request(`https://example.com${path}`, { method: "OPTIONS" }),
        allowEnv,
      );

      expect(response.status).toBe(204);
      expect(await response.text()).toBe("");
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

  it("documents bounded batch parameters", () => {
    const parameters = paths["/v1/batch"]?.get.parameters ?? [];
    const count = parameters.find((parameter) => parameter.name === "count");

    expect(count?.schema).toMatchObject({
      type: "integer",
      minimum: 1,
      maximum: 5,
      default: 3,
    });
  });

  it("documents optional constrained surprise parameters without defaults", () => {
    const parameters = paths["/v1/surprise"]?.get.parameters ?? [];

    expect(parameters.map((parameter) => parameter.name).sort()).toEqual(["category", "level"]);

    for (const parameter of parameters) {
      expect(parameter.schema).toHaveProperty("enum");
      expect(parameter.schema).not.toHaveProperty("default");
    }
  });

  it("documents roast validation and preflight semantics", () => {
    expect(paths["/v1/roast"]?.get.responses).toHaveProperty("400");
    expect(paths["/v1/batch"]?.get.responses).toHaveProperty("400");
    expect(paths["/v1/batch"]?.head.responses).toHaveProperty("400");
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
