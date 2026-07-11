import { pgTable, serial, text, boolean, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export type PostAttachment = {
  url: string;
  type: "image" | "video" | "file";
  name?: string;
};

export const postsTable = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt").notNull().default(""),
  content: text("content").notNull().default(""),
  coverImageUrl: text("cover_image_url"),
  attachments: jsonb("attachments")
    .$type<PostAttachment[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  published: boolean("published").notNull().default(true),
  authorId: integer("author_id"),
  authorName: text("author_name").notNull().default(""),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
});

export type Post = typeof postsTable.$inferSelect;
export type NewPost = typeof postsTable.$inferInsert;
