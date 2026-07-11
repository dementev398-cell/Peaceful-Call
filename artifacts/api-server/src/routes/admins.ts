import { Router, type IRouter } from "express";
import { eq, count, or } from "drizzle-orm";
import { z } from "zod";
import { db, adminsTable, conversationsTable, chatMessagesTable, chatMessageDeletionsTable, appUsersTable, usersTable } from "@workspace/db";
import {
  ListAdminsResponse,
  CreateAdminBody,
  CreateAdminResponse,
} from "@workspace/api-zod";
import { requireOwner, requireAdmin } from "../middlewares/adminAuth";
import { hashPassword } from "../lib/passwords";

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

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, parsed.data.email.toLowerCase()));

  if (!user) {
    res.status(404).json({
      error:
        "Пользователь с таким email ещё не зарегистрирован в системе. Он должен сначала войти на сайт.",
    });
    return;
  }

  const name = user.name ?? "";

  const [admin] = await db
    .insert(adminsTable)
    .values({
      clerkUserId: String(user.id),
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

// GET /admins/users — list all local users (admin only)
router.get("/admins/users", requireAdmin, async (_req, res): Promise<void> => {
  try {
    const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
    const safeUsers = users.map((u) => ({
      id: String(u.id),
      name: u.name ?? "",
      email: u.email,
      banned: u.isBanned,
      createdAt: u.createdAt,
    }));
    res.json(safeUsers);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch users" });
  }
});

// POST /admins/users/:id/ban
router.post("/admins/users/:id/ban", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  try {
    await db.update(usersTable).set({ isBanned: true }).where(eq(usersTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to ban user" });
  }
});

// POST /admins/users/:id/unban
router.post("/admins/users/:id/unban", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  try {
    await db.update(usersTable).set({ isBanned: false }).where(eq(usersTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to unban user" });
  }
});

const ResetPasswordBody = z.object({
  newPassword: z.string().min(8).max(200),
});

// POST /admins/users/:id/reset-password — owner-only fallback for the
// no-transactional-email password-recovery flow.
router.post("/admins/users/:id/reset-password", requireOwner, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const parsed = ResetPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  try {
    const passwordHash = await hashPassword(parsed.data.newPassword);
    const [updated] = await db
      .update(usersTable)
      .set({ passwordHash })
      .where(eq(usersTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to reset password" });
  }
});

// DELETE /admins/users/:id — cascade: remove from admins, delete chats/messages
router.delete("/admins/users/:id", requireOwner, async (req, res): Promise<void> => {
  const userIdStr = String(req.params.id);
  try {
    // 1) Remove from admins table (strips any admin rights immediately)
    await db.delete(adminsTable).where(eq(adminsTable.clerkUserId, userIdStr));

    // 2) Find all conversations this user participates in
    const userConvs = await db
      .select({ id: conversationsTable.id })
      .from(conversationsTable)
      .where(
        or(
          eq(conversationsTable.userAClerkId, userIdStr),
          eq(conversationsTable.userBClerkId, userIdStr),
        ),
      );

    const convIds = userConvs.map((c) => c.id);

    if (convIds.length > 0) {
      // 3) Delete per-user hidden-message rows for deleted user's messages in those convs
      await db
        .delete(chatMessageDeletionsTable)
        .where(eq(chatMessageDeletionsTable.clerkUserId, userIdStr));

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
      .where(eq(appUsersTable.clerkUserId, userIdStr));

    // 7) Finally delete the local account
    await db.delete(usersTable).where(eq(usersTable.id, Number(userIdStr)));

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to delete user" });
  }
});

export default router;
