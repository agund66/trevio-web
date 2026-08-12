import { Timestamp } from "firebase/firestore";
import { getLocaleForCurrency } from "./currency";
import { BASE_CURRENCY } from "../constants/currency";

// ─── Time constants ──────────────────────────────────────────────
export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = 60 * MS_PER_SECOND;
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;
export const MS_PER_DAY = 24 * MS_PER_HOUR;

// ─── Month labels ────────────────────────────────────────────────
export const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const FULL_MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ─── Core date helpers ───────────────────────────────────────────

/** Converts any Firestore date value to milliseconds. Handles Timestamp, Date, number, string, and object. */
export function toMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = new Date(value).getTime();
    return isNaN(parsed) ? 0 : parsed;
  }
  if (value && typeof value === "object") {
    const seconds = (value as { _seconds?: number; seconds?: number })._seconds ?? (value as { seconds?: number }).seconds;
    const nanoseconds = (value as { _nanoseconds?: number; nanoseconds?: number })._nanoseconds ?? (value as { nanoseconds?: number }).nanoseconds;
    if (typeof seconds === "number") return seconds * 1000 + (typeof nanoseconds === "number" ? nanoseconds / 1_000_000 : 0);
  }
  return 0;
}

/** Returns true if two timestamps fall on the same calendar day (in local time). */
export function isSameDay(timestamp1: number, timestamp2: number): boolean {
  if (timestamp1 <= 0 || timestamp2 <= 0) return false;
  const d1 = new Date(timestamp1);
  const d2 = new Date(timestamp2);
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

/** Returns true if the timestamp falls in the given year/month (0-indexed month). */
export function isSameMonth(timestamp: number, year: number, month: number): boolean {
  if (timestamp <= 0) return false;
  const d = new Date(timestamp);
  return d.getFullYear() === year && d.getMonth() === month;
}

/** Returns a Date set to the start of the given date's day (midnight local time). */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Formats a timestamp as YYYY-MM-DD for HTML date inputs. */
export function formatDateToISO(timestamp: number): string {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ─── Display formatters ──────────────────────────────────────────

/** Formats a timestamp as a short date (e.g., "Mon, Jan 15"). */
export function formatShortDate(timestamp: number, currency: string = BASE_CURRENCY): string {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleDateString(getLocaleForCurrency(currency), {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Formats a timestamp as a full date with time (e.g., "Mon, Jan 15, 2024 · 3:45 PM"). */
export function formatFullDate(timestamp: number, currency: string = BASE_CURRENCY): string {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleDateString(getLocaleForCurrency(currency), {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Formats a timestamp as time only (e.g., "3:45 PM"). */
export function formatTime(timestamp: number, currency: string = BASE_CURRENCY): string {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleTimeString(getLocaleForCurrency(currency), {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Formats a timestamp as a relative time string (e.g., "just now", "5m ago", "3h ago", "2d ago"). */
export function formatRelativeTime(timestamp: number, currency: string = BASE_CURRENCY): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / MS_PER_MINUTE);
  const diffHours = Math.floor(diffMs / MS_PER_HOUR);
  const diffDays = Math.floor(diffMs / MS_PER_DAY);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(getLocaleForCurrency(currency));
}
