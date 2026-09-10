import { ROASTS } from "./content/roasts";
import { cryptoRandomIndex } from "./random";
import {
  CATEGORIES,
  type Category,
  LEVELS,
  type Level,
  MAX_BATCH_COUNT,
  MIN_BATCH_COUNT,
  type Roast,
} from "./types";

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

export function selectRoasts(
  category: Category,
  level: Level,
  count: number,
  randomIndex: (length: number) => number = cryptoRandomIndex,
): Roast[] {
  if (!Number.isSafeInteger(count) || count < MIN_BATCH_COUNT || count > MAX_BATCH_COUNT) {
    throw new RangeError("batch count was outside allowed bounds");
  }

  const candidates = [...ROASTS[category][level]];
  const selected: Roast[] = [];

  for (let position = 0; position < count; position += 1) {
    const index = randomIndex(candidates.length);
    if (!Number.isSafeInteger(index) || index < 0 || index >= candidates.length) {
      throw new RangeError("random index was outside the remaining roast catalog");
    }

    const [text] = candidates.splice(index, 1);
    if (text === undefined) {
      throw new RangeError("random index was outside the remaining roast catalog");
    }

    selected.push({ text, category, level });
  }

  return selected;
}

export function selectConstrainedSurpriseRoast(
  category: Category | undefined,
  level: Level | undefined,
  randomIndex: (length: number) => number = cryptoRandomIndex,
): Roast {
  const selectedCategory = category ?? CATEGORIES[randomIndex(CATEGORIES.length)];
  const selectedLevel = level ?? LEVELS[randomIndex(LEVELS.length)];

  if (selectedCategory === undefined || selectedLevel === undefined) {
    throw new RangeError("random index was outside the surprise dimensions");
  }

  return selectRoast(selectedCategory, selectedLevel, randomIndex);
}

export function selectSurpriseRoast(
  randomIndex: (length: number) => number = cryptoRandomIndex,
): Roast {
  return selectConstrainedSurpriseRoast(undefined, undefined, randomIndex);
}
