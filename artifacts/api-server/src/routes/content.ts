import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, contentItemsTable } from "@workspace/db";
import {
  ListContentResponse,
  UpsertContentBody,
  UpsertContentResponse,
} from "@workspace/api-zod";
import { requireOwner } from "../middlewares/adminAuth";

const router: IRouter = Router();

router.get("/content", async (_req, res): Promise<void> => {
  const items = await db
    .select()
    .from(contentItemsTable)
    .orderBy(contentItemsTable.group, contentItemsTable.order);
  res.json(ListContentResponse.parse(items));
});

router.put("/content", requireOwner, async (req, res): Promise<void> => {
  const parsed = UpsertContentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  for (const item of parsed.data.items) {
    await db
      .insert(contentItemsTable)
      .values(item)
      .onConflictDoUpdate({
        target: contentItemsTable.key,
        set: {
          group: item.group,
          label: item.label,
          type: item.type,
          value: item.value,
          order: item.order ?? 0,
        },
      });
  }

  const items = await db
    .select()
    .from(contentItemsTable)
    .orderBy(contentItemsTable.group, contentItemsTable.order);
  res.json(UpsertContentResponse.parse(items));
});

router.delete(
  "/content/:key",
  requireOwner,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.key)
      ? req.params.key[0]
      : req.params.key;
    const [deleted] = await db
      .delete(contentItemsTable)
      .where(eq(contentItemsTable.key, raw))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.sendStatus(204);
  },
);

export default router;
