import { ROASTS } from "./content/roasts";
import { cryptoRandomIndex } from "./random";
import type { Category, Level, Roast } from "./types";

export function selectRoast(
  category: Category,
  level: Level,
  randomIndex: (length: number) => number = cryptoRandomIndex,
): Roast {
  const candidates = ROASTS[category][level];
  const index = randomIndex(candidates.length);
  const text = candidates[index];

  if (text === undefined) {
    throw new RangeError("random index was outside the roast catalog");
  }

  return { text, category, level };
}
