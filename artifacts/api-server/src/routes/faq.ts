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

type Translations = { ru?: string; en?: string; ar?: string };

/** Trim each language value and drop empties. */
function cleanTranslations(input: Translations | undefined): Translations {
  const out: Translations = {};
  for (const key of ["ru", "en", "ar"] as const) {
    const value = input?.[key]?.trim();
    if (value) out[key] = value;
  }
  return out;
}

/** Legacy single-language fallback: prefer RU, then EN, then AR. */
function primary(map: Translations): string {
  return map.ru ?? map.en ?? map.ar ?? "";
}

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

  const questionI18n = cleanTranslations(parsed.data.questionI18n);
  const answerI18n = cleanTranslations(parsed.data.answerI18n);

  if (!questionI18n.ru || !answerI18n.ru) {
    res.status(400).json({ error: "Russian question and answer are required" });
    return;
  }

  const [created] = await db
    .insert(faqItemsTable)
    .values({
      question: primary(questionI18n),
      answer: primary(answerI18n),
      questionI18n,
      answerI18n,
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
  if (parsed.data.questionI18n !== undefined) {
    const map = cleanTranslations(parsed.data.questionI18n);
    if (!map.ru) {
      res.status(400).json({ error: "Russian question is required" });
      return;
    }
    set.questionI18n = map;
    set.question = primary(map);
  }
  if (parsed.data.answerI18n !== undefined) {
    const map = cleanTranslations(parsed.data.answerI18n);
    if (!map.ru) {
      res.status(400).json({ error: "Russian answer is required" });
      return;
    }
    set.answerI18n = map;
    set.answer = primary(map);
  }
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
