import type { Request, Response, NextFunction } from "express";
import { getAuth } from "./session";
import { eq } from "drizzle-orm";
import { db, appUsersTable, usersTable, type AppUser } from "@workspace/db";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      appUser?: AppUser;
    }
  }
}

/**
 * JIT-syncs the signed-in local user into the app_users mirror table so we
 * can list/search people to chat with and show names/avatars without
 * re-reading the users table on every read. Cheap best-effort upsert;
 * failures here must never block the request. Never overwrites avatarUrl —
 * that's only ever set via PATCH /profile/me.
 */
export async function requireAppUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }

  try {
    let name = "";
    let email = "";
    try {
      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, Number(userId)));
      email = user?.email ?? "";
      name = user?.name?.trim() || email;
    } catch (fetchErr) {
      req.log?.error(
        { err: fetchErr, userId },
        "requireAppUser: failed to fetch local user details",
      );
    }

    const [existing] = await db
      .select()
      .from(appUsersTable)
      .where(eq(appUsersTable.clerkUserId, userId));

    if (existing && !name && !email) {
      req.appUser = existing;
      next();
      return;
    }

    const [synced] = await db
      .insert(appUsersTable)
      .values({ clerkUserId: userId, name, email, avatarUrl: null })
      .onConflictDoUpdate({
        target: appUsersTable.clerkUserId,
        set: { name, email, updatedAt: new Date().toISOString() },
      })
      .returning();

    req.appUser = synced ?? existing;
    next();
  } catch (err) {
    req.log?.error({ err, userId }, "requireAppUser: sync failed");
    res.status(500).json({ error: "Failed to resolve user" });
  }
}
