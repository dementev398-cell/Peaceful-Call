import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, hadithsTable } from "@workspace/db";
import {
  ListHadithsResponse,
  ListMyHadithsResponse,
  CreateHadithBody,
  CreateHadithResponse,
  GetHadithResponse,
  UpdateHadithBody,
  UpdateHadithResponse,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/adminAuth";

const router: IRouter = Router();

router.get("/hadiths", async (req, res): Promise<void> => {
  const grade =
    typeof req.query.grade === "string" ? req.query.grade : undefined;
  const topic =
    typeof req.query.topic === "string" ? req.query.topic : undefined;

  const conditions = [eq(hadithsTable.published, true)];
  if (grade) conditions.push(eq(hadithsTable.grade, grade as any));
  if (topic) conditions.push(eq(hadithsTable.topic, topic));

  const hadiths = await db
    .select()
    .from(hadithsTable)
    .where(and(...conditions))
    .orderBy(desc(hadithsTable.createdAt));
  res.json(ListHadithsResponse.parse(hadiths));
});

router.get("/hadiths/mine", requireAdmin, async (req, res): Promise<void> => {
  const admin = req.admin!;
  const hadiths =
    admin.role === "owner"
      ? await db
          .select()
          .from(hadithsTable)
          .orderBy(desc(hadithsTable.createdAt))
      : await db
          .select()
          .from(hadithsTable)
          .where(eq(hadithsTable.authorId, admin.id))
          .orderBy(desc(hadithsTable.createdAt));
  res.json(ListMyHadithsResponse.parse(hadiths));
});

router.post("/hadiths", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateHadithBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const admin = req.admin!;

  const [hadith] = await db
    .insert(hadithsTable)
    .values({
      text: parsed.data.text,
      source: parsed.data.source ?? "",
      narrator: parsed.data.narrator ?? "",
      grade: parsed.data.grade,
      topic: parsed.data.topic ?? "",
      published: parsed.data.published ?? true,
      authorId: admin.id,
      // Hadiths are published under the site's brand, not the admin's personal name.
      authorName: "Peaceful Call",
    })
    .returning();

  res.status(201).json(CreateHadithResponse.parse(hadith));
});

router.get("/hadiths/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [hadith] = await db
    .select()
    .from(hadithsTable)
    .where(eq(hadithsTable.id, id));
  if (!hadith || !hadith.published) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(GetHadithResponse.parse(hadith));
});

router.patch("/hadiths/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);

  const parsed = UpdateHadithBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(hadithsTable)
    .where(eq(hadithsTable.id, id));
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
    .update(hadithsTable)
    .set({ ...parsed.data, updatedAt: new Date().toISOString() })
    .where(eq(hadithsTable.id, id))
    .returning();

  res.json(UpdateHadithResponse.parse(updated));
});

router.delete(
  "/hadiths/:id",
  requireAdmin,
  async (req, res): Promise<void> => {
    const id = parseInt(req.params.id as string, 10);

    const [existing] = await db
      .select()
      .from(hadithsTable)
      .where(eq(hadithsTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const admin = req.admin!;
    if (admin.role !== "owner" && existing.authorId !== admin.id) {
      res.status(403).json({ error: "Not authorized" });
      return;
    }

    await db.delete(hadithsTable).where(eq(hadithsTable.id, id));
    res.sendStatus(204);
  },
);

export default router;
