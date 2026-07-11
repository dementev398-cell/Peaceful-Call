import { pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";

// Local email/password accounts — replaces Clerk as the identity source.
// The numeric `id` here is stringified and stored in the various
// `clerkUserId`/`authorClerkId`/`senderClerkId` columns across the schema
// (kept as-is to avoid touching every call site during the Clerk removal).
export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  isBanned: boolean("is_banned").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
