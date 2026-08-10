// ─── Household Category Definitions ──────────────────────────────
// Mirrors the Android HouseholdCategories.kt. Uses lucide-react icon
// component names as strings so the UI layer can map them to components.

export interface HouseholdCategory {
  key: string;
  label: string;
  icon: string;
  color: string;
  isIncome: boolean;
}

const EXPENSE_CATEGORIES: HouseholdCategory[] = [
  { key: "groceries", label: "Groceries", icon: "ShoppingCart", color: "#F97316", isIncome: false },
  { key: "vegetables", label: "Vegetables", icon: "Sprout", color: "#84CC16", isIncome: false },
  { key: "utilities", label: "Utilities", icon: "Zap", color: "#3B82F6", isIncome: false },
  { key: "rent", label: "Rent", icon: "Home", color: "#8B5CF6", isIncome: false },
  { key: "transport", label: "Transport", icon: "Car", color: "#06B6D4", isIncome: false },
  { key: "medical", label: "Medical", icon: "Stethoscope", color: "#EF4444", isIncome: false },
  { key: "education", label: "Education", icon: "GraduationCap", color: "#6366F1", isIncome: false },
  { key: "entertainment", label: "Entertainment", icon: "Film", color: "#EC4899", isIncome: false },
  { key: "dining", label: "Dining Out", icon: "Utensils", color: "#F59E0B", isIncome: false },
  { key: "shopping", label: "Shopping", icon: "ShoppingBag", color: "#A855F7", isIncome: false },
  { key: "household", label: "Household", icon: "Sparkles", color: "#14B8A6", isIncome: false },
  { key: "insurance", label: "Insurance", icon: "Shield", color: "#64748B", isIncome: false },
  { key: "other", label: "Other", icon: "Package", color: "#94A3B8", isIncome: false },
];

const INCOME_CATEGORIES: HouseholdCategory[] = [
  { key: "salary", label: "Salary", icon: "Briefcase", color: "#22C55E", isIncome: true },
  { key: "bonus", label: "Bonus", icon: "PartyPopper", color: "#F59E0B", isIncome: true },
  { key: "gift", label: "Gift", icon: "Gift", color: "#EC4899", isIncome: true },
  { key: "refund", label: "Refund", icon: "Undo2", color: "#3B82F6", isIncome: true },
  { key: "investment", label: "Investment", icon: "TrendingUp", color: "#14B8A6", isIncome: true },
  { key: "rental_income", label: "Rental Income", icon: "Building2", color: "#8B5CF6", isIncome: true },
  { key: "pension", label: "Pension", icon: "PersonStanding", color: "#6366F1", isIncome: true },
  { key: "other_income", label: "Other Income", icon: "Landmark", color: "#94A3B8", isIncome: true },
];

export const ALL_CATEGORIES: HouseholdCategory[] = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

const categoryMap = new Map<string, HouseholdCategory>(ALL_CATEGORIES.map((c) => [c.key, c]));

// ─── Lookup helpers ──────────────────────────────────────────────

export function getCategory(key: string): HouseholdCategory | undefined {
  return categoryMap.get(key);
}

export function getCategoryLabel(key: string): string {
  const category = categoryMap.get(key);
  if (category) return category.label;
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export function getCategoryColor(key: string): string {
  return categoryMap.get(key)?.color ?? "#94A3B8";
}

export function getCategoryIcon(key: string): string {
  return categoryMap.get(key)?.icon ?? "Package";
}

export function getCategories(isIncome: boolean): HouseholdCategory[] {
  return isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

// ─── Keyword map for auto-category suggestion ────────────────────

const KEYWORD_MAP: Record<string, string> = {
  // groceries
  grocery: "groceries", groceries: "groceries", supermarket: "groceries",
  "big bazaar": "groceries", bigbasket: "groceries", dmart: "groceries",
  reliance: "groceries", amazon: "groceries", flipkart: "groceries",
  provisions: "groceries", kirana: "groceries", store: "groceries",
  // vegetables
  vegetable: "vegetables", vegetables: "vegetables", sabzi: "vegetables",
  mandi: "vegetables", green: "vegetables", fruits: "vegetables",
  fruit: "vegetables", market: "vegetables",
  // utilities
  electric: "utilities", electricity: "utilities", bill: "utilities",
  water: "utilities", gas: "utilities", internet: "utilities",
  wifi: "utilities", broadband: "utilities", mobile: "utilities",
  recharge: "utilities", phone: "utilities", dth: "utilities",
  mseb: "utilities", bescom: "utilities", "tata power": "utilities",
  // rent
  rent: "rent", lease: "rent", landlord: "rent", maintenance: "rent",
  society: "rent", hoa: "rent",
  // transport
  petrol: "transport", diesel: "transport", fuel: "transport",
  uber: "transport", ola: "transport", auto: "transport",
  rickshaw: "transport", bus: "transport", metro: "transport",
  train: "transport", cab: "transport", taxi: "transport",
  parking: "transport", toll: "transport",
  // medical
  medicine: "medical", medicines: "medical", pharmacy: "medical",
  medical: "medical", doctor: "medical", hospital: "medical",
  clinic: "medical", health: "medical", lab: "medical",
  test: "medical", checkup: "medical", tablet: "medical",
  drug: "medical", apollo: "medical",
  // education
  school: "education", college: "education", tuition: "education",
  fees: "education", fee: "education", book: "education",
  books: "education", course: "education", exam: "education",
  uniform: "education", stationery: "education",
  // entertainment
  movie: "entertainment", cinema: "entertainment", netflix: "entertainment",
  hotstar: "entertainment", prime: "entertainment", ott: "entertainment",
  game: "entertainment", concert: "entertainment", show: "entertainment",
  ticket: "entertainment",
  // dining
  restaurant: "dining", food: "dining", lunch: "dining",
  dinner: "dining", breakfast: "dining", swiggy: "dining",
  zomato: "dining", pizza: "dining", burger: "dining",
  cafe: "dining", coffee: "dining", tea: "dining",
  snack: "dining", hotel: "dining", dine: "dining",
  // shopping
  clothes: "shopping", clothing: "shopping", shirt: "shopping",
  pant: "shopping", shoe: "shopping", shoes: "shopping",
  myntra: "shopping", mall: "shopping", dress: "shopping",
  furniture: "shopping", electronic: "shopping", gadget: "shopping",
  // household
  cleaning: "household", maid: "household", servant: "household",
  cook: "household", laundry: "household", wash: "household",
  repair: "household", plumber: "household", electrician: "household",
  carpenter: "household", paint: "household",
  // insurance
  insurance: "insurance", premium: "insurance", policy: "insurance",
  lic: "insurance", "health insurance": "insurance", "car insurance": "insurance",
  // salary
  salary: "salary", wage: "salary", paycheck: "salary",
  pay: "salary", income: "salary", stipend: "salary",
  // bonus
  bonus: "bonus", incentive: "bonus", commission: "bonus",
  reward: "bonus",
  // gift
  gift: "gift", present: "gift", donation: "gift",
  charity: "gift",
  // refund
  refund: "refund", return: "refund", cashback: "refund",
  reversal: "refund",
  // investment
  dividend: "investment", interest: "investment", "mutual fund": "investment",
  stock: "investment", share: "investment", profit: "investment",
  sip: "investment",
  // rental_income
  rental: "rental_income", tenant: "rental_income", "lease income": "rental_income",
  // pension
  pension: "pension", retirement: "pension", "social security": "pension",
  "provident fund": "pension", pf: "pension", epf: "pension",
};

/**
 * Suggests a category key based on the description text.
 * Returns null if no match found.
 */
export function suggestCategory(description: string): string | null {
  if (!description || description.trim().length === 0) return null;
  const lower = description.trim().toLowerCase();
  // Check multi-word phrases first (longer matches take priority)
  const sortedKeys = Object.keys(KEYWORD_MAP).sort((a, b) => b.length - a.length);
  for (const keyword of sortedKeys) {
    if (lower.includes(keyword)) {
      return KEYWORD_MAP[keyword];
    }
  }
  return null;
}

/**
 * Returns the list of category keys sorted by usage frequency (most used first).
 * Categories with no usage keep their default order.
 */
export function sortedByUsage(usageCount: Record<string, number>, isIncome: boolean): HouseholdCategory[] {
  const categories = getCategories(isIncome);
  return [...categories].sort((a, b) => (usageCount[b.key] ?? 0) - (usageCount[a.key] ?? 0));
}

// ─── Default split group categories (for non-household groups) ────

export const DEFAULT_CATEGORIES = ["food", "transport", "shopping", "turf", "accommodation", "other"];

export const DEFAULT_CATEGORY_LABELS: Record<string, string> = {
  food: "Food",
  transport: "Transport",
  shopping: "Shopping",
  turf: "Turf",
  accommodation: "Stay",
  other: "Other",
};

export const DEFAULT_CATEGORY_COLORS: Record<string, string> = {
  food: "#F97316",
  transport: "#3B82F6",
  shopping: "#A855F7",
  turf: "#22C55E",
  accommodation: "#EC4899",
  other: "#94A3B8",
};
