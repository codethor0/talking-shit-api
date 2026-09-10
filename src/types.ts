export const API_VERSION = "v1" as const;
export const SERVICE_VERSION = "0.4.0" as const;

export const CATEGORIES = [
  "general",
  "code",
  "debugging",
  "deploy",
  "meetings",
  "security",
  "git",
  "oncall",
] as const;

export const LEVELS = ["mild", "spicy", "dark"] as const;

export const MIN_BATCH_COUNT = 1 as const;
export const DEFAULT_BATCH_COUNT = 3 as const;
export const MAX_BATCH_COUNT = 5 as const;

export type Category = (typeof CATEGORIES)[number];
export type Level = (typeof LEVELS)[number];

export interface RateLimitResult {
  success: boolean;
}

export interface RateLimiter {
  limit(input: { key: string }): Promise<RateLimitResult>;
}

export interface AppEnv {
  RATE_LIMITER: RateLimiter;
}

export interface Roast {
  text: string;
  category: Category;
  level: Level;
}
