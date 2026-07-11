import { Router, type IRouter } from "express";
import { and, or, eq, asc, desc, inArray, notInArray } from "drizzle-orm";
import {
  db,
  appUsersTable,
  adminsTable,
  conversationsTable,
  chatMessagesTable,
  chatMessageDeletionsTable,
  userProfilesTable,
  type Conversation,
} from "@workspace/db";
import { requireAppUser } from "../middlewares/appUser";
import { requireOwner } from "../middlewares/adminAuth";
import {
  ListConversationsResponse,
  StartSupportConversationResponse,
  StartDirectConversationBody,
  StartDirectConversationResponse,
  ListChatMessagesResponse,
  SendChatMessageBody,
  SendChatMessageResponse,
  ListChatUsersResponse,
  ForwardChatMessageBody,
  EditChatMessageBody,
  EditChatMessageResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function isAdmin(clerkUserId: string): Promise<boolean> {
  const [row] = await db
    .select()
    .from(adminsTable)
    .where(eq(adminsTable.clerkUserId, clerkUserId));
  return Boolean(row);
}

async function canAccessConversation(
  convo: Conversation,
  clerkUserId: string,
  admin: boolean,
): Promise<boolean> {
  if (convo.userAClerkId === clerkUserId) return true;
  if (convo.userBClerkId === clerkUserId) return true;
  if (convo.kind === "support" && admin) return true;
  return false;
}

/** Merge app_user + optional user_profile fields into sender display fields */
function buildSenderInfo(
  appUser: { name: string; email: string; avatarUrl: string | null } | null,
  profile: { nickname: string | null; avatarUrl: string | null } | null,
): { senderDisplayName: string; senderDisplayAvatarUrl: string | null } {
  const nickname = profile?.nickname ?? null;
  const profileAvatar = profile?.avatarUrl ?? null;
  const displayName = nickname || appUser?.name || appUser?.email || "";
  const displayAvatar = profileAvatar || appUser?.avatarUrl || null;
  return { senderDisplayName: displayName, senderDisplayAvatarUrl: displayAvatar };
}

router.get("/chat/users", requireAppUser, async (req, res): Promise<void> => {
  const me = req.appUser!;
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const rows = await db
    .select()
    .from(appUsersTable)
    .orderBy(desc(appUsersTable.updatedAt));
  const filtered = rows.filter((u) => {
    if (u.clerkUserId === me.clerkUserId) return false;
    if (!q) return true;
    const haystack = `${u.name} ${u.email}`.toLowerCase();
    return haystack.includes(q.toLowerCase());
  });
  res.json(ListChatUsersResponse.parse(filtered));
});

router.get(
  "/chat/conversations",
  requireAppUser,
  async (req, res): Promise<void> => {
    const me = req.appUser!;
    const admin = await isAdmin(me.clerkUserId);

    const rows = await db
      .select()
      .from(conversationsTable)
      .where(
        admin
          ? or(
              eq(conversationsTable.userAClerkId, me.clerkUserId),
              eq(conversationsTable.userBClerkId, me.clerkUserId),
              eq(conversationsTable.kind, "support"),
            )
          : or(
              eq(conversationsTable.userAClerkId, me.clerkUserId),
              eq(conversationsTable.userBClerkId, me.clerkUserId),
            ),
      )
      .orderBy(desc(conversationsTable.lastMessageAt));

    const clerkIds = new Set<string>();
    for (const c of rows) {
      if (c.userAClerkId !== me.clerkUserId) clerkIds.add(c.userAClerkId);
      if (c.userBClerkId && c.userBClerkId !== me.clerkUserId)
        clerkIds.add(c.userBClerkId);
    }
    const others = clerkIds.size
      ? await db.select().from(appUsersTable)
      : [];
    const othersById = new Map(others.map((u) => [u.clerkUserId, u]));

    // Fetch user profiles for all relevant clerkIds (including me)
    const allClerkIds = Array.from(clerkIds);
    const profiles = allClerkIds.length
      ? await db
          .select()
          .from(userProfilesTable)
          .where(inArray(userProfilesTable.clerkUserId, allClerkIds))
      : [];
    const profilesByClerkId = new Map(profiles.map((p) => [p.clerkUserId, p]));

    const result = rows.map((c) => {
      const isA = c.userAClerkId === me.clerkUserId;
      const otherId = c.kind === "support" && !isA ? c.userAClerkId : isA ? c.userBClerkId : c.userAClerkId;
      const other = otherId ? othersById.get(otherId) ?? null : null;
      const otherProfile = otherId ? profilesByClerkId.get(otherId) ?? null : null;
      const lastReadAt = isA ? c.lastReadAtA : c.lastReadAtB;
      const unread = !lastReadAt || c.lastMessageAt > lastReadAt;

      // Prefer profile nickname/avatar over app_users fallback
      const otherNickname = otherProfile?.nickname ?? null;
      const otherAvatar = otherProfile?.avatarUrl ?? other?.avatarUrl ?? null;
      const otherName = otherNickname || other?.name || other?.email || "Администрация";

      return {
        id: c.id,
        kind: c.kind,
        title:
          c.kind === "support" && isA
            ? "Администрация"
            : otherName,
        otherAvatarUrl: otherAvatar,
        lastMessageAt: c.lastMessageAt,
        lastMessagePreview: c.lastMessagePreview,
        unread,
      };
    });

    res.json(ListConversationsResponse.parse(result));
  },
);

router.post(
  "/chat/conversations/support",
  requireAppUser,
  async (req, res): Promise<void> => {
    const me = req.appUser!;

    const [existing] = await db
      .select()
      .from(conversationsTable)
      .where(
        and(
          eq(conversationsTable.kind, "support"),
          eq(conversationsTable.userAClerkId, me.clerkUserId),
        ),
      );
    if (existing) {
      res
        .status(200)
        .json(StartSupportConversationResponse.parse({ id: existing.id }));
      return;
    }

    const [created] = await db
      .insert(conversationsTable)
      .values({
        kind: "support",
        userAClerkId: me.clerkUserId,
        lastMessagePreview: "",
      })
      .returning();

    res
      .status(201)
      .json(StartSupportConversationResponse.parse({ id: created.id }));
  },
);

router.post(
  "/chat/conversations/direct",
  requireAppUser,
  async (req, res): Promise<void> => {
    const me = req.appUser!;
    const parsed = StartDirectConversationBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const targetId = parsed.data.targetClerkId;
    if (targetId === me.clerkUserId) {
      res.status(400).json({ error: "Cannot message yourself" });
      return;
    }

    const [existing] = await db
      .select()
      .from(conversationsTable)
      .where(
        and(
          eq(conversationsTable.kind, "direct"),
          or(
            and(
              eq(conversationsTable.userAClerkId, me.clerkUserId),
              eq(conversationsTable.userBClerkId, targetId),
            ),
            and(
              eq(conversationsTable.userAClerkId, targetId),
              eq(conversationsTable.userBClerkId, me.clerkUserId),
            ),
          ),
        ),
      );
    if (existing) {
      // Always allow if a conversation already exists — don't retroactively block
      res
        .status(200)
        .json(StartDirectConversationResponse.parse({ id: existing.id }));
      return;
    }

    // Check if the target user allows direct messages.
    // Admins/owners can always initiate (mirrors the support-conversation bypass pattern).
    const senderIsAdmin = await isAdmin(me.clerkUserId);
    if (!senderIsAdmin) {
      const [targetAppUser] = await db
        .select({ allowDirectMessages: appUsersTable.allowDirectMessages })
        .from(appUsersTable)
        .where(eq(appUsersTable.clerkUserId, targetId));
      if (targetAppUser && !targetAppUser.allowDirectMessages) {
        res.status(403).json({
          error: "Этот пользователь отключил личные сообщения.",
        });
        return;
      }
    }

    const [created] = await db
      .insert(conversationsTable)
      .values({
        kind: "direct",
        userAClerkId: me.clerkUserId,
        userBClerkId: targetId,
        lastMessagePreview: "",
      })
      .returning();

    res
      .status(201)
      .json(StartDirectConversationResponse.parse({ id: created.id }));
  },
);

router.get(
  "/chat/conversations/:id/messages",
  requireAppUser,
  async (req, res): Promise<void> => {
    const me = req.appUser!;
    const id = parseInt(req.params.id as string, 10);
    const [convo] = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, id));
    if (!convo) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const admin = await isAdmin(me.clerkUserId);
    if (!(await canAccessConversation(convo, me.clerkUserId, admin))) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    // Find all messages in conversation
    const messages = await db
      .select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.conversationId, id))
      .orderBy(asc(chatMessagesTable.createdAt));

    if (messages.length === 0) {
      res.json(ListChatMessagesResponse.parse([]));
      return;
    }

    // Fetch hidden-for-me message IDs
    const messageIds = messages.map((m) => m.id);
    const hiddenRows = await db
      .select()
      .from(chatMessageDeletionsTable)
      .where(
        and(
          eq(chatMessageDeletionsTable.clerkUserId, me.clerkUserId),
          inArray(chatMessageDeletionsTable.messageId, messageIds),
        ),
      );
    const hiddenIds = new Set(hiddenRows.map((r) => r.messageId));

    // Fetch user profiles for all senders to get nicknames/avatars
    const senderIds = Array.from(new Set(messages.map((m) => m.senderClerkId)));
    const senderProfiles = await db
      .select()
      .from(userProfilesTable)
      .where(inArray(userProfilesTable.clerkUserId, senderIds));
    const profileBySenderId = new Map(senderProfiles.map((p) => [p.clerkUserId, p]));

    // Fetch app_users for senders (for fallback name/avatar)
    const senderAppUsers = await db
      .select()
      .from(appUsersTable)
      .where(inArray(appUsersTable.clerkUserId, senderIds));
    const appUserBySenderId = new Map(senderAppUsers.map((u) => [u.clerkUserId, u]));

    const result = messages
      .filter((m) => !hiddenIds.has(m.id))
      .map((m) => {
        const profile = profileBySenderId.get(m.senderClerkId) ?? null;
        const appUser = appUserBySenderId.get(m.senderClerkId) ?? null;

        // Preferred display name: profile nickname > stored senderName > appUser name/email
        const displayName =
          profile?.nickname ||
          m.senderName ||
          appUser?.name ||
          appUser?.email ||
          "";
        const displayAvatar =
          profile?.avatarUrl || m.senderAvatarUrl || appUser?.avatarUrl || null;

        if (m.isDeleted) {
          // Return placeholder for deleted-for-everyone
          return {
            id: m.id,
            conversationId: m.conversationId,
            senderClerkId: m.senderClerkId,
            senderName: displayName,
            senderNickname: profile?.nickname ?? null,
            senderAvatarUrl: displayAvatar,
            senderIsAdmin: m.senderIsAdmin,
            content: null,
            attachmentUrl: null,
            attachmentType: null,
            attachmentName: null,
            attachmentMimeType: null,
            attachmentSize: null,
            isDeleted: true,
            isEdited: m.isEdited,
            editedAt: m.editedAt ?? null,
            isForwarded: m.isForwarded,
            forwardedFromSenderName: m.forwardedFromSenderName ?? null,
            createdAt: m.createdAt,
          };
        }

        return {
          id: m.id,
          conversationId: m.conversationId,
          senderClerkId: m.senderClerkId,
          senderName: displayName,
          senderNickname: profile?.nickname ?? null,
          senderAvatarUrl: displayAvatar,
          senderIsAdmin: m.senderIsAdmin,
          content: m.content ?? null,
          attachmentUrl: m.attachmentUrl ?? null,
          attachmentType: m.attachmentType ?? null,
          attachmentName: m.attachmentName ?? null,
          attachmentMimeType: m.attachmentMimeType ?? null,
          attachmentSize: m.attachmentSize ?? null,
          isDeleted: false,
          isEdited: m.isEdited,
          editedAt: m.editedAt ?? null,
          isForwarded: m.isForwarded,
          forwardedFromSenderName: m.forwardedFromSenderName ?? null,
          createdAt: m.createdAt,
        };
      });

    res.json(ListChatMessagesResponse.parse(result));
  },
);

router.post(
  "/chat/conversations/:id/messages",
  requireAppUser,
  async (req, res): Promise<void> => {
    const me = req.appUser!;
    const id = parseInt(req.params.id as string, 10);
    const parsed = SendChatMessageBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    if (!parsed.data.content && !parsed.data.attachmentUrl) {
      res.status(400).json({ error: "Message must have content or an attachment" });
      return;
    }

    const [convo] = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, id));
    if (!convo) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const admin = await isAdmin(me.clerkUserId);
    if (!(await canAccessConversation(convo, me.clerkUserId, admin))) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    // Fetch profile for display name/avatar
    const [profile] = await db
      .select()
      .from(userProfilesTable)
      .where(eq(userProfilesTable.clerkUserId, me.clerkUserId));

    const displayName = profile?.nickname || me.name || me.email;
    const displayAvatar = profile?.avatarUrl || me.avatarUrl || null;

    const [message] = await db
      .insert(chatMessagesTable)
      .values({
        conversationId: id,
        senderClerkId: me.clerkUserId,
        senderName: displayName,
        senderAvatarUrl: displayAvatar,
        senderIsAdmin: admin ? "true" : "false",
        content: parsed.data.content ?? null,
        attachmentUrl: parsed.data.attachmentUrl ?? null,
        attachmentType: parsed.data.attachmentType ?? null,
        attachmentName: parsed.data.attachmentName ?? null,
        attachmentMimeType: parsed.data.attachmentMimeType ?? null,
        attachmentSize: parsed.data.attachmentSize ?? null,
      })
      .returning();

    const isA = convo.userAClerkId === me.clerkUserId;
    const preview = parsed.data.content
      ? parsed.data.content.slice(0, 120)
      : parsed.data.attachmentType === "image"
        ? "Фото"
        : parsed.data.attachmentType === "video"
          ? "Видео"
          : "Файл";

    await db
      .update(conversationsTable)
      .set({
        lastMessageAt: message.createdAt,
        lastMessagePreview: preview,
        ...(isA
          ? { lastReadAtA: message.createdAt }
          : convo.kind === "support"
            ? { lastReadAtB: message.createdAt }
            : { lastReadAtB: message.createdAt }),
      })
      .where(eq(conversationsTable.id, id));

    res.status(201).json(
      SendChatMessageResponse.parse({
        ...message,
        senderNickname: profile?.nickname ?? null,
        isDeleted: message.isDeleted,
        isForwarded: message.isForwarded,
        forwardedFromSenderName: message.forwardedFromSenderName ?? null,
      }),
    );
  },
);

router.patch(
  "/chat/conversations/:id/read",
  requireAppUser,
  async (req, res): Promise<void> => {
    const me = req.appUser!;
    const id = parseInt(req.params.id as string, 10);
    const [convo] = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, id));
    if (!convo) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const admin = await isAdmin(me.clerkUserId);
    if (!(await canAccessConversation(convo, me.clerkUserId, admin))) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const isA = convo.userAClerkId === me.clerkUserId;
    await db
      .update(conversationsTable)
      .set(isA ? { lastReadAtA: new Date().toISOString() } : { lastReadAtB: new Date().toISOString() })
      .where(eq(conversationsTable.id, id));
    res.sendStatus(204);
  },
);

// ── Delete message ────────────────────────────────────────────────────────────
// DELETE /chat/messages/:id?scope=me   — hide for requesting user only
// DELETE /chat/messages/:id?scope=everyone — mark deleted for all (sender only)

router.delete(
  "/chat/messages/:id",
  requireAppUser,
  async (req, res): Promise<void> => {
    const me = req.appUser!;
    const messageId = parseInt(req.params.id as string, 10);
    const scope = req.query.scope === "everyone" ? "everyone" : "me";

    const [message] = await db
      .select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.id, messageId));
    if (!message) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    // Verify the requester is a participant in the conversation
    const [convo] = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, message.conversationId));
    if (!convo) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    const admin = await isAdmin(me.clerkUserId);
    if (!(await canAccessConversation(convo, me.clerkUserId, admin))) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    if (scope === "everyone") {
      // Only the original sender can delete for everyone
      if (message.senderClerkId !== me.clerkUserId) {
        res.status(403).json({ error: "Only the sender can delete for everyone" });
        return;
      }
      if (message.isDeleted) {
        res.sendStatus(204);
        return;
      }
      await db
        .update(chatMessagesTable)
        .set({
          isDeleted: true,
          deletedAt: new Date().toISOString(),
          content: null,
          attachmentUrl: null,
          attachmentType: null,
          attachmentName: null,
          attachmentMimeType: null,
          attachmentSize: null,
        })
        .where(eq(chatMessagesTable.id, messageId));
    } else {
      // Delete for me: insert into chat_message_deletions (idempotent)
      await db
        .insert(chatMessageDeletionsTable)
        .values({ messageId, clerkUserId: me.clerkUserId })
        .onConflictDoNothing();
    }

    res.sendStatus(204);
  },
);

// ── Edit message ─────────────────────────────────────────────────────────────
// PATCH /chat/messages/:id
// body: { content: string }
// Sender only; does not allow editing deleted messages; text-only

router.patch(
  "/chat/messages/:id",
  requireAppUser,
  async (req, res): Promise<void> => {
    const me = req.appUser!;
    const messageId = parseInt(req.params.id as string, 10);

    const parsed = EditChatMessageBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [message] = await db
      .select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.id, messageId));
    if (!message) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    // Only the original sender can edit
    if (message.senderClerkId !== me.clerkUserId) {
      res.status(403).json({ error: "Only the sender can edit this message" });
      return;
    }

    // Cannot edit a deleted message
    if (message.isDeleted) {
      res.status(400).json({ error: "Cannot edit a deleted message" });
      return;
    }

    // Verify participant in conversation
    const [convo] = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, message.conversationId));
    if (!convo) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    const admin = await isAdmin(me.clerkUserId);
    if (!(await canAccessConversation(convo, me.clerkUserId, admin))) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const now = new Date().toISOString();
    const [updated] = await db
      .update(chatMessagesTable)
      .set({
        content: parsed.data.content,
        isEdited: true,
        editedAt: now,
      })
      .where(eq(chatMessagesTable.id, messageId))
      .returning();

    // Fetch profile for response
    const [profile] = await db
      .select()
      .from(userProfilesTable)
      .where(eq(userProfilesTable.clerkUserId, me.clerkUserId));

    res.json(
      EditChatMessageResponse.parse({
        ...updated,
        senderNickname: profile?.nickname ?? null,
        isDeleted: updated.isDeleted,
        isEdited: updated.isEdited,
        editedAt: updated.editedAt ?? null,
        isForwarded: updated.isForwarded,
        forwardedFromSenderName: updated.forwardedFromSenderName ?? null,
      }),
    );
  },
);

// ── Forward message ───────────────────────────────────────────────────────────
// POST /chat/messages/:id/forward
// body: { targetConversationId: number }

router.post(
  "/chat/messages/:id/forward",
  requireAppUser,
  async (req, res): Promise<void> => {
    const me = req.appUser!;
    const messageId = parseInt(req.params.id as string, 10);

    const parsed = ForwardChatMessageBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { targetConversationId } = parsed.data;

    // Load original message
    const [original] = await db
      .select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.id, messageId));
    if (!original) {
      res.status(404).json({ error: "Message not found" });
      return;
    }
    if (original.isDeleted) {
      res.status(400).json({ error: "Cannot forward a deleted message" });
      return;
    }

    // Verify requester is participant in source conversation
    const [sourceConvo] = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, original.conversationId));
    if (!sourceConvo) {
      res.status(404).json({ error: "Source conversation not found" });
      return;
    }
    const admin = await isAdmin(me.clerkUserId);
    if (!(await canAccessConversation(sourceConvo, me.clerkUserId, admin))) {
      res.status(403).json({ error: "Forbidden: not a participant in source conversation" });
      return;
    }

    // Verify requester is participant in target conversation
    const [targetConvo] = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, targetConversationId));
    if (!targetConvo) {
      res.status(404).json({ error: "Target conversation not found" });
      return;
    }
    if (!(await canAccessConversation(targetConvo, me.clerkUserId, admin))) {
      res.status(403).json({ error: "Forbidden: not a participant in target conversation" });
      return;
    }

    // Fetch profile for sender display
    const [profile] = await db
      .select()
      .from(userProfilesTable)
      .where(eq(userProfilesTable.clerkUserId, me.clerkUserId));

    const displayName = profile?.nickname || me.name || me.email;
    const displayAvatar = profile?.avatarUrl || me.avatarUrl || null;

    // Original sender display name for forwardedFromSenderName
    const origProfile = await db
      .select()
      .from(userProfilesTable)
      .where(eq(userProfilesTable.clerkUserId, original.senderClerkId));
    const origProfileRow = origProfile[0] ?? null;
    const forwardedFromSenderName =
      origProfileRow?.nickname || original.senderName || "";

    const [newMessage] = await db
      .insert(chatMessagesTable)
      .values({
        conversationId: targetConversationId,
        senderClerkId: me.clerkUserId,
        senderName: displayName,
        senderAvatarUrl: displayAvatar,
        senderIsAdmin: admin ? "true" : "false",
        content: original.content ?? null,
        attachmentUrl: original.attachmentUrl ?? null,
        attachmentType: original.attachmentType ?? null,
        attachmentName: original.attachmentName ?? null,
        attachmentMimeType: original.attachmentMimeType ?? null,
        attachmentSize: original.attachmentSize ?? null,
        isForwarded: true,
        forwardedFromSenderName,
      })
      .returning();

    // Update target conversation preview
    const isA = targetConvo.userAClerkId === me.clerkUserId;
    const preview = original.content
      ? `> ${original.content.slice(0, 100)}`
      : original.attachmentType === "image"
        ? "Фото (переслано)"
        : original.attachmentType === "video"
          ? "Видео (переслано)"
          : "Файл (переслано)";

    await db
      .update(conversationsTable)
      .set({
        lastMessageAt: newMessage.createdAt,
        lastMessagePreview: preview,
        ...(isA ? { lastReadAtA: newMessage.createdAt } : { lastReadAtB: newMessage.createdAt }),
      })
      .where(eq(conversationsTable.id, targetConversationId));

    res.status(201).json(
      SendChatMessageResponse.parse({
        ...newMessage,
        senderNickname: profile?.nickname ?? null,
        isDeleted: newMessage.isDeleted,
        isForwarded: newMessage.isForwarded,
        forwardedFromSenderName: newMessage.forwardedFromSenderName ?? null,
      }),
    );
  },
);

// ── Super-admin: list any user's conversations ────────────────────────────────
// GET /chat/admin/users/:clerkUserId/conversations  — owner only
router.get(
  "/chat/admin/users/:clerkUserId/conversations",
  requireOwner,
  async (req, res): Promise<void> => {
    const targetClerkId = String(req.params.clerkUserId);

    const rows = await db
      .select()
      .from(conversationsTable)
      .where(
        or(
          eq(conversationsTable.userAClerkId, targetClerkId),
          eq(conversationsTable.userBClerkId, targetClerkId),
        ),
      )
      .orderBy(desc(conversationsTable.lastMessageAt));

    const clerkIds = new Set<string>();
    for (const c of rows) {
      clerkIds.add(c.userAClerkId);
      if (c.userBClerkId) clerkIds.add(c.userBClerkId);
    }
    const allIds = Array.from(clerkIds);
    const others = allIds.length
      ? await db
          .select()
          .from(appUsersTable)
          .where(inArray(appUsersTable.clerkUserId, allIds))
      : [];
    const othersById = new Map(others.map((u) => [u.clerkUserId, u]));

    const profiles = allIds.length
      ? await db
          .select()
          .from(userProfilesTable)
          .where(inArray(userProfilesTable.clerkUserId, allIds))
      : [];
    const profilesByClerkId = new Map(profiles.map((p) => [p.clerkUserId, p]));

    const result = rows.map((c) => {
      const isA = c.userAClerkId === targetClerkId;
      const otherId = isA ? c.userBClerkId : c.userAClerkId;
      const other = otherId ? othersById.get(otherId) ?? null : null;
      const otherProfile = otherId ? profilesByClerkId.get(otherId) ?? null : null;
      const otherNickname = otherProfile?.nickname ?? null;
      const otherAvatar = otherProfile?.avatarUrl ?? other?.avatarUrl ?? null;
      const otherName = otherNickname || other?.name || other?.email || "Администрация";
      const lastReadAt = isA ? c.lastReadAtA : c.lastReadAtB;
      const unread = !lastReadAt || c.lastMessageAt > lastReadAt;

      return {
        id: c.id,
        kind: c.kind,
        title: c.kind === "support" && isA ? "Администрация" : otherName,
        otherAvatarUrl: otherAvatar,
        lastMessageAt: c.lastMessageAt,
        lastMessagePreview: c.lastMessagePreview,
        unread,
      };
    });

    res.json(ListConversationsResponse.parse(result));
  },
);

// ── Super-admin: list messages in any conversation ────────────────────────────
// GET /chat/admin/conversations/:id/messages  — owner only
router.get(
  "/chat/admin/conversations/:id/messages",
  requireOwner,
  async (req, res): Promise<void> => {
    const id = parseInt(req.params.id as string, 10);
    const [convo] = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, id));
    if (!convo) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const messages = await db
      .select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.conversationId, id))
      .orderBy(asc(chatMessagesTable.createdAt));

    if (messages.length === 0) {
      res.json(ListChatMessagesResponse.parse([]));
      return;
    }

    const senderIds = Array.from(new Set(messages.map((m) => m.senderClerkId)));
    const senderProfiles = await db
      .select()
      .from(userProfilesTable)
      .where(inArray(userProfilesTable.clerkUserId, senderIds));
    const profileBySenderId = new Map(senderProfiles.map((p) => [p.clerkUserId, p]));

    const senderAppUsers = await db
      .select()
      .from(appUsersTable)
      .where(inArray(appUsersTable.clerkUserId, senderIds));
    const appUserBySenderId = new Map(senderAppUsers.map((u) => [u.clerkUserId, u]));

    const result = messages.map((m) => {
      const profile = profileBySenderId.get(m.senderClerkId) ?? null;
      const appUser = appUserBySenderId.get(m.senderClerkId) ?? null;
      const displayName =
        profile?.nickname || m.senderName || appUser?.name || appUser?.email || "";
      const displayAvatar =
        profile?.avatarUrl || m.senderAvatarUrl || appUser?.avatarUrl || null;

      if (m.isDeleted) {
        return {
          id: m.id,
          conversationId: m.conversationId,
          senderClerkId: m.senderClerkId,
          senderName: displayName,
          senderNickname: profile?.nickname ?? null,
          senderAvatarUrl: displayAvatar,
          senderIsAdmin: m.senderIsAdmin,
          content: null,
          attachmentUrl: null,
          attachmentType: null,
          attachmentName: null,
          attachmentMimeType: null,
          attachmentSize: null,
          isDeleted: true,
          isEdited: m.isEdited,
          editedAt: m.editedAt ?? null,
          isForwarded: m.isForwarded,
          forwardedFromSenderName: m.forwardedFromSenderName ?? null,
          createdAt: m.createdAt,
        };
      }

      return {
        id: m.id,
        conversationId: m.conversationId,
        senderClerkId: m.senderClerkId,
        senderName: displayName,
        senderNickname: profile?.nickname ?? null,
        senderAvatarUrl: displayAvatar,
        senderIsAdmin: m.senderIsAdmin,
        content: m.content ?? null,
        attachmentUrl: m.attachmentUrl ?? null,
        attachmentType: m.attachmentType ?? null,
        attachmentName: m.attachmentName ?? null,
        attachmentMimeType: m.attachmentMimeType ?? null,
        attachmentSize: m.attachmentSize ?? null,
        isDeleted: false,
        isEdited: m.isEdited,
        editedAt: m.editedAt ?? null,
        isForwarded: m.isForwarded,
        forwardedFromSenderName: m.forwardedFromSenderName ?? null,
        createdAt: m.createdAt,
      };
    });

    res.json(ListChatMessagesResponse.parse(result));
  },
);

export default router;
