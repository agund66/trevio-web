// ─── React Query key factory ──────────────────────────────────────
// Centralized query keys to prevent drift across components.

export const queryKeys = {
  // User
  publicProfile: (uid: string) => ["publicProfile", uid] as const,
  currentUser: ["currentUser"] as const,

  // Groups
  groups: ["groups"] as const,
  groupInfo: (groupId: string) => ["groupInfo", groupId] as const,
  members: (groupId: string) => ["members", groupId] as const,
  expenses: (groupId: string) => ["expenses", groupId] as const,
  activities: (groupId: string) => ["activities", groupId] as const,
  debts: (groupId: string) => ["debts", groupId] as const,
  settlementHistory: (groupId: string) => ["settlementHistory", groupId] as const,
  tripData: (groupId: string) => ["tripData", groupId] as const,

  // Balances (cross-group)
  balances: ["balances"] as const,

  // Exchange rates
  exchangeRates: ["exchangeRates"] as const,

  // Notifications
  notifications: ["notifications"] as const,

  // Support
  helpArticles: ["helpArticles"] as const,
  myTickets: ["myTickets"] as const,
  ticket: (ticketId: string) => ["ticket", ticketId] as const,
  ticketMessages: (ticketId: string) => ["ticketMessages", ticketId] as const,

  // Admin
  adminUsers: ["adminUsers"] as const,
  adminTickets: ["adminTickets"] as const,
  adminTicketMessages: (ticketId: string) => ["adminTicketMessages", ticketId] as const,
  adminArticles: ["adminArticles"] as const,

  // Household
  householdSummary: (groupId: string) => ["householdSummary", groupId] as const,
} as const;
