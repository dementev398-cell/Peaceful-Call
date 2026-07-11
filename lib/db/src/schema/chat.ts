import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";

// Lightweight JIT-synced mirror of Clerk users, so we can list/search people
// to start a conversation with and show names/avatars without hitting the
// Clerk API on every request.
export const appUsersTable = pgTable("app_users", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  name: text("name").notNull().default(""),
  email: text("email").notNull().default(""),
  avatarUrl: text("avatar_url"),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

export type AppUser = typeof appUsersTable.$inferSelect;
export type NewAppUser = typeof appUsersTable.$inferInsert;

// A conversation is either:
// - "support": userAClerkId (the visitor) <-> the whole admin team. Any admin
//   can see and reply to it; userBClerkId stays null.
// - "direct": userAClerkId <-> userBClerkId, an ordinary user-to-user chat.
export const conversationsTable = pgTable("conversations", {
  id: serial("id").primaryKey(),
  kind: text("kind", { enum: ["support", "direct"] }).notNull(),
  userAClerkId: text("user_a_clerk_id").notNull(),
  userBClerkId: text("user_b_clerk_id"),
  lastMessageAt: timestamp("last_message_at", { mode: "string" }).notNull().defaultNow(),
  lastMessagePreview: text("last_message_preview").notNull().default(""),
  lastReadAtA: timestamp("last_read_at_a", { mode: "string" }),
  lastReadAtB: timestamp("last_read_at_b", { mode: "string" }),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

export type Conversation = typeof conversationsTable.$inferSelect;
export type NewConversation = typeof conversationsTable.$inferInsert;

// Chat messages — soft-deletable and forwardable.
// isDeleted = true means deleted-for-everyone (sender only); content/attachment
// are cleared but the row is preserved for audit.
// isForwarded = true means this message was forwarded from another conversation.
export const chatMessagesTable = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  senderClerkId: text("sender_clerk_id").notNull(),
  senderName: text("sender_name").notNull().default(""),
  senderAvatarUrl: text("sender_avatar_url"),
  senderIsAdmin: text("sender_is_admin", { enum: ["true", "false"] })
    .notNull()
    .default("false"),
  content: text("content"),
  attachmentUrl: text("attachment_url"),
  attachmentType: text("attachment_type", {
    enum: ["image", "video", "file"],
  }),
  attachmentName: text("attachment_name"),
  attachmentMimeType: text("attachment_mime_type"),
  attachmentSize: integer("attachment_size"),
  // Deletion fields
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at", { mode: "string" }),
  // Edit fields
  isEdited: boolean("is_edited").notNull().default(false),
  editedAt: timestamp("edited_at", { mode: "string" }),
  // Forward fields
  isForwarded: boolean("is_forwarded").notNull().default(false),
  forwardedFromSenderName: text("forwarded_from_sender_name"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

export type ChatMessage = typeof chatMessagesTable.$inferSelect;
export type NewChatMessage = typeof chatMessagesTable.$inferInsert;

// Per-user hidden messages (delete-for-me). A row here means the given user
// has hidden this message from their view; it remains visible to others.
export const chatMessageDeletionsTable = pgTable("chat_message_deletions", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull(),
  clerkUserId: text("clerk_user_id").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

export type ChatMessageDeletion = typeof chatMessageDeletionsTable.$inferSelect;
export type NewChatMessageDeletion = typeof chatMessageDeletionsTable.$inferInsert;
