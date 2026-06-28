"use client";

import { createContext, useContext, ReactNode } from "react";
import type { AuthService } from "./interfaces/auth-service";
import type { UserService } from "./interfaces/user-service";
import type { GroupService } from "./interfaces/group-service";
import type { ExpenseService } from "./interfaces/expense-service";
import type { SettlementService } from "./interfaces/settlement-service";
import type { NotificationService } from "./interfaces/notification-service";
import { FirebaseAuthService } from "./firebase/firebase-auth-service";
import { FirebaseUserService } from "./firebase/firebase-user-service";
import { FirebaseGroupService } from "./firebase/firebase-group-service";
import { FirebaseExpenseService } from "./firebase/firebase-expense-service";
import { FirebaseSettlementService } from "./firebase/firebase-settlement-service";
import { FirebaseNotificationService } from "./firebase/firebase-notification-service";

interface Services {
  auth: AuthService;
  user: UserService;
  group: GroupService;
  expense: ExpenseService;
  settlement: SettlementService;
  notification: NotificationService;
}

const firebaseServices: Services = {
  auth: new FirebaseAuthService(),
  user: new FirebaseUserService(),
  group: new FirebaseGroupService(),
  expense: new FirebaseExpenseService(),
  settlement: new FirebaseSettlementService(),
  notification: new FirebaseNotificationService(),
};

const ServiceContext = createContext<Services>(firebaseServices);

export function ServiceProvider({ children }: { children: ReactNode }) {
  return <ServiceContext.Provider value={firebaseServices}>{children}</ServiceContext.Provider>;
}

export function useServices(): Services {
  return useContext(ServiceContext);
}
