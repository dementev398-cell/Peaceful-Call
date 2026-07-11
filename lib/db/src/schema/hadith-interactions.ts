import { pgTable, serial, text, integer, boolean, timestamp, unique } from "drizzle-orm/pg-core";
import { hadithsTable } from "./hadiths";

export const hadithCommentsTable = pgTable("hadith_comments", {
  id: serial("id").primaryKey(),
  hadithId: integer("hadith_id").notNull().references(() => hadithsTable.id, { onDelete: "cascade" }),
  authorClerkId: text("author_clerk_id"),
  authorName: text("author_name").notNull().default("Аноним"),
  authorAvatarUrl: text("author_avatar_url"),
  isAdmin: boolean("is_admin").notNull().default(false),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

export type HadithComment = typeof hadithCommentsTable.$inferSelect;
export type NewHadithComment = typeof hadithCommentsTable.$inferInsert;

export const hadithReactionsTable = pgTable("hadith_reactions", {
  id: serial("id").primaryKey(),
  hadithId: integer("hadith_id").notNull().references(() => hadithsTable.id, { onDelete: "cascade" }),
  clerkUserId: text("clerk_user_id").notNull(),
  type: text("type", { enum: ["like", "dislike"] }).notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
}, (t) => ({
  uniq: unique().on(t.hadithId, t.clerkUserId),
}));

export type HadithReaction = typeof hadithReactionsTable.$inferSelect;
export type NewHadithReaction = typeof hadithReactionsTable.$inferInsert;
