import { API_VERSION, type AppEnv } from "./types";

function bytesToHex(bytes: Uint8Array): string {
  let output = "";
  for (const byte of bytes) {
    output += byte.toString(16).padStart(2, "0");
  }
  return output;
}

export async function enforceRateLimit(request: Request, env: AppEnv): Promise<boolean> {
  const clientAddress = request.headers.get("CF-Connecting-IP") ?? "local-anonymous";
  const material = new TextEncoder().encode(`talking-shit-api:${API_VERSION}\n${clientAddress}`);
  const digest = await crypto.subtle.digest("SHA-256", material);
  const key = bytesToHex(new Uint8Array(digest));
  const result = await env.RATE_LIMITER.limit({ key });
  return result.success;
}
