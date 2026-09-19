import {
  CATEGORIES,
  DEFAULT_BATCH_COUNT,
  LEVELS,
  MAX_BATCH_COUNT,
  MIN_BATCH_COUNT,
  SERVICE_VERSION,
} from "./types";

function jsonContent(schemaName: string) {
  return {
    "application/json": {
      schema: { $ref: `#/components/schemas/${schemaName}` },
    },
  } as const;
}

const errorContent = jsonContent("ErrorResponse");

const sharedFailureResponses = {
  "414": { description: "Request URL is too long", content: errorContent },
  "429": {
    description: "Rate limit exceeded. Wait for the Retry-After interval before retrying.",
    content: errorContent,
  },
  "503": { description: "Rate limiter unavailable", content: errorContent },
} as const;

const sharedHeadFailureResponses = {
  "414": { description: "Request URL is too long" },
  "429": { description: "Rate limit exceeded" },
  "503": { description: "Rate limiter unavailable" },
} as const;

const sharedOptionsResponses = {
  "204": { description: "CORS preflight accepted" },
  ...sharedHeadFailureResponses,
} as const;

const invalidQueryResponse = {
  description:
    "Invalid query. The error message names the allowed parameters or values so the caller can correct the request.",
  content: errorContent,
} as const;

const noQueryResponse = {
  description: "Query parameters are not accepted on this route",
  content: errorContent,
} as const;

const noQueryHeadResponse = { description: "Query parameters are not accepted" } as const;

const categoryParameterDescription =
  "Topic of the roast. Pick the category closest to what the user is talking about.";
const levelParameterDescription =
  "Intensity of the roast: mild is gentle, spicy is pointed, dark is gallows humor.";

const envelopeMeta = { $ref: "#/components/schemas/Meta" } as const;

function successEnvelope(dataSchema: Record<string, unknown>) {
  return {
    type: "object",
    required: ["ok", "data", "meta"],
    additionalProperties: false,
    properties: {
      ok: { type: "boolean", const: true },
      data: dataSchema,
      meta: envelopeMeta,
    },
  } as const;
}

export const OPENAPI_DOCUMENT = {
  openapi: "3.1.0",
  info: {
    title: "Talking Shit API",
    version: SERVICE_VERSION,
    description:
      "A stateless Cloudflare Workers API for curated developer humor with zero runtime dependencies. Every response is JSON wrapped in an envelope with ok, data or error, and meta fields. The API is read-only and anonymous; clients choose only a category and an intensity level, never free-form text or a target.",
  },
  servers: [{ url: "https://talking-shit-api.codethor0.workers.dev" }],
  paths: {
    "/": {
      get: {
        operationId: "getServiceIndex",
        summary: "Service index",
        description:
          "Returns the service name, a short description, and the public endpoints. Accepts no parameters.",
        responses: {
          "200": {
            description: "Service metadata and public endpoints",
            content: jsonContent("ServiceIndexResponse"),
          },
          "400": noQueryResponse,
          ...sharedFailureResponses,
        },
      },
      head: {
        summary: "Service index headers",
        responses: {
          "200": { description: "Service index headers" },
          "400": noQueryHeadResponse,
          ...sharedHeadFailureResponses,
        },
      },
      options: {
        summary: "CORS preflight",
        responses: sharedOptionsResponses,
      },
    },
    "/v1/health": {
      get: {
        operationId: "getHealth",
        summary: "Health check",
        description:
          "Confirms the service is up and reports the running service version. Accepts no parameters.",
        responses: {
          "200": { description: "Service is healthy", content: jsonContent("HealthResponse") },
          "400": noQueryResponse,
          ...sharedFailureResponses,
        },
      },
      head: {
        summary: "Health check headers",
        responses: {
          "200": { description: "Health check headers" },
          "400": noQueryHeadResponse,
          ...sharedHeadFailureResponses,
        },
      },
      options: {
        summary: "CORS preflight",
        responses: sharedOptionsResponses,
      },
    },
    "/v1/categories": {
      get: {
        operationId: "listCategories",
        summary: "List supported categories and levels",
        description:
          "Lists every valid category and intensity level. Call this first if unsure which values the other operations accept. Accepts no parameters.",
        responses: {
          "200": { description: "Supported values", content: jsonContent("CategoriesResponse") },
          "400": noQueryResponse,
          ...sharedFailureResponses,
        },
      },
      head: {
        summary: "Category headers",
        responses: {
          "200": { description: "Category response headers" },
          "400": noQueryHeadResponse,
          ...sharedHeadFailureResponses,
        },
      },
      options: {
        summary: "CORS preflight",
        responses: sharedOptionsResponses,
      },
    },
    "/v1/roast": {
      get: {
        operationId: "getRoast",
        summary: "Return a random developer roast",
        description:
          "Returns exactly one curated roast for a category and intensity. Omitted values default to general and spicy. Use getRoastBatch for several distinct roasts in one call.",
        parameters: [
          {
            name: "category",
            in: "query",
            required: false,
            description: categoryParameterDescription,
            schema: { type: "string", enum: CATEGORIES, default: "general" },
          },
          {
            name: "level",
            in: "query",
            required: false,
            description: levelParameterDescription,
            schema: { type: "string", enum: LEVELS, default: "spicy" },
          },
        ],
        responses: {
          "200": { description: "A roast", content: jsonContent("RoastResponse") },
          "400": invalidQueryResponse,
          ...sharedFailureResponses,
        },
      },
      head: {
        summary: "Roast response headers",
        responses: {
          "200": { description: "Roast response headers" },
          "400": { description: "Invalid query" },
          ...sharedHeadFailureResponses,
        },
      },
      options: {
        summary: "CORS preflight",
        responses: sharedOptionsResponses,
      },
    },
    "/v1/batch": {
      get: {
        operationId: "getRoastBatch",
        summary: "Return a bounded batch of unique developer roasts",
        description:
          "Returns between one and five distinct roasts from a single category and intensity. Prefer this over repeated getRoast calls when more than one roast is needed.",
        parameters: [
          {
            name: "category",
            in: "query",
            required: false,
            description: categoryParameterDescription,
            schema: { type: "string", enum: CATEGORIES, default: "general" },
          },
          {
            name: "level",
            in: "query",
            required: false,
            description: levelParameterDescription,
            schema: { type: "string", enum: LEVELS, default: "spicy" },
          },
          {
            name: "count",
            in: "query",
            required: false,
            description: "How many distinct roasts to return.",
            schema: {
              type: "integer",
              minimum: MIN_BATCH_COUNT,
              maximum: MAX_BATCH_COUNT,
              default: DEFAULT_BATCH_COUNT,
            },
          },
        ],
        responses: {
          "200": {
            description: "A bounded array of unique roasts",
            content: jsonContent("BatchResponse"),
          },
          "400": invalidQueryResponse,
          ...sharedFailureResponses,
        },
      },
      head: {
        summary: "Batch roast response headers",
        responses: {
          "200": { description: "Batch roast response headers" },
          "400": { description: "Invalid query" },
          ...sharedHeadFailureResponses,
        },
      },
      options: {
        summary: "CORS preflight",
        responses: sharedOptionsResponses,
      },
    },
    "/v1/surprise": {
      get: {
        operationId: "getSurpriseRoast",
        summary: "Return a random developer roast with optional constraints",
        description:
          "Returns one roast and randomly chooses any category or level the caller omits. Use this when the user has no preference; the response reports which category and level were chosen.",
        parameters: [
          {
            name: "category",
            in: "query",
            required: false,
            description: `${categoryParameterDescription} Omit to randomize.`,
            schema: { type: "string", enum: CATEGORIES },
          },
          {
            name: "level",
            in: "query",
            required: false,
            description: `${levelParameterDescription} Omit to randomize.`,
            schema: { type: "string", enum: LEVELS },
          },
        ],
        responses: {
          "200": {
            description: "A roast with randomized unspecified category or intensity",
            content: jsonContent("RoastResponse"),
          },
          "400": invalidQueryResponse,
          ...sharedFailureResponses,
        },
      },
      head: {
        summary: "Random roast response headers",
        responses: {
          "200": { description: "Random roast response headers" },
          "400": { description: "Invalid query" },
          ...sharedHeadFailureResponses,
        },
      },
      options: {
        summary: "CORS preflight",
        responses: sharedOptionsResponses,
      },
    },
    "/v1/stats": {
      get: {
        operationId: "getCatalogStats",
        summary: "Return catalog statistics",
        description:
          "Returns how many curated roasts exist in total, per category, and per intensity level. Accepts no parameters.",
        responses: {
          "200": {
            description: "Current catalog totals by category and intensity",
            content: jsonContent("StatsResponse"),
          },
          "400": noQueryResponse,
          ...sharedFailureResponses,
        },
      },
      head: {
        summary: "Catalog statistics response headers",
        responses: {
          "200": { description: "Catalog statistics response headers" },
          "400": noQueryHeadResponse,
          ...sharedHeadFailureResponses,
        },
      },
      options: {
        summary: "CORS preflight",
        responses: sharedOptionsResponses,
      },
    },
    "/openapi.json": {
      get: {
        operationId: "getOpenApiDocument",
        summary: "OpenAPI document",
        description: "Returns this OpenAPI 3.1 contract. Accepts no parameters.",
        responses: {
          "200": {
            description: "OpenAPI 3.1 document",
            content: { "application/json": { schema: { type: "object" } } },
          },
          "400": noQueryResponse,
          ...sharedFailureResponses,
        },
      },
      head: {
        summary: "OpenAPI document headers",
        responses: {
          "200": { description: "OpenAPI document headers" },
          "400": noQueryHeadResponse,
          ...sharedHeadFailureResponses,
        },
      },
      options: {
        summary: "CORS preflight",
        responses: sharedOptionsResponses,
      },
    },
  },
  components: {
    schemas: {
      Category: { type: "string", enum: CATEGORIES },
      Level: { type: "string", enum: LEVELS },
      Meta: {
        type: "object",
        required: ["api_version", "service_version"],
        additionalProperties: false,
        properties: {
          api_version: { type: "string", const: "v1" },
          service_version: { type: "string" },
        },
      },
      Roast: {
        type: "object",
        required: ["text", "category", "level"],
        additionalProperties: false,
        properties: {
          text: { type: "string", description: "The roast itself." },
          category: { $ref: "#/components/schemas/Category" },
          level: { $ref: "#/components/schemas/Level" },
        },
      },
      ErrorResponse: {
        type: "object",
        required: ["ok", "error", "meta"],
        additionalProperties: false,
        properties: {
          ok: { type: "boolean", const: false },
          error: {
            type: "object",
            required: ["code", "message"],
            additionalProperties: false,
            properties: {
              code: {
                type: "string",
                enum: [
                  "INVALID_REQUEST",
                  "NOT_FOUND",
                  "METHOD_NOT_ALLOWED",
                  "URI_TOO_LONG",
                  "RATE_LIMITED",
                  "RATE_LIMIT_UNAVAILABLE",
                ],
              },
              message: { type: "string" },
            },
          },
          meta: envelopeMeta,
        },
      },
      ServiceIndexResponse: successEnvelope({
        type: "object",
        required: ["name", "description", "endpoints"],
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          endpoints: { type: "array", items: { type: "string" } },
        },
      }),
      HealthResponse: successEnvelope({
        type: "object",
        required: ["status"],
        additionalProperties: false,
        properties: { status: { type: "string" } },
      }),
      CategoriesResponse: successEnvelope({
        type: "object",
        required: ["categories", "levels"],
        additionalProperties: false,
        properties: {
          categories: { type: "array", items: { $ref: "#/components/schemas/Category" } },
          levels: { type: "array", items: { $ref: "#/components/schemas/Level" } },
        },
      }),
      RoastResponse: successEnvelope({ $ref: "#/components/schemas/Roast" }),
      BatchResponse: successEnvelope({
        type: "array",
        minItems: MIN_BATCH_COUNT,
        maxItems: MAX_BATCH_COUNT,
        items: { $ref: "#/components/schemas/Roast" },
      }),
      StatsResponse: successEnvelope({
        type: "object",
        required: ["total", "category_count", "level_count", "categories"],
        additionalProperties: false,
        properties: {
          total: { type: "integer", minimum: 0 },
          category_count: { type: "integer", minimum: 0 },
          level_count: { type: "integer", minimum: 0 },
          categories: {
            type: "array",
            items: {
              type: "object",
              required: ["category", "total", "levels"],
              additionalProperties: false,
              properties: {
                category: { $ref: "#/components/schemas/Category" },
                total: { type: "integer", minimum: 0 },
                levels: {
                  type: "array",
                  items: {
                    type: "object",
                    required: ["level", "count"],
                    additionalProperties: false,
                    properties: {
                      level: { $ref: "#/components/schemas/Level" },
                      count: { type: "integer", minimum: 0 },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    },
  },
} as const;
