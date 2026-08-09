import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  getDoc,
  Timestamp,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import type { BroadcastService } from "../interfaces/broadcast-service";
import type { BroadcastMessage, BroadcastPriority, BroadcastTargetType } from "../../types";

function toMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = new Date(value).getTime();
    return isNaN(parsed) ? 0 : parsed;
  }
  if (value && typeof value === "object") {
    const seconds = (value as { _seconds?: number; seconds?: number })._seconds ?? (value as { seconds?: number }).seconds;
    const nanoseconds = (value as { _nanoseconds?: number; nanoseconds?: number })._nanoseconds ?? (value as { nanoseconds?: number }).nanoseconds;
    if (typeof seconds === "number") return seconds * 1000 + (typeof nanoseconds === "number" ? nanoseconds / 1_000_000 : 0);
  }
  return 0;
}

export class FirebaseBroadcastService implements BroadcastService {
  private async requireSuperadmin(): Promise<void> {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) throw new Error("User not authenticated");
    const currentUserDoc = await getDoc(doc(db, "users", currentUid));
    const currentRole = (currentUserDoc.data()?.role as string) ?? "user";
    if (currentRole !== "superadmin") throw new Error("Access denied: superadmin only");
  }

  async createBroadcast(data: {
    title: string;
    htmlContent: string;
    priority: BroadcastPriority;
    targetType: BroadcastTargetType;
    targetUids: string[];
    startAt: number;
    endAt: number | null;
  }): Promise<string> {
    await this.requireSuperadmin();
    const currentUser = auth.currentUser;
    const ref = await addDoc(collection(db, "broadcasts"), {
      title: data.title,
      htmlContent: data.htmlContent,
      priority: data.priority,
      targetType: data.targetType,
      targetUids: data.targetUids,
      startAt: data.startAt,
      endAt: data.endAt,
      active: true,
      createdBy: currentUser?.uid || "",
      createdByName: currentUser?.displayName || "",
      createdAt: Date.now(),
      stoppedAt: null,
    });
    return ref.id;
  }

  async getAllBroadcasts(): Promise<BroadcastMessage[]> {
    await this.requireSuperadmin();
    const snapshot = await getDocs(
      query(collection(db, "broadcasts"), orderBy("createdAt", "desc"), limit(100))
    );
    return snapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        title: (data.title as string) || "",
        htmlContent: (data.htmlContent as string) || "",
        priority: (data.priority as BroadcastMessage["priority"]) || "info",
        targetType: (data.targetType as BroadcastMessage["targetType"]) || "all",
        targetUids: (data.targetUids as string[]) || [],
        startAt: toMillis(data.startAt),
        endAt: data.endAt != null ? toMillis(data.endAt) : null,
        active: (data.active as boolean) ?? true,
        createdBy: (data.createdBy as string) || "",
        createdByName: (data.createdByName as string) || "",
        createdAt: toMillis(data.createdAt),
        stoppedAt: data.stoppedAt != null ? toMillis(data.stoppedAt) : null,
      } as BroadcastMessage;
    });
  }

  async stopBroadcast(id: string): Promise<void> {
    await this.requireSuperadmin();
    await updateDoc(doc(db, "broadcasts", id), {
      active: false,
      stoppedAt: Date.now(),
    });
  }

  async getReadCount(broadcastId: string): Promise<number> {
    const snapshot = await getDocs(
      query(collection(db, "broadcasts", broadcastId, "reads"), limit(500))
    );
    return snapshot.size;
  }

  async getBroadcastReads(broadcastId: string): Promise<{ uid: string; readAt: number }[]> {
    const snapshot = await getDocs(
      query(collection(db, "broadcasts", broadcastId, "reads"), limit(500))
    );
    return snapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        uid: (data.uid as string) || d.id,
        readAt: toMillis(data.readAt),
      };
    });
  }

  async getActiveBroadcastsForUser(
    uid: string,
    isBlocked: boolean
  ): Promise<BroadcastMessage[]> {
    const now = Date.now();
    const snapshot = await getDocs(
      query(
        collection(db, "broadcasts"),
        where("active", "==", true),
        where("startAt", "<=", now),
        limit(50)
      )
    );

    const broadcasts = snapshot.docs
      .map((d) => {
        const data = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          title: (data.title as string) || "",
          htmlContent: (data.htmlContent as string) || "",
          priority: (data.priority as BroadcastMessage["priority"]) || "info",
          targetType: (data.targetType as BroadcastMessage["targetType"]) || "all",
          targetUids: (data.targetUids as string[]) || [],
          startAt: toMillis(data.startAt),
          endAt: data.endAt != null ? toMillis(data.endAt) : null,
          active: (data.active as boolean) ?? true,
          createdBy: (data.createdBy as string) || "",
          createdByName: (data.createdByName as string) || "",
          createdAt: toMillis(data.createdAt),
          stoppedAt: data.stoppedAt != null ? toMillis(data.stoppedAt) : null,
        } as BroadcastMessage;
      })
      .filter((b) => b.endAt === null || b.endAt >= now);

    return broadcasts.filter((b) => {
      if (b.createdBy === uid) return false;
      switch (b.targetType) {
        case "all":
          return true;
        case "all_except_blocked":
          return !isBlocked;
        case "specific":
          return b.targetUids.includes(uid);
        default:
          return false;
      }
    });
  }

  async getUnreadBroadcastsForUser(
    uid: string,
    isBlocked: boolean
  ): Promise<BroadcastMessage[]> {
    const active = await this.getActiveBroadcastsForUser(uid, isBlocked);

    const readDocs = await Promise.all(
      active.map((b) => getDoc(doc(db, "broadcasts", b.id, "reads", uid)))
    );

    const unread: BroadcastMessage[] = [];
    active.forEach((b, i) => {
      if (!readDocs[i].exists()) {
        unread.push(b);
      }
    });

    return unread;
  }

  async acknowledgeBroadcast(broadcastId: string, uid: string): Promise<void> {
    await setDoc(doc(db, "broadcasts", broadcastId, "reads", uid), {
      uid,
      readAt: Date.now(),
    });
  }
}
