import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import type { Request } from "express";
import { pool } from "@workspace/db";

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

const PgSession = connectPgSimple(session);

const isProd = process.env.NODE_ENV === "production";

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be set");
}

// connect-pg-simple's createTableIfMissing reads a `table.sql` asset from its
// own package directory at runtime, which does not survive esbuild bundling
// (the file is not copied into dist/). Create the table ourselves instead —
// idempotent, and works the same in dev and in a bundled production build.
export async function ensureSessionTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "user_sessions" (
      "sid" varchar NOT NULL COLLATE "default",
      "sess" json NOT NULL,
      "expire" timestamp(6) NOT NULL
    ) WITH (OIDS=FALSE);
  `);
  try {
    await pool.query(
      'ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;',
    );
  } catch (err: any) {
    // 42P16 = multiple_primary_keys (constraint already exists) — safe to ignore.
    if (err?.code !== "42P16") throw err;
  }
  await pool.query(
    'CREATE INDEX IF NOT EXISTS "IDX_user_sessions_expire" ON "user_sessions" ("expire");',
  );
}

export const sessionMiddleware = session({
  store: new PgSession({
    pool,
    tableName: "user_sessions",
    createTableIfMissing: false,
  }),
  name: "pc.sid",
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
});

/**
 * Drop-in replacement for Clerk's `getAuth(req)` — returns the signed-in
 * local user id (stringified) from the session, or undefined if signed out.
 */
export function getAuth(req: Request): { userId?: string } {
  return {
    userId: req.session.userId != null ? String(req.session.userId) : undefined,
  };
}
