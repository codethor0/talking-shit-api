import { selectConstrainedSurpriseRoast, selectRoast, selectRoasts } from "./engine";
import { headResponse, jsonResponse, optionsResponse } from "./http";
import { OPENAPI_DOCUMENT } from "./openapi";
import { enforceRateLimit } from "./rate-limit";
import { getCatalogStats } from "./stats";
import { API_VERSION, type AppEnv, CATEGORIES, LEVELS, SERVICE_VERSION } from "./types";
import { validateBatchRequest, validateRoastRequest, validateSurpriseRequest } from "./validation";

const MAX_URL_LENGTH = 2048;
const ALLOWED_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const PUBLIC_PATHS = new Set([
  "/",
  "/v1/health",
  "/v1/categories",
  "/v1/roast",
  "/v1/batch",
  "/v1/surprise",
  "/v1/stats",
  "/openapi.json",
]);

function success(data: unknown): Response {
  return jsonResponse({
    ok: true,
    data,
    meta: {
      api_version: API_VERSION,
      service_version: SERVICE_VERSION,
    },
  });
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  headers?: HeadersInit,
): Response {
  return jsonResponse(
    {
      ok: false,
      error: { code, message },
      meta: {
        api_version: API_VERSION,
        service_version: SERVICE_VERSION,
      },
    },
    status,
    headers,
  );
}

async function route(request: Request, env: AppEnv): Promise<Response> {
  if (request.url.length > MAX_URL_LENGTH) {
    return errorResponse(414, "URI_TOO_LONG", "Request URL is too long.");
  }

  const url = new URL(request.url);

  let allowed: boolean;
  try {
    allowed = await enforceRateLimit(request, env);
  } catch {
    return errorResponse(503, "RATE_LIMIT_UNAVAILABLE", "Service temporarily unavailable.");
  }

  if (!allowed) {
    return errorResponse(429, "RATE_LIMITED", "Too many requests. Try again later.", {
      "Retry-After": "60",
    });
  }

  if (!ALLOWED_METHODS.has(request.method)) {
    return errorResponse(405, "METHOD_NOT_ALLOWED", "Method not allowed.", {
      Allow: "GET, HEAD, OPTIONS",
    });
  }

  if (request.method === "OPTIONS") {
    return PUBLIC_PATHS.has(url.pathname)
      ? optionsResponse()
      : errorResponse(404, "NOT_FOUND", "Route not found.");
  }

  switch (url.pathname) {
    case "/":
      return success({
        name: "Talking Shit API",
        description: "Dark developer humor. Tiny API. Boring architecture.",
        endpoints: [
          "/v1/roast",
          "/v1/batch",
          "/v1/surprise",
          "/v1/stats",
          "/v1/categories",
          "/v1/health",
          "/openapi.json",
        ],
      });
    case "/v1/health":
      return success({ status: "talking shit" });
    case "/v1/categories":
      return success({ categories: CATEGORIES, levels: LEVELS });
    case "/v1/roast": {
      const validation = validateRoastRequest(url);
      if (!validation.ok) {
        return errorResponse(400, validation.code, validation.message);
      }
      return success(selectRoast(validation.category, validation.level));
    }
    case "/v1/batch": {
      const validation = validateBatchRequest(url);
      if (!validation.ok) {
        return errorResponse(400, validation.code, validation.message);
      }
      return success(selectRoasts(validation.category, validation.level, validation.count));
    }
    case "/v1/surprise": {
      const validation = validateSurpriseRequest(url);
      if (!validation.ok) {
        return errorResponse(400, validation.code, validation.message);
      }
      return success(selectConstrainedSurpriseRoast(validation.category, validation.level));
    }
    case "/v1/stats":
      if (url.searchParams.size > 0) {
        return errorResponse(
          400,
          "INVALID_REQUEST",
          "Query parameters are not supported for this route.",
        );
      }
      return success(getCatalogStats());
    case "/openapi.json":
      return jsonResponse(OPENAPI_DOCUMENT);
    default:
      return errorResponse(404, "NOT_FOUND", "Route not found.");
  }
}

export async function handleRequest(request: Request, env: AppEnv): Promise<Response> {
  const response = await route(request, env);
  return request.method === "HEAD" ? headResponse(response) : response;
}
