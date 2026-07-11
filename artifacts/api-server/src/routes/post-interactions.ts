import { Router, type IRouter } from "express";
import { eq, desc, and, count, sql } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, postCommentsTable, postReactionsTable, postsTable, adminsTable } from "@workspace/db";
import { resolveAdmin } from "../middlewares/adminAuth";
import { requireAppUser } from "../middlewares/appUser";

const router: IRouter = Router();

// GET /posts/:id/interactions - get comments + reactions for a post
router.get("/posts/:id/interactions", async (req, res): Promise<void> => {
  const postId = parseInt(req.params.id as string, 10);
  if (isNaN(postId)) { res.status(400).json({ error: "Invalid post id" }); return; }

  const [post] = await db.select({ id: postsTable.id }).from(postsTable).where(eq(postsTable.id, postId));
  if (!post) { res.status(404).json({ error: "Not found" }); return; }

  const comments = await db
    .select()
    .from(postCommentsTable)
    .where(eq(postCommentsTable.postId, postId))
    .orderBy(desc(postCommentsTable.createdAt));

  const reactionsRaw = await db
    .select({ type: postReactionsTable.type, count: count() })
    .from(postReactionsTable)
    .where(eq(postReactionsTable.postId, postId))
    .groupBy(postReactionsTable.type);

  const likes = reactionsRaw.find(r => r.type === "like")?.count ?? 0;
  const dislikes = reactionsRaw.find(r => r.type === "dislike")?.count ?? 0;

  // Check current user's reaction
  const auth = getAuth(req);
  let myReaction: "like" | "dislike" | null = null;
  if (auth?.userId) {
    const [mine] = await db
      .select({ type: postReactionsTable.type })
      .from(postReactionsTable)
      .where(and(eq(postReactionsTable.postId, postId), eq(postReactionsTable.clerkUserId, auth.userId)));
    myReaction = (mine?.type as "like" | "dislike") ?? null;
  }

  res.json({ comments, likes: Number(likes), dislikes: Number(dislikes), myReaction });
});

// POST /posts/:id/comments - add comment (signed-in users only)
router.post("/posts/:id/comments", requireAppUser, async (req, res): Promise<void> => {
  const postId = parseInt(req.params.id as string, 10);
  if (isNaN(postId)) { res.status(400).json({ error: "Invalid post id" }); return; }

  const { content } = req.body;
  if (!content?.trim()) { res.status(400).json({ error: "Content is required" }); return; }

  const [post] = await db.select({ id: postsTable.id }).from(postsTable).where(eq(postsTable.id, postId));
  if (!post) { res.status(404).json({ error: "Not found" }); return; }

  const appUser = req.appUser!;
  const admin = await resolveAdmin(req);

  const [comment] = await db.insert(postCommentsTable).values({
    postId,
    authorClerkId: appUser.clerkUserId,
    authorName: appUser.name || appUser.email || "Аноним",
    authorAvatarUrl: appUser.avatarUrl,
    isAdmin: !!admin,
    content: content.trim(),
  }).returning();

  res.status(201).json(comment);
});

// DELETE /posts/:id/comments/:commentId - admins can delete any, users delete own
router.delete("/posts/:id/comments/:commentId", requireAppUser, async (req, res): Promise<void> => {
  const commentId = parseInt(req.params.commentId as string, 10);
  if (isNaN(commentId)) { res.status(400).json({ error: "Invalid comment id" }); return; }

  const [comment] = await db.select().from(postCommentsTable).where(eq(postCommentsTable.id, commentId));
  if (!comment) { res.status(404).json({ error: "Not found" }); return; }

  const appUser = req.appUser!;
  const admin = await resolveAdmin(req);

  if (comment.authorClerkId !== appUser.clerkUserId && !admin) {
    res.status(403).json({ error: "Not authorized" }); return;
  }

  await db.delete(postCommentsTable).where(eq(postCommentsTable.id, commentId));
  res.sendStatus(204);
});

// POST /posts/:id/react - like or dislike (signed-in only)
router.post("/posts/:id/react", requireAppUser, async (req, res): Promise<void> => {
  const postId = parseInt(req.params.id as string, 10);
  if (isNaN(postId)) { res.status(400).json({ error: "Invalid post id" }); return; }

  const { type } = req.body;
  if (type !== "like" && type !== "dislike") {
    res.status(400).json({ error: "type must be like or dislike" }); return;
  }

  const [post] = await db.select({ id: postsTable.id }).from(postsTable).where(eq(postsTable.id, postId));
  if (!post) { res.status(404).json({ error: "Not found" }); return; }

  const appUser = req.appUser!;

  const [existing] = await db
    .select()
    .from(postReactionsTable)
    .where(and(eq(postReactionsTable.postId, postId), eq(postReactionsTable.clerkUserId, appUser.clerkUserId)));

  if (existing) {
    if (existing.type === type) {
      // Toggle off
      await db.delete(postReactionsTable).where(eq(postReactionsTable.id, existing.id));
      res.json({ myReaction: null });
    } else {
      // Switch reaction
      await db.update(postReactionsTable).set({ type }).where(eq(postReactionsTable.id, existing.id));
      res.json({ myReaction: type });
    }
  } else {
    await db.insert(postReactionsTable).values({ postId, clerkUserId: appUser.clerkUserId, type });
    res.json({ myReaction: type });
  }
});

export default router;
