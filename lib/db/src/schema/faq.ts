import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

/** Per-language translations for a single FAQ field (question or answer). */
export type FaqTranslations = { ru?: string; en?: string; ar?: string };

export const faqItemsTable = pgTable("faq_items", {
  id: serial("id").primaryKey(),
  // Legacy single-language columns, kept as a fallback for older rows.
  question: text("question").notNull().default(""),
  answer: text("answer").notNull().default(""),
  // Manual per-language translations (RU / EN / AR).
  questionI18n: jsonb("question_i18n")
    .$type<FaqTranslations>()
    .notNull()
    .default({}),
  answerI18n: jsonb("answer_i18n")
    .$type<FaqTranslations>()
    .notNull()
    .default({}),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

export type FaqItem = typeof faqItemsTable.$inferSelect;
export type NewFaqItem = typeof faqItemsTable.$inferInsert;
