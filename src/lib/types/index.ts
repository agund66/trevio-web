export type SplitType = "equal" | "exact" | "percent" | "shares";
export type GroupTemplate = "trip" | "turf" | "casual";
export type SettlementMethod = "upi" | "cash" | "other";

export type UserRole = "user" | "superadmin";

export interface User {
  uid: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  username: string;
  photoURL: string;
  defaultCurrency: string;
  acceptedTnC: boolean;
  role: UserRole;
  blocked: boolean;
  upiId?: string;
  phoneNumber?: string;
  countryCode?: string;
}

export interface Group {
  groupId: string;
  name: string;
  description: string;
  template: GroupTemplate;
  currency: string;
  createdBy: string;
  inviteCode: string;
  memberCount: number;
  totalExpenses: number;
  yourBalance: number;
  yourRole: string;
  archived: boolean;
}

export interface Member {
  uid: string;
  displayName: string;
  username: string;
  photoURL: string;
  balance: number;
  role: string;
  status: string;
}

export interface SplitEntry {
  amount: number;
  shareValue?: number;
}

export interface Expense {
  expenseId: string;
  description: string;
  amount: number;
  currency: string;
  paidBy: string;
  splitType: SplitType;
  splits: Record<string, SplitEntry>;
  category: string;
  createdBy: string;
  exchangeRateToBase?: number;
}

export interface Settlement {
  settlementId: string;
  fromUid: string;
  toUid: string;
  fromName: string;
  toName: string;
  amount: number;
  currency: string;
  method: SettlementMethod;
  upiRefId: string;
}

export interface SimplifiedDebt {
  fromUid: string;
  toUid: string;
  fromName: string;
  toName: string;
  fromPhotoURL: string;
  toPhotoURL: string;
  toUpiId: string;
  fromUpiId: string;
  toPhoneNumber: string;
  toCountryCode: string;
  amount: number;
}

export interface Activity {
  activityId: string;
  type: string;
  description: string;
  userId: string;
  userName: string;
  userPhotoURL: string;
  data: Record<string, unknown>;
  createdAt: number;
}

export interface AppNotification {
  notificationId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: number;
  data: Record<string, string>;
}

export interface UserSearchResult {
  uid: string;
  username: string;
  displayName: string;
  photoURL: string;
}

export type BroadcastPriority = "critical" | "maintenance" | "info";
export type BroadcastTargetType = "all" | "all_except_blocked" | "specific";

export interface BroadcastMessage {
  id: string;
  title: string;
  htmlContent: string;
  priority: BroadcastPriority;
  targetType: BroadcastTargetType;
  targetUids: string[];
  startAt: number;
  endAt: number | null;
  active: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: number;
  stoppedAt: number | null;
}

export interface BroadcastRead {
  uid: string;
  readAt: number;
}
