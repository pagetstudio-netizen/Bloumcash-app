import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  usersTable, transactionsTable,
  adminUsersTable, adminNotificationsTable, blacklistTable,
  blockedIpsTable, whitelistedIpsTable, securityEventsTable,
  adminSettingsTable, countriesConfigTable, operatorsConfigTable,
  dashboardBannersTable,
} from "@workspace/db";
import { eq, desc, sql, asc, count, and, gte } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { requireAdmin, signAdminToken } from "../middleware/admin-auth";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const router: IRouter = Router();

/* ─────────────────────────── AUTH ─────────────────────────── */
router.post("/admin/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email et mot de passe requis" });
      return;
    }
    const admins = await db.select().from(adminUsersTable).where(eq(adminUsersTable.email, email)).limit(1);
    if (!admins.length) { res.status(401).json({ error: "Identifiants incorrects" }); return; }
    const admin = admins[0];
    const ok = await bcrypt.compare(String(password), admin.passwordHash);
    if (!ok) { res.status(401).json({ error: "Identifiants incorrects" }); return; }
    const token = signAdminToken({ id: admin.id, email: admin.email, role: admin.role });
    res.json({ token, admin: { id: admin.id, fullName: admin.fullName, email: admin.email, role: admin.role } });
  } catch (err) { req.log.error({ err }, "Admin login error"); res.status(500).json({ error: "Erreur serveur" }); }
});

/* ─────────────────────────── STATS ─────────────────────────── */
router.get("/admin/stats", requireAdmin, async (req, res) => {
  try {
    const [userStats] = await db.select({ total: count() }).from(usersTable);
    const [txStats] = await db.select({
      total: count(),
      totalAmount: sql<number>`COALESCE(SUM(amount),0)`,
      totalFees: sql<number>`COALESCE(SUM(fees),0)`,
    }).from(transactionsTable);
    const [deposits] = await db.select({
      total: sql<number>`COALESCE(SUM(amount),0)`,
    }).from(transactionsTable).where(eq(transactionsTable.type, "incoming"));
    const [withdraws] = await db.select({
      total: sql<number>`COALESCE(SUM(amount),0)`,
    }).from(transactionsTable).where(eq(transactionsTable.type, "outgoing"));
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [todayFees] = await db.select({
      total: sql<number>`COALESCE(SUM(fees),0)`,
    }).from(transactionsTable).where(
      and(eq(transactionsTable.status, "success"), sql`created_at >= ${today.toISOString()}`)
    );
    const [pendingCount] = await db.select({ total: count() }).from(transactionsTable).where(eq(transactionsTable.status, "pending"));
    const [blacklistCount] = await db.select({ total: count() }).from(blacklistTable);
    res.json({
      users: { total: userStats.total, verified: 0 },
      transactions: { count: txStats.total, totalAmount: Number(txStats.totalAmount) },
      deposits: { total: Number(deposits.total) },
      withdrawals: { total: Number(withdraws.total) },
      commissions: { today: Number(todayFees.total), total: Number(txStats.totalFees), rate: 3.5 },
      pending: { count: pendingCount.total },
      blacklist: { count: blacklistCount.total },
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
    const users = await db.select().from(usersTable).where(eq(usersTable.id, parseInt(req.params.id))).limit(1);
    if (!users.length) { res.status(404).json({ error: "Utilisateur introuvable" }); return; }
    const u = users[0];
    const txs = await db.select().from(transactionsTable).where(eq(transactionsTable.userId, u.id)).limit(10).orderBy(desc(transactionsTable.createdAt));
    res.json({ id: u.id, fullName: u.fullName, email: u.email, createdAt: u.createdAt, transactions: txs });
  } catch (err) { req.log.error({ err }, "Admin get user error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.put("/admin/users/:id", requireAdmin, async (req, res) => {
  try {
    const { fullName, email } = req.body;
    await db.update(usersTable).set({ fullName, email }).where(eq(usersTable.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err) { req.log.error({ err }, "Admin update user error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.delete("/admin/users/:id", requireAdmin, async (req, res) => {
  try {
    await db.delete(usersTable).where(eq(usersTable.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err) { req.log.error({ err }, "Admin delete user error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.post("/admin/users/:id/reset-pin", requireAdmin, async (req, res) => {
  try {
    const { newPin } = req.body;
    if (!newPin || String(newPin).length !== 6) { res.status(400).json({ error: "PIN 6 chiffres requis" }); return; }
    const hashed = await bcrypt.hash(String(newPin), 10);
    await db.update(usersTable).set({ pin: hashed }).where(eq(usersTable.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err) { req.log.error({ err }, "Reset PIN error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.post("/admin/users/:id/credit", requireAdmin, async (req, res) => {
  try {
    const { amount, reason } = req.body;
    const amt = parseInt(amount);
    if (!amt || amt <= 0) { res.status(400).json({ error: "Montant invalide" }); return; }
    const userId = parseInt(req.params.id);
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
    const userId = parseInt(req.params.id);
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
    const userId = parseInt(req.params.id);
    await db.update(usersTable).set({ status: "suspended" }).where(eq(usersTable.id, userId));
    await db.insert(securityEventsTable).values({ type: "user_suspended", details: `User #${userId} suspendu par ${req.admin?.email ?? "admin"}` });
    res.json({ success: true });
  } catch (err) { req.log.error({ err }, "Suspend user error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.post("/admin/users/:id/ban", requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    await db.update(usersTable).set({ status: "banned" }).where(eq(usersTable.id, userId));
    await db.insert(securityEventsTable).values({ type: "user_banned", details: `User #${userId} banni par ${req.admin?.email ?? "admin"}` });
    res.json({ success: true });
  } catch (err) { req.log.error({ err }, "Ban user error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.post("/admin/users/:id/reactivate", requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    await db.update(usersTable).set({ status: "active" }).where(eq(usersTable.id, userId));
    await db.insert(securityEventsTable).values({ type: "user_reactivated", details: `User #${userId} réactivé par ${req.admin?.email ?? "admin"}` });
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

router.put("/admin/transactions/:id/force-status", requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["success", "failed", "pending"].includes(status)) { res.status(400).json({ error: "Statut invalide" }); return; }
    await db.update(transactionsTable).set({ status }).where(eq(transactionsTable.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err) { req.log.error({ err }, "Force status error"); res.status(500).json({ error: "Erreur serveur" }); }
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
    await db.update(countriesConfigTable).set({ name, currency, isActive, feeDeposit: parseFloat(feeDeposit), feeWithdraw: parseFloat(feeWithdraw) }).where(eq(countriesConfigTable.id, parseInt(req.params.id)));
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
    await db.update(operatorsConfigTable).set({ name, type, countryCode, gateway, dailyLimit: parseInt(dailyLimit), isActive, maintenanceAll, maintenanceDeposit, maintenanceWithdraw, maintenancePaymentLink, maintenanceApiPayment }).where(eq(operatorsConfigTable.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err) { req.log.error({ err }, "Update operator error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.delete("/admin/operators/:id", requireAdmin, async (req, res) => {
  try {
    await db.delete(operatorsConfigTable).where(eq(operatorsConfigTable.id, parseInt(req.params.id)));
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
    await db.update(adminNotificationsTable).set({ title, message, type, imageUrl, buttonText, buttonUrl, isActive }).where(eq(adminNotificationsTable.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err) { req.log.error({ err }, "Update notification error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.delete("/admin/notifications/:id", requireAdmin, async (req, res) => {
  try {
    await db.delete(adminNotificationsTable).where(eq(adminNotificationsTable.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err) { req.log.error({ err }, "Delete notification error"); res.status(500).json({ error: "Erreur serveur" }); }
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
    const [row] = await db.insert(blacklistTable).values({ phone, reason: reason ?? null, blockedBy: req.admin?.email ?? "admin" }).returning();
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
    await db.delete(blacklistTable).where(eq(blacklistTable.id, parseInt(req.params.id)));
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
    await db.delete(blockedIpsTable).where(eq(blockedIpsTable.id, parseInt(req.params.id)));
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
    await db.delete(whitelistedIpsTable).where(eq(whitelistedIpsTable.id, parseInt(req.params.id)));
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
    const id = parseInt(req.params.id);
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

    await db.update(dashboardBannersTable).set(updates as Parameters<typeof db.update>[0]).where(eq(dashboardBannersTable.id, id));
    res.json({ success: true });
  } catch (err) { req.log.error({ err }, "Update banner error"); res.status(500).json({ error: "Erreur serveur" }); }
});

router.delete("/admin/banners/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
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

export default router;
