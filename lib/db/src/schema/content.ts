import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const contentItemsTable = pgTable("content_items", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  group: text("group").notNull().default("General"),
  label: text("label").notNull().default(""),
  type: text("type", { enum: ["text", "textarea", "url", "color", "image"] }).notNull().default("text"),
  value: text("value").notNull().default(""),
  order: integer("order").notNull().default(0),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
});

export type ContentItem = typeof contentItemsTable.$inferSelect;
export type NewContentItem = typeof contentItemsTable.$inferInsert;
