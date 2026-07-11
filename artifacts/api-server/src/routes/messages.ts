import { Router, type IRouter } from "express";
import { eq, or, desc, and, isNull } from "drizzle-orm";
import { db, messagesTable } from "@workspace/db";
import { getAuth } from "@clerk/express";
import { requireAdmin, resolveAdmin } from "../middlewares/adminAuth";
import {
  ListMessagesResponse,
  SendMessageBody,
  SendMessageResponse,
  GetMessageResponse,
  MarkMessageReadResponse,
  ReplyToMessageBody,
  ReplyToMessageResponse,
  GetUnreadCountResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/messages", requireAdmin, async (req, res): Promise<void> => {
  const admin = req.admin!;
  const msgs = await db
    .select()
    .from(messagesTable)
    .where(
      or(
        eq(messagesTable.recipientClerkId, admin.clerkUserId),
        isNull(messagesTable.recipientClerkId),
        eq(messagesTable.senderClerkId, admin.clerkUserId)
      )
    )
    .orderBy(desc(messagesTable.createdAt));

  res.json(ListMessagesResponse.parse(msgs));
});

router.get("/messages/unread-count", requireAdmin, async (req, res): Promise<void> => {
  const admin = req.admin!;
  const msgs = await db
    .select()
    .from(messagesTable)
    .where(
      and(
        or(
          eq(messagesTable.recipientClerkId, admin.clerkUserId),
          isNull(messagesTable.recipientClerkId)
        ),
        eq(messagesTable.isRead, false)
      )
    );

  res.json(GetUnreadCountResponse.parse({ count: msgs.length }));
});

router.post("/messages", async (req, res): Promise<void> => {
  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const auth = getAuth(req);
  const admin = await resolveAdmin(req);

  const [msg] = await db
    .insert(messagesTable)
    .values({
      senderClerkId: auth?.userId ?? null,
      senderName: parsed.data.senderName,
      senderEmail: parsed.data.senderEmail ?? null,
      senderRole: admin ? admin.role : "user",
      recipientClerkId: null,
      subject: parsed.data.subject ?? null,
      content: parsed.data.content,
      isRead: false,
      parentId: null,
    })
    .returning();

  res.status(201).json(SendMessageResponse.parse(msg));
});

router.get("/messages/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);

  const [msg] = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.id, id));
  if (!msg) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const replies = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.parentId, id))
    .orderBy(messagesTable.createdAt);

  res.json(GetMessageResponse.parse({ message: msg, replies }));
});

router.patch("/messages/:id/read", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);

  const [updated] = await db
    .update(messagesTable)
    .set({ isRead: true })
    .where(eq(messagesTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json(MarkMessageReadResponse.parse(updated));
});

router.post("/messages/:id/reply", requireAdmin, async (req, res): Promise<void> => {
  const admin = req.admin!;
  const parentId = parseInt(req.params.id as string, 10);

  const parsed = ReplyToMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [parent] = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.id, parentId));
  if (!parent) {
    res.status(404).json({ error: "Parent message not found" });
    return;
  }

  const [reply] = await db
    .insert(messagesTable)
    .values({
      senderClerkId: admin.clerkUserId,
      senderName: admin.name || admin.email,
      senderEmail: admin.email,
      senderRole: admin.role,
      recipientClerkId: parent.senderClerkId,
      subject: parent.subject ? `Re: ${parent.subject}` : null,
      content: parsed.data.content,
      isRead: false,
      parentId,
    })
    .returning();

  res.status(201).json(ReplyToMessageResponse.parse(reply));
});

router.delete("/messages/:id", requireAdmin, async (req, res): Promise<void> => {
  const admin = req.admin!;
  const id = parseInt(req.params.id as string, 10);

  if (admin.role !== "owner") {
    res.status(403).json({ error: "Owner only" });
    return;
  }

  const [deleted] = await db
    .delete(messagesTable)
    .where(eq(messagesTable.id, id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
