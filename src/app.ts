import { selectRoast } from "./engine";
import { headResponse, jsonResponse, optionsResponse } from "./http";
import { OPENAPI_DOCUMENT } from "./openapi";
import { enforceRateLimit } from "./rate-limit";
import { API_VERSION, type AppEnv, CATEGORIES, LEVELS, SERVICE_VERSION } from "./types";
import { validateRoastRequest } from "./validation";

const MAX_URL_LENGTH = 2048;
const ALLOWED_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

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
    allowed = await enforceRateLimit(request, url.pathname, env);
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
    return optionsResponse();
  }

  let response: Response;

  switch (url.pathname) {
    case "/":
      response = success({
        name: "Talking Shit API",
        description: "Dark developer humor. Tiny API. Boring architecture.",
        endpoints: ["/v1/roast", "/v1/categories", "/v1/health", "/openapi.json"],
      });
      break;
    case "/v1/health":
      response = success({ status: "talking shit" });
      break;
    case "/v1/categories":
      response = success({ categories: CATEGORIES, levels: LEVELS });
      break;
    case "/v1/roast": {
      const validation = validateRoastRequest(url);
      if (!validation.ok) {
        response = errorResponse(400, validation.code, validation.message);
        break;
      }
      response = success(selectRoast(validation.category, validation.level));
      break;
    }
    case "/openapi.json":
      response = jsonResponse(OPENAPI_DOCUMENT);
      break;
    default:
      response = errorResponse(404, "NOT_FOUND", "Route not found.");
  }

  return request.method === "HEAD" ? headResponse(response) : response;
}

export async function handleRequest(request: Request, env: AppEnv): Promise<Response> {
  return route(request, env);
}
