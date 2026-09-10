import { ROASTS } from "./content/roasts";
import { cryptoRandomIndex } from "./random";
import { CATEGORIES, type Category, LEVELS, type Level, type Roast } from "./types";

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

export function selectSurpriseRoast(
  randomIndex: (length: number) => number = cryptoRandomIndex,
): Roast {
  const category = CATEGORIES[randomIndex(CATEGORIES.length)];
  const level = LEVELS[randomIndex(LEVELS.length)];

  if (category === undefined || level === undefined) {
    throw new RangeError("random index was outside the surprise dimensions");
  }

  return selectRoast(category, level, randomIndex);
}
