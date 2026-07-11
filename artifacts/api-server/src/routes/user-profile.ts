import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { getAuth } from "../middlewares/session";
import { db, userProfilesTable, appUsersTable, usersTable } from "@workspace/db";
import { requireAppUser } from "../middlewares/appUser";

const router: IRouter = Router();

// Postgres unique_violation error code
const UNIQUE_VIOLATION = "23505";

async function isNicknameTaken(nickname: string, excludeClerkUserId?: string): Promise<boolean> {
  const rows = await db
    .select({ id: userProfilesTable.id })
    .from(userProfilesTable)
    .where(sql`lower(${userProfilesTable.nickname}) = lower(${nickname})`);
  if (rows.length === 0) return false;
  if (!excludeClerkUserId) return true;
  const [existing] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, excludeClerkUserId));
  return !(existing && rows.length === 1 && rows[0].id === existing.id);
}

// Generates a unique fallback nickname from local user data, appending a
// numeric suffix if the base nickname is already taken by someone else.
async function generateUniqueFallbackNickname(userId: string): Promise<string> {
  let base = "User";
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, Number(userId)));
    base = user?.name?.trim() || user?.email?.split("@")[0] || "User";
  } catch {
    // best-effort
  }

  let candidate = base;
  let suffix = 0;
  // Guard against pathological loops; a few hundred attempts is more than enough.
  while (await isNicknameTaken(candidate) && suffix < 1000) {
    suffix += 1;
    candidate = `${base}${suffix}`;
  }
  return candidate;
}

// GET /profile/me — returns current user's profile (including allowDirectMessages), creating a default on first access
router.get("/profile/me", requireAppUser, async (req, res): Promise<void> => {
  const auth = getAuth(req);
  const userId = auth!.userId!;

  const [existing] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, userId));

  // Also fetch allowDirectMessages from appUsersTable
  const [appUser] = await db
    .select({ allowDirectMessages: appUsersTable.allowDirectMessages })
    .from(appUsersTable)
    .where(eq(appUsersTable.clerkUserId, userId));

  const allowDirectMessages = appUser?.allowDirectMessages ?? true;

  if (existing) {
    res.json({ ...existing, allowDirectMessages });
    return;
  }

  const nickname = await generateUniqueFallbackNickname(userId);

  const [created] = await db
    .insert(userProfilesTable)
    .values({ clerkUserId: userId, nickname })
    .returning();

  res.json({ ...created, allowDirectMessages });
});

// PATCH /profile/me — update nickname, avatarUrl, and/or allowDirectMessages
router.patch("/profile/me", requireAppUser, async (req, res): Promise<void> => {
  const auth = getAuth(req);
  const userId = auth!.userId!;

  const { nickname, avatarUrl, allowDirectMessages } = req.body as {
    nickname?: string;
    avatarUrl?: string | null;
    allowDirectMessages?: boolean;
  };

  if (nickname !== undefined && typeof nickname !== "string") {
    res.status(400).json({ error: "nickname must be a string" });
    return;
  }
  if (nickname !== undefined && nickname.trim().length === 0) {
    res.status(400).json({ error: "nickname cannot be empty" });
    return;
  }
  if (allowDirectMessages !== undefined && typeof allowDirectMessages !== "boolean") {
    res.status(400).json({ error: "allowDirectMessages must be a boolean" });
    return;
  }

  // Fetch or create the profile row
  let [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, userId));

  if (!profile) {
    // Auto-create profile first
    const fallbackNickname = await generateUniqueFallbackNickname(userId);
    const [created] = await db
      .insert(userProfilesTable)
      .values({ clerkUserId: userId, nickname: fallbackNickname })
      .returning();
    profile = created;
  }

  const updates: Partial<typeof userProfilesTable.$inferInsert> = {};

  if (nickname !== undefined) {
    const trimmed = nickname.trim();

    // Check if the nickname has ever been changed from auto-generated default.
    // nicknameUpdatedAt equals createdAt when it was never manually changed.
    const neverChanged =
      profile.nicknameUpdatedAt === profile.createdAt;

    if (!neverChanged) {
      // Enforce 30-day cooldown on subsequent changes
      const lastChange = new Date(profile.nicknameUpdatedAt).getTime();
      const now = Date.now();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      if (now - lastChange < thirtyDaysMs) {
        const nextAllowed = new Date(lastChange + thirtyDaysMs).toISOString();
        res.status(429).json({
          error: `Nickname can only be changed once every 30 days. Next change allowed after ${nextAllowed}.`,
        });
        return;
      }
    }

    if (await isNicknameTaken(trimmed, userId)) {
      res.status(409).json({ error: "Этот никнейм уже занят. Пожалуйста, выберите другой." });
      return;
    }

    updates.nickname = trimmed;
    updates.nicknameUpdatedAt = new Date().toISOString();
  }

  if (avatarUrl !== undefined) {
    updates.avatarUrl = avatarUrl ?? null;
  }

  // Handle allowDirectMessages update in appUsersTable (upsert, mirroring JIT-sync pattern)
  let finalAllowDirectMessages: boolean = true;
  if (allowDirectMessages !== undefined) {
    const [upserted] = await db
      .insert(appUsersTable)
      .values({
        clerkUserId: userId,
        name: req.appUser?.name ?? "",
        email: req.appUser?.email ?? "",
        avatarUrl: req.appUser?.avatarUrl ?? null,
        allowDirectMessages,
      })
      .onConflictDoUpdate({
        target: appUsersTable.clerkUserId,
        set: { allowDirectMessages, updatedAt: new Date().toISOString() },
      })
      .returning({ allowDirectMessages: appUsersTable.allowDirectMessages });
    finalAllowDirectMessages = upserted?.allowDirectMessages ?? allowDirectMessages;
  } else {
    // Fetch current value to include in response
    const [appUser] = await db
      .select({ allowDirectMessages: appUsersTable.allowDirectMessages })
      .from(appUsersTable)
      .where(eq(appUsersTable.clerkUserId, userId));
    finalAllowDirectMessages = appUser?.allowDirectMessages ?? true;
  }

  if (Object.keys(updates).length === 0) {
    res.json({ ...profile, allowDirectMessages: finalAllowDirectMessages });
    return;
  }

  try {
    const [updated] = await db
      .update(userProfilesTable)
      .set(updates)
      .where(eq(userProfilesTable.clerkUserId, userId))
      .returning();

    res.json({ ...updated, allowDirectMessages: finalAllowDirectMessages });
  } catch (err: unknown) {
    // Fallback safety net in case of a race condition past the pre-check above;
    // the DB-level unique constraint on nickname is the ultimate source of truth.
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === UNIQUE_VIOLATION
    ) {
      res.status(409).json({ error: "Этот никнейм уже занят. Пожалуйста, выберите другой." });
      return;
    }
    throw err;
  }
});

// GET /profile/:clerkUserId — public read-only lookup
router.get("/profile/:clerkUserId", async (req, res): Promise<void> => {
  const { clerkUserId } = req.params;

  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, clerkUserId as string));

  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  res.json(profile);
});

// GET /users/:clerkUserId/messaging-status — public endpoint for checking if a user allows DMs
router.get("/users/:clerkUserId/messaging-status", async (req, res): Promise<void> => {
  const { clerkUserId } = req.params;

  const [appUser] = await db
    .select({ allowDirectMessages: appUsersTable.allowDirectMessages })
    .from(appUsersTable)
    .where(eq(appUsersTable.clerkUserId, clerkUserId as string));

  // If user doesn't exist in app_users yet, default to allowing DMs
  res.json({ allowDirectMessages: appUser?.allowDirectMessages ?? true });
});

export default router;
