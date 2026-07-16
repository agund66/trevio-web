import type {
  BroadcastMessage,
  BroadcastPriority,
  BroadcastTargetType,
} from "../../types";

export interface BroadcastService {
  createBroadcast(data: {
    title: string;
    htmlContent: string;
    priority: BroadcastPriority;
    targetType: BroadcastTargetType;
    targetUids: string[];
    startAt: number;
    endAt: number | null;
  }): Promise<string>;

  getAllBroadcasts(): Promise<BroadcastMessage[]>;
  stopBroadcast(id: string): Promise<void>;
  getReadCount(broadcastId: string): Promise<number>;
  getBroadcastReads(broadcastId: string): Promise<{ uid: string; readAt: number }[]>;

  getActiveBroadcastsForUser(
    uid: string,
    isBlocked: boolean
  ): Promise<BroadcastMessage[]>;

  getUnreadBroadcastsForUser(
    uid: string,
    isBlocked: boolean
  ): Promise<BroadcastMessage[]>;

  acknowledgeBroadcast(broadcastId: string, uid: string): Promise<void>;
}
