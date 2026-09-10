import { CATEGORIES, LEVELS, SERVICE_VERSION } from "./types";

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
    description: "A deliberately tiny, anonymous developer-humor API.",
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
    "/v1/surprise": {
      get: {
        summary: "Return a fully random developer roast",
        responses: {
          "200": { description: "A roast with random category and intensity" },
          "400": { description: "Query parameters are not accepted" },
          ...sharedFailureResponses,
        },
      },
      head: {
        summary: "Random roast response headers",
        responses: {
          "200": { description: "Random roast response headers" },
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
