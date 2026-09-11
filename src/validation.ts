import {
  CATEGORIES,
  type Category,
  DEFAULT_BATCH_COUNT,
  LEVELS,
  type Level,
  MAX_BATCH_COUNT,
  MIN_BATCH_COUNT,
} from "./types";

const MAX_URL_LENGTH = 2048;
const ROAST_ALLOWED_QUERY_KEYS = new Set(["category", "level"]);
const BATCH_ALLOWED_QUERY_KEYS = new Set(["category", "level", "count"]);

type InvalidValidationResult = {
  ok: false;
  code: "INVALID_REQUEST";
  message: string;
};

type SelectionValidationResult =
  | { ok: true; category: Category; level: Level }
  | InvalidValidationResult;

export type ValidationResult = SelectionValidationResult;

export type BatchValidationResult =
  | { ok: true; category: Category; level: Level; count: number }
  | InvalidValidationResult;

export type SurpriseValidationResult =
  | { ok: true; category: Category | undefined; level: Level | undefined }
  | InvalidValidationResult;

function isCategory(value: string): value is Category {
  return CATEGORIES.some((category) => category === value);
}

function isLevel(value: string): value is Level {
  return LEVELS.some((level) => level === value);
}

function invalid(message: string): InvalidValidationResult {
  return { ok: false, code: "INVALID_REQUEST", message };
}

function validateQueryShape(
  url: URL,
  allowedQueryKeys: ReadonlySet<string>,
): InvalidValidationResult | null {
  if (url.href.length > MAX_URL_LENGTH) {
    return invalid("Request URL is too long.");
  }

  for (const key of url.searchParams.keys()) {
    if (!allowedQueryKeys.has(key)) {
      return invalid("Unknown query parameter.");
    }
  }

  for (const key of allowedQueryKeys) {
    if (url.searchParams.getAll(key).length > 1) {
      return invalid("Duplicate query parameter.");
    }
  }

  return null;
}

function validateSelectionRequest(
  url: URL,
  allowedQueryKeys: ReadonlySet<string>,
): SelectionValidationResult {
  const shapeError = validateQueryShape(url, allowedQueryKeys);
  if (shapeError) {
    return shapeError;
  }

  const categoryValue = url.searchParams.get("category") ?? "general";
  const levelValue = url.searchParams.get("level") ?? "spicy";

  if (!isCategory(categoryValue)) {
    return invalid("Unknown category.");
  }

  if (!isLevel(levelValue)) {
    return invalid("Unknown level.");
  }

  return { ok: true, category: categoryValue, level: levelValue };
}

export function validateRoastRequest(url: URL): ValidationResult {
  return validateSelectionRequest(url, ROAST_ALLOWED_QUERY_KEYS);
}

export function validateSurpriseRequest(url: URL): SurpriseValidationResult {
  const shapeError = validateQueryShape(url, ROAST_ALLOWED_QUERY_KEYS);
  if (shapeError) {
    return shapeError;
  }

  const categoryValue = url.searchParams.get("category");
  const levelValue = url.searchParams.get("level");

  if (categoryValue !== null && !isCategory(categoryValue)) {
    return invalid("Unknown category.");
  }

  if (levelValue !== null && !isLevel(levelValue)) {
    return invalid("Unknown level.");
  }

  return {
    ok: true,
    category: categoryValue ?? undefined,
    level: levelValue ?? undefined,
  };
}

export function validateBatchRequest(url: URL): BatchValidationResult {
  const selection = validateSelectionRequest(url, BATCH_ALLOWED_QUERY_KEYS);
  if (!selection.ok) {
    return selection;
  }

  const countValue = url.searchParams.get("count");
  if (countValue === null) {
    return { ...selection, count: DEFAULT_BATCH_COUNT };
  }

  const count = Number(countValue);
  if (
    !Number.isSafeInteger(count) ||
    String(count) !== countValue ||
    count < MIN_BATCH_COUNT ||
    count > MAX_BATCH_COUNT
  ) {
    return invalid("Count must be a whole number within the allowed range.");
  }

  return { ...selection, count };
}
