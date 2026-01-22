import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth, requireRole } from "./auth";
import { fetchCharacter, fetchGuildMembers, fetchGuildInfo, verifyGuildDescription, scanCharacter } from "./tibiadata";
import * as deathTracker from "./deathTracker";
import { insertGuildSchema, insertPlayerSchema, insertEventSchema, insertTemplateSchema } from "@shared/schema";
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
    
    // Generate verification code
    const verificationCode = `TIBIABOT-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const guild = await storage.createGuild({ ...parsed.data, verificationCode });
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
        await storage.updatePlayer(existing.id, {
          level: member.level,
          vocation: member.vocation,
          rank: member.rank,
          lastScan: new Date(),
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
        });
        results.created++;
      }
    }

    res.json(results);
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

  // Get recent deaths (all guilds) with pagination
  app.get("/api/death-tracker/recent", async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    const result = await storage.getRecentDeaths(page, pageSize);
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
    const config = await deathTracker.saveDeathTrackerConfig({
      guildId,
      discordServerId: req.body.discordServerId,
      mainGuildDeathChannelId: req.body.mainGuildDeathChannelId,
      enemyDeathChannelId: req.body.enemyDeathChannelId,
      enabled: req.body.enabled ?? true,
      checkIntervalMinutes: req.body.checkIntervalMinutes ?? 5,
    });
    res.json(config);
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

  return httpServer;
}
