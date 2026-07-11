import { Router, type IRouter } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { hashPassword, verifyPassword } from "../lib/passwords";
import { getAuth } from "../middlewares/session";

const router: IRouter = Router();

const RegisterBody = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
  name: z.string().trim().max(120).optional(),
});

const LoginBody = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

function publicUser(u: { id: number; email: string; name: string | null }) {
  return { id: String(u.id), email: u.email, name: u.name ?? "" };
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  const email = parsed.data.email.toLowerCase();

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(409).json({ error: "Пользователь с таким email уже зарегистрирован." });
    return;
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const [created] = await db
    .insert(usersTable)
    .values({ email, passwordHash, name: parsed.data.name?.trim() || null })
    .returning();

  await new Promise<void>((resolve, reject) => {
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });
  req.session.userId = created.id;

  res.status(201).json(publicUser(created));
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Введите email и пароль." });
    return;
  }
  const email = parsed.data.email.toLowerCase();

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    res.status(401).json({ error: "Неверный email или пароль." });
    return;
  }
  if (user.isBanned) {
    res.status(403).json({ error: "Ваш аккаунт заблокирован." });
    return;
  }

  await new Promise<void>((resolve, reject) => {
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });
  req.session.userId = user.id;

  res.json(publicUser(user));
});

router.post("/auth/logout", (req, res): void => {
  req.session.destroy(() => {
    res.clearCookie("pc.sid");
    res.json({ success: true });
  });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth.userId) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, Number(auth.userId)));
  if (!user) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }
  res.json(publicUser(user));
});

const ChangePasswordBody = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(200),
});

router.post("/auth/change-password", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth.userId) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }
  const parsed = ChangePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, Number(auth.userId)));
  if (!user || !(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
    res.status(401).json({ error: "Текущий пароль неверен." });
    return;
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, user.id));

  res.json({ success: true });
});

const ChangeEmailBody = z.object({
  currentPassword: z.string().min(1),
  newEmail: z.string().trim().email(),
});

router.post("/auth/change-email", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth.userId) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }
  const parsed = ChangeEmailBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  const newEmail = parsed.data.newEmail.toLowerCase();

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, Number(auth.userId)));
  if (!user || !(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
    res.status(401).json({ error: "Текущий пароль неверен." });
    return;
  }

  const [taken] = await db.select().from(usersTable).where(eq(usersTable.email, newEmail));
  if (taken && taken.id !== user.id) {
    res.status(409).json({ error: "Этот email уже используется." });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ email: newEmail })
    .where(eq(usersTable.id, user.id))
    .returning();

  res.json(publicUser(updated));
});

export default router;
