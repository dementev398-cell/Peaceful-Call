import { pgTable, serial, text, integer, boolean, timestamp, unique } from "drizzle-orm/pg-core";
import { postsTable } from "./posts";

export const postCommentsTable = pgTable("post_comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => postsTable.id, { onDelete: "cascade" }),
  authorClerkId: text("author_clerk_id"),
  authorName: text("author_name").notNull().default("Аноним"),
  authorAvatarUrl: text("author_avatar_url"),
  isAdmin: boolean("is_admin").notNull().default(false),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

export type PostComment = typeof postCommentsTable.$inferSelect;
export type NewPostComment = typeof postCommentsTable.$inferInsert;

export const postReactionsTable = pgTable("post_reactions", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => postsTable.id, { onDelete: "cascade" }),
  clerkUserId: text("clerk_user_id").notNull(),
  type: text("type", { enum: ["like", "dislike"] }).notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
}, (t) => ({
  uniq: unique().on(t.postId, t.clerkUserId),
}));

export type PostReaction = typeof postReactionsTable.$inferSelect;
export type NewPostReaction = typeof postReactionsTable.$inferInsert;
