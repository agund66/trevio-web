import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ServiceProvider } from "@/lib/services/service-provider";
import { QueryProvider } from "@/lib/query-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Trevio - Split bills. Simplify life.",
  description: "Split expenses with friends, track who owes whom, and settle up easily.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
          <ServiceProvider>{children}</ServiceProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
