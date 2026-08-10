import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import type { SupportService } from "../interfaces/support-service";
import type {
  SupportTicket,
  SupportMessage,
  HelpArticle,
  SupportCategory,
  SupportPriority,
  SupportStatus,
  SupportTicketContext,
  SupportMessageRole,
} from "../../types";
import { toMillis } from "../../utils/date";

// Default priority per category — money-related issues get higher priority
const DEFAULT_PRIORITY: Record<SupportCategory, SupportPriority> = {
  bug: "urgent",
  calculation: "high",
  settlement: "high",
  expense: "medium",
  group_access: "medium",
  payment_info: "medium",
  account: "low",
  other: "low",
};

export class FirebaseSupportService implements SupportService {
  private async getCurrentUser() {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");
    return user;
  }

  private async getUserDoc(uid: string) {
    const userDoc = await getDoc(doc(db, "users", uid));
    return userDoc.data() as Record<string, unknown> | undefined;
  }

  private async requireSuperadmin(): Promise<void> {
    const user = await this.getCurrentUser();
    const data = await this.getUserDoc(user.uid);
    const role = (data?.role as string) ?? "user";
    if (role !== "superadmin") throw new Error("Access denied: superadmin only");
  }

  // ─── Tickets (user side) ───────────────────────────────────────

  async createTicket(data: {
    subject: string;
    description: string;
    category: SupportCategory;
    context?: SupportTicketContext;
  }): Promise<string> {
    const user = await this.getCurrentUser();
    const userData = await this.getUserDoc(user.uid);
    if (!userData) throw new Error("User profile not found");

    const now = Date.now();
    const priority = DEFAULT_PRIORITY[data.category] ?? "low";

    const ticketData = {
      userId: user.uid,
      userEmail: (userData.email as string) || "",
      userDisplayName: (userData.displayName as string) || "",
      userUsername: (userData.username as string) || "",
      subject: data.subject,
      description: data.description,
      category: data.category,
      priority,
      status: "open" as SupportStatus,
      context: data.context ?? {},
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
      resolvedBy: null,
      lastMessageAt: now,
      lastMessageBy: "user" as SupportMessageRole,
      unreadByUser: false,
      unreadByAdmin: true,
    };

    const ticketRef = await addDoc(collection(db, "supportTickets"), ticketData);

    // Add the initial message (the user's description) to the messages subcollection
    await setDoc(doc(collection(db, "supportTickets", ticketRef.id, "messages")), {
      fromUid: user.uid,
      fromName: (userData.displayName as string) || "",
      fromRole: "user" as SupportMessageRole,
      body: data.description,
      createdAt: now,
    });

    return ticketRef.id;
  }

  async getMyTickets(pageSize: number = 50, lastTicketId?: string): Promise<{ tickets: SupportTicket[]; hasMore: boolean; lastTicketId: string | null }> {
    const user = await this.getCurrentUser();
    let q = query(
      collection(db, "supportTickets"),
      where("userId", "==", user.uid),
      orderBy("updatedAt", "desc"),
      limit(pageSize)
    );

    if (lastTicketId) {
      const lastDoc = await getDoc(doc(db, "supportTickets", lastTicketId));
      if (lastDoc.exists()) {
        q = query(
          collection(db, "supportTickets"),
          where("userId", "==", user.uid),
          orderBy("updatedAt", "desc"),
          startAfter(lastDoc),
          limit(pageSize)
        );
      }
    }

    const snapshot = await getDocs(q);
    const tickets = snapshot.docs.map((d) => this.mapTicket(d.id, d.data()));
    return {
      tickets,
      hasMore: snapshot.size === pageSize,
      lastTicketId: snapshot.size > 0 ? snapshot.docs[snapshot.size - 1].id : null,
    };
  }

  async getTicket(ticketId: string): Promise<SupportTicket | null> {
    const user = await this.getCurrentUser();
    const ticketDoc = await getDoc(doc(db, "supportTickets", ticketId));
    if (!ticketDoc.exists()) return null;

    const data = ticketDoc.data();
    // User can only read their own ticket; superadmin can read any
    if ((data.userId as string) !== user.uid) {
      await this.requireSuperadmin();
    }
    return this.mapTicket(ticketDoc.id, data);
  }

  async markTicketReadByUser(ticketId: string): Promise<void> {
    const user = await this.getCurrentUser();
    const ticketDoc = await getDoc(doc(db, "supportTickets", ticketId));
    if (!ticketDoc.exists()) throw new Error("Ticket not found");
    if ((ticketDoc.data().userId as string) !== user.uid) {
      throw new Error("Access denied");
    }
    await updateDoc(doc(db, "supportTickets", ticketId), { unreadByUser: false });
  }

  // ─── Messages ──────────────────────────────────────────────────

  async getMessages(ticketId: string): Promise<SupportMessage[]> {
    const user = await this.getCurrentUser();
    // Verify access: user must own the ticket or be superadmin
    const ticketDoc = await getDoc(doc(db, "supportTickets", ticketId));
    if (!ticketDoc.exists()) throw new Error("Ticket not found");
    if ((ticketDoc.data().userId as string) !== user.uid) {
      await this.requireSuperadmin();
    }

    const snapshot = await getDocs(
      query(
        collection(db, "supportTickets", ticketId, "messages"),
        orderBy("createdAt", "asc"),
        limit(200)
      )
    );

    return snapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        messageId: d.id,
        fromUid: (data.fromUid as string) ?? "",
        fromName: (data.fromName as string) ?? "",
        fromRole: (data.fromRole as SupportMessageRole) ?? "user",
        body: (data.body as string) ?? "",
        createdAt: toMillis(data.createdAt),
      };
    });
  }

  async sendMessage(ticketId: string, body: string): Promise<void> {
    const user = await this.getCurrentUser();
    const userData = await this.getUserDoc(user.uid);

    const ticketDoc = await getDoc(doc(db, "supportTickets", ticketId));
    if (!ticketDoc.exists()) throw new Error("Ticket not found");
    if ((ticketDoc.data().userId as string) !== user.uid) {
      throw new Error("Access denied: you can only reply to your own tickets");
    }

    const now = Date.now();
    const ticketData = ticketDoc.data();

    await setDoc(doc(collection(db, "supportTickets", ticketId, "messages")), {
      fromUid: user.uid,
      fromName: (userData?.displayName as string) || "",
      fromRole: "user",
      body,
      createdAt: now,
    });

    // Update ticket: reopen if resolved/closed, mark unread for admin
    const update: Record<string, unknown> = {
      updatedAt: now,
      lastMessageAt: now,
      lastMessageBy: "user",
      unreadByAdmin: true,
      unreadByUser: false,
    };

    const currentStatus = (ticketData.status as string) ?? "open";
    if (currentStatus === "resolved" || currentStatus === "closed") {
      update.status = "open" as SupportStatus;
      update.resolvedAt = null;
      update.resolvedBy = null;
    }

    await updateDoc(doc(db, "supportTickets", ticketId), update);
  }

  // ─── Admin: tickets ────────────────────────────────────────────

  async getAllTickets(filter?: {
    status?: SupportStatus;
    category?: SupportCategory;
    priority?: SupportPriority;
  }, pageSize: number = 50, lastTicketId?: string): Promise<{ tickets: SupportTicket[]; hasMore: boolean; lastTicketId: string | null }> {
    await this.requireSuperadmin();

    const effectivePageSize = filter?.category || filter?.priority ? Math.max(pageSize * 3, 150) : pageSize;

    let q = query(
      collection(db, "supportTickets"),
      orderBy("updatedAt", "desc"),
      limit(effectivePageSize)
    );

    if (filter?.status) {
      q = query(
        collection(db, "supportTickets"),
        where("status", "==", filter.status),
        orderBy("updatedAt", "desc"),
        limit(effectivePageSize)
      );
    }

    if (lastTicketId) {
      const lastDoc = await getDoc(doc(db, "supportTickets", lastTicketId));
      if (lastDoc.exists()) {
        if (filter?.status) {
          q = query(
            collection(db, "supportTickets"),
            where("status", "==", filter.status),
            orderBy("updatedAt", "desc"),
            startAfter(lastDoc),
            limit(effectivePageSize)
          );
        } else {
          q = query(
            collection(db, "supportTickets"),
            orderBy("updatedAt", "desc"),
            startAfter(lastDoc),
            limit(effectivePageSize)
          );
        }
      }
    }

    const snapshot = await getDocs(q);
    let tickets = snapshot.docs.map((d) => this.mapTicket(d.id, d.data()));

    if (filter?.category) {
      tickets = tickets.filter((t) => t.category === filter.category);
    }
    if (filter?.priority) {
      tickets = tickets.filter((t) => t.priority === filter.priority);
    }

    const hasMore = snapshot.size === effectivePageSize && (!filter?.category || !filter?.priority || tickets.length >= pageSize);
    const lastId = snapshot.size > 0 ? snapshot.docs[snapshot.size - 1].id : null;
    return { tickets, hasMore, lastTicketId: lastId };
  }

  async updateTicketStatus(ticketId: string, status: SupportStatus): Promise<void> {
    await this.requireSuperadmin();
    const now = Date.now();
    const update: Record<string, unknown> = {
      status,
      updatedAt: now,
    };
    if (status === "resolved" || status === "closed") {
      update.resolvedAt = now;
      update.resolvedBy = auth.currentUser?.uid ?? "";
    } else {
      update.resolvedAt = null;
      update.resolvedBy = null;
    }
    await updateDoc(doc(db, "supportTickets", ticketId), update);
  }

  async updateTicketPriority(ticketId: string, priority: SupportPriority): Promise<void> {
    await this.requireSuperadmin();
    await updateDoc(doc(db, "supportTickets", ticketId), {
      priority,
      updatedAt: Date.now(),
    });
  }

  async markTicketReadByAdmin(ticketId: string): Promise<void> {
    await this.requireSuperadmin();
    await updateDoc(doc(db, "supportTickets", ticketId), { unreadByAdmin: false });
  }

  // ─── Admin: messages ───────────────────────────────────────────

  async sendAdminMessage(ticketId: string, body: string): Promise<void> {
    const user = await this.getCurrentUser();
    const userData = await this.getUserDoc(user.uid);
    await this.requireSuperadmin();

    const ticketDoc = await getDoc(doc(db, "supportTickets", ticketId));
    if (!ticketDoc.exists()) throw new Error("Ticket not found");

    const now = Date.now();
    const ticketData = ticketDoc.data();
    const currentStatus = (ticketData.status as string) ?? "open";

    await setDoc(doc(collection(db, "supportTickets", ticketId, "messages")), {
      fromUid: user.uid,
      fromName: (userData?.displayName as string) || "Admin",
      fromRole: "superadmin",
      body,
      createdAt: now,
    });

    // Update ticket status to in_progress if it was open, mark unread for user
    const update: Record<string, unknown> = {
      updatedAt: now,
      lastMessageAt: now,
      lastMessageBy: "superadmin",
      unreadByUser: true,
      unreadByAdmin: false,
    };

    if (currentStatus === "open") {
      update.status = "in_progress" as SupportStatus;
    } else if (currentStatus === "waiting_user") {
      // Admin sent another message while waiting — keep as waiting_user
    }

    await updateDoc(doc(db, "supportTickets", ticketId), update);

    // Send a notification to the user so they know admin responded
    const targetUid = (ticketData.userId as string) ?? "";
    if (targetUid) {
      await setDoc(doc(collection(db, "users", targetUid, "notifications")), {
        type: "support_response",
        title: "Support Update",
        body: `Admin responded to your ticket: "${(ticketData.subject as string) ?? ""}"`,
        read: false,
        createdAt: now,
        data: {
          ticketId,
          type: "support",
        },
      });
    }
  }

  // ─── Help articles ─────────────────────────────────────────────

  async getHelpArticles(): Promise<HelpArticle[]> {
    const snapshot = await getDocs(
      query(
        collection(db, "helpArticles"),
        where("active", "==", true),
        orderBy("order", "asc"),
        limit(100)
      )
    );
    return snapshot.docs.map((d) => this.mapArticle(d.id, d.data()));
  }

  async getAllHelpArticles(): Promise<HelpArticle[]> {
    await this.requireSuperadmin();
    const snapshot = await getDocs(
      query(
        collection(db, "helpArticles"),
        orderBy("order", "asc"),
        limit(200)
      )
    );
    return snapshot.docs.map((d) => this.mapArticle(d.id, d.data()));
  }

  async createHelpArticle(data: {
    title: string;
    content: string;
    category: string;
    tags: string[];
    order: number;
  }): Promise<string> {
    await this.requireSuperadmin();
    const now = Date.now();
    const ref = await addDoc(collection(db, "helpArticles"), {
      title: data.title,
      content: data.content,
      category: data.category,
      tags: data.tags,
      order: data.order,
      active: true,
      createdAt: now,
      updatedAt: now,
      createdBy: auth.currentUser?.uid ?? "",
    });
    return ref.id;
  }

  async updateHelpArticle(
    articleId: string,
    data: Partial<Pick<HelpArticle, "title" | "content" | "category" | "tags" | "order" | "active">>
  ): Promise<void> {
    await this.requireSuperadmin();
    const update: Record<string, unknown> = { ...data, updatedAt: Date.now() };
    await updateDoc(doc(db, "helpArticles", articleId), update);
  }

  async deleteHelpArticle(articleId: string): Promise<void> {
    await this.requireSuperadmin();
    await deleteDoc(doc(db, "helpArticles", articleId));
  }

  // ─── Helpers ───────────────────────────────────────────────────

  private mapTicket(id: string, data: Record<string, unknown>): SupportTicket {
    const ctx = (data.context as Record<string, unknown>) ?? {};
    return {
      ticketId: id,
      userId: (data.userId as string) ?? "",
      userEmail: (data.userEmail as string) ?? "",
      userDisplayName: (data.userDisplayName as string) ?? "",
      userUsername: (data.userUsername as string) ?? "",
      subject: (data.subject as string) ?? "",
      description: (data.description as string) ?? "",
      category: (data.category as SupportCategory) ?? "other",
      priority: (data.priority as SupportPriority) ?? "low",
      status: (data.status as SupportStatus) ?? "open",
      context: {
        groupId: (ctx.groupId as string) || undefined,
        groupName: (ctx.groupName as string) || undefined,
        expenseId: (ctx.expenseId as string) || undefined,
        screen: (ctx.screen as string) || undefined,
      },
      createdAt: toMillis(data.createdAt),
      updatedAt: toMillis(data.updatedAt),
      resolvedAt: data.resolvedAt ? toMillis(data.resolvedAt) : null,
      resolvedBy: (data.resolvedBy as string) || null,
      lastMessageAt: toMillis(data.lastMessageAt),
      lastMessageBy: (data.lastMessageBy as SupportMessageRole) || null,
      unreadByUser: (data.unreadByUser as boolean) ?? false,
      unreadByAdmin: (data.unreadByAdmin as boolean) ?? false,
    };
  }

  private mapArticle(id: string, data: Record<string, unknown>): HelpArticle {
    return {
      articleId: id,
      title: (data.title as string) ?? "",
      content: (data.content as string) ?? "",
      category: ((data.category as string) ?? "general") as HelpArticle["category"],
      tags: (data.tags as string[]) ?? [],
      order: (data.order as number) ?? 0,
      active: (data.active as boolean) ?? true,
      createdAt: toMillis(data.createdAt),
      updatedAt: toMillis(data.updatedAt),
      createdBy: (data.createdBy as string) ?? "",
    };
  }
}
