import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";

export const hadithsTable = pgTable("hadiths", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  source: text("source").notNull().default(""),
  narrator: text("narrator").notNull().default(""),
  grade: text("grade", {
    enum: ["sahih", "hasan", "daif", "mawdu"],
  })
    .notNull()
    .default("sahih"),
  topic: text("topic").notNull().default(""),
  published: boolean("published").notNull().default(true),
  authorId: integer("author_id"),
  authorName: text("author_name").notNull().default(""),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
});

export type Hadith = typeof hadithsTable.$inferSelect;
export type NewHadith = typeof hadithsTable.$inferInsert;
