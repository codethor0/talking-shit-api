import { CATEGORIES, type Category, LEVELS, type Level } from "./types";

const MAX_URL_LENGTH = 2048;
const ALLOWED_QUERY_KEYS = new Set(["category", "level"]);

export type ValidationResult =
  | { ok: true; category: Category; level: Level }
  | { ok: false; code: "INVALID_REQUEST"; message: string };

function isCategory(value: string): value is Category {
  return CATEGORIES.some((category) => category === value);
}

function isLevel(value: string): value is Level {
  return LEVELS.some((level) => level === value);
}

export function validateRoastRequest(url: URL): ValidationResult {
  if (url.href.length > MAX_URL_LENGTH) {
    return { ok: false, code: "INVALID_REQUEST", message: "Request URL is too long." };
  }

  for (const key of url.searchParams.keys()) {
    if (!ALLOWED_QUERY_KEYS.has(key)) {
      return { ok: false, code: "INVALID_REQUEST", message: "Unknown query parameter." };
    }
  }

  for (const key of ALLOWED_QUERY_KEYS) {
    if (url.searchParams.getAll(key).length > 1) {
      return { ok: false, code: "INVALID_REQUEST", message: "Duplicate query parameter." };
    }
  }

  const categoryValue = url.searchParams.get("category") ?? "general";
  const levelValue = url.searchParams.get("level") ?? "spicy";

  if (!isCategory(categoryValue)) {
    return { ok: false, code: "INVALID_REQUEST", message: "Unknown category." };
  }

  if (!isLevel(levelValue)) {
    return { ok: false, code: "INVALID_REQUEST", message: "Unknown level." };
  }

  return { ok: true, category: categoryValue, level: levelValue };
}
