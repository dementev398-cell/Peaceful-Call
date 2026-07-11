import type { Request, Response, NextFunction } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, appUsersTable, type AppUser } from "@workspace/db";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      appUser?: AppUser;
    }
  }
}

/**
 * JIT-syncs the signed-in Clerk user into the local app_users mirror table so
 * we can list/search people to chat with and show names/avatars without
 * calling out to Clerk on every read. Cheap best-effort upsert; failures here
 * must never block the request.
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
    let avatarUrl: string | null = null;
    try {
      const user = await clerkClient.users.getUser(userId);
      email =
        user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
          ?.emailAddress ??
        user.emailAddresses[0]?.emailAddress ??
        "";
      name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || email;
      avatarUrl = user.imageUrl ?? null;
    } catch (fetchErr) {
      req.log?.error(
        { err: fetchErr, userId },
        "requireAppUser: failed to fetch Clerk user details",
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
      .values({ clerkUserId: userId, name, email, avatarUrl })
      .onConflictDoUpdate({
        target: appUsersTable.clerkUserId,
        set: { name, email, avatarUrl, updatedAt: new Date().toISOString() },
      })
      .returning();

    req.appUser = synced ?? existing;
    next();
  } catch (err) {
    req.log?.error({ err, userId }, "requireAppUser: sync failed");
    res.status(500).json({ error: "Failed to resolve user" });
  }
}
