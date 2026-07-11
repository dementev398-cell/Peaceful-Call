import { Router, type IRouter } from "express";
import { eq, count, or } from "drizzle-orm";
import { clerkClient } from "@clerk/express";
import { db, adminsTable, conversationsTable, chatMessagesTable, chatMessageDeletionsTable, appUsersTable } from "@workspace/db";
import {
  ListAdminsResponse,
  CreateAdminBody,
  CreateAdminResponse,
} from "@workspace/api-zod";
import { requireOwner, requireAdmin } from "../middlewares/adminAuth";

const router: IRouter = Router();

// Public: visitors should be able to see who runs the community.
router.get("/admins", async (_req, res): Promise<void> => {
  const admins = await db
    .select()
    .from(adminsTable)
    .orderBy(adminsTable.createdAt);
  res.json(ListAdminsResponse.parse(admins));
});

router.post("/admins", requireOwner, async (req, res): Promise<void> => {
  const parsed = CreateAdminBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { data: userList } = await clerkClient.users.getUserList({
    emailAddress: [parsed.data.email],
  });
  const user = userList[0];

  if (!user) {
    res.status(404).json({
      error:
        "Пользователь с таким email ещё не зарегистрирован в системе. Он должен сначала войти на сайт.",
    });
    return;
  }

  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();

  const [admin] = await db
    .insert(adminsTable)
    .values({
      clerkUserId: user.id,
      email: parsed.data.email,
      name,
      role: parsed.data.role ?? "editor",
    })
    .onConflictDoUpdate({
      target: adminsTable.clerkUserId,
      set: {
        role: parsed.data.role ?? "editor",
        email: parsed.data.email,
        name,
      },
    })
    .returning();

  res.status(201).json(CreateAdminResponse.parse(admin));
});

// PATCH /admins/me/avatar — admin updates their own avatarUrl
router.patch("/admins/me/avatar", requireAdmin, async (req, res): Promise<void> => {
  const admin = req.admin!;
  const { avatarUrl } = req.body as { avatarUrl?: string | null };

  const [updated] = await db
    .update(adminsTable)
    .set({ avatarUrl: avatarUrl ?? null })
    .where(eq(adminsTable.id, admin.id))
    .returning();

  res.json(updated);
});

// PATCH /admins/:id/role
router.patch("/admins/:id/role", requireOwner, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const { role, transferOwnership } = req.body;

  if (!["owner", "editor"].includes(role)) {
    res.status(400).json({ error: "Invalid role. Must be 'owner' or 'editor'" });
    return;
  }

  const [target] = await db.select().from(adminsTable).where(eq(adminsTable.id, id));
  if (!target) {
    res.status(404).json({ error: "Admin not found" });
    return;
  }

  const currentOwner = req.admin!;

  if (role === "owner" && transferOwnership) {
    await db.transaction(async (tx) => {
      await tx.update(adminsTable).set({ role: "editor" }).where(eq(adminsTable.id, currentOwner.id));
      await tx.update(adminsTable).set({ role: "owner" }).where(eq(adminsTable.id, id));
    });
    res.json({ success: true, message: "Права владельца успешно переданы" });
    return;
  }

  if (role === "editor" && target.role === "owner") {
    const [{ value: ownerCount }] = await db
      .select({ value: count() })
      .from(adminsTable)
      .where(eq(adminsTable.role, "owner"));
    if (ownerCount <= 1) {
      res.status(400).json({ error: "Нельзя понизить единственного владельца." });
      return;
    }
  }

  const [updated] = await db
    .update(adminsTable)
    .set({ role })
    .where(eq(adminsTable.id, id))
    .returning();

  res.json(updated);
});

router.delete("/admins/:id", requireOwner, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [target] = await db.select().from(adminsTable).where(eq(adminsTable.id, id));
  if (!target) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  if (target.role === "owner") {
    const [{ value: ownerCount }] = await db
      .select({ value: count() })
      .from(adminsTable)
      .where(eq(adminsTable.role, "owner"));
    if (ownerCount <= 1) {
      res.status(400).json({ error: "Нельзя удалить последнего владельца" });
      return;
    }
  }

  await db.delete(adminsTable).where(eq(adminsTable.id, id));
  res.sendStatus(204);
});

// ── User management (owner/admin only) ──────────────────────────────────────

// GET /admins/clerk-users — list all Clerk users (admin only)
router.get("/admins/clerk-users", requireAdmin, async (_req, res): Promise<void> => {
  try {
    const { data: users } = await clerkClient.users.getUserList({ limit: 200 });
    const safeUsers = users.map((u) => ({
      id: u.id,
      firstName: u.firstName ?? "",
      lastName: u.lastName ?? "",
      email: u.emailAddresses[0]?.emailAddress ?? "",
      imageUrl: u.imageUrl,
      banned: u.banned,
      createdAt: new Date(u.createdAt).toISOString(),
    }));
    res.json(safeUsers);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch users" });
  }
});

// POST /admins/clerk-users/:id/ban
router.post("/admins/clerk-users/:id/ban", requireAdmin, async (req, res): Promise<void> => {
  const id = String(req.params.id);
  try {
    await clerkClient.users.banUser(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to ban user" });
  }
});

// POST /admins/clerk-users/:id/unban
router.post("/admins/clerk-users/:id/unban", requireAdmin, async (req, res): Promise<void> => {
  const id = String(req.params.id);
  try {
    await clerkClient.users.unbanUser(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to unban user" });
  }
});

// DELETE /admins/clerk-users/:id — cascade: remove from admins, delete chats/messages
router.delete("/admins/clerk-users/:id", requireOwner, async (req, res): Promise<void> => {
  const clerkId = String(req.params.id);
  try {
    // 1) Remove from admins table (strips any admin rights immediately)
    await db.delete(adminsTable).where(eq(adminsTable.clerkUserId, clerkId));

    // 2) Find all conversations this user participates in
    const userConvs = await db
      .select({ id: conversationsTable.id })
      .from(conversationsTable)
      .where(
        or(
          eq(conversationsTable.userAClerkId, clerkId),
          eq(conversationsTable.userBClerkId, clerkId),
        ),
      );

    const convIds = userConvs.map((c) => c.id);

    if (convIds.length > 0) {
      // 3) Delete per-user hidden-message rows for deleted user's messages in those convs
      await db
        .delete(chatMessageDeletionsTable)
        .where(eq(chatMessageDeletionsTable.clerkUserId, clerkId));

      // 4) Delete all messages in those conversations (affects both sides)
      for (const convId of convIds) {
        // Remove deletion-tracking rows for messages in this conversation
        const msgs = await db
          .select({ id: chatMessagesTable.id })
          .from(chatMessagesTable)
          .where(eq(chatMessagesTable.conversationId, convId));
        for (const msg of msgs) {
          await db
            .delete(chatMessageDeletionsTable)
            .where(eq(chatMessageDeletionsTable.messageId, msg.id));
        }
        await db
          .delete(chatMessagesTable)
          .where(eq(chatMessagesTable.conversationId, convId));
      }

      // 5) Delete the conversations themselves
      for (const convId of convIds) {
        await db
          .delete(conversationsTable)
          .where(eq(conversationsTable.id, convId));
      }
    }

    // 6) Remove from app_users mirror table
    await db
      .delete(appUsersTable)
      .where(eq(appUsersTable.clerkUserId, clerkId));

    // 7) Finally delete from Clerk
    await clerkClient.users.deleteUser(clerkId);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to delete user" });
  }
});

export default router;
