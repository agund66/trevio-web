// ─── i18n configuration ───────────────────────────────────────────

export const LOCALES = ["en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Locales supported by the app for display in the UI */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
};
