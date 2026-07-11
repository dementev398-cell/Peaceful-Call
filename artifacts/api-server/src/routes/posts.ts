import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, postsTable } from "@workspace/db";
import {
  ListPostsResponse,
  ListMyPostsResponse,
  CreatePostBody,
  CreatePostResponse,
  GetPostBySlugResponse,
  UpdatePostBody,
  UpdatePostResponse,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/adminAuth";

const router: IRouter = Router();

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "post"
  );
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let n = 2;
  for (;;) {
    const [existing] = await db
      .select({ id: postsTable.id })
      .from(postsTable)
      .where(eq(postsTable.slug, slug));
    if (!existing) return slug;
    slug = `${base}-${n++}`;
  }
}

router.get("/posts", async (_req, res): Promise<void> => {
  const posts = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.published, true))
    .orderBy(desc(postsTable.createdAt));
  res.json(ListPostsResponse.parse(posts));
});

router.get("/posts/mine", requireAdmin, async (req, res): Promise<void> => {
  const admin = req.admin!;
  const posts =
    admin.role === "owner"
      ? await db.select().from(postsTable).orderBy(desc(postsTable.createdAt))
      : await db
          .select()
          .from(postsTable)
          .where(eq(postsTable.authorId, admin.id))
          .orderBy(desc(postsTable.createdAt));
  res.json(ListMyPostsResponse.parse(posts));
});

router.post("/posts", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreatePostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const admin = req.admin!;
  const slug = await uniqueSlug(slugify(parsed.data.title));

  const [post] = await db
    .insert(postsTable)
    .values({
      title: parsed.data.title,
      slug,
      excerpt: parsed.data.excerpt ?? "",
      content: parsed.data.content ?? "",
      coverImageUrl: parsed.data.coverImageUrl ?? null,
      attachments: parsed.data.attachments ?? [],
      published: parsed.data.published ?? true,
      authorId: admin.id,
      // Posts are published under the site's brand, not the admin's personal name.
      authorName: "Peaceful Call",
    })
    .returning();

  res.status(201).json(CreatePostResponse.parse(post));
});

router.get("/posts/:slug", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.slug)
    ? req.params.slug[0]
    : req.params.slug;
  const [post] = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.slug, raw));
  if (!post || !post.published) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(GetPostBySlugResponse.parse(post));
});

router.patch(
  "/posts/id/:id",
  requireAdmin,
  async (req, res): Promise<void> => {
    const rawId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    const id = parseInt(rawId, 10);

    const parsed = UpdatePostBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [existing] = await db
      .select()
      .from(postsTable)
      .where(eq(postsTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const admin = req.admin!;
    if (admin.role !== "owner" && existing.authorId !== admin.id) {
      res.status(403).json({ error: "Not authorized" });
      return;
    }

    const [updated] = await db
      .update(postsTable)
      .set(parsed.data)
      .where(eq(postsTable.id, id))
      .returning();

    res.json(UpdatePostResponse.parse(updated));
  },
);

router.delete(
  "/posts/id/:id",
  requireAdmin,
  async (req, res): Promise<void> => {
    const rawId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    const id = parseInt(rawId, 10);

    const [existing] = await db
      .select()
      .from(postsTable)
      .where(eq(postsTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const admin = req.admin!;
    if (admin.role !== "owner" && existing.authorId !== admin.id) {
      res.status(403).json({ error: "Not authorized" });
      return;
    }

    await db.delete(postsTable).where(eq(postsTable.id, id));
    res.sendStatus(204);
  },
);

export default router;
