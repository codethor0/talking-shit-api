const BASE_HEADERS: Readonly<Record<string, string>> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  // Retry-After is not CORS-safelisted, so browser clients cannot read it on a 429 without this.
  "Access-Control-Expose-Headers": "Retry-After",
  "Cache-Control": "no-store",
  "Cross-Origin-Resource-Policy": "cross-origin",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

function responseHeaders(extraHeaders?: HeadersInit): Headers {
  const headers = new Headers(BASE_HEADERS);
  if (extraHeaders !== undefined) {
    new Headers(extraHeaders).forEach((value, key) => {
      headers.set(key, value);
    });
  }
  return headers;
}

// For payloads that never change per request, so they can be serialized once at module load.
export function serializedJsonResponse(
  body: string,
  status = 200,
  extraHeaders?: HeadersInit,
): Response {
  const headers = responseHeaders(extraHeaders);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(body, { status, headers });
}

export function jsonResponse(payload: unknown, status = 200, extraHeaders?: HeadersInit): Response {
  return serializedJsonResponse(JSON.stringify(payload), status, extraHeaders);
}

export function headResponse(response: Response): Response {
  return new Response(null, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

export function optionsResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: responseHeaders({
      "Access-Control-Max-Age": "86400",
    }),
  });
}
