import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth, requireRole } from "./auth";
import { fetchCharacter, fetchGuildMembers, fetchGuildInfo, verifyGuildDescription, scanCharacter } from "./tibiadata";
import * as deathTracker from "./deathTracker";
import * as onlineScraper from "./onlineScraper";
import { insertGuildSchema, insertPlayerSchema, insertEventSchema, insertTemplateSchema, onlineCharacters, onlineSessions, onlineSnapshots } from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import crypto from "crypto";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Setup authentication
  setupAuth(app);

  // ============ GUILDS ============
  app.get("/api/guilds", async (req, res) => {
    const guilds = await storage.getGuilds();
    res.json(guilds);
  });

  app.get("/api/guilds/:id", async (req, res) => {
    const guild = await storage.getGuild(parseInt(req.params.id));
    if (!guild) return res.status(404).json({ error: "Guild not found" });
    res.json(guild);
  });

  app.post("/api/guilds", requireAuth, requireRole("ADMIN", "MODERATOR"), async (req, res) => {
    const parsed = insertGuildSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    
    const guildType = parsed.data.guildType || "main";
    
    // Only main guilds need verification - ally/enemy are auto-verified
    const isAutoVerified = guildType === "ally" || guildType === "enemy";
    const verificationCode = isAutoVerified ? null : `TIBIABOT-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    
    const guild = await storage.createGuild({ 
      ...parsed.data, 
      verificationCode,
      verified: isAutoVerified,
      isEnemy: guildType === "enemy",
    });
    res.json(guild);
  });

  app.post("/api/guilds/:id/verify", requireAuth, requireRole("ADMIN"), async (req, res) => {
    const guildId = parseInt(req.params.id as string);
    const guild = await storage.getGuild(guildId);
    if (!guild) return res.status(404).json({ error: "Guild not found" });

    // Verify by checking Tibia.com guild description
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

  // ============ PLAYERS/CHARACTERS ============
  app.get("/api/players", async (req, res) => {
    const guildId = req.query.guildId ? parseInt(req.query.guildId as string) : undefined;
    const players = await storage.getPlayers(guildId);
    res.json(players);
  });

  app.post("/api/players", requireAuth, async (req, res) => {
    const parsed = insertPlayerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    
    // Scan character on add
    const characterData = await scanCharacter(parsed.data.name);
    const playerData = characterData 
      ? { ...parsed.data, level: characterData.level, vocation: characterData.vocation }
      : parsed.data;
    
    const player = await storage.createPlayer(playerData);
    res.json(player);
  });

  app.post("/api/players/:id/scan", requireAuth, async (req, res) => {
    const player = await storage.getPlayer(parseInt(req.params.id as string));
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

  // Scan all members from TibiaData
  app.post("/api/guilds/:id/scan-members", async (req, res) => {
    const guildId = parseInt(req.params.id as string);
    const guild = await storage.getGuild(guildId);
    if (!guild) return res.status(404).json({ error: "Guild not found" });

    const members = await fetchGuildMembers(guild.name);
    if (!members.length) return res.status(404).json({ error: "No members found or guild not found on TibiaData" });

    const results = { created: 0, updated: 0, total: members.length };

    for (const member of members) {
      const existing = await storage.getPlayerByName(member.name);
      if (existing) {
        // Calculate levels gained
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
  
  // Reset level tracking (set current level as new baseline) - single guild
  app.post("/api/guilds/:id/reset-tracking", requireAuth, requireRole("ADMIN", "MODERATOR"), async (req, res) => {
    const guildId = parseInt(req.params.id as string);
    const players = await storage.getPlayers(guildId);
    
    for (const player of players) {
      await storage.updatePlayer(player.id, {
        startLevel: player.level,
        levelsGained: 0,
      });
    }
    
    res.json({ success: true, playersReset: players.length });
  });
  
  // Reset all players (server save simulation) - all guilds
  app.post("/api/reset-all-levels", requireAuth, requireRole("ADMIN"), async (req, res) => {
    const count = await storage.resetAllPlayersStartLevel();
    res.json({ success: true, playersReset: count, message: "Server save reset simulated" });
  });

  // Update player
  app.patch("/api/players/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const player = await storage.updatePlayer(id, req.body);
    res.json(player);
  });

  // Delete player
  app.delete("/api/players/:id", requireAuth, requireRole("ADMIN", "MODERATOR"), async (req, res) => {
    const id = parseInt(req.params.id as string);
    // Note: Would need to add deletePlayer to storage
    res.json({ success: true, id });
  });

  // TibiaData direct scan
  app.get("/api/scan/:name", async (req, res) => {
    const data = await fetchCharacter(req.params.name);
    if (!data) return res.status(404).json({ error: "Character not found" });
    res.json(data);
  });

  // ============ DEATHS / PVP ============
  app.get("/api/deaths/:guildId", async (req, res) => {
    const deaths = await storage.getDeaths(parseInt(req.params.guildId));
    res.json(deaths);
  });

  app.get("/api/pvp-logs/:guildId", async (req, res) => {
    const logs = await storage.getPvpLogs(parseInt(req.params.guildId));
    res.json(logs);
  });

  // ============ DEATH TRACKER ============
  // Static routes MUST come before parameterized routes

  // Get death statistics (totals, optionally filtered)
  app.get("/api/death-tracker/stats", async (req, res) => {
    // Build filters from query params
    const filters: any = {};
    
    if (req.query.dateFrom) {
      filters.dateFrom = new Date(req.query.dateFrom as string);
    }
    if (req.query.dateTo) {
      filters.dateTo = new Date(req.query.dateTo as string);
    }
    if (req.query.isPvp !== undefined) {
      filters.isPvp = req.query.isPvp === 'true';
    }
    if (req.query.victimGuildType) {
      filters.victimGuildType = req.query.victimGuildType as 'main' | 'enemy';
    }
    
    const stats = await storage.getDeathStats(Object.keys(filters).length > 0 ? filters : undefined);
    res.json(stats);
  });

  // Get recent deaths (all guilds) with pagination and filters
  app.get("/api/death-tracker/recent", async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    
    // Build filters
    const filters: { dateFrom?: Date; dateTo?: Date; isPvp?: boolean; victimGuildType?: 'main' | 'enemy' } = {};
    
    if (req.query.dateFrom) {
      filters.dateFrom = new Date(req.query.dateFrom as string);
    }
    if (req.query.dateTo) {
      filters.dateTo = new Date(req.query.dateTo as string);
    }
    if (req.query.isPvp !== undefined) {
      filters.isPvp = req.query.isPvp === 'true';
    }
    if (req.query.victimGuildType) {
      filters.victimGuildType = req.query.victimGuildType as 'main' | 'enemy';
    }
    
    const result = await storage.getRecentDeaths(page, pageSize, Object.keys(filters).length > 0 ? filters : undefined);
    res.json(result);
  });

  // Get unnotified deaths
  app.get("/api/death-tracker/unnotified", async (req, res) => {
    const unnotified = await deathTracker.getUnnotifiedDeaths();
    res.json(unnotified);
  });

  // Full scan - check all guilds for deaths
  app.post("/api/death-tracker/scan-all", async (req, res) => {
    const days = parseInt(req.body.days as string) || 1;
    console.log(`[API] Starting death scan for last ${days} day(s)...`);
    const results = await deathTracker.scanAllGuildsForDeaths(days);
    res.json({ results, totalNewDeaths: results.reduce((sum, r) => sum + r.newDeaths, 0) });
  });

  // Parameterized routes come after static routes
  // Get death tracker config for a guild
  app.get("/api/death-tracker/config/:guildId", async (req, res) => {
    const config = await deathTracker.getDeathTrackerConfig(parseInt(req.params.guildId));
    res.json(config || null);
  });

  // Save/update death tracker config
  app.post("/api/death-tracker/config/:guildId", requireAuth, requireRole("ADMIN", "MODERATOR"), async (req, res) => {
    const guildId = parseInt(req.params.guildId);
    
    // Validate webhook URLs if provided
    const webhookUrlPattern = /^https:\/\/discord\.com\/api\/webhooks\/\d+\/.+$/;
    const mainWebhook = req.body.mainGuildWebhookUrl;
    const enemyWebhook = req.body.enemyGuildWebhookUrl;
    
    if (mainWebhook && !webhookUrlPattern.test(mainWebhook)) {
      return res.status(400).json({ error: "Invalid main guild webhook URL format" });
    }
    if (enemyWebhook && !webhookUrlPattern.test(enemyWebhook)) {
      return res.status(400).json({ error: "Invalid enemy guild webhook URL format" });
    }
    
    const config = await deathTracker.saveDeathTrackerConfig({
      guildId,
      discordServerId: req.body.discordServerId || "default",
      mainGuildDeathChannelId: req.body.mainGuildDeathChannelId || null,
      enemyDeathChannelId: req.body.enemyDeathChannelId || null,
      mainGuildWebhookUrl: mainWebhook || null,
      enemyGuildWebhookUrl: enemyWebhook || null,
      enabled: req.body.enabled ?? true,
      notifyMainGuildDeaths: req.body.notifyMainGuildDeaths ?? true,
      notifyEnemyGuildDeaths: req.body.notifyEnemyGuildDeaths ?? true,
      checkIntervalMinutes: req.body.checkIntervalMinutes ?? 5,
    });
    res.json(config);
  });
  
  // Get all death tracker configs
  app.get("/api/death-tracker/configs", async (req, res) => {
    const configs = await deathTracker.getAllDeathTrackerConfigs();
    res.json(configs);
  });
  
  // Test webhook
  app.post("/api/death-tracker/test-webhook", requireAuth, async (req, res) => {
    const { webhookUrl } = req.body;
    if (!webhookUrl) {
      return res.status(400).json({ error: "webhookUrl is required" });
    }
    
    const testEmbed = {
      embeds: [{
        title: "🧪 Test powiadomienia",
        description: "Webhook działa poprawnie! Będziesz otrzymywać powiadomienia o śmierciach.",
        color: 0x5865F2,
        footer: { text: "TibiaGuildBot Death Tracker" },
        timestamp: new Date().toISOString(),
      }],
    };
    
    const success = await deathTracker.sendDiscordNotification(webhookUrl, testEmbed);
    res.json({ success });
  });

  // Manually trigger death check for a guild
  app.post("/api/death-tracker/check/:guildId", requireAuth, async (req, res) => {
    const guildId = parseInt(req.params.guildId);
    const newDeaths = await deathTracker.checkDeathsForGuild(guildId);
    res.json({ newDeaths });
  });

  // ============ EVENTS ============
  app.get("/api/events/:guildId", async (req, res) => {
    const events = await storage.getEvents(parseInt(req.params.guildId));
    res.json(events);
  });

  app.post("/api/events", requireAuth, async (req, res) => {
    const parsed = insertEventSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    const event = await storage.createEvent(parsed.data);
    res.json(event);
  });

  app.post("/api/events/:id/join", requireAuth, async (req, res) => {
    const eventId = parseInt(req.params.id as string);
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
    const participants = await storage.getEventParticipants(parseInt(req.params.id));
    res.json(participants);
  });

  // ============ TEMPLATES ============
  app.get("/api/templates", async (req, res) => {
    const templates = await storage.getTemplates();
    res.json(templates);
  });

  app.post("/api/templates", requireAuth, requireRole("ADMIN", "MODERATOR"), async (req, res) => {
    const parsed = insertTemplateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    const template = await storage.createTemplate(parsed.data);
    res.json(template);
  });

  app.delete("/api/templates/:id", requireAuth, requireRole("ADMIN", "MODERATOR"), async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteTemplate(id);
    res.json({ success: true });
  });

  // ============ STATISTICS ============
  app.get("/api/stats/:guildId", async (req, res) => {
    const stats = await storage.getGuildStats(parseInt(req.params.guildId));
    res.json(stats);
  });

  app.get("/api/leaderboard/:guildId", async (req, res) => {
    const leaderboard = await storage.getLeaderboard(parseInt(req.params.guildId));
    res.json(leaderboard);
  });

  // ============ GUILD INFO FROM TIBIADATA ============
  app.get("/api/tibia/guild/:name", async (req, res) => {
    const info = await fetchGuildInfo(req.params.name);
    if (!info) return res.status(404).json({ error: "Guild not found" });
    res.json(info);
  });

  app.get("/api/tibia/guild/:name/members", async (req, res) => {
    const members = await fetchGuildMembers(req.params.name);
    res.json(members);
  });

  // ============ ONLINE SCRAPER ============
  app.get("/api/online/status", async (req, res) => {
    const status = onlineScraper.getScraperStatus();
    res.json(status);
  });

  app.get("/api/online/players", async (req, res) => {
    const world = (req.query.world as string) || "Antica";
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

  app.post("/api/online/scrape", requireAuth, requireRole("ADMIN"), async (req, res) => {
    try {
      const result = await onlineScraper.processOnlineSnapshot("Antica");
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get online players from tracked guilds (main + enemy)
  app.get("/api/online/tracked", async (req, res) => {
    const trackedOnline = await onlineScraper.getOnlineCharactersFromTrackedGuilds();
    res.json(trackedOnline);
  });

  // ============ TIBSPY SCRAPER ============
  const { tibspyScraper } = await import("./tibspyScraper");

  // Get TibSpy scraper status and metrics
  app.get("/api/tibspy/status", async (req, res) => {
    const status = await tibspyScraper.getStatus();
    res.json(status);
  });

  // Get TibSpy metrics only
  app.get("/api/tibspy/metrics", async (req, res) => {
    const metrics = await tibspyScraper.getMetrics();
    res.json(metrics);
  });

  // Get recent scrape logs
  app.get("/api/tibspy/logs", async (req, res) => {
    const days = parseInt(req.query.days as string) || 7;
    const logs = await tibspyScraper.getRecentLogs(days);
    res.json(logs);
  });

  // Get character data from TibSpy
  app.get("/api/tibspy/character/:name", async (req, res) => {
    const data = await tibspyScraper.getCharacterData(req.params.name);
    if (!data) {
      return res.status(404).json({ error: "Character not found in TibSpy cache" });
    }
    res.json(data);
  });

  // Request immediate scrape for a character (public endpoint for on-demand scraping)
  app.post("/api/tibspy/request-scrape/:name", async (req, res) => {
    const characterName = req.params.name;
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

  // Admin: Queue character for scraping (high priority)
  app.post("/api/tibspy/queue", requireAuth, requireRole("ADMIN"), async (req, res) => {
    const { characterName, priority } = req.body;
    if (!characterName) {
      return res.status(400).json({ error: "characterName is required" });
    }
    await tibspyScraper.queueCharacter(characterName, priority || 'high');
    res.json({ success: true, message: `Queued ${characterName} for scraping` });
  });

  // Admin: Manually trigger a batch scrape
  app.post("/api/tibspy/run-batch", requireAuth, requireRole("ADMIN"), async (req, res) => {
    const result = await tibspyScraper.runBatchScrape();
    res.json(result);
  });

  // Admin: Enable scraper
  app.post("/api/tibspy/enable", requireAuth, requireRole("ADMIN"), async (req, res) => {
    await tibspyScraper.enable();
    res.json({ success: true, message: "TibSpy scraper enabled" });
  });

  // Admin: Disable scraper
  app.post("/api/tibspy/disable", requireAuth, requireRole("ADMIN"), async (req, res) => {
    await tibspyScraper.disable();
    res.json({ success: true, message: "TibSpy scraper disabled" });
  });

  // Admin: Update config
  app.put("/api/tibspy/config", requireAuth, requireRole("ADMIN"), async (req, res) => {
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

  return httpServer;
}
