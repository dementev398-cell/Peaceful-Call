import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, faqItemsTable } from "@workspace/db";
import {
  ListFaqResponse,
  CreateFaqBody,
  UpdateFaqBody,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/adminAuth";

const router: IRouter = Router();

// Public: FAQ shown on the home page.
router.get("/faq", async (_req, res): Promise<void> => {
  const items = await db
    .select()
    .from(faqItemsTable)
    .orderBy(faqItemsTable.order, faqItemsTable.id);
  res.json(ListFaqResponse.parse(items));
});

router.post("/faq", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateFaqBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [created] = await db
    .insert(faqItemsTable)
    .values({
      question: parsed.data.question,
      answer: parsed.data.answer,
      order: parsed.data.order ?? 0,
    })
    .returning();

  res.status(201).json(created);
});

router.patch("/faq/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const parsed = UpdateFaqBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const set: Record<string, unknown> = {};
  if (parsed.data.question !== undefined) set.question = parsed.data.question;
  if (parsed.data.answer !== undefined) set.answer = parsed.data.answer;
  if (parsed.data.order !== undefined) set.order = parsed.data.order;

  const [updated] = await db
    .update(faqItemsTable)
    .set(set)
    .where(eq(faqItemsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

router.delete("/faq/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [deleted] = await db
    .delete(faqItemsTable)
    .where(eq(faqItemsTable.id, id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
