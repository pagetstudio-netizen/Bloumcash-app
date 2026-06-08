import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  usersTable, transactionsTable,
  adminUsersTable, adminNotificationsTable, blacklistTable,
  blockedIpsTable, whitelistedIpsTable, securityEventsTable,
  adminSettingsTable, countriesConfigTable, operatorsConfigTable,
  dashboardBannersTable, promotionsTable,
  verificationCodesTable, adminDevicesTable,
} from "@workspace/db";
import { eq, desc, sql, asc, count, and, gte, isNotNull, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { requireAdmin, signAdminToken } from "../middleware/admin-auth";
import * as paydunya from "../lib/paydunya";
import { sendPushNotification, isOneSignalConfigured } from "../lib/onesignal";
import { sendAdminVerificationCode, sendMassEmail } from "../lib/email";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const router: IRouter = Router();

/* ─────────────────────────── AUTH ─────────────────────────── */

/* Génère un device fingerprint depuis les headers */
function deviceHash(req: import("express").Request): string {
  const ua = req.headers["user-agent"] ?? "";
  const lang = req.headers["accept-language"] ?? "";
  const ip = req.ip ?? "";
  return crypto.createHash("sha256").update(`${ua}|${lang}|${ip}`).digest("hex").slice(0, 32);
}

/* Génère un code 6 chiffres */
function genCode(): string {
  return String(Math.floor(100000 + crypto.randomInt(900000))).padStart(6, "0");
}

/* Étape 1 : login + vérification mot de passe → renvoie si 2FA requis */
router.post("/admin/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email et mot de passe requis" }); return;
    }
    const admins = await db.select().from(adminUsersTable).where(eq(adminUsersTable.email, email)).limit(1);
    if (!admins.length) { res.status(401).json({ error: "Identifiants incorrects" }); return; }
    const admin = admins[0];
    const ok = await bcrypt.compare(String(password), admin.passwordHash);
    if (!ok) { res.status(401).json({ error: "Identifiants incorrects" }); return; }

    const dHash = deviceHash(req);
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 3600 * 1000);

    /* ── Bypass OTP unique pour aujourd'hui ── */
    const bypassKey = `admin_otp_bypass_${admin.id}`;
    const todayStr = now.toISOString().slice(0, 10); /* YYYY-MM-DD */
    const bypassRows = await db.select().from(adminSettingsTable)
      .where(eq(adminSettingsTable.key, bypassKey)).limit(1);
    const bypassValid = bypassRows[0]?.value === todayStr;

    if (bypassValid) {
      /* Consommer le bypass (usage unique) */
      await db.delete(adminSettingsTable).where(eq(adminSettingsTable.key, bypassKey));
      /* Enregistrer l'appareil et la dernière connexion */
      const lastLoginKey = `admin_last_login_${admin.id}`;
      await db.insert(adminDevicesTable).values({ adminEmail: email, deviceHash: dHash })
        .onConflictDoUpdate({ target: [adminDevicesTable.adminEmail, adminDevicesTable.deviceHash], set: { lastSeenAt: now } });
      await db.insert(adminSettingsTable).values({ key: lastLoginKey, value: now.toISOString() })
        .onConflictDoUpdate({ target: adminSettingsTable.key, set: { value: now.toISOString(), updatedAt: now } });
      const token = signAdminToken({ id: admin.id, email: admin.email, role: admin.role });
      req.log.info({ adminId: admin.id }, "Admin bypass OTP utilisé — appareil enregistré");
      res.json({ token, admin: { id: admin.id, fullName: admin.fullName, email: admin.email, role: admin.role } });
      return;
    }

    /* Vérifier si appareil connu */
    const knownDevice = await db.select().from(adminDevicesTable).where(
      and(eq(adminDevicesTable.adminEmail, email), eq(adminDevicesTable.deviceHash, dHash))
    ).limit(1);

    /* On stocke la dernière connexion dans un setting par email */
    const lastLoginKey = `admin_last_login_${admin.id}`;
    const lastLoginRows = await db.select().from(adminSettingsTable)
      .where(eq(adminSettingsTable.key, lastLoginKey)).limit(1);
    const lastLogin = lastLoginRows[0]?.value ? new Date(lastLoginRows[0].value) : null;
    const isInactive = !lastLogin || lastLogin < threeDaysAgo;

    const isNewDevice = knownDevice.length === 0;
    const needs2FA = isNewDevice || isInactive;

    if (needs2FA) {
      /* Générer et envoyer code */
      const code = genCode();
      const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); /* 10 min */

      /* Supprimer anciens codes admin */
      await db.delete(verificationCodesTable).where(
        and(eq(verificationCodesTable.email, email), eq(verificationCodesTable.type, "admin_login"))
      );
      await db.insert(verificationCodesTable).values({ email, code, type: "admin_login", expiresAt });

      sendAdminVerificationCode({
        to: admin.email,
        fullName: admin.fullName,
        code,
        reason: isNewDevice ? "new_device" : "inactivity",
      }).catch((e) => req.log.error({ e }, "Erreur envoi code admin"));

      res.json({ requires2FA: true, reason: isNewDevice ? "new_device" : "inactivity" });
      return;
    }

    /* Pas de 2FA — connexion directe */
    const token = signAdminToken({ id: admin.id, email: admin.email, role: admin.role });
    /* Mettre à jour lastLogin et device */
    await db.insert(adminSettingsTable).values({ key: lastLoginKey, value: now.toISOString() })
      .onConflictDoUpdate({ target: adminSettingsTable.key, set: { value: now.toISOString(), updatedAt: now } });
    await db.insert(adminDevicesTable).values({ adminEmail: email, deviceHash: dHash })
      .onConflictDoNothing();

    res.json({ token, admin: { id: admin.id, fullName: admin.fullName, email: admin.email, role: admin.role } });
  } catch (err) { req.log.error({ err }, "Admin login error"); res.status(500).json({ error: "Erreur serveur" }); }
});

/* Étape 2 : vérification du code 2FA admin */
router.post("/admin/auth/verify-2fa", async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      res.status(400).json({ error: "Email et code requis" }); return;
    }

    const now = new Date();
    const codes = await db.select().from(verificationCodesTable).where(
      and(
        eq(verificationCodesTable.email, email),
        eq(verificationCodesTable.code, String(code)),
        eq(verificationCodesTable.type, "admin_login"),
        gt(verificationCodesTable.expiresAt, now),
      )
    ).limit(1);

    if (!codes.length || codes[0].usedAt) {
      res.status(400).json({ error: "Code invalide ou expiré" }); return;
    }

    const admins = await db.select().from(adminUsersTable).where(eq(adminUsersTable.email, email)).limit(1);
    if (!admins.length) { res.status(401).json({ error: "Admin introuvable" }); return; }
    const admin = admins[0];

    /* Marquer code comme utilisé */
    await db.update(verificationCodesTable).set({ usedAt: now }).where(eq(verificationCodesTable.id, codes[0].id));

    /* Enregistrer appareil et mise à jour lastLogin */
    const dHash = deviceHash(req);
    const lastLoginKey = `admin_last_login_${admin.id}`;
    await db.insert(adminDevicesTable).values({ adminEmail: email, deviceHash: dHash })
      .onConflictDoUpdate({ target: [adminDevicesTable.adminEmail, adminDevicesTable.deviceHash], set: { lastSeenAt: now } });
    await db.insert(adminSettingsTable).values({ key: lastLoginKey, value: now.toISOString() })
      .onConflictDoUpdate({ target: adminSettingsTable.key, set: { value: now.toISOString(), updatedAt: now } });

    const token = signAdminToken({ id: admin.id, email: admin.email, role: admin.role });
    res.json({ token, admin: { id: admin.id, fullName: admin.fullName, email: admin.email, role: admin.role } });
  } catch (err) { req.log.error({ err }, "Admin 2FA verify error"); res.status(500).json({ error: "Erreur serveur" }); }
});

/* ─────────────────────────── STATS ─────────────────────────── */
router.get("/admin/stats", requireAdmin, async (req, res) => {
  try {
    // Charger last_reset et taux de commission depuis les paramètres
    const settingRows = await db.select().from(adminSettingsTable).where(
      sql`key IN ('last_reset', 'fee_deposit_percent')`
    );
    const resetSetting = settingRows.find(s => s.key === "last_reset");
    const rateSetting  = settingRows.find(s => s.key === "fee_deposit_percent");
    const lastReset    = resetSetting?.value ? new Date(resetSetting.value) : null;
    const commRate     = rateSetting?.value  ? parseFloat(rateSetting.value) : 3.5;

    // Filtre depuis last_reset (ou depuis toujours si pas encore réinitialisé)
    const sinceFilter = lastReset ? gte(transactionsTable.createdAt, lastReset) : undefined;
    const withSince = (...extras: (ReturnType<typeof eq> | undefined)[]) => {
      const all = [sinceFilter, ...extras].filter(Boolean) as ReturnType<typeof eq>[];
      return all.length === 0 ? undefined : all.length === 1 ? all[0] : and(...all as [ReturnType<typeof eq>, ReturnType<typeof eq>]);
    };

    const [userStats] = await db.select({ total: count() }).from(usersTable);
    const [txStats] = await db.select({
      total: count(),
      totalAmount: sql<number>`COALESCE(SUM(amount),0)`,
      totalFees: sql<number>`COALESCE(SUM(fees),0)`,
    }).from(transactionsTable).where(withSince());
    const [deposits] = await db.select({
      total: sql<number>`COALESCE(SUM(amount),0)`,
    }).from(transactionsTable).where(withSince(eq(transactionsTable.type, "incoming")));
    const [withdraws] = await db.select({
      total: sql<number>`COALESCE(SUM(amount),0)`,
    }).from(transactionsTable).where(withSince(eq(transactionsTable.type, "outgoing")));
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [todayFees] = await db.select({
      total: sql<number>`COALESCE(SUM(fees),0)`,
    }).from(transactionsTable).where(
      and(eq(transactionsTable.status, "success"), gte(transactionsTable.createdAt, today))
    );
    const [pendingCount] = await db.select({ total: count() }).from(transactionsTable).where(eq(transactionsTable.status, "pending"));
    const [blacklistCount] = await db.select({ total: count() }).from(blacklistTable);
    res.json({
      users: { total: userStats.total, verified: 0 },
      transactions: { count: txStats.total, totalAmount: Number(txStats.totalAmount) },
      deposits: { total: Number(deposits.total) },
      withdrawals: { total: Number(withdraws.total) },
      commissions: { today: Number(todayFees.total), total: Number(txStats.totalFees), rate: commRate },
      pending: { count: pendingCount.total },
      blacklist: { count: blacklistCount.total },
      since: lastReset ? lastReset.toISOString() : null,
    });
  } catch (err) { req.log.error({ err }, "Admin stats error"); res.status(500).json({ error: "Erreur serveur" }); }
});

/* ─────────────────────────── CHARTS ─────────────────────────── */
router.get("/admin/stats/charts", requireAdmin, async (req, res) => {
  try {
    const days = parseInt((req.query.days as string) ?? "30");
    const since = new Date(); since.setDate(since.getDate() - days); since.setHours(0, 0, 0, 0);

    const txRows = await db.execute(sql`
      SELECT
        DATE(created_at AT TIME ZONE 'UTC') AS day,
        COUNT(*) AS tx_count,
        COALESCE(SUM(CASE WHEN type = 'incoming' THEN amount ELSE 0 END), 0) AS deposits,
        COALESCE(SUM(CASE WHEN type = 'outgoing' THEN amount ELSE 0 END), 0) AS withdrawals,
        COALESCE(SUM(fees), 0) AS commissions
      FROM transactions
      WHERE created_at >= ${since.toISOString()}
      GROUP BY DATE(created_at AT TIME ZONE 'UTC')
      ORDER BY day
    `);

    const userRows = await db.execute(sql`
      SELECT
        DATE(created_at AT TIME ZONE 'UTC') AS day,
        COUNT(*) AS new_users
      FROM users
      WHERE created_at >= ${since.toISOString()}
      GROUP BY DATE(created_at AT TIME ZONE 'UTC')
      ORDER BY day
    `);

    const allDays: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      allDays.push(d.toISOString().split("T")[0]);
    }

    const txMap = new Map<string, { tx_count: number; deposits: number; withdrawals: number; commissions: number }>();
    for (const r of txRows.rows as Array<{ day: string; tx_count: string; deposits: string; withdrawals: string; commissions: string }>) {
      txMap.set(String(r.day).split("T")[0], { tx_count: Number(r.tx_count), deposits: Number(r.deposits), withdrawals: Number(r.withdrawals), commissions: Number(r.commissions) });
    }

    const userMap = new Map<string, number>();
    for (const r of userRows.rows as Array<{ day: string; new_users: string }>) {
      userMap.set(String(r.day).split("T")[0], Number(r.new_users));
    }

    const chart = allDays.map(day => ({
      day,
      label: new Date(day + "T00:00:00Z").toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
      transactions: txMap.get(day)?.tx_count ?? 0,
      deposits: txMap.get(day)?.deposits ?? 0,
      withdrawals: txMap.get(day)?.withdrawals ?? 0,
      commissions: txMap.get(day)?.commissions ?? 0,
      newUsers: userMap.get(day) ?? 0,
    }));

    res.json({ chart });
  } catch (err) { req.log.error({ err }, "Charts error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.post("/admin/reset", requireAdmin, async (req, res) => {
  try {
    const now = new Date().toISOString();
    const settings = await db.select().from(adminSettingsTable).where(eq(adminSettingsTable.key, "last_reset"));
    if (settings.length) {
      await db.update(adminSettingsTable).set({ value: now, updatedAt: new Date() }).where(eq(adminSettingsTable.key, "last_reset"));
    } else {
      await db.insert(adminSettingsTable).values({ key: "last_reset", value: now });
    }
    res.json({ success: true, resetAt: now });
  } catch (err) { req.log.error({ err }, "Reset error"); res.status(500).json({ error: "Erreur serveur" }); }
});

/* ─────────────────────────── USERS ─────────────────────────── */
router.get("/admin/users", requireAdmin, async (req, res) => {
  try {
    const { search, status, page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const offset = (pageNum - 1) * limitNum;
    const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt)).limit(limitNum).offset(offset);
    const [total] = await db.select({ count: count() }).from(usersTable);

    const balanceRows = await db.execute(sql`
      SELECT
        user_id,
        COALESCE(SUM(CASE WHEN type = 'incoming' AND status = 'success' THEN amount ELSE 0 END), 0)
        - COALESCE(SUM(CASE WHEN type = 'outgoing' AND status = 'success' THEN amount ELSE 0 END), 0) AS balance
      FROM transactions
      GROUP BY user_id
    `);
    const balMap = new Map<number, number>();
    for (const r of balanceRows.rows as Array<{ user_id: number; balance: string }>) {
      balMap.set(Number(r.user_id), Number(r.balance));
    }

    let result = users.map(u => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone ?? null,
      operator: u.operator ?? null,
      status: u.status,
      balance: balMap.get(u.id) ?? 0,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt ?? null,
    }));

    if (search) result = result.filter(u => u.fullName.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()) || (u.phone ?? "").includes(search));
    if (status) result = result.filter(u => u.status === status);

    res.json({ users: result, total: total.count, page: pageNum });
  } catch (err) { req.log.error({ err }, "Admin list users error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.get("/admin/users/:id", requireAdmin, async (req, res) => {
  try {
    const users = await db.select().from(usersTable).where(eq(usersTable.id, parseInt(req.params.id as string))).limit(1);
    if (!users.length) { res.status(404).json({ error: "Utilisateur introuvable" }); return; }
    const u = users[0];
    const txs = await db.select().from(transactionsTable).where(eq(transactionsTable.userId, u.id)).limit(10).orderBy(desc(transactionsTable.createdAt));
    res.json({ id: u.id, fullName: u.fullName, email: u.email, phone: u.phone, operator: u.operator, status: u.status, createdAt: u.createdAt, lastLoginAt: u.lastLoginAt, village: u.village, city: u.city, region: u.region, country: u.country, transactions: txs });
  } catch (err) { req.log.error({ err }, "Admin get user error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.put("/admin/users/:id", requireAdmin, async (req, res) => {
  try {
    const { fullName, email } = req.body;
    const userId = parseInt(req.params.id as string);
    await db.update(usersTable).set({ fullName, email }).where(eq(usersTable.id, userId));
    await db.insert(securityEventsTable).values({ type: "user_edited", details: `User #${userId} modifié par ${(req as any).admin?.email ?? "admin"} — nom: ${fullName ?? ""}, email: ${email ?? ""}` });
    res.json({ success: true });
  } catch (err) { req.log.error({ err }, "Admin update user error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.delete("/admin/users/:id", requireAdmin, async (req, res) => {
  try {
    await db.delete(usersTable).where(eq(usersTable.id, parseInt(req.params.id as string)));
    res.json({ success: true });
  } catch (err) { req.log.error({ err }, "Admin delete user error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.post("/admin/users/:id/reset-pin", requireAdmin, async (req, res) => {
  try {
    const { newPin } = req.body;
    if (!newPin || String(newPin).length !== 6) { res.status(400).json({ error: "PIN 6 chiffres requis" }); return; }
    const hashed = await bcrypt.hash(String(newPin), 10);
    await db.update(usersTable).set({ pin: hashed }).where(eq(usersTable.id, parseInt(req.params.id as string)));
    res.json({ success: true });
  } catch (err) { req.log.error({ err }, "Reset PIN error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.post("/admin/users/:id/credit", requireAdmin, async (req, res) => {
  try {
    const { amount, reason } = req.body;
    const amt = parseInt(amount);
    if (!amt || amt <= 0) { res.status(400).json({ error: "Montant invalide" }); return; }
    const userId = parseInt(req.params.id as string);
    const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!users.length) { res.status(404).json({ error: "Utilisateur introuvable" }); return; }
    const ref = `ADMIN-CR-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    await db.insert(transactionsTable).values({
      userId, reference: ref, type: "incoming", title: "Crédit admin",
      amount: amt, fees: 0, status: "success", operator: "Admin",
      description: reason ?? "Crédit manuel par administrateur",
    });
    await db.insert(securityEventsTable).values({ type: "admin_credit", details: `User #${userId} crédité de ${amt} FCFA — ${reason ?? ""}` });
    res.json({ success: true, reference: ref });
  } catch (err) { req.log.error({ err }, "Credit user error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.post("/admin/users/:id/debit", requireAdmin, async (req, res) => {
  try {
    const { amount, reason } = req.body;
    const amt = parseInt(amount);
    if (!amt || amt <= 0) { res.status(400).json({ error: "Montant invalide" }); return; }
    const userId = parseInt(req.params.id as string);
    const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!users.length) { res.status(404).json({ error: "Utilisateur introuvable" }); return; }
    const ref = `ADMIN-DB-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    await db.insert(transactionsTable).values({
      userId, reference: ref, type: "outgoing", title: "Débit admin",
      amount: amt, fees: 0, status: "success", operator: "Admin",
      description: reason ?? "Débit manuel par administrateur",
    });
    await db.insert(securityEventsTable).values({ type: "admin_debit", details: `User #${userId} débité de ${amt} FCFA — ${reason ?? ""}` });
    res.json({ success: true, reference: ref });
  } catch (err) { req.log.error({ err }, "Debit user error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.post("/admin/users/:id/suspend", requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id as string);
    await db.update(usersTable).set({ status: "suspended" }).where(eq(usersTable.id, userId));
    await db.insert(securityEventsTable).values({ type: "user_suspended", details: `User #${userId} suspendu par ${(req as any).admin?.email ?? "admin"}` });
    res.json({ success: true });
  } catch (err) { req.log.error({ err }, "Suspend user error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.post("/admin/users/:id/ban", requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id as string);
    await db.update(usersTable).set({ status: "banned" }).where(eq(usersTable.id, userId));
    await db.insert(securityEventsTable).values({ type: "user_banned", details: `User #${userId} banni par ${(req as any).admin?.email ?? "admin"}` });
    res.json({ success: true });
  } catch (err) { req.log.error({ err }, "Ban user error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.post("/admin/users/:id/reactivate", requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id as string);
    await db.update(usersTable).set({ status: "active" }).where(eq(usersTable.id, userId));
    await db.insert(securityEventsTable).values({ type: "user_reactivated", details: `User #${userId} réactivé par ${(req as any).admin?.email ?? "admin"}` });
    res.json({ success: true });
  } catch (err) { req.log.error({ err }, "Reactivate user error"); res.status(500).json({ error: "Erreur serveur" }); }
});

/* ─────────────────────────── TRANSACTIONS ─────────────────────────── */
router.get("/admin/transactions", requireAdmin, async (req, res) => {
  try {
    const { search, type, status, page = "1", limit = "50", confirmed, period } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(200, parseInt(limit));
    const offset = (pageNum - 1) * limitNum;
    const txs = await db.select().from(transactionsTable).orderBy(desc(transactionsTable.createdAt)).limit(limitNum).offset(offset);
    const [total] = await db.select({ count: count() }).from(transactionsTable);
    let filtered = txs;
    if (search) filtered = filtered.filter(t => t.reference.includes(search) || (t.fromPhone ?? "").includes(search) || (t.toPhone ?? "").includes(search));
    if (type) filtered = filtered.filter(t => t.type === type);
    if (status) filtered = filtered.filter(t => t.status === status);
    if (confirmed === "true") filtered = filtered.filter(t => t.status === "success");
    if (period) {
      const now = new Date();
      let cutoff: Date;
      if (period === "today") { cutoff = new Date(now); cutoff.setHours(0, 0, 0, 0); }
      else if (period === "week") { cutoff = new Date(now); cutoff.setDate(now.getDate() - 7); }
      else if (period === "month") { cutoff = new Date(now); cutoff.setDate(now.getDate() - 30); }
      else cutoff = new Date(0);
      filtered = filtered.filter(t => new Date(t.createdAt) >= cutoff);
    }
    res.json({ transactions: filtered, total: total.count, page: pageNum });
  } catch (err) { req.log.error({ err }, "Admin list tx error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.get("/admin/transactions/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const txRows = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).limit(1);
    if (!txRows.length) { res.status(404).json({ error: "Transaction introuvable" }); return; }
    const tx = txRows[0];
    let user: { fullName: string; email: string; phone: string | null; operator: string | null } | null = null;
    if (tx.userId) {
      const uRows = await db.select({ fullName: usersTable.fullName, email: usersTable.email, phone: usersTable.phone, operator: usersTable.operator }).from(usersTable).where(eq(usersTable.id, tx.userId)).limit(1);
      if (uRows.length) user = uRows[0];
    }
    res.json({ ...tx, user });
  } catch (err) { req.log.error({ err }, "Admin tx detail error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.put("/admin/transactions/:id/force-status", requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["success", "failed", "pending"].includes(status)) { res.status(400).json({ error: "Statut invalide" }); return; }
    const id = parseInt(req.params.id as string);
    await db.update(transactionsTable).set({ status }).where(eq(transactionsTable.id, id));
    const [tx] = await db.select({ reference: transactionsTable.reference }).from(transactionsTable).where(eq(transactionsTable.id, id)).limit(1);
    await db.insert(securityEventsTable).values({ type: "tx_status_forced", details: `TX #${id} (réf ${tx?.reference ?? ""}) → statut forcé: ${status} par ${(req as any).admin?.email ?? "admin"}` });
    res.json({ success: true });
  } catch (err) { req.log.error({ err }, "Force status error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.post("/admin/transactions/:id/retry-payout", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const txRows = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).limit(1);
    if (!txRows.length) { res.status(404).json({ error: "Transaction introuvable" }); return; }
    const tx = txRows[0];
    if (!paydunya.isConfigured()) {
      res.status(503).json({ error: "PayDunya non configuré", code: "NOT_CONFIGURED" }); return;
    }
    if (!tx.toPhone || !tx.toOperator) {
      res.status(400).json({ error: "Numéro ou opérateur destinataire manquant" }); return;
    }
    const result = await paydunya.disburseTogoWallet(tx.toOperator as "tmoney" | "moov", { name: "Bénéficiaire Bloum Cash", phone: tx.toPhone, amount: tx.amount, reference: tx.reference }, req.log);
    if (result.success) {
      await db.update(transactionsTable).set({ status: "success", payoutSent: true }).where(eq(transactionsTable.id, id));
      await db.insert(securityEventsTable).values({ type: "tx_retry_payout", details: `TX #${id} (${tx.reference}) retrait relancé par ${(req as any).admin?.email ?? "admin"} — PayDunya ref: ${result.transactionId ?? ""}` });
      res.json({ success: true, message: "Retrait relancé avec succès", reference: result.transactionId });
    } else {
      res.status(502).json({ success: false, error: result.message ?? "Échec PayDunya" });
    }
  } catch (err) { req.log.error({ err }, "Retry payout error"); res.status(500).json({ error: "Erreur serveur" }); }
});

/* ─────────────────────────── OPERATORS ─────────────────────────── */
router.get("/admin/countries", requireAdmin, async (req, res) => {
  try {
    const rows = await db.select().from(countriesConfigTable).orderBy(countriesConfigTable.name);
    res.json(rows);
  } catch (err) { req.log.error({ err }, "Countries error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.post("/admin/countries", requireAdmin, async (req, res) => {
  try {
    const { code, name, currency, feeDeposit, feeWithdraw } = req.body;
    const [row] = await db.insert(countriesConfigTable).values({ code: code.toUpperCase(), name, currency: currency ?? "XOF", feeDeposit: parseFloat(feeDeposit ?? 5), feeWithdraw: parseFloat(feeWithdraw ?? 5) }).returning();
    res.status(201).json(row);
  } catch (err) { req.log.error({ err }, "Create country error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.put("/admin/countries/:id", requireAdmin, async (req, res) => {
  try {
    const { name, currency, isActive, feeDeposit, feeWithdraw } = req.body;
    await db.update(countriesConfigTable).set({ name, currency, isActive, feeDeposit: parseFloat(feeDeposit), feeWithdraw: parseFloat(feeWithdraw) }).where(eq(countriesConfigTable.id, parseInt(req.params.id as string)));
    res.json({ success: true });
  } catch (err) { req.log.error({ err }, "Update country error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.get("/admin/operators", requireAdmin, async (req, res) => {
  try {
    const rows = await db.select().from(operatorsConfigTable).orderBy(operatorsConfigTable.countryCode, operatorsConfigTable.name);
    res.json(rows);
  } catch (err) { req.log.error({ err }, "Operators error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.post("/admin/operators", requireAdmin, async (req, res) => {
  try {
    const { name, type, countryCode, gateway, dailyLimit } = req.body;
    const [row] = await db.insert(operatorsConfigTable).values({ name, type: type ?? "mobile_money", countryCode, gateway: gateway ?? "PayDunya", dailyLimit: parseInt(dailyLimit ?? 1000000) }).returning();
    res.status(201).json(row);
  } catch (err) { req.log.error({ err }, "Create operator error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.put("/admin/operators/:id", requireAdmin, async (req, res) => {
  try {
    const { name, type, countryCode, gateway, dailyLimit, isActive, maintenanceAll, maintenanceDeposit, maintenanceWithdraw, maintenancePaymentLink, maintenanceApiPayment } = req.body;
    await db.update(operatorsConfigTable).set({ name, type, countryCode, gateway, dailyLimit: parseInt(dailyLimit), isActive, maintenanceAll, maintenanceDeposit, maintenanceWithdraw, maintenancePaymentLink, maintenanceApiPayment }).where(eq(operatorsConfigTable.id, parseInt(req.params.id as string)));
    res.json({ success: true });
  } catch (err) { req.log.error({ err }, "Update operator error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.delete("/admin/operators/:id", requireAdmin, async (req, res) => {
  try {
    await db.delete(operatorsConfigTable).where(eq(operatorsConfigTable.id, parseInt(req.params.id as string)));
    res.json({ success: true });
  } catch (err) { req.log.error({ err }, "Delete operator error"); res.status(500).json({ error: "Erreur serveur" }); }
});

/* ─────────────────────────── NOTIFICATIONS (global popup) ─────────────────────────── */
router.get("/admin/notifications", requireAdmin, async (req, res) => {
  try {
    const rows = await db.select().from(adminNotificationsTable).orderBy(desc(adminNotificationsTable.createdAt));
    res.json(rows);
  } catch (err) { req.log.error({ err }, "Notifications error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.post("/admin/notifications", requireAdmin, async (req, res) => {
  try {
    const { title, message, type, imageUrl, buttonText, buttonUrl, isActive } = req.body;
    const [row] = await db.insert(adminNotificationsTable).values({ title, message, type: type ?? "info", imageUrl: imageUrl ?? null, buttonText: buttonText ?? null, buttonUrl: buttonUrl ?? null, isActive: isActive !== false }).returning();
    res.status(201).json(row);
  } catch (err) { req.log.error({ err }, "Create notification error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.put("/admin/notifications/:id", requireAdmin, async (req, res) => {
  try {
    const { title, message, type, imageUrl, buttonText, buttonUrl, isActive } = req.body;
    await db.update(adminNotificationsTable).set({ title, message, type, imageUrl, buttonText, buttonUrl, isActive }).where(eq(adminNotificationsTable.id, parseInt(req.params.id as string)));
    res.json({ success: true });
  } catch (err) { req.log.error({ err }, "Update notification error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.delete("/admin/notifications/:id", requireAdmin, async (req, res) => {
  try {
    await db.delete(adminNotificationsTable).where(eq(adminNotificationsTable.id, parseInt(req.params.id as string)));
    res.json({ success: true });
  } catch (err) { req.log.error({ err }, "Delete notification error"); res.status(500).json({ error: "Erreur serveur" }); }
});

/* ─────────────────────────── PUBLIC — Operators status ─────────────────────────── */
router.get("/operators", async (_req, res) => {
  try {
    const rows = await db.select().from(operatorsConfigTable).orderBy(operatorsConfigTable.name);
    const MAP: Record<string, string> = { tmoney: "tmoney", moov: "moov" };
    const toKey = (name: string): string => {
      const n = name.toLowerCase();
      if (n.includes("tmoney") || n.includes("t-money")) return "tmoney";
      if (n.includes("moov") || n.includes("flooz")) return "moov";
      return n.replace(/\s+/g, "_");
    };
    const result = rows.map(op => ({
      key: toKey(op.name),
      name: op.name,
      isActive: op.isActive,
      inMaintenance: op.maintenanceAll || op.maintenanceWithdraw,
      maintenanceDeposit: op.maintenanceDeposit,
      maintenanceWithdraw: op.maintenanceWithdraw,
      maintenanceAll: op.maintenanceAll,
    }));
    // Assurer tmoney + moov sont toujours présents (fallback si table vide)
    const keys = result.map(r => r.key);
    if (!keys.includes("tmoney")) result.push({ key: "tmoney", name: "TMoney", isActive: true, inMaintenance: false, maintenanceDeposit: false, maintenanceWithdraw: false, maintenanceAll: false });
    if (!keys.includes("moov")) result.push({ key: "moov", name: "Moov Money", isActive: true, inMaintenance: false, maintenanceDeposit: false, maintenanceWithdraw: false, maintenanceAll: false });
    res.json(result);
  } catch { res.json([]); }
});

/* Public endpoint — active notification for user dashboard popup */
router.get("/admin-notifications/active", async (req, res) => {
  try {
    const rows = await db.select().from(adminNotificationsTable).where(eq(adminNotificationsTable.isActive, true)).orderBy(desc(adminNotificationsTable.createdAt)).limit(1);
    res.json(rows[0] ?? null);
  } catch (err) { res.json(null); }
});

/* ─────────────────────────── BLACKLIST ─────────────────────────── */
router.get("/admin/blacklist", requireAdmin, async (req, res) => {
  try {
    const rows = await db.select().from(blacklistTable).orderBy(desc(blacklistTable.createdAt));
    const [secCount] = await db.select({ count: count() }).from(securityEventsTable);
    res.json({ blacklist: rows, auditLogs: [], stats: { blocked: rows.length, securityLogs: secCount.count, unlockAttempts: 0 } });
  } catch (err) { req.log.error({ err }, "Blacklist error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.post("/admin/blacklist", requireAdmin, async (req, res) => {
  try {
    const { phone, reason } = req.body;
    if (!phone) { res.status(400).json({ error: "Numéro requis" }); return; }
    const [row] = await db.insert(blacklistTable).values({ phone, reason: reason ?? null, blockedBy: (req as any).admin?.email ?? "admin" }).returning();
    await db.insert(securityEventsTable).values({ type: "phone_blacklisted", details: `${phone} — ${reason ?? "Sans raison"}` });
    res.status(201).json(row);
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "23505") { res.status(409).json({ error: "Ce numéro est déjà blacklisté" }); return; }
    req.log.error({ err }, "Add blacklist error"); res.status(500).json({ error: "Erreur serveur" });
  }
});

router.delete("/admin/blacklist/:id", requireAdmin, async (req, res) => {
  try {
    await db.delete(blacklistTable).where(eq(blacklistTable.id, parseInt(req.params.id as string)));
    res.json({ success: true });
  } catch (err) { req.log.error({ err }, "Delete blacklist error"); res.status(500).json({ error: "Erreur serveur" }); }
});

/* ─────────────────────────── SECURITY ─────────────────────────── */
router.get("/admin/security", requireAdmin, async (req, res) => {
  try {
    const [blocked] = await db.select({ count: count() }).from(blockedIpsTable);
    const [whitelisted] = await db.select({ count: count() }).from(whitelistedIpsTable);
    const [events] = await db.select({ count: count() }).from(securityEventsTable);
    const blockedIps = await db.select().from(blockedIpsTable).orderBy(desc(blockedIpsTable.createdAt)).limit(50);
    const whitelistedIps = await db.select().from(whitelistedIpsTable).orderBy(desc(whitelistedIpsTable.createdAt));
    const secEvents = await db.select().from(securityEventsTable).orderBy(desc(securityEventsTable.createdAt)).limit(100);
    res.json({
      stats: { blockedIps: blocked.count, whitelistedIps: whitelisted.count, failedLogins: 0, attempts1h: 0 },
      blockedIps, whitelistedIps, events: secEvents,
    });
  } catch (err) { req.log.error({ err }, "Security error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.post("/admin/security/block-ip", requireAdmin, async (req, res) => {
  try {
    const { ip, reason } = req.body;
    if (!ip) { res.status(400).json({ error: "IP requise" }); return; }
    const [row] = await db.insert(blockedIpsTable).values({ ip, reason: reason ?? null }).returning();
    await db.insert(securityEventsTable).values({ type: "ip_blocked", ip, details: reason ?? "Bloqué manuellement" });
    res.status(201).json(row);
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "23505") { res.status(409).json({ error: "IP déjà bloquée" }); return; }
    req.log.error({ err }, "Block IP error"); res.status(500).json({ error: "Erreur serveur" });
  }
});

router.delete("/admin/security/block-ip/:id", requireAdmin, async (req, res) => {
  try {
    await db.delete(blockedIpsTable).where(eq(blockedIpsTable.id, parseInt(req.params.id as string)));
    res.json({ success: true });
  } catch (err) { req.log.error({ err }, "Unblock IP error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.post("/admin/security/whitelist-ip", requireAdmin, async (req, res) => {
  try {
    const { ip, label } = req.body;
    if (!ip) { res.status(400).json({ error: "IP requise" }); return; }
    const [row] = await db.insert(whitelistedIpsTable).values({ ip, label: label ?? null }).returning();
    res.status(201).json(row);
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "23505") { res.status(409).json({ error: "IP déjà en liste blanche" }); return; }
    req.log.error({ err }, "Whitelist IP error"); res.status(500).json({ error: "Erreur serveur" });
  }
});

router.delete("/admin/security/whitelist-ip/:id", requireAdmin, async (req, res) => {
  try {
    await db.delete(whitelistedIpsTable).where(eq(whitelistedIpsTable.id, parseInt(req.params.id as string)));
    res.json({ success: true });
  } catch (err) { req.log.error({ err }, "Remove whitelist error"); res.status(500).json({ error: "Erreur serveur" }); }
});

/* ─────────────────────────── SETTINGS ─────────────────────────── */
const DEFAULT_SETTINGS: Record<string, string> = {
  platform_name: "Bloum Cash",
  support_email: "support@bloumcash.tg",
  support_phone: "+228 92299772",
  fee_deposit_percent: "3.5",
  fee_withdraw_percent: "3.5",
  fee_exchange_percent: "4",
  maintenance_mode: "false",
  withdrawals_enabled: "true",
  facebook_url: "",
  instagram_url: "",
  telegram_url: "",
  tiktok_url: "",
};

router.get("/admin/settings", requireAdmin, async (req, res) => {
  try {
    const rows = await db.select().from(adminSettingsTable);
    const settings: Record<string, string> = { ...DEFAULT_SETTINGS };
    for (const row of rows) settings[row.key] = row.value;
    res.json(settings);
  } catch (err) { req.log.error({ err }, "Settings get error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.put("/admin/settings", requireAdmin, async (req, res) => {
  try {
    const updates = req.body as Record<string, string>;
    for (const [key, value] of Object.entries(updates)) {
      const existing = await db.select().from(adminSettingsTable).where(eq(adminSettingsTable.key, key)).limit(1);
      if (existing.length) {
        await db.update(adminSettingsTable).set({ value: String(value), updatedAt: new Date() }).where(eq(adminSettingsTable.key, key));
      } else {
        await db.insert(adminSettingsTable).values({ key, value: String(value) });
      }
    }
    res.json({ success: true });
  } catch (err) { req.log.error({ err }, "Settings update error"); res.status(500).json({ error: "Erreur serveur" }); }
});

/* ─────────────────────────── EMAIL BROADCAST ─────────────────────────── */
router.post("/admin/broadcast/email", requireAdmin, async (req, res) => {
  try {
    const { subject, body, buttonText, buttonUrl } = req.body;
    if (!subject || !body) { res.status(400).json({ error: "Sujet et corps requis" }); return; }
    const users = await db.select({ email: usersTable.email, fullName: usersTable.fullName }).from(usersTable);
    await db.insert(securityEventsTable).values({
      type: "email_broadcast",
      details: `Sujet: ${subject} | Destinataires: ${users.length}`,
    });
    res.json({ success: true, sent: users.length, message: `Email broadcast enregistré pour ${users.length} utilisateurs. Configurez un service email (Resend/SendGrid) pour l'envoi réel.` });
  } catch (err) { req.log.error({ err }, "Broadcast error"); res.status(500).json({ error: "Erreur serveur" }); }
});

/* ─────────────────────────── DASHBOARD BANNERS ─────────────────────────── */

/* ── Public: promotions actives pour les utilisateurs ── */
router.get("/promotions", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(promotionsTable)
      .where(eq(promotionsTable.isActive, true))
      .orderBy(asc(promotionsTable.sortOrder), asc(promotionsTable.createdAt));
    res.json(rows);
  } catch (err) { res.json([]); }
});

/* Public endpoint — active banners for user dashboard */
router.get("/banners", async (req, res) => {
  try {
    const rows = await db.select().from(dashboardBannersTable)
      .where(eq(dashboardBannersTable.isActive, true))
      .orderBy(asc(dashboardBannersTable.sortOrder), asc(dashboardBannersTable.createdAt));
    res.json(rows);
  } catch (err) { res.json([]); }
});

router.get("/admin/banners", requireAdmin, async (req, res) => {
  try {
    const rows = await db.select().from(dashboardBannersTable)
      .orderBy(asc(dashboardBannersTable.sortOrder), asc(dashboardBannersTable.createdAt));
    res.json(rows);
  } catch (err) { req.log.error({ err }, "Get banners error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.post("/admin/banners", requireAdmin, async (req, res) => {
  try {
    const { title, imageData, imageUrl: externalUrl, actionType, actionUrl, sortOrder } = req.body;
    let imageUrl: string;

    if (imageData) {
      const matches = (imageData as string).match(/^data:image\/(\w+);base64,(.+)$/s);
      if (!matches) { res.status(400).json({ error: "Format d'image invalide" }); return; }
      const ext = matches[1].toLowerCase().replace("jpeg", "jpg");
      if (matches[2].length > 8_000_000) { res.status(413).json({ error: "Image trop grande (max 6 Mo)" }); return; }
      const filename = `banner_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.${ext}`;
      fs.writeFileSync(path.join(UPLOADS_DIR, filename), Buffer.from(matches[2], "base64"));
      imageUrl = `/uploads/${filename}`;
    } else if (externalUrl) {
      imageUrl = externalUrl;
    } else {
      res.status(400).json({ error: "Image ou URL requise" }); return;
    }

    const [row] = await db.insert(dashboardBannersTable).values({
      title: title || null,
      imageUrl,
      actionType: actionType ?? "none",
      actionUrl: actionUrl || null,
      sortOrder: sortOrder != null ? parseInt(sortOrder) : 0,
    }).returning();
    res.status(201).json(row);
  } catch (err) { req.log.error({ err }, "Create banner error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.put("/admin/banners/:id", requireAdmin, async (req, res) => {
  try {
    const { title, imageData, imageUrl: externalUrl, actionType, actionUrl, isActive, sortOrder } = req.body;
    const id = parseInt(req.params.id as string);
    const updates: Record<string, unknown> = { actionType: actionType ?? "none", actionUrl: actionUrl || null, isActive, sortOrder: parseInt(sortOrder ?? 0) };
    if (title !== undefined) updates.title = title || null;

    if (imageData) {
      const matches = (imageData as string).match(/^data:image\/(\w+);base64,(.+)$/s);
      if (matches) {
        const ext = matches[1].toLowerCase().replace("jpeg", "jpg");
        if (matches[2].length <= 8_000_000) {
          const filename = `banner_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.${ext}`;
          fs.writeFileSync(path.join(UPLOADS_DIR, filename), Buffer.from(matches[2], "base64"));
          updates.imageUrl = `/uploads/${filename}`;
        }
      }
    } else if (externalUrl) {
      updates.imageUrl = externalUrl;
    }

    await db.update(dashboardBannersTable).set(updates as Partial<typeof dashboardBannersTable.$inferInsert>).where(eq(dashboardBannersTable.id, id));
    res.json({ success: true });
  } catch (err) { req.log.error({ err }, "Update banner error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.delete("/admin/banners/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const rows = await db.select().from(dashboardBannersTable).where(eq(dashboardBannersTable.id, id)).limit(1);
    if (rows.length && rows[0].imageUrl.startsWith("/uploads/")) {
      const filepath = path.join(UPLOADS_DIR, path.basename(rows[0].imageUrl));
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    }
    await db.delete(dashboardBannersTable).where(eq(dashboardBannersTable.id, id));
    res.json({ success: true });
  } catch (err) { req.log.error({ err }, "Delete banner error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.put("/admin/banners/reorder", requireAdmin, async (req, res) => {
  try {
    const { orderedIds } = req.body as { orderedIds: number[] };
    for (let i = 0; i < orderedIds.length; i++) {
      await db.update(dashboardBannersTable).set({ sortOrder: i }).where(eq(dashboardBannersTable.id, orderedIds[i]));
    }
    res.json({ success: true });
  } catch (err) { req.log.error({ err }, "Reorder banners error"); res.status(500).json({ error: "Erreur serveur" }); }
});

/* ─────────────────────────── DISBURSE MANUEL ─────────────────────────── */
router.post("/admin/disburse", requireAdmin, async (req, res) => {
  try {
    const { operator, phone, amount, motif } = req.body as {
      operator?: string;
      phone?: string;
      amount?: number | string;
      motif?: string;
    };

    if (!operator || !phone || !amount) {
      res.status(400).json({ error: "Opérateur, numéro et montant requis" });
      return;
    }

    if (operator !== "tmoney" && operator !== "moov") {
      res.status(400).json({ error: "Opérateur invalide — valeurs acceptées : tmoney, moov" });
      return;
    }

    const amt = parseInt(String(amount));
    if (isNaN(amt) || amt <= 0) {
      res.status(400).json({ error: "Montant invalide (doit être > 0)" });
      return;
    }

    if (!paydunya.isConfigured()) {
      res.status(503).json({
        error: "PayDunya non configuré — ajoutez les clés API dans les secrets Replit",
        code: "NOT_CONFIGURED",
      });
      return;
    }

    const reference = "ADM" + Date.now() + crypto.randomBytes(3).toString("hex").toUpperCase();
    const description = motif?.trim() || `Déboursement manuel admin vers ${phone}`;

    req.log.info(
      { operator, phone, amount: amt, reference },
      "Admin disburse manuel — déclenchement"
    );

    const result = await paydunya.disburseTogoWallet(
      operator,
      { name: "Bénéficiaire Bloum Cash", phone, amount: amt, reference },
      req.log
    );

    /* Logguer la transaction dans la DB quelle que soit l'issue */
    await db.insert(transactionsTable).values({
      reference,
      type: "outgoing",
      title: `Déboursement admin — ${phone} (${operator})`,
      amount: amt,
      operator,
      toPhone: phone,
      toOperator: operator,
      fees: 0,
      description,
      status: result.success ? "success" : "failed",
    });

    if (result.success) {
      req.log.info({ reference, transactionId: result.transactionId }, "Admin disburse OK");
      res.json({
        success: true,
        reference,
        transactionId: result.transactionId,
        message: result.message,
      });
    } else {
      req.log.warn({ reference, message: result.message }, "Admin disburse refusé par PayDunya");
      res.status(402).json({
        success: false,
        reference,
        message: result.message,
        code: "PAYMENT_REFUSED",
      });
    }
  } catch (err) {
    const isPdu = err instanceof paydunya.PaydunyaError;
    req.log.error({ err }, "Admin disburse — erreur");
    res.status(isPdu ? 502 : 500).json({
      error: isPdu ? (err as paydunya.PaydunyaError).message : "Erreur serveur interne",
      code:  isPdu ? (err as paydunya.PaydunyaError).code : "SERVER_ERROR",
    });
  }
});

/* ─────────────────────────── PROMOTIONS ─────────────────────────── */

router.get("/admin/promotions", requireAdmin, async (req, res) => {
  try {
    const rows = await db.select().from(promotionsTable).orderBy(asc(promotionsTable.sortOrder), asc(promotionsTable.createdAt));
    res.json(rows);
  } catch (err) { req.log.error({ err }, "List promotions error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.post("/admin/promotions", requireAdmin, async (req, res) => {
  try {
    const { icon, title, description, badge, color, bgColor, isActive, sortOrder, expiresAt } = req.body;
    if (!title?.trim() || !description?.trim()) { res.status(400).json({ error: "Titre et description requis" }); return; }
    const [row] = await db.insert(promotionsTable).values({
      icon: icon?.trim() || "🎁",
      title: title.trim(),
      description: description.trim(),
      badge: badge || "active",
      color: color || "#1a3fc4",
      bgColor: bgColor || "#eff2ff",
      isActive: isActive !== false,
      sortOrder: parseInt(String(sortOrder)) || 0,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    }).returning();
    res.status(201).json(row);
  } catch (err) { req.log.error({ err }, "Create promotion error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.put("/admin/promotions/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const existing = await db.select().from(promotionsTable).where(eq(promotionsTable.id, id)).limit(1);
    if (!existing.length) { res.status(404).json({ error: "Promotion introuvable" }); return; }
    const { icon, title, description, badge, color, bgColor, isActive, sortOrder, expiresAt } = req.body;
    const updates: Partial<typeof promotionsTable.$inferInsert> = {};
    if (icon !== undefined) updates.icon = icon;
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (badge !== undefined) updates.badge = badge;
    if (color !== undefined) updates.color = color;
    if (bgColor !== undefined) updates.bgColor = bgColor;
    if (isActive !== undefined) updates.isActive = isActive;
    if (sortOrder !== undefined) updates.sortOrder = parseInt(String(sortOrder)) || 0;
    if (expiresAt !== undefined) updates.expiresAt = expiresAt ? new Date(expiresAt) : null;
    const [updated] = await db.update(promotionsTable).set(updates).where(eq(promotionsTable.id, id)).returning();
    res.json(updated);
  } catch (err) { req.log.error({ err }, "Update promotion error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.delete("/admin/promotions/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const existing = await db.select().from(promotionsTable).where(eq(promotionsTable.id, id)).limit(1);
    if (!existing.length) { res.status(404).json({ error: "Promotion introuvable" }); return; }
    await db.delete(promotionsTable).where(eq(promotionsTable.id, id));
    res.json({ success: true });
  } catch (err) { req.log.error({ err }, "Delete promotion error"); res.status(500).json({ error: "Erreur serveur" }); }
});

/* ─────────────────────────── ADMIN USERS (CRUD) ─────────────────────────── */

router.get("/admin/admins", requireAdmin, async (req, res) => {
  try {
    const rows = await db
      .select({ id: adminUsersTable.id, fullName: adminUsersTable.fullName, email: adminUsersTable.email, role: adminUsersTable.role, createdAt: adminUsersTable.createdAt })
      .from(adminUsersTable)
      .orderBy(asc(adminUsersTable.createdAt));
    res.json(rows);
  } catch (err) { req.log.error({ err }, "List admins error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.post("/admin/admins", requireAdmin, async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body as { fullName?: string; email?: string; password?: string; role?: string };
    if (!fullName?.trim() || !email?.trim() || !password?.trim()) {
      res.status(400).json({ error: "Nom, email et mot de passe requis" }); return;
    }
    const validRoles = ["admin", "superadmin"];
    const finalRole = validRoles.includes(role ?? "") ? role! : "admin";

    const existing = await db.select({ id: adminUsersTable.id }).from(adminUsersTable).where(eq(adminUsersTable.email, email.toLowerCase().trim())).limit(1);
    if (existing.length) { res.status(409).json({ error: "Cet email est déjà utilisé" }); return; }

    const passwordHash = await bcrypt.hash(password, 12);
    const [created] = await db.insert(adminUsersTable).values({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: finalRole,
    }).returning({ id: adminUsersTable.id, fullName: adminUsersTable.fullName, email: adminUsersTable.email, role: adminUsersTable.role, createdAt: adminUsersTable.createdAt });

    await db.insert(securityEventsTable).values({ type: "admin_created", details: `Nouvel admin créé: ${email.trim()} (${finalRole}) par ${(req as any).admin?.email ?? "admin"}` });
    res.status(201).json(created);
  } catch (err) { req.log.error({ err }, "Create admin error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.put("/admin/admins/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const { fullName, email, password, role } = req.body as { fullName?: string; email?: string; password?: string; role?: string };

    const existing = await db.select().from(adminUsersTable).where(eq(adminUsersTable.id, id)).limit(1);
    if (!existing.length) { res.status(404).json({ error: "Administrateur introuvable" }); return; }

    const updates: Partial<typeof adminUsersTable.$inferInsert> = {};
    if (fullName?.trim()) updates.fullName = fullName.trim();
    if (email?.trim()) {
      const dup = await db.select({ id: adminUsersTable.id }).from(adminUsersTable).where(eq(adminUsersTable.email, email.toLowerCase().trim())).limit(1);
      if (dup.length && dup[0].id !== id) { res.status(409).json({ error: "Cet email est déjà utilisé" }); return; }
      updates.email = email.toLowerCase().trim();
    }
    if (password?.trim()) updates.passwordHash = await bcrypt.hash(password, 12);
    const validRoles = ["admin", "superadmin"];
    if (role && validRoles.includes(role)) updates.role = role;

    const [updated] = await db.update(adminUsersTable).set(updates).where(eq(adminUsersTable.id, id))
      .returning({ id: adminUsersTable.id, fullName: adminUsersTable.fullName, email: adminUsersTable.email, role: adminUsersTable.role, createdAt: adminUsersTable.createdAt });

    await db.insert(securityEventsTable).values({ type: "admin_updated", details: `Admin #${id} modifié par ${(req as any).admin?.email ?? "admin"}` });
    res.json(updated);
  } catch (err) { req.log.error({ err }, "Update admin error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.delete("/admin/admins/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const reqAdmin = (req as import("express").Request & { admin?: import("../middleware/admin-auth").AdminTokenPayload }).admin;
    if (reqAdmin?.id === id) { res.status(400).json({ error: "Impossible de supprimer votre propre compte" }); return; }

    const existing = await db.select().from(adminUsersTable).where(eq(adminUsersTable.id, id)).limit(1);
    if (!existing.length) { res.status(404).json({ error: "Administrateur introuvable" }); return; }

    await db.delete(adminUsersTable).where(eq(adminUsersTable.id, id));
    await db.insert(securityEventsTable).values({ type: "admin_deleted", details: `Admin #${id} (${existing[0].email}) supprimé par ${reqAdmin?.email ?? "admin"}` });
    res.json({ success: true });
  } catch (err) { req.log.error({ err }, "Delete admin error"); res.status(500).json({ error: "Erreur serveur" }); }
});

/* ─────────────────── PUSH NOTIFICATION CAMPAIGNS ─────────────────── */

/** Broadcast push à tous les utilisateurs ayant un onesignal_external_user_id */
router.post("/admin/notifications/push/broadcast", requireAdmin, async (req, res) => {
  try {
    const { title, message } = req.body as { title?: string; message?: string };
    if (!title?.trim() || !message?.trim()) {
      res.status(400).json({ error: "Les champs title et message sont requis." });
      return;
    }
    if (!isOneSignalConfigured()) {
      res.status(503).json({ error: "OneSignal non configuré (ONESIGNAL_APP_ID / ONESIGNAL_API_KEY manquants)." });
      return;
    }

    // Récupérer tous les utilisateurs avec un external_id OneSignal
    const users = await db
      .select({ email: usersTable.onesignalExternalUserId })
      .from(usersTable)
      .where(isNotNull(usersTable.onesignalExternalUserId));

    if (!users.length) {
      res.json({ success: true, sent: 0, message: "Aucun utilisateur enregistré dans OneSignal." });
      return;
    }

    // Envoyer en parallèle (max 50 simultanés pour ne pas saturer)
    const CHUNK = 50;
    let sent = 0;
    for (let i = 0; i < users.length; i += CHUNK) {
      const chunk = users.slice(i, i + CHUNK);
      await Promise.all(
        chunk.map(async (u) => {
          if (!u.email) return;
          await sendPushNotification(
            { externalUserId: u.email, title: title.trim(), message: message.trim(), data: { type: "campaign" } },
            req.log
          );
          sent++;
        })
      );
    }

    req.log.info({ sent, title }, "Admin — push broadcast envoyé");
    res.json({ success: true, sent, message: `Notification envoyée à ${sent} utilisateur(s).` });
  } catch (err) {
    req.log.error({ err }, "Admin push broadcast error");
    res.status(500).json({ error: "Erreur serveur interne." });
  }
});

/* ─────────────────────────── MASS EMAIL ─────────────────────────── */
router.post("/admin/email/broadcast", requireAdmin, async (req, res) => {
  try {
    const { subject, title, body, buttonText, buttonUrl } = req.body as {
      subject?: string; title?: string; body?: string;
      buttonText?: string; buttonUrl?: string;
    };
    if (!subject?.trim() || !title?.trim() || !body?.trim()) {
      res.status(400).json({ error: "Sujet, titre et corps de l'email sont requis." }); return;
    }
    if (!process.env.RESEND_API_KEY) {
      res.status(503).json({ error: "Resend non configuré (RESEND_API_KEY manquant)." }); return;
    }

    const users = await db.select({ email: usersTable.email, fullName: usersTable.fullName })
      .from(usersTable).where(eq(usersTable.status, "active"));

    if (!users.length) {
      res.json({ success: true, sent: 0, message: "Aucun utilisateur actif." }); return;
    }

    let sent = 0;
    let failed = 0;
    const CHUNK = 10; /* Resend rate limit */
    for (let i = 0; i < users.length; i += CHUNK) {
      const chunk = users.slice(i, i + CHUNK);
      await Promise.all(chunk.map(async (u) => {
        try {
          await sendMassEmail({
            to: u.email,
            fullName: u.fullName,
            subject: subject.trim(),
            title: title.trim(),
            body: body.trim(),
            buttonText: buttonText?.trim(),
            buttonUrl: buttonUrl?.trim(),
          });
          sent++;
        } catch { failed++; }
      }));
      /* Petite pause entre les chunks pour respecter les limites Resend */
      if (i + CHUNK < users.length) await new Promise(r => setTimeout(r, 200));
    }

    req.log.info({ sent, failed, subject }, "Admin — mass email envoyé");
    res.json({ success: true, sent, failed, message: `Email envoyé à ${sent} utilisateur(s)${failed ? `, ${failed} échec(s)` : ""}.` });
  } catch (err) {
    req.log.error({ err }, "Admin mass email error");
    res.status(500).json({ error: "Erreur serveur interne." });
  }
});

export default router;
