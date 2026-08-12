import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ServiceProvider } from "@/lib/services/service-provider";
import { QueryProvider } from "@/lib/query-provider";
import { I18nProvider } from "@/lib/i18n";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Trevio - Split bills. Simplify life.",
  description: "Split expenses with friends, track who owes whom, and settle up easily.",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0d9488",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const themeScript = `
    (function() {
      try {
        var stored = localStorage.getItem('trevio-theme') || 'system';
        var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        var isDark = stored === 'dark' || (stored === 'system' && prefersDark);
        if (isDark) document.documentElement.classList.add('dark');
      } catch(e) {}
    })();
  `;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={inter.className}>
        <QueryProvider>
          <I18nProvider>
            <ServiceProvider>{children}</ServiceProvider>
          </I18nProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
