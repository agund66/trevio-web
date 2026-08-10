/** Removes non-numeric characters from a string, keeping digits and decimal point. */
export function sanitizeNumberInput(value: string): string {
  return value.replace(/[^0-9.]/g, "");
}

/** Removes non-numeric characters but allows math operators (+, -, *, /). */
export function sanitizeMathInput(value: string): string {
  return value.replace(/[^0-9.+\-*/]/g, "");
}

/** Normalizes a username: lowercase, only alphanumeric, dots, underscores. */
export function normalizeUsername(username: string): string {
  return username.toLowerCase().replace(/[^a-z0-9._]/g, "");
}

/** Removes all non-digit characters from a phone number. */
export function sanitizePhoneNumber(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** Capitalizes the first letter of a string. */
export function toTitleCase(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Case-insensitive substring search. */
export function caseInsensitiveIncludes(text: string, query: string): boolean {
  if (!query) return true;
  return text.toLowerCase().includes(query.toLowerCase());
}

/** Checks if a string is non-empty after trimming. */
export function isNonEmptyString(value: string | null | undefined): boolean {
  return !!value && value.trim().length > 0;
}

/** Generates a unique ID using timestamp + random string. */
export function generateId(prefix?: string): string {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  return prefix ? `${prefix}_${id}` : id;
}
