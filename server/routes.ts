import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertGuildSchema, insertPlayerSchema, insertTemplateSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Guilds
  app.get("/api/guilds", async (req, res) => {
    const guilds = await storage.getGuilds();
    res.json(guilds);
  });

  app.post("/api/guilds", async (req, res) => {
    const parsed = insertGuildSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    const guild = await storage.createGuild(parsed.data);
    res.json(guild);
  });

  // Players
  app.get("/api/players", async (req, res) => {
    const guildId = req.query.guildId ? parseInt(req.query.guildId as string) : undefined;
    const players = await storage.getPlayers(guildId);
    res.json(players);
  });

  app.post("/api/players", async (req, res) => {
    const parsed = insertPlayerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    const player = await storage.createPlayer(parsed.data);
    res.json(player);
  });

  // PvP Logs
  app.get("/api/pvp-logs/:guildId", async (req, res) => {
    const logs = await storage.getPvpLogs(parseInt(req.params.guildId));
    res.json(logs);
  });

  // Templates
  app.get("/api/templates", async (req, res) => {
    const templates = await storage.getTemplates();
    res.json(templates);
  });

  // TibSpy Mock Scan Endpoint
  app.post("/api/scan/:name", async (req, res) => {
    const { name } = req.params;
    // Mock TibSpy logic
    res.json({
      name,
      level: 420,
      vocation: "Elite Knight",
      online: true,
      lastScan: new Date().toISOString()
    });
  });

  return httpServer;
}
