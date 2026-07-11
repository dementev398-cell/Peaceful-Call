import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const adminsTable = pgTable("admins", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  email: text("email").notNull(),
  name: text("name").notNull().default(""),
  role: text("role", { enum: ["owner", "editor"] }).notNull().default("editor"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

export type Admin = typeof adminsTable.$inferSelect;
export type NewAdmin = typeof adminsTable.$inferInsert;
