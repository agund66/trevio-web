"use client";

import { createContext, useContext, ReactNode } from "react";
import type { AuthService } from "./interfaces/auth-service";
import type { UserService } from "./interfaces/user-service";
import type { GroupService } from "./interfaces/group-service";
import type { ExpenseService } from "./interfaces/expense-service";
import type { SettlementService } from "./interfaces/settlement-service";
import type { NotificationService } from "./interfaces/notification-service";
import type { ExchangeRateService } from "./interfaces/exchange-rate-service";
import type { AdminService } from "./interfaces/admin-service";
import type { BroadcastService } from "./interfaces/broadcast-service";
import type { AnalyticsService } from "./interfaces/analytics-service";
import type { TripService } from "./interfaces/trip-service";
import type { SupportService } from "./interfaces/support-service";
import type { KarmaService } from "./interfaces/karma-service";
import type { NudgeService } from "./interfaces/nudge-service";
import type { WrappedService } from "./interfaces/wrapped-service";
import { FirebaseAuthService } from "./firebase/firebase-auth-service";
import { FirebaseUserService } from "./firebase/firebase-user-service";
import { FirebaseGroupService } from "./firebase/firebase-group-service";
import { FirebaseExpenseService } from "./firebase/firebase-expense-service";
import { FirebaseSettlementService } from "./firebase/firebase-settlement-service";
import { FirebaseNotificationService } from "./firebase/firebase-notification-service";
import { FirebaseExchangeRateService } from "./firebase/firebase-exchange-rate-service";
import { FirebaseAdminService } from "./firebase/firebase-admin-service";
import { FirebaseBroadcastService } from "./firebase/firebase-broadcast-service";
import { FirebaseAnalyticsService } from "./firebase/firebase-analytics-service";
import { FirebaseTripService } from "./firebase/firebase-trip-service";
import { FirebaseSupportService } from "./firebase/firebase-support-service";
import { FirebaseKarmaService } from "./firebase/firebase-karma-service";
import { FirebaseNudgeService } from "./firebase/firebase-nudge-service";
import { FirebaseWrappedService } from "./firebase/firebase-wrapped-service";
import { withNetworkErrorMapping } from "@/lib/utils/error-mapper";

interface Services {
  auth: AuthService;
  user: UserService;
  group: GroupService;
  expense: ExpenseService;
  settlement: SettlementService;
  notification: NotificationService;
  exchangeRate: ExchangeRateService;
  admin: AdminService;
  broadcast: BroadcastService;
  analytics: AnalyticsService;
  trip: TripService;
  support: SupportService;
  karma: KarmaService;
  nudge: NudgeService;
  wrapped: WrappedService;
}

const firebaseServices: Services = {
  auth: withNetworkErrorMapping(new FirebaseAuthService()),
  user: withNetworkErrorMapping(new FirebaseUserService()),
  group: withNetworkErrorMapping(new FirebaseGroupService()),
  expense: withNetworkErrorMapping(new FirebaseExpenseService()),
  settlement: withNetworkErrorMapping(new FirebaseSettlementService()),
  notification: withNetworkErrorMapping(new FirebaseNotificationService()),
  exchangeRate: withNetworkErrorMapping(new FirebaseExchangeRateService()),
  admin: withNetworkErrorMapping(new FirebaseAdminService()),
  broadcast: withNetworkErrorMapping(new FirebaseBroadcastService()),
  analytics: withNetworkErrorMapping(new FirebaseAnalyticsService()),
  trip: withNetworkErrorMapping(new FirebaseTripService()),
  support: withNetworkErrorMapping(new FirebaseSupportService()),
  karma: withNetworkErrorMapping(new FirebaseKarmaService()),
  nudge: withNetworkErrorMapping(new FirebaseNudgeService()),
  wrapped: withNetworkErrorMapping(new FirebaseWrappedService()),
};

const ServiceContext = createContext<Services>(firebaseServices);

export function ServiceProvider({ children }: { children: ReactNode }) {
  return <ServiceContext.Provider value={firebaseServices}>{children}</ServiceContext.Provider>;
}

export function useServices(): Services {
  return useContext(ServiceContext);
}
