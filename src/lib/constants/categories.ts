// ─── Category constants ───────────────────────────────────────────
// Category keys are stable identifiers stored in Firestore.
// Labels are locale keys (see locales/en/categories.json).
// Colors and icons are UI concerns, not localized.

export interface CategoryDefinition {
  key: string;
  /** Locale key for the category label */
  labelKey: string;
  icon: string;
  color: string;
  isIncome: boolean;
}

// ─── Household expense categories ─────────────────────────────────

export const HOUSEHOLD_EXPENSE_CATEGORIES: CategoryDefinition[] = [
  { key: "groceries", labelKey: "categories.groceries", icon: "ShoppingCart", color: "#F97316", isIncome: false },
  { key: "vegetables", labelKey: "categories.vegetables", icon: "Sprout", color: "#84CC16", isIncome: false },
  { key: "utilities", labelKey: "categories.utilities", icon: "Zap", color: "#3B82F6", isIncome: false },
  { key: "rent", labelKey: "categories.rent", icon: "Home", color: "#8B5CF6", isIncome: false },
  { key: "transport", labelKey: "categories.transport", icon: "Car", color: "#06B6D4", isIncome: false },
  { key: "medical", labelKey: "categories.medical", icon: "Stethoscope", color: "#EF4444", isIncome: false },
  { key: "education", labelKey: "categories.education", icon: "GraduationCap", color: "#6366F1", isIncome: false },
  { key: "entertainment", labelKey: "categories.entertainment", icon: "Film", color: "#EC4899", isIncome: false },
  { key: "dining", labelKey: "categories.dining", icon: "Utensils", color: "#F59E0B", isIncome: false },
  { key: "shopping", labelKey: "categories.shopping", icon: "ShoppingBag", color: "#A855F7", isIncome: false },
  { key: "household", labelKey: "categories.household", icon: "Sparkles", color: "#14B8A6", isIncome: false },
  { key: "insurance", labelKey: "categories.insurance", icon: "Shield", color: "#64748B", isIncome: false },
  { key: "other", labelKey: "categories.other", icon: "Package", color: "#94A3B8", isIncome: false },
];

// ─── Household income categories ──────────────────────────────────

export const HOUSEHOLD_INCOME_CATEGORIES: CategoryDefinition[] = [
  { key: "salary", labelKey: "categories.salary", icon: "Briefcase", color: "#22C55E", isIncome: true },
  { key: "bonus", labelKey: "categories.bonus", icon: "PartyPopper", color: "#F59E0B", isIncome: true },
  { key: "gift", labelKey: "categories.gift", icon: "Gift", color: "#EC4899", isIncome: true },
  { key: "refund", labelKey: "categories.refund", icon: "Undo2", color: "#3B82F6", isIncome: true },
  { key: "investment", labelKey: "categories.investment", icon: "TrendingUp", color: "#14B8A6", isIncome: true },
  { key: "rental_income", labelKey: "categories.rentalIncome", icon: "Building2", color: "#8B5CF6", isIncome: true },
  { key: "pension", labelKey: "categories.pension", icon: "PersonStanding", color: "#6366F1", isIncome: true },
  { key: "other_income", labelKey: "categories.otherIncome", icon: "Landmark", color: "#94A3B8", isIncome: true },
];

export const ALL_HOUSEHOLD_CATEGORIES: CategoryDefinition[] = [
  ...HOUSEHOLD_EXPENSE_CATEGORIES,
  ...HOUSEHOLD_INCOME_CATEGORIES,
];

// ─── Default split group categories (non-household) ───────────────

export const DEFAULT_CATEGORY_KEYS = ["food", "transport", "shopping", "turf", "accommodation", "other"];

export const DEFAULT_CATEGORY_LABEL_KEYS: Record<string, string> = {
  food: "categories.food",
  transport: "categories.transport",
  shopping: "categories.shopping",
  turf: "categories.turf",
  accommodation: "categories.accommodation",
  other: "categories.other",
};

export const DEFAULT_CATEGORY_COLORS: Record<string, string> = {
  food: "#F97316",
  transport: "#3B82F6",
  shopping: "#A855F7",
  turf: "#22C55E",
  accommodation: "#EC4899",
  other: "#94A3B8",
};

// ─── Lookup maps ──────────────────────────────────────────────────

const householdCategoryMap = new Map<string, CategoryDefinition>(
  ALL_HOUSEHOLD_CATEGORIES.map((c) => [c.key, c])
);

export function getHouseholdCategory(key: string): CategoryDefinition | undefined {
  return householdCategoryMap.get(key);
}

export function getHouseholdCategories(isIncome: boolean): CategoryDefinition[] {
  return isIncome ? HOUSEHOLD_INCOME_CATEGORIES : HOUSEHOLD_EXPENSE_CATEGORIES;
}
