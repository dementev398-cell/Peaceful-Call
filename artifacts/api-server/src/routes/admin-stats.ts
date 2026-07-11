import { Router, type IRouter } from "express";
import { count, eq } from "drizzle-orm";
import {
  db,
  postsTable,
  hadithsTable,
  adminsTable,
  appUsersTable,
  conversationsTable,
  faqItemsTable,
  messagesTable,
} from "@workspace/db";
import { GetAdminStatsResponse } from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/adminAuth";

const router: IRouter = Router();

router.get("/admin/stats", requireAdmin, async (_req, res): Promise<void> => {
  const [
    [posts],
    [hadiths],
    [admins],
    [users],
    [conversations],
    [faq],
    [messages],
    [unread],
  ] = await Promise.all([
    db.select({ value: count() }).from(postsTable),
    db.select({ value: count() }).from(hadithsTable),
    db.select({ value: count() }).from(adminsTable),
    db.select({ value: count() }).from(appUsersTable),
    db.select({ value: count() }).from(conversationsTable),
    db.select({ value: count() }).from(faqItemsTable),
    db.select({ value: count() }).from(messagesTable),
    db
      .select({ value: count() })
      .from(messagesTable)
      .where(eq(messagesTable.isRead, false)),
  ]);

  res.json(
    GetAdminStatsResponse.parse({
      posts: posts?.value ?? 0,
      hadiths: hadiths?.value ?? 0,
      admins: admins?.value ?? 0,
      users: users?.value ?? 0,
      conversations: conversations?.value ?? 0,
      faq: faq?.value ?? 0,
      messages: messages?.value ?? 0,
      unreadMessages: unread?.value ?? 0,
    }),
  );
});

export default router;
