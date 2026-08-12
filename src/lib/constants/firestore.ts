// ─── Firestore constants ──────────────────────────────────────────

/**
 * Maximum number of operations in a single Firestore writeBatch.
 * Firestore's hard limit is 500; we use 400 to leave headroom.
 */
export const FIRESTORE_BATCH_LIMIT = 400;

/**
 * Batch limit for loops that perform multiple operations per iteration.
 * E.g., user deletion does 2 updates per member doc (member + group),
 * so 200 × 2 = 400 operations, staying within the 500 limit.
 */
export const FIRESTORE_BATCH_LIMIT_MULTI_OP = 200;

// ─── Collection paths ─────────────────────────────────────────────

export const COLLECTIONS = {
  USERS: "users",
  USERNAMES: "usernames",
  GROUPS: "groups",
  CONFIG: "config",
} as const;

// ─── Config document paths ────────────────────────────────────────

export const CONFIG_DOCS = {
  EXCHANGE_RATES: "config/exchangeRates",
} as const;

// ─── Subcollection names ──────────────────────────────────────────

export const SUBCOLLECTIONS = {
  MEMBERS: "members",
  EXPENSES: "expenses",
  SETTLEMENTS: "settlements",
  ACTIVITIES: "activities",
  NOTIFICATIONS: "notifications",
  MESSAGES: "messages",
} as const;
