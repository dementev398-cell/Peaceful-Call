import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const faqItemsTable = pgTable("faq_items", {
  id: serial("id").primaryKey(),
  question: text("question").notNull().default(""),
  answer: text("answer").notNull().default(""),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

export type FaqItem = typeof faqItemsTable.$inferSelect;
export type NewFaqItem = typeof faqItemsTable.$inferInsert;
