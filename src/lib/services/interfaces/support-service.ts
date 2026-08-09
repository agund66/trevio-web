import type {
  SupportTicket,
  SupportMessage,
  HelpArticle,
  SupportCategory,
  SupportPriority,
  SupportStatus,
  SupportTicketContext,
} from "../../types";

export interface SupportService {
  // ─── Tickets (user side) ───────────────────────────────────────
  createTicket(data: {
    subject: string;
    description: string;
    category: SupportCategory;
    context?: SupportTicketContext;
  }): Promise<string>;

  getMyTickets(pageSize?: number, lastTicketId?: string): Promise<{ tickets: SupportTicket[]; hasMore: boolean; lastTicketId: string | null }>;
  getTicket(ticketId: string): Promise<SupportTicket | null>;
  markTicketReadByUser(ticketId: string): Promise<void>;

  // ─── Messages ──────────────────────────────────────────────────
  getMessages(ticketId: string): Promise<SupportMessage[]>;
  sendMessage(ticketId: string, body: string): Promise<void>;

  // ─── Admin: tickets ────────────────────────────────────────────
  getAllTickets(filter?: {
    status?: SupportStatus;
    category?: SupportCategory;
    priority?: SupportPriority;
  }, pageSize?: number, lastTicketId?: string): Promise<{ tickets: SupportTicket[]; hasMore: boolean; lastTicketId: string | null }>;

  updateTicketStatus(ticketId: string, status: SupportStatus): Promise<void>;
  updateTicketPriority(ticketId: string, priority: SupportPriority): Promise<void>;
  markTicketReadByAdmin(ticketId: string): Promise<void>;

  // ─── Admin: messages ───────────────────────────────────────────
  sendAdminMessage(ticketId: string, body: string): Promise<void>;

  // ─── Help articles ─────────────────────────────────────────────
  getHelpArticles(): Promise<HelpArticle[]>;
  getAllHelpArticles(): Promise<HelpArticle[]>;
  createHelpArticle(data: {
    title: string;
    content: string;
    category: string;
    tags: string[];
    order: number;
  }): Promise<string>;
  updateHelpArticle(
    articleId: string,
    data: Partial<Pick<HelpArticle, "title" | "content" | "category" | "tags" | "order" | "active">>
  ): Promise<void>;
  deleteHelpArticle(articleId: string): Promise<void>;
}
