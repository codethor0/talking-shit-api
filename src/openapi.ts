import {
  CATEGORIES,
  DEFAULT_BATCH_COUNT,
  LEVELS,
  MAX_BATCH_COUNT,
  MIN_BATCH_COUNT,
  SERVICE_VERSION,
} from "./types";

const sharedFailureResponses = {
  "414": { description: "Request URL is too long" },
  "429": { description: "Rate limit exceeded" },
  "503": { description: "Rate limiter unavailable" },
} as const;

const sharedOptionsResponses = {
  "204": { description: "CORS preflight accepted" },
  ...sharedFailureResponses,
} as const;

export const OPENAPI_DOCUMENT = {
  openapi: "3.1.0",
  info: {
    title: "Talking Shit API",
    version: SERVICE_VERSION,
    description:
      "A stateless Cloudflare Workers API for curated developer humor with zero runtime dependencies.",
  },
  servers: [{ url: "https://talking-shit-api.codethor0.workers.dev" }],
  paths: {
    "/": {
      get: {
        summary: "Service index",
        responses: {
          "200": { description: "Service metadata and public endpoints" },
          ...sharedFailureResponses,
        },
      },
      head: {
        summary: "Service index headers",
        responses: {
          "200": { description: "Service index headers" },
          ...sharedFailureResponses,
        },
      },
      options: {
        summary: "CORS preflight",
        responses: sharedOptionsResponses,
      },
    },
    "/v1/health": {
      get: {
        summary: "Health check",
        responses: {
          "200": { description: "Service is healthy" },
          ...sharedFailureResponses,
        },
      },
      head: {
        summary: "Health check headers",
        responses: {
          "200": { description: "Health check headers" },
          ...sharedFailureResponses,
        },
      },
      options: {
        summary: "CORS preflight",
        responses: sharedOptionsResponses,
      },
    },
    "/v1/categories": {
      get: {
        summary: "List supported categories and levels",
        responses: {
          "200": { description: "Supported values" },
          ...sharedFailureResponses,
        },
      },
      head: {
        summary: "Category headers",
        responses: {
          "200": { description: "Category response headers" },
          ...sharedFailureResponses,
        },
      },
      options: {
        summary: "CORS preflight",
        responses: sharedOptionsResponses,
      },
    },
    "/v1/roast": {
      get: {
        summary: "Return a random developer roast",
        parameters: [
          {
            name: "category",
            in: "query",
            required: false,
            schema: { type: "string", enum: CATEGORIES, default: "general" },
          },
          {
            name: "level",
            in: "query",
            required: false,
            schema: { type: "string", enum: LEVELS, default: "spicy" },
          },
        ],
        responses: {
          "200": { description: "A roast" },
          "400": { description: "Invalid query" },
          ...sharedFailureResponses,
        },
      },
      head: {
        summary: "Roast response headers",
        responses: {
          "200": { description: "Roast response headers" },
          "400": { description: "Invalid query" },
          ...sharedFailureResponses,
        },
      },
      options: {
        summary: "CORS preflight",
        responses: sharedOptionsResponses,
      },
    },
    "/v1/batch": {
      get: {
        summary: "Return a bounded batch of unique developer roasts",
        parameters: [
          {
            name: "category",
            in: "query",
            required: false,
            schema: { type: "string", enum: CATEGORIES, default: "general" },
          },
          {
            name: "level",
            in: "query",
            required: false,
            schema: { type: "string", enum: LEVELS, default: "spicy" },
          },
          {
            name: "count",
            in: "query",
            required: false,
            schema: {
              type: "integer",
              minimum: MIN_BATCH_COUNT,
              maximum: MAX_BATCH_COUNT,
              default: DEFAULT_BATCH_COUNT,
            },
          },
        ],
        responses: {
          "200": { description: "A bounded array of unique roasts" },
          "400": { description: "Invalid query" },
          ...sharedFailureResponses,
        },
      },
      head: {
        summary: "Batch roast response headers",
        responses: {
          "200": { description: "Batch roast response headers" },
          "400": { description: "Invalid query" },
          ...sharedFailureResponses,
        },
      },
      options: {
        summary: "CORS preflight",
        responses: sharedOptionsResponses,
      },
    },
    "/v1/surprise": {
      get: {
        summary: "Return a random developer roast with optional constraints",
        parameters: [
          {
            name: "category",
            in: "query",
            required: false,
            schema: { type: "string", enum: CATEGORIES },
          },
          {
            name: "level",
            in: "query",
            required: false,
            schema: { type: "string", enum: LEVELS },
          },
        ],
        responses: {
          "200": {
            description: "A roast with randomized unspecified category or intensity",
          },
          "400": { description: "Invalid query" },
          ...sharedFailureResponses,
        },
      },
      head: {
        summary: "Random roast response headers",
        responses: {
          "200": { description: "Random roast response headers" },
          "400": { description: "Invalid query" },
          ...sharedFailureResponses,
        },
      },
      options: {
        summary: "CORS preflight",
        responses: sharedOptionsResponses,
      },
    },
    "/v1/stats": {
      get: {
        summary: "Return catalog statistics",
        responses: {
          "200": { description: "Current catalog totals by category and intensity" },
          "400": { description: "Query parameters are not accepted" },
          ...sharedFailureResponses,
        },
      },
      head: {
        summary: "Catalog statistics response headers",
        responses: {
          "200": { description: "Catalog statistics response headers" },
          "400": { description: "Query parameters are not accepted" },
          ...sharedFailureResponses,
        },
      },
      options: {
        summary: "CORS preflight",
        responses: sharedOptionsResponses,
      },
    },
    "/openapi.json": {
      get: {
        summary: "OpenAPI document",
        responses: {
          "200": { description: "OpenAPI 3.1 document" },
          ...sharedFailureResponses,
        },
      },
      head: {
        summary: "OpenAPI document headers",
        responses: {
          "200": { description: "OpenAPI document headers" },
          ...sharedFailureResponses,
        },
      },
      options: {
        summary: "CORS preflight",
        responses: sharedOptionsResponses,
      },
    },
  },
} as const;
