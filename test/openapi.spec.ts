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
    for (const path of ["/", "/v1/health", "/v1/categories", "/v1/stats", "/openapi.json"]) {
      expect(paths[path]?.get.responses).toHaveProperty("400");
      expect(paths[path]?.head.responses).toHaveProperty("400");
    }

    for (const path of expectedPaths) {
      expect(paths[path]?.options.responses).toHaveProperty("204");
    }
  });
});

type Schema = {
  $ref?: string;
  type?: string;
  enum?: readonly unknown[];
  const?: unknown;
  required?: readonly string[];
  properties?: Record<string, Schema>;
  additionalProperties?: boolean;
  items?: Schema;
  minItems?: number;
  maxItems?: number;
  minimum?: number;
  maximum?: number;
};

const componentSchemas = OPENAPI_DOCUMENT.components.schemas as unknown as Record<string, Schema>;

function resolveSchema(schema: Schema): Schema {
  if (schema.$ref === undefined) {
    return schema;
  }
  const name = schema.$ref.replace("#/components/schemas/", "");
  const resolved = componentSchemas[name];
  if (resolved === undefined) {
    throw new Error(`unresolved schema reference ${schema.$ref}`);
  }
  return resolveSchema(resolved);
}

// Minimal structural validator for the subset of JSON Schema this contract uses.
// It keeps the published schemas honest without adding a validation dependency.
function schemaErrors(input: Schema, value: unknown, path = "$"): string[] {
  const schema = resolveSchema(input);
  const errors: string[] = [];

  if (schema.const !== undefined && value !== schema.const) {
    errors.push(`${path}: expected const ${String(schema.const)}`);
  }
  if (schema.enum !== undefined && !schema.enum.includes(value)) {
    errors.push(`${path}: value outside enum`);
  }

  switch (schema.type) {
    case "object": {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return [...errors, `${path}: expected object`];
      }
      const record = value as Record<string, unknown>;
      for (const key of schema.required ?? []) {
        if (!(key in record)) errors.push(`${path}.${key}: missing required property`);
      }
      for (const [key, child] of Object.entries(record)) {
        const childSchema = schema.properties?.[key];
        if (childSchema === undefined) {
          if (schema.additionalProperties === false) {
            errors.push(`${path}.${key}: undocumented property`);
          }
        } else {
          errors.push(...schemaErrors(childSchema, child, `${path}.${key}`));
        }
      }
      break;
    }
    case "array":
      if (!Array.isArray(value)) return [...errors, `${path}: expected array`];
      if (schema.minItems !== undefined && value.length < schema.minItems) {
        errors.push(`${path}: too few items`);
      }
      if (schema.maxItems !== undefined && value.length > schema.maxItems) {
        errors.push(`${path}: too many items`);
      }
      value.forEach((item, index) => {
        if (schema.items) errors.push(...schemaErrors(schema.items, item, `${path}[${index}]`));
      });
      break;
    case "integer":
      if (!Number.isSafeInteger(value)) errors.push(`${path}: expected integer`);
      else if (schema.minimum !== undefined && (value as number) < schema.minimum) {
        errors.push(`${path}: below minimum`);
      }
      break;
    case "string":
      if (typeof value !== "string") errors.push(`${path}: expected string`);
      break;
    case "boolean":
      if (typeof value !== "boolean") errors.push(`${path}: expected boolean`);
      break;
    default:
      break;
  }

  return errors;
}

type DocumentedOperation = {
  operationId?: string;
  description?: string;
  parameters?: Array<{ name: string; description?: string }>;
  responses: Record<string, { content?: { "application/json": { schema: Schema } } }>;
};

const getOperations = paths as unknown as Record<string, { get: DocumentedOperation }>;

function responseSchema(path: string, status: string): Schema {
  const schema = getOperations[path]?.get.responses[status]?.content?.["application/json"].schema;
  if (schema === undefined) {
    throw new Error(`missing ${status} response schema for GET ${path}`);
  }
  return schema;
}

describe("OpenAPI contract for automated clients", () => {
  it("gives every GET operation a unique operationId, description, and described parameters", () => {
    const ids = expectedPaths.map((path) => getOperations[path]?.get.operationId);

    expect(ids.every((id) => typeof id === "string" && /^[a-z][A-Za-z]+$/.test(id))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);

    for (const path of expectedPaths) {
      const operation = getOperations[path]?.get;
      expect(operation?.description?.length ?? 0).toBeGreaterThan(0);
      for (const parameter of operation?.parameters ?? []) {
        expect(parameter.description?.length ?? 0).toBeGreaterThan(0);
      }
    }
  });

  it("returns success bodies that match the published response schemas", async () => {
    const requests = [
      "/",
      "/v1/health",
      "/v1/categories",
      "/v1/roast?category=git&level=dark",
      "/v1/batch?count=5",
      "/v1/surprise",
      "/v1/stats",
    ];

    for (const target of requests) {
      const path = target.split("?")[0] ?? target;
      const response = await handleRequest(new Request(`https://example.com${target}`), allowEnv);
      expect(response.status).toBe(200);
      expect(schemaErrors(responseSchema(path, "200"), await response.json())).toEqual([]);
    }
  });

  it("returns error bodies that match the published error schema", async () => {
    const requests: Array<[string, string]> = [
      ["/v1/roast", "/v1/roast?category=kubernetes"],
      ["/v1/batch", "/v1/batch?count=6"],
      ["/v1/surprise", "/v1/surprise?level=nuclear"],
      ["/", "/?verbose=1"],
      ["/v1/health", "/v1/health?verbose=1"],
      ["/v1/categories", "/v1/categories?category=git"],
      ["/v1/stats", "/v1/stats?verbose=1"],
    ];

    for (const [path, target] of requests) {
      const response = await handleRequest(new Request(`https://example.com${target}`), allowEnv);
      expect(response.status).toBe(400);
      expect(schemaErrors(responseSchema(path, "400"), await response.json())).toEqual([]);
    }
  });

  it("rejects bodies that drift from the published schema", () => {
    expect(
      schemaErrors(responseSchema("/v1/roast", "200"), {
        ok: true,
        data: { text: "x", category: "kubernetes", level: "dark", extra: 1 },
        meta: { api_version: "v1", service_version: "0.0.0" },
      }),
    ).toEqual(["$.data.category: value outside enum", "$.data.extra: undocumented property"]);
  });
});
