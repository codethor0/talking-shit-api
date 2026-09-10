import { CATEGORIES, LEVELS, SERVICE_VERSION } from "./types";

export const OPENAPI_DOCUMENT = {
  openapi: "3.1.0",
  info: {
    title: "Talking Shit API",
    version: SERVICE_VERSION,
    description: "A deliberately tiny, anonymous developer-humor API.",
  },
  paths: {
    "/v1/health": {
      get: {
        summary: "Health check",
        responses: { "200": { description: "Service is healthy" } },
      },
    },
    "/v1/categories": {
      get: {
        summary: "List supported categories and levels",
        responses: { "200": { description: "Supported values" } },
      },
    },
    "/v1/roast": {
      get: {
        summary: "Return a random developer roast",
        parameters: [
          {
            name: "category",
            in: "query",
            schema: { type: "string", enum: CATEGORIES },
          },
          {
            name: "level",
            in: "query",
            schema: { type: "string", enum: LEVELS },
          },
        ],
        responses: {
          "200": { description: "A roast" },
          "400": { description: "Invalid query" },
          "429": { description: "Rate limit exceeded" },
        },
      },
    },
  },
} as const;
