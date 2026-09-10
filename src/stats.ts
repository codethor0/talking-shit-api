import { ROASTS } from "./content/roasts";
import { CATEGORIES, LEVELS } from "./types";

export function getCatalogStats() {
  const categories = CATEGORIES.map((category) => {
    const levels = LEVELS.map((level) => ({
      level,
      count: ROASTS[category][level].length,
    }));

    return {
      category,
      total: levels.reduce((sum, item) => sum + item.count, 0),
      levels,
    };
  });

  return {
    total: categories.reduce((sum, item) => sum + item.total, 0),
    category_count: CATEGORIES.length,
    level_count: LEVELS.length,
    categories,
  };
}
