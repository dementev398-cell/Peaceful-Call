import { Router, type IRouter } from "express";
import { eq, desc, and, count } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, hadithCommentsTable, hadithReactionsTable, hadithsTable, adminsTable } from "@workspace/db";
import { resolveAdmin } from "../middlewares/adminAuth";
import { requireAppUser } from "../middlewares/appUser";

const router: IRouter = Router();

// GET /hadiths/:id/interactions - get comments + reactions for a hadith
router.get("/hadiths/:id/interactions", async (req, res): Promise<void> => {
  const hadithId = parseInt(req.params.id as string, 10);
  if (isNaN(hadithId)) { res.status(400).json({ error: "Invalid hadith id" }); return; }

  const [hadith] = await db.select({ id: hadithsTable.id }).from(hadithsTable).where(eq(hadithsTable.id, hadithId));
  if (!hadith) { res.status(404).json({ error: "Not found" }); return; }

  const comments = await db
    .select()
    .from(hadithCommentsTable)
    .where(eq(hadithCommentsTable.hadithId, hadithId))
    .orderBy(desc(hadithCommentsTable.createdAt));

  const reactionsRaw = await db
    .select({ type: hadithReactionsTable.type, count: count() })
    .from(hadithReactionsTable)
    .where(eq(hadithReactionsTable.hadithId, hadithId))
    .groupBy(hadithReactionsTable.type);

  const likes = reactionsRaw.find(r => r.type === "like")?.count ?? 0;
  const dislikes = reactionsRaw.find(r => r.type === "dislike")?.count ?? 0;

  // Check current user's reaction
  const auth = getAuth(req);
  let myReaction: "like" | "dislike" | null = null;
  if (auth?.userId) {
    const [mine] = await db
      .select({ type: hadithReactionsTable.type })
      .from(hadithReactionsTable)
      .where(and(eq(hadithReactionsTable.hadithId, hadithId), eq(hadithReactionsTable.clerkUserId, auth.userId)));
    myReaction = (mine?.type as "like" | "dislike") ?? null;
  }

  res.json({ comments, likes: Number(likes), dislikes: Number(dislikes), myReaction });
});

// POST /hadiths/:id/comments - add comment (signed-in users only)
router.post("/hadiths/:id/comments", requireAppUser, async (req, res): Promise<void> => {
  const hadithId = parseInt(req.params.id as string, 10);
  if (isNaN(hadithId)) { res.status(400).json({ error: "Invalid hadith id" }); return; }

  const { content } = req.body;
  if (!content?.trim()) { res.status(400).json({ error: "Content is required" }); return; }

  const [hadith] = await db.select({ id: hadithsTable.id }).from(hadithsTable).where(eq(hadithsTable.id, hadithId));
  if (!hadith) { res.status(404).json({ error: "Not found" }); return; }

  const appUser = req.appUser!;
  const admin = await resolveAdmin(req);

  const [comment] = await db.insert(hadithCommentsTable).values({
    hadithId,
    authorClerkId: appUser.clerkUserId,
    authorName: appUser.name || appUser.email || "Аноним",
    authorAvatarUrl: appUser.avatarUrl,
    isAdmin: !!admin,
    content: content.trim(),
  }).returning();

  res.status(201).json(comment);
});

// DELETE /hadiths/:id/comments/:commentId - admins can delete any, users delete own
router.delete("/hadiths/:id/comments/:commentId", requireAppUser, async (req, res): Promise<void> => {
  const commentId = parseInt(req.params.commentId as string, 10);
  if (isNaN(commentId)) { res.status(400).json({ error: "Invalid comment id" }); return; }

  const [comment] = await db.select().from(hadithCommentsTable).where(eq(hadithCommentsTable.id, commentId));
  if (!comment) { res.status(404).json({ error: "Not found" }); return; }

  const appUser = req.appUser!;
  const admin = await resolveAdmin(req);

  if (comment.authorClerkId !== appUser.clerkUserId && !admin) {
    res.status(403).json({ error: "Not authorized" }); return;
  }

  await db.delete(hadithCommentsTable).where(eq(hadithCommentsTable.id, commentId));
  res.sendStatus(204);
});

// POST /hadiths/:id/react - like or dislike (signed-in only)
router.post("/hadiths/:id/react", requireAppUser, async (req, res): Promise<void> => {
  const hadithId = parseInt(req.params.id as string, 10);
  if (isNaN(hadithId)) { res.status(400).json({ error: "Invalid hadith id" }); return; }

  const { type } = req.body;
  if (type !== "like" && type !== "dislike") {
    res.status(400).json({ error: "type must be like or dislike" }); return;
  }

  const [hadith] = await db.select({ id: hadithsTable.id }).from(hadithsTable).where(eq(hadithsTable.id, hadithId));
  if (!hadith) { res.status(404).json({ error: "Not found" }); return; }

  const appUser = req.appUser!;

  const [existing] = await db
    .select()
    .from(hadithReactionsTable)
    .where(and(eq(hadithReactionsTable.hadithId, hadithId), eq(hadithReactionsTable.clerkUserId, appUser.clerkUserId)));

  if (existing) {
    if (existing.type === type) {
      // Toggle off
      await db.delete(hadithReactionsTable).where(eq(hadithReactionsTable.id, existing.id));
      res.json({ myReaction: null });
    } else {
      // Switch reaction
      await db.update(hadithReactionsTable).set({ type }).where(eq(hadithReactionsTable.id, existing.id));
      res.json({ myReaction: type });
    }
  } else {
    await db.insert(hadithReactionsTable).values({ hadithId, clerkUserId: appUser.clerkUserId, type });
    res.json({ myReaction: type });
  }
});

export default router;
