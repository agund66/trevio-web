"use client";

import { NextIntlClientProvider } from "next-intl";
import { ReactNode } from "react";
import en from "@/locales/en";
import { DEFAULT_LOCALE } from "./config";

/**
 * Wraps the app with next-intl's client provider.
 * Currently hardcoded to English. When additional locales are added,
 * this will accept a `locale` prop and load the appropriate messages.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale={DEFAULT_LOCALE} messages={en}>
      {children}
    </NextIntlClientProvider>
  );
}
