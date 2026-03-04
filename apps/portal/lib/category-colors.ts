/**
 * Category Color Mapping
 * 
 * Maps category IDs to color schemes for use in listing cards and UI components
 */

interface CategoryColorScheme {
  bg: string;
  text: string;
  border: string;
}

const CATEGORY_COLORS: Record<string, CategoryColorScheme> = {
  "pet-care-services": {
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-200 dark:border-orange-800",
  },
  "health-wellness": {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-300",
    border: "border-green-200 dark:border-green-800",
  },
  "training-behavior": {
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800",
  },
  "pet-retail": {
    bg: "bg-pink-100 dark:bg-pink-900/30",
    text: "text-pink-700 dark:text-pink-300",
    border: "border-pink-200 dark:border-pink-800",
  },
  "specialist-services": {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
  },
  "rescue-community": {
    bg: "bg-teal-100 dark:bg-teal-900/30",
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-200 dark:border-teal-800",
  },
  "events-experiences": {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
  },
};

/**
 * Get color scheme for a category
 * Returns default orange colors if category not found
 */
export function getCategoryColorScheme(
  categoryId?: string
): CategoryColorScheme {
  if (!categoryId) {
    return CATEGORY_COLORS["pet-care-services"]; // default fallback
  }

  return (
    CATEGORY_COLORS[categoryId] || CATEGORY_COLORS["pet-care-services"]
  );
}

/**
 * Get all category colors
 */
export function getAllCategoryColors(): Record<string, CategoryColorScheme> {
  return CATEGORY_COLORS;
}

export default CATEGORY_COLORS;
