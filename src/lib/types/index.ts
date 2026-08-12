export type SplitType = "equal" | "exact" | "percent" | "shares" | "itemized";
export type GroupTemplate = "trip" | "turf" | "casual" | "household";
export type SettlementMethod = "upi" | "cash" | "other";
export type TransactionType = "expense" | "income";

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
  monthlyBudget?: number;
  budgetCategories?: Record<string, number>;
}

export interface Member {
  uid: string;
  displayName: string;
  username: string;
  photoURL: string;
  balance: number;
  role: string;
  status: string;
  isOffline?: boolean;
}

export interface SplitEntry {
  amount: number;
  shareValue?: number;
}

export interface BillItem {
  itemId: string;
  name: string;
  amount: number;
  assignedTo: string[];
}

export interface ItemizedSplitData {
  items: BillItem[];
  taxAmount?: number;
  tipAmount?: number;
  taxSplitMode?: "proportional" | "equal";
  tipSplitMode?: "proportional" | "equal";
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
  date?: number;
  note?: string;
  recurring?: RecurringConfig;
  itemizedData?: ItemizedSplitData;
  transactionType?: TransactionType;
  originalAmount?: number;
  originalCurrency?: string;
}

export type RecurringFrequency = "weekly" | "monthly";

export interface RecurringConfig {
  frequency: RecurringFrequency;
  endDate?: number;
  nextDueDate?: number;
  parentExpenseId?: string;
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
  date?: number;
  createdBy?: string;
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

export interface CategoryBreakdown {
  category: string;
  totalAmount: number;
  expenseCount: number;
  percentage: number;
}

export interface MonthlyTrend {
  month: string;
  label: string;
  totalAmount: number;
  expenseCount: number;
}

export interface MemberSpending {
  uid: string;
  displayName: string;
  photoURL: string;
  totalPaid: number;
  totalShare: number;
  expenseCount: number;
  netBalance: number;
}

export interface GroupAnalytics {
  groupId: string;
  groupName: string;
  totalExpenses: number;
  expenseCount: number;
  categoryBreakdown: CategoryBreakdown[];
  monthlyTrends: MonthlyTrend[];
  memberSpending: MemberSpending[];
  avgExpenseAmount: number;
  highestExpense: { description: string; amount: number; date: number } | null;
  recentActivityRate: number;
}

export interface UserAnalytics {
  totalSpent: number;
  totalPaid: number;
  totalOwed: number;
  totalOwing: number;
  netBalance: number;
  groupCount: number;
  expenseCount: number;
  categoryBreakdown: CategoryBreakdown[];
  monthlyTrends: MonthlyTrend[];
  topGroups: { groupId: string; groupName: string; totalSpent: number; expenseCount: number }[];
}

export interface TripItineraryItem {
  itemId: string;
  title: string;
  description: string;
  date: number;
  location: string;
  latitude?: number;
  longitude?: number;
  category: string;
  estimatedCost: number;
  estimatedCostCurrency?: string;
  assignedTo: string[];
  completed: boolean;
}

export interface TripDay {
  date: number;
  label: string;
  items: TripItineraryItem[];
  totalEstimatedCost: number;
}

export interface TripLocation {
  locationId: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  category: string;
  visitedOn?: number;
  expenseId?: string;
}

export interface TripData {
  startDate: number;
  endDate: number;
  destination: string;
  coverPhotoURL: string;
  itinerary: TripItineraryItem[];
  locations: TripLocation[];
}

// ─── Support System ──────────────────────────────────────────────

export type SupportCategory =
  | "calculation"
  | "settlement"
  | "expense"
  | "group_access"
  | "payment_info"
  | "account"
  | "bug"
  | "other";

export type SupportPriority = "low" | "medium" | "high" | "urgent";

export type SupportStatus = "open" | "in_progress" | "waiting_user" | "resolved" | "closed";

export type SupportMessageRole = "user" | "superadmin";

export interface SupportTicketContext {
  groupId?: string;
  groupName?: string;
  expenseId?: string;
  screen?: string;
}

export interface SupportTicket {
  ticketId: string;
  userId: string;
  userEmail: string;
  userDisplayName: string;
  userUsername: string;
  subject: string;
  description: string;
  category: SupportCategory;
  priority: SupportPriority;
  status: SupportStatus;
  context: SupportTicketContext;
  createdAt: number;
  updatedAt: number;
  resolvedAt: number | null;
  resolvedBy: string | null;
  lastMessageAt: number;
  lastMessageBy: SupportMessageRole | null;
  unreadByUser: boolean;
  unreadByAdmin: boolean;
}

export interface SupportMessage {
  messageId: string;
  fromUid: string;
  fromName: string;
  fromRole: SupportMessageRole;
  body: string;
  createdAt: number;
}

export interface HelpArticle {
  articleId: string;
  title: string;
  content: string;
  category: SupportCategory | "general";
  tags: string[];
  order: number;
  active: boolean;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

// ─── Household Analytics ─────────────────────────────────────────

export interface DailySummary {
  date: number;
  dateLabel: string;
  totalSpent: number;
  totalReceived: number;
  netAmount: number;
  entryCount: number;
  entries: Expense[];
}

export interface MemberContribution {
  uid: string;
  displayName: string;
  photoURL: string;
  totalSpent: number;
  totalReceived: number;
  entryCount: number;
  spentPercentage: number;
  rank: number;
}

export interface DailyTrend {
  day: number;
  date: number;
  totalSpent: number;
  totalReceived: number;
}

export interface MonthComparison {
  lastMonthSpent: number;
  spentChange: number;
  spentChangePercent: number;
  lastMonthReceived: number;
  receivedChange: number;
}

export interface MonthlyReport {
  month: string;
  monthLabel: string;
  totalSpent: number;
  totalReceived: number;
  netAmount: number;
  entryCount: number;
  spentByCategory: CategoryBreakdown[];
  receivedByCategory: CategoryBreakdown[];
  memberContributions: MemberContribution[];
  dailyTrend: DailyTrend[];
  budget?: number;
  budgetProgress: number;
  budgetRemaining: number;
  comparisonWithLastMonth?: MonthComparison;
}

export interface HouseholdGamification {
  loggingStreak: number;
  streakStartDate?: number;
  monthlyBadge?: string;
  participationToday: number;
  membersLoggedToday: number;
  totalMembers: number;
  insightMessage?: string;
}
