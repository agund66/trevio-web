"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { useServices } from "@/lib/services/service-provider";
import { TrevioLogo } from "@/components/trevio-logo";
import { BroadcastPopup } from "@/components/broadcast-popup";
import { Avatar } from "@/components/avatar";
import { Home, Bell, User, LogOut, Users, Shield, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/hooks/use-theme";
import { useFcmNotifications } from "@/lib/hooks/use-fcm-notifications";
import { OfflineBanner } from "@/components/offline-banner";
import { useTranslations } from "next-intl";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut, refreshUser } = useAuth();
  const { user: userService } = useServices();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, mode, toggleTheme } = useTheme();
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  useFcmNotifications();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login");
    } else if (user.blocked) {
      signOut();
    } else if (!user.acceptedTnC || !user.phoneNumber) {
      router.push("/login");
    } else if (!user.username) {
      // Auto-repair: generate missing username for existing users
      // who accepted TnC under old rules but username creation failed
      userService.acceptTnC().then(() => refreshUser()).catch(console.error);
    }
  }, [user, loading, router, userService, refreshUser, signOut]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-trevio-200 border-t-trevio-600" />
      </div>
    );
  }

  if (!user) return null;

  const desktopNavItems = [
    { href: "/dashboard", label: t("nav.home"), icon: Home },
    { href: "/groups", label: t("nav.groups"), icon: Users },
    { href: "/notifications", label: t("nav.notifications"), icon: Bell },
    ...(user.role === "superadmin" ? [{ href: "/admin", label: t("nav.admin"), icon: Shield }] : []),
  ];

  const mobileNavItems = [
    { href: "/dashboard", label: t("nav.home"), icon: Home },
    { href: "/groups", label: t("nav.groups"), icon: Users },
    { href: "/notifications", label: t("nav.notifications"), icon: Bell },
    { href: "/profile", label: t("nav.profile"), icon: User },
    ...(user.role === "superadmin" ? [{ href: "/admin", label: t("nav.admin"), icon: Shield }] : []),
  ];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <BroadcastPopup />
      {/* Sidebar - desktop */}
      <aside className="hidden md:flex w-64 flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 h-screen sticky top-0 shrink-0">
        <div className="flex h-16 items-center px-6 shrink-0">
          <TrevioLogo size="md" />
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {desktopNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  isActive ? "bg-trevio-50 dark:bg-trevio-900/30 text-trevio-700 dark:text-trevio-300" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 dark:border-slate-700 p-3 shrink-0">
          <Link
            href="/profile"
            className={`flex items-center gap-3 rounded-xl px-3 py-2 transition ${pathname === "/profile" ? "bg-trevio-50 dark:bg-trevio-900/30" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}
          >
            <Avatar photoURL={user.photoURL} displayName={user.displayName} className="h-9 w-9" />
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{user.displayName}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">@{user.username}</p>
            </div>
            <button
              onClick={(e) => { e.preventDefault(); toggleTheme(); }}
              className="rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title={tc('themeTitle', { mode, device: mode === "system" ? tc('themeDevice') : "" })}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </Link>
          <button
            onClick={signOut}
            className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <LogOut className="h-5 w-5" />
            {t("nav.signOut")}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 bg-slate-50 dark:bg-slate-950">
        <OfflineBanner />
        {children}

        {/* Bottom navigation - mobile */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] md:hidden">
          {mobileNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-lg px-4 py-1.5 transition",
                  isActive ? "text-trevio-600 dark:text-trevio-400" : "text-slate-400 dark:text-slate-500"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
