import type { Request, Response, NextFunction } from "express";
import { getAuth } from "./session";
import { eq, count, sql } from "drizzle-orm";
import { db, adminsTable, usersTable, type Admin } from "@workspace/db";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: Admin;
    }
  }
}

/**
 * Resolves the signed-in local user (if any) to an Admin row, bootstrapping
 * the very first signed-in user in the system as the "owner" admin so the
 * site always has someone who can configure content/appearance/other admins
 * without a manual DB seed step.
 */
export async function resolveAdmin(req: Request): Promise<Admin | null> {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) return null;

  const [existing] = await db
    .select()
    .from(adminsTable)
    .where(eq(adminsTable.clerkUserId, userId));
  if (existing) return existing;

  // Bootstrap: first person to ever sign in becomes the owner admin. The
  // count-check-then-insert runs inside a transaction with the admins table
  // locked for the duration, so two concurrent first sign-ins can't both
  // observe an empty table and both become owner.
  try {
    return await db.transaction(async (tx) => {
      // `SELECT count(*) ... FOR UPDATE` is rejected by Postgres (row locks
      // can't be combined with an aggregate). Use a transaction-scoped
      // advisory lock instead to serialize concurrent first-sign-ins, then
      // do a plain count.
      await tx.execute(sql`select pg_advisory_xact_lock(727390181)`);

      const [again] = await tx
        .select()
        .from(adminsTable)
        .where(eq(adminsTable.clerkUserId, userId));
      if (again) return again;

      const [{ value: adminCount }] = await tx
        .select({ value: count() })
        .from(adminsTable);

      if (adminCount > 0) return null;

      let email = "";
      let name = "";
      try {
        const [user] = await tx
          .select()
          .from(usersTable)
          .where(eq(usersTable.id, Number(userId)));
        email = user?.email ?? "";
        name = user?.name ?? "";
      } catch (fetchErr) {
        req.log?.error(
          { err: fetchErr, userId },
          "resolveAdmin: failed to fetch local user details during owner bootstrap; proceeding with empty email/name",
        );
      }

      const [created] = await tx
        .insert(adminsTable)
        .values({ clerkUserId: userId, email, name, role: "owner" })
        .returning();

      req.log?.info(
        { userId, adminId: created.id },
        "resolveAdmin: bootstrapped first signed-in user as owner admin",
      );

      return created;
    });
  } catch (err) {
    req.log?.error(
      { err, userId },
      "resolveAdmin: owner-bootstrap transaction failed",
    );
    return null;
  }
}

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const admin = await resolveAdmin(req);
  if (!admin) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }
  req.admin = admin;
  next();
}

export async function requireOwner(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const admin = await resolveAdmin(req);
  if (!admin) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }
  if (admin.role !== "owner") {
    res.status(403).json({ error: "Owner admin required" });
    return;
  }
  req.admin = admin;
  next();
}
