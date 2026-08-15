// ─── App-wide constants ───────────────────────────────────────────

export const APP_NAME = "Trevio";

/** Default React Query stale time (1 minute) */
export const DEFAULT_STALE_TIME = 60 * 1000;

/** Exchange rate stale time (1 hour) — rates don't change frequently */
export const EXCHANGE_RATE_STALE_TIME = 1000 * 60 * 60;

/** Group info stale time (5 minutes) — group metadata changes infrequently */
export const GROUP_INFO_STALE_TIME = 5 * 60 * 1000;

/** User profile stale time (2 minutes) */
export const USER_PROFILE_STALE_TIME = 2 * 60 * 1000;

/** Default page size for paginated queries */
export const DEFAULT_PAGE_SIZE = 20;

/** Maximum number of members allowed in a single group */
export const MAX_GROUP_MEMBERS = 100;
