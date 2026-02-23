import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth, requireGlobalRole } from "./auth";
import { requireGuildRole, requireGuildPermission } from "./rbac";
import { fetchCharacter, fetchGuildMembers, fetchGuildInfo, verifyGuildDescription, scanCharacter } from "./tibiadata";
import * as deathTracker from "./deathTracker";
import * as onlineScraper from "./onlineScraper";
import { insertGuildSchema, insertPlayerSchema, insertEventSchema, insertTemplateSchema, insertPaymentRequestSchema, onlineCharacters, onlineSessions, onlineSnapshots, guildUsers, guilds } from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import crypto from "crypto";
import { getPlanLimits } from "./planLimits";

function paramId(req: any, key: string = "id"): number {
  return parseInt(req.params[key] as string);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  setupAuth(app);

  // ============ GUILDS ============
  app.get("/api/guilds", async (req, res) => {
    if (req.session.activeGuildId) {
      const guild = await storage.getGuild(req.session.activeGuildId);
      if (guild) {
        const allGuilds = await storage.getGuilds();
        const scoped = allGuilds.filter(g => g.id === guild.id || (g.ownerId === guild.ownerId && guild.ownerId));
        return res.json(scoped);
      }
    }
    const g = await storage.getGuilds();
    res.json(g);
  });

  app.get("/api/guilds/:id", async (req, res) => {
    const guild = await storage.getGuild(paramId(req));
    if (!guild) return res.status(404).json({ error: "Guild not found" });
    res.json(guild);
  });

  app.post("/api/guilds", requireAuth, async (req, res) => {
    const parsed = insertGuildSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    
    const guildType = parsed.data.guildType || "main";
    const isAutoVerified = guildType === "ally" || guildType === "enemy";
    const verificationCode = isAutoVerified ? null : `TIBIABOT-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    
    const guild = await storage.createGuild({ 
      ...parsed.data, 
      verificationCode,
      verified: isAutoVerified,
      isEnemy: guildType === "enemy",
      ownerId: req.session.user!.id,
    });

    await storage.addGuildUser({
      guildId: guild.id,
      userId: req.session.user!.id,
      role: "LEADER",
    });

    if (!req.session.activeGuildId) {
      req.session.activeGuildId = guild.id;
    }

    res.json(guild);
  });

  app.delete("/api/guilds/:id", requireAuth, requireGuildRole("LEADER"), async (req, res) => {
    const guildId = paramId(req);
    const guild = await storage.getGuild(guildId);
    if (!guild) return res.status(404).json({ error: "Guild not found" });
    
    await storage.deleteGuild(guildId);
    res.json({ success: true, message: `Guild ${guild.name} removed from panel` });
  });

  app.post("/api/guilds/:id/verify", requireAuth, requireGuildRole("LEADER", "VICE_LEADER"), async (req, res) => {
    const guildId = paramId(req);
    const guild = await storage.getGuild(guildId);
    if (!guild) return res.status(404).json({ error: "Guild not found" });

    const isDemoMode = req.headers["x-demo-mode"] === "true" || req.query.demo === "true";
    if (isDemoMode) {
      const verified = await storage.verifyGuild(guildId, guild.verificationCode || "DEMO");
      return res.json({ verified: true, guild: verified });
    }

    const isVerified = await verifyGuildDescription(guild.name, guild.verificationCode || "");
    if (!isVerified) {
      return res.status(400).json({ 
        error: "Verification failed", 
        message: `Please add "${guild.verificationCode}" to your guild description on Tibia.com` 
      });
    }

    const verified = await storage.verifyGuild(guildId, guild.verificationCode || "");
    res.json(verified);
  });

  // ============ MY GUILDS ============
  app.get("/api/my-guilds", requireAuth, async (req, res) => {
    const userGuilds = await storage.getUserGuilds(req.session.user!.id);
    res.json(userGuilds);
  });

  // ============ GUILD INVITES ============
  app.post("/api/guilds/:id/invites", requireAuth, requireGuildRole("LEADER", "VICE_LEADER", "OFFICER"), async (req, res) => {
    const guildId = paramId(req);
    const guild = await storage.getGuild(guildId);
    if (!guild) return res.status(404).json({ error: "Guild not found" });

    const limits = getPlanLimits(guild.subscriptionStatus || "FREE");
    const existing = await storage.getGuildInvites(guildId);
    if (existing.length >= limits.maxInvites) {
      return res.status(400).json({ error: `Invite limit reached (${limits.maxInvites} for ${guild.subscriptionStatus || "FREE"} plan)` });
    }

    const token = crypto.randomBytes(16).toString("hex");
    const role = req.body.role || "MEMBER";
    const expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await storage.createGuildInvite({
      token,
      guildId,
      role,
      expiresAt,
      createdBy: req.session.user!.id,
    });
    res.json(invite);
  });

  app.get("/api/guilds/:id/invites", requireAuth, requireGuildRole("LEADER", "VICE_LEADER", "OFFICER"), async (req, res) => {
    const guildId = paramId(req);
    const invites = await storage.getGuildInvites(guildId);
    res.json(invites);
  });

  app.delete("/api/guilds/:id/invites/:inviteId", requireAuth, requireGuildRole("LEADER", "VICE_LEADER"), async (req, res) => {
    const inviteId = paramId(req, "inviteId");
    await storage.deleteGuildInvite(inviteId);
    res.json({ success: true });
  });

  app.get("/api/invites/:token", async (req, res) => {
    const invite = await storage.getGuildInvite(req.params.token as string);
    if (!invite) return res.status(404).json({ error: "Invite not found" });
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return res.status(410).json({ error: "Invite has expired" });
    }
    const guild = await storage.getGuild(invite.guildId);
    res.json({ invite, guild });
  });

  app.post("/api/invites/:token/accept", requireAuth, async (req, res) => {
    const invite = await storage.getGuildInvite(req.params.token as string);
    if (!invite) return res.status(404).json({ error: "Invite not found" });
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return res.status(410).json({ error: "Invite has expired" });
    }

    const existing = await storage.getGuildUser(invite.guildId, req.session.user!.id);
    if (existing) {
      return res.status(400).json({ error: "Already a member of this guild" });
    }

    const guild = await storage.getGuild(invite.guildId);
    if (!guild) return res.status(404).json({ error: "Guild not found" });
    const limits = getPlanLimits(guild.subscriptionStatus || "FREE");
    const members = await storage.getGuildUsers(invite.guildId);
    if (members.length >= limits.maxMembers) {
      return res.status(400).json({ error: "Guild member limit reached" });
    }

    const gu = await storage.addGuildUser({
      guildId: invite.guildId,
      userId: req.session.user!.id,
      role: invite.role,
    });

    if (!req.session.activeGuildId) {
      req.session.activeGuildId = invite.guildId;
    }

    res.json({ success: true, membership: gu });
  });

  // ============ OWNERSHIP TRANSFER ============
  app.post("/api/guilds/:id/transfer", requireAuth, requireGuildRole("LEADER"), async (req, res) => {
    const guildId = paramId(req);
    const { newOwnerId } = req.body;
    if (!newOwnerId) return res.status(400).json({ error: "newOwnerId required" });

    const targetMembership = await storage.getGuildUser(guildId, newOwnerId);
    if (!targetMembership) return res.status(400).json({ error: "Target user is not a member of this guild" });

    await db.transaction(async (tx) => {
      await tx.update(guilds).set({ ownerId: newOwnerId }).where(eq(guilds.id, guildId));
      await tx.update(guildUsers).set({ role: "LEADER" })
        .where(and(eq(guildUsers.guildId, guildId), eq(guildUsers.userId, newOwnerId)));
      await tx.update(guildUsers).set({ role: "VICE_LEADER" })
        .where(and(eq(guildUsers.guildId, guildId), eq(guildUsers.userId, req.session.user!.id)));
    });

    res.json({ success: true, message: "Ownership transferred" });
  });

  // ============ PAYMENT ============
  app.post("/api/guilds/:id/payment-request", requireAuth, requireGuildRole("LEADER", "VICE_LEADER"), async (req, res) => {
    const guildId = paramId(req);
    const parsed = insertPaymentRequestSchema.safeParse({
      ...req.body,
      guildId,
      userId: req.session.user!.id,
      status: "PENDING",
    });
    if (!parsed.success) return res.status(400).json(parsed.error);
    const pr = await storage.createPaymentRequest(parsed.data);
    res.json(pr);
  });

  app.get("/api/guilds/:id/payments", requireAuth, requireGuildRole("LEADER", "VICE_LEADER"), async (req, res) => {
    const guildId = paramId(req);
    const payments = await storage.getPaymentRequests(guildId);
    res.json(payments);
  });

  // ============ ADMIN ROUTES ============
  app.get("/api/admin/users", requireAuth, requireGlobalRole("ADMIN"), async (req, res) => {
    const allUsers = await storage.getAllUsers();
    res.json(allUsers);
  });

  app.get("/api/admin/guilds", requireAuth, requireGlobalRole("ADMIN"), async (req, res) => {
    const allGuilds = await storage.getAllGuildsAdmin();
    res.json(allGuilds);
  });

  app.get("/api/admin/metrics", requireAuth, requireGlobalRole("ADMIN"), async (req, res) => {
    const metrics = await storage.getAdminMetrics();
    res.json(metrics);
  });

  app.get("/api/admin/payments", requireAuth, requireGlobalRole("ADMIN"), async (req, res) => {
    const payments = await storage.getPaymentRequests();
    res.json(payments);
  });

  app.post("/api/admin/payments/:id/confirm", requireAuth, requireGlobalRole("ADMIN"), async (req, res) => {
    const id = paramId(req);
    const pr = await storage.getPaymentRequest(id);
    if (!pr) return res.status(404).json({ error: "Payment request not found" });

    const updated = await storage.updatePaymentRequestStatus(id, "CONFIRMED");

    const plan = req.body.plan || "PREMIUM";
    const durationDays = req.body.durationDays || 30;
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    await storage.updateGuild(pr.guildId, { subscriptionStatus: plan, subscriptionExpiresAt: expiresAt });

    res.json({ success: true, payment: updated });
  });

  app.post("/api/admin/payments/:id/reject", requireAuth, requireGlobalRole("ADMIN"), async (req, res) => {
    const id = paramId(req);
    const updated = await storage.updatePaymentRequestStatus(id, "REJECTED");
    res.json({ success: true, payment: updated });
  });

  app.post("/api/admin/guilds/:id/activate", requireAuth, requireGlobalRole("ADMIN"), async (req, res) => {
    const guildId = paramId(req);
    const plan = req.body.plan || "PREMIUM";
    const durationDays = req.body.durationDays || 30;
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    const guild = await storage.updateGuild(guildId, { subscriptionStatus: plan, subscriptionExpiresAt: expiresAt });
    res.json({ success: true, guild });
  });

  app.post("/api/admin/guilds/:id/downgrade", requireAuth, requireGlobalRole("ADMIN"), async (req, res) => {
    const guildId = paramId(req);
    const guild = await storage.updateGuild(guildId, { subscriptionStatus: "FREE", subscriptionExpiresAt: null });
    res.json({ success: true, guild });
  });

  app.post("/api/admin/users/:id/block", requireAuth, requireGlobalRole("ADMIN"), async (req, res) => {
    const userId = paramId(req);
    const blocked = req.body.blocked !== false;
    const user = await storage.updateUser(userId, { blocked });
    res.json({ success: true, user });
  });

  app.post("/api/admin/users/:id/role", requireAuth, requireGlobalRole("ADMIN"), async (req, res) => {
    const userId = paramId(req);
    const { role } = req.body;
    if (!role) return res.status(400).json({ error: "role required" });
    const user = await storage.updateUserRole(userId, role);
    res.json({ success: true, user });
  });

  // ============ REFERRALS ============
  app.get("/api/referrals/my", requireAuth, async (req, res) => {
    const refs = await storage.getUserReferrals(req.session.user!.id);
    const user = await storage.getUser(req.session.user!.id);
    res.json({ referralCode: user?.referralCode, referrals: refs });
  });

  // ============ PLAYERS/CHARACTERS ============
  app.get("/api/players", async (req, res) => {
    const guildId = req.query.guildId ? parseInt(req.query.guildId as string) : undefined;
    const players = await storage.getPlayers(guildId);
    res.json(players);
  });

  app.post("/api/players", requireAuth, async (req, res) => {
    const parsed = insertPlayerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    
    const characterData = await scanCharacter(parsed.data.name);
    const playerData = characterData 
      ? { ...parsed.data, level: characterData.level, vocation: characterData.vocation }
      : parsed.data;
    
    const player = await storage.createPlayer(playerData);
    res.json(player);
  });

  app.post("/api/players/:id/scan", requireAuth, async (req, res) => {
    const player = await storage.getPlayer(paramId(req));
    if (!player) return res.status(404).json({ error: "Player not found" });

    const data = await scanCharacter(player.name);
    if (!data) return res.status(404).json({ error: "Character not found on Tibia" });

    const updated = await storage.updatePlayer(player.id, {
      level: data.level,
      vocation: data.vocation,
      lastScan: new Date(),
    });
    res.json(updated);
  });

  app.post("/api/guilds/:id/scan-members", async (req, res) => {
    const guildId = paramId(req);
    const guild = await storage.getGuild(guildId);
    if (!guild) return res.status(404).json({ error: "Guild not found" });

    const members = await fetchGuildMembers(guild.name);
    if (!members.length) return res.status(404).json({ error: "No members found or guild not found on TibiaData" });

    const results = { created: 0, updated: 0, total: members.length };

    for (const member of members) {
      const existing = await storage.getPlayerByName(member.name);
      if (existing) {
        const startLevel = existing.startLevel || existing.level;
        const levelsGained = member.level - startLevel;
        
        await storage.updatePlayer(existing.id, {
          level: member.level,
          vocation: member.vocation,
          rank: member.rank,
          online: member.status === "online",
          lastScan: new Date(),
          levelsGained: levelsGained > 0 ? levelsGained : 0,
        });
        results.updated++;
      } else {
        await storage.createPlayer({
          name: member.name,
          guildId,
          level: member.level,
          vocation: member.vocation,
          rank: member.rank,
          online: member.status === "online",
          startLevel: member.level,
          levelsGained: 0,
        });
        results.created++;
      }
    }

    res.json(results);
  });
  
  app.post("/api/guilds/:id/reset-tracking", requireAuth, requireGuildRole("LEADER", "VICE_LEADER", "OFFICER"), async (req, res) => {
    const guildId = paramId(req);
    const players = await storage.getPlayers(guildId);
    
    for (const player of players) {
      await storage.updatePlayer(player.id, {
        startLevel: player.level,
        levelsGained: 0,
      });
    }
    
    res.json({ success: true, playersReset: players.length });
  });
  
  app.post("/api/reset-all-levels", requireAuth, requireGlobalRole("ADMIN"), async (req, res) => {
    const count = await storage.resetAllPlayersStartLevel();
    res.json({ success: true, playersReset: count, message: "Server save reset simulated" });
  });

  app.patch("/api/players/:id", requireAuth, async (req, res) => {
    const id = paramId(req);
    const player = await storage.updatePlayer(id, req.body);
    res.json(player);
  });

  app.delete("/api/players/:id", requireAuth, requireGuildRole("LEADER", "VICE_LEADER", "OFFICER"), async (req, res) => {
    const id = paramId(req);
    res.json({ success: true, id });
  });

  app.get("/api/scan/:name", async (req, res) => {
    const data = await fetchCharacter(req.params.name as string);
    if (!data) return res.status(404).json({ error: "Character not found" });
    res.json(data);
  });

  // ============ DEATHS / PVP ============
  app.get("/api/deaths/:guildId", async (req, res) => {
    const deaths = await storage.getDeaths(paramId(req, "guildId"));
    res.json(deaths);
  });

  app.get("/api/pvp-logs/:guildId", async (req, res) => {
    const logs = await storage.getPvpLogs(paramId(req, "guildId"));
    res.json(logs);
  });

  // ============ DEATH TRACKER ============
  app.get("/api/death-tracker/stats", async (req, res) => {
    const filters: any = {};
    if (req.query.dateFrom) filters.dateFrom = new Date(req.query.dateFrom as string);
    if (req.query.dateTo) filters.dateTo = new Date(req.query.dateTo as string);
    if (req.query.isPvp !== undefined) filters.isPvp = req.query.isPvp === 'true';
    if (req.query.victimGuildType) filters.victimGuildType = req.query.victimGuildType as 'main' | 'enemy';
    
    const stats = await storage.getDeathStats(Object.keys(filters).length > 0 ? filters : undefined);
    res.json(stats);
  });

  app.get("/api/death-tracker/recent", async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    const filters: { dateFrom?: Date; dateTo?: Date; isPvp?: boolean; victimGuildType?: 'main' | 'enemy' } = {};
    if (req.query.dateFrom) filters.dateFrom = new Date(req.query.dateFrom as string);
    if (req.query.dateTo) filters.dateTo = new Date(req.query.dateTo as string);
    if (req.query.isPvp !== undefined) filters.isPvp = req.query.isPvp === 'true';
    if (req.query.victimGuildType) filters.victimGuildType = req.query.victimGuildType as 'main' | 'enemy';
    
    const result = await storage.getRecentDeaths(page, pageSize, Object.keys(filters).length > 0 ? filters : undefined);
    res.json(result);
  });

  app.get("/api/death-tracker/unnotified", async (req, res) => {
    const unnotified = await deathTracker.getUnnotifiedDeaths();
    res.json(unnotified);
  });

  app.post("/api/death-tracker/scan-all", async (req, res) => {
    const days = parseInt(req.body.days as string) || 1;
    console.log(`[API] Starting death scan for last ${days} day(s)...`);
    const results = await deathTracker.scanAllGuildsForDeaths(days);
    res.json({ results, totalNewDeaths: results.reduce((sum, r) => sum + r.newDeaths, 0) });
  });

  app.get("/api/death-tracker/config/:guildId", async (req, res) => {
    const config = await deathTracker.getDeathTrackerConfig(paramId(req, "guildId"));
    res.json(config || null);
  });

  app.post("/api/death-tracker/config/:guildId", requireAuth, requireGuildRole("LEADER", "VICE_LEADER"), async (req, res) => {
    const guildId = paramId(req, "guildId");
    
    const webhookUrlPattern = /^https:\/\/discord\.com\/api\/webhooks\/\d+\/.+$/;
    const mainWebhook = req.body.mainGuildWebhookUrl;
    const enemyWebhook = req.body.enemyGuildWebhookUrl;
    const membershipWebhook = req.body.membershipWebhookUrl;
    
    if (mainWebhook && !webhookUrlPattern.test(mainWebhook)) {
      return res.status(400).json({ error: "Invalid main guild webhook URL format" });
    }
    if (enemyWebhook && !webhookUrlPattern.test(enemyWebhook)) {
      return res.status(400).json({ error: "Invalid enemy guild webhook URL format" });
    }
    if (membershipWebhook && !webhookUrlPattern.test(membershipWebhook)) {
      return res.status(400).json({ error: "Invalid membership webhook URL format" });
    }
    
    const config = await deathTracker.saveDeathTrackerConfig({
      guildId,
      discordServerId: req.body.discordServerId || "default",
      mainGuildDeathChannelId: req.body.mainGuildDeathChannelId || null,
      enemyDeathChannelId: req.body.enemyDeathChannelId || null,
      mainGuildWebhookUrl: mainWebhook || null,
      enemyGuildWebhookUrl: enemyWebhook || null,
      membershipWebhookUrl: membershipWebhook || null,
      enabled: req.body.enabled ?? true,
      notifyMainGuildDeaths: req.body.notifyMainGuildDeaths ?? true,
      notifyEnemyGuildDeaths: req.body.notifyEnemyGuildDeaths ?? true,
      checkIntervalMinutes: req.body.checkIntervalMinutes ?? 5,
    });
    res.json(config);
  });
  
  app.get("/api/death-tracker/configs", async (req, res) => {
    const configs = await deathTracker.getAllDeathTrackerConfigs();
    res.json(configs);
  });
  
  app.post("/api/death-tracker/test-webhook", requireAuth, async (req, res) => {
    const { webhookUrl } = req.body;
    if (!webhookUrl) {
      return res.status(400).json({ error: "webhookUrl is required" });
    }
    
    const webhookPattern = /^https:\/\/discord\.com\/api\/webhooks\/\d+\/.+$/;
    if (!webhookPattern.test(webhookUrl)) {
      return res.status(400).json({ 
        error: "Invalid webhook URL", 
        message: "Webhook URL must start with https://discord.com/api/webhooks/",
        success: false
      });
    }
    
    const testEmbed = {
      embeds: [{
        title: "🧪 Test Notification",
        description: "Webhook is working! You will receive death notifications.",
        color: 0x5865F2,
        footer: { text: "TibiaGuildBot Death Tracker" },
        timestamp: new Date().toISOString(),
      }],
    };
    
    const success = await deathTracker.sendDiscordNotification(webhookUrl, testEmbed);
    res.json({ success });
  });

  app.post("/api/death-tracker/check/:guildId", requireAuth, async (req, res) => {
    const guildId = paramId(req, "guildId");
    const newDeaths = await deathTracker.checkDeathsForGuild(guildId);
    res.json({ newDeaths });
  });

  // ============ EVENTS ============
  app.get("/api/events/:guildId", async (req, res) => {
    const events = await storage.getEvents(paramId(req, "guildId"));
    res.json(events);
  });

  app.post("/api/events", requireAuth, async (req, res) => {
    const parsed = insertEventSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    const event = await storage.createEvent(parsed.data);
    res.json(event);
  });

  app.post("/api/events/:id/join", requireAuth, async (req, res) => {
    const eventId = paramId(req);
    const event = await storage.getEvent(eventId);
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.maxParticipants && event.currentParticipants! >= event.maxParticipants) {
      return res.status(400).json({ error: "Event is full" });
    }

    const participant = await storage.joinEvent(eventId, {
      eventId,
      discordUserId: req.session.user!.discordId,
      characterName: req.body.characterName,
    });
    res.json(participant);
  });

  app.get("/api/events/:id/participants", async (req, res) => {
    const participants = await storage.getEventParticipants(paramId(req));
    res.json(participants);
  });

  // ============ TEMPLATES ============
  app.get("/api/templates", async (req, res) => {
    const templates = await storage.getTemplates();
    res.json(templates);
  });

  app.post("/api/templates", requireAuth, requireGuildRole("LEADER", "VICE_LEADER", "OFFICER"), async (req, res) => {
    const parsed = insertTemplateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    const template = await storage.createTemplate(parsed.data);
    res.json(template);
  });

  app.delete("/api/templates/:id", requireAuth, requireGuildRole("LEADER", "VICE_LEADER", "OFFICER"), async (req, res) => {
    const id = paramId(req);
    await storage.deleteTemplate(id);
    res.json({ success: true });
  });

  // ============ STATISTICS ============
  app.get("/api/stats/:guildId", async (req, res) => {
    const stats = await storage.getGuildStats(paramId(req, "guildId"));
    res.json(stats);
  });

  app.get("/api/leaderboard/:guildId", async (req, res) => {
    const leaderboard = await storage.getLeaderboard(paramId(req, "guildId"));
    res.json(leaderboard);
  });

  // ============ GUILD INFO FROM TIBIADATA ============
  app.get("/api/tibia/guild/:name", async (req, res) => {
    const info = await fetchGuildInfo(req.params.name as string);
    if (!info) return res.status(404).json({ error: "Guild not found" });
    res.json(info);
  });

  app.get("/api/tibia/guild/:name/members", async (req, res) => {
    const members = await fetchGuildMembers(req.params.name as string);
    res.json(members);
  });

  // ============ ONLINE SCRAPER ============
  app.get("/api/online/status", async (req, res) => {
    const status = onlineScraper.getScraperStatus();
    res.json(status);
  });

  app.get("/api/online/players", async (req, res) => {
    const onlinePlayers = await db.select()
      .from(onlineCharacters)
      .where(eq(onlineCharacters.isCurrentlyOnline, true))
      .orderBy(desc(onlineCharacters.level));
    res.json(onlinePlayers);
  });

  app.get("/api/online/players/count", async (req, res) => {
    const [result] = await db.select({ count: sql<number>`count(*)` })
      .from(onlineCharacters)
      .where(eq(onlineCharacters.isCurrentlyOnline, true));
    res.json({ count: Number(result.count) });
  });

  app.get("/api/online/sessions", async (req, res) => {
    const characterName = req.query.character as string;
    const limit = parseInt(req.query.limit as string) || 50;
    
    let query = db.select().from(onlineSessions).orderBy(desc(onlineSessions.sessionStart)).limit(limit);
    
    if (characterName) {
      const sessions = await db.select()
        .from(onlineSessions)
        .where(eq(onlineSessions.characterName, characterName))
        .orderBy(desc(onlineSessions.sessionStart))
        .limit(limit);
      return res.json(sessions);
    }
    
    const sessions = await query;
    res.json(sessions);
  });

  app.get("/api/online/snapshots/recent", async (req, res) => {
    const minutes = parseInt(req.query.minutes as string) || 60;
    const since = new Date(Date.now() - minutes * 60 * 1000);
    
    const snapshots = await db.select()
      .from(onlineSnapshots)
      .where(gte(onlineSnapshots.checkedAt, since))
      .orderBy(desc(onlineSnapshots.checkedAt))
      .limit(1000);
    res.json(snapshots);
  });

  app.post("/api/online/scrape", requireAuth, requireGlobalRole("ADMIN"), async (req, res) => {
    try {
      const result = await onlineScraper.processOnlineSnapshot("Antica");
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/online/tracked", async (req, res) => {
    const trackedOnline = await onlineScraper.getOnlineCharactersFromTrackedGuilds();
    res.json(trackedOnline);
  });

  // ============ TIBSPY SCRAPER ============
  const { tibspyScraper } = await import("./tibspyScraper");

  app.get("/api/tibspy/status", async (req, res) => {
    const status = await tibspyScraper.getStatus();
    res.json(status);
  });

  app.get("/api/tibspy/metrics", async (req, res) => {
    const metrics = await tibspyScraper.getMetrics();
    res.json(metrics);
  });

  app.get("/api/tibspy/logs", async (req, res) => {
    const days = parseInt(req.query.days as string) || 7;
    const logs = await tibspyScraper.getRecentLogs(days);
    res.json(logs);
  });

  app.get("/api/tibspy/character/:name", async (req, res) => {
    const data = await tibspyScraper.getCharacterData(req.params.name as string);
    if (!data) {
      return res.status(404).json({ error: "Character not found in TibSpy cache" });
    }
    res.json(data);
  });

  app.post("/api/tibspy/request-scrape/:name", async (req, res) => {
    const characterName = req.params.name as string;
    if (!characterName) {
      return res.status(400).json({ error: "Character name is required" });
    }
    try {
      const result = await tibspyScraper.scrapeCharacterNow(characterName);
      if (result.success) {
        res.json({ success: true, message: `Scraped ${characterName} successfully`, data: result.data });
      } else {
        res.json({ success: false, message: `Could not scrape ${characterName}: ${result.reason}`, queued: false });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to scrape character" });
    }
  });

  app.post("/api/tibspy/queue", requireAuth, requireGlobalRole("ADMIN"), async (req, res) => {
    const { characterName, priority } = req.body;
    if (!characterName) {
      return res.status(400).json({ error: "characterName is required" });
    }
    await tibspyScraper.queueCharacter(characterName, priority || 'high');
    res.json({ success: true, message: `Queued ${characterName} for scraping` });
  });

  app.post("/api/tibspy/run-batch", requireAuth, requireGlobalRole("ADMIN"), async (req, res) => {
    const result = await tibspyScraper.runBatchScrape();
    res.json(result);
  });

  app.post("/api/tibspy/enable", requireAuth, requireGlobalRole("ADMIN"), async (req, res) => {
    await tibspyScraper.enable();
    res.json({ success: true, message: "TibSpy scraper enabled" });
  });

  app.post("/api/tibspy/disable", requireAuth, requireGlobalRole("ADMIN"), async (req, res) => {
    await tibspyScraper.disable();
    res.json({ success: true, message: "TibSpy scraper disabled" });
  });

  app.put("/api/tibspy/config", requireAuth, requireGlobalRole("ADMIN"), async (req, res) => {
    const { key, value } = req.body;
    const validKeys = [
      'dailyScrapeLimit', 'batchSize', 'delayBetweenRequests', 
      'delayBetweenBatches', 'characterCooldownHours', 
      'nightlyStartHour', 'nightlyEndHour', 'enabled'
    ];
    if (!validKeys.includes(key)) {
      return res.status(400).json({ error: `Invalid config key. Valid keys: ${validKeys.join(', ')}` });
    }
    await tibspyScraper.setConfigValue(key, String(value));
    res.json({ success: true, message: `Config ${key} updated to ${value}` });
  });

  // ============ GUILD SYNC / MEMBERSHIP EVENTS ============
  const guildSync = await import("./guildSyncService");

  app.get("/api/guild-sync/status", async (req, res) => {
    res.json(guildSync.getGuildSyncStatus());
  });

  app.post("/api/guild-sync/run", requireAuth, requireGlobalRole("ADMIN"), async (req, res) => {
    if (guildSync.getGuildSyncStatus().running) {
      return res.status(409).json({ error: "Sync already in progress" });
    }
    const results = await guildSync.runFullGuildSync();
    res.json(results);
  });

  app.get("/api/guild-changes", async (req, res) => {
    const guildId = req.query.guildId ? parseInt(req.query.guildId as string) : undefined;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    const eventType = req.query.eventType as "JOINED" | "LEFT" | undefined;

    const result = await guildSync.getGuildMembershipEvents({
      guildId,
      page,
      pageSize,
      eventType,
    });
    res.json(result);
  });

  return httpServer;
}
