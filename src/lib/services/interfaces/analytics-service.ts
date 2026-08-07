import type { GroupAnalytics, UserAnalytics } from "../../types";

export interface AnalyticsService {
  getGroupAnalytics(groupId: string): Promise<GroupAnalytics>;
  getUserAnalytics(): Promise<UserAnalytics>;
}
