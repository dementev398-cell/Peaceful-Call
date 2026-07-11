import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderClerkId: text("sender_clerk_id"),
  senderName: text("sender_name").notNull().default("Guest"),
  senderEmail: text("sender_email"),
  senderRole: text("sender_role").notNull().default("user"),
  recipientClerkId: text("recipient_clerk_id"),
  subject: text("subject"),
  content: text("content").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  parentId: integer("parent_id"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

export type Message = typeof messagesTable.$inferSelect;
export type NewMessage = typeof messagesTable.$inferInsert;
