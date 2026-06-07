import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  usersTable, transactionsTable,
  adminUsersTable, adminNotificationsTable, blacklistTable,
  blockedIpsTable, whitelistedIpsTable, securityEventsTable,
  adminSettingsTable, countriesConfigTable, operatorsConfigTable,
} from "@workspace/db";
import { eq, desc, sql, like, or, and, count } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { requireAdmin, signAdminToken } from "../middleware/admin-auth";

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
    let query = db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
    const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt)).limit(limitNum).offset(offset);
    const [total] = await db.select({ count: count() }).from(usersTable);
    const filtered = search
      ? users.filter(u => u.fullName.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
      : users;
    res.json({ users: filtered.map(u => ({ id: u.id, fullName: u.fullName, email: u.email, createdAt: u.createdAt, role: "Utilisateur", status: "active" })), total: total.count, page: pageNum });
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

/* ─────────────────────────── TRANSACTIONS ─────────────────────────── */
router.get("/admin/transactions", requireAdmin, async (req, res) => {
  try {
    const { search, type, status, page = "1", limit = "50", confirmed } = req.query as Record<string, string>;
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

export default router;
